/**
 * QEMU Type Definitions
 */

export interface QemuConfig {
  arch: 'x86_64' | 'aarch64' | 'arm' | 'riscv64' | 'mips';
  memory: string; // e.g., "2G", "512M"
  cpu: number;
  image?: string;
  kernel?: string;
  initrd?: string;
  network?: QemuNetworkConfig;
  storage?: QemuStorageConfig;
  debug?: QemuDebugConfig;
  display?: 'none' | 'gtk' | 'vnc' | 'spice';
  accelerator?: 'kvm' | 'hvf' | 'whpx' | 'tcg';
}

export interface QemuNetworkConfig {
  type: 'user' | 'tap' | 'bridge' | 'none';
  hostfwd?: string[]; // Port forwarding rules
  mac?: string;
  device?: string;
}

export interface QemuStorageConfig {
  drives: QemuDrive[];
  sharedFolders?: QemuSharedFolder[];
}

export interface QemuDrive {
  file: string;
  format: 'raw' | 'qcow2' | 'vdi' | 'vmdk';
  interface?: 'ide' | 'scsi' | 'virtio';
  readonly?: boolean;
}

export interface QemuSharedFolder {
  hostPath: string;
  guestPath: string;
  readonly?: boolean;
  protocol?: '9p' | "virtiofs";
}

export interface QemuDebugConfig {
  gdbPort?: number;
  monitorPort?: number;
  serialPort?: number;
  waitForGdb?: boolean;
}

export interface QemuInstance {
  pid: number;
  config: QemuConfig;
  status: 'running' | 'paused' | 'stopped';
  startTime: Date;
  ports?: {
    gdb?: number;
    monitor?: number;
    serial?: number;
    vnc?: number;
  };
}

export interface QemuBuildConfig {
  projectPath: string;
  buildCommand: string;
  arch: string;
  environment?: Record<string, string>;
  volumes?: Array<{
    host: string;
    guest: string;
    readonly?: boolean;
  }>;
}

export interface QemuDebugSession {
  sessionId: string;
  instance: QemuInstance;
  gdbPort: number;
  executable: string;
  breakpoints?: string[];
}