import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import Table from 'ink-table';

interface FileSystemItem {
  id: string;
  name: string;
  type: 'file' | "directory" | 'task' | 'feature';
  path?: string;
  status?: string;
  metadata?: Record<string, any>;
}

interface FileSystemSelectorProps {
  title: string;
  items: FileSystemItem[];
  onSelect?: (item: FileSystemItem) => void;
  onExit?: () => void;
  showSearch?: boolean;
  showMetadata?: boolean;
}

export const FileSystemSelector: React.FC<FileSystemSelectorProps> = ({
  title,
  items,
  onSelect,
  onExit,
  showSearch = true,
  showMetadata = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState<'browse' | 'search'>('browse');
  const { exit } = useApp();

  // Filter items based on search
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.path?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Transform items for SelectInput
  const selectItems = filteredItems.map(item => ({
    label: `${item.type === "directory" ? '📁' : '📄'} ${item.name}`,
    value: item.id,
    item
  }));

  useInput((input, key) => {
    if (input === 'q' || key.escape) {
      if (onExit) {
        onExit();
      } else {
        exit();
      }
    }
    
    if (input === '/') {
      setMode('search');
    }
    
    if (input === 'b') {
      setMode('browse');
      setSearchQuery('');
    }

    if (key.return && mode === 'browse') {
      const selectedItem = filteredItems[selectedIndex];
      if (selectedItem && onSelect) {
        onSelect(selectedItem);
      }
    }
  });

  const handleSelect = (item: any) => {
    if (onSelect && item.item) {
      onSelect(item.item);
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">{title}</Text>
      </Box>

      {showSearch && (
        <Box marginBottom={1}>
          <Text color="gray">Search (/):</Text>
          {mode === 'search' ? (
            <Box marginLeft={1}>
              <TextInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Type to search..."
              />
            </Box>
          ) : (
            <Text color="dim"> {searchQuery || 'Press / to search'}</Text>
          )}
        </Box>
      )}

      <Box flexDirection="column" marginBottom={1}>
        <Text color="yellow">Items ({filteredItems.length}):</Text>
        {mode === 'browse' && selectItems.length > 0 ? (
          <SelectInput
            items={selectItems}
            onSelect={handleSelect}
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
        ) : mode === 'search' ? (
          <Box marginTop={1}>
            <Text color="dim">Searching...</Text>
          </Box>
        ) : (
          <Text color="dim">No items found</Text>
        )}
      </Box>

      {showMetadata && filteredItems[selectedIndex] && (
        <Box flexDirection="column" borderStyle="single" borderColor="gray" padding={1}>
          <Text bold color="magenta">Metadata:</Text>
          {Object.entries(filteredItems[selectedIndex].metadata || {}).map(([key, value]) => (
            <Text key={key}>
              <Text color="cyan">{key}:</Text> {String(value)}
            </Text>
          ))}
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="dim">
          [q/ESC: Exit] [/: Search] [b: Browse] [Enter: Select]
        </Text>
      </Box>
    </Box>
  );
};