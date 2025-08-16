// Math utility functions with full test coverage

function add(a, b) {
  return a + b;
}

function subtract(a, b) {
  return a - b;
}

function multiply(a, b) {
  return a * b;
}

function divide(a, b) {
  if (b === 0) {
    throw new Error('Division by zero');
  }
  return a / b;
}

function power(base, exponent) {
  return Math.pow(base, exponent);
}

function factorial(n) {
  if (n < 0) {
    throw new Error('Factorial of negative number');
  }
  if (n === 0 || n === 1) {
    return 1;
  }
  return n * factorial(n - 1);
}

function isEven(n) {
  return n % 2 === 0;
}

function isOdd(n) {
  return n % 2 !== 0;
}

function max(a, b) {
  return a > b ? a : b;
}

function min(a, b) {
  return a < b ? a : b;
}

function abs(n) {
  return n < 0 ? -n : n;
}

function sqrt(n) {
  if (n < 0) {
    throw new Error('Square root of negative number');
  }
  return Math.sqrt(n);
}

export {
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
};