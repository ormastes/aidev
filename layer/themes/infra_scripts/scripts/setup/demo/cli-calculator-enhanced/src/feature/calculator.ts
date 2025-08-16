/**
 * Calculator Core Operations
 * Enhanced demo with full VF integration
 */

export interface CalculatorOperation {
    name: string;
    symbol: string;
    execute: (a: number, b: number) => number;
}

export class Calculator {
    private history: Array<{ operation: string; result: number }> = [];

    add(a: number, b: number): number {
        const result = a + b;
        this.history.push({ operation: `${a} + ${b}`, result });
        return result;
    }

    subtract(a: number, b: number): number {
        const result = a - b;
        this.history.push({ operation: `${a} - ${b}`, result });
        return result;
    }

    multiply(a: number, b: number): number {
        const result = a * b;
        this.history.push({ operation: `${a} * ${b}`, result });
        return result;
    }

    divide(a: number, b: number): number {
        if (b === 0) {
            throw new Error('Division by zero is not allowed');
        }
        const result = a / b;
        this.history.push({ operation: `${a} / ${b}`, result });
        return result;
    }

    getHistory(): Array<{ operation: string; result: number }> {
        return [...this.history];
    }

    clearHistory(): void {
        this.history = [];
    }
}

export default Calculator;
