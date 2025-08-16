/**
 * GUI Template Selector Component
 * Interactive template browser with preview
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import figures from 'figures';

interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  preview: string[];
  tags: string[];
}

interface Props {
  onSelect: (templateId: string) => void;
  onBack: () => void;
}

export const GuiTemplateSelector: React.FC<Props> = ({ onSelect, onBack }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showPreview, setShowPreview] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null);

  useInput((input, key) => {
    if (input === 'b' || key.backspace) {
      onBack();
    }
    if (input === 'p' && currentTemplate) {
      setShowPreview(!showPreview);
    }
  });

  const templates: Template[] = [
    {
      id: 'modern-dashboard',
      name: 'Modern Dashboard',
      category: 'dashboard',
      description: 'Clean, modern dashboard with charts and metrics',
      preview: [
        '┌─────────────────────────────┐',
        '│  📊 Dashboard    [User]  ⚙️  │',
        '├─────────────────────────────┤',
        '│ ┌─────┐ ┌─────┐ ┌─────┐   │',
        '│ │ 124 │ │ 89% │ │ ▲12 │   │',
        '│ └─────┘ └─────┘ └─────┘   │',
        '│                             │',
        '│ ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁           │',
        '└─────────────────────────────┘'
      ],
      tags: ['modern', 'dashboard', 'analytics']
    },
    {
      id: 'admin-panel',
      name: 'Admin Panel',
      category: 'admin',
      description: 'Comprehensive admin interface with sidebar navigation',
      preview: [
        '┌───────┬─────────────────────┐',
        '│ Menu  │  Admin Panel        │',
        '├───────┼─────────────────────┤',
        '│ • Home│  Content Area       │',
        '│ • User│                     │',
        '│ • Data│  [Table View]       │',
        '│ • Logs│                     │',
        '└───────┴─────────────────────┘'
      ],
      tags: ['admin', 'navigation', 'crud']
    },
    {
      id: 'form-wizard',
      name: 'Form Wizard',
      category: 'forms',
      description: 'Multi-step form with validation',
      preview: [
        '┌─────────────────────────────┐',
        '│  Step 1 > 2 > 3 > 4        │',
        '├─────────────────────────────┤',
        '│  Name: [__________]         │',
        '│  Email: [__________]        │',
        '│                             │',
        '│  [Back]  [Next]  [Cancel]   │',
        '└─────────────────────────────┘'
      ],
      tags: ['forms', 'wizard', 'validation']
    },
    {
      id: 'data-table',
      name: 'Data Table',
      category: 'tables',
      description: 'Sortable, filterable data table with pagination',
      preview: [
        '┌─────────────────────────────┐',
        '│ Search: [____]    ⟲ Export  │',
        '├────┬──────┬──────┬─────────┤',
        '│ ID │ Name │ Date │ Status  │',
        '├────┼──────┼──────┼─────────┤',
        '│ 01 │ John │ 2024 │ Active  │',
        '│ 02 │ Jane │ 2024 │ Pending │',
        '└────┴──────┴──────┴─────────┘'
      ],
      tags: ['table', 'data', 'grid']
    }
  ];

  const categories = [
    { label: 'All Templates', value: 'all' },
    { label: 'Dashboards', value: 'dashboard' },
    { label: 'Admin Panels', value: 'admin' },
    { label: 'Forms', value: 'forms' },
    { label: 'Tables', value: 'tables' }
  ];

  const filteredTemplates = templates
    .filter(t => selectedCategory === 'all' || t.category === selectedCategory)
    .map(t => ({
      label: `${figures.pointer} ${t.name}`,
      value: t.id,
      template: t
    }));

  const handleTemplateSelect = (item: any) => {
    setCurrentTemplate(item.template);
    onSelect(item.value);
  };

  const renderPreview = () => {
    if (!currentTemplate || !showPreview) return null;

    return (
      <Box flexDirection="column" marginTop={1} borderStyle="single" padding={1}>
        <Text bold color="cyan">Preview: {currentTemplate.name}</Text>
        <Box flexDirection="column" marginTop={1}>
          {currentTemplate.preview.map((line, i) => (
            <Text key={i} color="green">{line}</Text>
          ))}
        </Box>
        <Box marginTop={1}>
          <Text color="gray">Tags: {currentTemplate.tags.join(', ')}</Text>
        </Box>
      </Box>
    );
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="yellow">GUI Template Selector</Text>
      </Box>

      <Box marginBottom={1}>
        <Text>Category: </Text>
        <SelectInput
          items={categories}
          onSelect={(item) => setSelectedCategory(item.value)}
        />
      </Box>

      <Box flexDirection="column">
        <Text color="cyan">Available Templates:</Text>
        <SelectInput
          items={filteredTemplates}
          onSelect={handleTemplateSelect}
        />
      </Box>

      {renderPreview()}

      <Box marginTop={2} flexDirection="column">
        <Text color="gray">Commands:</Text>
        <Text color="gray">  'p' - Toggle preview</Text>
        <Text color="gray">  'b' - Back to main menu</Text>
        <Text color="gray">  'Enter' - Select template</Text>
      </Box>
    </Box>
  );
};