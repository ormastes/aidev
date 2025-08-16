import { pythonLogParser } from '../../src/external/python-log-parser';
import { LogEntry } from '../../../001-basic-log-capture/src/external/external-log-lib';

describe('Python Log Parser External Test', () => {
  describe('Python logging module format', () => {
    it('should parse standard Python logging format', () => {
      const line = '2025-01-15 14:30:45,123 - app.module - INFO - Application started In Progress';
      const result = pythonLogParser.parsePythonLogLine(line, 'stderr');
      
      expect(result.level).toBe('info');
      expect(result.message).toBe('Application started In Progress');
      expect(result.source).toBe('stderr');
      expect(result.timestamp).toBeInstanceOf(Date);
      // Python uses comma for milliseconds, parser should handle this
      expect(result.timestamp.toISOString()).toContain('2025-01-15T14:30:45.123');
    });

    it('should parse all Python log levels correctly', () => {
      const testCases: Array<{ line: string; expectedLevel: LogEntry['level'] }> = [
        { 
          line: '2025-01-15 10:00:00,000 - test - DEBUG - Debug message',
          expectedLevel: 'debug'
        },
        {
          line: '2025-01-15 10:00:00,000 - test - INFO - Info message',
          expectedLevel: 'info'
        },
        {
          line: '2025-01-15 10:00:00,000 - test - WARNING - Warning message',
          expectedLevel: 'warn'
        },
        {
          line: '2025-01-15 10:00:00,000 - test - ERROR - Error message',
          expectedLevel: 'error'
        },
        {
          line: '2025-01-15 10:00:00,000 - test - CRITICAL - Critical message',
          expectedLevel: 'error'
        }
      ];

      testCases.forEach(({ line, expectedLevel }) => {
        const result = pythonLogParser.parsePythonLogLine(line, 'stderr');
        expect(result.level).toBe(expectedLevel);
      });
    });

    it('should handle logger names with dots', () => {
      const line = '2025-01-15 10:00:00,000 - app.module.submodule - ERROR - Database connection failed';
      const result = pythonLogParser.parsePythonLogLine(line, 'stderr');
      
      expect(result.level).toBe('error');
      expect(result.message).toBe('Database connection failed');
    });

    it('should handle messages with special characters', () => {
      const line = '2025-01-15 10:00:00,000 - app - INFO - User "john.doe@example.com" logged in: { "success": true}';
      const result = pythonLogParser.parsePythonLogLine(line, 'stderr');
      
      expect(result.message).toBe('User "john.doe@example.com" logged in: { "success": true}');
    });
  });

  describe('Simple Python formats', () => {
    it('should parse simple INFO: format', () => {
      const line = 'INFO: Server started on port 8080';
      const result = pythonLogParser.parsePythonLogLine(line, 'stdout');
      
      expect(result.level).toBe('info');
      expect(result.message).toBe('Server started on port 8080');
    });

    it('should parse simple LEVEL - format', () => {
      const line = 'ERROR - Failed to connect to database';
      const result = pythonLogParser.parsePythonLogLine(line, 'stderr');
      
      expect(result.level).toBe('error');
      expect(result.message).toBe('Failed to connect to database');
    });

    it('should parse WARNING format', () => {
      const line = 'WARNING: Deprecated function used';
      const result = pythonLogParser.parsePythonLogLine(line, 'stderr');
      
      expect(result.level).toBe('warn');
      expect(result.message).toBe('Deprecated function used');
    });
  });

  describe('Python traceback detection', () => {
    it('should detect traceback header', () => {
      const line = 'Traceback (most recent call last):';
      const result = pythonLogParser.parsePythonLogLine(line, 'stderr');
      
      expect(result.level).toBe('error');
      expect(result.message).toBe('Traceback (most recent call last):');
    });

    it('should detect file line in traceback', () => {
      const line = '  File "app.py", line 42, in process_data';
      const result = pythonLogParser.parsePythonLogLine(line, 'stderr');
      
      expect(result.level).toBe('error');
      expect(result.message).toBe('  File "app.py", line 42, in process_data');
    });

    it('should detect Python exceptions', () => {
      const exceptions = [
        'ValueError: Invalid input provided',
        'TypeError: Expected string, got int',
        'KeyError: "missing_key"',
        'AttributeError: Object has no attribute "foo"',
        'IndexError: list index out of range',
        'ZeroDivisionError: division by zero',
        'ImportError: No module named "missing_module"',
        'RuntimeError: Maximum recursion depth exceeded'
      ];

      exceptions.forEach(line => {
        const result = pythonLogParser.parsePythonLogLine(line, 'stderr');
        expect(result.level).toBe('error');
        expect(result.message).toBe(line);
      });
    });
  });

  describe('JSON format from Python', () => {
    it('should parse JSON formatted logs', () => {
      const line = '{"timestamp": "2025-01-15T10:00:00.000Z", "level": "INFO", "logger": "app", "message": "JSON log message"}';
      const result = pythonLogParser.parsePythonLogLine(line, 'stdout');
      
      expect(result.level).toBe('info');
      expect(result.message).toBe('JSON log message');
      expect(result.timestamp.toISOString()).toBe('2025-01-15T10:00:00.000Z');
    });

    it('should handle JSON with different level cases', () => {
      const testCases = [
        { json: '{"level": "debug", "message": "Debug"}', expected: 'debug' },
        { json: '{"level": "DEBUG", "message": "Debug"}', expected: 'debug' },
        { json: '{"level": "warning", "message": "Warn"}', expected: 'warn' },
        { json: '{"level": "WARNING", "message": "Warn"}', expected: 'warn' }
      ];

      testCases.forEach(({ json, expected }) => {
        const result = pythonLogParser.parsePythonLogLine(json, 'stdout');
        expect(result.level).toBe(expected);
      });
    });

    it('should handle malformed JSON gracefully', () => {
      const line = '{"level": "INFO", "message": "Incomplete JSON';
      const result = pythonLogParser.parsePythonLogLine(line, 'stdout');
      
      // Should fall back to default parsing
      expect(result.level).toBe('info');
      expect(result.message).toBe(line);
    });
  });

  describe('Default behavior', () => {
    it('should treat plain stdout as info', () => {
      const line = 'Plain output message without any format';
      const result = pythonLogParser.parsePythonLogLine(line, 'stdout');
      
      expect(result.level).toBe('info');
      expect(result.message).toBe(line);
      expect(result.source).toBe('stdout');
    });

    it('should treat plain stderr as error', () => {
      const line = 'Plain error message without any format';
      const result = pythonLogParser.parsePythonLogLine(line, 'stderr');
      
      expect(result.level).toBe('error');
      expect(result.message).toBe(line);
      expect(result.source).toBe('stderr');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty messages', () => {
      const line = '2025-01-15 10:00:00,000 - app - INFO - ';
      const result = pythonLogParser.parsePythonLogLine(line, 'stderr');
      
      expect(result.level).toBe('info');
      expect(result.message).toBe('');
    });

    it('should handle lines with only whitespace', () => {
      const line = '    ';
      const result = pythonLogParser.parsePythonLogLine(line, 'stdout');
      
      expect(result.level).toBe('info');
      expect(result.message).toBe('    ');
    });

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(10000);
      const line = `2025-01-15 10:00:00,000 - app - ERROR - ${longMessage}`;
      const result = pythonLogParser.parsePythonLogLine(line, 'stderr');
      
      expect(result.level).toBe('error');
      expect(result.message).toBe(longMessage);
      expect(result.message.length).toBe(10000);
    });

    it('should handle unicode in messages', () => {
      const line = '2025-01-15 10:00:00,000 - app - INFO - Unicode test: 你好世界 🌍 émojis 🚀';
      const result = pythonLogParser.parsePythonLogLine(line, 'stderr');
      
      expect(result.message).toBe('Unicode test: 你好世界 🌍 émojis 🚀');
    });

    it('should handle multiline log entry markers', () => {
      const line = '2025-01-15 10:00:00,000 - app - INFO - First line\\nSecond line\\nThird line';
      const result = pythonLogParser.parsePythonLogLine(line, 'stderr');
      
      expect(result.message).toBe('First line\\nSecond line\\nThird line');
    });
  });

  describe('Timestamp handling', () => {
    it('should use current time for formats without timestamp', () => {
      const before = Date.now();
      
      const result = pythonLogParser.parsePythonLogLine('INFO: No timestamp', 'stdout');
      
      const after = Date.now();
      const resultTime = result.timestamp.getTime();
      
      expect(resultTime).toBeGreaterThanOrEqual(before);
      expect(resultTime).toBeLessThanOrEqual(after);
    });

    it('should handle different timestamp formats in JSON', () => {
      const testCases = [
        '{"timestamp": "2025-01-15T10:00:00Z", "level": "INFO", "message": "Test"}',
        '{"timestamp": "2025-01-15T10:00:00.000Z", "level": "INFO", "message": "Test"}',
        '{"timestamp": "2025-01-15 10:00:00", "level": "INFO", "message": "Test"}'
      ];

      testCases.forEach(line => {
        const result = pythonLogParser.parsePythonLogLine(line, 'stdout');
        expect(result.timestamp).toBeInstanceOf(Date);
      });
    });
  });
});