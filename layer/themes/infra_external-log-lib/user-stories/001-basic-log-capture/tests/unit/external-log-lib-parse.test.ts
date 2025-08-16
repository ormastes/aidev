import { ExternalLogLibImpl, LogEntry } from '../../src/external/external-log-lib';

describe('ExternalLogLib parseLogLine Unit Test', () => {
  let externalLogLib: ExternalLogLibImpl;

  beforeEach(() => {
    externalLogLib = new ExternalLogLibImpl();
  });

  describe('parsing structured format', () => {
    it('should parse structured log with ISO timestamp and level', () => {
      const line = '2024-01-01T10:00:00.000Z [INFO] Application started In Progress';
      const result = externalLogLib.parseLogLine(line, 'stdout');

      expect(result.timestamp).toEqual(new Date('2024-01-01T10:00:00.000Z'));
      expect(result.level).toBe('info');
      expect(result.message).toBe('Application started In Progress');
      expect(result.source).toBe('stdout');
    });

    it('should parse all log levels in structured format', () => {
      const testCases: Array<{ line: string; expectedLevel: LogEntry['level'] }> = [
        { line: '2024-01-01T10:00:00.000Z [DEBUG] Debug message', expectedLevel: 'debug' },
        { line: '2024-01-01T10:00:00.000Z [INFO] Info message', expectedLevel: 'info' },
        { line: '2024-01-01T10:00:00.000Z [WARN] Warning message', expectedLevel: 'warn' },
        { line: '2024-01-01T10:00:00.000Z [ERROR] Error message', expectedLevel: 'error' }
      ];

      testCases.forEach(({ line, expectedLevel }) => {
        const result = externalLogLib.parseLogLine(line, 'stdout');
        expect(result.level).toBe(expectedLevel);
      });
    });

    it('should handle messages with special characters', () => {
      const line = '2024-01-01T10:00:00.000Z [INFO] Message with [brackets] and (parentheses)';
      const result = externalLogLib.parseLogLine(line, 'stdout');

      expect(result.message).toBe('Message with [brackets] and (parentheses)');
    });

    it('should handle empty message in structured format', () => {
      const line = '2024-01-01T10:00:00.000Z [INFO] ';
      const result = externalLogLib.parseLogLine(line, 'stdout');

      expect(result.message).toBe('');
    });

    it('should preserve source from parameter', () => {
      const line = '2024-01-01T10:00:00.000Z [ERROR] Error from stderr';
      const result = externalLogLib.parseLogLine(line, 'stderr');

      expect(result.source).toBe('stderr');
    });
  });

  describe('parsing simple format', () => {
    it('should parse simple format with just level', () => {
      const line = '[INFO] Simple log message';
      const result = externalLogLib.parseLogLine(line, 'stdout');

      expect(result.level).toBe('info');
      expect(result.message).toBe('Simple log message');
      expect(result.source).toBe('stdout');
      // Timestamp should be recent (within last second)
      expect(Date.now() - result.timestamp.getTime()).toBeLessThan(1000);
    });

    it('should parse all levels in simple format', () => {
      const testCases: Array<{ line: string; expectedLevel: LogEntry['level'] }> = [
        { line: '[DEBUG] Debug log', expectedLevel: 'debug' },
        { line: '[INFO] Info log', expectedLevel: 'info' },
        { line: '[WARN] Warning log', expectedLevel: 'warn' },
        { line: '[ERROR] Error log', expectedLevel: 'error' }
      ];

      testCases.forEach(({ line, expectedLevel }) => {
        const result = externalLogLib.parseLogLine(line, 'stdout');
        expect(result.level).toBe(expectedLevel);
      });
    });

    it('should handle messages with brackets in simple format', () => {
      const line = '[INFO] Array value is [1, 2, 3]';
      const result = externalLogLib.parseLogLine(line, 'stdout');

      expect(result.message).toBe('Array value is [1, 2, 3]');
    });

    it('should handle multi-word messages', () => {
      const line = '[WARN] This is a multi-word warning message';
      const result = externalLogLib.parseLogLine(line, 'stdout');

      expect(result.message).toBe('This is a multi-word warning message');
    });
  });

  describe('parsing plain format', () => {
    it('should default to info level for plain stdout', () => {
      const line = 'Plain text log without any formatting';
      const result = externalLogLib.parseLogLine(line, 'stdout');

      expect(result.level).toBe('info');
      expect(result.message).toBe('Plain text log without any formatting');
      expect(result.source).toBe('stdout');
    });

    it('should default to error level for plain stderr', () => {
      const line = 'Plain error message from stderr';
      const result = externalLogLib.parseLogLine(line, 'stderr');

      expect(result.level).toBe('error');
      expect(result.message).toBe('Plain error message from stderr');
      expect(result.source).toBe('stderr');
    });

    it('should handle lines that look like structured but are not', () => {
      const line = '2024-01-01 [NOT_A_LEVEL] Some message';
      const result = externalLogLib.parseLogLine(line, 'stdout');

      expect(result.level).toBe('info');
      expect(result.message).toBe('2024-01-01 [NOT_A_LEVEL] Some message');
    });

    it('should handle empty lines', () => {
      const line = '';
      const result = externalLogLib.parseLogLine(line, 'stdout');

      expect(result.level).toBe('info');
      expect(result.message).toBe('');
    });

    it('should handle whitespace-only lines', () => {
      const line = '   \t   ';
      const result = externalLogLib.parseLogLine(line, 'stdout');

      expect(result.level).toBe('info');
      expect(result.message).toBe('   \t   ');
    });
  });

  describe('different log levels', () => {
    it('should normalize log levels to lowercase', () => {
      const testCases = [
        { line: '[DEBUG] Test', expected: 'debug' },
        { line: '[INFO] Test', expected: 'info' },
        { line: '[WARN] Test', expected: 'warn' },
        { line: '[ERROR] Test', expected: 'error' }
      ];

      testCases.forEach(({ line, expected }) => {
        const result = externalLogLib.parseLogLine(line, 'stdout');
        expect(result.level).toBe(expected);
      });
    });

    it('should handle mixed case levels', () => {
      // The regex matches uppercase only, so these should fall through to plain format
      const mixedCases = ['[Info]', '[WaRn]', '[error]', '[DeBuG]'];
      
      mixedCases.forEach(prefix => {
        const line = `${prefix} Mixed case message`;
        const result = externalLogLib.parseLogLine(line, 'stdout');
        
        // Should be treated as plain text
        expect(result.level).toBe('info');
        expect(result.message).toBe(line);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(10000);
      const line = `[INFO] ${longMessage}`;
      const result = externalLogLib.parseLogLine(line, 'stdout');

      expect(result.message).toBe(longMessage);
      expect(result.message.length).toBe(10000);
    });

    it('should handle special regex characters in message', () => {
      const specialChars = 'Message with $pecial ^characters .* +? |{}[]()';
      const line = `[WARN] ${specialChars}`;
      const result = externalLogLib.parseLogLine(line, 'stdout');

      expect(result.message).toBe(specialChars);
    });

    it('should handle unicode characters', () => {
      const unicodeMessage = 'Unicode: 你好世界 🌍 émojis 🚀';
      const line = `[INFO] ${unicodeMessage}`;
      const result = externalLogLib.parseLogLine(line, 'stdout');

      expect(result.message).toBe(unicodeMessage);
    });

    it('should handle malformed timestamps in structured format', () => {
      const line = '2024-13-45T25:70:90.999Z [INFO] Invalid timestamp';
      const result = externalLogLib.parseLogLine(line, 'stdout');

      // Should still parse as structured format
      expect(result.level).toBe('info');
      expect(result.message).toBe('Invalid timestamp');
      // Timestamp will be invalid date
      expect(result.timestamp.toString()).toBe('Invalid Date');
    });

    it('should handle JSON-like content in message', () => {
      const jsonContent = '{"key": "value", "array": [1, 2, 3]}';
      const line = `[DEBUG] Received data: ${jsonContent}`;
      const result = externalLogLib.parseLogLine(line, 'stdout');

      expect(result.message).toBe(`Received data: ${jsonContent}`);
    });

    it('should handle multiple brackets in message', () => {
      const line = '[ERROR] [Component] [Method] Error occurred: [Details]';
      const result = externalLogLib.parseLogLine(line, 'stdout');

      expect(result.level).toBe('error');
      expect(result.message).toBe('[Component] [Method] Error occurred: [Details]');
    });
  });

  describe('timestamp handling', () => {
    it('should parse valid ISO timestamps correctly', () => {
      const timestamps = [
        '2024-01-01T00:00:00.000Z',
        '2024-12-31T23:59:59.999Z',
        '2024-06-15T12:30:45.123Z'
      ];

      timestamps.forEach(timestamp => {
        const line = `${timestamp} [INFO] Test`;
        const result = externalLogLib.parseLogLine(line, 'stdout');
        
        expect(result.timestamp).toEqual(new Date(timestamp));
        expect(result.timestamp.toISOString()).toBe(timestamp);
      });
    });

    it('should use current time for simple and plain formats', () => {
      const before = Date.now();
      
      const simpleResult = externalLogLib.parseLogLine('[INFO] Simple', 'stdout');
      const plainResult = externalLogLib.parseLogLine('Plain text', 'stdout');
      
      const after = Date.now();

      expect(simpleResult.timestamp.getTime()).toBeGreaterThanOrEqual(before);
      expect(simpleResult.timestamp.getTime()).toBeLessThanOrEqual(after);
      
      expect(plainResult.timestamp.getTime()).toBeGreaterThanOrEqual(before);
      expect(plainResult.timestamp.getTime()).toBeLessThanOrEqual(after);
    });
  });
});