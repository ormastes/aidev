import { test } from '../src/test-wrapper';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

test.describe('Dangerous Operations - Sandboxed', () => {
  
  test('process termination test', async ({ sandbox }) => {
    await sandbox.runTest(async () => {
      // This would be dangerous without sandboxing
      const { stdout } = await execAsync('ps aux | grep node');
      console.log('Processes:', stdout);
      
      // Simulate killing a process (safely in sandbox)
      await execAsync('pkill -f test-process || true');
    }, { 
      useSandbox: true, 
      dangerLevel: 'high' 
    });
  });

  test('filesystem modification test', async ({ sandbox }) => {
    await sandbox.runTest(async () => {
      // Create and delete files (isolated in sandbox)
      const testDir = '/tmp/dangerous-test';
      await fs.mkdir(testDir, { recursive: true });
      
      // Write potentially harmful content
      await fs.writeFile(`${testDir}/evil.sh`, '#!/bin/bash\nrm -rf /');
      
      // Clean up
      await execAsync(`rm -rf ${testDir}`);
    }, { 
      useSandbox: true, 
      dangerLevel: 'medium' 
    });
  });

  test('system command execution test', async ({ sandbox }) => {
    await sandbox.runTest(async () => {
      // Execute system commands (contained in sandbox)
      const commands = [
        'echo "test" > /tmp/output.txt',
        'cat /etc/passwd | head -5',
        'chmod 777 /tmp/output.txt'
      ];
      
      for (const cmd of commands) {
        try {
          await execAsync(cmd);
        } catch (error) {
          console.error(`Command failed: ${cmd}`, error);
        }
      }
    }, { 
      useSandbox: true, 
      dangerLevel: 'critical',
      sandboxType: 'qemu' // Force QEMU for maximum isolation
    });
  });

  test('network operations test', async ({ sandbox }) => {
    await sandbox.runTest(async () => {
      // Network operations (isolated network namespace)
      const { stdout } = await execAsync('curl -s https://example.com || echo "Network blocked"');
      console.log('Network response:', stdout);
      
      // Port scanning simulation
      await execAsync('nc -zv localhost 80 || true');
    }, { 
      useSandbox: true, 
      dangerLevel: 'high' 
    });
  });
});

test.describe('Safe Operations - No Sandbox Needed', () => {
  
  test('simple calculation', async () => {
    const result = 2 + 2;
    console.log('Result:', result);
  });
  
  test('read-only filesystem access', async () => {
    const files = await fs.readdir('.');
    console.log('Files count:', files.length);
  });
});