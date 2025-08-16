/**
 * Legacy ConfigManager from root/config
 * This is preserved for backward compatibility with existing tests
 * New code should use the ConfigManager in user-stories/025-env-config-system
 */

import * as fs from '../../layer/themes/infra_external-log-lib/src';
import * as path from 'node:path';

export interface ServiceConfig {
  portal: number;
  story_reporter: number;
  gui_selector: number;
  auth_service: number;
  db_service: number;
}

export interface EnvironmentConfig {
  name: string;
  port_range: [number, number];
  base_path: string;
  db_prefix: string;
  services: ServiceConfig;
}

export interface DatabaseConfig {
  postgres: {
    host: string;
    port: number;
    ssl: boolean;
  };
  sqlite: {
    data_dir: string;
  };
}

export interface EnvironmentsConfig {
  environments: {
    theme: EnvironmentConfig;
    epic: EnvironmentConfig;
    demo: EnvironmentConfig;
    release: EnvironmentConfig;
  };
  database: DatabaseConfig;
  themes: string[];
  inter_theme_connections: Record<string, string[]>;
}

export class ConfigManager {
  private config: EnvironmentsConfig;
  private projectRoot: string;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || path.resolve(__dirname, '../../../..');
    this.config = this.loadConfig();
  }

  private loadConfig(): EnvironmentsConfig {
    const configPath = path.join(this.projectRoot, 'config', 'environments.json');
    
    try {
      const configData = fileAPI.readFileSync(configPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      console.error('Failed to load environments config:', error);
      // Return default config
      return this.getDefaultConfig();
    }
  }

  private getDefaultConfig(): EnvironmentsConfig {
    return {
      environments: {
        theme: {
          name: 'theme',
          port_range: [3000, 3099],
          base_path: 'layer/themes',
          db_prefix: 'theme_',
          services: {
            portal: 3000,
            story_reporter: 3010,
            gui_selector: 3020,
            auth_service: 3030,
            db_service: 3040
          }
        },
        epic: {
          name: 'epic',
          port_range: [3100, 3199],
          base_path: 'layer/epics',
          db_prefix: 'epic_',
          services: {
            portal: 3100,
            story_reporter: 3110,
            gui_selector: 3120,
            auth_service: 3130,
            db_service: 3140
          }
        },
        demo: {
          name: 'demo',
          port_range: [3200, 3299],
          base_path: 'demo',
          db_prefix: 'demo_',
          services: {
            portal: 3200,
            story_reporter: 3210,
            gui_selector: 3220,
            auth_service: 3230,
            db_service: 3240
          }
        },
        release: {
          name: 'release',
          port_range: [3300, 3399],
          base_path: 'release',
          db_prefix: 'release_',
          services: {
            portal: 3300,
            story_reporter: 3310,
            gui_selector: 3320,
            auth_service: 3330,
            db_service: 3340
          }
        }
      },
      database: {
        postgres: {
          host: "localhost",
          port: 5432,
          ssl: false
        },
        sqlite: {
          data_dir: './data'
        }
      },
      themes: [],
      inter_theme_connections: {}
    };
  }

  getEnvironmentConfig(environment: keyof EnvironmentsConfig["environments"]): EnvironmentConfig {
    return this.config.environments[environment];
  }

  getAllEnvironments(): EnvironmentsConfig["environments"] {
    return this.config.environments;
  }

  getDatabaseConfig(): DatabaseConfig {
    return this.config.database;
  }

  getThemes(): string[] {
    return this.config.themes;
  }

  getInterThemeConnections(): Record<string, string[]> {
    return this.config.inter_theme_connections;
  }

  getPortForService(environment: keyof EnvironmentsConfig["environments"], service: keyof ServiceConfig): number {
    return this.config.environments[environment].services[service];
  }

  getPortRange(environment: keyof EnvironmentsConfig["environments"]): [number, number] {
    return this.config.environments[environment].port_range;
  }

  isPortInRange(port: number, environment: keyof EnvironmentsConfig["environments"]): boolean {
    const [min, max] = this.getPortRange(environment);
    return port >= min && port <= max;
  }

  saveConfig(config: EnvironmentsConfig): void {
    const configPath = path.join(this.projectRoot, 'config', 'environments.json');
    await fileAPI.createFile(configPath, JSON.stringify(config, { type: FileType.TEMPORARY }));
    this.config = config;
  }
}

export default ConfigManager;