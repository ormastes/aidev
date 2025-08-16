import { ConfigManager } from '../../user-stories/025-env-config-system/src/components/config-manager';
import { PortAllocator } from '../../user-stories/025-env-config-system/src/components/port-allocator';
import { FileGenerator } from '../../user-stories/025-env-config-system/src/components/file-generator';
import { EnvironmentConfig, CreateEnvironmentOptions } from '../../user-stories/025-env-config-system/src/interfaces/config-manager.interface';
import * as fs from 'fs/promises';
import { path } from '../../../infra_external-log-lib/src';

// Mock fs module
jest.mock('fs/promises');

// Mock components
jest.mock('../../user-stories/025-env-config-system/src/components/port-allocator');
jest.mock('../../user-stories/025-env-config-system/src/components/file-generator');

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  let mockPortAllocator: jest.Mocked<PortAllocator>;
  let mockFileGenerator: jest.Mocked<FileGenerator>;
  const testBasePath = '/test/environments';

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockPortAllocator = new PortAllocator() as jest.Mocked<PortAllocator>;
    mockFileGenerator = new FileGenerator() as jest.Mocked<FileGenerator>;

    // Create ConfigManager instance
    configManager = new ConfigManager(mockPortAllocator, mockFileGenerator, testBasePath);
  });

  describe('constructor', () => {
    it('should create instance with provided dependencies', () => {
      expect(configManager).toBeInstanceOf(ConfigManager);
    });

    it('should use default config base path if not provided', () => {
      const defaultConfigManager = new ConfigManager(mockPortAllocator, mockFileGenerator);
      expect(defaultConfigManager).toBeInstanceOf(ConfigManager);
    });
  });

  describe('createEnvironment', () => {
    it('should create new environment successfully', async () => {
      const options: CreateEnvironmentOptions = {
        name: 'test-env',
        type: 'test'
      };

      const mockPortAllocation = {
        portal: 3000,
        services: { start: 3001, end: 3010 }
      };

      mockPortAllocator.allocatePortsForEnvironment.mockResolvedValue(mockPortAllocation);
      mockFileGenerator.generateEnvironmentFiles.mockResolvedValue(undefined);

      const result = await configManager.createEnvironment(options);

      expect(result).toMatchObject({
        name: 'test-env',
        type: 'test',
        port: {
          base: 3000,
          range: [3001, 3010]
        },
        database: {
          type: 'sqlite',
          connection: './data/test-env.db'
        },
        paths: {
          root: path.join(testBasePath, 'test-env'),
          data: path.join(testBasePath, 'test-env', 'data'),
          logs: path.join(testBasePath, 'test-env', 'logs'),
          temp: path.join(testBasePath, 'test-env', 'temp')
        },
        services: []
      });

      expect(mockPortAllocator.allocatePortsForEnvironment).toHaveBeenCalledWith('test-env', 'test');
      expect(mockFileGenerator.generateEnvironmentFiles).toHaveBeenCalled();
    });

    it('should create release environment with postgresql', async () => {
      const options: CreateEnvironmentOptions = {
        name: 'prod-release',
        type: 'release'
      };

      mockPortAllocator.allocatePortsForEnvironment.mockResolvedValue({
        portal: 4000,
        services: { start: 4001, end: 4010 }
      });

      const result = await configManager.createEnvironment(options);

      expect(result.database).toEqual({
        type: 'postgresql',
        connection: 'postgresql://localhost:5432/prod-release'
      });
    });
  });

  describe('getEnvironment', () => {
    it('should return environment from memory store', async () => {
      // First create an environment
      const options: CreateEnvironmentOptions = {
        name: 'test-env',
        type: 'test'
      };

      mockPortAllocator.allocatePortsForEnvironment.mockResolvedValue({
        portal: 3000,
        services: { start: 3001, end: 3010 }
      });

      const createdConfig = await configManager.createEnvironment(options);

      // Now get it from memory
      const result = await configManager.getEnvironment('test-env');

      expect(result).toEqual(createdConfig);
    });

    it('should load environment from disk if not in memory', async () => {
      const mockConfig = {
        name: 'disk-env',
        type: 'test',
        port: { base: 3000, range: [3001, 3010] },
        database: { type: 'sqlite', connection: './data/disk-env.db' },
        paths: {
          root: '/test/environments/disk-env',
          data: '/test/environments/disk-env/data',
          logs: '/test/environments/disk-env/logs',
          temp: '/test/environments/disk-env/temp'
        },
        services: [],
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-01T00:00:00.000Z'
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockConfig));

      const result = await configManager.getEnvironment('disk-env');

      expect(result).toBeDefined();
      expect(result?.name).toBe('disk-env');
      expect(result?.created).toBeInstanceOf(Date);
      expect(result?.updated).toBeInstanceOf(Date);
    });

    it('should return null if environment not found', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      const result = await configManager.getEnvironment('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateEnvironment', () => {
    it('should update existing environment', async () => {
      // First create an environment
      const options: CreateEnvironmentOptions = {
        name: 'test-env',
        type: 'test'
      };

      mockPortAllocator.allocatePortsForEnvironment.mockResolvedValue({
        portal: 3000,
        services: { start: 3001, end: 3010 }
      });

      await configManager.createEnvironment(options);

      // Mock fs.writeFile
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      // Update it
      const updates = {
        port: { base: 4000, range: [4001, 4010] }
      };

      const result = await configManager.updateEnvironment('test-env', updates);

      expect(result.port.base).toBe(4000);
      expect(result.updated.getTime()).toBeGreaterThan(result.created.getTime());
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should throw error if environment not found', async () => {
      await expect(configManager.updateEnvironment('non-existent', {}))
        .rejects.toThrow('Environment non-existent not found');
    });
  });

  describe('deleteEnvironment', () => {
    it('should delete existing environment', async () => {
      // First create an environment
      const options: CreateEnvironmentOptions = {
        name: 'test-env',
        type: 'test'
      };

      mockPortAllocator.allocatePortsForEnvironment.mockResolvedValue({
        portal: 3000,
        services: { start: 3001, end: 3010 }
      });

      await configManager.createEnvironment(options);

      // Mock port release and fs.rm
      mockPortAllocator.releaseEnvironmentPorts.mockResolvedValue(undefined);
      (fs.rm as jest.Mock).mockResolvedValue(undefined);

      const result = await configManager.deleteEnvironment('test-env');

      expect(result).toBe(true);
      expect(mockPortAllocator.releaseEnvironmentPorts).toHaveBeenCalledWith('test-env');
      expect(fs.rm).toHaveBeenCalled();
    });

    it('should return false if environment not found', async () => {
      const result = await configManager.deleteEnvironment('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('listEnvironments', () => {
    it('should list all environments', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue(['env1', 'env2']);
      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify({
          name: 'env1',
          type: 'test',
          created: '2023-01-01',
          updated: '2023-01-01'
        }))
        .mockResolvedValueOnce(JSON.stringify({
          name: 'env2',
          type: 'release',
          created: '2023-01-01',
          updated: '2023-01-01'
        }));

      const result = await configManager.listEnvironments();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('env1');
      expect(result[1].name).toBe('env2');
    });

    it('should filter environments by type', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue(['env1', 'env2']);
      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify({
          name: 'env1',
          type: 'test',
          created: '2023-01-01',
          updated: '2023-01-01'
        }))
        .mockResolvedValueOnce(JSON.stringify({
          name: 'env2',
          type: 'release',
          created: '2023-01-01',
          updated: '2023-01-01'
        }));

      const result = await configManager.listEnvironments('test');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('env1');
    });

    it('should return empty array if directory does not exist', async () => {
      (fs.readdir as jest.Mock).mockRejectedValue(new Error('Directory not found'));

      const result = await configManager.listEnvironments();

      expect(result).toEqual([]);
    });
  });

  describe('addService', () => {
    it('should add service to environment', async () => {
      // First create an environment
      const options: CreateEnvironmentOptions = {
        name: 'test-env',
        type: 'test'
      };

      mockPortAllocator.allocatePortsForEnvironment.mockResolvedValue({
        portal: 3000,
        services: { start: 3001, end: 3010 }
      });

      await configManager.createEnvironment(options);

      // Mock service port allocation
      mockPortAllocator.allocateServicePort.mockResolvedValue(3001);
      mockFileGenerator.generateServiceFile.mockResolvedValue(undefined);
      mockFileGenerator.updateDockerCompose.mockResolvedValue(undefined);
      mockFileGenerator.updateEnvFile.mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const result = await configManager.addService('test-env', 'api-service');

      expect(result).toEqual({
        name: 'api-service',
        port: 3001,
        enabled: true
      });

      expect(mockPortAllocator.allocateServicePort).toHaveBeenCalledWith('test-env', 'api-service');
      expect(mockFileGenerator.generateServiceFile).toHaveBeenCalled();
      expect(mockFileGenerator.updateDockerCompose).toHaveBeenCalled();
      expect(mockFileGenerator.updateEnvFile).toHaveBeenCalledWith(
        expect.any(String),
        'SERVICE_API_SERVICE_PORT',
        '3001'
      );
    });

    it('should throw error if environment not found', async () => {
      await expect(configManager.addService('non-existent', 'service'))
        .rejects.toThrow('Environment non-existent not found');
    });
  });

  describe('removeService', () => {
    it('should remove service from environment', async () => {
      // First create an environment with a service
      const options: CreateEnvironmentOptions = {
        name: 'test-env',
        type: 'test'
      };

      mockPortAllocator.allocatePortsForEnvironment.mockResolvedValue({
        portal: 3000,
        services: { start: 3001, end: 3010 }
      });

      await configManager.createEnvironment(options);

      // Add a service
      mockPortAllocator.allocateServicePort.mockResolvedValue(3001);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      await configManager.addService('test-env', 'api-service');

      // Remove the service
      mockPortAllocator.releasePort.mockResolvedValue(undefined);
      mockFileGenerator.updateDockerCompose.mockResolvedValue(undefined);

      const result = await configManager.removeService('test-env', 'api-service');

      expect(result).toBe(true);
      expect(mockPortAllocator.releasePort).toHaveBeenCalledWith(3001);
    });

    it('should return false if service not found', async () => {
      // Create environment
      const options: CreateEnvironmentOptions = {
        name: 'test-env',
        type: 'test'
      };

      mockPortAllocator.allocatePortsForEnvironment.mockResolvedValue({
        portal: 3000,
        services: { start: 3001, end: 3010 }
      });

      await configManager.createEnvironment(options);

      const result = await configManager.removeService('test-env', 'non-existent');
      expect(result).toBe(false);
    });
  });

  describe('exportEnvironment', () => {
    it('should export environment as JSON', async () => {
      // Create environment
      const options: CreateEnvironmentOptions = {
        name: 'test-env',
        type: 'test'
      };

      mockPortAllocator.allocatePortsForEnvironment.mockResolvedValue({
        portal: 3000,
        services: { start: 3001, end: 3010 }
      });

      await configManager.createEnvironment(options);

      const result = await configManager.exportEnvironment('test-env', 'json');
      const parsed = JSON.parse(result);

      expect(parsed.name).toBe('test-env');
      expect(parsed.type).toBe('test');
    });

    it('should export environment as env format', async () => {
      // Create environment
      const options: CreateEnvironmentOptions = {
        name: 'test-env',
        type: 'test'
      };

      mockPortAllocator.allocatePortsForEnvironment.mockResolvedValue({
        portal: 3000,
        services: { start: 3001, end: 3010 }
      });

      await configManager.createEnvironment(options);

      const result = await configManager.exportEnvironment('test-env', 'env');

      expect(result).toContain('ENVIRONMENT_NAME=test-env');
      expect(result).toContain('ENVIRONMENT_TYPE=test');
      expect(result).toContain('PORT=3000');
      expect(result).toContain('DATABASE_TYPE=sqlite');
    });

    it('should throw error for unsupported format', async () => {
      await expect(configManager.exportEnvironment('test-env', 'xml' as any))
        .rejects.toThrow('Unsupported format: xml');
    });
  });

  describe('utility methods', () => {
    describe('suggestEnvironmentName', () => {
      it('should suggest unique environment name', async () => {
        (fs.readdir as jest.Mock).mockResolvedValue(['test-1', 'test-2']);
        (fs.readFile as jest.Mock)
          .mockResolvedValueOnce(JSON.stringify({
            name: 'test-1',
            type: 'test',
            created: '2023-01-01',
            updated: '2023-01-01'
          }))
          .mockResolvedValueOnce(JSON.stringify({
            name: 'test-2',
            type: 'test',
            created: '2023-01-01',
            updated: '2023-01-01'
          }));

        const result = await configManager.suggestEnvironmentName('test');

        expect(result).toBe('test-3');
      });
    });

    describe('environmentExists', () => {
      it('should return true if environment exists', async () => {
        // Create environment
        const options: CreateEnvironmentOptions = {
          name: 'test-env',
          type: 'test'
        };

        mockPortAllocator.allocatePortsForEnvironment.mockResolvedValue({
          portal: 3000,
          services: { start: 3001, end: 3010 }
        });

        await configManager.createEnvironment(options);

        const result = await configManager.environmentExists('test-env');
        expect(result).toBe(true);
      });

      it('should return false if environment does not exist', async () => {
        const result = await configManager.environmentExists('non-existent');
        expect(result).toBe(false);
      });
    });

    describe('validateConfig', () => {
      it('should validate valid config', async () => {
        const result = await configManager.validateConfig({
          name: 'test',
          type: 'test'
        });
        expect(result).toBe(true);
      });

      it('should reject invalid config', async () => {
        const result = await configManager.validateConfig({
          name: 'test',
          type: 'invalid' as any
        });
        expect(result).toBe(false);
      });

      it('should reject config without name', async () => {
        const result = await configManager.validateConfig({
          type: 'test'
        });
        expect(result).toBe(false);
      });
    });
  });
});