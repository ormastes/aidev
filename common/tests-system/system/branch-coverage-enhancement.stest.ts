import { ConfigManager } from '../../config/ConfigManager';
import { CoverageAnalyzer } from '../../setup/test-env/coverage-analyzer';
import { fs } from '../../../layer/themes/infra_external-log-lib/dist';
import { path } from '../../../layer/themes/infra_external-log-lib/dist';
import * as os from 'os';

async describe('Branch Coverage Enhancement System Tests', () => {
  let tempDir: string;
  let configManager: ConfigManager;

  async beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'branch-coverage-'));
    const configDir = path.join(tempDir, 'config');
    await fileAPI.createDirectory(configDir);
    
    // Create comprehensive test configuration
    const testConfig = {
      environments: {
        theme: {
          name: "Theme Development",
          port_range: [3000, 3099],
          base_path: "layer/themes", 
          db_prefix: "theme",
          services: { portal: 3001, story_reporter: 3002, gui_selector: 3003, auth_service: 3004, db_service: 3005 }
        },
        epic: {
          name: "Epic Integration",
          port_range: [3100, 3199],
          base_path: "layer/epic",
          db_prefix: "epic", 
          services: { portal: 3101, story_reporter: 3102, gui_selector: 3103, auth_service: 3104, db_service: 3105 }
        },
        demo: {
          name: "Demo Environment",
          port_range: [3200, 3299],
          base_path: "demo",
          db_prefix: "demo",
          services: { portal: 3201, story_reporter: 3202, gui_selector: 3203, auth_service: 3204, db_service: 3205 }
        },
        release: {
          name: "Production Release", 
          port_range: [8000, 8099],
          base_path: "release",
          db_prefix: "prod",
          services: { portal: 8001, story_reporter: 8002, gui_selector: 8003, auth_service: 8004, db_service: 8005 }
        }
      },
      database: {
        postgres: { host: "localhost", port: 5432, ssl: false },
        sqlite: { data_dir: "data" }
      },
      themes: ["theme1", "theme2", "theme3"],
      inter_theme_connections: {
        "theme1": ["theme2"],
        "theme2": ["theme3"],
        "theme3": []
      }
    };
    
    await fileAPI.createFile(path.join(configDir, 'environments.json', { type: FileType.TEMPORARY }), JSON.stringify(testConfig, null, 2));
    configManager = new ConfigManager(tempDir);
  });

  async afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  async describe('ConfigManager Branch Coverage Tests', () => {
    async test('should cover all branches in isPortAvailable method', () => {
      // Test port within range but allocated - should return false
      expect(configManager.isPortAvailable(3001)).toBe(false);
      
      // Test port within range and unallocated - should return true
      expect(configManager.isPortAvailable(3050)).toBe(true);
      
      // Test port outside all ranges - should return false
      expect(configManager.isPortAvailable(2000)).toBe(false);
      expect(configManager.isPortAvailable(9000)).toBe(false);
      
      // Test edge cases at range boundaries
      expect(configManager.isPortAvailable(3000)).toBe(true);  // Start of theme range
      expect(configManager.isPortAvailable(3099)).toBe(true);  // End of theme range
    });

    async test('should cover all branches in getNextAvailablePort method', () => {
      // Test normal case - should find available port
      const themePort = configManager.getNextAvailablePort('theme');
      expect(themePort).not.toBeNull();
      expect(themePort).toBeGreaterThanOrEqual(3000);
      expect(themePort).toBeLessThanOrEqual(3099);
      
      // Test different environments
      const epicPort = configManager.getNextAvailablePort('epic');
      expect(epicPort).not.toBeNull();
      
      const demoPort = configManager.getNextAvailablePort('demo');
      expect(demoPort).not.toBeNull();
      
      const releasePort = configManager.getNextAvailablePort('release');
      expect(releasePort).not.toBeNull();
    });

    async test('should cover all branches in getDatabaseConfig method', () => {
      // Test postgres branch for all environments
      const themePostgres = configManager.getDatabaseConfig('theme', 'postgres');
      expect(themePostgres.host).toBe('localhost');
      expect(themePostgres.database).toBe('theme_ai_dev_portal');
      
      const epicPostgres = configManager.getDatabaseConfig('epic', 'postgres');
      expect(epicPostgres.database).toBe('epic_ai_dev_portal');
      
      const demoPostgres = configManager.getDatabaseConfig('demo', 'postgres');
      expect(demoPostgres.database).toBe('demo_ai_dev_portal');
      
      const releasePostgres = configManager.getDatabaseConfig('release', 'postgres');
      expect(releasePostgres.database).toBe('prod_ai_dev_portal');
      
      // Test sqlite branch for all environments
      const themeSqlite = configManager.getDatabaseConfig('theme', 'sqlite');
      expect(themeSqlite.path).toContain('theme_ai_dev_portal.db');
      
      const epicSqlite = configManager.getDatabaseConfig('epic', 'sqlite');
      expect(epicSqlite.path).toContain('epic_ai_dev_portal.db');
      
      const demoSqlite = configManager.getDatabaseConfig('demo', 'sqlite');
      expect(demoSqlite.path).toContain('demo_ai_dev_portal.db');
      
      const releaseSqlite = configManager.getDatabaseConfig('release', 'sqlite');
      expect(releaseSqlite.path).toContain('prod_ai_dev_portal.db');
    });

    async test('should cover all branches in generateEnvFile method', () => {
      // Test default behavior (release -> postgres, others -> sqlite)
      const releaseEnv = configManager.generateEnvFile('release', 'portal');
      expect(releaseEnv).toContain('DB_TYPE=postgres');
      expect(releaseEnv).toContain('DB_HOST=localhost');
      
      const themeEnv = configManager.generateEnvFile('theme', 'portal');
      expect(themeEnv).toContain('DB_TYPE=sqlite');
      expect(themeEnv).toContain('SQLITE_PATH=');
      
      // Test custom dbType option - force postgres for theme
      const themePostgresEnv = configManager.generateEnvFile('theme', 'portal', { dbType: 'postgres' });
      expect(themePostgresEnv).toContain('DB_TYPE=postgres');
      expect(themePostgresEnv).toContain('DB_HOST=localhost');
      
      // Test custom dbType option - force sqlite for release
      const releaseSqliteEnv = configManager.generateEnvFile('release', 'portal', { dbType: 'sqlite' });
      expect(releaseSqliteEnv).toContain('DB_TYPE=sqlite');
      expect(releaseSqliteEnv).toContain('SQLITE_PATH=');
      
      // Test custom port option
      const customPortEnv = configManager.generateEnvFile('theme', 'portal', { customPort: 9999 });
      expect(customPortEnv).toContain('PORT=9999');
      
      // Test combined options
      const combinedEnv = configManager.generateEnvFile('theme', 'portal', { 
        customPort: 8888, 
        dbType: 'postgres' 
      });
      expect(combinedEnv).toContain('PORT=8888');
      expect(combinedEnv).toContain('DB_TYPE=postgres');
    });

    async test('should cover all branches in getThemeConnections method', () => {
      // Test themes with connections
      const theme1Connections = configManager.getThemeConnections('theme1');
      expect(theme1Connections).toEqual(['theme2']);
      
      const theme2Connections = configManager.getThemeConnections('theme2');
      expect(theme2Connections).toEqual(['theme3']);
      
      // Test theme with no connections
      const theme3Connections = configManager.getThemeConnections('theme3');
      expect(theme3Connections).toEqual([]);
      
      // Test non-existent theme (should return empty array)
      const nonExistentConnections = configManager.getThemeConnections('non-existent');
      expect(nonExistentConnections).toEqual([]);
    });
  });

  async describe('CoverageAnalyzer Branch Coverage Tests', () => {
    async test('should cover all branches in coverage calculation methods', async () => {
      const coverageAnalyzer = new CoverageAnalyzer();
      
      // Test with complete coverage data
      const fullCoverageData = {
        '/test/complete.ts': {
          l: { '1': 1, '2': 2, '3': 0 },
          b: { '0': [1, 1], '1': [2, 0], '2': [0, 0] },
          f: { 'method1': 1, 'method2': 0 },
          fnMap: {
            'method1': { name: 'TestClass.method1' },
            'method2': { name: 'TestClass.method2' }
          },
          code: 'class TestClass { method1() {} method2() {} }'
        }
      };
      
      const metrics1 = await coverageAnalyzer.analyze({ coverageMap: fullCoverageData });
      expect(metrics1.line.percentage).toBeCloseTo(66.67, 1);
      expect(metrics1.branch.percentage).toBeCloseTo(33.33, 1);
      expect(metrics1.method.percentage).toBe(50);
      
      // Test with no coverage data
      const noCoverageData = {
        '/test/empty.ts': {
          l: {},
          b: {},
          f: {},
          fnMap: {},
          code: ''
        }
      };
      
      const metrics2 = await coverageAnalyzer.analyze({ coverageMap: noCoverageData });
      expect(metrics2.line.percentage).toBe(0);
      expect(metrics2.branch.percentage).toBe(0);
      expect(metrics2.method.percentage).toBe(0);
      
      // Test with perfect coverage
      const perfectCoverageData = {
        '/test/perfect.ts': {
          l: { '1': 1, '2': 1, '3': 1 },
          b: { '0': [1, 1], '1': [1, 1] },
          f: { 'method1': 1, 'method2': 1 },
          fnMap: {
            'method1': { name: 'TestClass.method1' },
            'method2': { name: 'TestClass.method2' }
          },
          code: 'class TestClass { method1() {} method2() {} }'
        }
      };
      
      const metrics3 = await coverageAnalyzer.analyze({ coverageMap: perfectCoverageData });
      expect(metrics3.line.percentage).toBe(100);
      expect(metrics3.branch.percentage).toBe(100);
      expect(metrics3.method.percentage).toBe(100);
    });

    async test('should handle edge cases in branch coverage analysis', async () => {
      const coverageAnalyzer = new CoverageAnalyzer();
      
      // Test with non-array branch data
      const malformedBranchData = {
        '/test/malformed.ts': {
          l: { '1': 1 },
          b: { '0': 'not-an-array', '1': [1, 0] },
          f: { 'method1': 1 },
          fnMap: { 'method1': { name: 'TestClass.method1' } },
          code: 'class TestClass { method1() {} }'
        }
      };
      
      const metrics = await coverageAnalyzer.analyze({ coverageMap: malformedBranchData });
      expect(metrics.branch.total).toBe(2); // Should only count valid array
      expect(metrics.branch.covered).toBe(1);
      
      // Test with complex branch structures
      const complexBranchData = {
        '/test/complex.ts': {
          l: { '1': 1, '2': 1, '3': 1 },
          b: {
            '0': [1, 0, 1],      // 3-way branch, 2 covered
            '1': [2, 2, 2, 0],   // 4-way branch, 3 covered
            '2': [0, 0],         // 2-way branch, 0 covered
            '3': [1]             // 1-way branch, 1 covered
          },
          f: { 'complexMethod': 1 },
          fnMap: { 'complexMethod': { name: 'ComplexClass.complexMethod' } },
          code: 'class ComplexClass { complexMethod() {} }'
        }
      };
      
      const complexMetrics = await coverageAnalyzer.analyze({ coverageMap: complexBranchData });
      expect(complexMetrics.branch.total).toBe(10); // 3+4+2+1
      expect(complexMetrics.branch.covered).toBe(6); // 2+3+0+1
      expect(complexMetrics.branch.percentage).toBe(60);
    });
  });

  async describe('Error Condition Branch Coverage', () => {
    async test('should cover error handling branches', () => {
      // Test ConfigManager with invalid path
      async expect(() => {
        new ConfigManager('/non/existent/path');
      }).toThrow();
      
      // Test port availability with edge cases
      const limitedConfigPath = path.join(tempDir, 'config', 'limited.json');
      const limitedConfig = {
        environments: {
          theme: {
            name: "Limited",
            port_range: [3000, 3000], // Only one port
            base_path: "layer/themes",
            db_prefix: "theme",
            services: { portal: 3000, story_reporter: 3001, gui_selector: 3002, auth_service: 3003, db_service: 3004 }
          },
          epic: { name: "Epic", port_range: [3100, 3199], base_path: "layer/epic", db_prefix: "epic", services: { portal: 3101, story_reporter: 3102, gui_selector: 3103, auth_service: 3104, db_service: 3105 } },
          demo: { name: "Demo", port_range: [3200, 3299], base_path: "demo", db_prefix: "demo", services: { portal: 3201, story_reporter: 3202, gui_selector: 3203, auth_service: 3204, db_service: 3205 } },
          release: { name: "Release", port_range: [8000, 8099], base_path: "release", db_prefix: "prod", services: { portal: 8001, story_reporter: 8002, gui_selector: 8003, auth_service: 8004, db_service: 8005 } }
        },
        database: { postgres: { host: "localhost", port: 5432, ssl: false }, sqlite: { data_dir: "data" } },
        themes: [],
        inter_theme_connections: {}
      };
      
      await fileAPI.createFile(limitedConfigPath, JSON.stringify(limitedConfig, { type: FileType.TEMPORARY }));
      const limitedManager = new ConfigManager(tempDir);
      
      // This should trigger the "no available ports" branch
      const noAvailablePort = limitedManager.getNextAvailablePort('theme');
      expect(noAvailablePort).toBeNull();
    });

    async test('should cover null/undefined handling branches', async () => {
      const coverageAnalyzer = new CoverageAnalyzer();
      
      // Test with null/undefined values
      const nullDataTest = {
        '/test/null.ts': {
          l: null,
          b: undefined,
          f: null,
          fnMap: undefined,
          code: null
        }
      };
      
      // Should not throw error and return reasonable defaults
      const metrics = await coverageAnalyzer.analyze({ coverageMap: nullDataTest });
      expect(metrics.line.percentage).toBe(0);
      expect(metrics.branch.percentage).toBe(0);
      expect(metrics.method.percentage).toBe(0);
      expect(metrics.class.percentage).toBe(0);
    });
  });

  async describe('Integration Branch Coverage Tests', () => {
    async test('should cover all integration scenarios', () => {
      // Test all environment types
      const environments = ['theme', 'epic', 'demo', 'release'] as const;
      const services = ['portal', 'story_reporter', 'gui_selector', 'auth_service', 'db_service'] as const;
      
      environments.forEach(env => {
        services.forEach(service => {
          const port = configManager.getServicePort(env, service);
          expect(port).toBeGreaterThan(0);
          
          const basePath = configManager.getBasePath(env);
          expect(basePath).toBeDefined();
          expect(path.isAbsolute(basePath)).toBe(true);
          
          // Test both database types
          const pgConfig = configManager.getDatabaseConfig(env, 'postgres');
          expect(pgConfig.host).toBeDefined();
          
          const sqliteConfig = configManager.getDatabaseConfig(env, 'sqlite');
          expect(sqliteConfig.path).toBeDefined();
        });
      });
    });

    async test('should exercise all conditional paths in environment file generation', () => {
      const testCases = [
        { env: 'theme' as const, service: 'portal', options: undefined },
        { env: 'theme' as const, service: 'portal', options: { dbType: 'postgres' as const } },
        { env: 'theme' as const, service: 'portal', options: { customPort: 9999 } },
        { env: 'theme' as const, service: 'portal', options: { dbType: 'sqlite' as const, customPort: 8888 } },
        { env: 'release' as const, service: 'portal', options: undefined },
        { env: 'release' as const, service: 'portal', options: { dbType: 'sqlite' as const } },
        { env: 'release' as const, service: 'portal', options: { customPort: 7777 } },
        { env: 'release' as const, service: 'portal', options: { dbType: 'postgres' as const, customPort: 6666 } }
      ];
      
      testCases.forEach(({ env, service, options }, index) => {
        const envContent = configManager.generateEnvFile(env, service, options);
        
        expect(envContent).toContain(`NODE_ENV=${env}`);
        expect(envContent).toContain(`SERVICE_NAME=${service}`);
        
        if (options?.customPort) {
          expect(envContent).toContain(`PORT=${options.customPort}`);
        }
        
        if (options?.dbType) {
          expect(envContent).toContain(`DB_TYPE=${options.dbType}`);
        } else {
          const expectedDbType = env === 'release' ? 'postgres' : 'sqlite';
          expect(envContent).toContain(`DB_TYPE=${expectedDbType}`);
        }
      });
    });
  });
});