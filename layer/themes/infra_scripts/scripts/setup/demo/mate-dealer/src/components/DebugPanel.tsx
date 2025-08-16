import React, { useState, useEffect } from 'react';
import { logger, LogLevel, LogEntry, PerformanceMetric } from '../services/ExternalLogger';

interface DebugPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ isOpen = false, onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [activeTab, setActiveTab] = useState<'logs' | 'performance' | 'network'>('logs');
  const [logFilter, setLogFilter] = useState<LogLevel | 'ALL'>('ALL');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!isOpen || !autoRefresh) return;

    const refreshLogs = () => {
      setLogs(logger.getRecentLogs(200));
      setMetrics(logger.getPerformanceMetrics());
    };

    refreshLogs();
    const interval = setInterval(refreshLogs, 1000);

    return () => clearInterval(interval);
  }, [isOpen, autoRefresh]);

  const filteredLogs = logs.filter(log => 
    logFilter === 'ALL' || log.level === logFilter
  );

  const getLogLevelColor = (level: LogLevel): string => {
    switch (level) {
      case LogLevel.ERROR: return '#ef4444';
      case LogLevel.WARN: return '#f59e0b';
      case LogLevel.INFO: return '#3b82f6';
      case LogLevel.DEBUG: return '#6b7280';
      default: return '#000';
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const calculateAverageMetric = (metricName: string): number => {
    const relevantMetrics = metrics.filter(m => m.name === metricName);
    if (relevantMetrics.length === 0) return 0;
    
    const sum = relevantMetrics.reduce((acc, m) => acc + m.value, 0);
    return Math.round(sum / relevantMetrics.length);
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <h2 style={styles.title}>Debug Panel</h2>
          <div style={styles.controls}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh
            </label>
            <button onClick={() => logger.clearLogs()} style={styles.clearButton}>
              Clear Logs
            </button>
            <button onClick={onClose} style={styles.closeButton}>×</button>
          </div>
        </div>

        <div style={styles.tabs}>
          <button
            style={{...styles.tab, ...(activeTab === 'logs' ? styles.activeTab : {})}}
            onClick={() => setActiveTab('logs')}
          >
            Logs ({logs.length})
          </button>
          <button
            style={{...styles.tab, ...(activeTab === 'performance' ? styles.activeTab : {})}}
            onClick={() => setActiveTab('performance')}
          >
            Performance
          </button>
          <button
            style={{...styles.tab, ...(activeTab === 'network' ? styles.activeTab : {})}}
            onClick={() => setActiveTab('network')}
          >
            Network
          </button>
        </div>

        <div style={styles.content}>
          {activeTab === 'logs' && (
            <>
              <div style={styles.filterBar}>
                <select 
                  value={logFilter} 
                  onChange={(e) => setLogFilter(e.target.value as LogLevel | 'ALL')}
                  style={styles.filterSelect}
                >
                  <option value="ALL">All Levels</option>
                  <option value={LogLevel.DEBUG}>Debug</option>
                  <option value={LogLevel.INFO}>Info</option>
                  <option value={LogLevel.WARN}>Warning</option>
                  <option value={LogLevel.ERROR}>Error</option>
                </select>
                <span style={styles.logCount}>
                  Showing {filteredLogs.length} of {logs.length} logs
                </span>
              </div>
              
              <div style={styles.logContainer}>
                {filteredLogs.map((log, index) => (
                  <div key={index} style={styles.logEntry}>
                    <span style={{...styles.logLevel, color: getLogLevelColor(log.level)}}>
                      [{log.level}]
                    </span>
                    <span style={styles.logTime}>{formatTimestamp(log.timestamp)}</span>
                    {log.context && <span style={styles.logContext}>[{log.context}]</span>}
                    <span style={styles.logMessage}>{log.message}</span>
                    {log.metadata && (
                      <pre style={styles.logMetadata}>
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    )}
                    {log.stackTrace && (
                      <pre style={styles.stackTrace}>{log.stackTrace}</pre>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'performance' && (
            <div style={styles.performanceContainer}>
              <div style={styles.metricsGrid}>
                <div style={styles.metricCard}>
                  <h4>API Performance</h4>
                  <div style={styles.metricValue}>
                    {calculateAverageMetric('api_request_get')}ms
                  </div>
                  <div style={styles.metricLabel}>Avg GET Request</div>
                </div>
                <div style={styles.metricCard}>
                  <h4>Page Load</h4>
                  <div style={styles.metricValue}>
                    {calculateAverageMetric('page_load')}ms
                  </div>
                  <div style={styles.metricLabel}>Avg Load Time</div>
                </div>
                <div style={styles.metricCard}>
                  <h4>Database Queries</h4>
                  <div style={styles.metricValue}>
                    {calculateAverageMetric('db_query')}ms
                  </div>
                  <div style={styles.metricLabel}>Avg Query Time</div>
                </div>
              </div>

              <h3 style={styles.sectionTitle}>Recent Metrics</h3>
              <div style={styles.metricsTable}>
                {metrics.slice(-20).reverse().map((metric, index) => (
                  <div key={index} style={styles.metricRow}>
                    <span style={styles.metricName}>{metric.name}</span>
                    <span style={styles.metricValueSmall}>
                      {metric.value}{metric.unit}
                    </span>
                    <span style={styles.metricTime}>
                      {formatTimestamp(metric.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'network' && (
            <div style={styles.networkContainer}>
              <h3>Network Requests</h3>
              {logs
                .filter(log => log.context === 'API')
                .slice(-20)
                .reverse()
                .map((log, index) => (
                  <div key={index} style={styles.networkEntry}>
                    <span style={styles.networkMethod}>
                      {log.metadata?.method || 'GET'}
                    </span>
                    <span style={styles.networkUrl}>
                      {log.metadata?.url || 'Unknown URL'}
                    </span>
                    <span style={{
                      ...styles.networkStatus,
                      color: log.metadata?.statusCode >= 400 ? '#ef4444' : '#10b981'
                    }}>
                      {log.metadata?.statusCode || '---'}
                    </span>
                    <span style={styles.networkDuration}>
                      {log.metadata?.duration ? `${log.metadata.duration}ms` : '---'}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    width: '90%',
    maxWidth: '1200px',
    height: '80%',
    backgroundColor: '#fff',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600,
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
  },
  clearButton: {
    padding: '6px 12px',
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  closeButton: {
    width: '32px',
    height: '32px',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #e5e7eb',
    padding: '0 24px',
  },
  tab: {
    padding: '12px 24px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    color: '#6b7280',
  },
  activeTab: {
    color: '#2563eb',
    borderBottomColor: '#2563eb',
  },
  content: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  filterBar: {
    padding: '12px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #e5e7eb',
  },
  filterSelect: {
    padding: '6px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px',
  },
  logCount: {
    fontSize: '14px',
    color: '#6b7280',
  },
  logContainer: {
    flex: 1,
    overflow: 'auto',
    padding: '16px 24px',
    fontFamily: 'monospace',
    fontSize: '13px',
    backgroundColor: '#f9fafb',
  },
  logEntry: {
    marginBottom: '8px',
    lineHeight: '1.5',
  },
  logLevel: {
    fontWeight: 'bold',
    marginRight: '8px',
  },
  logTime: {
    color: '#9ca3af',
    marginRight: '8px',
  },
  logContext: {
    color: '#7c3aed',
    marginRight: '8px',
  },
  logMessage: {
    color: '#111827',
  },
  logMetadata: {
    margin: '4px 0 0 60px',
    padding: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    fontSize: '11px',
    overflow: 'auto',
  },
  stackTrace: {
    margin: '4px 0 0 60px',
    padding: '8px',
    backgroundColor: '#fee2e2',
    borderRadius: '4px',
    fontSize: '11px',
    color: '#991b1b',
    overflow: 'auto',
  },
  performanceContainer: {
    padding: '24px',
    overflow: 'auto',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  },
  metricCard: {
    padding: '20px',
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
    textAlign: 'center',
  },
  metricValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#2563eb',
    margin: '8px 0',
  },
  metricLabel: {
    fontSize: '14px',
    color: '#6b7280',
  },
  sectionTitle: {
    marginBottom: '16px',
    fontSize: '18px',
    fontWeight: 600,
  },
  metricsTable: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '16px',
  },
  metricRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr',
    gap: '16px',
    padding: '8px 0',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '14px',
  },
  metricName: {
    fontWeight: 500,
  },
  metricValueSmall: {
    color: '#2563eb',
    textAlign: 'right',
  },
  metricTime: {
    color: '#9ca3af',
    textAlign: 'right',
  },
  networkContainer: {
    padding: '24px',
    overflow: 'auto',
  },
  networkEntry: {
    display: 'grid',
    gridTemplateColumns: '80px 1fr 80px 100px',
    gap: '16px',
    padding: '12px',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '14px',
  },
  networkMethod: {
    fontWeight: 'bold',
    color: '#7c3aed',
  },
  networkUrl: {
    color: '#111827',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  networkStatus: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  networkDuration: {
    color: '#6b7280',
    textAlign: 'right',
  },
};