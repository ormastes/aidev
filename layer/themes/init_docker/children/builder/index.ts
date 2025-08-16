/**
 * Docker CMake Builder
 * Builds CMake projects inside Docker containers
 */

import { EventEmitter } from '../../../infra_external-log-lib/src';
import { spawn, ChildProcess } from 'child_process';
import { path } from '../../../infra_external-log-lib/src';
import { fs } from '../../../infra_external-log-lib/src';

export type BuildStage = 'dependencies' | 'configure' | 'build' | 'test' | 'package';

export interface CompilerConfig {
  type: 'gcc' | 'clang' | 'msvc';
  version?: string;
  cxxStandard?: string;
  cCompiler?: string;
  cxxCompiler?: string;
  flags?: string[];
  debugSymbols?: boolean;
  optimization?: 'O0' | 'O1' | 'O2' | 'O3' | 'Os' | 'Ofast';
}

export interface CMakeOptions {
  generator?: string;
  buildType?: 'Debug' | 'Release' | 'RelWithDebInfo' | 'MinSizeRel';
  installPrefix?: string;
  cacheVariables?: Record<string, string>;
  toolchainFile?: string;
  presets?: string;
  configureArgs?: string[];
  buildArgs?: string[];
  parallel?: number;
}

export interface BuildConfig {
  projectPath: string;
  dockerImage?: string;
  compiler: CompilerConfig;
  cmake: CMakeOptions;
  mountPath?: string;
  buildDir?: string;
  cacheDir?: string;
  environment?: Record<string, string>;
  debugPort?: number;
  enableCache?: boolean;
}

export interface BuildOptions {
  stage?: BuildStage;
  clean?: boolean;
  verbose?: boolean;
  dryRun?: boolean;
  timeout?: number;
  interactive?: boolean;
}

export interface BuildResult {
  success: boolean;
  stage: BuildStage;
  duration: number;
  output?: string;
  error?: string;
  artifacts?: string[];
  logs?: BuildLog[];
}

export interface BuildLog {
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  stage?: BuildStage;
}

export class DockerCMakeBuilder extends EventEmitter {
  private config: BuildConfig;
  private container?: string;
  private process?: ChildProcess;
  private logs: BuildLog[];
  private startTime?: Date;

  constructor(config: BuildConfig) {
    super();
    this.config = this.validateConfig(config);
    this.logs = [];
  }

  private validateConfig(config: BuildConfig): BuildConfig {
    const defaults: Partial<BuildConfig> = {
      mountPath: '/workspace',
      buildDir: 'build',
      cacheDir: '.cmake-cache',
      dockerImage: this.getDefaultImage(config.compiler.type),
    };

    return { ...defaults, ...config };
  }

  private getDefaultImage(compiler: 'gcc' | 'clang' | 'msvc'): string {
    const images = {
      gcc: 'gcc:latest',
      clang: 'silkeh/clang:latest',
      msvc: 'mcr.microsoft.com/windows/servercore:ltsc2022',
    };
    return images[compiler];
  }

  async build(options: BuildOptions = {}): Promise<BuildResult> {
    this.startTime = new Date();
    this.logs = [];

    try {
      // Pull Docker image if needed
      await this.pullImage();

      // Create container with volume mounts
      await this.createContainer(options);

      // Execute build stages
      const stages: BuildStage[] = options.stage 
        ? [options.stage]
        : ['dependencies', 'configure', 'build', 'test', 'package'];

      for (const stage of stages) {
        const stageResult = await this.executeStage(stage, options);
        if (!stageResult.success && stage !== 'test') {
          return stageResult;
        }
      }

      const duration = Date.now() - this.startTime.getTime();
      
      return {
        success: true,
        stage: options.stage || 'package',
        duration,
        artifacts: await this.collectArtifacts(),
        logs: this.logs,
      };
    } catch (error: any) {
      const duration = this.startTime ? Date.now() - this.startTime.getTime() : 0;
      
      return {
        success: false,
        stage: options.stage || 'build',
        duration,
        error: error.message,
        logs: this.logs,
      };
    } finally {
      await this.cleanup();
    }
  }

  private async pullImage(): Promise<void> {
    const image = this.config.dockerImage!;
    this.log('info', `Pulling Docker image: ${image}`);

    return new Promise((resolve, reject) => {
      const proc = spawn('docker', ['pull', image]);
      
      proc.on('close', (code) => {
        if (code === 0) {
          this.log('info', 'Docker image pulled successfully');
          resolve();
        } else {
          reject(new Error(`Failed to pull Docker image: ${image}`));
        }
      });
    });
  }

  private async createContainer(options: BuildOptions): Promise<void> {
    const args = ['run', '-d'];
    
    // Volume mounts
    args.push('-v', `${this.config.projectPath}:${this.config.mountPath}`);
    
    // Cache volume
    if (this.config.enableCache) {
      const cachePath = path.join(this.config.projectPath, this.config.cacheDir!);
      args.push('-v', `${cachePath}:/cache`);
    }

    // Debug port
    if (this.config.debugPort && options.interactive) {
      args.push('-p', `${this.config.debugPort}:2345`);
    }

    // Environment variables
    if (this.config.environment) {
      for (const [key, value] of Object.entries(this.config.environment)) {
        args.push('-e', `${key}=${value}`);
      }
    }

    // Working directory
    args.push('-w', this.config.mountPath!);
    
    // Image
    args.push(this.config.dockerImage!);
    
    // Keep container running
    args.push('tail', '-f', '/dev/null');

    this.log('info', `Creating Docker container with args: ${args.join(' ')}`);

    return new Promise((resolve, reject) => {
      const proc = spawn('docker', args);
      let containerId = '';

      proc.stdout.on('data', (data) => {
        containerId += data.toString().trim();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          this.container = containerId;
          this.log('info', `Container created: ${containerId.substring(0, 12)}`);
          resolve();
        } else {
          reject(new Error('Failed to create Docker container'));
        }
      });
    });
  }

  private async executeStage(stage: BuildStage, options: BuildOptions): Promise<BuildResult> {
    this.log('info', `Executing stage: ${stage}`, stage);
    
    const commands = this.getStageCommands(stage, options);
    const startTime = Date.now();

    try {
      for (const command of commands) {
        await this.executeCommand(command, stage, options);
      }

      return {
        success: true,
        stage,
        duration: Date.now() - startTime,
        logs: this.logs.filter(l => l.stage === stage),
      };
    } catch (error: any) {
      return {
        success: false,
        stage,
        duration: Date.now() - startTime,
        error: error.message,
        logs: this.logs.filter(l => l.stage === stage),
      };
    }
  }

  private getStageCommands(stage: BuildStage, options: BuildOptions): string[] {
    const commands: string[] = [];
    const buildPath = path.posix.join(this.config.mountPath!, this.config.buildDir!);

    switch (stage) {
      case 'dependencies':
        // Install build dependencies
        commands.push('apt-get update || yum update -y || true');
        commands.push('apt-get install -y cmake ninja-build || yum install -y cmake ninja-build || true');
        
        // Install compiler-specific tools
        if (this.config.compiler.type === 'clang') {
          commands.push('apt-get install -y clang-tools || true');
        }
        break;

      case 'configure':
        // Create build directory
        commands.push(`mkdir -p ${buildPath}`);
        
        // Run CMake configure
        const cmakeCmd = this.buildCMakeCommand(buildPath, options);
        commands.push(cmakeCmd);
        break;

      case 'build':
        // Build the project
        const buildCmd = this.buildBuildCommand(buildPath, options);
        commands.push(buildCmd);
        break;

      case 'test':
        // Run tests
        commands.push(`cd ${buildPath} && ctest --output-on-failure`);
        break;

      case 'package':
        // Create packages
        commands.push(`cd ${buildPath} && cpack`);
        break;
    }

    return commands;
  }

  private buildCMakeCommand(buildPath: string, options: BuildOptions): string {
    const parts = ['cmake'];
    
    // Generator
    if (this.config.cmake.generator) {
      parts.push('-G', `"${this.config.cmake.generator}"`);
    } else {
      parts.push('-G', 'Ninja');
    }

    // Build type
    if (this.config.cmake.buildType) {
      parts.push(`-DCMAKE_BUILD_TYPE=${this.config.cmake.buildType}`);
    }

    // Compiler settings
    if (this.config.compiler.cCompiler) {
      parts.push(`-DCMAKE_C_COMPILER=${this.config.compiler.cCompiler}`);
    }
    if (this.config.compiler.cxxCompiler) {
      parts.push(`-DCMAKE_CXX_COMPILER=${this.config.compiler.cxxCompiler}`);
    }
    if (this.config.compiler.cxxStandard) {
      parts.push(`-DCMAKE_CXX_STANDARD=${this.config.compiler.cxxStandard}`);
    }

    // Install prefix
    if (this.config.cmake.installPrefix) {
      parts.push(`-DCMAKE_INSTALL_PREFIX=${this.config.cmake.installPrefix}`);
    }

    // Cache variables
    if (this.config.cmake.cacheVariables) {
      for (const [key, value] of Object.entries(this.config.cmake.cacheVariables)) {
        parts.push(`-D${key}=${value}`);
      }
    }

    // Toolchain file
    if (this.config.cmake.toolchainFile) {
      parts.push(`-DCMAKE_TOOLCHAIN_FILE=${this.config.cmake.toolchainFile}`);
    }

    // Additional configure args
    if (this.config.cmake.configureArgs) {
      parts.push(...this.config.cmake.configureArgs);
    }

    // Source directory
    parts.push(this.config.mountPath!);

    // Build directory
    parts.push('-B', buildPath);

    return parts.join(' ');
  }

  private buildBuildCommand(buildPath: string, options: BuildOptions): string {
    const parts = ['cmake', '--build', buildPath];
    
    // Parallel jobs
    if (this.config.cmake.parallel) {
      parts.push('-j', String(this.config.cmake.parallel));
    }

    // Verbose output
    if (options.verbose) {
      parts.push('--verbose');
    }

    // Clean first
    if (options.clean) {
      parts.push('--clean-first');
    }

    // Additional build args
    if (this.config.cmake.buildArgs) {
      parts.push(...this.config.cmake.buildArgs);
    }

    return parts.join(' ');
  }

  private async executeCommand(
    command: string,
    stage: BuildStage,
    options: BuildOptions
  ): Promise<void> {
    if (!this.container) {
      throw new Error('No container available');
    }

    if (options.dryRun) {
      this.log('info', `[DRY RUN] Would execute: ${command}`, stage);
      return;
    }

    this.log('debug', `Executing: ${command}`, stage);

    return new Promise((resolve, reject) => {
      const args = ['exec'];
      
      if (options.interactive) {
        args.push('-it');
      }
      
      args.push(this.container!, 'sh', '-c', command);

      const proc = spawn('docker', args, {
        stdio: options.verbose ? 'inherit' : 'pipe',
      });

      let output = '';
      let error = '';

      if (!options.verbose) {
        proc.stdout?.on('data', (data) => {
          output += data.toString();
          this.emit('output', { stage, data: data.toString() });
        });

        proc.stderr?.on('data', (data) => {
          error += data.toString();
          this.emit('error', { stage, data: data.toString() });
        });
      }

      proc.on('close', (code) => {
        if (code === 0) {
          if (output) {
            this.log('debug', output, stage);
          }
          resolve();
        } else {
          const errorMsg = error || `Command failed with code ${code}`;
          this.log('error', errorMsg, stage);
          reject(new Error(errorMsg));
        }
      });

      // Handle timeout
      if (options.timeout) {
        setTimeout(() => {
          proc.kill();
          reject(new Error(`Command timed out after ${options.timeout}ms`));
        }, options.timeout);
      }
    });
  }

  private async collectArtifacts(): Promise<string[]> {
    const artifacts: string[] = [];
    const buildPath = path.join(this.config.projectPath, this.config.buildDir!);

    try {
      // Look for built executables
      const files = await fs.promises.readdir(buildPath);
      
      for (const file of files) {
        const filePath = path.join(buildPath, file);
        const stats = await fs.promises.stat(filePath);
        
        if (stats.isFile() && (stats.mode & 0o111)) {
          artifacts.push(filePath);
        }
      }

      // Look for packages
      const packagePatterns = ['*.deb', '*.rpm', '*.tar.gz', '*.zip'];
      for (const pattern of packagePatterns) {
        const matches = files.filter(f => f.endsWith(pattern.substring(1)));
        artifacts.push(...matches.map(f => path.join(buildPath, f)));
      }
    } catch (error) {
      this.log('warning', `Failed to collect artifacts: ${error}`);
    }

    return artifacts;
  }

  private async cleanup(): Promise<void> {
    if (this.container) {
      this.log('info', 'Cleaning up container');
      
      try {
        await this.executeDockerCommand(['stop', this.container]);
        await this.executeDockerCommand(['rm', this.container]);
        this.container = undefined;
      } catch (error) {
        this.log('warning', `Failed to cleanup container: ${error}`);
      }
    }
  }

  private async executeDockerCommand(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn('docker', args);
      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Docker command failed: ${args.join(' ')}`));
        }
      });
    });
  }

  private log(level: BuildLog['level'], message: string, stage?: BuildStage): void {
    const log: BuildLog = {
      timestamp: new Date(),
      level,
      message,
      stage,
    };

    this.logs.push(log);
    this.emit('log', log);
  }

  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = undefined;
    }
    
    await this.cleanup();
  }

  getConfig(): BuildConfig {
    return { ...this.config };
  }

  getLogs(): BuildLog[] {
    return [...this.logs];
  }
}

export default DockerCMakeBuilder;