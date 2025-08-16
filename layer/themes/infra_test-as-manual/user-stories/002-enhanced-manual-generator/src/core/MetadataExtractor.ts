/**
 * Metadata Extractor for test annotations and documentation
 * Extracts metadata from test files including JSDoc, comments, and annotations
 */

import { ParsedTest, TestMetadata, TestAnnotation, CoverageInfo } from './types';

export class MetadataExtractor {
  private annotationPatterns: Map<string, RegExp>;
  private metadataCache: Map<string, TestMetadata>;

  constructor() {
    this.annotationPatterns = new Map();
    this.metadataCache = new Map();
    this.registerDefaultPatterns();
  }

  /**
   * Extract metadata from parsed test
   */
  async extract(parsedTest: ParsedTest): Promise<TestMetadata> {
    // Check cache first
    if (this.metadataCache.has(parsedTest.id)) {
      return this.metadataCache.get(parsedTest.id)!;
    }

    const metadata: TestMetadata = {
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
      requirements: [],
      dependencies: [],
      annotations: []
    };

    // Extract from test structure
    this.extractFromTestStructure(parsedTest, metadata);

    // Extract from test metadata if present
    if (parsedTest.metadata) {
      this.mergeMetadata(metadata, parsedTest.metadata);
    }

    // Extract annotations from test cases
    this.extractAnnotations(parsedTest, metadata);

    // Calculate estimated duration
    metadata.estimatedDuration = this.calculateEstimatedDuration(parsedTest);

    // Extract coverage information if available
    metadata.coverage = this.extractCoverageInfo(parsedTest);

    // Cache the result
    this.metadataCache.set(parsedTest.id, metadata);

    return metadata;
  }

  /**
   * Extract metadata from source code
   */
  extractFromSource(sourceCode: string): Partial<TestMetadata> {
    const metadata: Partial<TestMetadata> = {
      tags: [],
      requirements: [],
      dependencies: [],
      annotations: []
    };

    // Extract JSDoc comments
    const jsdocRegex = /\/\*\*([\s\S]*?)\*\//g;
    let jsdocMatch;

    while ((jsdocMatch = jsdocRegex.exec(sourceCode)) !== null) {
      const jsdocContent = jsdocMatch[1];
      
      // Extract author
      const authorMatch = jsdocContent.match(/@author\s+(.+)/);
      if (authorMatch) {
        metadata.author = authorMatch[1].trim();
      }

      // Extract version
      const versionMatch = jsdocContent.match(/@version\s+(.+)/);
      if (versionMatch) {
        metadata.version = versionMatch[1].trim();
      }

      // Extract tags
      const tagMatches = jsdocContent.matchAll(/@tag\s+(.+)/g);
      for (const match of tagMatches) {
        metadata.tags?.push(match[1].trim());
      }

      // Extract requirements
      const reqMatches = jsdocContent.matchAll(/@requirement\s+(.+)/g);
      for (const match of reqMatches) {
        metadata.requirements?.push(match[1].trim());
      }

      // Extract dependencies
      const depMatches = jsdocContent.matchAll(/@dependency\s+(.+)/g);
      for (const match of depMatches) {
        metadata.dependencies?.push(match[1].trim());
      }
    }

    // Extract inline annotations
    const annotationRegex = /@(\w+)(?:\((.*?)\))?/g;
    let annotationMatch;

    while ((annotationMatch = annotationRegex.exec(sourceCode)) !== null) {
      const [, type, value] = annotationMatch;
      if (!['author', 'version', 'tag', 'requirement', 'dependency'].includes(type)) {
        metadata.annotations?.push({
          type,
          value: value || true
        });
      }
    }

    return metadata;
  }

  /**
   * Register custom annotation pattern
   */
  registerPattern(name: string, pattern: RegExp): void {
    this.annotationPatterns.set(name, pattern);
  }

  /**
   * Clear metadata cache
   */
  clearCache(): void {
    this.metadataCache.clear();
  }

  private registerDefaultPatterns(): void {
    // Test-related annotations
    this.annotationPatterns.set('test', /@test\s*(?:\((.*?)\))?/);
    this.annotationPatterns.set('suite', /@suite\s*(?:\((.*?)\))?/);
    this.annotationPatterns.set('skip', /@skip\s*(?:\((.*?)\))?/);
    this.annotationPatterns.set('only', /@only/);
    this.annotationPatterns.set('timeout', /@timeout\s*\((\d+)\)/);
    
    // Documentation annotations
    this.annotationPatterns.set('description', /@description\s+(.+)/);
    this.annotationPatterns.set('example', /@example\s+([\s\S]+?)(?=@|\*\/|$)/);
    this.annotationPatterns.set('see', /@see\s+(.+)/);
    this.annotationPatterns.set('link', /@link\s+(.+)/);
    
    // Quality annotations
    this.annotationPatterns.set('priority', /@priority\s+(critical|high|medium|low)/);
    this.annotationPatterns.set('severity', /@severity\s+(\d+)/);
    this.annotationPatterns.set('coverage', /@coverage\s+(.+)/);
    
    // Requirement annotations
    this.annotationPatterns.set('requirement', /@requirement\s+(.+)/);
    this.annotationPatterns.set('feature', /@feature\s+(.+)/);
    this.annotationPatterns.set('story', /@story\s+(.+)/);
    this.annotationPatterns.set('ticket', /@ticket\s+(.+)/);
  }

  private extractFromTestStructure(parsedTest: ParsedTest, metadata: TestMetadata): void {
    // Extract tags from test names
    const tagPattern = /#(\w+)/g;
    
    parsedTest.suites.forEach(suite => {
      // Extract from suite name
      const suiteTags = suite.name.match(tagPattern);
      if (suiteTags) {
        metadata.tags?.push(...suiteTags.map(tag => tag.substring(1)));
      }

      // Extract from test cases
      suite.testCases.forEach(testCase => {
        const testTags = testCase.name.match(tagPattern);
        if (testTags) {
          metadata.tags?.push(...testTags.map(tag => tag.substring(1)));
        }

        // Collect existing tags
        if (testCase.tags) {
          metadata.tags?.push(...testCase.tags);
        }

        // Extract priority
        if (testCase.priority === 'critical' && !metadata.annotations?.some(a => a.type === 'priority')) {
          metadata.annotations?.push({
            type: 'priority',
            value: 'critical'
          });
        }
      });
    });

    // Remove duplicates
    metadata.tags = [...new Set(metadata.tags)];
  }

  private mergeMetadata(target: TestMetadata, source: Record<string, any>): void {
    // Merge simple fields
    if (source.author && !target.author) {
      target.author = source.author;
    }
    if (source.version && !target.version) {
      target.version = source.version;
    }

    // Merge arrays
    if (source.tags) {
      target.tags = [...new Set([...target.tags || [], ...source.tags])];
    }
    if (source.requirements) {
      target.requirements = [...new Set([...target.requirements || [], ...source.requirements])];
    }
    if (source.dependencies) {
      target.dependencies = [...new Set([...target.dependencies || [], ...source.dependencies])];
    }

    // Merge dates
    if (source.createdAt) {
      target.createdAt = new Date(source.createdAt);
    }
    if (source.updatedAt) {
      target.updatedAt = new Date(source.updatedAt);
    }
  }

  private extractAnnotations(parsedTest: ParsedTest, metadata: TestMetadata): void {
    // Process each suite
    parsedTest.suites.forEach(suite => {
      // Extract suite-level annotations
      if (suite.metadata?.annotations) {
        metadata.annotations?.push(...suite.metadata.annotations);
      }

      // Process test cases
      suite.testCases.forEach(testCase => {
        // Extract test-level annotations
        if (testCase.metadata?.annotations) {
          metadata.annotations?.push(...testCase.metadata.annotations);
        }

        // Extract step-level annotations
        testCase.steps.forEach(step => {
          if (step.metadata?.annotations) {
            metadata.annotations?.push(...step.metadata.annotations);
          }
        });
      });
    });

    // Remove duplicate annotations
    const uniqueAnnotations = new Map<string, TestAnnotation>();
    metadata.annotations?.forEach(annotation => {
      const key = `${annotation.type}-${JSON.stringify(annotation.value)}`;
      if (!uniqueAnnotations.has(key)) {
        uniqueAnnotations.set(key, annotation);
      }
    });
    metadata.annotations = Array.from(uniqueAnnotations.values());
  }

  private calculateEstimatedDuration(parsedTest: ParsedTest): number {
    let totalDuration = 0;
    const baseStepDuration = 5; // 5 seconds per step as baseline

    parsedTest.suites.forEach(suite => {
      suite.testCases.forEach(testCase => {
        // Calculate based on number of steps
        const stepDuration = testCase.steps.length * baseStepDuration;
        
        // Add setup/teardown time
        const setupTime = testCase.preconditions ? testCase.preconditions.length * 2 : 0;
        const teardownTime = testCase.postconditions ? testCase.postconditions.length * 2 : 0;
        
        // Adjust for priority (critical tests might take longer)
        const priorityMultiplier = testCase.priority === 'critical' ? 1.5 : 
                                   testCase.priority === 'high' ? 1.2 : 1;
        
        totalDuration += (stepDuration + setupTime + teardownTime) * priorityMultiplier;
      });
    });

    return Math.ceil(totalDuration / 60); // Return in minutes
  }

  private extractCoverageInfo(parsedTest: ParsedTest): CoverageInfo | undefined {
    // Look for coverage information in metadata
    const coverageAnnotation = parsedTest.metadata?.coverage;
    
    if (coverageAnnotation) {
      return {
        lines: coverageAnnotation.lines || 0,
        branches: coverageAnnotation.branches || 0,
        functions: coverageAnnotation.functions || 0,
        statements: coverageAnnotation.statements || 0
      };
    }

    // Calculate basic coverage metrics based on test structure
    let totalAssertions = 0;
    let totalSteps = 0;

    parsedTest.suites.forEach(suite => {
      suite.testCases.forEach(testCase => {
        testCase.steps.forEach(step => {
          totalSteps++;
          if (step.type === 'assertion') {
            totalAssertions++;
          }
        });
      });
    });

    // Estimate coverage based on test density
    if (totalSteps > 0) {
      const assertionRatio = totalAssertions / totalSteps;
      return {
        statements: Math.round(assertionRatio * 100),
        branches: Math.round(assertionRatio * 80), // Slightly lower for branches
        functions: Math.round(assertionRatio * 90), // Functions usually well covered
        lines: Math.round(assertionRatio * 95) // Lines are often highest
      };
    }

    return undefined;
  }

  /**
   * Extract metadata from multiple sources and merge
   */
  async extractComprehensive(
    parsedTest: ParsedTest, 
    sourceCode?: string,
    additionalMetadata?: Partial<TestMetadata>
  ): Promise<TestMetadata> {
    // Start with basic extraction
    const baseMetadata = await this.extract(parsedTest);

    // Extract from source code if provided
    if (sourceCode) {
      const sourceMetadata = this.extractFromSource(sourceCode);
      this.mergeMetadata(baseMetadata, sourceMetadata as any);
    }

    // Merge additional metadata if provided
    if (additionalMetadata) {
      this.mergeMetadata(baseMetadata, additionalMetadata as any);
    }

    return baseMetadata;
  }
}

export default MetadataExtractor;