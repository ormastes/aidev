import { LogAggregator } from '../../src/internal/log-aggregator';

describe('LogAggregator Unit Test', () => {
  let aggregator: LogAggregator;

  beforeEach(() => {
    aggregator = new LogAggregator();
  });

  describe('addLog', () => {
    it('should add logs and assign sequence numbers', () => {
      const log1 = {
        timestamp: new Date('2024-01-15T10:00:00Z'),
        level: 'info',
        message: 'First log',
        source: 'stdout' as const
      };

      const log2 = {
        timestamp: new Date('2024-01-15T10:00:01Z'),
        level: 'error',
        message: 'Second log',
        source: 'stderr' as const
      };

      aggregator.addLog('process1', log1);
      aggregator.addLog('process1', log2);

      const logs = aggregator.getProcessLogs('process1');
      expect(logs).toHaveLength(2);
      expect(logs[0].sequenceNumber).toBe(0);
      expect(logs[1].sequenceNumber).toBe(1);
      expect(logs[0].processId).toBe('process1');
      expect(logs[1].processId).toBe('process1');
    });

    it('should handle multiple processes independently', () => {
      aggregator.addLog('process1', {
        timestamp: new Date(),
        level: 'info',
        message: 'P1 log',
        source: 'stdout'
      });

      aggregator.addLog('process2', {
        timestamp: new Date(),
        level: 'error',
        message: 'P2 log',
        source: 'stderr'
      });

      aggregator.addLog('process1', {
        timestamp: new Date(),
        level: 'debug',
        message: 'P1 log 2',
        source: 'stdout'
      });

      const p1Logs = aggregator.getProcessLogs('process1');
      const p2Logs = aggregator.getProcessLogs('process2');

      expect(p1Logs).toHaveLength(2);
      expect(p2Logs).toHaveLength(1);
      expect(p1Logs[0].message).toBe('P1 log');
      expect(p1Logs[1].message).toBe('P1 log 2');
      expect(p2Logs[0].message).toBe('P2 log');
    });

    it('should maintain chronological order in aggregated logs', () => {
      const timestamps = [
        new Date('2024-01-15T10:00:00Z'),
        new Date('2024-01-15T10:00:05Z'),
        new Date('2024-01-15T10:00:03Z'),
        new Date('2024-01-15T10:00:07Z')
      ];

      aggregator.addLog('p1', { timestamp: timestamps[0], level: 'info', message: 'First', source: 'stdout' });
      aggregator.addLog('p2', { timestamp: timestamps[1], level: 'info', message: 'Second', source: 'stdout' });
      aggregator.addLog('p1', { timestamp: timestamps[2], level: 'info', message: 'Third', source: 'stdout' });
      aggregator.addLog('p2', { timestamp: timestamps[3], level: 'info', message: 'Fourth', source: 'stdout' });

      const allLogs = aggregator.getAggregatedLogs();
      
      // Should be in order of addition (sequence number), not timestamp
      expect(allLogs[0].message).toBe('First');
      expect(allLogs[1].message).toBe('Second');
      expect(allLogs[2].message).toBe('Third');
      expect(allLogs[3].message).toBe('Fourth');
    });
  });

  describe('process lifecycle management', () => {
    it('should track process metadata', () => {
      aggregator.addLog('process1', {
        timestamp: new Date(),
        level: 'info',
        message: 'Starting',
        source: 'stdout'
      });

      const metadata = aggregator.getProcessMetadata('process1');
      expect(metadata).toBeDefined();
      expect(metadata!.processId).toBe('process1');
      expect(metadata!.status).toBe('running');
      expect(metadata!.logCount).toBe(1);
      expect(metadata!.startTime).toBeDefined();
      expect(metadata!.endTime).toBeUndefined();
    });

    it('should mark process as In Progress', () => {
      aggregator.addLog('process1', {
        timestamp: new Date(),
        level: 'info',
        message: 'Running',
        source: 'stdout'
      });

      aggregator.markProcessComplete('process1', 0);

      const metadata = aggregator.getProcessMetadata('process1');
      expect(metadata!.status).toBe('In Progress');
      expect(metadata!.endTime).toBeDefined();
    });

    it('should mark process as crashed', () => {
      aggregator.addLog('process1', {
        timestamp: new Date(),
        level: 'error',
        message: 'Error occurred',
        source: 'stderr'
      });

      aggregator.markProcessComplete('process1', 1);

      const metadata = aggregator.getProcessMetadata('process1');
      expect(metadata!.status).toBe('crashed');
      expect(metadata!.endTime).toBeDefined();
    });

    it('should mark process as stopped', () => {
      aggregator.addLog('process1', {
        timestamp: new Date(),
        level: 'info',
        message: 'Running',
        source: 'stdout'
      });

      aggregator.markProcessStopped('process1');

      const metadata = aggregator.getProcessMetadata('process1');
      expect(metadata!.status).toBe('stopped');
      expect(metadata!.endTime).toBeDefined();
    });
  });

  describe('filtering and querying', () => {
    beforeEach(() => {
      // Add test data
      const baseTime = new Date('2024-01-15T10:00:00Z');
      
      // Process 1 logs
      aggregator.addLog('p1', {
        timestamp: new Date(baseTime.getTime()),
        level: 'info',
        message: 'P1 info 1',
        source: 'stdout'
      });
      aggregator.addLog('p1', {
        timestamp: new Date(baseTime.getTime() + 1000),
        level: 'error',
        message: 'P1 error',
        source: 'stderr'
      });
      aggregator.addLog('p1', {
        timestamp: new Date(baseTime.getTime() + 2000),
        level: 'info',
        message: 'P1 info 2',
        source: 'stdout'
      });

      // Process 2 logs
      aggregator.addLog('p2', {
        timestamp: new Date(baseTime.getTime() + 500),
        level: 'debug',
        message: 'P2 debug',
        source: 'stdout'
      });
      aggregator.addLog('p2', {
        timestamp: new Date(baseTime.getTime() + 1500),
        level: 'error',
        message: 'P2 error',
        source: 'stderr'
      });
      aggregator.addLog('p2', {
        timestamp: new Date(baseTime.getTime() + 2500),
        level: 'warn',
        message: 'P2 warn',
        source: 'stdout'
      });
    });

    it('should filter by process IDs', () => {
      const filtered = aggregator.getAggregatedLogs({
        processIds: ['p1']
      });

      expect(filtered).toHaveLength(3);
      expect(filtered.every(log => log.processId === 'p1')).toBe(true);
    });

    it('should filter by log levels', () => {
      const filtered = aggregator.getAggregatedLogs({
        levels: ['error']
      });

      expect(filtered).toHaveLength(2);
      expect(filtered.every(log => log.level === 'error')).toBe(true);
      expect(filtered[0].message).toBe('P1 error');
      expect(filtered[1].message).toBe('P2 error');
    });

    it('should filter by time range', () => {
      const baseTime = new Date('2024-01-15T10:00:00Z');
      const startTime = new Date(baseTime.getTime() + 1000);
      const endTime = new Date(baseTime.getTime() + 2000);

      const filtered = aggregator.getAggregatedLogs({
        startTime,
        endTime
      });

      expect(filtered).toHaveLength(3); // Logs at 1000ms, 1500ms, 2000ms
      
      // Verify the filtered logs are in the expected time range
      const messages = filtered.map(log => log.message);
      expect(messages).toContain('P1 error');
      expect(messages).toContain('P2 error');
      expect(messages).toContain('P1 info 2');
    });

    it('should support pagination', () => {
      const page1 = aggregator.getAggregatedLogs({
        limit: 3,
        offset: 0
      });

      const page2 = aggregator.getAggregatedLogs({
        limit: 3,
        offset: 3
      });

      expect(page1).toHaveLength(3);
      expect(page2).toHaveLength(3);
      
      // Pages should not overlap
      const page1Messages = page1.map(log => log.message);
      const page2Messages = page2.map(log => log.message);
      const intersection = page1Messages.filter(msg => page2Messages.includes(msg));
      expect(intersection).toHaveLength(0);
    });

    it('should combine multiple filters', () => {
      const filtered = aggregator.getAggregatedLogs({
        processIds: ['p2'],
        levels: ['error', 'warn'],
        limit: 10
      });

      expect(filtered).toHaveLength(2);
      expect(filtered[0].message).toBe('P2 error');
      expect(filtered[1].message).toBe('P2 warn');
    });
  });

  describe('statistics', () => {
    it('should provide accurate statistics', () => {
      // Add logs for multiple processes
      aggregator.addLog('p1', { timestamp: new Date(), level: 'info', message: 'P1', source: 'stdout' });
      aggregator.addLog('p2', { timestamp: new Date(), level: 'info', message: 'P2', source: 'stdout' });
      aggregator.addLog('p3', { timestamp: new Date(), level: 'info', message: 'P3', source: 'stdout' });
      
      // Mark different statuses
      aggregator.markProcessComplete('p1', 0);
      aggregator.markProcessComplete('p2', 1);
      // p3 remains running

      const stats = aggregator.getStatistics();
      
      expect(stats.totalLogs).toBe(3);
      expect(stats.totalProcesses).toBe(3);
      expect(stats.activeProcesses).toBe(1);
      expect(stats.passedProcesses).toBe(1);
      expect(stats.crashedProcesses).toBe(1);
      expect(stats.stoppedProcesses).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all data', () => {
      // Add some data
      aggregator.addLog('p1', { timestamp: new Date(), level: 'info', message: 'Test', source: 'stdout' });
      aggregator.addLog('p2', { timestamp: new Date(), level: 'error', message: 'Test2', source: 'stderr' });
      
      // Clear
      aggregator.clear();
      
      // Verify everything is cleared
      expect(aggregator.getAggregatedLogs()).toHaveLength(0);
      expect(aggregator.getProcessLogs('p1')).toHaveLength(0);
      expect(aggregator.getProcessLogs('p2')).toHaveLength(0);
      expect(aggregator.getAllProcessMetadata()).toHaveLength(0);
      
      const stats = aggregator.getStatistics();
      expect(stats.totalLogs).toBe(0);
      expect(stats.totalProcesses).toBe(0);
    });

    it('should reset sequence numbers after clear', () => {
      aggregator.addLog('p1', { timestamp: new Date(), level: 'info', message: 'First', source: 'stdout' });
      aggregator.clear();
      aggregator.addLog('p2', { timestamp: new Date(), level: 'info', message: 'Second', source: 'stdout' });
      
      const logs = aggregator.getAggregatedLogs();
      expect(logs[0].sequenceNumber).toBe(0); // Should start from 0 again
    });
  });

  describe('edge cases', () => {
    it('should handle queries for non-existent processes', () => {
      const logs = aggregator.getProcessLogs('non-existent');
      expect(logs).toHaveLength(0);
      
      const metadata = aggregator.getProcessMetadata('non-existent');
      expect(metadata).toBeUndefined();
    });

    it('should handle marking non-existent process as In Progress', () => {
      // Should not throw
      expect(() => {
        aggregator.markProcessComplete('non-existent', 0);
      }).not.toThrow();
    });

    it('should handle marking non-existent process as stopped', () => {
      // Should not throw
      expect(() => {
        aggregator.markProcessStopped('non-existent');
      }).not.toThrow();
    });

    it('should handle empty filters', () => {
      aggregator.addLog('p1', { timestamp: new Date(), level: 'info', message: 'Test', source: 'stdout' });
      
      const filtered = aggregator.getAggregatedLogs({});
      expect(filtered).toHaveLength(1);
    });

    it('should handle filters with empty arrays', () => {
      aggregator.addLog('p1', { timestamp: new Date(), level: 'info', message: 'Test', source: 'stdout' });
      
      const filtered = aggregator.getAggregatedLogs({
        processIds: [],
        levels: []
      });
      
      expect(filtered).toHaveLength(1); // Empty arrays should not filter
    });
  });
});