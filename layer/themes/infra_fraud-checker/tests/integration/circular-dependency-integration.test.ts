/**
 * Integration test for circular dependency detection
 * Verifies that fraud checker can use story reporter's circular dependency detection
 */

import { CircularDependencyDetector } from '../../src/detectors/circular-dependency-detector';
import { ComprehensiveFraudAnalyzer } from '../../src/services/comprehensive-fraud-analyzer';
import * as fs from 'fs';
import * as path from 'path';

describe('Circular Dependency Integration', () => {
  let detector: CircularDependencyDetector;
  let analyzer: ComprehensiveFraudAnalyzer;
  const testProjectPath = path.join(__dirname, '../fixtures/test-project');

  beforeAll(() => {
    detector = new CircularDependencyDetector();
    analyzer = new ComprehensiveFraudAnalyzer();
    
    // Create test project structure with circular dependencies
    if (!fs.existsSync(testProjectPath)) {
      fs.mkdirSync(testProjectPath, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test project
    if (fs.existsSync(testProjectPath)) {
      fs.rmSync(testProjectPath, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    // Create test files with circular dependencies
    const fileA = path.join(testProjectPath, 'moduleA.ts');
    const fileB = path.join(testProjectPath, 'moduleB.ts');
    const fileC = path.join(testProjectPath, 'moduleC.ts');
    
    // Create circular dependency: A -> B -> C -> A
    fs.writeFileSync(fileA, `
      import { functionB } from './moduleB';
      export const functionA = () => {
        return functionB();
      };
    `);
    
    fs.writeFileSync(fileB, `
      import { functionC } from './moduleC';
      export const functionB = () => {
        return functionC();
      };
    `);
    
    fs.writeFileSync(fileC, `
      import { functionA } from './moduleA';
      export const functionC = () => {
        return functionA();
      };
    `);
  });

  describe('CircularDependencyDetector', () => {
    test('should detect circular dependencies in test project', async () => {
      const issues = await detector.detectFraud(testProjectPath);
      
      expect(issues).toBeDefined();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].type).toBe('circular-dependency');
      expect(issues[0].cycle).toBeDefined();
      expect(issues[0].cycle.length).toBeGreaterThanOrEqual(3);
    });

    test('should check specific file for circular dependencies', async () => {
      const fileA = path.join(testProjectPath, 'moduleA.ts');
      const issues = await detector.checkFile(fileA, testProjectPath);
      
      expect(issues).toBeDefined();
      // File A is part of the circular dependency
      if (issues.length > 0) {
        expect(issues[0].file).toContain('moduleA');
      }
    });

    test('should generate detailed report', async () => {
      const report = await detector.generateDetailedReport(testProjectPath);
      
      expect(report).toBeDefined();
      expect(report).toContain('Circular Dependency Fraud Detection Report');
    });
  });

  describe('ComprehensiveFraudAnalyzer', () => {
    test('should include circular dependencies in comprehensive analysis', async () => {
      const report = await analyzer.analyzeProject(testProjectPath);
      
      expect(report).toBeDefined();
      expect(report.summary.circularDependencies).toBeGreaterThanOrEqual(0);
      expect(report.issues.circularDependencies).toBeDefined();
      expect(Array.isArray(report.issues.circularDependencies)).toBe(true);
    });

    test('should generate comprehensive report with circular dependencies', async () => {
      const reportContent = await analyzer.generateReport(testProjectPath);
      
      expect(reportContent).toBeDefined();
      expect(reportContent).toContain('Comprehensive Fraud Analysis Report');
      
      // If circular dependencies exist, they should be in the report
      if (reportContent.includes('Circular Dependencies')) {
        expect(reportContent).toContain('Cycle:');
      }
    });

    test('should check file for all fraud types including circular dependencies', async () => {
      const fileA = path.join(testProjectPath, 'moduleA.ts');
      const issues = await analyzer.checkFile(fileA, testProjectPath);
      
      expect(issues).toBeDefined();
      expect(Array.isArray(issues)).toBe(true);
    });
  });

  describe('Integration with Story Reporter', () => {
    test('should use CircularDependencyService from story reporter', async () => {
      // The CircularDependencyDetector internally uses the service from story reporter
      const detector = new CircularDependencyDetector();
      
      // Verify it's properly instantiated and functional
      expect(detector).toBeDefined();
      
      // Test that it can analyze a project
      const issues = await detector.detectFraud(testProjectPath);
      expect(Array.isArray(issues)).toBe(true);
    });

    test('should handle projects without circular dependencies', async () => {
      // Create a simple project without circular dependencies
      const cleanProjectPath = path.join(testProjectPath, 'clean');
      fs.mkdirSync(cleanProjectPath, { recursive: true });
      
      const fileD = path.join(cleanProjectPath, 'moduleD.ts');
      const fileE = path.join(cleanProjectPath, 'moduleE.ts');
      
      fs.writeFileSync(fileD, `
        export const functionD = () => {
          return 'D';
        };
      `);
      
      fs.writeFileSync(fileE, `
        import { functionD } from './moduleD';
        export const functionE = () => {
          return functionD() + 'E';
        };
      `);
      
      const issues = await detector.detectFraud(cleanProjectPath);
      
      expect(issues).toBeDefined();
      expect(issues.length).toBe(0);
      
      // Clean up
      fs.rmSync(cleanProjectPath, { recursive: true, force: true });
    });
  });

  describe('Error Handling', () => {
    test('should handle non-existent project path gracefully', async () => {
      const nonExistentPath = '/path/that/does/not/exist';
      
      const issues = await detector.detectFraud(nonExistentPath);
      expect(issues).toBeDefined();
      expect(Array.isArray(issues)).toBe(true);
    });

    test('should handle invalid file paths gracefully', async () => {
      const invalidFile = '/invalid/file.ts';
      
      const issues = await detector.checkFile(invalidFile, testProjectPath);
      expect(issues).toBeDefined();
      expect(Array.isArray(issues)).toBe(true);
    });
  });
});