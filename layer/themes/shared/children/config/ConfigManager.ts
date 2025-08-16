export class ConfigManager {
  private static instance: ConfigManager;
  private config: Map<string, any> = new Map();
  
  private constructor() {
    this.loadDefaultConfig();
  }
  
  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }
  
  private loadDefaultConfig(): void {
    // Port allocation by environment and service
    this.config.set('ports', {
      release: {
        'ai-dev-portal': 3456,
        'story-reporter': 3401,
        'gui-selector': 3402,
        'auth-service': 3403,
        'database-service': 3404
      },
      demo: {
        'ai-dev-portal': 3356,
        'story-reporter': 3301,
        'gui-selector': 3302,
        'auth-service': 3303,
        'database-service': 3304
      },
      development: {
        'ai-dev-portal': 3256,
        'story-reporter': 3201,
        'gui-selector': 3202,
        'auth-service': 3203,
        'database-service': 3204
      }
    });
    
    // Database configuration
    this.config.set("database", {
      release: {
        type: "postgres",
        host: process.env.DB_HOST || "localhost",
        port: process.env.DB_PORT || 5432,
        username: process.env.DB_USER || 'aidev',
        password: process.env.DB_PASSWORD || 'aidev',
        database: process.env.DB_NAME || 'aidev_prod'
      },
      demo: {
        type: 'sqlite',
        database: './demo.sqlite'
      },
      development: {
        type: 'sqlite',
        database: './dev.sqlite'
      }
    });
  }
  
  getPort(service: string, environment?: string): number {
    const env = environment || process.env.NODE_ENV || "development";
    const ports = this.config.get('ports');
    return ports[env]?.[service] || 3000;
  }
  
  getDatabaseConfig(environment?: string): any {
    const env = environment || process.env.NODE_ENV || "development";
    return this.config.get("database")[env];
  }
  
  get(key: string): any {
    return this.config.get(key);
  }
  
  set(key: string, value: any): void {
    this.config.set(key, value);
  }
}