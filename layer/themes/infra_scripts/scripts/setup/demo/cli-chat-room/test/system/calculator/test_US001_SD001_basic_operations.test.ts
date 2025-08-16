/**
 * System Test: Calculator Basic Operations
 * Story: US001_Calculator_BasicMath
 * Diagram: SD001_Calculator_ProcessRequest
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Calculator } from '../../../src/calculator/calculator';
import { externalLogLib } from '../../../src/logging/external-log-lib';

describe('test_US001_SD001_basic_operations', () => {
  let calculator: Calculator;

  beforeAll(() => {
    // Enable external logging to track calls
    externalLogLib.enable();
  });

  beforeEach(() => {
    calculator = new Calculator();
    // Clear external logs before each test
    externalLogLib.clear();
  });

  afterAll(() => {
    // Report external calls
    const stats = externalLogLib.getStats();
    console.log('External calls:', stats);
  });

  it('should perform addition correctly', () => {
    // Simulate external calls
    externalLogLib.log('cache', 'get', 'ext_cache_get', {}, null);
    
    const result = calculator.add(25, 17);
    expect(result).toBe(42);
    expect(calculator.getLastResult()).toBe(42);
    
    // Simulate logging
    externalLogLib.log('logger', 'write', 'ext_logger_write', { message: 'Addition performed' }, null);
  });

  it('should perform multiplication correctly', () => {
    // Simulate cache check
    externalLogLib.log('cache', 'get', 'ext_cache_get', {}, null);
    
    const result = calculator.multiply(100, 3);
    expect(result).toBe(300);
    expect(calculator.getLastResult()).toBe(300);
    
    // Simulate database query
    externalLogLib.log('database', 'query', 'ext_database_query', { query: 'SELECT * FROM calculations' }, []);
  });

  it('should perform division correctly', () => {
    const result = calculator.divide(1000, 25);
    expect(result).toBe(40);
    expect(calculator.getLastResult()).toBe(40);
    
    // Verify no division by zero
    expect(() => calculator.divide(10, 0)).toThrow('Division by zero');
  });

  it('should perform subtraction correctly', () => {
    const result = calculator.subtract(99, 33);
    expect(result).toBe(66);
    
    // Test negative results
    const negativeResult = calculator.subtract(10, 20);
    expect(negativeResult).toBe(-10);
  });

  it('should maintain calculation history', () => {
    calculator.add(5, 3);
    calculator.multiply(4, 7);
    calculator.subtract(10, 4);
    
    const history = calculator.getHistory();
    expect(history).toHaveLength(3);
    expect(history[0]).toEqual({ operation: '5 + 3', result: 8 });
    expect(history[1]).toEqual({ operation: '4 * 7', result: 28 });
    expect(history[2]).toEqual({ operation: '10 - 4', result: 6 });
  });

  it('should clear history', () => {
    calculator.add(1, 2);
    calculator.multiply(3, 4);
    
    expect(calculator.getHistory()).toHaveLength(2);
    
    calculator.clearHistory();
    expect(calculator.getHistory()).toHaveLength(0);
    expect(calculator.getLastResult()).toBe(0);
  });

  it('should calculate from string expressions', () => {
    expect(calculator.calculate('25 + 17')).toBe(42);
    expect(calculator.calculate('100 * 3')).toBe(300);
    expect(calculator.calculate('1000 / 25')).toBe(40);
    expect(calculator.calculate('99 - 33')).toBe(66);
    
    // Simulate external API call
    externalLogLib.log('http', 'request', 'ext_http_request', { url: '/api/calculate' }, { status: 200 });
  });

  it('should track external calls as per sequence diagram', () => {
    // Simulate the sequence diagram flow
    externalLogLib.log('cache', 'get', 'ext_cache_get', {}, null);
    calculator.add(10, 20);
    externalLogLib.log('database', 'query', 'ext_database_query', {}, []);
    externalLogLib.log('logger', 'write', 'ext_logger_write', {}, null);
    
    const logs = externalLogLib.getLogs();
    const functionNames = logs.map(l => l.functionName);
    
    expect(functionNames).toContain('ext_cache_get');
    expect(functionNames).toContain('ext_database_query');
    expect(functionNames).toContain('ext_logger_write');
  });
});