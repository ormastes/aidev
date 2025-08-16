/**
 * Environment Monitor Agent
 * Monitors system environment and resources
 */

import { BaseCoordinatorAgent } from './coordinator-interface';
import { WSMessage, MessageType } from '../types/messages';
import { os } from '../../../../../../../../infra_external-log-lib/src';
import { fs } from '../../../../../../../../infra_external-log-lib/src';
import { path } from '../../../../../../../../infra_external-log-lib/src';
import { systemMetricsLogger } from '../logging/system-metrics-logger';

export interface EnvironmentMonitorConfig {
  monitorInterval?: number; // milliseconds
  alertThresholds?: {
    cpuUsage?: number; // percentage
    memoryUsage?: number; // percentage
    diskUsage?: number; // percentage
    temperature?: number; // celsius
  };
  logDir?: string;
  enableGPUMonitoring?: boolean;
}

export class EnvironmentMonitorAgent extends BaseCoordinatorAgent {
  private config: EnvironmentMonitorConfig;
  private monitorTimer?: NodeJS.Timeout;
  private metricsHistory: any[] = [];
  private alertsSent: Map<string, Date> = new Map();

  constructor(
    serverUrl: string,
    roomId: string,
    agentName: string = 'EnvironmentMonitor',
    config: EnvironmentMonitorConfig = {}
  ) {
    super(serverUrl, roomId, agentName);
    
    this.config = {
      monitorInterval: config.monitorInterval || 30000, // 30 seconds default
      alertThresholds: {
        cpuUsage: config.alertThresholds?.cpuUsage || 80,
        memoryUsage: config.alertThresholds?.memoryUsage || 85,
        diskUsage: config.alertThresholds?.diskUsage || 90,
        temperature: config.alertThresholds?.temperature || 80
      },
      logDir: config.logDir || path.join(process.cwd(), 'logs', 'environment'),
      enableGPUMonitoring: config.enableGPUMonitoring !== false
    };
    
    this.ensureLogDir();
  }

  private ensureLogDir(): void {
    if (this.config.logDir && !fs.existsSync(this.config.logDir)) {
      fs.mkdirSync(this.config.logDir, { recursive: true });
    }
  }

  protected async handleConnect(): Promise<void> {
    await super.handleConnect();
    console.log(`🌍 Environment Monitor connected to room ${this.roomId}`);
    
    // Start monitoring
    this.startMonitoring();
    
    // Announce presence
    await this.sendMessage({
      type: MessageType.SYSTEM_MESSAGE,
      content: "🌍 Environment monitoring system is now active.",
      metadata: {
        agent: this.agentName,
        capability: 'environment_monitoring',
        platform: os.platform(),
        arch: os.arch()
      }
    });
  }

  protected async handleMessage(message: WSMessage<any>): Promise<void> {
    if (message.type === MessageType.USER_MESSAGE) {
      const content = message.content.toLowerCase();
      
      if (content.includes('environment') || content.includes('system status') || content.includes('resources')) {
        await this.reportEnvironmentStatus();
      } else if (content.includes('metrics') || content.includes('performance')) {
        await this.reportPerformanceMetrics();
      } else if (content.includes('temperature') || content.includes('temp')) {
        await this.reportTemperature();
      }
    }
  }

  private startMonitoring(): void {
    // Start system metrics logger if not already running
    if (!systemMetricsLogger.isLogging()) {
      systemMetricsLogger.startLogging(this.config.monitorInterval!);
    }
    
    this.monitorTimer = setInterval(() => {
      this.collectMetrics();
    }, this.config.monitorInterval!);
    
    // Collect initial metrics
    this.collectMetrics();
  }

  private async collectMetrics(): Promise<void> {
    const metrics = await systemMetricsLogger.getCurrentMetrics();
    
    // Enhance with additional environment data
    const enhancedMetrics = {
      ...metrics,
      environment: {
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptime: os.uptime(),
        nodeVersion: process.version,
        env: {
          NODE_ENV: process.env.NODE_ENV || 'development',
          CHAT_PORT: process.env.CHAT_PORT,
          hasAPIKey: !!process.env.ANTHROPIC_API_KEY
        }
      },
      process: {
        pid: process.pid,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        uptime: process.uptime()
      }
    };
    
    this.metricsHistory.push(enhancedMetrics);
    
    // Keep history manageable
    if (this.metricsHistory.length > 100) {
      this.metricsHistory = this.metricsHistory.slice(-50);
    }
    
    // Check for alerts
    await this.checkAlerts(enhancedMetrics);
    
    // Log metrics
    if (this.config.logDir) {
      this.logMetrics(enhancedMetrics);
    }
  }

  private async checkAlerts(metrics: any): Promise<void> {
    const alerts: string[] = [];
    
    // CPU usage alert
    if (metrics.cpu.usage > this.config.alertThresholds!.cpuUsage!) {
      alerts.push(`CPU usage high: ${metrics.cpu.usage.toFixed(1)}%`);
    }
    
    // Memory usage alert
    const memUsagePercent = (metrics.memory.usedPercent);
    if (memUsagePercent > this.config.alertThresholds!.memoryUsage!) {
      alerts.push(`Memory usage high: ${memUsagePercent.toFixed(1)}%`);
    }
    
    // Temperature alert
    if (metrics.cpu.temperature && metrics.cpu.temperature > this.config.alertThresholds!.temperature!) {
      alerts.push(`CPU temperature high: ${metrics.cpu.temperature}°C`);
    }
    
    // GPU alerts
    if (metrics.gpu && metrics.gpu.length > 0) {
      metrics.gpu.forEach((gpu: any, index: number) => {
        if (gpu.temperature > this.config.alertThresholds!.temperature!) {
          alerts.push(`GPU ${index} temperature high: ${gpu.temperature}°C`);
        }
        if (gpu.utilizationGpu > 90) {
          alerts.push(`GPU ${index} utilization high: ${gpu.utilizationGpu}%`);
        }
      });
    }
    
    // Send alerts (with rate limiting)
    for (const alert of alerts) {
      const lastAlert = this.alertsSent.get(alert);
      const now = new Date();
      
      if (!lastAlert || (now.getTime() - lastAlert.getTime()) > 300000) { // 5 minutes
        await this.sendAlert(alert);
        this.alertsSent.set(alert, now);
      }
    }
  }

  private async sendAlert(alert: string): Promise<void> {
    await this.sendMessage({
      type: MessageType.SYSTEM_MESSAGE,
      content: `⚠️ **Environment Alert**: ${alert}`,
      metadata: {
        agent: this.agentName,
        alertType: 'environment',
        alert
      }
    });
  }

  private logMetrics(metrics: any): void {
    const filename = `env-metrics-${new Date().toISOString().split('T')[0]}.jsonl`;
    const filepath = path.join(this.config.logDir!, filename);
    
    fs.appendFileSync(filepath, JSON.stringify(metrics) + '\n');
  }

  private async reportEnvironmentStatus(): Promise<void> {
    const latest = this.metricsHistory[this.metricsHistory.length - 1];
    if (!latest) {
      await this.sendMessage({
        type: MessageType.AGENT_MESSAGE,
        content: "🌍 No environment data collected yet. Please wait...",
        metadata: { agent: this.agentName }
      });
      return;
    }
    
    const status = `
🌍 **Environment Status**
- Platform: ${latest.environment.platform} (${latest.environment.arch})
- Node Version: ${latest.environment.nodeVersion}
- Uptime: ${this.formatUptime(latest.environment.uptime)}
- Environment: ${latest.environment.env.NODE_ENV}
- CPU Cores: ${latest.cpu.cores}
- Total Memory: ${this.formatBytes(latest.memory.total)}
`;
    
    await this.sendMessage({
      type: MessageType.AGENT_MESSAGE,
      content: status,
      metadata: {
        agent: this.agentName,
        reportType: 'environment'
      }
    });
  }

  private async reportPerformanceMetrics(): Promise<void> {
    const latest = this.metricsHistory[this.metricsHistory.length - 1];
    if (!latest) return;
    
    let performance = `
📊 **Performance Metrics**
- CPU Usage: ${latest.cpu.usage.toFixed(1)}%
- Memory: ${latest.memory.usedPercent.toFixed(1)}% (${this.formatBytes(latest.memory.used)} / ${this.formatBytes(latest.memory.total)})
- Load Average: ${latest.cpu.loadAvg.map((l: number) => l.toFixed(2)).join(', ')}
`;
    
    // Add GPU metrics if available
    if (latest.gpu && latest.gpu.length > 0) {
      performance += `\n**GPU Metrics**\n`;
      latest.gpu.forEach((gpu: any, index: number) => {
        performance += `- GPU ${index}: ${gpu.name}\n`;
        performance += `  Usage: ${gpu.utilizationGpu}%\n`;
        performance += `  Memory: ${gpu.memoryUsedPercent.toFixed(1)}%\n`;
        if (gpu.temperature) {
          performance += `  Temperature: ${gpu.temperature}°C\n`;
        }
      });
    }
    
    await this.sendMessage({
      type: MessageType.AGENT_MESSAGE,
      content: performance,
      metadata: {
        agent: this.agentName,
        reportType: 'performance',
        metrics: latest
      }
    });
  }

  private async reportTemperature(): Promise<void> {
    const latest = this.metricsHistory[this.metricsHistory.length - 1];
    if (!latest) return;
    
    let temps = `🌡️ **Temperature Report**\n`;
    
    if (latest.cpu.temperature) {
      temps += `- CPU: ${latest.cpu.temperature}°C\n`;
    } else {
      temps += `- CPU: Temperature data not available\n`;
    }
    
    if (latest.gpu && latest.gpu.length > 0) {
      latest.gpu.forEach((gpu: any, index: number) => {
        if (gpu.temperature) {
          temps += `- GPU ${index}: ${gpu.temperature}°C\n`;
        }
      });
    }
    
    await this.sendMessage({
      type: MessageType.AGENT_MESSAGE,
      content: temps,
      metadata: {
        agent: this.agentName,
        reportType: 'temperature'
      }
    });
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    return `${days}d ${hours}h ${minutes}m`;
  }

  private formatBytes(bytes: number): string {
    const gb = bytes / 1024 / 1024 / 1024;
    return `${gb.toFixed(1)} GB`;
  }

  public async shutdown(): Promise<void> {
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
    }
    
    // Export final metrics
    if (this.config.logDir && this.metricsHistory.length > 0) {
      const summaryPath = path.join(this.config.logDir, `env-summary-${Date.now()}.json`);
      fs.writeFileSync(summaryPath, JSON.stringify({
        sessionStart: this.metricsHistory[0].timestamp,
        sessionEnd: new Date(),
        metricsCollected: this.metricsHistory.length,
        averages: this.calculateAverages(),
        peaks: this.calculatePeaks()
      }, null, 2));
    }
    
    await super.shutdown();
  }

  private calculateAverages(): any {
    if (this.metricsHistory.length === 0) return {};
    
    const totals = {
      cpuUsage: 0,
      memoryUsage: 0,
      temperature: 0,
      tempCount: 0
    };
    
    this.metricsHistory.forEach(m => {
      totals.cpuUsage += m.cpu.usage;
      totals.memoryUsage += m.memory.usedPercent;
      if (m.cpu.temperature) {
        totals.temperature += m.cpu.temperature;
        totals.tempCount++;
      }
    });
    
    const count = this.metricsHistory.length;
    return {
      cpuUsage: (totals.cpuUsage / count).toFixed(1),
      memoryUsage: (totals.memoryUsage / count).toFixed(1),
      temperature: totals.tempCount > 0 ? (totals.temperature / totals.tempCount).toFixed(1) : null
    };
  }

  private calculatePeaks(): any {
    if (this.metricsHistory.length === 0) return {};
    
    return {
      cpuUsage: Math.max(...this.metricsHistory.map(m => m.cpu.usage)).toFixed(1),
      memoryUsage: Math.max(...this.metricsHistory.map(m => m.memory.usedPercent)).toFixed(1),
      temperature: Math.max(...this.metricsHistory.map(m => m.cpu.temperature || 0)).toFixed(1)
    };
  }
}

// Export factory function
export function createEnvironmentMonitor(
  serverUrl: string,
  roomId: string,
  agentName?: string,
  config?: EnvironmentMonitorConfig
): EnvironmentMonitorAgent {
  return new EnvironmentMonitorAgent(serverUrl, roomId, agentName, config);
}