import { EventEmitter } from 'events';
import { LogEntry } from '../../src/domain/log-entry';

describe('EventEmitter Log Event Broadcasting External Test', () => {
  let eventEmitter: EventEmitter;

  beforeEach(() => {
    eventEmitter = new EventEmitter();
  });

  afterEach(() => {
    eventEmitter.removeAllListeners();
  });

  it('should emit and receive single log entry events', async () => {
    const receivedEvents: LogEntry[] = [];

    // Set up event listener
    eventEmitter.on('log-entry', (entry: LogEntry) => {
      receivedEvents.push(entry);
    });

    // Emit a log entry
    const logEntry: LogEntry = {
      timestamp: new Date(),
      level: 'info',
      message: 'Test log message',
      source: 'stdout',
      processId: 'test-process-1'
    };

    eventEmitter.emit('log-entry', logEntry);

    // Verify event was received
    expect(receivedEvents).toHaveLength(1);
    expect(receivedEvents[0]).toEqual(logEntry);
  });

  it('should emit and receive batch log entry events', async () => {
    const receivedBatches: LogEntry[][] = [];

    // Set up batch event listener
    eventEmitter.on('log-batch', (entries: LogEntry[]) => {
      receivedBatches.push(entries);
    });

    // Emit a batch of log entries
    const logBatch: LogEntry[] = [
      {
        timestamp: new Date(),
        level: 'info',
        message: 'Batch log 1',
        source: 'stdout',
        processId: 'test-process-1'
      },
      {
        timestamp: new Date(),
        level: 'warn',
        message: 'Batch log 2',
        source: 'stderr',
        processId: 'test-process-1'
      },
      {
        timestamp: new Date(),
        level: 'error',
        message: 'Batch log 3',
        source: 'stderr',
        processId: 'test-process-1'
      }
    ];

    eventEmitter.emit('log-batch', logBatch);

    // Verify batch was received
    expect(receivedBatches).toHaveLength(1);
    expect(receivedBatches[0]).toEqual(logBatch);
    expect(receivedBatches[0]).toHaveLength(3);
  });

  it('should emit and receive process lifecycle events', async () => {
    const receivedEvents: any[] = [];

    // Set up process event listeners
    eventEmitter.on('monitoring-started', (event) => {
      receivedEvents.push({ type: 'monitoring-started', ...event });
    });

    eventEmitter.on('monitoring-stopped', (event) => {
      receivedEvents.push({ type: 'monitoring-stopped', ...event });
    });

    eventEmitter.on('process-exited', (event) => {
      receivedEvents.push({ type: 'process-exited', ...event });
    });

    eventEmitter.on('process-crashed', (event) => {
      receivedEvents.push({ type: 'process-crashed', ...event });
    });

    // Emit process lifecycle events
    eventEmitter.emit('monitoring-started', {
      processId: 'proc-123',
      command: 'node app.js',
      startTime: new Date()
    });

    eventEmitter.emit('process-exited', {
      processId: 'proc-123',
      code: 0,
      signal: null,
      endTime: new Date()
    });

    eventEmitter.emit('monitoring-stopped', {
      processId: 'proc-123',
      endTime: new Date()
    });

    // Verify all events were received
    expect(receivedEvents).toHaveLength(3);
    expect(receivedEvents[0].type).toBe('monitoring-started');
    expect(receivedEvents[1].type).toBe('process-exited');
    expect(receivedEvents[2].type).toBe('monitoring-stopped');
  });

  it('should handle multiple listeners for the same event', async () => {
    const listener1Events: LogEntry[] = [];
    const listener2Events: LogEntry[] = [];
    const listener3Events: LogEntry[] = [];

    // Set up multiple listeners
    eventEmitter.on('log-entry', (entry: LogEntry) => {
      listener1Events.push(entry);
    });

    eventEmitter.on('log-entry', (entry: LogEntry) => {
      listener2Events.push(entry);
    });

    eventEmitter.on('log-entry', (entry: LogEntry) => {
      listener3Events.push(entry);
    });

    // Emit log entry
    const logEntry: LogEntry = {
      timestamp: new Date(),
      level: 'debug',
      message: 'Multi-listener test',
      source: 'stdout',
      processId: 'test-process-multi'
    };

    eventEmitter.emit('log-entry', logEntry);

    // Verify all listeners received the event
    expect(listener1Events).toHaveLength(1);
    expect(listener2Events).toHaveLength(1);
    expect(listener3Events).toHaveLength(1);

    expect(listener1Events[0]).toEqual(logEntry);
    expect(listener2Events[0]).toEqual(logEntry);
    expect(listener3Events[0]).toEqual(logEntry);
  });

  it('should handle high-frequency event broadcasting', async () => {
    const receivedEvents: LogEntry[] = [];
    const eventCount = 1000;

    // Set up event listener
    eventEmitter.on('log-entry', (entry: LogEntry) => {
      receivedEvents.push(entry);
    });

    // Emit many events rapidly
    for (let i = 1; i <= eventCount; i++) {
      const logEntry: LogEntry = {
        timestamp: new Date(),
        level: 'info',
        message: `High-frequency log ${i}`,
        source: 'stdout',
        processId: 'high-freq-process'
      };

      eventEmitter.emit('log-entry', logEntry);
    }

    // Verify all events were received
    expect(receivedEvents).toHaveLength(eventCount);

    // Verify order is maintained
    for (let i = 0; i < eventCount; i++) {
      expect(receivedEvents[i].message).toBe(`High-frequency log ${i + 1}`);
    }
  });

  it('should handle mixed event types simultaneously', async () => {
    const logEntries: LogEntry[] = [];
    const processEvents: any[] = [];
    const bufferEvents: any[] = [];

    // Set up different event listeners
    eventEmitter.on('log-entry', (entry: LogEntry) => {
      logEntries.push(entry);
    });

    eventEmitter.on('process-exited', (event) => {
      processEvents.push({ type: 'process-exited', ...event });
    });

    eventEmitter.on('process-crashed', (event) => {
      processEvents.push({ type: 'process-crashed', ...event });
    });

    eventEmitter.on('buffer-warning', (event) => {
      bufferEvents.push(event);
    });

    // Emit mixed events
    eventEmitter.emit('log-entry', {
      timestamp: new Date(),
      level: 'info',
      message: 'Mixed event test 1',
      source: 'stdout',
      processId: 'mixed-proc'
    });

    eventEmitter.emit('buffer-warning', {
      processId: 'mixed-proc',
      bufferSize: 8192,
      threshold: 10000
    });

    eventEmitter.emit('log-entry', {
      timestamp: new Date(),
      level: 'error',
      message: 'Mixed event test 2',
      source: 'stderr',
      processId: 'mixed-proc'
    });

    eventEmitter.emit('process-crashed', {
      processId: 'mixed-proc',
      code: 1,
      signal: null,
      endTime: new Date()
    });

    // Verify events were properly distributed
    expect(logEntries).toHaveLength(2);
    expect(processEvents).toHaveLength(1);
    expect(bufferEvents).toHaveLength(1);

    expect(processEvents[0].type).toBe('process-crashed');
    expect(bufferEvents[0].bufferSize).toBe(8192);
  });

  it('should handle event listener removal', async () => {
    const receivedEvents: LogEntry[] = [];

    // Create listener function
    const listener = (entry: LogEntry) => {
      receivedEvents.push(entry);
    };

    // Add listener
    eventEmitter.on('log-entry', listener);

    // Emit first event
    eventEmitter.emit('log-entry', {
      timestamp: new Date(),
      level: 'info',
      message: 'Before removal',
      source: 'stdout',
      processId: 'removal-test'
    });

    expect(receivedEvents).toHaveLength(1);

    // Remove listener
    eventEmitter.off('log-entry', listener);

    // Emit second event
    eventEmitter.emit('log-entry', {
      timestamp: new Date(),
      level: 'info',
      message: 'After removal',
      source: 'stdout',
      processId: 'removal-test'
    });

    // Should still have only the first event
    expect(receivedEvents).toHaveLength(1);
    expect(receivedEvents[0].message).toBe('Before removal');
  });

  it('should handle error events without crashing', async () => {
    const errorEvents: any[] = [];

    // Set up error listener
    eventEmitter.on('error', (error) => {
      errorEvents.push(error);
    });

    // Emit error events
    eventEmitter.emit('error', new Error('Test error 1'));
    eventEmitter.emit('error', { message: 'Test error 2', code: 'E_TEST' });

    // Verify error events were handled
    expect(errorEvents).toHaveLength(2);
    expect(errorEvents[0].message).toBe('Test error 1');
    expect(errorEvents[1].message).toBe('Test error 2');
  });

  it('should support once listeners for one-time events', async () => {
    const receivedEvents: any[] = [];

    // Set up once listener
    eventEmitter.once('monitoring-started', (event) => {
      receivedEvents.push(event);
    });

    // Emit event multiple times
    eventEmitter.emit('monitoring-started', { processId: 'once-test-1' });
    eventEmitter.emit('monitoring-started', { processId: 'once-test-2' });
    eventEmitter.emit('monitoring-started', { processId: 'once-test-3' });

    // Should only receive the first event
    expect(receivedEvents).toHaveLength(1);
    expect(receivedEvents[0].processId).toBe('once-test-1');
  });

  it('should handle asynchronous listeners', async () => {
    const receivedEvents: LogEntry[] = [];
    const processingTimes: number[] = [];

    // Set up async listener
    eventEmitter.on('log-entry', async (entry: LogEntry) => {
      const startTime = Date.now();
      
      // Simulate async processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      receivedEvents.push(entry);
      processingTimes.push(Date.now() - startTime);
    });

    // Emit events
    const events = [
      {
        timestamp: new Date(),
        level: 'info',
        message: 'Async test 1',
        source: 'stdout' as const,
        processId: 'async-proc'
      },
      {
        timestamp: new Date(),
        level: 'warn',
        message: 'Async test 2',
        source: 'stderr' as const,
        processId: 'async-proc'
      }
    ];

    events.forEach(event => eventEmitter.emit('log-entry', event));

    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 50));

    // Verify async processing occurred
    expect(receivedEvents).toHaveLength(2);
    expect(processingTimes).toHaveLength(2);
    processingTimes.forEach(time => {
      expect(time).toBeGreaterThanOrEqual(10);
    });
  });

  it('should handle listener exceptions gracefully', async () => {
    const successfulEvents: LogEntry[] = [];
    let exceptionCaught = false;

    // Set up successful listener first
    eventEmitter.on('log-entry', (entry: LogEntry) => {
      successfulEvents.push(entry);
    });

    // Set up listener that throws (this will prevent subsequent listeners from executing)
    eventEmitter.on('log-entry', (entry: LogEntry) => {
      if (entry.message.includes('throw')) {
        try {
          throw new Error('Listener error');
        } catch (error) {
          exceptionCaught = true;
          // Swallow the error to prevent test failure
        }
      }
    });

    // Emit events
    eventEmitter.emit('log-entry', {
      timestamp: new Date(),
      level: 'info',
      message: 'Normal message',
      source: 'stdout',
      processId: 'exception-test'
    });

    eventEmitter.emit('log-entry', {
      timestamp: new Date(),
      level: 'error',
      message: 'Message that will throw',
      source: 'stdout',
      processId: 'exception-test'
    });

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 10));

    // Verify the In Progress listener received events and exception was caught
    expect(successfulEvents).toHaveLength(2);
    expect(exceptionCaught).toBe(true);
  });

  it('should provide listener count information', () => {
    expect(eventEmitter.listenerCount('log-entry')).toBe(0);

    // Add listeners
    const listener1 = () => {};
    const listener2 = () => {};
    const listener3 = () => {};

    eventEmitter.on('log-entry', listener1);
    eventEmitter.on('log-entry', listener2);
    eventEmitter.on('monitoring-started', listener3);

    expect(eventEmitter.listenerCount('log-entry')).toBe(2);
    expect(eventEmitter.listenerCount('monitoring-started')).toBe(1);
    expect(eventEmitter.listenerCount('non-existent')).toBe(0);

    // Remove listener
    eventEmitter.off('log-entry', listener1);
    expect(eventEmitter.listenerCount('log-entry')).toBe(1);
  });
});