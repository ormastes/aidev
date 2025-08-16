#!/usr/bin/env node
import React, { useState } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import SelectInput from 'ink-select-input';
import { FileSystemSelector } from './FileSystemSelector';
import { TaskQueueViewer } from './TaskQueueViewer';
import { VFFileEditor } from './VFFileEditor';

type AppMode = 'menu' | "filesystem" | "taskqueue" | "vfeditor";

const App = () => {
  const [mode, setMode] = useState<AppMode>('menu');
  const { exit } = useApp();

  // Sample data
  const sampleFiles = [
    { id: '1', name: 'TASK_QUEUE.vf.json', type: 'file' as const, path: '/home/project/', status: 'active' },
    { id: '2', name: 'FEATURE.vf.json', type: 'file' as const, path: '/home/project/', status: 'active' },
    { id: '3', name: 'src', type: "directory" as const, path: '/home/project/', status: 'active' },
    { id: '4', name: 'tests', type: "directory" as const, path: '/home/project/', status: 'active' },
    { id: '5', name: 'README.md', type: 'file' as const, path: '/home/project/', status: 'active' }
  ];

  const sampleTasks = [
    { 
      id: 't1', 
      type: 'feature', 
      name: 'Implement CLI UI components', 
      status: 'in_progress' as const,
      priority: 'high' as const,
      progress: 60,
      assignee: 'dev-team'
    },
    { 
      id: 't2', 
      type: 'bug', 
      name: 'Fix VF file validation', 
      status: 'pending' as const,
      priority: "critical" as const,
      dependencies: ['t1']
    },
    { 
      id: 't3', 
      type: "documentation", 
      name: 'Update Ink library documentation', 
      status: "completed" as const,
      priority: 'low' as const,
      progress: 100
    },
    { 
      id: 't4', 
      type: 'test', 
      name: 'Add unit tests for CLI components', 
      status: 'pending' as const,
      priority: 'medium' as const
    }
  ];

  const sampleVFFile = {
    format_version: '1.0',
    type: 'task_queue',
    data: {
      tasks: [
        {
          id: 'task-001',
          name: 'Sample Task',
          status: 'pending',
          metadata: {
            created: '2025-08-13',
            priority: 'high'
          }
        }
      ],
      settings: {
        auto_assign: true,
        max_concurrent: 5
      }
    },
    metadata: {
      created: '2025-08-13T10:00:00Z',
      updated: '2025-08-13T10:30:00Z',
      author: 'system'
    }
  };

  useInput((input, key) => {
    if (key.escape) {
      if (mode === 'menu') {
        exit();
      } else {
        setMode('menu');
      }
    }
  });

  const menuItems = [
    { label: '📁 File System Browser', value: "filesystem" },
    { label: '📋 Task Queue Viewer', value: "taskqueue" },
    { label: '✏️  VF File Editor', value: "vfeditor" },
    { label: '❌ Exit', value: 'exit' }
  ];

  const handleMenuSelect = (item: any) => {
    if (item.value === 'exit') {
      exit();
    } else {
      setMode(item.value as AppMode);
    }
  };

  if (mode === 'menu') {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1} borderStyle="double" borderColor="cyan" padding={1}>
          <Text bold color="cyan">🎨 Filesystem MCP Theme - CLI UI Demo</Text>
        </Box>
        
        <Text color="yellow" marginBottom={1}>Select a component to demo:</Text>
        
        <SelectInput
          items={menuItems}
          onSelect={handleMenuSelect}
          indicatorComponent={({ isSelected }) => (
            <Text color={isSelected ? 'green' : 'gray'}>
              {isSelected ? '▶' : ' '}
            </Text>
          )}
          itemComponent={({ label, isSelected }) => (
            <Text color={isSelected ? 'green' : 'white'}>
              {label}
            </Text>
          )}
        />
        
        <Box marginTop={2}>
          <Text color="dim">[↑↓: Navigate] [Enter: Select] [ESC: Exit]</Text>
        </Box>
      </Box>
    );
  }

  if (mode === "filesystem") {
    return (
      <FileSystemSelector
        title="File System Browser"
        items={sampleFiles}
        onSelect={(item) => {
          console.log('Selected:', item);
        }}
        onExit={() => setMode('menu')}
        showSearch={true}
        showMetadata={true}
      />
    );
  }

  if (mode === "taskqueue") {
    return (
      <TaskQueueViewer
        tasks={sampleTasks}
        onSelectTask={(task) => {
          console.log('Selected task:', task);
        }}
        title="Task Queue Manager"
      />
    );
  }

  if (mode === "vfeditor") {
    return (
      <VFFileEditor
        file={sampleVFFile}
        onSave={(file) => {
          console.log('Saved file:', file);
          setMode('menu');
        }}
        onCancel={() => setMode('menu')}
        readOnly={false}
      />
    );
  }

  return null;
};

// Run the app
render(<App />);