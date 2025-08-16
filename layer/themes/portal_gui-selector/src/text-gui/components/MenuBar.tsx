/**
 * Menu Bar Component
 * Top menu navigation bar
 */

import React from 'react';
import { Box, Text } from 'ink';

interface MenuItem {
  key: string;
  label: string;
  shortcut: string;
}

interface Props {
  items?: MenuItem[];
  activeItem?: string;
}

export const MenuBar: React.FC<Props> = ({ 
  items = [
    { key: 'file', label: 'File', shortcut: 'F' },
    { key: 'edit', label: 'Edit', shortcut: 'E' },
    { key: 'view', label: 'View', shortcut: 'V' },
    { key: 'tools', label: 'Tools', shortcut: 'T' },
    { key: 'help', label: 'Help', shortcut: 'H' }
  ],
  activeItem
}) => {
  return (
    <Box>
      {items.map((item, index) => (
        <Box key={item.key} marginRight={2}>
          <Text
            color={activeItem === item.key ? 'yellow' : 'gray'}
            bold={activeItem === item.key}
            underline={activeItem === item.key}
          >
            {item.label}
          </Text>
          <Text color="gray"> (Alt+{item.shortcut})</Text>
        </Box>
      ))}
    </Box>
  );
};