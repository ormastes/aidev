/**
 * Theme Manager Component
 * Manage and preview different UI themes
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import Gradient from 'ink-gradient';
import chalk from 'chalk';

interface Theme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
  preview: string;
}

interface Props {
  onSelect: (themeId: string) => void;
  onBack: () => void;
}

export const ThemeManager: React.FC<Props> = ({ onSelect, onBack }) => {
  const [previewMode, setPreviewMode] = useState(true);

  useInput((input, key) => {
    if (input === 'b' || key.backspace) {
      onBack();
    }
    if (input === 'p') {
      setPreviewMode(!previewMode);
    }
  });

  const themes: Theme[] = [
    {
      id: 'dark-mode',
      name: 'Dark Mode',
      colors: {
        primary: '#007ACC',
        secondary: '#40E0D0',
        background: '#1E1E1E',
        text: '#D4D4D4'
      },
      preview: 'Modern dark theme with blue accents'
    },
    {
      id: 'light-mode',
      name: 'Light Mode',
      colors: {
        primary: '#0066CC',
        secondary: '#FF6B6B',
        background: '#FFFFFF',
        text: '#333333'
      },
      preview: 'Clean light theme for daytime use'
    },
    {
      id: 'high-contrast',
      name: 'High Contrast',
      colors: {
        primary: '#FFFF00',
        secondary: '#00FF00',
        background: '#000000',
        text: '#FFFFFF'
      },
      preview: 'High contrast for accessibility'
    },
    {
      id: 'ocean',
      name: 'Ocean Theme',
      colors: {
        primary: '#006994',
        secondary: '#00CED1',
        background: '#001F3F',
        text: '#B0E0E6'
      },
      preview: 'Calming ocean-inspired colors'
    },
    {
      id: 'forest',
      name: 'Forest Theme',
      colors: {
        primary: '#228B22',
        secondary: '#90EE90',
        background: '#0F2F0F',
        text: '#98FB98'
      },
      preview: 'Natural green forest theme'
    },
    {
      id: 'sunset',
      name: 'Sunset Theme',
      colors: {
        primary: '#FF6B35',
        secondary: '#F7931E',
        background: '#2C1810',
        text: '#FFD4B2'
      },
      preview: 'Warm sunset-inspired palette'
    }
  ];

  const renderThemePreview = (theme: Theme) => {
    if (!previewMode) return null;

    return (
      <Box 
        flexDirection="column" 
        marginLeft={2}
        borderStyle="round"
        borderColor={theme.colors.primary}
        padding={1}
      >
        <Text color={theme.colors.primary} bold>
          {theme.name} Preview
        </Text>
        <Box marginTop={1}>
          <Box flexDirection="column">
            <Text color={theme.colors.primary}>
              Primary: {theme.colors.primary}
            </Text>
            <Text color={theme.colors.secondary}>
              Secondary: {theme.colors.secondary}
            </Text>
            <Text color={theme.colors.text}>
              Text: {theme.colors.text}
            </Text>
            <Text color="gray">
              Background: {theme.colors.background}
            </Text>
          </Box>
        </Box>
        <Box marginTop={1}>
          <Text color="gray" italic>{theme.preview}</Text>
        </Box>
        
        {/* Color swatches */}
        <Box marginTop={1}>
          <Text backgroundColor={theme.colors.primary}>   </Text>
          <Text backgroundColor={theme.colors.secondary}>   </Text>
          <Text backgroundColor={theme.colors.background}>   </Text>
          <Text backgroundColor={theme.colors.text}>   </Text>
        </Box>
      </Box>
    );
  };

  const [selectedTheme, setSelectedTheme] = useState<Theme>(themes[0]);

  const themeItems = themes.map(theme => ({
    label: theme.name,
    value: theme.id,
    theme
  }));

  const handleThemeSelect = (item: any) => {
    setSelectedTheme(item.theme);
    onSelect(item.value);
  };

  const handleThemeHighlight = (item: any) => {
    setSelectedTheme(item.theme);
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Gradient name="rainbow">
          <Text bold>Theme Manager</Text>
        </Gradient>
      </Box>

      <Box>
        <Box flexDirection="column" marginRight={2}>
          <Text color="cyan" bold>Select Theme:</Text>
          <SelectInput
            items={themeItems}
            onSelect={handleThemeSelect}
            onHighlight={handleThemeHighlight}
          />
        </Box>

        {renderThemePreview(selectedTheme)}
      </Box>

      <Box marginTop={2} flexDirection="column">
        <Text color="gray">Theme Statistics:</Text>
        <Box marginLeft={2}>
          <Text color="gray">• Total themes: {themes.length}</Text>
        </Box>
        <Box marginLeft={2}>
          <Text color="gray">• Current: {selectedTheme.name}</Text>
        </Box>
      </Box>

      <Box marginTop={2} flexDirection="column">
        <Text color="gray">Commands:</Text>
        <Text color="gray">  'p' - Toggle preview</Text>
        <Text color="gray">  'b' - Back to main menu</Text>
        <Text color="gray">  'Enter' - Apply theme</Text>
      </Box>
    </Box>
  );
};