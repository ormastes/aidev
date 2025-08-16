/**
 * System Test: Calculator Simple Operations
 * Story: US001_Calculator_BasicMath
 * Diagram: SD001_Calculator_ProcessRequest
 */

import { Calculator } from '../../../src/calculator/calculator';

describe('test_US001_SD001_basic_operations', () => {
  let calculator: Calculator;

  beforeEach(() => {
    calculator = new Calculator();
  });

  it('should perform addition correctly', () => {
    const result = calculator.add(25, 17);
    expect(result).toBe(42);
    expect(calculator.getLastResult()).toBe(42);
  });

  it('should perform multiplication correctly', () => {
    const result = calculator.multiply(100, 3);
    expect(result).toBe(300);
    expect(calculator.getLastResult()).toBe(300);
  });

  it('should perform division correctly', () => {
    const result = calculator.divide(1000, 25);
    expect(result).toBe(40);
    expect(calculator.getLastResult()).toBe(40);
  });

  it('should perform subtraction correctly', () => {
    const result = calculator.subtract(99, 33);
    expect(result).toBe(66);
  });

  it('should calculate from string expressions', () => {
    expect(calculator.calculate('25 + 17')).toBe(42);
    expect(calculator.calculate('100 * 3')).toBe(300);
    expect(calculator.calculate('1000 / 25')).toBe(40);
    expect(calculator.calculate('99 - 33')).toBe(66);
  });
});

describe('test_US001_SD001_error_handling', () => {
  let calculator: Calculator;

  beforeEach(() => {
    calculator = new Calculator();
  });

  it('should handle division by zero', () => {
    expect(() => calculator.divide(10, 0)).toThrow('Division by zero');
  });

  it('should handle invalid expressions', () => {
    expect(() => calculator.calculate('abc + def')).toThrow('Invalid expression');
    expect(() => calculator.calculate('10 +')).toThrow('Invalid expression');
    expect(() => calculator.calculate('')).toThrow('Invalid expression');
  });
});