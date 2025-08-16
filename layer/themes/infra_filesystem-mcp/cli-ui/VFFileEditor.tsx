import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';

interface VFFile {
  format_version: string;
  type: string;
  data: any;
  metadata?: {
    created?: string;
    updated?: string;
    author?: string;
    [key: string]: any;
  };
}

interface VFFileEditorProps {
  file: VFFile;
  onSave?: (file: VFFile) => void;
  onCancel?: () => void;
  readOnly?: boolean;
}

export const VFFileEditor: React.FC<VFFileEditorProps> = ({
  file,
  onSave,
  onCancel,
  readOnly = false
}) => {
  const [editMode, setEditMode] = useState<'view' | 'edit'>('view');
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [editValue, setEditValue] = useState('');
  const [modifiedFile, setModifiedFile] = useState<VFFile>(file);
  const { exit } = useApp();

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      if (onCancel) {
        onCancel();
      } else {
        exit();
      }
    }

    if (input === 'e' && !readOnly) {
      setEditMode('edit');
    }

    if (input === 's' && !readOnly && editMode === 'edit') {
      if (onSave) {
        onSave(modifiedFile);
      }
      setEditMode('view');
    }

    if (key.return && editMode === 'view') {
      // Navigate into selected item
    }

    if (key.backspace && currentPath.length > 0) {
      // Navigate back
      setCurrentPath(currentPath.slice(0, -1));
    }
  });

  const getCurrentData = () => {
    let data = modifiedFile.data;
    for (const key of currentPath) {
      data = data[key];
    }
    return data;
  };

  const renderValue = (value: any, indent: number = 0): JSX.Element => {
    const indentStr = '  '.repeat(indent);
    
    if (value === null) {
      return <Text color="gray">{indentStr}null</Text>;
    }
    
    if (value === undefined) {
      return <Text color="gray">{indentStr}undefined</Text>;
    }
    
    if (typeof value === 'boolean') {
      return <Text color={value ? 'green' : 'red'}>{indentStr}{String(value)}</Text>;
    }
    
    if (typeof value === 'number') {
      return <Text color="cyan">{indentStr}{value}</Text>;
    }
    
    if (typeof value === 'string') {
      return <Text color="yellow">{indentStr}"{value}"</Text>;
    }
    
    if (Array.isArray(value)) {
      return (
        <Box flexDirection="column">
          <Text>{indentStr}[</Text>
          {value.map((item, index) => (
            <Box key={index}>
              <Text color="dim">{indentStr}  {index}: </Text>
              {renderValue(item, indent + 1)}
            </Box>
          ))}
          <Text>{indentStr}]</Text>
        </Box>
      );
    }
    
    if (typeof value === 'object') {
      return (
        <Box flexDirection="column">
          <Text>{indentStr}{'{'}</Text>
          {Object.entries(value).map(([key, val]) => (
            <Box key={key} flexDirection="column">
              <Box>
                <Text color="magenta">{indentStr}  {key}: </Text>
                {renderValue(val, indent + 1)}
              </Box>
            </Box>
          ))}
          <Text>{indentStr}{'}'}</Text>
        </Box>
      );
    }
    
    return <Text>{indentStr}{String(value)}</Text>;
  };

  const renderBreadcrumb = () => {
    return (
      <Box>
        <Text color="gray">Path: </Text>
        <Text color="cyan">root</Text>
        {currentPath.map((path, index) => (
          <Text key={index} color="cyan"> / {path}</Text>
        ))}
      </Box>
    );
  };

  const renderEditor = () => {
    const currentData = getCurrentData();
    
    if (editMode === 'edit') {
      return (
        <Box flexDirection="column">
          <Text color="yellow">Editing value:</Text>
          <TextInput
            value={editValue}
            onChange={setEditValue}
            placeholder="Enter new value..."
          />
          <Text color="dim">Press 's' to save, 'ESC' to cancel</Text>
        </Box>
      );
    }

    if (typeof currentData === 'object' && currentData !== null) {
      const items = Object.keys(currentData).map(key => ({
        label: `${key}: ${typeof currentData[key]}`,
        value: key
      }));

      return (
        <Box flexDirection="column">
          <SelectInput
            items={items}
            onSelect={(item) => {
              setCurrentPath([...currentPath, item.value]);
            }}
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
        </Box>
      );
    }

    return renderValue(currentData);
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">VF File Editor</Text>
        {readOnly && <Text color="red"> [READ ONLY]</Text>}
      </Box>

      <Box marginBottom={1}>
        <Text color="gray">Type: </Text>
        <Text color="green">{file.type}</Text>
        <Text color="gray"> | Version: </Text>
        <Text color="green">{file.format_version}</Text>
      </Box>

      {renderBreadcrumb()}

      <Box 
        flexDirection="column" 
        borderStyle="single" 
        borderColor={editMode === 'edit' ? 'yellow' : 'gray'} 
        padding={1}
        marginTop={1}
        minHeight={10}
      >
        {renderEditor()}
      </Box>

      {file.metadata && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="magenta">Metadata:</Text>
          {Object.entries(file.metadata).map(([key, value]) => (
            <Text key={key}>
              <Text color="cyan">{key}:</Text> {String(value)}
            </Text>
          ))}
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="dim">
          {!readOnly && '[e: Edit] [s: Save] '}
          [Enter: Navigate] [Backspace: Back] [q/ESC: Exit]
        </Text>
      </Box>
    </Box>
  );
};