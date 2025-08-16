/**
 * Unit tests for Mock Free Validator
 */

import { MockFreeValidator } from '../../src/validators/mock-free-validator';
import { ValidationResult, ValidationRule } from '../../src/types';

describe("MockFreeValidator", () => {
  let validator: MockFreeValidator;

  beforeEach(() => {
    validator = new MockFreeValidator();
  });

  describe("validateCode", () => {
    it('should pass code without mocks', () => {
      const code = `
        function add(a, b) {
          return a + b;
        }
        
        test('adds numbers', () => {
          expect(add(1, 2)).toBe(3);
        });
      `;

      const result = validator.validateCode(code);

      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should detect jest.mock usage', () => {
      const code = `
        jest.mock('../module');
        
        test('test', () => {
          expect(true).toBe(true);
        });
      `;

      const result = validator.validateCode(code);

      expect(result.isValid).toBe(false);
      expect(result.violations).toContainEqual(
        expect.objectContaining({
          rule: 'no-jest-mock',
          message: expect.stringContaining('jest.mock')
        })
      );
    });

    it('should detect sinon usage', () => {
      const code = `
        const stub = sinon.stub();
        const spy = sinon.spy();
      `;

      const result = validator.validateCode(code);

      expect(result.isValid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations).toContainEqual(
        expect.objectContaining({
          rule: 'no-sinon',
          message: expect.stringContaining('sinon')
        })
      );
    });

    it('should detect manual mocks', () => {
      const code = `
        const mockFunction = () => 'mocked';
        const MockedClass = class {};
      `;

      const result = validator.validateCode(code);

      expect(result.isValid).toBe(false);
      expect(result.violations).toContainEqual(
        expect.objectContaining({
          rule: 'no-mock-naming',
          message: expect.stringContaining('mock')
        })
      );
    });
  });

  describe("validateFile", () => {
    it('should validate file content', async () => {
      const filePath = '/test/file.ts';
      const fileContent = 'const result = calculate(1, 2);';

      // Using real implementation without mocks
      const mockReadFile = validator.readFile;
      validator.readFile = jest.fn().mockResolvedValue(fileContent);

      const result = await validator.validateFile(filePath);

      expect(result.isValid).toBe(true);
      expect(result.filePath).toBe(filePath);
      
      validator.readFile = mockReadFile;
    });

    it('should handle file read errors', async () => {
      const filePath = '/nonexistent/file.ts';
      
      const mockReadFile = validator.readFile;
      validator.readFile = jest.fn().mockRejectedValue(new Error('File not found'));

      await expect(validator.validateFile(filePath)).rejects.toThrow('File not found');
      
      validator.readFile = mockReadFile;
    });
  });

  describe('addRule', () => {
    it('should add custom validation rule', () => {
      const customRule: ValidationRule = {
        name: 'no-console',
        pattern: /console\.(log|error|warn)/g,
        message: 'Console statements are not allowed'
      };

      validator.addRule(customRule);

      const code = 'console.log("test");';
      const result = validator.validateCode(code);

      expect(result.isValid).toBe(false);
      expect(result.violations).toContainEqual(
        expect.objectContaining({
          rule: 'no-console',
          message: expect.stringContaining('Console statements')
        })
      );
    });

    it('should handle multiple custom rules', () => {
      validator.addRule({
        name: 'no-var',
        pattern: /\bvar\s+/g,
        message: 'Use const or let instead of var'
      });

      validator.addRule({
        name: 'no-any',
        pattern: /:\s*any\b/g,
        message: 'Avoid using any type'
      });

      const code = `
        var x: any = 123;
      `;

      const result = validator.validateCode(code);

      expect(result.isValid).toBe(false);
      expect(result.violations).toHaveLength(2);
    });
  });

  describe("removeRule", () => {
    it('should remove validation rule', () => {
      validator.removeRule('no-jest-mock');

      const code = 'jest.mock("../module");';
      const result = validator.validateCode(code);

      // Should not detect jest.mock after removing the rule
      const jestMockViolations = result.violations.filter(v => v.rule === 'no-jest-mock');
      expect(jestMockViolations).toHaveLength(0);
    });
  });

  describe("getRules", () => {
    it('should return all active rules', () => {
      const rules = validator.getRules();

      expect(rules).toContainEqual(
        expect.objectContaining({ name: 'no-jest-mock' })
      );
      expect(rules).toContainEqual(
        expect.objectContaining({ name: 'no-sinon' })
      );
      expect(rules.length).toBeGreaterThan(0);
    });
  });

  describe('line number detection', () => {
    it('should report correct line numbers', () => {
      const code = `
        const a = 1;
        jest.mock('../module');
        const b = 2;
      `;

      const result = validator.validateCode(code);

      const violation = result.violations.find(v => v.rule === 'no-jest-mock');
      expect(violation?.line).toBe(3);
    });

    it('should handle multiple violations on different lines', () => {
      const code = `
        jest.mock('../module1');
        const x = 1;
        jest.mock('../module2');
      `;

      const result = validator.validateCode(code);

      const violations = result.violations.filter(v => v.rule === 'no-jest-mock');
      expect(violations).toHaveLength(2);
      expect(violations[0].line).toBe(2);
      expect(violations[1].line).toBe(4);
    });
  });

  describe('severity levels', () => {
    it('should assign appropriate severity levels', () => {
      const code = `
        jest.mock('../critical');
        const mockData = {};
        const stub = sinon.stub();
      `;

      const result = validator.validateCode(code);

      const jestViolation = result.violations.find(v => v.rule === 'no-jest-mock');
      const namingViolation = result.violations.find(v => v.rule === 'no-mock-naming');
      const sinonViolation = result.violations.find(v => v.rule === 'no-sinon');

      expect(jestViolation?.severity).toBe('error');
      expect(namingViolation?.severity).toBe('warning');
      expect(sinonViolation?.severity).toBe('error');
    });
  });
});