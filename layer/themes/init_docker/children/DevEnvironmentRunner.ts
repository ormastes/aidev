import { path } from '../../infra_external-log-lib/src';
import { fs } from '../../infra_external-log-lib/src';
import { spawn, ChildProcess } from 'child_process';
import { ContainerRunner } from './ContainerRunner';
import { DockerBuilder } from './DockerBuilder';
import { FolderMountManager } from './FolderMountManager';

export interface DevConfig {
  themeName: string;
  port?: number;
  debugPort?: number;
  watchMode?: boolean;
  hotReload?: boolean;
  env?: Record<string, string>;
  command?: string;
  volumes?: string[];
  projectType?: 'nodejs' | 'cpp' | 'python' | 'java';
  cppConfig?: {
    compiler?: 'gcc' | 'clang';
    buildType?: 'Debug' | 'Release';
    enableGdb?: boolean;
    enableValgrind?: boolean;
    enableSanitizers?: boolean;
  };
}

export interface DevSession {
  id: string;
  themeName: string;
  containerId?: string;
  process?: ChildProcess;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  startTime: Date;
  port: number;
  debugPort?: number;
  logs: string[];
}

export class DevEnvironmentRunner {
  private containerRunner: ContainerRunner;
  private dockerBuilder: DockerBuilder;
  private folderManager: FolderMountManager;
  private sessions: Map<string, DevSession>;
  private watchers: Map<string, fs.FSWatcher>;
  private baseDir: string;

  constructor(baseDir?: string) {
    this.containerRunner = new ContainerRunner();
    this.dockerBuilder = new DockerBuilder();
    this.folderManager = new FolderMountManager(baseDir);
    this.sessions = new Map();
    this.watchers = new Map();
    this.baseDir = baseDir || process.cwd();
  }

  /**
   * Start local development environment
   */
  async startDev(config: DevConfig): Promise<DevSession> {
    const sessionId = `dev-${config.themeName}-${Date.now()}`;
    const session: DevSession = {
      id: sessionId,
      themeName: config.themeName,
      status: 'starting',
      startTime: new Date(),
      port: config.port || 3000,
      debugPort: config.debugPort || 9229,
      logs: []
    };

    this.sessions.set(sessionId, session);

    try {
      console.log(`🚀 Starting development environment for ${config.themeName}...`);

      // Validate folder structure
      const validation = await this.folderManager.validateFolderStructure(config.themeName);
      if (!validation.valid) {
        throw new Error(`Invalid folder structure: Missing ${validation.missing.join(', ')}`);
      }

      if (validation.warnings.length > 0) {
        validation.warnings.forEach(w => console.warn(`⚠️  ${w}`));
      }

      // Prepare folders
      await this.folderManager.prepareFolders(config.themeName, 'local');

      // Generate development Dockerfile
      const dockerfile = this.generateDevDockerfile(config);
      const dockerfilePath = path.join(
        this.baseDir,
        'layer',
        'themes',
        config.themeName,
        'Dockerfile.dev'
      );
      await this.dockerBuilder.saveDockerfile(dockerfile, dockerfilePath);

      // Build development image
      console.log('🔨 Building development image...');
      await this.dockerBuilder.buildImage({
        tag: `aidev/${config.themeName}:dev`,
        context: path.join(this.baseDir, 'layer', 'themes', config.themeName),
        dockerfile: dockerfilePath,
        buildArgs: {
          NODE_ENV: 'development'
        }
      });

      // Get mount configuration
      const mounts = this.folderManager.createEnvironmentMounts('local', config.themeName);
      const mountStrings = this.folderManager.generateDockerMountStrings(mounts);

      // Start container with hot reload
      console.log('🐳 Starting container...');
      const containerId = await this.containerRunner.run(`aidev/${config.themeName}:dev`, {
        name: `${config.themeName}-dev`,
        detach: true,
        ports: [
          `${session.port}:3000`,
          `${session.debugPort}:9229`
        ],
        volumes: [...mountStrings, ...(config.volumes || [])],
        env: {
          NODE_ENV: 'development',
          PORT: '3000',
          DEBUG: '*',
          WATCH_MODE: config.watchMode ? 'true' : 'false',
          HOT_RELOAD: config.hotReload ? 'true' : 'false',
          ...config.env
        },
        restart: 'unless-stopped'
      });

      session.containerId = containerId;
      session.status = 'running';

      // Start log streaming
      this.startLogStreaming(session);

      // Setup file watching if enabled
      if (config.watchMode) {
        const projectType = config.projectType || 
          this.detectProjectType(path.join(this.baseDir, 'layer', 'themes', config.themeName));
        
        if (projectType === 'cpp') {
          this.setupCppFileWatching(session);
        } else {
          this.setupFileWatching(session);
        }
      }

      // Wait for container to be ready
      await this.waitForReady(session);

      console.log(`✅ Development environment started!`);
      console.log(`   📍 URL: http://localhost:${session.port}`);
      console.log(`   🐛 Debugger: chrome://inspect or about:inspect`);
      console.log(`   📝 Logs: npm run dev:logs ${config.themeName}`);
      console.log(`   🛑 Stop: npm run dev:stop ${config.themeName}`);

      return session;

    } catch (error) {
      session.status = 'error';
      session.logs.push(`Error: ${error}`);
      console.error('❌ Failed to start development environment:', error);
      throw error;
    }
  }

  /**
   * Detect project type
   */
  private detectProjectType(themePath: string): 'nodejs' | 'cpp' | 'python' | 'java' {
    if (fs.existsSync(path.join(themePath, 'CMakeLists.txt')) ||
        fs.existsSync(path.join(themePath, 'Makefile')) ||
        fs.existsSync(path.join(themePath, 'src', 'main.cpp'))) {
      return 'cpp';
    }
    if (fs.existsSync(path.join(themePath, 'package.json'))) {
      return 'nodejs';
    }
    if (fs.existsSync(path.join(themePath, 'requirements.txt'))) {
      return 'python';
    }
    if (fs.existsSync(path.join(themePath, 'pom.xml'))) {
      return 'java';
    }
    return 'nodejs';
  }

  /**
   * Generate C++ development Dockerfile
   */
  private generateCppDevDockerfile(config: DevConfig): string {
    const compiler = config.cppConfig?.compiler || 'clang';
    const buildType = config.cppConfig?.buildType || 'Debug';
    
    const lines: string[] = [];
    
    lines.push('FROM ubuntu:22.04');
    lines.push('');
    lines.push('ENV DEBIAN_FRONTEND=noninteractive');
    lines.push('');
    
    // Install development tools
    lines.push('RUN apt-get update && apt-get install -y \\');
    
    if (compiler === 'clang') {
      lines.push('    clang-15 \\');
      lines.push('    lldb-15 \\');
      lines.push('    clang-tools-15 \\');
    } else {
      lines.push('    g++-12 \\');
    }
    
    lines.push('    cmake \\');
    lines.push('    ninja-build \\');
    lines.push('    gdb \\');
    lines.push('    gdbserver \\');
    
    if (config.cppConfig?.enableValgrind) {
      lines.push('    valgrind \\');
    }
    
    lines.push('    git \\');
    lines.push('    vim \\');
    lines.push('    curl \\');
    lines.push('    && rm -rf /var/lib/apt/lists/*');
    lines.push('');
    
    if (compiler === 'clang') {
      lines.push('ENV CC=clang-15 CXX=clang++-15');
    } else {
      lines.push('ENV CC=gcc-12 CXX=g++-12');
    }
    lines.push('');
    
    lines.push('WORKDIR /app');
    lines.push('');
    
    // Copy CMakeLists.txt for dependency installation
    lines.push('COPY CMakeLists.txt* ./');
    lines.push('COPY cmake/ ./cmake/ 2>/dev/null || true');
    lines.push('');
    
    // Configure with debug settings
    lines.push('RUN mkdir -p build && cd build && \\');
    lines.push(`    cmake .. -DCMAKE_BUILD_TYPE=${buildType} \\`);
    lines.push('             -DCMAKE_EXPORT_COMPILE_COMMANDS=ON \\');
    
    if (buildType === 'Debug') {
      lines.push('             -DENABLE_TESTING=ON \\');
      
      if (config.cppConfig?.enableSanitizers) {
        lines.push('             -DENABLE_SANITIZERS=ON \\');
      }
    }
    
    lines.push('             -G Ninja');
    lines.push('');
    
    // Expose GDB server port
    lines.push('EXPOSE 2345');
    
    // Expose application port
    lines.push('EXPOSE 8080');
    lines.push('');
    
    // Development command
    if (config.cppConfig?.enableGdb) {
      lines.push('CMD ["gdbserver", ":2345", "./build/bin/app"]');
    } else {
      lines.push('CMD ["bash", "-c", "cd build && ninja && ./bin/app"]');
    }
    
    return lines.join('\n');
  }

  /**
   * Generate development Dockerfile
   */
  private generateDevDockerfile(config: DevConfig): string {
    const projectType = config.projectType || 
      this.detectProjectType(path.join(this.baseDir, 'layer', 'themes', config.themeName));
    
    if (projectType === 'cpp') {
      return this.generateCppDevDockerfile(config);
    }
    
    // Original Node.js dockerfile generation
    return `
# Development Dockerfile with hot reload support
FROM node:18-alpine

# Install development dependencies
RUN apk add --no-cache \\
    git \\
    python3 \\
    make \\
    g++ \\
    curl \\
    bash

# Install nodemon globally for hot reload
RUN npm install -g nodemon ts-node

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy tsconfig if exists
COPY tsconfig.json* ./

# Expose application and debug ports
EXPOSE 3000 9229

# Health check
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \\
  CMD curl -f http://localhost:3000/health || exit 1

# Development command with debugging
${config.command || 'CMD ["nodemon", "--inspect=0.0.0.0:9229", "--watch", "src", "--ext", "ts,js,json", "--exec", "ts-node", "src/index.ts"]'}
`.trim();
  }

  /**
   * Setup C++ file watching for auto-rebuild
   */
  private setupCppFileWatching(session: DevSession): void {
    const themePath = path.join(this.baseDir, 'layer', 'themes', session.themeName);
    const srcPath = path.join(themePath, 'src');
    const includePath = path.join(themePath, 'include');
    
    const watchPaths = [srcPath];
    if (fs.existsSync(includePath)) {
      watchPaths.push(includePath);
    }
    
    const watchers: fs.FSWatcher[] = [];
    
    for (const watchPath of watchPaths) {
      if (fs.existsSync(watchPath)) {
        const watcher = fs.watch(watchPath, { recursive: true }, async (eventType, filename) => {
          if (filename && 
              (filename.endsWith('.cpp') || 
               filename.endsWith('.cc') || 
               filename.endsWith('.hpp') || 
               filename.endsWith('.h'))) {
            console.log(`📝 C++ file changed: ${filename}`);
            session.logs.push(`File changed: ${filename}`);
            
            // Trigger rebuild in container
            if (session.containerId) {
              try {
                await this.containerRunner.exec(session.containerId, 
                  ['sh', '-c', 'cd /app/build && ninja']);
                console.log('✅ Rebuild complete');
                session.logs.push('Rebuild complete');
              } catch (error) {
                console.error('❌ Rebuild failed:', error);
                session.logs.push(`Rebuild failed: ${error}`);
              }
            }
          }
        });
        
        watchers.push(watcher);
      }
    }
    
    // Store all watchers
    this.watchers.set(session.id, watchers[0]); // Store first watcher for compatibility
    console.log('👀 C++ file watching enabled');
  }

  /**
   * Setup file watching for auto-restart
   */
  private setupFileWatching(session: DevSession): void {
    const themePath = path.join(this.baseDir, 'layer', 'themes', session.themeName);
    const srcPath = path.join(themePath, 'src');

    if (fs.existsSync(srcPath)) {
      const watcher = fs.watch(srcPath, { recursive: true }, (eventType, filename) => {
        if (filename && (filename.endsWith('.ts') || filename.endsWith('.js'))) {
          console.log(`📝 File changed: ${filename}`);
          // Container with nodemon will auto-restart
          session.logs.push(`File changed: ${filename}`);
        }
      });

      this.watchers.set(session.id, watcher);
      console.log('👀 File watching enabled');
    }
  }

  /**
   * Start log streaming from container
   */
  private startLogStreaming(session: DevSession): void {
    if (!session.containerId) return;

    const logProcess = spawn('docker', ['logs', '-f', session.containerId]);

    logProcess.stdout.on('data', (data) => {
      const log = data.toString();
      session.logs.push(log);
      
      // Keep only last 1000 lines
      if (session.logs.length > 1000) {
        session.logs = session.logs.slice(-1000);
      }

      // Output to console with prefix
      process.stdout.write(`[${session.themeName}] ${log}`);
    });

    logProcess.stderr.on('data', (data) => {
      const log = data.toString();
      session.logs.push(`[ERROR] ${log}`);
      process.stderr.write(`[${session.themeName}] ${log}`);
    });

    session.process = logProcess;
  }

  /**
   * Wait for container to be ready
   */
  private async waitForReady(session: DevSession, timeout: number = 30000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        // Try to connect to the health endpoint
        const { exec } = require('child_process').promises;
        await exec(`curl -f http://localhost:${session.port}/health`);
        return;
      } catch {
        // Not ready yet
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.warn('⚠️  Container started but health check did not respond');
  }

  /**
   * Stop development environment
   */
  async stopDev(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.status = 'stopping';
    console.log(`🛑 Stopping development environment for ${session.themeName}...`);

    // Stop file watcher
    const watcher = this.watchers.get(sessionId);
    if (watcher) {
      watcher.close();
      this.watchers.delete(sessionId);
    }

    // Stop log process
    if (session.process) {
      session.process.kill();
    }

    // Stop and remove container
    if (session.containerId) {
      await this.containerRunner.stop(session.containerId);
      await this.containerRunner.remove(session.containerId);
    }

    session.status = 'stopped';
    console.log('✅ Development environment stopped');
  }

  /**
   * Restart development environment
   */
  async restartDev(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    console.log(`🔄 Restarting ${session.themeName}...`);

    if (session.containerId) {
      await this.containerRunner.restart(session.containerId);
      console.log('✅ Container restarted');
    }
  }

  /**
   * Get development session
   */
  getSession(sessionId: string): DevSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * List all development sessions
   */
  listSessions(): DevSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get logs for a session
   */
  getLogs(sessionId: string, tail?: number): string[] {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return [];
    }

    if (tail) {
      return session.logs.slice(-tail);
    }

    return session.logs;
  }

  /**
   * Execute command in development container
   */
  async exec(sessionId: string, command: string[]): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.containerId) {
      throw new Error(`Session ${sessionId} not found or not running`);
    }

    return await this.containerRunner.exec(session.containerId, command);
  }

  /**
   * Open shell in development container
   */
  async shell(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.containerId) {
      throw new Error(`Session ${sessionId} not found or not running`);
    }

    console.log('📦 Opening shell in container...');
    const shell = spawn('docker', ['exec', '-it', session.containerId, '/bin/sh'], {
      stdio: 'inherit'
    });

    return new Promise((resolve, reject) => {
      shell.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Shell exited with code ${code}`));
        }
      });
    });
  }

  /**
   * Run tests in development container
   */
  async runTests(sessionId: string, watch?: boolean): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    const themePath = path.join(this.baseDir, 'layer', 'themes', session.themeName);
    const projectType = this.detectProjectType(themePath);
    
    let command: string[];
    
    if (projectType === 'cpp') {
      // Run CTest for C++ projects
      command = ['sh', '-c', 'cd /app/build && ctest --output-on-failure'];
      
      if (watch) {
        // For C++, watch mode means continuous rebuild and test
        command = ['sh', '-c', 
          'while true; do cd /app/build && ninja && ctest --output-on-failure; sleep 2; done'];
      }
    } else {
      // Node.js tests
      command = watch 
        ? ['npm', 'run', 'test:watch']
        : ['npm', 'test'];
    }

    return await this.exec(sessionId, command);
  }

  /**
   * Run GDB debugging session
   */
  async startGdbSession(sessionId: string, executable?: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.containerId) {
      throw new Error(`Session ${sessionId} not found or not running`);
    }
    
    console.log('🐛 Starting GDB debugging session...');
    
    const gdbCommand = executable 
      ? ['gdb', executable]
      : ['gdb', '/app/build/bin/app'];
    
    const gdb = spawn('docker', ['exec', '-it', session.containerId, ...gdbCommand], {
      stdio: 'inherit'
    });
    
    return new Promise((resolve, reject) => {
      gdb.on('exit', (code) => {
        if (code === 0) {
          console.log('✅ GDB session ended');
          resolve();
        } else {
          reject(new Error(`GDB exited with code ${code}`));
        }
      });
    });
  }

  /**
   * Run Valgrind memory check
   */
  async runValgrind(sessionId: string, executable?: string): Promise<string> {
    const exec = executable || '/app/build/bin/app';
    const command = [
      'valgrind',
      '--leak-check=full',
      '--show-leak-kinds=all',
      '--track-origins=yes',
      '--verbose',
      exec
    ];
    
    return await this.exec(sessionId, command);
  }

  /**
   * Build project in development container
   */
  async build(sessionId: string): Promise<string> {
    console.log('🔨 Building project...');
    return await this.exec(sessionId, ['npm', 'run', 'build']);
  }

  /**
   * Clean up all stopped sessions
   */
  async cleanup(): Promise<void> {
    const stoppedSessions = Array.from(this.sessions.values())
      .filter(s => s.status === 'stopped' || s.status === 'error');

    for (const session of stoppedSessions) {
      this.sessions.delete(session.id);
      console.log(`🧹 Cleaned up session ${session.id}`);
    }
  }
}