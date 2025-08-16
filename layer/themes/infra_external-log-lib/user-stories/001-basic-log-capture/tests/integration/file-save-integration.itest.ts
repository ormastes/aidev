import * as fs from 'node:fs';
import * as path from 'node:path';
import { AIDevPlatform } from '../../src/application/aidev-platform';
import { FileManager } from '../../src/domain/file-manager';

describe('File Save Integration Test - Saving captured logs to filesystem', () => {
  const testOutputDir = path.join(__dirname, 'test-output');
  let platform: AIDevPlatform;
  let fileManager: FileManager;

  beforeEach(() => {
    // Clean up test directory
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true });
    }
    fs.mkdirSync(testOutputDir, { recursive: true });
    
    platform = new AIDevPlatform();
    fileManager = new FileManager();
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true });
    }
  });

  it('should save captured logs to file', async () => {
    // Capture some logs
    const session = await platform.startLogCapture({
      command: 'node',
      args: ['-e', `
        console.log('[INFO] First log entry');
        console.error('[ERROR] An error occurred');
        console.log('[DEBUG] Debug information');
      `],
      captureOutput: true
    });
    
    await session.waitForCompletion();
    
    // Save logs to file
    const logFilePath = path.join(testOutputDir, 'test-logs.txt');
    await session.saveLogsToFile(logFilePath);
    
    // Verify file exists and contains logs
    expect(fs.existsSync(logFilePath)).toBe(true);
    
    const fileContent = fs.readFileSync(logFilePath, 'utf-8');
    expect(fileContent).toContain('First log entry');
    expect(fileContent).toContain('An error occurred');
    expect(fileContent).toContain('Debug information');
    expect(fileContent).toContain('[INFO]');
    expect(fileContent).toContain('[ERROR]');
    expect(fileContent).toContain('[DEBUG]');
  });

  it('should integrate FileManager for advanced file operations', async () => {
    const session = await platform.startLogCapture({
      command: 'node',
      args: ['-e', 'console.log("[INFO] Test log")'],
      captureOutput: true
    });
    
    await session.waitForCompletion();
    
    // Use FileManager to save with options
    const logFilePath = path.join(testOutputDir, 'managed-logs.txt');
    const logs = session.getLogs();
    
    await fileManager.saveLogsToFile(logs, logFilePath, {
      format: 'json',
      compress: false,
      timestamp: true
    });
    
    // Verify file saved with proper format
    expect(fs.existsSync(logFilePath)).toBe(true);
    
    const content = fs.readFileSync(logFilePath, 'utf-8');
    const data = JSON.parse(content);
    
    expect(data.timestamp).toBeDefined();
    expect(data.logs).toBeInstanceOf(Array);
    expect(data.logs[0].message).toBe('Test log');
  });

  it('should handle different log formats when saving', async () => {
    const session = await platform.startLogCapture({
      command: 'node',
      args: ['-e', `
        console.log('2024-01-01T10:00:00.000Z [INFO] Structured log');
        console.log('[WARN] Simple format');
        console.log('Plain text log');
      `],
      captureOutput: true
    });
    
    await session.waitForCompletion();
    
    // Save in different formats
    const txtPath = path.join(testOutputDir, 'logs.txt');
    const jsonPath = path.join(testOutputDir, 'logs.json');
    const csvPath = path.join(testOutputDir, 'logs.csv');
    
    await fileManager.saveLogsToFile(session.getLogs(), txtPath, { format: 'text' });
    await fileManager.saveLogsToFile(session.getLogs(), jsonPath, { format: 'json' });
    await fileManager.saveLogsToFile(session.getLogs(), csvPath, { format: 'csv' });
    
    // Verify all formats saved correctly
    expect(fs.existsSync(txtPath)).toBe(true);
    expect(fs.existsSync(jsonPath)).toBe(true);
    expect(fs.existsSync(csvPath)).toBe(true);
    
    // Check text format
    const txtContent = fs.readFileSync(txtPath, 'utf-8');
    expect(txtContent).toContain('Structured log');
    
    // Check JSON format
    const jsonContent = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    expect(jsonContent).toBeInstanceOf(Array);
    expect(jsonContent[0].message).toContain('Structured log');
    
    // Check CSV format
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    expect(csvContent).toContain('timestamp,level,message,source');
  });

  it('should create directories if they dont exist', async () => {
    const session = await platform.startLogCapture({
      command: 'node',
      args: ['-e', 'console.log("[INFO] Directory test")'],
      captureOutput: true
    });
    
    await session.waitForCompletion();
    
    // Save to nested directory that doesn't exist
    const nestedPath = path.join(testOutputDir, 'nested', 'dir', 'logs.txt');
    await fileManager.saveLogsToFile(session.getLogs(), nestedPath, { format: 'text' });
    
    // Verify directory created and file saved
    expect(fs.existsSync(nestedPath)).toBe(true);
    expect(fs.existsSync(path.dirname(nestedPath))).toBe(true);
  });

  it('should handle file permissions and errors gracefully', async () => {
    const session = await platform.startLogCapture({
      command: 'node',
      args: ['-e', 'console.log("[INFO] Permission test")'],
      captureOutput: true
    });
    
    await session.waitForCompletion();
    
    // Try to save to invalid path
    const invalidPath = '/root/cannot-write-here.txt';
    
    await expect(
      fileManager.saveLogsToFile(session.getLogs(), invalidPath, { format: 'text' })
    ).rejects.toThrow();
  });

  it('should support appending to existing log files', async () => {
    // First session
    const session1 = await platform.startLogCapture({
      command: 'node',
      args: ['-e', 'console.log("[INFO] First session")'],
      captureOutput: true
    });
    await session1.waitForCompletion();
    
    const logPath = path.join(testOutputDir, 'append-test.txt');
    await fileManager.saveLogsToFile(session1.getLogs(), logPath, { 
      format: 'text',
      append: false 
    });
    
    // Second session
    const session2 = await platform.startLogCapture({
      command: 'node',
      args: ['-e', 'console.log("[INFO] Second session")'],
      captureOutput: true
    });
    await session2.waitForCompletion();
    
    await fileManager.saveLogsToFile(session2.getLogs(), logPath, { 
      format: 'text',
      append: true 
    });
    
    // Verify both sessions in file
    const content = fs.readFileSync(logPath, 'utf-8');
    expect(content).toContain('First session');
    expect(content).toContain('Second session');
  });
});