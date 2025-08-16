import { path } from '../../infra_external-log-lib/src';
import { fs } from '../../infra_external-log-lib/src';
import { DockerBuilder } from './DockerBuilder';
import { ComposeManager } from './ComposeManager';
import { ContainerRunner } from './ContainerRunner';

export type Environment = 'local' | 'dev' | 'dev-demo' | 'demo' | 'release' | "production";

export interface EnvironmentConfig {
  name: Environment;
  buildFolder: string;
  volumeMounts?: VolumeMount[];
  ports?: PortMapping[];
  env?: Record<string, string>;
  networks?: string[];
  replicas?: number;
  resources?: ResourceLimits;
  healthcheck?: HealthCheckConfig;
  dependencies?: string[];
}

export interface VolumeMount {
  source: string;
  target: string;
  type?: 'bind' | 'volume' | 'tmpfs';
  readonly?: boolean;
}

export interface PortMapping {
  host: number;
  container: number;
  protocol?: 'tcp' | 'udp';
}

export interface ResourceLimits {
  memory?: string;
  cpu?: string;
  memoryReservation?: string;
  cpuReservation?: string;
}

export interface HealthCheckConfig {
  endpoint: string;
  interval?: string;
  timeout?: string;
  retries?: number;
  startPeriod?: string;
}

export interface EnvironmentDeployment {
  environment: Environment;
  services: string[];
  status: 'running' | 'stopped' | "building" | 'error';
  url?: string;
  startTime?: Date;
  containerId?: string;
}

export class EnvironmentManager {
  private dockerBuilder: DockerBuilder;
  private composeManager: ComposeManager;
  private containerRunner: ContainerRunner;
  private baseDir: string;
  private deployments: Map<string, EnvironmentDeployment>;

  constructor(baseDir?: string) {
    this.dockerBuilder = new DockerBuilder();
    this.composeManager = new ComposeManager();
    this.containerRunner = new ContainerRunner();
    this.baseDir = baseDir || process.cwd();
    this.deployments = new Map();
  }

  /**
   * Get environment-specific configuration
   */
  async getEnvironmentConfig(env: Environment, themeName: string): EnvironmentConfig {
    const buildFolder = path.join(this.baseDir, 'layer', 'themes', themeName);
    
    const baseConfig: EnvironmentConfig = {
      name: env,
      buildFolder,
      env: {
        NODE_ENV: this.mapEnvironmentToNodeEnv(env),
        ENVIRONMENT: env,
        THEME_NAME: themeName
      }
    };

    switch(env) {
      case 'local':
        return {
          ...baseConfig,
          volumeMounts: [
            {
              source: buildFolder,
              target: '/app',
              type: 'bind',
              readonly: false
            },
            {
              source: `${buildFolder}/node_modules`,
              target: '/app/node_modules',
              type: 'volume'
            }
          ],
          ports: [
            { host: 3000, container: 3000 },
            { host: 9229, container: 9229 } // Node.js debugger
          ],
          env: {
            ...baseConfig.env,
            NODE_ENV: "development",
            DEBUG: '*',
            WATCH_MODE: 'true'
          }
        };

      case 'dev':
        return {
          ...baseConfig,
          volumeMounts: [
            {
              source: `${buildFolder}/src`,
              target: '/app/src',
              type: 'bind',
              readonly: false
            },
            {
              source: `${buildFolder}/tests`,
              target: '/app/tests',
              type: 'bind',
              readonly: false
            }
          ],
          ports: [
            { host: 3000, container: 3000 }
          ],
          env: {
            ...baseConfig.env,
            NODE_ENV: "development",
            ENABLE_HOT_RELOAD: 'true'
          },
          healthcheck: {
            endpoint: '/health',
            interval: '30s',
            timeout: '10s',
            retries: 3
          }
        };

      case 'dev-demo':
        return {
          ...baseConfig,
          volumeMounts: [
            {
              source: `${buildFolder}/dist`,
              target: '/app/dist',
              type: 'bind',
              readonly: true
            }
          ],
          ports: [
            { host: 3001, container: 3000 }
          ],
          env: {
            ...baseConfig.env,
            NODE_ENV: 'staging',
            DEMO_MODE: 'true'
          },
          resources: {
            memory: '512m',
            cpu: '0.5'
          }
        };

      case 'demo':
        return {
          ...baseConfig,
          ports: [
            { host: 3002, container: 3000 }
          ],
          env: {
            ...baseConfig.env,
            NODE_ENV: 'staging',
            PUBLIC_DEMO: 'true'
          },
          resources: {
            memory: '1g',
            cpu: '1'
          },
          healthcheck: {
            endpoint: '/health',
            interval: '30s',
            timeout: '10s',
            retries: 5,
            startPeriod: '60s'
          }
        };

      case 'release':
      case "production":
        return {
          ...baseConfig,
          ports: [
            { host: 80, container: 3000 },
            { host: 443, container: 3443 }
          ],
          env: {
            ...baseConfig.env,
            NODE_ENV: "production",
            ENABLE_MONITORING: 'true',
            LOG_LEVEL: 'info'
          },
          replicas: 3,
          resources: {
            memory: '2g',
            cpu: '2',
            memoryReservation: '1g',
            cpuReservation: '1'
          },
          healthcheck: {
            endpoint: '/health',
            interval: '10s',
            timeout: '5s',
            retries: 3,
            startPeriod: '30s'
          },
          networks: ['production-network']
        };

      default:
        return baseConfig;
    }
  }

  /**
   * Build and deploy for specific environment
   */
  async deployEnvironment(
    env: Environment,
    themes: string[],
    options?: {
      rebuild?: boolean;
      detach?: boolean;
      scale?: Record<string, number>;
    }
  ): Promise<EnvironmentDeployment> {
    console.log(`🚀 Deploying to ${env} environment...`);

    const deploymentId = `${env}-${Date.now()}`;
    const deployment: EnvironmentDeployment = {
      environment: env,
      services: themes,
      status: "building",
      startTime: new Date()
    };

    this.deployments.set(deploymentId, deployment);

    try {
      // Generate environment-specific docker-compose
      const composeConfig = await this.generateEnvironmentCompose(env, themes);
      const composePath = path.join(this.baseDir, `.docker-compose.${env}.yml`);
      
      // Save compose file
      await fileAPI.createFile(composePath, this.composeManager.generateComposeFile(composeConfig, { type: FileType.TEMPORARY }),
        'utf8'
      );

      // Build images if needed
      if (options?.rebuild || env === 'release' || env === "production") {
        for (const theme of themes) {
          await this.buildEnvironmentImage(env, theme);
        }
      }

      // Deploy with docker-compose
      const output = await this.composeManager.up({
        file: composePath,
        detach: options?.detach !== false,
        build: options?.rebuild
      });

      deployment.status = 'running';
      deployment.url = this.getEnvironmentUrl(env);
      
      console.log(`✅ Deployment successful: ${deployment.url}`);
      
      return deployment;

    } catch (error) {
      deployment.status = 'error';
      console.error(`❌ Deployment failed:`, error);
      throw error;
    }
  }

  /**
   * Build Docker image for specific environment
   */
  async buildEnvironmentImage(env: Environment, themeName: string): Promise<string> {
    const config = this.getEnvironmentConfig(env, themeName);
    const tag = `aidev/${themeName}:${env}`;

    console.log(`🔨 Building ${themeName} for ${env}...`);

    // Generate environment-specific Dockerfile
    const dockerfile = this.generateEnvironmentDockerfile(env, config);
    const dockerfilePath = path.join(config.buildFolder, `Dockerfile.${env}`);
    
    await this.dockerBuilder.saveDockerfile(dockerfile, dockerfilePath);

    // Build the image
    await this.dockerBuilder.buildImage({
      tag,
      context: config.buildFolder,
      dockerfile: dockerfilePath,
      buildArgs: {
        ENVIRONMENT: env,
        BUILD_DATE: new Date().toISOString()
      }
    });

    console.log(`✅ Built image: ${tag}`);
    return tag;
  }

  /**
   * Generate environment-specific Dockerfile
   */
  private generateEnvironmentDockerfile(env: Environment, config: EnvironmentConfig): string {
    const isProduction = env === 'release' || env === "production";
    const isDevelopment = env === 'local' || env === 'dev';

    if (isDevelopment) {
      // Development Dockerfile with hot reload support
      return `
# Development Dockerfile for ${env} environment
FROM node:18-alpine

# Install development tools
RUN apk add --no-cache git python3 make g++ curl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy application code (will be overridden by volume mount)
COPY . .

# Expose ports
EXPOSE 3000 9229

# Environment variables
ENV NODE_ENV=${config.env?.NODE_ENV || "development"}
ENV ENVIRONMENT=${env}

# Development command with hot reload
CMD ["npm", "run", "dev"]
`.trim();
    }

    if (isProduction) {
      // Production multi-stage Dockerfile
      return `
# Production Dockerfile for ${env} environment
# Build stage
FROM node:18-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --production

# Production stage
FROM node:18-alpine

RUN apk add --no-cache curl tini

WORKDIR /app

# Copy only production dependencies and built code
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Production command
CMD ["node", "dist/index.js"]
`.trim();
    }

    // Default Dockerfile for demo environments
    return `
# ${env} environment Dockerfile
FROM node:18-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

ENV NODE_ENV=${config.env?.NODE_ENV || 'staging'}
ENV ENVIRONMENT=${env}

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "start"]
`.trim();
  }

  /**
   * Generate environment-specific docker-compose configuration
   */
  private async generateEnvironmentCompose(env: Environment, themes: string[]) {
    const services: Record<string, any> = {};
    
    for (const theme of themes) {
      const config = this.getEnvironmentConfig(env, theme);
      const serviceName = theme.replace(/_/g, '-');
      
      services[serviceName] = {
        image: `aidev/${theme}:${env}`,
        container_name: `${env}-${serviceName}`,
        build: {
          context: config.buildFolder,
          dockerfile: `Dockerfile.${env}`
        },
        environment: config.env,
        ports: config.ports?.map(p => `${p.host}:${p.container}`),
        volumes: config.volumeMounts?.map(v => {
          if (v.type === 'bind') {
            return `${v.source}:${v.target}${v.readonly ? ':ro' : ''}`;
          }
          return `${v.source}:${v.target}`;
        }),
        networks: config.networks || [`${env}-network`],
        restart: env === "production" ? 'always' : 'unless-stopped',
        deploy: config.replicas ? {
          replicas: config.replicas,
          resources: {
            limits: config.resources ? {
              cpus: config.resources.cpu,
              memory: config.resources.memory
            } : undefined,
            reservations: config.resources ? {
              cpus: config.resources.cpuReservation,
              memory: config.resources.memoryReservation
            } : undefined
          }
        } : undefined,
        healthcheck: config.healthcheck ? {
          test: [`CMD`, `curl`, `-f`, `http://localhost:3000${config.healthcheck.endpoint}`],
          interval: config.healthcheck.interval,
          timeout: config.healthcheck.timeout,
          retries: config.healthcheck.retries,
          start_period: config.healthcheck.startPeriod
        } : undefined
      };
    }

    return {
      version: '3.8',
      services,
      networks: {
        [`${env}-network`]: {
          driver: 'bridge',
          name: `aidev-${env}-network`
        }
      },
      volumes: this.getEnvironmentVolumes(env, themes)
    };
  }

  /**
   * Get environment-specific volumes
   */
  private getEnvironmentVolumes(env: Environment, themes: string[]) {
    const volumes: Record<string, any> = {};
    
    if (env === 'local' || env === 'dev') {
      // Add node_modules volumes for development
      themes.forEach(theme => {
        volumes[`${theme}-node-modules`] = {
          driver: 'local'
        };
      });
    }

    if (env === 'release' || env === "production") {
      // Add data volumes for production
      volumes['app-data'] = {
        driver: 'local',
        driver_opts: {
          type: 'none',
          o: 'bind',
          device: `${this.baseDir}/data`
        }
      };
      
      volumes['app-logs'] = {
        driver: 'local',
        driver_opts: {
          type: 'none',
          o: 'bind',
          device: `${this.baseDir}/logs`
        }
      };
    }

    return Object.keys(volumes).length > 0 ? volumes : undefined;
  }

  /**
   * Get environment URL
   */
  private getEnvironmentUrl(env: Environment): string {
    const portMap: Record<Environment, number> = {
      'local': 3000,
      'dev': 3000,
      'dev-demo': 3001,
      'demo': 3002,
      'release': 80,
      "production": 443
    };

    const protocol = (env === 'release' || env === "production") ? 'https' : 'http';
    const port = portMap[env];
    
    return `${protocol}://localhost${port !== 80 && port !== 443 ? `:${port}` : ''}`;
  }

  /**
   * Map environment to NODE_ENV
   */
  private mapEnvironmentToNodeEnv(env: Environment): string {
    switch(env) {
      case 'local':
      case 'dev':
        return "development";
      case 'dev-demo':
      case 'demo':
        return 'staging';
      case 'release':
      case "production":
        return "production";
      default:
        return "development";
    }
  }

  /**
   * Stop environment deployment
   */
  async stopEnvironment(env: Environment): Promise<void> {
    const composePath = path.join(this.baseDir, `.docker-compose.${env}.yml`);
    
    if (fs.existsSync(composePath)) {
      await this.composeManager.down({
        file: composePath,
        volumes: true,
        removeOrphans: true
      });
      
      console.log(`✅ Stopped ${env} environment`);
    }
  }

  /**
   * Get deployment status
   */
  getDeploymentStatus(deploymentId: string): EnvironmentDeployment | undefined {
    return this.deployments.get(deploymentId);
  }

  /**
   * List all deployments
   */
  listDeployments(): EnvironmentDeployment[] {
    return Array.from(this.deployments.values());
  }
}