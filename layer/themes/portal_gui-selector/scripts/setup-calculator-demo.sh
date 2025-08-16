#!/bin/bash
# GUI Calculator Demo Setup Script
# This script sets up a GUI calculator demo with AI Dev Portal theme integration

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEMO_NAME="gui-calculator"
DEMO_DIR="$PROJECT_ROOT/demo/$DEMO_NAME"

echo "=== GUI Calculator Demo Setup ==="
echo "Setting up GUI calculator demo with AI Dev Portal integration..."

# Step 1: Create demo using the existing demo.py script
echo "Step 1: Creating demo project structure..."
cd "$SCRIPT_DIR/setup"
python3 demo.py "$DEMO_NAME" --language typescript

# Step 2: Navigate to demo directory
cd "$DEMO_DIR"

# Step 3: Update package.json with GUI dependencies
echo "Step 3: Adding GUI dependencies..."
npm install --save react react-dom @types/react @types/react-dom
npm install --save-dev webpack webpack-cli webpack-dev-server html-webpack-plugin css-loader style-loader ts-loader

# Step 4: Create webpack configuration
echo "Step 4: Creating webpack configuration..."
cat > webpack.config.js << 'EOF'
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  entry: './src/client/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist/public'),
    filename: 'bundle.js',
    publicPath: '/'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/client/index.html',
      title: 'GUI Calculator - AI Dev Portal'
    })
  ],
  devServer: {
    port: 3310,
    hot: true,
    historyApiFallback: true,
    proxy: {
      '/api': 'http://localhost:3311'
    }
  }
};
EOF

# Step 5: Create client directory structure
echo "Step 5: Creating client application..."
mkdir -p src/client/components src/client/styles

# Step 6: Create main React component
cat > src/client/components/Calculator.tsx << 'EOF'
import React, { useState } from 'react';
import '../styles/calculator.css';

export const Calculator: React.FC = () => {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);

  const inputNumber = (num: string) => {
    if (waitingForNewValue) {
      setDisplay(num);
      setWaitingForNewValue(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
    }
  };

  const inputOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);

      setDisplay(String(newValue));
      setPreviousValue(newValue);
    }

    setWaitingForNewValue(true);
    setOperation(nextOperation);
  };

  const calculate = (firstValue: number, secondValue: number, operation: string) => {
    switch (operation) {
      case '+': return firstValue + secondValue;
      case '-': return firstValue - secondValue;
      case '*': return firstValue * secondValue;
      case '/': return firstValue / secondValue;
      case '=': return secondValue;
      default: return secondValue;
    }
  };

  const performCalculation = () => {
    const inputValue = parseFloat(display);

    if (previousValue !== null && operation) {
      const newValue = calculate(previousValue, inputValue, operation);
      setDisplay(String(newValue));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForNewValue(true);
    }
  };

  const clear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForNewValue(false);
  };

  const buttons = [
    ['C', '+/-', '%', '÷'],
    ['7', '8', '9', '×'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['0', '.', '=']
  ];

  const handleButtonClick = (btn: string) => {
    if (btn === 'C') {
      clear();
    } else if (btn === '=') {
      performCalculation();
    } else if (['+', '-', '×', '÷'].includes(btn)) {
      const op = btn === '×' ? '*' : btn === '÷' ? '/' : btn;
      inputOperation(op);
    } else if (btn === '.') {
      if (!display.includes('.')) {
        setDisplay(display + '.');
      }
    } else if (btn === '+/-') {
      setDisplay(String(parseFloat(display) * -1));
    } else if (btn === '%') {
      setDisplay(String(parseFloat(display) / 100));
    } else {
      inputNumber(btn);
    }
  };

  return (
    <div className="calculator">
      <div className="display">{display}</div>
      <div className="buttons">
        {buttons.map((row, i) => (
          <div key={i} className="button-row">
            {row.map((btn) => (
              <button
                key={btn}
                className={`button ${btn === '0' ? 'button-wide' : ''} ${
                  ['+', '-', '×', '÷', '='].includes(btn) ? 'button-operator' : ''
                }`}
                onClick={() => handleButtonClick(btn)}
              >
                {btn}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
EOF

# Step 7: Create App component
cat > src/client/App.tsx << 'EOF'
import React from 'react';
import { Calculator } from './components/Calculator';
import './styles/aidev-theme.css';
import './styles/app.css';

export const App: React.FC = () => {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>GUI Calculator</h1>
        <p className="subtitle">AI Dev Portal Demo</p>
      </header>
      <main className="app-main">
        <Calculator />
      </main>
      <footer className="app-footer">
        <p>Built with AI Dev Portal Theme</p>
      </footer>
    </div>
  );
};
EOF

# Step 8: Create entry point
cat > src/client/index.tsx << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
EOF

# Step 9: Create HTML template
cat > src/client/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GUI Calculator - AI Dev Portal</title>
</head>
<body>
    <div id="root"></div>
</body>
</html>
EOF

# Step 10: Create AI Dev Portal theme CSS
cat > src/client/styles/aidev-theme.css << 'EOF'
:root {
    --primary-color: #2563eb;
    --primary-hover: #1d4ed8;
    --secondary-color: #10b981;
    --accent-color: #8b5cf6;
    --background-color: #f9fafb;
    --surface-color: #ffffff;
    --text-primary: #111827;
    --text-secondary: #6b7280;
    --border-color: #e5e7eb;
    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    --radius-sm: 0.375rem;
    --radius-md: 0.5rem;
    --radius-lg: 0.75rem;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background-color: var(--background-color);
    color: var(--text-primary);
    line-height: 1.6;
}
EOF

# Step 11: Create app styles
cat > src/client/styles/app.css << 'EOF'
.app-container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.app-header {
    width: 100%;
    background-color: var(--surface-color);
    border-bottom: 1px solid var(--border-color);
    padding: 2rem;
    text-align: center;
    box-shadow: var(--shadow-sm);
}

.app-header h1 {
    color: var(--primary-color);
    margin-bottom: 0.5rem;
}

.subtitle {
    color: var(--text-secondary);
    font-size: 0.875rem;
}

.app-main {
    flex: 1;
    padding: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
}

.app-footer {
    width: 100%;
    padding: 1rem;
    text-align: center;
    color: var(--text-secondary);
    font-size: 0.875rem;
    border-top: 1px solid var(--border-color);
}
EOF

# Step 12: Create calculator styles
cat > src/client/styles/calculator.css << 'EOF'
.calculator {
    background-color: var(--surface-color);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    padding: 1.5rem;
    max-width: 320px;
}

.display {
    background-color: var(--background-color);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 1rem;
    text-align: right;
    font-size: 2rem;
    font-weight: 500;
    margin-bottom: 1rem;
    min-height: 60px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    overflow: hidden;
}

.buttons {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.button-row {
    display: flex;
    gap: 0.5rem;
}

.button {
    flex: 1;
    padding: 1.25rem;
    font-size: 1.25rem;
    font-weight: 500;
    border: none;
    border-radius: var(--radius-md);
    background-color: var(--background-color);
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s;
}

.button:hover {
    background-color: var(--border-color);
}

.button:active {
    transform: scale(0.95);
}

.button-wide {
    flex: 2.13;
}

.button-operator {
    background-color: var(--primary-color);
    color: white;
}

.button-operator:hover {
    background-color: var(--primary-hover);
}
EOF

# Step 13: Update tsconfig for JSX
echo "Step 13: Updating TypeScript configuration..."
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020", "DOM"],
    "jsx": "react",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

# Step 14: Update package.json scripts
echo "Step 14: Updating package.json scripts..."
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.scripts = {
  ...pkg.scripts,
  'dev': 'webpack serve --mode development',
  'build': 'webpack --mode production',
  'start': 'npm run build && node dist/server.js',
  'test': 'jest'
};
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
"

# Step 15: Create a simple backend server
echo "Step 15: Creating backend server..."
cat > src/server.ts << 'EOF'
import express from 'express';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3311;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint for calculator history (optional)
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', service: 'gui-calculator' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`GUI Calculator server running on port ${PORT}`);
});
EOF

# Step 16: Install dependencies
echo "Step 16: Installing all dependencies..."
npm install

# Step 17: Create README
echo "Step 17: Creating README..."
cat > README.md << 'EOF'
# GUI Calculator Demo

A modern calculator application built with React and TypeScript, featuring the AI Dev Portal theme.

## Features

- Modern, responsive UI with AI Dev Portal theme
- Basic arithmetic operations (+, -, ×, ÷)
- Clear function
- Decimal point support
- Percentage calculation
- Sign toggle (+/-)

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Ports

- Development: http://localhost:3310 (webpack-dev-server)
- Production: http://localhost:3311 (Express server)

## Integration with AI Dev Portal

This calculator demo uses the AI Dev Portal theme and can be integrated with:
- GUI Selector Server (port 3402)
- Story Reporter (port 3401)
- AI Dev Portal main app (port 3456)

## Testing

```bash
npm test
```
EOF

echo "=== Setup Complete ==="
echo ""
echo "GUI Calculator demo has been created at: $DEMO_DIR"
echo ""
echo "To start the development server:"
echo "  cd $DEMO_DIR"
echo "  npm run dev"
echo ""
echo "The calculator will be available at:"
echo "  - Development: http://localhost:3310"
echo "  - Production: http://localhost:3311"
echo ""
echo "To integrate with GUI Selector:"
echo "  1. Start the GUI Selector Server (port 3402)"
echo "  2. Navigate to the template selection page"
echo "  3. Select a template for your calculator UI"