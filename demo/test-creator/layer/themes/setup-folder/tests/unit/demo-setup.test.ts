import { DemoSetup } from '../../children/src/setup/demo-setup';
import { DemoSetupOptions, PORT_ALLOCATIONS } from '../../children/src/types';
import * as fs from 'fs-extra';
import { path } from '../../layer/themes/infra_external-log-lib/src';
import chalk from 'chalk';

// Mocks are configured in jest.setup.js

describe("DemoSetup", () => {
  let demoSetup: DemoSetup;
  const mockOptions: DemoSetupOptions = {
    appName: 'test-demo-app',
    mode: 'vf',
    language: "typescript",
    configFile: undefined,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    demoSetup = new DemoSetup(mockOptions);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("constructor", () => {
    it('should initialize with demo-specific properties', () => {
      expect(demoSetup["language"]).toBe("typescript");
      expect(demoSetup["configFile"]).toBeUndefined();
      expect(demoSetup["deploymentType"]).toBe('demo');
    });

    it('should load config file when provided', () => {
      const mockConfig = {
        description: 'Test config',
        features: ["feature1", "feature2"]
      };
      (fs.readJsonSync as jest.Mock).mockReturnValue(mockConfig);

      const setupWithConfig = new DemoSetup({
        ...mockOptions,
        configFile: 'config.json'
      });

      expect(fs.readJsonSync).toHaveBeenCalledWith('config.json');
      expect(setupWithConfig["setupConfig"]).toEqual(mockConfig);
    });

    it('should handle config file loading error', () => {
      (fs.readJsonSync as jest.Mock).mockImplementation(() => {
        throw new Error('File not found');
      });

      const setupWithBadConfig = new DemoSetup({
        ...mockOptions,
        configFile: 'bad-config.json'
      });

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Could not load config file')
      );
    });
  });

  describe("getDeployDir", () => {
    it('should return correct deployment directory path', () => {
      const deployDir = demoSetup.getDeployDir();
      expect(deployDir).toContain('scripts/setup/demo/test-demo-app');
    });
  });

  describe("getDbPassword", () => {
    it('should return demo-specific database password', () => {
      const password = demoSetup.getDbPassword();
      expect(password).toBe('demo_password_2024');
    });
  });

  describe("getEnvConfig", () => {
    it('should generate correct environment configuration', () => {
      const envConfig = demoSetup.getEnvConfig();
      
      expect(envConfig).toContain('# Demo Environment Configuration');
      expect(envConfig).toContain('DB_TYPE=sqlite');
      expect(envConfig).toContain(`SQLITE_PATH=./data/test-demo-app_demo.db`);
      expect(envConfig).toContain('PORT=');
      expect(envConfig).toContain('NODE_ENV=demo');
      expect(envConfig).toContain('MODE=VF');
    });
  });

  describe("getPortAllocation", () => {
    it('should return correct port for demo deployment', () => {
      const port = demoSetup["getPortAllocation"]();
      expect(port).toBe(PORT_ALLOCATIONS.demo.main);
    });
  });

  describe("createDeploymentConfig", () => {
    beforeEach(() => {
      // Mock all the internal methods
      demoSetup["createNodeProject"] = jest.fn().mockResolvedValue(undefined);
      demoSetup["createPythonProject"] = jest.fn().mockResolvedValue(undefined);
      demoSetup["createFeatureMd"] = jest.fn().mockResolvedValue(undefined);
      demoSetup["createReadme"] = jest.fn().mockResolvedValue(undefined);
    });

    it('should successfully create deployment configuration for TypeScript', async () => {
      const result = await demoSetup.createDeploymentConfig();
      
      expect(result).toBe(true);
      expect(demoSetup["createNodeProject"]).toHaveBeenCalled();
      expect(demoSetup["createPythonProject"]).not.toHaveBeenCalled();
      expect(demoSetup["createFeatureMd"]).toHaveBeenCalled();
      expect(demoSetup["createReadme"]).toHaveBeenCalled();
    });

    it('should create Python project for Python language', async () => {
      const pyDemo = new DemoSetup({
        ...mockOptions,
        language: 'python'
      });
      pyDemo["createNodeProject"] = jest.fn().mockResolvedValue(undefined);
      pyDemo["createPythonProject"] = jest.fn().mockResolvedValue(undefined);
      pyDemo["createFeatureMd"] = jest.fn().mockResolvedValue(undefined);
      pyDemo["createReadme"] = jest.fn().mockResolvedValue(undefined);

      const result = await pyDemo.createDeploymentConfig();
      
      expect(result).toBe(true);
      expect(pyDemo["createNodeProject"]).not.toHaveBeenCalled();
      expect(pyDemo["createPythonProject"]).toHaveBeenCalled();
    });

    it('should handle errors during deployment config creation', async () => {
      demoSetup["createNodeProject"] = jest.fn().mockImplementation(() => {
        throw new Error('Node project creation failed');
      });
      
      const result = await demoSetup.createDeploymentConfig();
      
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create deployment config')
      );
    });
  });

  describe("printSuccessMessage", () => {
    it('should print demo-specific success message', () => {
      demoSetup.printSuccessMessage();
      
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Demo setup completed'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('test-demo-app'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("typescript"));
    });
  });
});