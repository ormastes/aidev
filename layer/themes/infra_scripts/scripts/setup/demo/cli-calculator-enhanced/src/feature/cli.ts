/**
 * CLI Interface for Calculator
 * Interactive command-line interface
 */

import * as readline from 'readline';
import Calculator from './calculator';

export class CalculatorCLI {
    private calculator: Calculator;
    private rl: readline.Interface;

    constructor() {
        this.calculator = new Calculator();
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    start(): void {
        console.log('=== Enhanced Calculator CLI ===');
        console.log('Commands: add, subtract, multiply, divide, history, clear, help, exit');
        console.log('');
        this.prompt();
    }

    private prompt(): void {
        this.rl.question('calculator> ', (input) => {
            this.processCommand(input.trim());
        });
    }

    private processCommand(input: string): void {
        const parts = input.split(' ');
        const command = parts[0].toLowerCase();

        try {
            switch (command) {
                case 'add':
                case '+':
                    this.performOperation('add', parts);
                    break;
                case 'subtract':
                case '-':
                    this.performOperation('subtract', parts);
                    break;
                case 'multiply':
                case '*':
                    this.performOperation('multiply', parts);
                    break;
                case 'divide':
                case '/':
                    this.performOperation('divide', parts);
                    break;
                case 'history':
                    this.showHistory();
                    break;
                case 'clear':
                    this.calculator.clearHistory();
                    console.log('History cleared.');
                    break;
                case 'help':
                    this.showHelp();
                    break;
                case 'exit':
                case 'quit':
                    console.log('Goodbye!');
                    this.rl.close();
                    return;
                default:
                    console.log('Unknown command. Type "help" for available commands.');
            }
        } catch (error) {
            console.log(`Error: ${error.message}`);
        }

        this.prompt();
    }

    private performOperation(operation: string, parts: string[]): void {
        if (parts.length !== 3) {
            console.log(`Usage: ${operation} <number1> <number2>`);
            return;
        }

        const a = parseFloat(parts[1]);
        const b = parseFloat(parts[2]);

        if (isNaN(a) || isNaN(b)) {
            console.log('Please provide valid numbers.');
            return;
        }

        let result: number;
        switch (operation) {
            case 'add':
                result = this.calculator.add(a, b);
                break;
            case 'subtract':
                result = this.calculator.subtract(a, b);
                break;
            case 'multiply':
                result = this.calculator.multiply(a, b);
                break;
            case 'divide':
                result = this.calculator.divide(a, b);
                break;
            default:
                throw new Error('Unknown operation');
        }

        console.log(`Result: ${result}`);
    }

    private showHistory(): void {
        const history = this.calculator.getHistory();
        if (history.length === 0) {
            console.log('No calculations in history.');
            return;
        }

        console.log('Calculation History:');
        history.forEach((entry, index) => {
            console.log(`${index + 1}. ${entry.operation} = ${entry.result}`);
        });
    }

    private showHelp(): void {
        console.log('Available commands:');
        console.log('  add <a> <b>      - Add two numbers');
        console.log('  subtract <a> <b> - Subtract b from a');
        console.log('  multiply <a> <b> - Multiply two numbers');
        console.log('  divide <a> <b>   - Divide a by b');
        console.log('  history          - Show calculation history');
        console.log('  clear            - Clear calculation history');
        console.log('  help             - Show this help message');
        console.log('  exit             - Exit the calculator');
    }
}
