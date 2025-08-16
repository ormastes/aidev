#!/usr/bin/env bun
/**
 * Migrated from: setup-demo.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.637Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Setup script for Mate Dealer Demo
  // This creates a demo version of the mate dealer app with GUI selector integration
  await $`set -e`;
  await $`SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"`;
  await $`PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"`;
  await $`DEMO_NAME="mate-dealer"`;
  await $`DEMO_DIR="$PROJECT_ROOT/demo/$DEMO_NAME"`;
  console.log("=== Mate Dealer Demo Setup ===");
  console.log("Creating demo project for mate dealer marketplace app...");
  // Step 1: Create demo using existing setup script
  console.log("Step 1: Creating demo project structure...");
  process.chdir(""$SCRIPT_DIR/setup"");
  await $`python3 demo.py "$DEMO_NAME" --language typescript`;
  // Step 2: Navigate to demo directory
  process.chdir(""$DEMO_DIR"");
  // Step 3: Create FEATURE.md based on original mate_dealer
  console.log("Step 3: Creating FEATURE.md...");
  await $`cat > FEATURE.md << 'EOF'`;
  // Mate Dealer - Feature Backlog
  // # Overview
  await $`Mate Dealer is a marketplace application that connects mate tea dealers with customers, providing a platform for discovery, ordering, and business management.`;
  // # User Stories
  // ## Authentication & User Management
  await $`- [ ] As a user, I want to register as either a dealer or customer`;
  await $`- [ ] As a user, I want to login with my credentials`;
  await $`- [ ] As a user, I want to maintain a persistent session`;
  await $`- [ ] As a user, I want to update my profile information`;
  await $`- [ ] As a user, I want to reset my password if forgotten`;
  // ## Dealer Features
  await $`- [ ] As a dealer, I want to view my business dashboard`;
  await $`- [ ] As a dealer, I want to manage my product inventory`;
  await $`- [ ] As a dealer, I want to view and manage my client list`;
  await $`- [ ] As a dealer, I want to track orders and sales`;
  await $`- [ ] As a dealer, I want to set my service area and availability`;
  await $`- [ ] As a dealer, I want to view analytics of my business performance`;
  // ## Customer Features
  await $`- [ ] As a customer, I want to browse available dealers in my area`;
  await $`- [ ] As a customer, I want to search and filter dealers by location, products, and ratings`;
  await $`- [ ] As a customer, I want to view dealer profiles and product catalogs`;
  await $`- [ ] As a customer, I want to receive personalized dealer recommendations`;
  await $`- [ ] As a customer, I want to place orders with dealers`;
  await $`- [ ] As a customer, I want to track my order status`;
  await $`- [ ] As a customer, I want to leave reviews and ratings for dealers`;
  // ## Matching System
  await $`- [ ] As a customer, I want to be matched with compatible dealers based on preferences`;
  await $`- [ ] As a dealer, I want to be matched with customers in my service area`;
  await $`- [ ] As a user, I want the matching algorithm to consider location, preferences, and availability`;
  // ## Communication
  await $`- [ ] As a user, I want to message dealers/customers within the app`;
  await $`- [ ] As a user, I want to receive notifications for new messages and orders`;
  await $`- [ ] As a dealer, I want to send promotional messages to my customers`;
  // ## Technical Features
  await $`- [ ] As a developer, I want comprehensive logging for debugging`;
  await $`- [ ] As a developer, I want error boundaries to handle crashes gracefully`;
  await $`- [ ] As a user, I want dark/light theme support`;
  await $`- [ ] As a user, I want the app to work offline with data sync`;
  await $`- [ ] As a developer, I want E2E tests to ensure quality`;
  // # Implementation Priority
  await $`1. Authentication system`;
  await $`2. Basic dealer and customer dashboards`;
  await $`3. Dealer discovery and search`;
  await $`4. Product catalog management`;
  await $`5. Order placement and tracking`;
  await $`6. Matching algorithm`;
  await $`7. Reviews and ratings`;
  await $`8. In-app messaging`;
  await $`9. Analytics and reporting`;
  await $`10. Push notifications`;
  await $`EOF`;
  // Step 4: Create project structure
  console.log("Step 4: Creating project structure...");
  await mkdir("src/{components,screens,services,utils,types}", { recursive: true });
  await mkdir("src/components/{common,dealer,customer}", { recursive: true });
  await mkdir("src/screens/{auth,dealer,customer,shared}", { recursive: true });
  await mkdir("tests/{unit,integration,e2e}", { recursive: true });
  await mkdir("public/{images,styles}", { recursive: true });
  // Step 5: Create main application files
  console.log("Step 5: Creating application files...");
  // Create TypeScript config
  await $`cat > tsconfig.json << 'EOF'`;
  await $`{`;
  await $`"compilerOptions": {`;
  await $`"target": "ES2020",`;
  await $`"module": "commonjs",`;
  await $`"lib": ["ES2020", "DOM"],`;
  await $`"jsx": "react",`;
  await $`"outDir": "./dist",`;
  await $`"strict": true,`;
  await $`"esModuleInterop": true,`;
  await $`"skipLibCheck": true,`;
  await $`"forceConsistentCasingInFileNames": true,`;
  await $`"resolveJsonModule": true,`;
  await $`"moduleResolution": "node",`;
  await $`"baseUrl": "./src",`;
  await $`"paths": {`;
  await $`"@/*": ["*"]`;
  await $`}`;
  await $`},`;
  await $`"include": ["src/**/*"],`;
  await $`"exclude": ["node_modules", "dist", "tests"]`;
  await $`}`;
  await $`EOF`;
  // Create package.json
  await $`cat > package.json << 'EOF'`;
  await $`{`;
  await $`"name": "mate-dealer-demo",`;
  await $`"version": "1.0.0",`;
  await $`"description": "Mate Dealer - Marketplace for mate tea dealers and customers",`;
  await $`"main": "dist/server.js",`;
  await $`"scripts": {`;
  await $`"dev": "webpack serve --mode development",`;
  await $`"build": "webpack --mode production",`;
  await $`"server": "node dist/server.js",`;
  await $`"server:dev": "tsx watch src/server.ts",`;
  await $`"test": "jest",`;
  await $`"test:e2e": "playwright test",`;
  await $`"lint": "eslint src/**/*.{ts,tsx}",`;
  await $`"format": "prettier --write src/**/*.{ts,tsx,css}"`;
  await $`},`;
  await $`"dependencies": {`;
  await $`"react": "^18.2.0",`;
  await $`"react-dom": "^18.2.0",`;
  await $`"react-router-dom": "^6.20.0",`;
  await $`"express": "^4.18.2",`;
  await $`"cors": "^2.8.5",`;
  await $`"dotenv": "^16.3.1",`;
  await $`"bcryptjs": "^2.4.3",`;
  await $`"jsonwebtoken": "^9.0.2",`;
  await $`"sqlite3": "^5.1.6"`;
  await $`},`;
  await $`"devDependencies": {`;
  await $`"@types/react": "^18.2.0",`;
  await $`"@types/react-dom": "^18.2.0",`;
  await $`"@types/node": "^20.10.0",`;
  await $`"@types/express": "^4.17.21",`;
  await $`"@types/cors": "^2.8.17",`;
  await $`"@types/bcryptjs": "^2.4.6",`;
  await $`"@types/jsonwebtoken": "^9.0.5",`;
  await $`"typescript": "^5.3.0",`;
  await $`"webpack": "^5.89.0",`;
  await $`"webpack-cli": "^5.1.4",`;
  await $`"webpack-dev-server": "^4.15.1",`;
  await $`"html-webpack-plugin": "^5.5.3",`;
  await $`"ts-loader": "^9.5.1",`;
  await $`"css-loader": "^6.8.1",`;
  await $`"style-loader": "^3.3.3",`;
  await $`"tsx": "^4.6.2",`;
  await $`"@playwright/test": "^1.40.0",`;
  await $`"jest": "^29.7.0",`;
  await $`"@testing-library/react": "^14.1.0",`;
  await $`"@testing-library/jest-dom": "^6.1.5",`;
  await $`"eslint": "^8.55.0",`;
  await $`"prettier": "^3.1.0"`;
  await $`}`;
  await $`}`;
  await $`EOF`;
  // Create webpack config
  await $`cat > webpack.config.js << 'EOF'`;
  await $`const path = require('path');`;
  await $`const HtmlWebpackPlugin = require('html-webpack-plugin');`;
  await $`module.exports = {`;
  await $`entry: './src/client/index.tsx',`;
  await $`output: {`;
  await $`path: path.resolve(__dirname, 'dist/public'),`;
  await $`filename: 'bundle.js',`;
  await $`publicPath: '/'`;
  await $`},`;
  await $`resolve: {`;
  await $`extensions: ['.ts', '.tsx', '.js', '.jsx'],`;
  await $`alias: {`;
  await $`'@': path.resolve(__dirname, 'src')`;
  await $`}`;
  await $`},`;
  await $`module: {`;
  await $`rules: [`;
  await $`{`;
  await $`test: /\.tsx?$/,`;
  await $`use: 'ts-loader',`;
  await $`exclude: /node_modules/`;
  await $`},`;
  await $`{`;
  await $`test: /\.css$/,`;
  await $`use: ['style-loader', 'css-loader']`;
  await $`}`;
  await $`]`;
  await $`},`;
  await $`plugins: [`;
  await $`new HtmlWebpackPlugin({`;
  await $`template: './public/index.html',`;
  await $`title: 'Mate Dealer - Demo'`;
  await $`})`;
  await $`],`;
  await $`devServer: {`;
  await $`port: 3310,`;
  await $`hot: true,`;
  await $`historyApiFallback: true,`;
  await $`proxy: {`;
  await $`'/api': 'http://localhost:3311'`;
  await $`}`;
  await $`}`;
  await $`};`;
  await $`EOF`;
  // Create HTML template
  await $`cat > public/index.html << 'EOF'`;
  await $`<!DOCTYPE html>`;
  await $`<html lang="en">`;
  await $`<head>`;
  await $`<meta charset="UTF-8">`;
  await $`<meta name="viewport" content="width=device-width, initial-scale=1.0">`;
  await $`<title>Mate Dealer - Marketplace Demo</title>`;
  await $`<link rel="stylesheet" href="/styles/main.css">`;
  await $`</head>`;
  await $`<body>`;
  await $`<div id="root"></div>`;
  await $`</body>`;
  await $`</html>`;
  await $`EOF`;
  // Create main CSS with AI Dev Portal theme
  await $`cat > public/styles/main.css << 'EOF'`;
  await $`/* AI Dev Portal Theme Variables */`;
  await $`:root {`;
  await $`--primary-color: #2563eb;`;
  await $`--primary-hover: #1d4ed8;`;
  await $`--secondary-color: #10b981;`;
  await $`--accent-color: #8b5cf6;`;
  await $`--background-color: #f9fafb;`;
  await $`--surface-color: #ffffff;`;
  await $`--text-primary: #111827;`;
  await $`--text-secondary: #6b7280;`;
  await $`--border-color: #e5e7eb;`;
  await $`--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);`;
  await $`--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);`;
  await $`--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);`;
  await $`--radius-sm: 0.375rem;`;
  await $`--radius-md: 0.5rem;`;
  await $`--radius-lg: 0.75rem;`;
  await $`}`;
  await $`* {`;
  await $`margin: 0;`;
  await $`padding: 0;`;
  await $`box-sizing: border-box;`;
  await $`}`;
  await $`body {`;
  await $`font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;`;
  await $`background-color: var(--background-color);`;
  await $`color: var(--text-primary);`;
  await $`line-height: 1.6;`;
  await $`}`;
  await $`.container {`;
  await $`max-width: 1200px;`;
  await $`margin: 0 auto;`;
  await $`padding: 0 1rem;`;
  await $`}`;
  await $`/* Common styles */`;
  await $`.btn {`;
  await $`padding: 0.5rem 1rem;`;
  await $`border: none;`;
  await $`border-radius: var(--radius-md);`;
  await $`font-weight: 500;`;
  await $`cursor: pointer;`;
  await $`transition: all 0.2s;`;
  await $`}`;
  await $`.btn-primary {`;
  await $`background-color: var(--primary-color);`;
  await $`color: white;`;
  await $`}`;
  await $`.btn-primary:hover {`;
  await $`background-color: var(--primary-hover);`;
  await $`}`;
  await $`.card {`;
  await $`background-color: var(--surface-color);`;
  await $`border-radius: var(--radius-lg);`;
  await $`padding: 1.5rem;`;
  await $`box-shadow: var(--shadow-md);`;
  await $`}`;
  await $`EOF`;
  // Create React entry point
  await $`cat > src/client/index.tsx << 'EOF'`;
  await $`import React from 'react';`;
  await $`import ReactDOM from 'react-dom/client';`;
  await $`import { App } from './App';`;
  await $`const root = ReactDOM.createRoot(`;
  await $`document.getElementById('root') as HTMLElement`;
  await $`);`;
  await $`root.render(`;
  await $`<React.StrictMode>`;
  await $`<App />`;
  await $`</React.StrictMode>`;
  await $`);`;
  await $`EOF`;
  // Create main App component
  await $`cat > src/client/App.tsx << 'EOF'`;
  await $`import React from 'react';`;
  await $`import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';`;
  await $`import { LoginScreen } from './screens/LoginScreen';`;
  await $`import { DealerDashboard } from './screens/DealerDashboard';`;
  await $`import { CustomerDashboard } from './screens/CustomerDashboard';`;
  process.env.const App: React.FC  = " () => {";
  await $`return (`;
  await $`<Router>`;
  await $`<div className="app">`;
  await $`<Routes>`;
  await $`<Route path="/" element={<LoginScreen />} />`;
  await $`<Route path="/dealer/dashboard" element={<DealerDashboard />} />`;
  await $`<Route path="/customer/dashboard" element={<CustomerDashboard />} />`;
  await $`</Routes>`;
  await $`</div>`;
  await $`</Router>`;
  await $`);`;
  await $`};`;
  await $`EOF`;
  // Create Login Screen
  await $`cat > src/client/screens/LoginScreen.tsx << 'EOF'`;
  await $`import React, { useState } from 'react';`;
  await $`import { useNavigate } from 'react-router-dom';`;
  process.env.const LoginScreen: React.FC  = " () => {";
  await $`const [userType, setUserType] = useState<'dealer' | 'customer'>('customer');`;
  await $`const [email, setEmail] = useState('');`;
  await $`const [password, setPassword] = useState('');`;
  await $`const navigate = useNavigate();`;
  await $`const handleLogin = async (e: React.FormEvent) => {`;
  await $`e.preventDefault();`;
  // TODO: Implement actual login
  await $`if (userType === 'dealer') {`;
  await $`navigate('/dealer/dashboard');`;
  await $`} else {`;
  await $`navigate('/customer/dashboard');`;
  await $`}`;
  await $`};`;
  await $`return (`;
  await $`<div className="container" style={{ marginTop: '4rem' }}>`;
  await $`<div className="card" style={{ maxWidth: '400px', margin: '0 auto' }}>`;
  await $`<h1>Mate Dealer Login</h1>`;
  await $`<form onSubmit={handleLogin}>`;
  await $`<div style={{ marginTop: '1rem' }}>`;
  await $`<label>`;
  await $`<input`;
  await $`type="radio"`;
  await $`value="customer"`;
  await $`checked={userType === 'customer'}`;
  await $`onChange={() => setUserType('customer')}`;
  await $`/>`;
  await $`Customer`;
  await $`</label>`;
  await $`<label style={{ marginLeft: '1rem' }}>`;
  await $`<input`;
  await $`type="radio"`;
  await $`value="dealer"`;
  await $`checked={userType === 'dealer'}`;
  await $`onChange={() => setUserType('dealer')}`;
  await $`/>`;
  await $`Dealer`;
  await $`</label>`;
  await $`</div>`;
  await $`<div style={{ marginTop: '1rem' }}>`;
  await $`<input`;
  await $`type="email"`;
  await $`placeholder="Email"`;
  await $`value={email}`;
  await $`onChange={(e) => setEmail(e.target.value)}`;
  await $`style={{ width: '100%', padding: '0.5rem' }}`;
  await $`required`;
  await $`/>`;
  await $`</div>`;
  await $`<div style={{ marginTop: '1rem' }}>`;
  await $`<input`;
  await $`type="password"`;
  await $`placeholder="Password"`;
  await $`value={password}`;
  await $`onChange={(e) => setPassword(e.target.value)}`;
  await $`style={{ width: '100%', padding: '0.5rem' }}`;
  await $`required`;
  await $`/>`;
  await $`</div>`;
  await $`<button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>`;
  await $`Login as {userType}`;
  await $`</button>`;
  await $`</form>`;
  await $`</div>`;
  await $`</div>`;
  await $`);`;
  await $`};`;
  await $`EOF`;
  // Create Dealer Dashboard
  await $`cat > src/client/screens/DealerDashboard.tsx << 'EOF'`;
  await $`import React from 'react';`;
  process.env.const DealerDashboard: React.FC  = " () => {";
  await $`return (`;
  await $`<div className="container">`;
  await $`<h1>Dealer Dashboard</h1>`;
  await $`<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginTop: '2rem' }}>`;
  await $`<div className="card">`;
  await $`<h3>Total Customers</h3>`;
  await $`<p style={{ fontSize: '2rem', fontWeight: 'bold' }}>24</p>`;
  await $`</div>`;
  await $`<div className="card">`;
  await $`<h3>Active Orders</h3>`;
  await $`<p style={{ fontSize: '2rem', fontWeight: 'bold' }}>5</p>`;
  await $`</div>`;
  await $`<div className="card">`;
  await $`<h3>Revenue This Month</h3>`;
  await $`<p style={{ fontSize: '2rem', fontWeight: 'bold' }}>$3,450</p>`;
  await $`</div>`;
  await $`</div>`;
  await $`<div className="card" style={{ marginTop: '2rem' }}>`;
  await $`<h3>Recent Orders</h3>`;
  await $`<p>Order management coming soon...</p>`;
  await $`</div>`;
  await $`</div>`;
  await $`);`;
  await $`};`;
  await $`EOF`;
  // Create Customer Dashboard
  await $`cat > src/client/screens/CustomerDashboard.tsx << 'EOF'`;
  await $`import React from 'react';`;
  process.env.const CustomerDashboard: React.FC  = " () => {";
  await $`return (`;
  await $`<div className="container">`;
  await $`<h1>Find Your Mate Dealer</h1>`;
  await $`<div className="card" style={{ marginTop: '2rem' }}>`;
  await $`<h3>Recommended Dealers</h3>`;
  await $`<div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>`;
  await $`<div style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>`;
  await $`<h4>Juan's Mate Shop</h4>`;
  await $`<p>Distance: 2.3 km</p>`;
  await $`<p>Rating: ⭐⭐⭐⭐⭐</p>`;
  await $`<button className="btn btn-primary" style={{ marginTop: '0.5rem' }}>View Profile</button>`;
  await $`</div>`;
  await $`<div style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>`;
  await $`<h4>Maria's Traditional Mate</h4>`;
  await $`<p>Distance: 3.1 km</p>`;
  await $`<p>Rating: ⭐⭐⭐⭐</p>`;
  await $`<button className="btn btn-primary" style={{ marginTop: '0.5rem' }}>View Profile</button>`;
  await $`</div>`;
  await $`</div>`;
  await $`</div>`;
  await $`</div>`;
  await $`);`;
  await $`};`;
  await $`EOF`;
  // Create basic server
  await $`cat > src/server.ts << 'EOF'`;
  await $`import express from 'express';`;
  await $`import cors from 'cors';`;
  await $`import path from 'path';`;
  await $`const app = express();`;
  await $`const PORT = process.env.PORT || 3311;`;
  await $`app.use(cors());`;
  await $`app.use(express.json());`;
  // Serve static files
  await $`app.use(express.static(path.join(__dirname, 'public')));`;
  // API routes
  await $`app.get('/api/health', (req, res) => {`;
  await $`res.json({ status: 'healthy', service: 'mate-dealer-demo' });`;
  await $`});`;
  // Serve React app
  await $`app.get('*', (req, res) => {`;
  await $`res.sendFile(path.join(__dirname, 'public', 'index.html'));`;
  await $`});`;
  await $`app.listen(PORT, () => {`;
  await $`console.log(`Mate Dealer server running on port ${PORT}`);`;
  await $`});`;
  await $`EOF`;
  // Step 6: Create E2E test configuration
  console.log("Step 6: Setting up E2E tests...");
  // Create Playwright config
  await $`cat > playwright.config.ts << 'EOF'`;
  await $`import { defineConfig, devices } from '@playwright/test';`;
  await $`export default defineConfig({`;
  await $`testDir: './tests/e2e',`;
  await $`fullyParallel: true,`;
  await $`forbidOnly: !!process.env.CI,`;
  await $`retries: process.env.CI ? 2 : 0,`;
  await $`workers: process.env.CI ? 1 : undefined,`;
  await $`reporter: 'html',`;
  await $`use: {`;
  await $`baseURL: 'http://localhost:3310',`;
  await $`trace: 'on-first-retry',`;
  await $`},`;
  await $`projects: [`;
  await $`{`;
  await $`name: 'chromium',`;
  await $`use: { ...devices['Desktop Chrome'] },`;
  await $`},`;
  await $`],`;
  await $`webServer: {`;
  await $`command: 'npm run dev',`;
  await $`port: 3310,`;
  await $`reuseExistingServer: !process.env.CI,`;
  await $`},`;
  await $`});`;
  await $`EOF`;
  // Create E2E test
  await $`cat > tests/e2e/mate-dealer.spec.ts << 'EOF'`;
  await $`import { test, expect } from '@playwright/test';`;
  await $`test.describe('Mate Dealer Demo', () => {`;
  await $`test('should load login page', async ({ page }) => {`;
  await $`await page.goto('/');`;
  await $`await expect(page.getByText('Mate Dealer Login')).toBeVisible();`;
  await $`});`;
  await $`test('should login as dealer', async ({ page }) => {`;
  await $`await page.goto('/');`;
  // Select dealer option
  await $`await page.getByLabel('Dealer').click();`;
  // Fill login form
  await $`await page.fill('input[type="email"]', 'dealer@example.com');`;
  await $`await page.fill('input[type="password"]', 'password123');`;
  // Click login button
  await $`await page.getByRole('button', { name: 'Login as dealer' }).click();`;
  // Should navigate to dealer dashboard
  await $`await expect(page).toHaveURL('/dealer/dashboard');`;
  await $`await expect(page.getByText('Dealer Dashboard')).toBeVisible();`;
  await $`});`;
  await $`test('should login as customer', async ({ page }) => {`;
  await $`await page.goto('/');`;
  // Customer is selected by default
  await $`await page.fill('input[type="email"]', 'customer@example.com');`;
  await $`await page.fill('input[type="password"]', 'password123');`;
  // Click login button
  await $`await page.getByRole('button', { name: 'Login as customer' }).click();`;
  // Should navigate to customer dashboard
  await $`await expect(page).toHaveURL('/customer/dashboard');`;
  await $`await expect(page.getByText('Find Your Mate Dealer')).toBeVisible();`;
  await $`});`;
  await $`test('should show dealer recommendations', async ({ page }) => {`;
  await $`await page.goto('/customer/dashboard');`;
  // Check for recommended dealers
  await $`await expect(page.getByText('Recommended Dealers')).toBeVisible();`;
  await $`await expect(page.getByText("Juan's Mate Shop")).toBeVisible();`;
  await $`await expect(page.getByText("Maria's Traditional Mate")).toBeVisible();`;
  await $`});`;
  await $`test('should show dealer metrics', async ({ page }) => {`;
  await $`await page.goto('/dealer/dashboard');`;
  // Check for dashboard metrics
  await $`await expect(page.getByText('Total Customers')).toBeVisible();`;
  await $`await expect(page.getByText('24')).toBeVisible();`;
  await $`await expect(page.getByText('Active Orders')).toBeVisible();`;
  await $`await expect(page.getByText('5')).toBeVisible();`;
  await $`});`;
  await $`});`;
  await $`EOF`;
  // Step 7: Create GUI selector integration script
  console.log("Step 7: Creating GUI selector integration...");
  await $`cat > integrate-gui-selector.sh << 'EOF'`;
  // Script to demonstrate GUI selector integration with Mate Dealer
  console.log("=== GUI Selector Integration Demo ===");
  console.log("");
  // Start GUI selector server if not running
  await $`if ! curl -s http://localhost:3456/api/health > /dev/null; then`;
  console.log("Starting GUI selector server...");
  process.chdir("../../layer/themes/gui-selector/user-stories/023-gui-selector-server");
  await $`NODE_ENV=release npm start &`;
  await Bun.sleep(5 * 1000);
  process.chdir("-");
  }
  // Use GUI selector to choose a template
  console.log("1. Opening GUI selector...");
  console.log("   Visit: http://localhost:3456");
  console.log("");
  console.log("2. Login with: admin / admin123");
  console.log("");
  console.log("3. Create new app: 'Mate Dealer Demo'");
  console.log("");
  console.log("4. Select a template from the 4 options:");
  console.log("   - Modern (recommended for marketplace)");
  console.log("   - Professional (for business focus)");
  console.log("   - Creative (for unique branding)");
  console.log("   - Accessible (for wider audience)");
  console.log("");
  console.log("5. The selected template will be applied to the Mate Dealer app");
  console.log("");
  console.log("Press Enter when you've selected a template...");
  await $`read`;
  console.log("Template selection complete!");
  console.log("The Mate Dealer demo now uses the selected GUI template.");
  await $`EOF`;
  await $`chmod +x integrate-gui-selector.sh`;
  // Step 8: Create README
  console.log("Step 8: Creating README...");
  await $`cat > README.md << 'EOF'`;
  // Mate Dealer Demo
  await $`A demonstration of the Mate Dealer marketplace application integrated with the GUI Selector from AI Dev Portal.`;
  // # Features
  await $`- Dual user roles (Dealer/Customer)`;
  await $`- Dealer dashboard with business metrics`;
  await $`- Customer dashboard with dealer recommendations`;
  await $`- GUI template selection via AI Dev Portal`;
  await $`- E2E tests with Playwright`;
  // # Quick Start
  await $````bash`;
  // Install dependencies
  await $`npm install`;
  // Start development server
  await $`npm run dev`;
  // Run E2E tests
  await $`npm run test:e2e`;
  // Integrate with GUI selector
  await $`./integrate-gui-selector.sh`;
  await $`````;
  // # Ports
  await $`- Frontend Dev Server: http://localhost:3310`;
  await $`- Backend API Server: http://localhost:3311`;
  await $`- GUI Selector: http://localhost:3456`;
  // # Testing
  await $`The demo includes E2E tests that simulate:`;
  await $`- User login (dealer and customer)`;
  await $`- Navigation between dashboards`;
  await $`- Viewing dealer recommendations`;
  await $`- Checking business metrics`;
  // # GUI Integration
  await $`This demo integrates with the AI Dev Portal's GUI Selector to allow dynamic template selection. You can choose from 4 different design templates to style the application.`;
  await $`EOF`;
  console.log("");
  console.log("=== Mate Dealer Demo Setup Complete ===");
  console.log("");
  console.log("Next steps:");
  console.log("1. cd $DEMO_DIR");
  console.log("2. npm install");
  console.log("3. npm run dev (starts frontend)");
  console.log("4. npm run server:dev (starts backend)");
  console.log("5. npm run test:e2e (run E2E tests)");
  console.log("");
  console.log("To integrate with GUI selector:");
  console.log("  ./integrate-gui-selector.sh");
  console.log("");
  console.log("Access the app at: http://localhost:3310");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}