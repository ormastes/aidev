/**
 * vLLM Installer Service
 * Handles automatic installation and management of vLLM server
 */

import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { os } from '../../../../../infra_external-log-lib/src';
import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';
import chalk from 'chalk';
import { VLLMClient } from './vllm-client';

const execAsync = promisify(exec);
const fsPromises = fs.promises;

export interface VLLMInstallConfig {
  installDir?: string;
  pythonPath?: string;
  venvPath?: string;
  modelPath?: string;
  gpuMemoryUtilization?: number;
  tensorParallelSize?: number;
}

export interface GPUInfo {
  available: boolean;
  type: 'cuda' | 'rocm' | 'metal' | 'cpu';
  name?: string;
  memory?: number;
  cudaVersion?: string;
  computeCapability?: string;
}

export class VLLMInstaller {
  private config: VLLMInstallConfig;
  private vllmProcess?: ChildProcess;
  private client: VLLMClient;
  
  constructor(config: VLLMInstallConfig = {}) {
    this.config = {
      installDir: config.installDir || path.join(os.homedir(), '.vllm'),
      pythonPath: config.pythonPath || 'python3',
      venvPath: config.venvPath || path.join(os.homedir(), '.vllm', 'venv'),
      modelPath: config.modelPath || path.join(os.homedir(), '.vllm', 'models'),
      gpuMemoryUtilization: config.gpuMemoryUtilization || 0.9,
      tensorParallelSize: config.tensorParallelSize || 1,
    };
    
    this.client = new VLLMClient();
  }
  
  /**
   * Check if vLLM is installed
   */
  async isInstalled(): Promise<boolean> {
    try {
      // Check if vLLM module can be imported
      const venvPython = path.join(this.config.venvPath!, 'bin', 'python');
      const { stdout } = await execAsync(`${venvPython} -c "import vllm; print(vllm.__version__)"`);
      console.log(chalk.green(`✅ vLLM is installed: v${stdout.trim()}`));
      return true;
    } catch {
      // Try system-wide installation
      try {
        const { stdout } = await execAsync(`${this.config.pythonPath} -c "import vllm; print(vllm.__version__)"`);
        console.log(chalk.green(`✅ vLLM is installed system-wide: v${stdout.trim()}`));
        return true;
      } catch {
        return false;
      }
    }
  }
  
  /**
   * Check GPU availability and information
   */
  async checkGPU(): Promise<GPUInfo> {
    const platform = os.platform();
    
    // Check for NVIDIA GPU
    try {
      const { stdout } = await execAsync('nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader,nounits');
      const [name, memory] = stdout.trim().split(',').map(s => s.trim());
      
      // Check CUDA version
      let cudaVersion = '';
      try {
        const { stdout: cuda } = await execAsync('nvcc --version');
        const match = cuda.match(/release (\d+\.\d+)/);
        if (match) cudaVersion = match[1];
      } catch {}
      
      return {
        available: true,
        type: 'cuda',
        name,
        memory: parseInt(memory),
        cudaVersion,
      };
    } catch {}
    
    // Check for AMD GPU
    try {
      await execAsync('rocm-smi --version');
      return {
        available: true,
        type: 'rocm',
        name: 'AMD GPU',
      };
    } catch {}
    
    // Check for Apple Silicon
    if (platform === 'darwin') {
      try {
        const { stdout } = await execAsync('system_profiler SPDisplaysDataType | grep Chipset');
        if (stdout && (stdout.includes('Apple') || stdout.includes('M1') || stdout.includes('M2') || stdout.includes('M3'))) {
          return {
            available: true,
            type: 'metal',
            name: 'Apple Silicon GPU',
          };
        }
      } catch {}
    }
    
    return { available: false, type: 'cpu' };
  }
  
  /**
   * Auto-install vLLM
   */
  async autoInstall(): Promise<boolean> {
    console.log(chalk.blue('🚀 Starting vLLM auto-installation...'));
    
    // Check Python version
    try {
      const { stdout } = await execAsync(`${this.config.pythonPath} --version`);
      const version = stdout.trim();
      console.log(chalk.green(`✅ Python installed: ${version}`));
      
      // Check if Python version is compatible (3.8+)
      const match = version.match(/Python (\d+)\.(\d+)/);
      if (match) {
        const major = parseInt(match[1]);
        const minor = parseInt(match[2]);
        if (major < 3 || (major === 3 && minor < 8)) {
          console.log(chalk.red('❌ Python 3.8+ is required for vLLM'));
          return false;
        }
      }
    } catch {
      console.log(chalk.red('❌ Python is not installed'));
      return false;
    }
    
    // Create installation directory
    await fsPromises.mkdir(this.config.installDir!, { recursive: true });
    await fsPromises.mkdir(this.config.modelPath!, { recursive: true });
    
    // Check GPU and determine installation method
    const gpuInfo = await this.checkGPU();
    if (gpuInfo.available) {
      console.log(chalk.green(`🎮 GPU detected: ${gpuInfo.name || gpuInfo.type}`));
    } else {
      console.log(chalk.yellow('⚠️  No GPU detected. Installing CPU version (slower performance)'));
    }
    
    // Create virtual environment
    console.log(chalk.blue('📦 Creating Python virtual environment...'));
    try {
      await execAsync(`${this.config.pythonPath} -m venv ${this.config.venvPath}`);
      console.log(chalk.green('✅ Virtual environment created'));
    } catch (error) {
      console.error(chalk.red('❌ Failed to create virtual environment:'), error);
      return false;
    }
    
    // Install vLLM
    const venvPip = path.join(this.config.venvPath!, 'bin', 'pip');
    
    console.log(chalk.blue('📥 Installing vLLM...'));
    try {
      // Upgrade pip first
      await execAsync(`${venvPip} install --upgrade pip`);
      
      // Install PyTorch based on GPU
      if (gpuInfo.type === 'cuda') {
        console.log(chalk.blue('Installing PyTorch with CUDA support...'));
        await execAsync(`${venvPip} install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118`);
      } else if (gpuInfo.type === 'rocm') {
        console.log(chalk.blue('Installing PyTorch with ROCm support...'));
        await execAsync(`${venvPip} install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/rocm5.6`);
      } else {
        console.log(chalk.blue('Installing PyTorch CPU version...'));
        await execAsync(`${venvPip} install torch torchvision torchaudio`);
      }
      
      // Install vLLM
      console.log(chalk.blue('Installing vLLM package...'));
      await execAsync(`${venvPip} install vllm`, { 
        env: { ...process.env, VLLM_INSTALL_PUNICA_KERNELS: '0' } 
      });
      
      // Install additional dependencies
      await execAsync(`${venvPip} install ray pandas pyarrow`);
      
      console.log(chalk.green('✅ vLLM installed successfully'));
      return true;
    } catch (error: any) {
      console.error(chalk.red('❌ Failed to install vLLM:'), error.message);
      
      // Try alternative installation for CPU
      if (!gpuInfo.available) {
        console.log(chalk.yellow('Trying alternative CPU installation...'));
        try {
          await execAsync(`${venvPip} install vllm-cpu`);
          console.log(chalk.green('✅ vLLM CPU version installed'));
          return true;
        } catch {}
      }
      
      return false;
    }
  }
  
  /**
   * Start vLLM server
   */
  async startServer(model: string, port: number = 8000): Promise<boolean> {
    console.log(chalk.blue(`🚀 Starting vLLM server with model: ${model}`));
    
    // Check if server is already running
    if (await this.client.checkHealth()) {
      console.log(chalk.green('✅ vLLM server is already running'));
      return true;
    }
    
    // Prepare command arguments
    const venvPython = path.join(this.config.venvPath!, 'bin', 'python');
    const args = [
      '-m', 'vllm.entrypoints.openai.api_server',
      '--model', model,
      '--port', port.toString(),
      '--host', '0.0.0.0',
      '--gpu-memory-utilization', this.config.gpuMemoryUtilization!.toString(),
      '--tensor-parallel-size', this.config.tensorParallelSize!.toString(),
    ];
    
    // Add model path if specified
    if (this.config.modelPath) {
      args.push('--download-dir', this.config.modelPath);
    }
    
    // Check GPU and add appropriate flags
    const gpuInfo = await this.checkGPU();
    if (!gpuInfo.available) {
      args.push('--device', 'cpu');
    }
    
    // Start the server
    console.log(chalk.gray(`Command: ${venvPython} ${args.join(' ')}`));
    
    this.vllmProcess = spawn(venvPython, args, {
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
        CUDA_VISIBLE_DEVICES: '0', // Use first GPU by default
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    
    // Handle server output
    this.vllmProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Uvicorn running on')) {
        console.log(chalk.green('✅ vLLM server started successfully'));
      } else if (output.includes('ERROR')) {
        console.error(chalk.red('Server error:'), output);
      }
    });
    
    this.vllmProcess.stderr?.on('data', (data) => {
      const error = data.toString();
      if (!error.includes('WARNING')) {
        console.error(chalk.red('Server error:'), error);
      }
    });
    
    this.vllmProcess.on('exit', (code) => {
      console.log(chalk.yellow(`vLLM server exited with code: ${code}`));
      this.vllmProcess = undefined;
    });
    
    // Wait for server to be ready
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (await this.client.checkHealth()) {
        console.log(chalk.green('✅ vLLM server is ready'));
        return true;
      }
      
      attempts++;
      console.log(chalk.gray(`Waiting for server to start... (${attempts}/${maxAttempts})`));
    }
    
    console.error(chalk.red('❌ Server failed to start within timeout'));
    this.stopServer();
    return false;
  }
  
  /**
   * Stop vLLM server
   */
  stopServer(): void {
    if (this.vllmProcess) {
      console.log(chalk.yellow('Stopping vLLM server...'));
      this.vllmProcess.kill('SIGTERM');
      this.vllmProcess = undefined;
    }
  }
  
  /**
   * Download model if not present
   */
  async downloadModel(modelName: string): Promise<boolean> {
    console.log(chalk.blue(`📥 Downloading model: ${modelName}`));
    
    const venvPython = path.join(this.config.venvPath!, 'bin', 'python');
    
    try {
      // Use vLLM's model downloader
      const downloadScript = `
from vllm import LLM
import os
os.environ['TRANSFORMERS_CACHE'] = '${this.config.modelPath}'
print(f"Downloading {modelName}...")
llm = LLM(model="${modelName}", download_dir="${this.config.modelPath}", load_format="dummy")
print("Model downloaded successfully")
`;
      
      await execAsync(`${venvPython} -c "${downloadScript}"`);
      console.log(chalk.green('✅ Model downloaded successfully'));
      return true;
    } catch (error: any) {
      console.error(chalk.red('❌ Failed to download model:'), error.message);
      
      // Try using huggingface-cli as fallback
      try {
        const venvPip = path.join(this.config.venvPath!, 'bin', 'pip');
        await execAsync(`${venvPip} install huggingface-hub`);
        
        const venvHfCli = path.join(this.config.venvPath!, 'bin', 'huggingface-cli');
        await execAsync(`${venvHfCli} download ${modelName} --local-dir ${path.join(this.config.modelPath!, modelName)}`);
        
        console.log(chalk.green('✅ Model downloaded using huggingface-cli'));
        return true;
      } catch {
        return false;
      }
    }
  }
}

// Singleton instance
export const vllmInstaller = new VLLMInstaller();