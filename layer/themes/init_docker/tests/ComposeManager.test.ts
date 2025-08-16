import { ComposeManager, ComposeConfig, ServiceConfig } from '../children/ComposeManager';
import { fs } from '../../infra_external-log-lib/src';
import * as yaml from 'js-yaml';
import { exec } from 'child_process';

jest.mock('child_process');
jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(),
    readFile: jest.fn()
  }
}));
jest.mock('js-yaml');

describe('ComposeManager', () => {
  let composeManager: ComposeManager;
  const mockExecAsync = exec as unknown as jest.MockedFunction<typeof exec>;

  beforeEach(() => {
    composeManager = new ComposeManager();
    jest.clearAllMocks();
  });

  describe('generateComposeFile', () => {
    it('should generate docker-compose.yml from config', () => {
      const config: ComposeConfig = {
        version: '3.8',
        services: {
          app: {
            image: 'node:18',
            ports: ['3000:3000'],
            environment: {
              NODE_ENV: 'production'
            }
          }
        }
      };

      const mockYaml = `version: '3.8'
services:
  app:
    image: node:18
    ports:
      - '3000:3000'
    environment:
      NODE_ENV: production
networks:
  aidev-network:
    driver: bridge`;

      (yaml.dump as jest.MockedFunction<typeof yaml.dump>).mockReturnValue(mockYaml);

      const result = composeManager.generateComposeFile(config);

      expect(yaml.dump).toHaveBeenCalledWith(
        expect.objectContaining({
          version: '3.8',
          services: config.services,
          networks: expect.any(Object)
        }),
        expect.any(Object)
      );
      expect(result).toBe(mockYaml);
    });

    it('should add default network when not specified', () => {
      const config: ComposeConfig = {
        services: {
          app: {
            image: 'node:18'
          }
        }
      };

      composeManager.generateComposeFile(config);

      expect(yaml.dump).toHaveBeenCalledWith(
        expect.objectContaining({
          networks: {
            'aidev-network': {
              driver: 'bridge'
            }
          }
        }),
        expect.any(Object)
      );
    });

    it('should include volumes when specified', () => {
      const config: ComposeConfig = {
        services: {
          app: {
            image: 'node:18'
          }
        },
        volumes: {
          data: {
            driver: 'local'
          }
        }
      };

      composeManager.generateComposeFile(config);

      expect(yaml.dump).toHaveBeenCalledWith(
        expect.objectContaining({
          volumes: config.volumes
        }),
        expect.any(Object)
      );
    });
  });

  describe('generatePlatformCompose', () => {
    it('should generate compose config for platform themes', () => {
      const themes = ['mate-dealer', 'portal_gui-selector'];
      
      const config = composeManager.generatePlatformCompose(themes);

      expect(config.services['mate-dealer']).toBeDefined();
      expect(config.services['mate-dealer'].ports).toEqual(['3303:3303']);
      expect(config.services['mate-dealer'].container_name).toBe('aidev-mate-dealer');
      
      expect(config.services['portal-gui-selector']).toBeDefined();
      expect(config.services['portal-gui-selector'].ports).toEqual(['3456:3456']);
      expect(config.services['portal-gui-selector'].container_name).toBe('aidev-portal-gui-selector');
      
      expect(config.networks).toBeDefined();
    });

    it('should set correct healthcheck for services', () => {
      const themes = ['mate-dealer'];
      
      const config = composeManager.generatePlatformCompose(themes);
      const service = config.services['mate-dealer'];

      expect(service.healthcheck).toBeDefined();
      expect(service.healthcheck?.test).toEqual(['CMD', 'curl', '-f', 'http://localhost:3303/health']);
      expect(service.healthcheck?.interval).toBe('30s');
      expect(service.healthcheck?.timeout).toBe('10s');
      expect(service.healthcheck?.retries).toBe(3);
    });
  });

  describe('runCompose', () => {
    it('should run docker-compose command with options', async () => {
      (mockExecAsync as any).mockImplementation((cmd: string, options: any, callback: any) => {
        callback(null, { stdout: 'Success', stderr: '' });
      });

      const result = await composeManager.runCompose('up -d', {
        projectName: 'test-project',
        file: 'docker-compose.test.yml',
        profiles: ['dev', 'test'],
        env: {
          CUSTOM_VAR: 'value'
        }
      });

      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('docker-compose -p test-project -f docker-compose.test.yml --profile dev --profile test up -d'),
        expect.objectContaining({
          env: expect.objectContaining({
            CUSTOM_VAR: 'value'
          })
        }),
        expect.any(Function)
      );
      expect(result).toBe('Success');
    });

    it('should throw error on command failure', async () => {
      (mockExecAsync as any).mockImplementation((cmd: string, options: any, callback: any) => {
        callback(null, { stdout: '', stderr: 'Error: Command failed' });
      });

      await expect(composeManager.runCompose('up')).rejects.toThrow('Docker Compose command failed');
    });
  });

  describe('up', () => {
    it('should start services with detach and build options', async () => {
      jest.spyOn(composeManager, 'runCompose').mockResolvedValue('Started');

      const result = await composeManager.up({
        detach: true,
        build: true,
        projectName: 'test'
      });

      expect(composeManager.runCompose).toHaveBeenCalledWith(
        'up -d --build',
        expect.objectContaining({
          projectName: 'test'
        })
      );
      expect(result).toBe('Started');
    });
  });

  describe('down', () => {
    it('should stop services with volumes option', async () => {
      jest.spyOn(composeManager, 'runCompose').mockResolvedValue('Stopped');

      const result = await composeManager.down({
        volumes: true,
        removeOrphans: true
      });

      expect(composeManager.runCompose).toHaveBeenCalledWith(
        'down -v --remove-orphans',
        expect.any(Object)
      );
      expect(result).toBe('Stopped');
    });
  });

  describe('logs', () => {
    it('should get service logs with options', async () => {
      jest.spyOn(composeManager, 'runCompose').mockResolvedValue('Log output');

      const result = await composeManager.logs('app', {
        follow: false,
        tail: 100
      });

      expect(composeManager.runCompose).toHaveBeenCalledWith(
        'logs --tail 100 app',
        expect.any(Object)
      );
      expect(result).toBe('Log output');
    });
  });

  describe('validate', () => {
    it('should validate compose file successfully', async () => {
      (fs.promises.readFile as jest.MockedFunction<typeof fs.promises.readFile>).mockResolvedValue('valid yaml');
      (yaml.load as jest.MockedFunction<typeof yaml.load>).mockReturnValue({});
      jest.spyOn(composeManager, 'runCompose').mockResolvedValue('Configuration is valid');

      const result = await composeManager.validate('/path/to/docker-compose.yml');

      expect(fs.promises.readFile).toHaveBeenCalledWith('/path/to/docker-compose.yml', 'utf8');
      expect(yaml.load).toHaveBeenCalledWith('valid yaml');
      expect(composeManager.runCompose).toHaveBeenCalledWith(
        'config',
        { file: '/path/to/docker-compose.yml' }
      );
      expect(result).toBe(true);
    });

    it('should return false for invalid compose file', async () => {
      (fs.promises.readFile as jest.MockedFunction<typeof fs.promises.readFile>).mockRejectedValue(new Error('File not found'));

      const result = await composeManager.validate('/path/to/invalid.yml');

      expect(result).toBe(false);
    });
  });

  describe('mergeConfigs', () => {
    it('should merge multiple compose configurations', () => {
      const config1: ComposeConfig = {
        version: '3.8',
        services: {
          app1: {
            image: 'node:18'
          }
        },
        networks: {
          net1: { driver: 'bridge' }
        }
      };

      const config2: ComposeConfig = {
        version: '3.8',
        services: {
          app2: {
            image: 'python:3.9'
          }
        },
        volumes: {
          vol1: { driver: 'local' }
        }
      };

      const merged = composeManager.mergeConfigs(config1, config2);

      expect(merged.services.app1).toBeDefined();
      expect(merged.services.app2).toBeDefined();
      expect(merged.networks?.net1).toBeDefined();
      expect(merged.volumes?.vol1).toBeDefined();
    });
  });

  describe('saveComposeFile', () => {
    it('should save compose file content', async () => {
      const content = 'version: "3.8"';
      const filepath = '/path/to/docker-compose.yml';

      (fs.promises.writeFile as jest.MockedFunction<typeof fs.promises.writeFile>).mockResolvedValue(undefined);

      await composeManager.saveComposeFile(content, filepath);

      expect(fs.promises.writeFile).toHaveBeenCalledWith(filepath, content, 'utf8');
    });
  });

  describe('loadComposeFile', () => {
    it('should load and parse compose file', async () => {
      const content = 'version: "3.8"';
      const config = { version: '3.8', services: {} };

      (fs.promises.readFile as jest.MockedFunction<typeof fs.promises.readFile>).mockResolvedValue(content);
      (yaml.load as jest.MockedFunction<typeof yaml.load>).mockReturnValue(config);

      const result = await composeManager.loadComposeFile('/path/to/docker-compose.yml');

      expect(fs.promises.readFile).toHaveBeenCalledWith('/path/to/docker-compose.yml', 'utf8');
      expect(yaml.load).toHaveBeenCalledWith(content);
      expect(result).toEqual(config);
    });
  });
});