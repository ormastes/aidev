import { ConfigManager } from '../../../layer/themes/init_env-config/children/LegacyConfigManager';
import { fs } from '../../../layer/themes/infra_external-log-lib/dist';
import { path } from '../../../layer/themes/infra_external-log-lib/dist';
import * as os from 'os';

async describe('ConfigManager System Tests', () => {
  let configManager: ConfigManager;
  let tempDir: string;
  let mockConfigPath: string;

  async beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-test-'));
    const configDir = path.join(tempDir, 'config');
    await fileAPI.createDirectory(configDir);
    
    mockConfigPath = path.join(configDir, 'environments.json');
    const mockConfig = {
      environments: {
        theme: {
          name: "Theme Development",
          port_range: [3000, 3099],
          base_path: "layer/themes",
          db_prefix: "theme",
          services: {
            portal: 3001,
            story_reporter: 3002,
            gui_selector: 3003,
            auth_service: 3004,
            db_service: 3005
          }
        },
        epic: {
          name: "Epic Integration",
          port_range: [3100, 3199],
          base_path: "layer/epic",
          db_prefix: "epic",
          services: {
            portal: 3101,
            story_reporter: 3102,
            gui_selector: 3103,
            auth_service: 3104,
            db_service: 3105
          }
        },
        demo: {
          name: "Demo Environment",
          port_range: [3200, 3299],
          base_path: "demo",
          db_prefix: "demo",
          services: {
            portal: 3201,
            story_reporter: 3202,
            gui_selector: 3203,
            auth_service: 3204,
            db_service: 3205
          }
        },
        release: {
          name: "Production Release",
          port_range: [8000, 8099],
          base_path: "release",
          db_prefix: "prod",
          services: {
            portal: 8001,
            story_reporter: 8002,
            gui_selector: 8003,
            auth_service: 8004,
            db_service: 8005
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
          data_dir: "data"
        }
      },
      themes: ["aidev-portal", "chat-space", "cli-framework"],
      inter_theme_connections: {
        "aidev-portal": ["story-reporter", "gui-selector"],
        "chat-space": ["auth-service"],
        "cli-framework": ["external-log-lib"]
      }
    };
    
    await fileAPI.createFile(mockConfigPath, JSON.stringify(mockConfig, { type: FileType.TEMPORARY }));
    configManager = new ConfigManager(tempDir);
  });

  async afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  async describe('Configuration Loading', () => {
    async test('should load configuration from file system', () => {
      expect(configManager).toBeDefined();
      expect(configManager.getThemes()).toContain('aidev-portal');
      expect(configManager.getThemes()).toContain('chat-space');
      expect(configManager.getThemes()).toContain('cli-framework');
    });

    async test('should handle all environment types', () => {
      const environments = ['theme', 'epic', 'demo', 'release'] as const;
      
      environments.forEach(env => {
        const config = configManager.getEnvironment(env);
        expect(config).toBeDefined();
        expect(config.name).toBeDefined();
        expect(config.port_range).toHaveLength(2);
        expect(config.services).toBeDefined();
      });
    });
  });

  async describe('Port Management System Tests', () => {
    async test('should manage port allocation across all environments', () => {
      const themePort = configManager.getServicePort('theme', 'portal');
      const epicPort = configManager.getServicePort('epic', 'portal');
      const demoPort = configManager.getServicePort('demo', 'portal');
      const releasePort = configManager.getServicePort('release', 'portal');

      expect(themePort).toBe(3001);
      expect(epicPort).toBe(3101);
      expect(demoPort).toBe(3201);
      expect(releasePort).toBe(8001);

      // Ensure no port conflicts
      const allPorts = [themePort, epicPort, demoPort, releasePort];
      const uniquePorts = new Set(allPorts);
      expect(uniquePorts.size).toBe(allPorts.length);
    });

    async test('should correctly identify port availability', () => {
      expect(configManager.isPortAvailable(3001)).toBe(false); // theme portal
      expect(configManager.isPortAvailable(3050)).toBe(true);  // within theme range but unallocated
      expect(configManager.isPortAvailable(2000)).toBe(false); // outside all ranges
    });

    async test('should find next available ports in each environment', () => {
      const themePort = configManager.getNextAvailablePort('theme');
      const epicPort = configManager.getNextAvailablePort('epic');
      
      expect(themePort).toBeGreaterThanOrEqual(3000);
      expect(themePort).toBeLessThanOrEqual(3099);
      expect(epicPort).toBeGreaterThanOrEqual(3100);
      expect(epicPort).toBeLessThanOrEqual(3199);
    });
  });

  async describe('Database Configuration System Tests', () => {
    async test('should generate postgres config for release environment', () => {
      const config = configManager.getDatabaseConfig('release', 'postgres');
      
      expect(config.host).toBe('localhost');
      expect(config.port).toBe(5432);
      expect(config.database).toBe('prod_ai_dev_portal');
      expect(config.user).toBe('prod_user');
      expect(config.password).toBe('prod_pass_2024');
      expect(config.ssl).toBe(false);
    });

    async test('should generate sqlite config for development environments', () => {
      const themeConfig = configManager.getDatabaseConfig('theme', 'sqlite');
      const demoConfig = configManager.getDatabaseConfig('demo', 'sqlite');
      
      expect(themeConfig.path).toContain('theme_ai_dev_portal.db');
      expect(demoConfig.path).toContain('demo_ai_dev_portal.db');
      
      // Ensure different environments have different database paths
      expect(themeConfig.path).not.toBe(demoConfig.path);
    });

    async test('should handle all database type and environment combinations', () => {
      const environments = ['theme', 'epic', 'demo', 'release'] as const;
      const dbTypes = ['postgres', 'sqlite'] as const;
      
      environments.forEach(env => {
        dbTypes.forEach(dbType => {
          const config = configManager.getDatabaseConfig(env, dbType);
          expect(config).toBeDefined();
          
          if (dbType === 'postgres') {
            expect(config.host).toBeDefined();
            expect(config.port).toBeDefined();
            expect(config.database).toBeDefined();
          } else {
            expect(config.path).toBeDefined();
          }
        });
      });
    });
  });

  async describe('Environment File Generation System Tests', () => {
    async test('should generate complete .env files for all services', () => {
      const services = ['portal', 'story_reporter', 'gui_selector', 'auth_service', 'db_service'];
      const environments = ['theme', 'epic', 'demo', 'release'] as const;
      
      environments.forEach(env => {
        services.forEach(service => {
          const envContent = configManager.generateEnvFile(env, service);
          
          // Verify essential environment variables are present
          expect(envContent).toContain(`NODE_ENV=${env}`);
          expect(envContent).toContain(`SERVICE_NAME=${service}`);
          expect(envContent).toContain('PORT=');
          expect(envContent).toContain('DB_TYPE=');
          expect(envContent).toContain('JWT_SECRET=');
          expect(envContent).toContain('PORTAL_URL=');
          expect(envContent).toContain('AUTH_SERVICE_URL=');
          
          // Verify database type is correct for environment
          if (env === 'release') {
            expect(envContent).toContain('DB_TYPE=postgres');
            expect(envContent).toContain('DB_HOST=');
            expect(envContent).toContain('DB_PORT=');
          } else {
            expect(envContent).toContain('DB_TYPE=sqlite');
            expect(envContent).toContain('SQLITE_PATH=');
          }
        });
      });
    });

    async test('should handle custom port and database type options', () => {
      const envContent = configManager.generateEnvFile('theme', 'portal', {
        customPort: 3999,
        dbType: 'postgres'
      });
      
      expect(envContent).toContain('PORT=3999');
      expect(envContent).toContain('DB_TYPE=postgres');
      expect(envContent).toContain('DB_HOST=localhost');
    });

    async test('should save environment files to filesystem', () => {
      const envFilePath = path.join(tempDir, 'test-service.env');
      
      configManager.saveEnvFile('theme', 'portal', envFilePath);
      
      expect(fs.existsSync(envFilePath)).toBe(true);
      
      const content = fs.readFileSync(envFilePath, 'utf8');
      expect(content).toContain('NODE_ENV=theme');
      expect(content).toContain('SERVICE_NAME=portal');
      
      fs.unlinkSync(envFilePath);
    });
  });

  async describe('Theme Connection System Tests', () => {
    async test('should manage inter-theme dependencies', () => {
      const portalConnections = configManager.getThemeConnections('aidev-portal');
      const chatConnections = configManager.getThemeConnections('chat-space');
      const cliConnections = configManager.getThemeConnections('cli-framework');
      
      expect(portalConnections).toContain('story-reporter');
      expect(portalConnections).toContain('gui-selector');
      expect(chatConnections).toContain('auth-service');
      expect(cliConnections).toContain('external-log-lib');
    });

    async test('should handle themes without connections', () => {
      const nonExistentConnections = configManager.getThemeConnections('non-existent-theme');
      expect(nonExistentConnections).toEqual([]);
    });

    async test('should provide complete theme list', () => {
      const themes = configManager.getThemes();
      expect(themes).toHaveLength(3);
      expect(themes).toEqual(['aidev-portal', 'chat-space', 'cli-framework']);
    });
  });

  async describe('Path Resolution System Tests', () => {
    async test('should resolve base paths for all environments', () => {
      const themePath = configManager.getBasePath('theme');
      const epicPath = configManager.getBasePath('epic');
      const demoPath = configManager.getBasePath('demo');
      const releasePath = configManager.getBasePath('release');
      
      expect(themePath).toContain('layer/themes');
      expect(epicPath).toContain('layer/epic');
      expect(demoPath).toContain('demo');
      expect(releasePath).toContain('release');
      
      // Ensure all paths are absolute
      expect(path.isAbsolute(themePath)).toBe(true);
      expect(path.isAbsolute(epicPath)).toBe(true);
      expect(path.isAbsolute(demoPath)).toBe(true);
      expect(path.isAbsolute(releasePath)).toBe(true);
    });
  });

  async describe('Error Handling and Edge Cases', () => {
    async test('should handle missing configuration gracefully', () => {
      const invalidConfigPath = path.join(tempDir, 'invalid');
      await fileAPI.createDirectory(invalidConfigPath);
      
      async expect(() => {
        new ConfigManager(invalidConfigPath);
      }).toThrow();
    });

    async test('should handle port range exhaustion', () => {
      // Create a config with very limited port range
      const limitedConfig = path.join(tempDir, 'config', 'limited.json');
      const limited = {
        environments: {
          theme: {
            name: "Limited Theme",
            port_range: [3000, 3001], // Only 2 ports available
            base_path: "layer/themes",
            db_prefix: "theme",
            services: {
              portal: 3000,
              story_reporter: 3001,
              gui_selector: 3002, // This exceeds range
              auth_service: 3003,  // This exceeds range
              db_service: 3004     // This exceeds range
            }
          },
          epic: { name: "Epic", port_range: [3100, 3199], base_path: "layer/epic", db_prefix: "epic", services: { portal: 3101, story_reporter: 3102, gui_selector: 3103, auth_service: 3104, db_service: 3105 } },
          demo: { name: "Demo", port_range: [3200, 3299], base_path: "demo", db_prefix: "demo", services: { portal: 3201, story_reporter: 3202, gui_selector: 3203, auth_service: 3204, db_service: 3205 } },
          release: { name: "Release", port_range: [8000, 8099], base_path: "release", db_prefix: "prod", services: { portal: 8001, story_reporter: 8002, gui_selector: 8003, auth_service: 8004, db_service: 8005 } }
        },
        database: { postgres: { host: "localhost", port: 5432, ssl: false }, sqlite: { data_dir: "data" } },
        themes: ["test-theme"],
        inter_theme_connections: {}
      };
      
      await fileAPI.createFile(limitedConfig, JSON.stringify(limited, { type: FileType.TEMPORARY }));
      
      // This should still work, but port availability will be limited
      const limitedManager = new ConfigManager(tempDir);
      const nextPort = limitedManager.getNextAvailablePort('theme');
      expect(nextPort).toBeNull(); // No available ports in the limited range
    });
  });

  async describe('Integration with File System', () => {
    async test('should work with actual project structure', () => {
      // Test that config manager can work with the actual project
      const projectRoot = path.resolve(__dirname, '../..');
      const realConfigPath = path.join(projectRoot, 'config', 'environments.json');
      
      if (fs.existsSync(realConfigPath)) {
        const realConfigManager = new ConfigManager(projectRoot);
        expect(realConfigManager.getThemes()).toBeDefined();
        expect(realConfigManager.getEnvironment('theme')).toBeDefined();
      }
    });
  });
});