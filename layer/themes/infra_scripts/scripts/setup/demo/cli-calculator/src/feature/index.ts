import * as readline from 'readline';
import { Calculator } from './core/Calculator';

const calculator = new Calculator();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'calc> '
});

console.log('CLI Calculator');
console.log('Type "help" for available commands or "exit" to quit');
rl.prompt();

rl.on('line', (line: string) => {
  const input = line.trim();
  
  if (input === 'exit') {
    rl.close();
    return;
  }
  
  if (input === 'help') {
    console.log('Available commands:');
    console.log('  add <num1> <num2>      - Add two numbers');
    console.log('  subtract <num1> <num2> - Subtract second number from first');
    console.log('  multiply <num1> <num2> - Multiply two numbers');
    console.log('  divide <num1> <num2>   - Divide first number by second');
    console.log('  help                   - Show this help message');
    console.log('  exit                   - Exit the calculator');
    rl.prompt();
    return;
  }
  
  const parts = input.split(' ');
  const command = parts[0];
  const num1 = parseFloat(parts[1]);
  const num2 = parseFloat(parts[2]);
  
  if (isNaN(num1) || isNaN(num2)) {
    console.log('Error: Invalid number format');
    rl.prompt();
    return;
  }
  
  try {
    let result: number;
    
    switch (command) {
      case 'add':
        result = calculator.add(num1, num2);
        console.log(result);
        break;
      case 'subtract':
        result = calculator.subtract(num1, num2);
        console.log(result);
        break;
      case 'multiply':
        result = calculator.multiply(num1, num2);
        console.log(result);
        break;
      case 'divide':
        result = calculator.divide(num1, num2);
        console.log(result);
        break;
      default:
        console.log('Error: Unknown command');
    }
  } catch (error) {
    console.log(`Error: ${(error as Error).message}`);
  }
  
  rl.prompt();
});

rl.on('close', () => {
  console.log('Goodbye!');
  process.exit(0);
});