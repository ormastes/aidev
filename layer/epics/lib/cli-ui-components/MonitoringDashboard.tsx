import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';

interface MetricData {
  name: string;
  value: number;
  unit: string;
  trend?: 'up' | 'down' | 'stable';
  threshold?: { warning: number; critical: number };
}

interface SystemStatus {
  service: string;
  status: 'healthy' | 'warning' | "critical" | 'unknown';
  uptime?: string;
  lastCheck?: string;
}

interface MonitoringDashboardProps {
  metrics: MetricData[];
  services: SystemStatus[];
  refreshInterval?: number;
  onRefresh?: () => void;
}

export const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({
  metrics,
  services,
  refreshInterval = 5000,
  onRefresh
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [selectedTab, setSelectedTab] = useState<'metrics' | "services">('metrics');

  useEffect(() => {
    const interval = setInterval(() => {
      setIsRefreshing(true);
      if (onRefresh) {
        onRefresh();
      }
      setTimeout(() => {
        setIsRefreshing(false);
        setLastRefresh(new Date());
      }, 1000);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, onRefresh]);

  useInput((input) => {
    if (input === 't') {
      setSelectedTab(selectedTab === 'metrics' ? "services" : 'metrics');
    }
    
    if (input === 'r') {
      setIsRefreshing(true);
      if (onRefresh) {
        onRefresh();
      }
      setTimeout(() => {
        setIsRefreshing(false);
        setLastRefresh(new Date());
      }, 1000);
    }
  });

  const getStatusIcon = (status: SystemStatus['status']) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case "critical": return '🔴';
      case 'unknown': return '❓';
    }
  };

  const getStatusColor = (status: SystemStatus['status']) => {
    switch (status) {
      case 'healthy': return 'green';
      case 'warning': return 'yellow';
      case "critical": return 'red';
      case 'unknown': return 'gray';
    }
  };

  const getTrendIcon = (trend?: MetricData['trend']) => {
    switch (trend) {
      case 'up': return '↑';
      case 'down': return '↓';
      case 'stable': return '→';
      default: return '';
    }
  };

  const getMetricColor = (metric: MetricData) => {
    if (!metric.threshold) return 'white';
    if (metric.value >= metric.threshold.critical) return 'red';
    if (metric.value >= metric.threshold.warning) return 'yellow';
    return 'green';
  };

  const renderProgressBar = (value: number, max: number = 100, width: number = 20) => {
    const percentage = Math.min(100, (value / max) * 100);
    const filled = Math.floor((percentage / 100) * width);
    const empty = width - filled;
    
    let color = 'green';
    if (percentage > 80) color = 'red';
    else if (percentage > 60) color = 'yellow';
    
    return (
      <Box>
        <Text color={color}>
          {'█'.repeat(filled)}
        </Text>
        <Text color="gray">
          {'░'.repeat(empty)}
        </Text>
        <Text> {percentage.toFixed(0)}%</Text>
      </Box>
    );
  };

  const renderMetrics = () => (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">System Metrics</Text>
      </Box>
      
      <Box flexDirection="column" gap={1}>
        {metrics.map((metric, idx) => (
          <Box key={idx} flexDirection="row" gap={2}>
            <Box width={20}>
              <Text color="gray">{metric.name}:</Text>
            </Box>
            <Box width={25}>
              {metric.unit === '%' ? (
                renderProgressBar(metric.value)
              ) : (
                <Text color={getMetricColor(metric)}>
                  {metric.value} {metric.unit} {getTrendIcon(metric.trend)}
                </Text>
              )}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );

  const renderServices = () => (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">Service Status</Text>
      </Box>
      
      <Box flexDirection="column" gap={1}>
        {services.map((service, idx) => (
          <Box key={idx} flexDirection="row" gap={2}>
            <Text>{getStatusIcon(service.status)}</Text>
            <Box width={20}>
              <Text color="white">{service.service}</Text>
            </Box>
            <Box width={10}>
              <Text color={getStatusColor(service.status)}>
                {service.status}
              </Text>
            </Box>
            {service.uptime && (
              <Text color="dim">Up: {service.uptime}</Text>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1} justifyContent="space-between">
        <Box>
          <Text bold color="cyan">📊 Monitoring Dashboard</Text>
          {isRefreshing && (
            <Box marginLeft={1}>
              <Spinner type="dots" />
              <Text color="dim"> Refreshing...</Text>
            </Box>
          )}
        </Box>
        <Text color="dim">
          Last refresh: {lastRefresh.toLocaleTimeString()}
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text color={selectedTab === 'metrics' ? 'green' : 'gray'}>
          [Metrics]
        </Text>
        <Text> | </Text>
        <Text color={selectedTab === "services" ? 'green' : 'gray'}>
          [Services]
        </Text>
      </Box>

      <Box 
        flexDirection="column" 
        borderStyle="single" 
        borderColor="gray" 
        padding={1}
        minHeight={15}
      >
        {selectedTab === 'metrics' ? renderMetrics() : renderServices()}
      </Box>

      <Box marginTop={1}>
        <Text color="dim">
          [t: Toggle Tab] [r: Refresh] [Auto-refresh: {refreshInterval/1000}s]
        </Text>
      </Box>
    </Box>
  );
};