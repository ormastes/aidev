/**
 * Project Dashboard Component
 * Display project statistics and management
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import Table from 'ink-table';
import Spinner from 'ink-spinner';
import ProgressBar from 'ink-progress-bar';
import figures from 'figures';

interface Project {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'pending' | 'archived';
  progress: number;
  lastUpdated: string;
  tasks: number;
  completedTasks: number;
}

interface Props {
  onBack: () => void;
}

export const ProjectDashboard: React.FC<Props> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedView, setSelectedView] = useState<'list' | 'stats'>('list');

  useEffect(() => {
    // Simulate loading projects
    setTimeout(() => {
      setProjects([
        {
          id: 'proj-001',
          name: 'Enhanced Manual Generator',
          status: 'completed',
          progress: 100,
          lastUpdated: '2025-08-13',
          tasks: 8,
          completedTasks: 8
        },
        {
          id: 'proj-002',
          name: 'Portal Security',
          status: 'completed',
          progress: 100,
          lastUpdated: '2025-08-11',
          tasks: 4,
          completedTasks: 4
        },
        {
          id: 'proj-003',
          name: 'Text GUI Integration',
          status: 'active',
          progress: 25,
          lastUpdated: '2025-08-13',
          tasks: 5,
          completedTasks: 1
        },
        {
          id: 'proj-004',
          name: 'Screenshot System',
          status: 'pending',
          progress: 0,
          lastUpdated: '2025-08-12',
          tasks: 4,
          completedTasks: 0
        },
        {
          id: 'proj-005',
          name: 'Navigation System',
          status: 'pending',
          progress: 0,
          lastUpdated: '2025-08-12',
          tasks: 4,
          completedTasks: 0
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  useInput((input, key) => {
    if (input === 'b' || key.backspace) {
      onBack();
    }
    if (input === 'v') {
      setSelectedView(selectedView === 'list' ? 'stats' : 'list');
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return figures.play;
      case 'completed': return figures.tick;
      case 'pending': return figures.circle;
      case 'archived': return figures.cross;
      default: return figures.bullet;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'yellow';
      case 'completed': return 'green';
      case 'pending': return 'gray';
      case 'archived': return 'red';
      default: return 'white';
    }
  };

  const renderProjectList = () => {
    const tableData = projects.map(p => ({
      Status: getStatusIcon(p.status),
      Name: p.name,
      Progress: `${p.progress}%`,
      Tasks: `${p.completedTasks}/${p.tasks}`,
      Updated: p.lastUpdated
    }));

    return (
      <Box flexDirection="column">
        <Table data={tableData} />
        
        <Box marginTop={2} flexDirection="column">
          {projects.map(p => (
            <Box key={p.id} marginBottom={1}>
              <Text color={getStatusColor(p.status)}>
                {getStatusIcon(p.status)} {p.name}
              </Text>
              <Box marginLeft={2}>
                <ProgressBar percent={p.progress / 100} />
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  const renderStatistics = () => {
    const stats = {
      total: projects.length,
      active: projects.filter(p => p.status === 'active').length,
      completed: projects.filter(p => p.status === 'completed').length,
      pending: projects.filter(p => p.status === 'pending').length,
      totalTasks: projects.reduce((sum, p) => sum + p.tasks, 0),
      completedTasks: projects.reduce((sum, p) => sum + p.completedTasks, 0)
    };

    const overallProgress = stats.totalTasks > 0 
      ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
      : 0;

    return (
      <Box flexDirection="column">
        <Box borderStyle="round" padding={1} flexDirection="column">
          <Text bold color="cyan">Project Statistics</Text>
          
          <Box marginTop={1} flexDirection="column">
            <Box>
              <Text>Total Projects: </Text>
              <Text color="yellow" bold>{stats.total}</Text>
            </Box>
            <Box>
              <Text>Active: </Text>
              <Text color="yellow">{stats.active}</Text>
            </Box>
            <Box>
              <Text>Completed: </Text>
              <Text color="green">{stats.completed}</Text>
            </Box>
            <Box>
              <Text>Pending: </Text>
              <Text color="gray">{stats.pending}</Text>
            </Box>
          </Box>

          <Box marginTop={2} flexDirection="column">
            <Text bold>Task Progress</Text>
            <Box>
              <Text>{stats.completedTasks} / {stats.totalTasks} tasks</Text>
            </Box>
            <Box>
              <ProgressBar percent={overallProgress / 100} />
              <Text> {overallProgress}%</Text>
            </Box>
          </Box>
        </Box>

        {/* ASCII Chart */}
        <Box marginTop={2} flexDirection="column" borderStyle="single" padding={1}>
          <Text bold>Progress Chart</Text>
          <Box flexDirection="column" marginTop={1}>
            <Text>Completed │{'█'.repeat(Math.floor(stats.completed * 5))} {stats.completed}</Text>
            <Text>Active    │{'█'.repeat(Math.floor(stats.active * 5))} {stats.active}</Text>
            <Text>Pending   │{'█'.repeat(Math.floor(stats.pending * 5))} {stats.pending}</Text>
          </Box>
        </Box>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box padding={1}>
        <Text color="green">
          <Spinner type="dots" />
        </Text>
        <Text> Loading projects...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="yellow">Project Dashboard</Text>
        <Text color="gray"> - View: {selectedView}</Text>
      </Box>

      {selectedView === 'list' ? renderProjectList() : renderStatistics()}

      <Box marginTop={2} flexDirection="column">
        <Text color="gray">Commands:</Text>
        <Text color="gray">  'v' - Toggle view (list/stats)</Text>
        <Text color="gray">  'b' - Back to main menu</Text>
      </Box>
    </Box>
  );
};