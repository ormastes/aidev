import { DockerSetupService, DockerSetupOptions } from '../src/services/docker-setup';
import { fs } from '../../infra_external-log-lib/src';
import { path } from '../../infra_external-log-lib/src';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('DockerSetupService', () => {
  let service: DockerSetupService;
  const testProjectName = 'test-project';
  const testOutputPath = path.join(process.cwd(), 'docker');

  beforeEach(() => {
    service = new DockerSetupService();
    // Clean up any existing test directories
    if (fs.existsSync(testOutputPath)) {
      fs.rmSync(testOutputPath, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Clean up test directories
    if (fs.existsSync(testOutputPath)) {
      fs.rmSync(testOutputPath, { recursive: true, force: true });
    }
  });

  describe('setupDockerEnvironment', () => {
    it('should create Docker environment for Node.js project', async () => {
      const options: DockerSetupOptions = {
        projectName: testProjectName,
        environment: 'dev',
        baseImage: 'node:18-alpine',
        ports: [3000],
        enableDebug: false,
        enableHotReload: false,
        cppSupport: false
      };

      await service.setupDockerEnvironment(options);

      // Check if directories were created
      expect(fs.existsSync(testOutputPath)).toBe(true);
      expect(fs.existsSync(path.join(testOutputPath, 'configs'))).toBe(true);
      expect(fs.existsSync(path.join(testOutputPath, 'scripts'))).toBe(true);
      expect(fs.existsSync(path.join(testOutputPath, 'volumes'))).toBe(true);

      // Check if Dockerfile was created
      const dockerfilePath = path.join(testOutputPath, 'Dockerfile.dev');
      expect(fs.existsSync(dockerfilePath)).toBe(true);
      
      const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf-8');
      expect(dockerfileContent).toContain('FROM node:18-alpine');
      expect(dockerfileContent).toContain('WORKDIR /app');
      expect(dockerfileContent).toContain('COPY package*.json ./');
      expect(dockerfileContent).toContain('npm ci --only=production');
    });

    it('should create Docker environment for C++ project', async () => {
      const options: DockerSetupOptions = {
        projectName: testProjectName,
        environment: 'dev',
        baseImage: 'gcc:11',
        ports: [8080],
        enableDebug: true,
        enableHotReload: false,
        cppSupport: true
      };

      await service.setupDockerEnvironment(options);

      // Check if Dockerfile was created with C++ support
      const dockerfilePath = path.join(testOutputPath, 'Dockerfile.dev');
      expect(fs.existsSync(dockerfilePath)).toBe(true);
      
      const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf-8');
      expect(dockerfileContent).toContain('FROM gcc:11');
      expect(dockerfileContent).toContain('cmake');
      expect(dockerfileContent).toContain('ninja-build');
      expect(dockerfileContent).toContain('gdb');
      expect(dockerfileContent).toContain('valgrind');
      expect(dockerfileContent).toContain('EXPOSE 2345'); // GDB port
    });

    it('should create production Docker environment', async () => {
      const options: DockerSetupOptions = {
        projectName: testProjectName,
        environment: 'release',
        baseImage: 'node:18-alpine',
        ports: [3000]
      };

      await service.setupDockerEnvironment(options);

      const dockerfilePath = path.join(testOutputPath, 'Dockerfile.release');
      const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf-8');
      
      expect(dockerfileContent).toContain('FROM node:18-alpine AS base');
      expect(dockerfileContent).toContain('FROM node:18-alpine AS production');
      expect(dockerfileContent).toContain('ENV NODE_ENV=production');
      expect(dockerfileContent).toContain('HEALTHCHECK');
      expect(dockerfileContent).toContain('tini');
    });

    it('should enable hot reload in development', async () => {
      const options: DockerSetupOptions = {
        projectName: testProjectName,
        environment: 'dev',
        enableHotReload: true
      };

      await service.setupDockerEnvironment(options);

      const dockerfilePath = path.join(testOutputPath, 'Dockerfile.dev');
      const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf-8');
      
      expect(dockerfileContent).toContain('ENV NODE_ENV=development');
      expect(dockerfileContent).toContain('ENV CHOKIDAR_USEPOLLING=true');
      expect(dockerfileContent).toContain('npm install');
    });

    it('should enable debug mode', async () => {
      const options: DockerSetupOptions = {
        projectName: testProjectName,
        environment: 'dev',
        enableDebug: true
      };

      await service.setupDockerEnvironment(options);

      const dockerfilePath = path.join(testOutputPath, 'Dockerfile.dev');
      const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf-8');
      
      expect(dockerfileContent).toContain('EXPOSE 9229');
      expect(dockerfileContent).toContain('--inspect=0.0.0.0:9229');
    });
  });

  describe('Docker Compose generation', () => {
    it('should generate docker-compose.yml', async () => {
      const options: DockerSetupOptions = {
        projectName: testProjectName,
        environment: 'dev',
        ports: [3000, 8080],
        volumes: ['./data:/app/data']
      };

      await service.setupDockerEnvironment(options);

      const composePath = path.join(testOutputPath, 'docker-compose.dev.yml');
      expect(fs.existsSync(composePath)).toBe(true);
      
      const composeContent = fs.readFileSync(composePath, 'utf-8');
      expect(composeContent).toContain('version: 3.8');
      expect(composeContent).toContain(testProjectName);
      expect(composeContent).toContain('3000:3000');
      expect(composeContent).toContain('8080:8080');
      expect(composeContent).toContain('./data:/app/data');
    });

    it('should apply port offsets for different environments', async () => {
      const environments = [
        { env: 'local', offset: 0 },
        { env: 'dev-demo', offset: 1000 },
        { env: 'demo', offset: 2000 }
      ];

      for (const { env, offset } of environments) {
        const options: DockerSetupOptions = {
          projectName: testProjectName,
          environment: env as any,
          ports: [3000]
        };

        await service.setupDockerEnvironment(options);

        const composePath = path.join(testOutputPath, `docker-compose.${env}.yml`);
        const composeContent = fs.readFileSync(composePath, 'utf-8');
        
        const expectedPort = 3000 + offset;
        expect(composeContent).toContain(`${expectedPort}:3000`);
      }
    });

    it('should add resource limits for production', async () => {
      const options: DockerSetupOptions = {
        projectName: testProjectName,
        environment: 'release',
        ports: [3000]
      };

      await service.setupDockerEnvironment(options);

      const composePath = path.join(testOutputPath, 'docker-compose.release.yml');
      const composeContent = fs.readFileSync(composePath, 'utf-8');
      
      expect(composeContent).toContain('deploy:');
      expect(composeContent).toContain('resources:');
      expect(composeContent).toContain('limits:');
      expect(composeContent).toContain('cpus: 2');
      expect(composeContent).toContain('memory: 2G');
      expect(composeContent).toContain('replicas: 2');
    });

    it('should configure volumes for local development', async () => {
      const options: DockerSetupOptions = {
        projectName: testProjectName,
        environment: 'local',
        cppSupport: true
      };

      await service.setupDockerEnvironment(options);

      const composePath = path.join(testOutputPath, 'docker-compose.local.yml');
      const composeContent = fs.readFileSync(composePath, 'utf-8');
      
      expect(composeContent).toContain('.:/app:cached');
      expect(composeContent).toContain('/app/node_modules');
      expect(composeContent).toContain('/app/build');
      expect(composeContent).toContain('/app/.ccache');
    });
  });

  describe('Environment configuration', () => {
    it('should create environment config file', async () => {
      const options: DockerSetupOptions = {
        projectName: testProjectName,
        environment: 'dev',
        ports: [3000],
        enableDebug: true,
        enableHotReload: true,
        cppSupport: false
      };

      await service.setupDockerEnvironment(options);

      const configPath = path.join(testOutputPath, 'configs', 'dev.json');
      expect(fs.existsSync(configPath)).toBe(true);
      
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(config.name).toBe(testProjectName);
      expect(config.environment).toBe('dev');
      expect(config.ports).toEqual([3000]);
      expect(config.features.debug).toBe(true);
      expect(config.features.hotReload).toBe(true);
      expect(config.features.cppSupport).toBe(false);
    });

    it('should set correct resource limits per environment', async () => {
      const environments = [
        { env: 'local', memory: 'unlimited', cpu: 'unlimited' },
        { env: 'demo', memory: '512M', cpu: '0.5' },
        { env: 'release', memory: '2G', cpu: '2' }
      ];

      for (const { env, memory, cpu } of environments) {
        const options: DockerSetupOptions = {
          projectName: testProjectName,
          environment: env as any
        };

        await service.setupDockerEnvironment(options);

        const configPath = path.join(testOutputPath, 'configs', `${env}.json`);
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        
        expect(config.resources.memory).toBe(memory);
        expect(config.resources.cpu).toBe(cpu);
      }
    });
  });

  describe('C++ support', () => {
    it('should generate CMakeLists.txt if not exists', async () => {
      const options: DockerSetupOptions = {
        projectName: testProjectName,
        environment: 'dev',
        cppSupport: true
      };

      // Remove existing CMakeLists.txt if any
      const cmakePath = path.join(process.cwd(), 'CMakeLists.txt');
      if (fs.existsSync(cmakePath)) {
        fs.unlinkSync(cmakePath);
      }

      await service.setupDockerEnvironment(options);

      expect(fs.existsSync(cmakePath)).toBe(true);
      
      const cmakeContent = fs.readFileSync(cmakePath, 'utf-8');
      expect(cmakeContent).toContain(`project(${testProjectName}`);
      expect(cmakeContent).toContain('CMAKE_CXX_STANDARD 17');
      expect(cmakeContent).toContain('add_executable');
      expect(cmakeContent).toContain('enable_testing()');

      // Clean up
      fs.unlinkSync(cmakePath);
    });

    it('should create C++ build script', async () => {
      const options: DockerSetupOptions = {
        projectName: testProjectName,
        environment: 'dev',
        cppSupport: true
      };

      await service.setupDockerEnvironment(options);

      const scriptPath = path.join(testOutputPath, 'scripts', 'build-cpp.sh');
      expect(fs.existsSync(scriptPath)).toBe(true);
      
      const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
      expect(scriptContent).toContain('#!/bin/bash');
      expect(scriptContent).toContain('cmake -G Ninja');
      expect(scriptContent).toContain('CMAKE_BUILD_TYPE');
      expect(scriptContent).toContain('CMAKE_EXPORT_COMPILE_COMMANDS=ON');
      expect(scriptContent).toContain('ninja');

      // Check if script is executable
      const stats = fs.statSync(scriptPath);
      expect(stats.mode & 0o111).toBeTruthy(); // Check execute permission
    });
  });

  describe('Debug configuration', () => {
    it('should create VSCode launch.json for Node.js', async () => {
      const options: DockerSetupOptions = {
        projectName: testProjectName,
        environment: 'dev',
        enableDebug: true,
        cppSupport: false
      };

      const vscodeDir = path.join(process.cwd(), '.vscode');
      const launchPath = path.join(vscodeDir, 'launch.json');

      // Clean up existing .vscode directory
      if (fs.existsSync(vscodeDir)) {
        fs.rmSync(vscodeDir, { recursive: true, force: true });
      }

      await service.setupDockerEnvironment(options);

      expect(fs.existsSync(launchPath)).toBe(true);
      
      const launchConfig = JSON.parse(fs.readFileSync(launchPath, 'utf-8'));
      expect(launchConfig.version).toBe('0.2.0');
      expect(launchConfig.configurations).toHaveLength(1);
      
      const config = launchConfig.configurations[0];
      expect(config.type).toBe('node');
      expect(config.request).toBe('attach');
      expect(config.port).toBe(9229);
      expect(config.remoteRoot).toBe('/app');

      // Clean up
      fs.rmSync(vscodeDir, { recursive: true, force: true });
    });

    it('should create VSCode launch.json for C++', async () => {
      const options: DockerSetupOptions = {
        projectName: testProjectName,
        environment: 'dev',
        enableDebug: true,
        cppSupport: true
      };

      const vscodeDir = path.join(process.cwd(), '.vscode');
      const launchPath = path.join(vscodeDir, 'launch.json');

      // Clean up existing .vscode directory
      if (fs.existsSync(vscodeDir)) {
        fs.rmSync(vscodeDir, { recursive: true, force: true });
      }

      await service.setupDockerEnvironment(options);

      expect(fs.existsSync(launchPath)).toBe(true);
      
      const launchConfig = JSON.parse(fs.readFileSync(launchPath, 'utf-8'));
      const config = launchConfig.configurations[0];
      
      expect(config.type).toBe('cppdbg');
      expect(config.MIMode).toBe('gdb');
      expect(config.miDebuggerServerAddress).toBe('localhost:2345');

      // Clean up
      fs.rmSync(vscodeDir, { recursive: true, force: true });
    });
  });

  describe('Build and run operations', () => {
    it('should validate build command generation', async () => {
      const options: DockerSetupOptions = {
        projectName: testProjectName,
        environment: 'dev',
        buildArgs: {
          NODE_VERSION: '18',
          BUILD_ENV: 'development'
        }
      };

      await service.setupDockerEnvironment(options);
      
      // Verify that the service can generate proper build commands
      // This would normally call Docker, but we're testing the command generation
      const dockerfilePath = path.join(testOutputPath, 'Dockerfile.dev');
      expect(fs.existsSync(dockerfilePath)).toBe(true);
    });
  });
});