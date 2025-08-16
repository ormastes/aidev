import { VLLMInstaller } from '../../../src/services/vllm-installer';
import { VLLMClient } from '../../../src/services/vllm-client';
import { exec, spawn } from 'child_process';
import { fs } from '../../../../../../infra_external-log-lib/src';
import { os } from '../../../../../../infra_external-log-lib/src';
import { path } from '../../../../../../infra_external-log-lib/src';
import { EventEmitter } from 'node:events';

// Mock dependencies
jest.mock('child_process');
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    mkdir: jest.fn(),
  }
}));
jest.mock('../../../src/services/vllm-client');

describe("VLLMInstaller", () => {
  let installer: VLLMInstaller;
  let mockExec: jest.MockedFunction<typeof exec>;
  let mockSpawn: jest.MockedFunction<typeof spawn>;
  let mockMkdir: jest.MockedFunction<typeof fs.promises.mkdir>;
  let mockVLLMClient: jest.Mocked<VLLMClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocks
    mockExec = exec as jest.MockedFunction<typeof exec>;
    mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
    mockMkdir = fs.promises.mkdir as jest.MockedFunction<typeof fs.promises.mkdir>;
    
    // Mock VLLMClient
    mockVLLMClient = {
      checkHealth: jest.fn().mockResolvedValue(false)
    } as any;
    (VLLMClient as jest.MockedClass<typeof VLLMClient>).mockImplementation(() => mockVLLMClient);

    // Default exec mock behavior
    mockExec.mockImplementation((command, callback) => {
      if (callback) {
        callback(null, { stdout: '', stderr: '' } as any);
      }
      return {} as any;
    });
  });

  describe("constructor", () => {
    it('should use default configuration', () => {
      installer = new VLLMInstaller();
      const config = installer['config'];
      
      expect(config.installDir).toBe(path.join(os.homedir(), '.vllm'));
      expect(config.pythonPath).toBe('python3');
      expect(config.venvPath).toBe(path.join(os.homedir(), '.vllm', 'venv'));
      expect(config.modelPath).toBe(path.join(os.homedir(), '.vllm', 'models'));
      expect(config.gpuMemoryUtilization).toBe(0.9);
      expect(config.tensorParallelSize).toBe(1);
    });

    it('should use provided configuration', () => {
      installer = new VLLMInstaller({
        installDir: '/custom/vllm',
        pythonPath: '/usr/bin/python3.10',
        venvPath: '/custom/venv',
        modelPath: '/custom/models',
        gpuMemoryUtilization: 0.8,
        tensorParallelSize: 2
      });
      
      const config = installer['config'];
      expect(config.installDir).toBe('/custom/vllm');
      expect(config.pythonPath).toBe('/usr/bin/python3.10');
      expect(config.venvPath).toBe('/custom/venv');
      expect(config.modelPath).toBe('/custom/models');
      expect(config.gpuMemoryUtilization).toBe(0.8);
      expect(config.tensorParallelSize).toBe(2);
    });
  });

  describe("isInstalled", () => {
    beforeEach(() => {
      installer = new VLLMInstaller();
    });

    it('should return true when vLLM is installed in venv', async () => {
      mockExec.mockImplementationOnce((_command: any, callback: any) => {
        if (callback) {
          callback(null, { stdout: '0.2.0\n', stderr: '' } as any);
        }
        return {} as any;
      });

      const result = await installer.isInstalled();
      expect(result).toBe(true);
      expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('import vllm'));
    });

    it('should return true when vLLM is installed system-wide', async () => {
      // First call fails (venv)
      mockExec.mockImplementationOnce((_command: any, callback: any) => {
        if (callback) {
          callback(new Error('Module not found'), null as any);
        }
        return {} as any;
      });
      
      // Second call succeeds (system-wide)
      mockExec.mockImplementationOnce((_command: any, callback: any) => {
        if (callback) {
          callback(null, { stdout: '0.2.0\n', stderr: '' } as any);
        }
        return {} as any;
      });

      const result = await installer.isInstalled();
      expect(result).toBe(true);
    });

    it('should return false when vLLM is not installed', async () => {
      mockExec.mockImplementation((command, callback) => {
        if (callback) {
          callback(new Error('Module not found'), null as any);
        }
        return {} as any;
      });

      const result = await installer.isInstalled();
      expect(result).toBe(false);
    });
  });

  describe("checkGPU", () => {
    beforeEach(() => {
      installer = new VLLMInstaller();
    });

    it('should detect NVIDIA GPU', async () => {
      mockExec.mockImplementationOnce((_command: any, callback: any) => {
        if (command.includes('nvidia-smi')) {
          if (callback) {
            callback(null, { 
              stdout: 'NVIDIA GeForce RTX 3090, 24576, 525.60.13\n', 
              stderr: '' 
            } as any);
          }
        }
        return {} as any;
      });

      mockExec.mockImplementationOnce((_command: any, callback: any) => {
        if (command.includes('nvcc')) {
          if (callback) {
            callback(null, { 
              stdout: 'Cuda compilation tools, release 11.8', 
              stderr: '' 
            } as any);
          }
        }
        return {} as any;
      });

      const result = await installer.checkGPU();
      expect(result).toEqual({
        available: true,
        type: 'cuda',
        name: 'NVIDIA GeForce RTX 3090',
        memory: 24576,
        cudaVersion: '11.8'
      });
    });

    it('should detect AMD GPU', async () => {
      // NVIDIA check fails
      mockExec.mockImplementationOnce((_command: any, callback: any) => {
        if (callback) {
          callback(new Error('nvidia-smi not found'), null as any);
        }
        return {} as any;
      });

      // AMD check succeeds
      mockExec.mockImplementationOnce((_command: any, callback: any) => {
        if (command.includes('rocm-smi')) {
          if (callback) {
            callback(null, { stdout: 'ROCm version', stderr: '' } as any);
          }
        }
        return {} as any;
      });

      const result = await installer.checkGPU();
      expect(result).toEqual({
        available: true,
        type: 'rocm',
        name: 'AMD GPU'
      });
    });

    it('should detect Apple Silicon GPU on macOS', async () => {
      Object.defineProperty(os, "platform", {
        value: () => 'darwin',
        configurable: true
      });

      // NVIDIA and AMD checks fail
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('nvidia-smi') || command.includes('rocm-smi')) {
          if (callback) {
            callback(new Error('Command not found'), null as any);
          }
        } else if (command.includes('system_profiler')) {
          if (callback) {
            callback(null, { 
              stdout: 'Chipset Model: Apple M1 Pro', 
              stderr: '' 
            } as any);
          }
        }
        return {} as any;
      });

      const result = await installer.checkGPU();
      expect(result).toEqual({
        available: true,
        type: 'metal',
        name: 'Apple Silicon GPU'
      });

      // Restore platform
      Object.defineProperty(os, "platform", {
        value: os.platform,
        configurable: true
      });
    });

    it('should return CPU when no GPU is detected', async () => {
      mockExec.mockImplementation((command, callback) => {
        if (callback) {
          callback(new Error('Command not found'), null as any);
        }
        return {} as any;
      });

      const result = await installer.checkGPU();
      expect(result).toEqual({
        available: false,
        type: 'cpu'
      });
    });
  });

  describe("autoInstall", () => {
    beforeEach(() => {
      installer = new VLLMInstaller();
      mockMkdir.mockResolvedValue(undefined);
    });

    it('should successfully install vLLM with CUDA GPU', async () => {
      // Mock Python version check
      mockExec.mockImplementationOnce((_command: any, callback: any) => {
        if (callback) {
          callback(null, { stdout: 'Python 3.10.0\n', stderr: '' } as any);
        }
        return {} as any;
      });

      // Mock GPU check - NVIDIA
      mockExec.mockImplementationOnce((_command: any, callback: any) => {
        if (callback) {
          callback(null, { stdout: 'NVIDIA GPU, 16384, 525.60\n', stderr: '' } as any);
        }
        return {} as any;
      });

      // Mock CUDA check
      mockExec.mockImplementationOnce((_command: any, callback: any) => {
        if (callback) {
          callback(null, { stdout: 'release 11.8', stderr: '' } as any);
        }
        return {} as any;
      });

      // Mock remaining exec calls for installation
      mockExec.mockImplementation((command, callback) => {
        if (callback) {
          callback(null, { stdout: 'Success', stderr: '' } as any);
        }
        return {} as any;
      });

      const result = await installer.autoInstall();
      expect(result).toBe(true);
      expect(mockMkdir).toHaveBeenCalledTimes(2);
      expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('python3 -m venv'));
      expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('pip install --upgrade pip'));
      expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('cu118'));
      expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('pip install vllm'), expect.any(Object));
    });

    it('should install CPU version when no GPU is available', async () => {
      // Mock Python version check
      mockExec.mockImplementationOnce((_command: any, callback: any) => {
        if (callback) {
          callback(null, { stdout: 'Python 3.9.0\n', stderr: '' } as any);
        }
        return {} as any;
      });

      // Mock GPU check - none found
      let execCallCount = 0;
      mockExec.mockImplementation((command, callback) => {
        execCallCount++;
        
        if (command.includes('nvidia-smi') || command.includes('rocm-smi')) {
          if (callback) {
            callback(new Error('Command not found'), null as any);
          }
        } else if (command.includes('pip install vllm') && execCallCount < 10) {
          // First vllm install fails
          if (callback) {
            callback(new Error('GPU required'), null as any);
          }
        } else {
          if (callback) {
            callback(null, { stdout: 'Success', stderr: '' } as any);
          }
        }
        return {} as any;
      });

      const result = await installer.autoInstall();
      expect(result).toBe(true);
      expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('pip install vllm-cpu'));
    });

    it('should fail when Python is not installed', async () => {
      mockExec.mockImplementationOnce((_command: any, callback: any) => {
        if (callback) {
          callback(new Error('python3: command not found'), null as any);
        }
        return {} as any;
      });

      const result = await installer.autoInstall();
      expect(result).toBe(false);
    });

    it('should fail when Python version is too old', async () => {
      mockExec.mockImplementationOnce((_command: any, callback: any) => {
        if (callback) {
          callback(null, { stdout: 'Python 3.7.0\n', stderr: '' } as any);
        }
        return {} as any;
      });

      const result = await installer.autoInstall();
      expect(result).toBe(false);
    });
  });

  describe("startServer", () => {
    let mockProcess: any;

    beforeEach(() => {
      installer = new VLLMInstaller();
      
      mockProcess = new EventEmitter();
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      mockProcess.kill = jest.fn();
      
      mockSpawn.mockReturnValue(mockProcess as any);
    });

    it('should return true if server is already running', async () => {
      mockVLLMClient.checkHealth.mockResolvedValueOnce(true);

      const result = await installer.startServer('test-model');
      expect(result).toBe(true);
      expect(mockSpawn).not.toHaveBeenCalled();
    });

    it('should start server successfully', async () => {
      mockVLLMClient.checkHealth
        .mockResolvedValueOnce(false) // Initial check
        .mockResolvedValue(false) // Wait checks
        .mockResolvedValueOnce(true); // Final successful check

      // Mock GPU check
      mockExec.mockImplementationOnce((_command: any, callback: any) => {
        if (callback) {
          callback(new Error('No GPU'), null as any);
        }
        return {} as any;
      });

      const startPromise = installer.startServer('test-model', 8080);

      // Simulate server starting
      setTimeout(() => {
        mockProcess.stdout.emit('data', Buffer.from('Uvicorn running on'));
      }, 100);

      const result = await startPromise;
      expect(result).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith(
        expect.stringContaining('python'),
        expect.arrayContaining([
          '-m', 'vllm.entrypoints.openai.api_server',
          '--model', 'test-model',
          '--port', '8080',
          '--host', '0.0.0.0',
          '--device', 'cpu'
        ]),
        expect.any(Object)
      );
    });

    it('should handle server startup failure', async () => {
      mockVLLMClient.checkHealth.mockResolvedValue(false);

      const startPromise = installer.startServer('test-model');

      // Simulate server error
      setTimeout(() => {
        mockProcess.stderr.emit('data', Buffer.from('ERROR: Model not found'));
      }, 100);

      const result = await startPromise;
      expect(result).toBe(false);
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
    });

    it('should add GPU-specific arguments when GPU is available', async () => {
      mockVLLMClient.checkHealth.mockResolvedValueOnce(false);
      
      // Mock GPU check - has GPU
      mockExec.mockImplementationOnce((_command: any, callback: any) => {
        if (callback) {
          callback(null, { stdout: 'NVIDIA GPU, 16384, 525.60\n', stderr: '' } as any);
        }
        return {} as any;
      });

      installer.startServer('test-model');

      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.not.arrayContaining(['--device', 'cpu']),
        expect.objectContaining({
          env: expect.objectContaining({
            CUDA_VISIBLE_DEVICES: '0'
          })
        })
      );
    });
  });

  describe("stopServer", () => {
    beforeEach(() => {
      installer = new VLLMInstaller();
    });

    it('should stop running server', () => {
      const mockProcess = {
        kill: jest.fn()
      };
      installer["vllmProcess"] = mockProcess as any;

      installer.stopServer();
      
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(installer["vllmProcess"]).toBeUndefined();
    });

    it('should handle when no server is running', () => {
      installer.stopServer();
      // Should not throw
    });
  });

  describe("downloadModel", () => {
    beforeEach(() => {
      installer = new VLLMInstaller();
    });

    it('should download model using vLLM', async () => {
      mockExec.mockImplementationOnce((_command: any, callback: any) => {
        if (callback) {
          callback(null, { stdout: 'Model downloaded successfully\n', stderr: '' } as any);
        }
        return {} as any;
      });

      const result = await installer.downloadModel('test-model');
      expect(result).toBe(true);
      expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('from vllm import LLM'));
    });

    it('should fallback to huggingface-cli on vLLM failure', async () => {
      // First attempt with vLLM fails
      mockExec.mockImplementationOnce((_command: any, callback: any) => {
        if (callback) {
          callback(new Error('Import error'), null as any);
        }
        return {} as any;
      });

      // Install huggingface-hub succeeds
      mockExec.mockImplementationOnce((_command: any, callback: any) => {
        if (callback) {
          callback(null, { stdout: "Installed", stderr: '' } as any);
        }
        return {} as any;
      });

      // Download with huggingface-cli succeeds
      mockExec.mockImplementationOnce((_command: any, callback: any) => {
        if (callback) {
          callback(null, { stdout: "Downloaded", stderr: '' } as any);
        }
        return {} as any;
      });

      const result = await installer.downloadModel('test-model');
      expect(result).toBe(true);
      expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('huggingface-cli download'));
    });

    it('should return false when all download methods fail', async () => {
      mockExec.mockImplementation((_command: any, callback: any) => {
        if (typeof callback === "function") {
          callback(new Error('Download failed'), null as any);
        }
        return {} as any;
      });

      const result = await installer.downloadModel('test-model');
      expect(result).toBe(false);
    });
  });
});