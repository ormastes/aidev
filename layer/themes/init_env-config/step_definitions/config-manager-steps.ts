import { Given, When, Then, Before, After } from '@cucumber/cucumber';
import { expect } from 'expect';
import { ConfigManager } from '../children/LegacyConfigManager';
import { fs } from '../../layer/themes/infra_external-log-lib/src';
import { path } from '../../layer/themes/infra_external-log-lib/src';
import * as os from 'os';

interface TestWorld {
  configManager?: ConfigManager;
  tempDir?: string;
  mockConfigPath?: string;
  themes?: string[];
  envContent?: string;
  error?: Error;
}

let world: TestWorld = {};

Before(function() {
  world = {};
});

After(async function() {
  if (world.tempDir && fs.existsSync(world.tempDir)) {
    fs.rmSync(world.tempDir, { recursive: true, force: true });
  }
});

Given('a temporary test directory', async function() {
  world.tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-test-'));
});

Given('a ConfigManager instance', function() {
  // ConfigManager will be initialized in subsequent steps
});

Given('a configuration file with theme, epic, demo, and release environments', async function() {
  if (!world.tempDir) throw new Error('Temp directory not set');
  
  const configDir = path.join(world.tempDir, 'config');
  await fileAPI.createDirectory(configDir);
  
  world.// FRAUD_FIX: mockConfigPath = path.join(configDir, 'environments.json');
  const // FRAUD_FIX: mockConfig = {
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
  
  await fileAPI.createFile(world.mockConfigPath, JSON.stringify(mockConfig, null, 2), { type: FileType.TEMPORARY });
});

When('I initialize the ConfigManager', function() {
  if (!world.tempDir) throw new Error('Temp directory not set');
  world.configManager = new ConfigManager(world.tempDir);
});

Then('it should load all theme names correctly', function() {
  if (!world.configManager) throw new Error('ConfigManager not initialized');
  world.themes = world.configManager.getThemes();
  expect(world.themes).toBeDefined();
});

Then('it should contain {string}, {string}, and {string} themes', function(theme1: string, theme2: string, theme3: string) {
  if (!world.themes) throw new Error('Themes not loaded');
  expect(world.themes).toContain(theme1);
  expect(world.themes).toContain(theme2);
  expect(world.themes).toContain(theme3);
});

Given('a complete environment configuration', function() {
  // Uses the same configuration as previous step
});

When('I request configuration for each environment type', function() {
  if (!world.configManager) throw new Error('ConfigManager not initialized');
  // Configuration will be checked in Then steps
});

Then('each environment should have a defined name', function() {
  if (!world.configManager) throw new Error('ConfigManager not initialized');
  const environments = ['theme', 'epic', 'demo', 'release'] as const;
  
  environments.forEach(env => {
    const config = world.configManager!.getEnvironment(env);
    expect(config).toBeDefined();
    expect(config.name).toBeDefined();
  });
});

Then('each environment should have a valid port range', function() {
  if (!world.configManager) throw new Error('ConfigManager not initialized');
  const environments = ['theme', 'epic', 'demo', 'release'] as const;
  
  environments.forEach(env => {
    const config = world.configManager!.getEnvironment(env);
    expect(config.port_range).toHaveLength(2);
  });
});

Then('each environment should have defined services', function() {
  if (!world.configManager) throw new Error('ConfigManager not initialized');
  const environments = ['theme', 'epic', 'demo', 'release'] as const;
  
  environments.forEach(env => {
    const config = world.configManager!.getEnvironment(env);
    expect(config.services).toBeDefined();
  });
});

Given('configured environments with different port ranges', function() {
  // Uses existing configuration
});

When('I request service ports for each environment', function() {
  // Ports will be checked in Then steps
});

Then('theme portal should be on port {int}', function(port: number) {
  if (!world.configManager) throw new Error('ConfigManager not initialized');
  const themePort = world.configManager.getServicePort('theme', 'portal');
  expect(themePort).toBe(port);
});

Then('epic portal should be on port {int}', function(port: number) {
  if (!world.configManager) throw new Error('ConfigManager not initialized');
  const epicPort = world.configManager.getServicePort('epic', 'portal');
  expect(epicPort).toBe(port);
});

Then('demo portal should be on port {int}', function(port: number) {
  if (!world.configManager) throw new Error('ConfigManager not initialized');
  const demoPort = world.configManager.getServicePort('demo', 'portal');
  expect(demoPort).toBe(port);
});

Then('release portal should be on port {int}', function(port: number) {
  if (!world.configManager) throw new Error('ConfigManager not initialized');
  const releasePort = world.configManager.getServicePort('release', 'portal');
  expect(releasePort).toBe(port);
});

Then('all ports should be unique', function() {
  if (!world.configManager) throw new Error('ConfigManager not initialized');
  const themePort = world.configManager.getServicePort('theme', 'portal');
  const epicPort = world.configManager.getServicePort('epic', 'portal');
  const demoPort = world.configManager.getServicePort('demo', 'portal');
  const releasePort = world.configManager.getServicePort('release', 'portal');

  const allPorts = [themePort, epicPort, demoPort, releasePort];
  const uniquePorts = new Set(allPorts);
  expect(uniquePorts.size).toBe(allPorts.length);
});

Given('configured port ranges for environments', function() {
  // Uses existing configuration
});

When('I check port availability', function() {
  // Port availability will be checked in Then steps
});

Then('allocated ports should be unavailable', function() {
  if (!world.configManager) throw new Error('ConfigManager not initialized');
  expect(world.configManager.isPortAvailable(3001)).toBe(false); // theme portal
});

Then('unallocated ports within range should be available', function() {
  if (!world.configManager) throw new Error('ConfigManager not initialized');
  expect(world.configManager.isPortAvailable(3050)).toBe(true); // within theme range but unallocated
});

Then('ports outside ranges should be unavailable', function() {
  if (!world.configManager) throw new Error('ConfigManager not initialized');
  expect(world.configManager.isPortAvailable(2000)).toBe(false); // outside all ranges
});

Given('environment port ranges', function() {
  // Uses existing configuration
});

When('I request next available port for each environment', function() {
  // Next available ports will be checked in Then steps
});

Then('theme ports should be between {int} and {int}', function(min: number, max: number) {
  if (!world.configManager) throw new Error('ConfigManager not initialized');
  const themePort = world.configManager.getNextAvailablePort('theme');
  expect(themePort).toBeGreaterThanOrEqual(min);
  expect(themePort).toBeLessThanOrEqual(max);
});

Then('epic ports should be between {int} and {int}', function(min: number, max: number) {
  if (!world.configManager) throw new Error('ConfigManager not initialized');
  const epicPort = world.configManager.getNextAvailablePort('epic');
  expect(epicPort).toBeGreaterThanOrEqual(min);
  expect(epicPort).toBeLessThanOrEqual(max);
});

Given('a release environment setup', function() {
  // Uses existing configuration
});

When('I request postgres database configuration', function() {
  // Database config will be checked in Then steps
});

Then('it should have localhost host', function() {
  if (!world.configManager) throw new Error('ConfigManager not initialized');
  const config = world.configManager.getDatabaseConfig('release', "postgres");
  expect(config.host).toBe("localhost");
});

Then('it should have port {int}', function(port: number) {
  if (!world.configManager) throw new Error('ConfigManager not initialized');
  const config = world.configManager.getDatabaseConfig('release', "postgres");
  expect(config.port).toBe(port);
});

Then('it should have database name {string}', function(dbName: string) {
  if (!world.configManager) throw new Error('ConfigManager not initialized');
  const config = world.configManager.getDatabaseConfig('release', "postgres");
  expect(config.database).toBe(dbName);
});

Then('it should have user {string}', function(user: string) {
  if (!world.configManager) throw new Error('ConfigManager not initialized');
  const config = world.configManager.getDatabaseConfig('release', "postgres");
  expect(config.user).toBe(user);
});

Then('it should have password {string}', function(password: string) {
  if (!world.configManager) throw new Error('ConfigManager not initialized');
  const config = world.configManager.getDatabaseConfig('release', "postgres");
  expect(config.password).toBe(password);
});

Then('SSL should be disabled', function() {
  if (!world.configManager) throw new Error('ConfigManager not initialized');
  const config = world.configManager.getDatabaseConfig('release', "postgres");
  expect(config.ssl).toBe(false);
});

Given('development environments \\(theme and demo)', function() {
  // Uses existing configuration
});

When('I request sqlite database configuration', function() {
  // Database configs will be checked in Then steps
});

Then('theme config should have theme database path', function() {
  if (!world.configManager) throw new Error('ConfigManager not initialized');
  const themeConfig = world.configManager.getDatabaseConfig('theme', 'sqlite');
  expect(themeConfig.path).toContain('theme_ai_dev_portal.db');
});

Then('demo config should have demo database path', function() {
  if (!world.configManager) throw new Error('ConfigManager not initialized');
  const demoConfig = world.configManager.getDatabaseConfig('demo', 'sqlite');
  expect(demoConfig.path).toContain('demo_ai_dev_portal.db');
});

Then('the paths should be different', function() {
  if (!world.configManager) throw new Error('ConfigManager not initialized');
  const themeConfig = world.configManager.getDatabaseConfig('theme', 'sqlite');
  const demoConfig = world.configManager.getDatabaseConfig('demo', 'sqlite');
  expect(themeConfig.path).not.toBe(demoConfig.path);
});

Given('all service types and environments', function() {
  // Uses existing configuration
});

When('I generate environment files', function() {
  if (!world.configManager) throw new Error('ConfigManager not initialized');
  world.envContent = world.configManager.generateEnvFile('theme', 'portal');
});

Then('each file should contain NODE_ENV variable', function() {
  if (!world.envContent) throw new Error('Environment content not generated');
  expect(world.envContent).toContain('NODE_ENV=');
});

Then('each file should contain SERVICE_NAME variable', function() {
  if (!world.envContent) throw new Error('Environment content not generated');
  expect(world.envContent).toContain('SERVICE_NAME=');
});

Then('each file should contain PORT variable', function() {
  if (!world.envContent) throw new Error('Environment content not generated');
  expect(world.envContent).toContain('PORT=');
});

Then('each file should contain appropriate database configuration', function() {
  if (!world.envContent) throw new Error('Environment content not generated');
  expect(world.envContent).toContain('DB_TYPE=');
});

Then('release environment should use postgres', function() {
  if (!world.configManager) throw new Error('ConfigManager not initialized');
  const releaseContent = world.configManager.generateEnvFile('release', 'portal');
  expect(releaseContent).toContain('DB_TYPE=postgres');
});

Then('other environments should use sqlite', function() {
  if (!world.configManager) throw new Error('ConfigManager not initialized');
  const themeContent = world.configManager.generateEnvFile('theme', 'portal');
  expect(themeContent).toContain('DB_TYPE=sqlite');
});

Given('custom configuration options', function() {
  // Will use custom options in When step
});

When('I generate environment file with custom port {int} and postgres', function(customPort: number) {
  if (!world.configManager) throw new Error('ConfigManager not initialized');
  world.envContent = world.configManager.generateEnvFile('theme', 'portal', {
    customPort: customPort,
    dbType: "postgres"
  });
});

Then('the file should contain PORT={int}', function(port: number) {
  if (!world.envContent) throw new Error('Environment content not generated');
  expect(world.envContent).toContain(`PORT=${port}`);
});

Then('the file should contain DB_TYPE=postgres', function() {
  if (!world.envContent) throw new Error('Environment content not generated');
  expect(world.envContent).toContain('DB_TYPE=postgres');
});

Then('the file should contain DB_HOST=localhost', function() {
  if (!world.envContent) throw new Error('Environment content not generated');
  expect(world.envContent).toContain('DB_HOST=localhost');
});

Given('an environment configuration', function() {
  // Uses existing configuration
});

When('I save an environment file to disk', function() {
  if (!world.configManager || !world.tempDir) throw new Error('ConfigManager or temp directory not set');
  const envFilePath = path.join(world.tempDir, 'test-service.env');
  world.configManager.saveEnvFile('theme', 'portal', envFilePath);
});

Then('the file should exist on filesystem', function() {
  if (!world.tempDir) throw new Error('Temp directory not set');
  const envFilePath = path.join(world.tempDir, 'test-service.env');
  expect(fs.existsSync(envFilePath)).toBe(true);
});

Then('the file should contain correct environment variables', function() {
  if (!world.tempDir) throw new Error('Temp directory not set');
  const envFilePath = path.join(world.tempDir, 'test-service.env');
  const content = fileAPI.readFileSync(envFilePath, 'utf8');
  expect(content).toContain('NODE_ENV=theme');
  expect(content).toContain('SERVICE_NAME=portal');
});

Given('theme connection configuration', function() {
  // Uses existing configuration
});

When('I request theme connections', function() {
  // Connections will be checked in Then steps
});

Then('aidev-portal should connect to story-reporter and gui-selector', function() {
  if (!world.configManager) throw new Error('ConfigManager not initialized');
  const portalConnections = world.configManager.getThemeConnections('aidev-portal');
  expect(portalConnections).toContain('story-reporter');
  expect(portalConnections).toContain('gui-selector');
});

Then('chat-space should connect to auth-service', function() {
  if (!world.configManager) throw new Error('ConfigManager not initialized');
  const chatConnections = world.configManager.getThemeConnections('chat-space');
  expect(chatConnections).toContain('auth-service');
});

Then('cli-framework should connect to external-log-lib', function() {
  if (!world.configManager) throw new Error('ConfigManager not initialized');
  const cliConnections = world.configManager.getThemeConnections('cli-framework');
  expect(cliConnections).toContain('external-log-lib');
});

Given('a non-existent theme', function() {
  // Will use non-existent theme name in When step
});

When('I request its connections', function() {
  if (!world.configManager) throw new Error('ConfigManager not initialized');
  const nonExistentConnections = world.configManager.getThemeConnections('non-existent-theme');
  expect(nonExistentConnections).toEqual([]);
});

Then('it should return an empty array', function() {
  // Already checked in When step
});

Given('configured themes', function() {
  // Uses existing configuration
});

When('I request all themes', function() {
  if (!world.configManager) throw new Error('ConfigManager not initialized');
  world.themes = world.configManager.getThemes();
});

Then('it should return exactly {int} themes', function(count: number) {
  if (!world.themes) throw new Error('Themes not loaded');
  expect(world.themes).toHaveLength(count);
});

Then('the list should be {string}', function(expectedList: string) {
  if (!world.themes) throw new Error('Themes not loaded');
  const expected = JSON.parse(expectedList);
  expect(world.themes).toEqual(expected);
});

Given('environment configurations', function() {
  // Uses existing configuration
});

When('I request base paths for all environments', function() {
  // Base paths will be checked in Then steps
});

Then('theme path should contain {string}', function(pathPart: string) {
  if (!world.configManager) throw new Error('ConfigManager not initialized');
  const themePath = world.configManager.getBasePath('theme');
  expect(themePath).toContain(pathPart);
});

Then('epic path should contain {string}', function(pathPart: string) {
  if (!world.configManager) throw new Error('ConfigManager not initialized');
  const epicPath = world.configManager.getBasePath('epic');
  expect(epicPath).toContain(pathPart);
});

Then('demo path should contain {string}', function(pathPart: string) {
  if (!world.configManager) throw new Error('ConfigManager not initialized');
  const demoPath = world.configManager.getBasePath('demo');
  expect(demoPath).toContain(pathPart);
});

Then('release path should contain {string}', function(pathPart: string) {
  if (!world.configManager) throw new Error('ConfigManager not initialized');
  const releasePath = world.configManager.getBasePath('release');
  expect(releasePath).toContain(pathPart);
});

Then('all paths should be absolute', function() {
  if (!world.configManager) throw new Error('ConfigManager not initialized');
  const themePath = world.configManager.getBasePath('theme');
  const epicPath = world.configManager.getBasePath('epic');
  const demoPath = world.configManager.getBasePath('demo');
  const releasePath = world.configManager.getBasePath('release');
  
  expect(path.isAbsolute(themePath)).toBe(true);
  expect(path.isAbsolute(epicPath)).toBe(true);
  expect(path.isAbsolute(demoPath)).toBe(true);
  expect(path.isAbsolute(releasePath)).toBe(true);
});

Given('an invalid configuration directory', async function() {
  if (!world.tempDir) throw new Error('Temp directory not set');
  const invalidConfigPath = path.join(world.tempDir, 'invalid');
  await fileAPI.createDirectory(invalidConfigPath);
});

When('I try to initialize ConfigManager', function() {
  if (!world.tempDir) throw new Error('Temp directory not set');
  try {
    const invalidConfigPath = path.join(world.tempDir, 'invalid');
    new ConfigManager(invalidConfigPath);
  } catch (error) {
    world.error = error as Error;
  }
});

Then('it should throw an error', function() {
  expect(world.error).toBeDefined();
});

Given('a configuration with limited port range', async function() {
  if (!world.tempDir) throw new Error('Temp directory not set');
  
  const configDir = path.join(world.tempDir, 'config');
  await fileAPI.createDirectory(configDir);
  
  const limitedConfig = path.join(configDir, 'limited.json');
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
  
  await fileAPI.createFile(limitedConfig, JSON.stringify(limited, null, 2), { type: FileType.TEMPORARY });
  world.configManager = new ConfigManager(world.tempDir);
});

When('I request next available port', function() {
  // Next available port will be checked in Then step
});

Then('it should return null when no ports are available', function() {
  if (!world.configManager) throw new Error('ConfigManager not initialized');
  const nextPort = world.configManager.getNextAvailablePort('theme');
  expect(nextPort).toBeNull();
});

Given('the real project configuration exists', function() {
  // Will check if real config exists in When step
});

When('I initialize ConfigManager with project root', function() {
  const projectRoot = path.resolve(__dirname, '../..');
  const realConfigPath = path.join(projectRoot, 'config', 'environments.json');
  
  if (fs.existsSync(realConfigPath)) {
    world.configManager = new ConfigManager(projectRoot);
  }
});

Then('it should load themes successfully', function() {
  if (world.configManager) {
    const themes = world.configManager.getThemes();
    expect(themes).toBeDefined();
  }
});

Then('it should provide environment configuration', function() {
  if (world.configManager) {
    const env = world.configManager.getEnvironment('theme');
    expect(env).toBeDefined();
  }
});