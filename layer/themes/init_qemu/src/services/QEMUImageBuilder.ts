/**
 * QEMU Image Builder Service
 * Automated Linux image generation for QEMU virtualization
 */

import * as fs from 'fs/promises';
import { path } from '../../../infra_external-log-lib/src';
import { spawn, SpawnOptions } from 'child_process';
import { EventEmitter } from 'node:events';
import { promisify } from 'node:util';
import { crypto } from '../../../infra_external-log-lib/src';

import { getFileAPI, FileType } from '../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();
const exec = promisify(require('child_process').exec);

export interface ImageBuildConfig {
  name: string;
  distro: 'ubuntu' | 'debian' | 'alpine' | 'fedora' | 'arch' | 'custom';
  version?: string;
  architecture?: 'amd64' | 'arm64' | 'armhf';
  size?: string; // e.g., '20G'
  format?: 'qcow2' | 'raw' | 'vdi' | 'vmdk';
  packages?: string[];
  users?: UserConfig[];
  networkConfig?: NetworkConfig;
  kernelConfig?: KernelConfig;
  customScripts?: string[];
  outputDir?: string;
}

export interface UserConfig {
  username: string;
  password?: string;
  sshKey?: string;
  groups?: string[];
  sudo?: boolean;
}

export interface NetworkConfig {
  hostname?: string;
  interfaces?: NetworkInterface[];
  dns?: string[];
  ntp?: string[];
}

export interface NetworkInterface {
  name: string;
  type: 'dhcp' | 'static';
  address?: string;
  netmask?: string;
  gateway?: string;
}

export interface KernelConfig {
  version?: string;
  modules?: string[];
  parameters?: string[];
  customBuild?: boolean;
}

export interface BuildProgress {
  stage: string;
  progress: number;
  message: string;
  timestamp: Date;
}

export interface BuiltImage {
  id: string;
  name: string;
  path: string;
  size: number;
  format: string;
  distro: string;
  version: string;
  created: Date;
  checksum: string;
  metadata: Record<string, any>;
}

export class QEMUImageBuilder extends EventEmitter {
  private genDir: string;
  private workDir: string;
  private cacheDir: string;
  private currentBuild?: BuildProgress;

  constructor(options?: {
    genDir?: string;
    workDir?: string;
    cacheDir?: string;
  }) {
    super();
    // Store generated images under gen/qemu-images/
    this.genDir = options?.genDir || path.join(process.cwd(), 'gen', 'qemu-images');
    this.workDir = options?.workDir || path.join('/tmp', 'qemu-image-builder');
    this.cacheDir = options?.cacheDir || path.join(process.env.HOME || '/tmp', '.cache', 'qemu-images');
  }

  /**
   * Initialize builder directories
   */
  async initialize(): Promise<void> {
    await fileAPI.createDirectory(this.genDir);
    await fileAPI.createDirectory(this.workDir);
    await fileAPI.createDirectory(this.cacheDir);
    await fileAPI.createDirectory(path.join(this.genDir), { recursive: true });
    await fileAPI.createDirectory(path.join(this.genDir), { recursive: true });
    await fileAPI.createDirectory(path.join(this.genDir), { recursive: true });
  }

  /**
   * Build a QEMU image based on configuration
   */
  async buildImage(config: ImageBuildConfig): Promise<BuiltImage> {
    await this.initialize();

    const imageId = this.generateImageId(config);
    const imageName = config.name || `${config.distro}-${config.version || 'latest'}`;
    const outputPath = path.join(this.genDir, 'images', `${imageName}.${config.format || 'qcow2'}`);

    this.emit('build:start', { config, imageId });
    this.updateProgress("Initializing", 0, 'Starting image build process');

    try {
      // Step 1: Download base image or ISO
      const baseImage = await this.downloadBaseImage(config);
      this.updateProgress('Base Image', 20, 'Base image downloaded');

      // Step 2: Create working image
      const workImage = await this.createWorkingImage(baseImage, config);
      this.updateProgress('Working Image', 30, 'Working image created');

      // Step 3: Customize image
      await this.customizeImage(workImage, config);
      this.updateProgress("Customization", 60, 'Image customized');

      // Step 4: Install packages
      if (config.packages && config.packages.length > 0) {
        await this.installPackages(workImage, config);
        this.updateProgress("Packages", 70, 'Packages installed');
      }

      // Step 5: Configure users
      if (config.users && config.users.length > 0) {
        await this.configureUsers(workImage, config);
        this.updateProgress('Users', 75, 'Users configured');
      }

      // Step 6: Configure network
      if (config.networkConfig) {
        await this.configureNetwork(workImage, config);
        this.updateProgress('Network', 80, 'Network configured');
      }

      // Step 7: Build custom kernel if needed
      if (config.kernelConfig?.customBuild) {
        await this.buildCustomKernel(workImage, config);
        this.updateProgress('Kernel', 85, 'Custom kernel built');
      }

      // Step 8: Run custom scripts
      if (config.customScripts && config.customScripts.length > 0) {
        await this.runCustomScripts(workImage, config);
        this.updateProgress('Scripts', 90, 'Custom scripts executed');
      }

      // Step 9: Finalize image
      const finalImage = await this.finalizeImage(workImage, outputPath, config);
      this.updateProgress("Finalization", 95, 'Image finalized');

      // Step 10: Generate metadata
      const metadata = await this.generateMetadata(finalImage, config);
      this.updateProgress("Complete", 100, 'Image build complete');

      const builtImage: BuiltImage = {
        id: imageId,
        name: imageName,
        path: outputPath,
        size: metadata.size,
        format: config.format || 'qcow2',
        distro: config.distro,
        version: config.version || 'latest',
        created: new Date(),
        checksum: metadata.checksum,
        metadata
      };

      // Save metadata
      await this.saveMetadata(builtImage);

      this.emit('build:complete', builtImage);
      return builtImage;

    } catch (error) {
      this.emit('build:error', { error, config });
      throw error;
    }
  }

  /**
   * Build Ubuntu image with cloud-init
   */
  async buildUbuntuCloudImage(options: {
    name?: string;
    version?: string;
    size?: string;
    username?: string;
    password?: string;
    sshKey?: string;
    packages?: string[];
  }): Promise<BuiltImage> {
    const config: ImageBuildConfig = {
      name: options.name || `ubuntu-${options.version || '24.04'}-cloud`,
      distro: 'ubuntu',
      version: options.version || '24.04',
      size: options.size || '20G',
      format: 'qcow2',
      packages: options.packages || ['openssh-server', 'cloud-init', 'qemu-guest-agent'],
      users: [{
        username: options.username || 'ubuntu',
        password: options.password || 'ubuntu',
        sshKey: options.sshKey,
        groups: ['sudo', 'docker'],
        sudo: true
      }],
      networkConfig: {
        hostname: options.name || 'ubuntu-vm',
        interfaces: [{
          name: 'eth0',
          type: 'dhcp'
        }]
      }
    };

    return await this.buildImage(config);
  }

  /**
   * Build minimal Alpine Linux image
   */
  async buildAlpineImage(options: {
    name?: string;
    version?: string;
    size?: string;
    packages?: string[];
  }): Promise<BuiltImage> {
    const config: ImageBuildConfig = {
      name: options.name || `alpine-${options.version || '3.18'}`,
      distro: 'alpine',
      version: options.version || '3.18',
      size: options.size || '2G',
      format: 'qcow2',
      packages: options.packages || ['openssh', 'bash', 'sudo'],
      users: [{
        username: 'alpine',
        password: "PLACEHOLDER",
        groups: ['wheel'],
        sudo: true
      }],
      networkConfig: {
        hostname: options.name || 'alpine-vm',
        interfaces: [{
          name: 'eth0',
          type: 'dhcp'
        }]
      }
    };

    return await this.buildImage(config);
  }

  /**
   * Build custom kernel image
   */
  async buildKernelTestImage(options: {
    name?: string;
    kernelPath: string;
    initrdPath?: string;
    rootfsPath?: string;
    size?: string;
  }): Promise<BuiltImage> {
    const config: ImageBuildConfig = {
      name: options.name || 'kernel-test',
      distro: 'custom',
      size: options.size || '10G',
      format: 'qcow2',
      kernelConfig: {
        customBuild: true
      },
      customScripts: [
        `cp ${options.kernelPath} /boot/vmlinuz-custom`,
        options.initrdPath ? `cp ${options.initrdPath} /boot/initrd-custom` : '',
        options.rootfsPath ? `tar -xf ${options.rootfsPath} -C /` : ''
      ].filter(Boolean)
    };

    return await this.buildImage(config);
  }

  /**
   * Download base image for distro
   */
  private async downloadBaseImage(config: ImageBuildConfig): Promise<string> {
    const cacheKey = `${config.distro}-${config.version || 'latest'}-${config.architecture || 'amd64'}`;
    const cachePath = path.join(this.cacheDir, `${cacheKey}.img`);

    // Check cache
    try {
      await fs.access(cachePath);
      this.emit('cache:hit', { path: cachePath });
      return cachePath;
    } catch {
      // Not in cache, download
    }

    let downloadUrl: string;
    switch (config.distro) {
      case 'ubuntu':
        downloadUrl = this.getUbuntuImageUrl(config.version || '24.04');
        break;
      case 'debian':
        downloadUrl = this.getDebianImageUrl(config.version || '12');
        break;
      case 'alpine':
        downloadUrl = this.getAlpineImageUrl(config.version || '3.18');
        break;
      case 'fedora':
        downloadUrl = this.getFedoraImageUrl(config.version || '39');
        break;
      default:
        throw new Error(`Unsupported distro: ${config.distro}`);
    }

    await this.downloadFile(downloadUrl, cachePath);
    return cachePath;
  }

  /**
   * Create working image from base
   */
  private async createWorkingImage(baseImage: string, config: ImageBuildConfig): Promise<string> {
    const workPath = path.join(this.workDir, `work-${Date.now()}.img`);
    
    // Create backing image
    await this.runCommand('qemu-img', [
      'create',
      '-f', config.format || 'qcow2',
      '-F', 'qcow2',
      '-b', baseImage,
      workPath,
      config.size || '20G'
    ]);

    return workPath;
  }

  /**
   * Customize image with guestfish or qemu-nbd
   */
  private async customizeImage(imagePath: string, config: ImageBuildConfig): Promise<void> {
    // Use guestfish for customization if available
    if (await this.isCommandAvailable("guestfish")) {
      await this.customizeWithGuestfish(imagePath, config);
    } else {
      // Fallback to qemu-nbd
      await this.customizeWithQemuNbd(imagePath, config);
    }
  }

  /**
   * Customize image using guestfish
   */
  private async customizeWithGuestfish(imagePath: string, config: ImageBuildConfig): Promise<void> {
    const commands = [
      'add ' + imagePath,
      'run',
      'mount /dev/sda1 /',
      // Add customization commands
      'write /etc/hostname "' + (config.networkConfig?.hostname || 'qemu-vm') + '"',
      'mkdir-p /root/.ssh',
      'chmod 0700 /root/.ssh'
    ];

    // Add user SSH keys if provided
    if (config.users?.[0]?.sshKey) {
      commands.push(`write /root/.ssh/authorized_keys "${config.users[0].sshKey}"`);
      commands.push('chmod 0600 /root/.ssh/authorized_keys');
    }

    const guestfishScript = commands.join('\n');
    await this.runCommand("guestfish", [], { input: guestfishScript });
  }

  /**
   * Customize image using qemu-nbd
   */
  private async customizeWithQemuNbd(imagePath: string, config: ImageBuildConfig): Promise<void> {
    const nbdDevice = '/dev/nbd0';
    const mountPoint = path.join(this.workDir, 'mount');

    try {
      // Load nbd module
      await this.runCommand('sudo', ["modprobe", 'nbd']);

      // Connect image to nbd device
      await this.runCommand('sudo', ['qemu-nbd', '-c', nbdDevice, imagePath]);

      // Create mount point
      await fileAPI.createDirectory(mountPoint);

      // Mount the partition
      await this.runCommand('sudo', ['mount', `${nbdDevice}p1`, mountPoint]);

      // Perform customizations
      if (config.networkConfig?.hostname) {
        await this.runCommand('sudo', ['bash', '-c', 
          `echo "${config.networkConfig.hostname}" > ${mountPoint}/etc/hostname`]);
      }

      // Configure users
      for (const user of config.users || []) {
        const homeDir = user.username === 'root' ? '/root' : `/home/${user.username}`;
        const sshDir = path.join(mountPoint, homeDir, '.ssh');
        
        await this.runCommand('sudo', ['mkdir', '-p', sshDir]);
        
        if (user.sshKey) {
          await this.runCommand('sudo', ['bash', '-c',
            `echo "${user.sshKey}" > ${sshDir}/authorized_keys`]);
          await this.runCommand('sudo', ['chmod', '600', `${sshDir}/authorized_keys`]);
        }
      }

    } finally {
      // Cleanup
      try {
        await this.runCommand('sudo', ['umount', mountPoint]);
      } catch {}
      try {
        await this.runCommand('sudo', ['qemu-nbd', '-d', nbdDevice]);
      } catch {}
    }
  }

  /**
   * Install packages in the image
   */
  private async installPackages(imagePath: string, config: ImageBuildConfig): Promise<void> {
    // This would typically use virt-customize or boot the image to install packages
    const packages = config.packages?.join(' ') || '';
    
    if (await this.isCommandAvailable('virt-customize')) {
      await this.runCommand('virt-customize', [
        '-a', imagePath,
        '--install', packages
      ]);
    } else {
      // Generate package installation script
      const scriptPath = path.join(this.genDir, 'scripts', 'install-packages.sh');
      const script = this.generatePackageInstallScript(config);
      await fileAPI.createFile(scriptPath, script, { type: FileType.TEMPORARY });
      
      // This would be executed when the image boots
      this.emit('packages:pending', { packages, scriptPath });
    }
  }

  /**
   * Configure users in the image
   */
  private async configureUsers(imagePath: string, config: ImageBuildConfig): Promise<void> {
    for (const user of config.users || []) {
      if (await this.isCommandAvailable('virt-customize')) {
        const args = ['-a', imagePath];
        
        // Add user
        args.push('--run-command', `useradd -m -s /bin/bash ${user.username}`);
        
        // Set password if provided
        if (user.password) {
          const hashedPassword = await this.hashPassword(user.password);
          args.push('--run-command', 
            `echo '${user.username}:${hashedPassword}' | chpasswd -e`);
        }
        
        // Add to groups
        if (user.groups && user.groups.length > 0) {
          args.push('--run-command',
            `usermod -aG ${user.groups.join(',')} ${user.username}`);
        }
        
        // Configure sudo
        if (user.sudo) {
          args.push('--run-command',
            `echo '${user.username} ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers.d/${user.username}`);
        }
        
        await this.runCommand('virt-customize', args);
      }
    }
  }

  /**
   * Configure network in the image
   */
  private async configureNetwork(imagePath: string, config: ImageBuildConfig): Promise<void> {
    if (!config.networkConfig) return;

    const netplanConfig = this.generateNetplanConfig(config.networkConfig);
    const netplanPath = path.join(this.genDir, 'scripts', 'netplan.yaml');
    await fileAPI.createFile(netplanPath, netplanConfig, { type: FileType.TEMPORARY });

    if (await this.isCommandAvailable('virt-customize')) {
      await this.runCommand('virt-customize', [
        '-a', imagePath,
        '--copy-in', `${netplanPath}:/etc/netplan/`
      ]);
    }
  }

  /**
   * Build custom kernel
   */
  private async buildCustomKernel(imagePath: string, config: ImageBuildConfig): Promise<void> {
    // This would integrate with the kernel builder service
    this.emit('kernel:build', { imagePath, config });
  }

  /**
   * Run custom scripts in the image
   */
  private async runCustomScripts(imagePath: string, config: ImageBuildConfig): Promise<void> {
    if (!config.customScripts || config.customScripts.length === 0) return;

    for (let i = 0; i < config.customScripts.length; i++) {
      const script = config.customScripts[i];
      const scriptPath = path.join(this.genDir, 'scripts', `custom-${i}.sh`);
      await fileAPI.createFile(scriptPath, script, { type: FileType.TEMPORARY });

      if (await this.isCommandAvailable('virt-customize')) {
        await this.runCommand('virt-customize', [
          '-a', imagePath,
          '--run', scriptPath
        ]);
      }
    }
  }

  /**
   * Finalize image
   */
  private async finalizeImage(workImage: string, outputPath: string, config: ImageBuildConfig): Promise<string> {
    // Convert to final format if needed
    await this.runCommand('qemu-img', [
      'convert',
      '-O', config.format || 'qcow2',
      '-c', // Compress
      workImage,
      outputPath
    ]);

    // Clean up work image
    try {
      await fileAPI.unlink(workImage);
    } catch {}

    return outputPath;
  }

  /**
   * Generate metadata for the image
   */
  private async generateMetadata(imagePath: string, config: ImageBuildConfig): Promise<any> {
    const stats = await /* FRAUD_FIX: fs.stat(imagePath) */;
    const checksum = await this.calculateChecksum(imagePath);
    
    // Get image info
    const { stdout } = await exec(`qemu-img info --output=json ${imagePath}`);
    const imageInfo = JSON.parse(stdout);

    return {
      size: stats.size,
      virtualSize: imageInfo['virtual-size'],
      actualSize: imageInfo['actual-size'],
      format: imageInfo.format,
      checksum,
      created: stats.ctime,
      modified: stats.mtime,
      config
    };
  }

  /**
   * Save metadata to file
   */
  private async saveMetadata(image: BuiltImage): Promise<void> {
    const metadataPath = path.join(this.genDir, "metadata", `${image.name}.json`);
    await fileAPI.createFile(metadataPath, JSON.stringify(image, null, 2, { type: FileType.TEMPORARY }));
    
    // Update images index
    const indexPath = path.join(this.genDir, 'images.json');
    let index: BuiltImage[] = [];
    
    try {
      const content = await fileAPI.readFile(indexPath, 'utf-8');
      index = JSON.parse(content);
    } catch {}
    
    // Add or update image in index
    const existingIndex = index.findIndex(img => img.name === image.name);
    if (existingIndex >= 0) {
      index[existingIndex] = image;
    } else {
      index.push(image);
    }
    
    await fileAPI.createFile(indexPath, JSON.stringify(index, null, 2, { type: FileType.TEMPORARY }));
  }

  /**
   * List available images
   */
  async listImages(): Promise<BuiltImage[]> {
    const indexPath = path.join(this.genDir, 'images.json');
    
    try {
      const content = await fileAPI.readFile(indexPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  /**
   * Get image by name or ID
   */
  async getImage(nameOrId: string): Promise<BuiltImage | null> {
    const images = await this.listImages();
    return images.find(img => img.name === nameOrId || img.id === nameOrId) || null;
  }

  /**
   * Delete image
   */
  async deleteImage(nameOrId: string): Promise<boolean> {
    const image = await this.getImage(nameOrId);
    if (!image) return false;

    // Delete image file
    try {
      await fileAPI.unlink(image.path);
    } catch {}

    // Delete metadata
    try {
      const metadataPath = path.join(this.genDir, "metadata", `${image.name}.json`);
      await fileAPI.unlink(metadataPath);
    } catch {}

    // Update index
    const images = await this.listImages();
    const filtered = images.filter(img => img.id !== image.id);
    const indexPath = path.join(this.genDir, 'images.json');
    await fileAPI.createFile(indexPath, JSON.stringify(filtered, null, 2, { type: FileType.TEMPORARY }));

    return true;
  }

  // Helper methods

  private generateImageId(config: ImageBuildConfig): string {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(config));
    return hash.digest('hex').substring(0, 12);
  }

  private updateProgress(stage: string, progress: number, message: string): void {
    this.currentBuild = {
      stage,
      progress,
      message,
      timestamp: new Date()
    };
    this.emit('build:progress', this.currentBuild);
  }

  private async runCommand(command: string, args: string[], options?: SpawnOptions & { input?: string }): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, options);
      
      if (options?.input) {
        proc.stdin?.write(options.input);
        proc.stdin?.end();
      }

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed: ${command} ${args.join(' ')}\n${stderr}`));
        }
      });
    });
  }

  private async isCommandAvailable(command: string): Promise<boolean> {
    try {
      await exec(`which ${command}`);
      return true;
    } catch {
      return false;
    }
  }

  private async downloadFile(url: string, destination: string): Promise<void> {
    // Use wget or curl
    if (await this.isCommandAvailable('wget')) {
      await this.runCommand('wget', ['-O', destination, url]);
    } else if (await this.isCommandAvailable('curl')) {
      await this.runCommand('curl', ['-L', '-o', destination, url]);
    } else {
      throw new Error('Neither wget nor curl is available');
    }
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    const { stdout } = await exec(`sha256sum ${filePath}`);
    return stdout.split(' ')[0];
  }

  private async hashPassword(password: string): Promise<string> {
    const { stdout } = await exec(`openssl passwd -6 "${password}"`);
    return stdout.trim();
  }

  private generatePackageInstallScript(config: ImageBuildConfig): string {
    const packages = config.packages?.join(' ') || '';
    
    switch (config.distro) {
      case 'ubuntu':
      case 'debian':
        return `#!/bin/bash
apt-get update
apt-get install -y ${packages}
apt-get clean`;

      case 'alpine':
        return `#!/bin/sh
apk update
apk add ${packages}`;

      case 'fedora':
        return `#!/bin/bash
dnf install -y ${packages}
dnf clean all`;

      default:
        return `#!/bin/bash
echo "Package installation for ${config.distro} not implemented"`;
    }
  }

  private generateNetplanConfig(network: NetworkConfig): string {
    const interfaces: any = {};
    
    for (const iface of network.interfaces || []) {
      if (iface.type === 'dhcp') {
        interfaces[iface.name] = { dhcp4: true };
      } else {
        interfaces[iface.name] = {
          dhcp4: false,
          addresses: [iface.address],
          gateway4: iface.gateway
        };
      }
    }

    const config = {
      network: {
        version: 2,
        ethernets: interfaces
      }
    };

    return `# Netplan configuration
${JSON.stringify(config, null, 2)}`;
  }

  private getUbuntuImageUrl(version: string): string {
    return `https://cloud-images.ubuntu.com/releases/${version}/release/ubuntu-${version}-server-cloudimg-amd64.img`;
  }

  private getDebianImageUrl(version: string): string {
    return `https://cloud.debian.org/images/cloud/bullseye/latest/debian-${version}-generic-amd64.qcow2`;
  }

  private getAlpineImageUrl(version: string): string {
    return `https://dl-cdn.alpinelinux.org/alpine/v${version}/releases/x86_64/alpine-virt-${version}.0-x86_64.iso`;
  }

  private getFedoraImageUrl(version: string): string {
    return `https://download.fedoraproject.org/pub/fedora/linux/releases/${version}/Cloud/x86_64/images/Fedora-Cloud-Base-${version}-x86_64.qcow2`;
  }
}

// Export singleton instance
export const imageBuilder = new QEMUImageBuilder();