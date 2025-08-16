#!/usr/bin/env bun
/**
 * Migrated from: setup-story-reporter-demo.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.633Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Setup Script for Story Reporter Demo with Calculator
  // Sets up a complete demo environment for testing story reporter
  await $`set -e`;
  // Colors for output
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`BLUE='\033[0;34m'`;
  await $`MAGENTA='\033[0;35m'`;
  await $`CYAN='\033[0;36m'`;
  await $`NC='\033[0m' # No Color`;
  console.log("-e ");${BLUE}📚 Story Reporter Demo Setup${NC}"
  console.log("================================");
  console.log("");
  // Check if we're in the right directory
  if (! -f "package.json" ) {; then
  console.log("-e ");${RED}Error: Please run this script from the project root directory${NC}"
  process.exit(1);
  }
  // Create demo directory structure
  await $`DEMO_DIR="demo/calculator-story"`;
  console.log("-e ");${YELLOW}Creating demo directory: ${DEMO_DIR}${NC}"
  await mkdir(""$DEMO_DIR"", { recursive: true });
  // Build the project first
  console.log("-e ");${YELLOW}Building project...${NC}"
  await $`npm run build || {`;
  console.log("-e ");${RED}Build failed! Please fix build errors first.${NC}"
  process.exit(1);
  await $`}`;
  // Create Calculator Agent
  console.log("-e ");${GREEN}Creating Calculator Agent...${NC}"
  await $`cat > "$DEMO_DIR/calculator-agent.js" << 'EOF'`;
  await $`/**`;
  await $`* Calculator Agent for Story Reporter Demo`;
  await $`* A simple agent that can perform calculations`;
  await $`*/`;
  await $`const WebSocket = require('ws');`;
  await $`const { v4: uuidv4 } = require('uuid');`;
  await $`class CalculatorAgent {`;
  await $`constructor(serverUrl, roomId, agentName = 'Calculator') {`;
  await $`this.serverUrl = serverUrl;`;
  await $`this.roomId = roomId;`;
  await $`this.agentName = agentName;`;
  await $`this.userId = uuidv4();`;
  await $`this.ws = null;`;
  await $`this.connected = false;`;
  await $`}`;
  await $`async connect() {`;
  await $`return new Promise((resolve, reject) => {`;
  await $`console.log(`🧮 Connecting Calculator to ${this.serverUrl}...`);`;
  await $`this.ws = new WebSocket(this.serverUrl);`;
  await $`this.ws.on('open', () => {`;
  // Join room
  await $`this.ws.send(JSON.stringify({`;
  await $`type: 'join_room',`;
  await $`roomId: this.roomId,`;
  await $`userId: this.userId,`;
  await $`username: this.agentName,`;
  await $`isAgent: true`;
  await $`}));`;
  await $`this.connected = true;`;
  await $`console.log(`✅ Calculator connected to room ${this.roomId}`);`;
  // Announce capabilities
  await $`setTimeout(() => {`;
  await $`this.sendMessage({`;
  await $`type: 'agent_message',`;
  await $`content: '🧮 Calculator Agent ready! I can solve: add, subtract, multiply, divide. Try: "calculate 5 + 3"',`;
  await $`sender: this.agentName`;
  await $`});`;
  await $`resolve();`;
  await $`}, 1000);`;
  await $`});`;
  await $`this.ws.on('message', (data) => {`;
  await $`try {`;
  await $`const message = JSON.parse(data.toString());`;
  await $`this.handleMessage(message);`;
  await $`} catch (error) {`;
  await $`console.error('Error parsing message:', error);`;
  await $`}`;
  await $`});`;
  await $`this.ws.on('error', reject);`;
  await $`this.ws.on('close', () => {`;
  await $`this.connected = false;`;
  await $`console.log('Calculator disconnected');`;
  await $`});`;
  await $`});`;
  await $`}`;
  await $`handleMessage(message) {`;
  // Skip own messages and system messages
  await $`if (message.sender === this.agentName ||`;
  await $`message.type === 'system_message' ||`;
  await $`message.type === 'user_joined' ||`;
  await $`message.type === 'user_left') {`;
  await $`return;`;
  await $`}`;
  await $`const content = message.content?.toLowerCase() || '';`;
  // Check for calculation requests
  await $`if (content.includes('calculate') || content.includes('calc') ||`;
  await $`content.includes('what is') || content.includes('solve')) {`;
  await $`const result = this.parseAndCalculate(message.content);`;
  await $`if (result !== null) {`;
  await $`this.sendMessage({`;
  await $`type: 'agent_message',`;
  await $`content: `🧮 ${message.content} = ${result}`,`;
  await $`sender: this.agentName,`;
  await $`metadata: {`;
  await $`calculation: message.content,`;
  await $`result: result,`;
  await $`respondingTo: message.sender`;
  await $`}`;
  await $`});`;
  await $`}`;
  await $`} else if (content.includes('help') && content.includes('calc')) {`;
  await $`this.sendMessage({`;
  await $`type: 'agent_message',`;
  await $`content: '🧮 I can help with: add (+), subtract (-), multiply (*), divide (/). Example: "calculate 10 + 5"',`;
  await $`sender: this.agentName`;
  await $`});`;
  await $`}`;
  await $`}`;
  await $`parseAndCalculate(text) {`;
  // Extract mathematical expression
  await $`const patterns = [`;
  await $`/calculate\s+(.+)/i,`;
  await $`/calc\s+(.+)/i,`;
  await $`/what\s+is\s+(.+)/i,`;
  await $`/solve\s+(.+)/i,`;
  await $`/(\d+\s*[\+\-\*\/]\s*\d+)/`;
  await $`];`;
  await $`let expression = null;`;
  await $`for (const pattern of patterns) {`;
  await $`const match = text.match(pattern);`;
  await $`if (match) {`;
  await $`expression = match[1].trim();`;
  await $`break;`;
  await $`}`;
  await $`}`;
  await $`if (!expression) return null;`;
  // Simple calculator - only basic operations
  await $`try {`;
  // Clean the expression
  await $`expression = expression.replace(/[^0-9\+\-\*\/\.\s\(\)]/g, '');`;
  // Basic validation
  await $`if (!/^\d+(\.\d+)?[\s]*[\+\-\*\/][\s]*\d+(\.\d+)?$/.test(expression)) {`;
  await $`return null;`;
  await $`}`;
  // Parse operation
  await $`const operators = ['+', '-', '*', '/'];`;
  await $`let operator = null;`;
  await $`let parts = [];`;
  await $`for (const op of operators) {`;
  await $`if (expression.includes(op)) {`;
  await $`parts = expression.split(op).map(p => p.trim());`;
  await $`operator = op;`;
  await $`break;`;
  await $`}`;
  await $`}`;
  await $`if (!operator || parts.length !== 2) return null;`;
  await $`const a = parseFloat(parts[0]);`;
  await $`const b = parseFloat(parts[1]);`;
  await $`if (isNaN(a) || isNaN(b)) return null;`;
  // Perform calculation
  await $`let result;`;
  await $`switch (operator) {`;
  await $`case '+': result = a + b; break;`;
  await $`case '-': result = a - b; break;`;
  await $`case '*': result = a * b; break;`;
  await $`case '/':`;
  await $`if (b === 0) return 'Error: Division by zero';`;
  await $`result = a / b;`;
  await $`break;`;
  await $`}`;
  // Format result
  await $`return Number.isInteger(result) ? result : result.toFixed(2);`;
  await $`} catch (error) {`;
  await $`console.error('Calculation error:', error);`;
  await $`return null;`;
  await $`}`;
  await $`}`;
  await $`sendMessage(message) {`;
  await $`if (this.connected && this.ws) {`;
  await $`this.ws.send(JSON.stringify(message));`;
  await $`}`;
  await $`}`;
  await $`disconnect() {`;
  await $`if (this.ws) {`;
  await $`this.ws.close();`;
  await $`}`;
  await $`}`;
  await $`}`;
  // Start the calculator agent
  await $`const serverUrl = process.env.SERVER_URL || 'ws://localhost:3000';`;
  await $`const roomId = process.env.ROOM_ID || 'calculator-demo';`;
  await $`const calculator = new CalculatorAgent(serverUrl, roomId);`;
  await $`calculator.connect().catch(console.error);`;
  // Handle shutdown
  await $`process.on('SIGINT', () => {`;
  await $`console.log('\nShutting down Calculator...');`;
  await $`calculator.disconnect();`;
  await $`process.exit(0);`;
  await $`});`;
  await $`EOF`;
  // Create Demo Runner Script
  console.log("-e ");${GREEN}Creating demo runner...${NC}"
  await $`cat > "$DEMO_DIR/run-demo.js" << 'EOF'`;
  await $`/**`;
  await $`* Calculator Demo Runner with Story Reporter`;
  await $`* Runs a full demo showing story reporter tracking calculator interactions`;
  await $`*/`;
  await $`const { spawn } = require('child_process');`;
  await $`const WebSocket = require('ws');`;
  await $`const { v4: uuidv4 } = require('uuid');`;
  await $`const path = require('path');`;
  await $`const fs = require('fs');`;
  await $`const chalk = require('chalk');`;
  await $`class CalculatorDemo {`;
  await $`constructor() {`;
  await $`this.processes = [];`;
  await $`this.roomId = 'calculator-demo';`;
  await $`this.serverUrl = 'ws://localhost:3000';`;
  await $`this.logDir = path.join(process.cwd(), 'logs', 'calculator-demo');`;
  await $`}`;
  await $`async run() {`;
  await $`console.log(chalk.bold.blue('\n🧮 Calculator Demo with Story Reporter\n'));`;
  await $`try {`;
  // Ensure log directory
  await $`if (!fs.existsSync(this.logDir)) {`;
  await $`await fileAPI.createDirectory(this.logDir);`;
  await $`}`;
  // Start server
  await $`await this.startServer();`;
  // Start story reporter
  await $`await this.startStoryReporter();`;
  // Start calculator agent
  await $`await this.startCalculator();`;
  // Run test scenarios
  await $`await this.runTestScenarios();`;
  // Wait for story report
  await $`console.log(chalk.yellow('\n⏳ Waiting for story report generation...'));`;
  await $`await this.delay(65000); // Wait for report interval`;
  // Show results
  await $`await this.showResults();`;
  await $`} catch (error) {`;
  await $`console.error(chalk.red('Demo error:'), error);`;
  await $`} finally {`;
  await $`await this.cleanup();`;
  await $`}`;
  await $`}`;
  await $`async startServer() {`;
  await $`console.log(chalk.cyan('1️⃣ Starting Chat Server with Interception...'));`;
  await $`const server = spawn('node', [`;
  await $`'--require', './dist/logging/preload-interceptors.js',`;
  await $`'./dist/index.js'`;
  await $`], {`;
  await $`env: {`;
  await $`...process.env,`;
  await $`CHAT_PORT: 3000,`;
  await $`INTERCEPT_CONSOLE: 'false',`;
  await $`INTERCEPT_METRICS: 'true',`;
  await $`INTERCEPT_LOG_DIR: path.join(this.logDir, 'server')`;
  await $`},`;
  await $`stdio: 'pipe'`;
  await $`});`;
  await $`this.processes.push(server);`;
  await $`await new Promise((resolve) => {`;
  await $`server.stdout.on('data', (data) => {`;
  await $`if (data.toString().includes('Chat server running')) {`;
  await $`console.log(chalk.green('✅ Server started'));`;
  await $`resolve();`;
  await $`}`;
  await $`});`;
  await $`setTimeout(resolve, 5000);`;
  await $`});`;
  await $`}`;
  await $`async startStoryReporter() {`;
  await $`console.log(chalk.cyan('2️⃣ Starting Story Reporter...'));`;
  await $`const reporter = spawn('node', [`;
  await $`'--require', './dist/logging/preload-interceptors.js',`;
  await $`'./scripts/start-story-reporter.js',`;
  await $`this.serverUrl,`;
  await $`this.roomId,`;
  await $`'StoryBot'`;
  await $`], {`;
  await $`env: {`;
  await $`...process.env,`;
  await $`INTERCEPT_CONSOLE: 'false',`;
  await $`INTERCEPT_LOG_DIR: path.join(this.logDir, 'story-reporter')`;
  await $`},`;
  await $`stdio: 'pipe'`;
  await $`});`;
  await $`this.processes.push(reporter);`;
  await $`reporter.stdout.on('data', (data) => {`;
  await $`const output = data.toString();`;
  await $`if (output.includes('Story Reporter')) {`;
  await $`console.log(chalk.gray(`[StoryBot] ${output.trim()}`));`;
  await $`}`;
  await $`});`;
  await $`await this.delay(3000);`;
  await $`console.log(chalk.green('✅ Story Reporter ready'));`;
  await $`}`;
  await $`async startCalculator() {`;
  await $`console.log(chalk.cyan('3️⃣ Starting Calculator Agent...'));`;
  await $`const calculator = spawn('node', [`;
  await $`path.join(__dirname, 'calculator-agent.js')`;
  await $`], {`;
  await $`env: {`;
  await $`...process.env,`;
  await $`SERVER_URL: this.serverUrl,`;
  await $`ROOM_ID: this.roomId`;
  await $`},`;
  await $`stdio: 'pipe'`;
  await $`});`;
  await $`this.processes.push(calculator);`;
  await $`calculator.stdout.on('data', (data) => {`;
  await $`console.log(chalk.gray(`[Calculator] ${data.toString().trim()}`));`;
  await $`});`;
  await $`await this.delay(3000);`;
  await $`console.log(chalk.green('✅ Calculator ready'));`;
  await $`}`;
  await $`async runTestScenarios() {`;
  await $`console.log(chalk.cyan('\n4️⃣ Running Test Scenarios...'));`;
  await $`const scenarios = [`;
  await $`{ user: 'Alice', messages: [`;
  await $`'Hello everyone!',`;
  await $`'Can someone help me calculate 25 + 17?',`;
  await $`'Thanks! Now what is 100 - 42?'`;
  await $`]},`;
  await $`{ user: 'Bob', messages: [`;
  await $`'Hi Alice!',`;
  await $`'I need to solve 15 * 4',`;
  await $`'And also 120 / 5 please'`;
  await $`]},`;
  await $`{ user: 'Charlie', messages: [`;
  await $`'Testing error: calculate 10 / 0',`;
  await $`'Let me try: what is 3.14 * 2?',`;
  await $`'One more: solve 999 + 1'`;
  await $`]}`;
  await $`];`;
  await $`for (const scenario of scenarios) {`;
  await $`const client = await this.createClient(scenario.user);`;
  await $`for (const message of scenario.messages) {`;
  await $`console.log(chalk.blue(`[${scenario.user}]`), message);`;
  await $`client.send(message);`;
  await $`await this.delay(2000);`;
  await $`}`;
  await $`client.close();`;
  await $`await this.delay(1000);`;
  await $`}`;
  await $`}`;
  await $`async createClient(username) {`;
  await $`const ws = new WebSocket(this.serverUrl);`;
  await $`const userId = uuidv4();`;
  await $`await new Promise((resolve) => {`;
  await $`ws.on('open', () => {`;
  await $`ws.send(JSON.stringify({`;
  await $`type: 'join_room',`;
  await $`roomId: this.roomId,`;
  await $`userId,`;
  await $`username,`;
  await $`isAgent: false`;
  await $`}));`;
  await $`resolve();`;
  await $`});`;
  await $`});`;
  await $`ws.on('message', (data) => {`;
  await $`const msg = JSON.parse(data.toString());`;
  await $`if (msg.sender && msg.sender !== username && msg.type === 'agent_message') {`;
  await $`console.log(chalk.green(`[${msg.sender}]`), msg.content);`;
  await $`}`;
  await $`});`;
  await $`return {`;
  await $`send: (content) => {`;
  await $`ws.send(JSON.stringify({`;
  await $`type: 'user_message',`;
  await $`content,`;
  await $`sender: username`;
  await $`}));`;
  await $`},`;
  await $`close: () => ws.close()`;
  await $`};`;
  await $`}`;
  await $`async showResults() {`;
  await $`console.log(chalk.bold.yellow('\n📊 Demo Results:\n'));`;
  // Check story reports
  await $`const storyDir = path.join(process.cwd(), 'logs', 'stories');`;
  await $`if (fs.existsSync(storyDir)) {`;
  await $`const files = fs.readdirSync(storyDir).filter(f => f.startsWith('story-'));`;
  await $`console.log(chalk.cyan('Story Reports Generated:'), files.length);`;
  await $`if (files.length > 0) {`;
  await $`const latestReport = files[files.length - 1];`;
  await $`const reportPath = path.join(storyDir, latestReport);`;
  await $`const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));`;
  await $`console.log(chalk.gray('\nLatest Story Report Summary:'));`;
  await $`console.log('- Total Events:', report.analysis.totalEvents);`;
  await $`console.log('- Themes:', JSON.stringify(report.analysis.themes));`;
  await $`console.log('- Active Users:', report.analysis.activeUsers);`;
  await $`console.log('- Narrative:', report.narrative);`;
  await $`}`;
  await $`}`;
  // Check intercepted logs
  await $`console.log(chalk.cyan('\n📡 Interception Summary:'));`;
  await $`const logFiles = this.countLogFiles(this.logDir);`;
  await $`console.log('- Network Logs:', logFiles.network);`;
  await $`console.log('- System Metrics:', logFiles.metrics);`;
  await $`console.log('- Total Files:', logFiles.total);`;
  await $`}`;
  await $`countLogFiles(dir) {`;
  await $`let count = { network: 0, metrics: 0, total: 0 };`;
  await $`function scan(currentDir) {`;
  await $`if (!fs.existsSync(currentDir)) return;`;
  await $`const items = fs.readdirSync(currentDir);`;
  await $`items.forEach(item => {`;
  await $`const fullPath = path.join(currentDir, item);`;
  await $`const stat = fs.statSync(fullPath);`;
  await $`if (stat.isDirectory()) {`;
  await $`scan(fullPath);`;
  await $`} else {`;
  await $`count.total++;`;
  await $`if (item.includes('network-')) count.network++;`;
  await $`if (item.includes('metrics')) count.metrics++;`;
  await $`}`;
  await $`});`;
  await $`}`;
  await $`scan(dir);`;
  await $`return count;`;
  await $`}`;
  await $`async cleanup() {`;
  await $`console.log(chalk.yellow('\n🧹 Cleaning up...'));`;
  await $`this.processes.forEach(proc => {`;
  await $`proc.kill('SIGTERM');`;
  await $`});`;
  await $`await this.delay(1000);`;
  await $`}`;
  await $`delay(ms) {`;
  await $`return new Promise(resolve => setTimeout(resolve, ms));`;
  await $`}`;
  await $`}`;
  // Run the demo
  await $`const demo = new CalculatorDemo();`;
  await $`demo.run().catch(console.error);`;
  await $`EOF`;
  // Create E2E Test for Calculator Demo
  console.log("-e ");${GREEN}Creating E2E test...${NC}"
  await $`cat > "$DEMO_DIR/e2e-calculator-story.test.js" << 'EOF'`;
  await $`/**`;
  await $`* E2E Test for Calculator with Story Reporter`;
  await $`* Verifies story reporter correctly tracks calculator interactions`;
  await $`*/`;
  await $`const { spawn } = require('child_process');`;
  await $`const WebSocket = require('ws');`;
  await $`const path = require('path');`;
  await $`const fs = require('fs');`;
  await $`const chalk = require('chalk');`;
  await $`async function runE2ETest() {`;
  await $`console.log(chalk.bold.blue('\n🧪 E2E Test: Calculator with Story Reporter\n'));`;
  await $`const testResults = [];`;
  await $`const processes = [];`;
  await $`let storyReportGenerated = false;`;
  await $`let calculationsTracked = false;`;
  await $`let themesDetected = false;`;
  await $`try {`;
  // Start server
  await $`console.log(chalk.cyan('Starting test environment...'));`;
  await $`const server = spawn('node', ['./dist/index.js'], {`;
  await $`env: { ...process.env, CHAT_PORT: 3001 },`;
  await $`stdio: 'pipe'`;
  await $`});`;
  await $`processes.push(server);`;
  await $`await new Promise(resolve => setTimeout(resolve, 3000));`;
  // Start story reporter with short interval
  await $`const reporter = spawn('node', ['./scripts/start-story-reporter.js'], {`;
  await $`env: {`;
  await $`...process.env,`;
  await $`SERVER_URL: 'ws://localhost:3001',`;
  await $`ROOM_ID: 'test-room'`;
  await $`},`;
  await $`stdio: 'pipe'`;
  await $`});`;
  await $`processes.push(reporter);`;
  // Start calculator
  await $`const calculator = spawn('node', ['./demo/calculator-story/calculator-agent.js'], {`;
  await $`env: {`;
  await $`...process.env,`;
  await $`SERVER_URL: 'ws://localhost:3001',`;
  await $`ROOM_ID: 'test-room'`;
  await $`},`;
  await $`stdio: 'pipe'`;
  await $`});`;
  await $`processes.push(calculator);`;
  await $`await new Promise(resolve => setTimeout(resolve, 3000));`;
  // Run test interactions
  await $`console.log(chalk.cyan('Running test calculations...'));`;
  await $`const ws = new WebSocket('ws://localhost:3001');`;
  await $`await new Promise(resolve => ws.on('open', resolve));`;
  await $`ws.send(JSON.stringify({`;
  await $`type: 'join_room',`;
  await $`roomId: 'test-room',`;
  await $`userId: 'test-user',`;
  await $`username: 'Tester',`;
  await $`isAgent: false`;
  await $`}));`;
  await $`const testMessages = [`;
  await $`'Hello calculator!',`;
  await $`'calculate 42 + 58',`;
  await $`'what is 100 * 3?',`;
  await $`'solve 1000 / 10'`;
  await $`];`;
  await $`for (const msg of testMessages) {`;
  await $`ws.send(JSON.stringify({`;
  await $`type: 'user_message',`;
  await $`content: msg,`;
  await $`sender: 'Tester'`;
  await $`}));`;
  await $`await new Promise(resolve => setTimeout(resolve, 1000));`;
  await $`}`;
  // Wait for story report
  await $`console.log(chalk.cyan('Waiting for story report...'));`;
  await $`await new Promise(resolve => setTimeout(resolve, 65000));`;
  // Check results
  await $`console.log(chalk.cyan('Checking results...'));`;
  // Check story reports
  await $`const storyDir = path.join(process.cwd(), 'logs', 'stories');`;
  await $`if (fs.existsSync(storyDir)) {`;
  await $`const reports = fs.readdirSync(storyDir).filter(f => f.startsWith('story-'));`;
  await $`storyReportGenerated = reports.length > 0;`;
  await $`if (storyReportGenerated) {`;
  await $`const report = JSON.parse(fs.readFileSync(path.join(storyDir, reports[0]), 'utf8'));`;
  // Check if calculations were tracked
  await $`calculationsTracked = report.events.some(e =>`;
  await $`e.content && e.content.includes('calculate')`;
  await $`);`;
  // Check themes
  await $`themesDetected = report.analysis.themes &&`;
  await $`(report.analysis.themes.technical > 0 || report.analysis.themes.general > 0);`;
  await $`}`;
  await $`}`;
  // Report results
  await $`console.log(chalk.bold.yellow('\n📊 Test Results:'));`;
  await $`testResults.push({`;
  await $`name: 'Story Report Generated',`;
  await $`passed: storyReportGenerated`;
  await $`});`;
  await $`testResults.push({`;
  await $`name: 'Calculations Tracked',`;
  await $`passed: calculationsTracked`;
  await $`});`;
  await $`testResults.push({`;
  await $`name: 'Themes Detected',`;
  await $`passed: themesDetected`;
  await $`});`;
  // Display results
  await $`testResults.forEach(result => {`;
  await $`const icon = result.passed ? '✅' : '❌';`;
  await $`const color = result.passed ? chalk.green : chalk.red;`;
  await $`console.log(color(`${icon} ${result.name}`));`;
  await $`});`;
  await $`const passed = testResults.filter(r => r.passed).length;`;
  await $`const total = testResults.length;`;
  await $`console.log(chalk.bold(`\nTotal: ${passed}/${total} tests passed`));`;
  await $`if (passed === total) {`;
  await $`console.log(chalk.bold.green('\n✅ All tests passed!'));`;
  await $`} else {`;
  await $`console.log(chalk.bold.red('\n❌ Some tests failed'));`;
  await $`}`;
  await $`ws.close();`;
  await $`} catch (error) {`;
  await $`console.error(chalk.red('Test error:'), error);`;
  await $`} finally {`;
  // Cleanup
  await $`processes.forEach(p => p.kill());`;
  await $`await new Promise(resolve => setTimeout(resolve, 1000));`;
  await $`}`;
  await $`}`;
  // Run the test
  await $`runE2ETest().catch(console.error);`;
  await $`EOF`;
  // Create README for the demo
  console.log("-e ");${GREEN}Creating demo README...${NC}"
  await $`cat > "$DEMO_DIR/README.md" << 'EOF'`;
  // Calculator Demo with Story Reporter
  await $`This demo showcases how the Story Reporter agent tracks and reports on chat room interactions, using a simple calculator agent as an example.`;
  // # Components
  await $`1. **Calculator Agent** (`calculator-agent.js`)`;
  await $`- Simple math operations (add, subtract, multiply, divide)`;
  await $`- Responds to calculation requests in natural language`;
  await $`- Demonstrates agent interaction patterns`;
  await $`2. **Story Reporter**`;
  await $`- Tracks all chat events and messages`;
  await $`- Detects conversation themes (technical, social, system)`;
  await $`- Generates periodic narrative reports`;
  await $`- Saves detailed logs for analysis`;
  await $`3. **External Log Library**`;
  await $`- Intercepts all network communications`;
  await $`- Captures system metrics`;
  await $`- Provides transparent monitoring`;
  // # Running the Demo
  // ## Quick Start
  await $````bash`;
  // From project root
  await $`npm run build`;
  await $`node demo/calculator-story/run-demo.js`;
  await $`````;
  // ## Manual Steps
  await $`1. Start the chat server:`;
  await $````bash`;
  await $`npm run server`;
  await $`````;
  await $`2. Start Story Reporter:`;
  await $````bash`;
  await $`npm run start:story-reporter`;
  await $`````;
  await $`3. Start Calculator Agent:`;
  await $````bash`;
  await $`node demo/calculator-story/calculator-agent.js`;
  await $`````;
  await $`4. Connect a client and interact:`;
  await $````bash`;
  await $`npm run client TestUser calculator-demo`;
  await $`````;
  // ## E2E Test
  await $````bash`;
  await $`node demo/calculator-story/e2e-calculator-story.test.js`;
  await $`````;
  // # What to Observe
  await $`1. **Real-time Tracking**: Story Reporter tracks every message and event`;
  await $`2. **Theme Detection**: Messages are categorized (technical for calculations)`;
  await $`3. **User Activity**: Tracks who is most active`;
  await $`4. **Narrative Generation**: Creates a story about what happened`;
  await $`5. **External Monitoring**: All network calls are logged`;
  // # Story Report Format
  await $`Reports are saved to `logs/stories/story-*.json` with:`;
  await $`- Event timeline`;
  await $`- Theme analysis`;
  await $`- User activity metrics`;
  await $`- Generated narrative`;
  await $`- Key events summary`;
  // # Expected Output
  await $`The demo will show:`;
  await $`- Calculator responding to math requests`;
  await $`- Story Reporter generating periodic reports`;
  await $`- Themes detected (technical, social)`;
  await $`- User activity tracking`;
  await $`- Narrative about calculation session`;
  // # Customization
  await $`Modify `calculator-agent.js` to:`;
  await $`- Add more complex operations`;
  await $`- Change response format`;
  await $`- Add error handling`;
  await $`Modify story reporter config to:`;
  await $`- Change report interval`;
  await $`- Add custom themes`;
  await $`- Adjust narrative style`;
  await $`EOF`;
  // Make scripts executable
  await $`chmod +x "$DEMO_DIR/run-demo.js"`;
  await $`chmod +x "$DEMO_DIR/e2e-calculator-story.test.js"`;
  console.log("");
  console.log("-e ");${GREEN}✅ Setup Complete!${NC}"
  console.log("");
  console.log("-e ");${CYAN}Demo created in: ${DEMO_DIR}${NC}"
  console.log("");
  console.log("To run the demo:");
  console.log("-e ");${YELLOW}  node ${DEMO_DIR}/run-demo.js${NC}"
  console.log("");
  console.log("To run E2E test:");
  console.log("-e ");${YELLOW}  node ${DEMO_DIR}/e2e-calculator-story.test.js${NC}"
  console.log("");
  console.log("Components created:");
  console.log("  - Calculator Agent (simple math operations)");
  console.log("  - Demo Runner (automated scenario)");
  console.log("  - E2E Test (verification)");
  console.log("  - README with instructions");
  console.log("");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}