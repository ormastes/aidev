/**
 * Calculator Implementation
 * Core calculator logic for testing
 */

export class Calculator {
  private lastResult: number = 0;
  private history: Array<{ operation: string; result: number }> = [];

  /**
   * Add two numbers
   */
  add(a: number, b: number): number {
    const result = a + b;
    this.lastResult = result;
    this.history.push({ operation: `${a} + ${b}`, result });
    return result;
  }

  /**
   * Subtract two numbers
   */
  subtract(a: number, b: number): number {
    const result = a - b;
    this.lastResult = result;
    this.history.push({ operation: `${a} - ${b}`, result });
    return result;
  }

  /**
   * Multiply two numbers
   */
  multiply(a: number, b: number): number {
    const result = a * b;
    this.lastResult = result;
    this.history.push({ operation: `${a} * ${b}`, result });
    return result;
  }

  /**
   * Divide two numbers
   */
  divide(a: number, b: number): number {
    if (b === 0) {
      throw new Error('Division by zero');
    }
    const result = a / b;
    this.lastResult = result;
    this.history.push({ operation: `${a} / ${b}`, result });
    return result;
  }

  /**
   * Get the last result
   */
  getLastResult(): number {
    return this.lastResult;
  }

  /**
   * Get calculation history
   */
  getHistory(): Array<{ operation: string; result: number }> {
    return [...this.history];
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.history = [];
    this.lastResult = 0;
  }

  /**
   * Calculate from string expression
   */
  calculate(expression: string): number {
    // Parse simple expressions like "5 + 3"
    const match = expression.match(/(\d+\.?\d*)\s*([\+\-\*\/])\s*(\d+\.?\d*)/);
    
    if (!match) {
      throw new Error('Invalid expression');
    }

    const [, num1Str, operator, num2Str] = match;
    const num1 = parseFloat(num1Str);
    const num2 = parseFloat(num2Str);

    switch (operator) {
      case '+':
        return this.add(num1, num2);
      case '-':
        return this.subtract(num1, num2);
      case '*':
        return this.multiply(num1, num2);
      case '/':
        return this.divide(num1, num2);
      default:
        throw new Error(`Unknown operator: ${operator}`);
    }
  }
}