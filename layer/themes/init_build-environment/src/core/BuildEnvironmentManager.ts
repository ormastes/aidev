import { EventEmitter } from '../../../infra_external-log-lib/src';
import * as fs from 'fs/promises';
import { path } from '../../../infra_external-log-lib/src';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface BuildEnvironment {
  name: string;
  type: 'local' | 'container' | 'qemu';
  architecture: Architecture;
  compiler: CompilerConfig;
  cpu: CPUConfig;
  target: TargetConfig;
  dependencies: DependencyConfig[];
  environment: EnvironmentVariables;
  volumes?: VolumeMount[];
  network?: NetworkConfig;
}

export interface Architecture {
  arch: 'x86_64' | 'aarch64' | 'arm' | 'riscv64' | 'mips' | 'ppc64le';
  bits: 32 | 64;
  endianness: 'little' | 'big';
  abi?: string;
}

export interface CompilerConfig {
  type: 'gcc' | 'clang' | 'msvc' | 'icc' | 'cross';
  version: string;
  path?: string;
  cCompiler: string;
  cppCompiler: string;
  linker?: string;
  archiver?: string;
  flags: CompilerFlags;
  crossCompile?: CrossCompileConfig;
}

export interface CompilerFlags {
  common: string[];
  debug: string[];
  release: string[];
  optimization: string[];
  warnings: string[];
  includes: string[];
  defines: string[];
  linkFlags: string[];
}

export interface CrossCompileConfig {
  prefix: string;
  sysroot: string;
  targetTriple: string;
  hostTriple: string;
}

export interface CPUConfig {
  cores: number;
  threadsPerCore: number;
  model?: string;
  features?: string[];
  cache?: {
    l1: number;
    l2: number;
    l3?: number;
  };
  frequency?: number;
}

export interface TargetConfig {
  os: 'linux' | 'windows' | 'macos' | 'freebsd' | 'android' | 'ios' | 'bare-metal';
  variant?: string;
  sdk?: string;
  minVersion?: string;
  maxVersion?: string;
  runtime?: 'glibc' | 'musl' | 'bionic' | 'msvcrt' | 'none';
}

export interface DependencyConfig {
  name: string;
  version: string;
  type: 'system' | 'source' | 'binary' | 'header-only';
  location?: string;
  buildCommand?: string;
  configureFlags?: string[];
  environment?: EnvironmentVariables;
}

export interface EnvironmentVariables {
  [key: string]: string | undefined;
}

export interface VolumeMount {
  source: string;
  target: string;
  readOnly?: boolean;
  type?: 'bind' | 'volume' | 'tmpfs';
}

export interface NetworkConfig {
  type: 'bridge' | 'host' | 'none' | 'custom';
  ports?: PortMapping[];
  dns?: string[];
}

export interface PortMapping {
  host: number;
  container: number;
  protocol?: 'tcp' | 'udp';
}

export class BuildEnvironmentManager extends EventEmitter {
  private environments: Map<string, BuildEnvironment>;
  private activeEnvironment?: BuildEnvironment;
  private readonly configPath: string;
  private readonly cachePath: string;

  constructor(config: {
    configPath?: string;
    cachePath?: string;
  } = {}) {
    async super();
    this.environments = new Map();
    this.configPath = config.configPath || path.join(process.cwd(), '.build-env');
    this.cachePath = config.cachePath || path.join(process.cwd(), '.build-cache');
  }

  async initialize(): Promise<void> {
    this.emit('init:start');

    // Create directories
    await fileAPI.createDirectory(this.configPath);
    await fileAPI.createDirectory(this.cachePath);

    // Load saved environments
    await this.loadEnvironments();

    // Detect system capabilities
    const systemInfo = await this.detectSystemCapabilities();
    this.emit('init:system', systemInfo);

    this.emit('init:complete');
  }

  async createEnvironment(config: BuildEnvironment): Promise<void> {
    this.emit('environment:create:start', { name: config.name });

    // Validate configuration
    this.validateEnvironmentConfig(config);

    // Check dependencies
    await this.checkDependencies(config);

    // Store environment
    this.environments.set(config.name, config);

    // Save to disk
    await this.saveEnvironment(config);

    this.emit('environment:create:complete', { name: config.name });
  }

  async loadEnvironment(name: string): Promise<BuildEnvironment> {
    if(this.environments.has(name)) {
      return this.environments.get(name)!;
    }

    const configFile = path.join(this.configPath, `${name}.json`);
    
    try {
      const content = await fs.readFile(configFile, 'utf-8');
      const environment = JSON.parse(content) as BuildEnvironment;
      this.environments.set(name, environment);
      return environment;
    } catch (error) {
      throw new Error(`Failed to load environment '${name}': ${error}`);
    }
  }

  async activateEnvironment(name: string): Promise<void> {
    this.emit('environment:activate:start', { name });

    const environment = await this.loadEnvironment(name);

    // Set up environment variables
    await this.setupEnvironmentVariables(environment);

    // Configure compiler
    await this.configureCompiler(environment);

    // Set up dependencies
    await this.setupDependencies(environment);

    this.activeEnvironment = environment;

    this.emit('environment:activate:complete', { name });
  }

  async buildProject(
    projectPath: string,
    environment?: string,
    options: BuildOptions = {}
  ): Promise<BuildResult> {
    this.emit('build:start', { projectPath, environment });

    // Use specified environment or active one
    const env = environment ? 
      await this.loadEnvironment(environment) : 
      this.activeEnvironment;

    if(!env) {
      throw new Error('No environment specified or activated');
    }

    // Prepare build based on environment type
    let result: BuildResult;

    switch(env.type) {
      case 'local':
        result = await this.buildLocal(projectPath, env, options);
        break;
      case 'container':
        result = await this.buildInContainer(projectPath, env, options);
        break;
      case 'qemu':
        result = await this.buildInQEMU(projectPath, env, options);
        break;
      default:
        throw new Error(`Unknown environment type: ${env.type}`);
    }

    this.emit('build:complete', result);
    return result;
  }

  private async buildLocal(
    projectPath: string,
    environment: BuildEnvironment,
    options: BuildOptions
  ): Promise<BuildResult> {
    const startTime = Date.now();
    const buildDir = path.join(projectPath, options.buildDir || 'build');

    // Create build directory
    await fileAPI.createDirectory(buildDir);

    // Generate build commands
    const commands = this.generateBuildCommands(environment, projectPath, options);

    // Execute build
    const outputs: string[] = [];
    const errors: string[] = [];

    for(const command of commands) {
      try {
        const { stdout, stderr } = await execAsync(command, {
          cwd: buildDir,
          env: { ...process.env, ...environment.environment }
        });
        outputs.push(stdout);
        if(stderr) errors.push(stderr);
      } catch (error: any) {
        errors.push(error.message);
        if(!options.continueOnError) {
          throw error;
        }
      }
    }

    return {
      success: errors.length === 0,
      duration: Date.now() - startTime,
      outputs,
      errors,
      artifacts: await this.collectArtifacts(buildDir, options.artifacts)
    };
  }

  private async buildInContainer(
    projectPath: string,
    environment: BuildEnvironment,
    options: BuildOptions
  ): Promise<BuildResult> {
    const startTime = Date.now();

    // Generate Dockerfile if needed
    const dockerfile = await this.generateDockerfile(environment);
    const dockerfilePath = path.join(this.cachePath, `Dockerfile.${environment.name}`);
    await fileAPI.createFile(dockerfilePath, dockerfile);

    // Build container image
    const imageName = `build-env-${environment.name}:latest`;
    await this.buildDockerImage(dockerfilePath, { type: FileType.TEMPORARY });

    // Run build in container
    const volumes = [
      `${projectPath}:/workspace`,
      ...(environment.volumes || []).map(v => `${v.source}:${v.target}`)
    ];

    const dockerCommand = [
      'docker', 'run', '--rm',
      ...volumes.map(v => ['-v', v]).flat(),
      ...this.generateDockerEnvFlags(environment.environment),
      imageName,
      'bash', '-c', this.generateBuildScript(environment, options)
    ];

    const result = await this.executeCommand(dockerCommand);

    return {
      success: result.code === 0,
      duration: Date.now() - startTime,
      outputs: [result.stdout],
      errors: result.stderr ? [result.stderr] : [],
      artifacts: []
    };
  }

  private async buildInQEMU(
    projectPath: string,
    environment: BuildEnvironment,
    options: BuildOptions
  ): Promise<BuildResult> {
    const startTime = Date.now();

    // Set up QEMU environment
    const qemuConfig = await this.generateQEMUConfig(environment);
    const qemuImage = await this.prepareQEMUImage(environment);

    // Start QEMU instance
    const qemuProcess = await this.startQEMU(qemuImage, qemuConfig);

    try {
      // Copy project files to QEMU
      await this.copyToQEMU(projectPath, '/build', qemuProcess);

      // Execute build commands
      const commands = this.generateBuildCommands(environment, '/build', options);
      const results = await this.executeInQEMU(commands, qemuProcess);

      // Copy artifacts back
      const artifacts = await this.copyFromQEMU('/build/output', projectPath, qemuProcess);

      return {
        success: results.every(r => r.code === 0),
        duration: Date.now() - startTime,
        outputs: results.map(r => r.stdout),
        errors: results.filter(r => r.stderr).map(r => r.stderr),
        artifacts
      };
    } finally {
      // Stop QEMU instance
      await this.stopQEMU(qemuProcess);
    }
  }

  async private generateBuildCommands(
    environment: BuildEnvironment,
    projectPath: string,
    options: BuildOptions
  ): string[] {
    const commands: string[] = [];
    const compiler = environment.compiler;

    // Configure step
    if(options.configure) {
      const configureCmd = this.generateConfigureCommand(environment, projectPath, options);
      commands.push(configureCmd);
    }

    // Build step
    const buildCmd = this.generateCompileCommand(environment, projectPath, options);
    commands.push(buildCmd);

    // Test step
    if(options.runTests) {
      commands.push(this.generateTestCommand(environment, options));
    }

    // Package step
    if(options.package) {
      commands.push(this.generatePackageCommand(environment, options));
    }

    return commands;
  }

  async private generateConfigureCommand(
    environment: BuildEnvironment,
    projectPath: string,
    options: BuildOptions
  ): string {
    const compiler = environment.compiler;
    
    if(options.buildSystem === 'cmake') {
      return `cmake -S ${projectPath} -B . \
        -DCMAKE_C_COMPILER=${compiler.cCompiler} \
        -DCMAKE_CXX_COMPILER=${compiler.cppCompiler} \
        -DCMAKE_BUILD_TYPE=${options.buildType || 'Release'} \
        ${compiler.flags.defines.map(d => `-D${d}`).join(' ')}`;
    } else if (options.buildSystem === 'autotools') {
      return `${projectPath}/configure \
        CC=${compiler.cCompiler} \
        CXX=${compiler.cppCompiler} \
        CFLAGS="${compiler.flags.common.join(' ')}" \
        CXXFLAGS="${compiler.flags.common.join(' ')}" \
        ${options.configureFlags?.join(' ') || ''}`;
    } else {
      // Makefile-based
      return `make -C ${projectPath} config \
        CC=${compiler.cCompiler} \
        CXX=${compiler.cppCompiler}`;
    }
  }

  async private generateCompileCommand(
    environment: BuildEnvironment,
    projectPath: string,
    options: BuildOptions
  ): string {
    const compiler = environment.compiler;
    const cores = environment.cpu.cores * environment.cpu.threadsPerCore;

    if(options.buildSystem === 'cmake') {
      return `cmake --build . --parallel ${cores} --config ${options.buildType || 'Release'}`;
    } else if (options.buildSystem === 'ninja') {
      return `ninja -j ${cores}`;
    } else {
      // Makefile-based
      return `make -j${cores} \
        CC=${compiler.cCompiler} \
        CXX=${compiler.cppCompiler} \
        CFLAGS="${compiler.flags.common.join(' ')}" \
        CXXFLAGS="${compiler.flags.common.join(' ')}"`;
    }
  }

  async private generateTestCommand(environment: BuildEnvironment, options: BuildOptions): string {
    if(options.buildSystem === 'cmake') {
      return 'ctest --parallel';
    } else {
      return 'make test';
    }
  }

  async private generatePackageCommand(environment: BuildEnvironment, options: BuildOptions): string {
    if(options.buildSystem === 'cmake') {
      return 'cpack';
    } else {
      return 'make package';
    }
  }

  private async generateDockerfile(environment: BuildEnvironment): Promise<string> {
    const baseImage = this.getBaseImage(environment);
    const packages = await this.getRequiredPackages(environment);

    return `FROM ${baseImage}

# Install build tools and dependencies
RUN apt-get update && apt-get install -y \\
    ${packages.join(' \\\n    ')} \\
    && rm -rf /var/lib/apt/lists/*

# Set up compiler
ENV CC=${environment.compiler.cCompiler}
ENV CXX=${environment.compiler.cppCompiler}
${environment.compiler.crossCompile ? `
ENV CROSS_COMPILE=${environment.compiler.crossCompile.prefix}
ENV SYSROOT=${environment.compiler.crossCompile.sysroot}
` : ''}

# Set up environment variables
${Object.entries(environment.environment)
  .map(([key, value]) => `ENV ${key}=${value}`)
  .join('\n')}

# Install dependencies
${environment.dependencies.map(dep => this.generateDependencyInstall(dep)).join('\n')}

WORKDIR /workspace
`;
  }

  async private getBaseImage(environment: BuildEnvironment): string {
    const archMap: Record<string, string> = {
      'x86_64': 'amd64',
      'aarch64': 'arm64',
      'arm': 'arm32v7',
      'riscv64': 'riscv64',
      'ppc64le': 'ppc64le'
    };

    const arch = archMap[environment.architecture.arch] || 'amd64';
    
    switch(environment.target.os) {
      case 'linux':
        return `${arch}/ubuntu:22.04`;
      case 'windows':
        return 'mcr.microsoft.com/windows/servercore:ltsc2022';
      default:
        return 'ubuntu:22.04';
    }
  }

  private async getRequiredPackages(environment: BuildEnvironment): Promise<string[]> {
    const packages = [
      'build-essential',
      'cmake',
      'ninja-build',
      'git',
      'wget',
      'curl'
    ];

    // Add compiler-specific packages
    if(environment.compiler.type === 'gcc') {
      packages.push(`gcc-${environment.compiler.version}`);
      packages.push(`g++-${environment.compiler.version}`);
    } else if (environment.compiler.type === 'clang') {
      packages.push(`clang-${environment.compiler.version}`);
    }

    // Add cross-compilation tools if needed
    if(environment.compiler.crossCompile) {
      packages.push('crossbuild-essential-' + environment.architecture.arch);
    }

    // Add architecture-specific tools
    if(environment.architecture.arch !== 'x86_64') {
      packages.push('qemu-user-static');
    }

    return packages;
  }

  async private generateDependencyInstall(dep: DependencyConfig): string {
    switch(dep.type) {
      case 'system':
        return `RUN apt-get install -y ${dep.name}`;
      case 'source':
        return `RUN git clone ${dep.location} /tmp/${dep.name} && \\
    cd /tmp/${dep.name} && \\
    ${dep.buildCommand || 'make && make install'}`;
      case 'binary':
        return `RUN wget ${dep.location} -O /tmp/${dep.name}.tar.gz && \\
    tar -xzf /tmp/${dep.name}.tar.gz -C /usr/local`;
      default:
        return '';
    }
  }

  private async generateQEMUConfig(environment: BuildEnvironment): Promise<any> {
    return {
      system: this.getQEMUSystem(environment.architecture.arch),
      cpu: environment.cpu.model || 'max',
      memory: '2G',
      cores: environment.cpu.cores,
      threads: environment.cpu.threadsPerCore,
      network: environment.network?.type || 'user',
      drives: [{
        file: 'system.qcow2',
        format: 'qcow2',
        interface: 'virtio'
      }],
      mounts: environment.volumes?.map(v => ({
        source: v.source,
        target: v.target,
        readonly: v.readOnly
      }))
    };
  }

  async private getQEMUSystem(arch: string): string {
    const systemMap: Record<string, string> = {
      'x86_64': 'qemu-system-x86_64',
      'aarch64': 'qemu-system-aarch64',
      'arm': 'qemu-system-arm',
      'riscv64': 'qemu-system-riscv64',
      'mips': 'qemu-system-mips64',
      'ppc64le': 'qemu-system-ppc64'
    };
    return systemMap[arch] || 'qemu-system-x86_64';
  }

  async private generateBuildScript(environment: BuildEnvironment, options: BuildOptions): string {
    const commands = this.generateBuildCommands(environment, '/workspace', options);
    return commands.join(' && ');
  }

  async private generateDockerEnvFlags(env: EnvironmentVariables): string[] {
    return Object.entries(env)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => ['-e', `${key}=${value}`])
      .flat();
  }

  async private validateEnvironmentConfig(config: BuildEnvironment): void {
    if(!config.name) {
      throw new Error('Environment name is required');
    }

    if(!config.architecture?.arch) {
      throw new Error('Architecture is required');
    }

    if(!config.compiler?.cCompiler || !config.compiler?.cppCompiler) {
      throw new Error('Compiler configuration is required');
    }

    if(!config.target?.os) {
      throw new Error('Target OS is required');
    }
  }

  private async checkDependencies(config: BuildEnvironment): Promise<void> {
    for(const dep of config.dependencies) {
      this.emit('dependency:check', { name: dep.name });
      
      // Check if dependency is available
      const available = await this.isDependencyAvailable(dep);
      if(!available && dep.type === 'system') {
        throw new Error(`Required dependency '${dep.name}' is not available`);
      }
    }
  }

  private async isDependencyAvailable(dep: DependencyConfig): Promise<boolean> {
    try {
      if(dep.type === 'system') {
        await execAsync(`which ${dep.name}`);
        return true;
      }
      return true;
    } catch {
      return false;
    }
  }

  private async setupEnvironmentVariables(environment: BuildEnvironment): Promise<void> {
    for(const [key, value] of Object.entries(environment.environment)) {
      if(value !== undefined) {
        process.env[key] = value;
      }
    }
  }

  private async configureCompiler(environment: BuildEnvironment): Promise<void> {
    const compiler = environment.compiler;

    // Set compiler environment variables
    process.env.CC = compiler.cCompiler;
    process.env.CXX = compiler.cppCompiler;

    if(compiler.linker) {
      process.env.LD = compiler.linker;
    }

    if(compiler.archiver) {
      process.env.AR = compiler.archiver;
    }

    // Set compiler flags
    process.env.CFLAGS = compiler.flags.common.join(' ');
    process.env.CXXFLAGS = compiler.flags.common.join(' ');
    process.env.LDFLAGS = compiler.flags.linkFlags.join(' ');
  }

  private async setupDependencies(environment: BuildEnvironment): Promise<void> {
    for(const dep of environment.dependencies) {
      this.emit('dependency:setup', { name: dep.name });
      
      if(dep.environment) {
        for(const [key, value] of Object.entries(dep.environment)) {
          if(value !== undefined) {
            process.env[key] = value;
          }
        }
      }
    }
  }

  private async loadEnvironments(): Promise<void> {
    try {
      const files = await fs.readdir(this.configPath);
      
      for(const file of files) {
        if(file.endsWith('.json')) {
          const name = path.basename(file, '.json');
          await this.loadEnvironment(name);
        }
      }
    } catch (error) {
      // Directory doesn't exist yet
      console.debug('No saved environments found');
    }
  }

  private async saveEnvironment(environment: BuildEnvironment): Promise<void> {
    const configFile = path.join(this.configPath, `${environment.name}.json`);
    await fileAPI.createFile(configFile, JSON.stringify(environment, { type: FileType.TEMPORARY }));
  }

  private async detectSystemCapabilities(): Promise<any> {
    const cpuInfo = await this.getCPUInfo();
    const memoryInfo = await this.getMemoryInfo();
    const compilers = await this.detectCompilers();

    return {
      cpu: cpuInfo,
      memory: memoryInfo,
      compilers
    };
  }

  private async getCPUInfo(): Promise<any> {
    try {
      const { stdout } = await execAsync('lscpu');
      // Parse lscpu output
      return {
        cores: parseInt(stdout.match(/CPU\(s\):\s+(\d+)/)?.[1] || '1'),
        architecture: stdout.match(/Architecture:\s+(\S+)/)?.[1] || 'unknown'
      };
    } catch {
      return { cores: 1, architecture: 'unknown' };
    }
  }

  private async getMemoryInfo(): Promise<any> {
    try {
      const { stdout } = await execAsync('free -b');
      const match = stdout.match(/Mem:\s+(\d+)/);
      return {
        total: parseInt(match?.[1] || '0')
      };
    } catch {
      return { total: 0 };
    }
  }

  private async detectCompilers(): Promise<any[]> {
    const compilers = [];
    
    // Check for GCC
    try {
      const { stdout } = await execAsync('gcc --version');
      const version = stdout.match(/gcc.*?(\d+\.\d+\.\d+)/)?.[1];
      compilers.push({ type: 'gcc', version, path: 'gcc' });
    } catch {}

    // Check for Clang
    try {
      const { stdout } = await execAsync('clang --version');
      const version = stdout.match(/clang version (\d+\.\d+\.\d+)/)?.[1];
      compilers.push({ type: 'clang', version, path: 'clang' });
    } catch {}

    return compilers;
  }

  private async buildDockerImage(dockerfilePath: string, imageName: string): Promise<void> {
    const { stdout, stderr } = await execAsync(
      `docker build -f ${dockerfilePath} -t ${imageName} ${path.dirname(dockerfilePath)}`
    );
    
    if(stderr && !stderr.includes('Successfully built')) {
      throw new Error(`Docker build failed: ${stderr}`);
    }
  }

  private async executeCommand(command: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command[0], command.slice(1));
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        async resolve({ code, stdout, stderr });
      });

      proc.on('error', (error) => {
        async reject(error);
      });
    });
  }

  private async prepareQEMUImage(environment: BuildEnvironment): Promise<string> {
    // This would prepare a QEMU disk image with the necessary OS and tools
    const imagePath = path.join(this.cachePath, `${environment.name}.qcow2`);
    
    // Check if image already exists
    try {
      await fs.access(imagePath);
      return imagePath;
    } catch {
      // Create new image
      await execAsync(`qemu-img create -f qcow2 ${imagePath} 10G`);
      return imagePath;
    }
  }

  private async startQEMU(imagePath: string, config: any): Promise<any> {
    // Start QEMU with the specified configuration
    // This is a simplified version - real implementation would be more complex
    return { pid: 12345, ssh: { host: 'localhost', port: 2222 } };
  }

  private async stopQEMU(process: any): Promise<void> {
    // Stop the QEMU process
    // This is a simplified version
  }

  private async copyToQEMU(source: string, dest: string, process: any): Promise<void> {
    // Copy files to QEMU instance via SSH or 9p
    // This is a simplified version
  }

  private async copyFromQEMU(source: string, dest: string, process: any): Promise<string[]> {
    // Copy files from QEMU instance
    // This is a simplified version
    return [];
  }

  private async executeInQEMU(commands: string[], process: any): Promise<any[]> {
    // Execute commands in QEMU instance via SSH
    // This is a simplified version
    return commands.map(() => ({ code: 0, stdout: '', stderr: '' }));
  }

  private async collectArtifacts(buildDir: string, patterns?: string[]): Promise<string[]> {
    const artifacts: string[] = [];
    
    if(!patterns || patterns.length === 0) {
      patterns = ['**/*.exe', '**/*.so', '**/*.a', '**/*.dll'];
    }

    // Find matching files
    for(const pattern of patterns) {
      // Simplified glob matching
      const files = await this.findFiles(buildDir, pattern);
      artifacts.push(...files);
    }

    return artifacts;
  }

  private async findFiles(dir: string, pattern: string): Promise<string[]> {
    // Simplified file finding
    return [];
  }

  async getEnvironments(): string[] {
    return Array.from(this.environments.keys());
  }

  async getActiveEnvironment(): BuildEnvironment | undefined {
    return this.activeEnvironment;
  }

  async exportEnvironment(name: string, outputPath: string): Promise<void> {
    const environment = await this.loadEnvironment(name);
    await fileAPI.createFile(outputPath, JSON.stringify(environment, { type: FileType.TEMPORARY }));
  }

  async importEnvironment(inputPath: string, name?: string): Promise<void> {
    const content = await fs.readFile(inputPath, 'utf-8');
    const environment = JSON.parse(content) as BuildEnvironment;
    
    if(name) {
      environment.name = name;
    }

    await this.createEnvironment(environment);
  }
}

export interface BuildOptions {
  buildSystem?: 'cmake' | 'make' | 'ninja' | 'autotools';
  buildType?: 'Debug' | 'Release' | 'RelWithDebInfo' | 'MinSizeRel';
  buildDir?: string;
  configure?: boolean;
  configureFlags?: string[];
  runTests?: boolean;
  package?: boolean;
  artifacts?: string[];
  continueOnError?: boolean;
}

export interface BuildResult {
  success: boolean;
  duration: number;
  outputs: string[];
  errors: string[];
  artifacts: string[];
}