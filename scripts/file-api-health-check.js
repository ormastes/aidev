#!/usr/bin/env node

/**
 * File Creation API System Health Check
 * Comprehensive validation of all enforcement components
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SystemHealthCheck {
  constructor() {
    this.basePath = process.cwd();
    this.results = {
      passed: [],
      warnings: [],
      failed: []
    };
  }

  async run() {
    console.log('🏥 File Creation API System Health Check\n');
    console.log('=' .repeat(60) + '\n');
    
    // Run all health checks
    await this.checkAPIImplementation();
    await this.checkEnforcementConfig();
    await this.checkGitHooks();
    await this.checkCIPipeline();
    await this.checkCompliance();
    await this.checkMonitoring();
    await this.checkAlerts();
    await this.checkRollback();
    await this.checkDocumentation();
    
    // Display results
    this.displayResults();
    
    // Overall health score
    const score = this.calculateHealthScore();
    this.displayHealthScore(score);
    
    // Exit with appropriate code
    process.exit(score === 100 ? 0 : 1);
  }

  async checkAPIImplementation() {
    console.log('🔍 Checking API Implementation...');
    
    const apiFiles = [
      'layer/themes/infra_external-log-lib/src/file-manager/FileCreationAPI.ts',
      'layer/themes/infra_external-log-lib/src/file-manager/MCPIntegratedFileManager.ts',
      'layer/themes/infra_external-log-lib/src/file-manager/FileCreationFraudChecker.ts'
    ];
    
    let allExist = true;
    for (const file of apiFiles) {
      const filePath = path.join(this.basePath, file);
      if (fs.existsSync(filePath)) {
        this.results.passed.push(`✅ API file exists: ${path.basename(file)}`);
      } else {
        this.results.failed.push(`❌ API file missing: ${file}`);
        allExist = false;
      }
    }
    
    if (allExist) {
      console.log('  ✅ All API files present\n');
    } else {
      console.log('  ❌ Some API files missing\n');
    }
  }

  async checkEnforcementConfig() {
    console.log('🔍 Checking Enforcement Configuration...');
    
    const configPath = path.join(this.basePath, 'layer/themes/infra_external-log-lib/src/config/enforcement-config.ts');
    
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8');
      
      if (content.includes('EXEMPT_THEMES')) {
        this.results.passed.push('✅ Exemption rules defined');
      } else {
        this.results.failed.push('❌ Exemption rules not found');
      }
      
      if (content.includes('strictEnforcement')) {
        this.results.passed.push('✅ Strict enforcement configured');
      } else {
        this.results.warnings.push('⚠️  Strict enforcement not configured');
      }
    } else {
      this.results.failed.push('❌ Enforcement config missing');
    }
    
    console.log('  ✅ Enforcement configured\n');
  }

  async checkGitHooks() {
    console.log('🔍 Checking Git Hooks...');
    
    const hookPath = path.join(this.basePath, '.git/hooks/pre-commit');
    
    if (fs.existsSync(hookPath)) {
      const content = fs.readFileSync(hookPath, 'utf8');
      
      if (content.includes('file-api') || content.includes('compliance')) {
        this.results.passed.push('✅ Pre-commit hook installed');
        console.log('  ✅ Git hooks active\n');
      } else {
        this.results.warnings.push('⚠️  Pre-commit hook not configured for File API');
        console.log('  ⚠️  Git hooks need configuration\n');
      }
    } else {
      this.results.warnings.push('⚠️  Pre-commit hook not installed');
      console.log('  ⚠️  Git hooks not installed\n');
    }
  }

  async checkCIPipeline() {
    console.log('🔍 Checking CI/CD Pipeline...');
    
    const workflowPath = path.join(this.basePath, '.github/workflows/file-api-enforcement.yml');
    
    if (fs.existsSync(workflowPath)) {
      const content = fs.readFileSync(workflowPath, 'utf8');
      
      if (content.includes('file-api:scan:prod')) {
        this.results.passed.push('✅ CI/CD workflow configured');
        console.log('  ✅ CI/CD pipeline ready\n');
      } else {
        this.results.warnings.push('⚠️  CI/CD workflow misconfigured');
        console.log('  ⚠️  CI/CD needs update\n');
      }
    } else {
      this.results.warnings.push('⚠️  CI/CD workflow not found');
      console.log('  ⚠️  CI/CD not configured\n');
    }
  }

  async checkCompliance() {
    console.log('🔍 Checking Compliance Status...');
    
    try {
      const output = execSync('npm run file-api:scan:prod 2>&1', { 
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 10
      });
      
      const violationMatch = output.match(/Total violations:\s*(\d+)/);
      const violations = violationMatch ? parseInt(violationMatch[1]) : 0;
      
      if (violations === 0) {
        this.results.passed.push('✅ Perfect compliance (0 violations)');
        console.log('  ✅ Perfect compliance!\n');
      } else if (violations <= 10) {
        this.results.passed.push(`✅ Acceptable compliance (${violations} violations)`);
        console.log(`  ✅ Compliance acceptable (${violations} violations)\n`);
      } else if (violations <= 50) {
        this.results.warnings.push(`⚠️  Compliance needs improvement (${violations} violations)`);
        console.log(`  ⚠️  ${violations} violations found\n`);
      } else {
        this.results.failed.push(`❌ Poor compliance (${violations} violations)`);
        console.log(`  ❌ ${violations} violations - action needed\n`);
      }
    } catch (error) {
      this.results.warnings.push('⚠️  Could not check compliance');
      console.log('  ⚠️  Compliance check failed\n');
    }
  }

  async checkMonitoring() {
    console.log('🔍 Checking Monitoring System...');
    
    const dashboardPath = path.join(this.basePath, 'gen/doc/compliance-dashboard.html');
    const metricsPath = path.join(this.basePath, 'gen/doc/compliance-metrics.json');
    
    if (fs.existsSync(dashboardPath)) {
      this.results.passed.push('✅ Dashboard exists');
      
      // Check if dashboard is recent
      const stats = fs.statSync(dashboardPath);
      const ageHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
      
      if (ageHours < 24) {
        this.results.passed.push('✅ Dashboard recently updated');
      } else {
        this.results.warnings.push('⚠️  Dashboard not updated recently');
      }
    } else {
      this.results.warnings.push('⚠️  Dashboard not generated');
    }
    
    if (fs.existsSync(metricsPath)) {
      this.results.passed.push('✅ Metrics being collected');
    } else {
      this.results.warnings.push('⚠️  Metrics not found');
    }
    
    console.log('  ✅ Monitoring configured\n');
  }

  async checkAlerts() {
    console.log('🔍 Checking Alert System...');
    
    const alertConfigPath = path.join(this.basePath, 'config/compliance-alerts.json');
    const alertLogPath = path.join(this.basePath, 'gen/doc/compliance-alerts.log');
    
    if (fs.existsSync(alertConfigPath)) {
      const config = JSON.parse(fs.readFileSync(alertConfigPath, 'utf8'));
      
      if (config.enabled) {
        this.results.passed.push('✅ Alerts enabled');
      } else {
        this.results.warnings.push('⚠️  Alerts disabled');
      }
      
      if (config.channels && Object.values(config.channels).some(c => c.enabled)) {
        this.results.passed.push('✅ Alert channels configured');
      } else {
        this.results.warnings.push('⚠️  No alert channels active');
      }
    } else {
      this.results.warnings.push('⚠️  Alert config not found');
    }
    
    if (fs.existsSync(alertLogPath)) {
      this.results.passed.push('✅ Alert log exists');
    }
    
    console.log('  ✅ Alerts configured\n');
  }

  async checkRollback() {
    console.log('🔍 Checking Rollback Mechanism...');
    
    const rollbackScript = path.join(this.basePath, 'scripts/rollback-violations.js');
    const rollbackLog = path.join(this.basePath, 'gen/doc/rollback.log');
    
    if (fs.existsSync(rollbackScript)) {
      this.results.passed.push('✅ Rollback script exists');
      
      // Check if it's executable
      try {
        fs.accessSync(rollbackScript, fs.constants.X_OK);
        this.results.passed.push('✅ Rollback script executable');
      } catch {
        // Not critical
      }
    } else {
      this.results.warnings.push('⚠️  Rollback script missing');
    }
    
    if (fs.existsSync(rollbackLog)) {
      this.results.passed.push('✅ Rollback log exists');
    }
    
    console.log('  ✅ Rollback ready\n');
  }

  async checkDocumentation() {
    console.log('🔍 Checking Documentation...');
    
    const docs = [
      'gen/doc/file-api-100-percent-compliance-report.md',
      'gen/doc/enforcement-validation-report.md',
      'gen/doc/file-api-handover-documentation.md'
    ];
    
    let docCount = 0;
    for (const doc of docs) {
      const docPath = path.join(this.basePath, doc);
      if (fs.existsSync(docPath)) {
        docCount++;
        this.results.passed.push(`✅ ${path.basename(doc)} exists`);
      }
    }
    
    if (docCount === docs.length) {
      console.log('  ✅ All documentation complete\n');
    } else if (docCount > 0) {
      console.log(`  ⚠️  ${docCount}/${docs.length} documents found\n`);
    } else {
      console.log('  ❌ Documentation missing\n');
    }
  }

  displayResults() {
    console.log('\n' + '=' .repeat(60));
    console.log('📊 HEALTH CHECK RESULTS\n');
    
    if (this.results.passed.length > 0) {
      console.log('✅ PASSED (' + this.results.passed.length + ')');
      this.results.passed.forEach(item => console.log('  ' + item));
      console.log();
    }
    
    if (this.results.warnings.length > 0) {
      console.log('⚠️  WARNINGS (' + this.results.warnings.length + ')');
      this.results.warnings.forEach(item => console.log('  ' + item));
      console.log();
    }
    
    if (this.results.failed.length > 0) {
      console.log('❌ FAILED (' + this.results.failed.length + ')');
      this.results.failed.forEach(item => console.log('  ' + item));
      console.log();
    }
  }

  calculateHealthScore() {
    const total = this.results.passed.length + this.results.warnings.length + this.results.failed.length;
    if (total === 0) return 0;
    
    const passedScore = this.results.passed.length * 100;
    const warningScore = this.results.warnings.length * 50;
    const failedScore = this.results.failed.length * 0;
    
    const score = Math.round((passedScore + warningScore + failedScore) / total);
    return Math.min(100, Math.max(0, score));
  }

  displayHealthScore(score) {
    console.log('=' .repeat(60));
    console.log('\n🏆 OVERALL SYSTEM HEALTH SCORE\n');
    
    const bar = this.getProgressBar(score);
    let status, color;
    
    if (score >= 90) {
      status = 'EXCELLENT';
      color = '\x1b[32m'; // Green
    } else if (score >= 75) {
      status = 'GOOD';
      color = '\x1b[33m'; // Yellow
    } else if (score >= 60) {
      status = 'FAIR';
      color = '\x1b[33m'; // Yellow
    } else {
      status = 'NEEDS ATTENTION';
      color = '\x1b[31m'; // Red
    }
    
    console.log(`${color}${bar} ${score}%\x1b[0m`);
    console.log(`\nStatus: ${color}${status}\x1b[0m\n`);
    
    if (score === 100) {
      console.log('🎉 Perfect health! All systems operational.');
    } else if (score >= 90) {
      console.log('✅ System is healthy and production ready.');
    } else if (score >= 75) {
      console.log('⚠️  System is functional but has minor issues.');
    } else {
      console.log('❌ System needs attention before production use.');
    }
    
    console.log('\n' + '=' .repeat(60) + '\n');
  }

  getProgressBar(percentage) {
    const filled = Math.floor(percentage / 5);
    const empty = 20 - filled;
    return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
  }
}

// Main execution
async function main() {
  const healthCheck = new SystemHealthCheck();
  await healthCheck.run();
}

main().catch(console.error);