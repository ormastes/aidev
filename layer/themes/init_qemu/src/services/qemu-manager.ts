/**
 * QEMU Manager Service
 * Core service for managing QEMU instances
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import { path } from '../../../infra_external-log-lib/src';
import { QemuConfig, QemuInstance } from '../types';

export class QemuManager {
  private instances: Map<string, QemuInstance> = new Map();
  private processes: Map<string, ChildProcess> = new Map();

  async startInstance(name: string, config: QemuConfig): Promise<QemuInstance> {
    console.log(`🚀 Starting QEMU instance: ${name}`);
    
    const args = this.buildQemuArgs(config);
    const qemuBinary = this.getQemuBinary(config.arch);
    
    const process = spawn(qemuBinary, args, {
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const instance: QemuInstance = {
      pid: process.pid!,
      config,
      status: 'running',
      startTime: new Date(),
      ports: {
        gdb: config.debug?.gdbPort,
        monitor: config.debug?.monitorPort,
        serial: config.debug?.serialPort
      }
    };

    this.instances.set(name, instance);
    this.processes.set(name, process);

    process.on('exit', (code) => {
      console.log(`QEMU instance ${name} exited with code ${code}`);
      this.instances.delete(name);
      this.processes.delete(name);
    });

    return instance;
  }

  async stopInstance(name: string): Promise<void> {
    const process = this.processes.get(name);
    if (process) {
      console.log(`🛑 Stopping QEMU instance: ${name}`);
      process.kill('SIGTERM');
      this.instances.delete(name);
      this.processes.delete(name);
    }
  }

  async pauseInstance(name: string): Promise<void> {
    const instance = this.instances.get(name);
    if (instance) {
      console.log(`⏸️ Pausing QEMU instance: ${name}`);
      // Send monitor command to pause
      await this.sendMonitorCommand(name, 'stop');
      instance.status = 'paused';
    }
  }

  async resumeInstance(name: string): Promise<void> {
    const instance = this.instances.get(name);
    if (instance) {
      console.log(`▶️ Resuming QEMU instance: ${name}`);
      // Send monitor command to resume
      await this.sendMonitorCommand(name, 'cont');
      instance.status = 'running';
    }
  }

  getInstance(name: string): QemuInstance | undefined {
    return this.instances.get(name);
  }

  listInstances(): QemuInstance[] {
    return Array.from(this.instances.values());
  }

  private buildQemuArgs(config: QemuConfig): string[] {
    const args: string[] = [];

    // Basic configuration
    args.push('-m', config.memory || '2G');
    args.push('-smp', config.cpu?.toString() || '2');

    // Accelerator
    if (config.accelerator) {
      args.push('-accel', config.accelerator);
    }

    // Display
    args.push('-display', config.display || 'none');

    // Network
    if (config.network) {
      const netArgs = this.buildNetworkArgs(config.network);
      args.push(...netArgs);
    }

    // Storage
    if (config.storage) {
      const storageArgs = this.buildStorageArgs(config.storage);
      args.push(...storageArgs);
    }

    // Debug
    if (config.debug) {
      const debugArgs = this.buildDebugArgs(config.debug);
      args.push(...debugArgs);
    }

    // Image/Kernel
    if (config.image) {
      args.push('-hda', config.image);
    }
    if (config.kernel) {
      args.push('-kernel', config.kernel);
    }
    if (config.initrd) {
      args.push('-initrd', config.initrd);
    }

    return args;
  }

  private buildNetworkArgs(network: any): string[] {
    const args: string[] = [];
    
    if (network.type === 'user') {
      let netdev = 'user,id=net0';
      if (network.hostfwd) {
        network.hostfwd.forEach((fwd: string) => {
          netdev += `,hostfwd=${fwd}`;
        });
      }
      args.push('-netdev', netdev);
      args.push('-device', `virtio-net,netdev=net0${network.mac ? ',mac=' + network.mac : ''}`);
    }

    return args;
  }

  private buildStorageArgs(storage: any): string[] {
    const args: string[] = [];
    
    storage.drives?.forEach((drive: any, index: number) => {
      args.push('-drive', `file=${drive.file},format=${drive.format},if=${drive.interface || 'virtio'}${drive.readonly ? ',readonly' : ''}`);
    });

    storage.sharedFolders?.forEach((folder: any) => {
      if (folder.protocol === '9p') {
        args.push('-fsdev', `local,id=fsdev${folder.guestPath},path=${folder.hostPath},security_model=mapped`);
        args.push('-device', `virtio-9p-pci,fsdev=fsdev${folder.guestPath},mount_tag=${folder.guestPath}`);
      }
    });

    return args;
  }

  private buildDebugArgs(debug: any): string[] {
    const args: string[] = [];
    
    if (debug.gdbPort) {
      args.push('-gdb', `tcp::${debug.gdbPort}`);
      if (debug.waitForGdb) {
        args.push('-S'); // Wait for GDB connection
      }
    }

    if (debug.monitorPort) {
      args.push('-monitor', `tcp::${debug.monitorPort},server,nowait`);
    }

    if (debug.serialPort) {
      args.push('-serial', `tcp::${debug.serialPort},server,nowait`);
    }

    return args;
  }

  private getQemuBinary(arch: string): string {
    const binaries: Record<string, string> = {
      'x86_64': 'qemu-system-x86_64',
      'aarch64': 'qemu-system-aarch64',
      'arm': 'qemu-system-arm',
      'riscv64': 'qemu-system-riscv64',
      'mips': 'qemu-system-mips'
    };
    return binaries[arch] || 'qemu-system-x86_64';
  }

  private async sendMonitorCommand(name: string, command: string): Promise<void> {
    const instance = this.instances.get(name);
    if (instance?.ports?.monitor) {
      // Would implement actual monitor command sending via TCP
      console.log(`Sending monitor command to ${name}: ${command}`);
    }
  }
}