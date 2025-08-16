import { fs } from '../../infra_external-log-lib/src';
import { path } from '../../infra_external-log-lib/src';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface DockerfileConfig {
  baseImage: string;
  workDir?: string;
  ports?: number[];
  env?: Record<string, string>;
  copyFiles?: Array<{ from: string; to: string }>;
  runCommands?: string[];
  entrypoint?: string[];
  cmd?: string[];
  healthcheck?: {
    test: string;
    interval?: string;
    timeout?: string;
    startPeriod?: string;
    retries?: number;
  };
  user?: string;
  volumes?: string[];
  labels?: Record<string, string>;
}

export type ProjectType = 'nodejs' | 'cpp' | 'python' | 'java';
export type CppCompiler = 'gcc' | 'clang' | 'msvc';
export type CppBuildType = 'Debug' | 'Release' | 'RelWithDebInfo' | 'MinSizeRel';

export interface CppConfig {
  compiler: CppCompiler;
  version?: string;
  standard?: 'c++11' | 'c++14' | 'c++17' | 'c++20' | 'c++23';
  buildType: CppBuildType;
  cmake?: boolean;
  conan?: boolean;
  vcpkg?: boolean;
  staticLink?: boolean;
  enableTests?: boolean;
  enableCoverage?: boolean;
  enableSanitizers?: boolean;
}

export interface BuildOptions {
  tag: string;
  context?: string;
  dockerfile?: string;
  buildArgs?: Record<string, string>;
  noCache?: boolean;
  platform?: string;
  target?: string;
}

export class DockerBuilder {
  private templatesPath: string;

  constructor() {
    this.templatesPath = path.join(__dirname, '..', 'templates');
  }

  /**
   * Generate a Dockerfile from configuration
   */
  async generateDockerfile(config: DockerfileConfig): string {
    const lines: string[] = [];
    
    // Base image
    lines.push(`FROM ${config.baseImage}`);
    lines.push('');
    
    // Labels
    if(config.labels) {
      Object.entries(config.labels).forEach(([key, value]) => {
        lines.push(`LABEL ${key}="${value}"`);
      });
      lines.push('');
    }
    
    // User
    if(config.user) {
      lines.push(`USER ${config.user}`);
      lines.push('');
    }
    
    // Working directory
    if(config.workDir) {
      lines.push(`WORKDIR ${config.workDir}`);
      lines.push('');
    }
    
    // Environment variables
    if(config.env) {
      Object.entries(config.env).forEach(([key, value]) => {
        lines.push(`ENV ${key}=${value}`);
      });
      lines.push('');
    }
    
    // Copy files
    if(config.copyFiles) {
      config.copyFiles.forEach(({ from, to }) => {
        lines.push(`COPY ${from} ${to}`);
      });
      lines.push('');
    }
    
    // Run commands
    if(config.runCommands) {
      config.runCommands.forEach(cmd => {
        lines.push(`RUN ${cmd}`);
      });
      lines.push('');
    }
    
    // Volumes
    if(config.volumes && config.volumes.length > 0) {
      lines.push(`VOLUME ${JSON.stringify(config.volumes)}`);
      lines.push('');
    }
    
    // Expose ports
    if(config.ports && config.ports.length > 0) {
      lines.push(`EXPOSE ${config.ports.join(' ')}`);
      lines.push('');
    }
    
    // Healthcheck
    if(config.healthcheck) {
      const hc = config.healthcheck;
      let healthcheckCmd = `HEALTHCHECK`;
      if(hc.interval) healthcheckCmd += ` --interval=${hc.interval}`;
      if(hc.timeout) healthcheckCmd += ` --timeout=${hc.timeout}`;
      if(hc.startPeriod) healthcheckCmd += ` --start-period=${hc.startPeriod}`;
      if(hc.retries) healthcheckCmd += ` --retries=${hc.retries}`;
      healthcheckCmd += ` CMD ${hc.test}`;
      lines.push(healthcheckCmd);
      lines.push('');
    }
    
    // Entrypoint
    if(config.entrypoint) {
      lines.push(`ENTRYPOINT ${JSON.stringify(config.entrypoint)}`);
    }
    
    // CMD
    if(config.cmd) {
      lines.push(`CMD ${JSON.stringify(config.cmd)}`);
    }
    
    return lines.join('\n');
  }

  /**
   * Generate a C++ Dockerfile
   */
  async generateCppDockerfile(config: CppConfig & { themeName: string; production?: boolean }): string {
    const isProduction = config.production ?? true;
    const compiler = config.compiler || 'clang';
    const standard = config.standard || 'c++17';
    const buildType = config.buildType || 'Release';
    
    if(isProduction) {
      return this.generateCppMultiStageDockerfile(config);
    }
    
    // Development Dockerfile
    const lines: string[] = [];
    
    // Base image selection
    const baseImage = compiler === 'clang' ? 'ubuntu:22.04' : 'gcc:12';
    lines.push(`FROM ${baseImage}`);
    lines.push('');
    
    // Install build tools and dependencies
    lines.push('# Install build tools and dependencies');
    if(compiler === 'clang') {
      lines.push('RUN apt-get update && apt-get install -y \\');
      lines.push('    clang-15 \\');
      lines.push('    lldb-15 \\');
      lines.push('    lld-15 \\');
      lines.push('    clang-tools-15 \\');
      lines.push('    clang-format-15 \\');
      lines.push('    clang-tidy-15 \\');
      lines.push('    cmake \\');
      lines.push('    ninja-build \\');
      lines.push('    git \\');
      lines.push('    python3 \\');
      lines.push('    python3-pip \\');
      lines.push('    valgrind \\');
      lines.push('    gdb \\');
      lines.push('    && rm -rf /var/lib/apt/lists/*');
      lines.push('');
      lines.push('# Set clang as default compiler');
      lines.push('ENV CC=clang-15');
      lines.push('ENV CXX=clang++-15');
    } else {
      lines.push('RUN apt-get update && apt-get install -y \\');
      lines.push('    cmake \\');
      lines.push('    ninja-build \\');
      lines.push('    git \\');
      lines.push('    python3 \\');
      lines.push('    python3-pip \\');
      lines.push('    valgrind \\');
      lines.push('    gdb \\');
      lines.push('    && rm -rf /var/lib/apt/lists/*');
    }
    lines.push('');
    
    // Install Conan if requested
    if(config.conan) {
      lines.push('# Install Conan package manager');
      lines.push('RUN pip3 install conan');
      lines.push('');
    }
    
    // Install vcpkg if requested
    if(config.vcpkg) {
      lines.push('# Install vcpkg');
      lines.push('RUN git clone https://github.com/Microsoft/vcpkg.git /opt/vcpkg && \\');
      lines.push('    /opt/vcpkg/bootstrap-vcpkg.sh');
      lines.push('ENV VCPKG_ROOT=/opt/vcpkg');
      lines.push('ENV PATH="${VCPKG_ROOT}:${PATH}"');
      lines.push('');
    }
    
    lines.push('WORKDIR /app');
    lines.push('');
    
    // Copy project files
    lines.push('# Copy project files');
    lines.push('COPY CMakeLists.txt .');
    if(config.conan) {
      lines.push('COPY conanfile.txt* .');
    }
    lines.push('COPY cmake/ ./cmake/ 2>/dev/null || true');
    lines.push('COPY include/ ./include/');
    lines.push('COPY src/ ./src/');
    lines.push('COPY tests/ ./tests/ 2>/dev/null || true');
    lines.push('');
    
    // Configure and build
    lines.push('# Configure and build');
    lines.push('RUN mkdir -p build && cd build && \\');
    lines.push(`    cmake .. \\`);
    lines.push(`      -DCMAKE_BUILD_TYPE=${buildType} \\`);
    lines.push(`      -DCMAKE_CXX_STANDARD=${standard.substring(3)} \\`);
    lines.push('      -DCMAKE_EXPORT_COMPILE_COMMANDS=ON \\');
    if(config.enableTests) {
      lines.push('      -DENABLE_TESTING=ON \\');
    }
    if(config.enableCoverage) {
      lines.push('      -DENABLE_COVERAGE=ON \\');
    }
    lines.push('      -G Ninja && \\');
    lines.push('    ninja');
    lines.push('');
    
    // Expose debug port for GDB server
    lines.push('# Expose debug port');
    lines.push('EXPOSE 2345');
    lines.push('');
    
    // Set entrypoint for development
    lines.push('# Development entrypoint');
    lines.push('CMD ["./build/bin/app"]');
    
    return lines.join('\n');
  }

  /**
   * Generate multi-stage C++ Dockerfile for production
   */
  async private generateCppMultiStageDockerfile(config: CppConfig & { themeName: string }): string {
    const lines: string[] = [];
    const compiler = config.compiler || 'clang';
    const standard = config.standard || 'c++17';
    
    // Build stage
    lines.push('# Build stage');
    lines.push(`FROM ubuntu:22.04 AS builder`);
    lines.push('');
    
    lines.push('# Install build dependencies');
    lines.push('RUN apt-get update && apt-get install -y \\');
    if(compiler === 'clang') {
      lines.push('    clang-15 \\');
      lines.push('    lld-15 \\');
    } else {
      lines.push('    g++-12 \\');
    }
    lines.push('    cmake \\');
    lines.push('    ninja-build \\');
    lines.push('    git \\');
    if(config.conan) {
      lines.push('    python3-pip \\');
    }
    lines.push('    && rm -rf /var/lib/apt/lists/*');
    lines.push('');
    
    if(compiler === 'clang') {
      lines.push('ENV CC=clang-15 CXX=clang++-15');
    } else {
      lines.push('ENV CC=gcc-12 CXX=g++-12');
    }
    lines.push('');
    
    if(config.conan) {
      lines.push('RUN pip3 install conan');
      lines.push('');
    }
    
    lines.push('WORKDIR /build');
    lines.push('');
    
    // Copy and install dependencies
    lines.push('# Copy dependency files');
    lines.push('COPY CMakeLists.txt .');
    if(config.conan) {
      lines.push('COPY conanfile.txt* .');
      lines.push('RUN conan install . --build=missing');
    }
    lines.push('');
    
    // Copy source and build
    lines.push('# Copy source code');
    lines.push('COPY cmake/ ./cmake/ 2>/dev/null || true');
    lines.push('COPY include/ ./include/');
    lines.push('COPY src/ ./src/');
    lines.push('');
    
    lines.push('# Build application');
    lines.push('RUN cmake -B build \\');
    lines.push('    -DCMAKE_BUILD_TYPE=Release \\');
    lines.push(`    -DCMAKE_CXX_STANDARD=${standard.substring(3)} \\`);
    if(config.staticLink) {
      lines.push('    -DBUILD_SHARED_LIBS=OFF \\');
      lines.push('    -DCMAKE_EXE_LINKER_FLAGS="-static" \\');
    }
    lines.push('    -G Ninja && \\');
    lines.push('    cmake --build build --target all && \\');
    lines.push('    strip build/bin/app');
    lines.push('');
    
    // Runtime stage
    lines.push('# Runtime stage');
    if(config.staticLink) {
      lines.push('FROM scratch');
      lines.push('COPY --from=builder /build/build/bin/app /app');
      lines.push('ENTRYPOINT ["/app"]');
    } else {
      lines.push('FROM ubuntu:22.04-slim');
      lines.push('');
      lines.push('# Install runtime dependencies');
      lines.push('RUN apt-get update && apt-get install -y \\');
      lines.push('    libstdc++6 \\');
      lines.push('    && rm -rf /var/lib/apt/lists/*');
      lines.push('');
      lines.push('# Create non-root user');
      lines.push('RUN useradd -m -u 1000 appuser');
      lines.push('USER appuser');
      lines.push('');
      lines.push('WORKDIR /app');
      lines.push('COPY --from=builder --chown=appuser:appuser /build/build/bin/app .');
      lines.push('');
      lines.push('EXPOSE 8080');
      lines.push('ENTRYPOINT ["./app"]');
    }
    
    return lines.join('\n');
  }

  /**
   * Generate a multi-stage Dockerfile for Node.js applications
   */
  async generateNodeDockerfile(themeName: string, production: boolean = true): string {
    const config: DockerfileConfig = {
      baseImage: 'node:18-alpine',
      workDir: '/app',
      env: {
        NODE_ENV: production ? 'production' : 'development'
      },
      copyFiles: [
        { from: 'package*.json', to: './' }
      ],
      runCommands: [
        production ? 'npm ci --only=production' : 'npm ci'
      ],
      ports: [3000],
      cmd: ['npm', 'start']
    };

    if(production) {
      // Multi-stage build for production
      const lines: string[] = [];
      
      // Build stage
      lines.push('# Build stage');
      lines.push('FROM node:18-alpine AS builder');
      lines.push('WORKDIR /app');
      lines.push('COPY package*.json ./');
      lines.push('RUN npm ci');
      lines.push('COPY . .');
      lines.push('RUN npm run build');
      lines.push('');
      
      // Production stage
      lines.push('# Production stage');
      lines.push('FROM node:18-alpine');
      lines.push('WORKDIR /app');
      lines.push('ENV NODE_ENV=production');
      lines.push('COPY package*.json ./');
      lines.push('RUN npm ci --only=production && npm cache clean --force');
      lines.push('COPY --from=builder /app/dist ./dist');
      lines.push('COPY --from=builder /app/public ./public 2>/dev/null || true');
      lines.push('EXPOSE 3000');
      lines.push('USER node');
      lines.push('CMD ["npm", "start"]');
      
      return lines.join('\n');
    }
    
    return this.generateDockerfile(config);
  }

  /**
   * Build Docker image
   */
  async buildImage(options: BuildOptions): Promise<string> {
    const args: string[] = ['docker', 'build'];
    
    if(options.tag) {
      args.push('-t', options.tag);
    }
    
    if(options.dockerfile) {
      args.push('-f', options.dockerfile);
    }
    
    if(options.buildArgs) {
      Object.entries(options.buildArgs).forEach(([key, value]) => {
        args.push('--build-arg', `${key}=${value}`);
      });
    }
    
    if(options.noCache) {
      args.push('--no-cache');
    }
    
    if(options.platform) {
      args.push('--platform', options.platform);
    }
    
    if(options.target) {
      args.push('--target', options.target);
    }
    
    args.push(options.context || '.');
    
    const command = args.join(' ');
    const { stdout, stderr } = await execAsync(command);
    
    if(stderr && !stderr.includes('Successfully')) {
      throw new Error(`Docker build failed: ${stderr}`);
    }
    
    return stdout;
  }

  /**
   * Check if Docker is available
   */
  async isDockerAvailable(): Promise<boolean> {
    try {
      await execAsync('docker --version');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get Docker version
   */
  async getDockerVersion(): Promise<string> {
    try {
      const { stdout } = await execAsync('docker --version');
      return stdout.trim();
    } catch (error) {
      throw new Error('Docker is not installed or not accessible');
    }
  }

  /**
   * Save Dockerfile to file
   */
  async saveDockerfile(content: string, filepath: string): Promise<void> {
    await fileAPI.createFile(filepath, content, { type: FileType.TEMPORARY });
  }

  /**
   * Load Dockerfile template
   */
  async loadTemplate(templateName: string): Promise<string> {
    const templatePath = path.join(this.templatesPath, `${templateName}.dockerfile`);
    return await fs.promises.readFile(templatePath, 'utf8');
  }

  /**
   * Detect project type from theme directory
   */
  async detectProjectType(themePath: string): Promise<ProjectType> {
    // Check for C++ indicators
    if(fs.existsSync(path.join(themePath, 'CMakeLists.txt')) ||
        fs.existsSync(path.join(themePath, 'Makefile')) ||
        fs.existsSync(path.join(themePath, 'src', 'main.cpp')) ||
        fs.existsSync(path.join(themePath, 'src', 'main.cc'))) {
      return 'cpp';
    }
    
    // Check for Node.js indicators
    if(fs.existsSync(path.join(themePath, 'package.json'))) {
      return 'nodejs';
    }
    
    // Check for Python indicators
    if(fs.existsSync(path.join(themePath, 'requirements.txt')) ||
        fs.existsSync(path.join(themePath, 'setup.py')) ||
        fs.existsSync(path.join(themePath, 'pyproject.toml'))) {
      return 'python';
    }
    
    // Check for Java indicators
    if(fs.existsSync(path.join(themePath, 'pom.xml')) ||
        fs.existsSync(path.join(themePath, 'build.gradle'))) {
      return 'java';
    }
    
    // Default to Node.js
    return 'nodejs';
  }

  /**
   * Generate appropriate Dockerfile based on project type
   */
  async generateAutoDockerfile(themePath: string, production: boolean = true): Promise<string> {
    const projectType = await this.detectProjectType(themePath);
    const themeName = path.basename(themePath);
    
    switch (projectType) {
      case 'cpp':
        // Detect C++ configuration from CMakeLists.txt or other indicators
        const cppConfig: CppConfig & { themeName: string; production?: boolean } = {
          themeName,
          production,
          compiler: 'clang',
          standard: 'c++17',
          buildType: production ? 'Release' : 'Debug',
          cmake: fs.existsSync(path.join(themePath, 'CMakeLists.txt')),
          conan: fs.existsSync(path.join(themePath, 'conanfile.txt')),
          vcpkg: fs.existsSync(path.join(themePath, 'vcpkg.json')),
          enableTests: !production,
          enableCoverage: !production,
          staticLink: production
        };
        return this.generateCppDockerfile(cppConfig);
        
      case 'nodejs':
        return this.generateNodeDockerfile(themeName, production);
        
      default:
        // For Python and Java, generate basic Dockerfile
        return this.generateNodeDockerfile(themeName, production);
    }
  }
}