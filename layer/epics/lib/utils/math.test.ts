const {
  add,
  subtract,
  multiply,
  divide,
  power,
  factorial,
  isEven,
  isOdd,
  max,
  min,
  abs,
  sqrt
} = require('./math');

describe('Math Utils', () => {
  describe('add', () => {
    test('adds two positive numbers', () => {
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
    test('subtracts two numbers', () => {
      expect(subtract(5, 3)).toBe(2);
    });

    test('subtracts negative numbers', () => {
      expect(subtract(-5, -3)).toBe(-2);
    });
  });

  describe('multiply', () => {
    test('multiplies two numbers', () => {
      expect(multiply(3, 4)).toBe(12);
    });

    test('multiplies by zero', () => {
      expect(multiply(5, 0)).toBe(0);
    });

    test('multiplies negative numbers', () => {
      expect(multiply(-3, -4)).toBe(12);
    });
  });

  describe('divide', () => {
    test('divides two numbers', () => {
      expect(divide(10, 2)).toBe(5);
    });

    test('throws error for division by zero', () => {
      expect(() => divide(10, 0)).toThrow('Division by zero');
    });

    test('divides negative numbers', () => {
      expect(divide(-10, -2)).toBe(5);
    });
  });

  describe('power', () => {
    test('calculates power', () => {
      expect(power(2, 3)).toBe(8);
    });

    test('handles zero exponent', () => {
      expect(power(5, 0)).toBe(1);
    });

    test('handles negative exponent', () => {
      expect(power(2, -2)).toBe(0.25);
    });
  });

  describe('factorial', () => {
    test('calculates factorial of positive number', () => {
      expect(factorial(5)).toBe(120);
    });

    test('factorial of 0 is 1', () => {
      expect(factorial(0)).toBe(1);
    });

    test('factorial of 1 is 1', () => {
      expect(factorial(1)).toBe(1);
    });

    test('throws error for negative number', () => {
      expect(() => factorial(-5)).toThrow('Factorial of negative number');
    });
  });

  describe('isEven', () => {
    test('identifies even numbers', () => {
      expect(isEven(4)).toBe(true);
      expect(isEven(0)).toBe(true);
    });

    test('identifies odd numbers', () => {
      expect(isEven(3)).toBe(false);
      expect(isEven(-3)).toBe(false);
    });
  });

  describe('isOdd', () => {
    test('identifies odd numbers', () => {
      expect(isOdd(3)).toBe(true);
      expect(isOdd(-3)).toBe(true);
    });

    test('identifies even numbers', () => {
      expect(isOdd(4)).toBe(false);
      expect(isOdd(0)).toBe(false);
    });
  });

  describe('max', () => {
    test('returns maximum of two numbers', () => {
      expect(max(3, 5)).toBe(5);
    });

    test('handles equal numbers', () => {
      expect(max(5, 5)).toBe(5);
    });

    test('handles negative numbers', () => {
      expect(max(-3, -5)).toBe(-3);
    });
  });

  describe('min', () => {
    test('returns minimum of two numbers', () => {
      expect(min(3, 5)).toBe(3);
    });

    test('handles equal numbers', () => {
      expect(min(5, 5)).toBe(5);
    });

    test('handles negative numbers', () => {
      expect(min(-3, -5)).toBe(-5);
    });
  });

  describe('abs', () => {
    test('returns absolute value of positive number', () => {
      expect(abs(5)).toBe(5);
    });

    test('returns absolute value of negative number', () => {
      expect(abs(-5)).toBe(5);
    });

    test('returns absolute value of zero', () => {
      expect(abs(0)).toBe(0);
    });
  });

  describe('sqrt', () => {
    test('calculates square root', () => {
      expect(sqrt(9)).toBe(3);
    });

    test('calculates square root of zero', () => {
      expect(sqrt(0)).toBe(0);
    });

    test('throws error for negative number', () => {
      expect(() => sqrt(-9)).toThrow('Square root of negative number');
    });
  });
});