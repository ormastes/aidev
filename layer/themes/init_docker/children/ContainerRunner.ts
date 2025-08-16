import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface RunOptions {
  name?: string;
  detach?: boolean;
  ports?: string[];
  volumes?: string[];
  env?: Record<string, string>;
  network?: string;
  restart?: 'no' | 'always' | 'unless-stopped' | 'on-failure';
  memory?: string;
  cpus?: string;
  user?: string;
  workdir?: string;
  entrypoint?: string;
  command?: string[];
  labels?: Record<string, string>;
  rm?: boolean;
  privileged?: boolean;
}

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  status: string;
  ports: string[];
  created: string;
  state: string;
}

export interface ContainerStats {
  cpu: number;
  memory: {
    usage: number;
    limit: number;
    percentage: number;
  };
  network: {
    rx: number;
    tx: number;
  };
  blockIO: {
    read: number;
    write: number;
  };
}

export class ContainerRunner {
  /**
   * Run a container
   */
  async run(image: string, options?: RunOptions): Promise<string> {
    const args: string[] = ['docker', 'run'];
    
    if (options?.detach) {
      args.push('-d');
    }
    
    if (options?.name) {
      args.push('--name', options.name);
    }
    
    if (options?.rm) {
      args.push('--rm');
    }
    
    if (options?.privileged) {
      args.push('--privileged');
    }
    
    if (options?.ports) {
      options.ports.forEach(port => {
        args.push('-p', port);
      });
    }
    
    if (options?.volumes) {
      options.volumes.forEach(volume => {
        args.push('-v', volume);
      });
    }
    
    if (options?.env) {
      Object.entries(options.env).forEach(([key, value]) => {
        args.push('-e', `${key}=${value}`);
      });
    }
    
    if (options?.network) {
      args.push('--network', options.network);
    }
    
    if (options?.restart) {
      args.push('--restart', options.restart);
    }
    
    if (options?.memory) {
      args.push('-m', options.memory);
    }
    
    if (options?.cpus) {
      args.push('--cpus', options.cpus);
    }
    
    if (options?.user) {
      args.push('--user', options.user);
    }
    
    if (options?.workdir) {
      args.push('-w', options.workdir);
    }
    
    if (options?.entrypoint) {
      args.push('--entrypoint', options.entrypoint);
    }
    
    if (options?.labels) {
      Object.entries(options.labels).forEach(([key, value]) => {
        args.push('--label', `${key}=${value}`);
      });
    }
    
    args.push(image);
    
    if (options?.command) {
      args.push(...options.command);
    }
    
    const command = args.join(' ');
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes('WARNING')) {
      throw new Error(`Failed to run container: ${stderr}`);
    }
    
    return stdout.trim();
  }

  /**
   * Stop a container
   */
  async stop(containerId: string, timeout?: number): Promise<void> {
    const args = ['docker', 'stop'];
    
    if (timeout) {
      args.push('-t', timeout.toString());
    }
    
    args.push(containerId);
    
    const command = args.join(' ');
    await execAsync(command);
  }

  /**
   * Start a stopped container
   */
  async start(containerId: string): Promise<void> {
    await execAsync(`docker start ${containerId}`);
  }

  /**
   * Restart a container
   */
  async restart(containerId: string): Promise<void> {
    await execAsync(`docker restart ${containerId}`);
  }

  /**
   * Remove a container
   */
  async remove(containerId: string, force?: boolean): Promise<void> {
    const command = force 
      ? `docker rm -f ${containerId}`
      : `docker rm ${containerId}`;
    await execAsync(command);
  }

  /**
   * List containers
   */
  async list(all?: boolean): Promise<ContainerInfo[]> {
    const command = all ? 'docker ps -a --format json' : 'docker ps --format json';
    const { stdout } = await execAsync(command);
    
    if (!stdout.trim()) {
      return [];
    }
    
    const lines = stdout.trim().split('\n');
    return lines.map(line => {
      const data = JSON.parse(line);
      return {
        id: data.ID,
        name: data.Names,
        image: data.Image,
        status: data.Status,
        ports: data.Ports ? data.Ports.split(', ') : [],
        created: data.CreatedAt,
        state: data.State
      };
    });
  }

  /**
   * Get container logs
   */
  async logs(containerId: string, options?: { tail?: number; follow?: boolean; timestamps?: boolean }): Promise<string> {
    const args = ['docker', 'logs'];
    
    if (options?.tail) {
      args.push('--tail', options.tail.toString());
    }
    
    if (options?.timestamps) {
      args.push('-t');
    }
    
    args.push(containerId);
    
    if (options?.follow) {
      // For follow mode, return a stream
      return new Promise((resolve, reject) => {
        const proc = spawn('docker', ['logs', '-f', containerId]);
        let output = '';
        
        proc.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        proc.stderr.on('data', (data) => {
          output += data.toString();
        });
        
        proc.on('error', reject);
        
        // For follow mode, we'll just return after a short time
        setTimeout(() => {
          proc.kill();
          resolve(output);
        }, 1000);
      });
    }
    
    const command = args.join(' ');
    const { stdout, stderr } = await execAsync(command);
    return stdout + stderr;
  }

  /**
   * Execute command in container
   */
  async exec(containerId: string, command: string[], options?: { user?: string; workdir?: string; env?: Record<string, string> }): Promise<string> {
    const args = ['docker', 'exec'];
    
    if (options?.user) {
      args.push('-u', options.user);
    }
    
    if (options?.workdir) {
      args.push('-w', options.workdir);
    }
    
    if (options?.env) {
      Object.entries(options.env).forEach(([key, value]) => {
        args.push('-e', `${key}=${value}`);
      });
    }
    
    args.push(containerId, ...command);
    
    const cmd = args.join(' ');
    const { stdout } = await execAsync(cmd);
    return stdout;
  }

  /**
   * Get container stats
   */
  async stats(containerId: string): Promise<ContainerStats> {
    const command = `docker stats ${containerId} --no-stream --format json`;
    const { stdout } = await execAsync(command);
    
    const data = JSON.parse(stdout);
    
    // Parse CPU percentage
    const cpuPercent = parseFloat(data.CPUPerc.replace('%', ''));
    
    // Parse memory
    const memUsage = this.parseMemory(data.MemUsage.split(' / ')[0]);
    const memLimit = this.parseMemory(data.MemUsage.split(' / ')[1]);
    const memPercent = parseFloat(data.MemPerc.replace('%', ''));
    
    // Parse network I/O
    const [netRx, netTx] = data.NetIO.split(' / ').map(this.parseMemory);
    
    // Parse block I/O
    const [blockRead, blockWrite] = data.BlockIO.split(' / ').map(this.parseMemory);
    
    return {
      cpu: cpuPercent,
      memory: {
        usage: memUsage,
        limit: memLimit,
        percentage: memPercent
      },
      network: {
        rx: netRx,
        tx: netTx
      },
      blockIO: {
        read: blockRead,
        write: blockWrite
      }
    };
  }

  /**
   * Inspect container
   */
  async inspect(containerId: string): Promise<any> {
    const { stdout } = await execAsync(`docker inspect ${containerId}`);
    return JSON.parse(stdout)[0];
  }

  /**
   * Check if container exists
   */
  async exists(containerId: string): Promise<boolean> {
    try {
      await execAsync(`docker inspect ${containerId}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if container is running
   */
  async isRunning(containerId: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`docker inspect -f '{{.State.Running}}' ${containerId}`);
      return stdout.trim() === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Wait for container to be healthy
   */
  async waitForHealthy(containerId: string, timeout: number = 60000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const { stdout } = await execAsync(`docker inspect -f '{{.State.Health.Status}}' ${containerId}`);
        const status = stdout.trim();
        
        if (status === 'healthy') {
          return true;
        }
        
        if (status === 'unhealthy') {
          return false;
        }
      } catch {
        // Container might not have health check
        return true;
      }
      
      // Wait 2 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return false;
  }

  /**
   * Copy files to/from container
   */
  async copy(source: string, destination: string): Promise<void> {
    await execAsync(`docker cp ${source} ${destination}`);
  }

  /**
   * Parse memory string to bytes
   */
  private parseMemory(memStr: string): number {
    const units: Record<string, number> = {
      'B': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024,
      'KiB': 1024,
      'MiB': 1024 * 1024,
      'GiB': 1024 * 1024 * 1024
    };
    
    const match = memStr.match(/^([\d.]+)([A-Za-z]+)$/);
    if (!match) return 0;
    
    const value = parseFloat(match[1]);
    const unit = match[2];
    
    return value * (units[unit] || 1);
  }
}