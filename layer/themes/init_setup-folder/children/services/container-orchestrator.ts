import { DockerSetupService, DockerSetupOptions } from './docker-setup';
import { QEMUSetupService, QEMUSetupOptions, QEMUContainer } from './qemu-setup';
import { fs } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';
import { getFileAPI, FileType } from '../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


export type ContainerRuntime = 'docker' | 'qemu';
export type Environment = 'local' | 'dev' | 'dev-demo' | 'demo' | 'release';

export interface ContainerConfig {
  name: string;
  runtime: ContainerRuntime;
  environment: Environment;
  baseImage: string;
  architecture?: 'x86_64' | 'aarch64' | 'armv7' | 'riscv64' | 'mips64';
  ports?: number[];
  volumes?: string[];
  memory?: string;
  cpus?: number;
  enableDebug?: boolean;
  enableHotReload?: boolean;
  cppSupport?: boolean;
  buildArgs?: Record<string, string>;
  environmentVars?: Record<string, string>;
}

export interface OrchestratorConfig {
  projects: ContainerConfig[];
  defaultRuntime: ContainerRuntime;
  networkName?: string;
  registryUrl?: string;
}

export interface DeploymentStatus {
  name: string;
  runtime: ContainerRuntime;
  status: 'running' | 'stopped' | "building" | 'error';
  containerId?: string;
  ports?: Array<{ host: number; container: number }>;
  startedAt?: Date;
  error?: string;
}

export class ContainerOrchestrator {
  private dockerService: DockerSetupService;
  private qemuService: QEMUSetupService;
  private deployments: Map<string, DeploymentStatus> = new Map();
  private configPath: string;

  constructor() {
    this.dockerService = new DockerSetupService();
    this.qemuService = new QEMUSetupService();
    this.configPath = path.join(process.cwd(), '.orchestrator');
    this.initializeOrchestrator();
    this.loadDeployments();
  }

  private async initializeOrchestrator(): void {
    if (!fs.existsSync(this.configPath)) {
      await fileAPI.createDirectory(this.configPath);
    }
  }

  private async loadDeployments(): void {
    const stateFile = path.join(this.configPath, 'deployments.json');
    if (fs.existsSync(stateFile)) {
      const data = JSON.parse(fileAPI.readFileSync(stateFile, 'utf-8'));
      for (const deployment of data) {
        this.deployments.set(deployment.name, deployment);
      }
    }
  }

  private async saveDeployments(): void {
    const stateFile = path.join(this.configPath, 'deployments.json');
    const data = Array.from(this.deployments.values());
    await fileAPI.createFile(stateFile, JSON.stringify(data, { type: FileType.TEMPORARY }));
  }

  async deployProject(config: ContainerConfig): Promise<DeploymentStatus> {
    console.log(`Deploying project: ${config.name} using ${config.runtime}`);
    
    const deployment: DeploymentStatus = {
      name: config.name,
      runtime: config.runtime,
      status: "building"
    };
    
    this.deployments.set(config.name, deployment);
    this.saveDeployments();
    
    try {
      if (config.runtime === 'docker') {
        await this.deployWithDocker(config, deployment);
      } else if (config.runtime === 'qemu') {
        await this.deployWithQEMU(config, deployment);
      } else {
        throw new Error(`Unsupported runtime: ${config.runtime}`);
      }
      
      deployment.status = 'running';
      deployment.startedAt = new Date();
    } catch (error) {
      deployment.status = 'error';
      deployment.error = error instanceof Error ? error.message : String(error);
      console.error(`Deployment failed for ${config.name}:`, error);
    }
    
    this.saveDeployments();
    return deployment;
  }

  private async deployWithDocker(config: ContainerConfig, deployment: DeploymentStatus): Promise<void> {
    const dockerOptions: DockerSetupOptions = {
      projectName: config.name,
      environment: config.environment,
      baseImage: config.baseImage,
      ports: config.ports,
      volumes: config.volumes,
      buildArgs: config.buildArgs,
      enableDebug: config.enableDebug,
      enableHotReload: config.enableHotReload,
      cppSupport: config.cppSupport
    };
    
    // Setup Docker environment
    await this.dockerService.setupDockerEnvironment(dockerOptions);
    
    // Build image
    await this.dockerService.buildImage(dockerOptions);
    
    // Run container
    await this.dockerService.runContainer(dockerOptions);
    
    // Store container ID (simplified - would need actual Docker API integration)
    deployment.containerId = `docker-${config.name}-${config.environment}`;
    
    if (config.ports) {
      const envOffset = this.getPortOffset(config.environment);
      deployment.ports = config.ports.map(p => ({
        host: p + envOffset,
        container: p
      }));
    }
  }

  private async deployWithQEMU(config: ContainerConfig, deployment: DeploymentStatus): Promise<void> {
    const qemuOptions: QEMUSetupOptions = {
      name: config.name,
      architecture: config.architecture || 'x86_64',
      memory: config.memory || '2G',
      cpus: config.cpus || 2,
      diskSize: '10G',
      image: config.baseImage,
      networkMode: 'nat',
      ports: config.ports?.map(p => ({
        host: p + this.getPortOffset(config.environment),
        guest: p
      })),
      volumes: config.volumes?.map(v => {
        const [host, guest] = v.split(':');
        return { host, guest, readonly: false };
      }),
      enableKVM: config.environment === 'release',
      enableDebug: config.enableDebug,
      enableVNC: config.environment !== 'release',
      environment: config.environmentVars
    };
    
    // Create and start QEMU container
    const container = await this.qemuService.createContainer(qemuOptions);
    await this.qemuService.startContainer(container.id);
    
    deployment.containerId = container.id;
    deployment.ports = container.ports.map(p => ({
      host: p.host,
      container: p.guest
    }));
  }

  private async getPortOffset(environment: Environment): number {
    const offsets: Record<Environment, number> = {
      'local': 0,
      'dev': 0,
      'dev-demo': 1000,
      'demo': 2000,
      'release': -2920 // Maps to port 80
    };
    return offsets[environment];
  }

  async deployMultiple(configs: ContainerConfig[]): Promise<DeploymentStatus[]> {
    console.log(`Deploying ${configs.length} projects...`);
    
    const deployments: DeploymentStatus[] = [];
    
    // Deploy in parallel where possible
    const dockerConfigs = configs.filter(c => c.runtime === 'docker');
    const qemuConfigs = configs.filter(c => c.runtime === 'qemu');
    
    // Deploy Docker containers in parallel
    const dockerPromises = dockerConfigs.map(config => this.deployProject(config));
    
    // Deploy QEMU containers sequentially (to avoid resource conflicts)
    const qemuDeployments: DeploymentStatus[] = [];
    for (const config of qemuConfigs) {
      const deployment = await this.deployProject(config);
      qemuDeployments.push(deployment);
    }
    
    // Wait for Docker deployments
    const dockerDeployments = await Promise.all(dockerPromises);
    
    deployments.push(...dockerDeployments, ...qemuDeployments);
    
    console.log(`Successfully deployed ${deployments.filter(d => d.status === 'running').length} projects`);
    
    return deployments;
  }

  async stopProject(name: string): Promise<void> {
    const deployment = this.deployments.get(name);
    if (!deployment) {
      throw new Error(`Deployment not found: ${name}`);
    }
    
    console.log(`Stopping project: ${name}`);
    
    if (deployment.runtime === 'docker') {
      const dockerOptions: DockerSetupOptions = {
        projectName: name,
        environment: 'dev' // Default, would need to store actual environment
      };
      await this.dockerService.stopContainer(dockerOptions);
    } else if (deployment.runtime === 'qemu' && deployment.containerId) {
      await this.qemuService.stopContainer(deployment.containerId);
    }
    
    deployment.status = 'stopped';
    this.saveDeployments();
    
    console.log(`Project stopped: ${name}`);
  }

  async stopAll(): Promise<void> {
    console.log('Stopping all deployments...');
    
    const runningDeployments = Array.from(this.deployments.values())
      .filter(d => d.status === 'running');
    
    for (const deployment of runningDeployments) {
      try {
        await this.stopProject(deployment.name);
      } catch (error) {
        console.error(`Failed to stop ${deployment.name}:`, error);
      }
    }
    
    console.log('All deployments stopped');
  }

  async removeProject(name: string): Promise<void> {
    const deployment = this.deployments.get(name);
    if (!deployment) {
      throw new Error(`Deployment not found: ${name}`);
    }
    
    // Stop if running
    if (deployment.status === 'running') {
      await this.stopProject(name);
    }
    
    console.log(`Removing project: ${name}`);
    
    if (deployment.runtime === 'qemu' && deployment.containerId) {
      await this.qemuService.removeContainer(deployment.containerId);
    }
    
    // Remove from deployments
    this.deployments.delete(name);
    this.saveDeployments();
    
    console.log(`Project removed: ${name}`);
  }

  async listDeployments(all: boolean = false): Promise<DeploymentStatus[]> {
    const deployments = Array.from(this.deployments.values());
    
    if (!all) {
      return deployments.filter(d => d.status === 'running');
    }
    
    return deployments;
  }

  async getDeploymentStatus(name: string): Promise<DeploymentStatus | undefined> {
    return this.deployments.get(name);
  }

  async exportConfiguration(outputPath: string): Promise<void> {
    const config: OrchestratorConfig = {
      projects: await this.generateProjectConfigs(),
      defaultRuntime: 'docker',
      networkName: 'aidev-network'
    };
    
    await fileAPI.createFile(outputPath, JSON.stringify(config, { type: FileType.TEMPORARY }));
    console.log(`Configuration exported to: ${outputPath}`);
  }

  private async generateProjectConfigs(): Promise<ContainerConfig[]> {
    const configs: ContainerConfig[] = [];
    
    for (const [name, deployment] of this.deployments) {
      configs.push({
        name,
        runtime: deployment.runtime,
        environment: 'dev', // Would need to store actual environment
        baseImage: 'node:18-alpine', // Would need to store actual image
        ports: deployment.ports?.map(p => p.container)
      });
    }
    
    return configs;
  }

  async importConfiguration(configPath: string): Promise<void> {
    if (!fs.existsSync(configPath)) {
      throw new Error(`Configuration file not found: ${configPath}`);
    }
    
    const config: OrchestratorConfig = JSON.parse(fileAPI.readFileSync(configPath, 'utf-8'));
    
    console.log(`Importing configuration with ${config.projects.length} projects`);
    
    await this.deployMultiple(config.projects);
  }

  async createDockerCompose(projects: ContainerConfig[], outputPath: string): Promise<void> {
    const compose = {
      version: '3.8',
      services: {} as any,
      networks: {
        'aidev-network': {
          driver: 'bridge'
        }
      },
      volumes: {} as any
    };
    
    for (const project of projects) {
      if (project.runtime !== 'docker') continue;
      
      const service: any = {
        build: {
          context: `./${project.name}`,
          dockerfile: `docker/Dockerfile.${project.environment}`
        },
        container_name: `${project.name}-${project.environment}`,
        environment: project.environmentVars || {},
        networks: ['aidev-network']
      };
      
      if (project.ports) {
        const offset = this.getPortOffset(project.environment);
        service.ports = project.ports.map(p => `${p + offset}:${p}`);
      }
      
      if (project.volumes) {
        service.volumes = project.volumes;
      }
      
      if (project.environment === 'release') {
        service.deploy = {
          replicas: 2,
          resources: {
            limits: { cpus: '2', memory: '2G' },
            reservations: { cpus: '0.5', memory: '512M' }
          }
        };
      }
      
      compose.services[project.name] = service;
    }
    
    const yamlContent = this.toYaml(compose);
    await fileAPI.createFile(outputPath, yamlContent, { type: FileType.TEMPORARY });
    
    console.log(`Docker Compose file created: ${outputPath}`);
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

  async healthCheck(): Promise<Record<string, any>> {
    const health: Record<string, any> = {
      orchestrator: 'healthy',
      deployments: {
        total: this.deployments.size,
        running: 0,
        stopped: 0,
        error: 0
      },
      runtimes: {
        docker: { available: await this.checkDockerAvailable() },
        qemu: { available: await this.checkQEMUAvailable() }
      }
    };
    
    for (const deployment of this.deployments.values()) {
      health.deployments[deployment.status]++;
    }
    
    return health;
  }

  private async checkDockerAvailable(): Promise<boolean> {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      await execAsync('docker --version');
      return true;
    } catch {
      return false;
    }
  }

  private async checkQEMUAvailable(): Promise<boolean> {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      await execAsync('qemu-system-x86_64 --version');
      return true;
    } catch {
      return false;
    }
  }
}