import { AIDevPlatform } from '../../src/application/aidev-platform';

describe('Log Capture Integration Test - AIDevPlatform with ExternalLogLib', () => {
  it('should integrate AIDevPlatform with ExternalLogLib for log capture', async () => {
    // Test the integration between application layer and external library
    const platform = new AIDevPlatform();
    
    // Simple test script
    const testScript = `
      console.log('[INFO] Test log 1');
      console.error('[ERROR] Test error');
      console.log('Plain log');
    `;
    
    const session = await platform.startLogCapture({
      command: 'node',
      args: ['-e', testScript],
      captureOutput: true
    });
    
    await session.waitForCompletion();
    
    const logs = session.getLogs();
    
    // Verify integration properly captures and parses logs
    expect(logs).toHaveLength(3);
    
    // Verify log parsing through external lib integration
    const infoLog = logs.find(log => log.message === 'Test log 1');
    expect(infoLog).toBeDefined();
    expect(infoLog!.level).toBe('info');
    
    const errorLog = logs.find(log => log.message === 'Test error');
    expect(errorLog).toBeDefined();
    expect(errorLog!.level).toBe('error');
    expect(errorLog!.source).toBe('stderr');
    
    const plainLog = logs.find(log => log.message === 'Plain log');
    expect(plainLog).toBeDefined();
    expect(plainLog!.level).toBe('info'); // Default level
  });

  it('should properly handle log callbacks through the integration', async () => {
    const platform = new AIDevPlatform();
    const callbackLogs: any[] = [];
    
    const session = await platform.startLogCapture({
      command: 'node',
      args: ['-e', 'console.log("[INFO] Callback test")'],
      captureOutput: true
    });
    
    // Register callback
    session.onLogEntry((log) => {
      callbackLogs.push(log);
    });
    
    await session.waitForCompletion();
    
    // Verify callback was triggered through integration
    expect(callbackLogs).toHaveLength(1);
    expect(callbackLogs[0].message).toBe('Callback test');
  });

  it('should handle log formatting through integrated components', async () => {
    const platform = new AIDevPlatform();
    
    const session = await platform.startLogCapture({
      command: 'node',
      args: ['-e', 'console.log("[WARN] Warning message")'],
      captureOutput: true
    });
    
    await session.waitForCompletion();
    
    const formatted = session.getFormattedLogs();
    
    // Verify formatting integration
    expect(formatted).toContain('[WARN]');
    expect(formatted).toContain('Warning message');
    expect(formatted).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO timestamp
  });

  it('should handle process lifecycle through integration', async () => {
    const platform = new AIDevPlatform();
    
    // Test with process that has delayed output
    const delayedScript = `
      setTimeout(() => {
        console.log('[INFO] Delayed log');
        process.exit(0);
      }, 100);
    `;
    
    const session = await platform.startLogCapture({
      command: 'node',
      args: ['-e', delayedScript],
      captureOutput: true
    });
    
    const result = await session.waitForCompletion();
    
    // Verify proper lifecycle handling
    expect(result.exitCode).toBe(0);
    
    const logs = session.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].message).toBe('Delayed log');
  });

  it('should stop capturing when process completes', async () => {
    // Verify the integration properly stops the external log capturer
    const platform = new AIDevPlatform();
    
    const session = await platform.startLogCapture({
      command: 'node',
      args: ['-e', 'console.log("Quick log")'],
      captureOutput: true
    });
    
    await session.waitForCompletion();
    
    // Try to get logs after completion - should work
    const logs = session.getLogs();
    expect(logs).toHaveLength(1);
    
    // Formatted logs should still work after process ends
    const formatted = session.getFormattedLogs();
    expect(formatted).toContain('Quick log');
  });
});