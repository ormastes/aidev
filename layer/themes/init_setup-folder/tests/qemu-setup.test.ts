import { QEMUSetupService, QEMUSetupOptions, QEMUContainer } from '../src/services/qemu-setup';
import { fs } from '../../infra_external-log-lib/src';
import { path } from '../../infra_external-log-lib/src';
import { crypto } from '../../infra_external-log-lib/src';

describe("QEMUSetupService", () => {
  let service: QEMUSetupService;
  const testQemuPath = path.join(process.cwd(), '.qemu');

  beforeEach(() => {
    // Clean up any existing test directories
    if (fs.existsSync(testQemuPath)) {
      fs.rmSync(testQemuPath, { recursive: true, force: true });
    }
    service = new QEMUSetupService();
  });

  afterEach(() => {
    // Clean up test directories
    if (fs.existsSync(testQemuPath)) {
      fs.rmSync(testQemuPath, { recursive: true, force: true });
    }
  });

  describe('Directory initialization', () => {
    it('should create required directories on initialization', () => {
      expect(fs.existsSync(testQemuPath)).toBe(true);
      expect(fs.existsSync(path.join(testQemuPath, 'images'))).toBe(true);
      expect(fs.existsSync(path.join(testQemuPath, "containers"))).toBe(true);
      expect(fs.existsSync(path.join(testQemuPath, 'volumes'))).toBe(true);
      expect(fs.existsSync(path.join(testQemuPath, "snapshots"))).toBe(true);
      expect(fs.existsSync(path.join(testQemuPath, 'configs'))).toBe(true);
    });
  });

  describe('Container creation', () => {
    it('should create a container with basic options', async () => {
      const options: QEMUSetupOptions = {
        name: 'test-container',
        architecture: 'x86_64',
        memory: '1G',
        cpus: 2,
        diskSize: '5G',
        image: 'alpine:latest',
        networkMode: 'nat'
      };

      const container = await service.createContainer(options);

      expect(container).toBeDefined();
      expect(container.name).toBe('test-container');
      expect(container.architecture).toBe('x86_64');
      expect(container.memory).toBe('1G');
      expect(container.cpus).toBe(2);
      expect(container.network).toBe('nat');
      expect(container.status).toBe('stopped');
      expect(container.id).toBeDefined();
      expect(container.id).toHaveLength(24); // crypto.randomBytes(12).toString('hex')
    });

    it('should create container directory structure', async () => {
      const options: QEMUSetupOptions = {
        name: 'test-container',
        architecture: 'x86_64',
        memory: '1G',
        cpus: 1,
        diskSize: '5G',
        image: 'alpine:latest',
        networkMode: 'nat'
      };

      const container = await service.createContainer(options);
      const containerPath = path.join(testQemuPath, "containers", container.id);

      expect(fs.existsSync(containerPath)).toBe(true);
      expect(fs.existsSync(path.join(containerPath, 'config.json'))).toBe(true);
      expect(fs.existsSync(path.join(containerPath, 'init.sh'))).toBe(true);
      expect(fs.existsSync(path.join(containerPath, 'disk.qcow2'))).toBe(true);
    });

    it('should generate correct QEMU configuration', async () => {
      const options: QEMUSetupOptions = {
        name: 'test-container',
        architecture: 'aarch64',
        memory: '2G',
        cpus: 4,
        diskSize: '10G',
        image: 'ubuntu:20.04',
        networkMode: 'bridge',
        ports: [
          { host: 8080, guest: 80 },
          { host: 8443, guest: 443 }
        ],
        enableKVM: true,
        enableVNC: true,
        enableDebug: true
      };

      const container = await service.createContainer(options);
      const containerPath = path.join(testQemuPath, "containers", container.id);
      const configPath = path.join(containerPath, 'config.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

      expect(config.name).toBe('test-container');
      expect(config.architecture).toBe('aarch64');
      expect(config.qemuBinary).toBe('qemu-system-aarch64');
      expect(config.memory).toBe('2G');
      expect(config.cpus).toBe(4);
      expect(config.network).toBe('bridge');
      expect(config.ports).toEqual([
        { host: 8080, guest: 80 },
        { host: 8443, guest: 443 }
      ]);
      expect(config.enableDebug).toBe(true);
      expect(config.enableVNC).toBe(true);
    });

    it('should allocate VNC port when enabled', async () => {
      const containers: QEMUContainer[] = [];

      // Create multiple containers with VNC
      for (let i = 0; i < 3; i++) {
        const options: QEMUSetupOptions = {
          name: `vnc-container-${i}`,
          architecture: 'x86_64',
          memory: '512M',
          cpus: 1,
          diskSize: '1G',
          image: 'alpine:latest',
          networkMode: 'nat',
          enableVNC: true
        };

        const container = await service.createContainer(options);
        containers.push(container);
      }

      // Check that VNC ports are allocated sequentially
      expect(containers[0].vncPort).toBe(5900);
      expect(containers[1].vncPort).toBe(5901);
      expect(containers[2].vncPort).toBe(5902);
    });

    it('should create init script with environment variables', async () => {
      const options: QEMUSetupOptions = {
        name: 'env-container',
        architecture: 'x86_64',
        memory: '1G',
        cpus: 1,
        diskSize: '5G',
        image: 'alpine:latest',
        networkMode: 'nat',
        environment: {
          NODE_ENV: "production",
          PORT: '3000',
          DEBUG: 'true'
        }
      };

      const container = await service.createContainer(options);
      const initScriptPath = path.join(testQemuPath, "containers", container.id, 'init.sh');
      const initScript = fs.readFileSync(initScriptPath, 'utf-8');

      expect(initScript).toContain('export NODE_ENV="production"');
      expect(initScript).toContain('export PORT="3000"');
      expect(initScript).toContain('export DEBUG="true"');
    });

    it('should configure volumes in init script', async () => {
      const options: QEMUSetupOptions = {
        name: 'volume-container',
        architecture: 'x86_64',
        memory: '1G',
        cpus: 1,
        diskSize: '5G',
        image: 'alpine:latest',
        networkMode: 'nat',
        volumes: [
          { host: '/home/user/data', guest: '/data', readonly: false },
          { host: '/var/log', guest: '/logs', readonly: true }
        ]
      };

      const container = await service.createContainer(options);
      const initScriptPath = path.join(testQemuPath, "containers", container.id, 'init.sh');
      const initScript = fs.readFileSync(initScriptPath, 'utf-8');

      expect(initScript).toContain('mkdir -p /data');
      expect(initScript).toContain('mount -t 9p');
      expect(initScript).toContain('host/home/user/data /data');
      expect(initScript).toContain('mkdir -p /logs');
      expect(initScript).toContain('host/var/log /logs');
    });
  });

  describe('Container lifecycle', () => {
    it('should list containers', async () => {
      // Create test containers
      const container1 = await service.createContainer({
        name: 'container-1',
        architecture: 'x86_64',
        memory: '512M',
        cpus: 1,
        diskSize: '1G',
        image: 'alpine:latest',
        networkMode: 'nat'
      });

      const container2 = await service.createContainer({
        name: 'container-2',
        architecture: 'x86_64',
        memory: '512M',
        cpus: 1,
        diskSize: '1G',
        image: 'alpine:latest',
        networkMode: 'nat'
      });

      // List all containers
      const allContainers = await service.listContainers(true);
      expect(allContainers).toHaveLength(2);
      expect(allContainers.map(c => c.name)).toContain('container-1');
      expect(allContainers.map(c => c.name)).toContain('container-2');

      // List only running containers (should be empty)
      const runningContainers = await service.listContainers(false);
      expect(runningContainers).toHaveLength(0);
    });

    it('should persist container state', async () => {
      const options: QEMUSetupOptions = {
        name: 'persistent-container',
        architecture: 'x86_64',
        memory: '1G',
        cpus: 2,
        diskSize: '5G',
        image: 'alpine:latest',
        networkMode: 'nat'
      };

      const container = await service.createContainer(options);

      // Create a new service instance to test persistence
      const newService = new QEMUSetupService();
      const containers = await newService.listContainers(true);

      expect(containers).toHaveLength(1);
      expect(containers[0].name).toBe('persistent-container');
      expect(containers[0].id).toBe(container.id);
    });

    it('should remove container', async () => {
      const container = await service.createContainer({
        name: 'removable-container',
        architecture: 'x86_64',
        memory: '512M',
        cpus: 1,
        diskSize: '1G',
        image: 'alpine:latest',
        networkMode: 'nat'
      });

      const containerPath = path.join(testQemuPath, "containers", container.id);
      expect(fs.existsSync(containerPath)).toBe(true);

      await service.removeContainer(container.id);

      expect(fs.existsSync(containerPath)).toBe(false);
      const containers = await service.listContainers(true);
      expect(containers).toHaveLength(0);
    });
  });

  describe('QEMU command building', () => {
    it('should build correct QEMU command for x86_64', async () => {
      const options: QEMUSetupOptions = {
        name: 'x86-container',
        architecture: 'x86_64',
        memory: '2G',
        cpus: 4,
        diskSize: '10G',
        image: 'ubuntu:20.04',
        networkMode: 'nat',
        ports: [{ host: 8080, guest: 80 }],
        enableKVM: true,
        enableVNC: true,
        enableDebug: true
      };

      const container = await service.createContainer(options);
      const containerPath = path.join(testQemuPath, "containers", container.id);
      const config = JSON.parse(fs.readFileSync(path.join(containerPath, 'config.json'), 'utf-8'));

      // Test command building logic
      expect(config.qemuBinary).toBe('qemu-system-x86_64');
      expect(config.enableKVM).toBeDefined();
      expect(config.enableVNC).toBe(true);
      expect(config.enableDebug).toBe(true);
      expect(config.ports).toContainEqual({ host: 8080, guest: 80 });
    });

    it('should build correct QEMU command for ARM', async () => {
      const options: QEMUSetupOptions = {
        name: 'arm-container',
        architecture: 'aarch64',
        memory: '1G',
        cpus: 2,
        diskSize: '5G',
        image: 'arm64v8/alpine:latest',
        networkMode: 'bridge'
      };

      const container = await service.createContainer(options);
      const containerPath = path.join(testQemuPath, "containers", container.id);
      const config = JSON.parse(fs.readFileSync(path.join(containerPath, 'config.json'), 'utf-8'));

      expect(config.qemuBinary).toBe('qemu-system-aarch64');
      expect(config.architecture).toBe('aarch64');
      expect(config.network).toBe('bridge');
    });

    it('should support multiple architectures', async () => {
      const architectures: Array<{ arch: QEMUSetupOptions["architecture"], binary: string }> = [
        { arch: 'x86_64', binary: 'qemu-system-x86_64' },
        { arch: 'aarch64', binary: 'qemu-system-aarch64' },
        { arch: 'armv7', binary: 'qemu-system-arm' },
        { arch: 'riscv64', binary: 'qemu-system-riscv64' },
        { arch: 'mips64', binary: 'qemu-system-mips64' }
      ];

      for (const { arch, binary } of architectures) {
        const options: QEMUSetupOptions = {
          name: `${arch}-container`,
          architecture: arch,
          memory: '512M',
          cpus: 1,
          diskSize: '1G',
          image: 'alpine:latest',
          networkMode: 'nat'
        };

        const container = await service.createContainer(options);
        const containerPath = path.join(testQemuPath, "containers", container.id);
        const config = JSON.parse(fs.readFileSync(path.join(containerPath, 'config.json'), 'utf-8'));

        expect(config.qemuBinary).toBe(binary);
      }
    });
  });

  describe("Networking", () => {
    it('should configure NAT networking with port forwarding', async () => {
      const options: QEMUSetupOptions = {
        name: 'nat-container',
        architecture: 'x86_64',
        memory: '1G',
        cpus: 1,
        diskSize: '5G',
        image: 'alpine:latest',
        networkMode: 'nat',
        ports: [
          { host: 3000, guest: 3000 },
          { host: 8080, guest: 80 },
          { host: 8443, guest: 443 }
        ]
      };

      const container = await service.createContainer(options);
      expect(container.ports).toEqual([
        { host: 3000, guest: 3000 },
        { host: 8080, guest: 80 },
        { host: 8443, guest: 443 }
      ]);
    });

    it('should configure bridge networking', async () => {
      const options: QEMUSetupOptions = {
        name: 'bridge-container',
        architecture: 'x86_64',
        memory: '1G',
        cpus: 1,
        diskSize: '5G',
        image: 'alpine:latest',
        networkMode: 'bridge'
      };

      const container = await service.createContainer(options);
      expect(container.network).toBe('bridge');
    });

    it('should support host networking mode', async () => {
      const options: QEMUSetupOptions = {
        name: 'host-container',
        architecture: 'x86_64',
        memory: '1G',
        cpus: 1,
        diskSize: '5G',
        image: 'alpine:latest',
        networkMode: 'host'
      };

      const container = await service.createContainer(options);
      expect(container.network).toBe('host');
    });

    it('should support no networking', async () => {
      const options: QEMUSetupOptions = {
        name: 'isolated-container',
        architecture: 'x86_64',
        memory: '1G',
        cpus: 1,
        diskSize: '5G',
        image: 'alpine:latest',
        networkMode: 'none'
      };

      const container = await service.createContainer(options);
      expect(container.network).toBe('none');
    });
  });

  describe('Snapshot functionality', () => {
    it('should create and restore snapshots', async () => {
      const container = await service.createContainer({
        name: 'snapshot-container',
        architecture: 'x86_64',
        memory: '1G',
        cpus: 1,
        diskSize: '5G',
        image: 'alpine:latest',
        networkMode: 'nat',
        enableSnapshot: true
      });

      const snapshotName = 'test-snapshot';
      
      // Create snapshot
      await service.createSnapshot(container.id, snapshotName);
      
      const snapshotPath = path.join(
        testQemuPath,
        "snapshots",
        `${container.id}-${snapshotName}.qcow2`
      );
      
      expect(fs.existsSync(snapshotPath)).toBe(true);

      // Test restore (would normally restore the disk image)
      await service.restoreSnapshot(container.id, snapshotName);
    });
  });

  describe('Error handling', () => {
    it('should throw error when container not found', async () => {
      const invalidId = 'nonexistent-container';
      
      await expect(service.stopContainer(invalidId)).rejects.toThrow('Container not found');
      await expect(service.removeContainer(invalidId)).rejects.toThrow('Container not found');
      await expect(service.execCommand(invalidId, ['ls'])).rejects.toThrow('Container not found');
    });

    it('should throw error when executing command on stopped container', async () => {
      const container = await service.createContainer({
        name: 'stopped-container',
        architecture: 'x86_64',
        memory: '512M',
        cpus: 1,
        diskSize: '1G',
        image: 'alpine:latest',
        networkMode: 'nat'
      });

      await expect(service.execCommand(container.id, ['ls'])).rejects.toThrow('is not running');
    });
  });

  describe('Container statistics', () => {
    it('should return stats for stopped container', async () => {
      const container = await service.createContainer({
        name: 'stats-container',
        architecture: 'x86_64',
        memory: '1G',
        cpus: 2,
        diskSize: '5G',
        image: 'alpine:latest',
        networkMode: 'nat'
      });

      const stats = await service.getContainerStats(container.id);
      
      expect(stats).toBeDefined();
      expect(stats.status).toBe('stopped');
      expect(stats.cpu).toBe(0);
      expect(stats.memory).toBe(0);
      expect(stats.network.rx).toBe(0);
      expect(stats.network.tx).toBe(0);
    });
  });
});