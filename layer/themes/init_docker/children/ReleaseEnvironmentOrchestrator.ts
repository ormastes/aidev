import { path } from '../../infra_external-log-lib/src';
import { fs } from '../../infra_external-log-lib/src';
import { DockerBuilder } from './DockerBuilder';
import { ComposeManager } from './ComposeManager';
import { ContainerRunner } from './ContainerRunner';
import { FolderMountManager } from './FolderMountManager';
import { Environment } from './EnvironmentManager';

export interface ReleaseConfig {
  themes: string[];
  environment: 'release' | 'production';
  replicas?: number;
  domain?: string;
  ssl?: boolean;
  monitoring?: boolean;
  backup?: boolean;
  resources?: {
    memory: string;
    cpu: string;
  };
  secrets?: Record<string, string>;
  healthcheck?: {
    interval: string;
    timeout: string;
    retries: number;
  };
}

export interface ReleaseDeployment {
  id: string;
  environment: Environment;
  version: string;
  themes: string[];
  status: 'preparing' | 'building' | 'deploying' | 'running' | 'failed';
  startTime: Date;
  endTime?: Date;
  services: Map<string, ServiceStatus>;
  url?: string;
  metrics?: DeploymentMetrics;
}

export interface ServiceStatus {
  name: string;
  image: string;
  replicas: number;
  runningReplicas: number;
  status: 'starting' | 'healthy' | 'unhealthy' | 'stopped';
  ports: string[];
  health?: string;
}

export interface DeploymentMetrics {
  cpu: number;
  memory: number;
  network: {
    rx: number;
    tx: number;
  };
  uptime: number;
  requests?: number;
  errors?: number;
}

export class ReleaseEnvironmentOrchestrator {
  private dockerBuilder: DockerBuilder;
  private composeManager: ComposeManager;
  private containerRunner: ContainerRunner;
  private folderManager: FolderMountManager;
  private deployments: Map<string, ReleaseDeployment>;
  private baseDir: string;

  constructor(baseDir?: string) {
    this.dockerBuilder = new DockerBuilder();
    this.composeManager = new ComposeManager();
    this.containerRunner = new ContainerRunner();
    this.folderManager = new FolderMountManager(baseDir);
    this.deployments = new Map();
    this.baseDir = baseDir || process.cwd();
  }

  /**
   * Deploy to release/production environment
   */
  async deploy(config: ReleaseConfig): Promise<ReleaseDeployment> {
    const deploymentId = `${config.environment}-${Date.now()}`;
    const version = await this.getVersion();
    
    const deployment: ReleaseDeployment = {
      id: deploymentId,
      environment: config.environment,
      version,
      themes: config.themes,
      status: 'preparing',
      startTime: new Date(),
      services: new Map()
    };

    this.deployments.set(deploymentId, deployment);

    try {
      console.log(`🚀 Starting ${config.environment} deployment v${version}...`);

      // Phase 1: Preparation
      deployment.status = 'preparing';
      await this.prepareDeployment(config, deployment);

      // Phase 2: Building
      deployment.status = 'building';
      await this.buildImages(config, deployment);

      // Phase 3: Deployment
      deployment.status = 'deploying';
      await this.deployServices(config, deployment);

      // Phase 4: Health checks
      await this.performHealthChecks(deployment);

      deployment.status = 'running';
      deployment.endTime = new Date();
      deployment.url = this.getDeploymentUrl(config);

      console.log(`✅ Deployment successful!`);
      console.log(`   🌐 URL: ${deployment.url}`);
      console.log(`   📊 Services: ${deployment.services.size} running`);
      console.log(`   ⏱️  Duration: ${this.getDeploymentDuration(deployment)}s`);

      // Start monitoring if enabled
      if(config.monitoring) {
        this.startMonitoring(deployment);
      }

      return deployment;

    } catch (error) {
      deployment.status = 'failed';
      deployment.endTime = new Date();
      console.error(`❌ Deployment failed:`, error);
      
      // Rollback on failure
      await this.rollback(deploymentId);
      
      throw error;
    }
  }

  /**
   * Prepare deployment environment
   */
  private async prepareDeployment(config: ReleaseConfig, deployment: ReleaseDeployment): Promise<void> {
    console.log('📋 Preparing deployment...');

    // Validate all themes exist
    for(const theme of config.themes) {
      const validation = await this.folderManager.validateFolderStructure(theme);
      if(!validation.valid) {
        throw new Error(`Theme ${theme} validation failed: Missing ${validation.missing.join(', ')}`);
      }
    }

    // Create deployment directory within the theme
    const deployDir = path.join(__dirname, '..', 'deployments', deployment.id);
    await fileAPI.createDirectory(deployDir);

    // Generate secrets file if provided
    if(config.secrets) {
      await this.generateSecretsFile(deployDir, config.secrets);
    }

    // Generate SSL certificates if needed
    if(config.ssl && !await this.sslCertsExist()) {
      await this.generateSSLCertificates(deployDir);
    }

    console.log('✅ Preparation complete');
  }

  /**
   * Build production images
   */
  private async buildImages(config: ReleaseConfig, deployment: ReleaseDeployment): Promise<void> {
    console.log('🔨 Building production images...');

    for(const theme of config.themes) {
      const tag = `aidev/${theme}:${deployment.version}`;
      
      console.log(`   Building ${theme}...`);

      // Generate production Dockerfile
      const dockerfile = this.generateProductionDockerfile(theme, config);
      const dockerfilePath = path.join(
        this.baseDir,
        'layer',
        'themes',
        theme,
        'Dockerfile.production'
      );
      
      await this.dockerBuilder.saveDockerfile(dockerfile, dockerfilePath);

      // Build with multi-stage optimization
      await this.dockerBuilder.buildImage({
        tag,
        context: path.join(this.baseDir, 'layer', 'themes', theme),
        dockerfile: dockerfilePath,
        buildArgs: {
          VERSION: deployment.version,
          BUILD_DATE: new Date().toISOString(),
          ENVIRONMENT: config.environment
        },
        platform: 'linux/amd64'
      });

      // Tag as latest
      await this.tagImage(tag, `aidev/${theme}:latest`);

      // Initialize service status
      deployment.services.set(theme, {
        name: theme,
        image: tag,
        replicas: config.replicas || 1,
        runningReplicas: 0,
        status: 'starting',
        ports: []
      });
    }

    console.log('✅ All images built');
  }

  /**
   * Generate production Dockerfile
   */
  async private generateProductionDockerfile(theme: string, config: ReleaseConfig): string {
    return `
# Multi-stage production build
# Stage 1: Dependencies
FROM node:18-alpine AS deps
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Builder
FROM node:18-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --production

# Stage 3: Production
FROM node:18-alpine AS production
RUN apk add --no-cache tini curl
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \\
    adduser -S nodejs -u 1001

# Copy production dependencies
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Copy public assets if exist
COPY --chown=nodejs:nodejs public* ./public/

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=${config.healthcheck?.interval || '30s'} \\
  --timeout=${config.healthcheck?.timeout || '10s'} \\
  --start-period=60s \\
  --retries=${config.healthcheck?.retries || 3} \\
  CMD curl -f http://localhost:3000/health || exit 1

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start application
CMD ["node", "dist/index.js"]
`.trim();
  }

  /**
   * Deploy services with orchestration
   */
  private async deployServices(config: ReleaseConfig, deployment: ReleaseDeployment): Promise<void> {
    console.log('🐳 Deploying services...');

    // Generate production docker-compose
    const composeConfig = this.generateProductionCompose(config, deployment);
    const composePath = path.join(
      this.baseDir,
      'deployments',
      deployment.id,
      'docker-compose.yml'
    );

    await fileAPI.createFile(composePath, this.composeManager.generateComposeFile(composeConfig, { type: FileType.TEMPORARY }),
      'utf8'
    );

    // Deploy with rolling update
    await this.composeManager.up({
      file: composePath,
      detach: true,
      projectName: `aidev-${config.environment}`
    });

    // Update service statuses
    for(const [themeName, service] of deployment.services) {
      const containers = await this.containerRunner.list();
      const themeContainers = containers.filter(c => 
        c.name.includes(themeName.replace(/_/g, '-'))
      );
      
      service.runningReplicas = themeContainers.length;
      service.status = themeContainers.length > 0 ? 'healthy' : 'unhealthy';
      service.ports = this.getServicePorts(themeName, config);
    }

    console.log('✅ Services deployed');
  }

  /**
   * Generate production docker-compose configuration
   */
  async private generateProductionCompose(config: ReleaseConfig, deployment: ReleaseDeployment): any {
    const services: Record<string, any> = {};
    
    config.themes.forEach(theme => {
      const serviceName = theme.replace(/_/g, '-');
      
      services[serviceName] = {
        image: `aidev/${theme}:${deployment.version}`,
        container_name: `${config.environment}-${serviceName}`,
        deploy: {
          replicas: config.replicas || 1,
          update_config: {
            parallelism: 1,
            delay: '10s',
            failure_action: 'rollback'
          },
          restart_policy: {
            condition: 'any',
            delay: '5s',
            max_attempts: 3,
            window: '120s'
          },
          resources: {
            limits: {
              cpus: config.resources?.cpu || '2',
              memory: config.resources?.memory || '2G'
            },
            reservations: {
              cpus: '0.5',
              memory: '512M'
            }
          }
        },
        networks: ['production-network'],
        volumes: [
          `${theme}_data:/app/data`,
          `${theme}_logs:/app/logs`
        ],
        environment: {
          NODE_ENV: 'production',
          ENVIRONMENT: config.environment,
          VERSION: deployment.version
        },
        logging: {
          driver: 'json-file',
          options: {
            'max-size': '10m',
            'max-file': '5'
          }
        }
      };

      // Add ports based on service type
      if(theme === 'portal_aidev' || theme === 'mate-dealer') {
        services[serviceName].ports = config.ssl 
          ? ['443:3443', '80:3000']
          : ['80:3000'];
      }
    });

    // Add reverse proxy if SSL is enabled
    if(config.ssl) {
      services['nginx-proxy'] = {
        image: 'nginx:alpine',
        ports: ['443:443', '80:80'],
        volumes: [
          './nginx.conf:/etc/nginx/nginx.conf:ro',
          './certs:/etc/nginx/certs:ro'
        ],
        networks: ['production-network'],
        depends_on: config.themes.map(t => t.replace(/_/g, '-'))
      };
    }

    return {
      version: '3.8',
      services,
      networks: {
        'production-network': {
          driver: 'overlay',
          attachable: true,
          encrypted: true
        }
      },
      volumes: this.generateProductionVolumes(config.themes),
      secrets: config.secrets ? Object.keys(config.secrets).reduce((acc, key) => {
        acc[key] = { file: `./secrets/${key}` };
        return acc;
      }, {} as Record<string, any>) : undefined
    };
  }

  /**
   * Generate production volumes
   */
  async private generateProductionVolumes(themes: string[]): Record<string, any> {
    const volumes: Record<string, any> = {};
    
    themes.forEach(theme => {
      volumes[`${theme}_data`] = {
        driver: 'local',
        driver_opts: {
          type: 'none',
          o: 'bind',
          device: path.join(this.baseDir, 'data', theme)
        }
      };
      
      volumes[`${theme}_logs`] = {
        driver: 'local',
        driver_opts: {
          type: 'none',
          o: 'bind',
          device: path.join(this.baseDir, 'logs', theme)
        }
      };
    });

    return volumes;
  }

  /**
   * Perform health checks on deployed services
   */
  private async performHealthChecks(deployment: ReleaseDeployment): Promise<void> {
    console.log('🏥 Performing health checks...');

    const maxRetries = 10;
    const retryDelay = 5000;

    for(const [themeName, service] of deployment.services) {
      let healthy = false;
      
      for(let i = 0; i < maxRetries; i++) {
        try {
          const containers = await this.containerRunner.list();
          const themeContainer = containers.find(c => 
            c.name.includes(themeName.replace(/_/g, '-'))
          );

          if(themeContainer) {
            const isHealthy = await this.containerRunner.waitForHealthy(
              themeContainer.id, 
              10000
            );
            
            if(isHealthy) {
              healthy = true;
              service.status = 'healthy';
              service.health = 'Healthy';
              console.log(`   ✅ ${themeName}: Healthy`);
              break;
            }
          }
        } catch (error) {
          console.log(`   ⏳ ${themeName}: Checking... (${i + 1}/${maxRetries})`);
        }

        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }

      if(!healthy) {
        service.status = 'unhealthy';
        service.health = 'Unhealthy';
        console.warn(`   ⚠️  ${themeName}: Health check failed`);
      }
    }
  }

  /**
   * Start monitoring for deployment
   */
  async private startMonitoring(deployment: ReleaseDeployment): void {
    console.log('📊 Starting monitoring...');

    const monitoringInterval = setInterval(async () => {
      try {
        const metrics: DeploymentMetrics = {
          cpu: 0,
          memory: 0,
          network: { rx: 0, tx: 0 },
          uptime: (Date.now() - deployment.startTime.getTime()) / 1000
        };

        // Collect metrics from all containers
        for(const [themeName] of deployment.services) {
          const containers = await this.containerRunner.list();
          const themeContainer = containers.find(c => 
            c.name.includes(themeName.replace(/_/g, '-'))
          );

          if(themeContainer) {
            const stats = await this.containerRunner.stats(themeContainer.id);
            metrics.cpu += stats.cpu;
            metrics.memory += stats.memory.usage;
            metrics.network.rx += stats.network.rx;
            metrics.network.tx += stats.network.tx;
          }
        }

        deployment.metrics = metrics;

      } catch (error) {
        console.error('Monitoring error:', error);
      }
    }, 30000); // Every 30 seconds

    // Store interval ID for cleanup
    (deployment as any).monitoringInterval = monitoringInterval;
  }

  /**
   * Rollback deployment
   */
  async rollback(deploymentId: string): Promise<void> {
    console.log('⏪ Rolling back deployment...');

    const deployment = this.deployments.get(deploymentId);
    if(!deployment) {
      return;
    }

    const composePath = path.join(
      this.baseDir,
      'deployments',
      deployment.id,
      'docker-compose.yml'
    );

    if(fs.existsSync(composePath)) {
      await this.composeManager.down({
        file: composePath,
        volumes: false,
        removeOrphans: true
      });
    }

    console.log('✅ Rollback complete');
  }

  /**
   * Get deployment URL
   */
  async private getDeploymentUrl(config: ReleaseConfig): string {
    const protocol = config.ssl ? 'https' : 'http';
    const domain = config.domain || 'localhost';
    return `${protocol}://${domain}`;
  }

  /**
   * Get service ports
   */
  async private getServicePorts(theme: string, config: ReleaseConfig): string[] {
    const portMap: Record<string, string[]> = {
      'portal_aidev': config.ssl ? ['443', '80'] : ['80'],
      'mate-dealer': ['3303'],
      'portal_gui-selector': ['3456'],
      'portal_security': ['3402']
    };

    return portMap[theme] || [];
  }

  /**
   * Get deployment duration
   */
  async private getDeploymentDuration(deployment: ReleaseDeployment): number {
    if(!deployment.endTime) {
      return 0;
    }
    return Math.round((deployment.endTime.getTime() - deployment.startTime.getTime()) / 1000);
  }

  /**
   * Get version from package.json
   */
  private async getVersion(): Promise<string> {
    try {
      const packagePath = path.join(this.baseDir, 'package.json');
      const packageJson = JSON.parse(await fs.promises.readFile(packagePath, 'utf8'));
      return packageJson.version || '1.0.0';
    } catch {
      return '1.0.0';
    }
  }

  /**
   * Tag Docker image
   */
  private async tagImage(source: string, target: string): Promise<void> {
    const { exec } = require('child_process').promises;
    await exec(`docker tag ${source} ${target}`);
  }

  /**
   * Check if SSL certificates exist
   */
  private async sslCertsExist(): Promise<boolean> {
    const certPath = path.join(this.baseDir, 'certs', 'cert.pem');
    const keyPath = path.join(this.baseDir, 'certs', 'key.pem');
    return fs.existsSync(certPath) && fs.existsSync(keyPath);
  }

  /**
   * Generate self-signed SSL certificates
   */
  private async generateSSLCertificates(deployDir: string): Promise<void> {
    console.log('🔐 Generating SSL certificates...');
    const { exec } = require('child_process').promises;
    
    const certsDir = path.join(deployDir, 'certs');
    await fileAPI.createDirectory(certsDir);

    await exec(`openssl req -x509 -newkey rsa:4096 -nodes -keyout ${certsDir}/key.pem -out ${certsDir}/cert.pem -days 365 -subj "/CN=localhost"`);
  }

  /**
   * Generate secrets file
   */
  private async generateSecretsFile(deployDir: string, secrets: Record<string, string>): Promise<void> {
    const secretsDir = path.join(deployDir, 'secrets');
    await fileAPI.createDirectory(secretsDir);

    for(const [key, value] of Object.entries(secrets)) {
      await fileAPI.createFile(path.join(secretsDir, key, { type: FileType.TEMPORARY }),
        value,
        { mode: 0o600 }
      );
    }
  }

  /**
   * Get deployment status
   */
  getDeployment(deploymentId: string): ReleaseDeployment | undefined {
    return this.deployments.get(deploymentId);
  }

  /**
   * List all deployments
   */
  listDeployments(): ReleaseDeployment[] {
    return Array.from(this.deployments.values());
  }
}