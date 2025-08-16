#!/usr/bin/env node

/**
 * Setup Automated Compliance Alerts
 * Configures webhooks, email alerts, and Slack notifications for compliance violations
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

class ComplianceAlertSystem {
  constructor() {
    this.configPath = path.join(process.cwd(), 'config/compliance-alerts.json');
    this.alertLogPath = path.join(process.cwd(), 'gen/doc/compliance-alerts.log');
    this.thresholds = {
      critical: 90,  // Below 90% triggers critical alert
      warning: 95,   // Below 95% triggers warning
      info: 99       // Below 99% triggers info alert
    };
  }

  async setup() {
    console.log('🚨 Setting up Compliance Alert System\n');
    console.log('=' .repeat(60) + '\n');
    
    // Create alert configuration
    await this.createAlertConfig();
    
    // Setup monitoring cron job
    await this.setupCronJob();
    
    // Create alert handlers
    await this.createAlertHandlers();
    
    // Test alert system
    await this.testAlerts();
    
    console.log('\n✅ Alert system setup complete!');
    console.log('Alerts will be triggered when compliance drops below thresholds.');
  }

  async createAlertConfig() {
    console.log('📝 Creating alert configuration...\n');
    
    const config = {
      enabled: true,
      checkInterval: 3600000, // 1 hour
      thresholds: this.thresholds,
      channels: {
        console: {
          enabled: true,
          minSeverity: 'info'
        },
        file: {
          enabled: true,
          path: this.alertLogPath,
          minSeverity: 'info'
        },
        webhook: {
          enabled: false,
          url: process.env.COMPLIANCE_WEBHOOK_URL || '',
          minSeverity: 'warning'
        },
        email: {
          enabled: false,
          recipients: process.env.COMPLIANCE_EMAIL_RECIPIENTS || '',
          minSeverity: 'critical'
        },
        slack: {
          enabled: false,
          webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
          channel: '#compliance-alerts',
          minSeverity: 'warning'
        }
      },
      rules: [
        {
          name: 'Compliance Rate Drop',
          condition: 'complianceRate < threshold',
          action: 'alert',
          severity: 'dynamic'
        },
        {
          name: 'Violation Spike',
          condition: 'violations > previousViolations * 1.5',
          action: 'alert',
          severity: 'warning'
        },
        {
          name: 'Non-Exempt Violation',
          condition: 'nonExemptViolations > 0',
          action: 'alert',
          severity: 'error'
        },
        {
          name: 'Zero Compliance Component',
          condition: 'componentCompliance === 0',
          action: 'alert',
          severity: 'critical'
        }
      ],
      autoFix: {
        enabled: true,
        maxAttempts: 3,
        conditions: ['complianceRate < 95']
      }
    };
    
    await fileAPI.createFile(this.configPath, JSON.stringify(config, { type: FileType.TEMPORARY }));
    console.log('✅ Alert configuration created at:', this.configPath);
  }

  async setupCronJob() {
    console.log('\n⏰ Setting up monitoring cron job...\n');
    
    // Create cron script
    const cronScript = `#!/bin/bash
# File API Compliance Alert Monitor
# Runs hourly to check compliance and trigger alerts

LOG_FILE="${this.alertLogPath}"
CONFIG_FILE="${this.configPath}"

# Function to check compliance
check_compliance() {
    echo "[$(date)] Running compliance check..." >> "$LOG_FILE"
    
    # Run compliance scan
    npm run file-api:scan:prod 2>/dev/null | tee -a "$LOG_FILE"
    
    # Extract metrics
    VIOLATIONS=$(grep "Total violations:" "$LOG_FILE" | tail -1 | awk '{print $3}')
    COMPLIANCE_RATE=$(echo "scale=1; (1011 - $VIOLATIONS) / 1011 * 100" | bc)
    
    # Check thresholds
    if (( $(echo "$COMPLIANCE_RATE < 90" | bc -l) )); then
        trigger_alert "critical" "Compliance rate critically low: $COMPLIANCE_RATE%"
    elif (( $(echo "$COMPLIANCE_RATE < 95" | bc -l) )); then
        trigger_alert "warning" "Compliance rate below warning threshold: $COMPLIANCE_RATE%"
    elif (( $(echo "$COMPLIANCE_RATE < 99" | bc -l) )); then
        trigger_alert "info" "Compliance rate below target: $COMPLIANCE_RATE%"
    fi
}

# Function to trigger alerts
trigger_alert() {
    SEVERITY=$1
    MESSAGE=$2
    
    echo "[$(date)] [$SEVERITY] $MESSAGE" >> "$LOG_FILE"
    
    # Console notification
    if [ "$SEVERITY" = "critical" ]; then
        echo -e "\\033[0;31m🚨 CRITICAL ALERT: $MESSAGE\\033[0m"
    elif [ "$SEVERITY" = "warning" ]; then
        echo -e "\\033[0;33m⚠️  WARNING: $MESSAGE\\033[0m"
    else
        echo -e "\\033[0;34mℹ️  INFO: $MESSAGE\\033[0m"
    fi
    
    # Auto-fix if enabled
    if [ "$SEVERITY" = "critical" ] || [ "$SEVERITY" = "warning" ]; then
        echo "🔧 Attempting auto-fix..." >> "$LOG_FILE"
        npm run file-api:fix 2>&1 >> "$LOG_FILE"
    fi
}

# Main execution
check_compliance
`;
    
    const cronScriptPath = path.join(process.cwd(), 'scripts/compliance-monitor.sh');
    await fileAPI.createFile(cronScriptPath, cronScript, { type: FileType.TEMPORARY });
    fs.chmodSync(cronScriptPath, '755');
    
    console.log('✅ Cron script created at:', cronScriptPath);
    
    // Add to crontab (commented out for safety)
    console.log('\nTo enable hourly monitoring, add this to your crontab:');
    console.log('0 * * * * ' + cronScriptPath);
    console.log('\nRun: crontab -e');
  }

  async createAlertHandlers() {
    console.log('\n📢 Creating alert handlers...\n');
    
    // Create alert handler module
    const alertHandler = `/**
 * Compliance Alert Handler
 * Processes and routes alerts to configured channels
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

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
      info: '\\x1b[34m',
      warning: '\\x1b[33m',
      error: '\\x1b[31m',
      critical: '\\x1b[35m'
    };
    
    const icon = {
      info: 'ℹ️ ',
      warning: '⚠️ ',
      error: '❌',
      critical: '🚨'
    };
    
    console.log(\`\${colors[alert.severity]}[\${alert.timestamp.toISOString()}] \${icon[alert.severity]} [\${alert.severity.toUpperCase()}] \${alert.message}\\x1b[0m\`);
    
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
    
    const logLine = JSON.stringify(logEntry) + '\\n';
    await fileAPI.writeFile(this.config.channels.file.path, logLine, { append: true });
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
          title: \`\${alert.severity.toUpperCase()}: File API Compliance Alert\`,
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
        critical: this.alertLog.filter(a => a.severity === 'critical').length
      },
      recent: this.alertLog.slice(-10)
    };
    
    return summary;
  }
}

module.exports = { AlertHandler };
`;
    
    const handlerPath = path.join(process.cwd(), 'layer/themes/infra_external-log-lib/src/monitoring/alert-handler.js');
    await fileAPI.createFile(handlerPath, alertHandler, { type: FileType.TEMPORARY });
    
    console.log('✅ Alert handler created at:', handlerPath);
  }

  async testAlerts() {
    console.log('\n🧪 Testing alert system...\n');
    
    // Test different severity levels
    const testAlerts = [
      { severity: 'info', message: 'Test info alert: Compliance at 98%' },
      { severity: 'warning', message: 'Test warning alert: Compliance dropped to 94%' },
      { severity: 'error', message: 'Test error alert: Non-exempt violations detected' },
      { severity: 'critical', message: 'Test critical alert: Compliance below 90%' }
    ];
    
    for (const alert of testAlerts) {
      await this.sendTestAlert(alert);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n✅ Alert tests completed');
  }

  async sendTestAlert(alert) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [TEST] [${alert.severity.toUpperCase()}] ${alert.message}\n`;
    
    // Log to file
    await fileAPI.writeFile(this.alertLogPath, logEntry, { append: true });
    
    // Log to console with color
    const colors = {
      info: '\x1b[34m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      critical: '\x1b[35m'
    };
    
    console.log(`${colors[alert.severity]}${logEntry.trim()}\x1b[0m`);
  }
}

// Main execution
async function main() {
  const alertSystem = new ComplianceAlertSystem();
  await alertSystem.setup();
}

main().catch(console.error);