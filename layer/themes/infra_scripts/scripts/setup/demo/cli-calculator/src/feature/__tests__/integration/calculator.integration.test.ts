import { Calculator } from '../../core/Calculator';

describe('Calculator Integration Tests', () => {
  let calculator: Calculator;
  
  beforeEach(() => {
    calculator = new Calculator();
  });
  
  describe('arithmetic operations', () => {
    test('should perform addition correctly', () => {
      expect(calculator.add(5, 3)).toBe(8);
      expect(calculator.add(-5, 3)).toBe(-2);
      expect(calculator.add(0, 0)).toBe(0);
      expect(calculator.add(1.5, 2.5)).toBe(4);
    });
    
    test('should perform subtraction correctly', () => {
      expect(calculator.subtract(10, 4)).toBe(6);
      expect(calculator.subtract(-5, 3)).toBe(-8);
      expect(calculator.subtract(0, 0)).toBe(0);
      expect(calculator.subtract(1.5, 0.5)).toBe(1);
    });
    
    test('should perform multiplication correctly', () => {
      expect(calculator.multiply(6, 7)).toBe(42);
      expect(calculator.multiply(-5, 3)).toBe(-15);
      expect(calculator.multiply(0, 100)).toBe(0);
      expect(calculator.multiply(2.5, 4)).toBe(10);
    });
    
    test('should perform division correctly', () => {
      expect(calculator.divide(20, 4)).toBe(5);
      expect(calculator.divide(-15, 3)).toBe(-5);
      expect(calculator.divide(0, 5)).toBe(0);
      expect(calculator.divide(7.5, 2.5)).toBe(3);
    });
    
    test('should throw error for division by zero', () => {
      expect(() => calculator.divide(10, 0)).toThrow('Division by zero');
    });
  });
});