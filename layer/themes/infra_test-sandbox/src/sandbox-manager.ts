import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

export type SandboxType = 'docker' | 'qemu' | 'podman' | 'firecracker';

export interface SandboxConfig {
  type: SandboxType;
  image?: string;
  limits?: {
    memory?: string;
    cpus?: string;
    diskSpace?: string;
    timeout?: number;
  };
  network?: 'none' | 'bridge' | 'host';
  volumes?: Array<{
    source: string;
    target: string;
    readonly?: boolean;
  }>;
}

export interface SandboxResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  killed: boolean;
}

export class SandboxManager {
  private sandboxId: string;
  private config: SandboxConfig;
  private process?: ChildProcess;

  constructor(config: SandboxConfig) {
    this.config = {
      type: config.type,
      image: config.image || this.getDefaultImage(config.type),
      limits: {
        memory: config.limits?.memory || '512m',
        cpus: config.limits?.cpus || '1',
        diskSpace: config.limits?.diskSpace || '1G',
        timeout: config.limits?.timeout || 300000
      },
      network: config.network || 'none',
      volumes: config.volumes || []
    };
    this.sandboxId = `sandbox-${crypto.randomBytes(8).toString('hex')}`;
  }

  private getDefaultImage(type: SandboxType): string {
    switch (type) {
      case 'docker':
      case 'podman':
        return 'node:18-alpine';
      case 'qemu':
        return 'alpine-qemu.qcow2';
      case 'firecracker':
        return 'firecracker-alpine.ext4';
      default:
        throw new Error(`Unknown sandbox type: ${type}`);
    }
  }

  async run(command: string | (() => Promise<void>)): Promise<SandboxResult> {
    const startTime = Date.now();
    
    switch (this.config.type) {
      case 'docker':
        return this.runDocker(command, startTime);
      case 'qemu':
        return this.runQemu(command, startTime);
      case 'podman':
        return this.runPodman(command, startTime);
      case 'firecracker':
        return this.runFirecracker(command, startTime);
      default:
        throw new Error(`Unsupported sandbox type: ${this.config.type}`);
    }
  }

  private async runDocker(command: string | (() => Promise<void>), startTime: number): Promise<SandboxResult> {
    const dockerArgs = [
      'run',
      '--rm',
      '--name', this.sandboxId,
      '--memory', this.config.limits!.memory!,
      '--cpus', this.config.limits!.cpus!,
      '--network', this.config.network!,
      '--read-only',
      '--tmpfs', '/tmp:size=100M',
      '--security-opt', 'no-new-privileges',
      '--cap-drop', 'ALL'
    ];

    // Add volume mounts
    for (const volume of this.config.volumes!) {
      const mountFlag = volume.readonly ? ':ro' : ':rw';
      dockerArgs.push('-v', `${volume.source}:${volume.target}${mountFlag}`);
    }

    // Add the image and command
    dockerArgs.push(this.config.image!);
    
    if (typeof command === 'string') {
      dockerArgs.push('sh', '-c', command);
    } else {
      // For function commands, we need to serialize and execute
      const scriptPath = await this.createTempScript(command);
      dockerArgs.push('-v', `${scriptPath}:/run-test.js:ro`);
      dockerArgs.push('node', '/run-test.js');
    }

    return this.executeCommand('docker', dockerArgs, startTime);
  }

  private async runQemu(command: string | (() => Promise<void>), startTime: number): Promise<SandboxResult> {
    const qemuArgs = [
      '-m', this.config.limits!.memory!.replace('m', ''),
      '-smp', this.config.limits!.cpus!,
      '-drive', `file=${this.config.image},format=qcow2`,
      '-nographic',
      '-append', 'console=ttyS0',
      '-kernel', '/boot/vmlinuz-virt',
      '-initrd', '/boot/initramfs-virt'
    ];

    if (this.config.network === 'none') {
      qemuArgs.push('-netdev', 'none,id=net0');
    }

    return this.executeCommand('qemu-system-x86_64', qemuArgs, startTime);
  }

  private async runPodman(command: string | (() => Promise<void>), startTime: number): Promise<SandboxResult> {
    // Similar to Docker but with podman-specific flags
    const podmanArgs = [
      'run',
      '--rm',
      '--name', this.sandboxId,
      '--memory', this.config.limits!.memory!,
      '--cpus', this.config.limits!.cpus!,
      '--network', this.config.network!,
      '--read-only',
      '--tmpfs', '/tmp:size=100M',
      '--security-opt', 'no-new-privileges',
      '--userns', 'auto'
    ];

    podmanArgs.push(this.config.image!);
    
    if (typeof command === 'string') {
      podmanArgs.push('sh', '-c', command);
    }

    return this.executeCommand('podman', podmanArgs, startTime);
  }

  private async runFirecracker(command: string | (() => Promise<void>), startTime: number): Promise<SandboxResult> {
    // Firecracker microVM configuration
    const configPath = await this.createFirecrackerConfig();
    
    return this.executeCommand('firecracker', [
      '--config-file', configPath,
      '--api-sock', `/tmp/firecracker-${this.sandboxId}.sock`
    ], startTime);
  }

  private async executeCommand(cmd: string, args: string[], startTime: number): Promise<SandboxResult> {
    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let killed = false;

      this.process = spawn(cmd, args);

      this.process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      this.process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const timeout = setTimeout(() => {
        killed = true;
        this.process?.kill('SIGKILL');
      }, this.config.limits!.timeout!);

      this.process.on('exit', (code) => {
        clearTimeout(timeout);
        resolve({
          exitCode: code || 0,
          stdout,
          stderr,
          duration: Date.now() - startTime,
          killed
        });
      });
    });
  }

  private async createTempScript(fn: () => Promise<void>): Promise<string> {
    const tempDir = '/tmp';
    const scriptPath = path.join(tempDir, `test-${this.sandboxId}.js`);
    
    const scriptContent = `
(async () => {
  try {
    await (${fn.toString()})();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
`;
    
    await fs.writeFile(scriptPath, scriptContent);
    return scriptPath;
  }

  private async createFirecrackerConfig(): Promise<string> {
    const config = {
      'boot-source': {
        'kernel_image_path': '/opt/firecracker/vmlinux',
        'boot_args': 'console=ttyS0 reboot=k panic=1'
      },
      'drives': [{
        'drive_id': 'rootfs',
        'path_on_host': this.config.image,
        'is_root_device': true,
        'is_read_only': false
      }],
      'machine-config': {
        'vcpu_count': parseInt(this.config.limits!.cpus!),
        'mem_size_mib': parseInt(this.config.limits!.memory!.replace('m', ''))
      }
    };

    const configPath = `/tmp/firecracker-config-${this.sandboxId}.json`;
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    return configPath;
  }

  async cleanup(): Promise<void> {
    if (this.process && !this.process.killed) {
      this.process.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (!this.process.killed) {
        this.process.kill('SIGKILL');
      }
    }

    // Cleanup containers/VMs
    switch (this.config.type) {
      case 'docker':
        await this.cleanupDocker();
        break;
      case 'podman':
        await this.cleanupPodman();
        break;
      case 'qemu':
        // QEMU cleanup handled by process termination
        break;
      case 'firecracker':
        await this.cleanupFirecracker();
        break;
    }
  }

  private async cleanupDocker(): Promise<void> {
    try {
      await this.executeCommand('docker', ['rm', '-f', this.sandboxId], Date.now());
    } catch {}
  }

  private async cleanupPodman(): Promise<void> {
    try {
      await this.executeCommand('podman', ['rm', '-f', this.sandboxId], Date.now());
    } catch {}
  }

  private async cleanupFirecracker(): Promise<void> {
    try {
      await fs.unlink(`/tmp/firecracker-${this.sandboxId}.sock`);
      await fs.unlink(`/tmp/firecracker-config-${this.sandboxId}.json`);
    } catch {}
  }
}