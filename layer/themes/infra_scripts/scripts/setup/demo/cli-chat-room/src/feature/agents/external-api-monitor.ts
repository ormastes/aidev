/**
 * External API Monitor Agent
 * Monitors and reports on external API calls and network activity
 */

import { BaseCoordinatorAgent } from './coordinator-interface';
import { WSMessage, MessageType } from '../types/messages';
import { networkInterceptor } from '../logging/network-interceptor';
import { databaseInterceptor } from '../logging/database-interceptor';
import { fs } from '../../../../../../../../infra_external-log-lib/src';
import { path } from '../../../../../../../../infra_external-log-lib/src';

export interface ExternalAPIConfig {
  reportInterval?: number;
  logDir?: string;
  trackDomains?: string[];
  alertOnErrors?: boolean;
  enableInterception?: boolean;
}

interface APICallSummary {
  domain: string;
  count: number;
  errors: number;
  totalBytes: number;
  avgLatency: number;
  methods: Record<string, number>;
}

export class ExternalAPIMonitorAgent extends BaseCoordinatorAgent {
  private config: ExternalAPIConfig;
  private apiCalls: Map<string, any[]> = new Map();
  private reportTimer?: NodeJS.Timeout;
  private interceptorsEnabled = false;

  constructor(
    serverUrl: string,
    roomId: string,
    agentName: string = 'ExternalAPIMonitor',
    config: ExternalAPIConfig = {}
  ) {
    super(serverUrl, roomId, agentName);
    
    this.config = {
      reportInterval: config.reportInterval || 60000, // 1 minute
      logDir: config.logDir || path.join(process.cwd(), 'logs', 'external-api'),
      trackDomains: config.trackDomains || [],
      alertOnErrors: config.alertOnErrors !== false,
      enableInterception: config.enableInterception !== false
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
    console.log(`🌐 External API Monitor connected to room ${this.roomId}`);
    
    // Setup interceptors if enabled
    if (this.config.enableInterception) {
      this.setupInterceptors();
    }
    
    // Start periodic reporting
    this.startReporting();
    
    // Announce presence
    await this.sendMessage({
      type: MessageType.SYSTEM_MESSAGE,
      content: "🌐 External API monitoring is now active.",
      metadata: {
        agent: this.agentName,
        capability: 'external_api_monitoring',
        interceptionEnabled: this.config.enableInterception
      }
    });
  }

  protected async handleMessage(message: WSMessage<any>): Promise<void> {
    if (message.type === MessageType.USER_MESSAGE) {
      const content = message.content.toLowerCase();
      
      if (content.includes('api') || content.includes('external') || content.includes('network')) {
        await this.reportAPIStatus();
      } else if (content.includes('api errors') || content.includes('failed requests')) {
        await this.reportErrors();
      } else if (content.includes('api domains') || content.includes('endpoints')) {
        await this.reportDomains();
      }
    }
  }

  private setupInterceptors(): void {
    if (this.interceptorsEnabled) return;
    
    // Enable network interception
    networkInterceptor.enable();
    
    // Listen for network events
    networkInterceptor.on('network', (log) => {
      this.trackAPICall(log);
    });
    
    // Enable database interception for external databases
    databaseInterceptor.enable();
    
    // Listen for database events
    databaseInterceptor.on('database', (log) => {
      if (this.isExternalDatabase(log)) {
        this.trackDatabaseCall(log);
      }
    });
    
    this.interceptorsEnabled = true;
    console.log('🌐 External API interception enabled');
  }

  private trackAPICall(log: any): void {
    const domain = this.extractDomain(log.host || log.hostname || '');
    if (!domain) return;
    
    // Filter by tracked domains if specified
    if (this.config.trackDomains!.length > 0 && 
        !this.config.trackDomains!.some(d => domain.includes(d))) {
      return;
    }
    
    const calls = this.apiCalls.get(domain) || [];
    calls.push({
      timestamp: log.timestamp,
      method: log.method || log.type,
      path: log.path || log.url,
      statusCode: log.statusCode,
      error: log.error,
      duration: log.duration,
      bytesRead: log.bytesRead || 0,
      bytesWritten: log.bytesWritten || 0,
      headers: log.headers
    });
    
    this.apiCalls.set(domain, calls);
    
    // Alert on errors if configured
    if (this.config.alertOnErrors && log.error) {
      this.sendErrorAlert(domain, log);
    }
  }

  private trackDatabaseCall(log: any): void {
    const domain = `${log.type}://${log.host || 'external'}:${log.port || 'default'}`;
    
    const calls = this.apiCalls.get(domain) || [];
    calls.push({
      timestamp: log.timestamp,
      operation: log.operation,
      database: log.database,
      query: log.query,
      error: log.error,
      duration: log.duration,
      rowCount: log.rowCount
    });
    
    this.apiCalls.set(domain, calls);
  }

  private isExternalDatabase(log: any): boolean {
    // Consider database external if not localhost
    const host = log.host || '';
    return host && !['localhost', '127.0.0.1', '::1'].includes(host);
  }

  private extractDomain(host: string): string {
    if (!host) return '';
    
    // Remove port if present
    const domain = host.split(':')[0];
    
    // Extract main domain for grouping
    const parts = domain.split('.');
    if (parts.length >= 2) {
      return parts.slice(-2).join('.');
    }
    
    return domain;
  }

  private async sendErrorAlert(domain: string, log: any): Promise<void> {
    await this.sendMessage({
      type: MessageType.SYSTEM_MESSAGE,
      content: `🚨 **External API Error**: ${domain} - ${log.error}`,
      metadata: {
        agent: this.agentName,
        alertType: 'api_error',
        domain,
        error: log.error,
        method: log.method,
        path: log.path
      }
    });
  }

  private startReporting(): void {
    this.reportTimer = setInterval(() => {
      this.generatePeriodicReport();
    }, this.config.reportInterval!);
  }

  private async generatePeriodicReport(): Promise<void> {
    if (this.apiCalls.size === 0) return;
    
    const summary = this.generateSummary();
    
    // Save to file
    if (this.config.logDir) {
      const filename = `api-report-${Date.now()}.json`;
      const filepath = path.join(this.config.logDir, filename);
      fs.writeFileSync(filepath, JSON.stringify({
        timestamp: new Date(),
        period: this.config.reportInterval,
        summary,
        details: Object.fromEntries(this.apiCalls)
      }, null, 2));
    }
    
    // Send summary to chat
    const topDomains = Object.entries(summary)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);
    
    if (topDomains.length > 0) {
      let report = `🌐 **External API Activity**\n`;
      topDomains.forEach(([domain, stats]) => {
        report += `- ${domain}: ${stats.count} calls`;
        if (stats.errors > 0) {
          report += ` (${stats.errors} errors)`;
        }
        report += `\n`;
      });
      
      await this.sendMessage({
        type: MessageType.AGENT_MESSAGE,
        content: report,
        metadata: {
          agent: this.agentName,
          reportType: 'periodic',
          totalDomains: Object.keys(summary).length,
          totalCalls: Object.values(summary).reduce((sum, s) => sum + s.count, 0)
        }
      });
    }
  }

  private generateSummary(): Record<string, APICallSummary> {
    const summary: Record<string, APICallSummary> = {};
    
    this.apiCalls.forEach((calls, domain) => {
      const errorCount = calls.filter(c => c.error).length;
      const totalLatency = calls.reduce((sum, c) => sum + (c.duration || 0), 0);
      const totalBytes = calls.reduce((sum, c) => sum + (c.bytesRead || 0) + (c.bytesWritten || 0), 0);
      
      const methods: Record<string, number> = {};
      calls.forEach(c => {
        const method = c.method || c.operation || 'unknown';
        methods[method] = (methods[method] || 0) + 1;
      });
      
      summary[domain] = {
        domain,
        count: calls.length,
        errors: errorCount,
        totalBytes,
        avgLatency: calls.length > 0 ? Math.round(totalLatency / calls.length) : 0,
        methods
      };
    });
    
    return summary;
  }

  private async reportAPIStatus(): Promise<void> {
    const summary = this.generateSummary();
    const stats = networkInterceptor.getStats();
    
    let status = `🌐 **External API Status**\n`;
    status += `- Active Domains: ${Object.keys(summary).length}\n`;
    status += `- Total API Calls: ${Object.values(summary).reduce((sum, s) => sum + s.count, 0)}\n`;
    status += `- Total Errors: ${Object.values(summary).reduce((sum, s) => sum + s.errors, 0)}\n`;
    
    if (stats) {
      status += `\n**Network Stats**\n`;
      status += `- Total Requests: ${stats.total}\n`;
      status += `- Bytes Sent: ${this.formatBytes(stats.totalBytesWritten)}\n`;
      status += `- Bytes Received: ${this.formatBytes(stats.totalBytesRead)}\n`;
    }
    
    await this.sendMessage({
      type: MessageType.AGENT_MESSAGE,
      content: status,
      metadata: {
        agent: this.agentName,
        reportType: 'status',
        summary
      }
    });
  }

  private async reportErrors(): Promise<void> {
    const errors: any[] = [];
    
    this.apiCalls.forEach((calls, domain) => {
      calls.filter(c => c.error).forEach(call => {
        errors.push({
          domain,
          timestamp: call.timestamp,
          error: call.error,
          method: call.method || call.operation,
          path: call.path
        });
      });
    });
    
    if (errors.length === 0) {
      await this.sendMessage({
        type: MessageType.AGENT_MESSAGE,
        content: "🌐 No API errors detected.",
        metadata: { agent: this.agentName }
      });
      return;
    }
    
    const recentErrors = errors.slice(-5);
    let report = `🚨 **Recent API Errors** (${errors.length} total)\n`;
    recentErrors.forEach(err => {
      report += `- ${err.domain}: ${err.error}\n`;
    });
    
    await this.sendMessage({
      type: MessageType.AGENT_MESSAGE,
      content: report,
      metadata: {
        agent: this.agentName,
        reportType: 'errors',
        totalErrors: errors.length
      }
    });
  }

  private async reportDomains(): Promise<void> {
    const summary = this.generateSummary();
    const domains = Object.keys(summary).sort();
    
    if (domains.length === 0) {
      await this.sendMessage({
        type: MessageType.AGENT_MESSAGE,
        content: "🌐 No external API domains tracked yet.",
        metadata: { agent: this.agentName }
      });
      return;
    }
    
    let report = `🌐 **Tracked API Domains** (${domains.length} total)\n`;
    domains.slice(0, 10).forEach(domain => {
      const stats = summary[domain];
      report += `- ${domain}: ${stats.count} calls`;
      const methods = Object.keys(stats.methods).join(', ');
      if (methods) {
        report += ` [${methods}]`;
      }
      report += '\n';
    });
    
    await this.sendMessage({
      type: MessageType.AGENT_MESSAGE,
      content: report,
      metadata: {
        agent: this.agentName,
        reportType: 'domains',
        totalDomains: domains.length
      }
    });
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  public async shutdown(): Promise<void> {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
    }
    
    // Generate final report
    await this.generatePeriodicReport();
    
    // Export final stats
    if (this.config.logDir) {
      const finalStats = {
        sessionEnd: new Date(),
        totalDomains: this.apiCalls.size,
        summary: this.generateSummary(),
        networkStats: this.interceptorsEnabled ? networkInterceptor.getStats() : null,
        databaseStats: this.interceptorsEnabled ? databaseInterceptor.getStats() : null
      };
      
      const filepath = path.join(this.config.logDir, `api-final-${Date.now()}.json`);
      fs.writeFileSync(filepath, JSON.stringify(finalStats, null, 2));
    }
    
    await super.shutdown();
  }
}

// Export factory function
export function createExternalAPIMonitor(
  serverUrl: string,
  roomId: string,
  agentName?: string,
  config?: ExternalAPIConfig
): ExternalAPIMonitorAgent {
  return new ExternalAPIMonitorAgent(serverUrl, roomId, agentName, config);
}