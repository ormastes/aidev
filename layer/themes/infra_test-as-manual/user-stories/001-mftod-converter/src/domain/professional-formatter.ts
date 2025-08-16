/**
 * Professional Document Formatter inspired by _aidev implementation
 * Generates enterprise-ready manual test documentation
 */

import { TestDocument, TestSuite, TestCase, FormatOptions } from './types';
import { ProfessionalManualSuite, ProfessionalManualTest, TOCEntry } from './capture-types';
import { DocumentFormatter } from './document-formatter';

export interface ProfessionalFormatOptions extends FormatOptions {
  includeExecutiveSummary?: boolean;
  includeRoleBasedOrganization?: boolean;
  includeTroubleshooting?: boolean;
  includeVisualGuides?: boolean;
  includeSupportInfo?: boolean;
  templateStyle?: "enterprise" | 'startup' | "government" | "healthcare";
  outputLanguage?: 'en' | 'es' | 'fr' | 'de' | 'ja';
}

export class ProfessionalFormatter extends DocumentFormatter {
  private professionalOptions: ProfessionalFormatOptions;

  constructor(options: ProfessionalFormatOptions = {}) {
    super(options);
    this.professionalOptions = {
      includeExecutiveSummary: true,
      includeRoleBasedOrganization: true,
      includeTroubleshooting: true,
      includeVisualGuides: true,
      includeSupportInfo: true,
      templateStyle: "enterprise",
      outputLanguage: 'en',
      ...options
    };
  }

  format(document: TestDocument): string {
    const professionalSuite = this.transformToProfessionalSuite(document);
    return this.generateProfessionalMarkdown(professionalSuite);
  }

  protected transformToProfessionalSuite(document: TestDocument): ProfessionalManualSuite {
    const testCases = this.extractAllTestCases(document);
    const totalEstimatedTime = testCases.reduce((sum, test) => sum + ((test as any).estimatedTime || 5), 0);

    return {
      title: this.enhanceTitle(document.title),
      version: '1.0',
      created: document.created,
      testCases: testCases.map(tc => this.enhanceTestCase(tc)),
      executiveSummary: {
        totalTests: testCases.length,
        totalScenarios: testCases.length,
        estimatedExecutionTime: totalEstimatedTime,
        coverageAreas: this.extractCoverageAreas(testCases)
      },
      tableOfContents: this.generateProfessionalTOC(testCases),
      supportInformation: {
        contactInfo: 'support@aidev-platform.com',
        documentationLinks: ['docs/', 'README.md'],
        issueTracker: 'https://github.com/your-repo/issues',
        communityLinks: ['https://github.com/your-repo/discussions']
      },
      metadata: document.metadata
    };
  }

  private extractAllTestCases(document: TestDocument): TestCase[] {
    const testCases: TestCase[] = [];
    
    const extractFromSuite = (suite: TestSuite) => {
      testCases.push(...suite.testCases);
      if (suite.childSuites) {
        suite.childSuites.forEach(extractFromSuite);
      }
    };

    document.suites.forEach(extractFromSuite);
    return testCases;
  }

  private enhanceTestCase(testCase: TestCase): ProfessionalManualTest {
    return {
      ...testCase,
      role: this.inferUserRole(testCase),
      estimatedTime: this.calculateEstimatedTime(testCase),
      complexityLevel: this.inferComplexity(testCase),
      riskLevel: this.inferRiskLevel(testCase),
      businessValue: this.inferBusinessValue(testCase),
      troubleshooting: this.generateTroubleshooting(testCase),
      visualGuide: this.generateVisualGuide(testCase)
    };
  }

  private inferUserRole(testCase: TestCase): string {
    const title = testCase.title.toLowerCase();
    const category = testCase.category?.toLowerCase() || '';
    
    if (title.includes('admin') || category.includes('admin')) return "Administrator";
    if (title.includes("developer") || category.includes('api')) return "Developer";
    if (title.includes('test') || category.includes('test')) return 'QA Tester';
    if (title.includes('cli') || title.includes('command')) return 'CLI User';
    return 'End User';
  }

  private calculateEstimatedTime(testCase: TestCase): number {
    const stepCount = testCase.steps.length;
    const baseTime = 2; // 2 minutes base
    const stepTime = stepCount * 1.5; // 1.5 minutes per step
    const complexityMultiplier = testCase.async ? 1.5 : 1.0;
    
    return Math.ceil((baseTime + stepTime) * complexityMultiplier);
  }

  private inferComplexity(testCase: TestCase): 'simple' | "intermediate" | "advanced" {
    const stepCount = testCase.steps.length;
    const hasAsync = testCase.async;
    const hasTestData = testCase.testData && testCase.testData.length > 0;
    
    if (stepCount <= 3 && !hasAsync && !hasTestData) return 'simple';
    if (stepCount > 8 || (hasAsync && hasTestData)) return "advanced";
    return "intermediate";
  }

  private inferRiskLevel(testCase: TestCase): 'low' | 'medium' | 'high' {
    const priority = testCase.priority || 'medium';
    const category = testCase.category?.toLowerCase() || '';
    
    if (priority === 'high' || category.includes("security") || category.includes('auth')) return 'high';
    if (priority === 'low' && !category.includes("critical")) return 'low';
    return 'medium';
  }

  private inferBusinessValue(testCase: TestCase): string {
    const category = testCase.category?.toLowerCase() || '';
    const title = testCase.title.toLowerCase();
    
    if (category.includes('auth') || title.includes('login')) {
      return 'Critical for user access and security';
    }
    if (category.includes('api') || title.includes("integration")) {
      return 'Essential for system integration and data flow';
    }
    if (category.includes('ui') || title.includes("interface")) {
      return 'Important for user experience and usability';
    }
    return 'Supports overall system functionality';
  }

  private generateTroubleshooting(testCase: TestCase): Array<any> {
    const troubleshooting = [];
    const category = testCase.category?.toLowerCase() || '';
    
    if (category.includes('auth')) {
      troubleshooting.push({
        issue: 'Login fails with valid credentials',
        solution: '1. Clear browser cache and cookies\n2. Check network connectivity\n3. Verify server status',
        category: "technical"
      });
    }
    
    if (testCase.async) {
      troubleshooting.push({
        issue: 'Test steps timeout or hang',
        solution: '1. Wait for page load indicators\n2. Check for JavaScript errors\n3. Verify test data setup',
        category: "environment"
      });
    }
    
    return troubleshooting;
  }

  private generateVisualGuide(testCase: TestCase): Array<any> {
    // Generate visual guide references based on test steps
    return testCase.steps
      .filter((_step, index) => index % 2 === 0) // Every other step for key actions
      .map((step, _index) => ({
        stepNumber: step.order,
        screenshot: `${testCase.id.toLowerCase()}_step_${step.order}.png`,
        caption: `${step.action} - ${step.expected}`,
        annotations: []
      }));
  }

  private extractCoverageAreas(testCases: TestCase[]): string[] {
    const areas = new Set<string>();
    testCases.forEach(tc => {
      if (tc.category) areas.add(tc.category);
    });
    return Array.from(areas);
  }

  private generateProfessionalTOC(testCases: ProfessionalManualTest[]): TOCEntry[] {
    const roleGroups = new Map<string, ProfessionalManualTest[]>();
    
    testCases.forEach(tc => {
      const role = tc.role || 'General';
      if (!roleGroups.has(role)) {
        roleGroups.set(role, []);
      }
      roleGroups.get(role)!.push(tc);
    });

    const toc: TOCEntry[] = [];
    
    roleGroups.forEach((tests, role) => {
      const roleEntry: TOCEntry = {
        title: `${this.getRoleIcon(role)} ${role} Guide`,
        anchor: role.toLowerCase().replace(/\s+/g, '-'),
        level: 1,
        children: tests.map(test => ({
          title: test.title,
          anchor: test.id.toLowerCase(),
          level: 2
        }))
      };
      toc.push(roleEntry);
    });

    return toc;
  }

  private getRoleIcon(role: string): string {
    const icons: Record<string, string> = {
      "Administrator": '⚙️',
      'End User': '👤',
      "Developer": '🔧',
      'QA Tester': '🧪',
      'CLI User': '⌨️'
    };
    return icons[role] || '📋';
  }

  private enhanceTitle(title: string): string {
    return title.replace('Test Documentation:', 'Professional Test Manual:');
  }

  private generateProfessionalMarkdown(suite: ProfessionalManualSuite): string {
    const sections: string[] = [];

    // Enhanced Header
    sections.push(`# ${suite.title}\n`);
    sections.push('> **Enterprise-Ready Manual Test Documentation**\n');
    sections.push(`> Generated on: ${this.formatDate(suite.created)}\n`);
    sections.push(`> Version: ${suite.version}\n\n`);

    // Executive Summary
    if (this.professionalOptions.includeExecutiveSummary && suite.executiveSummary) {
      sections.push('## 📊 Executive Summary\n');
      sections.push(`This professional test manual contains **${suite.executiveSummary.totalTests} test procedures** covering **${suite.executiveSummary.coverageAreas.length} functional areas**.\n\n`);
      sections.push(`**Key Metrics:**\n`);
      sections.push(`- Total Test Cases: ${suite.executiveSummary.totalTests}\n`);
      sections.push(`- Estimated Execution Time: ${suite.executiveSummary.estimatedExecutionTime} minutes\n`);
      sections.push(`- Coverage Areas: ${suite.executiveSummary.coverageAreas.join(', ')}\n\n`);
    }

    // Professional Table of Contents
    if (this.professionalOptions.includeRoleBasedOrganization && suite.tableOfContents) {
      sections.push('## 📚 Table of Contents\n');
      suite.tableOfContents.forEach(entry => {
        sections.push(`### ${entry.title}\n`);
        if (entry.children) {
          entry.children.forEach(child => {
            sections.push(`- [${child.title}](#${child.anchor})\n`);
          });
        }
        sections.push('\n');
      });
    }

    // Role-based Test Organization
    const roleGroups = this.groupTestsByRole(suite.testCases);
    
    roleGroups.forEach((tests, role) => {
      sections.push(`# ${this.getRoleIcon(role)} ${role} Test Procedures\n\n`);
      sections.push(`*Specialized procedures for ${role.toLowerCase()} persona*\n\n`);

      tests.forEach(test => {
        sections.push(...this.formatProfessionalTestCase(test));
      });
    });

    // Support Information
    if (this.professionalOptions.includeSupportInfo && suite.supportInformation) {
      sections.push('## 📞 Support & Resources\n\n');
      sections.push('For technical assistance and additional resources:\n\n');
      sections.push(`- 📧 **Contact**: ${suite.supportInformation.contactInfo}\n`);
      sections.push(`- 📖 **Documentation**: ${suite.supportInformation.documentationLinks.join(', ')}\n`);
      sections.push(`- 🐛 **Issue Tracking**: ${suite.supportInformation.issueTracker}\n`);
      sections.push(`- 💬 **Community**: ${suite.supportInformation.communityLinks.join(', ')}\n\n`);
    }

    // Professional Footer
    sections.push('---\n\n');
    sections.push('## Document Information\n\n');
    sections.push(`**Generated**: ${this.formatDate(suite.created)}\n`);
    sections.push(`**Version**: ${suite.version}\n`);
    sections.push(`**Template**: Professional Enterprise Format\n`);
    sections.push(`**Quality Standard**: ISO 29119 Test Documentation Guidelines\n\n`);
    sections.push('*This document follows industry best practices for manual test documentation and is suitable for regulatory compliance and audit purposes.*\n');

    return sections.join('');
  }

  private groupTestsByRole(testCases: ProfessionalManualTest[]): Map<string, ProfessionalManualTest[]> {
    const groups = new Map<string, ProfessionalManualTest[]>();
    
    testCases.forEach(test => {
      const role = test.role || 'General';
      if (!groups.has(role)) {
        groups.set(role, []);
      }
      groups.get(role)!.push(test);
    });

    return groups;
  }

  private formatProfessionalTestCase(test: ProfessionalManualTest): string[] {
    const sections: string[] = [];

    sections.push(`## 📋 ${test.title}\n\n`);
    
    // Enhanced Metadata
    sections.push('### Test Information\n\n');
    sections.push(`| Attribute | Value |\n`);
    sections.push(`|-----------|-------|\n`);
    sections.push(`| **Test ID** | ${test.id} |\n`);
    sections.push(`| **Category** | ${test.category || 'General'} |\n`);
    sections.push(`| **Priority** | ${test.priority || 'Medium'} |\n`);
    sections.push(`| **Complexity** | ${test.complexityLevel || "Intermediate"} |\n`);
    sections.push(`| **Risk Level** | ${test.riskLevel || 'Medium'} |\n`);
    sections.push(`| **Estimated Time** | ${test.estimatedTime || 5} minutes |\n`);
    sections.push(`| **Business Value** | ${test.businessValue || 'Standard functionality'} |\n\n`);

    // Prerequisites
    if (test.prerequisites && test.prerequisites.length > 0) {
      sections.push('### 🔧 Prerequisites\n\n');
      test.prerequisites.forEach((prereq, index) => {
        sections.push(`${index + 1}. ${prereq}\n`);
      });
      sections.push('\n');
    }

    // Test Data
    if (test.testData && test.testData.length > 0) {
      sections.push('### 📊 Test Data\n\n');
      sections.push('| Parameter | Value | Description |\n');
      sections.push('|-----------|-------|-------------|\n');
      test.testData.forEach(data => {
        sections.push(`| ${data.name} | \`${data.value}\` | ${data.description || 'Test data'} |\n`);
      });
      sections.push('\n');
    }

    // Enhanced Test Steps
    sections.push('### 📝 Test Execution Steps\n\n');
    test.steps.forEach(step => {
      sections.push(`#### Step ${step.order}: ${step.action}\n\n`);
      
      if (step.element) {
        sections.push(`**Target Element**: \`${step.element}\`\n\n`);
      }
      
      if (step.testData) {
        sections.push(`**Input Data**: \`${step.testData}\`\n\n`);
      }
      
      sections.push(`**Expected Result**: ${step.expected}\n\n`);
      
      if (step.expectedValue && step.matcher) {
        sections.push(`**Verification**: ${step.matcher} "${step.expectedValue}"\n\n`);
      }
      
      if (step.captureReference) {
        sections.push(`**Visual Reference**: ![${step.captureReference.caption}](screenshots/${step.captureReference.fileName})\n\n`);
      }
      
      if (step.note) {
        sections.push(`> **Note**: ${step.note}\n\n`);
      }
      
      sections.push('---\n\n');
    });

    // Troubleshooting
    if (this.professionalOptions.includeTroubleshooting && test.troubleshooting && test.troubleshooting.length > 0) {
      sections.push('### 🔧 Troubleshooting\n\n');
      test.troubleshooting.forEach(trouble => {
        sections.push(`**Issue**: ${trouble.issue}\n\n`);
        sections.push(`**Solution**:\n${trouble.solution}\n\n`);
        sections.push(`**Category**: ${trouble.category}\n\n`);
        sections.push('---\n\n');
      });
    }

    // Visual Guide
    if (this.professionalOptions.includeVisualGuides && test.visualGuide && test.visualGuide.length > 0) {
      sections.push('### 📷 Visual Guide\n\n');
      test.visualGuide.forEach(visual => {
        sections.push(`![${visual.caption}](screenshots/${visual.screenshot})\n\n`);
        sections.push(`*${visual.caption}*\n\n`);
      });
    }

    sections.push('\n---\n\n');
    return sections;
  }
}

export class EnhancedHTMLFormatter extends ProfessionalFormatter {
  format(document: TestDocument): string {
    const professionalSuite = this.transformToProfessionalSuite(document);
    return this.generateProfessionalHTML(professionalSuite);
  }

  private generateProfessionalHTML(suite: ProfessionalManualSuite): string {
    const style = this.getProfessionalStyles();
    const content = this.generateProfessionalHTMLContent(suite);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${suite.title}</title>
    <style>${style}</style>
</head>
<body>
    <div class="container">
        ${content}
    </div>
</body>
</html>`;
  }

  private getProfessionalStyles(): string {
    return `
        :root {
            --primary-color: #2c3e50;
            --secondary-color: #3498db;
            --success-color: #27ae60;
            --warning-color: #f39c12;
            --danger-color: #e74c3c;
            --light-gray: #ecf0f1;
            --dark-gray: #95a5a6;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: var(--primary-color);
            background-color: #f8f9fa;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px 20px;
            background-color: white;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            border-radius: 8px;
        }
        
        h1 {
            color: var(--primary-color);
            border-bottom: 3px solid var(--secondary-color);
            padding-bottom: 15px;
            margin-bottom: 30px;
            font-size: 2.5em;
        }
        
        h2 {
            color: var(--secondary-color);
            border-left: 4px solid var(--secondary-color);
            padding-left: 15px;
            margin: 30px 0 20px 0;
            font-size: 1.8em;
        }
        
        h3 {
            color: var(--primary-color);
            margin: 25px 0 15px 0;
            font-size: 1.3em;
        }
        
        .executive-summary {
            background: linear-gradient(135deg, var(--light-gray) 0%, #ffffff 100%);
            padding: 25px;
            border-radius: 8px;
            border-left: 5px solid var(--secondary-color);
            margin: 20px 0;
        }
        
        .test-case {
            border: 1px solid #e0e0e0;
            border-radius: 10px;
            padding: 30px;
            margin: 30px 0;
            background: #ffffff;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        
        .test-step {
            margin: 20px 0;
            padding: 20px;
            background: #f8f9fa;
            border-left: 4px solid var(--secondary-color);
            border-radius: 5px;
        }
        
        .step-action {
            font-weight: 600;
            color: var(--primary-color);
            margin-bottom: 10px;
        }
        
        .step-expected {
            color: var(--success-color);
            font-weight: 500;
            margin-bottom: 10px;
        }
        
        .step-metadata {
            font-size: 0.9em;
            color: var(--dark-gray);
        }
        
        .metadata-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: white;
        }
        
        .metadata-table th,
        .metadata-table td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        
        .metadata-table th {
            background: var(--light-gray);
            font-weight: 600;
            color: var(--primary-color);
        }
        
        .priority-high { border-left-color: var(--danger-color) !important; }
        .priority-medium { border-left-color: var(--warning-color) !important; }
        .priority-low { border-left-color: var(--dark-gray) !important; }
        
        .role-section {
            margin: 40px 0;
            padding: 30px;
            background: linear-gradient(135deg, #ffffff 0%, var(--light-gray) 100%);
            border-radius: 10px;
        }
        
        .support-section {
            background: var(--light-gray);
            padding: 25px;
            border-radius: 8px;
            margin: 30px 0;
        }
        
        .troubleshooting {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 5px;
            padding: 15px;
            margin: 15px 0;
        }
        
        .visual-guide img {
            max-width: 100%;
            height: auto;
            border: 1px solid #ddd;
            border-radius: 5px;
            margin: 10px 0;
        }
        
        code {
            background: #f1f2f6;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Monaco', 'Menlo', monospace;
        }
        
        blockquote {
            border-left: 4px solid var(--warning-color);
            padding-left: 15px;
            margin: 15px 0;
            font-style: italic;
            color: var(--dark-gray);
        }
        
        .toc {
            background: var(--light-gray);
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        
        .toc ul {
            list-style-type: none;
            padding-left: 0;
        }
        
        .toc li {
            margin: 8px 0;
            padding-left: 20px;
        }
        
        .toc a {
            text-decoration: none;
            color: var(--secondary-color);
            font-weight: 500;
        }
        
        .toc a:hover {
            text-decoration: underline;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 20px 10px;
            }
            
            h1 { font-size: 2em; }
            h2 { font-size: 1.5em; }
            
            .test-case {
                padding: 20px;
            }
        }
    `;
  }

  private generateProfessionalHTMLContent(suite: ProfessionalManualSuite): string {
    // This would generate the actual HTML content similar to the markdown version
    // but with proper HTML structure and CSS classes
    return `<h1>${suite.title}</h1>
    <!-- HTML content would be generated here similar to the markdown version -->
    <p>Professional HTML content generation...</p>`;
  }
}