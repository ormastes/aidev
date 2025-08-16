import { ContainerEnvironment } from '../pipe';
import { DockerBuilder } from '../children/DockerBuilder';
import { ComposeManager } from '../children/ComposeManager';
import { ContainerRunner } from '../children/ContainerRunner';

describe('Container Environment Integration', () => {
  let containerEnv: ContainerEnvironment;

  beforeEach(() => {
    containerEnv = new ContainerEnvironment();
  });

  describe("ContainerEnvironment", () => {
    it('should be instantiable', () => {
      expect(containerEnv).toBeDefined();
      expect(containerEnv).toBeInstanceOf(ContainerEnvironment);
    });

    it('should have all required methods', () => {
      expect(containerEnv.buildImage).toBeDefined();
      expect(containerEnv.runContainer).toBeDefined();
      expect(containerEnv.generateDockerfile).toBeDefined();
      expect(containerEnv.generateCompose).toBeDefined();
      expect(containerEnv.stopContainer).toBeDefined();
      expect(containerEnv.listContainers).toBeDefined();
      expect(containerEnv.getLogs).toBeDefined();
      expect(containerEnv.exec).toBeDefined();
    });
  });

  describe('DockerBuilder Integration', () => {
    let dockerBuilder: DockerBuilder;

    beforeEach(() => {
      dockerBuilder = new DockerBuilder();
    });

    it('should generate valid Dockerfile', () => {
      const config = {
        baseImage: 'node:18-alpine',
        workDir: '/app',
        ports: [3000],
        env: { NODE_ENV: "production" }
      };

      const dockerfile = dockerBuilder.generateDockerfile(config);
      
      expect(dockerfile).toContain('FROM node:18-alpine');
      expect(dockerfile).toContain('WORKDIR /app');
      expect(dockerfile).toContain('ENV NODE_ENV=production');
      expect(dockerfile).toContain('EXPOSE 3000');
    });

    it('should generate Node.js production Dockerfile', () => {
      const dockerfile = dockerBuilder.generateNodeDockerfile('test-theme', true);
      
      expect(dockerfile).toContain('# Build stage');
      expect(dockerfile).toContain('# Production stage');
      expect(dockerfile).toContain('NODE_ENV=production');
      expect(dockerfile).toContain('USER node');
    });
  });

  describe('ComposeManager Integration', () => {
    let composeManager: ComposeManager;

    beforeEach(() => {
      composeManager = new ComposeManager();
    });

    it('should generate platform compose config', () => {
      const themes = ['mate-dealer', 'portal_gui-selector'];
      const config = composeManager.generatePlatformCompose(themes);

      expect(config.services['mate-dealer']).toBeDefined();
      expect(config.services['portal-gui-selector']).toBeDefined();
      expect(config.networks).toBeDefined();
      expect(config.version).toBe('3.8');
    });
  });

  describe('ContainerRunner Integration', () => {
    let containerRunner: ContainerRunner;

    beforeEach(() => {
      containerRunner = new ContainerRunner();
    });

    it('should be instantiable', () => {
      expect(containerRunner).toBeDefined();
      expect(containerRunner).toBeInstanceOf(ContainerRunner);
    });

    it('should have all required methods', () => {
      expect(containerRunner.run).toBeDefined();
      expect(containerRunner.stop).toBeDefined();
      expect(containerRunner.start).toBeDefined();
      expect(containerRunner.restart).toBeDefined();
      expect(containerRunner.remove).toBeDefined();
      expect(containerRunner.list).toBeDefined();
      expect(containerRunner.logs).toBeDefined();
      expect(containerRunner.exec).toBeDefined();
      expect(containerRunner.stats).toBeDefined();
      expect(containerRunner.inspect).toBeDefined();
    });
  });

  describe('End-to-End Workflow', () => {
    it('should generate Dockerfile for a theme', async () => {
      const dockerfile = await containerEnv.generateDockerfile('test-theme', {
        base: 'node:18-alpine',
        ports: [3000],
        environment: {
          NODE_ENV: "production",
          PORT: '3000'
        }
      });

      expect(dockerfile).toBeDefined();
      expect(dockerfile).toContain('FROM node:18-alpine');
      expect(dockerfile).toContain('ENV NODE_ENV=production');
      expect(dockerfile).toContain('ENV PORT=3000');
      expect(dockerfile).toContain('EXPOSE 3000');
    });

    it('should generate docker-compose for multiple themes', async () => {
      const themes = ['mate-dealer', 'portal_security', 'infra_story-reporter'];
      const composeYaml = await containerEnv.generateCompose(themes);

      expect(composeYaml).toBeDefined();
      expect(composeYaml).toContain('version:');
      expect(composeYaml).toContain('services:');
      expect(composeYaml).toContain('mate-dealer:');
      expect(composeYaml).toContain('portal-security:');
      expect(composeYaml).toContain('infra-story-reporter:');
    });
  });
});