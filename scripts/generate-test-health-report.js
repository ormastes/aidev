#!/usr/bin/env node

/**
 * Test Health Report Generator
 * 
 * Generates comprehensive reports on test suite health, coverage, and failure detection capabilities
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestHealthReporter {
  constructor() {
    this.report = {
      timestamp: new Date().toISOString(),
      summary: {},
      details: {
        testFiles: [],
        coverage: {},
        failureDetection: {},
        issues: [],
        recommendations: []
      }
    };
  }

  /**
   * Scan for all test files
   */
  scanTestFiles() {
    console.log('📂 Scanning for test files...');
    
    const patterns = [
      '**/*.test.ts',
      '**/*.test.js',
      '**/*.spec.ts', 
      '**/*.spec.js',
      '**/*.itest.ts',
      '**/*.stest.ts',
      '**/*.etest.ts',
      '**/*.envtest.ts'
    ];

    const testFiles = new Set();
    
    for (const pattern of patterns) {
      try {
        const files = execSync(
          `find . -type f -name "${pattern.replace('**/', '')}" -not -path "*/node_modules/*" -not -path "*/_aidev/*" -not -path "*/release/*" -not -path "*/demo/*" 2>/dev/null`,
          { encoding: 'utf8' }
        ).split('\n').filter(Boolean);
        
        files.forEach(file => testFiles.add(file));
      } catch (error) {
        // Pattern might not match any files
      }
    }

    this.report.details.testFiles = Array.from(testFiles).map(file => ({
      path: file,
      type: this.categorizeTestFile(file),
      size: this.getFileSize(file),
      lastModified: this.getLastModified(file)
    }));

    console.log(`  Found ${testFiles.size} test files`);
    return testFiles;
  }

  /**
   * Categorize test file by type
   */
  categorizeTestFile(filePath) {
    if (filePath.includes('/unit/')) return 'unit';
    if (filePath.includes('/integration/')) return 'integration';
    if (filePath.includes('/system/')) return 'system';
    if (filePath.includes('/e2e/')) return 'e2e';
    if (filePath.includes('/external/')) return 'external';
    if (filePath.includes('/validation/')) return 'validation';
    if (filePath.includes('.itest.')) return 'integration';
    if (filePath.includes('.stest.')) return 'system';
    if (filePath.includes('.etest.')) return 'external';
    if (filePath.includes('.envtest.')) return 'environment';
    return 'unknown';
  }

  /**
   * Get file size in bytes
   */
  getFileSize(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  /**
   * Get last modified date
   */
  getLastModified(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return stats.mtime.toISOString();
    } catch {
      return null;
    }
  }

  /**
   * Analyze test coverage
   */
  analyzeCoverage() {
    console.log('📊 Analyzing test coverage...');
    
    try {
      const coverageOutput = execSync(
        'bunx jest -c config/jest/jest.config.js --coverage --coverageReporters=json-summary --silent 2>&1',
        { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }
      );
      
      const summaryPath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
      
      if (fs.existsSync(summaryPath)) {
        const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
        
        this.report.details.coverage = {
          lines: summary.total.lines.pct,
          statements: summary.total.statements.pct,
          functions: summary.total.functions.pct,
          branches: summary.total.branches.pct,
          files: Object.keys(summary).length - 1 // Exclude 'total' key
        };
        
        console.log(`  Coverage: ${summary.total.lines.pct}% lines, ${summary.total.branches.pct}% branches`);
      }
    } catch (error) {
      console.log('  ⚠ Could not generate coverage report');
      this.report.details.issues.push({
        type: 'coverage',
        message: 'Failed to generate coverage report',
        severity: 'medium'
      });
    }
  }

  /**
   * Analyze failure detection capabilities
   */
  analyzeFailureDetection() {
    console.log('🔍 Analyzing failure detection capabilities...');
    
    const capabilities = {
      hasValidationTests: false,
      assertionTypes: new Set(),
      mockingFramework: false,
      asyncTesting: false,
      errorHandling: false,
      boundaryTesting: false
    };

    // Check for validation tests
    const validationTests = this.report.details.testFiles.filter(
      f => f.type === 'validation' || f.path.includes('validation')
    );
    capabilities.hasValidationTests = validationTests.length > 0;

    // Analyze test content for patterns
    for (const testFile of this.report.details.testFiles.slice(0, 50)) { // Sample first 50 files
      try {
        const content = fs.readFileSync(testFile.path, 'utf8');
        
        // Check for assertion types
        if (content.includes('expect(')) capabilities.assertionTypes.add('jest');
        if (content.includes('assert(')) capabilities.assertionTypes.add('assert');
        if (content.includes('should(')) capabilities.assertionTypes.add('should');
        if (content.includes('chai.')) capabilities.assertionTypes.add('chai');
        
        // Check for mocking
        if (content.includes('jest.fn()') || content.includes('jest.mock(')) {
          capabilities.mockingFramework = true;
        }
        
        // Check for async testing
        if (content.includes('async') || content.includes('await') || content.includes('.resolves') || content.includes('.rejects')) {
          capabilities.asyncTesting = true;
        }
        
        // Check for error handling
        if (content.includes('.toThrow') || content.includes('catch') || content.includes('rejects')) {
          capabilities.errorHandling = true;
        }
        
        // Check for boundary testing
        if (content.includes('boundary') || content.includes('edge case') || content.includes('MAX_') || content.includes('MIN_')) {
          capabilities.boundaryTesting = true;
        }
      } catch {
        // File might not be readable
      }
    }

    this.report.details.failureDetection = {
      ...capabilities,
      assertionTypes: Array.from(capabilities.assertionTypes),
      score: this.calculateFailureDetectionScore(capabilities)
    };

    console.log(`  Failure detection score: ${this.report.details.failureDetection.score}/100`);
  }

  /**
   * Calculate failure detection score
   */
  calculateFailureDetectionScore(capabilities) {
    let score = 0;
    
    if (capabilities.hasValidationTests) score += 20;
    if (capabilities.assertionTypes.size > 0) score += 20;
    if (capabilities.mockingFramework) score += 15;
    if (capabilities.asyncTesting) score += 15;
    if (capabilities.errorHandling) score += 15;
    if (capabilities.boundaryTesting) score += 15;
    
    return Math.min(100, score);
  }

  /**
   * Check for common test issues
   */
  checkForIssues() {
    console.log('⚠️  Checking for common issues...');
    
    // Check for duplicate test files
    const fileNames = {};
    for (const file of this.report.details.testFiles) {
      const name = path.basename(file.path);
      if (!fileNames[name]) {
        fileNames[name] = [];
      }
      fileNames[name].push(file.path);
    }
    
    for (const [name, paths] of Object.entries(fileNames)) {
      if (paths.length > 1) {
        this.report.details.issues.push({
          type: 'duplicate',
          message: `Duplicate test file name: ${name}`,
          files: paths,
          severity: 'low'
        });
      }
    }

    // Check for large test files
    const largeFiles = this.report.details.testFiles.filter(f => f.size > 50000); // > 50KB
    for (const file of largeFiles) {
      this.report.details.issues.push({
        type: 'large_file',
        message: `Large test file: ${file.path} (${(file.size / 1024).toFixed(1)}KB)`,
        severity: 'low'
      });
    }

    // Check for outdated tests
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const outdatedFiles = this.report.details.testFiles.filter(f => {
      if (!f.lastModified) return false;
      return new Date(f.lastModified) < thirtyDaysAgo;
    });
    
    if (outdatedFiles.length > 10) {
      this.report.details.issues.push({
        type: 'outdated',
        message: `${outdatedFiles.length} test files haven't been updated in 30+ days`,
        severity: 'medium'
      });
    }

    console.log(`  Found ${this.report.details.issues.length} issues`);
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    console.log('💡 Generating recommendations...');
    
    const { coverage, failureDetection, issues, testFiles } = this.report.details;
    
    // Coverage recommendations
    if (coverage.lines < 80) {
      this.report.details.recommendations.push({
        category: 'coverage',
        priority: 'high',
        message: `Increase line coverage from ${coverage.lines}% to at least 80%`
      });
    }
    
    if (coverage.branches < 80) {
      this.report.details.recommendations.push({
        category: 'coverage',
        priority: 'high',
        message: `Increase branch coverage from ${coverage.branches}% to at least 80%`
      });
    }

    // Failure detection recommendations
    if (!failureDetection.hasValidationTests) {
      this.report.details.recommendations.push({
        category: 'validation',
        priority: 'high',
        message: 'Add validation tests to ensure assertions can detect failures'
      });
    }
    
    if (!failureDetection.mockingFramework) {
      this.report.details.recommendations.push({
        category: 'mocking',
        priority: 'medium',
        message: 'Consider using mock functions for better test isolation'
      });
    }
    
    if (!failureDetection.boundaryTesting) {
      this.report.details.recommendations.push({
        category: 'testing',
        priority: 'medium',
        message: 'Add boundary and edge case tests'
      });
    }

    // Test organization recommendations
    const unknownTests = testFiles.filter(f => f.type === 'unknown');
    if (unknownTests.length > 5) {
      this.report.details.recommendations.push({
        category: 'organization',
        priority: 'low',
        message: `Organize ${unknownTests.length} test files into proper categories (unit/integration/system)`
      });
    }

    // Issue-based recommendations
    if (issues.some(i => i.type === 'duplicate')) {
      this.report.details.recommendations.push({
        category: 'cleanup',
        priority: 'medium',
        message: 'Resolve duplicate test file names to avoid confusion'
      });
    }
  }

  /**
   * Generate summary statistics
   */
  generateSummary() {
    const { testFiles, coverage, failureDetection, issues } = this.report.details;
    
    // Count by type
    const typeCount = {};
    for (const file of testFiles) {
      typeCount[file.type] = (typeCount[file.type] || 0) + 1;
    }

    this.report.summary = {
      totalTests: testFiles.length,
      testsByType: typeCount,
      coverageScore: coverage.lines || 0,
      failureDetectionScore: failureDetection.score || 0,
      issueCount: issues.length,
      healthScore: this.calculateHealthScore(),
      status: this.determineStatus()
    };
  }

  /**
   * Calculate overall health score
   */
  calculateHealthScore() {
    const { coverage, failureDetection, issues, testFiles } = this.report.details;
    
    let score = 0;
    let weights = 0;
    
    // Coverage contribution (40%)
    if (coverage.lines !== undefined) {
      score += coverage.lines * 0.4;
      weights += 40;
    }
    
    // Failure detection contribution (30%)
    if (failureDetection.score !== undefined) {
      score += failureDetection.score * 0.3;
      weights += 30;
    }
    
    // Test count contribution (20%)
    const testScore = Math.min(100, (testFiles.length / 100) * 100);
    score += testScore * 0.2;
    weights += 20;
    
    // Issues penalty (10%)
    const issuePenalty = Math.min(10, issues.length * 2);
    score -= issuePenalty;
    weights += 10;
    
    return Math.max(0, Math.min(100, (score / weights) * 100));
  }

  /**
   * Determine overall status
   */
  determineStatus() {
    const healthScore = this.report.summary.healthScore;
    
    if (healthScore >= 90) return '🟢 Excellent';
    if (healthScore >= 75) return '🟢 Good';
    if (healthScore >= 60) return '🟡 Fair';
    if (healthScore >= 40) return '🟠 Poor';
    return '🔴 Critical';
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport() {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Health Report - ${new Date().toLocaleDateString()}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 30px;
    }
    h1 {
      margin: 0;
      font-size: 2.5em;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .metric {
      font-size: 2em;
      font-weight: bold;
      color: #667eea;
    }
    .label {
      color: #666;
      font-size: 0.9em;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .status {
      font-size: 1.5em;
      font-weight: bold;
      margin: 10px 0;
    }
    .chart {
      width: 100%;
      height: 200px;
      background: #f9f9f9;
      border-radius: 5px;
      padding: 10px;
      margin-top: 10px;
    }
    .issues {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
    }
    .recommendations {
      background: #d1ecf1;
      border-left: 4px solid #17a2b8;
      padding: 15px;
      margin: 20px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background: #f8f9fa;
      font-weight: 600;
    }
    .progress-bar {
      width: 100%;
      height: 20px;
      background: #e9ecef;
      border-radius: 10px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea, #764ba2);
      transition: width 0.3s ease;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Test Health Report</h1>
    <p>Generated: ${this.report.timestamp}</p>
    <div class="status">${this.report.summary.status}</div>
  </div>

  <div class="summary">
    <div class="card">
      <div class="label">Health Score</div>
      <div class="metric">${this.report.summary.healthScore.toFixed(0)}%</div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${this.report.summary.healthScore}%"></div>
      </div>
    </div>
    
    <div class="card">
      <div class="label">Total Tests</div>
      <div class="metric">${this.report.summary.totalTests}</div>
    </div>
    
    <div class="card">
      <div class="label">Coverage</div>
      <div class="metric">${this.report.summary.coverageScore.toFixed(1)}%</div>
    </div>
    
    <div class="card">
      <div class="label">Failure Detection</div>
      <div class="metric">${this.report.summary.failureDetectionScore}/100</div>
    </div>
  </div>

  <div class="card">
    <h2>Test Distribution</h2>
    <table>
      <tr>
        <th>Type</th>
        <th>Count</th>
        <th>Percentage</th>
      </tr>
      ${Object.entries(this.report.summary.testsByType)
        .map(([type, count]) => `
          <tr>
            <td>${type}</td>
            <td>${count}</td>
            <td>${((count / this.report.summary.totalTests) * 100).toFixed(1)}%</td>
          </tr>
        `).join('')}
    </table>
  </div>

  ${this.report.details.issues.length > 0 ? `
    <div class="issues">
      <h2>⚠️ Issues (${this.report.details.issues.length})</h2>
      <ul>
        ${this.report.details.issues.map(issue => 
          `<li><strong>${issue.type}:</strong> ${issue.message}</li>`
        ).join('')}
      </ul>
    </div>
  ` : ''}

  ${this.report.details.recommendations.length > 0 ? `
    <div class="recommendations">
      <h2>💡 Recommendations</h2>
      <ul>
        ${this.report.details.recommendations.map(rec => 
          `<li><strong>[${rec.priority}]</strong> ${rec.message}</li>`
        ).join('')}
      </ul>
    </div>
  ` : ''}

  <div class="card">
    <h2>Coverage Details</h2>
    <table>
      <tr>
        <th>Metric</th>
        <th>Coverage</th>
      </tr>
      <tr>
        <td>Lines</td>
        <td>${this.report.details.coverage.lines || 'N/A'}%</td>
      </tr>
      <tr>
        <td>Statements</td>
        <td>${this.report.details.coverage.statements || 'N/A'}%</td>
      </tr>
      <tr>
        <td>Functions</td>
        <td>${this.report.details.coverage.functions || 'N/A'}%</td>
      </tr>
      <tr>
        <td>Branches</td>
        <td>${this.report.details.coverage.branches || 'N/A'}%</td>
      </tr>
    </table>
  </div>

  <div class="card">
    <h2>Failure Detection Capabilities</h2>
    <table>
      <tr>
        <th>Capability</th>
        <th>Status</th>
      </tr>
      <tr>
        <td>Validation Tests</td>
        <td>${this.report.details.failureDetection.hasValidationTests ? '✅' : '❌'}</td>
      </tr>
      <tr>
        <td>Mocking Framework</td>
        <td>${this.report.details.failureDetection.mockingFramework ? '✅' : '❌'}</td>
      </tr>
      <tr>
        <td>Async Testing</td>
        <td>${this.report.details.failureDetection.asyncTesting ? '✅' : '❌'}</td>
      </tr>
      <tr>
        <td>Error Handling</td>
        <td>${this.report.details.failureDetection.errorHandling ? '✅' : '❌'}</td>
      </tr>
      <tr>
        <td>Boundary Testing</td>
        <td>${this.report.details.failureDetection.boundaryTesting ? '✅' : '❌'}</td>
      </tr>
    </table>
  </div>
</body>
</html>
    `;

    return html;
  }

  /**
   * Save reports
   */
  saveReports() {
    const reportDir = path.join(process.cwd(), 'gen', 'test-health');
    fs.mkdirSync(reportDir, { recursive: true });

    // Save JSON report
    const jsonPath = path.join(reportDir, 'report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(this.report, null, 2));
    console.log(`\n📄 JSON report saved to: ${jsonPath}`);

    // Save HTML report
    const htmlPath = path.join(reportDir, 'report.html');
    fs.writeFileSync(htmlPath, this.generateHTMLReport());
    console.log(`📄 HTML report saved to: ${htmlPath}`);

    // Save summary to console
    console.log('\n' + '='.repeat(60));
    console.log('TEST HEALTH SUMMARY');
    console.log('='.repeat(60));
    console.log(`Status: ${this.report.summary.status}`);
    console.log(`Health Score: ${this.report.summary.healthScore.toFixed(0)}%`);
    console.log(`Total Tests: ${this.report.summary.totalTests}`);
    console.log(`Coverage: ${this.report.summary.coverageScore.toFixed(1)}%`);
    console.log(`Issues: ${this.report.summary.issueCount}`);
    console.log(`Recommendations: ${this.report.details.recommendations.length}`);
    console.log('='.repeat(60));
  }

  /**
   * Main execution
   */
  async run() {
    console.log('🏥 Test Health Report Generator');
    console.log('================================\n');

    this.scanTestFiles();
    this.analyzeCoverage();
    this.analyzeFailureDetection();
    this.checkForIssues();
    this.generateRecommendations();
    this.generateSummary();
    this.saveReports();

    const isHealthy = this.report.summary.healthScore >= 60;
    process.exit(isHealthy ? 0 : 1);
  }
}

// Run if executed directly
if (require.main === module) {
  const reporter = new TestHealthReporter();
  reporter.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = TestHealthReporter;