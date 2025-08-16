import { spawn } from 'child_process';
import { path } from '../../../../../../../../../infra_external-log-lib/src';

describe('CLI Calculator System Tests', () => {
  const calculatorPath = path.join(__dirname, '../../index.ts');
  
  function runCalculator(input: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const calculator = spawn('ts-node', [calculatorPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let output = '';
      let error = '';
      
      calculator.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      calculator.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      calculator.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Process exited with code ${code}: ${error}`));
        } else {
          resolve(output);
        }
      });
      
      calculator.stdin.write(input);
      calculator.stdin.end();
    });
  }
  
  test('should add two numbers', async () => {
    const result = await runCalculator('add 5 3\nexit\n');
    expect(result).toContain('8');
  });
  
  test('should subtract two numbers', async () => {
    const result = await runCalculator('subtract 10 4\nexit\n');
    expect(result).toContain('6');
  });
  
  test('should multiply two numbers', async () => {
    const result = await runCalculator('multiply 6 7\nexit\n');
    expect(result).toContain('42');
  });
  
  test('should divide two numbers', async () => {
    const result = await runCalculator('divide 20 4\nexit\n');
    expect(result).toContain('5');
  });
  
  test('should handle division by zero', async () => {
    const result = await runCalculator('divide 10 0\nexit\n');
    expect(result).toContain('Error');
  });
  
  test('should show help when requested', async () => {
    const result = await runCalculator('help\nexit\n');
    expect(result).toContain('Available commands');
  });
});