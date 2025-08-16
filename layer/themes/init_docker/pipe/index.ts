/**
 * Docker CMake Build - Main Export
 * Gateway for Docker-based CMake building with volume mounting
 */

// Builder components
export { DockerCMakeBuilder } from '../children/builder';
export type { 
  BuildConfig,
  BuildOptions,
  BuildResult,
  BuildStage,
  CompilerConfig,
  CMakeOptions 
} from '../children/builder';

// Volume management
export { VolumeManager } from '../children/volume';
export type { 
  VolumeConfig,
  MountPoint,
  VolumeType,
  CacheStrategy,
  VolumePermissions 
} from '../children/volume';

// Build orchestration
export { BuildOrchestrator } from '../children/orchestrator';
export type { 
  OrchestrationConfig,
  BuildPipeline,
  BuildStep,
  BuildEnvironment,
  BuildArtifact 
} from '../children/orchestrator';

// Template management
export { TemplateManager } from '../children/templates';
export type { 
  DockerfileTemplate,
  CMakeTemplate,
  ComposeTemplate,
  TemplateVariables 
} from '../children/templates';

// Utilities
export {
  createBuilder,
  buildProject,
  mountVolume,
  generateDockerfile,
  generateCMakeLists,
  detectProjectType,
  validateEnvironment
} from '../utils';

// Constants
export const BUILD_STAGES = {
  DEPS: "dependencies",
  CONFIGURE: "configure",
  BUILD: 'build',
  TEST: 'test',
  PACKAGE: 'package',
} as const;

export const COMPILERS = {
  GCC: 'gcc',
  CLANG: 'clang',
  MSVC: 'msvc',
} as const;

export const BUILD_TYPES = {
  DEBUG: 'Debug',
  RELEASE: 'Release',
  RELWITHDEBINFO: "RelWithDebInfo",
  MINSIZEREL: "MinSizeRel",
} as const;

export const DEFAULT_PATHS = {
  WORKSPACE: '/workspace',
  BUILD_DIR: '/workspace/build',
  CACHE_DIR: '/workspace/.cmake-cache',
  INSTALL_DIR: '/workspace/install',
} as const;

// Version
export const VERSION = '1.0.0';

// Default export
const DockerCMakeBuild = {
  DockerCMakeBuilder,
  VolumeManager,
  BuildOrchestrator,
  TemplateManager,
  BUILD_STAGES,
  COMPILERS,
  BUILD_TYPES,
  DEFAULT_PATHS,
  VERSION,
};

export default DockerCMakeBuild;