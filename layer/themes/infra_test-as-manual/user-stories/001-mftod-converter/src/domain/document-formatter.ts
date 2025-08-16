/**
 * Document formatters for converting test documents to various formats
 */

import { TestDocument, TestSuite, TestCase, FormatOptions } from './types';

export abstract class DocumentFormatter {
  protected options: FormatOptions;

  constructor(options: FormatOptions = {}) {
    this.options = {
      includeTableOfContents: true,
      includeIndex: true,
      includeGlossary: false,
      styling: 'default',
      ...options
    };
  }

  abstract format(document: TestDocument): string;

  protected formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  protected generateTableOfContents(document: TestDocument): string[] {
    const toc: string[] = [];
    
    document.suites.forEach((suite, idx) => {
      toc.push(`${idx + 1}. ${suite.title}`);
      suite.testCases.forEach((test, testIdx) => {
        toc.push(`   ${idx + 1}.${testIdx + 1} ${test.title}`);
      });
      
      if (suite.childSuites) {
        this.addChildSuitesToToc(suite.childSuites, toc, `${idx + 1}`);
      }
    });
    
    return toc;
  }

  private addChildSuitesToToc(suites: TestSuite[], toc: string[], prefix: string): void {
    suites.forEach((suite, idx) => {
      const fullPrefix = `${prefix}.${idx + 1}`;
      toc.push(`   ${fullPrefix} ${suite.title}`);
      
      suite.testCases.forEach((test, testIdx) => {
        toc.push(`      ${fullPrefix}.${testIdx + 1} ${test.title}`);
      });
      
      if (suite.childSuites) {
        this.addChildSuitesToToc(suite.childSuites, toc, fullPrefix);
      }
    });
  }

  protected generateTestIndex(document: TestDocument): Map<string, string> {
    const index = new Map<string, string>();
    
    const processTestCase = (test: TestCase, suitePath: string) => {
      index.set(test.id, `${suitePath} > ${test.title}`);
    };
    
    const processSuite = (suite: TestSuite, path: string = '') => {
      const currentPath = path ? `${path} > ${suite.title}` : suite.title;
      
      suite.testCases.forEach(test => processTestCase(test, currentPath));
      
      if (suite.childSuites) {
        suite.childSuites.forEach(child => processSuite(child, currentPath));
      }
    };
    
    document.suites.forEach(suite => processSuite(suite));
    
    return index;
  }
}

export class MarkdownFormatter extends DocumentFormatter {
  format(document: TestDocument): string {
    const sections: string[] = [];
    
    // Header
    sections.push(`# ${document.title}`);
    sections.push('');
    sections.push(`**Generated**: ${this.formatDate(document.created)}`);
    
    if (document.metadata) {
      sections.push(`**Source**: ${document.metadata.source}`);
      sections.push(`**Framework**: ${document.metadata.framework}`);
    }
    
    sections.push('');
    sections.push('---');
    sections.push('');
    
    // Table of Contents
    if (this.options.includeTableOfContents) {
      sections.push('## Table of Contents');
      sections.push('');
      this.generateTableOfContents(document).forEach(item => {
        sections.push(item);
      });
      sections.push('');
      sections.push('---');
      sections.push('');
    }
    
    // Test Suites
    document.suites.forEach(suite => {
      sections.push(...this.formatSuite(suite, 2));
    });
    
    // Test Index
    if (this.options.includeIndex) {
      sections.push('---');
      sections.push('');
      sections.push('## Test Index');
      sections.push('');
      const index = this.generateTestIndex(document);
      Array.from(index.entries()).forEach(([id, path]) => {
        sections.push(`- **${id}**: ${path}`);
      });
    }
    
    return sections.join('\n');
  }

  private formatSuite(suite: TestSuite, level: number): string[] {
    const sections: string[] = [];
    const heading = '#'.repeat(level);
    
    sections.push(`${heading} ${suite.title}`);
    sections.push('');
    
    if (suite.description) {
      sections.push(suite.description);
      sections.push('');
    }
    
    // Setup
    if (suite.setup && suite.setup.length > 0) {
      sections.push(`${heading}# Setup`);
      sections.push('');
      suite.setup.forEach(step => {
        sections.push(`${step.order}. ${step.action}`);
        sections.push(`   - **Expected**: ${step.expected}`);
      });
      sections.push('');
    }
    
    // Test Cases
    suite.testCases.forEach(test => {
      sections.push(...this.formatTestCase(test, level + 1));
    });
    
    // Child Suites
    if (suite.childSuites) {
      suite.childSuites.forEach(child => {
        sections.push(...this.formatSuite(child, level + 1));
      });
    }
    
    // Teardown
    if (suite.teardown && suite.teardown.length > 0) {
      sections.push(`${heading}# Teardown`);
      sections.push('');
      suite.teardown.forEach(step => {
        sections.push(`${step.order}. ${step.action}`);
        sections.push(`   - **Expected**: ${step.expected}`);
      });
      sections.push('');
    }
    
    return sections;
  }

  private formatTestCase(test: TestCase, level: number): string[] {
    const sections: string[] = [];
    const heading = '#'.repeat(level);
    
    sections.push(`${heading} Test Case: ${test.title}`);
    sections.push('');
    
    // Metadata
    sections.push(`**ID**: ${test.id}`);
    if (test.category) sections.push(`**Category**: ${test.category}`);
    if (test.priority) sections.push(`**Priority**: ${test.priority}`);
    if (test.async) sections.push(`**Type**: Asynchronous`);
    sections.push('');
    
    // Description
    if (test.description) {
      sections.push('### Objective');
      sections.push(test.description);
      sections.push('');
    }
    
    // Prerequisites
    if (test.prerequisites && test.prerequisites.length > 0) {
      sections.push('### Prerequisites');
      test.prerequisites.forEach((prereq, idx) => {
        sections.push(`${idx + 1}. ${prereq}`);
      });
      sections.push('');
    }
    
    // Test Data
    if (test.testData && test.testData.length > 0) {
      sections.push('### Test Data');
      test.testData.forEach(data => {
        sections.push(`- **${data.name}**: ${JSON.stringify(data.value)}`);
        if (data.description) {
          sections.push(`  - ${data.description}`);
        }
      });
      sections.push('');
    }
    
    // Test Steps
    sections.push('### Test Steps');
    sections.push('');
    test.steps.forEach(step => {
      sections.push(`#### Step ${step.order}: ${step.action}`);
      
      // Enhanced step information
      if (step.element) {
        sections.push(`**UI Element**: \`${step.element}\``);
      }
      if (step.testData) {
        sections.push(`**Test Data**: \`${step.testData}\``);
      }
      if (step.interactionType) {
        sections.push(`**Action Type**: ${step.interactionType}`);
      }
      
      sections.push(`**Expected Result**: ${step.expected}`);
      
      if (step.expectedValue && step.matcher) {
        sections.push(`**Verification**: ${step.matcher} "${step.expectedValue}"`);
      }
      if (step.verificationElement) {
        sections.push(`**Verification Element**: \`${step.verificationElement}\``);
      }
      if (step.note) {
        sections.push(`> Note: ${step.note}`);
      }
      sections.push('');
    });
    
    // Cleanup
    if (test.cleanup && test.cleanup.length > 0) {
      sections.push('### Cleanup');
      test.cleanup.forEach((step, idx) => {
        sections.push(`${idx + 1}. ${step}`);
      });
      sections.push('');
    }
    
    return sections;
  }
}

export class HTMLFormatter extends DocumentFormatter {
  format(document: TestDocument): string {
    const style = this.getStyles();
    const content = this.generateContent(document);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${document.title}</title>
    <style>${style}</style>
</head>
<body>
    <div class="container">
        ${content}
    </div>
</body>
</html>`;
  }

  private getStyles(): string {
    const baseStyles = `
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1, h2, h3, h4 {
            color: #2c3e50;
            margin-top: 24px;
            margin-bottom: 16px;
        }
        .metadata {
            color: #666;
            font-size: 14px;
            margin-bottom: 20px;
        }
        .test-case {
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            background-color: #fafafa;
        }
        .test-step {
            margin-bottom: 16px;
            padding: 12px;
            background-color: white;
            border-left: 4px solid #3498db;
        }
        .expected {
            color: #27ae60;
            font-weight: 500;
        }
        .priority-high {
            border-left-color: #e74c3c !important;
        }
        .priority-medium {
            border-left-color: #f39c12 !important;
        }
        .priority-low {
            border-left-color: #95a5a6 !important;
        }
        table {
            width: Improving;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
            font-weight: bold;
        }
    `;

    if (this.options.styling === 'minimal') {
      return baseStyles.replace('#3498db', '#000').replace('#e74c3c', '#666');
    }
    
    return baseStyles;
  }

  private generateContent(document: TestDocument): string {
    const sections: string[] = [];
    
    // Header
    sections.push(`<h1>${document.title}</h1>`);
    sections.push('<div class="metadata">');
    sections.push(`<p>Generated: ${this.formatDate(document.created)}</p>`);
    if (document.metadata) {
      sections.push(`<p>Source: <code>${document.metadata.source}</code></p>`);
      sections.push(`<p>Framework: ${document.metadata.framework}</p>`);
    }
    sections.push('</div>');
    
    // Table of Contents
    if (this.options.includeTableOfContents) {
      sections.push('<nav class="toc">');
      sections.push('<h2>Table of Contents</h2>');
      sections.push('<ul>');
      this.generateTableOfContents(document).forEach(item => {
        const indent = (item.match(/^\s+/) || [''])[0].length;
        sections.push(`<li style="margin-left: ${indent * 10}px">${item.trim()}</li>`);
      });
      sections.push('</ul>');
      sections.push('</nav>');
    }
    
    // Test Suites
    document.suites.forEach(suite => {
      sections.push(this.formatSuiteHTML(suite));
    });
    
    return sections.join('\n');
  }

  private formatSuiteHTML(suite: TestSuite): string {
    const sections: string[] = [];
    
    sections.push(`<section class="test-suite">`);
    sections.push(`<h2>${suite.title}</h2>`);
    
    if (suite.description) {
      sections.push(`<p>${suite.description}</p>`);
    }
    
    // Test Cases
    suite.testCases.forEach(test => {
      sections.push(this.formatTestCaseHTML(test));
    });
    
    // Child Suites
    if (suite.childSuites) {
      suite.childSuites.forEach(child => {
        sections.push(this.formatSuiteHTML(child));
      });
    }
    
    sections.push('</section>');
    
    return sections.join('\n');
  }

  private formatTestCaseHTML(test: TestCase): string {
    const priorityClass = test.priority ? `priority-${test.priority}` : '';
    
    return `
    <div class="test-case ${priorityClass}">
        <h3>${test.title}</h3>
        <div class="test-metadata">
            <span><strong>ID:</strong> ${test.id}</span>
            ${test.category ? `<span><strong>Category:</strong> ${test.category}</span>` : ''}
            ${test.priority ? `<span><strong>Priority:</strong> ${test.priority}</span>` : ''}
        </div>
        
        <h4>Test Steps</h4>
        ${test.steps.map(step => `
            <div class="test-step ${step.interactionType ? 'step-' + step.interactionType : ''}">
                <h5>Step ${step.order}: ${step.action}</h5>
                ${step.element ? `<p><strong>UI Element:</strong> <code>${step.element}</code></p>` : ''}
                ${step.testData ? `<p><strong>Test Data:</strong> <code>${step.testData}</code></p>` : ''}
                ${step.interactionType ? `<p><strong>Action Type:</strong> ${step.interactionType}</p>` : ''}
                <p class="expected"><strong>Expected Result:</strong> ${step.expected}</p>
                ${step.expectedValue && step.matcher ? `<p><strong>Verification:</strong> ${step.matcher} "${step.expectedValue}"</p>` : ''}
                ${step.verificationElement ? `<p><strong>Verification Element:</strong> <code>${step.verificationElement}</code></p>` : ''}
                ${step.note ? `<p><em>Note: ${step.note}</em></p>` : ''}
            </div>
        `).join('')}
    </div>`;
  }
}

export class JSONFormatter extends DocumentFormatter {
  format(document: TestDocument): string {
    return JSON.stringify(document, null, 2);
  }
}