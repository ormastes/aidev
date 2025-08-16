/**
 * File Writer Service - Outputs manual tests in various formats
 */

import { fsPromises as fs } from '../../../../infra_external-log-lib/src';
import { path } from '../../../../../../infra_external-log-lib/src';
import { ManualTestSuite, ManualTest, ManualTestStep } from '../../logic/entities/ManualTest';
import { getFileAPI, FileType } from '../../../../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


export type OutputFormat = 'markdown' | 'html' | 'json';

export class FileWriter {
  /**
   * Write manual test suite to file system
   */
  async writeManualTestSuite(
    suite: ManualTestSuite,
    outputPath: string,
    format: OutputFormat = 'markdown'
  ): Promise<void> {
    await fileAPI.createDirectory(outputPath);

    const fileName = `manual-test-suite.${this.getFileExtension(format)}`;
    const filePath = path.join(outputPath, fileName);

    let content: string;
    switch (format) {
      case 'markdown':
        content = this.generateMarkdown(suite);
        break;
      case 'html':
        content = this.generateHTML(suite);
        break;
      case 'json':
        content = JSON.stringify(suite, null, 2);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    await fileAPI.createFile(filePath, content, { type: FileType.TEMPORARY });
    }
  }

  /**
   * Write individual test files
   */
  private async writeIndividualTests(
    suite: ManualTestSuite,
    outputPath: string,
    format: OutputFormat
  ): Promise<void> {
    const testsDir = path.join(outputPath, 'tests');
    await fileAPI.createDirectory(testsDir);

    // Write common procedures
    if (suite.commonProcedures.length > 0) {
      const commonDir = path.join(testsDir, 'common');
      await fileAPI.createDirectory(commonDir);
      
      for (const procedure of suite.commonProcedures) {
        const fileName = `${this.sanitizeFileName(procedure.title)}.${this.getFileExtension(format)}`;
        const content = format === 'markdown' 
          ? this.generateMarkdownForTest(procedure)
          : this.generateHTMLForTest(procedure);
        await fileAPI.createFile(path.join(commonDir, fileName), { type: FileType.TEMPORARY }));
      await fileAPI.createDirectory(categoryDir);
      
      const fileName = `${this.sanitizeFileName(procedure.title)}.${this.getFileExtension(format)}`;
      const content = format === 'markdown'
        ? this.generateMarkdownForTest(procedure)
        : this.generateHTMLForTest(procedure);
      await fileAPI.createFile(path.join(categoryDir, fileName), { type: FileType.TEMPORARY });
      await fileAPI.createDirectory(sequencesDir);
      
      for (const sequence of suite.sequences) {
        const fileName = `${this.sanitizeFileName(sequence.name)}.${this.getFileExtension(format)}`;
        const content = format === 'markdown'
          ? this.generateMarkdownForSequence(sequence)
          : this.generateHTMLForSequence(sequence);
        await fileAPI.createFile(path.join(sequencesDir, fileName), { type: FileType.TEMPORARY })) {
      lines.push(`#### ${category}`);
      for (const proc of procs) {
        lines.push(`- [${proc.title}](#${this.generateAnchor(proc.title)})`);
      }
    }
    lines.push('');

    if (suite.sequences.length > 0) {
      lines.push('### Test Sequences');
      for (const seq of suite.sequences) {
        lines.push(`- [${seq.name}](#${this.generateAnchor(seq.name)})`);
      }
      lines.push('');
    }

    // Common Procedures
    if (suite.commonProcedures.length > 0) {
      lines.push('## Common Procedures');
      lines.push('');
      lines.push('These procedures are used across multiple test scenarios.');
      lines.push('');
      
      for (const proc of suite.commonProcedures) {
        lines.push(this.generateMarkdownForTest(proc));
        lines.push('');
      }
    }

    // Regular Procedures
    lines.push('## Test Procedures');
    lines.push('');
    
    for (const [category, procs] of Object.entries(categories)) {
      lines.push(`### ${category}`);
      lines.push('');
      
      for (const proc of procs) {
        lines.push(this.generateMarkdownForTest(proc));
        lines.push('');
      }
    }

    // Sequences
    if (suite.sequences.length > 0) {
      lines.push('## Test Sequences');
      lines.push('');
      
      for (const seq of suite.sequences) {
        lines.push(this.generateMarkdownForSequence(seq));
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate Markdown for individual test
   */
  private async generateMarkdownForTest(test: ManualTest): string {
    const lines: string[] = [];

    lines.push(`## ${test.title}`);
    lines.push('');
    lines.push(test.description);
    lines.push('');

    // Metadata table
    lines.push('| Property | Value |');
    lines.push('|----------|-------|');
    lines.push(`| **ID** | ${test.id} |`);
    lines.push(`| **Category** | ${test.category} |`);
    lines.push(`| **Priority** | ${test.priority} |`);
    lines.push(`| **Estimated Time** | ${test.estimatedTime} minutes |`);
    if (test.tags.length > 0) {
      lines.push(`| **Tags** | ${test.tags.join(', ')} |`);
    }
    lines.push('');

    // Prerequisites
    if (test.prerequisites.length > 0) {
      lines.push('### Prerequisites');
      lines.push('');
      for (const prereq of test.prerequisites) {
        lines.push(`- ${prereq}`);
      }
      lines.push('');
    }

    // Test Data
    if (test.testData.length > 0) {
      lines.push('### Test Data');
      lines.push('');
      lines.push('| Name | Value | Description |');
      lines.push('|------|-------|-------------|');
      for (const data of test.testData) {
        lines.push(`| ${data.name} | \`${data.value}\` | ${data.description || '-'} |`);
      }
      lines.push('');
    }

    // Setup Steps
    if (test.setupSteps.length > 0) {
      lines.push('### Setup Steps');
      lines.push('');
      for (const step of test.setupSteps) {
        lines.push(this.generateMarkdownForStep(step));
      }
      lines.push('');
    }

    // Test Steps
    lines.push('### Test Steps');
    lines.push('');
    for (const step of test.testSteps) {
      lines.push(this.generateMarkdownForStep(step));
    }
    lines.push('');

    // Cleanup Steps
    if (test.cleanupSteps.length > 0) {
      lines.push('### Cleanup');
      lines.push('');
      for (const cleanup of test.cleanupSteps) {
        lines.push(`- ${cleanup}`);
      }
      lines.push('');
    }

    // Notes
    if (test.notes) {
      lines.push('### Notes');
      lines.push('');
      lines.push(test.notes);
      lines.push('');
    }

    // Related Scenarios
    if (test.relatedScenarios.length > 0) {
      lines.push('### Related Scenarios');
      lines.push('');
      for (const related of test.relatedScenarios) {
        lines.push(`- ${related}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate Markdown for test step
   */
  private async generateMarkdownForStep(step: ManualTestStep): string {
    const lines: string[] = [];

    lines.push(`#### Step ${step.order}: ${step.instruction}`);
    lines.push('');

    if (step.inputData) {
      lines.push('**Input Data:**');
      lines.push('```');
      lines.push(step.inputData);
      lines.push('```');
      lines.push('');
    }

    if (step.testDataTable) {
      lines.push('**Data Table:**');
      lines.push('');
      lines.push('| ' + step.testDataTable.headers.join(' | ') + ' |');
      lines.push('|' + step.testDataTable.headers.map(() => '---').join('|') + '|');
      for (const row of step.testDataTable.rows) {
        lines.push('| ' + row.join(' | ') + ' |');
      }
      lines.push('');
    }

    lines.push(`**Expected Result:** ${step.expectedResult}`);
    lines.push('');

    if (step.notes) {
      lines.push(`> **Note:** ${step.notes}`);
      lines.push('');
    }

    if (step.isOptional) {
      lines.push('> *This step is optional*');
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate Markdown for sequence
   */
  private async generateMarkdownForSequence(sequence: any): string {
    const lines: string[] = [];

    lines.push(`## ${sequence.name}`);
    lines.push('');
    lines.push(sequence.description);
    lines.push('');

    if (sequence.isMainFlow) {
      lines.push('> **This is the main test flow**');
      lines.push('');
    }

    lines.push('### Sequence Steps');
    lines.push('');

    for (let i = 0; i < sequence.procedures.length; i++) {
      const proc = sequence.procedures[i];
      lines.push(`${i + 1}. **${proc.title}** (${proc.estimatedTime} min)`);
      lines.push(`   - Category: ${proc.category}`);
      lines.push(`   - Priority: ${proc.priority}`);
      if (proc.isCommon) {
        lines.push('   - *Common procedure*');
      }
      lines.push('');
    }

    const totalTime = sequence.procedures.reduce((sum: number, p: any) => sum + p.estimatedTime, 0);
    lines.push(`**Total Estimated Time:** ${totalTime} minutes`);

    return lines.join('\n');
  }

  /**
   * Generate HTML content
   */
  private async generateHTML(suite: ManualTestSuite): string {
    // Simplified HTML generation - in production, use a proper template engine
    return `<!DOCTYPE html>
<html>
<head>
    <title>${suite.title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1, h2, h3 { color: #333; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .metadata { background-color: #f9f9f9; padding: 10px; border-radius: 5px; }
        .step { margin: 10px 0; padding: 10px; border-left: 3px solid #4CAF50; }
        .optional { opacity: 0.7; }
        .priority-high { color: #d32f2f; }
        .priority-medium { color: #f57c00; }
        .priority-low { color: #388e3c; }
    </style>
</head>
<body>
    <h1>${suite.title}</h1>
    ${suite.description ? `<p>${suite.description}</p>` : ''}
    
    <div class="metadata">
        <h2>Test Suite Information</h2>
        <ul>
            <li><strong>Generated:</strong> ${suite.metadata.generatedAt.toLocaleString()}</li>
            <li><strong>Total Scenarios:</strong> ${suite.metadata.totalScenarios}</li>
            <li><strong>Total Sequences:</strong> ${suite.metadata.totalSequences}</li>
            <li><strong>Common Scenarios:</strong> ${suite.metadata.commonScenarioCount}</li>
        </ul>
    </div>
    
    <!-- More HTML content would go here -->
</body>
</html>`;
  }

  private async generateHTMLForTest(test: ManualTest): string {
    // Simplified - would be more complete in production
    return `<h2>${test.title}</h2>
<p>${test.description}</p>
<!-- More content -->`;
  }

  private async generateHTMLForSequence(sequence: any): string {
    // Simplified - would be more complete in production
    return `<h2>${sequence.name}</h2>
<p>${sequence.description}</p>
<!-- More content -->`;
  }

  // Helper methods
  private async getFileExtension(format: OutputFormat): string {
    switch (format) {
      case 'markdown': return 'md';
      case 'html': return 'html';
      case 'json': return 'json';
    }
  }

  private async sanitizeFileName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async generateAnchor(title: string): string {
    return this.sanitizeFileName(title);
  }

  private async groupByCategory(procedures: ManualTest[]): Record<string, ManualTest[]> {
    const groups: Record<string, ManualTest[]> = {};
    
    for (const proc of procedures) {
      if (!groups[proc.category]) {
        groups[proc.category] = [];
      }
      groups[proc.category].push(proc);
    }
    
    return groups;
  }
}