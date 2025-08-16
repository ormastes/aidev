export interface LogEntry {
  timestamp: Date;
  level: string;
  message: string;
  source: 'stdout' | 'stderr';
  processId: string;
  metadata?: Record<string, any>;
}