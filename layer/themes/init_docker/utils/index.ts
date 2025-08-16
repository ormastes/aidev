import { fileAPI } from '../utils/file-api';
/**
 * Utility functions for Docker CMake Build
 */

import { DockerCMakeBuilder, BuildConfig } from '../children/builder';
import { VolumeManager, VolumeConfig } from '../children/volume';
import { BuildOrchestrator, OrchestrationConfig } from '../children/orchestrator';
import { TemplateManager } from '../children/templates';
import { path } from '../../infra_external-log-lib/src';
import { fs } from '../../infra_external-log-lib/src';

/**
 * Create a Docker CMake builder
 */
export function createBuilder(config: {
  projectPath: string;
  compiler?: 'gcc' | 'clang' | 'msvc';
  buildType?: 'Debug' | 'Release';
  cxxStandard?: string;
}): DockerCMakeBuilder {
  const buildConfig: BuildConfig = {
    projectPath: config.projectPath,
    compiler: {
      type: config.compiler || 'gcc',
      cxxStandard: config.cxxStandard || '17',
    },
    cmake: {
      buildType: config.buildType || 'Release',
    },
  };

  return new DockerCMakeBuilder(buildConfig);
}

/**
 * Build a project with Docker
 */
export async function buildProject(
  projectPath: string,
  options?: {
    compiler?: 'gcc' | 'clang' | 'msvc';
    buildType?: 'Debug' | 'Release';
    clean?: boolean;
    verbose?: boolean;
  }
): Promise<any> {
  const builder = createBuilder({
    projectPath,
    compiler: options?.compiler,
    buildType: options?.buildType,
  });

  return builder.build({
    clean: options?.clean,
    verbose: options?.verbose,
  });
}

/**
 * Mount a volume for Docker build
 */
export function mountVolume(config: {
  projectPath: string;
  sourceDir?: string;
  targetDir?: string;
  readonly?: boolean;
}): VolumeManager {
  const volumeConfig: VolumeConfig = {
    projectPath: config.projectPath,
    mounts: [{
      source: config.sourceDir || '.',
      target: config.targetDir || '/workspace',
      type: 'bind',
      permissions: {
        readonly: config.readonly,
      },
    }],
  };

  return new VolumeManager(volumeConfig);
}

/**
 * Generate a Dockerfile for the project
 */
export function generateDockerfile(config: {
  projectName: string;
  compiler?: 'gcc' | 'clang' | 'msvc';
  cxxStandard?: string;
  buildType?: string;
  dependencies?: string[];
}): string {
  const templateManager = new TemplateManager();
  
  return templateManager.generateDockerfile({
    projectName: config.projectName,
    compiler: config.compiler || 'gcc',
    cxxStandard: config.cxxStandard || '17',
    buildType: config.buildType || 'Release',
    dependencies: config.dependencies,
  });
}

/**
 * Generate a CMakeLists.txt file
 */
export function generateCMakeLists(
  projectName: string,
  options?: {
    version?: string;
    standard?: string;
    packages?: string[];
  }
): string {
  const templateManager = new TemplateManager();
  
  return templateManager.generateCMakeLists(projectName, {
    minVersion: options?.version || '3.16',
    standard: options?.standard || '17',
    packages: options?.packages,
  });
}

/**
 * Detect project type from directory structure
 */
export function detectProjectType(projectPath: string): {
  type: 'cmake' | 'make' | 'unknown';
  hasTests: boolean;
  hasDocs: boolean;
  compiler?: 'gcc' | 'clang';
} {
  const files = fs.readdirSync(projectPath);
  
  let type: 'cmake' | 'make' | 'unknown' = 'unknown';
  let hasTests = false;
  let hasDocs = false;
  let compiler: 'gcc' | 'clang' | undefined;

  // Check for build system
  if (files.includes('CMakeLists.txt')) {
    type = 'cmake';
    
    // Read CMakeLists.txt to detect compiler
    const cmakeContent = fileAPI.readFileSync(
      path.join(projectPath, 'CMakeLists.txt'),
      'utf8'
    );
    
    if (cmakeContent.includes('CMAKE_CXX_COMPILER_ID:Clang')) {
      compiler = 'clang';
    } else if (cmakeContent.includes('CMAKE_CXX_COMPILER_ID:GNU')) {
      compiler = 'gcc';
    }
  } else if (files.includes("Makefile")) {
    type = 'make';
  }

  // Check for test directory
  hasTests = files.includes('tests') || 
             files.includes('test') || 
             files.includes('testing');

  // Check for documentation
  hasDocs = files.includes('docs') || 
            files.includes("documentation") ||
            files.includes("Doxyfile");

  return { type, hasTests, hasDocs, compiler };
}

/**
 * Validate Docker environment
 */
export async function validateEnvironment(): Promise<{
  dockerInstalled: boolean;
  dockerRunning: boolean;
  cmakeInstalled: boolean;
  version?: {
    docker?: string;
    cmake?: string;
  };
}> {
  const result = {
    dockerInstalled: false,
    dockerRunning: false,
    cmakeInstalled: false,
    version: {} as any,
  };

  // Check Docker
  try {
    const dockerVersion = await executeCommand('docker --version');
    result.dockerInstalled = true;
    result.version.docker = dockerVersion.trim();
    
    // Check if Docker daemon is running
    await executeCommand('docker ps');
    result.dockerRunning = true;
  } catch {
    // Docker not available
  }

  // Check CMake
  try {
    const cmakeVersion = await executeCommand('cmake --version');
    result.cmakeInstalled = true;
    result.version.cmake = cmakeVersion.split('\n')[0].trim();
  } catch {
    // CMake not available
  }

  return result;
}

/**
 * Execute a shell command
 */
function executeCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const { exec } = require('child_process');
    exec(command, (error: Error | null, stdout: string, stderr: string) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

/**
 * Get default build configuration for environment
 */
export function getEnvironmentConfig(environment: string): any {
  const configs: Record<string, any> = {
    local: {
      buildType: 'Debug',
      optimization: 'O0',
      debugSymbols: true,
      cache: true,
      verbose: true,
    },
    dev: {
      buildType: 'Debug',
      optimization: 'O0',
      debugSymbols: true,
      cache: true,
      verbose: false,
    },
    'dev-demo': {
      buildType: "RelWithDebInfo",
      optimization: 'O1',
      debugSymbols: true,
      cache: true,
      verbose: false,
    },
    demo: {
      buildType: 'Release',
      optimization: 'O2',
      debugSymbols: false,
      cache: false,
      verbose: false,
    },
    release: {
      buildType: 'Release',
      optimization: 'O3',
      debugSymbols: false,
      cache: false,
      verbose: false,
    },
  };

  return configs[environment] || configs.release;
}

/**
 * Create orchestrated build pipeline
 */
export function createPipeline(config: {
  projectPath: string;
  environment: 'local' | 'dev' | 'dev-demo' | 'demo' | 'release';
  steps?: any[];
}): BuildOrchestrator {
  const envConfig = getEnvironmentConfig(config.environment);
  
  const orchestrationConfig: OrchestrationConfig = {
    projectPath: config.projectPath,
    pipeline: {
      name: `${config.environment}-pipeline`,
      environment: config.environment,
      steps: config.steps || [],
    },
    dockerConfig: {
      cmake: {
        buildType: envConfig.buildType,
      },
      compiler: {
        type: 'gcc',
        optimization: envConfig.optimization,
        debugSymbols: envConfig.debugSymbols,
      },
    },
    cache: envConfig.cache,
  };

  return new BuildOrchestrator(orchestrationConfig);
}

/**
 * Clean build artifacts
 */
export async function cleanBuild(projectPath: string): Promise<void> {
  const buildDir = path.join(projectPath, 'build');
  
  if (fs.existsSync(buildDir)) {
    await fs.promises.rm(buildDir, { recursive: true, force: true });
  }

  // Clean Docker volumes
  const volumeManager = new VolumeManager({
    projectPath,
    mounts: [],
  });
  
  await volumeManager.cleanupAll();
}

export default {
  createBuilder,
  buildProject,
  mountVolume,
  generateDockerfile,
  generateCMakeLists,
  detectProjectType,
  validateEnvironment,
  getEnvironmentConfig,
  createPipeline,
  cleanBuild,
};