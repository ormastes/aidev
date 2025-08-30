import React, { useState, useEffect, useCallback } from 'react';
import { LogEntry, LogFilter, LogStats } from '../../domain/interfaces';
import { LogViewer } from './LogViewer';
import { FilterPanel } from './FilterPanel';
import { StatsPanel } from './StatsPanel';
import { ExportPanel } from './ExportPanel';
import { useWebSocket } from '../hooks/useWebSocket';
import { useLogAnalytics } from '../hooks/useLogAnalytics';
import './Dashboard.css';

interface DashboardProps {
  apiUrl?: string;
  wsUrl?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({
  apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:3001'
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [filters, setFilters] = useState<LogFilter>({
    level: 'all',
    search: '',
    startDate: null,
    endDate: null,
    sources: []
  });
  const [stats, setStats] = useState<LogStats>({
    total: 0,
    error: 0,
    warning: 0,
    info: 0,
    debug: 0,
    rate: 0
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // WebSocket connection for real-time logs
  const { sendMessage, lastMessage, connectionStatus } = useWebSocket(wsUrl);
  
  // Analytics hook for log processing
  const { analyzePattern, detectAnomalies, getInsights } = useLogAnalytics();

  // Update connection status
  useEffect(() => {
    setIsConnected(connectionStatus === 'connected');
  }, [connectionStatus]);

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (lastMessage && !isPaused) {
      try {
        const newLog = JSON.parse(lastMessage);
        if (newLog.type === 'log') {
          setLogs(prev => {
            const updated = [...prev, newLog.data];
            // Keep only last 10000 logs in memory
            if (updated.length > 10000) {
              return updated.slice(-10000);
            }
            return updated;
          });
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    }
  }, [lastMessage, isPaused]);

  // Apply filters to logs
  useEffect(() => {
    const filtered = logs.filter(log => {
      // Level filter
      if (filters.level !== 'all' && log.level !== filters.level) {
        return false;
      }

      // Search filter
      if (filters.search && !log.message.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      // Date range filter
      if (filters.startDate && new Date(log.timestamp) < filters.startDate) {
        return false;
      }
      if (filters.endDate && new Date(log.timestamp) > filters.endDate) {
        return false;
      }

      // Source filter
      if (filters.sources.length > 0 && !filters.sources.includes(log.source)) {
        return false;
      }

      return true;
    });

    setFilteredLogs(filtered);
  }, [logs, filters]);

  // Calculate statistics
  useEffect(() => {
    const calcStats = () => {
      const levelCounts = filteredLogs.reduce((acc, log) => {
        acc[log.level] = (acc[log.level] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Calculate rate (logs per second over last minute)
      const now = Date.now();
      const oneMinuteAgo = now - 60000;
      const recentLogs = filteredLogs.filter(log => 
        new Date(log.timestamp).getTime() > oneMinuteAgo
      );
      const rate = recentLogs.length / 60;

      setStats({
        total: filteredLogs.length,
        error: levelCounts.error || 0,
        warning: levelCounts.warning || 0,
        info: levelCounts.info || 0,
        debug: levelCounts.debug || 0,
        rate: Math.round(rate * 100) / 100
      });
    };

    calcStats();
    const interval = setInterval(calcStats, 5000); // Update stats every 5 seconds
    return () => clearInterval(interval);
  }, [filteredLogs]);

  // Load historical logs on mount
  useEffect(() => {
    const loadHistoricalLogs = async () => {
      try {
        const response = await fetch(`${apiUrl}/logs?limit=1000`);
        if (response.ok) {
          const data = await response.json();
          setLogs(data.logs || []);
        }
      } catch (error) {
        console.error('Failed to load historical logs:', error);
      }
    };

    loadHistoricalLogs();
  }, [apiUrl]);

  const handleFilterChange = useCallback((newFilters: Partial<LogFilter>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const handleClearLogs = useCallback(() => {
    setLogs([]);
    setFilteredLogs([]);
  }, []);

  const handleExport = useCallback(async (format: 'json' | 'csv' | 'txt') => {
    const dataToExport = filteredLogs;
    
    let content: string;
    let mimeType: string;
    let filename: string;

    switch (format) {
      case 'json':
        content = JSON.stringify(dataToExport, null, 2);
        mimeType = 'application/json';
        filename = `logs-${Date.now()}.json`;
        break;
      
      case 'csv':
        const headers = ['Timestamp', 'Level', 'Source', 'Message', 'Details'];
        const rows = dataToExport.map(log => [
          log.timestamp,
          log.level,
          log.source,
          log.message,
          JSON.stringify(log.details || {})
        ]);
        content = [headers, ...rows].map(row => row.join(',')).join('\n');
        mimeType = 'text/csv';
        filename = `logs-${Date.now()}.csv`;
        break;
      
      case 'txt':
        content = dataToExport.map(log => 
          `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}`
        ).join('\n');
        mimeType = 'text/plain';
        filename = `logs-${Date.now()}.txt`;
        break;
      
      default:
        return;
    }

    // Create download link
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredLogs]);

  const handleAnalyze = useCallback(async () => {
    const patterns = analyzePattern(filteredLogs);
    const anomalies = detectAnomalies(filteredLogs);
    const insights = getInsights(filteredLogs);

    // Display analysis results
    console.log('Analysis Results:', { patterns, anomalies, insights });
    
    // You can show these in a modal or separate panel
    alert(`Analysis Complete!\n\nPatterns found: ${patterns.length}\nAnomalies detected: ${anomalies.length}\nInsights: ${insights.length}`);
  }, [filteredLogs, analyzePattern, detectAnomalies, getInsights]);

  return (
    <div className="log-dashboard">
      <header className="dashboard-header">
        <h1>Log Analysis Dashboard</h1>
        <div className="connection-status">
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </header>

      <div className="dashboard-controls">
        <button 
          className={`control-btn ${isPaused ? 'paused' : ''}`}
          onClick={() => setIsPaused(!isPaused)}
        >
          {isPaused ? '▶ Resume' : '⏸ Pause'}
        </button>
        <button 
          className="control-btn"
          onClick={handleClearLogs}
        >
          🗑 Clear
        </button>
        <button 
          className="control-btn"
          onClick={handleAnalyze}
        >
          📊 Analyze
        </button>
      </div>

      <div className="dashboard-layout">
        <aside className="dashboard-sidebar">
          <StatsPanel stats={stats} />
          <FilterPanel 
            filters={filters}
            onFilterChange={handleFilterChange}
            availableSources={[...new Set(logs.map(l => l.source))]}
          />
          <ExportPanel onExport={handleExport} />
        </aside>

        <main className="dashboard-main">
          <LogViewer 
            logs={filteredLogs}
            isRealtime={!isPaused}
            onLogSelect={(log) => console.log('Selected log:', log)}
          />
        </main>
      </div>
    </div>
  );
};