import { add, subtract, multiply, divide } from '../../operations/arithmetic';

describe('Arithmetic Operations Unit Tests', () => {
  describe('add', () => {
    test('adds positive numbers', () => {
      expect(add(2, 3)).toBe(5);
    });
    
    test('adds negative numbers', () => {
      expect(add(-2, -3)).toBe(-5);
    });
    
    test('adds zero', () => {
      expect(add(5, 0)).toBe(5);
    });
  });
  
  describe('subtract', () => {
    test('subtracts positive numbers', () => {
      expect(subtract(5, 3)).toBe(2);
    });
    
    test('subtracts negative numbers', () => {
      expect(subtract(-2, -3)).toBe(1);
    });
    
    test('subtracts zero', () => {
      expect(subtract(5, 0)).toBe(5);
    });
  });
  
  describe('multiply', () => {
    test('multiplies positive numbers', () => {
      expect(multiply(3, 4)).toBe(12);
    });
    
    test('multiplies by zero', () => {
      expect(multiply(5, 0)).toBe(0);
    });
    
    test('multiplies negative numbers', () => {
      expect(multiply(-2, -3)).toBe(6);
    });
  });
  
  describe('divide', () => {
    test('divides positive numbers', () => {
      expect(divide(12, 3)).toBe(4);
    });
    
    test('divides negative numbers', () => {
      expect(divide(-12, -3)).toBe(4);
    });
    
    test('throws on division by zero', () => {
      expect(() => divide(5, 0)).toThrow('Division by zero');
    });
  });
});