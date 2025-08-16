import { 
  DockerConfigGenerator,
  DockerServiceConfig,
  DockerComposeService 
} from '../../src/utils/docker-config';

describe("DockerConfigGenerator", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("generateServiceConfig", () => {
    it('should generate basic service configuration', () => {
      const config: DockerServiceConfig = {
        serviceName: 'my-service',
        port: 3000
      };

      const result = DockerConfigGenerator.generateServiceConfig(config);

      expect(result).toEqual({
        image: 'aidev/my-service:latest',
        ports: ['3000:3000'],
        environment: [
          'NODE_ENV=development',
          'PORT=3000'
        ],
        volumes: [
          './data/my-service:/app/data',
          './logs/my-service:/app/logs'
        ],
        restart: 'unless-stopped'
      });
    });

    it('should use custom image and tag', () => {
      const config: DockerServiceConfig = {
        serviceName: 'my-service',
        port: 3000,
        image: 'custom/image',
        tag: 'v1.0.0'
      };

      const result = DockerConfigGenerator.generateServiceConfig(config);
      expect(result.image).toBe('custom/image');
    });

    it('should include custom environment variables', () => {
      process.env.NODE_ENV = "production";
      
      const config: DockerServiceConfig = {
        serviceName: 'my-service',
        port: 3000,
        environment: {
          DB_HOST: "localhost",
          DB_PORT: 5432,
          DEBUG: 'true'
        }
      };

      const result = DockerConfigGenerator.generateServiceConfig(config);
      
      expect(result.environment).toContain('NODE_ENV=production');
      expect(result.environment).toContain('PORT=3000');
      expect(result.environment).toContain('DB_HOST=localhost');
      expect(result.environment).toContain('DB_PORT=5432');
      expect(result.environment).toContain('DEBUG=true');
    });

    it('should use custom volumes', () => {
      const config: DockerServiceConfig = {
        serviceName: 'my-service',
        port: 3000,
        volumes: [
          './custom:/app/custom',
          '/host/path:/container/path'
        ]
      };

      const result = DockerConfigGenerator.generateServiceConfig(config);
      
      expect(result.volumes).toEqual([
        './custom:/app/custom',
        '/host/path:/container/path'
      ]);
    });

    it('should include networks and dependencies', () => {
      const config: DockerServiceConfig = {
        serviceName: 'my-service',
        port: 3000,
        networks: ["frontend", 'backend'],
        depends_on: ['db', 'redis']
      };

      const result = DockerConfigGenerator.generateServiceConfig(config);
      
      expect(result.networks).toEqual(["frontend", 'backend']);
      expect(result.depends_on).toEqual(['db', 'redis']);
    });

    it('should include healthcheck configuration', () => {
      const config: DockerServiceConfig = {
        serviceName: 'my-service',
        port: 3000,
        healthcheck: {
          test: ['CMD', 'curl', '-f', 'http://localhost:3000/health'],
          interval: '30s',
          timeout: '10s',
          retries: 3
        }
      };

      const result = DockerConfigGenerator.generateServiceConfig(config);
      
      expect(result.healthcheck).toEqual({
        test: ['CMD', 'curl', '-f', 'http://localhost:3000/health'],
        interval: '30s',
        timeout: '10s',
        retries: 3
      });
    });

    it('should use custom restart policy', () => {
      const config: DockerServiceConfig = {
        serviceName: 'my-service',
        port: 3000,
        restart: 'always'
      };

      const result = DockerConfigGenerator.generateServiceConfig(config);
      expect(result.restart).toBe('always');
    });
  });

  describe("generateComposeConfig", () => {
    it('should generate complete docker-compose config', () => {
      const services: DockerServiceConfig[] = [
        {
          serviceName: 'api',
          port: 3000
        },
        {
          serviceName: 'db',
          port: 5432
        }
      ];

      const result = DockerConfigGenerator.generateComposeConfig(services);

      expect(result.version).toBe('3.8');
      expect(result.services).toHaveProperty('api');
      expect(result.services).toHaveProperty('db');
      expect(result.networks).toHaveProperty('aidev_network');
      expect(result.services.api.networks).toEqual(['aidev_network']);
      expect(result.services.db.networks).toEqual(['aidev_network']);
    });

    it('should preserve custom networks', () => {
      const services: DockerServiceConfig[] = [
        {
          serviceName: 'api',
          port: 3000,
          networks: ['custom-net']
        }
      ];

      const result = DockerConfigGenerator.generateComposeConfig(services);
      expect(result.services.api.networks).toEqual(['custom-net']);
    });
  });

  describe("generateHttpHealthcheck", () => {
    it('should generate default health check', () => {
      const result = DockerConfigGenerator.generateHttpHealthcheck(3000);

      expect(result).toEqual({
        test: ['CMD', 'curl', '-f', 'http://localhost:3000/health', '||', 'exit', '1'],
        interval: '30s',
        timeout: '10s',
        retries: 3,
        start_period: '40s'
      });
    });

    it('should use custom path and timing', () => {
      const result = DockerConfigGenerator.generateHttpHealthcheck(
        8080,
        '/api/health',
        '60s',
        '5s',
        5
      );

      expect(result).toEqual({
        test: ['CMD', 'curl', '-f', 'http://localhost:8080/api/health', '||', 'exit', '1'],
        interval: '60s',
        timeout: '5s',
        retries: 5,
        start_period: '40s'
      });
    });
  });

  describe("generateServiceDiscoveryEnv", () => {
    it('should generate service discovery environment variables', () => {
      const services: DockerServiceConfig[] = [
        {
          serviceName: 'api-gateway',
          port: 3000
        },
        {
          serviceName: 'auth-service',
          port: 4000
        }
      ];

      const result = DockerConfigGenerator.generateServiceDiscoveryEnv(services);

      expect(result).toEqual({
        'SERVICE_API_GATEWAY_HOST': 'api-gateway',
        'SERVICE_API_GATEWAY_PORT': '3000',
        'SERVICE_API_GATEWAY_URL': 'http://api-gateway:3000',
        'SERVICE_AUTH_SERVICE_HOST': 'auth-service',
        'SERVICE_AUTH_SERVICE_PORT': '4000',
        'SERVICE_AUTH_SERVICE_URL': 'http://auth-service:4000'
      });
    });
  });

  describe("mergeServiceConfigs", () => {
    it('should merge service configurations', () => {
      const base: DockerComposeService = {
        image: 'base:latest',
        ports: ['3000:3000'],
        environment: ['NODE_ENV=development'],
        volumes: ['/base:/app']
      };

      const override: Partial<DockerComposeService> = {
        environment: ['DEBUG=true'],
        volumes: ['/override:/extra'],
        restart: 'always'
      };

      const result = DockerConfigGenerator.mergeServiceConfigs(base, override);

      expect(result).toEqual({
        image: 'base:latest',
        ports: ['3000:3000'],
        environment: ['NODE_ENV=development', 'DEBUG=true'],
        volumes: ['/base:/app', '/override:/extra'],
        restart: 'always'
      });
    });

    it('should override image and ports', () => {
      const base: DockerComposeService = {
        image: 'base:latest',
        ports: ['3000:3000']
      };

      const override: Partial<DockerComposeService> = {
        image: 'override:v2',
        ports: ['4000:4000']
      };

      const result = DockerConfigGenerator.mergeServiceConfigs(base, override);

      expect(result.image).toBe('override:v2');
      expect(result.ports).toEqual(['4000:4000']);
    });

    it('should merge networks and dependencies', () => {
      const base: DockerComposeService = {
        image: 'base:latest',
        networks: ['net1'],
        depends_on: ["service1"]
      };

      const override: Partial<DockerComposeService> = {
        networks: ['net2'],
        depends_on: ["service2"]
      };

      const result = DockerConfigGenerator.mergeServiceConfigs(base, override);

      expect(result.networks).toEqual(['net1', 'net2']);
      expect(result.depends_on).toEqual(["service1", "service2"]);
    });
  });

  describe("validateServiceConfig", () => {
    it('should validate correct configuration', () => {
      const config: DockerServiceConfig = {
        serviceName: 'my-service',
        port: 3000,
        tag: 'v1.0.0'
      };

      const errors = DockerConfigGenerator.validateServiceConfig(config);
      expect(errors).toEqual([]);
    });

    it('should validate service name format', () => {
      const config: DockerServiceConfig = {
        serviceName: 'My-Service',
        port: 3000
      };

      const errors = DockerConfigGenerator.validateServiceConfig(config);
      expect(errors).toContain('Invalid service name format');
    });

    it('should validate port range', () => {
      const configs = [
        { serviceName: 'service', port: 0 },
        { serviceName: 'service', port: -1 },
        { serviceName: 'service', port: 70000 }
      ];

      configs.forEach(config => {
        const errors = DockerConfigGenerator.validateServiceConfig(config);
        expect(errors).toContain('Port must be between 1 and 65535');
      });
    });

    it('should validate tag format', () => {
      const config: DockerServiceConfig = {
        serviceName: 'my-service',
        port: 3000,
        tag: 'invalid tag!'
      };

      const errors = DockerConfigGenerator.validateServiceConfig(config);
      expect(errors).toContain('Invalid Docker tag format');
    });

    it('should return multiple errors', () => {
      const config: DockerServiceConfig = {
        serviceName: 'INVALID',
        port: 99999,
        tag: 'bad tag'
      };

      const errors = DockerConfigGenerator.validateServiceConfig(config);
      expect(errors.length).toBe(3);
    });
  });
});