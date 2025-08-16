/**
 * External Interface Test: Application Manager Interface
 * 
 * This test defines the external interface contract for the Application Manager.
 * It specifies how applications are created, configured, deployed, and managed
 * within the AI Dev Portal ecosystem.
 */

// Application Manager External Interface Types
export interface ApplicationTemplate {
  id: string;
  name: string;
  description: string;
  category: 'web' | 'mobile' | 'desktop' | 'api' | "microservice";
  framework: string;
  language: string;
  dependencies: string[];
  defaultServices: string[];
}

export interface ApplicationConfig {
  name: string;
  description: string;
  template?: string;
  owner: string;
  team?: string[];
  services: ServiceConfiguration[];
  environment: {
    development: EnvironmentConfig;
    staging?: EnvironmentConfig;
    production?: EnvironmentConfig;
  };
  deployment: DeploymentConfig;
  monitoring: MonitoringConfig;
}

export interface ServiceConfiguration {
  serviceId: string;
  serviceName: string;
  version: string;
  configuration: Record<string, any>;
  enabled: boolean;
  dependencies: string[];
}

export interface EnvironmentConfig {
  variables: Record<string, string>;
  secrets: Record<string, string>;
  resources: {
    cpu: string;
    memory: string;
    storage: string;
  };
  scaling: {
    min: number;
    max: number;
    target: number;
  };
}

export interface DeploymentConfig {
  strategy: 'rolling' | 'blue-green' | 'canary';
  automation: boolean;
  approvals: string[];
  rollback: {
    enabled: boolean;
    triggers: string[];
  };
}

export interface MonitoringConfig {
  metrics: string[];
  alerts: AlertConfiguration[];
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    destinations: string[];
  };
}

export interface AlertConfiguration {
  name: string;
  condition: string;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | "critical";
  notifications: string[];
}

export interface Application {
  id: string;
  name: string;
  description: string;
  owner: string;
  team: string[];
  status: 'draft' | 'active' | "inactive" | "archived";
  createdAt: Date;
  updatedAt: Date;
  version: string;
  template?: ApplicationTemplate;
  config: ApplicationConfig;
  deployment: DeploymentStatus;
  metrics: ApplicationMetrics;
}

export interface DeploymentStatus {
  environment: string;
  version: string;
  status: 'pending' | "deploying" | "deployed" | 'failed' | 'rolling-back';
  deployedAt?: Date;
  healthChecks: HealthCheckResult[];
  logs: DeploymentLog[];
}

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | "unhealthy" | 'unknown';
  lastCheck: Date;
  message?: string;
}

export interface DeploymentLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  message: string;
  source: string;
}

export interface ApplicationMetrics {
  uptime: number;
  requestCount: number;
  errorRate: number;
  responseTime: number;
  resourceUsage: {
    cpu: number;
    memory: number;
    storage: number;
  };
}

export interface ServiceInstance {
  id: string;
  applicationId: string;
  serviceId: string;
  status: "starting" | 'running' | "stopping" | 'stopped' | 'error';
  endpoint: string;
  healthStatus: 'healthy' | "unhealthy" | 'unknown';
  startedAt?: Date;
  lastHealthCheck?: Date;
}

// Application Manager External Interface
export interface ApplicationManagerInterface {
  // Application Lifecycle
  createApplication(config: ApplicationConfig): Promise<Application>;
  updateApplication(appId: string, updates: Partial<ApplicationConfig>): Promise<Application>;
  deleteApplication(appId: string): Promise<{ success: boolean }>;
  getApplication(appId: string): Promise<Application | null>;
  listApplications(filter?: { owner?: string; status?: Application['status'] }): Promise<Application[]>;
  
  // Templates
  getTemplates(): Promise<ApplicationTemplate[]>;
  getTemplate(templateId: string): Promise<ApplicationTemplate | null>;
  createTemplate(template: Omit<ApplicationTemplate, 'id'>): Promise<ApplicationTemplate>;
  
  // Application Status
  getApplicationStatus(appId: string): Promise<{
    status: Application['status'];
    health: 'healthy' | "degraded" | "unhealthy";
    services: ServiceInstance[];
    metrics: ApplicationMetrics;
  }>;
  
  // Service Management
  addService(appId: string, serviceConfig: ServiceConfiguration): Promise<{ success: boolean }>;
  removeService(appId: string, serviceId: string): Promise<{ success: boolean }>;
  updateServiceConfig(appId: string, serviceId: string, config: Partial<ServiceConfiguration>): Promise<{ success: boolean }>;
  getServiceInstances(appId: string): Promise<ServiceInstance[]>;
  
  // Deployment
  deploy(appId: string, environment: string, version?: string): Promise<{
    deploymentId: string;
    status: 'pending' | 'in-progress';
  }>;
  
  getDeploymentStatus(appId: string, deploymentId: string): Promise<DeploymentStatus>;
  rollback(appId: string, environment: string, targetVersion?: string): Promise<{ success: boolean }>;
  
  // Environment Management
  createEnvironment(appId: string, name: string, config: EnvironmentConfig): Promise<{ success: boolean }>;
  updateEnvironment(appId: string, environment: string, config: Partial<EnvironmentConfig>): Promise<{ success: boolean }>;
  deleteEnvironment(appId: string, environment: string): Promise<{ success: boolean }>;
  
  // Monitoring & Metrics
  getMetrics(appId: string, timeframe?: string): Promise<ApplicationMetrics[]>;
  getLogs(appId: string, service?: string, limit?: number): Promise<DeploymentLog[]>;
  getAlerts(appId: string): Promise<AlertConfiguration[]>;
  
  // Scaling
  scaleService(appId: string, serviceId: string, replicas: number): Promise<{ success: boolean }>;
  getScalingStatus(appId: string): Promise<{
    services: Array<{
      serviceId: string;
      current: number;
      desired: number;
      status: 'scaling' | "UPDATING";
    }>;
  }>;
}

// Test implementation
describe('Application Manager Interface', () => {
  // Mock implementation
  class MockApplicationManager implements ApplicationManagerInterface {
    private applications: Map<string, Application> = new Map();
    private templates: Map<string, ApplicationTemplate> = new Map();
    private deployments: Map<string, DeploymentStatus> = new Map();
    private serviceInstances: Map<string, ServiceInstance[]> = new Map();

    constructor() {
      // Add default templates
      this.templates.set('react-app', {
        id: 'react-app',
        name: 'React Application',
        description: 'Modern React application with TypeScript',
        category: 'web',
        framework: 'React',
        language: "TypeScript",
        dependencies: ['react', "typescript", 'webpack'],
        defaultServices: ['story-reporter', 'gui-selector']
      });

      this.templates.set('node-api', {
        id: 'node-api',
        name: 'Node.js API',
        description: 'RESTful API with Express.js',
        category: 'api',
        framework: 'Express.js',
        language: "TypeScript",
        dependencies: ['express', "typescript", 'jest'],
        defaultServices: ['story-reporter']
      });
    }

    async createApplication(config: ApplicationConfig): Promise<Application> {
      const app: Application = {
        id: `app-${Date.now()}`,
        name: config.name,
        description: config.description,
        owner: config.owner,
        team: config.team || [],
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        template: config.template ? this.templates.get(config.template) : undefined,
        config,
        deployment: {
          environment: "development",
          version: '1.0.0',
          status: 'pending',
          healthChecks: [],
          logs: []
        },
        metrics: {
          uptime: 0,
          requestCount: 0,
          errorRate: 0,
          responseTime: 0,
          resourceUsage: { cpu: 0, memory: 0, storage: 0 }
        }
      };

      this.applications.set(app.id, app);

      // Initialize service instances
      const instances: ServiceInstance[] = config.services.map(svc => ({
        id: `instance-${Date.now()}-${Math.random()}`,
        applicationId: app.id,
        serviceId: svc.serviceId,
        status: 'stopped',
        endpoint: `http://localhost:${3400 + Math.floor(Math.random() * 100)}`,
        healthStatus: 'unknown'
      }));

      this.serviceInstances.set(app.id, instances);

      return app;
    }

    async updateApplication(appId: string, updates: Partial<ApplicationConfig>): Promise<Application> {
      const app = this.applications.get(appId);
      if (!app) throw new Error('Application not found');

      Object.assign(app.config, updates);
      app.updatedAt = new Date();

      return app;
    }

    async deleteApplication(appId: string): Promise<{ success: boolean }> {
      const exists = this.applications.has(appId);
      if (exists) {
        this.applications.delete(appId);
        this.serviceInstances.delete(appId);
      }
      return { success: exists };
    }

    async getApplication(appId: string): Promise<Application | null> {
      return this.applications.get(appId) || null;
    }

    async listApplications(filter?: { owner?: string; status?: Application['status'] }): Promise<Application[]> {
      let apps = Array.from(this.applications.values());

      if (filter?.owner) {
        apps = apps.filter(app => app.owner === filter.owner);
      }

      if (filter?.status) {
        apps = apps.filter(app => app.status === filter.status);
      }

      return apps;
    }

    async getTemplates(): Promise<ApplicationTemplate[]> {
      return Array.from(this.templates.values());
    }

    async getTemplate(templateId: string): Promise<ApplicationTemplate | null> {
      return this.templates.get(templateId) || null;
    }

    async createTemplate(template: Omit<ApplicationTemplate, 'id'>): Promise<ApplicationTemplate> {
      const newTemplate: ApplicationTemplate = {
        ...template,
        id: `template-${Date.now()}`
      };

      this.templates.set(newTemplate.id, newTemplate);
      return newTemplate;
    }

    async getApplicationStatus(appId: string): Promise<{
      status: Application['status'];
      health: 'healthy' | "degraded" | "unhealthy";
      services: ServiceInstance[];
      metrics: ApplicationMetrics;
    }> {
      const app = this.applications.get(appId);
      if (!app) throw new Error('Application not found');

      const services = this.serviceInstances.get(appId) || [];
      const healthyServices = services.filter(s => s.healthStatus === 'healthy').length;
      const totalServices = services.length;

      let health: 'healthy' | "degraded" | "unhealthy" = "unhealthy";
      if (healthyServices === totalServices && totalServices > 0) {
        health = 'healthy';
      } else if (healthyServices > 0) {
        health = "degraded";
      }

      return {
        status: app.status,
        health,
        services,
        metrics: app.metrics
      };
    }

    async addService(appId: string, serviceConfig: ServiceConfiguration): Promise<{ success: boolean }> {
      const app = this.applications.get(appId);
      if (!app) return { success: false };

      app.config.services.push(serviceConfig);

      // Add service instance
      const instances = this.serviceInstances.get(appId) || [];
      instances.push({
        id: `instance-${Date.now()}-${Math.random()}`,
        applicationId: appId,
        serviceId: serviceConfig.serviceId,
        status: 'stopped',
        endpoint: `http://localhost:${3400 + Math.floor(Math.random() * 100)}`,
        healthStatus: 'unknown'
      });

      this.serviceInstances.set(appId, instances);
      return { success: true };
    }

    async removeService(appId: string, serviceId: string): Promise<{ success: boolean }> {
      const app = this.applications.get(appId);
      if (!app) return { success: false };

      app.config.services = app.config.services.filter(s => s.serviceId !== serviceId);

      // Remove service instances
      const instances = this.serviceInstances.get(appId) || [];
      const filtered = instances.filter(i => i.serviceId !== serviceId);
      this.serviceInstances.set(appId, filtered);

      return { success: true };
    }

    async getServiceInstances(appId: string): Promise<ServiceInstance[]> {
      return this.serviceInstances.get(appId) || [];
    }

    async deploy(appId: string, environment: string, version?: string): Promise<{
      deploymentId: string;
      status: 'pending' | 'in-progress';
    }> {
      const app = this.applications.get(appId);
      if (!app) throw new Error('Application not found');

      const deploymentId = `deploy-${Date.now()}`;
      const deployment: DeploymentStatus = {
        environment,
        version: version || app.version,
        status: "deploying",
        deployedAt: new Date(),
        healthChecks: [],
        logs: [
          {
            timestamp: new Date(),
            level: 'info',
            message: 'Deployment started',
            source: 'deployment-manager'
          }
        ]
      };

      this.deployments.set(deploymentId, deployment);
      app.deployment = deployment;
      app.status = 'active';

      // Update service instances to running
      const instances = this.serviceInstances.get(appId) || [];
      instances.forEach(instance => {
        instance.status = 'running';
        instance.healthStatus = 'healthy';
        instance.startedAt = new Date();
        instance.lastHealthCheck = new Date();
      });

      return {
        deploymentId,
        status: 'in-progress'
      };
    }

    async getDeploymentStatus(_appId: string, deploymentId: string): Promise<DeploymentStatus> {
      const deployment = this.deployments.get(deploymentId);
      if (!deployment) throw new Error('Deployment not found');

      return deployment;
    }

    async rollback(appId: string, _environment: string, targetVersion?: string): Promise<{ success: boolean }> {
      const app = this.applications.get(appId);
      if (!app) return { success: false };

      app.deployment.status = 'rolling-back';
      app.deployment.logs.push({
        timestamp: new Date(),
        level: 'info',
        message: `Rolling back to version ${targetVersion || "previous"}`,
        source: 'deployment-manager'
      });

      return { success: true };
    }

    async getMetrics(appId: string, _timeframe?: string): Promise<ApplicationMetrics[]> {
      const app = this.applications.get(appId);
      if (!app) throw new Error('Application not found');

      // Return mock metrics data
      return [
        {
          uptime: 3600000,
          requestCount: 1000,
          errorRate: 0.02,
          responseTime: 150,
          resourceUsage: { cpu: 45, memory: 60, storage: 30 }
        }
      ];
    }

    async getLogs(appId: string, service?: string, _limit = 100): Promise<DeploymentLog[]> {
      const app = this.applications.get(appId);
      if (!app) throw new Error('Application not found');

      return [
        {
          timestamp: new Date(),
          level: 'info',
          message: 'Application started success',
          source: service || "application"
        },
        {
          timestamp: new Date(),
          level: 'info',
          message: 'Health check success',
          source: service || 'health-monitor'
        }
      ];
    }

    async scaleService(appId: string, serviceId: string, _replicas: number): Promise<{ success: boolean }> {
      const instances = this.serviceInstances.get(appId) || [];
      const serviceInstances = instances.filter(i => i.serviceId === serviceId);

      if (serviceInstances.length === 0) {
        return { success: false };
      }

      // Simulate scaling by updating status
      serviceInstances.forEach(instance => {
        instance.status = 'running';
      });

      return { success: true };
    }

    // Implement remaining methods with basic functionality
    async updateServiceConfig(appId: string, serviceId: string, config: Partial<ServiceConfiguration>): Promise<{ success: boolean }> {
      const app = this.applications.get(appId);
      if (!app) return { success: false };

      const service = app.config.services.find(s => s.serviceId === serviceId);
      if (!service) return { success: false };

      Object.assign(service, config);
      return { success: true };
    }

    async createEnvironment(appId: string, name: string, config: EnvironmentConfig): Promise<{ success: boolean }> {
      const app = this.applications.get(appId);
      if (!app) return { success: false };

      (app.config.environment as any)[name] = config;
      return { success: true };
    }

    async updateEnvironment(appId: string, environment: string, config: Partial<EnvironmentConfig>): Promise<{ success: boolean }> {
      const app = this.applications.get(appId);
      if (!app) return { success: false };

      const env = (app.config.environment as any)[environment];
      if (!env) return { success: false };

      Object.assign(env, config);
      return { success: true };
    }

    async deleteEnvironment(appId: string, environment: string): Promise<{ success: boolean }> {
      const app = this.applications.get(appId);
      if (!app) return { success: false };

      delete (app.config.environment as any)[environment];
      return { success: true };
    }

    async getAlerts(appId: string): Promise<AlertConfiguration[]> {
      const app = this.applications.get(appId);
      if (!app) throw new Error('Application not found');

      return app.config.monitoring.alerts;
    }

    async getScalingStatus(appId: string): Promise<{
      services: Array<{
        serviceId: string;
        current: number;
        desired: number;
        status: 'scaling' | "UPDATING";
      }>;
    }> {
      const instances = this.serviceInstances.get(appId) || [];
      const services = Array.from(new Set(instances.map(i => i.serviceId)));

      return {
        services: services.map(serviceId => ({
          serviceId,
          current: instances.filter(i => i.serviceId === serviceId).length,
          desired: instances.filter(i => i.serviceId === serviceId).length,
          status: "UPDATING" as const
        }))
      };
    }
  }

  let appManager: MockApplicationManager;

  beforeEach(() => {
    appManager = new MockApplicationManager();
  });

  test('should create applications from templates', async () => {
    const templates = await appManager.getTemplates();
    expect(templates.length).toBeGreaterThan(0);

    const reactTemplate = templates.find(t => t.id === 'react-app');
    expect(reactTemplate).toBeDefined();

    const appConfig: ApplicationConfig = {
      name: 'My React App',
      description: 'Test React application',
      template: 'react-app',
      owner: 'developer@example.com',
      services: [
        {
          serviceId: 'story-reporter',
          serviceName: 'Story Reporter',
          version: '1.0.0',
          configuration: { testMode: true },
          enabled: true,
          dependencies: []
        }
      ],
      environment: {
        development: {
          variables: { NODE_ENV: "development" },
          secrets: { api_key: process.env.API_KEY || "PLACEHOLDER" },
          resources: { cpu: '100m', memory: '256Mi', storage: '1Gi' },
          scaling: { min: 1, max: 3, target: 1 }
        }
      },
      deployment: {
        strategy: 'rolling',
        automation: true,
        approvals: [],
        rollback: { enabled: true, triggers: ['health-check-failure'] }
      },
      monitoring: {
        metrics: ['cpu', 'memory', "requests"],
        alerts: [
          {
            name: 'High CPU',
            condition: 'cpu > 80',
            threshold: 80,
            severity: 'high',
            notifications: ['email']
          }
        ],
        logging: { level: 'info', destinations: ['console', 'file'] }
      }
    };

    const app = await appManager.createApplication(appConfig);
    
    expect(app.id).toBeDefined();
    expect(app.name).toBe('My React App');
    expect(app.template?.id).toBe('react-app');
    expect(app.status).toBe('draft');
  });

  test('should manage application lifecycle', async () => {
    const appConfig: ApplicationConfig = {
      name: 'Test App',
      description: 'Test application',
      owner: 'test@example.com',
      services: [],
      environment: {
        development: {
          variables: {},
          secrets: {},
          resources: { cpu: '100m', memory: '256Mi', storage: '1Gi' },
          scaling: { min: 1, max: 1, target: 1 }
        }
      },
      deployment: {
        strategy: 'rolling',
        automation: false,
        approvals: [],
        rollback: { enabled: false, triggers: [] }
      },
      monitoring: {
        metrics: [],
        alerts: [],
        logging: { level: 'info', destinations: [] }
      }
    };

    // Create
    const app = await appManager.createApplication(appConfig);
    expect(app.status).toBe('draft');

    // Update
    const updated = await appManager.updateApplication(app.id, {
      description: 'Updated description'
    });
    expect(updated.config.description).toBe('Updated description');

    // Get
    const retrieved = await appManager.getApplication(app.id);
    expect(retrieved?.id).toBe(app.id);

    // List
    const apps = await appManager.listApplications({ owner: 'test@example.com' });
    expect(apps.some(a => a.id === app.id)).toBe(true);

    // Delete
    const deleteResult = await appManager.deleteApplication(app.id);
    expect(deleteResult.success).toBe(true);

    const deletedApp = await appManager.getApplication(app.id);
    expect(deletedApp).toBeNull();
  });

  test('should manage services within applications', async () => {
    const app = await appManager.createApplication({
      name: 'Service Test App',
      description: 'Test',
      owner: 'test@example.com',
      services: [],
      environment: { development: { variables: {}, secrets: {}, resources: { cpu: '100m', memory: '256Mi', storage: '1Gi' }, scaling: { min: 1, max: 1, target: 1 } } },
      deployment: { strategy: 'rolling', automation: false, approvals: [], rollback: { enabled: false, triggers: [] } },
      monitoring: { metrics: [], alerts: [], logging: { level: 'info', destinations: [] } }
    });

    // Add service
    const serviceConfig: ServiceConfiguration = {
      serviceId: 'gui-selector',
      serviceName: 'GUI Selector',
      version: '1.0.0',
      configuration: { theme: 'modern' },
      enabled: true,
      dependencies: []
    };

    const addResult = await appManager.addService(app.id, serviceConfig);
    expect(addResult.success).toBe(true);

    // Get service instances
    const instances = await appManager.getServiceInstances(app.id);
    expect(instances.some(i => i.serviceId === 'gui-selector')).toBe(true);

    // Remove service
    const removeResult = await appManager.removeService(app.id, 'gui-selector');
    expect(removeResult.success).toBe(true);

    const updatedInstances = await appManager.getServiceInstances(app.id);
    expect(updatedInstances.some(i => i.serviceId === 'gui-selector')).toBe(false);
  });

  test('should handle deployments', async () => {
    const app = await appManager.createApplication({
      name: 'Deploy Test App',
      description: 'Test',
      owner: 'test@example.com',
      services: [
        {
          serviceId: 'story-reporter',
          serviceName: 'Story Reporter',
          version: '1.0.0',
          configuration: {},
          enabled: true,
          dependencies: []
        }
      ],
      environment: { development: { variables: {}, secrets: {}, resources: { cpu: '100m', memory: '256Mi', storage: '1Gi' }, scaling: { min: 1, max: 1, target: 1 } } },
      deployment: { strategy: 'rolling', automation: true, approvals: [], rollback: { enabled: true, triggers: [] } },
      monitoring: { metrics: [], alerts: [], logging: { level: 'info', destinations: [] } }
    });

    // Deploy
    const deployment = await appManager.deploy(app.id, "development", '1.0.0');
    expect(deployment.deploymentId).toBeDefined();
    expect(deployment.status).toBe('in-progress');

    // Check deployment status
    const status = await appManager.getDeploymentStatus(app.id, deployment.deploymentId);
    expect(status.environment).toBe("development");
    expect(status.version).toBe('1.0.0');

    // Check application status
    const appStatus = await appManager.getApplicationStatus(app.id);
    expect(appStatus.status).toBe('active');
    expect(appStatus.health).toBe('healthy');
    expect(appStatus.services.length).toBeGreaterThan(0);
  });

  test('should provide monitoring and metrics', async () => {
    const app = await appManager.createApplication({
      name: 'Metrics Test App',
      description: 'Test',
      owner: 'test@example.com',
      services: [],
      environment: { development: { variables: {}, secrets: {}, resources: { cpu: '100m', memory: '256Mi', storage: '1Gi' }, scaling: { min: 1, max: 1, target: 1 } } },
      deployment: { strategy: 'rolling', automation: false, approvals: [], rollback: { enabled: false, triggers: [] } },
      monitoring: {
        metrics: ['cpu', 'memory'],
        alerts: [
          {
            name: 'High Memory',
            condition: 'memory > 90',
            threshold: 90,
            severity: "critical",
            notifications: ['slack']
          }
        ],
        logging: { level: 'warn', destinations: ['console'] }
      }
    });

    // Get metrics
    const metrics = await appManager.getMetrics(app.id);
    expect(metrics.length).toBeGreaterThan(0);
    expect(metrics[0]).toHaveProperty('uptime');
    expect(metrics[0]).toHaveProperty("requestCount");
    expect(metrics[0]).toHaveProperty("resourceUsage");

    // Get logs
    const logs = await appManager.getLogs(app.id);
    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBeGreaterThan(0);

    // Get alerts
    const alerts = await appManager.getAlerts(app.id);
    expect(alerts.length).toBe(1);
    expect(alerts[0].name).toBe('High Memory');
  });

  test('should support scaling operations', async () => {
    const app = await appManager.createApplication({
      name: 'Scaling Test App',
      description: 'Test',
      owner: 'test@example.com',
      services: [
        {
          serviceId: 'web-service',
          serviceName: 'Web Service',
          version: '1.0.0',
          configuration: {},
          enabled: true,
          dependencies: []
        }
      ],
      environment: { development: { variables: {}, secrets: {}, resources: { cpu: '100m', memory: '256Mi', storage: '1Gi' }, scaling: { min: 1, max: 5, target: 2 } } },
      deployment: { strategy: 'rolling', automation: false, approvals: [], rollback: { enabled: false, triggers: [] } },
      monitoring: { metrics: [], alerts: [], logging: { level: 'info', destinations: [] } }
    });

    // Scale service
    const scaleResult = await appManager.scaleService(app.id, 'web-service', 3);
    expect(scaleResult.success).toBe(true);

    // Get scaling status
    const scalingStatus = await appManager.getScalingStatus(app.id);
    expect(scalingStatus.services.length).toBeGreaterThan(0);
    expect(scalingStatus.services[0].serviceId).toBe('web-service');
  });

  test('should manage custom templates', async () => {
    const customTemplate = {
      name: 'Custom Vue App',
      description: 'Vue.js application template',
      category: 'web' as const,
      framework: 'Vue.js',
      language: "JavaScript",
      dependencies: ['vue', 'vue-router', 'vuex'],
      defaultServices: ['gui-selector']
    };

    const created = await appManager.createTemplate(customTemplate);
    expect(created.id).toBeDefined();
    expect(created.name).toBe('Custom Vue App');

    const retrieved = await appManager.getTemplate(created.id);
    expect(retrieved?.framework).toBe('Vue.js');
  });

  test('should handle environment management', async () => {
    const app = await appManager.createApplication({
      name: 'Environment Test App',
      description: 'Test',
      owner: 'test@example.com',
      services: [],
      environment: { development: { variables: {}, secrets: {}, resources: { cpu: '100m', memory: '256Mi', storage: '1Gi' }, scaling: { min: 1, max: 1, target: 1 } } },
      deployment: { strategy: 'rolling', automation: false, approvals: [], rollback: { enabled: false, triggers: [] } },
      monitoring: { metrics: [], alerts: [], logging: { level: 'info', destinations: [] } }
    });

    // Create staging environment
    const stagingConfig: EnvironmentConfig = {
      variables: { NODE_ENV: 'staging' },
      secrets: { api_key: process.env.API_KEY || "PLACEHOLDER" },
      resources: { cpu: '200m', memory: '512Mi', storage: '2Gi' },
      scaling: { min: 2, max: 5, target: 2 }
    };

    const createResult = await appManager.createEnvironment(app.id, 'staging', stagingConfig);
    expect(createResult.success).toBe(true);

    // Update environment
    const updateResult = await appManager.updateEnvironment(app.id, 'staging', {
      variables: { NODE_ENV: 'staging', DEBUG: 'true' }
    });
    expect(updateResult.success).toBe(true);

    // Delete environment
    const deleteResult = await appManager.deleteEnvironment(app.id, 'staging');
    expect(deleteResult.success).toBe(true);
  });

  test('should define standard deployment strategies', () => {
    const strategies = ['rolling', 'blue-green', 'canary'] as const;
    
    strategies.forEach(strategy => {
      expect(['rolling', 'blue-green', 'canary']).toContain(strategy);
    });
  });

  test('should define standard resource specifications', () => {
    const resourceSpec = {
      cpu: '500m',      // 500 millicores
      memory: '1Gi',    // 1 Gigabyte
      storage: '10Gi'   // 10 Gigabytes
    };

    expect(resourceSpec.cpu).toMatch(/^\d+m$/);
    expect(resourceSpec.memory).toMatch(/^\d+Gi$/);
    expect(resourceSpec.storage).toMatch(/^\d+Gi$/);
  });
});