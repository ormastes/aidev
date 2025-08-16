import { pythonLogParser } from '../../src/external/python-log-parser';

describe('PythonLogParser', () => {
  describe('parsePythonLogLine', () => {
    describe('Python logging module format', () => {
      it('should parse standard Python logging format with comma milliseconds', () => {
        const line = '2025-01-15 10:30:45,123 - app.module - INFO - Starting application';
        const result = pythonLogParser.parsePythonLogLine(line, 'stderr');
        
        expect(result.level).toBe('info');
        expect(result.message).toBe('Starting application');
        expect(result.source).toBe('stderr');
        expect(result.timestamp).toEqual(new Date('2025-01-15T10:30:45.123Z'));
      });

      it('should parse Python logging format without milliseconds', () => {
        const line = '2025-01-15 10:30:45 - app.module - WARNING - Warning message';
        const result = pythonLogParser.parsePythonLogLine(line, 'stdout');
        
        expect(result.level).toBe('warn');
        expect(result.message).toBe('Warning message');
        expect(result.source).toBe('stdout');
        expect(result.timestamp).toEqual(new Date('2025-01-15T10:30:45.000Z'));
      });

      it('should parse all Python log levels correctly', () => {
        const testCases = [
          { line: '2025-01-15 10:00:00 - test - DEBUG - Debug msg', expectedLevel: 'debug' },
          { line: '2025-01-15 10:00:00 - test - INFO - Info msg', expectedLevel: 'info' },
          { line: '2025-01-15 10:00:00 - test - WARNING - Warn msg', expectedLevel: 'warn' },
          { line: '2025-01-15 10:00:00 - test - ERROR - Error msg', expectedLevel: 'error' },
          { line: '2025-01-15 10:00:00 - test - CRITICAL - Critical msg', expectedLevel: 'error' }
        ];

        testCases.forEach(({ line, expectedLevel }) => {
          const result = pythonLogParser.parsePythonLogLine(line, 'stderr');
          expect(result.level).toBe(expectedLevel);
        });
      });

      it('should handle logger names with dots and underscores', () => {
        const line = '2025-01-15 10:00:00 - app.sub_module.component - INFO - Message';
        const result = pythonLogParser.parsePythonLogLine(line, 'stderr');
        
        expect(result.level).toBe('info');
        expect(result.message).toBe('Message');
      });

      it('should preserve message content with special characters', () => {
        const line = '2025-01-15 10:00:00 - test - INFO - Special: @#$%^&*() "quotes" \'single\'';
        const result = pythonLogParser.parsePythonLogLine(line, 'stderr');
        
        expect(result.message).toBe('Special: @#$%^&*() "quotes" \'single\'');
      });
    });

    describe('Simple format parsing', () => {
      it('should parse INFO: prefix format', () => {
        const line = 'INFO: Application started In Progress';
        const result = pythonLogParser.parsePythonLogLine(line, 'stdout');
        
        expect(result.level).toBe('info');
        expect(result.message).toBe('Application started In Progress');
      });

      it('should parse ERROR - format', () => {
        const line = 'ERROR - Database connection failed';
        const result = pythonLogParser.parsePythonLogLine(line, 'stderr');
        
        expect(result.level).toBe('error');
        expect(result.message).toBe('Database connection failed');
      });

      it('should parse WARNING: format', () => {
        const line = 'WARNING: Deprecated function used';
        const result = pythonLogParser.parsePythonLogLine(line, 'stdout');
        
        expect(result.level).toBe('warn');
        expect(result.message).toBe('Deprecated function used');
      });

      it('should parse DEBUG - format', () => {
        const line = 'DEBUG - Entering function calculate()';
        const result = pythonLogParser.parsePythonLogLine(line, 'stderr');
        
        expect(result.level).toBe('debug');
        expect(result.message).toBe('Entering function calculate()');
      });
    });

    describe('JSON format parsing', () => {
      it('should parse valid JSON log with standard fields', () => {
        const line = '{"timestamp": "2025-01-15T10:00:00.000Z", "level": "INFO", "message": "JSON log message"}';
        const result = pythonLogParser.parsePythonLogLine(line, 'stderr');
        
        expect(result.level).toBe('info');
        expect(result.message).toBe('JSON log message');
        expect(result.timestamp).toEqual(new Date('2025-01-15T10:00:00.000Z'));
      });

      it('should parse JSON with lowercase level', () => {
        const line = '{"level": "warning", "message": "Lower case warning"}';
        const result = pythonLogParser.parsePythonLogLine(line, 'stdout');
        
        expect(result.level).toBe('warn');
        expect(result.message).toBe('Lower case warning');
      });

      it('should handle JSON with missing timestamp', () => {
        const line = '{"level": "ERROR", "message": "No timestamp"}';
        const result = pythonLogParser.parsePythonLogLine(line, 'stderr');
        
        expect(result.level).toBe('error');
        expect(result.message).toBe('No timestamp');
        expect(result.timestamp).toBeInstanceOf(Date);
      });

      it('should handle invalid JSON gracefully', () => {
        const line = '{"level": "INFO", "message": "Unclosed JSON';
        const result = pythonLogParser.parsePythonLogLine(line, 'stderr');
        
        // Should fall back to plain text parsing
        expect(result.level).toBe('error');
        expect(result.message).toBe(line);
      });

      it('should handle JSON with missing required fields', () => {
        const line = '{"level": "INFO", "data": "some data"}';
        const result = pythonLogParser.parsePythonLogLine(line, 'stderr');
        
        // Should fall back to plain text parsing since message is missing
        expect(result.level).toBe('error');
        expect(result.message).toBe(line);
      });

      it('should handle JSON with only message field', () => {
        const line = '{"message": "Only message"}';
        const result = pythonLogParser.parsePythonLogLine(line, 'stdout');
        
        // Should fall back to plain text parsing since level is missing
        expect(result.level).toBe('info');
        expect(result.message).toBe(line);
      });
    });

    describe('Traceback detection', () => {
      it('should detect Traceback header', () => {
        const line = 'Traceback (most recent call last):';
        const result = pythonLogParser.parsePythonLogLine(line, 'stderr');
        
        expect(result.level).toBe('error');
        expect(result.message).toBe(line);
      });

      it('should detect File line in traceback', () => {
        const line = '  File "test.py", line 42, in function_name';
        const result = pythonLogParser.parsePythonLogLine(line, 'stderr');
        
        expect(result.level).toBe('error');
        expect(result.message).toBe(line);
      });

      it('should detect exception type lines', () => {
        const testCases = [
          'ValueError: invalid literal for int()',
          'TypeError: unsupported operand type(s)',
          'NameError: name \'undefined\' is not defined',
          'ZeroDivisionError: division by zero',
          'AttributeError: \'NoneType\' object has no attribute \'method\'',
          'KeyError: \'missing_key\'',
          'IndexError: list index out of range',
          'ImportError: No module named \'missing\'',
          'RuntimeError: maximum recursion depth exceeded'
        ];

        testCases.forEach(line => {
          const result = pythonLogParser.parsePythonLogLine(line, 'stderr');
          expect(result.level).toBe('error');
          expect(result.message).toBe(line);
        });
      });

      it('should not detect non-traceback lines as traceback', () => {
        const line = 'Normal line with File mentioned';
        const result = pythonLogParser.parsePythonLogLine(line, 'stdout');
        
        expect(result.level).toBe('info');
        expect(result.message).toBe(line);
      });
    });

    describe('Plain text fallback', () => {
      it('should use info level for stdout plain text', () => {
        const line = 'Plain stdout message without format';
        const result = pythonLogParser.parsePythonLogLine(line, 'stdout');
        
        expect(result.level).toBe('info');
        expect(result.message).toBe(line);
        expect(result.source).toBe('stdout');
      });

      it('should use error level for stderr plain text', () => {
        const line = 'Plain stderr message without format';
        const result = pythonLogParser.parsePythonLogLine(line, 'stderr');
        
        expect(result.level).toBe('error');
        expect(result.message).toBe(line);
        expect(result.source).toBe('stderr');
      });

      it('should handle empty lines', () => {
        const result = pythonLogParser.parsePythonLogLine('', 'stdout');
        
        expect(result.level).toBe('info');
        expect(result.message).toBe('');
      });

      it('should handle whitespace-only lines', () => {
        const result = pythonLogParser.parsePythonLogLine('   \t  ', 'stderr');
        
        expect(result.level).toBe('error');
        expect(result.message).toBe('   \t  ');
      });
    });

    describe('Edge cases', () => {
      it('should handle lines with multiple dashes', () => {
        const line = '2025-01-15 10:00:00 - logger - INFO - Message - with - dashes';
        const result = pythonLogParser.parsePythonLogLine(line, 'stderr');
        
        expect(result.level).toBe('info');
        expect(result.message).toBe('Message - with - dashes');
      });

      it('should handle unicode characters', () => {
        const line = '2025-01-15 10:00:00 - test - INFO - Unicode: 你好 🌍 émojis';
        const result = pythonLogParser.parsePythonLogLine(line, 'stderr');
        
        expect(result.message).toBe('Unicode: 你好 🌍 émojis');
      });

      it('should handle very long messages', () => {
        const longMessage = 'A'.repeat(1000);
        const line = `2025-01-15 10:00:00 - test - ERROR - ${longMessage}`;
        const result = pythonLogParser.parsePythonLogLine(line, 'stderr');
        
        expect(result.message).toBe(longMessage);
      });

      it('should handle malformed timestamps gracefully', () => {
        const line = '2025-13-45 25:70:90,999 - test - INFO - Bad timestamp';
        const result = pythonLogParser.parsePythonLogLine(line, 'stderr');
        
        // Should still parse as Python format but timestamp might be invalid
        expect(result.level).toBe('info');
        expect(result.message).toBe('Bad timestamp');
      });
    });
  });

  describe('mapPythonLevel', () => {
    it('should map Python levels to LogEntry levels', () => {
      expect(pythonLogParser.mapPythonLevel('DEBUG')).toBe('debug');
      expect(pythonLogParser.mapPythonLevel('INFO')).toBe('info');
      expect(pythonLogParser.mapPythonLevel('WARNING')).toBe('warn');
      expect(pythonLogParser.mapPythonLevel('ERROR')).toBe('error');
      expect(pythonLogParser.mapPythonLevel('CRITICAL')).toBe('error');
    });

    it('should handle lowercase levels', () => {
      expect(pythonLogParser.mapPythonLevel('debug')).toBe('debug');
      expect(pythonLogParser.mapPythonLevel('info')).toBe('info');
      expect(pythonLogParser.mapPythonLevel('warning')).toBe('warn');
      expect(pythonLogParser.mapPythonLevel('error')).toBe('error');
      expect(pythonLogParser.mapPythonLevel('critical')).toBe('error');
    });

    it('should handle mixed case levels', () => {
      expect(pythonLogParser.mapPythonLevel('Debug')).toBe('debug');
      expect(pythonLogParser.mapPythonLevel('Info')).toBe('info');
      expect(pythonLogParser.mapPythonLevel('Warning')).toBe('warn');
      expect(pythonLogParser.mapPythonLevel('Error')).toBe('error');
      expect(pythonLogParser.mapPythonLevel('Critical')).toBe('error');
    });

    it('should default to info for unknown levels', () => {
      expect(pythonLogParser.mapPythonLevel('UNKNOWN')).toBe('info');
      expect(pythonLogParser.mapPythonLevel('TRACE')).toBe('info');
      expect(pythonLogParser.mapPythonLevel('')).toBe('info');
    });

    it('should map FATAL to error', () => {
      expect(pythonLogParser.mapPythonLevel('FATAL')).toBe('error');
    });
  });
});