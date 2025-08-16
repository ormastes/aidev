import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';

interface Theme {
  id: string;
  name: string;
  description: string;
  category: 'check' | 'infra' | 'init' | 'lib' | 'llm-agent' | 'mcp' | 'portal' | 'tool';
  status: 'active' | 'development' | 'deprecated';
  features: string[];
}

interface ThemeSelectorProps {
  themes: Theme[];
  onSelectTheme?: (theme: Theme) => void;
  showDetails?: boolean;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  themes,
  onSelectTheme,
  showDetails = true
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const { exit } = useApp();

  const categories = ['all', ...Array.from(new Set(themes.map(t => t.category)))];
  
  const filteredThemes = selectedCategory === 'all' 
    ? themes 
    : themes.filter(t => t.category === selectedCategory);

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      exit();
    }
    
    if (input === 'c') {
      const currentIndex = categories.indexOf(selectedCategory);
      setSelectedCategory(categories[(currentIndex + 1) % categories.length]);
    }
  });

  const getCategoryIcon = (category: Theme['category']) => {
    switch (category) {
      case 'check': return '✓';
      case 'infra': return '🏗️';
      case 'init': return '🚀';
      case 'lib': return '📚';
      case 'llm-agent': return '🤖';
      case 'mcp': return '🔌';
      case 'portal': return '🌐';
      case 'tool': return '🔧';
      default: return '📦';
    }
  };

  const getStatusColor = (status: Theme['status']) => {
    switch (status) {
      case 'active': return 'green';
      case 'development': return 'yellow';
      case 'deprecated': return 'red';
      default: return 'gray';
    }
  };

  const themeItems = filteredThemes.map(theme => ({
    label: `${getCategoryIcon(theme.category)} ${theme.name}`,
    value: theme.id,
    theme
  }));

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1} borderStyle="double" borderColor="cyan" padding={1}>
        <Text bold color="cyan">🎨 Theme Selector</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="gray">Category: </Text>
        <Text color="yellow">{selectedCategory}</Text>
        <Text color="dim"> (press 'c' to cycle)</Text>
      </Box>

      <Box flexDirection="row" gap={2}>
        <Box flexDirection="column" width="50%">
          <Text color="yellow" marginBottom={1}>Available Themes ({filteredThemes.length}):</Text>
          <SelectInput
            items={themeItems}
            onSelect={(item) => {
              setSelectedTheme(item.theme);
              if (onSelectTheme && item.theme) {
                onSelectTheme(item.theme);
              }
            }}
            indicatorComponent={({ isSelected }) => (
              <Text color={isSelected ? 'green' : 'gray'}>
                {isSelected ? '▶' : ' '}
              </Text>
            )}
            itemComponent={({ theme, label, isSelected }) => (
              <Box>
                <Text color={isSelected ? 'green' : 'white'}>
                  {label}
                </Text>
                <Text color={getStatusColor(theme?.status || 'active')}>
                  {' '}[{theme?.status}]
                </Text>
              </Box>
            )}
          />
        </Box>

        {showDetails && selectedTheme && (
          <Box flexDirection="column" width="50%" borderStyle="single" borderColor="gray" padding={1}>
            <Text bold color="magenta">{selectedTheme.name}</Text>
            <Text color="dim">{selectedTheme.description}</Text>
            <Text marginTop={1}>
              <Text color="cyan">Category:</Text> {selectedTheme.category}
            </Text>
            <Text>
              <Text color="cyan">Status:</Text>{' '}
              <Text color={getStatusColor(selectedTheme.status)}>
                {selectedTheme.status}
              </Text>
            </Text>
            {selectedTheme.features.length > 0 && (
              <Box flexDirection="column" marginTop={1}>
                <Text color="cyan">Features:</Text>
                {selectedTheme.features.slice(0, 5).map((feature, idx) => (
                  <Text key={idx} color="gray">• {feature}</Text>
                ))}
                {selectedTheme.features.length > 5 && (
                  <Text color="dim">... and {selectedTheme.features.length - 5} more</Text>
                )}
              </Box>
            )}
          </Box>
        )}
      </Box>

      <Box marginTop={1}>
        <Text color="dim">
          [↑↓: Navigate] [Enter: Select] [c: Category] [q/ESC: Exit]
        </Text>
      </Box>
    </Box>
  );
};