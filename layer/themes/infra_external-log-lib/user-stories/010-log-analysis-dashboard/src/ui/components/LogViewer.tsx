import React, { useEffect, useRef, useState } from 'react';
import { LogEntry } from '../../domain/interfaces';
import './LogViewer.css';

interface LogViewerProps {
  logs: LogEntry[];
  isRealtime: boolean;
  onLogSelect?: (log: LogEntry) => void;
}

export const LogViewer: React.FC<LogViewerProps> = ({ 
  logs, 
  isRealtime,
  onLogSelect 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && isRealtime && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll, isRealtime]);

  // Detect manual scroll
  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setAutoScroll(isAtBottom);
    }
  };

  const handleLogClick = (log: LogEntry) => {
    setSelectedLogId(log.id);
    onLogSelect?.(log);
    
    // Toggle expanded state
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(log.id)) {
        next.delete(log.id);
      } else {
        next.add(log.id);
      }
      return next;
    });
  };

  const getLevelClass = (level: string): string => {
    switch (level.toLowerCase()) {
      case 'error': return 'log-level-error';
      case 'warning': 
      case 'warn': return 'log-level-warning';
      case 'info': return 'log-level-info';
      case 'debug': return 'log-level-debug';
      default: return 'log-level-default';
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
      hour12: false
    });
  };

  const renderLogDetails = (log: LogEntry) => {
    if (!log.details || Object.keys(log.details).length === 0) {
      return null;
    }

    return (
      <div className="log-details">
        <pre>{JSON.stringify(log.details, null, 2)}</pre>
      </div>
    );
  };

  return (
    <div className="log-viewer">
      <div className="log-viewer-header">
        <span className="log-count">{logs.length} logs</span>
        {!autoScroll && (
          <button 
            className="scroll-to-bottom"
            onClick={() => {
              setAutoScroll(true);
              if (containerRef.current) {
                containerRef.current.scrollTop = containerRef.current.scrollHeight;
              }
            }}
          >
            ↓ Scroll to bottom
          </button>
        )}
      </div>

      <div 
        className="log-container" 
        ref={containerRef}
        onScroll={handleScroll}
      >
        {logs.length === 0 ? (
          <div className="no-logs">No logs to display</div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className={`log-entry ${getLevelClass(log.level)} ${
                selectedLogId === log.id ? 'selected' : ''
              } ${expandedLogs.has(log.id) ? 'expanded' : ''}`}
              onClick={() => handleLogClick(log)}
            >
              <div className="log-entry-main">
                <span className="log-timestamp">
                  {formatTimestamp(log.timestamp)}
                </span>
                <span className={`log-level ${getLevelClass(log.level)}`}>
                  {log.level.toUpperCase()}
                </span>
                <span className="log-source">
                  [{log.source}]
                </span>
                <span className="log-message">
                  {log.message}
                </span>
              </div>
              {expandedLogs.has(log.id) && renderLogDetails(log)}
            </div>
          ))
        )}
      </div>
    </div>
  );
};