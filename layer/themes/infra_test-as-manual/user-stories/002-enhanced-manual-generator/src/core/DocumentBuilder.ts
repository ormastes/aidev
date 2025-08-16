/**
 * Document Builder for creating structured manual documentation
 * Builds comprehensive test documentation with TOC, index, and sections
 */

import {
  TestDocument,
  ParsedTest,
  TestMetadata,
  DocumentSection,
  TOCEntry,
  IndexEntry,
  GlossaryEntry,
  ManualGeneratorOptions,
  TestCase,
  TestSuite
} from './types';

export interface BuildContext {
  test: ParsedTest;
  metadata: TestMetadata;
  options: ManualGeneratorOptions;
}

export class DocumentBuilder {
  private documentCache: Map<string, TestDocument>;
  private indexTerms: Set<string>;
  private glossaryTerms: Map<string, string>;

  constructor() {
    this.documentCache = new Map();
    this.indexTerms = new Set();
    this.glossaryTerms = new Map();
    this.initializeGlossary();
  }

  /**
   * Build document from test and metadata
   */
  async build(context: BuildContext): Promise<TestDocument> {
    const { test, metadata, options } = context;
    
    // Check cache
    const cacheKey = `${test.id}-${JSON.stringify(options)}`;
    if (this.documentCache.has(cacheKey)) {
      return this.documentCache.get(cacheKey)!;
    }

    // Create document structure
    const document: TestDocument = {
      id: `doc-${test.id}`,
      title: this.generateTitle(test, metadata),
      version: metadata.version,
      generatedAt: new Date(),
      test,
      metadata,
      sections: []
    };

    // Build sections
    document.sections = this.buildSections(test, options);

    // Generate table of contents if requested
    if (options.generateTOC) {
      document.tableOfContents = this.generateTOC(document.sections);
    }

    // Generate index if requested
    if (options.generateIndex) {
      document.index = this.generateIndex(document);
    }

    // Add glossary if terms exist
    if (this.glossaryTerms.size > 0) {
      document.glossary = this.generateGlossary();
    }

    // Cache the document
    this.documentCache.set(cacheKey, document);

    return document;
  }

  /**
   * Export document in specific format
   */
  async export(document: TestDocument, format: 'html' | 'pdf' | "markdown" | 'json'): Promise<string> {
    // Use the new processors if available
    try {
      const { ProcessorFactory } = await import('../processors');
      const processor = ProcessorFactory.createProcessor(format, {});
      const result = await processor.process(document);
      if (result.success && result.output) {
        return result.output;
      }
    } catch (e) {
      // Fall back to basic implementation
    }
    
    switch (format) {
      case 'html':
        return this.exportHTML(document);
      case 'pdf':
        return this.exportPDF(document);
      case "markdown":
        return this.exportMarkdown(document);
      case 'json':
        return JSON.stringify(document, null, 2);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    this.documentCache.clear();
    this.indexTerms.clear();
  }

  private generateTitle(test: ParsedTest, metadata: TestMetadata): string {
    if (metadata.annotations?.find(a => a.type === 'title')) {
      return metadata.annotations.find(a => a.type === 'title')!.value;
    }
    
    return `${test.name} - Test Manual Documentation`;
  }

  private buildSections(test: ParsedTest, options: ManualGeneratorOptions): DocumentSection[] {
    const sections: DocumentSection[] = [];
    let sectionId = 0;

    // Overview section
    sections.push(this.createOverviewSection(test, sectionId++));

    // Prerequisites section if needed
    if (this.hasPrerequisites(test)) {
      sections.push(this.createPrerequisitesSection(test, sectionId++));
    }

    // Test suites as main sections
    test.suites.forEach(suite => {
      sections.push(this.createSuiteSection(suite, sectionId++, 1));
    });

    // Summary section
    sections.push(this.createSummarySection(test, sectionId++));

    // Appendices if needed
    if (options.includeMetadata && test.metadata) {
      sections.push(this.createAppendixSection(test, sectionId++));
    }

    return sections;
  }

  private createOverviewSection(test: ParsedTest, id: number): DocumentSection {
    const totalTests = this.countTestCases(test);
    const totalSteps = this.countSteps(test);
    
    return {
      id: `section-${id}`,
      title: "Overview",
      level: 1,
      content: `
This document provides comprehensive manual test documentation for ${test.name}.

**Test Statistics:**
- Total Test Suites: ${test.suites.length}
- Total Test Cases: ${totalTests}
- Total Test Steps: ${totalSteps}
- Test Type: ${test.type.toUpperCase()}

${test.description || 'This test suite ensures the functionality and reliability of the system components.'}
      `.trim()
    };
  }

  private createPrerequisitesSection(test: ParsedTest, id: number): DocumentSection {
    const prerequisites: string[] = [];
    
    // Collect all prerequisites from test cases
    test.suites.forEach(suite => {
      suite.testCases.forEach(testCase => {
        if (testCase.preconditions) {
          prerequisites.push(...testCase.preconditions);
        }
      });
    });

    // Remove duplicates
    const uniquePrerequisites = [...new Set(prerequisites)];

    return {
      id: `section-${id}`,
      title: "Prerequisites",
      level: 1,
      content: `
Before executing these tests, ensure the following prerequisites are met:

${uniquePrerequisites.map((prereq, index) => `${index + 1}. ${prereq}`).join('\n')}
      `.trim()
    };
  }

  private createSuiteSection(suite: TestSuite, id: number, level: number): DocumentSection {
    const section: DocumentSection = {
      id: `section-${id}`,
      title: suite.name,
      level,
      content: suite.description || `Test suite for ${suite.name} functionality.`,
      testCases: suite.testCases
    };

    // Add child suites as subsections
    if (suite.childSuites && suite.childSuites.length > 0) {
      section.subsections = suite.childSuites.map((childSuite, index) => 
        this.createSuiteSection(childSuite, id * 100 + index, level + 1)
      );
    }

    return section;
  }

  private createSummarySection(test: ParsedTest, id: number): DocumentSection {
    const stats = this.calculateStatistics(test);
    
    return {
      id: `section-${id}`,
      title: 'Test Execution Summary',
      level: 1,
      content: `
## Execution Guidelines

1. Execute tests in the order presented in this document
2. Document any deviations or issues encountered
3. Capture screenshots for failed test steps
4. Report results using the standard test report template

## Priority Distribution

- Critical: ${stats.critical} tests
- High: ${stats.high} tests
- Medium: ${stats.medium} tests
- Low: ${stats.low} tests

## Estimated Execution Time

Total estimated time: ${stats.estimatedTime} minutes

## Success Criteria

All critical and high priority tests must pass for the release to be approved.
Medium and low priority test failures should be documented and assessed for impact.
      `.trim()
    };
  }

  private createAppendixSection(test: ParsedTest, id: number): DocumentSection {
    return {
      id: `section-${id}`,
      title: 'Appendix - Metadata',
      level: 1,
      content: `
## Test Metadata

${JSON.stringify(test.metadata, null, 2)}
      `.trim()
    };
  }

  private generateTOC(sections: DocumentSection[]): TOCEntry[] {
    const tocEntries: TOCEntry[] = [];

    sections.forEach(section => {
      const entry: TOCEntry = {
        id: section.id,
        title: section.title,
        level: section.level,
        href: `#${section.id}`
      };

      // Add subsections
      if (section.subsections) {
        entry.children = this.generateTOC(section.subsections);
      }

      tocEntries.push(entry);
    });

    return tocEntries;
  }

  private generateIndex(document: TestDocument): IndexEntry[] {
    const index: Map<string, Set<string>> = new Map();

    // Extract terms from sections
    document.sections.forEach(section => {
      this.extractIndexTerms(section, index);
    });

    // Convert to IndexEntry array
    return Array.from(index.entries()).map(([term, references]) => ({
      term,
      references: Array.from(references)
    })).sort((a, b) => a.term.localeCompare(b.term));
  }

  private extractIndexTerms(section: DocumentSection, index: Map<string, Set<string>>): void {
    // Extract key terms from section title
    const titleTerms = this.extractKeyTerms(section.title);
    titleTerms.forEach(term => {
      if (!index.has(term)) {
        index.set(term, new Set());
      }
      index.get(term)!.add(section.id);
    });

    // Extract from test cases
    if (section.testCases) {
      section.testCases.forEach(testCase => {
        const caseTerms = this.extractKeyTerms(testCase.name);
        caseTerms.forEach(term => {
          if (!index.has(term)) {
            index.set(term, new Set());
          }
          index.get(term)!.add(section.id);
        });
      });
    }

    // Recurse through subsections
    if (section.subsections) {
      section.subsections.forEach(subsection => {
        this.extractIndexTerms(subsection, index);
      });
    }
  }

  private extractKeyTerms(text: string): string[] {
    // Simple term extraction - can be enhanced with NLP
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
    const terms = text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(term => term.length > 2 && !stopWords.has(term));
    
    return [...new Set(terms)];
  }

  private generateGlossary(): GlossaryEntry[] {
    return Array.from(this.glossaryTerms.entries()).map(([term, definition]) => ({
      term,
      definition
    })).sort((a, b) => a.term.localeCompare(b.term));
  }

  private initializeGlossary(): void {
    // Add common testing terms
    this.glossaryTerms.set("Assertion", 'A statement that checks if a condition is true');
    this.glossaryTerms.set('Test Case', 'A set of conditions or steps to verify specific functionality');
    this.glossaryTerms.set('Test Suite', 'A collection of related test cases');
    this.glossaryTerms.set("Precondition", 'A requirement that must be met before test execution');
    this.glossaryTerms.set("Postcondition", 'A state that should exist after test execution');
    this.glossaryTerms.set('Test Step', 'An individual action or verification in a test case');
    this.glossaryTerms.set('Expected Result', 'The anticipated outcome of a test step');
    this.glossaryTerms.set('Actual Result', 'The observed outcome of a test step');
  }

  private hasPrerequisites(test: ParsedTest): boolean {
    return test.suites.some(suite => 
      suite.testCases.some(testCase => 
        testCase.preconditions && testCase.preconditions.length > 0
      )
    );
  }

  private countTestCases(test: ParsedTest): number {
    let count = 0;
    test.suites.forEach(suite => {
      count += suite.testCases.length;
      if (suite.childSuites) {
        suite.childSuites.forEach(childSuite => {
          count += childSuite.testCases.length;
        });
      }
    });
    return count;
  }

  private countSteps(test: ParsedTest): number {
    let count = 0;
    test.suites.forEach(suite => {
      suite.testCases.forEach(testCase => {
        count += testCase.steps.length;
      });
      if (suite.childSuites) {
        suite.childSuites.forEach(childSuite => {
          childSuite.testCases.forEach(testCase => {
            count += testCase.steps.length;
          });
        });
      }
    });
    return count;
  }

  private calculateStatistics(test: ParsedTest): any {
    const stats = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      estimatedTime: 0
    };

    test.suites.forEach(suite => {
      suite.testCases.forEach(testCase => {
        switch (testCase.priority) {
          case "critical": stats.critical++; break;
          case 'high': stats.high++; break;
          case 'medium': stats.medium++; break;
          case 'low': stats.low++; break;
        }
        // Estimate 1 minute per step
        stats.estimatedTime += testCase.steps.length;
      });
    });

    return stats;
  }

  private exportHTML(document: TestDocument): string {
    // Basic HTML export - would be enhanced with proper templating
    return `
<!DOCTYPE html>
<html>
<head>
  <title>${document.title}</title>
  <meta charset="UTF-8">
</head>
<body>
  <h1>${document.title}</h1>
  ${document.sections.map(section => this.sectionToHTML(section)).join('\n')}
</body>
</html>
    `.trim();
  }

  private exportPDF(document: TestDocument): string {
    // PDF export would require a library like puppeteer or pdfkit
    // For now, return a placeholder
    return `PDF export for: ${document.title}`;
  }

  private exportMarkdown(document: TestDocument): string {
    const md: string[] = [];
    
    md.push(`# ${document.title}`);
    md.push('');
    
    if (document.version) {
      md.push(`**Version:** ${document.version}`);
    }
    md.push(`**Generated:** ${document.generatedAt.toISOString()}`);
    md.push('');

    // Add TOC if present
    if (document.tableOfContents) {
      md.push('## Table of Contents');
      md.push('');
      document.tableOfContents.forEach(entry => {
        md.push(`${'  '.repeat(entry.level - 1)}- [${entry.title}](${entry.href})`);
      });
      md.push('');
    }

    // Add sections
    document.sections.forEach(section => {
      md.push(this.sectionToMarkdown(section));
      md.push('');
    });

    return md.join('\n');
  }

  private sectionToHTML(section: DocumentSection): string {
    const html: string[] = [];
    
    html.push(`<h${section.level + 1} id="${section.id}">${section.title}</h${section.level + 1}>`);
    html.push(`<div>${section.content}</div>`);
    
    if (section.testCases) {
      html.push('<div class="test-cases">');
      section.testCases.forEach(testCase => {
        html.push(this.testCaseToHTML(testCase));
      });
      html.push('</div>');
    }
    
    if (section.subsections) {
      section.subsections.forEach(subsection => {
        html.push(this.sectionToHTML(subsection));
      });
    }
    
    return html.join('\n');
  }

  private sectionToMarkdown(section: DocumentSection): string {
    const md: string[] = [];
    
    md.push(`${'#'.repeat(section.level + 1)} ${section.title}`);
    md.push('');
    md.push(section.content);
    
    if (section.testCases) {
      md.push('');
      section.testCases.forEach(testCase => {
        md.push(this.testCaseToMarkdown(testCase));
        md.push('');
      });
    }
    
    if (section.subsections) {
      section.subsections.forEach(subsection => {
        md.push(this.sectionToMarkdown(subsection));
      });
    }
    
    return md.join('\n');
  }

  private testCaseToHTML(testCase: TestCase): string {
    const html: string[] = [];
    
    html.push(`<div class="test-case">`);
    html.push(`<h4>${testCase.name}</h4>`);
    
    if (testCase.description) {
      html.push(`<p>${testCase.description}</p>`);
    }
    
    html.push('<ol>');
    testCase.steps.forEach(step => {
      html.push(`<li>${step.action}`);
      if (step.expected) {
        html.push(`<br><em>Expected: ${step.expected}</em>`);
      }
      html.push('</li>');
    });
    html.push('</ol>');
    
    html.push('</div>');
    
    return html.join('\n');
  }

  private testCaseToMarkdown(testCase: TestCase): string {
    const md: string[] = [];
    
    md.push(`#### ${testCase.name}`);
    
    if (testCase.description) {
      md.push(testCase.description);
      md.push('');
    }
    
    testCase.steps.forEach(step => {
      md.push(`${step.order}. ${step.action}`);
      if (step.expected) {
        md.push(`   - Expected: ${step.expected}`);
      }
    });
    
    return md.join('\n');
  }
}

export default DocumentBuilder;