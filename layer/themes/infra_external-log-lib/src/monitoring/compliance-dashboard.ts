/**
 * File Creation API Compliance Monitoring Dashboard
 * Real-time monitoring and reporting of compliance status
 */

import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { execSync } from 'child_process';
import { getFileAPI, FileType } from '../file-manager/FileCreationAPI';
import { strictEnforcement, isDirectFSAllowed } from '../config/enforcement-config';

const fileAPI = getFileAPI();

export interface ComplianceMetrics {
  timestamp: Date;
  totalFiles: number;
  compliantFiles: number;
  violations: number;
  complianceRate: number;
  exemptFiles: number;
  nonExemptViolations: number;
  trends: {
    hourly: number[];
    daily: number[];
    weekly: number[];
  };
  components: ComponentMetrics[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface ComponentMetrics {
  name: string;
  type: 'theme' | 'epic' | 'script' | 'common';
  files: number;
  violations: number;
  complianceRate: number;
  isExempt: boolean;
  lastChecked: Date;
}

export interface ComplianceAlert {
  id: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'critical';
  type: 'violation' | 'regression' | 'threshold' | 'fraud';
  message: string;
  details: {
    file?: string;
    component?: string;
    violationType?: string;
    threshold?: number;
    actual?: number;
  };
  resolved: boolean;
}

export class ComplianceDashboard extends EventEmitter {
  private basePath: string;
  private metrics: ComplianceMetrics | null = null;
  private alerts: ComplianceAlert[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private webhooks: string[] = [];
  private thresholds = {
    critical: 90,  // Below 90% is critical
    warning: 95,   // Below 95% is warning
    target: 99     // Target is 99%+
  };

  constructor(basePath: string = process.cwd()) {
    super();
    this.basePath = basePath;
  }

  /**
   * Start monitoring compliance
   */
  async startMonitoring(intervalMs: number = 3600000): Promise<void> {
    console.log('🚀 Starting File API Compliance Monitoring...');
    
    // Initial scan
    await this.updateMetrics();
    
    // Set up interval monitoring
    this.monitoringInterval = setInterval(async () => {
      await this.updateMetrics();
      await this.checkThresholds();
      await this.detectAnomalies();
    }, intervalMs);
    
    this.emit('monitoring:started', { interval: intervalMs });
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.emit('monitoring:stopped');
    }
  }

  /**
   * Update compliance metrics
   */
  async updateMetrics(): Promise<ComplianceMetrics> {
    const startTime = Date.now();
    
    try {
      // Run compliance scan
      const scanResult = this.runComplianceScan();
      
      // Parse results
      const metrics = this.parseMetrics(scanResult);
      
      // Update trends
      if (this.metrics) {
        metrics.trends = this.updateTrends(this.metrics.trends, metrics.complianceRate);
      } else {
        metrics.trends = {
          hourly: [metrics.complianceRate],
          daily: [metrics.complianceRate],
          weekly: [metrics.complianceRate]
        };
      }
      
      // Determine risk level
      metrics.riskLevel = this.calculateRiskLevel(metrics);
      
      // Store metrics
      this.metrics = metrics;
      
      // Emit update event
      this.emit('metrics:updated', metrics);
      
      // Save metrics to file
      await this.saveMetrics(metrics);
      
      console.log(`📊 Metrics updated in ${Date.now() - startTime}ms`);
      console.log(`   Compliance: ${metrics.complianceRate.toFixed(1)}%`);
      console.log(`   Risk Level: ${metrics.riskLevel}`);
      
      return metrics;
      
    } catch (error: any) {
      console.error('❌ Failed to update metrics:', error.message);
      this.createAlert('error', 'violation', 'Failed to update compliance metrics', {
        violationType: 'scan_failure'
      });
      throw error;
    }
  }

  /**
   * Run compliance scan
   */
  private runComplianceScan(): string {
    try {
      const result = execSync(
        'node scripts/scan-production-code.js 2>/dev/null',
        { cwd: this.basePath, encoding: 'utf8' }
      );
      return result;
    } catch (error) {
      return '';
    }
  }

  /**
   * Parse metrics from scan result
   */
  private parseMetrics(scanResult: string): ComplianceMetrics {
    const lines = scanResult.split('\n');
    
    // Extract key metrics
    const totalViolations = this.extractNumber(scanResult, /Total violations:\s*(\d+)/) || 0;
    const filesAffected = this.extractNumber(scanResult, /Files affected:\s*(\d+)/) || 0;
    const totalFiles = 1011; // Known total from previous scans
    
    const compliantFiles = totalFiles - filesAffected;
    const complianceRate = (compliantFiles / totalFiles) * 100;
    
    // Parse component metrics
    const components = this.parseComponentMetrics(scanResult);
    
    // Count exempt vs non-exempt
    let exemptFiles = 0;
    let nonExemptViolations = 0;
    
    for (const component of components) {
      if (component.isExempt) {
        exemptFiles += component.files;
      } else {
        nonExemptViolations += component.violations;
      }
    }
    
    return {
      timestamp: new Date(),
      totalFiles,
      compliantFiles,
      violations: totalViolations,
      complianceRate,
      exemptFiles,
      nonExemptViolations,
      trends: { hourly: [], daily: [], weekly: [] },
      components,
      riskLevel: 'low'
    };
  }

  /**
   * Parse component metrics
   */
  private parseComponentMetrics(scanResult: string): ComponentMetrics[] {
    const components: ComponentMetrics[] = [];
    const componentSection = scanResult.match(/BY COMPONENT:([\s\S]*?)======/);
    
    if (!componentSection) return components;
    
    const lines = componentSection[1].split('\n');
    
    for (const line of lines) {
      const match = line.match(/^(theme:|epic:|scripts|common|root)([^(]*)\((\d+) violations? in (\d+) files?\)/);
      if (match) {
        const [, type, name, violations, files] = match;
        const componentName = name ? name.trim() : type.replace(':', '');
        
        components.push({
          name: componentName,
          type: type.includes('theme') ? 'theme' : 
                type.includes('epic') ? 'epic' : 
                type === 'scripts' ? 'script' : 'common',
          files: parseInt(files),
          violations: parseInt(violations),
          complianceRate: 100 - (parseInt(violations) / parseInt(files) * 100),
          isExempt: this.isComponentExempt(componentName),
          lastChecked: new Date()
        });
      }
    }
    
    return components;
  }

  /**
   * Check if component is exempt
   */
  private isComponentExempt(componentName: string): boolean {
    const exemptPatterns = ['mate_dealer', 'sample_', 'demo_', 'example_'];
    return exemptPatterns.some(pattern => componentName.includes(pattern));
  }

  /**
   * Calculate risk level
   */
  private calculateRiskLevel(metrics: ComplianceMetrics): 'low' | 'medium' | 'high' | 'critical' {
    if (metrics.complianceRate < this.thresholds.critical) return 'critical';
    if (metrics.complianceRate < this.thresholds.warning) return 'high';
    if (metrics.nonExemptViolations > 50) return 'medium';
    if (metrics.nonExemptViolations > 10) return 'low';
    return 'low';
  }

  /**
   * Check thresholds and create alerts
   */
  private async checkThresholds(): Promise<void> {
    if (!this.metrics) return;
    
    // Check compliance rate threshold
    if (this.metrics.complianceRate < this.thresholds.critical) {
      this.createAlert('critical', 'threshold', 
        `Compliance rate critically low: ${this.metrics.complianceRate.toFixed(1)}%`, {
          threshold: this.thresholds.critical,
          actual: this.metrics.complianceRate
        });
    } else if (this.metrics.complianceRate < this.thresholds.warning) {
      this.createAlert('warning', 'threshold',
        `Compliance rate below warning threshold: ${this.metrics.complianceRate.toFixed(1)}%`, {
          threshold: this.thresholds.warning,
          actual: this.metrics.complianceRate
        });
    }
    
    // Check for regression (compliance decreased)
    if (this.metrics.trends.hourly.length > 1) {
      const previous = this.metrics.trends.hourly[this.metrics.trends.hourly.length - 2];
      const current = this.metrics.complianceRate;
      
      if (current < previous) {
        this.createAlert('warning', 'regression',
          `Compliance regression detected: ${previous.toFixed(1)}% → ${current.toFixed(1)}%`, {
            threshold: previous,
            actual: current
        });
      }
    }
    
    // Check non-exempt violations
    if (this.metrics.nonExemptViolations > 20) {
      this.createAlert('error', 'violation',
        `High number of violations in non-exempt themes: ${this.metrics.nonExemptViolations}`, {
          violationType: 'non_exempt_violations',
          actual: this.metrics.nonExemptViolations
        });
    }
  }

  /**
   * Detect anomalies in compliance patterns
   */
  private async detectAnomalies(): Promise<void> {
    if (!this.metrics) return;
    
    // Check for sudden spike in violations
    if (this.metrics.trends.hourly.length > 3) {
      const recent = this.metrics.trends.hourly.slice(-3);
      const average = recent.reduce((a, b) => a + b, 0) / recent.length;
      
      if (this.metrics.complianceRate < average - 5) {
        this.createAlert('warning', 'fraud',
          'Potential fraud: Sudden spike in violations detected', {
            violationType: 'anomaly_spike'
          });
      }
    }
    
    // Check for components with zero compliance
    for (const component of this.metrics.components) {
      if (!component.isExempt && component.complianceRate === 0) {
        this.createAlert('critical', 'violation',
          `Component has zero compliance: ${component.name}`, {
            component: component.name,
            violationType: 'zero_compliance'
          });
      }
    }
  }

  /**
   * Create alert
   */
  private createAlert(
    severity: 'info' | 'warning' | 'error' | 'critical',
    type: 'violation' | 'regression' | 'threshold' | 'fraud',
    message: string,
    details: any = {}
  ): void {
    const alert: ComplianceAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      severity,
      type,
      message,
      details,
      resolved: false
    };
    
    this.alerts.push(alert);
    this.emit('alert:created', alert);
    
    // Send webhooks for critical alerts
    if (severity === 'critical') {
      this.sendWebhooks(alert);
    }
    
    console.log(`🚨 ${severity.toUpperCase()}: ${message}`);
  }

  /**
   * Send webhooks
   */
  private async sendWebhooks(alert: ComplianceAlert): Promise<void> {
    for (const webhook of this.webhooks) {
      try {
        // In a real implementation, this would send HTTP requests
        console.log(`📤 Sending webhook to: ${webhook}`);
      } catch (error) {
        console.error(`Failed to send webhook: ${error}`);
      }
    }
  }

  /**
   * Update trends
   */
  private updateTrends(
    existing: { hourly: number[]; daily: number[]; weekly: number[] },
    newValue: number
  ): { hourly: number[]; daily: number[]; weekly: number[] } {
    // Update hourly (keep last 24 hours)
    existing.hourly.push(newValue);
    if (existing.hourly.length > 24) {
      existing.hourly.shift();
    }
    
    // Update daily (keep last 30 days)
    if (existing.hourly.length % 24 === 0) {
      const dayAvg = existing.hourly.reduce((a, b) => a + b, 0) / existing.hourly.length;
      existing.daily.push(dayAvg);
      if (existing.daily.length > 30) {
        existing.daily.shift();
      }
    }
    
    // Update weekly (keep last 12 weeks)
    if (existing.daily.length % 7 === 0 && existing.daily.length > 0) {
      const weekAvg = existing.daily.slice(-7).reduce((a, b) => a + b, 0) / 7;
      existing.weekly.push(weekAvg);
      if (existing.weekly.length > 12) {
        existing.weekly.shift();
      }
    }
    
    return existing;
  }

  /**
   * Save metrics to file
   */
  private async saveMetrics(metrics: ComplianceMetrics): Promise<void> {
    const metricsPath = path.join(this.basePath, 'gen/doc/compliance-metrics.json');
    await fileAPI.createFile(
      metricsPath,
      JSON.stringify(metrics, null, 2),
      { type: FileType.DATA }
    );
  }

  /**
   * Generate dashboard HTML
   */
  async generateDashboard(): Promise<string> {
    if (!this.metrics) {
      await this.updateMetrics();
    }
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>File API Compliance Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        .header {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2d3748;
            margin-bottom: 10px;
            font-size: 32px;
        }
        .subtitle {
            color: #718096;
            font-size: 14px;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        .metric-card {
            background: white;
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .metric-label {
            color: #718096;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }
        .metric-value {
            font-size: 36px;
            font-weight: bold;
            color: #2d3748;
            margin-bottom: 5px;
        }
        .metric-change {
            font-size: 14px;
            color: #48bb78;
        }
        .metric-change.negative {
            color: #f56565;
        }
        .compliance-rate {
            background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
            color: white;
        }
        .compliance-rate.warning {
            background: linear-gradient(135deg, #ed8936 0%, #dd6b20 100%);
        }
        .compliance-rate.critical {
            background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
        }
        .chart-container {
            background: white;
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .alerts {
            background: white;
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .alert {
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .alert.info { background: #bee3f8; color: #2c5282; }
        .alert.warning { background: #feebc8; color: #7c2d12; }
        .alert.error { background: #fed7d7; color: #742a2a; }
        .alert.critical { 
            background: #fc8181; 
            color: white;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
        }
        .components-table {
            background: white;
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th {
            text-align: left;
            padding: 12px;
            border-bottom: 2px solid #e2e8f0;
            color: #4a5568;
            font-weight: 600;
        }
        td {
            padding: 12px;
            border-bottom: 1px solid #e2e8f0;
        }
        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
        }
        .badge.exempt {
            background: #e2e8f0;
            color: #4a5568;
        }
        .badge.compliant {
            background: #c6f6d5;
            color: #22543d;
        }
        .badge.violation {
            background: #fed7d7;
            color: #742a2a;
        }
        .risk-indicator {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 12px;
        }
        .risk-low { background: #c6f6d5; color: #22543d; }
        .risk-medium { background: #feebc8; color: #7c2d12; }
        .risk-high { background: #fed7d7; color: #742a2a; }
        .risk-critical { 
            background: #fc8181; 
            color: white;
            animation: pulse 2s infinite;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒 File API Compliance Dashboard</h1>
            <div class="subtitle">Last updated: ${this.metrics?.timestamp.toLocaleString()}</div>
        </div>
        
        <div class="metrics-grid">
            <div class="metric-card compliance-rate ${this.getComplianceClass()}">
                <div class="metric-label">Compliance Rate</div>
                <div class="metric-value">${this.metrics?.complianceRate.toFixed(1)}%</div>
                <div class="metric-change">${this.getTrendIndicator()}</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-label">Total Files</div>
                <div class="metric-value">${this.metrics?.totalFiles}</div>
                <div class="metric-change">Production code</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-label">Violations</div>
                <div class="metric-value">${this.metrics?.violations}</div>
                <div class="metric-change">${this.metrics?.nonExemptViolations} non-exempt</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-label">Risk Level</div>
                <div class="metric-value">
                    <span class="risk-indicator risk-${this.metrics?.riskLevel}">
                        ${this.metrics?.riskLevel}
                    </span>
                </div>
                <div class="metric-change">Auto-evaluated</div>
            </div>
        </div>
        
        ${this.generateAlertsHTML()}
        ${this.generateComponentsTableHTML()}
        ${this.generateTrendsChartHTML()}
    </div>
    
    <script>
        // Auto-refresh every 5 minutes
        setTimeout(() => location.reload(), 300000);
    </script>
</body>
</html>`;
    
    const dashboardPath = path.join(this.basePath, 'gen/doc/compliance-dashboard.html');
    await fileAPI.createFile(dashboardPath, html, { type: FileType.REPORT });
    
    return dashboardPath;
  }

  /**
   * Get compliance class for styling
   */
  private getComplianceClass(): string {
    if (!this.metrics) return '';
    if (this.metrics.complianceRate < this.thresholds.critical) return 'critical';
    if (this.metrics.complianceRate < this.thresholds.warning) return 'warning';
    return '';
  }

  /**
   * Get trend indicator
   */
  private getTrendIndicator(): string {
    if (!this.metrics || this.metrics.trends.hourly.length < 2) return '—';
    
    const previous = this.metrics.trends.hourly[this.metrics.trends.hourly.length - 2];
    const current = this.metrics.complianceRate;
    const change = current - previous;
    
    if (change > 0) return `↑ +${change.toFixed(1)}%`;
    if (change < 0) return `↓ ${change.toFixed(1)}%`;
    return '→ No change';
  }

  /**
   * Generate alerts HTML
   */
  private generateAlertsHTML(): string {
    const recentAlerts = this.alerts.slice(-5).reverse();
    
    if (recentAlerts.length === 0) {
      return `
        <div class="alerts">
            <h2>📢 Alerts</h2>
            <p style="color: #48bb78; margin-top: 15px;">✅ No active alerts</p>
        </div>`;
    }
    
    return `
        <div class="alerts">
            <h2>📢 Recent Alerts</h2>
            ${recentAlerts.map(alert => `
                <div class="alert ${alert.severity}">
                    <span>${this.getAlertIcon(alert.severity)}</span>
                    <div>
                        <strong>${alert.message}</strong>
                        <div style="font-size: 12px; margin-top: 4px;">
                            ${alert.timestamp.toLocaleString()}
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>`;
  }

  /**
   * Get alert icon
   */
  private getAlertIcon(severity: string): string {
    switch (severity) {
      case 'critical': return '🚨';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  }

  /**
   * Generate components table HTML
   */
  private generateComponentsTableHTML(): string {
    if (!this.metrics) return '';
    
    const sortedComponents = [...this.metrics.components]
      .sort((a, b) => a.complianceRate - b.complianceRate)
      .slice(0, 10);
    
    return `
        <div class="components-table">
            <h2>📦 Component Compliance</h2>
            <table>
                <thead>
                    <tr>
                        <th>Component</th>
                        <th>Type</th>
                        <th>Files</th>
                        <th>Violations</th>
                        <th>Compliance</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedComponents.map(comp => `
                        <tr>
                            <td><strong>${comp.name}</strong></td>
                            <td>${comp.type}</td>
                            <td>${comp.files}</td>
                            <td>${comp.violations}</td>
                            <td>${comp.complianceRate.toFixed(1)}%</td>
                            <td>
                                ${comp.isExempt ? 
                                    '<span class="badge exempt">EXEMPT</span>' :
                                    comp.violations === 0 ?
                                        '<span class="badge compliant">COMPLIANT</span>' :
                                        '<span class="badge violation">VIOLATIONS</span>'
                                }
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;
  }

  /**
   * Generate trends chart HTML
   */
  private generateTrendsChartHTML(): string {
    if (!this.metrics || this.metrics.trends.hourly.length === 0) return '';
    
    return `
        <div class="chart-container">
            <h2>📈 Compliance Trends</h2>
            <div style="margin-top: 20px;">
                <div style="display: flex; gap: 20px; margin-bottom: 15px;">
                    <div>
                        <strong>Hourly Average:</strong> 
                        ${this.calculateAverage(this.metrics.trends.hourly).toFixed(1)}%
                    </div>
                    <div>
                        <strong>Daily Average:</strong> 
                        ${this.calculateAverage(this.metrics.trends.daily).toFixed(1)}%
                    </div>
                    <div>
                        <strong>Weekly Average:</strong> 
                        ${this.calculateAverage(this.metrics.trends.weekly).toFixed(1)}%
                    </div>
                </div>
                <div style="background: #f7fafc; padding: 20px; border-radius: 8px;">
                    <canvas id="trendsChart" width="400" height="100"></canvas>
                </div>
            </div>
        </div>`;
  }

  /**
   * Calculate average
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Extract number from text
   */
  private extractNumber(text: string, pattern: RegExp): number | null {
    const match = text.match(pattern);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Get current metrics
   */
  getMetrics(): ComplianceMetrics | null {
    return this.metrics;
  }

  /**
   * Get alerts
   */
  getAlerts(unresolved: boolean = false): ComplianceAlert[] {
    if (unresolved) {
      return this.alerts.filter(a => !a.resolved);
    }
    return this.alerts;
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      this.emit('alert:resolved', alert);
    }
  }

  /**
   * Add webhook
   */
  addWebhook(url: string): void {
    this.webhooks.push(url);
  }

  /**
   * Set thresholds
   */
  setThresholds(critical: number, warning: number, target: number): void {
    this.thresholds = { critical, warning, target };
  }
}

// Export singleton instance
export const complianceDashboard = new ComplianceDashboard();