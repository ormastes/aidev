import { DockerBuilder, DockerfileConfig, BuildOptions } from '../children/DockerBuilder';
import { fs } from '../../infra_external-log-lib/src';
import { path } from '../../infra_external-log-lib/src';
import { exec } from 'child_process';
import { promisify } from 'util';

jest.mock('child_process');
jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(),
    readFile: jest.fn()
  }
}));

describe('DockerBuilder', () => {
  let dockerBuilder: DockerBuilder;
  const mockExecAsync = exec as unknown as jest.MockedFunction<typeof exec>;

  beforeEach(() => {
    dockerBuilder = new DockerBuilder();
    jest.clearAllMocks();
  });

  describe('generateDockerfile', () => {
    it('should generate basic Dockerfile from config', () => {
      const config: DockerfileConfig = {
        baseImage: 'node:18-alpine',
        workDir: '/app',
        ports: [3000],
        env: {
          NODE_ENV: 'production'
        },
        copyFiles: [
          { from: 'package*.json', to: './' }
        ],
        runCommands: ['npm ci'],
        cmd: ['npm', 'start']
      };

      const dockerfile = dockerBuilder.generateDockerfile(config);

      expect(dockerfile).toContain('FROM node:18-alpine');
      expect(dockerfile).toContain('WORKDIR /app');
      expect(dockerfile).toContain('ENV NODE_ENV=production');
      expect(dockerfile).toContain('COPY package*.json ./');
      expect(dockerfile).toContain('RUN npm ci');
      expect(dockerfile).toContain('EXPOSE 3000');
      expect(dockerfile).toContain('CMD ["npm","start"]');
    });

    it('should include healthcheck when specified', () => {
      const config: DockerfileConfig = {
        baseImage: 'node:18',
        healthcheck: {
          test: 'curl -f http://localhost:3000/health',
          interval: '30s',
          timeout: '10s',
          retries: 3
        }
      };

      const dockerfile = dockerBuilder.generateDockerfile(config);

      expect(dockerfile).toContain('HEALTHCHECK');
      expect(dockerfile).toContain('--interval=30s');
      expect(dockerfile).toContain('--timeout=10s');
      expect(dockerfile).toContain('--retries=3');
      expect(dockerfile).toContain('CMD curl -f http://localhost:3000/health');
    });

    it('should include volumes when specified', () => {
      const config: DockerfileConfig = {
        baseImage: 'node:18',
        volumes: ['/data', '/logs']
      };

      const dockerfile = dockerBuilder.generateDockerfile(config);

      expect(dockerfile).toContain('VOLUME ["/data","/logs"]');
    });

    it('should include labels when specified', () => {
      const config: DockerfileConfig = {
        baseImage: 'node:18',
        labels: {
          version: '1.0.0',
          maintainer: 'dev@aidev.com'
        }
      };

      const dockerfile = dockerBuilder.generateDockerfile(config);

      expect(dockerfile).toContain('LABEL version="1.0.0"');
      expect(dockerfile).toContain('LABEL maintainer="dev@aidev.com"');
    });

    it('should set user when specified', () => {
      const config: DockerfileConfig = {
        baseImage: 'node:18',
        user: 'node'
      };

      const dockerfile = dockerBuilder.generateDockerfile(config);

      expect(dockerfile).toContain('USER node');
    });
  });

  describe('generateNodeDockerfile', () => {
    it('should generate multi-stage Dockerfile for production', () => {
      const dockerfile = dockerBuilder.generateNodeDockerfile('test-theme', true);

      expect(dockerfile).toContain('# Build stage');
      expect(dockerfile).toContain('FROM node:18-alpine AS builder');
      expect(dockerfile).toContain('# Production stage');
      expect(dockerfile).toContain('ENV NODE_ENV=production');
      expect(dockerfile).toContain('USER node');
      expect(dockerfile).toContain('COPY --from=builder /app/dist ./dist');
    });

    it('should generate simple Dockerfile for development', () => {
      const dockerfile = dockerBuilder.generateNodeDockerfile('test-theme', false);

      expect(dockerfile).toContain('FROM node:18-alpine');
      expect(dockerfile).toContain('ENV NODE_ENV=development');
      expect(dockerfile).not.toContain('# Build stage');
      expect(dockerfile).not.toContain('USER node');
    });
  });

  describe('buildImage', () => {
    it('should build Docker image with correct arguments', async () => {
      const mockStdout = 'Successfully built image';
      (mockExecAsync as any).mockImplementation((cmd: string, callback: any) => {
        callback(null, { stdout: mockStdout, stderr: '' });
      });

      const options: BuildOptions = {
        tag: 'test-image:latest',
        context: './test',
        dockerfile: 'Dockerfile.test',
        buildArgs: {
          NODE_VERSION: '18'
        },
        noCache: true,
        platform: 'linux/amd64'
      };

      const result = await dockerBuilder.buildImage(options);

      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('docker build'),
        expect.any(Function)
      );
      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('-t test-image:latest'),
        expect.any(Function)
      );
      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('-f Dockerfile.test'),
        expect.any(Function)
      );
      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('--build-arg NODE_VERSION=18'),
        expect.any(Function)
      );
      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('--no-cache'),
        expect.any(Function)
      );
      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('--platform linux/amd64'),
        expect.any(Function)
      );
    });

    it('should throw error when build fails', async () => {
      (mockExecAsync as any).mockImplementation((cmd: string, callback: any) => {
        callback(null, { stdout: '', stderr: 'Build failed: error' });
      });

      const options: BuildOptions = {
        tag: 'test-image:latest'
      };

      await expect(dockerBuilder.buildImage(options)).rejects.toThrow('Docker build failed');
    });
  });

  describe('isDockerAvailable', () => {
    it('should return true when Docker is available', async () => {
      (mockExecAsync as any).mockImplementation((cmd: string, callback: any) => {
        callback(null, { stdout: 'Docker version 20.10.0', stderr: '' });
      });

      const result = await dockerBuilder.isDockerAvailable();

      expect(result).toBe(true);
      expect(mockExecAsync).toHaveBeenCalledWith('docker --version', expect.any(Function));
    });

    it('should return false when Docker is not available', async () => {
      (mockExecAsync as any).mockImplementation((cmd: string, callback: any) => {
        callback(new Error('Command not found'), null);
      });

      const result = await dockerBuilder.isDockerAvailable();

      expect(result).toBe(false);
    });
  });

  describe('getDockerVersion', () => {
    it('should return Docker version', async () => {
      const version = 'Docker version 20.10.0, build b485636';
      (mockExecAsync as any).mockImplementation((cmd: string, callback: any) => {
        callback(null, { stdout: version, stderr: '' });
      });

      const result = await dockerBuilder.getDockerVersion();

      expect(result).toBe(version.trim());
    });

    it('should throw error when Docker is not available', async () => {
      (mockExecAsync as any).mockImplementation((cmd: string, callback: any) => {
        callback(new Error('Command not found'), null);
      });

      await expect(dockerBuilder.getDockerVersion()).rejects.toThrow('Docker is not installed or not accessible');
    });
  });

  describe('saveDockerfile', () => {
    it('should save Dockerfile content to file', async () => {
      const content = 'FROM node:18\nCMD ["npm", "start"]';
      const filepath = '/test/Dockerfile';
      
      (fs.promises.writeFile as jest.MockedFunction<typeof fs.promises.writeFile>).mockResolvedValue(undefined);

      await dockerBuilder.saveDockerfile(content, filepath);

      expect(fs.promises.writeFile).toHaveBeenCalledWith(filepath, content, 'utf8');
    });
  });

  describe('loadTemplate', () => {
    it('should load Dockerfile template from file', async () => {
      const templateContent = 'FROM node:18\nCMD ["npm", "start"]';
      (fs.promises.readFile as jest.MockedFunction<typeof fs.promises.readFile>).mockResolvedValue(templateContent);

      const result = await dockerBuilder.loadTemplate('node');

      expect(fs.promises.readFile).toHaveBeenCalledWith(
        expect.stringContaining('node.dockerfile'),
        'utf8'
      );
      expect(result).toBe(templateContent);
    });
  });
});