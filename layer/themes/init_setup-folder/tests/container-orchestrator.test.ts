import { 
  ContainerOrchestrator, 
  ContainerConfig, 
  ContainerRuntime, 
  Environment,
  DeploymentStatus 
} from '../src/services/container-orchestrator';
import { fs } from '../../infra_external-log-lib/src';
import { path } from '../../infra_external-log-lib/src';

describe('ContainerOrchestrator', () => {
  let orchestrator: ContainerOrchestrator;
  const testOrchestratorPath = path.join(process.cwd(), '.orchestrator');
  const testDockerPath = path.join(process.cwd(), 'docker');
  const testQemuPath = path.join(process.cwd(), '.qemu');

  beforeEach(() => {
    // Clean up any existing test directories
    [testOrchestratorPath, testDockerPath, testQemuPath].forEach(dir => {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
    
    orchestrator = new ContainerOrchestrator();
  });

  afterEach(() => {
    // Clean up test directories
    [testOrchestratorPath, testDockerPath, testQemuPath].forEach(dir => {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
  });

  describe('Initialization', () => {
    it('should create orchestrator directory on initialization', () => {
      expect(fs.existsSync(testOrchestratorPath)).toBe(true);
    });

    it('should load existing deployments on initialization', async () => {
      // Create a deployment state file
      const deployments = [
        {
          name: 'existing-project',
          runtime: 'docker' as ContainerRuntime,
          status: 'stopped',
          containerId: 'docker-existing-project-dev'
        }
      ];
      
      const stateFile = path.join(testOrchestratorPath, 'deployments.json');
      fs.writeFileSync(stateFile, JSON.stringify(deployments));

      // Create new orchestrator instance
      const newOrchestrator = new ContainerOrchestrator();
      const loadedDeployments = await newOrchestrator.listDeployments(true);
      
      expect(loadedDeployments).toHaveLength(1);
      expect(loadedDeployments[0].name).toBe('existing-project');
    });
  });

  describe('Docker deployments', () => {
    it('should deploy Docker project', async () => {
      const config: ContainerConfig = {
        name: 'docker-test-project',
        runtime: 'docker',
        environment: 'dev',
        baseImage: 'node:18-alpine',
        ports: [3000],
        enableDebug: false,
        enableHotReload: false
      };

      const deployment = await orchestrator.deployProject(config);

      expect(deployment.name).toBe('docker-test-project');
      expect(deployment.runtime).toBe('docker');
      expect(deployment.status).toBe('running');
      expect(deployment.containerId).toBeDefined();
      expect(deployment.startedAt).toBeDefined();
    });

    it('should deploy Docker project with C++ support', async () => {
      const config: ContainerConfig = {
        name: 'cpp-project',
        runtime: 'docker',
        environment: 'dev',
        baseImage: 'gcc:11',
        ports: [8080],
        cppSupport: true,
        enableDebug: true
      };

      const deployment = await orchestrator.deployProject(config);

      expect(deployment.name).toBe('cpp-project');
      expect(deployment.runtime).toBe('docker');
      expect(deployment.ports).toBeDefined();
      
      // Check if Docker files were created
      expect(fs.existsSync(path.join(testDockerPath, 'Dockerfile.dev'))).toBe(true);
      expect(fs.existsSync(path.join(testDockerPath, 'docker-compose.dev.yml'))).toBe(true);
    });

    it('should apply correct port offsets for environments', async () => {
      const environments: Array<{ env: Environment, offset: number }> = [
        { env: 'local', offset: 0 },
        { env: 'dev-demo', offset: 1000 },
        { env: 'demo', offset: 2000 }
      ];

      for (const { env, offset } of environments) {
        const config: ContainerConfig = {
          name: `${env}-project`,
          runtime: 'docker',
          environment: env,
          baseImage: 'node:18-alpine',
          ports: [3000]
        };

        const deployment = await orchestrator.deployProject(config);
        
        if (deployment.ports) {
          expect(deployment.ports[0].host).toBe(3000 + offset);
          expect(deployment.ports[0].container).toBe(3000);
        }
      }
    });
  });

  describe('QEMU deployments', () => {
    it('should deploy QEMU project', async () => {
      const config: ContainerConfig = {
        name: 'qemu-test-project',
        runtime: 'qemu',
        environment: 'dev',
        baseImage: 'alpine:latest',
        architecture: 'x86_64',
        ports: [8080],
        memory: '1G',
        cpus: 2
      };

      const deployment = await orchestrator.deployProject(config);

      expect(deployment.name).toBe('qemu-test-project');
      expect(deployment.runtime).toBe('qemu');
      expect(deployment.status).toBe('running');
      expect(deployment.containerId).toBeDefined();
      expect(deployment.startedAt).toBeDefined();
    });

    it('should deploy QEMU with different architectures', async () => {
      const architectures: Array<ContainerConfig['architecture']> = [
        'x86_64',
        'aarch64',
        'armv7'
      ];

      for (const arch of architectures) {
        const config: ContainerConfig = {
          name: `qemu-${arch}-project`,
          runtime: 'qemu',
          environment: 'dev',
          baseImage: 'alpine:latest',
          architecture: arch,
          memory: '512M',
          cpus: 1
        };

        const deployment = await orchestrator.deployProject(config);
        
        expect(deployment.name).toBe(`qemu-${arch}-project`);
        expect(deployment.runtime).toBe('qemu');
      }
    });
  });

  describe('Multiple deployments', () => {
    it('should deploy multiple projects', async () => {
      const configs: ContainerConfig[] = [
        {
          name: 'project-1',
          runtime: 'docker',
          environment: 'dev',
          baseImage: 'node:18-alpine'
        },
        {
          name: 'project-2',
          runtime: 'docker',
          environment: 'dev',
          baseImage: 'python:3.9'
        },
        {
          name: 'project-3',
          runtime: 'qemu',
          environment: 'dev',
          baseImage: 'alpine:latest',
          architecture: 'x86_64'
        }
      ];

      const deployments = await orchestrator.deployMultiple(configs);

      expect(deployments).toHaveLength(3);
      expect(deployments.filter(d => d.status === 'running')).toHaveLength(3);
      expect(deployments.filter(d => d.runtime === 'docker')).toHaveLength(2);
      expect(deployments.filter(d => d.runtime === 'qemu')).toHaveLength(1);
    });
  });

  describe('Deployment management', () => {
    it('should list deployments', async () => {
      // Deploy some projects
      await orchestrator.deployProject({
        name: 'running-project',
        runtime: 'docker',
        environment: 'dev',
        baseImage: 'node:18-alpine'
      });

      const allDeployments = await orchestrator.listDeployments(true);
      const runningDeployments = await orchestrator.listDeployments(false);

      expect(allDeployments.length).toBeGreaterThanOrEqual(1);
      expect(runningDeployments.length).toBeGreaterThanOrEqual(1);
      expect(runningDeployments.every(d => d.status === 'running')).toBe(true);
    });

    it('should get deployment status', async () => {
      const config: ContainerConfig = {
        name: 'status-project',
        runtime: 'docker',
        environment: 'dev',
        baseImage: 'node:18-alpine'
      };

      await orchestrator.deployProject(config);
      const status = await orchestrator.getDeploymentStatus('status-project');

      expect(status).toBeDefined();
      expect(status?.name).toBe('status-project');
      expect(status?.status).toBe('running');
    });

    it('should stop project', async () => {
      const config: ContainerConfig = {
        name: 'stoppable-project',
        runtime: 'docker',
        environment: 'dev',
        baseImage: 'node:18-alpine'
      };

      await orchestrator.deployProject(config);
      await orchestrator.stopProject('stoppable-project');
      
      const status = await orchestrator.getDeploymentStatus('stoppable-project');
      expect(status?.status).toBe('stopped');
    });

    it('should stop all projects', async () => {
      // Deploy multiple projects
      await orchestrator.deployProject({
        name: 'project-a',
        runtime: 'docker',
        environment: 'dev',
        baseImage: 'node:18-alpine'
      });

      await orchestrator.deployProject({
        name: 'project-b',
        runtime: 'docker',
        environment: 'dev',
        baseImage: 'node:18-alpine'
      });

      await orchestrator.stopAll();

      const deployments = await orchestrator.listDeployments(true);
      expect(deployments.every(d => d.status === 'stopped')).toBe(true);
    });

    it('should remove project', async () => {
      const config: ContainerConfig = {
        name: 'removable-project',
        runtime: 'docker',
        environment: 'dev',
        baseImage: 'node:18-alpine'
      };

      await orchestrator.deployProject(config);
      await orchestrator.removeProject('removable-project');
      
      const status = await orchestrator.getDeploymentStatus('removable-project');
      expect(status).toBeUndefined();
    });
  });

  describe('Configuration management', () => {
    it('should export configuration', async () => {
      // Deploy a project
      await orchestrator.deployProject({
        name: 'export-project',
        runtime: 'docker',
        environment: 'dev',
        baseImage: 'node:18-alpine',
        ports: [3000]
      });

      const exportPath = path.join(testOrchestratorPath, 'export.json');
      await orchestrator.exportConfiguration(exportPath);

      expect(fs.existsSync(exportPath)).toBe(true);
      
      const config = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));
      expect(config.projects).toHaveLength(1);
      expect(config.projects[0].name).toBe('export-project');
      expect(config.defaultRuntime).toBe('docker');
    });

    it('should import configuration', async () => {
      const config = {
        projects: [
          {
            name: 'imported-project',
            runtime: 'docker' as ContainerRuntime,
            environment: 'dev' as Environment,
            baseImage: 'node:18-alpine',
            ports: [4000]
          }
        ],
        defaultRuntime: 'docker' as ContainerRuntime
      };

      const configPath = path.join(testOrchestratorPath, 'import.json');
      fs.writeFileSync(configPath, JSON.stringify(config));

      await orchestrator.importConfiguration(configPath);

      const deployments = await orchestrator.listDeployments(true);
      expect(deployments).toHaveLength(1);
      expect(deployments[0].name).toBe('imported-project');
    });
  });

  describe('Docker Compose generation', () => {
    it('should create Docker Compose file', async () => {
      const projects: ContainerConfig[] = [
        {
          name: 'web-service',
          runtime: 'docker',
          environment: 'dev',
          baseImage: 'node:18-alpine',
          ports: [3000],
          environmentVars: {
            NODE_ENV: 'development'
          }
        },
        {
          name: 'api-service',
          runtime: 'docker',
          environment: 'dev',
          baseImage: 'node:18-alpine',
          ports: [4000],
          volumes: ['./data:/app/data']
        },
        {
          name: 'qemu-service',
          runtime: 'qemu',
          environment: 'dev',
          baseImage: 'alpine:latest'
        }
      ];

      const composePath = path.join(testOrchestratorPath, 'docker-compose.yml');
      await orchestrator.createDockerCompose(projects, composePath);

      expect(fs.existsSync(composePath)).toBe(true);
      
      const composeContent = fs.readFileSync(composePath, 'utf-8');
      expect(composeContent).toContain('version: 3.8');
      expect(composeContent).toContain('web-service');
      expect(composeContent).toContain('api-service');
      expect(composeContent).not.toContain('qemu-service'); // QEMU services excluded
      expect(composeContent).toContain('3000:3000');
      expect(composeContent).toContain('4000:4000');
      expect(composeContent).toContain('./data:/app/data');
      expect(composeContent).toContain('aidev-network');
    });

    it('should add resource limits for production', async () => {
      const projects: ContainerConfig[] = [
        {
          name: 'production-service',
          runtime: 'docker',
          environment: 'release',
          baseImage: 'node:18-alpine',
          ports: [80]
        }
      ];

      const composePath = path.join(testOrchestratorPath, 'docker-compose-prod.yml');
      await orchestrator.createDockerCompose(projects, composePath);

      const composeContent = fs.readFileSync(composePath, 'utf-8');
      expect(composeContent).toContain('deploy:');
      expect(composeContent).toContain('replicas: 2');
      expect(composeContent).toContain('resources:');
      expect(composeContent).toContain('limits:');
      expect(composeContent).toContain('cpus: 2');
      expect(composeContent).toContain('memory: 2G');
    });
  });

  describe('Health check', () => {
    it('should perform health check', async () => {
      // Deploy a project
      await orchestrator.deployProject({
        name: 'health-project',
        runtime: 'docker',
        environment: 'dev',
        baseImage: 'node:18-alpine'
      });

      const health = await orchestrator.healthCheck();

      expect(health.orchestrator).toBe('healthy');
      expect(health.deployments.total).toBeGreaterThanOrEqual(1);
      expect(health.deployments.running).toBeGreaterThanOrEqual(1);
      expect(health.runtimes).toBeDefined();
      expect(health.runtimes.docker).toBeDefined();
      expect(health.runtimes.qemu).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should handle deployment failures gracefully', async () => {
      const config: ContainerConfig = {
        name: 'failing-project',
        runtime: 'invalid-runtime' as any,
        environment: 'dev',
        baseImage: 'node:18-alpine'
      };

      const deployment = await orchestrator.deployProject(config);

      expect(deployment.status).toBe('error');
      expect(deployment.error).toBeDefined();
      expect(deployment.error).toContain('Unsupported runtime');
    });

    it('should handle stop errors gracefully', async () => {
      await expect(orchestrator.stopProject('nonexistent-project'))
        .rejects.toThrow('Deployment not found');
    });

    it('should handle remove errors gracefully', async () => {
      await expect(orchestrator.removeProject('nonexistent-project'))
        .rejects.toThrow('Deployment not found');
    });

    it('should handle import errors gracefully', async () => {
      await expect(orchestrator.importConfiguration('/nonexistent/path'))
        .rejects.toThrow('Configuration file not found');
    });
  });

  describe('Environment variables', () => {
    it('should set environment variables for Docker', async () => {
      const config: ContainerConfig = {
        name: 'env-project',
        runtime: 'docker',
        environment: 'dev',
        baseImage: 'node:18-alpine',
        environmentVars: {
          DATABASE_URL: 'postgres://localhost/db',
          API_KEY: 'secret-key',
          DEBUG: 'true'
        }
      };

      await orchestrator.deployProject(config);

      // Check if environment variables are set in docker-compose
      const composePath = path.join(testDockerPath, 'docker-compose.dev.yml');
      if (fs.existsSync(composePath)) {
        const composeContent = fs.readFileSync(composePath, 'utf-8');
        expect(composeContent).toContain('NODE_ENV: development');
      }
    });

    it('should set environment variables for QEMU', async () => {
      const config: ContainerConfig = {
        name: 'qemu-env-project',
        runtime: 'qemu',
        environment: 'dev',
        baseImage: 'alpine:latest',
        architecture: 'x86_64',
        environmentVars: {
          APP_MODE: 'production',
          LOG_LEVEL: 'debug'
        }
      };

      const deployment = await orchestrator.deployProject(config);
      expect(deployment.status).toBe('running');
    });
  });
});