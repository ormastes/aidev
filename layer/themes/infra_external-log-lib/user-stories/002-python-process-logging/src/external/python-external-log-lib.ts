import { 
  LogEntry, 
  ExternalLogLib, 
  ExternalLogLibImpl 
} from '../../../001-basic-log-capture/src/external/external-log-lib';
import { pythonLogParser } from './python-log-parser';

export class PythonExternalLogLib extends ExternalLogLibImpl implements ExternalLogLib {
  parseLogLine(line: string, source: 'stdout' | 'stderr'): LogEntry {
    // Try Python-specific formats first
    const pythonResult = pythonLogParser.parsePythonLogLine(line, source);
    
    // If Python parser returned a plain format (no specific level detected),
    // try the parent parser which handles bracket formats like [DEBUG]
    if (pythonResult.message === line && 
        ((source === 'stdout' && pythonResult.level === 'info') ||
         (source === 'stderr' && pythonResult.level === 'error'))) {
      // This looks like it wasn't parsed, try parent parser
      return super.parseLogLine(line, source);
    }
    
    return pythonResult;
  }
}

// Export singleton instance
export const pythonExternalLogLib = new PythonExternalLogLib();