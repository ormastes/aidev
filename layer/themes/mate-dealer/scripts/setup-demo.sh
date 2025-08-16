#!/bin/bash
# Setup script for Mate Dealer Demo
# This creates a demo version of the mate dealer app with GUI selector integration

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEMO_NAME="mate-dealer"
DEMO_DIR="$PROJECT_ROOT/demo/$DEMO_NAME"

echo "=== Mate Dealer Demo Setup ==="
echo "Creating demo project for mate dealer marketplace app..."

# Step 1: Create demo using existing setup script
echo "Step 1: Creating demo project structure..."
cd "$SCRIPT_DIR/setup"
python3 demo.py "$DEMO_NAME" --language typescript

# Step 2: Navigate to demo directory
cd "$DEMO_DIR"

# Step 3: Create FEATURE.md based on original mate_dealer
echo "Step 3: Creating FEATURE.md..."
cat > FEATURE.md << 'EOF'
# Mate Dealer - Feature Backlog

## Overview
Mate Dealer is a marketplace application that connects mate tea dealers with customers, providing a platform for discovery, ordering, and business management.

## User Stories

### Authentication & User Management
- [ ] As a user, I want to register as either a dealer or customer
- [ ] As a user, I want to login with my credentials
- [ ] As a user, I want to maintain a persistent session
- [ ] As a user, I want to update my profile information
- [ ] As a user, I want to reset my password if forgotten

### Dealer Features
- [ ] As a dealer, I want to view my business dashboard
- [ ] As a dealer, I want to manage my product inventory
- [ ] As a dealer, I want to view and manage my client list
- [ ] As a dealer, I want to track orders and sales
- [ ] As a dealer, I want to set my service area and availability
- [ ] As a dealer, I want to view analytics of my business performance

### Customer Features
- [ ] As a customer, I want to browse available dealers in my area
- [ ] As a customer, I want to search and filter dealers by location, products, and ratings
- [ ] As a customer, I want to view dealer profiles and product catalogs
- [ ] As a customer, I want to receive personalized dealer recommendations
- [ ] As a customer, I want to place orders with dealers
- [ ] As a customer, I want to track my order status
- [ ] As a customer, I want to leave reviews and ratings for dealers

### Matching System
- [ ] As a customer, I want to be matched with compatible dealers based on preferences
- [ ] As a dealer, I want to be matched with customers in my service area
- [ ] As a user, I want the matching algorithm to consider location, preferences, and availability

### Communication
- [ ] As a user, I want to message dealers/customers within the app
- [ ] As a user, I want to receive notifications for new messages and orders
- [ ] As a dealer, I want to send promotional messages to my customers

### Technical Features
- [ ] As a developer, I want comprehensive logging for debugging
- [ ] As a developer, I want error boundaries to handle crashes gracefully
- [ ] As a user, I want dark/light theme support
- [ ] As a user, I want the app to work offline with data sync
- [ ] As a developer, I want E2E tests to ensure quality

## Implementation Priority
1. Authentication system
2. Basic dealer and customer dashboards
3. Dealer discovery and search
4. Product catalog management
5. Order placement and tracking
6. Matching algorithm
7. Reviews and ratings
8. In-app messaging
9. Analytics and reporting
10. Push notifications
EOF

# Step 4: Create project structure
echo "Step 4: Creating project structure..."
mkdir -p src/{components,screens,services,utils,types}
mkdir -p src/components/{common,dealer,customer}
mkdir -p src/screens/{auth,dealer,customer,shared}
mkdir -p tests/{unit,integration,e2e}
mkdir -p public/{images,styles}

# Step 5: Create main application files
echo "Step 5: Creating application files..."

# Create TypeScript config
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
    "moduleResolution": "node",
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
EOF

# Create package.json
cat > package.json << 'EOF'
{
  "name": "mate-dealer-demo",
  "version": "1.0.0",
  "description": "Mate Dealer - Marketplace for mate tea dealers and customers",
  "main": "dist/server.js",
  "scripts": {
    "dev": "webpack serve --mode development",
    "build": "webpack --mode production",
    "server": "node dist/server.js",
    "server:dev": "tsx watch src/server.ts",
    "test": "jest",
    "test:e2e": "playwright test",
    "lint": "eslint src/**/*.{ts,tsx}",
    "format": "prettier --write src/**/*.{ts,tsx,css}"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "sqlite3": "^5.1.6"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/node": "^20.10.0",
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.5",
    "typescript": "^5.3.0",
    "webpack": "^5.89.0",
    "webpack-cli": "^5.1.4",
    "webpack-dev-server": "^4.15.1",
    "html-webpack-plugin": "^5.5.3",
    "ts-loader": "^9.5.1",
    "css-loader": "^6.8.1",
    "style-loader": "^3.3.3",
    "tsx": "^4.6.2",
    "@playwright/test": "^1.40.0",
    "jest": "^29.7.0",
    "@testing-library/react": "^14.1.0",
    "@testing-library/jest-dom": "^6.1.5",
    "eslint": "^8.55.0",
    "prettier": "^3.1.0"
  }
}
EOF

# Create webpack config
cat > webpack.config.js << 'EOF'
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/client/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist/public'),
    filename: 'bundle.js',
    publicPath: '/'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
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
      template: './public/index.html',
      title: 'Mate Dealer - Demo'
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

# Create HTML template
cat > public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mate Dealer - Marketplace Demo</title>
    <link rel="stylesheet" href="/styles/main.css">
</head>
<body>
    <div id="root"></div>
</body>
</html>
EOF

# Create main CSS with AI Dev Portal theme
cat > public/styles/main.css << 'EOF'
/* AI Dev Portal Theme Variables */
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

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

/* Common styles */
.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  background-color: var(--primary-hover);
}

.card {
  background-color: var(--surface-color);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  box-shadow: var(--shadow-md);
}
EOF

# Create React entry point
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

# Create main App component
cat > src/client/App.tsx << 'EOF'
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LoginScreen } from './screens/LoginScreen';
import { DealerDashboard } from './screens/DealerDashboard';
import { CustomerDashboard } from './screens/CustomerDashboard';

export const App: React.FC = () => {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<LoginScreen />} />
          <Route path="/dealer/dashboard" element={<DealerDashboard />} />
          <Route path="/customer/dashboard" element={<CustomerDashboard />} />
        </Routes>
      </div>
    </Router>
  );
};
EOF

# Create Login Screen
cat > src/client/screens/LoginScreen.tsx << 'EOF'
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const LoginScreen: React.FC = () => {
  const [userType, setUserType] = useState<'dealer' | 'customer'>('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement actual login
    if (userType === 'dealer') {
      navigate('/dealer/dashboard');
    } else {
      navigate('/customer/dashboard');
    }
  };

  return (
    <div className="container" style={{ marginTop: '4rem' }}>
      <div className="card" style={{ maxWidth: '400px', margin: '0 auto' }}>
        <h1>Mate Dealer Login</h1>
        <form onSubmit={handleLogin}>
          <div style={{ marginTop: '1rem' }}>
            <label>
              <input
                type="radio"
                value="customer"
                checked={userType === 'customer'}
                onChange={() => setUserType('customer')}
              />
              Customer
            </label>
            <label style={{ marginLeft: '1rem' }}>
              <input
                type="radio"
                value="dealer"
                checked={userType === 'dealer'}
                onChange={() => setUserType('dealer')}
              />
              Dealer
            </label>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '0.5rem' }}
              required
            />
          </div>
          <div style={{ marginTop: '1rem' }}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '0.5rem' }}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
            Login as {userType}
          </button>
        </form>
      </div>
    </div>
  );
};
EOF

# Create Dealer Dashboard
cat > src/client/screens/DealerDashboard.tsx << 'EOF'
import React from 'react';

export const DealerDashboard: React.FC = () => {
  return (
    <div className="container">
      <h1>Dealer Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginTop: '2rem' }}>
        <div className="card">
          <h3>Total Customers</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>24</p>
        </div>
        <div className="card">
          <h3>Active Orders</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>5</p>
        </div>
        <div className="card">
          <h3>Revenue This Month</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>$3,450</p>
        </div>
      </div>
      <div className="card" style={{ marginTop: '2rem' }}>
        <h3>Recent Orders</h3>
        <p>Order management coming soon...</p>
      </div>
    </div>
  );
};
EOF

# Create Customer Dashboard
cat > src/client/screens/CustomerDashboard.tsx << 'EOF'
import React from 'react';

export const CustomerDashboard: React.FC = () => {
  return (
    <div className="container">
      <h1>Find Your Mate Dealer</h1>
      <div className="card" style={{ marginTop: '2rem' }}>
        <h3>Recommended Dealers</h3>
        <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <h4>Juan's Mate Shop</h4>
            <p>Distance: 2.3 km</p>
            <p>Rating: ⭐⭐⭐⭐⭐</p>
            <button className="btn btn-primary" style={{ marginTop: '0.5rem' }}>View Profile</button>
          </div>
          <div style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <h4>Maria's Traditional Mate</h4>
            <p>Distance: 3.1 km</p>
            <p>Rating: ⭐⭐⭐⭐</p>
            <button className="btn btn-primary" style={{ marginTop: '0.5rem' }}>View Profile</button>
          </div>
        </div>
      </div>
    </div>
  );
};
EOF

# Create basic server
cat > src/server.ts << 'EOF'
import express from 'express';
import cors from 'cors';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3311;

app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', service: 'mate-dealer-demo' });
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Mate Dealer server running on port ${PORT}`);
});
EOF

# Step 6: Create E2E test configuration
echo "Step 6: Setting up E2E tests..."

# Create Playwright config
cat > playwright.config.ts << 'EOF'
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3310',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 3310,
    reuseExistingServer: !process.env.CI,
  },
});
EOF

# Create E2E test
cat > tests/e2e/mate-dealer.spec.ts << 'EOF'
import { test, expect } from '@playwright/test';

test.describe('Mate Dealer Demo', () => {
  test('should load login page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Mate Dealer Login')).toBeVisible();
  });

  test('should login as dealer', async ({ page }) => {
    await page.goto('/');
    
    // Select dealer option
    await page.getByLabel('Dealer').click();
    
    // Fill login form
    await page.fill('input[type="email"]', 'dealer@example.com');
    await page.fill('input[type="password"]', 'password123');
    
    // Click login button
    await page.getByRole('button', { name: 'Login as dealer' }).click();
    
    // Should navigate to dealer dashboard
    await expect(page).toHaveURL('/dealer/dashboard');
    await expect(page.getByText('Dealer Dashboard')).toBeVisible();
  });

  test('should login as customer', async ({ page }) => {
    await page.goto('/');
    
    // Customer is selected by default
    await page.fill('input[type="email"]', 'customer@example.com');
    await page.fill('input[type="password"]', 'password123');
    
    // Click login button
    await page.getByRole('button', { name: 'Login as customer' }).click();
    
    // Should navigate to customer dashboard
    await expect(page).toHaveURL('/customer/dashboard');
    await expect(page.getByText('Find Your Mate Dealer')).toBeVisible();
  });

  test('should show dealer recommendations', async ({ page }) => {
    await page.goto('/customer/dashboard');
    
    // Check for recommended dealers
    await expect(page.getByText('Recommended Dealers')).toBeVisible();
    await expect(page.getByText("Juan's Mate Shop")).toBeVisible();
    await expect(page.getByText("Maria's Traditional Mate")).toBeVisible();
  });

  test('should show dealer metrics', async ({ page }) => {
    await page.goto('/dealer/dashboard');
    
    // Check for dashboard metrics
    await expect(page.getByText('Total Customers')).toBeVisible();
    await expect(page.getByText('24')).toBeVisible();
    await expect(page.getByText('Active Orders')).toBeVisible();
    await expect(page.getByText('5')).toBeVisible();
  });
});
EOF

# Step 7: Create GUI selector integration script
echo "Step 7: Creating GUI selector integration..."

cat > integrate-gui-selector.sh << 'EOF'
#!/bin/bash
# Script to demonstrate GUI selector integration with Mate Dealer

echo "=== GUI Selector Integration Demo ==="
echo ""

# Start GUI selector server if not running
if ! curl -s http://localhost:3456/api/health > /dev/null; then
  echo "Starting GUI selector server..."
  cd ../../layer/themes/gui-selector/user-stories/023-gui-selector-server
  NODE_ENV=release npm start &
  sleep 5
  cd -
fi

# Use GUI selector to choose a template
echo "1. Opening GUI selector..."
echo "   Visit: http://localhost:3456"
echo ""
echo "2. Login with: admin / admin123"
echo ""
echo "3. Create new app: 'Mate Dealer Demo'"
echo ""
echo "4. Select a template from the 4 options:"
echo "   - Modern (recommended for marketplace)"
echo "   - Professional (for business focus)"
echo "   - Creative (for unique branding)"
echo "   - Accessible (for wider audience)"
echo ""
echo "5. The selected template will be applied to the Mate Dealer app"
echo ""
echo "Press Enter when you've selected a template..."
read

echo "Template selection complete!"
echo "The Mate Dealer demo now uses the selected GUI template."
EOF

chmod +x integrate-gui-selector.sh

# Step 8: Create README
echo "Step 8: Creating README..."
cat > README.md << 'EOF'
# Mate Dealer Demo

A demonstration of the Mate Dealer marketplace application integrated with the GUI Selector from AI Dev Portal.

## Features

- Dual user roles (Dealer/Customer)
- Dealer dashboard with business metrics
- Customer dashboard with dealer recommendations
- GUI template selection via AI Dev Portal
- E2E tests with Playwright

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run E2E tests
npm run test:e2e

# Integrate with GUI selector
./integrate-gui-selector.sh
```

## Ports

- Frontend Dev Server: http://localhost:3310
- Backend API Server: http://localhost:3311
- GUI Selector: http://localhost:3456

## Testing

The demo includes E2E tests that simulate:
- User login (dealer and customer)
- Navigation between dashboards
- Viewing dealer recommendations
- Checking business metrics

## GUI Integration

This demo integrates with the AI Dev Portal's GUI Selector to allow dynamic template selection. You can choose from 4 different design templates to style the application.
EOF

echo ""
echo "=== Mate Dealer Demo Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. cd $DEMO_DIR"
echo "2. npm install"
echo "3. npm run dev (starts frontend)"
echo "4. npm run server:dev (starts backend)"
echo "5. npm run test:e2e (run E2E tests)"
echo ""
echo "To integrate with GUI selector:"
echo "  ./integrate-gui-selector.sh"
echo ""
echo "Access the app at: http://localhost:3310"