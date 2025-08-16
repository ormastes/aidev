import { fs } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getFileAPI, FileType } from '../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


const execAsync = promisify(exec);

export interface DockerSetupOptions {
  projectName: string;
  environment: 'local' | 'dev' | 'dev-demo' | 'demo' | 'release';
  baseImage?: string;
  ports?: number[];
  volumes?: string[];
  buildArgs?: Record<string, string>;
  enableDebug?: boolean;
  enableHotReload?: boolean;
  cppSupport?: boolean;
}

export interface DockerComposeConfig {
  version: string;
  services: Record<string, any>;
  networks?: Record<string, any>;
  volumes?: Record<string, any>;
}

export class DockerSetupService {
  private readonly templatesPath: string;
  private readonly outputPath: string;

  constructor() {
    this.templatesPath = path.join(__dirname, '../../templates');
    this.outputPath = path.join(process.cwd(), 'docker');
  }

  async setupDockerEnvironment(options: DockerSetupOptions): Promise<void> {
    console.log(`Setting up Docker environment for ${options.projectName} (${options.environment})`);
    
    await this.ensureDirectoryStructure();
    await this.generateDockerfile(options);
    await this.generateDockerCompose(options);
    await this.generateEnvironmentConfig(options);
    
    if (options.cppSupport) {
      await this.setupCppSupport(options);
    }
    
    if (options.enableDebug) {
      await this.setupDebugConfiguration(options);
    }
    
    console.log('Docker environment setup complete!');
  }

  private async ensureDirectoryStructure(): Promise<void> {
    const dirs = [
      this.outputPath,
      path.join(this.outputPath, 'configs'),
      path.join(this.outputPath, 'scripts'),
      path.join(this.outputPath, 'volumes')
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        await fileAPI.createDirectory(dir);
      }
    }
  }

  private async generateDockerfile(options: DockerSetupOptions): Promise<void> {
    const baseImage = options.baseImage || (options.cppSupport ? 'gcc:11' : 'node:18-alpine');
    
    let dockerfile = `FROM ${baseImage} AS base\n\n`;
    dockerfile += `WORKDIR /app\n\n`;
    
    if (options.cppSupport) {
      dockerfile += this.generateCppDockerfile(options);
    } else {
      dockerfile += this.generateNodeDockerfile(options);
    }
    
    if (options.environment === 'release') {
      dockerfile += this.generateProductionStage(options);
    } else {
      dockerfile += this.generateDevelopmentStage(options);
    }
    
    const dockerfilePath = path.join(this.outputPath, `Dockerfile.${options.environment}`);
    await fileAPI.createFile(dockerfilePath, dockerfile, { type: FileType.TEMPORARY });
  }

  private async generateCppDockerfile(options: DockerSetupOptions): string {
    return `# Install C++ build tools
RUN apt-get update && apt-get install -y \\
    cmake \\
    ninja-build \\
    gdb \\
    valgrind \\
    clang-tidy \\
    clang-format \\
    ccache \\
    && rm -rf /var/lib/apt/lists/*

# Setup ccache for faster builds
ENV PATH="/usr/lib/ccache:$PATH"
ENV CCACHE_DIR=/app/.ccache

# Copy CMakeLists.txt first for better caching
COPY CMakeLists.txt ./
RUN mkdir build && cd build && cmake -G Ninja -DCMAKE_BUILD_TYPE=${options.environment === 'release' ? 'Release' : 'Debug'} ..

# Copy source files
COPY src/ src/
COPY include/ include/
COPY tests/ tests/

# Build the project
RUN cd build && ninja

`;
  }

  private async generateNodeDockerfile(options: DockerSetupOptions): string {
    return `# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application source
COPY . .

# Build application
RUN npm run build

`;
  }

  private async generateProductionStage(options: DockerSetupOptions): string {
    return `# Production stage
FROM ${options.baseImage || 'node:18-alpine'} AS production

WORKDIR /app

# Install tini for proper signal handling
RUN apk add --no-cache tini

# Copy built application
COPY --from=base /app/build /app/build
COPY --from=base /app/node_modules /app/node_modules
COPY --from=base /app/package*.json /app/

# Set production environment
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD node healthcheck.js || exit 1

# Use tini as entrypoint
ENTRYPOINT ["/sbin/tini", "--"]

# Start application
CMD ["node", "build/index.js"]
`;
  }

  private async generateDevelopmentStage(options: DockerSetupOptions): string {
    let stage = `# Development stage\n`;
    
    if (options.enableHotReload) {
      stage += `# Install development dependencies\n`;
      stage += `RUN npm install\n\n`;
      stage += `# Enable hot reload\n`;
      stage += `ENV NODE_ENV=development\n`;
      stage += `ENV CHOKIDAR_USEPOLLING=true\n\n`;
    }
    
    if (options.enableDebug) {
      stage += `# Enable debugging\n`;
      stage += `EXPOSE 9229\n`;
      if (options.cppSupport) {
        stage += `EXPOSE 2345\n`; // GDB server port
      }
      stage += `\n`;
    }
    
    stage += `# Start application\n`;
    if (options.cppSupport) {
      stage += `CMD ["./build/app"]\n`;
    } else {
      stage += options.enableDebug 
        ? `CMD ["node", "--inspect=0.0.0.0:9229", "src/index.js"]\n`
        : `CMD ["npm", "start"]\n`;
    }
    
    return stage;
  }

  private async generateDockerCompose(options: DockerSetupOptions): Promise<void> {
    const config: DockerComposeConfig = {
      version: '3.8',
      services: {
        [options.projectName]: {
          build: {
            context: '.',
            dockerfile: `docker/Dockerfile.${options.environment}`
          },
          container_name: `${options.projectName}-${options.environment}`,
          environment: this.getEnvironmentVariables(options),
          networks: [`${options.projectName}-network`]
        }
      },
      networks: {
        [`${options.projectName}-network`]: {
          driver: 'bridge'
        }
      }
    };

    // Add ports
    if (options.ports && options.ports.length > 0) {
      const portMappings = this.getPortMappings(options);
      config.services[options.projectName].ports = portMappings;
    }

    // Add volumes
    if (options.environment === 'local' || options.environment === 'dev') {
      config.services[options.projectName].volumes = this.getVolumeMappings(options);
    }

    // Add resource limits for production
    if (options.environment === 'release') {
      config.services[options.projectName].deploy = {
        resources: {
          limits: {
            cpus: '2',
            memory: '2G'
          },
          reservations: {
            cpus: '0.5',
            memory: '512M'
          }
        },
        replicas: 2,
        restart_policy: {
          condition: 'on-failure',
          delay: '5s',
          max_attempts: 3
        }
      };
    }

    const composePath = path.join(this.outputPath, `docker-compose.${options.environment}.yml`);
    const yamlContent = this.toYaml(config);
    await fileAPI.createFile(composePath, yamlContent, { type: FileType.TEMPORARY });
  }

  private async getEnvironmentVariables(options: DockerSetupOptions): Record<string, string> {
    const baseEnv: Record<string, string> = {
      NODE_ENV: options.environment === 'release' ? 'production' : 'development',
      APP_NAME: options.projectName,
      ENVIRONMENT: options.environment
    };

    if (options.enableDebug) {
      baseEnv.DEBUG = '*';
      if (options.cppSupport) {
        baseEnv.GDB_SERVER = '0.0.0.0:2345';
      }
    }

    if (options.enableHotReload) {
      baseEnv.WATCH_MODE = 'true';
      baseEnv.CHOKIDAR_USEPOLLING = 'true';
    }

    return baseEnv;
  }

  private async getPortMappings(options: DockerSetupOptions): string[] {
    const basePorts = options.ports || [3000];
    const envPortOffset = this.getPortOffset(options.environment);
    
    const mappings: string[] = [];
    
    for (const port of basePorts) {
      const hostPort = port + envPortOffset;
      mappings.push(`${hostPort}:${port}`);
    }

    if (options.enableDebug) {
      mappings.push('9229:9229'); // Node.js debugger
      if (options.cppSupport) {
        mappings.push('2345:2345'); // GDB server
      }
    }

    return mappings;
  }

  private async getPortOffset(environment: string): number {
    const offsets: Record<string, number> = {
      'local': 0,
      'dev': 0,
      'dev-demo': 1,
      'demo': 2,
      'release': -2920 // Maps to port 80
    };
    return offsets[environment] || 0;
  }

  private async getVolumeMappings(options: DockerSetupOptions): string[] {
    const volumes: string[] = [];

    if (options.environment === 'local') {
      // Full source mounting for local development
      volumes.push('.:/app:cached');
      volumes.push('/app/node_modules'); // Prevent node_modules overwrite
      
      if (options.cppSupport) {
        volumes.push('/app/build'); // Prevent build directory overwrite
        volumes.push('/app/.ccache'); // Cache directory
      }
    } else if (options.environment === 'dev') {
      // Selective mounting for dev environment
      volumes.push('./src:/app/src:cached');
      volumes.push('./tests:/app/tests:cached');
      
      if (options.cppSupport) {
        volumes.push('./include:/app/include:cached');
      }
    }

    // Add custom volumes
    if (options.volumes) {
      volumes.push(...options.volumes);
    }

    return volumes;
  }

  private async generateEnvironmentConfig(options: DockerSetupOptions): Promise<void> {
    const envConfig = {
      name: options.projectName,
      environment: options.environment,
      docker: {
        image: `${options.projectName}:${options.environment}`,
        dockerfile: `Dockerfile.${options.environment}`,
        compose: `docker-compose.${options.environment}.yml`
      },
      ports: options.ports || [3000],
      features: {
        debug: options.enableDebug || false,
        hotReload: options.enableHotReload || false,
        cppSupport: options.cppSupport || false
      },
      resources: this.getResourceLimits(options.environment)
    };

    const configPath = path.join(this.outputPath, 'configs', `${options.environment}.json`);
    await fileAPI.createFile(configPath, JSON.stringify(envConfig, { type: FileType.TEMPORARY }));
  }

  private async getResourceLimits(environment: string): any {
    const limits: Record<string, any> = {
      'local': { memory: 'unlimited', cpu: 'unlimited' },
      'dev': { memory: 'unlimited', cpu: 'unlimited' },
      'dev-demo': { memory: '1G', cpu: '1' },
      'demo': { memory: '512M', cpu: '0.5' },
      'release': { memory: '2G', cpu: '2' }
    };
    return limits[environment] || limits['dev'];
  }

  private async setupCppSupport(options: DockerSetupOptions): Promise<void> {
    // Generate CMakeLists.txt template if it doesn't exist
    const cmakePath = path.join(process.cwd(), 'CMakeLists.txt');
    if (!fs.existsSync(cmakePath)) {
      const cmakeContent = this.generateCMakeTemplate(options.projectName);
      await fileAPI.createFile(cmakePath, cmakeContent, { type: FileType.TEMPORARY });
    }

    // Generate build script
    const buildScript = `#!/bin/bash
set -e

BUILD_TYPE=\${1:-Debug}
BUILD_DIR=build-\${BUILD_TYPE,,}

echo "Building ${options.projectName} in \${BUILD_TYPE} mode..."

mkdir -p \${BUILD_DIR}
cd \${BUILD_DIR}

cmake -G Ninja \\
  -DCMAKE_BUILD_TYPE=\${BUILD_TYPE} \\
  -DCMAKE_EXPORT_COMPILE_COMMANDS=ON \\
  ..

ninja -j\$(nproc)

echo "Build complete!"
`;

    const scriptPath = path.join(this.outputPath, 'scripts', 'build-cpp.sh');
    await fileAPI.createFile(scriptPath, buildScript, { type: FileType.TEMPORARY });
    fs.chmodSync(scriptPath, '755');
  }

  private async generateCMakeTemplate(projectName: string): string {
    return `cmake_minimum_required(VERSION 3.16)
project(${projectName} VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Enable compile commands for better IDE support
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Set build type if not specified
if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Debug)
endif()

# Compiler flags
if(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
  add_compile_options(-Wall -Wextra -Wpedantic)
  if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    add_compile_options(-g -O0 -fsanitize=address)
    add_link_options(-fsanitize=address)
  else()
    add_compile_options(-O3)
  endif()
endif()

# Source files
file(GLOB_RECURSE SOURCES "src/*.cpp" "src/*.cc")
file(GLOB_RECURSE HEADERS "include/*.h" "include/*.hpp")

# Main executable
add_executable(${projectName} \${SOURCES})
target_include_directories(${projectName} PRIVATE include)

# Testing
enable_testing()
add_subdirectory(tests)

# Installation
install(TARGETS ${projectName} DESTINATION bin)
`;
  }

  private async setupDebugConfiguration(options: DockerSetupOptions): Promise<void> {
    const debugConfig = {
      version: '0.2.0',
      configurations: []
    };

    if (!options.cppSupport) {
      // Node.js debug configuration
      debugConfig.configurations.push({
        type: 'node',
        request: 'attach',
        name: `Debug ${options.projectName} (Docker)`,
        address: 'localhost',
        port: 9229,
        localRoot: '${workspaceFolder}',
        remoteRoot: '/app',
        protocol: 'inspector',
        restart: true
      });
    } else {
      // C++ GDB debug configuration
      debugConfig.configurations.push({
        name: `Debug ${options.projectName} (GDB)`,
        type: 'cppdbg',
        request: 'launch',
        program: '${workspaceFolder}/build/app',
        args: [],
        stopAtEntry: false,
        cwd: '${workspaceFolder}',
        environment: [],
        externalConsole: false,
        MIMode: 'gdb',
        miDebuggerServerAddress: 'localhost:2345',
        setupCommands: [
          {
            description: 'Enable pretty-printing for gdb',
            text: '-enable-pretty-printing',
            ignoreFailures: true
          }
        ]
      });
    }

    const vscodeDir = path.join(process.cwd(), '.vscode');
    if (!fs.existsSync(vscodeDir)) {
      await fileAPI.createDirectory(vscodeDir);
    }

    const launchPath = path.join(vscodeDir, 'launch.json');
    await fileAPI.createFile(launchPath, JSON.stringify(debugConfig, { type: FileType.TEMPORARY }));
  }

  private async toYaml(obj: any, indent: number = 0): string {
    let yaml = '';
    const spaces = '  '.repeat(indent);

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue;

      yaml += `${spaces}${key}:`;

      if (typeof value === 'object' && !Array.isArray(value)) {
        yaml += '\n' + this.toYaml(value, indent + 1);
      } else if (Array.isArray(value)) {
        yaml += '\n';
        for (const item of value) {
          if (typeof item === 'object') {
            yaml += `${spaces}  -\n` + this.toYaml(item, indent + 2);
          } else {
            yaml += `${spaces}  - ${item}\n`;
          }
        }
      } else {
        yaml += ` ${value}\n`;
      }
    }

    return yaml;
  }

  async buildImage(options: DockerSetupOptions): Promise<void> {
    const dockerfile = `docker/Dockerfile.${options.environment}`;
    const imageName = `${options.projectName}:${options.environment}`;
    
    console.log(`Building Docker image: ${imageName}`);
    
    const buildArgs = options.buildArgs 
      ? Object.entries(options.buildArgs).map(([k, v]) => `--build-arg ${k}=${v}`).join(' ')
      : '';
    
    const command = `docker build -f ${dockerfile} -t ${imageName} ${buildArgs} .`;
    
    try {
      const { stdout, stderr } = await execAsync(command);
      console.log(stdout);
      if (stderr) console.error(stderr);
      console.log(`Successfully built image: ${imageName}`);
    } catch (error) {
      console.error(`Failed to build image: ${error}`);
      throw error;
    }
  }

  async runContainer(options: DockerSetupOptions): Promise<void> {
    const composefile = `docker/docker-compose.${options.environment}.yml`;
    
    console.log(`Starting container with docker-compose...`);
    
    const command = `docker-compose -f ${composefile} up -d`;
    
    try {
      const { stdout, stderr } = await execAsync(command);
      console.log(stdout);
      if (stderr) console.error(stderr);
      console.log(`Container started successfully`);
    } catch (error) {
      console.error(`Failed to start container: ${error}`);
      throw error;
    }
  }

  async stopContainer(options: DockerSetupOptions): Promise<void> {
    const composefile = `docker/docker-compose.${options.environment}.yml`;
    
    console.log(`Stopping container...`);
    
    const command = `docker-compose -f ${composefile} down`;
    
    try {
      const { stdout, stderr } = await execAsync(command);
      console.log(stdout);
      if (stderr) console.error(stderr);
      console.log(`Container stopped successfully`);
    } catch (error) {
      console.error(`Failed to stop container: ${error}`);
      throw error;
    }
  }
}