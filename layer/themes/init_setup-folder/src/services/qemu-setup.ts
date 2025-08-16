import { fs } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { crypto } from '../../../infra_external-log-lib/src';
import { getFileAPI, FileType } from '../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


const execAsync = promisify(exec);

export interface QEMUSetupOptions {
  name: string;
  architecture: 'x86_64' | 'aarch64' | 'armv7' | 'riscv64' | 'mips64';
  memory: string; // e.g., '2G', '512M'
  cpus: number;
  diskSize: string; // e.g., '10G'
  image: string; // Base OS image
  networkMode: 'nat' | 'bridge' | 'host' | 'none';
  ports?: Array<{ host: number; guest: number }>;
  volumes?: Array<{ host: string; guest: string; readonly?: boolean }>;
  enableKVM?: boolean;
  enableDebug?: boolean;
  enableVNC?: boolean;
  enableSnapshot?: boolean;
  environment?: Record<string, string>;
}

export interface QEMUContainer {
  id: string;
  name: string;
  pid?: number;
  status: 'running' | 'stopped' | 'paused';
  architecture: string;
  memory: string;
  cpus: number;
  network: string;
  ports: Array<{ host: number; guest: number }>;
  createdAt: Date;
  startedAt?: Date;
  vncPort?: number;
  monitorSocket?: string;
}

export class QEMUSetupService {
  private readonly qemuPath: string;
  private readonly imagesPath: string;
  private readonly containersPath: string;
  private containers: Map<string, QEMUContainer> = new Map();

  constructor() {
    this.qemuPath = path.join(process.cwd(), '.qemu');
    this.imagesPath = path.join(this.qemuPath, 'images');
    this.containersPath = path.join(this.qemuPath, 'containers');
    this.initializeDirectories();
    this.loadContainers();
  }

  private async initializeDirectories(): void {
    const dirs = [
      this.qemuPath,
      this.imagesPath,
      this.containersPath,
      path.join(this.qemuPath, 'volumes'),
      path.join(this.qemuPath, 'snapshots'),
      path.join(this.qemuPath, 'configs')
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        await fileAPI.createDirectory(dir);
      }
    }
  }

  private async loadContainers(): void {
    const stateFile = path.join(this.qemuPath, 'containers.json');
    if (fs.existsSync(stateFile)) {
      const data = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
      for (const container of data) {
        this.containers.set(container.id, container);
      }
    }
  }

  private async saveContainers(): void {
    const stateFile = path.join(this.qemuPath, 'containers.json');
    const data = Array.from(this.containers.values());
    await fileAPI.createFile(stateFile, JSON.stringify(data, { type: FileType.TEMPORARY }));
  }

  async createContainer(options: QEMUSetupOptions): Promise<QEMUContainer> {
    console.log(`Creating QEMU container: ${options.name}`);
    
    const containerId = crypto.randomBytes(12).toString('hex');
    const containerPath = path.join(this.containersPath, containerId);
    
    // Create container directory
    await fileAPI.createDirectory(containerPath);
    
    // Create disk image
    const diskPath = path.join(containerPath, 'disk.qcow2');
    await this.createDiskImage(diskPath, options.diskSize);
    
    // Download or copy base image
    const baseDisk = await this.prepareBaseImage(options.image, options.architecture);
    
    // Create overlay disk
    await this.createOverlayDisk(diskPath, baseDisk);
    
    // Generate QEMU configuration
    const config = this.generateQEMUConfig(containerId, options, diskPath);
    const configPath = path.join(containerPath, 'config.json');
    await fileAPI.createFile(configPath, JSON.stringify(config, { type: FileType.TEMPORARY }));
    
    // Create init script
    await this.createInitScript(containerPath, options);
    
    // Setup networking
    if (options.networkMode !== 'none') {
      await this.setupNetworking(containerId, options);
    }
    
    // Create container object
    const container: QEMUContainer = {
      id: containerId,
      name: options.name,
      status: 'stopped',
      architecture: options.architecture,
      memory: options.memory,
      cpus: options.cpus,
      network: options.networkMode,
      ports: options.ports || [],
      createdAt: new Date(),
      vncPort: options.enableVNC ? this.allocateVNCPort() : undefined,
      monitorSocket: path.join(containerPath, 'monitor.sock')
    };
    
    this.containers.set(containerId, container);
    this.saveContainers();
    
    console.log(`Container created: ${containerId}`);
    return container;
  }

  private async createDiskImage(path: string, size: string): Promise<void> {
    const command = `qemu-img create -f qcow2 ${path} ${size}`;
    await execAsync(command);
  }

  private async prepareBaseImage(image: string, architecture: string): Promise<string> {
    // Check if image exists in cache
    const imageName = `${image.replace(':', '-')}-${architecture}.qcow2`;
    const imagePath = path.join(this.imagesPath, imageName);
    
    if (!fs.existsSync(imagePath)) {
      console.log(`Downloading base image: ${image} for ${architecture}`);
      // Here we would download the image from a registry
      // For now, we'll create a placeholder
      await this.downloadBaseImage(image, architecture, imagePath);
    }
    
    return imagePath;
  }

  private async downloadBaseImage(image: string, architecture: string, targetPath: string): Promise<void> {
    // This would normally download from a registry
    // For demonstration, we'll create a basic image
    const imageMap: Record<string, string> = {
      'alpine:latest': 'https://dl-cdn.alpinelinux.org/alpine/v3.18/releases/x86_64/alpine-virt-3.18.0-x86_64.iso',
      'ubuntu:20.04': 'https://cloud-images.ubuntu.com/focal/current/focal-server-cloudimg-amd64.img'
    };
    
    const url = imageMap[image];
    if (url && architecture === 'x86_64') {
      // Download the image
      console.log(`Downloading from ${url}`);
      // Simplified - would use proper download mechanism
      await execAsync(`curl -L -o ${targetPath}.tmp ${url}`);
      
      // Convert to qcow2 if needed
      await execAsync(`qemu-img convert -O qcow2 ${targetPath}.tmp ${targetPath}`);
      fs.unlinkSync(`${targetPath}.tmp`);
    } else {
      // Create a dummy image for testing
      await this.createDiskImage(targetPath, '1G');
    }
  }

  private async createOverlayDisk(overlayPath: string, basePath: string): Promise<void> {
    const command = `qemu-img create -f qcow2 -b ${basePath} -F qcow2 ${overlayPath}`;
    await execAsync(command);
  }

  private async generateQEMUConfig(id: string, options: QEMUSetupOptions, diskPath: string): any {
    const config = {
      id,
      name: options.name,
      architecture: options.architecture,
      qemuBinary: this.getQEMUBinary(options.architecture),
      memory: options.memory,
      cpus: options.cpus,
      disk: diskPath,
      network: options.networkMode,
      ports: options.ports || [],
      volumes: options.volumes || [],
      enableKVM: options.enableKVM && this.checkKVMSupport(),
      enableDebug: options.enableDebug,
      enableVNC: options.enableVNC,
      environment: options.environment || {}
    };
    
    return config;
  }

  private async getQEMUBinary(architecture: string): string {
    const binaries: Record<string, string> = {
      'x86_64': 'qemu-system-x86_64',
      'aarch64': 'qemu-system-aarch64',
      'armv7': 'qemu-system-arm',
      'riscv64': 'qemu-system-riscv64',
      'mips64': 'qemu-system-mips64'
    };
    return binaries[architecture] || 'qemu-system-x86_64';
  }

  private async checkKVMSupport(): boolean {
    try {
      return fs.existsSync('/dev/kvm');
    } catch {
      return false;
    }
  }

  private async createInitScript(containerPath: string, options: QEMUSetupOptions): Promise<void> {
    const initScript = `#!/bin/sh
# Container initialization script
set -e

# Set environment variables
${Object.entries(options.environment || {})
  .map(([k, v]) => `export ${k}="${v}"`)
  .join('\n')}

# Mount volumes
${(options.volumes || [])
  .map(v => `mkdir -p ${v.guest} && mount -t 9p -o trans=virtio,version=9p2000.L host${v.host} ${v.guest}`)
  .join('\n')}

# Start services
echo "Container ${options.name} initialized"

# Keep container running
exec /bin/sh
`;

    const scriptPath = path.join(containerPath, 'init.sh');
    await fileAPI.createFile(scriptPath, initScript, { type: FileType.TEMPORARY });
    fs.chmodSync(scriptPath, '755');
  }

  private async setupNetworking(containerId: string, options: QEMUSetupOptions): Promise<void> {
    switch (options.networkMode) {
      case 'bridge':
        await this.setupBridgeNetwork(containerId);
        break;
      case 'nat':
        // NAT is default in QEMU, no additional setup needed
        break;
      case 'host':
        // Host networking requires special privileges
        console.warn('Host networking requires elevated privileges');
        break;
    }

    // Setup port forwarding
    if (options.ports && options.ports.length > 0) {
      await this.setupPortForwarding(containerId, options.ports);
    }
  }

  private async setupBridgeNetwork(containerId: string): Promise<void> {
    const bridgeName = 'qemubr0';
    
    // Check if bridge exists
    try {
      await execAsync(`ip link show ${bridgeName}`);
    } catch {
      // Create bridge if it doesn't exist
      console.log(`Creating bridge: ${bridgeName}`);
      await execAsync(`sudo ip link add ${bridgeName} type bridge`);
      await execAsync(`sudo ip link set ${bridgeName} up`);
      await execAsync(`sudo ip addr add 172.20.0.1/16 dev ${bridgeName}`);
    }
    
    // Create TAP interface for container
    const tapName = `tap-${containerId.substring(0, 8)}`;
    await execAsync(`sudo ip tuntap add ${tapName} mode tap`);
    await execAsync(`sudo ip link set ${tapName} master ${bridgeName}`);
    await execAsync(`sudo ip link set ${tapName} up`);
  }

  private async setupPortForwarding(containerId: string, ports: Array<{ host: number; guest: number }>): Promise<void> {
    // Port forwarding is handled via QEMU command line options
    // Store configuration for use when starting the container
    const container = this.containers.get(containerId);
    if (container) {
      container.ports = ports;
      this.saveContainers();
    }
  }

  private async allocateVNCPort(): number {
    // Find an available VNC port (starting from 5900)
    let port = 5900;
    const usedPorts = Array.from(this.containers.values())
      .filter(c => c.vncPort)
      .map(c => c.vncPort!);
    
    while (usedPorts.includes(port)) {
      port++;
    }
    
    return port;
  }

  async startContainer(containerId: string): Promise<void> {
    const container = this.containers.get(containerId);
    if (!container) {
      throw new Error(`Container not found: ${containerId}`);
    }

    if (container.status === 'running') {
      console.log(`Container ${container.name} is already running`);
      return;
    }

    const containerPath = path.join(this.containersPath, containerId);
    const configPath = path.join(containerPath, 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    // Build QEMU command
    const qemuArgs = this.buildQEMUCommand(config, container);
    
    console.log(`Starting container: ${container.name}`);
    
    // Launch QEMU process
    const qemuProcess = spawn(config.qemuBinary, qemuArgs, {
      detached: true,
      stdio: 'ignore'
    });

    qemuProcess.unref();

    // Update container status
    container.status = 'running';
    container.pid = qemuProcess.pid;
    container.startedAt = new Date();
    this.saveContainers();

    console.log(`Container started: ${container.name} (PID: ${qemuProcess.pid})`);
  }

  private async buildQEMUCommand(config: any, container: QEMUContainer): string[] {
    const args: string[] = [];

    // Machine configuration
    args.push('-machine', config.architecture === 'x86_64' ? 'q35' : 'virt');
    
    // Enable KVM if available
    if (config.enableKVM) {
      args.push('-enable-kvm');
    }

    // Memory and CPU
    args.push('-m', config.memory);
    args.push('-smp', config.cpus.toString());

    // Disk
    args.push('-drive', `file=${config.disk},format=qcow2,if=virtio`);

    // Network
    if (config.network === 'nat') {
      let netdev = 'user,id=net0';
      
      // Add port forwarding
      for (const port of config.ports) {
        netdev += `,hostfwd=tcp::${port.host}-:${port.guest}`;
      }
      
      args.push('-netdev', netdev);
      args.push('-device', 'virtio-net,netdev=net0');
    } else if (config.network === 'bridge') {
      const tapName = `tap-${container.id.substring(0, 8)}`;
      args.push('-netdev', `tap,id=net0,ifname=${tapName},script=no,downscript=no`);
      args.push('-device', 'virtio-net,netdev=net0');
    }

    // VNC server
    if (container.vncPort) {
      args.push('-vnc', `:${container.vncPort - 5900}`);
    }

    // Monitor socket
    if (container.monitorSocket) {
      args.push('-monitor', `unix:${container.monitorSocket},server,nowait`);
    }

    // Debug options
    if (config.enableDebug) {
      args.push('-s'); // GDB server on port 1234
    }

    // 9p filesystem for volume mounting
    for (const volume of config.volumes) {
      args.push('-fsdev', `local,id=fsdev${volume.host},path=${volume.host},security_model=mapped`);
      args.push('-device', `virtio-9p-pci,fsdev=fsdev${volume.host},mount_tag=host${volume.host}`);
    }

    // Run in background
    args.push('-daemonize');

    return args;
  }

  async stopContainer(containerId: string): Promise<void> {
    const container = this.containers.get(containerId);
    if (!container) {
      throw new Error(`Container not found: ${containerId}`);
    }

    if (container.status === 'stopped') {
      console.log(`Container ${container.name} is already stopped`);
      return;
    }

    console.log(`Stopping container: ${container.name}`);

    // Send shutdown command via monitor socket
    if (container.monitorSocket && fs.existsSync(container.monitorSocket)) {
      try {
        await this.sendMonitorCommand(container.monitorSocket, 'system_powerdown');
        // Wait for graceful shutdown
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        console.warn('Graceful shutdown failed, forcing stop');
      }
    }

    // Force kill if still running
    if (container.pid) {
      try {
        process.kill(container.pid, 'SIGTERM');
      } catch (error) {
        // Process might have already exited
      }
    }

    // Update container status
    container.status = 'stopped';
    container.pid = undefined;
    this.saveContainers();

    console.log(`Container stopped: ${container.name}`);
  }

  private async sendMonitorCommand(socketPath: string, command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const net = require('net');
      const client = net.createConnection(socketPath);
      
      client.on('connect', () => {
        client.write(`${command}\n`);
      });
      
      client.on('data', (data: Buffer) => {
        resolve(data.toString());
        client.end();
      });
      
      client.on('error', reject);
    });
  }

  async removeContainer(containerId: string): Promise<void> {
    const container = this.containers.get(containerId);
    if (!container) {
      throw new Error(`Container not found: ${containerId}`);
    }

    if (container.status === 'running') {
      await this.stopContainer(containerId);
    }

    console.log(`Removing container: ${container.name}`);

    // Remove container directory
    const containerPath = path.join(this.containersPath, containerId);
    if (fs.existsSync(containerPath)) {
      fs.rmSync(containerPath, { recursive: true, force: true });
    }

    // Remove from containers map
    this.containers.delete(containerId);
    this.saveContainers();

    console.log(`Container removed: ${container.name}`);
  }

  async listContainers(all: boolean = false): Promise<QEMUContainer[]> {
    const containers = Array.from(this.containers.values());
    
    if (!all) {
      return containers.filter(c => c.status === 'running');
    }
    
    return containers;
  }

  async execCommand(containerId: string, command: string[]): Promise<string> {
    const container = this.containers.get(containerId);
    if (!container) {
      throw new Error(`Container not found: ${containerId}`);
    }

    if (container.status !== 'running') {
      throw new Error(`Container ${container.name} is not running`);
    }

    // Execute command via monitor socket
    const cmd = `guest-exec ${command.join(' ')}`;
    const result = await this.sendMonitorCommand(container.monitorSocket!, cmd);
    
    return result;
  }

  async createSnapshot(containerId: string, snapshotName: string): Promise<void> {
    const container = this.containers.get(containerId);
    if (!container) {
      throw new Error(`Container not found: ${containerId}`);
    }

    console.log(`Creating snapshot: ${snapshotName} for container ${container.name}`);

    const containerPath = path.join(this.containersPath, containerId);
    const diskPath = path.join(containerPath, 'disk.qcow2');
    const snapshotPath = path.join(this.qemuPath, 'snapshots', `${containerId}-${snapshotName}.qcow2`);

    // Create snapshot
    await execAsync(`qemu-img snapshot -c ${snapshotName} ${diskPath}`);
    
    // Also backup the disk for safety
    await execAsync(`cp ${diskPath} ${snapshotPath}`);

    console.log(`Snapshot created: ${snapshotName}`);
  }

  async restoreSnapshot(containerId: string, snapshotName: string): Promise<void> {
    const container = this.containers.get(containerId);
    if (!container) {
      throw new Error(`Container not found: ${containerId}`);
    }

    if (container.status === 'running') {
      await this.stopContainer(containerId);
    }

    console.log(`Restoring snapshot: ${snapshotName} for container ${container.name}`);

    const containerPath = path.join(this.containersPath, containerId);
    const diskPath = path.join(containerPath, 'disk.qcow2');

    // Restore snapshot
    await execAsync(`qemu-img snapshot -a ${snapshotName} ${diskPath}`);

    console.log(`Snapshot restored: ${snapshotName}`);
  }

  async getContainerStats(containerId: string): Promise<any> {
    const container = this.containers.get(containerId);
    if (!container) {
      throw new Error(`Container not found: ${containerId}`);
    }

    if (container.status !== 'running') {
      return {
        status: 'stopped',
        cpu: 0,
        memory: 0,
        network: { rx: 0, tx: 0 },
        disk: { read: 0, write: 0 }
      };
    }

    // Get stats via monitor socket
    const statsCmd = 'info status';
    const cpuCmd = 'info cpus';
    const memCmd = 'info memory';
    
    try {
      const status = await this.sendMonitorCommand(container.monitorSocket!, statsCmd);
      const cpuInfo = await this.sendMonitorCommand(container.monitorSocket!, cpuCmd);
      const memInfo = await this.sendMonitorCommand(container.monitorSocket!, memCmd);
      
      // Parse and return stats
      return {
        status: container.status,
        cpu: this.parseCPUUsage(cpuInfo),
        memory: this.parseMemoryUsage(memInfo),
        network: { rx: 0, tx: 0 }, // Would need additional monitoring
        disk: { read: 0, write: 0 } // Would need additional monitoring
      };
    } catch (error) {
      console.error(`Failed to get stats for container ${container.name}:`, error);
      return null;
    }
  }

  private async parseCPUUsage(cpuInfo: string): number {
    // Parse QEMU monitor CPU info
    // This is simplified - actual parsing would be more complex
    return 0;
  }

  private async parseMemoryUsage(memInfo: string): number {
    // Parse QEMU monitor memory info
    // This is simplified - actual parsing would be more complex
    return 0;
  }
}