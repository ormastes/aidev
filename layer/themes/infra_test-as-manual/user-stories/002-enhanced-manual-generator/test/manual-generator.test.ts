/**
 * Tests for Enhanced Manual Generator Core Engine
 */

import { ManualGenerator } from '../src/core/ManualGenerator';
import { TestParser } from '../src/core/TestParser';
import { TemplateEngine } from '../src/core/TemplateEngine';
import { MetadataExtractor } from '../src/core/MetadataExtractor';
import { DocumentBuilder } from '../src/core/DocumentBuilder';
import * as fs from 'fs/promises';
import { path } from '../../../../infra_external-log-lib/src';

describe('ManualGenerator', () => {
  let generator: ManualGenerator;

  beforeEach(() => {
    generator = new ManualGenerator({
      includeMetadata: true,
      includeScreenshots: false,
      generateTOC: true,
      generateIndex: true,
      supportMultipleFormats: true
    });
  });

  describe('Core Functionality', () => {
    it('should create generator with default options', () => {
      const gen = new ManualGenerator();
      const config = gen.getConfiguration();
      expect(config.includeMetadata).toBe(true);
      expect(config.generateTOC).toBe(true);
    });

    it('should configure generator options', () => {
      generator.configure({
        includeMetadata: false,
        template: 'professional'
      });
      const config = generator.getConfiguration();
      expect(config.includeMetadata).toBe(false);
      expect(config.template).toBe('professional');
    });
  });

  describe('Test Parsing', () => {
    it('should parse Jest test content', async () => {
      const parser = new TestParser();
      const testContent = `
        describe('Calculator', () => {
          it('should add two numbers', () => {
            expect(add(2, 3)).toBe(5);
          });
          
          it('should subtract two numbers', () => {
            expect(subtract(5, 3)).toBe(2);
          });
        });
      `;
      
      const parsed = parser.parse(testContent, 'jest');
      expect(parsed.type).toBe('unit');
      expect(parsed.suites).toHaveLength(1);
      expect(parsed.suites[0].name).toBe('Calculator');
      expect(parsed.suites[0].testCases).toHaveLength(2);
    });

    it('should parse BDD/Gherkin test content', async () => {
      const parser = new TestParser();
      const testContent = `
        Feature: User Authentication
        
        Scenario: Successful login
          Given a user with valid credentials
          When the user attempts to login
          Then the user should be redirected to dashboard
          And the session should be created
      `;
      
      const parsed = parser.parse(testContent, 'bdd');
      expect(parsed.type).toBe('bdd');
      expect(parsed.name).toBe('User Authentication');
      expect(parsed.suites).toHaveLength(1);
      expect(parsed.suites[0].testCases[0].steps).toHaveLength(4);
    });
  });

  describe('Metadata Extraction', () => {
    it('should extract metadata from test structure', async () => {
      const extractor = new MetadataExtractor();
      const parsedTest = {
        id: 'test-1',
        name: 'Sample Test',
        type: 'unit' as const,
        suites: [{
          id: 'suite-1',
          name: 'Test Suite #integration #smoke',
          testCases: [{
            id: 'case-1',
            name: 'Test Case',
            steps: [
              { id: 'step-1', order: 0, type: 'action' as const, action: 'Click button' },
              { id: 'step-2', order: 1, type: 'assertion' as const, action: 'Verify result' }
            ],
            priority: 'high' as const,
            tags: ['regression', 'ui']
          }]
        }]
      };
      
      const metadata = await extractor.extract(parsedTest);
      expect(metadata.tags).toContain('integration');
      expect(metadata.tags).toContain('smoke');
      expect(metadata.tags).toContain('regression');
      expect(metadata.tags).toContain('ui');
      expect(metadata.estimatedDuration).toBeGreaterThan(0);
    });

    it('should extract metadata from source code', () => {
      const extractor = new MetadataExtractor();
      const sourceCode = `
        /**
         * @author John Doe
         * @version 1.0.0
         * @tag unit
         * @tag critical
         * @requirement REQ-001
         * @dependency auth-service
         */
        describe('Test Suite', () => {
          // tests
        });
      `;
      
      const metadata = extractor.extractFromSource(sourceCode);
      expect(metadata.author).toBe('John Doe');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.tags).toContain('unit');
      expect(metadata.tags).toContain('critical');
      expect(metadata.requirements).toContain('REQ-001');
      expect(metadata.dependencies).toContain('auth-service');
    });
  });

  describe('Document Building', () => {
    it('should build document structure', async () => {
      const builder = new DocumentBuilder();
      const context = {
        test: {
          id: 'test-1',
          name: 'Sample Test',
          type: 'unit' as const,
          suites: [{
            id: 'suite-1',
            name: 'Test Suite',
            testCases: [{
              id: 'case-1',
              name: 'Test Case',
              steps: [
                { id: 'step-1', order: 0, type: 'action' as const, action: 'Execute action' }
              ],
              priority: 'medium' as const
            }]
          }]
        },
        metadata: {
          author: 'Test Author',
          version: '1.0.0',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        options: {
          generateTOC: true,
          generateIndex: true
        }
      };
      
      const document = await builder.build(context);
      expect(document.title).toContain('Sample Test');
      expect(document.sections).toHaveLength(3); // Overview, Test Suite, Summary
      expect(document.tableOfContents).toBeDefined();
      expect(document.index).toBeDefined();
    });

    it('should export document in different formats', async () => {
      const builder = new DocumentBuilder();
      const document = {
        id: 'doc-1',
        title: 'Test Manual',
        generatedAt: new Date(),
        test: {
          id: 'test-1',
          name: 'Test',
          type: 'unit' as const,
          suites: []
        },
        metadata: {},
        sections: [{
          id: 'section-1',
          title: 'Overview',
          level: 1,
          content: 'Test overview content'
        }]
      };
      
      const markdown = await builder.export(document, 'markdown');
      expect(markdown).toContain('# Test Manual');
      expect(markdown).toContain('## Overview');
      
      const json = await builder.export(document, 'json');
      const parsed = JSON.parse(json);
      expect(parsed.title).toBe('Test Manual');
      
      const html = await builder.export(document, 'html');
      expect(html).toContain('<h1>Test Manual</h1>');
    });
  });

  describe('Template Engine', () => {
    it('should render with default template', async () => {
      const engine = new TemplateEngine();
      const document = {
        id: 'doc-1',
        title: 'Test Documentation',
        generatedAt: new Date(),
        test: {
          id: 'test-1',
          name: 'Test',
          type: 'unit' as const,
          suites: []
        },
        metadata: {},
        sections: [{
          id: 'section-1',
          title: 'Section 1',
          level: 1,
          content: 'Section content'
        }]
      };
      
      const output = await engine.render(document);
      expect(output).toContain('Test Documentation');
      expect(output).toContain('Section 1');
      expect(output).toContain('Section content');
    });

    it('should register and use custom helpers', () => {
      const engine = new TemplateEngine();
      engine.registerHelper('double', (value: number) => value * 2);
      
      const template = engine.compile('Result: {{double 5}}');
      const result = template({ double: (v: number) => v * 2 });
      expect(result).toContain('10');
    });
  });

  describe('End-to-End Generation', () => {
    it('should generate manual from parsed test', async () => {
      const parsedTest = {
        id: 'test-e2e',
        name: 'E2E Test Suite',
        type: 'e2e' as const,
        filePath: 'test.spec.ts',
        suites: [{
          id: 'suite-e2e',
          name: 'User Flow',
          testCases: [{
            id: 'case-e2e',
            name: 'Complete user journey',
            steps: [
              { id: 's1', order: 0, type: 'setup' as const, action: 'Open application' },
              { id: 's2', order: 1, type: 'action' as const, action: 'Navigate to login' },
              { id: 's3', order: 2, type: 'action' as const, action: 'Enter credentials' },
              { id: 's4', order: 3, type: 'assertion' as const, action: 'Verify dashboard displayed' }
            ],
            priority: 'critical' as const,
            preconditions: ['User account exists', 'Application is running'],
            postconditions: ['User is logged in', 'Session is active']
          }]
        }]
      };
      
      const result = await generator.generateFromParsedTest(parsedTest);
      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();
      expect(result.output).toBeDefined();
      expect(result.metadata).toBeDefined();
      
      if (result.document) {
        expect(result.document.sections.length).toBeGreaterThan(0);
        expect(result.document.title).toContain('E2E Test Suite');
      }
    });

    it('should handle batch generation', async () => {
      // Create temporary test files
      const tempDir = path.join(__dirname, 'temp');
      await fs.mkdir(tempDir, { recursive: true });
      
      const testFile1 = path.join(tempDir, 'test1.spec.js');
      const testFile2 = path.join(tempDir, 'test2.spec.js');
      
      await fs.writeFile(testFile1, `
        describe('Test 1', () => {
          it('should work', () => {
            expect(true).toBe(true);
          });
        });
      `);
      
      await fs.writeFile(testFile2, `
        describe('Test 2', () => {
          it('should also work', () => {
            expect(1 + 1).toBe(2);
          });
        });
      `);
      
      const results = await generator.generateBatch([testFile1, testFile2]);
      expect(results.size).toBe(2);
      
      const result1 = results.get(testFile1);
      expect(result1?.success).toBe(true);
      
      const result2 = results.get(testFile2);
      expect(result2?.success).toBe(true);
      
      // Clean up
      await fs.rm(tempDir, { recursive: true, force: true });
    });
  });
});