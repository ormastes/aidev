import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import Table from 'ink-table';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';

interface TaskItem {
  id: string;
  type: string;
  name: string;
  status: 'pending' | 'in_progress' | "completed" | 'failed';
  priority?: 'low' | 'medium' | 'high' | "critical";
  assignee?: string;
  progress?: number;
  dependencies?: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface TaskQueueViewerProps {
  tasks: TaskItem[];
  onSelectTask?: (task: TaskItem) => void;
  onStatusChange?: (taskId: string, newStatus: TaskItem['status']) => void;
  title?: string;
}

export const TaskQueueViewer: React.FC<TaskQueueViewerProps> = ({
  tasks,
  onSelectTask,
  onStatusChange,
  title = 'Task Queue'
}) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'table' | 'detail'>('list');
  const [filterStatus, setFilterStatus] = useState<TaskItem['status'] | 'all'>('all');

  const filteredTasks = filterStatus === 'all' 
    ? tasks 
    : tasks.filter(task => task.status === filterStatus);

  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  useInput((input, key) => {
    if (input === 'v') {
      // Toggle view mode
      const modes: Array<'list' | 'table' | 'detail'> = ['list', 'table', 'detail'];
      const currentIndex = modes.indexOf(viewMode);
      setViewMode(modes[(currentIndex + 1) % modes.length]);
    }
    
    if (input === 'f') {
      // Toggle filter
      const statuses: Array<TaskItem['status'] | 'all'> = ['all', 'pending', 'in_progress', "completed", 'failed'];
      const currentIndex = statuses.indexOf(filterStatus);
      setFilterStatus(statuses[(currentIndex + 1) % statuses.length]);
    }
  });

  const getStatusIcon = (status: TaskItem['status']) => {
    switch (status) {
      case "completed": return '✅';
      case 'in_progress': return '🔄';
      case 'failed': return '❌';
      case 'pending': return '⏳';
      default: return '❓';
    }
  };

  const getPriorityColor = (priority?: TaskItem["priority"]) => {
    switch (priority) {
      case "critical": return 'red';
      case 'high': return 'yellow';
      case 'medium': return 'cyan';
      case 'low': return 'gray';
      default: return 'white';
    }
  };

  const renderListView = () => {
    const items = filteredTasks.map(task => ({
      label: `${getStatusIcon(task.status)} ${task.name}`,
      value: task.id,
      task
    }));

    return (
      <SelectInput
        items={items}
        onSelect={(item) => {
          setSelectedTaskId(item.value);
          if (onSelectTask && item.task) {
            onSelectTask(item.task);
          }
        }}
        indicatorComponent={({ isSelected }) => (
          <Text color={isSelected ? 'green' : 'gray'}>
            {isSelected ? '▶' : ' '}
          </Text>
        )}
        itemComponent={({ label, task, isSelected }) => (
          <Box>
            <Text color={isSelected ? 'green' : getPriorityColor(task?.priority)}>
              {label}
            </Text>
            {task?.priority && (
              <Text color="dim"> [{task.priority}]</Text>
            )}
          </Box>
        )}
      />
    );
  };

  const renderTableView = () => {
    const tableData = filteredTasks.map(task => ({
      Status: getStatusIcon(task.status),
      Name: task.name.substring(0, 30),
      Priority: task.priority || '-',
      Assignee: task.assignee || '-',
      Progress: task.progress ? `${task.progress}%` : '-'
    }));

    return <Table data={tableData} />;
  };

  const renderDetailView = () => {
    if (!selectedTask) {
      return <Text color="dim">Select a task to view details</Text>;
    }

    return (
      <Box flexDirection="column" borderStyle="single" borderColor="cyan" padding={1}>
        <Text bold color="cyan">{selectedTask.name}</Text>
        <Text>ID: {selectedTask.id}</Text>
        <Text>Type: {selectedTask.type}</Text>
        <Text>Status: {getStatusIcon(selectedTask.status)} {selectedTask.status}</Text>
        {selectedTask.priority && (
          <Text color={getPriorityColor(selectedTask.priority)}>
            Priority: {selectedTask.priority}
          </Text>
        )}
        {selectedTask.assignee && <Text>Assignee: {selectedTask.assignee}</Text>}
        {selectedTask.progress !== undefined && (
          <Box>
            <Text>Progress: </Text>
            <Box width={20}>
              <Text>
                {'█'.repeat(Math.floor(selectedTask.progress / 5))}
                {'░'.repeat(20 - Math.floor(selectedTask.progress / 5))}
              </Text>
            </Box>
            <Text> {selectedTask.progress}%</Text>
          </Box>
        )}
        {selectedTask.dependencies && selectedTask.dependencies.length > 0 && (
          <Box flexDirection="column">
            <Text bold>Dependencies:</Text>
            {selectedTask.dependencies.map(dep => (
              <Text key={dep}>• {dep}</Text>
            ))}
          </Box>
        )}
        {selectedTask.createdAt && <Text color="dim">Created: {selectedTask.createdAt}</Text>}
        {selectedTask.updatedAt && <Text color="dim">Updated: {selectedTask.updatedAt}</Text>}
      </Box>
    );
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1} justifyContent="space-between">
        <Text bold color="cyan">{title}</Text>
        <Box>
          <Text color="yellow">
            Total: {tasks.length} | Filtered: {filteredTasks.length}
          </Text>
        </Box>
      </Box>

      <Box marginBottom={1}>
        <Text color="gray">Filter: </Text>
        <Text color="green">{filterStatus}</Text>
        <Text color="gray"> | View: </Text>
        <Text color="green">{viewMode}</Text>
      </Box>

      <Box flexDirection="column" minHeight={10}>
        {viewMode === 'list' && renderListView()}
        {viewMode === 'table' && renderTableView()}
        {viewMode === 'detail' && renderDetailView()}
      </Box>

      <Box marginTop={1}>
        <Text color="dim">
          [v: Toggle View] [f: Toggle Filter] [Enter: Select]
        </Text>
      </Box>
    </Box>
  );
};