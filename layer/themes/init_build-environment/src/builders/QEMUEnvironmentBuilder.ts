import { EventEmitter } from '../../../infra_external-log-lib/src';
import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import { path } from '../../../infra_external-log-lib/src';
import { BuildEnvironment, Architecture } from '../core/BuildEnvironmentManager';

const execAsync = promisify(exec);

export interface QEMUConfig {
  system: string;
  machine: string;
  cpu: string;
  memory: string;
  cores: number;
  threads: number;
  kernel?: string;
  initrd?: string;
  rootfs: string;
  network: QEMUNetwork;
  graphics: boolean;
  vnc?: string;
  monitor?: string;
  serial?: string;
  drives: QEMUDrive[];
  shares: QEMUShare[];
  devices: string[];
  extraArgs: string[];
}

export interface QEMUNetwork {
  type: 'none' | 'user' | 'tap' | 'bridge' | 'vde';
  interface?: string;
  ports?: QEMUPortForward[];
  mac?: string;
}

export interface QEMUPortForward {
  protocol: 'tcp' | 'udp';
  hostPort: number;
  guestPort: number;
}

export interface QEMUDrive {
  file: string;
  format: 'raw' | 'qcow2' | 'vmdk' | 'vdi';
  interface: 'ide' | 'scsi' | 'virtio' | 'nvme';
  readonly?: boolean;
  cache?: 'none' | 'writethrough' | 'writeback' | 'directsync' | 'unsafe';
}

export interface QEMUShare {
  hostPath: string;
  guestMount: string;
  readonly?: boolean;
  security?: 'passthrough' | 'mapped' | 'none';
}

export interface QEMUInstance {
  pid: number;
  process: ChildProcess;
  config: QEMUConfig;
  ssh?: SSHConfig;
  monitor?: MonitorConnection;
  startTime: Date;
}

export interface SSHConfig {
  host: string;
  port: number;
  user: string;
  keyPath?: string;
}

export interface MonitorConnection {
  socket: string;
  connected: boolean;
}

export class QEMUEnvironmentBuilder extends EventEmitter {
  private instances: Map<string, QEMUInstance>;
  private readonly imagePath: string;
  private readonly configPath: string;

  constructor(config: {
    imagePath?: string;
    configPath?: string;
  } = {}) {
    async super();
    this.instances = new Map();
    this.imagePath = config.imagePath || path.join(process.cwd(), '.qemu', 'images');
    this.configPath = config.configPath || path.join(process.cwd(), '.qemu', 'configs');
  }

  async initialize(): Promise<void> {
    this.emit('init:start');

    // Create directories
    await fileAPI.createDirectory(this.imagePath);
    await fileAPI.createDirectory(this.configPath);

    // Check QEMU installation
    await this.checkQEMUInstallation();

    this.emit('init:complete');
  }

  async buildEnvironment(environment: BuildEnvironment): Promise<QEMUConfig> {
    this.emit('build:start', { name: environment.name });

    // Generate QEMU configuration
    const config = await this.generateQEMUConfig(environment);

    // Prepare root filesystem
    await this.prepareRootFS(environment, config);

    // Set up networking
    await this.configureNetworking(environment, config);

    // Set up shared folders
    await this.configureShares(environment, config);

    // Save configuration
    await this.saveConfig(environment.name, config);

    this.emit('build:complete', { name: environment.name });
    return config;
  }

  async startInstance(name: string, config?: QEMUConfig): Promise<QEMUInstance> {
    this.emit('instance:start', { name });

    // Load config if not provided
    if(!config) {
      config = await this.loadConfig(name);
    }

    // Build QEMU command
    const command = this.buildQEMUCommand(config);

    // Start QEMU process
    const process = spawn(command.cmd, command.args, {
      detached: true,
      stdio: 'pipe'
    });

    const instance: QEMUInstance = {
      pid: process.pid!,
      process,
      config,
      startTime: new Date()
    };

    // Set up SSH if configured
    if(config.network.type === 'user' && config.network.ports) {
      const sshPort = config.network.ports.find(p => p.guestPort === 22);
      if(sshPort) {
        instance.ssh = {
          host: 'localhost',
          port: sshPort.hostPort,
          user: 'root'
        };
      }
    }

    // Set up monitor connection if configured
    if(config.monitor) {
      instance.monitor = {
        socket: config.monitor,
        connected: false
      };
    }

    // Store instance
    this.instances.set(name, instance);

    // Wait for boot
    await this.waitForBoot(instance);

    this.emit('instance:started', { name, pid: instance.pid });
    return instance;
  }

  async stopInstance(name: string): Promise<void> {
    this.emit('instance:stop', { name });

    const instance = this.instances.get(name);
    if(!instance) {
      throw new Error(`Instance '${name}' not found`);
    }

    // Try graceful shutdown first
    if(instance.monitor?.connected) {
      await this.sendMonitorCommand(instance, 'system_powerdown');
      await this.waitForShutdown(instance, 30000);
    }

    // Force kill if still running
    if(instance.process && !instance.process.killed) {
      instance.process.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      if(!instance.process.killed) {
        instance.process.kill('SIGKILL');
      }
    }

    this.instances.delete(name);
    this.emit('instance:stopped', { name });
  }

  private async generateQEMUConfig(environment: BuildEnvironment): Promise<QEMUConfig> {
    const arch = environment.architecture;
    
    const config: QEMUConfig = {
      system: this.getQEMUSystem(arch),
      machine: this.getQEMUMachine(arch),
      cpu: this.getQEMUCPU(arch, environment.cpu.model),
      memory: this.calculateMemory(environment),
      cores: environment.cpu.cores,
      threads: environment.cpu.threadsPerCore,
      rootfs: await this.getRootFS(environment),
      network: this.getNetworkConfig(environment),
      graphics: false,
      drives: [],
      shares: [],
      devices: this.getDevices(arch),
      extraArgs: []
    };

    // Add kernel and initrd for some architectures
    if(arch.arch === 'arm' || arch.arch === 'aarch64' || arch.arch === 'riscv64') {
      config.kernel = await this.getKernel(arch);
      config.initrd = await this.getInitrd(arch);
    }

    // Configure drives
    config.drives.push({
      file: config.rootfs,
      format: 'qcow2',
      interface: 'virtio',
      cache: 'writeback'
    });

    // Configure shares for volumes
    if(environment.volumes) {
      for(const volume of environment.volumes) {
        config.shares.push({
          hostPath: volume.source,
          guestMount: volume.target,
          readonly: volume.readOnly,
          security: 'mapped'
        });
      }
    }

    // Add monitor for control
    config.monitor = `unix:${path.join(this.configPath, `${environment.name}.monitor`)},server,nowait`;

    // Add serial console
    config.serial = 'stdio';

    // Add VNC for graphical access if needed
    if(environment.target.os === 'android' || environment.target.os === 'ios') {
      config.graphics = true;
      config.vnc = ':1';
    }

    return config;
  }

  async private getQEMUSystem(arch: Architecture): string {
    const systemMap: Record<string, string> = {
      'x86_64': 'qemu-system-x86_64',
      'aarch64': 'qemu-system-aarch64',
      'arm': 'qemu-system-arm',
      'riscv64': 'qemu-system-riscv64',
      'mips': 'qemu-system-mips64',
      'ppc64le': 'qemu-system-ppc64'
    };

    return systemMap[arch.arch] || 'qemu-system-x86_64';
  }

  async private getQEMUMachine(arch: Architecture): string {
    const machineMap: Record<string, string> = {
      'x86_64': 'q35,accel=kvm:tcg',
      'aarch64': 'virt',
      'arm': 'virt',
      'riscv64': 'virt',
      'mips': 'malta',
      'ppc64le': 'pseries'
    };

    return machineMap[arch.arch] || 'pc';
  }

  async private getQEMUCPU(arch: Architecture, model?: string): string {
    if(model && model !== 'native') {
      return model;
    }

    const cpuMap: Record<string, string> = {
      'x86_64': 'host',
      'aarch64': 'cortex-a72',
      'arm': 'cortex-a15',
      'riscv64': 'rv64',
      'mips': 'MIPS64R2-generic',
      'ppc64le': 'POWER9'
    };

    return cpuMap[arch.arch] || 'max';
  }

  async private calculateMemory(environment: BuildEnvironment): string {
    // Calculate based on available system memory and requirements
    const minMemory = 512; // MB
    const recommendedMemory = environment.cpu.cores * 512; // MB per core
    const maxMemory = 8192; // MB

    const memory = Math.min(Math.max(minMemory, recommendedMemory), maxMemory);
    return `${memory}M`;
  }

  async private getNetworkConfig(environment: BuildEnvironment): QEMUNetwork {
    const network: QEMUNetwork = {
      type: 'user',
      ports: []
    };

    // Add SSH port forwarding
    network.ports!.push({
      protocol: 'tcp',
      hostPort: 2222,
      guestPort: 22
    });

    // Add custom port forwards
    if(environment.network?.ports) {
      for(const port of environment.network.ports) {
        network.ports!.push({
          protocol: port.protocol || 'tcp',
          hostPort: port.host,
          guestPort: port.container
        });
      }
    }

    return network;
  }

  async private getDevices(arch: Architecture): string[] {
    const devices: string[] = [];

    // Add virtio devices for better performance
    devices.push('virtio-balloon-pci');
    devices.push('virtio-rng-pci');

    // Add USB support
    if(arch.arch === 'x86_64' || arch.arch === 'aarch64') {
      devices.push('qemu-xhci');
      devices.push('usb-tablet');
    }

    return devices;
  }

  private async getRootFS(environment: BuildEnvironment): Promise<string> {
    const rootfsPath = path.join(this.imagePath, `${environment.name}.qcow2`);

    // Check if rootfs already exists
    try {
      await fs.access(rootfsPath);
      return rootfsPath;
    } catch {
      // Create new rootfs
      await this.createRootFS(environment, rootfsPath);
      return rootfsPath;
    }
  }

  private async createRootFS(environment: BuildEnvironment, outputPath: string): Promise<void> {
    this.emit('rootfs:create', { environment: environment.name });

    // Get base image for the target OS
    const baseImage = await this.getBaseImage(environment.target.os);

    // Create qcow2 image
    await execAsync(`qemu-img create -f qcow2 -F qcow2 -b ${baseImage} ${outputPath} 20G`);

    this.emit('rootfs:created', { path: outputPath });
  }

  private async getBaseImage(os: string): Promise<string> {
    const baseImages: Record<string, string> = {
      'linux': path.join(this.imagePath, 'base', 'ubuntu-22.04.qcow2'),
      'android': path.join(this.imagePath, 'base', 'android-12.qcow2'),
      'freebsd': path.join(this.imagePath, 'base', 'freebsd-13.qcow2'),
      'windows': path.join(this.imagePath, 'base', 'windows-10.qcow2')
    };

    const baseImage = baseImages[os];
    if(!baseImage) {
      throw new Error(`No base image available for OS: ${os}`);
    }

    // Download base image if not exists
    try {
      await fs.access(baseImage);
    } catch {
      await this.downloadBaseImage(os, baseImage);
    }

    return baseImage;
  }

  private async downloadBaseImage(os: string, outputPath: string): Promise<void> {
    this.emit('image:download', { os });

    const imageUrls: Record<string, string> = {
      'linux': 'https://cloud-images.ubuntu.com/releases/22.04/release/ubuntu-22.04-server-cloudimg-amd64.img',
      'android': 'https://dl.google.com/android/repository/sys-img/android/x86_64-31_r01.zip',
      'freebsd': 'https://download.freebsd.org/ftp/releases/VM-IMAGES/13.2-RELEASE/amd64/Latest/FreeBSD-13.2-RELEASE-amd64.qcow2.xz'
    };

    const url = imageUrls[os];
    if(!url) {
      throw new Error(`No download URL for OS: ${os}`);
    }

    // Create directory
    await fileAPI.createDirectory(path.dirname(outputPath));

    // Download image
    await execAsync(`wget -O ${outputPath}.tmp ${url}`);

    // Extract if compressed
    if(url.endsWith('.xz')) {
      await execAsync(`xz -d ${outputPath}.tmp`);
      await fs.rename(`${outputPath}.tmp`, outputPath);
    } else if (url.endsWith('.zip')) {
      await execAsync(`unzip ${outputPath}.tmp -d ${path.dirname(outputPath)}`);
      // Find and rename the image file
      const files = await fs.readdir(path.dirname(outputPath));
      const imgFile = files.find(f => f.endsWith('.img'));
      if(imgFile) {
        await fs.rename(path.join(path.dirname(outputPath), imgFile), outputPath);
      }
      await fs.unlink(`${outputPath}.tmp`);
    } else {
      await fs.rename(`${outputPath}.tmp`, outputPath);
    }

    // Convert to qcow2 if needed
    if(!outputPath.endsWith('.qcow2')) {
      await execAsync(`qemu-img convert -O qcow2 ${outputPath} ${outputPath}.qcow2`);
      await fs.unlink(outputPath);
      await fs.rename(`${outputPath}.qcow2`, outputPath);
    }

    this.emit('image:downloaded', { os, path: outputPath });
  }

  private async getKernel(arch: Architecture): Promise<string> {
    const kernelPath = path.join(this.imagePath, 'kernels', `${arch.arch}-kernel`);
    
    // Download kernel if not exists
    try {
      await fs.access(kernelPath);
    } catch {
      await this.downloadKernel(arch, kernelPath);
    }

    return kernelPath;
  }

  private async getInitrd(arch: Architecture): Promise<string> {
    const initrdPath = path.join(this.imagePath, 'kernels', `${arch.arch}-initrd`);
    
    // Download initrd if not exists
    try {
      await fs.access(initrdPath);
    } catch {
      await this.downloadInitrd(arch, initrdPath);
    }

    return initrdPath;
  }

  private async downloadKernel(arch: Architecture, outputPath: string): Promise<void> {
    // Implementation would download appropriate kernel for architecture
    await fileAPI.createDirectory(path.dirname(outputPath));
    // Placeholder - actual implementation would download real kernel
    await fileAPI.createFile(outputPath, 'kernel-placeholder');
  }

  private async downloadInitrd(arch: Architecture, { type: FileType.TEMPORARY }): Promise<void> {
    // Implementation would download appropriate initrd for architecture
    await fileAPI.createDirectory(path.dirname(outputPath));
    // Placeholder - actual implementation would download real initrd
    await fileAPI.createFile(outputPath, 'initrd-placeholder');
  }

  private async prepareRootFS(environment: BuildEnvironment, { type: FileType.TEMPORARY }): Promise<void> {
    // Mount and prepare the root filesystem with necessary tools and dependencies
    // This would typically involve:
    // 1. Mounting the qcow2 image
    // 2. Installing compilers and tools
    // 3. Setting up environment
    // 4. Unmounting

    this.emit('rootfs:prepare', { environment: environment.name });
    // Implementation details omitted for brevity
  }

  private async configureNetworking(environment: BuildEnvironment, config: QEMUConfig): Promise<void> {
    // Configure network bridges, TAP interfaces, etc.
    this.emit('network:configure', { environment: environment.name });
    // Implementation details omitted for brevity
  }

  private async configureShares(environment: BuildEnvironment, config: QEMUConfig): Promise<void> {
    // Set up 9p shares for folder sharing
    this.emit('shares:configure', { environment: environment.name });
    // Implementation details omitted for brevity
  }

  async private buildQEMUCommand(config: QEMUConfig): { cmd: string; args: string[] } {
    const args: string[] = [];

    // Machine and CPU
    args.push('-machine', config.machine);
    args.push('-cpu', config.cpu);
    args.push('-smp', `cores=${config.cores},threads=${config.threads}`);
    args.push('-m', config.memory);

    // Kernel and initrd (if specified)
    if(config.kernel) {
      args.push('-kernel', config.kernel);
    }
    if(config.initrd) {
      args.push('-initrd', config.initrd);
    }

    // Drives
    for(let i = 0; i < config.drives.length; i++) {
      const drive = config.drives[i];
      args.push('-drive', `file=${drive.file},format=${drive.format},if=${drive.interface},cache=${drive.cache || 'writeback'}`);
    }

    // Network
    if(config.network.type !== 'none') {
      let netdev = `type=${config.network.type},id=net0`;
      
      if(config.network.ports) {
        const hostfwd = config.network.ports.map(p => 
          `hostfwd=${p.protocol}::${p.hostPort}-:${p.guestPort}`
        ).join(',');
        netdev += `,${hostfwd}`;
      }

      args.push('-netdev', netdev);
      args.push('-device', 'virtio-net-pci,netdev=net0');
    }

    // Graphics
    if(!config.graphics) {
      args.push('-nographic');
    } else if (config.vnc) {
      args.push('-vnc', config.vnc);
    }

    // Monitor
    if(config.monitor) {
      args.push('-monitor', config.monitor);
    }

    // Serial
    if(config.serial) {
      args.push('-serial', config.serial);
    }

    // Devices
    for(const device of config.devices) {
      args.push('-device', device);
    }

    // 9p shares
    for(let i = 0; i < config.shares.length; i++) {
      const share = config.shares[i];
      args.push('-fsdev', `local,id=fsdev${i},path=${share.hostPath},security_model=${share.security || 'mapped'}`);
      args.push('-device', `virtio-9p-pci,fsdev=fsdev${i},mount_tag=share${i}`);
    }

    // Extra arguments
    args.push(...config.extraArgs);

    return { cmd: config.system, args };
  }

  private async waitForBoot(instance: QEMUInstance, timeout: number = 60000): Promise<void> {
    this.emit('boot:wait', { timeout });

    const startTime = Date.now();

    while(Date.now() - startTime < timeout) {
      // Check if SSH is available
      if(instance.ssh) {
        try {
          await execAsync(`nc -zv ${instance.ssh.host} ${instance.ssh.port}`);
          this.emit('boot:ready');
          return;
        } catch {
          // Not ready yet
        }
      }

      // Check process is still running
      if(instance.process.killed) {
        throw new Error('QEMU process terminated during boot');
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Boot timeout exceeded');
  }

  private async waitForShutdown(instance: QEMUInstance, timeout: number): Promise<void> {
    const startTime = Date.now();

    while(Date.now() - startTime < timeout) {
      if(instance.process.killed) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  private async sendMonitorCommand(instance: QEMUInstance, command: string): Promise<string> {
    // Send command to QEMU monitor
    // Implementation would use socket connection
    return '';
  }

  private async checkQEMUInstallation(): Promise<void> {
    const requiredBinaries = [
      'qemu-system-x86_64',
      'qemu-system-aarch64',
      'qemu-img',
      'qemu-nbd'
    ];

    const missing: string[] = [];

    for(const binary of requiredBinaries) {
      try {
        await execAsync(`which ${binary}`);
      } catch {
        missing.push(binary);
      }
    }

    if(missing.length > 0) {
      console.warn(`Missing QEMU binaries: ${missing.join(', ')}`);
    }
  }

  private async saveConfig(name: string, config: QEMUConfig): Promise<void> {
    const configFile = path.join(this.configPath, `${name}.json`);
    await fileAPI.createFile(configFile, JSON.stringify(config, { type: FileType.TEMPORARY }));
  }

  private async loadConfig(name: string): Promise<QEMUConfig> {
    const configFile = path.join(this.configPath, `${name}.json`);
    const content = await fs.readFile(configFile, 'utf-8');
    return JSON.parse(content);
  }

  async executeInInstance(
    instanceName: string,
    commands: string[]
  ): Promise<{ stdout: string; stderr: string; code: number }[]> {
    const instance = this.instances.get(instanceName);
    if(!instance || !instance.ssh) {
      throw new Error(`Instance '${instanceName}' not available for SSH`);
    }

    const results = [];

    for(const command of commands) {
      const sshCommand = `ssh -p ${instance.ssh.port} ${instance.ssh.user}@${instance.ssh.host} "${command}"`;
      
      try {
        const { stdout, stderr } = await execAsync(sshCommand);
        results.push({ stdout, stderr, code: 0 });
      } catch (error: any) {
        results.push({ 
          stdout: error.stdout || '', 
          stderr: error.stderr || error.message, 
          code: error.code || 1 
        });
      }
    }

    return results;
  }

  async copyToInstance(
    instanceName: string,
    localPath: string,
    remotePath: string
  ): Promise<void> {
    const instance = this.instances.get(instanceName);
    if(!instance || !instance.ssh) {
      throw new Error(`Instance '${instanceName}' not available for SSH`);
    }

    const scpCommand = `scp -P ${instance.ssh.port} -r ${localPath} ${instance.ssh.user}@${instance.ssh.host}:${remotePath}`;
    await execAsync(scpCommand);
  }

  async copyFromInstance(
    instanceName: string,
    remotePath: string,
    localPath: string
  ): Promise<void> {
    const instance = this.instances.get(instanceName);
    if(!instance || !instance.ssh) {
      throw new Error(`Instance '${instanceName}' not available for SSH`);
    }

    const scpCommand = `scp -P ${instance.ssh.port} -r ${instance.ssh.user}@${instance.ssh.host}:${remotePath} ${localPath}`;
    await execAsync(scpCommand);
  }

  getInstances(): string[] {
    return Array.from(this.instances.keys());
  }

  getInstance(name: string): QEMUInstance | undefined {
    return this.instances.get(name);
  }
}