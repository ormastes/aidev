import { fs } from '../../infra_external-log-lib/src';
import { path } from '../../infra_external-log-lib/src';
import * as yaml from 'js-yaml';
import { exec } from 'child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export interface ServiceConfig {
  image?: string;
  build?: {
    context?: string;
    dockerfile?: string;
    args?: Record<string, string>;
    target?: string;
  };
  ports?: string[];
  volumes?: string[];
  environment?: Record<string, string> | string[];
  networks?: string[];
  depends_on?: string[] | Record<string, { condition: string }>;
  restart?: 'no' | 'always' | 'unless-stopped' | 'on-failure';
  command?: string | string[];
  entrypoint?: string | string[];
  healthcheck?: {
    test: string | string[];
    interval?: string;
    timeout?: string;
    retries?: number;
    start_period?: string;
  };
  deploy?: {
    replicas?: number;
    resources?: {
      limits?: {
        cpus?: string;
        memory?: string;
      };
      reservations?: {
        cpus?: string;
        memory?: string;
      };
    };
  };
  labels?: Record<string, string>;
  container_name?: string;
}

export interface ComposeConfig {
  version?: string;
  services: Record<string, ServiceConfig>;
  networks?: Record<string, any>;
  volumes?: Record<string, any>;
  secrets?: Record<string, any>;
  configs?: Record<string, any>;
}

export interface ComposeOptions {
  projectName?: string;
  file?: string;
  profiles?: string[];
  env?: Record<string, string>;
}

export class ComposeManager {
  private defaultNetworkName: string = 'aidev-network';
  private defaultVersion: string = '3.8';

  /**
   * Generate docker-compose.yml from configuration
   */
  async generateComposeFile(config: ComposeConfig): string {
    const composeData: any = {
      version: config.version || this.defaultVersion,
      services: config.services
    };

    // Add networks if specified
    if(config.networks) {
      composeData.networks = config.networks;
    } else {
      // Add default network
      composeData.networks = {
        [this.defaultNetworkName]: {
          driver: 'bridge'
        }
      };
    }

    // Add volumes if specified
    if(config.volumes) {
      composeData.volumes = config.volumes;
    }

    // Add secrets if specified
    if(config.secrets) {
      composeData.secrets = config.secrets;
    }

    // Add configs if specified
    if(config.configs) {
      composeData.configs = config.configs;
    }

    return yaml.dump(composeData, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false
    });
  }

  /**
   * Generate compose configuration for AI Development Platform themes
   */
  async generatePlatformCompose(themes: string[]): ComposeConfig {
    const services: Record<string, ServiceConfig> = {};
    
    themes.forEach(theme => {
      const serviceName = theme.replace(/_/g, '-');
      const port = this.getDefaultPort(theme);
      
      services[serviceName] = {
        build: {
          context: `./layer/themes/${theme}`,
          dockerfile: "Dockerfile"
        },
        image: `aidev/${serviceName}:latest`,
        container_name: `aidev-${serviceName}`,
        ports: port ? [`${port}:${port}`] : undefined,
        environment: {
          NODE_ENV: "production",
          SERVICE_NAME: serviceName
        },
        networks: [this.defaultNetworkName],
        restart: 'unless-stopped',
        healthcheck: {
          test: ['CMD', 'curl', '-f', `http://localhost:${port}/health`],
          interval: '30s',
          timeout: '10s',
          retries: 3,
          start_period: '40s'
        }
      };
    });

    return {
      version: this.defaultVersion,
      services,
      networks: {
        [this.defaultNetworkName]: {
          driver: 'bridge'
        }
      }
    };
  }

  /**
   * Run docker-compose command
   */
  async runCompose(command: string, options?: ComposeOptions): Promise<string> {
    const args: string[] = ['docker-compose'];
    
    if(options?.projectName) {
      args.push('-p', options.projectName);
    }
    
    if(options?.file) {
      args.push('-f', options.file);
    }
    
    if(options?.profiles && options.profiles.length > 0) {
      options.profiles.forEach(profile => {
        args.push('--profile', profile);
      });
    }
    
    args.push(...command.split(' '));
    
    const env = {
      ...process.env,
      ...options?.env
    };
    
    const { stdout, stderr } = await execAsync(args.join(' '), { env });
    
    if(stderr && !this.isWarning(stderr)) {
      throw new Error(`Docker Compose command failed: ${stderr}`);
    }
    
    return stdout;
  }

  /**
   * Start services
   */
  async up(options?: ComposeOptions & { detach?: boolean; build?: boolean }): Promise<string> {
    let command = 'up';
    
    if(options?.detach) {
      command += ' -d';
    }
    
    if(options?.build) {
      command += ' --build';
    }
    
    return this.runCompose(command, options);
  }

  /**
   * Stop services
   */
  async down(options?: ComposeOptions & { volumes?: boolean; removeOrphans?: boolean }): Promise<string> {
    let command = 'down';
    
    if(options?.volumes) {
      command += ' -v';
    }
    
    if(options?.removeOrphans) {
      command += ' --remove-orphans';
    }
    
    return this.runCompose(command, options);
  }

  /**
   * List running services
   */
  async ps(options?: ComposeOptions): Promise<string> {
    return this.runCompose('ps', options);
  }

  /**
   * Get service logs
   */
  async logs(service?: string, options?: ComposeOptions & { follow?: boolean; tail?: number }): Promise<string> {
    let command = 'logs';
    
    if(options?.follow) {
      command += ' -f';
    }
    
    if(options?.tail) {
      command += ` --tail ${options.tail}`;
    }
    
    if(service) {
      command += ` ${service}`;
    }
    
    return this.runCompose(command, options);
  }

  /**
   * Execute command in service
   */
  async exec(service: string, cmd: string, options?: ComposeOptions): Promise<string> {
    const command = `exec ${service} ${cmd}`;
    return this.runCompose(command, options);
  }

  /**
   * Validate compose file
   */
  async validate(filepath: string): Promise<boolean> {
    try {
      const content = await fs.promises.readFile(filepath, 'utf8');
      yaml.load(content);
      
      // Try docker-compose config to validate
      await this.runCompose('config', { file: filepath });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Save compose file
   */
  async saveComposeFile(content: string, filepath: string): Promise<void> {
    await fileAPI.createFile(filepath, content, { type: FileType.TEMPORARY });
  }

  /**
   * Load compose file
   */
  async loadComposeFile(filepath: string): Promise<ComposeConfig> {
    const content = await fs.promises.readFile(filepath, 'utf8');
    return yaml.load(content) as ComposeConfig;
  }

  /**
   * Merge multiple compose configurations
   */
  mergeConfigs(...configs: ComposeConfig[]): ComposeConfig {
    const merged: ComposeConfig = {
      version: this.defaultVersion,
      services: {}
    };

    configs.forEach(config => {
      // Merge services
      Object.assign(merged.services, config.services);
      
      // Merge networks
      if (config.networks) {
        merged.networks = { ...merged.networks, ...config.networks };
      }
      
      // Merge volumes
      if (config.volumes) {
        merged.volumes = { ...merged.volumes, ...config.volumes };
      }
      
      // Merge secrets
      if (config.secrets) {
        merged.secrets = { ...merged.secrets, ...config.secrets };
      }
      
      // Merge configs
      if (config.configs) {
        merged.configs = { ...merged.configs, ...config.configs };
      }
    });

    return merged;
  }

  /**
   * Get default port for a theme
   */
  private getDefaultPort(theme: string): number {
    const portMap: Record<string, number> = {
      'mate-dealer': 3303,
      'portal_gui-selector': 3456,
      'infra_story-reporter': 3401,
      'portal_security': 3402,
      'portal_aidev': 3400,
      'mcp_agent': 3500,
      'llm-agent_chat-space': 3600
    };
    
    return portMap[theme] || 3000;
  }

  /**
   * Check if stderr contains only warnings
   */
  private isWarning(stderr: string): boolean {
    const warningPatterns = [
      /WARNING:/i,
      /WARN:/i,
      /Pulling from/i,
      /Digest:/i,
      /Status:/i
    ];
    
    return warningPatterns.some(pattern => pattern.test(stderr));
  }
}