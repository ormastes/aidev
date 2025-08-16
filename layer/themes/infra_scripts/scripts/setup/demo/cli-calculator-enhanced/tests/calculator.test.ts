/**
 * Calculator Tests - Mock Free Test Oriented Development
 */

import Calculator from '../src/calculator';

describe('Calculator Core Operations', () => {
    let calculator: Calculator;

    beforeEach(() => {
        calculator = new Calculator();
    });

    describe('Addition', () => {
        test('should add positive numbers correctly', () => {
            expect(calculator.add(2, 3)).toBe(5);
            expect(calculator.add(10, 15)).toBe(25);
        });

        test('should add negative numbers correctly', () => {
            expect(calculator.add(-2, -3)).toBe(-5);
            expect(calculator.add(-10, 5)).toBe(-5);
        });

        test('should handle zero addition', () => {
            expect(calculator.add(0, 5)).toBe(5);
            expect(calculator.add(5, 0)).toBe(5);
            expect(calculator.add(0, 0)).toBe(0);
        });
    });

    describe('Subtraction', () => {
        test('should subtract numbers correctly', () => {
            expect(calculator.subtract(5, 3)).toBe(2);
            expect(calculator.subtract(10, 15)).toBe(-5);
        });

        test('should handle negative subtraction', () => {
            expect(calculator.subtract(-5, -3)).toBe(-2);
            expect(calculator.subtract(-5, 3)).toBe(-8);
        });
    });

    describe('Multiplication', () => {
        test('should multiply numbers correctly', () => {
            expect(calculator.multiply(2, 3)).toBe(6);
            expect(calculator.multiply(-2, 3)).toBe(-6);
            expect(calculator.multiply(-2, -3)).toBe(6);
        });

        test('should handle zero multiplication', () => {
            expect(calculator.multiply(0, 5)).toBe(0);
            expect(calculator.multiply(5, 0)).toBe(0);
        });
    });

    describe('Division', () => {
        test('should divide numbers correctly', () => {
            expect(calculator.divide(6, 2)).toBe(3);
            expect(calculator.divide(10, 4)).toBe(2.5);
        });

        test('should handle negative division', () => {
            expect(calculator.divide(-6, 2)).toBe(-3);
            expect(calculator.divide(6, -2)).toBe(-3);
            expect(calculator.divide(-6, -2)).toBe(3);
        });

        test('should throw error on division by zero', () => {
            expect(() => calculator.divide(5, 0)).toThrow('Division by zero is not allowed');
        });
    });

    describe('History Management', () => {
        test('should track calculation history', () => {
            calculator.add(2, 3);
            calculator.subtract(10, 5);
            
            const history = calculator.getHistory();
            expect(history).toHaveLength(2);
            expect(history[0]).toEqual({ operation: '2 + 3', result: 5 });
            expect(history[1]).toEqual({ operation: '10 - 5', result: 5 });
        });

        test('should clear history', () => {
            calculator.add(2, 3);
            calculator.clearHistory();
            
            expect(calculator.getHistory()).toHaveLength(0);
        });
    });
});
