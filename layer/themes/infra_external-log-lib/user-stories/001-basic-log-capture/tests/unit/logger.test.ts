import { Logger } from '../../../../../../dist/logger';

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
  });

  describe('log method', () => {
    it('should add message to logs', () => {
      logger.log('test message');
      const logs = logger.getLogs();
      expect(logs).toContain('test message');
    });

    it('should handle multiple messages', () => {
      logger.log('first');
      logger.log('second');
      logger.log('third');
      expect(logger.getLogCount()).toBe(3);
    });
  });

  describe('warn method', () => {
    it('should add warning message with prefix', () => {
      logger.warn('warning message');
      const logs = logger.getLogs();
      expect(logs[0]).toBe('[WARN] warning message');
    });
  });

  describe('error method', () => {
    it('should add error message with prefix', () => {
      logger.error('error message');
      const logs = logger.getLogs();
      expect(logs[0]).toBe('[ERROR] error message');
    });
  });

  describe('clear method', () => {
    it('should remove all logs', () => {
      logger.log('test1');
      logger.log('test2');
      logger.clear();
      expect(logger.getLogCount()).toBe(0);
    });
  });

  describe('getLogs method', () => {
    it('should return copy of logs array', () => {
      logger.log('test');
      const logs1 = logger.getLogs();
      const logs2 = logger.getLogs();
      expect(logs1).not.toBe(logs2);
      expect(logs1).toEqual(logs2);
    });
  });

  describe('getLogCount method', () => {
    it('should return correct count', () => {
      expect(logger.getLogCount()).toBe(0);
      logger.log('test');
      expect(logger.getLogCount()).toBe(1);
      logger.warn('warning');
      expect(logger.getLogCount()).toBe(2);
    });
  });
});