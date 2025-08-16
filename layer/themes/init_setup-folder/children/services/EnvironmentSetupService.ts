/**
 * Environment Setup Service
 * Manages initialization and configuration of development environments
 */

import * as fs from 'fs/promises';
import { path } from '../../../infra_external-log-lib/src';
import { EventEmitter } from '../../../infra_external-log-lib/src';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface EnvironmentConfig {
  type: 'qemu' | 'docker' | 'uv' | 'node' | 'rust';
  name: string;
  platform?: string;
  architecture?: 'x86_64' | 'aarch64' | 'armhf' | 'riscv64' | 'mips';
  os?: string;
  version?: string;
  cpu?: string;
  memory?: string;
  cores?: number;
  network?: NetworkConfig;
  storage?: StorageConfig;
  debugging?: DebugConfig;
  customSettings?: Record<string, any>;
}

export interface NetworkConfig {
  mode: 'user' | 'bridge' | 'host' | 'none';
  portForwarding?: Array<{
    name: string;
    host: number;
    guest: number;
    protocol?: 'tcp' | 'udp';
  }>;
  dns?: string[];
  gateway?: string;
}

export interface StorageConfig {
  type: 'qcow2' | 'raw' | 'vdi' | 'vmdk' | 'overlay';
  size?: string;
  path?: string;
  backing?: string;
  nvme?: {
    enabled: boolean;
    config?: any;
  };
}

export interface DebugConfig {
  enabled: boolean;
  type: 'gdb' | 'lldb' | 'dap';
  port?: number;
  host?: string;
  suspend?: boolean;
  symbols?: string;
}

export interface SetupResult {
  success: boolean;
  environment: string;
  config: EnvironmentConfig;
  commands: string[];
  scripts: string[];
  ports: Record<string, number>;
  debugInfo?: {
    port: number;
    command: string;
    config: any;
  };
}

export class EnvironmentSetupService extends EventEmitter {
  private configDir: string;
  private setupDir: string;
  private environments: Map<string, any> = new Map();

  constructor(setupDir?: string) {
    super();
    this.setupDir = setupDir || path.join(process.cwd(), '.setup');
    this.configDir = path.join(process.cwd(), 'config');
  }

  /**
   * Initialize setup directory
   */
  async initialize(): Promise<void> {
    await fileAPI.createDirectory(this.setupDir);
    await fileAPI.createDirectory(path.join(this.setupDir), { recursive: true });
    await fileAPI.createDirectory(path.join(this.setupDir), { recursive: true });
    await fileAPI.createDirectory(path.join(this.setupDir), { recursive: true });
    await fileAPI.createDirectory(path.join(this.setupDir), { recursive: true });
    
    // Load environment configurations
    await this.loadConfigurations();
    
    this.emit('initialized', { setupDir: this.setupDir });
  }

  /**
   * Load environment configurations
   */
  private async loadConfigurations(): Promise<void> {
    const configPath = path.join(this.configDir, 'environments.json');
    try {
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);
      
      for (const [env, settings] of Object.entries(config.environments)) {
        this.environments.set(env, settings);
      }
    } catch (error) {
      console.warn('No environments.json found, using defaults');
      // Set default QEMU configuration
      this.environments.set('qemu', {
        platforms: {
          x86_64: {
            executable: 'qemu-system-x86_64',
            cpu: 'host',
            defaultMemory: '4G',
            defaultCores: 2
          }
        },
        networking: {
          mode: 'user',
          portForwarding: {
            ssh: { host: 6665, guest: 22 }
          }
        }
      });
    }
  }

  /**
   * Setup QEMU environment
   */
  async setupQEMU(config: EnvironmentConfig): Promise<SetupResult> {
    this.emit('setup:start', { type: 'qemu', config });

    // Ensure configurations are loaded
    if (this.environments.size === 0) {
      await this.loadConfigurations();
    }

    const platform = config.platform || 'x86_64';
    const qemuConfig = this.environments.get('qemu');
    const platformConfig = qemuConfig?.platforms?.[platform];

    if (!platformConfig) {
      console.error('Available platforms:', qemuConfig?.platforms ? Object.keys(qemuConfig.platforms) : 'none');
      throw new Error(`Unsupported QEMU platform: ${platform}`);
    }

    // Generate QEMU configuration
    const qemuSetup = {
      executable: platformConfig.executable,
      args: [] as string[],
      ports: {} as Record<string, number>,
      scripts: [] as string[]
    };

    // Basic configuration
    qemuSetup.args.push('-name', config.name);
    qemuSetup.args.push('-m', config.memory || platformConfig.defaultMemory);
    qemuSetup.args.push('-smp', String(config.cores || platformConfig.defaultCores));
    
    // CPU configuration
    if (platformConfig.cpu) {
      qemuSetup.args.push('-cpu', config.cpu || platformConfig.cpu);
    }

    // Enable KVM if available
    if (platform === 'x86_64' && await this.isKVMAvailable()) {
      qemuSetup.args.push('-enable-kvm');
    }

    // Network configuration
    const netConfig = config.network || qemuConfig.networking;
    if (netConfig.mode !== 'none') {
      const portFwds = await this.setupPortForwarding(netConfig, qemuSetup.ports);
      qemuSetup.args.push('-netdev', `user,id=net0${portFwds}`);
      qemuSetup.args.push('-device', 'virtio-net,netdev=net0');
    }

    // Storage configuration
    if (config.storage) {
      const storagePath = await this.setupStorage(config);
      qemuSetup.args.push('-drive', `file=${storagePath},if=virtio,format=${config.storage.type || 'qcow2'}`);
    }

    // Debugging configuration
    if (config.debugging?.enabled) {
      const debugPort = config.debugging.port || 1234;
      qemuSetup.args.push('-gdb', `tcp::${debugPort}`);
      if (config.debugging.suspend) {
        qemuSetup.args.push('-S'); // Suspend CPU at startup
      }
      qemuSetup.ports['gdb'] = debugPort;
    }

    // Shared folders (9p virtfs)
    if (qemuConfig.sharedFolders?.enabled) {
      const sharedPath = path.join(this.setupDir, 'shared');
      await fileAPI.createDirectory(sharedPath);
      qemuSetup.args.push('-virtfs', 
        `local,path=${sharedPath},mount_tag=share,security_model=none,id=share-folder`);
    }

    // Generate scripts
    const runScript = await this.generateQEMURunScript(config.name, qemuSetup);
    const debugScript = await this.generateQEMUDebugScript(config.name, qemuSetup.ports['gdb']);
    
    qemuSetup.scripts.push(runScript, debugScript);

    // Save configuration
    await this.saveEnvironmentConfig(config.name, {
      type: 'qemu',
      config,
      setup: qemuSetup,
      created: new Date().toISOString()
    });

    this.emit('setup:complete', { type: 'qemu', config });

    return {
      success: true,
      environment: 'qemu',
      config,
      commands: [qemuSetup.executable, ...qemuSetup.args],
      scripts: qemuSetup.scripts,
      ports: qemuSetup.ports,
      debugInfo: config.debugging?.enabled ? {
        port: qemuSetup.ports['gdb'],
        command: `gdb -ex "target remote :${qemuSetup.ports['gdb']}"`,
        config: await this.generateGDBConfig(config)
      } : undefined
    };
  }

  /**
   * Setup Docker environment with enhanced features
   */
  async setupDocker(config: EnvironmentConfig): Promise<SetupResult> {
    this.emit('setup:start', { type: 'docker', config });

    const dockerConfig = this.environments.get('docker') || this.getDefaultDockerConfig();
    const platform = config.platform || 'linux/amd64';
    
    // Generate Docker configuration
    const dockerSetup = {
      image: config.os || dockerConfig.platforms?.[platform]?.defaultImage || 'ubuntu:22.04',
      args: [] as string[],
      ports: {} as Record<string, number>,
      scripts: [] as string[],
      features: {
        ssh: true,
        vscode: true,
        debugging: config.debugging?.enabled || false
      }
    };

    // Container configuration
    dockerSetup.args.push('--name', config.name);
    dockerSetup.args.push('--hostname', config.name);
    dockerSetup.args.push('--platform', platform);
    
    // Resource limits
    if (config.memory) {
      dockerSetup.args.push('-m', config.memory);
    }
    if (config.cores) {
      dockerSetup.args.push('--cpus', String(config.cores));
    }

    // Standard development ports
    const standardPorts = [
      { name: 'ssh', host: 2222, guest: 22 },
      { name: 'vscode', host: 8080, guest: 8080 },
      { name: 'gdb', host: 1234, guest: 1234 },
      { name: 'node', host: 3000, guest: 3000 },
      { name: 'flask', host: 5000, guest: 5000 },
      { name: 'django', host: 8000, guest: 8000 },
      { name: 'node-debug', host: 9229, guest: 9229 }
    ];

    // Add standard ports
    for (const port of standardPorts) {
      dockerSetup.args.push('-p', `${port.host}:${port.guest}`);
      dockerSetup.ports[port.name] = port.host;
    }

    // Additional port forwarding
    if (config.network?.portForwarding) {
      for (const port of config.network.portForwarding) {
        dockerSetup.args.push('-p', `${port.host}:${port.guest}`);
        dockerSetup.ports[port.name] = port.host;
      }
    }

    // Environment variables
    dockerSetup.args.push('-e', 'ENABLE_SSH=true');
    dockerSetup.args.push('-e', 'ENABLE_VSCODE=true');
    
    // Debugging capabilities
    if (config.debugging?.enabled) {
      dockerSetup.args.push('--cap-add=SYS_PTRACE');
      dockerSetup.args.push('--security-opt', 'seccomp=unconfined');
      dockerSetup.args.push('-e', 'ENABLE_GDB_SERVER=true');
      
      if (config.debugging.port && config.debugging.port !== 1234) {
        dockerSetup.args.push('-p', `${config.debugging.port}:${config.debugging.port}`);
        dockerSetup.ports['custom-debug'] = config.debugging.port;
      }
    }

    // Volume mounts
    const workspacePath = path.join(this.setupDir, 'workspace');
    await fileAPI.createDirectory(workspacePath);
    dockerSetup.args.push('-v', `${workspacePath}:/workspace`);
    
    // Mount SSH keys and git config if available
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    if (homeDir) {
      dockerSetup.args.push('-v', `${homeDir}/.ssh:/root/.ssh:ro`);
      dockerSetup.args.push('-v', `${homeDir}/.gitconfig:/root/.gitconfig:ro`);
    }

    // Interactive mode
    dockerSetup.args.push('-it');

    // Generate scripts
    const runScript = await this.generateEnhancedDockerRunScript(config.name, dockerSetup);
    const buildScript = await this.generateEnhancedDockerBuildScript(config.name, platform);
    const debugScript = await this.generateDockerDebugScript(config.name, dockerSetup.ports);
    const vscodeScript = await this.generateVSCodeServerScript(config.name, dockerSetup.ports['vscode']);
    
    dockerSetup.scripts.push(runScript, buildScript, debugScript, vscodeScript);

    // Save configuration
    await this.saveEnvironmentConfig(config.name, {
      type: 'docker',
      config,
      setup: dockerSetup,
      created: new Date().toISOString()
    });

    this.emit('setup:complete', { type: 'docker', config });

    return {
      success: true,
      environment: 'docker',
      config,
      commands: ['docker', 'run', ...dockerSetup.args, dockerSetup.image],
      scripts: dockerSetup.scripts,
      ports: dockerSetup.ports,
      debugInfo: config.debugging?.enabled ? {
        port: dockerSetup.ports['gdb'],
        command: `gdb -ex "target remote :${dockerSetup.ports['gdb']}"`,
        config: await this.generateDockerDebugConfig(config, dockerSetup.ports)
      } : undefined
    };
  }

  /**
   * Setup UV Python environment
   */
  async setupUV(config: EnvironmentConfig): Promise<SetupResult> {
    this.emit('setup:start', { type: 'uv', config });

    const uvConfig = this.environments.get('uv');
    const pythonVersion = config.version || uvConfig.defaultVersion;
    
    const envPath = path.join(this.setupDir, 'environments', config.name);
    await fileAPI.createDirectory(envPath);

    // Create UV project
    const commands = [
      `uv venv ${path.join(envPath, '.venv')} --python ${pythonVersion}`,
      `uv pip install --python ${pythonVersion} ${uvConfig.dependencies.development.join(' ')}`
    ];

    if (config.debugging?.enabled) {
      commands.push(`uv pip install ${uvConfig.dependencies.debugging.join(' ')}`);
    }

    // Generate activation script
    const activateScript = await this.generateUVActivationScript(config.name, envPath);

    this.emit('setup:complete', { type: 'uv', config });

    return {
      success: true,
      environment: 'uv',
      config,
      commands,
      scripts: [activateScript],
      ports: {}
    };
  }

  /**
   * Build and deploy hello world program
   */
  async buildHelloWorld(environment: string, language: 'c' | 'cpp' | 'rust' | 'python' = 'c'): Promise<string> {
    const buildDir = path.join(this.setupDir, 'builds', 'hello-world');
    await fileAPI.createDirectory(buildDir);

    let sourceFile: string;
    let binary: string;
    let buildCommand: string;

    switch (language) {
      case 'c':
        sourceFile = path.join(buildDir, 'hello.c');
        binary = path.join(buildDir, 'hello');
        await fileAPI.createFile(sourceFile, this.getHelloWorldC());
        buildCommand = `gcc -g -O0 -o ${binary} ${sourceFile}`;
        break;

      case 'cpp':
        sourceFile = path.join(buildDir, { type: FileType.TEMPORARY });
        binary = path.join(buildDir, 'hello');
        await fileAPI.createFile(sourceFile, this.getHelloWorldCpp());
        buildCommand = `g++ -g -O0 -o ${binary} ${sourceFile}`;
        break;

      case 'rust':
        sourceFile = path.join(buildDir, { type: FileType.TEMPORARY });
        binary = path.join(buildDir, 'hello');
        await fileAPI.createFile(sourceFile, this.getHelloWorldRust());
        buildCommand = `rustc -g -o ${binary} ${sourceFile}`;
        break;

      case 'python':
        sourceFile = path.join(buildDir, { type: FileType.TEMPORARY });
        binary = sourceFile;
        await fileAPI.createFile(sourceFile, this.getHelloWorldPython());
        await fs.chmod(sourceFile, { type: FileType.TEMPORARY });
        buildCommand = `python3 -m py_compile ${sourceFile}`;
        break;
    }

    // Build the program
    this.emit('build:start', { language, sourceFile });
    
    try {
      await execAsync(buildCommand);
      this.emit('build:complete', { binary });
      
      // Copy to shared folder if using QEMU
      if (environment === 'qemu') {
        const sharedPath = path.join(this.setupDir, 'shared');
        await fileAPI.createDirectory(sharedPath);
        await fs.copyFile(binary, path.join(sharedPath, path.basename(binary)));
      }

      return binary;
    } catch (error) {
      this.emit('build:error', { error });
      throw error;
    }
  }

  /**
   * Setup remote debugging
   */
  async setupRemoteDebugging(environment: string, binary: string): Promise<any> {
    const debugConfig = {
      environment,
      binary,
      port: 1234,
      commands: [] as string[],
      config: {} as any
    };

    if (environment === 'qemu') {
      // GDB configuration for QEMU
      debugConfig.commands = [
        `gdb ${binary}`,
        `target remote :${debugConfig.port}`,
        `break main`,
        `continue`
      ];

      debugConfig.config = {
        ".gdbinit": [
          `target remote :${debugConfig.port}`,
          `file ${binary}`,
          `set sysroot /path/to/sysroot`,
          `break main`
        ].join('\n')
      };

      // Generate VS Code launch.json
      const vscodeConfig = await this.generateVSCodeDebugConfig(binary, debugConfig.port);
      await this.saveDebugConfig('vscode', vscodeConfig);
    }

    return debugConfig;
  }

  // Helper methods

  private async setupPortForwarding(netConfig: any, ports: Record<string, number>): Promise<string> {
    let portFwds = '';
    
    if (netConfig.portForwarding) {
      for (const [name, mapping] of Object.entries(netConfig.portForwarding)) {
        const { host, guest } = mapping as any;
        portFwds += `,hostfwd=tcp::${host}-:${guest}`;
        ports[name] = host;
      }
    }

    // Add port range
    if (netConfig.portRange) {
      for (let port = netConfig.portRange.start; port <= netConfig.portRange.end; port++) {
        portFwds += `,hostfwd=tcp::${port}-:${port}`;
      }
    }

    return portFwds;
  }

  private async setupStorage(config: EnvironmentConfig): Promise<string> {
    const storagePath = path.join(this.setupDir, 'storage', `${config.name}.${config.storage?.type || 'qcow2'}`);
    await fileAPI.createDirectory(path.dirname(storagePath));

    // Create disk image if it doesn't exist
    try {
      await fs.access(storagePath);
    } catch {
      const size = config.storage?.size || '20G';
      await execAsync(`qemu-img create -f ${config.storage?.type || 'qcow2'} ${storagePath} ${size}`);
    }

    return storagePath;
  }

  private async isKVMAvailable(): Promise<boolean> {
    try {
      await fs.access('/dev/kvm');
      return true;
    } catch {
      return false;
    }
  }

  private async generateQEMURunScript(name: string, setup: any): Promise<string> {
    const scriptPath = path.join(this.setupDir, 'scripts', `run-${name}.sh`);
    const script = `#!/bin/bash
# QEMU run script for ${name}
# Generated by EnvironmentSetupService

${setup.executable} \\
${setup.args.map((arg: string) => `  ${arg}`).join(' \\\n')}

echo "QEMU instance '${name}' started"
echo "Ports:"
${Object.entries(setup.ports).map(([name, port]) => `echo "  ${name}: ${port}"`).join('\n')}
`;

    await fileAPI.createFile(scriptPath, script);
    await fs.chmod(scriptPath, { type: FileType.TEMPORARY });
    return scriptPath;
  }

  private async generateQEMUDebugScript(name: string, gdbPort?: number): Promise<string> {
    const scriptPath = path.join(this.setupDir, 'scripts', `debug-${name}.sh`);
    const script = `#!/bin/bash
# QEMU debug script for ${name}

echo "Starting GDB for QEMU debugging..."
echo "Target: localhost:${gdbPort || 1234}"
echo ""
echo "Commands:"
echo "  (gdb) target remote :${gdbPort || 1234}"
echo "  (gdb) break main"
echo "  (gdb) continue"
echo ""

gdb -ex "target remote :${gdbPort || 1234}"
`;

    await fileAPI.createFile(scriptPath, script);
    await fs.chmod(scriptPath, { type: FileType.TEMPORARY });
    return scriptPath;
  }

  private async generateDockerRunScript(name: string, setup: any): Promise<string> {
    const scriptPath = path.join(this.setupDir, 'scripts', `run-${name}.sh`);
    const script = `#!/bin/bash
# Docker run script for ${name}

docker run \\
${setup.args.map((arg: string) => `  ${arg}`).join(' \\\n')} \\
  ${setup.image}

echo "Docker container '${name}' started"
`;

    await fileAPI.createFile(scriptPath, script);
    await fs.chmod(scriptPath, { type: FileType.TEMPORARY });
    return scriptPath;
  }

  private async generateDockerBuildScript(name: string): Promise<string> {
    const scriptPath = path.join(this.setupDir, 'scripts', `build-${name}.sh`);
    const dockerfilePath = path.join(this.setupDir, 'configs', `${name}.Dockerfile`);
    
    // Generate Dockerfile
    const dockerfile = `FROM ubuntu:22.04
RUN apt-get update && apt-get install -y \\
    build-essential \\
    gdb \\
    gdbserver \\
    git \\
    vim
WORKDIR /workspace
`;
    await fileAPI.createFile(dockerfilePath, dockerfile);

    const script = `#!/bin/bash
# Docker build script for ${name}

docker build -t ${name} -f ${dockerfilePath} .
echo "Docker image '${name}' built"
`;

    await fileAPI.createFile(scriptPath, { type: FileType.TEMPORARY });
    await fs.chmod(scriptPath, { type: FileType.TEMPORARY });
    return scriptPath;
  }

  private async generateUVActivationScript(name: string, envPath: string): Promise<string> {
    const scriptPath = path.join(this.setupDir, 'scripts', `activate-${name}.sh`);
    const script = `#!/bin/bash
# UV environment activation script for ${name}

source ${path.join(envPath, '.venv/bin/activate')}
echo "UV environment '${name}' activated"
python --version
`;

    await fileAPI.createFile(scriptPath, script);
    await fs.chmod(scriptPath, { type: FileType.TEMPORARY });
    return scriptPath;
  }

  private async generateGDBConfig(config: EnvironmentConfig): Promise<any> {
    return {
      commands: [
        'set sysroot /path/to/sysroot',
        'set substitute-path /src /path/to/source',
        'set debug-file-directory /path/to/debug',
        'handle SIGPIPE nostop noprint pass'
      ]
    };
  }

  private async generateVSCodeDebugConfig(binary: string, port: number): Promise<any> {
    return {
      version: '0.2.0',
      configurations: [
        {
          name: 'QEMU Remote Debug',
          type: 'cppdbg',
          request: 'launch',
          program: binary,
          args: [],
          stopAtEntry: true,
          cwd: '${workspaceFolder}',
          environment: [],
          externalConsole: false,
          MIMode: 'gdb',
          miDebuggerServerAddress: `localhost:${port}`,
          setupCommands: [
            {
              description: 'Enable pretty-printing for gdb',
              text: '-enable-pretty-printing',
              ignoreFailures: true
            }
          ]
        }
      ]
    };
  }

  private async saveEnvironmentConfig(name: string, config: any): Promise<void> {
    const configPath = path.join(this.setupDir, 'configs', `${name}.json`);
    await fileAPI.createFile(configPath, JSON.stringify(config, { type: FileType.DATA }));
  }

  private async saveDebugConfig(type: string, config: any): Promise<void> {
    const configPath = path.join(this.setupDir, 'configs', `debug-${type}.json`);
    await fileAPI.createFile(configPath, JSON.stringify(config, { type: FileType.DATA }));
  }

  // Hello World programs

  private getHelloWorldC(): string {
    return `#include <stdio.h>
#include <stdlib.h>

int main(int argc, char *argv[]) {
    printf("Hello, World from C!\\n");
    printf("Arguments: %d\\n", argc);
    for (int i = 0; i < argc; i++) {
        printf("  [%d]: %s\\n", i, argv[i]);
    }
    
    // Add a breakpoint-friendly line
    int x = 42;
    printf("Debug value: %d\\n", x);
    
    return 0;
}`;
  }

  private getHelloWorldCpp(): string {
    return `#include <iostream>
#include <vector>
#include <string>

int main(int argc, char *argv[]) {
    std::cout << "Hello, World from C++!" << std::endl;
    
    std::vector<std::string> args(argv, argv + argc);
    std::cout << "Arguments: " << args.size() << std::endl;
    
    for (size_t i = 0; i < args.size(); ++i) {
        std::cout << "  [" << i << "]: " << args[i] << std::endl;
    }
    
    // Debug point
    int x = 42;
    std::cout << "Debug value: " << x << std::endl;
    
    return 0;
}`;
  }

  private getHelloWorldRust(): string {
    return `use std::env;

fn main() {
    println!("Hello, World from Rust!");
    
    let args: Vec<String> = env::args().collect();
    println!("Arguments: {}", args.len());
    
    for (i, arg) in args.iter().enumerate() {
        println!("  [{}]: {}", i, arg);
    }
    
    // Debug point
    let x = 42;
    println!("Debug value: {}", x);
}`;
  }

  private getHelloWorldPython(): string {
    return `#!/usr/bin/env python3
import sys

def main():
    print("Hello, World from Python!")
    print(f"Arguments: {len(sys.argv)}")
    
    for i, arg in enumerate(sys.argv):
        print(f"  [{i}]: {arg}")
    
    # Debug point
    x = 42
    print(f"Debug value: {x}")

if __name__ == "__main__":
    main()`;
  }

  // Enhanced Docker methods

  private getDefaultDockerConfig(): any {
    return {
      platforms: {
        'linux/amd64': {
          defaultImage: 'ubuntu:22.04'
        },
        'linux/arm64': {
          defaultImage: 'ubuntu:22.04'
        }
      },
      dependencies: {
        development: ['build-essential', 'git', 'vim', 'gdb'],
        debugging: ['gdbserver', 'lldb', 'valgrind'],
        networking: ['curl', 'wget', 'netcat', 'openssh-server']
      }
    };
  }

  private async generateEnhancedDockerRunScript(name: string, setup: any): Promise<string> {
    const scriptPath = path.join(this.setupDir, 'scripts', `run-docker-${name}.sh`);
    const script = `#!/bin/bash
# Enhanced Docker run script for ${name}
# Features: SSH, VS Code Server, Remote Debugging

set -e

CONTAINER_NAME="${name}"
IMAGE="${setup.image}"

# Stop existing container if running
docker stop \${CONTAINER_NAME} 2>/dev/null || true
docker rm \${CONTAINER_NAME} 2>/dev/null || true

echo "Starting Docker container: \${CONTAINER_NAME}"
echo ""

# Run container
docker run \\
${setup.args.map((arg: string) => `  ${arg}`).join(' \\\n')} \\
  \${IMAGE}

echo ""
echo "=== Access Information ==="
echo "SSH: ssh -p ${setup.ports['ssh'] || 2222} root@localhost (password: docker)"
echo "VS Code: http://localhost:${setup.ports['vscode'] || 8080} (password: changeme)"
${setup.features.debugging ? `echo "GDB: gdb -ex 'target remote :${setup.ports['gdb'] || 1234}'"` : ''}
echo ""
echo "Container: docker exec -it \${CONTAINER_NAME} bash"
`;

    await fileAPI.createFile(scriptPath, script);
    await fs.chmod(scriptPath, { type: FileType.TEMPORARY });
    return scriptPath;
  }

  private async generateEnhancedDockerBuildScript(name: string, platform: string): Promise<string> {
    const scriptPath = path.join(this.setupDir, 'scripts', `build-docker-${name}.sh`);
    const dockerfilePath = path.join(this.setupDir, 'dockerfiles', `Dockerfile.${name}`);
    
    // Generate Dockerfile with all development tools
    const dockerfile = `FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install development tools
RUN apt-get update && apt-get install -y \\
    build-essential cmake ninja-build \\
    git vim tmux curl wget \\
    gdb gdbserver lldb valgrind \\
    openssh-server \\
    python3 python3-pip python3-dev \\
    nodejs npm \\
    && rm -rf /var/lib/apt/lists/*

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:\${PATH}"

# Install code-server (VS Code in browser)
RUN curl -fsSL https://code-server.dev/install.sh | sh

# Configure SSH
RUN mkdir /var/run/sshd && \\
    echo 'root:docker' | chpasswd && \\
    sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config

# Install Python debugging tools
RUN pip3 install debugpy ipython jupyter

# Create workspace
WORKDIR /workspace

# Expose ports
EXPOSE 22 8080 1234 3000 5000 8000 9229

# Entrypoint script
COPY <<'ENTRYPOINT' /entrypoint.sh
#!/bin/bash
service ssh start
code-server --bind-addr 0.0.0.0:8080 --auth password &
exec "\$@"
ENTRYPOINT

RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
CMD ["/bin/bash"]
`;
    
    await fileAPI.createDirectory(path.dirname(dockerfilePath));
    await fileAPI.createFile(dockerfilePath, dockerfile);

    const script = `#!/bin/bash
# Build Docker image for ${name}

docker build \\
  --platform ${platform} \\
  -t ${name}:latest \\
  -f ${dockerfilePath} \\
  .

echo "Docker image '${name}' built successfully"
`;

    await fileAPI.createFile(scriptPath, { type: FileType.TEMPORARY });
    await fs.chmod(scriptPath, { type: FileType.TEMPORARY });
    return scriptPath;
  }

  private async generateDockerDebugScript(name: string, ports: Record<string, number>): Promise<string> {
    const scriptPath = path.join(this.setupDir, 'scripts', `debug-docker-${name}.sh`);
    const script = `#!/bin/bash
# Docker remote debugging script for ${name}

echo "=== Docker Remote Debugging ==="
echo ""
echo "1. SSH Debug:"
echo "   ssh -p ${ports['ssh'] || 2222} root@localhost"
echo "   gdb /workspace/program"
echo ""
echo "2. Remote GDB:"
echo "   gdb -ex 'target remote :${ports['gdb'] || 1234}'"
echo ""
echo "3. VS Code Debug:"
echo "   Open http://localhost:${ports['vscode'] || 8080}"
echo "   Install C++ extension"
echo "   Press F5 to start debugging"
echo ""

# Connect to GDB server
gdb -ex "target remote localhost:${ports['gdb'] || 1234}"
`;

    await fileAPI.createFile(scriptPath, script);
    await fs.chmod(scriptPath, { type: FileType.TEMPORARY });
    return scriptPath;
  }

  private async generateVSCodeServerScript(name: string, port: number): Promise<string> {
    const scriptPath = path.join(this.setupDir, 'scripts', `vscode-${name}.sh`);
    const script = `#!/bin/bash
# Open VS Code Server for ${name}

URL="http://localhost:${port || 8080}"
echo "Opening VS Code Server at: \$URL"
echo "Default password: changeme"
echo ""

# Try to open in browser
if command -v xdg-open > /dev/null; then
    xdg-open "\$URL"
elif command -v open > /dev/null; then
    open "\$URL"
else
    echo "Please open your browser and navigate to: \$URL"
fi
`;

    await fileAPI.createFile(scriptPath, script);
    await fs.chmod(scriptPath, { type: FileType.TEMPORARY });
    return scriptPath;
  }

  private async generateDockerDebugConfig(config: EnvironmentConfig, ports: Record<string, number>): Promise<any> {
    return {
      vscode: {
        version: '0.2.0',
        configurations: [
          {
            name: 'Docker Remote Debug',
            type: 'cppdbg',
            request: 'launch',
            program: '/workspace/program',
            miDebuggerServerAddress: `localhost:${ports['gdb'] || 1234}`,
            MIMode: 'gdb'
          },
          {
            name: 'Docker SSH Debug',
            type: 'cppdbg',
            request: 'launch',
            program: '/workspace/program',
            pipeTransport: {
              debuggerPath: '/usr/bin/gdb',
              pipeProgram: 'ssh',
              pipeArgs: ['-p', String(ports['ssh'] || 2222), 'root@localhost']
            },
            MIMode: 'gdb'
          }
        ]
      },
      commands: [
        `ssh -p ${ports['ssh'] || 2222} root@localhost`,
        `gdb -ex "target remote :${ports['gdb'] || 1234}"`
      ]
    };
  }
}

// Export singleton
export const environmentSetup = new EnvironmentSetupService();