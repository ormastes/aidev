/**
 * External tests for 019_agentic_coding
 * Tests real external dependencies and services
 * NO MOCKS ALLOWED
 */

import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';

describe('019_agentic_coding External Tests', () => {
  describe('Code Execution', () => {
    it('should execute generated JavaScript code', async () => {
      const testCode = `
        console.log('Hello from generated code');
        process.exit(0);
      `;
      
      const testFile = path.join(__dirname, 'test-exec.js');
      await fs.writeFile(testFile, testCode);
      
      try {
        const result = await new Promise<string>((resolve, reject) => {
          let output = '';
          const child = spawn('node', [testFile]);
          
          child.stdout.on('data', (data) => {
            output += data.toString();
          });
          
          child.on('exit', (code) => {
            if (code === 0) {
              resolve(output);
            } else {
              reject(new Error(`Process exited with code ${code}`));
            }
          });
        });
        
        expect(result).toContain('Hello from generated code');
      } finally {
        await fs.unlink(testFile).catch(() => {});
      }
    });
    
    it('should run generated Jest tests', async () => {
      const testCode = `
        test('generated test', () => {
          expect(1 + 1).toBe(2);
        });
      `;
      
      const testFile = path.join(__dirname, 'generated.test.js');
      await fs.writeFile(testFile, testCode);
      
      try {
        const result = await new Promise<string>((resolve, reject) => {
          let output = '';
          const child = spawn('npx', ['jest', testFile, '--no-coverage']);
          
          child.stdout.on('data', (data) => {
            output += data.toString();
          });
          
          child.stderr.on('data', (data) => {
            output += data.toString();
          });
          
          child.on('exit', (code) => {
            resolve(output);
          });
        });
        
        expect(result).toContain('1 passed');
      } finally {
        await fs.unlink(testFile).catch(() => {});
      }
    });
  });
  
  describe('LLM Integration', () => {
    it('should connect to LLM service if configured', async () => {
      // This would test real LLM API
      if (process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY) {
        // Real API test would go here
        // Test implementation pending
      } else {
        console.log('Skipping LLM test - no API key configured');
        // Test implementation pending
      }
    });
  });
});