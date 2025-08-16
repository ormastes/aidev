/**
 * Build Orchestrator
 * Orchestrates the complete build pipeline
 */

import { EventEmitter } from '../../../infra_external-log-lib/src';
import { DockerCMakeBuilder, BuildConfig, BuildOptions, BuildResult } from '../builder';
import { VolumeManager, VolumeConfig, MountPoint } from '../volume';
import { path } from '../../../infra_external-log-lib/src';
import { fs } from '../../../infra_external-log-lib/src';

export type BuildEnvironment = 'local' | 'dev' | 'dev-demo' | 'demo' | 'release';

export interface BuildStep {
  name: string;
  command?: string;
  script?: string;
  environment?: Record<string, string>;
  condition?: () => boolean;
  continueOnError?: boolean;
  timeout?: number;
}

export interface BuildPipeline {
  name: string;
  environment: BuildEnvironment;
  steps: BuildStep[];
  beforeBuild?: BuildStep[];
  afterBuild?: BuildStep[];
  artifacts?: string[];
}

export interface BuildArtifact {
  name: string;
  path: string;
  type: 'executable' | 'library' | 'package' | 'documentation' | 'other';
  size: number;
  timestamp: Date;
}

export interface OrchestrationConfig {
  projectPath: string;
  pipeline: BuildPipeline;
  dockerConfig?: Partial<BuildConfig>;
  volumeConfig?: Partial<VolumeConfig>;
  parallel?: boolean;
  cache?: boolean;
  clean?: boolean;
}

export interface OrchestrationResult {
  success: boolean;
  environment: BuildEnvironment;
  duration: number;
  steps: StepResult[];
  artifacts: BuildArtifact[];
  logs?: any[];
}

export interface StepResult {
  name: string;
  success: boolean;
  duration: number;
  output?: string;
  error?: string;
}

export class BuildOrchestrator extends EventEmitter {
  private config: OrchestrationConfig;
  private builder?: DockerCMakeBuilder;
  private volumeManager?: VolumeManager;
  private currentPipeline?: BuildPipeline;
  private stepResults: StepResult[];
  private startTime?: Date;

  constructor(config: OrchestrationConfig) {
    super();
    this.config = config;
    this.stepResults = [];
  }

  async orchestrate(): Promise<OrchestrationResult> {
    this.startTime = new Date();
    this.stepResults = [];
    this.currentPipeline = this.config.pipeline;

    this.emit('orchestration:start', { 
      pipeline: this.currentPipeline.name,
      environment: this.currentPipeline.environment 
    });

    try {
      // Setup volumes
      await this.setupVolumes();

      // Execute before-build steps
      if (this.currentPipeline.beforeBuild) {
        await this.executeSteps('before', this.currentPipeline.beforeBuild);
      }

      // Setup builder
      await this.setupBuilder();

      // Execute main build
      const buildResult = await this.executeBuild();
      
      if (!buildResult.success) {
        throw new Error(`Build failed: ${buildResult.error}`);
      }

      // Execute pipeline steps
      await this.executeSteps('main', this.currentPipeline.steps);

      // Execute after-build steps
      if (this.currentPipeline.afterBuild) {
        await this.executeSteps('after', this.currentPipeline.afterBuild);
      }

      // Collect artifacts
      const artifacts = await this.collectArtifacts();

      const duration = Date.now() - this.startTime.getTime();

      return {
        success: true,
        environment: this.currentPipeline.environment,
        duration,
        steps: this.stepResults,
        artifacts,
      };
    } catch (error: any) {
      const duration = this.startTime ? Date.now() - this.startTime.getTime() : 0;

      this.emit('orchestration:error', { error });

      return {
        success: false,
        environment: this.currentPipeline!.environment,
        duration,
        steps: this.stepResults,
        artifacts: [],
      };
    } finally {
      await this.cleanup();
      this.emit('orchestration:complete');
    }
  }

  private async setupVolumes(): Promise<void> {
    const volumeConfig: VolumeConfig = {
      projectPath: this.config.projectPath,
      mounts: this.getEnvironmentMounts(),
      cacheStrategy: this.config.cache ? 'persistent' : 'ephemeral',
      ...this.config.volumeConfig,
    };

    this.volumeManager = new VolumeManager(volumeConfig);
    
    this.volumeManager.on('volume:created', (data) => {
      this.emit('volume:created', data);
    });

    await this.volumeManager.setupVolumes();
  }

  private getEnvironmentMounts(): MountPoint[] {
    const mounts: MountPoint[] = [];
    const env = this.currentPipeline!.environment;

    // Always mount source code
    mounts.push({
      source: '.',
      target: '/workspace',
      type: 'bind',
      permissions: {
        readonly: env === 'release' || env === 'demo',
      },
    });

    // Environment-specific mounts
    switch (env) {
      case 'local':
        // Full source with hot reload
        mounts.push({
          source: 'build',
          target: '/workspace/build',
          type: 'bind',
        });
        break;

      case 'dev':
        // Development with cache
        mounts.push({
          source: 'cmake-cache',
          target: '/cache',
          type: 'cache',
        });
        break;

      case 'dev-demo':
      case 'demo':
        // Demo environments with tmpfs for temp files
        mounts.push({
          source: 'tmp',
          target: '/tmp/build',
          type: 'tmpfs',
        });
        break;

      case 'release':
        // Production with minimal mounts
        mounts.push({
          source: 'release-artifacts',
          target: '/artifacts',
          type: 'volume',
        });
        break;
    }

    return mounts;
  }

  private async setupBuilder(): Promise<void> {
    const buildConfig: BuildConfig = {
      projectPath: this.config.projectPath,
      compiler: {
        type: 'gcc',
        cxxStandard: '17',
        optimization: this.getOptimizationLevel(),
        debugSymbols: this.shouldIncludeDebugSymbols(),
      },
      cmake: {
        buildType: this.getBuildType(),
        parallel: this.config.parallel ? undefined : 1,
        generator: 'Ninja',
      },
      enableCache: this.config.cache,
      ...this.config.dockerConfig,
    };

    this.builder = new DockerCMakeBuilder(buildConfig);

    this.builder.on('log', (log) => {
      this.emit('build:log', log);
    });

    this.builder.on('output', (data) => {
      this.emit('build:output', data);
    });
  }

  private getOptimizationLevel(): BuildConfig['compiler']['optimization'] {
    switch (this.currentPipeline!.environment) {
      case 'local':
      case 'dev':
        return 'O0';
      case 'dev-demo':
        return 'O1';
      case 'demo':
        return 'O2';
      case 'release':
        return 'O3';
      default:
        return 'O2';
    }
  }

  private shouldIncludeDebugSymbols(): boolean {
    const env = this.currentPipeline!.environment;
    return env === 'local' || env === 'dev' || env === 'dev-demo';
  }

  private getBuildType(): BuildConfig['cmake']['buildType'] {
    switch (this.currentPipeline!.environment) {
      case 'local':
      case 'dev':
        return 'Debug';
      case 'dev-demo':
        return 'RelWithDebInfo';
      case 'demo':
      case 'release':
        return 'Release';
      default:
        return 'Release';
    }
  }

  private async executeBuild(): Promise<BuildResult> {
    if (!this.builder) {
      throw new Error('Builder not initialized');
    }

    const options: BuildOptions = {
      clean: this.config.clean,
      verbose: this.currentPipeline!.environment === 'local',
      timeout: 30 * 60 * 1000, // 30 minutes
    };

    this.emit('build:start');
    const result = await this.builder.build(options);
    this.emit('build:complete', result);

    return result;
  }

  private async executeSteps(phase: string, steps: BuildStep[]): Promise<void> {
    for (const step of steps) {
      if (step.condition && !step.condition()) {
        this.emit('step:skipped', { phase, step: step.name });
        continue;
      }

      const result = await this.executeStep(phase, step);
      this.stepResults.push(result);

      if (!result.success && !step.continueOnError) {
        throw new Error(`Step failed: ${step.name}`);
      }
    }
  }

  private async executeStep(phase: string, step: BuildStep): Promise<StepResult> {
    const startTime = Date.now();
    this.emit('step:start', { phase, step: step.name });

    try {
      let output = '';

      if (step.command) {
        output = await this.executeCommand(step.command, step.environment);
      } else if (step.script) {
        output = await this.executeScript(step.script, step.environment);
      }

      const duration = Date.now() - startTime;
      
      this.emit('step:complete', { phase, step: step.name, duration });

      return {
        name: step.name,
        success: true,
        duration,
        output,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      this.emit('step:error', { phase, step: step.name, error });

      return {
        name: step.name,
        success: false,
        duration,
        error: error.message,
      };
    }
  }

  private async executeCommand(
    command: string,
    environment?: Record<string, string>
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const { spawn } = require('child_process');
      const proc = spawn(command, {
        shell: true,
        env: { ...process.env, ...environment },
      });

      let output = '';
      proc.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });

      proc.on('close', (code: number) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Command failed with code ${code}`));
        }
      });
    });
  }

  private async executeScript(
    scriptPath: string,
    environment?: Record<string, string>
  ): Promise<string> {
    const fullPath = path.join(this.config.projectPath, scriptPath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Script not found: ${scriptPath}`);
    }

    return this.executeCommand(`sh ${fullPath}`, environment);
  }

  private async collectArtifacts(): Promise<BuildArtifact[]> {
    const artifacts: BuildArtifact[] = [];
    const patterns = this.currentPipeline!.artifacts || ['build/**/*'];

    for (const pattern of patterns) {
      const files = await this.findFiles(pattern);
      
      for (const file of files) {
        const stats = await fs.promises.stat(file);
        
        artifacts.push({
          name: path.basename(file),
          path: file,
          type: this.detectArtifactType(file),
          size: stats.size,
          timestamp: stats.mtime,
        });
      }
    }

    this.emit('artifacts:collected', { count: artifacts.length });
    return artifacts;
  }

  private async findFiles(pattern: string): Promise<string[]> {
    const glob = require('glob');
    const basePath = this.config.projectPath;
    
    return new Promise((resolve, reject) => {
      glob(pattern, { cwd: basePath }, (err: Error | null, files: string[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(files.map(f => path.join(basePath, f)));
        }
      });
    });
  }

  private detectArtifactType(file: string): BuildArtifact['type'] {
    const ext = path.extname(file).toLowerCase();
    
    if (['.exe', ''].includes(ext)) {
      const stats = fs.statSync(file);
      if (stats.mode & 0o111) {
        return 'executable';
      }
    }
    
    if (['.so', '.dll', '.dylib', '.a'].includes(ext)) {
      return 'library';
    }
    
    if (['.deb', '.rpm', '.tar.gz', '.zip'].includes(ext)) {
      return 'package';
    }
    
    if (['.pdf', '.md', '.html'].includes(ext)) {
      return 'documentation';
    }
    
    return 'other';
  }

  private async cleanup(): Promise<void> {
    if (this.builder) {
      await this.builder.stop();
    }

    if (this.volumeManager && !this.config.cache) {
      await this.volumeManager.cleanupCaches();
    }
  }

  async stop(): Promise<void> {
    if (this.builder) {
      await this.builder.stop();
    }
  }

  getStepResults(): StepResult[] {
    return [...this.stepResults];
  }

  getCurrentPipeline(): BuildPipeline | undefined {
    return this.currentPipeline;
  }
}

export default BuildOrchestrator;