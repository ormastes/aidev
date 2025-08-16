/**
 * AlertManager - Alert rules configuration, notifications, and escalation
 */

import { EventEmitter } from 'node:events';
import { path } from '../../layer/themes/infra_external-log-lib/src';
import { fs } from '../../layer/themes/infra_external-log-lib/src';
import { promisify } from 'node:util';
import winston from 'winston';
import * as cron from 'node-cron';

const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);

export type AlertSeverity = 'info' | 'warning' | "critical";
export type AlertStatus = 'active' | "acknowledged" | "resolved" | "suppressed";

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  severity: AlertSeverity;
  enabled: boolean;
  conditions: AlertCondition[];
  actions: AlertAction[];
  cooldownMinutes: number;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface AlertCondition {
  type: 'metric_threshold' | 'log_pattern' | 'health_status' | 'rate_change' | 'custom';
  config: {
    metric?: string;
    service?: string;
    operator?: '>' | '<' | '=' | '!=' | '>=' | '<=';
    threshold?: number;
    duration?: number;
    pattern?: string;
    customCheck?: () => Promise<boolean>;
  };
}

export interface AlertAction {
  type: 'email' | 'webhook' | 'slack' | "pagerduty" | 'sms' | 'custom';
  config: {
    recipients?: string[];
    url?: string;
    channel?: string;
    message?: string;
    customAction?: (alert: Alert) => Promise<void>;
  };
  retryAttempts: number;
  retryDelayMinutes: number;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description: string;
  source: {
    service?: string;
    metric?: string;
    logEntry?: any;
    healthCheck?: any;
  };
  triggeredAt: number;
  acknowledgedAt?: number;
  acknowledgedBy?: string;
  resolvedAt?: number;
  resolvedBy?: string;
  suppressedUntil?: number;
  notificationsSent: NotificationRecord[];
  tags: string[];
  metadata: Record<string, any>;
}

export interface NotificationRecord {
  id: string;
  type: string;
  sentAt: number;
  recipient: string;
  success: boolean;
  error?: string;
  retryCount: number;
}

export interface EscalationPolicy {
  id: string;
  name: string;
  levels: EscalationLevel[];
  enabled: boolean;
}

export interface EscalationLevel {
  delayMinutes: number;
  actions: AlertAction[];
  condition?: 'not_acknowledged' | 'not_resolved' | 'severity_critical';
}

export interface AlertStatistics {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  suppressed: number;
  bySeverity: Record<AlertSeverity, number>;
  byService: Record<string, number>;
  averageResolutionTime: number;
  falsePositiveRate: number;
}

export class AlertManager extends EventEmitter {
  private logger: winston.Logger;
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];
  private escalationPolicies: Map<string, EscalationPolicy> = new Map();
  
  private isRunning = false;
  private evaluationInterval = 30000; // 30 seconds
  private evaluationTimer: NodeJS.Timeout | null = null;
  private lastEvaluations: Map<string, number> = new Map();
  
  private alertsDirectory = './alerts';
  private maxHistorySize = 10000;

  constructor() {
    super();
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({ format: winston.format.simple() }),
        new winston.transports.File({ filename: 'alert-manager.log' })
      ]
    });

    this.ensureAlertsDirectory();
    this.initializeDefaultRules();
    this.initializeDefaultEscalationPolicies();
  }

  /**
   * Start alert manager
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Alert manager is already running');
      return;
    }

    this.isRunning = true;
    this.logger.info('Starting alert manager');

    // Load persisted alerts and rules
    await this.loadPersistedData();

    // Start alert rule evaluation
    this.startAlertEvaluation();

    // Schedule maintenance tasks
    cron.schedule('0 * * * *', () => {
      this.performMaintenance();
    });

    this.emit('started');
  }

  /**
   * Stop alert manager
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.evaluationTimer) {
      clearInterval(this.evaluationTimer);
      this.evaluationTimer = null;
    }

    // Save current state
    await this.persistData();

    this.logger.info('Alert manager stopped');
    this.emit('stopped');
  }

  /**
   * Create alerts directory
   */
  private ensureAlertsDirectory(): void {
    if (!fs.existsSync(this.alertsDirectory)) {
      await fileAPI.createDirectory(this.alertsDirectory);
    }
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high-cpu-usage',
        name: 'High CPU Usage',
        description: 'CPU usage is consistently high',
        severity: 'warning',
        enabled: true,
        conditions: [{
          type: 'metric_threshold',
          config: {
            metric: 'system.cpu.usage',
            operator: '>',
            threshold: 80,
            duration: 300000 // 5 minutes
          }
        }],
        actions: [{
          type: 'email',
          config: {
            recipients: ['admin@example.com'],
            message: 'CPU usage is above 80% for more than 5 minutes'
          },
          retryAttempts: 3,
          retryDelayMinutes: 5
        }],
        cooldownMinutes: 15,
        tags: ['system', "performance"],
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'high-memory-usage',
        name: 'High Memory Usage',
        description: 'Memory usage is critically high',
        severity: "critical",
        enabled: true,
        conditions: [{
          type: 'metric_threshold',
          config: {
            metric: 'system.memory.usage',
            operator: '>',
            threshold: 90,
            duration: 60000 // 1 minute
          }
        }],
        actions: [{
          type: 'webhook',
          config: {
            url: 'http://localhost:3000/webhooks/alerts',
            message: 'Critical: Memory usage exceeded 90%'
          },
          retryAttempts: 5,
          retryDelayMinutes: 2
        }],
        cooldownMinutes: 10,
        tags: ['system', "critical"],
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'service-down',
        name: 'Service Down',
        description: 'A monitored service is not responding',
        severity: "critical",
        enabled: true,
        conditions: [{
          type: 'health_status',
          config: {
            service: 'any',
            threshold: 0 // 0 = down/critical
          }
        }],
        actions: [
          {
            type: 'email',
            config: {
              recipients: ['oncall@example.com'],
              message: 'Service health check failed'
            },
            retryAttempts: 3,
            retryDelayMinutes: 1
          },
          {
            type: 'slack',
            config: {
              channel: '#alerts',
              message: '🚨 Service is down!'
            },
            retryAttempts: 2,
            retryDelayMinutes: 1
          }
        ],
        cooldownMinutes: 5,
        tags: ['service', "critical"],
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'error-rate-spike',
        name: 'Error Rate Spike',
        description: 'Error rate has increased significantly',
        severity: 'warning',
        enabled: true,
        conditions: [{
          type: 'rate_change',
          config: {
            metric: 'application.errors.rate',
            operator: '>',
            threshold: 200, // 200% increase
            duration: 300000 // 5 minutes
          }
        }],
        actions: [{
          type: 'webhook',
          config: {
            url: 'http://localhost:3000/webhooks/error-alerts',
            message: 'Error rate has spiked significantly'
          },
          retryAttempts: 3,
          retryDelayMinutes: 2
        }],
        cooldownMinutes: 20,
        tags: ["application", 'errors'],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];

    for (const rule of defaultRules) {
      this.alertRules.set(rule.id, rule);
    }
  }

  /**
   * Initialize default escalation policies
   */
  private initializeDefaultEscalationPolicies(): void {
    const defaultPolicies: EscalationPolicy[] = [
      {
        id: 'standard-escalation',
        name: 'Standard Escalation',
        enabled: true,
        levels: [
          {
            delayMinutes: 0, // Immediate
            actions: [{
              type: 'email',
              config: { recipients: ['oncall@example.com'] },
              retryAttempts: 2,
              retryDelayMinutes: 1
            }]
          },
          {
            delayMinutes: 15,
            condition: 'not_acknowledged',
            actions: [{
              type: 'sms',
              config: { recipients: ['+1234567890'] },
              retryAttempts: 3,
              retryDelayMinutes: 2
            }]
          },
          {
            delayMinutes: 30,
            condition: 'not_acknowledged',
            actions: [{
              type: 'email',
              config: { recipients: ['manager@example.com'] },
              retryAttempts: 2,
              retryDelayMinutes: 1
            }]
          }
        ]
      }
    ];

    for (const policy of defaultPolicies) {
      this.escalationPolicies.set(policy.id, policy);
    }
  }

  /**
   * Start alert rule evaluation
   */
  private startAlertEvaluation(): void {
    this.evaluationTimer = setInterval(() => {
      this.evaluateAllRules();
    }, this.evaluationInterval);

    // Initial evaluation
    this.evaluateAllRules();
  }

  /**
   * Evaluate all alert rules
   */
  private async evaluateAllRules(): Promise<void> {
    for (const [ruleId, rule] of this.alertRules) {
      if (rule.enabled) {
        await this.evaluateRule(rule);
      }
    }
  }

  /**
   * Evaluate a single alert rule
   */
  private async evaluateRule(rule: AlertRule): Promise<void> {
    try {
      const now = Date.now();
      const lastEvaluation = this.lastEvaluations.get(rule.id) || 0;
      
      // Check cooldown period
      const cooldownMs = rule.cooldownMinutes * 60 * 1000;
      if (now - lastEvaluation < cooldownMs) {
        return;
      }

      // Evaluate all conditions
      let conditionsMet = true;
      let triggerContext: any = {};

      for (const condition of rule.conditions) {
        const result = await this.evaluateCondition(condition);
        if (!result.met) {
          conditionsMet = false;
          break;
        }
        triggerContext = { ...triggerContext, ...result.context };
      }

      if (conditionsMet) {
        await this.triggerAlert(rule, triggerContext);
        this.lastEvaluations.set(rule.id, now);
      }

    } catch (error) {
      this.logger.error(`Error evaluating rule ${rule.name}:`, error);
    }
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(condition: AlertCondition): Promise<{ met: boolean; context: any }> {
    const config = condition.config;

    switch (condition.type) {
      case 'metric_threshold':
        return await this.evaluateMetricThreshold(config);
      case 'log_pattern':
        return await this.evaluateLogPattern(config);
      case 'health_status':
        return await this.evaluateHealthStatus(config);
      case 'rate_change':
        return await this.evaluateRateChange(config);
      case 'custom':
        return await this.evaluateCustomCondition(config);
      default:
        return { met: false, context: {} };
    }
  }

  /**
   * Evaluate metric threshold condition
   */
  private async evaluateMetricThreshold(config: any): Promise<{ met: boolean; context: any }> {
    // This would integrate with MetricsCollector
    // For now, simulate with random data
    const currentValue = Math.random() * 100;
    const threshold = config.threshold || 0;
    const operator = config.operator || '>';

    let met = false;
    switch (operator) {
      case '>': met = currentValue > threshold; break;
      case '<': met = currentValue < threshold; break;
      case '>=': met = currentValue >= threshold; break;
      case '<=': met = currentValue <= threshold; break;
      case '=': met = currentValue === threshold; break;
      case '!=': met = currentValue !== threshold; break;
    }

    return {
      met,
      context: {
        metric: config.metric,
        currentValue,
        threshold,
        operator
      }
    };
  }

  /**
   * Evaluate log pattern condition
   */
  private async evaluateLogPattern(config: any): Promise<{ met: boolean; context: any }> {
    // This would integrate with LogAggregator
    const recentLogs = []; // Would get from LogAggregator
    const pattern = new RegExp(config.pattern || '', 'i');
    
    const matches = recentLogs.filter((log: any) => pattern.test(log.message));
    
    return {
      met: matches.length > 0,
      context: {
        pattern: config.pattern,
        matchCount: matches.length,
        recentMatches: matches.slice(0, 5)
      }
    };
  }

  /**
   * Evaluate health status condition
   */
  private async evaluateHealthStatus(config: any): Promise<{ met: boolean; context: any }> {
    // This would integrate with HealthChecker
    // For now, simulate service health
    const services = ['api-gateway', 'auth-service', 'user-service'];
    const unhealthyServices = services.filter(() => Math.random() < 0.1); // 10% chance of being unhealthy
    
    return {
      met: unhealthyServices.length > 0,
      context: {
        service: config.service,
        unhealthyServices,
        totalServices: services.length
      }
    };
  }

  /**
   * Evaluate rate change condition
   */
  private async evaluateRateChange(config: any): Promise<{ met: boolean; context: any }> {
    // This would compare current rate with historical data
    const currentRate = Math.random() * 100;
    const historicalRate = Math.random() * 50;
    const changePercent = ((currentRate - historicalRate) / historicalRate) * 100;
    
    return {
      met: changePercent > (config.threshold || 0),
      context: {
        metric: config.metric,
        currentRate,
        historicalRate,
        changePercent
      }
    };
  }

  /**
   * Evaluate custom condition
   */
  private async evaluateCustomCondition(config: any): Promise<{ met: boolean; context: any }> {
    if (!config.customCheck) {
      return { met: false, context: { error: 'No custom check function provided' } };
    }

    try {
      const result = await config.customCheck();
      return {
        met: result,
        context: { customCheck: true }
      };
    } catch (error) {
      return {
        met: false,
        context: { error: error.message }
      };
    }
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(rule: AlertRule, context: any): Promise<void> {
    // Check if there's already an active alert for this rule
    const existingAlert = Array.from(this.activeAlerts.values())
      .find(alert => alert.ruleId === rule.id && alert.status === 'active');

    if (existingAlert) {
      this.logger.debug(`Alert already active for rule: ${rule.name}`);
      return;
    }

    const alert: Alert = {
      id: this.generateAlertId(),
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      status: 'active',
      title: rule.name,
      description: rule.description,
      source: {
        service: context.service,
        metric: context.metric
      },
      triggeredAt: Date.now(),
      notificationsSent: [],
      tags: rule.tags,
      metadata: context
    };

    this.activeAlerts.set(alert.id, alert);
    this.addToHistory(alert);

    this.logger.info(`Alert triggered: ${alert.title} (${alert.severity})`);
    this.emit("alertTriggered", alert);

    // Execute alert actions
    for (const action of rule.actions) {
      await this.executeAlertAction(alert, action);
    }
  }

  /**
   * Execute an alert action
   */
  private async executeAlertAction(alert: Alert, action: AlertAction): Promise<void> {
    const notificationId = this.generateNotificationId();
    
    try {
      switch (action.type) {
        case 'email':
          await this.sendEmailNotification(alert, action, notificationId);
          break;
        case 'webhook':
          await this.sendWebhookNotification(alert, action, notificationId);
          break;
        case 'slack':
          await this.sendSlackNotification(alert, action, notificationId);
          break;
        case 'sms':
          await this.sendSMSNotification(alert, action, notificationId);
          break;
        case 'custom':
          await this.executeCustomAction(alert, action, notificationId);
          break;
        default:
          this.logger.warn(`Unknown action type: ${action.type}`);
      }
    } catch (error) {
      this.logger.error(`Failed to execute action ${action.type} for alert ${alert.id}:`, error);
      
      // Record failed notification
      const notification: NotificationRecord = {
        id: notificationId,
        type: action.type,
        sentAt: Date.now(),
        recipient: 'unknown',
        success: false,
        error: error.message,
        retryCount: 0
      };
      
      alert.notificationsSent.push(notification);
      
      // Schedule retry if configured
      if (action.retryAttempts > 0) {
        async setTimeout(() => {
          this.retryAlertAction(alert, action, notification);
        }, action.retryDelayMinutes * 60 * 1000);
      }
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(alert: Alert, action: AlertAction, notificationId: string): Promise<void> {
    // This would integrate with an email service
    this.logger.info(`Sending email notification for alert: ${alert.title}`);
    
    const notification: NotificationRecord = {
      id: notificationId,
      type: 'email',
      sentAt: Date.now(),
      recipient: action.config.recipients?.join(', ') || 'unknown',
      success: true,
      retryCount: 0
    };
    
    alert.notificationsSent.push(notification);
    this.emit("notificationSent", { alert, notification });
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(alert: Alert, action: AlertAction, notificationId: string): Promise<void> {
    const url = action.config.url;
    if (!url) {
      throw new Error('Webhook URL is required');
    }

    this.logger.info(`Sending webhook notification to: ${url}`);

    // This would make HTTP request to webhook URL
    // For now, just simulate success
    const notification: NotificationRecord = {
      id: notificationId,
      type: 'webhook',
      sentAt: Date.now(),
      recipient: url,
      success: true,
      retryCount: 0
    };
    
    alert.notificationsSent.push(notification);
    this.emit("notificationSent", { alert, notification });
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(alert: Alert, action: AlertAction, notificationId: string): Promise<void> {
    this.logger.info(`Sending Slack notification for alert: ${alert.title}`);
    
    // This would integrate with Slack API
    const notification: NotificationRecord = {
      id: notificationId,
      type: 'slack',
      sentAt: Date.now(),
      recipient: action.config.channel || 'unknown',
      success: true,
      retryCount: 0
    };
    
    alert.notificationsSent.push(notification);
    this.emit("notificationSent", { alert, notification });
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(alert: Alert, action: AlertAction, notificationId: string): Promise<void> {
    this.logger.info(`Sending SMS notification for alert: ${alert.title}`);
    
    // This would integrate with SMS service
    const notification: NotificationRecord = {
      id: notificationId,
      type: 'sms',
      sentAt: Date.now(),
      recipient: action.config.recipients?.join(', ') || 'unknown',
      success: true,
      retryCount: 0
    };
    
    alert.notificationsSent.push(notification);
    this.emit("notificationSent", { alert, notification });
  }

  /**
   * Execute custom action
   */
  private async executeCustomAction(alert: Alert, action: AlertAction, notificationId: string): Promise<void> {
    if (!action.config.customAction) {
      throw new Error('Custom action function is required');
    }

    await action.config.customAction(alert);
    
    const notification: NotificationRecord = {
      id: notificationId,
      type: 'custom',
      sentAt: Date.now(),
      recipient: 'custom',
      success: true,
      retryCount: 0
    };
    
    alert.notificationsSent.push(notification);
    this.emit("notificationSent", { alert, notification });
  }

  /**
   * Retry failed alert action
   */
  private async retryAlertAction(alert: Alert, action: AlertAction, notification: NotificationRecord): Promise<void> {
    if (notification.retryCount >= action.retryAttempts) {
      this.logger.error(`Maximum retry attempts reached for notification ${notification.id}`);
      return;
    }

    notification.retryCount++;
    this.logger.info(`Retrying alert action (attempt ${notification.retryCount}/${action.retryAttempts})`);
    
    try {
      await this.executeAlertAction(alert, action);
    } catch (error) {
      this.logger.error(`Retry failed for notification ${notification.id}:`, error);
      
      if (notification.retryCount < action.retryAttempts) {
        async setTimeout(() => {
          this.retryAlertAction(alert, action, notification);
        }, action.retryDelayMinutes * 60 * 1000);
      }
    }
  }

  /**
   * Acknowledge an alert
   */
  public async acknowledgeAlert(alertId: string, acknowledgedBy?: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert || alert.status !== 'active') {
      return false;
    }

    alert.status = "acknowledged";
    alert.acknowledgedAt = Date.now();
    alert.acknowledgedBy = acknowledgedBy || 'unknown';

    this.logger.info(`Alert acknowledged: ${alert.title} by ${acknowledgedBy}`);
    this.emit("alertAcknowledged", alert);

    return true;
  }

  /**
   * Resolve an alert
   */
  public async resolveAlert(alertId: string, resolvedBy?: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.status = "resolved";
    alert.resolvedAt = Date.now();
    alert.resolvedBy = resolvedBy || 'system';

    this.activeAlerts.delete(alertId);
    this.addToHistory(alert);

    this.logger.info(`Alert resolved: ${alert.title} by ${resolvedBy}`);
    this.emit("alertResolved", alert);

    return true;
  }

  /**
   * Suppress an alert
   */
  public async suppressAlert(alertId: string, durationMinutes: number): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.status = "suppressed";
    alert.suppressedUntil = Date.now() + (durationMinutes * 60 * 1000);

    this.logger.info(`Alert suppressed: ${alert.title} for ${durationMinutes} minutes`);
    this.emit("alertSuppressed", alert);

    return true;
  }

  /**
   * Get active alerts
   */
  public async getActiveAlerts(): Promise<Alert[]> {
    return Array.from(this.activeAlerts.values())
      .sort((a, b) => b.triggeredAt - a.triggeredAt);
  }

  /**
   * Get alert by ID
   */
  public async getAlert(alertId: string): Promise<Alert | null> {
    const active = this.activeAlerts.get(alertId);
    if (active) {
      return active;
    }

    // Search in history
    return this.alertHistory.find(alert => alert.id === alertId) || null;
  }

  /**
   * Get alert statistics
   */
  public getAlertStatistics(): AlertStatistics {
    const allAlerts = [
      ...Array.from(this.activeAlerts.values()),
      ...this.alertHistory
    ];

    const stats: AlertStatistics = {
      total: allAlerts.length,
      active: Array.from(this.activeAlerts.values()).filter(a => a.status === 'active').length,
      acknowledged: Array.from(this.activeAlerts.values()).filter(a => a.status === "acknowledged").length,
      resolved: this.alertHistory.filter(a => a.status === "resolved").length,
      suppressed: Array.from(this.activeAlerts.values()).filter(a => a.status === "suppressed").length,
      bySeverity: { info: 0, warning: 0, critical: 0 },
      byService: {},
      averageResolutionTime: 0,
      falsePositiveRate: 0
    };

    let totalResolutionTime = 0;
    let resolvedCount = 0;

    for (const alert of allAlerts) {
      // Count by severity
      stats.bySeverity[alert.severity]++;

      // Count by service
      const service = alert.source.service || 'unknown';
      stats.byService[service] = (stats.byService[service] || 0) + 1;

      // Calculate resolution time
      if (alert.resolvedAt && alert.triggeredAt) {
        totalResolutionTime += alert.resolvedAt - alert.triggeredAt;
        resolvedCount++;
      }
    }

    if (resolvedCount > 0) {
      stats.averageResolutionTime = totalResolutionTime / resolvedCount;
    }

    return stats;
  }

  /**
   * Add alert rule
   */
  public addAlertRule(rule: AlertRule): void {
    rule.updatedAt = Date.now();
    this.alertRules.set(rule.id, rule);
    this.logger.info(`Added alert rule: ${rule.name}`);
  }

  /**
   * Update alert rule
   */
  public updateAlertRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.alertRules.get(ruleId);
    if (!rule) {
      return false;
    }

    const updatedRule = { ...rule, ...updates, updatedAt: Date.now() };
    this.alertRules.set(ruleId, updatedRule);
    
    this.logger.info(`Updated alert rule: ${rule.name}`);
    return true;
  }

  /**
   * Delete alert rule
   */
  public deleteAlertRule(ruleId: string): boolean {
    const rule = this.alertRules.get(ruleId);
    if (!rule) {
      return false;
    }

    this.alertRules.delete(ruleId);
    this.logger.info(`Deleted alert rule: ${rule.name}`);
    return true;
  }

  /**
   * Get all alert rules
   */
  public getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique notification ID
   */
  private generateNotificationId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add alert to history
   */
  private addToHistory(alert: Alert): void {
    this.alertHistory.push({ ...alert });
    
    // Trim history if it exceeds maximum size
    if (this.alertHistory.length > this.maxHistorySize) {
      this.alertHistory = this.alertHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Load persisted data
   */
  private async loadPersistedData(): Promise<void> {
    try {
      // Load alert rules
      const rulesPath = path.join(this.alertsDirectory, 'rules.json');
      if (fs.existsSync(rulesPath)) {
        const rulesData = await readFileAsync(rulesPath, 'utf8');
        const rules = JSON.parse(rulesData);
        for (const rule of rules) {
          this.alertRules.set(rule.id, rule);
        }
      }

      // Load active alerts
      const alertsPath = path.join(this.alertsDirectory, 'active-alerts.json');
      if (fs.existsSync(alertsPath)) {
        const alertsData = await readFileAsync(alertsPath, 'utf8');
        const alerts = JSON.parse(alertsData);
        for (const alert of alerts) {
          this.activeAlerts.set(alert.id, alert);
        }
      }
    } catch (error) {
      this.logger.error('Error loading persisted data:', error);
    }
  }

  /**
   * Persist data
   */
  private async persistData(): Promise<void> {
    try {
      // Save alert rules
      const rulesPath = path.join(this.alertsDirectory, 'rules.json');
      const rules = Array.from(this.alertRules.values());
      await writeFileAsync(rulesPath, JSON.stringify(rules, null, 2));

      // Save active alerts
      const alertsPath = path.join(this.alertsDirectory, 'active-alerts.json');
      const alerts = Array.from(this.activeAlerts.values());
      await writeFileAsync(alertsPath, JSON.stringify(alerts, null, 2));
    } catch (error) {
      this.logger.error('Error persisting data:', error);
    }
  }

  /**
   * Perform maintenance tasks
   */
  private performMaintenance(): void {
    const now = Date.now();
    
    // Check for suppressed alerts that should be reactivated
    for (const [id, alert] of this.activeAlerts) {
      if (alert.status === "suppressed" && alert.suppressedUntil && alert.suppressedUntil <= now) {
        alert.status = 'active';
        delete alert.suppressedUntil;
        this.emit("alertReactivated", alert);
      }
    }

    // Persist data
    this.persistData().catch(error => 
      this.logger.error('Error during maintenance persistence:', error)
    );

    this.logger.info('Alert manager maintenance completed');
  }
}