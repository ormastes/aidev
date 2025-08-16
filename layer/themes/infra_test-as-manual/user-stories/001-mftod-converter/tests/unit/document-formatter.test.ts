/**
 * Unit tests for document formatters
 */

import { MarkdownFormatter, HTMLFormatter, JSONFormatter } from '../../src/domain/document-formatter';
import { TestDocument } from '../../src/domain/types';

describe('DocumentFormatters', () => {
  const createSampleDocument = (): TestDocument => ({
    title: 'Test Documentation',
    created: new Date('2024-01-01'),
    suites: [
      {
        id: 'suite-1',
        title: 'Authentication Tests',
        testCases: [
          {
            id: 'TC-001',
            title: 'User Login',
            category: 'Authentication',
            priority: 'high',
            steps: [
              {
                order: 1,
                action: 'Navigate to login page',
                expected: 'Login form is displayed'
              },
              {
                order: 2,
                action: 'Enter credentials',
                expected: 'Fields accept input'
              }
            ]
          }
        ]
      }
    ],
    metadata: {
      source: 'auth.test.ts',
      framework: 'jest'
    }
  });

  describe('MarkdownFormatter', () => {
    let formatter: MarkdownFormatter;

    beforeEach(() => {
      formatter = new MarkdownFormatter();
    });

    it('should format document with all sections', () => {
      const doc = createSampleDocument();
      const result = formatter.format(doc);

      expect(result).toContain('# Test Documentation');
      expect(result).toContain('**Generated**: January 1, 2024');
      expect(result).toContain('**Source**: auth.test.ts');
      expect(result).toContain('## Table of Contents');
      expect(result).toContain('## Authentication Tests');
      expect(result).toContain('### Test Case: User Login');
      expect(result).toContain('**ID**: TC-001');
      expect(result).toContain('**Category**: Authentication');
      expect(result).toContain('**Priority**: high');
    });

    it('should format test steps correctly', () => {
      const doc = createSampleDocument();
      const result = formatter.format(doc);

      expect(result).toContain('### Test Steps');
      expect(result).toContain('#### Step 1: Navigate to login page');
      expect(result).toContain('**Expected Result**: Login form is displayed');
      expect(result).toContain('#### Step 2: Enter credentials');
      expect(result).toContain('**Expected Result**: Fields accept input');
    });

    it('should include test index when enabled', () => {
      formatter = new MarkdownFormatter({ includeIndex: true });
      const doc = createSampleDocument();
      const result = formatter.format(doc);

      expect(result).toContain('## Test Index');
      expect(result).toContain('- **TC-001**: Authentication Tests > User Login');
    });

    it('should skip table of contents when disabled', () => {
      formatter = new MarkdownFormatter({ includeTableOfContents: false });
      const doc = createSampleDocument();
      const result = formatter.format(doc);

      expect(result).not.toContain('## Table of Contents');
    });

    it('should handle nested suites', () => {
      const doc = createSampleDocument();
      doc.suites[0].childSuites = [
        {
          id: 'suite-2',
          title: 'Login Methods',
          testCases: [
            {
              id: 'TC-002',
              title: 'OAuth Login',
              steps: []
            }
          ]
        }
      ];

      const result = formatter.format(doc);

      expect(result).toContain('### Login Methods');
      expect(result).toContain('#### Test Case: OAuth Login');
    });

    it('should include setup and teardown steps', () => {
      const doc = createSampleDocument();
      doc.suites[0].setup = [
        {
          order: 1,
          action: 'Clear browser cache',
          expected: 'Cache is cleared'
        }
      ];
      doc.suites[0].teardown = [
        {
          order: 1,
          action: 'Log out user',
          expected: 'User is logged out'
        }
      ];

      const result = formatter.format(doc);

      expect(result).toContain('### Setup');
      expect(result).toContain('Clear browser cache');
      expect(result).toContain('### Teardown');
      expect(result).toContain('Log out user');
    });
  });

  describe('HTMLFormatter', () => {
    let formatter: HTMLFormatter;

    beforeEach(() => {
      formatter = new HTMLFormatter();
    });

    it('should generate valid HTML document', () => {
      const doc = createSampleDocument();
      const result = formatter.format(doc);

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<html lang="en">');
      expect(result).toContain('<title>Test Documentation</title>');
      expect(result).toContain('<style>');
      expect(result).toContain('</body>');
      expect(result).toContain('</html>');
    });

    it('should include styled content', () => {
      const doc = createSampleDocument();
      const result = formatter.format(doc);

      expect(result).toContain('<h1>Test Documentation</h1>');
      expect(result).toContain('<div class="metadata">');
      expect(result).toContain('<div class="test-case priority-high">');
      expect(result).toContain('<h3>User Login</h3>');
    });

    it('should apply minimal styling when requested', () => {
      formatter = new HTMLFormatter({ styling: 'minimal' });
      const doc = createSampleDocument();
      const result = formatter.format(doc);

      expect(result).toContain('#000'); // Black instead of blue
      expect(result).toContain('#666'); // Gray instead of red
    });

    it('should format test steps with proper structure', () => {
      const doc = createSampleDocument();
      const result = formatter.format(doc);

      expect(result).toContain('test-step');
      expect(result).toContain('Navigate to login page');
      expect(result).toContain('Login form is displayed');
    });
  });

  describe('JSONFormatter', () => {
    let formatter: JSONFormatter;

    beforeEach(() => {
      formatter = new JSONFormatter();
    });

    it('should produce valid JSON', () => {
      const doc = createSampleDocument();
      const result = formatter.format(doc);

      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('should preserve all document properties', () => {
      const doc = createSampleDocument();
      const result = formatter.format(doc);
      const parsed = JSON.parse(result);

      expect(parsed.title).toBe('Test Documentation');
      expect(parsed.suites).toHaveLength(1);
      expect(parsed.suites[0].testCases).toHaveLength(1);
      expect(parsed.metadata.framework).toBe('jest');
    });

    it('should format with proper indentation', () => {
      const doc = createSampleDocument();
      const result = formatter.format(doc);

      expect(result).toContain('  "title"');
      expect(result).toContain('    "id"');
    });
  });
});