# Ink Library: React for CLI/Terminal Interfaces

## Table of Contents
1. [Overview](#overview)
2. [Installation and Setup](#installation-and-setup)
3. [Core Concepts](#core-concepts)
4. [Key Components](#key-components)
5. [Essential Hooks](#essential-hooks)
6. [Text-Based UI Components](#text-based-ui-components)
7. [Integration with Web Applications](#integration-with-web-applications)
8. [Best Practices and Patterns](#best-practices-and-patterns)
9. [Advanced Examples](#advanced-examples)
10. [Testing](#testing)
11. [Resources and Community](#resources-and-community)

## Overview

### What is Ink?

Ink is a React renderer that enables developers to build interactive command-line interfaces using familiar React concepts. It brings the component-based architecture, hooks, and declarative programming model of React to terminal applications.

**Key Features:**
- **React Compatibility**: Full support for React features including hooks, context, and functional components
- **Flexbox Layout**: Uses Yoga layout engine to implement CSS-like flexbox positioning in the terminal
- **Component-Based**: Build reusable UI components for CLI applications
- **TypeScript Support**: Written in TypeScript with full type definitions
- **Developer Experience**: Supports React DevTools for debugging

### How Ink Works

Ink is built using the `react-reconciler` package, which allows it to render React components to the terminal instead of the DOM. It uses:

- **Yoga Layout Engine**: Implements CSS flexbox for terminal UI positioning
- **Node.js Streams**: Handles console input/output operations
- **React Reconciliation**: Manages UI updates and component lifecycle

### Notable Users

Major projects and companies using Ink include:
- **GitHub Copilot CLI**
- **Cloudflare Wrangler**
- **Prisma** (Database toolkit)
- **Blitz** (Full-stack React framework)
- **New York Times** (kyt toolkit)
- **Linear** (Project management)

## Installation and Setup

### Basic Installation

```bash
# Install Ink with React
npm install ink react

# For TypeScript projects
npm install -D @types/react
```

### Quick Start with create-ink-app

```bash
# Create a new Ink project
bunx create-ink-app my-cli-app
cd my-cli-app
npm start
```

### Manual Setup

For existing projects, create a basic entry point:

```javascript
#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import App from './App.js';

render(<App />);
```

### Configuration

#### Babel Configuration (babel.config.js)
```javascript
module.exports = {
  presets: [
    '@babel/preset-env',
    '@babel/preset-react'
  ]
};
```

#### TypeScript Configuration (tsconfig.json)
```json
{
  "compilerOptions": {
    "target": "es2018",
    "module": "commonjs",
    "lib": ["es2018"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

## Core Concepts

### React Paradigm in CLI

Ink applies React's declarative approach to terminal UIs:

```javascript
import React, {useState, useEffect} from 'react';
import {render, Text, Box} from 'ink';

const Counter = () => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCount(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  return (
    <Box flexDirection="column">
      <Text color="green">Counter: {count}</Text>
      <Text color="gray">Press Ctrl+C to exit</Text>
    </Box>
  );
};

render(<Counter />);
```

### Layout System

Ink uses Flexbox for layout, similar to CSS:

```javascript
<Box flexDirection="row" gap={2}>
  <Box width={20}>
    <Text>Left Column</Text>
  </Box>
  <Box flexGrow={1}>
    <Text>Right Column (flexible)</Text>
  </Box>
</Box>
```

## Key Components

### Text Component

The fundamental component for displaying text with styling:

```javascript
import {Text} from 'ink';

// Basic text
<Text>Hello World</Text>

// Styled text
<Text color="blue" backgroundColor="yellow" bold italic>
  Styled Text
</Text>

// Text wrapping
<Text wrap="wrap">
  This is a long line that will wrap automatically
</Text>

// Text truncation
<Text wrap="truncate">
  This text will be truncated with ellipsis...
</Text>
```

**Text Props:**
- `color`: Text color (string or hex)
- `backgroundColor`: Background color
- `bold`, `italic`, `underline`, `strikethrough`: Text styling
- `dimColor`: Dim text appearance
- `inverse`: Invert colors
- `wrap`: "wrap", "truncate", or "truncate-start"

### Box Component

Container component for layout and positioning:

```javascript
import {Box, Text} from 'ink';

<Box 
  width={50} 
  height={10} 
  borderStyle="round" 
  borderColor="blue"
  padding={1}
  margin={1}
  flexDirection="column"
  justifyContent="center"
  alignItems="center"
>
  <Text>Centered Content</Text>
</Box>
```

**Box Props:**
- **Dimensions**: `width`, `height`, `minWidth`, `minHeight`, `maxWidth`, `maxHeight`
- **Spacing**: `margin`, `marginX`, `marginY`, `padding`, `paddingX`, `paddingY`
- **Flexbox**: `flexDirection`, `justifyContent`, `alignItems`, `flexGrow`, `flexShrink`
- **Border**: `borderStyle`, `borderColor`, `borderTop`, `borderBottom`, `borderLeft`, `borderRight`
- **Display**: `display` ("flex" or "none")

### Newline Component

Creates line breaks in the output:

```javascript
import {Text, Newline} from 'ink';

<>
  <Text>First line</Text>
  <Newline />
  <Text>Second line</Text>
  <Newline count={2} />
  <Text>Third line with double spacing</Text>
</>
```

### Spacer Component

Flexible space component for layout:

```javascript
import {Box, Text, Spacer} from 'ink';

<Box>
  <Text>Left</Text>
  <Spacer />
  <Text>Right</Text>
</Box>
```

## Essential Hooks

### useInput Hook

Handle keyboard input with a callback function:

```javascript
import {useInput, Text} from 'ink';

const InputHandler = () => {
  const [message, setMessage] = useState('');
  
  useInput((input, key) => {
    if (input === 'q') {
      process.exit();
    }
    
    if (key.leftArrow) {
      setMessage('Left arrow pressed');
    }
    
    if (key.rightArrow) {
      setMessage('Right arrow pressed');
    }
    
    if (key.return) {
      setMessage('Enter pressed');
    }
    
    if (key.ctrl && input === 'c') {
      process.exit();
    }
  });
  
  return <Text>{message}</Text>;
};
```

**Key Object Properties:**
- `upArrow`, `downArrow`, `leftArrow`, `rightArrow`: Arrow keys
- `return`: Enter key
- `escape`: Escape key
- `ctrl`, `shift`, `meta`: Modifier keys
- `backspace`, `delete`: Deletion keys
- `tab`: Tab key

### useApp Hook

Access application control methods:

```javascript
import {useApp, useInput, Text} from 'ink';

const ExitableApp = () => {
  const {exit} = useApp();
  
  useInput((input) => {
    if (input === 'q') {
      exit();
    }
  });
  
  return <Text>Press 'q' to exit</Text>;
};
```

### useStdin Hook

Direct access to stdin stream:

```javascript
import {useStdin, useEffect} from 'ink';

const StdinExample = () => {
  const {stdin, isRawModeSupported, setRawMode} = useStdin();
  
  useEffect(() => {
    if (isRawModeSupported) {
      setRawMode(true);
      return () => setRawMode(false);
    }
  }, [isRawModeSupported, setRawMode]);
  
  return <Text>Raw mode: {isRawModeSupported ? 'enabled' : 'disabled'}</Text>;
};
```

### useStdout Hook

Write directly to stdout:

```javascript
import {useStdout, useEffect} from 'ink';

const StdoutExample = () => {
  const {write} = useStdout();
  
  useEffect(() => {
    write('Direct stdout message\n');
  }, [write]);
  
  return <Text>Check stdout for direct message</Text>;
};
```

### useFocus Hook

Manage component focus for keyboard navigation:

```javascript
import {useFocus, Text, Box} from 'ink';

const FocusableItem = ({label}) => {
  const {isFocused} = useFocus();
  
  return (
    <Text color={isFocused ? 'blue' : 'white'} inverse={isFocused}>
      {isFocused ? '> ' : '  '}{label}
    </Text>
  );
};

const FocusExample = () => (
  <Box flexDirection="column">
    <FocusableItem label="Item 1" />
    <FocusableItem label="Item 2" />
    <FocusableItem label="Item 3" />
  </Box>
);
```

### useFocusManager Hook

Control focus programmatically:

```javascript
import {useFocusManager, useInput} from 'ink';

const NavigationExample = () => {
  const {focusNext, focusPrevious} = useFocusManager();
  
  useInput((input, key) => {
    if (key.upArrow) {
      focusPrevious();
    }
    
    if (key.downArrow) {
      focusNext();
    }
  });
  
  return (
    <Box flexDirection="column">
      {/* Focusable items */}
    </Box>
  );
};
```

## Text-Based UI Components

### Loading Spinner

```javascript
import React, {useState, useEffect} from 'react';
import {Text} from 'ink';

const Spinner = ({text = 'Loading...'}) => {
  const [frame, setFrame] = useState(0);
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  
  useEffect(() => {
    const timer = setInterval(() => {
      setFrame(prev => (prev + 1) % frames.length);
    }, 80);
    
    return () => clearInterval(timer);
  }, []);
  
  return (
    <Text color="cyan">
      {frames[frame]} {text}
    </Text>
  );
};
```

### Progress Bar

```javascript
import React from 'react';
import {Text, Box} from 'ink';

const ProgressBar = ({progress, width = 40}) => {
  const filled = Math.round((progress / 100) * width);
  const empty = width - filled;
  
  return (
    <Box>
      <Text color="green">{'█'.repeat(filled)}</Text>
      <Text color="gray">{'░'.repeat(empty)}</Text>
      <Text> {progress}%</Text>
    </Box>
  );
};
```

### Menu Component

```javascript
import React, {useState} from 'react';
import {Text, Box, useInput} from 'ink';

const Menu = ({items, onSelect}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    }
    
    if (key.downArrow) {
      setSelectedIndex(prev => Math.min(items.length - 1, prev + 1));
    }
    
    if (key.return) {
      onSelect(items[selectedIndex]);
    }
  });
  
  return (
    <Box flexDirection="column">
      {items.map((item, index) => (
        <Text 
          key={index}
          color={index === selectedIndex ? 'blue' : 'white'}
          inverse={index === selectedIndex}
        >
          {index === selectedIndex ? '❯ ' : '  '}{item}
        </Text>
      ))}
    </Box>
  );
};
```

### Table Component

```javascript
import React from 'react';
import {Text, Box} from 'ink';

const Table = ({headers, rows}) => {
  const columnWidths = headers.map((header, colIndex) => {
    const headerWidth = header.length;
    const maxDataWidth = Math.max(
      ...rows.map(row => (row[colIndex] || '').toString().length)
    );
    return Math.max(headerWidth, maxDataWidth) + 2;
  });
  
  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box>
        {headers.map((header, index) => (
          <Text 
            key={index} 
            bold 
            color="blue"
            width={columnWidths[index]}
          >
            {header.padEnd(columnWidths[index])}
          </Text>
        ))}
      </Box>
      
      {/* Separator */}
      <Text color="gray">
        {columnWidths.map(width => '─'.repeat(width)).join('')}
      </Text>
      
      {/* Rows */}
      {rows.map((row, rowIndex) => (
        <Box key={rowIndex}>
          {row.map((cell, cellIndex) => (
            <Text 
              key={cellIndex}
              width={columnWidths[cellIndex]}
            >
              {cell.toString().padEnd(columnWidths[cellIndex])}
            </Text>
          ))}
        </Box>
      ))}
    </Box>
  );
};
```

### Form Input Component

```javascript
import React, {useState} from 'react';
import {Text, Box, useInput} from 'ink';

const TextInput = ({placeholder, onSubmit, mask}) => {
  const [value, setValue] = useState('');
  
  useInput((input, key) => {
    if (key.return) {
      onSubmit(value);
    } else if (key.backspace) {
      setValue(prev => prev.slice(0, -1));
    } else if (!key.ctrl && !key.meta && input) {
      setValue(prev => prev + input);
    }
  });
  
  const displayValue = mask ? mask.repeat(value.length) : value;
  
  return (
    <Box>
      <Text color="cyan">
        {displayValue}
        <Text color="gray">{placeholder && !value ? placeholder : ''}</Text>
        <Text backgroundColor="white"> </Text>
      </Text>
    </Box>
  );
};
```

## Integration with Web Applications

### Shared Component Architecture

Create components that work in both web and CLI environments:

```javascript
// shared/components/LoadingSpinner.js
import React from 'react';

const LoadingSpinner = ({text = 'Loading...', web = false}) => {
  if (web) {
    // Web implementation
    return (
      <div className="spinner">
        <div className="spinner-icon"></div>
        <span>{text}</span>
      </div>
    );
  }
  
  // CLI implementation
  const {Text} = require('ink');
  const [frame, setFrame] = useState(0);
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  
  useEffect(() => {
    const timer = setInterval(() => {
      setFrame(prev => (prev + 1) % frames.length);
    }, 80);
    return () => clearInterval(timer);
  }, []);
  
  return React.createElement(Text, {color: 'cyan'}, `${frames[frame]} ${text}`);
};
```

### API Client Sharing

Share API logic between web and CLI:

```javascript
// shared/api/client.js
export class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }
  
  async fetchData(endpoint) {
    const response = await fetch(`${this.baseUrl}/${endpoint}`);
    return response.json();
  }
}

// cli/app.js
import {ApiClient} from '../shared/api/client.js';
import {render, Text, Box} from 'ink';

const CLI = () => {
  const [data, setData] = useState(null);
  const client = new ApiClient('https://api.example.com');
  
  useEffect(() => {
    client.fetchData('users').then(setData);
  }, []);
  
  return (
    <Box flexDirection="column">
      {data ? (
        data.map(user => <Text key={user.id}>{user.name}</Text>)
      ) : (
        <Text>Loading...</Text>
      )}
    </Box>
  );
};
```

### Configuration Sharing

Share configuration between environments:

```javascript
// shared/config.js
export const config = {
  api: {
    baseUrl: process.env.API_BASE_URL || 'https://api.example.com',
    timeout: 5000
  },
  features: {
    enableLogging: true,
    enableAnalytics: !process.env.CLI_MODE
  }
};

// cli/main.js
import {config} from '../shared/config.js';
process.env.CLI_MODE = 'true';
```

### State Management Integration

Use Redux or similar state management:

```javascript
// shared/store/store.js
import {createStore} from 'redux';
import reducer from './reducer.js';

export const store = createStore(reducer);

// cli/app.js
import {Provider} from 'react-redux';
import {store} from '../shared/store/store.js';

const App = () => (
  <Provider store={store}>
    <CLIInterface />
  </Provider>
);
```

## Best Practices and Patterns

### Component Organization

Structure your CLI application with reusable components:

```
src/
├── components/
│   ├── ui/
│   │   ├── Spinner.js
│   │   ├── ProgressBar.js
│   │   ├── Menu.js
│   │   └── Table.js
│   ├── forms/
│   │   ├── TextInput.js
│   │   └── SelectInput.js
│   └── layout/
│       ├── Header.js
│       ├── Footer.js
│       └── Sidebar.js
├── hooks/
│   ├── useApi.js
│   ├── useLocalStorage.js
│   └── useKeyboard.js
├── utils/
│   ├── formatting.js
│   └── validation.js
└── App.js
```

### State Management Patterns

#### Local State for Simple UIs

```javascript
const SimpleApp = () => {
  const [currentView, setCurrentView] = useState('menu');
  const [data, setData] = useState([]);
  
  return (
    <Box flexDirection="column">
      {currentView === 'menu' && (
        <MainMenu onNavigate={setCurrentView} />
      )}
      {currentView === 'list' && (
        <DataList data={data} onBack={() => setCurrentView('menu')} />
      )}
    </Box>
  );
};
```

#### Context for Global State

```javascript
const AppContext = createContext();

const AppProvider = ({children}) => {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState({});
  
  return (
    <AppContext.Provider value={{user, setUser, settings, setSettings}}>
      {children}
    </AppContext.Provider>
  );
};

const useAppContext = () => useContext(AppContext);
```

### Error Handling

Implement robust error handling:

```javascript
const ErrorBoundary = ({children}) => {
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const handleError = (error) => {
      setError(error);
    };
    
    process.on('uncaughtException', handleError);
    process.on('unhandledRejection', handleError);
    
    return () => {
      process.off('uncaughtException', handleError);
      process.off('unhandledRejection', handleError);
    };
  }, []);
  
  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red" bold>Error:</Text>
        <Text color="red">{error.message}</Text>
        <Text color="gray">Press Ctrl+C to exit</Text>
      </Box>
    );
  }
  
  return children;
};
```

### Performance Optimization

#### Memoization for Expensive Operations

```javascript
const ExpensiveList = ({items}) => {
  const processedItems = useMemo(() => {
    return items.map(item => ({
      ...item,
      processed: expensiveOperation(item)
    }));
  }, [items]);
  
  return (
    <Box flexDirection="column">
      {processedItems.map(item => (
        <Text key={item.id}>{item.processed}</Text>
      ))}
    </Box>
  );
};
```

#### Virtualization for Large Lists

```javascript
const VirtualizedList = ({items, height = 10}) => {
  const [scrollTop, setScrollTop] = useState(0);
  
  useInput((input, key) => {
    if (key.upArrow) {
      setScrollTop(prev => Math.max(0, prev - 1));
    }
    if (key.downArrow) {
      setScrollTop(prev => Math.min(items.length - height, prev + 1));
    }
  });
  
  const visibleItems = items.slice(scrollTop, scrollTop + height);
  
  return (
    <Box flexDirection="column">
      {visibleItems.map((item, index) => (
        <Text key={scrollTop + index}>{item}</Text>
      ))}
    </Box>
  );
};
```

### Accessibility Considerations

#### Keyboard Navigation

```javascript
const AccessibleMenu = ({items}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  useInput((input, key) => {
    if (key.upArrow || (key.shift && key.tab)) {
      setSelectedIndex(prev => (prev - 1 + items.length) % items.length);
    }
    
    if (key.downArrow || key.tab) {
      setSelectedIndex(prev => (prev + 1) % items.length);
    }
    
    if (key.return || input === ' ') {
      items[selectedIndex].action();
    }
  });
  
  return (
    <Box flexDirection="column">
      {items.map((item, index) => (
        <Text 
          key={index}
          color={index === selectedIndex ? 'blue' : 'white'}
          bold={index === selectedIndex}
        >
          {index === selectedIndex ? '▶ ' : '  '}{item.label}
        </Text>
      ))}
    </Box>
  );
};
```

#### Screen Reader Support

```javascript
const AccessibleText = ({children, role, label}) => {
  useEffect(() => {
    if (role && label) {
      // Announce to screen reader
      process.stdout.write(`\x1b]0;${label}\x07`);
    }
  }, [role, label]);
  
  return <Text>{children}</Text>;
};
```

## Advanced Examples

### File Browser CLI

```javascript
import React, {useState, useEffect} from 'react';
import {render, Text, Box, useInput} from 'ink';
import fs from 'fs/promises';
import path from 'path';

const FileBrowser = () => {
  const [currentPath, setCurrentPath] = useState(process.cwd());
  const [files, setFiles] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const loadDirectory = async (dirPath) => {
    setLoading(true);
    try {
      const entries = await fs.readdir(dirPath);
      const fileInfo = await Promise.all(
        entries.map(async (entry) => {
          const fullPath = path.join(dirPath, entry);
          const stats = await fs.stat(fullPath);
          return {
            name: entry,
            path: fullPath,
            isDirectory: stats.isDirectory(),
            size: stats.size,
            modified: stats.mtime
          };
        })
      );
      
      setFiles([
        {name: '..', path: path.dirname(dirPath), isDirectory: true},
        ...fileInfo.sort((a, b) => {
          if (a.isDirectory !== b.isDirectory) {
            return a.isDirectory ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        })
      ]);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Error loading directory:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadDirectory(currentPath);
  }, [currentPath]);
  
  useInput((input, key) => {
    if (loading) return;
    
    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedIndex(prev => Math.min(files.length - 1, prev + 1));
    } else if (key.return) {
      const selectedFile = files[selectedIndex];
      if (selectedFile.isDirectory) {
        setCurrentPath(selectedFile.path);
      }
    } else if (input === 'q') {
      process.exit(0);
    }
  });
  
  if (loading) {
    return <Text color="cyan">Loading...</Text>;
  }
  
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="blue">
        Current Directory: {currentPath}
      </Text>
      <Text color="gray">
        Use ↑↓ to navigate, Enter to open, 'q' to quit
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {files.map((file, index) => (
          <Box key={file.path}>
            <Text 
              color={index === selectedIndex ? 'blue' : 'white'}
              backgroundColor={index === selectedIndex ? 'blue' : undefined}
              inverse={index === selectedIndex}
            >
              {index === selectedIndex ? '▶ ' : '  '}
              {file.isDirectory ? '📁 ' : '📄 '}
              {file.name}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

render(<FileBrowser />);
```

### API Dashboard

```javascript
import React, {useState, useEffect} from 'react';
import {render, Text, Box} from 'ink';

const APIMonitor = () => {
  const [services, setServices] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  const checkService = async (service) => {
    try {
      const start = Date.now();
      const response = await fetch(service.url, {
        timeout: 5000
      });
      const responseTime = Date.now() - start;
      
      return {
        ...service,
        status: response.ok ? 'online' : 'error',
        responseTime,
        lastChecked: new Date()
      };
    } catch (error) {
      return {
        ...service,
        status: 'offline',
        error: error.message,
        lastChecked: new Date()
      };
    }
  };
  
  const checkAllServices = async () => {
    const servicesToCheck = [
      {name: 'API Gateway', url: 'https://api.example.com/health'},
      {name: 'Database', url: 'https://db.example.com/ping'},
      {name: 'Cache', url: 'https://cache.example.com/status'}
    ];
    
    const results = await Promise.all(
      servicesToCheck.map(checkService)
    );
    
    setServices(results);
    setLastUpdate(new Date());
  };
  
  useEffect(() => {
    checkAllServices();
    const interval = setInterval(checkAllServices, 10000);
    return () => clearInterval(interval);
  }, []);
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'green';
      case 'offline': return 'red';
      case 'error': return 'yellow';
      default: return 'gray';
    }
  };
  
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="blue">Service Monitor Dashboard</Text>
      <Text color="gray">
        Last Update: {lastUpdate?.toLocaleTimeString() || 'Never'}
      </Text>
      
      <Box flexDirection="column" marginTop={1}>
        {services.map((service, index) => (
          <Box key={service.name} marginBottom={1}>
            <Box width={20}>
              <Text>{service.name}</Text>
            </Box>
            <Box width={15}>
              <Text color={getStatusColor(service.status)} bold>
                {service.status.toUpperCase()}
              </Text>
            </Box>
            {service.responseTime && (
              <Box width={15}>
                <Text color="cyan">{service.responseTime}ms</Text>
              </Box>
            )}
            {service.error && (
              <Box>
                <Text color="red">{service.error}</Text>
              </Box>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

render(<APIMonitor />);
```

### Interactive Form Builder

```javascript
import React, {useState} from 'react';
import {render, Text, Box, useInput} from 'ink';

const FormBuilder = () => {
  const [fields, setFields] = useState([]);
  const [currentField, setCurrentField] = useState('');
  const [mode, setMode] = useState('input'); // 'input' or 'review'
  const [inputValue, setInputValue] = useState('');
  
  useInput((input, key) => {
    if (mode === 'input') {
      if (key.return) {
        if (inputValue.trim()) {
          setFields(prev => [...prev, {
            name: inputValue.trim(),
            type: 'text',
            required: false
          }]);
          setInputValue('');
        }
      } else if (key.backspace) {
        setInputValue(prev => prev.slice(0, -1));
      } else if (key.ctrl && input === 'r') {
        setMode('review');
      } else if (input && !key.ctrl && !key.meta) {
        setInputValue(prev => prev + input);
      }
    } else if (mode === 'review') {
      if (key.escape || input === 'q') {
        setMode('input');
      }
    }
  });
  
  const generateCode = () => {
    const code = `
const form = {
  fields: [
${fields.map(field => `    { name: "${field.name}", type: "${field.type}", required: ${field.required} }`).join(',\n')}
  ]
};
    `.trim();
    return code;
  };
  
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="blue">Interactive Form Builder</Text>
      
      {mode === 'input' ? (
        <Box flexDirection="column" marginTop={1}>
          <Text color="green">Enter field names (Enter to add, Ctrl+R to review):</Text>
          <Box>
            <Text color="cyan">Field name: </Text>
            <Text backgroundColor="white" color="black">
              {inputValue}
              <Text backgroundColor="gray"> </Text>
            </Text>
          </Box>
          
          {fields.length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              <Text bold>Added Fields:</Text>
              {fields.map((field, index) => (
                <Text key={index} color="gray">
                  • {field.name} ({field.type})
                </Text>
              ))}
            </Box>
          )}
        </Box>
      ) : (
        <Box flexDirection="column" marginTop={1}>
          <Text color="yellow">Form Preview (ESC to continue editing):</Text>
          <Box 
            flexDirection="column" 
            borderStyle="round" 
            borderColor="blue"
            padding={1}
            marginTop={1}
          >
            <Text bold>Generated Form Code:</Text>
            <Text color="gray">{generateCode()}</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};

render(<FormBuilder />);
```

## Testing

### Testing with ink-testing-library

Install the testing library:

```bash
npm install -D ink-testing-library
```

Basic test example:

```javascript
import React from 'react';
import {render} from 'ink-testing-library';
import {Text} from 'ink';

const Hello = ({name}) => <Text>Hello, {name}!</Text>;

test('should render greeting', () => {
  const {lastFrame} = render(<Hello name="World" />);
  expect(lastFrame()).toBe('Hello, World!');
});
```

Testing user input:

```javascript
import {render} from 'ink-testing-library';
import {useInput, Text} from 'ink';

const InputTest = () => {
  const [pressed, setPressed] = useState('');
  
  useInput((input) => {
    setPressed(input);
  });
  
  return <Text>Pressed: {pressed}</Text>;
};

test('should handle input', () => {
  const {lastFrame, stdin} = render(<InputTest />);
  
  stdin.write('a');
  expect(lastFrame()).toBe('Pressed: a');
  
  stdin.write('b');
  expect(lastFrame()).toBe('Pressed: b');
});
```

Testing hooks:

```javascript
import {renderHook} from 'ink-testing-library';
import {useStdin} from 'ink';

test('should provide stdin access', () => {
  const {result} = renderHook(() => useStdin());
  
  expect(result.current.stdin).toBeDefined();
  expect(typeof result.current.setRawMode).toBe('function');
});
```

### Debug Mode

Enable React DevTools support:

```bash
# Install DevTools
npm install -D react-devtools-core

# Run with DevTools
DEV=true node my-cli-app.js
```

Add DevTools connection code:

```javascript
import {render} from 'ink';
import App from './App.js';

if (process.env.DEV) {
  const {connectToDevTools} = require('react-devtools-core');
  connectToDevTools({
    host: 'localhost',
    port: 8097
  });
}

render(<App />);
```

## Resources and Community

### Official Resources

- **GitHub Repository**: [vadimdemedes/ink](https://github.com/vadimdemedes/ink)
- **npm Package**: [ink](https://www.npmjs.com/package/ink)
- **Testing Library**: [ink-testing-library](https://www.npmjs.com/package/ink-testing-library)

### Related Tools and Libraries

#### UI Components
- **ink-spinner**: Enhanced spinner components
- **ink-select-input**: Dropdown selection components  
- **ink-text-input**: Advanced text input components
- **ink-big-text**: Large ASCII text rendering
- **ink-gradient**: Gradient text effects
- **ink-link**: Clickable terminal links

#### Frameworks
- **Pastel**: Framework for building CLIs with Ink
- **create-ink-app**: Project scaffolding tool

#### Utilities
- **ink-box**: Box drawing and borders
- **ink-table**: Advanced table components
- **ink-progress-bar**: Progress indicators
- **ink-divider**: Section dividers

### Community Examples

Popular open-source projects using Ink:

1. **GitHub CLI (gh)**: Command-line interface for GitHub
2. **Prisma CLI**: Database toolkit CLI
3. **Cloudflare Wrangler**: Edge computing platform CLI
4. **Linear CLI**: Project management CLI
5. **Gatsby CLI**: Static site generator CLI

### Learning Resources

#### Tutorials and Guides
- [Official Ink Examples](https://github.com/vadimdemedes/ink/tree/master/examples)
- [React Documentation](https://reactjs.org/docs) (applies to Ink)
- [Flexbox Guide](https://css-tricks.com/snippets/css/a-guide-to-flexbox/) (for layout understanding)

#### Video Tutorials
- Search for "Ink React CLI" on YouTube for community tutorials
- Conference talks about terminal UI development

#### Articles and Blog Posts
- "Building CLI tools with React using Ink and Pastel"
- "Creating CLIs with Ink, React and a bit of magic"
- "Building Reactive CLIs with Ink"

### Contributing

Ink is open source and welcomes contributions:

1. **Bug Reports**: Submit issues on GitHub
2. **Feature Requests**: Propose new features via GitHub issues
3. **Pull Requests**: Contribute code improvements
4. **Documentation**: Help improve documentation and examples

### Version Compatibility

- **Ink 4.x**: Latest stable version with full React 18 support
- **Ink 3.x**: Previous stable version with React 16/17 support
- **React**: Compatible with React 16.8+ (hooks support required)
- **Node.js**: Requires Node.js 14+ for latest versions

This comprehensive guide covers the essential aspects of the Ink library for building CLI applications with React. The library provides a powerful way to create interactive terminal interfaces using familiar React patterns and components.