/**
 * Executive Summary Generator
 * Creates business-focused summaries of test documentation
 */

import { ManualTestSuite, ManualTest } from '../entities/ManualTest';

export interface ExecutiveSummary {
  overview: string;
  businessValue: string[];
  risksCovered: string[];
  complianceAspects: string[];
  keyMetrics: {
    totalTestCases: number;
    criticalTests: number;
    estimatedEffort: number; // in hours
    coverage: CoverageMetrics;
  };
  recommendations: string[];
  testCategories: CategorySummary[];
}

interface CoverageMetrics {
  functional: number;
  security: number;
  performance: number;
  usability: number;
  overall: number;
}

interface CategorySummary {
  name: string;
  testCount: number;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: number;
  keyTests: string[];
}

export class ExecutiveSummaryGenerator {
  /**
   * Generate executive summary from manual test suite
   */
  generateSummary(suite: ManualTestSuite): ExecutiveSummary {
    const allTests = [...suite.procedures, ...suite.commonProcedures];
    
    return {
      overview: this.generateOverview(suite),
      businessValue: this.extractBusinessValue(allTests),
      risksCovered: this.identifyRisksCovered(allTests),
      complianceAspects: this.extractComplianceAspects(allTests),
      keyMetrics: this.calculateKeyMetrics(suite),
      recommendations: this.generateRecommendations(suite),
      testCategories: this.summarizeCategories(allTests)
    };
  }

  private generateOverview(suite: ManualTestSuite): string {
    const totalTests = suite.procedures.length + suite.commonProcedures.length;
    const totalTime = this.calculateTotalTime(suite);
    const complexity = this.assessComplexity(suite);

    return `This test suite contains ${totalTests} manual test procedures covering ${this.identifyFeatures(suite).length} key features. ` +
           `The estimated execution time is ${this.formatTime(totalTime)}, with a ${complexity} complexity level. ` +
           `${suite.commonProcedures.length} common procedures have been identified for reuse across multiple test scenarios, ` +
           `improving efficiency and consistency.`;
  }

  private extractBusinessValue(tests: ManualTest[]): string[] {
    const values = new Set<string>();

    // Analyze test titles and descriptions for business value
    tests.forEach(test => {
      if (test.category === 'Authentication') {
        values.add('Ensures secure user access and protects sensitive data');
      }
      if (test.category === 'Payment') {
        values.add('Validates payment processing accuracy and security');
      }
      if (test.title.toLowerCase().includes('checkout')) {
        values.add('Guarantees smooth customer purchase experience');
      }
      if (test.title.toLowerCase().includes('search')) {
        values.add('Enables efficient product/content discovery');
      }
      if (test.priority === 'high') {
        values.add('Covers critical business functions');
      }
      if (test.tags.includes('@compliance')) {
        values.add('Ensures regulatory compliance requirements are met');
      }
      if (test.category === 'Performance') {
        values.add('Validates system performance meets user expectations');
      }
    });

    // Add general values
    if (tests.length > 20) {
      values.add('Comprehensive test coverage reduces production defects');
    }
    if (tests.some(t => t.category === 'API')) {
      values.add('Ensures reliable integration with external systems');
    }

    return Array.from(values);
  }

  private identifyRisksCovered(tests: ManualTest[]): string[] {
    const risks = new Set<string>();

    tests.forEach(test => {
      // Security risks
      if (test.tags.includes('@security') || test.category === 'Security') {
        risks.add('Security vulnerabilities and unauthorized access');
      }
      
      // Data risks
      if (test.title.toLowerCase().includes('data') || test.title.toLowerCase().includes('validation')) {
        risks.add('Data integrity and validation errors');
      }
      
      // Performance risks
      if (test.category === 'Performance') {
        risks.add('System performance degradation under load');
      }
      
      // Business logic risks
      if (test.priority === 'high' && test.category === 'Functional') {
        risks.add('Critical business logic failures');
      }
      
      // Integration risks
      if (test.category === 'API' || test.title.toLowerCase().includes('integration')) {
        risks.add('Third-party integration failures');
      }
      
      // User experience risks
      if (test.category === 'UI' || test.category === 'Usability') {
        risks.add('Poor user experience leading to customer dissatisfaction');
      }
      
      // Compliance risks
      if (test.tags.includes('@compliance') || test.tags.includes('@regulatory')) {
        risks.add('Non-compliance with regulatory requirements');
      }
    });

    return Array.from(risks);
  }

  private extractComplianceAspects(tests: ManualTest[]): string[] {
    const compliance = new Set<string>();

    tests.forEach(test => {
      // GDPR
      if (test.title.toLowerCase().includes('privacy') || 
          test.title.toLowerCase().includes('consent') ||
          test.tags.includes('@gdpr')) {
        compliance.add('GDPR - Data privacy and user consent');
      }
      
      // PCI DSS
      if (test.category === 'Payment' || test.tags.includes('@pci')) {
        compliance.add('PCI DSS - Payment card data security');
      }
      
      // WCAG
      if (test.tags.includes('@accessibility') || test.tags.includes('@a11y')) {
        compliance.add('WCAG 2.1 - Web accessibility standards');
      }
      
      // SOC 2
      if (test.tags.includes('@soc2') || test.category === 'Security') {
        compliance.add('SOC 2 - Security and availability');
      }
      
      // HIPAA
      if (test.tags.includes('@hipaa') || test.title.toLowerCase().includes('health')) {
        compliance.add('HIPAA - Healthcare data protection');
      }
      
      // Industry specific
      if (test.tags.includes('@regulatory')) {
        compliance.add('Industry-specific regulatory requirements');
      }
    });

    return Array.from(compliance);
  }

  private calculateKeyMetrics(suite: ManualTestSuite): ExecutiveSummary['keyMetrics'] {
    const allTests = [...suite.procedures, ...suite.commonProcedures];
    
    return {
      totalTestCases: allTests.length,
      criticalTests: allTests.filter(t => t.priority === 'high').length,
      estimatedEffort: this.calculateTotalTime(suite) / 60, // Convert to hours
      coverage: this.calculateCoverage(allTests)
    };
  }

  private calculateCoverage(tests: ManualTest[]): CoverageMetrics {
    const categories = {
      functional: 0,
      security: 0,
      performance: 0,
      usability: 0
    };

    tests.forEach(test => {
      switch (test.category) {
        case 'Functional':
        case 'API':
        case 'Integration':
          categories.functional++;
          break;
        case 'Security':
        case 'Authentication':
          categories.security++;
          break;
        case 'Performance':
          categories.performance++;
          break;
        case 'UI':
        case 'Usability':
          categories.usability++;
          break;
        default:
          categories.functional++; // Default to functional
      }
    });

    const total = tests.length || 1; // Avoid division by zero

    return {
      functional: Math.round((categories.functional / total) * 100),
      security: Math.round((categories.security / total) * 100),
      performance: Math.round((categories.performance / total) * 100),
      usability: Math.round((categories.usability / total) * 100),
      overall: Math.min(100, Math.round(
        (categories.functional + categories.security + categories.performance + categories.usability) / total * 100
      ))
    };
  }

  private generateRecommendations(suite: ManualTestSuite): string[] {
    const recommendations: string[] = [];
    const metrics = this.calculateKeyMetrics(suite);

    // Coverage recommendations
    if (metrics.coverage.security < 15) {
      recommendations.push('Increase security test coverage to ensure robust protection');
    }
    if (metrics.coverage.performance < 10) {
      recommendations.push('Add performance tests to validate system scalability');
    }
    if (metrics.coverage.usability < 20) {
      recommendations.push('Enhance usability testing for better user experience');
    }

    // Efficiency recommendations
    if (suite.commonProcedures.length < suite.procedures.length * 0.1) {
      recommendations.push('Identify more common test procedures to improve efficiency');
    }
    if (metrics.estimatedEffort > 40) {
      recommendations.push('Consider test automation for frequently executed scenarios');
    }

    // Priority recommendations
    const highPriorityRatio = metrics.criticalTests / metrics.totalTestCases;
    if (highPriorityRatio > 0.5) {
      recommendations.push('Review test priorities - too many marked as critical');
    }
    if (highPriorityRatio < 0.1) {
      recommendations.push('Identify and prioritize business-critical test scenarios');
    }

    // Sequence recommendations
    if (suite.sequences.length === 0) {
      recommendations.push('Create test sequences for end-to-end workflow validation');
    }

    // General recommendations
    recommendations.push('Schedule regular test suite reviews to maintain relevance');
    recommendations.push('Document test data requirements for consistent execution');

    return recommendations;
  }

  private summarizeCategories(tests: ManualTest[]): CategorySummary[] {
    const categoryMap = new Map<string, ManualTest[]>();

    // Group by category
    tests.forEach(test => {
      if (!categoryMap.has(test.category)) {
        categoryMap.set(test.category, []);
      }
      categoryMap.get(test.category)!.push(test);
    });

    // Create summaries
    return Array.from(categoryMap.entries()).map(([category, categoryTests]) => {
      const priorities = categoryTests.map(t => t.priority);
      const avgPriority = priorities.filter(p => p === 'high').length > priorities.length / 2 ? 'high' :
                         priorities.filter(p => p === 'low').length > priorities.length / 2 ? 'low' : 'medium';

      return {
        name: category,
        testCount: categoryTests.length,
        priority: avgPriority as 'high' | 'medium' | 'low',
        estimatedTime: categoryTests.reduce((sum, t) => sum + t.estimatedTime, 0),
        keyTests: categoryTests
          .filter(t => t.priority === 'high')
          .slice(0, 3)
          .map(t => t.title)
      };
    }).sort((a, b) => b.testCount - a.testCount); // Sort by test count
  }

  private calculateTotalTime(suite: ManualTestSuite): number {
    const allTests = [...suite.procedures, ...suite.commonProcedures];
    return allTests.reduce((sum, test) => sum + test.estimatedTime, 0);
  }

  private assessComplexity(suite: ManualTestSuite): string {
    const avgStepsPerTest = suite.procedures.reduce((sum, t) => sum + t.testSteps.length, 0) / 
                           (suite.procedures.length || 1);
    
    if (avgStepsPerTest > 15) return 'high';
    if (avgStepsPerTest > 8) return 'medium';
    return 'low';
  }

  private identifyFeatures(suite: ManualTestSuite): string[] {
    const features = new Set<string>();
    const allTests = [...suite.procedures, ...suite.commonProcedures];

    allTests.forEach(test => {
      // Extract feature from category
      features.add(test.category);
      
      // Extract from tags
      test.tags.forEach(tag => {
        if (!tag.startsWith('@')) return;
        const feature = tag.substring(1);
        if (!['skip', 'only', 'critical', 'high', 'medium', 'low'].includes(feature)) {
          features.add(feature);
        }
      });
    });

    return Array.from(features);
  }

  private formatTime(minutes: number): string {
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} hours ${mins} minutes` : `${hours} hours`;
  }

  /**
   * Generate HTML executive summary
   */
  generateHTMLSummary(summary: ExecutiveSummary): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Executive Summary - Test Documentation</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        h1, h2 { color: #333; }
        .metric { display: inline-block; margin: 10px 20px 10px 0; }
        .metric-value { font-size: 2em; font-weight: bold; color: #007bff; }
        .metric-label { color: #666; }
        .section { margin: 30px 0; }
        .list-item { margin: 10px 0; padding-left: 20px; }
        .category-table { width: 100%; border-collapse: collapse; }
        .category-table th, .category-table td { padding: 10px; border: 1px solid #ddd; }
        .category-table th { background: #f5f5f5; }
        .priority-high { color: #d32f2f; }
        .priority-medium { color: #f57c00; }
        .priority-low { color: #388e3c; }
        .coverage-bar { width: 200px; height: 20px; background: #eee; display: inline-block; }
        .coverage-fill { height: 100%; background: #4caf50; }
    </style>
</head>
<body>
    <h1>Executive Summary</h1>
    
    <div class="section">
        <h2>Overview</h2>
        <p>${summary.overview}</p>
    </div>

    <div class="section">
        <h2>Key Metrics</h2>
        <div class="metric">
            <div class="metric-value">${summary.keyMetrics.totalTestCases}</div>
            <div class="metric-label">Total Test Cases</div>
        </div>
        <div class="metric">
            <div class="metric-value">${summary.keyMetrics.criticalTests}</div>
            <div class="metric-label">Critical Tests</div>
        </div>
        <div class="metric">
            <div class="metric-value">${summary.keyMetrics.estimatedEffort.toFixed(1)}h</div>
            <div class="metric-label">Estimated Effort</div>
        </div>
    </div>

    <div class="section">
        <h2>Coverage Analysis</h2>
        <table>
            <tr>
                <td>Functional</td>
                <td>
                    <div class="coverage-bar">
                        <div class="coverage-fill" style="width: ${summary.keyMetrics.coverage.functional}%"></div>
                    </div>
                    ${summary.keyMetrics.coverage.functional}%
                </td>
            </tr>
            <tr>
                <td>Security</td>
                <td>
                    <div class="coverage-bar">
                        <div class="coverage-fill" style="width: ${summary.keyMetrics.coverage.security}%"></div>
                    </div>
                    ${summary.keyMetrics.coverage.security}%
                </td>
            </tr>
            <tr>
                <td>Performance</td>
                <td>
                    <div class="coverage-bar">
                        <div class="coverage-fill" style="width: ${summary.keyMetrics.coverage.performance}%"></div>
                    </div>
                    ${summary.keyMetrics.coverage.performance}%
                </td>
            </tr>
            <tr>
                <td>Usability</td>
                <td>
                    <div class="coverage-bar">
                        <div class="coverage-fill" style="width: ${summary.keyMetrics.coverage.usability}%"></div>
                    </div>
                    ${summary.keyMetrics.coverage.usability}%
                </td>
            </tr>
        </table>
    </div>

    <div class="section">
        <h2>Business Value</h2>
        <ul>
            ${summary.businessValue.map(value => `<li class="list-item">✓ ${value}</li>`).join('')}
        </ul>
    </div>

    <div class="section">
        <h2>Risks Covered</h2>
        <ul>
            ${summary.risksCovered.map(risk => `<li class="list-item">⚡ ${risk}</li>`).join('')}
        </ul>
    </div>

    ${summary.complianceAspects.length > 0 ? `
    <div class="section">
        <h2>Compliance</h2>
        <ul>
            ${summary.complianceAspects.map(aspect => `<li class="list-item">📋 ${aspect}</li>`).join('')}
        </ul>
    </div>
    ` : ''}

    <div class="section">
        <h2>Test Categories</h2>
        <table class="category-table">
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Test Count</th>
                    <th>Priority</th>
                    <th>Estimated Time</th>
                    <th>Key Tests</th>
                </tr>
            </thead>
            <tbody>
                ${summary.testCategories.map(cat => `
                <tr>
                    <td>${cat.name}</td>
                    <td>${cat.testCount}</td>
                    <td class="priority-${cat.priority}">${cat.priority.toUpperCase()}</td>
                    <td>${cat.estimatedTime} min</td>
                    <td>${cat.keyTests.join(', ') || '-'}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>Recommendations</h2>
        <ul>
            ${summary.recommendations.map(rec => `<li class="list-item">💡 ${rec}</li>`).join('')}
        </ul>
    </div>
</body>
</html>
    `;
  }
}