import { pythonExternalLogLib } from '../../src/external/python-external-log-lib';
import { ExternalLogLibImpl } from '../../../001-basic-log-capture/src/external/external-log-lib';

describe("PythonExternalLogLib", () => {
  describe("parseLogLine", () => {
    it('should parse Python logging format', () => {
      const line = '2025-01-15 10:30:45,123 - app.module - INFO - Starting application';
      const result = pythonExternalLogLib.parseLogLine(line, 'stderr');
      
      expect(result.level).toBe('info');
      expect(result.message).toBe('Starting application');
      expect(result.source).toBe('stderr');
      expect(result.timestamp).toEqual(new Date('2025-01-15T10:30:45.123Z'));
    });

    it('should parse simple Python format', () => {
      const line = 'ERROR: Database connection failed';
      const result = pythonExternalLogLib.parseLogLine(line, 'stderr');
      
      expect(result.level).toBe('error');
      expect(result.message).toBe('Database connection failed');
    });

    it('should parse JSON format', () => {
      const line = '{"timestamp": "2025-01-15T10:00:00.000Z", "level": "WARNING", "message": "JSON warning"}';
      const result = pythonExternalLogLib.parseLogLine(line, 'stderr');
      
      expect(result.level).toBe('warn');
      expect(result.message).toBe('JSON warning');
      expect(result.timestamp).toEqual(new Date('2025-01-15T10:00:00.000Z'));
    });

    it('should detect Python tracebacks', () => {
      const line = 'ValueError: invalid literal for int()';
      const result = pythonExternalLogLib.parseLogLine(line, 'stderr');
      
      expect(result.level).toBe('error');
      expect(result.message).toBe(line);
    });

    it('should fall back to parent parser for bracket format', () => {
      const line = '[DEBUG] This is a debug message';
      const result = pythonExternalLogLib.parseLogLine(line, 'stderr');
      
      expect(result.level).toBe('debug');
      expect(result.message).toBe('This is a debug message');
    });

    it('should fall back to parent parser for structured format', () => {
      const line = '2025-01-15T10:30:45.123Z [INFO] Structured log message';
      const result = pythonExternalLogLib.parseLogLine(line, 'stdout');
      
      expect(result.level).toBe('info');
      expect(result.message).toBe('Structured log message');
      expect(result.timestamp).toEqual(new Date('2025-01-15T10:30:45.123Z'));
    });

    it('should handle plain text without falling back unnecessarily', () => {
      // Python parser returns the original message for plain text
      const line = 'Some plain text message';
      const result = pythonExternalLogLib.parseLogLine(line, 'stdout');
      
      expect(result.level).toBe('info');
      expect(result.message).toBe(line);
      expect(result.source).toBe('stdout');
    });

    it('should handle empty lines', () => {
      const result = pythonExternalLogLib.parseLogLine('', 'stderr');
      
      expect(result.level).toBe('error');
      expect(result.message).toBe('');
      expect(result.source).toBe('stderr');
    });

    it('should use correct default levels based on source', () => {
      const plainText = 'Plain text without format';
      
      const stdoutResult = pythonExternalLogLib.parseLogLine(plainText, 'stdout');
      expect(stdoutResult.level).toBe('info');
      expect(stdoutResult.source).toBe('stdout');
      
      const stderrResult = pythonExternalLogLib.parseLogLine(plainText, 'stderr');
      expect(stderrResult.level).toBe('error');
      expect(stderrResult.source).toBe('stderr');
    });

    it('should handle mixed format lines correctly', () => {
      // Test a line that looks like it might be multiple formats
      const line = '[DEBUG] 2025-01-15 10:00:00 - test - INFO - Confusing message';
      const result = pythonExternalLogLib.parseLogLine(line, 'stderr');
      
      // Should parse as bracket format (parent parser)
      expect(result.level).toBe('debug');
      expect(result.message).toBe('2025-01-15 10:00:00 - test - INFO - Confusing message');
    });

    it('should inherit createCapturer from parent class', () => {
      // Verify that createCapturer is available and works
      const mockProcess = {
        stdout: null,
        stderr: null,
        on: jest.fn(),
        removeListener: jest.fn()
      } as any;
      
      const capturer = pythonExternalLogLib.createCapturer(mockProcess);
      expect(capturer).toBeDefined();
      expect(capturer.start).toBeDefined();
      expect(capturer.stop).toBeDefined();
      expect(capturer.getEntries).toBeDefined();
      expect(capturer.onLog).toBeDefined();
    });

    it('should properly extend ExternalLogLibImpl', () => {
      // Verify inheritance
      expect(pythonExternalLogLib).toBeInstanceOf(ExternalLogLibImpl);
    });
  });
});