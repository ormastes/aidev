/**
 * System Metrics Logger
 * Enhanced logging with GPU and network usage tracking
 */

import { os } from '../../../../../../../../infra_external-log-lib/src';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fs } from '../../../../../../../../infra_external-log-lib/src';
import { path } from '../../../../../../../../infra_external-log-lib/src';
import chalk from 'chalk';

const execAsync = promisify(exec);

export interface SystemMetrics {
  timestamp: Date;
  cpu: CPUMetrics;
  memory: MemoryMetrics;
  gpu?: GPUMetrics;
  network?: NetworkMetrics;
  process?: ProcessMetrics;
}

export interface CPUMetrics {
  usage: number;
  cores: number;
  model: string;
  temperature?: number;
}

export interface MemoryMetrics {
  total: number;
  used: number;
  free: number;
  percent: number;
  swap?: {
    total: number;
    used: number;
    percent: number;
  };
}

export interface GPUMetrics {
  available: boolean;
  type: 'cuda' | 'rocm' | 'metal' | 'none';
  devices?: GPUDevice[];
}

export interface GPUDevice {
  index: number;
  name: string;
  temperature?: number;
  utilization?: number;
  memoryTotal?: number;
  memoryUsed?: number;
  memoryPercent?: number;
  powerDraw?: number;
  powerLimit?: number;
}

export interface NetworkMetrics {
  interfaces: NetworkInterface[];
  totalRx: number;
  totalTx: number;
  totalRxRate?: number;
  totalTxRate?: number;
}

export interface NetworkInterface {
  name: string;
  rx: number;
  tx: number;
  rxRate?: number;
  txRate?: number;
}

export interface ProcessMetrics {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  threads?: number;
}

export class SystemMetricsLogger {
  private logFile: string;
  private previousCPUInfo: any;
  private previousNetworkStats: Map<string, { rx: number; tx: number }> = new Map();
  private lastNetworkCheck: number = Date.now();
  private metricsHistory: SystemMetrics[] = [];
  private maxHistory: number = 1000;
  private logStream?: fs.WriteStream;

  constructor(logPath?: string) {
    this.logFile = logPath || path.join(process.cwd(), 'logs', `system-metrics-${Date.now()}.jsonl`);
    this.previousCPUInfo = os.cpus();
    this.ensureLogDirectory();
  }

  private ensureLogDirectory(): void {
    const dir = path.dirname(this.logFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async startLogging(intervalMs: number = 1000): Promise<void> {
    console.log(chalk.blue(`📊 Starting system metrics logging to: ${this.logFile}`));
    
    this.logStream = fs.createWriteStream(this.logFile, { flags: 'a' });
    
    // Initial network stats
    await this.updateNetworkStats();
    
    setInterval(async () => {
      const metrics = await this.collectMetrics();
      this.logMetrics(metrics);
    }, intervalMs);
  }

  stopLogging(): void {
    if (this.logStream) {
      this.logStream.end();
      console.log(chalk.yellow('📊 Stopped system metrics logging'));
    }
  }

  async collectMetrics(): Promise<SystemMetrics> {
    const [cpu, memory, gpu, network, process] = await Promise.all([
      this.getCPUMetrics(),
      this.getMemoryMetrics(),
      this.getGPUMetrics(),
      this.getNetworkMetrics(),
      this.getProcessMetrics()
    ]);

    const metrics: SystemMetrics = {
      timestamp: new Date(),
      cpu,
      memory,
      gpu,
      network,
      process
    };

    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > this.maxHistory) {
      this.metricsHistory.shift();
    }

    return metrics;
  }

  private async getCPUMetrics(): Promise<CPUMetrics> {
    const cpus = os.cpus();
    const usage = this.calculateCPUUsage(cpus);
    
    let temperature: number | undefined;
    try {
      // Try to get CPU temperature (Linux)
      const { stdout } = await execAsync('cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null');
      if (stdout) {
        temperature = parseInt(stdout) / 1000; // Convert to Celsius
      }
    } catch {}

    return {
      usage,
      cores: cpus.length,
      model: cpus[0].model,
      temperature
    };
  }

  private calculateCPUUsage(cpus: any[]): number {
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach((cpu, i) => {
      const prevCpu = this.previousCPUInfo[i];
      
      const idle = cpu.times.idle - prevCpu.times.idle;
      const user = cpu.times.user - prevCpu.times.user;
      const nice = cpu.times.nice - prevCpu.times.nice;
      const sys = cpu.times.sys - prevCpu.times.sys;
      const irq = cpu.times.irq - prevCpu.times.irq;
      
      const total = idle + user + nice + sys + irq;
      
      totalIdle += idle;
      totalTick += total;
    });
    
    this.previousCPUInfo = cpus;
    
    return totalTick === 0 ? 0 : Math.round(100 - (100 * totalIdle / totalTick));
  }

  private async getMemoryMetrics(): Promise<MemoryMetrics> {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    
    const metrics: MemoryMetrics = {
      total,
      used,
      free,
      percent: Math.round((used / total) * 100)
    };

    // Try to get swap info (Linux)
    try {
      const { stdout } = await execAsync('free -b | grep Swap');
      if (stdout) {
        const parts = stdout.trim().split(/\s+/);
        const swapTotal = parseInt(parts[1]);
        const swapUsed = parseInt(parts[2]);
        metrics.swap = {
          total: swapTotal,
          used: swapUsed,
          percent: swapTotal > 0 ? Math.round((swapUsed / swapTotal) * 100) : 0
        };
      }
    } catch {}

    return metrics;
  }

  private async getGPUMetrics(): Promise<GPUMetrics | undefined> {
    const platform = os.platform();
    
    // NVIDIA GPU (nvidia-smi)
    try {
      const { stdout } = await execAsync('nvidia-smi --query-gpu=index,name,temperature.gpu,utilization.gpu,memory.total,memory.used,power.draw,power.limit --format=csv,noheader,nounits');
      
      if (stdout) {
        const devices: GPUDevice[] = [];
        const lines = stdout.trim().split('\n');
        
        for (const line of lines) {
          const parts = line.split(',').map(p => p.trim());
          devices.push({
            index: parseInt(parts[0]),
            name: parts[1],
            temperature: parseFloat(parts[2]),
            utilization: parseFloat(parts[3]),
            memoryTotal: parseInt(parts[4]) * 1024 * 1024, // Convert to bytes
            memoryUsed: parseInt(parts[5]) * 1024 * 1024,
            memoryPercent: Math.round((parseInt(parts[5]) / parseInt(parts[4])) * 100),
            powerDraw: parseFloat(parts[6]),
            powerLimit: parseFloat(parts[7])
          });
        }
        
        return {
          available: true,
          type: 'cuda',
          devices
        };
      }
    } catch {}

    // AMD GPU (rocm-smi)
    try {
      const { stdout } = await execAsync('rocm-smi --showtemp --showuse --showmeminfo vram');
      if (stdout) {
        // Parse AMD GPU info (simplified)
        return {
          available: true,
          type: 'rocm',
          devices: [{
            index: 0,
            name: 'AMD GPU',
            temperature: 0,
            utilization: 0
          }]
        };
      }
    } catch {}

    // macOS Metal
    if (platform === 'darwin') {
      try {
        const { stdout } = await execAsync('system_profiler SPDisplaysDataType | grep Chipset');
        if (stdout && (stdout.includes('Apple') || stdout.includes('M1') || stdout.includes('M2') || stdout.includes('M3'))) {
          return {
            available: true,
            type: 'metal',
            devices: [{
              index: 0,
              name: 'Apple Silicon GPU',
              utilization: 0
            }]
          };
        }
      } catch {}
    }

    return {
      available: false,
      type: 'none'
    };
  }

  private async getNetworkMetrics(): Promise<NetworkMetrics> {
    await this.updateNetworkStats();
    
    const interfaces: NetworkInterface[] = [];
    let totalRx = 0;
    let totalTx = 0;
    let totalRxRate = 0;
    let totalTxRate = 0;
    
    const currentTime = Date.now();
    const timeDelta = (currentTime - this.lastNetworkCheck) / 1000; // seconds
    
    const netInterfaces = os.networkInterfaces();
    
    for (const [name, addrs] of Object.entries(netInterfaces)) {
      if (!addrs || name === 'lo') continue; // Skip loopback
      
      const stats = await this.getInterfaceStats(name);
      if (stats) {
        const prev = this.previousNetworkStats.get(name);
        
        let rxRate = 0;
        let txRate = 0;
        
        if (prev && timeDelta > 0) {
          rxRate = Math.round((stats.rx - prev.rx) / timeDelta);
          txRate = Math.round((stats.tx - prev.tx) / timeDelta);
        }
        
        interfaces.push({
          name,
          rx: stats.rx,
          tx: stats.tx,
          rxRate,
          txRate
        });
        
        totalRx += stats.rx;
        totalTx += stats.tx;
        totalRxRate += rxRate;
        totalTxRate += txRate;
        
        this.previousNetworkStats.set(name, stats);
      }
    }
    
    this.lastNetworkCheck = currentTime;
    
    return {
      interfaces,
      totalRx,
      totalTx,
      totalRxRate,
      totalTxRate
    };
  }

  private async getInterfaceStats(iface: string): Promise<{ rx: number; tx: number } | null> {
    const platform = os.platform();
    
    if (platform === 'linux') {
      try {
        const rxPath = `/sys/class/net/${iface}/statistics/rx_bytes`;
        const txPath = `/sys/class/net/${iface}/statistics/tx_bytes`;
        
        const rx = parseInt(fs.readFileSync(rxPath, 'utf8'));
        const tx = parseInt(fs.readFileSync(txPath, 'utf8'));
        
        return { rx, tx };
      } catch {}
    } else if (platform === 'darwin') {
      try {
        const { stdout } = await execAsync(`netstat -ibn | grep -A 1 "^${iface}"`);
        if (stdout) {
          const lines = stdout.trim().split('\n');
          if (lines.length >= 2) {
            const parts = lines[1].trim().split(/\s+/);
            return {
              rx: parseInt(parts[6]) || 0,
              tx: parseInt(parts[9]) || 0
            };
          }
        }
      } catch {}
    }
    
    return null;
  }

  private async updateNetworkStats(): Promise<void> {
    const interfaces = os.networkInterfaces();
    
    for (const [name] of Object.entries(interfaces)) {
      if (name === 'lo') continue;
      
      const stats = await this.getInterfaceStats(name);
      if (stats && !this.previousNetworkStats.has(name)) {
        this.previousNetworkStats.set(name, stats);
      }
    }
  }

  private async getProcessMetrics(): Promise<ProcessMetrics | undefined> {
    const pid = process.pid;
    const platform = os.platform();
    
    try {
      if (platform === 'linux' || platform === 'darwin') {
        const { stdout } = await execAsync(`ps -p ${pid} -o pid,comm,%cpu,%mem,nlwp`);
        const lines = stdout.trim().split('\n');
        if (lines.length >= 2) {
          const parts = lines[1].trim().split(/\s+/);
          return {
            pid: parseInt(parts[0]),
            name: parts[1],
            cpu: parseFloat(parts[2]),
            memory: parseFloat(parts[3]),
            threads: parseInt(parts[4]) || 1
          };
        }
      }
    } catch {}
    
    return undefined;
  }

  private logMetrics(metrics: SystemMetrics): void {
    if (this.logStream) {
      this.logStream.write(JSON.stringify(metrics) + '\n');
    }
  }

  getHistory(): SystemMetrics[] {
    return [...this.metricsHistory];
  }

  getLatestMetrics(): SystemMetrics | undefined {
    return this.metricsHistory[this.metricsHistory.length - 1];
  }

  getSummary(): any {
    if (this.metricsHistory.length === 0) return null;
    
    const cpuValues = this.metricsHistory.map(m => m.cpu.usage);
    const memValues = this.metricsHistory.map(m => m.memory.percent);
    const gpuValues = this.metricsHistory
      .filter(m => m.gpu?.devices?.[0]?.utilization !== undefined)
      .map(m => m.gpu!.devices![0].utilization!);
    
    return {
      samples: this.metricsHistory.length,
      cpu: {
        avg: Math.round(cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length),
        max: Math.max(...cpuValues),
        min: Math.min(...cpuValues)
      },
      memory: {
        avg: Math.round(memValues.reduce((a, b) => a + b, 0) / memValues.length),
        max: Math.max(...memValues),
        min: Math.min(...memValues)
      },
      gpu: gpuValues.length > 0 ? {
        avg: Math.round(gpuValues.reduce((a, b) => a + b, 0) / gpuValues.length),
        max: Math.max(...gpuValues),
        min: Math.min(...gpuValues)
      } : null,
      network: {
        totalRx: this.formatBytes(this.metricsHistory[this.metricsHistory.length - 1].network?.totalRx || 0),
        totalTx: this.formatBytes(this.metricsHistory[this.metricsHistory.length - 1].network?.totalTx || 0)
      }
    };
  }

  private formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  async exportMetrics(outputPath?: string): Promise<void> {
    const exportPath = outputPath || this.logFile.replace('.jsonl', '-export.json');
    const summary = this.getSummary();
    const data = {
      summary,
      metrics: this.metricsHistory,
      metadata: {
        startTime: this.metricsHistory[0]?.timestamp,
        endTime: this.metricsHistory[this.metricsHistory.length - 1]?.timestamp,
        samples: this.metricsHistory.length,
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname()
      }
    };
    
    fs.writeFileSync(exportPath, JSON.stringify(data, null, 2));
    console.log(chalk.green(`📊 Metrics exported to: ${exportPath}`));
  }
}

// Export singleton for convenience
export const systemMetricsLogger = new SystemMetricsLogger();