/**
 * Environment tests for 019_agentic_coding
 * Tests real environment setup and configuration
 * NO MOCKS ALLOWED
 */

describe('019_agentic_coding Environment Tests', () => {
  describe('TypeScript Environment', () => {
    it('should have TypeScript compiler available', async () => {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      const { stdout } = await execAsync('bunx tsc --version');
      expect(stdout).toContain('Version');
    });
    
    it('should compile generated TypeScript code', async () => {
      const fs = require('node:fs').promises;
      const path = require('node:path');
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      // Create a test file
      const testFile = path.join(__dirname, 'test-compile.ts');
      const testCode = `
        export function testFunction(x: number): number {
          return x * 2;
        }
      `;
      
      await fs.writeFile(testFile, testCode);
      
      try {
        const { stderr } = await execAsync(`bunx tsc --noEmit ${testFile}`);
        expect(stderr).toBe('');
      } finally {
        await fs.unlink(testFile).catch(() => {});
      }
    });
  });
  
  describe('Node.js Environment', () => {
    it('should have required Node.js version', () => {
      const version = process.version;
      const major = parseInt(version.split('.')[0]?.substring(1) || '0');
      expect(major).toBeGreaterThanOrEqual(16);
    });
    
    it('should have required environment variables', () => {
      // Add any required env vars for your agent system
      // expect(process.env.OPENAI_API_KEY).toBeDefined();
    });
  });
});
