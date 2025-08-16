import { LogMonitor } from '../../../004-real-time-streaming/src/external/log-monitor';
import { LogAggregator } from '../../src/internal/log-aggregator';
import { 
  setupTestEnvironment, 
  setupLogCollectionPipeline, 
  TestProcessCommands,
  waitForProcesses,
  assertProcessLogs
} from '../helpers/test-setup';

describe('LogAggregator Collection Integration Test (Refactored)', () => {
  let logMonitor: LogMonitor;
  let logAggregator: LogAggregator;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const testEnv = await setupTestEnvironment();
    logMonitor = testEnv.logMonitor;
    logAggregator = testEnv.logAggregator;
    cleanup = testEnv.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  it('should collect and index logs with reduced duplication', async () => {
    // Set up log collection - eliminates ~10 lines of duplicated setup code
    const collector = setupLogCollectionPipeline(logMonitor, logAggregator, { trackEvents: true });
    
    // Start multiple processes using command templates
    const webServerProcess = await logMonitor.startRealTimeMonitoring(
      TestProcessCommands.timedProcess("WebServer", 400, [
        '[WebServer] Starting',
        '[WebServer] Ready', 
        '[WebServer] Processing'
      ]),
      {}
    );

    const workerProcess = await logMonitor.startRealTimeMonitoring(
      TestProcessCommands.burstLogging('Worker', 3),
      {}
    );

    const schedulerProcess = await logMonitor.startRealTimeMonitoring(
      TestProcessCommands.crashingProcess("Scheduler", 'Config error'),
      {}
    );

    // Wait with clear messaging
    await waitForProcesses(1000, 'all test processes to complete');

    // Mark processes as In Progress when they exit
    logAggregator.markProcessComplete(webServerProcess, 0);
    logAggregator.markProcessComplete(workerProcess, 0);
    logAggregator.markProcessComplete(schedulerProcess, 1);

    // Use helper for common assertions - eliminates repetitive verification code
    const webServerLogs = assertProcessLogs(collector.logs, webServerProcess, ['[WebServer]']);
    const workerLogs = assertProcessLogs(collector.logs, workerProcess, ['[Worker]']);
    const schedulerLogs = assertProcessLogs(collector.logs, schedulerProcess, ['[Scheduler]']);

    // Verify aggregator functionality
    expect(webServerLogs.length).toBeGreaterThanOrEqual(2);
    expect(workerLogs.length).toBeGreaterThanOrEqual(3);
    expect(schedulerLogs.length).toBeGreaterThanOrEqual(1);

    // Verify cross-process isolation
    expect(webServerLogs.every(log => log.processId === webServerProcess)).toBe(true);
    expect(workerLogs.every(log => log.processId === workerProcess)).toBe(true);
    expect(schedulerLogs.every(log => log.processId === schedulerProcess)).toBe(true);

    // Verify metadata tracking
    const webServerMeta = logAggregator.getProcessMetadata(webServerProcess);
    const workerMeta = logAggregator.getProcessMetadata(workerProcess);
    const schedulerMeta = logAggregator.getProcessMetadata(schedulerProcess);

    expect(webServerMeta?.status).toBe("completed");
    expect(workerMeta?.status).toBe("completed");
    expect(schedulerMeta?.status).toBe('crashed');

    // Clean up listeners
    collector.cleanup();
  });

  it('should demonstrate elimination of real-time aggregation duplication', async () => {
    let totalLogsCaptured = 0;
    
    // Custom handler using the utility
    const collector = setupLogCollectionPipeline(logMonitor, logAggregator, {
      onLogEntry: () => totalLogsCaptured++
    });

    // Use command template for timed logging
    const processId = await logMonitor.startRealTimeMonitoring(
      TestProcessCommands.timedProcess("TimedProcess", 500, [
        '[TimedProcess] Log 1',
        '[TimedProcess] Log 2',
        '[TimedProcess] Log 3'
      ]),
      {}
    );

    await waitForProcesses(800, 'timed process');
    logAggregator.markProcessComplete(processId, 0);

    // Verification is much cleaner
    expect(totalLogsCaptured).toBeGreaterThanOrEqual(1);
    expect(collector.logs.length).toBe(totalLogsCaptured);

    const processLogs = logAggregator.getProcessLogs(processId);
    expect(processLogs.length).toBeGreaterThanOrEqual(1);
    expect(processLogs.every(log => log.message.includes('[TimedProcess]'))).toBe(true);

    collector.cleanup();
  });
});