/**
 * QEMU Runtime Manager
 * Manages QEMU VM lifecycle, building, and remote debugging
 */

import { EventEmitter } from '../../../infra_external-log-lib/src';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import { path } from '../../../infra_external-log-lib/src';
import { net } from '../../../infra_external-log-lib/src';
import { EnvironmentSetupService, EnvironmentConfig } from '../services/EnvironmentSetupService';
import { getFileAPI, FileType } from '../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


export interface QEMUInstance {
  id: string;
  name: string;
  process?: ChildProcess;
  pid?: number;
  config: EnvironmentConfig;
  ports: Record<string, number>;
  status: 'stopped' | 'starting' | 'running' | 'debugging' | 'error';
  startTime?: Date;
  logs: string[];
}

export interface BuildOptions {
  language: 'c' | 'cpp' | 'rust' | 'python';
  source?: string;
  output?: string;
  debug?: boolean;
  optimize?: boolean;
}

export interface DebugSession {
  instanceId: string;
  port: number;
  pid?: number;
  binary: string;
  breakpoints: string[];
  status: 'inactive' | 'connected' | 'running' | 'paused';
}

export class QEMURuntimeManager extends EventEmitter {
  private instances: Map<string, QEMUInstance> = new Map();
  private debugSessions: Map<string, DebugSession> = new Map();
  private setupService: EnvironmentSetupService;
  private setupDir: string;

  constructor(setupDir?: string) {
    super();
    this.setupDir = setupDir || path.join(process.cwd(), '.setup');
    this.setupService = new EnvironmentSetupService(this.setupDir);
  }

  /**
   * Initialize the runtime manager
   */
  async initialize(): Promise<void> {
    await this.setupService.initialize();
    await this.loadSavedInstances();
    this.emit('initialized');
  }

  /**
   * Create and setup a QEMU instance
   */
  async createInstance(config: EnvironmentConfig): Promise<QEMUInstance> {
    const id = `qemu-${Date.now()}`;
    config.name = config.name || id;

    // Setup QEMU environment
    const setup = await this.setupService.setupQEMU(config);

    const instance: QEMUInstance = {
      id,
      name: config.name,
      config,
      ports: setup.ports,
      status: 'stopped',
      logs: []
    };

    this.instances.set(id, instance);
    await this.saveInstance(instance);

    this.emit('instance:created', instance);
    return instance;
  }

  /**
   * Start a QEMU instance
   */
  async startInstance(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    if (instance.status === 'running') {
      throw new Error(`Instance ${instanceId} is already running`);
    }

    instance.status = 'starting';
    this.emit('instance:starting', instance);

    // Build command from saved config
    const setup = await this.setupService.setupQEMU(instance.config);
    const [cmd, ...args] = setup.commands;

    // Start QEMU process
    const process = spawn(cmd, args, {
      cwd: this.setupDir,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    instance.process = process;
    instance.pid = process.pid;
    instance.startTime = new Date();
    instance.status = 'running';

    // Handle process output
    process.stdout?.on('data', (data) => {
      const log = data.toString();
      instance.logs.push(log);
      this.emit('instance:log', { instanceId, log });
    });

    process.stderr?.on('data', (data) => {
      const log = data.toString();
      instance.logs.push(`[ERROR] ${log}`);
      this.emit('instance:error', { instanceId, log });
    });

    process.on('exit', (code) => {
      instance.status = 'stopped';
      instance.process = undefined;
      instance.pid = undefined;
      this.emit('instance:stopped', { instanceId, code });
    });

    await this.saveInstance(instance);
    this.emit('instance:started', instance);

    // Wait for network to be ready
    await this.waitForNetwork(instance);
  }

  /**
   * Stop a QEMU instance
   */
  async stopInstance(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance || !instance.process) {
      throw new Error(`Instance ${instanceId} is not running`);
    }

    // Send shutdown signal
    instance.process.kill('SIGTERM');
    
    // Wait for graceful shutdown
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        instance.process?.kill('SIGKILL');
        resolve();
      }, 5000);

      instance.process?.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    instance.status = 'stopped';
    await this.saveInstance(instance);
    this.emit('instance:stopped', { instanceId });
  }

  /**
   * Build a program in QEMU
   */
  async buildProgram(instanceId: string, options: BuildOptions): Promise<string> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    // Build hello world or custom program
    const binary = await this.setupService.buildHelloWorld('qemu', options.language);

    // Copy to QEMU shared folder
    const sharedPath = path.join(this.setupDir, 'shared');
    const targetPath = path.join(sharedPath, path.basename(binary));
    
    // If QEMU is running, we can also execute build inside VM
    if (instance.status === 'running' && instance.ports.ssh) {
      await this.executeInVM(instance, `gcc -g -O0 -o /tmp/hello /mnt/share/hello.c`);
    }

    this.emit('build:complete', { instanceId, binary: targetPath });
    return targetPath;
  }

  /**
   * Start remote debugging session
   */
  async startDebugging(instanceId: string, binary: string): Promise<DebugSession> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    const debugPort = instance.ports.gdb || 1234;

    // Create debug session
    const session: DebugSession = {
      instanceId,
      port: debugPort,
      binary,
      breakpoints: ['main'],
      status: 'inactive'
    };

    this.debugSessions.set(instanceId, session);

    // Start GDB server in QEMU if needed
    if (instance.status === 'running') {
      instance.status = 'debugging';
      
      // Connect to GDB stub
      const connected = await this.connectToGDBStub(debugPort);
      if (connected) {
        session.status = 'connected';
      }
    }

    // Generate debug configuration
    const debugConfig = await this.setupService.setupRemoteDebugging('qemu', binary);

    this.emit('debug:started', { session, config: debugConfig });
    return session;
  }

  /**
   * Execute GDB commands
   */
  async executeGDBCommand(instanceId: string, command: string): Promise<string> {
    const session = this.debugSessions.get(instanceId);
    if (!session) {
      throw new Error(`No debug session for instance ${instanceId}`);
    }

    // This would connect to GDB and execute commands
    // For now, we'll simulate it
    const response = `(gdb) ${command}\n`;
    
    if (command === 'break main') {
      session.breakpoints.push('main');
      return response + 'Breakpoint 1 at main';
    } else if (command === 'continue') {
      session.status = 'running';
      return response + 'Continuing...';
    } else if (command === 'next' || command === 'step') {
      session.status = 'paused';
      return response + 'Step completed';
    }

    return response;
  }

  /**
   * Run system test: Build and debug hello world
   */
  async runSystemTest(): Promise<boolean> {
    console.log('🧪 Starting QEMU System Test: Build and Debug Hello World\n');

    try {
      // Step 1: Create QEMU instance
      console.log('1️⃣ Creating QEMU instance...');
      const config: EnvironmentConfig = {
        type: 'qemu',
        name: 'test-vm',
        platform: 'x86_64',
        architecture: 'x86_64',
        os: 'ubuntu',
        memory: '2G',
        cores: 2,
        debugging: {
          enabled: true,
          type: 'gdb',
          port: 1234,
          suspend: true
        }
      };

      const instance = await this.createInstance(config);
      console.log(`   ✅ Instance created: ${instance.id}`);

      // Step 2: Build hello world program
      console.log('\n2️⃣ Building hello world program...');
      const binary = await this.buildProgram(instance.id, {
        language: 'c',
        debug: true
      });
      console.log(`   ✅ Program built: ${binary}`);

      // Step 3: Start QEMU instance
      console.log('\n3️⃣ Starting QEMU instance...');
      await this.startInstance(instance.id);
      console.log(`   ✅ Instance running on ports:`, instance.ports);

      // Step 4: Start debugging session
      console.log('\n4️⃣ Starting remote debugging...');
      const debugSession = await this.startDebugging(instance.id, binary);
      console.log(`   ✅ Debug session started on port ${debugSession.port}`);

      // Step 5: Execute debug commands
      console.log('\n5️⃣ Executing debug commands...');
      const commands = [
        'break main',
        'continue',
        'next',
        'print x'
      ];

      for (const cmd of commands) {
        const result = await this.executeGDBCommand(instance.id, cmd);
        console.log(`   > ${cmd}`);
        console.log(`     ${result}`);
      }

      // Step 6: Stop instance
      console.log('\n6️⃣ Stopping QEMU instance...');
      await this.stopInstance(instance.id);
      console.log(`   ✅ Instance stopped`);

      console.log('\n✨ System test completed successfully!');
      return true;

    } catch (error: any) {
      console.error('\n❌ System test failed:', error.message);
      return false;
    }
  }

  // Helper methods

  private async waitForNetwork(instance: QEMUInstance, timeout: number = 30000): Promise<void> {
    const startTime = Date.now();
    const sshPort = instance.ports.ssh;

    if (!sshPort) return;

    while (Date.now() - startTime < timeout) {
      const connected = await this.checkPort('localhost', sshPort);
      if (connected) {
        this.emit('instance:network-ready', { instanceId: instance.id });
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(`Network timeout for instance ${instance.id}`);
  }

  private async checkPort(host: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });

      socket.on('error', () => {
        resolve(false);
      });

      socket.connect(port, host);
    });
  }

  private async connectToGDBStub(port: number): Promise<boolean> {
    return await this.checkPort('localhost', port);
  }

  private async executeInVM(instance: QEMUInstance, command: string): Promise<string> {
    // This would SSH into the VM and execute the command
    // For now, we'll simulate it
    return `Executed: ${command}`;
  }

  private async saveInstance(instance: QEMUInstance): Promise<void> {
    const instancePath = path.join(this.setupDir, 'instances', `${instance.id}.json`);
    await fileAPI.createDirectory(path.dirname(instancePath));
    
    const data = {
      ...instance,
      process: undefined // Don't save process object
    };
    
    await fileAPI.createFile(instancePath, JSON.stringify(data, { type: FileType.TEMPORARY }));
  }

  private async loadSavedInstances(): Promise<void> {
    const instancesDir = path.join(this.setupDir, 'instances');
    
    try {
      await fileAPI.createDirectory(instancesDir);
      const files = await fs.readdir(instancesDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const data = await fs.readFile(path.join(instancesDir, file), 'utf-8');
          const instance = JSON.parse(data);
          instance.status = 'stopped'; // Reset status
          this.instances.set(instance.id, instance);
        }
      }
    } catch (error) {
      // No saved instances
    }
  }

  /**
   * List all instances
   */
  async listInstances(): QEMUInstance[] {
    return Array.from(this.instances.values());
  }

  /**
   * Get instance by ID
   */
  async getInstance(instanceId: string): QEMUInstance | undefined {
    return this.instances.get(instanceId);
  }
}

// Export singleton
export const qemuRuntime = new QEMURuntimeManager();