/**
 * System Test: Calculator Error Handling
 * Story: US001_Calculator_BasicMath
 * Diagram: SD001_Calculator_ProcessRequest
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { Calculator } from '../../../src/calculator/calculator';
import { externalLogLib } from '../../../src/logging/external-log-lib';

describe('test_US001_SD001_error_handling', () => {
  let calculator: Calculator;

  beforeEach(() => {
    calculator = new Calculator();
    externalLogLib.clear();
  });

  it('should handle division by zero', () => {
    expect(() => calculator.divide(10, 0)).toThrow('Division by zero');
    
    // Log error
    externalLogLib.log('logger', 'error', 'ext_logger_write', { 
      error: 'Division by zero attempted' 
    }, null);
  });

  it('should handle invalid expressions', () => {
    expect(() => calculator.calculate('abc + def')).toThrow('Invalid expression');
    expect(() => calculator.calculate('10 +')).toThrow('Invalid expression');
    expect(() => calculator.calculate('* 20')).toThrow('Invalid expression');
    expect(() => calculator.calculate('')).toThrow('Invalid expression');
  });

  it('should handle very large numbers', () => {
    const large1 = 999999999999;
    const large2 = 888888888888;
    
    const result = calculator.add(large1, large2);
    expect(result).toBe(large1 + large2);
    
    // Test multiplication overflow
    const multiplyResult = calculator.multiply(large1, large2);
    expect(multiplyResult).toBe(large1 * large2);
  });

  it('should handle decimal precision', () => {
    const result = calculator.divide(10, 3);
    expect(result).toBeCloseTo(3.333333, 5);
    
    const addResult = calculator.add(0.1, 0.2);
    expect(addResult).toBeCloseTo(0.3, 10);
  });

  it('should handle negative numbers', () => {
    expect(calculator.add(-5, -3)).toBe(-8);
    expect(calculator.subtract(-10, -20)).toBe(10);
    expect(calculator.multiply(-4, 5)).toBe(-20);
    expect(calculator.divide(-100, 25)).toBe(-4);
  });

  it('should validate operator in calculate method', () => {
    // Test with invalid operators
    expect(() => calculator.calculate('10 ^ 2')).toThrow('Invalid expression');
    expect(() => calculator.calculate('10 % 3')).toThrow('Invalid expression');
  });
});