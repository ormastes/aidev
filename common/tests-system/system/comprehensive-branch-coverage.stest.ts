import { ConfigManager } from '../../config/ConfigManager';
import { CoverageAnalyzer } from '../../setup/test-env/coverage-analyzer';
import { ThemeManager } from '../../setup/test-env/theme-manager';
import { FraudChecker } from '../../setup/test-env/fraud-checker';
import { DuplicationDetector } from '../../setup/test-env/duplication-detector';
import * as fs from 'fs/promises';
import { path } from '../../../layer/themes/infra_external-log-lib/dist';
import * as os from 'os';

describe('Comprehensive Branch Coverage System Tests', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeAll(async () => {
    originalCwd = process.cwd();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'branch-coverage-'));
  });

  afterAll(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    process.chdir(tempDir);
    
    // Set up basic directory structure
    await fileAPI.createDirectory(path.join(tempDir), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'setup', 'themes'), { recursive: true });
    await fileAPI.createDirectory(path.join(tempDir), { recursive: true });
  });

  describe('ConfigManager Branch Coverage Enhancement', () => {
    test('should cover all branches in port range validation', async () => {
      // Create comprehensive config for testing
      const configPath = path.join(tempDir, 'config', 'environments.json');
      const testConfig = {
        environments: {
          theme: { name: "Theme", port_range: [3000, 3010], base_path: "layer/themes", db_prefix: "theme", services: { portal: 3001, story_reporter: 3002, gui_selector: 3003, auth_service: 3004, db_service: 3005 } },
          epic: { name: "Epic", port_range: [3100, 3110], base_path: "layer/epic", db_prefix: "epic", services: { portal: 3101, story_reporter: 3102, gui_selector: 3103, auth_service: 3104, db_service: 3105 } },
          demo: { name: "Demo", port_range: [3200, 3210], base_path: "demo", db_prefix: "demo", services: { portal: 3201, story_reporter: 3202, gui_selector: 3203, auth_service: 3204, db_service: 3205 } },
          release: { name: "Release", port_range: [8000, 8010], base_path: "release", db_prefix: "prod", services: { portal: 8001, story_reporter: 8002, gui_selector: 8003, auth_service: 8004, db_service: 8005 } }
        },
        database: {
          postgres: { host: "localhost", port: 5432, ssl: false },
          sqlite: { data_dir: "data" }
        },
        themes: ["theme1", "theme2"],
        inter_theme_connections: { "theme1": ["theme2"], "theme2": [] }
      };

      await fs.writeFile(configPath, JSON.stringify(testConfig, null, 2));
      const configManager = new ConfigManager(tempDir);

      // Test all branches in isPortAvailable
      // Branch 1: Port not in any range
      expect(configManager.isPortAvailable(2000)).toBe(false);
      expect(configManager.isPortAvailable(9000)).toBe(false);
      
      // Branch 2: Port in range but allocated
      expect(configManager.isPortAvailable(3001)).toBe(false); // theme portal
      expect(configManager.isPortAvailable(3101)).toBe(false); // epic portal
      expect(configManager.isPortAvailable(8001)).toBe(false); // release portal
      
      // Branch 3: Port in range and available
      expect(configManager.isPortAvailable(3006)).toBe(true);  // theme range, available
      expect(configManager.isPortAvailable(3106)).toBe(true);  // epic range, available
      expect(configManager.isPortAvailable(3206)).toBe(true);  // demo range, available
      expect(configManager.isPortAvailable(8006)).toBe(true);  // release range, available
      
      // Branch 4: Boundary testing
      expect(configManager.isPortAvailable(3000)).toBe(true);  // Start of theme range
      expect(configManager.isPortAvailable(3010)).toBe(true);  // End of theme range
      expect(configManager.isPortAvailable(2999)).toBe(false); // Just before theme range
      expect(configManager.isPortAvailable(3011)).toBe(false); // Just after theme range
    });

    test('should cover all branches in getNextAvailablePort with exhaustion scenarios', async () => {
      // Create config with very limited port ranges to test exhaustion
      const configPath = path.join(tempDir, 'config', 'environments.json');
      const limitedConfig = {
        environments: {
          theme: { 
            name: "Limited Theme", 
            port_range: [3000, 3002], // Only 3 ports total
            base_path: "layer/themes", 
            db_prefix: "theme", 
            services: { 
              portal: 3000, 
              story_reporter: 3001, 
              gui_selector: 3002, 
              auth_service: 3003, // This exceeds range - should cause null return
              db_service: 3004 
            } 
          },
          epic: { name: "Epic", port_range: [3100, 3199], base_path: "layer/epic", db_prefix: "epic", services: { portal: 3101, story_reporter: 3102, gui_selector: 3103, auth_service: 3104, db_service: 3105 } },
          demo: { name: "Demo", port_range: [3200, 3299], base_path: "demo", db_prefix: "demo", services: { portal: 3201, story_reporter: 3202, gui_selector: 3203, auth_service: 3204, db_service: 3205 } },
          release: { name: "Release", port_range: [8000, 8099], base_path: "release", db_prefix: "prod", services: { portal: 8001, story_reporter: 8002, gui_selector: 8003, auth_service: 8004, db_service: 8005 } }
        },
        database: { postgres: { host: "localhost", port: 5432, ssl: false }, sqlite: { data_dir: "data" } },
        themes: [],
        inter_theme_connections: {}
      };

      await fs.writeFile(configPath, JSON.stringify(limitedConfig, null, 2));
      const limitedManager = new ConfigManager(tempDir);

      // Branch 1: Normal case - ports available
      const epicPort = limitedManager.getNextAvailablePort('epic');
      expect(epicPort).not.toBeNull();
      expect(epicPort).toBeGreaterThanOrEqual(3100);
      expect(epicPort).toBeLessThanOrEqual(3199);

      // Branch 2: Exhaustion case - no ports available
      const themePort = limitedManager.getNextAvailablePort('theme');
      expect(themePort).toBeNull(); // All ports in range are allocated

      // Branch 3: Edge case - exactly one port available
      const singlePortConfig = {
        environments: {
          test: { 
            name: "Single Port", 
            port_range: [4000, 4000], // Only one port
            base_path: "test", 
            db_prefix: "test", 
            services: { portal: 4001 } // Outside range, so 4000 should be available
          },
          epic: { name: "Epic", port_range: [3100, 3199], base_path: "layer/epic", db_prefix: "epic", services: { portal: 3101, story_reporter: 3102, gui_selector: 3103, auth_service: 3104, db_service: 3105 } },
          demo: { name: "Demo", port_range: [3200, 3299], base_path: "demo", db_prefix: "demo", services: { portal: 3201, story_reporter: 3202, gui_selector: 3203, auth_service: 3204, db_service: 3205 } },
          release: { name: "Release", port_range: [8000, 8099], base_path: "release", db_prefix: "prod", services: { portal: 8001, story_reporter: 8002, gui_selector: 8003, auth_service: 8004, db_service: 8005 } }
        },
        database: { postgres: { host: "localhost", port: 5432, ssl: false }, sqlite: { data_dir: "data" } },
        themes: [],
        inter_theme_connections: {}
      };

      await fs.writeFile(configPath, JSON.stringify(singlePortConfig, null, 2));
      const singlePortManager = new ConfigManager(tempDir);
      
      const testPort = singlePortManager.getNextAvailablePort('test' as any);
      expect(testPort).toBe(4000);
    });

    test('should cover all database configuration branches', async () => {
      const configPath = path.join(tempDir, 'config', 'environments.json');
      const dbTestConfig = {
        environments: {
          theme: { name: "Theme", port_range: [3000, 3099], base_path: "layer/themes", db_prefix: "theme_dev", services: { portal: 3001, story_reporter: 3002, gui_selector: 3003, auth_service: 3004, db_service: 3005 } },
          epic: { name: "Epic", port_range: [3100, 3199], base_path: "layer/epic", db_prefix: "epic_staging", services: { portal: 3101, story_reporter: 3102, gui_selector: 3103, auth_service: 3104, db_service: 3105 } },
          demo: { name: "Demo", port_range: [3200, 3299], base_path: "demo", db_prefix: "demo_test", services: { portal: 3201, story_reporter: 3202, gui_selector: 3203, auth_service: 3204, db_service: 3205 } },
          release: { name: "Release", port_range: [8000, 8099], base_path: "release", db_prefix: "production", services: { portal: 8001, story_reporter: 8002, gui_selector: 8003, auth_service: 8004, db_service: 8005 } }
        },
        database: {
          postgres: { host: "db.example.com", port: 5433, ssl: true },
          sqlite: { data_dir: "database" }
        },
        themes: [],
        inter_theme_connections: {}
      };

      await fs.writeFile(configPath, JSON.stringify(dbTestConfig, null, 2));
      const configManager = new ConfigManager(tempDir);

      // Test all environments with postgres (branch 1)
      const environments = ['theme', 'epic', 'demo', 'release'] as const;
      environments.forEach(env => {
        const pgConfig = configManager.getDatabaseConfig(env, 'postgres');
        expect(pgConfig.host).toBe('db.example.com');
        expect(pgConfig.port).toBe(5433);
        expect(pgConfig.ssl).toBe(true);
        expect(pgConfig.database).toBe(`${dbTestConfig.environments[env].db_prefix}_ai_dev_portal`);
        expect(pgConfig.user).toBe(`${dbTestConfig.environments[env].db_prefix}_user`);
        expect(pgConfig.password).toBe(`${dbTestConfig.environments[env].db_prefix}_pass_2024`);
      });

      // Test all environments with sqlite (branch 2)
      environments.forEach(env => {
        const sqliteConfig = configManager.getDatabaseConfig(env, 'sqlite');
        expect(sqliteConfig.path).toContain(`${dbTestConfig.environments[env].db_prefix}_ai_dev_portal.db`);
        expect(sqliteConfig.path).toContain('database'); // data_dir
      });
    });

    test('should cover all branches in generateEnvFile', async () => {
      const configPath = path.join(tempDir, 'config', 'environments.json');
      const envConfig = {
        environments: {
          theme: { name: "Theme", port_range: [3000, 3099], base_path: "layer/themes", db_prefix: "theme", services: { portal: 3001, story_reporter: 3002, gui_selector: 3003, auth_service: 3004, db_service: 3005 } },
          epic: { name: "Epic", port_range: [3100, 3199], base_path: "layer/epic", db_prefix: "epic", services: { portal: 3101, story_reporter: 3102, gui_selector: 3103, auth_service: 3104, db_service: 3105 } },
          demo: { name: "Demo", port_range: [3200, 3299], base_path: "demo", db_prefix: "demo", services: { portal: 3201, story_reporter: 3202, gui_selector: 3203, auth_service: 3204, db_service: 3205 } },
          release: { name: "Release", port_range: [8000, 8099], base_path: "release", db_prefix: "prod", services: { portal: 8001, story_reporter: 8002, gui_selector: 8003, auth_service: 8004, db_service: 8005 } }
        },
        database: { postgres: { host: "localhost", port: 5432, ssl: false }, sqlite: { data_dir: "data" } },
        themes: [],
        inter_theme_connections: {}
      };

      await fs.writeFile(configPath, JSON.stringify(envConfig, null, 2));
      const configManager = new ConfigManager(tempDir);

      // Test all branches of default database type selection
      // Branch 1: Release environment -> postgres by default
      const releaseEnv = configManager.generateEnvFile('release', 'portal');
      expect(releaseEnv).toContain('DB_TYPE=postgres');
      expect(releaseEnv).toContain('DB_HOST=localhost');
      expect(releaseEnv).toContain('DB_PORT=5432');

      // Branch 2: Non-release environments -> sqlite by default
      const themeEnv = configManager.generateEnvFile('theme', 'portal');
      expect(themeEnv).toContain('DB_TYPE=sqlite');
      expect(themeEnv).toContain('SQLITE_PATH=');

      // Branch 3: Custom dbType overrides default
      const themeWithPostgres = configManager.generateEnvFile('theme', 'portal', { dbType: 'postgres' });
      expect(themeWithPostgres).toContain('DB_TYPE=postgres');
      expect(themeWithPostgres).toContain('DB_HOST=localhost');

      const releaseWithSqlite = configManager.generateEnvFile('release', 'portal', { dbType: 'sqlite' });
      expect(releaseWithSqlite).toContain('DB_TYPE=sqlite');
      expect(releaseWithSqlite).toContain('SQLITE_PATH=');

      // Branch 4: Custom port vs service port
      const customPortEnv = configManager.generateEnvFile('theme', 'portal', { customPort: 9999 });
      expect(customPortEnv).toContain('PORT=9999');

      const defaultPortEnv = configManager.generateEnvFile('theme', 'portal');
      expect(defaultPortEnv).toContain('PORT=3001'); // Default service port

      // Branch 5: Combined options
      const combinedEnv = configManager.generateEnvFile('demo', 'auth_service', { 
        dbType: 'postgres', 
        customPort: 7777 
      });
      expect(combinedEnv).toContain('PORT=7777');
      expect(combinedEnv).toContain('DB_TYPE=postgres');
      expect(combinedEnv).toContain('SERVICE_NAME=auth_service');
    });

    test('should cover all branches in getThemeConnections', async () => {
      const configPath = path.join(tempDir, 'config', 'environments.json');
      const connectionConfig = {
        environments: {
          theme: { name: "Theme", port_range: [3000, 3099], base_path: "layer/themes", db_prefix: "theme", services: { portal: 3001, story_reporter: 3002, gui_selector: 3003, auth_service: 3004, db_service: 3005 } },
          epic: { name: "Epic", port_range: [3100, 3199], base_path: "layer/epic", db_prefix: "epic", services: { portal: 3101, story_reporter: 3102, gui_selector: 3103, auth_service: 3104, db_service: 3105 } },
          demo: { name: "Demo", port_range: [3200, 3299], base_path: "demo", db_prefix: "demo", services: { portal: 3201, story_reporter: 3202, gui_selector: 3203, auth_service: 3204, db_service: 3205 } },
          release: { name: "Release", port_range: [8000, 8099], base_path: "release", db_prefix: "prod", services: { portal: 8001, story_reporter: 8002, gui_selector: 8003, auth_service: 8004, db_service: 8005 } }
        },
        database: { postgres: { host: "localhost", port: 5432, ssl: false }, sqlite: { data_dir: "data" } },
        themes: ["theme1", "theme2", "theme3", "theme4"],
        inter_theme_connections: {
          "theme1": ["theme2", "theme3"],    // Has connections
          "theme2": ["theme4"],              // Has one connection
          "theme3": [],                      // Explicitly empty
          // "theme4" not defined            // Implicitly empty
        }
      };

      await fs.writeFile(configPath, JSON.stringify(connectionConfig, null, 2));
      const configManager = new ConfigManager(tempDir);

      // Branch 1: Theme exists with connections
      const theme1Connections = configManager.getThemeConnections('theme1');
      expect(theme1Connections).toEqual(['theme2', 'theme3']);

      const theme2Connections = configManager.getThemeConnections('theme2');
      expect(theme2Connections).toEqual(['theme4']);

      // Branch 2: Theme exists but has empty connections array
      const theme3Connections = configManager.getThemeConnections('theme3');
      expect(theme3Connections).toEqual([]);

      // Branch 3: Theme exists but not in connections object (undefined case)
      const theme4Connections = configManager.getThemeConnections('theme4');
      expect(theme4Connections).toEqual([]);

      // Branch 4: Theme doesn't exist at all
      const nonExistentConnections = configManager.getThemeConnections('non-existent-theme');
      expect(nonExistentConnections).toEqual([]);
    });
  });

  describe('CoverageAnalyzer Branch Coverage Enhancement', () => {
    test('should cover all branches in coverage data loading', async () => {
      const coverageAnalyzer = new CoverageAnalyzer();

      // Branch 1: Test results has coverageMap
      const testResultsWithMap = {
        coverageMap: {
          '/test/file.ts': {
            l: { '1': 1, '2': 0 },
            b: { '0': [1, 0] },
            f: { 'func1': 1 },
            fnMap: { 'func1': { name: 'TestClass.method' } },
            code: 'class TestClass { method() {} }'
          }
        }
      };

      const metrics1 = await coverageAnalyzer.analyze(testResultsWithMap);
      expect(metrics1.line.total).toBe(2);
      expect(metrics1.line.covered).toBe(1);

      // Branch 2: Coverage file exists
      const coverageFilePath = path.join(tempDir, 'coverage', 'coverage-final.json');
      const fileCoverageData = {
        '/test/file2.ts': {
          l: { '1': 1, '2': 1, '3': 1 },
          b: { '0': [1, 1] },
          f: { 'func2': 1 },
          fnMap: { 'func2': { name: 'TestClass2.method' } },
          code: 'class TestClass2 { method() {} }'
        }
      };

      await fs.writeFile(coverageFilePath, JSON.stringify(fileCoverageData, null, 2));
      
      const metrics2 = await coverageAnalyzer.analyze({});
      expect(metrics2.line.total).toBe(3);
      expect(metrics2.line.covered).toBe(3);

      // Branch 3: Coverage file doesn't exist, use test results
      await fs.rm(coverageFilePath);
      
      const testResultsOnly = {
        '/test/file3.ts': {
          l: { '1': 0, '2': 0 },
          b: { '0': [0, 0] },
          f: { 'func3': 0 },
          fnMap: { 'func3': { name: 'TestClass3.method' } },
          code: 'class TestClass3 { method() {} }'
        }
      };

      const metrics3 = await coverageAnalyzer.analyze(testResultsOnly);
      expect(metrics3.line.total).toBe(2);
      expect(metrics3.line.covered).toBe(0);
    });

    test('should cover all branches in branch coverage calculation', async () => {
      const coverageAnalyzer = new CoverageAnalyzer();

      // Test different branch data structures
      const complexBranchData = {
        '/test/branches.ts': {
          l: { '1': 1 },
          b: {
            '0': [1, 0],           // 2-way branch, 1 covered
            '1': [1, 1, 0],        // 3-way branch, 2 covered
            '2': 'not-an-array',   // Invalid branch (should be skipped)
            '3': [],               // Empty array (no branches)
            '4': [2, 2, 2, 2],     // 4-way branch, all covered
            '5': null,             // Null branch (should be skipped)
            '6': [0, 0]            // 2-way branch, none covered
          },
          f: { 'func1': 1 },
          fnMap: { 'func1': { name: 'TestClass.method' } },
          code: 'class TestClass { method() {} }'
        }
      };

      const metrics = await coverageAnalyzer.analyze({ coverageMap: complexBranchData });
      
      // Should only count valid arrays: [1,0] + [1,1,0] + [2,2,2,2] + [0,0] = 2+3+4+2 = 11 total
      // Covered: 1+2+4+0 = 7
      expect(metrics.branch.total).toBe(11);
      expect(metrics.branch.covered).toBe(7);
      expect(metrics.branch.percentage).toBeCloseTo(63.64, 1);
    });

    test('should cover all branches in class detection', async () => {
      const coverageAnalyzer = new CoverageAnalyzer();

      // Test different class scenarios
      const classTestData = {
        '/test/classes.ts': {
          l: { '1': 1, '2': 1, '3': 1 },
          b: {},
          f: {
            'TestedClass.method1': 2,        // Tested method
            'TestedClass.method2': 1,        // Tested method
            'UntestedClass.method1': 0,      // Untested method
            'UntestedClass.method2': 0,      // Untested method
            'PartialClass.testedMethod': 1,  // Tested method
            'PartialClass.untestedMethod': 0, // Untested method
            'globalFunction': 1              // Not a class method
          },
          fnMap: {
            'TestedClass.method1': { name: 'TestedClass.method1' },
            'TestedClass.method2': { name: 'TestedClass.method2' },
            'UntestedClass.method1': { name: 'UntestedClass.method1' },
            'UntestedClass.method2': { name: 'UntestedClass.method2' },
            'PartialClass.testedMethod': { name: 'PartialClass.testedMethod' },
            'PartialClass.untestedMethod': { name: 'PartialClass.untestedMethod' },
            'globalFunction': { name: 'globalFunction' }
          },
          code: `
            class TestedClass {
              method1() { return 'tested'; }
              method2() { return 'also tested'; }
            }
            class UntestedClass {
              method1() { return 'not tested'; }
              method2() { return 'also not tested'; }
            }
            class PartialClass {
              testedMethod() { return 'tested'; }
              untestedMethod() { return 'not tested'; }
            }
            function globalFunction() { return 'global'; }
          `
        }
      };

      const metrics = await coverageAnalyzer.analyze({ coverageMap: classTestData });
      
      // Should detect 3 classes: TestedClass (tested), UntestedClass (not tested), PartialClass (tested)
      expect(metrics.class.total).toBe(3);
      expect(metrics.class.covered).toBe(2); // TestedClass and PartialClass have tested methods
      expect(metrics.class.percentage).toBeCloseTo(66.67, 1);
    });

    test('should handle edge cases in coverage calculation', async () => {
      const coverageAnalyzer = new CoverageAnalyzer();

      // Test with null/undefined values
      const edgeCaseData = {
        '/test/edge.ts': {
          l: null,              // Null lines
          b: undefined,         // Undefined branches
          f: null,              // Null functions
          fnMap: undefined,     // Undefined function map
          code: null            // Null code
        },
        '/test/empty.ts': {
          l: {},                // Empty lines
          b: {},                // Empty branches
          f: {},                // Empty functions
          fnMap: {},            // Empty function map
          code: ''              // Empty code
        }
      };

      const metrics = await coverageAnalyzer.analyze({ coverageMap: edgeCaseData });
      
      expect(metrics.line.percentage).toBe(0);
      expect(metrics.branch.percentage).toBe(0);
      expect(metrics.method.percentage).toBe(0);
      expect(metrics.class.percentage).toBe(0);
    });
  });

  describe('ThemeManager Branch Coverage Enhancement', () => {
    test('should cover all branches in getCriteria', async () => {
      const themesDir = path.join(tempDir, 'setup', 'themes');
      
      // Create themes with different configurations
      const completeTheme = {
        theme: {
          id: 'complete-theme',
          testCriteria: {
            production: { coverage: { class: { minimum: 99 } }, duplication: { maxPercentage: 1 }, fraudCheck: { enabled: true, minScore: 99 } },
            demo: { coverage: { class: { minimum: 80 } }, duplication: { maxPercentage: 15 }, fraudCheck: { enabled: true, minScore: 80 } }
          }
        }
      };

      const partialTheme = {
        theme: {
          id: 'partial-theme',
          testCriteria: {
            production: { coverage: { class: { minimum: 95 } }, duplication: { maxPercentage: 5 }, fraudCheck: { enabled: true, minScore: 95 } }
            // Missing demo criteria
          }
        }
      };

      const noCriteriaTheme = {
        theme: {
          id: 'no-criteria-theme'
          // No testCriteria field
        }
      };

      await fs.writeFile(path.join(themesDir, 'complete-theme.theme.json'), JSON.stringify(completeTheme, null, 2));
      await fs.writeFile(path.join(themesDir, 'partial-theme.theme.json'), JSON.stringify(partialTheme, null, 2));
      await fs.writeFile(path.join(themesDir, 'no-criteria-theme.theme.json'), JSON.stringify(noCriteriaTheme, null, 2));

      const themeManager = new ThemeManager({});

      // Branch 1: Theme exists with complete criteria
      const completeProd = await themeManager.getCriteria('complete-theme', 'production');
      expect(completeProd.coverage.class.minimum).toBe(99);
      
      const completeDemo = await themeManager.getCriteria('complete-theme', 'demo');
      expect(completeDemo.coverage.class.minimum).toBe(80);

      // Branch 2: Theme exists but missing specific mode criteria
      const partialProd = await themeManager.getCriteria('partial-theme', 'production');
      expect(partialProd.coverage.class.minimum).toBe(95);
      
      const partialDemo = await themeManager.getCriteria('partial-theme', 'demo');
      expect(partialDemo.coverage.class.minimum).toBe(70); // Default demo value

      // Branch 3: Theme exists but no testCriteria
      const noCriteriaProd = await themeManager.getCriteria('no-criteria-theme', 'production');
      expect(noCriteriaProd.coverage.class.minimum).toBe(95); // Default production value

      // Branch 4: Theme doesn't exist
      const nonExistentProd = await themeManager.getCriteria('non-existent', 'production');
      expect(nonExistentProd.coverage.class.minimum).toBe(95); // Default production value
    });

    test('should cover all branches in getEpicInfo', async () => {
      const themesDir = path.join(tempDir, 'setup', 'themes');
      
      const epicTheme = {
        theme: {
          id: 'epic-theme',
          name: 'Epic Theme',
          epics: [
            { id: 'epic1', name: 'Epic 1', userStories: [{ id: 'story1', description: 'Story 1', acceptanceCriteria: ['AC1'] }] }
          ]
        }
      };

      const noEpicsTheme = {
        theme: {
          id: 'no-epics-theme',
          name: 'No Epics Theme'
          // No epics field
        }
      };

      await fs.writeFile(path.join(themesDir, 'epic-theme.theme.json'), JSON.stringify(epicTheme, null, 2));
      await fs.writeFile(path.join(themesDir, 'no-epics-theme.theme.json'), JSON.stringify(noEpicsTheme, null, 2));

      const themeManager = new ThemeManager({});

      // Branch 1: Theme exists with epics
      const epicInfo = await themeManager.getEpicInfo('epic-theme');
      expect(epicInfo).toBeDefined();
      expect(epicInfo.id).toBe('epic-theme');
      expect(epicInfo.epics).toHaveLength(1);

      // Branch 2: Theme exists but no epics
      const noEpicsInfo = await themeManager.getEpicInfo('no-epics-theme');
      expect(noEpicsInfo).toBeUndefined();

      // Branch 3: Theme doesn't exist
      const nonExistentInfo = await themeManager.getEpicInfo('non-existent');
      expect(nonExistentInfo).toBeUndefined();
    });

    test('should cover caching branches', async () => {
      const themesDir = path.join(tempDir, 'setup', 'themes');
      
      const cacheTheme = {
        theme: {
          id: 'cache-theme',
          testCriteria: {
            production: { coverage: { class: { minimum: 88 } } }
          }
        }
      };

      await fs.writeFile(path.join(themesDir, 'cache-theme.theme.json'), JSON.stringify(cacheTheme, null, 2));

      const themeManager = new ThemeManager({});

      // First call - should read from file
      const criteria1 = await themeManager.getCriteria('cache-theme', 'production');
      expect(criteria1.coverage.class.minimum).toBe(88);

      // Modify file on disk
      cacheTheme.theme.testCriteria.production.coverage.class.minimum = 77;
      await fs.writeFile(path.join(themesDir, 'cache-theme.theme.json'), JSON.stringify(cacheTheme, null, 2));

      // Second call - should use cached version
      const criteria2 = await themeManager.getCriteria('cache-theme', 'production');
      expect(criteria2.coverage.class.minimum).toBe(88); // Still cached value
    });
  });

  describe('FraudChecker Branch Coverage Enhancement', () => {
    test('should cover all pattern detection branches', async () => {
      const testDir = path.join(tempDir, 'tests');
      await fileAPI.createDirectory(testDir);

      // Create comprehensive test file with all fraud patterns
      const allPatternsContent = `
describe('All Patterns Test', () => {
  // Empty tests
  it('empty test 1', () => {});
  test('empty test 2', () => {
    // Just comment
  });
  
  // Skip patterns
  it.skip('skipped test', () => { expect(true).toBe(true); });
  test.skip('skipped test 2', () => { expect(1).toBe(1); });
  describe.skip('skipped suite', () => {
    it('test in skipped suite', () => {});
  });
  
  // Only patterns
  it.only('only test', () => { expect(true).toBe(true); });
  test.only('only test 2', () => { expect(1).toBe(1); });
  
  // Always true assertions
  it('always true 1', () => {
    expect(true).toBe(true);
  });
  
  it('always true 2', () => {
    assert.isTrue(true);
  });
  
  // Coverage manipulation
  it('coverage hack 1', () => {
    global.__coverage__ = {};
  });
  
  it('coverage hack 2', () => {
    __coverage__['fake'] = 100;
  });
  
  // Commented tests
  // it('commented test 1', () => {});
  // test('commented test 2', () => {});
  // describe('commented suite', () => {});
  
  // TODO tests
  it.todo('todo test 1');
  test.todo('todo test 2');
  
  // Coverage ignores
  it('ignore test 1', () => {
    /* istanbul ignore next */
    if (false) console.log('ignored');
  });
  
  it('ignore test 2', () => {
    /* c8 ignore start */
    function ignored() {}
    /* c8 ignore stop */
  });
  
  // Fake delays
  it('fake delay', () => {
    async setTimeout(() => {}, 0);
    expect(true).toBe(true);
  });
});
`;

      await fileAPI.createFile(path.join(testDir, 'all-patterns.test.ts'), { type: FileType.TEMPORARY });

      const fraudChecker = new FraudChecker();
      const result = await fraudChecker.check({});

      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(10);

      // Verify each pattern type was detected
      const violationTypes = result.violations.map(v => v.type);
      expect(violationTypes).toContain('fake-assertions');
      expect(violationTypes).toContain('disabled-tests');
      expect(violationTypes).toContain('test-manipulation');
      expect(violationTypes).toContain('coverage-bypass');

      // Verify severity levels
      const severities = result.violations.map(v => v.severity);
      expect(severities).toContain('critical');
      expect(severities).toContain('high');
      expect(severities).toContain('medium');
      expect(severities).toContain('low');
    });

    test('should cover all file collection branches', async () => {
      // Create test files in various locations and with various extensions
      const locations = [
        'tests',
        'test', 
        '__tests__',
        'spec',
        'src/component/test',
        'lib/util/tests'
      ];

      const extensions = ['.test.ts', '.test.js', '.spec.ts', '.spec.js'];

      for (const location of locations) {
        await fileAPI.createDirectory(path.join(tempDir), { recursive: true });
        
        for (const ext of extensions) {
          const filename = `sample${ext}`;
          const content = `
describe('Test', () => {
  it('test', () => {
    expect(1).toBe(1);
  });
});
`;
          await fileAPI.createFile(path.join(tempDir, location, { type: FileType.TEMPORARY }), content);
        }
      }

      // Also create non-test files that should be ignored
      await fileAPI.createFile(path.join(tempDir, 'tests', { type: FileType.TEMPORARY }), 'export const helper = () => {};');
      await fileAPI.createFile(path.join(tempDir, 'tests', { type: FileType.TEMPORARY }), '{}');

      const fraudChecker = new FraudChecker();
      const result = await fraudChecker.check({});

      // Should find all test files but not the helper files
      expect(result.violations.length).toBe(0); // Clean test files
    });

    test('should cover score calculation branches', async () => {
      const fraudChecker = new FraudChecker();

      // Test with no violations (should return 100)
      const perfectResult = await fraudChecker.check({});
      
      // Create clean test
      const testDir = path.join(tempDir, 'clean-tests');
      await fileAPI.createDirectory(testDir);
      await fs.writeFile(
        path.join(testDir, 'clean.test.ts'),
        'describe("Clean", () => { it("works", () => { expect(1).toBe(1); }); });'
      );

      const cleanResult = await fraudChecker.check({});
      expect(cleanResult.score).toBe(100);

      // Test with violations of different severities
      await fs.writeFile(
        path.join(testDir, 'violations.test.ts'),
        `
        describe('Violations', () => {
          it('critical', () => { expect(true).toBe(true); }); // 25 points
          it.only('high', () => { expect(1).toBe(1); }); // 15 points  
          it.skip('medium', () => { expect(2).toBe(2); }); // 10 points
          // it('low', () => {}); // 5 points
        });
        `
      );

      const violationResult = await fraudChecker.check({});
      expect(violationResult.score).toBeLessThan(100);
      expect(violationResult.score).toBeGreaterThanOrEqual(0);
      
      // Score should be 100 - (25 + 15 + 10 + 5) = 45
      expect(violationResult.score).toBeCloseTo(45, 0);
    });
  });

  describe('Error Handling Branch Coverage', () => {
    test('should handle file system errors gracefully', async () => {
      // Test ConfigManager with invalid config
      async expect(() => {
        new ConfigManager('/non/existent/path');
      }).toThrow();

      // Test ThemeManager with inaccessible themes directory
      const restrictedDir = path.join(tempDir, 'restricted');
      await fileAPI.createDirectory(restrictedDir); // No permissions

      const themeManager = new ThemeManager({});
      
      // This should handle the error gracefully
      const themes = await themeManager.listThemes();
      expect(themes).toEqual([]);

      // Restore permissions for cleanup
      await fs.chmod(restrictedDir, 0o755);
    });

    test('should handle malformed JSON gracefully', async () => {
      const themesDir = path.join(tempDir, 'setup', 'themes');
      
      // Create malformed JSON file
      await fileAPI.createFile(path.join(themesDir, 'malformed.theme.json'), { type: FileType.TEMPORARY });

      const themeManager = new ThemeManager({});
      
      // Should return default criteria when JSON is malformed
      const criteria = await themeManager.getCriteria('malformed', 'production');
      expect(criteria.coverage.class.minimum).toBe(95); // Default value
    });
  });
});