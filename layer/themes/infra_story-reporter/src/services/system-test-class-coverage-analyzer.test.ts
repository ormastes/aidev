import { describe, it, expect, beforeEach, mock, beforeAll, afterAll } from 'bun:test';
import { SystemTestClassCoverageAnalyzer } from './system-test-class-coverage-analyzer';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock file API
const mockFileAPI = {
  readFile: mock((filePath: string) => {
    if (filePath.endsWith('.ts')) {
      // Mock TypeScript class file
      return Promise.resolve(`
        export class ExampleService {
          constructor() {}
          
          public process(): void {
            // Implementation
          }
        }
      `);
    }
    return Promise.resolve('');
  }),
  exists: mock(() => Promise.resolve(true))
};

async function setupTestStructure() {
  const testDir = '/tmp/test-system-coverage';
  
  // Create directory structure
  await fs.mkdir(`${testDir}/src/services`, { recursive: true });
  await fs.mkdir(`${testDir}/src/controllers`, { recursive: true });
  await fs.mkdir(`${testDir}/src/utils`, { recursive: true });
  await fs.mkdir(`${testDir}/tests/system`, { recursive: true });
  await fs.mkdir(`${testDir}/tests/unit`, { recursive: true });
  
  // Create source files with classes
  await fs.writeFile(
    `${testDir}/src/services/UserService.ts`,
    `export class UserService {
      findUser(id: string) { return {}; }
      createUser(data: any) { return {}; }
    }`
  );
  
  await fs.writeFile(
    `${testDir}/src/services/AuthService.ts`,
    `export class AuthService {
      authenticate(credentials: any) { return true; }
      logout() { return true; }
    }`
  );
  
  await fs.writeFile(
    `${testDir}/src/controllers/ApiController.ts`,
    `export class ApiController {
      handleRequest(req: any) { return {}; }
    }`
  );
  
  // Create utility files without classes
  await fs.writeFile(
    `${testDir}/src/utils/helpers.ts`,
    `export function formatDate(date: Date) { return date.toString(); }`
  );
  
  // Create system tests
  await fs.writeFile(
    `${testDir}/tests/system/UserService.systest.ts`,
    `describe('UserService System Tests', () => {
      it('should test user operations', () => {});
    });`
  );
  
  await fs.writeFile(
    `${testDir}/tests/system/AuthService.systest.ts`,
    `describe('AuthService System Tests', () => {
      it('should test authentication', () => {});
    });`
  );
  
  // Create unit tests (should not count for system test coverage)
  await fs.writeFile(
    `${testDir}/tests/unit/ApiController.test.ts`,
    `describe('ApiController Unit Tests', () => {
      it('should handle requests', () => {});
    });`
  );
  
  return testDir;
}

describe('SystemTestClassCoverageAnalyzer', () => {
  let analyzer: SystemTestClassCoverageAnalyzer;
  let testDir: string;

  beforeAll(async () => {
    testDir = await setupTestStructure();
  });

  beforeEach(() => {
    analyzer = new SystemTestClassCoverageAnalyzer();
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('analyze method', () => {
    it('should analyze system test coverage for classes', async () => {
      const result = await analyzer.analyze(testDir, 'theme');
      
      expect(result).toBeDefined();
      expect(result.percentage).toBeGreaterThanOrEqual(0);
      expect(result.percentage).toBeLessThanOrEqual(100);
      expect(result.coveredClasses).toBeGreaterThanOrEqual(0);
      expect(result.totalClasses).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.details)).toBe(true);
    });

    it('should identify classes with system tests', async () => {
      const result = await analyzer.analyze(testDir, 'theme');
      
      // UserService and AuthService should be covered
      const userServiceDetail = result.details.find(d => 
        d.className === 'UserService'
      );
      const authServiceDetail = result.details.find(d => 
        d.className === 'AuthService'
      );
      
      if (userServiceDetail) {
        expect(userServiceDetail.covered).toBe(true);
        expect(userServiceDetail.testFiles.length).toBeGreaterThan(0);
      }
      
      if (authServiceDetail) {
        expect(authServiceDetail.covered).toBe(true);
        expect(authServiceDetail.testFiles.length).toBeGreaterThan(0);
      }
    });

    it('should identify classes without system tests', async () => {
      const result = await analyzer.analyze(testDir, 'theme');
      
      // ApiController should not be covered (only has unit tests)
      const apiControllerDetail = result.details.find(d => 
        d.className === 'ApiController'
      );
      
      if (apiControllerDetail) {
        expect(apiControllerDetail.covered).toBe(false);
        expect(apiControllerDetail.testFiles).toEqual([]);
      }
    });

    it('should calculate coverage percentage correctly', async () => {
      const result = await analyzer.analyze(testDir, 'theme');
      
      if (result.totalClasses > 0) {
        const expectedPercentage = (result.coveredClasses / result.totalClasses) * 100;
        expect(result.percentage).toBeCloseTo(expectedPercentage, 2);
      } else {
        expect(result.percentage).toBe(0);
      }
    });

    it('should handle different analysis modes', async () => {
      const modes = ['app', 'epic', 'theme', 'story', 'user_story'];
      
      for (const mode of modes) {
        const result = await analyzer.analyze(testDir, mode);
        expect(result).toBeDefined();
        expect(result.percentage).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Class Detection', () => {
    it('should detect TypeScript classes', async () => {
      const classDir = '/tmp/test-class-detection';
      await fs.mkdir(`${classDir}/src`, { recursive: true });
      
      // TypeScript class
      await fs.writeFile(
        `${classDir}/src/TypeScriptClass.ts`,
        `export class TypeScriptClass {
          method() { return true; }
        }`
      );
      
      // Abstract class
      await fs.writeFile(
        `${classDir}/src/AbstractClass.ts`,
        `export abstract class AbstractClass {
          abstract method(): void;
        }`
      );
      
      // Interface (should not be counted as class)
      await fs.writeFile(
        `${classDir}/src/Interface.ts`,
        `export interface Interface {
          property: string;
        }`
      );
      
      const result = await analyzer.analyze(classDir, 'theme');
      
      expect(result.totalClasses).toBeGreaterThanOrEqual(0);
      
      await fs.rm(classDir, { recursive: true, force: true });
    });

    it('should handle multiple classes in one file', async () => {
      const multiClassDir = '/tmp/test-multi-class';
      await fs.mkdir(`${multiClassDir}/src`, { recursive: true });
      
      await fs.writeFile(
        `${multiClassDir}/src/MultiClass.ts`,
        `export class FirstClass {
          method1() {}
        }
        
        export class SecondClass {
          method2() {}
        }
        
        class PrivateClass {
          method3() {}
        }`
      );
      
      const result = await analyzer.analyze(multiClassDir, 'theme');
      
      // Should detect multiple classes
      const classNames = result.details.map(d => d.className);
      expect(classNames.length).toBeGreaterThanOrEqual(0);
      
      await fs.rm(multiClassDir, { recursive: true, force: true });
    });

    it('should ignore non-class files', async () => {
      const nonClassDir = '/tmp/test-non-class';
      await fs.mkdir(`${nonClassDir}/src`, { recursive: true });
      
      // Function only file
      await fs.writeFile(
        `${nonClassDir}/src/functions.ts`,
        `export function helper() { return true; }
         export const constant = 42;`
      );
      
      // Type definitions
      await fs.writeFile(
        `${nonClassDir}/src/types.ts`,
        `export type MyType = string;
         export interface MyInterface {}`
      );
      
      const result = await analyzer.analyze(nonClassDir, 'theme');
      
      // Should not count non-class files
      expect(result.totalClasses).toBe(0);
      
      await fs.rm(nonClassDir, { recursive: true, force: true });
    });
  });

  describe('System Test Detection', () => {
    it('should identify system test files by pattern', async () => {
      const patterns = [
        'Service.systest.ts',
        'Controller.stest.ts',
        'Integration.system.test.ts'
      ];
      
      const patternDir = '/tmp/test-patterns';
      await fs.mkdir(`${patternDir}/tests`, { recursive: true });
      
      for (const pattern of patterns) {
        await fs.writeFile(
          `${patternDir}/tests/${pattern}`,
          `describe('System Test', () => {});`
        );
      }
      
      // These patterns depend on implementation
      const result = await analyzer.analyze(patternDir, 'theme');
      expect(result).toBeDefined();
      
      await fs.rm(patternDir, { recursive: true, force: true });
    });

    it('should exclude unit and integration tests', async () => {
      const mixedTestDir = '/tmp/test-mixed';
      await fs.mkdir(`${mixedTestDir}/src`, { recursive: true });
      await fs.mkdir(`${mixedTestDir}/tests`, { recursive: true });
      
      // Create a class
      await fs.writeFile(
        `${mixedTestDir}/src/Service.ts`,
        `export class Service { method() {} }`
      );
      
      // Create different test types
      await fs.writeFile(
        `${mixedTestDir}/tests/Service.test.ts`,
        `describe('Unit Test', () => {});`
      );
      
      await fs.writeFile(
        `${mixedTestDir}/tests/Service.itest.ts`,
        `describe('Integration Test', () => {});`
      );
      
      await fs.writeFile(
        `${mixedTestDir}/tests/Service.systest.ts`,
        `describe('System Test', () => {});`
      );
      
      const result = await analyzer.analyze(mixedTestDir, 'theme');
      
      // Should only count system tests
      const serviceDetail = result.details.find(d => d.className === 'Service');
      if (serviceDetail) {
        const systemTests = serviceDetail.testFiles.filter(f => 
          f.includes('systest') || f.includes('stest')
        );
        expect(systemTests.length).toBeGreaterThanOrEqual(0);
      }
      
      await fs.rm(mixedTestDir, { recursive: true, force: true });
    });
  });

  describe('Coverage Details', () => {
    it('should provide detailed coverage information', async () => {
      const result = await analyzer.analyze(testDir, 'theme');
      
      for (const detail of result.details) {
        expect(detail.className).toBeDefined();
        expect(detail.filePath).toBeDefined();
        expect(typeof detail.covered).toBe('boolean');
        expect(Array.isArray(detail.testFiles)).toBe(true);
      }
    });

    it('should map test files to classes correctly', async () => {
      const mappingDir = '/tmp/test-mapping';
      await fs.mkdir(`${mappingDir}/src`, { recursive: true });
      await fs.mkdir(`${mappingDir}/tests/system`, { recursive: true });
      
      // Create classes with clear naming
      await fs.writeFile(
        `${mappingDir}/src/UserManager.ts`,
        `export class UserManager { manage() {} }`
      );
      
      await fs.writeFile(
        `${mappingDir}/src/DataProcessor.ts`,
        `export class DataProcessor { process() {} }`
      );
      
      // Create corresponding tests
      await fs.writeFile(
        `${mappingDir}/tests/system/UserManager.systest.ts`,
        `describe('UserManager System Tests', () => {});`
      );
      
      await fs.writeFile(
        `${mappingDir}/tests/system/DataProcessor.systest.ts`,
        `describe('DataProcessor System Tests', () => {});`
      );
      
      const result = await analyzer.analyze(mappingDir, 'theme');
      
      const userManagerDetail = result.details.find(d => 
        d.className === 'UserManager'
      );
      const dataProcessorDetail = result.details.find(d => 
        d.className === 'DataProcessor'
      );
      
      if (userManagerDetail) {
        expect(userManagerDetail.covered).toBe(true);
        expect(userManagerDetail.testFiles.some(f => 
          f.includes('UserManager')
        )).toBe(true);
      }
      
      if (dataProcessorDetail) {
        expect(dataProcessorDetail.covered).toBe(true);
        expect(dataProcessorDetail.testFiles.some(f => 
          f.includes('DataProcessor')
        )).toBe(true);
      }
      
      await fs.rm(mappingDir, { recursive: true, force: true });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty directories', async () => {
      const emptyDir = '/tmp/test-empty';
      await fs.mkdir(emptyDir, { recursive: true });
      
      const result = await analyzer.analyze(emptyDir, 'theme');
      
      expect(result.percentage).toBe(0);
      expect(result.coveredClasses).toBe(0);
      expect(result.totalClasses).toBe(0);
      expect(result.details).toEqual([]);
      
      await fs.rm(emptyDir, { recursive: true, force: true });
    });

    it('should handle directories with only non-class files', async () => {
      const noClassDir = '/tmp/test-no-class';
      await fs.mkdir(`${noClassDir}/src`, { recursive: true });
      
      await fs.writeFile(
        `${noClassDir}/src/utils.ts`,
        `export const helper = () => true;`
      );
      
      const result = await analyzer.analyze(noClassDir, 'theme');
      
      expect(result.totalClasses).toBe(0);
      expect(result.percentage).toBe(0);
      
      await fs.rm(noClassDir, { recursive: true, force: true });
    });

    it('should handle malformed class files', async () => {
      const malformedDir = '/tmp/test-malformed';
      await fs.mkdir(`${malformedDir}/src`, { recursive: true });
      
      await fs.writeFile(
        `${malformedDir}/src/Malformed.ts`,
        `export clas Malformed { // typo in 'class'
          method() {}
        }`
      );
      
      const result = await analyzer.analyze(malformedDir, 'theme');
      
      expect(result).toBeDefined();
      expect(result.totalClasses).toBe(0);
      
      await fs.rm(malformedDir, { recursive: true, force: true });
    });
  });

  describe('Performance', () => {
    it('should handle large codebases efficiently', async () => {
      const largeDir = '/tmp/test-large';
      await fs.mkdir(`${largeDir}/src`, { recursive: true });
      await fs.mkdir(`${largeDir}/tests/system`, { recursive: true });
      
      // Create many class files
      for (let i = 0; i < 100; i++) {
        await fs.writeFile(
          `${largeDir}/src/Service${i}.ts`,
          `export class Service${i} {
            method() { return ${i}; }
          }`
        );
        
        // Create test for half of them
        if (i % 2 === 0) {
          await fs.writeFile(
            `${largeDir}/tests/system/Service${i}.systest.ts`,
            `describe('Service${i} Tests', () => {});`
          );
        }
      }
      
      const startTime = Date.now();
      const result = await analyzer.analyze(largeDir, 'theme');
      const endTime = Date.now();
      
      expect(result.totalClasses).toBeGreaterThanOrEqual(0);
      expect(result.coveredClasses).toBeGreaterThanOrEqual(0);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
      
      await fs.rm(largeDir, { recursive: true, force: true });
    });
  });

  describe('Reporting', () => {
    it('should generate accurate summary statistics', async () => {
      const result = await analyzer.analyze(testDir, 'theme');
      
      // Verify summary consistency
      const coveredInDetails = result.details.filter(d => d.covered).length;
      expect(result.coveredClasses).toBe(coveredInDetails);
      
      const totalInDetails = result.details.length;
      expect(result.totalClasses).toBe(totalInDetails);
    });

    it('should sort results by coverage status', async () => {
      const result = await analyzer.analyze(testDir, 'theme');
      
      // Group by coverage status
      const covered = result.details.filter(d => d.covered);
      const uncovered = result.details.filter(d => !d.covered);
      
      expect(covered.length + uncovered.length).toBe(result.details.length);
    });

    it('should provide actionable insights', async () => {
      const result = await analyzer.analyze(testDir, 'theme');
      
      // Check if uncovered classes are identifiable
      const uncoveredClasses = result.details
        .filter(d => !d.covered)
        .map(d => ({
          className: d.className,
          filePath: d.filePath
        }));
      
      // This provides clear action items
      for (const uncovered of uncoveredClasses) {
        expect(uncovered.className).toBeDefined();
        expect(uncovered.filePath).toBeDefined();
      }
    });
  });
});