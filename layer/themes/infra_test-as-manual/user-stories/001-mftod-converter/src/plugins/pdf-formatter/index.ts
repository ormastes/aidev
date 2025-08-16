/**
 * PDF Formatter Plugin
 * Generates professional PDF documentation from manual test suites
 */

import { BaseFormatterPlugin } from '../../logic/plugin/PluginSystem';
import { ManualTestSuite, ManualTest } from '../../logic/entities/ManualTest';

export default class PDFFormatterPlugin extends BaseFormatterPlugin {
  name = 'pdf-formatter';
  version = '1.0.0';
  description = 'Generate professional PDF test documentation';
  format = 'pdf';
  supportedFormats = ['pdf'];

  format(suite: ManualTestSuite, options?: any): Promise<string> {
    // In a real implementation, this would use a PDF library like pdfkit or puppeteer
    // For now, we'll generate HTML that can be converted to PDF
    
    const html = this.generatePDFHTML(suite, options);
    
    // In production, this would:
    // 1. Use puppeteer to render HTML to PDF
    // 2. Apply professional styling
    // 3. Add headers, footers, page numbers
    // 4. Return the PDF file path or buffer
    
    return html;
  }

  getFileExtension(): string {
    return 'pdf';
  }

  private generatePDFHTML(suite: ManualTestSuite, options: any = {}): string {
    const coverPage = this.generateCoverPage(suite);
    const tableOfContents = this.generateTableOfContents(suite);
    const executiveSummary = this.generateExecutiveSummary(suite);
    const testProcedures = this.generateTestProcedures(suite);
    const appendices = this.generateAppendices(suite);

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${suite.title} - Test Documentation</title>
    <style>
        @page {
            size: A4;
            margin: 2cm;
            @top-center {
                content: "${suite.title}";
                font-size: 10pt;
                color: #666;
            }
            @bottom-center {
                content: "Page " counter(page) " of " counter(pages);
                font-size: 10pt;
                color: #666;
            }
        }
        
        body {
            font-family: 'Arial', "Helvetica", sans-serif;
            line-height: 1.6;
            color: #333;
            font-size: 11pt;
        }
        
        .page-break {
            page-break-after: always;
        }
        
        .cover-page {
            text-align: center;
            padding-top: 200px;
            page-break-after: always;
        }
        
        .cover-page h1 {
            font-size: 36pt;
            margin-bottom: 20px;
            color: #1a5490;
        }
        
        .cover-page .subtitle {
            font-size: 18pt;
            color: #666;
            margin-bottom: 50px;
        }
        
        .metadata {
            margin-top: 100px;
            font-size: 12pt;
        }
        
        h1 { 
            font-size: 24pt; 
            color: #1a5490;
            margin-top: 0;
            page-break-before: always;
        }
        
        h2 { 
            font-size: 18pt; 
            color: #2b5f8e;
            margin-top: 30px;
        }
        
        h3 { 
            font-size: 14pt; 
            color: #3a6f9e;
            margin-top: 20px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        
        th {
            background-color: #f5f5f5;
            font-weight: bold;
        }
        
        .test-procedure {
            margin-bottom: 40px;
            page-break-inside: avoid;
        }
        
        .test-step {
            margin: 15px 0;
            padding: 10px;
            background: #f9f9f9;
            border-left: 3px solid #1a5490;
        }
        
        .step-number {
            font-weight: bold;
            color: #1a5490;
            margin-right: 10px;
        }
        
        .expected-result {
            color: #666;
            font-style: italic;
            margin-top: 5px;
        }
        
        .toc-entry {
            margin: 10px 0;
        }
        
        .toc-page {
            float: right;
        }
        
        .warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
        }
        
        .info {
            background: #d1ecf1;
            border: 1px solid #bee5eb;
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
        }
        
        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 10pt;
            color: #666;
        }
    </style>
</head>
<body>
    ${coverPage}
    ${tableOfContents}
    ${executiveSummary}
    ${testProcedures}
    ${appendices}
</body>
</html>
    `;
  }

  private generateCoverPage(suite: ManualTestSuite): string {
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
<div class="cover-page">
    <h1>${suite.title}</h1>
    <div class="subtitle">Manual Test Documentation</div>
    
    <div class="metadata">
        <p><strong>Generated:</strong> ${date}</p>
        <p><strong>Total Procedures:</strong> ${suite.procedures.length + suite.commonProcedures.length}</p>
        <p><strong>Test Sequences:</strong> ${suite.sequences.length}</p>
        <p><strong>Document Version:</strong> 1.0</p>
    </div>
    
    <div class="footer">
        <p>Confidential - For Internal Use Only</p>
    </div>
</div>
    `;
  }

  private generateTableOfContents(suite: ManualTestSuite): string {
    let toc = '<div class="page-break"></div>\n<h1>Table of Contents</h1>\n';
    
    toc += '<div class="toc-entry">1. Executive Summary <span class="toc-page">3</span></div>\n';
    toc += '<div class="toc-entry">2. Test Procedures <span class="toc-page">4</span></div>\n';
    
    if (suite.commonProcedures.length > 0) {
      toc += '<div class="toc-entry" style="margin-left: 20px">2.1 Common Procedures <span class="toc-page">4</span></div>\n';
    }
    
    const categories = this.groupByCategory(suite.procedures);
    let sectionNum = suite.commonProcedures.length > 0 ? 2 : 1;
    
    for (const category of Object.keys(categories)) {
      toc += `<div class="toc-entry" style="margin-left: 20px">2.${sectionNum} ${category} <span class="toc-page">-</span></div>\n`;
      sectionNum++;
    }
    
    if (suite.sequences.length > 0) {
      toc += '<div class="toc-entry">3. Test Sequences <span class="toc-page">-</span></div>\n';
    }
    
    toc += '<div class="toc-entry">4. Appendices <span class="toc-page">-</span></div>\n';
    
    return toc;
  }

  private generateExecutiveSummary(suite: ManualTestSuite): string {
    const totalTime = [...suite.procedures, ...suite.commonProcedures]
      .reduce((sum, test) => sum + test.estimatedTime, 0);
    const hours = Math.round(totalTime / 60 * 10) / 10;

    return `
<div class="page-break"></div>
<h1>1. Executive Summary</h1>

<p>This document contains ${suite.procedures.length + suite.commonProcedures.length} manual test procedures 
designed to validate the functionality, reliability, and quality of the system under test.</p>

<h2>Key Metrics</h2>
<table>
    <tr>
        <th>Metric</th>
        <th>Value</th>
    </tr>
    <tr>
        <td>Total Test Procedures</td>
        <td>${suite.procedures.length + suite.commonProcedures.length}</td>
    </tr>
    <tr>
        <td>Common Procedures</td>
        <td>${suite.commonProcedures.length}</td>
    </tr>
    <tr>
        <td>Test Sequences</td>
        <td>${suite.sequences.length}</td>
    </tr>
    <tr>
        <td>Estimated Execution Time</td>
        <td>${hours} hours</td>
    </tr>
</table>

<h2>Test Coverage</h2>
<p>The test procedures in this document cover the following areas:</p>
<ul>
    ${this.getCoverageAreas(suite).map(area => `<li>${area}</li>`).join('\n')}
</ul>

<div class="info">
    <strong>Note:</strong> This document is generated from automated test specifications and should be reviewed 
    by QA personnel before execution.
</div>
    `;
  }

  private generateTestProcedures(suite: ManualTestSuite): string {
    let content = '<div class="page-break"></div>\n<h1>2. Test Procedures</h1>\n';

    // Common procedures first
    if (suite.commonProcedures.length > 0) {
      content += '<h2>2.1 Common Procedures</h2>\n';
      content += '<p>These procedures are referenced multiple times throughout the test suite.</p>\n';
      
      suite.commonProcedures.forEach(proc => {
        content += this.formatTestProcedure(proc);
      });
    }

    // Group by category
    const categories = this.groupByCategory(suite.procedures);
    let sectionNum = suite.commonProcedures.length > 0 ? 2 : 1;

    for (const [category, procedures] of Object.entries(categories)) {
      content += `<h2>2.${sectionNum} ${category}</h2>\n`;
      procedures.forEach(proc => {
        content += this.formatTestProcedure(proc);
      });
      sectionNum++;
    }

    return content;
  }

  private formatTestProcedure(test: ManualTest): string {
    let html = `<div class="test-procedure">\n`;
    html += `<h3>${test.title}</h3>\n`;
    
    // Metadata table
    html += `
<table>
    <tr>
        <td><strong>Test ID:</strong></td>
        <td>${test.id}</td>
        <td><strong>Priority:</strong></td>
        <td>${test.priority.toUpperCase()}</td>
    </tr>
    <tr>
        <td><strong>Category:</strong></td>
        <td>${test.category}</td>
        <td><strong>Est. Time:</strong></td>
        <td>${test.estimatedTime} minutes</td>
    </tr>
</table>
    `;

    // Description
    if (test.description) {
      html += `<p><strong>Description:</strong> ${test.description}</p>\n`;
    }

    // Prerequisites
    if (test.prerequisites.length > 0) {
      html += '<h4>Prerequisites</h4>\n<ul>\n';
      test.prerequisites.forEach(prereq => {
        html += `<li>${prereq}</li>\n`;
      });
      html += '</ul>\n';
    }

    // Test steps
    html += '<h4>Test Steps</h4>\n';
    test.testSteps.forEach(step => {
      html += `
<div class="test-step">
    <div><span class="step-number">Step ${step.order}:</span> ${step.instruction}</div>
    <div class="expected-result">Expected: ${step.expected}</div>
</div>
      `;
    });

    // Cleanup
    if (test.cleanupSteps.length > 0) {
      html += '<h4>Cleanup</h4>\n<ul>\n';
      test.cleanupSteps.forEach(cleanup => {
        html += `<li>${cleanup}</li>\n`;
      });
      html += '</ul>\n';
    }

    html += '</div>\n';
    return html;
  }

  private generateAppendices(suite: ManualTestSuite): string {
    return `
<div class="page-break"></div>
<h1>4. Appendices</h1>

<h2>A. Glossary</h2>
<table>
    <tr>
        <th>Term</th>
        <th>Definition</th>
    </tr>
    <tr>
        <td>Test Case</td>
        <td>A set of conditions or variables used to determine if a system works correctly</td>
    </tr>
    <tr>
        <td>Test Suite</td>
        <td>A collection of test cases that are grouped together</td>
    </tr>
    <tr>
        <td>Prerequisites</td>
        <td>Conditions that must be met before executing a test</td>
    </tr>
</table>

<h2>B. Document History</h2>
<table>
    <tr>
        <th>Version</th>
        <th>Date</th>
        <th>Author</th>
        <th>Changes</th>
    </tr>
    <tr>
        <td>1.0</td>
        <td>${new Date().toLocaleDateString()}</td>
        <td>Test-as-Manual Converter</td>
        <td>Initial generation</td>
    </tr>
</table>

<h2>C. References</h2>
<ul>
    <li>Original test specifications</li>
    <li>System requirements documentation</li>
    <li>Test automation framework documentation</li>
</ul>
    `;
  }

  private groupByCategory(procedures: ManualTest[]): Record<string, ManualTest[]> {
    const groups: Record<string, ManualTest[]> = {};
    
    procedures.forEach(proc => {
      if (!groups[proc.category]) {
        groups[proc.category] = [];
      }
      groups[proc.category].push(proc);
    });
    
    return groups;
  }

  private getCoverageAreas(suite: ManualTestSuite): string[] {
    const areas = new Set<string>();
    const allTests = [...suite.procedures, ...suite.commonProcedures];
    
    allTests.forEach(test => {
      areas.add(test.category);
    });
    
    return Array.from(areas);
  }
}