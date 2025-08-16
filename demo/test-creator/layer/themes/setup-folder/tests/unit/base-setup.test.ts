import { BaseSetup } from '../../children/src/setup/base-setup';
import { BaseSetupOptions, Mode, DeploymentType, PORT_ALLOCATIONS } from '../../children/src/types';
import * as fs from 'fs-extra';
import { path } from '../../../../../../../layer/themes/infra_external-log-lib/dist';
import { execSync } from 'child_process';

// Mocks are configured in jest.setup.js

// Create a concrete implementation for testing
class TestSetup extends BaseSetup {
  getDeployDir(): string {
    return path.join(this.baseDir, 'test-deploy');
  }

  getDbPassword(): string {
    return 'test-password';
  }

  getEnvConfig(): string {
    return 'TEST_ENV=true';
  }

  async createDeploymentConfig(): Promise<boolean> {
    return true;
  }

  printSuccessMessage(): void {
    console.log('Test success');
  }
}

describe('BaseSetup', () => {
  let setup: TestSetup;
  const mockOptions: BaseSetupOptions = {
    appName: 'test-app',
    mode: 'vf' as Mode,
    skipDb: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setup = new TestSetup(mockOptions, 'demo');
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(setup['appName']).toBe('test-app');
      expect(setup['mode']).toBe('vf');
      expect(setup['skipDb']).toBe(false);
      expect(setup['deploymentType']).toBe('demo');
      expect(setup['dbName']).toBe('test-app_demo');
      expect(setup['dbUser']).toBe('test-app_user');
      expect(setup['dbPassword']).toBe('test-password');
    });

    it('should handle skipDb option', () => {
      const setupWithSkipDb = new TestSetup({ ...mockOptions, skipDb: true }, 'demo');
      expect(setupWithSkipDb['skipDb']).toBe(true);
    });
  });

  describe('getPortAllocation', () => {
    it('should return correct port for demo deployment', () => {
      const port = setup['getPortAllocation']();
      expect(port).toBe(PORT_ALLOCATIONS.demo.main);
    });

    it('should return correct port for production deployment', () => {
      const prodSetup = new TestSetup(mockOptions, 'release');
      const port = prodSetup['getPortAllocation']();
      expect(port).toBe(PORT_ALLOCATIONS.production.main);
    });

    it('should return correct port for agile deployments', () => {
      const agileTypes: DeploymentType[] = ['epic', 'theme', 'story'];
      agileTypes.forEach(type => {
        const agileSetup = new TestSetup(mockOptions, type);
        const port = agileSetup['getPortAllocation']();
        expect(port).toBe(PORT_ALLOCATIONS.agile.main);
      });
    });

    it('should return correct port for test deployment', () => {
      const testSetup = new TestSetup(mockOptions, 'test');
      const port = testSetup['getPortAllocation']();
      expect(port).toBe(PORT_ALLOCATIONS.test.main);
    });
  });

  describe('checkPortAvailability', () => {
    it('should return true when port is available', async () => {
      (execSync as jest.Mock).mockImplementation(() => {
        throw new Error('Port not in use');
      });

      const isAvailable = await setup['checkPortAvailability'](3000);
      expect(isAvailable).toBe(true);
    });

    it('should return false when port is in use', async () => {
      (execSync as jest.Mock).mockReturnValue('');

      const isAvailable = await setup['checkPortAvailability'](3000);
      expect(isAvailable).toBe(false);
    });
  });

  describe('checkRequirements', () => {
    it('should return true when all requirements are met', async () => {
      (execSync as jest.Mock).mockImplementation((command: string) => {
        if (command.includes('node')) return 'v18.0.0\n';
        if (command.includes('npm')) return '9.0.0\n';
        if (command.includes('psql')) return 'psql (PostgreSQL) 14.0\n';
        return '';
      });

      const result = await setup['checkRequirements']();
      expect(result).toBe(true);
    });

    it('should return false when node is not installed', async () => {
      (execSync as jest.Mock).mockImplementation((command: string) => {
        if (command.includes('node')) throw new Error('Command not found');
        if (command.includes('npm')) return '9.0.0\n';
        return '';
      });

      const result = await setup['checkRequirements']();
      expect(result).toBe(false);
    });

    it('should return true even when PostgreSQL is not installed', async () => {
      (execSync as jest.Mock).mockImplementation((command: string) => {
        if (command.includes('node')) return 'v18.0.0\n';
        if (command.includes('npm')) return '9.0.0\n';
        if (command.includes('psql')) throw new Error('Command not found');
        return '';
      });

      const result = await setup['checkRequirements']();
      expect(result).toBe(true);
    });
  });

  describe('createDirectoryStructure', () => {
    it('should create all required directories', async () => {
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as unknown as jest.Mock).mockResolvedValue(undefined);

      const result = await setup['createDirectoryStructure']();
      
      expect(result).toBe(true);
      
      // Check that main directories were created
      expect(fs.ensureDir).toHaveBeenCalledWith(expect.stringContaining('test-deploy'));
      expect(fs.ensureDir).toHaveBeenCalledWith(expect.stringContaining('config'));
      expect(fs.ensureDir).toHaveBeenCalledWith(expect.stringContaining('logs'));
      expect(fs.ensureDir).toHaveBeenCalledWith(expect.stringContaining('data'));
      expect(fs.ensureDir).toHaveBeenCalledWith(expect.stringContaining('public'));
      
      // Check HEA structure
      expect(fs.ensureDir).toHaveBeenCalledWith(expect.stringContaining('src/core'));
      expect(fs.ensureDir).toHaveBeenCalledWith(expect.stringContaining('src/feature'));
      expect(fs.ensureDir).toHaveBeenCalledWith(expect.stringContaining('src/external_interface'));
      expect(fs.ensureDir).toHaveBeenCalledWith(expect.stringContaining('src/user_interface'));
      
      // Check pipe directories
      expect(fs.ensureDir).toHaveBeenCalledWith(expect.stringContaining('src/core/pipe'));
      expect(fs.ensureDir).toHaveBeenCalledWith(expect.stringContaining('src/feature/pipe'));
      
      // Check test structure
      expect(fs.ensureDir).toHaveBeenCalledWith(expect.stringContaining('tests/unit'));
      expect(fs.ensureDir).toHaveBeenCalledWith(expect.stringContaining('tests/feature'));
      expect(fs.ensureDir).toHaveBeenCalledWith(expect.stringContaining('tests/system'));
    });

    it('should return false on directory creation failure', async () => {
      (fs.ensureDir as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      const result = await setup['createDirectoryStructure']();
      
      expect(result).toBe(false);
    });
  });

  describe('createPipeGateways', () => {
    it('should create pipe gateway files for all layers', async () => {
      (fs.writeFile as unknown as jest.Mock).mockResolvedValue(undefined);

      await setup['createPipeGateways']();

      // Check that pipe files were created for each layer
      const layers = ['core', 'feature', 'external_interface', 'user_interface'];
      layers.forEach(layer => {
        expect(fs.writeFile).toHaveBeenCalledWith(
          expect.stringContaining(`src/${layer}/pipe/index.ts`),
          expect.stringContaining(`${layer} layer pipe gateway`),
        );
      });

      // Check that HEA README was created
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('src/README.md'),
        expect.stringContaining('HEA (Hierarchical Encapsulation Architecture)'),
      );
    });
  });

  describe('createEnvFile', () => {
    it('should create environment file with correct content', async () => {
      (fs.writeFile as unknown as jest.Mock).mockResolvedValue(undefined);

      const result = await setup['createEnvFile']();
      
      expect(result).toBe(true);
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.env'),
        'TEST_ENV=true'
      );
    });

    it('should return false on file creation failure', async () => {
      (fs.writeFile as unknown as jest.Mock).mockRejectedValue(new Error('Write failed'));

      const result = await setup['createEnvFile']();
      
      expect(result).toBe(false);
    });
  });

  describe('createTaskQueue', () => {
    it('should create VF mode task queue', async () => {
      (fs.writeFile as unknown as jest.Mock).mockResolvedValue(undefined);

      const result = await setup['createTaskQueue']();
      
      expect(result).toBe(true);
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('TASK_QUEUE.vf.json'),
        expect.any(String)
      );
    });

    it('should create MD mode task queue', async () => {
      const mdSetup = new TestSetup({ ...mockOptions, mode: 'md' as Mode }, 'demo');
      (fs.writeFile as unknown as jest.Mock).mockResolvedValue(undefined);

      const result = await mdSetup['createTaskQueue']();
      
      expect(result).toBe(true);
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('TASK_QUEUE.md'),
        expect.any(String)
      );
    });

    it('should handle task queue creation failure', async () => {
      (fs.writeFile as unknown as jest.Mock).mockRejectedValue(new Error('Write failed'));

      const result = await setup['createTaskQueue']();
      
      expect(result).toBe(false);
    });
  });

  describe('createMcpConfig', () => {
    it('should create MCP configuration', async () => {
      (fs.writeJson as jest.Mock).mockResolvedValue(undefined);

      const result = await setup['createMcpConfig']();
      
      expect(result).toBe(true);
      expect(fs.writeJson).toHaveBeenCalledWith(
        expect.stringContaining('config/mcp-agent.json'),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should handle MCP config creation failure', async () => {
      (fs.writeJson as jest.Mock).mockRejectedValue(new Error('Write failed'));

      const result = await setup['createMcpConfig']();
      
      expect(result).toBe(false);
    });
  });

  describe('run', () => {
    beforeEach(() => {
      jest.spyOn(setup, 'checkRequirements' as any).mockResolvedValue(true);
      jest.spyOn(setup, 'createDirectoryStructure' as any).mockResolvedValue(true);
      jest.spyOn(setup, 'createEnvFile' as any).mockResolvedValue(true);
      jest.spyOn(setup, 'createTaskQueue' as any).mockResolvedValue(true);
      jest.spyOn(setup, 'createMcpConfig' as any).mockResolvedValue(true);
      jest.spyOn(setup, 'createDeploymentConfig').mockResolvedValue(true);
      jest.spyOn(setup, 'printSuccessMessage').mockImplementation(() => {});
    });

    it('should run all setup steps successfully', async () => {
      const result = await setup.run();
      
      expect(result).toBe(true);
      expect(setup['checkRequirements']).toHaveBeenCalled();
      expect(setup['createDirectoryStructure']).toHaveBeenCalled();
      expect(setup['createEnvFile']).toHaveBeenCalled();
      expect(setup['createTaskQueue']).toHaveBeenCalled();
      expect(setup['createMcpConfig']).toHaveBeenCalled();
      expect(setup.createDeploymentConfig).toHaveBeenCalled();
      expect(setup.printSuccessMessage).toHaveBeenCalled();
    });

    it('should stop if requirements check fails', async () => {
      jest.spyOn(setup, 'checkRequirements' as any).mockResolvedValue(false);

      const result = await setup.run();
      
      expect(result).toBe(false);
      expect(setup['createDirectoryStructure']).not.toHaveBeenCalled();
    });

    it('should stop if directory creation fails', async () => {
      jest.spyOn(setup, 'createDirectoryStructure' as any).mockResolvedValue(false);

      const result = await setup.run();
      
      expect(result).toBe(false);
      expect(setup['createEnvFile']).not.toHaveBeenCalled();
    });
  });
});