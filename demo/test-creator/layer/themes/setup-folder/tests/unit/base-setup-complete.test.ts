import { BaseSetup } from '../../children/src/setup/base-setup';
import { BaseSetupOptions, Mode, DeploymentType, PORT_ALLOCATIONS } from '../../children/src/types';
import * as fs from 'fs-extra';
import { path } from '../../../../../../../layer/themes/infra_external-log-lib/dist';
import { execSync } from 'child_process';

// Create comprehensive test implementation
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

describe('BaseSetup - Complete Coverage', () => {
  let setup: TestSetup;
  const mockOptions: BaseSetupOptions = {
    appName: 'test-app',
    mode: 'vf' as Mode,
    skipDb: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setup = new TestSetup(mockOptions, 'demo');
    
    // Reset all mocks to default success behavior
    (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.writeJson as jest.Mock).mockResolvedValue(undefined);
    (fs.readFile as jest.Mock).mockResolvedValue('');
    (fs.pathExists as jest.Mock).mockResolvedValue(true);
    (execSync as jest.Mock).mockReturnValue('v18.0.0\n');
  });

  describe('createPipeGateways error handling', () => {
    it('should handle pipe gateway creation error', async () => {
      (fs.writeFile as jest.Mock).mockRejectedValueOnce(new Error('Write failed'));
      
      // This should not throw but log error
      await expect(setup['createPipeGateways']()).resolves.not.toThrow();
    });
  });

  describe('createDirectoryStructure error path', () => {
    it('should handle directory creation error and return false', async () => {
      (fs.ensureDir as jest.Mock).mockRejectedValueOnce(new Error('Permission denied'));
      
      const result = await setup['createDirectoryStructure']();
      expect(result).toBe(false);
    });
  });

  describe('createTaskQueue MD mode', () => {
    it('should create MD format task queue', async () => {
      const mdSetup = new TestSetup({ ...mockOptions, mode: 'md' as Mode }, 'demo');
      
      const result = await mdSetup['createTaskQueue']();
      
      expect(result).toBe(true);
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('TASK_QUEUE.md'),
        expect.stringContaining('# Task Queue')
      );
    });
  });

  describe('createMcpConfig', () => {
    it('should skip MCP config for MD mode', async () => {
      const mdSetup = new TestSetup({ ...mockOptions, mode: 'md' as Mode }, 'demo');
      
      const result = await mdSetup['createMcpConfig']();
      
      expect(result).toBe(true);
      expect(fs.writeJson).not.toHaveBeenCalled();
    });

    it('should create MCP config for VF mode', async () => {
      const result = await setup['createMcpConfig']();
      
      expect(result).toBe(true);
      expect(fs.ensureDir).toHaveBeenCalledWith(expect.stringContaining('config'));
      expect(fs.writeJson).toHaveBeenCalledWith(
        expect.stringContaining('mcp-agent.json'),
        expect.objectContaining({
          version: '1.0',
          tools: expect.any(Array)
        }),
        { spaces: 2 }
      );
    });
  });

  describe('createEnvFile error path', () => {
    it('should handle env file write error', async () => {
      (fs.writeFile as jest.Mock).mockRejectedValueOnce(new Error('Disk full'));
      
      const result = await setup['createEnvFile']();
      expect(result).toBe(false);
    });
  });

  describe('run method - complete flow', () => {
    it('should handle deployment config failure', async () => {
      jest.spyOn(setup, 'checkRequirements' as any).mockResolvedValue(true);
      jest.spyOn(setup, 'createDirectoryStructure' as any).mockResolvedValue(true);
      jest.spyOn(setup, 'createEnvFile' as any).mockResolvedValue(true);
      jest.spyOn(setup, 'createTaskQueue' as any).mockResolvedValue(true);
      jest.spyOn(setup, 'createMcpConfig' as any).mockResolvedValue(true);
      jest.spyOn(setup, 'createDeploymentConfig').mockResolvedValue(false);
      
      const result = await setup.run();
      
      expect(result).toBe(false);
      expect(setup.printSuccessMessage).not.toHaveBeenCalled();
    });

    it('should handle env file creation failure', async () => {
      jest.spyOn(setup, 'checkRequirements' as any).mockResolvedValue(true);
      jest.spyOn(setup, 'createDirectoryStructure' as any).mockResolvedValue(true);
      jest.spyOn(setup, 'createEnvFile' as any).mockResolvedValue(false);
      
      const result = await setup.run();
      
      expect(result).toBe(false);
      expect(setup['createTaskQueue']).not.toHaveBeenCalled();
    });

    it('should handle task queue creation failure', async () => {
      jest.spyOn(setup, 'checkRequirements' as any).mockResolvedValue(true);
      jest.spyOn(setup, 'createDirectoryStructure' as any).mockResolvedValue(true);
      jest.spyOn(setup, 'createEnvFile' as any).mockResolvedValue(true);
      jest.spyOn(setup, 'createTaskQueue' as any).mockResolvedValue(false);
      
      const result = await setup.run();
      
      expect(result).toBe(false);
      expect(setup['createMcpConfig']).not.toHaveBeenCalled();
    });

    it('should handle MCP config creation failure', async () => {
      jest.spyOn(setup, 'checkRequirements' as any).mockResolvedValue(true);
      jest.spyOn(setup, 'createDirectoryStructure' as any).mockResolvedValue(true);
      jest.spyOn(setup, 'createEnvFile' as any).mockResolvedValue(true);
      jest.spyOn(setup, 'createTaskQueue' as any).mockResolvedValue(true);
      jest.spyOn(setup, 'createMcpConfig' as any).mockResolvedValue(false);
      
      const result = await setup.run();
      
      expect(result).toBe(false);
      expect(setup.createDeploymentConfig).not.toHaveBeenCalled();
    });
  });

  describe('checkRequirements edge cases', () => {
    it('should warn when PostgreSQL is not available', async () => {
      (execSync as jest.Mock).mockImplementation((cmd: string) => {
        if (cmd.includes('psql')) throw new Error('Command not found');
        return 'v18.0.0\n';
      });
      
      const result = await setup['checkRequirements']();
      expect(result).toBe(true);
    });

    it('should fail when npm is not available', async () => {
      (execSync as jest.Mock).mockImplementation((cmd: string) => {
        if (cmd.includes('npm')) throw new Error('Command not found');
        return 'v18.0.0\n';
      });
      
      const result = await setup['checkRequirements']();
      expect(result).toBe(false);
    });
  });

  describe('port checking', () => {
    it('should detect port in use', async () => {
      (execSync as jest.Mock).mockReturnValueOnce('LISTENING');
      
      const available = await setup['checkPortAvailability'](3000);
      expect(available).toBe(false);
    });

    it('should detect port available', async () => {
      (execSync as jest.Mock).mockImplementation(() => {
        throw new Error('Not found');
      });
      
      const available = await setup['checkPortAvailability'](3000);
      expect(available).toBe(true);
    });
  });
});