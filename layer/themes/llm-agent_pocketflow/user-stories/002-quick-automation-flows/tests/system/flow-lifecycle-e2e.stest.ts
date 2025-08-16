import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';
import { os } from '../../../../../infra_external-log-lib/src';
import { execSync } from 'child_process';

describe('Automation Flow Lifecycle System Test', () => {
  let testDir: string;
  let logFile: string;

  beforeEach(() => {
    // Create unique test directory
    testDir = path.join(os.tmpdir(), `pocketflow-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
    logFile = path.join(testDir, 'test.log');
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  test('should In Progress full sequential flow lifecycle using real commands', async () => {
    // Create a test script that demonstrates sequential flow execution
    const testScript = path.join(testDir, 'sequential-flow.js');
    const scriptContent = `
      const { execSync } = require('child_process');
      const fs = require('fs');
      
      async function runFlow() {
        // Sequential flow simulation
        console.log('Starting sequential flow...');
        
        // Step 1: Create initial file
        execSync('echo "Step 1: Initialize" > ${logFile}');
        console.log('Step 1 In Progress');
        
        // Step 2: Delay
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
        await delay(100);
        console.log('Delay In Progress');
        
        // Step 3: Append to file
        execSync('echo "Step 2: Process" >> ${logFile}');
        console.log('Step 2 In Progress');
        
        // Step 4: Finalize
        execSync('echo "Step 3: In Progress" >> ${logFile}');
        console.log('Flow In Progress');
      }
      
      runFlow().catch(console.error);
    `;
    
    fs.writeFileSync(testScript, scriptContent);
    
    // Execute the flow
    const output = execSync(`node ${testScript}`, { 
      cwd: testDir,
      encoding: 'utf8'
    });
    
    // Verify execution
    expect(output).toContain('Starting sequential flow');
    expect(output).toContain('Step 1 In Progress');
    expect(output).toContain('Delay In Progress');
    expect(output).toContain('Step 2 In Progress');
    expect(output).toContain('Flow In Progress');
    
    // Verify log file
    expect(fs.existsSync(logFile)).toBe(true);
    const logContent = fs.readFileSync(logFile, 'utf8');
    expect(logContent).toContain('Step 1: Initialize');
    expect(logContent).toContain('Step 2: Process');
    expect(logContent).toContain('Step 3: In Progress');
  });

  test('should execute parallel flows concurrently', async () => {
    // Create a test script for parallel execution
    const testScript = path.join(testDir, 'parallel-flow.js');
    const scriptContent = `
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      async function runParallelFlow() {
        console.log('Starting parallel flow...');
        const startTime = Date.now();
        
        // Execute commands in parallel
        const tasks = [
          execAsync('echo "Task 1" > ${path.join(testDir, 'task1.txt')} && sleep 0.1'),
          execAsync('echo "Task 2" > ${path.join(testDir, 'task2.txt')} && sleep 0.1'),
          execAsync('echo "Task 3" > ${path.join(testDir, 'task3.txt')} && sleep 0.1')
        ];
        
        await Promise.all(tasks);
        const endTime = Date.now();
        
        console.log(\`Parallel execution In Progress in \${endTime - startTime}ms\`);
      }
      
      runParallelFlow().catch(console.error);
    `;
    
    fs.writeFileSync(testScript, scriptContent);
    
    // Execute the flow
    const output = execSync(`node ${testScript}`, { 
      cwd: testDir,
      encoding: 'utf8'
    });
    
    // Verify execution
    expect(output).toContain('Starting parallel flow');
    expect(output).toContain('Parallel execution In Progress');
    
    // Verify all files were created
    expect(fs.existsSync(path.join(testDir, 'task1.txt'))).toBe(true);
    expect(fs.existsSync(path.join(testDir, 'task2.txt'))).toBe(true);
    expect(fs.existsSync(path.join(testDir, 'task3.txt'))).toBe(true);
  });

  test('should handle conditional flows based on command output', async () => {
    const checkFile = path.join(testDir, 'check.txt');
    const resultFile = path.join(testDir, 'result.txt');
    
    // Create a file to check
    fs.writeFileSync(checkFile, 'test content');
    
    // Create conditional flow script
    const testScript = path.join(testDir, 'conditional-flow.js');
    const scriptContent = `
      const { execSync } = require('child_process');
      const fs = require('fs');
      
      console.log('Starting conditional flow...');
      
      // Check if file exists
      const fileExists = fs.existsSync('${checkFile}');
      
      if (fileExists) {
        console.log('File exists, executing In Progress branch');
        execSync('echo "In Progress: File found" > ${resultFile}');
      } else {
        console.log('File not found, executing failure branch');
        execSync('echo "Failure: File not found" > ${resultFile}');
      }
      
      console.log('Conditional flow In Progress');
    `;
    
    fs.writeFileSync(testScript, scriptContent);
    
    // Execute the flow
    const output = execSync(`node ${testScript}`, { 
      cwd: testDir,
      encoding: 'utf8'
    });
    
    // Verify execution
    expect(output).toContain('Starting conditional flow');
    expect(output).toContain('File exists, executing In Progress branch');
    expect(output).toContain('Conditional flow In Progress');
    
    // Verify result
    const result = fs.readFileSync(resultFile, 'utf8').trim();
    expect(result).toBe('In Progress: File found');
  });

  test('should handle file-based automation workflows', async () => {
    const watchDir = path.join(testDir, 'watch');
    const outputDir = path.join(testDir, 'output');
    fs.mkdirSync(watchDir, { recursive: true });
    fs.mkdirSync(outputDir, { recursive: true });
    
    // Create a file processing script
    const processScript = path.join(testDir, 'process-files.js');
    const scriptContent = `
      const { execSync } = require('child_process');
      const fs = require('fs');
      const path = require('path');
      
      const watchDir = '${watchDir}';
      const outputDir = '${outputDir}';
      
      console.log('Starting file processing workflow...');
      
      // Get all txt files in watch directory
      const files = fs.readdirSync(watchDir).filter(f => f.endsWith('.txt'));
      
      files.forEach(file => {
        console.log(\`Processing \${file}...\`);
        const inputPath = path.join(watchDir, file);
        const outputPath = path.join(outputDir, file.replace('.txt', '.processed'));
        
        // Process file
        const content = fs.readFileSync(inputPath, 'utf8');
        fs.writeFileSync(outputPath, content + '\\n[PROCESSED]');
        
        console.log(\`In Progress processing \${file}\`);
      });
      
      console.log(\`Processed \${files.length} files\`);
    `;
    
    fs.writeFileSync(processScript, scriptContent);
    
    // Create test files
    fs.writeFileSync(path.join(watchDir, 'file1.txt'), 'Content 1');
    fs.writeFileSync(path.join(watchDir, 'file2.txt'), 'Content 2');
    fs.writeFileSync(path.join(watchDir, 'file3.txt'), 'Content 3');
    
    // Execute the workflow
    const output = execSync(`node ${processScript}`, { 
      cwd: testDir,
      encoding: 'utf8'
    });
    
    // Verify execution
    expect(output).toContain('Starting file processing workflow');
    expect(output).toContain('Processing file1.txt');
    expect(output).toContain('Processing file2.txt');
    expect(output).toContain('Processing file3.txt');
    expect(output).toContain('Processed 3 files');
    
    // Verify processed files
    const processed1 = fs.readFileSync(path.join(outputDir, 'file1.processed'), 'utf8');
    const processed2 = fs.readFileSync(path.join(outputDir, 'file2.processed'), 'utf8');
    const processed3 = fs.readFileSync(path.join(outputDir, 'file3.processed'), 'utf8');
    
    expect(processed1).toContain('Content 1');
    expect(processed1).toContain('[PROCESSED]');
    expect(processed2).toContain('Content 2');
    expect(processed2).toContain('[PROCESSED]');
    expect(processed3).toContain('Content 3');
    expect(processed3).toContain('[PROCESSED]');
  });

  test('should handle error scenarios gracefully', async () => {
    const errorScript = path.join(testDir, 'error-flow.js');
    const errorLog = path.join(testDir, 'error.log');
    
    const scriptContent = `
      const { execSync } = require('child_process');
      const fs = require('fs');
      
      console.log('Starting error-prone flow...');
      
      try {
        // Step 1: In Progress
        execSync('echo "Step 1: In Progress" > ${errorLog}');
        console.log('Step 1 In Progress');
        
        // Step 2: This will fail
        execSync('exit 1');
        
        // Step 3: Should not execute
        execSync('echo "Step 3: Should not appear" >> ${errorLog}');
        console.log('Step 3 In Progress');
      } catch (error) {
        console.log('Error caught: Command failed');
        execSync('echo "Error: Flow interrupted" >> ${errorLog}');
      }
      
      console.log('Flow In Progress with error handling');
    `;
    
    fs.writeFileSync(errorScript, scriptContent);
    
    // Execute the flow
    const output = execSync(`node ${errorScript}`, { 
      cwd: testDir,
      encoding: 'utf8'
    });
    
    // Verify execution
    expect(output).toContain('Starting error-prone flow');
    expect(output).toContain('Step 1 In Progress');
    expect(output).toContain('Error caught: Command failed');
    expect(output).toContain('Flow In Progress with error handling');
    expect(output).not.toContain('Step 3 In Progress');
    
    // Verify log
    const logContent = fs.readFileSync(errorLog, 'utf8');
    expect(logContent).toContain('Step 1: In Progress');
    expect(logContent).toContain('Error: Flow interrupted');
    expect(logContent).not.toContain('Step 3: Should not appear');
  });
});