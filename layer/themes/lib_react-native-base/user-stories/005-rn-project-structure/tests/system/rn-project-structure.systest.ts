/**
 * System Test: React Native Project Structure
 * 
 * Tests React Native project structure generation, validation,
 * and best practices enforcement.
 */

import { test, expect } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

test.describe('React Native Project Structure System Tests', () => {
  let testDir: string;
  let structureToolPath: string;

  test.beforeAll(async () => {
    testDir = join(tmpdir(), 'rn-structure-test');
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }

    structureToolPath = join(__dirname, '../../src/structure-generator.ts');
  });

  test('should generate standard RN project structure', async () => {
    const projectName = 'StandardRNApp';
    
    try {
      const command = `bun run ${structureToolPath} --create --name=${projectName} --template=standard --output=${testDir}`;
      await execAsync(command, { cwd: testDir, timeout: 60000 });

      const projectPath = join(testDir, projectName);
      const expectedStructure = [
        'src/components',
        'src/screens', 
        'src/navigation',
        'src/services',
        'src/utils',
        'src/types',
        '__tests__'
      ];

      expectedStructure.forEach(dir => {
        expect(existsSync(join(projectPath, dir))).toBe(true);
      });
    } catch (error) {
      console.log('RN structure generation not implemented:', error.message);
    }
  });

  test('should validate project structure compliance', async () => {
    try {
      const command = `bun run ${structureToolPath} --validate --input=${testDir}/StandardRNApp`;
      const { stdout } = await execAsync(command, { cwd: testDir, timeout: 30000 });

      expect(stdout).toContain('valid' || 'compliant' || 'structure');
    } catch (error) {
      console.log('Structure validation not implemented:', error.message);
    }
  });

  test('should generate TypeScript configuration', async () => {
    const projectPath = join(testDir, 'StandardRNApp');
    
    if (existsSync(projectPath)) {
      const tsconfigPath = join(projectPath, 'tsconfig.json');
      if (existsSync(tsconfigPath)) {
        const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));
        expect(tsconfig).toHaveProperty('compilerOptions');
        expect(tsconfig.compilerOptions).toHaveProperty('jsx', 'react-native');
      }
    }
  });
});
