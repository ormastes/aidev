/**
 * Compliance Alert Handler
 * Processes and routes alerts to configured channels
 */

import fs from '../../layer/themes/infra_external-log-lib/src';
import path from 'node:path';
import https from 'node:https';
import { getFileAPI, FileType } from '../file-manager/FileCreationAPI';
const fileAPI = getFileAPI();


class AlertHandler {
  constructor(config) {
    this.config = config;
    this.alertLog = [];
  }

  async sendAlert(alert) {
    const { severity, message, details, timestamp } = alert;
    
    // Log to console
    if (this.config.channels.console.enabled && 
        this.getSeverityLevel(severity) >= this.getSeverityLevel(this.config.channels.console.minSeverity)) {
      this.logToConsole(alert);
    }
    
    // Log to file
    if (this.config.channels.file.enabled &&
        this.getSeverityLevel(severity) >= this.getSeverityLevel(this.config.channels.file.minSeverity)) {
      this.logToFile(alert);
    }
    
    // Send webhook
    if (this.config.channels.webhook.enabled && this.config.channels.webhook.url &&
        this.getSeverityLevel(severity) >= this.getSeverityLevel(this.config.channels.webhook.minSeverity)) {
      await this.sendWebhook(alert);
    }
    
    // Send Slack notification
    if (this.config.channels.slack.enabled && this.config.channels.slack.webhookUrl &&
        this.getSeverityLevel(severity) >= this.getSeverityLevel(this.config.channels.slack.minSeverity)) {
      await this.sendSlackNotification(alert);
    }
    
    // Track alert
    this.alertLog.push(alert);
  }

  getSeverityLevel(severity) {
    const levels = { info: 1, warning: 2, error: 3, critical: 4 };
    return levels[severity] || 0;
  }

  logToConsole(alert) {
    const colors = {
      info: '\x1b[34m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      critical: '\x1b[35m'
    };
    
    const icon = {
      info: 'ℹ️ ',
      warning: '⚠️ ',
      error: '❌',
      critical: '🚨'
    };
    
    console.log(`${colors[alert.severity]}[${alert.timestamp.toISOString()}] ${icon[alert.severity]} [${alert.severity.toUpperCase()}] ${alert.message}\x1b[0m`);
    
    if (alert.details) {
      console.log('Details:', alert.details);
    }
  }

  logToFile(alert) {
    const logEntry = {
      timestamp: alert.timestamp.toISOString(),
      severity: alert.severity,
      message: alert.message,
      details: alert.details
    };
    
    const logLine = JSON.stringify(logEntry) + '\n';
    fileAPI.appendToFile(this.config.channels.file.path, logLine, { type: FileType.LOG });
  }

  async sendWebhook(alert) {
    try {
      const payload = JSON.stringify({
        severity: alert.severity,
        message: alert.message,
        details: alert.details,
        timestamp: alert.timestamp.toISOString(),
        source: 'File API Compliance Monitor'
      });
      
      // Would send HTTP request to webhook URL
      console.log('📤 Webhook notification would be sent to:', this.config.channels.webhook.url);
    } catch (error) {
      console.error('Failed to send webhook:', error);
    }
  }

  async sendSlackNotification(alert) {
    try {
      const color = {
        info: '#36a64f',
        warning: '#ff9900',
        error: '#ff0000',
        critical: '#9c27b0'
      };
      
      const payload = {
        channel: this.config.channels.slack.channel,
        username: 'Compliance Bot',
        icon_emoji: ':shield:',
        attachments: [{
          color: color[alert.severity],
          title: `${alert.severity.toUpperCase()}: File API Compliance Alert`,
          text: alert.message,
          fields: alert.details ? Object.entries(alert.details).map(([key, value]) => ({
            title: key,
            value: String(value),
            short: true
          })) : [],
          footer: 'File API Compliance Monitor',
          ts: Math.floor(alert.timestamp.getTime() / 1000)
        }]
      };
      
      // Would send to Slack webhook
      console.log('💬 Slack notification would be sent to:', this.config.channels.slack.channel);
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
    }
  }

  getAlertSummary() {
    const summary = {
      total: this.alertLog.length,
      bySeverity: {
        info: this.alertLog.filter(a => a.severity === 'info').length,
        warning: this.alertLog.filter(a => a.severity === 'warning').length,
        error: this.alertLog.filter(a => a.severity === 'error').length,
        critical: this.alertLog.filter(a => a.severity === "critical").length
      },
      recent: this.alertLog.slice(-10)
    };
    
    return summary;
  }
}

export { AlertHandler };
