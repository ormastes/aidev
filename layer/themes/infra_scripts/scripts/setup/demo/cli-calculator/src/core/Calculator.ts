import { add, subtract, multiply, divide } from '../operations/arithmetic';

export class Calculator {
  add(a: number, b: number): number {
    return add(a, b);
  }
  
  subtract(a: number, b: number): number {
    return subtract(a, b);
  }
  
  multiply(a: number, b: number): number {
    return multiply(a, b);
  }
  
  divide(a: number, b: number): number {
    return divide(a, b);
  }
}