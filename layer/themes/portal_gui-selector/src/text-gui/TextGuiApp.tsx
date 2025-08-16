/**
 * Text-based GUI Application using Ink
 * Provides terminal-based interface for GUI selection
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, Newline, useInput, useApp, Spacer } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';
import Table from 'ink-table';
import Link from 'ink-link';
import { GuiTemplateSelector } from './components/GuiTemplateSelector';
import { ThemeManager } from './components/ThemeManager';
import { ProjectDashboard } from './components/ProjectDashboard';
import { StatusBar } from './components/StatusBar';
import { MenuBar } from './components/MenuBar';

interface AppState {
  screen: 'main' | "templates" | 'themes' | "projects" | "settings";
  loading: boolean;
  user?: string;
  selectedTemplate?: string;
  selectedTheme?: string;
  notifications: string[];
}

const TextGuiApp: React.FC = () => {
  const { exit } = useApp();
  const [state, setState] = useState<AppState>({
    screen: 'main',
    loading: false,
    notifications: [],
    user: 'Guest'
  });

  const [searchQuery, setSearchQuery] = useState('');

  // Handle global keyboard shortcuts
  useInput((input, key) => {
    // Ctrl+C or ESC to exit
    if (input === 'q' || key.escape) {
      exit();
    }

    // Navigation shortcuts
    if (key.ctrl) {
      switch (input) {
        case 't':
          setState(s => ({ ...s, screen: "templates" }));
          break;
        case 'h':
          setState(s => ({ ...s, screen: 'themes' }));
          break;
        case 'p':
          setState(s => ({ ...s, screen: "projects" }));
          break;
        case 's':
          setState(s => ({ ...s, screen: "settings" }));
          break;
        case 'm':
          setState(s => ({ ...s, screen: 'main' }));
          break;
      }
    }
  });

  const mainMenuItems = [
    {
      label: '📋 GUI Templates',
      value: "templates",
      description: 'Browse and select GUI templates'
    },
    {
      label: '🎨 Themes',
      value: 'themes',
      description: 'Manage application themes'
    },
    {
      label: '📁 Projects',
      value: "projects",
      description: 'View and manage projects'
    },
    {
      label: '⚙️  Settings',
      value: "settings",
      description: 'Configure application settings'
    },
    {
      label: '🚪 Exit',
      value: 'exit',
      description: 'Exit the application'
    }
  ];

  const handleMenuSelect = (item: any) => {
    if (item.value === 'exit') {
      exit();
    } else {
      setState(s => ({ ...s, screen: item.value }));
    }
  };

  const renderHeader = () => (
    <Box flexDirection="column" marginBottom={1}>
      <Gradient name="rainbow">
        <BigText text="GUI SELECTOR" font="chrome" />
      </Gradient>
      <Box>
        <Text color="cyan">AI Development Platform</Text>
        <Spacer />
        <Text color="gray">User: {state.user}</Text>
      </Box>
      <Box marginTop={1}>
        <Text color="gray">─────────────────────────────────────────────────────────</Text>
      </Box>
    </Box>
  );

  const renderMainMenu = () => (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="yellow">Main Menu</Text>
      </Box>
      <SelectInput items={mainMenuItems} onSelect={handleMenuSelect} />
      <Box marginTop={2}>
        <Text color="gray">Navigation: ↑↓ arrows, Enter to select</Text>
      </Box>
      <Box>
        <Text color="gray">Shortcuts: Ctrl+T (Templates), Ctrl+H (Themes), Ctrl+P (Projects)</Text>
      </Box>
    </Box>
  );

  const renderScreen = () => {
    if (state.loading) {
      return (
        <Box padding={2}>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          <Text> Loading...</Text>
        </Box>
      );
    }

    switch (state.screen) {
      case "templates":
        return (
          <GuiTemplateSelector
            onSelect={(template) => {
              setState(s => ({ 
                ...s, 
                selectedTemplate: template,
                notifications: [...s.notifications, `Selected template: ${template}`]
              }));
            }}
            onBack={() => setState(s => ({ ...s, screen: 'main' }))}
          />
        );

      case 'themes':
        return (
          <ThemeManager
            onSelect={(theme) => {
              setState(s => ({ 
                ...s, 
                selectedTheme: theme,
                notifications: [...s.notifications, `Applied theme: ${theme}`]
              }));
            }}
            onBack={() => setState(s => ({ ...s, screen: 'main' }))}
          />
        );

      case "projects":
        return (
          <ProjectDashboard
            onBack={() => setState(s => ({ ...s, screen: 'main' }))}
          />
        );

      case "settings":
        return (
          <Box flexDirection="column">
            <Text bold color="yellow">Settings</Text>
            <Box marginTop={1}>
              <Text>Search: </Text>
              <TextInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Type to search..."
              />
            </Box>
            <Box marginTop={2}>
              <Table
                data={[
                  { setting: 'Theme', value: state.selectedTheme || 'Default' },
                  { setting: "Template", value: state.selectedTemplate || 'None' },
                  { setting: 'User', value: state.user || 'Guest' },
                  { setting: 'API Endpoint', value: 'http://localhost:3456' }
                ]}
              />
            </Box>
            <Box marginTop={2}>
              <Text color="gray">Press 'b' to go back</Text>
            </Box>
          </Box>
        );

      default:
        return renderMainMenu();
    }
  };

  const renderFooter = () => (
    <Box flexDirection="column" marginTop={1}>
      <Box>
        <Text color="gray">─────────────────────────────────────────────────────────</Text>
      </Box>
      <StatusBar
        screen={state.screen}
        notifications={state.notifications}
        template={state.selectedTemplate}
        theme={state.selectedTheme}
      />
    </Box>
  );

  return (
    <Box flexDirection="column" padding={1}>
      {renderHeader()}
      <Box flexGrow={1} flexDirection="column">
        {renderScreen()}
      </Box>
      {renderFooter()}
    </Box>
  );
};

export default TextGuiApp;