/**
 * QEMU Manager Tests
 * Comprehensive test suite for QEMU container alternative implementation
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { QEMUManager, QEMUConfig, QEMUInstance } from '../src/core/QEMUManager';
import { ImageBuilder, BuildContext } from '../src/builders/ImageBuilder';
import { VolumeManager, VolumeConfig } from '../src/managers/VolumeManager';
import * as fs from 'fs/promises';
import { path } from '../../infra_external-log-lib/src';

describe('QEMU Container Alternative', () => {
  let qemuManager: QEMUManager;
  let imageBuilder: ImageBuilder;
  let volumeManager: VolumeManager;
  const testDataDir = '/tmp/qemu-test';

  beforeEach(async () => {
    // Create test instances
    qemuManager = new QEMUManager({
      dataDir: testDataDir,
      monitoringEnabled: false
    });
    
    imageBuilder = new ImageBuilder({
      dataDir: testDataDir,
      cacheDir: path.join(testDataDir, 'cache'),
      tempDir: path.join(testDataDir, 'temp')
    });
    
    volumeManager = new VolumeManager({
      dataDir: path.join(testDataDir, 'volumes'),
      mountDir: path.join(testDataDir, 'mounts')
    });
    
    // Initialize
    await qemuManager.initialize();
    await imageBuilder.initialize();
    await volumeManager.initialize();
  });

  afterEach(async () => {
    // Cleanup
    qemuManager.stopMonitoring();
    await fs.rm(testDataDir, { recursive: true, force: true });
  });

  describe("QEMUManager", () => {
    describe('Container Lifecycle', () => {
      it('should create a container', async () => {
        const config: QEMUConfig = {
          name: 'test-container',
          image: 'alpine:latest',
          memory: '256M',
          cpus: 1
        };
        
        // Mock image existence
        jest.spyOn(qemuManager as any, "getImage").mockResolvedValue({
          id: 'alpine-image-id',
          name: 'alpine',
          tag: 'latest'
        });
        
        const instance = await qemuManager.create(config);
        
        expect(instance).toBeDefined();
        expect(instance.name).toBe('test-container');
        expect(instance.status).toBe('created');
        expect(instance.config.memory).toBe('256M');
        expect(instance.config.cpus).toBe(1);
      });

      it('should run a container', async () => {
        const config: QEMUConfig = {
          name: 'run-test',
          image: 'ubuntu:20.04',
          command: ['echo', 'Hello, QEMU!']
        };
        
        jest.spyOn(qemuManager as any, "getImage").mockResolvedValue({
          id: 'ubuntu-image-id',
          name: 'ubuntu',
          tag: '20.04'
        });
        
        jest.spyOn(qemuManager as any, "buildQEMUCommand").mockReturnValue({
          command: 'qemu-system-x86_64',
          args: ['-m', '512M']
        });
        
        const instance = await qemuManager.run(config);
        
        expect(instance).toBeDefined();
        expect(instance.status).toBe('running');
        expect(instance.startTime).toBeDefined();
      });

      it('should stop a running container', async () => {
        const config: QEMUConfig = {
          name: 'stop-test',
          image: 'alpine:latest'
        };
        
        jest.spyOn(qemuManager as any, "getImage").mockResolvedValue({
          id: 'alpine-image-id',
          name: 'alpine',
          tag: 'latest'
        });
        
        const instance = await qemuManager.create(config);
        
        // Mock running state
        instance.status = 'running';
        instance.startTime = new Date();
        
        jest.spyOn(qemuManager as any, "sendMonitorCommand").mockResolvedValue('');
        
        await qemuManager.stop(instance.id);
        
        expect(instance.status).toBe('stopped');
        expect(instance.stopTime).toBeDefined();
      });

      it('should remove a container', async () => {
        const config: QEMUConfig = {
          name: 'remove-test',
          image: 'alpine:latest'
        };
        
        jest.spyOn(qemuManager as any, "getImage").mockResolvedValue({
          id: 'alpine-image-id',
          name: 'alpine',
          tag: 'latest'
        });
        
        const instance = await qemuManager.create(config);
        
        await qemuManager.remove(instance.id);
        
        const removed = qemuManager.get(instance.id);
        expect(removed).toBeUndefined();
      });

      it('should list containers', async () => {
        const configs: QEMUConfig[] = [
          { name: "container1", image: 'alpine:latest' },
          { name: "container2", image: 'ubuntu:20.04' },
          { name: "container3", image: 'debian:11' }
        ];
        
        jest.spyOn(qemuManager as any, "getImage").mockResolvedValue({
          id: 'test-image-id',
          name: 'test',
          tag: 'latest'
        });
        
        for (const config of configs) {
          await qemuManager.create(config);
        }
        
        const instances = qemuManager.list();
        
        expect(instances).toHaveLength(3);
        expect(instances.map(i => i.name)).toEqual(expect.arrayContaining([
          "container1", "container2", "container3"
        ]));
      });

      it('should filter containers by status', async () => {
        jest.spyOn(qemuManager as any, "getImage").mockResolvedValue({
          id: 'test-image-id',
          name: 'test',
          tag: 'latest'
        });
        
        const running = await qemuManager.create({ name: 'running', image: 'alpine' });
        const stopped = await qemuManager.create({ name: 'stopped', image: 'alpine' });
        
        // Mock statuses
        running.status = 'running';
        stopped.status = 'stopped';
        
        const runningContainers = qemuManager.list({ status: 'running' });
        
        expect(runningContainers).toHaveLength(1);
        expect(runningContainers[0].name).toBe('running');
      });
    });

    describe('Container Execution', () => {
      it('should execute command in container', async () => {
        const config: QEMUConfig = {
          name: 'exec-test',
          image: 'alpine:latest'
        };
        
        jest.spyOn(qemuManager as any, "getImage").mockResolvedValue({
          id: 'alpine-image-id',
          name: 'alpine',
          tag: 'latest'
        });
        
        const instance = await qemuManager.create(config);
        instance.status = 'running';
        
        jest.spyOn(qemuManager as any, "execViaGuestAgent").mockResolvedValue({
          exitCode: 0,
          output: 'Command output'
        });
        
        const result = await qemuManager.exec(instance.id, ['ls', '-la']);
        
        expect(result.exitCode).toBe(0);
        expect(result.output).toBe('Command output');
      });

      it('should copy files to/from container', async () => {
        const config: QEMUConfig = {
          name: 'copy-test',
          image: 'alpine:latest'
        };
        
        jest.spyOn(qemuManager as any, "getImage").mockResolvedValue({
          id: 'alpine-image-id',
          name: 'alpine',
          tag: 'latest'
        });
        
        const instance = await qemuManager.create(config);
        
        jest.spyOn(qemuManager as any, "copyVia9P").mockResolvedValue(undefined);
        
        await qemuManager.copy(instance.id, '/local/file', '/container/file');
        
        expect(qemuManager["copyVia9P"]).toHaveBeenCalled();
      });

      it('should get container logs', async () => {
        const config: QEMUConfig = {
          name: 'logs-test',
          image: 'alpine:latest'
        };
        
        jest.spyOn(qemuManager as any, "getImage").mockResolvedValue({
          id: 'alpine-image-id',
          name: 'alpine',
          tag: 'latest'
        });
        
        const instance = await qemuManager.create(config);
        
        // Mock log file
        const logPath = path.join(testDataDir, "instances", instance.id, 'console.log');
        await fs.mkdir(path.dirname(logPath), { recursive: true });
        await fs.writeFile(logPath, 'Container logs\nLine 2\nLine 3');
        
        const logs = await qemuManager.logs(instance.id);
        
        expect(logs).toContain('Container logs');
        expect(logs.split('\n')).toHaveLength(3);
      });

      it('should tail logs', async () => {
        const config: QEMUConfig = {
          name: 'tail-test',
          image: 'alpine:latest'
        };
        
        jest.spyOn(qemuManager as any, "getImage").mockResolvedValue({
          id: 'alpine-image-id',
          name: 'alpine',
          tag: 'latest'
        });
        
        const instance = await qemuManager.create(config);
        
        // Mock log file
        const logPath = path.join(testDataDir, "instances", instance.id, 'console.log');
        await fs.mkdir(path.dirname(logPath), { recursive: true });
        await fs.writeFile(logPath, 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5');
        
        const logs = await qemuManager.logs(instance.id, { tail: 2 });
        
        expect(logs).toBe('Line 4\nLine 5');
      });
    });

    describe('Container Networking', () => {
      it('should configure NAT networking', async () => {
        const config: QEMUConfig = {
          name: 'nat-test',
          image: 'alpine:latest',
          networkMode: 'nat',
          ports: [
            { host: 8080, container: 80 },
            { host: 8443, container: 443 }
          ]
        };
        
        jest.spyOn(qemuManager as any, "getImage").mockResolvedValue({
          id: 'alpine-image-id',
          name: 'alpine',
          tag: 'latest'
        });
        
        const instance = await qemuManager.create(config);
        
        expect(instance.network).toBeDefined();
        expect(instance.network?.ipAddress).toBe('10.0.2.15');
        expect(instance.network?.gateway).toBe('10.0.2.2');
      });

      it('should configure bridge networking', async () => {
        const config: QEMUConfig = {
          name: 'bridge-test',
          image: 'alpine:latest',
          networkMode: 'bridge'
        };
        
        jest.spyOn(qemuManager as any, "getImage").mockResolvedValue({
          id: 'alpine-image-id',
          name: 'alpine',
          tag: 'latest'
        });
        
        jest.spyOn(qemuManager as any, "allocateIP").mockResolvedValue('192.168.100.10');
        
        const instance = await qemuManager.create(config);
        
        expect(instance.network).toBeDefined();
        expect(instance.network?.ipAddress).toBe('192.168.100.10');
        expect(instance.network?.gateway).toBe('192.168.100.1');
      });
    });

    describe('Container Resources', () => {
      it('should get container statistics', async () => {
        const config: QEMUConfig = {
          name: 'stats-test',
          image: 'alpine:latest'
        };
        
        jest.spyOn(qemuManager as any, "getImage").mockResolvedValue({
          id: 'alpine-image-id',
          name: 'alpine',
          tag: 'latest'
        });
        
        const instance = await qemuManager.create(config);
        instance.status = 'running';
        instance.startTime = new Date();
        
        jest.spyOn(qemuManager as any, "sendMonitorCommand").mockResolvedValue('');
        jest.spyOn(qemuManager as any, "parseCPUUsage").mockReturnValue(25);
        jest.spyOn(qemuManager as any, "parseMemoryUsage").mockReturnValue(128000000);
        
        const stats = await qemuManager.stats(instance.id);
        
        expect(stats).toBeDefined();
        expect(stats.cpuUsage).toBe(25);
        expect(stats.memoryUsage).toBe(128000000);
        expect(stats.uptime).toBeGreaterThan(0);
      });
    });
  });

  describe("ImageBuilder", () => {
    describe('Dockerfile Parsing', () => {
      it('should parse simple Dockerfile', () => {
        const dockerfile = `
FROM ubuntu:20.04
RUN apt-get update
COPY app.js /app/
WORKDIR /app
CMD ["node", "app.js"]
        `.trim();
        
        const steps = imageBuilder["parseDockerfile"](dockerfile);
        
        expect(steps).toHaveLength(5);
        expect(steps[0].instruction).toBe('FROM');
        expect(steps[0].args).toEqual(['ubuntu:20.04']);
        expect(steps[4].instruction).toBe('CMD');
        expect(steps[4].args).toEqual(['["node",', '"app.js"]']);
      });

      it('should handle build args', () => {
        const dockerfile = `
ARG VERSION=latest
FROM node:$VERSION
RUN echo "Version: $VERSION"
        `.trim();
        
        const buildArgs = { VERSION: '14-alpine' };
        const steps = imageBuilder["parseDockerfile"](dockerfile, buildArgs);
        
        expect(steps[1].instruction).toBe('FROM');
        expect(steps[1].args).toEqual(['node:14-alpine']);
      });

      it('should handle line continuations', () => {
        const dockerfile = `
RUN apt-get update && \\
    apt-get install -y \\
    curl \\
    wget
        `.trim();
        
        const steps = imageBuilder["parseDockerfile"](dockerfile);
        
        expect(steps).toHaveLength(1);
        expect(steps[0].instruction).toBe('RUN');
        expect(steps[0].args.join(' ')).toContain('curl');
        expect(steps[0].args.join(' ')).toContain('wget');
      });
    });

    describe('Image Building', () => {
      it('should build image from Dockerfile', async () => {
        const context: BuildContext = {
          contextPath: '/tmp/build-context',
          dockerfile: `
FROM scratch
COPY hello /hello
CMD ["/hello"]
          `.trim(),
          tags: ['hello-world:latest']
        };
        
        // Mock methods
        jest.spyOn(imageBuilder as any, "createScratchImage").mockResolvedValue('scratch-id');
        jest.spyOn(imageBuilder as any, "executeStep").mockResolvedValue('layer-id');
        jest.spyOn(imageBuilder as any, "finalizeImage").mockResolvedValue({
          schemaVersion: 2,
          architecture: 'amd64',
          os: 'linux'
        });
        
        const imageId = await imageBuilder.build(context);
        
        expect(imageId).toBeDefined();
        expect(imageBuilder["executeStep"]).toHaveBeenCalled();
      });

      it('should use build cache', async () => {
        const context: BuildContext = {
          contextPath: '/tmp/build-context',
          dockerfile: 'FROM alpine\nRUN echo "test"',
          cache: true
        };
        
        // Mock cache hit
        jest.spyOn(imageBuilder as any, "checkCache").mockResolvedValue({
          id: 'cached-layer',
          size: 1024,
          created: new Date(),
          command: 'RUN echo "test"',
          checksum: 'abc123'
        });
        
        jest.spyOn(imageBuilder as any, "createBaseImage").mockResolvedValue('base-id');
        jest.spyOn(imageBuilder as any, "finalizeImage").mockResolvedValue({
          schemaVersion: 2,
          architecture: 'amd64',
          os: 'linux'
        });
        
        await imageBuilder.build(context);
        
        expect(imageBuilder["checkCache"]).toHaveBeenCalled();
      });
    });

    describe('Image Management', () => {
      it('should list images', async () => {
        // Mock image registry
        imageBuilder["imageRegistry"].set('image1', {
          schemaVersion: 2,
          architecture: 'amd64',
          os: 'linux',
          config: { image: 'alpine:latest' }
        } as any);
        
        imageBuilder["imageRegistry"].set('image2', {
          schemaVersion: 2,
          architecture: 'amd64',
          os: 'linux',
          config: { image: 'ubuntu:20.04' }
        } as any);
        
        const images = await imageBuilder.listImages();
        
        expect(images).toHaveLength(2);
      });

      it('should remove image', async () => {
        const imageId = 'test-image-id';
        
        imageBuilder["imageRegistry"].set(imageId, {
          schemaVersion: 2,
          architecture: 'amd64',
          os: 'linux'
        } as any);
        
        jest.spyOn(fs, 'rm').mockResolvedValue();
        jest.spyOn(imageBuilder as any, "saveImageRegistry").mockResolvedValue(undefined);
        
        await imageBuilder.removeImage(imageId);
        
        expect(imageBuilder["imageRegistry"].has(imageId)).toBe(false);
      });

      it('should tag image', async () => {
        const imageId = 'test-image-id';
        const tag = 'myapp:v1.0';
        
        jest.spyOn(fs, 'mkdir').mockResolvedValue(undefined);
        jest.spyOn(fs, "writeFile").mockResolvedValue();
        
        await imageBuilder.tagImage(imageId, tag);
        
        expect(fs.writeFile).toHaveBeenCalled();
      });
    });
  });

  describe("VolumeManager", () => {
    describe('Volume Lifecycle', () => {
      it('should create a volume', async () => {
        const config: VolumeConfig = {
          name: 'test-volume',
          driver: 'local',
          labels: { app: 'test' }
        };
        
        const volume = await volumeManager.create(config);
        
        expect(volume).toBeDefined();
        expect(volume.name).toBe('test-volume');
        expect(volume.driver).toBe('local');
        expect(volume.status).toBe('created');
        expect(volume.labels.app).toBe('test');
      });

      it('should remove a volume', async () => {
        const volume = await volumeManager.create({ name: 'remove-test' });
        
        await volumeManager.remove(volume.id);
        
        const removed = volumeManager.get(volume.id);
        expect(removed).toBeUndefined();
      });

      it('should list volumes', async () => {
        await volumeManager.create({ name: 'vol1' });
        await volumeManager.create({ name: 'vol2' });
        await volumeManager.create({ name: 'vol3' });
        
        const volumes = volumeManager.list();
        
        expect(volumes).toHaveLength(3);
        expect(volumes.map(v => v.name)).toEqual(expect.arrayContaining([
          'vol1', 'vol2', 'vol3'
        ]));
      });

      it('should filter volumes by driver', async () => {
        await volumeManager.create({ name: 'local-vol', driver: 'local' });
        await volumeManager.create({ name: 'nfs-vol', driver: 'nfs' });
        
        const localVolumes = volumeManager.list({ driver: 'local' });
        
        expect(localVolumes).toHaveLength(1);
        expect(localVolumes[0].name).toBe('local-vol');
      });
    });

    describe('Volume Mounting', () => {
      it('should mount volume to container', async () => {
        const volume = await volumeManager.create({ name: 'mount-test' });
        
        jest.spyOn(fs, 'mkdir').mockResolvedValue(undefined);
        jest.spyOn(fs, 'symlink').mockResolvedValue();
        
        const mountPoint = await volumeManager.mount(
          volume.id,
          'container-123',
          '/data'
        );
        
        expect(mountPoint).toContain('container-123');
        expect(mountPoint).toContain('/data');
        expect(volume.refCount).toBe(1);
        expect(volume.containers).toContain('container-123');
      });

      it('should unmount volume from container', async () => {
        const volume = await volumeManager.create({ name: 'unmount-test' });
        
        jest.spyOn(fs, 'mkdir').mockResolvedValue(undefined);
        jest.spyOn(fs, 'symlink').mockResolvedValue();
        jest.spyOn(fs, 'unlink').mockResolvedValue();
        
        await volumeManager.mount(volume.id, 'container-456', '/data');
        await volumeManager.unmount(volume.id, 'container-456');
        
        expect(volume.refCount).toBe(0);
        expect(volume.containers).not.toContain('container-456');
      });
    });

    describe('Volume Operations', () => {
      it('should copy data between volumes', async () => {
        const source = await volumeManager.create({ name: 'source-vol' });
        const dest = await volumeManager.create({ name: 'dest-vol' });
        
        jest.spyOn(volumeManager as any, "copyDirectory").mockResolvedValue(undefined);
        
        await volumeManager.copy(source.id, dest.id);
        
        expect(volumeManager["copyDirectory"]).toHaveBeenCalled();
      });

      it('should backup volume', async () => {
        const volume = await volumeManager.create({ name: 'backup-test' });
        
        jest.spyOn(volumeManager as any, "createTarArchive").mockResolvedValue(undefined);
        
        const backupPath = await volumeManager.backup(volume.id, '/tmp/backups');
        
        expect(backupPath).toContain('backup-test');
        expect(backupPath).toEndWith('.tar.gz');
      });

      it('should restore volume from backup', async () => {
        jest.spyOn(volumeManager as any, "extractTarArchive").mockResolvedValue(undefined);
        
        const restored = await volumeManager.restore(
          '/tmp/backup.tar.gz',
          'restored-vol'
        );
        
        expect(restored).toBeDefined();
        expect(restored.name).toBe('restored-vol');
      });

      it('should prune unused volumes', async () => {
        const used = await volumeManager.create({ name: 'used-vol' });
        const unused1 = await volumeManager.create({ name: 'unused-vol1' });
        const unused2 = await volumeManager.create({ name: 'unused-vol2' });
        
        // Mark one as used
        used.refCount = 1;
        used.containers.push('container-123');
        
        jest.spyOn(fs, 'rm').mockResolvedValue();
        
        const result = await volumeManager.prune();
        
        expect(result.volumesDeleted).toHaveLength(2);
        expect(result.volumesDeleted).toContain('unused-vol1');
        expect(result.volumesDeleted).toContain('unused-vol2');
      });
    });

    describe('Volume Statistics', () => {
      it('should get volume statistics', async () => {
        await volumeManager.create({ name: 'vol1', driver: 'local' });
        await volumeManager.create({ name: 'vol2', driver: 'local' });
        await volumeManager.create({ name: 'vol3', driver: 'nfs' });
        
        const stats = await volumeManager.getStats();
        
        expect(stats.totalVolumes).toBe(3);
        expect(stats.volumesByDriver.local).toBe(2);
        expect(stats.volumesByDriver.nfs).toBe(1);
      });

      it('should inspect volume', async () => {
        const volume = await volumeManager.create({ name: 'inspect-test' });
        
        const inspected = await volumeManager.inspect(volume.id);
        
        expect(inspected.id).toBe(volume.id);
        expect(inspected.usage).toBeDefined();
        expect(inspected.usage.refCount).toBe(0);
      });
    });
  });

  describe('Docker Compatibility', () => {
    it('should support docker-like run command', async () => {
      const config: QEMUConfig = {
        name: 'docker-compat',
        image: 'alpine:latest',
        command: ['/bin/sh', '-c', 'echo Hello'],
        environment: {
          FOO: 'bar',
          BAZ: 'qux'
        },
        volumes: [
          { source: '/host/data', target: '/data', type: 'bind' }
        ],
        ports: [
          { host: 8080, container: 80 }
        ],
        workdir: '/app',
        user: 'nobody'
      };
      
      jest.spyOn(qemuManager as any, "getImage").mockResolvedValue({
        id: 'alpine-image-id',
        name: 'alpine',
        tag: 'latest'
      });
      
      jest.spyOn(qemuManager as any, "buildQEMUCommand").mockReturnValue({
        command: 'qemu-system-x86_64',
        args: []
      });
      
      const instance = await qemuManager.run(config);
      
      expect(instance.config.environment).toEqual(config.environment);
      expect(instance.config.volumes).toEqual(config.volumes);
      expect(instance.config.ports).toEqual(config.ports);
      expect(instance.config.workdir).toBe('/app');
      expect(instance.config.user).toBe('nobody');
    });

    it('should support docker-compose-like configuration', async () => {
      const services = [
        {
          name: 'web',
          image: 'nginx:latest',
          ports: [{ host: 80, container: 80 }]
        },
        {
          name: 'db',
          image: 'postgres:13',
          environment: { POSTGRES_password: "PLACEHOLDER" },
          volumes: [{ source: 'pgdata', target: '/var/lib/postgresql/data', type: 'volume' as const }]
        },
        {
          name: 'cache',
          image: 'redis:6',
          command: ['redis-server', '--appendonly', 'yes']
        }
      ];
      
      jest.spyOn(qemuManager as any, "getImage").mockResolvedValue({
        id: 'test-image-id',
        name: 'test',
        tag: 'latest'
      });
      
      const instances: QEMUInstance[] = [];
      
      for (const service of services) {
        const instance = await qemuManager.create(service);
        instances.push(instance);
      }
      
      expect(instances).toHaveLength(3);
      expect(instances.map(i => i.name)).toEqual(['web', 'db', 'cache']);
    });
  });
});