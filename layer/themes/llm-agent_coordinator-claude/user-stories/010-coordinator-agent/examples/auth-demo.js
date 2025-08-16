#!/usr/bin/env node

/**
 * Authentication Demo for Coordinator Claude Agent
 * 
 * This script demonstrates how the coordinator handles different authentication methods.
 */

const { spawn } = require('child_process');
const { path } = require('../../../../infra_external-log-lib/src');

// Path to the built coordinator
const coordinatorPath = path.join(__dirname, '..', 'dist', 'index.js');

console.log('🔐 Coordinator Authentication Demo\n');
console.log('This demo shows different authentication methods:\n');

// Demo 1: Local authentication (default)
console.log('1️⃣ Starting with local Claude authentication...');
console.log('   Command: coordinator-claude start\n');

const localAuth = spawn('node', [coordinatorPath, 'start', '--no-interactive'], {
  stdio: 'pipe'
});

localAuth.stdout.on('data', (data) => {
  const output = data.toString();
  if (output.includes('Authentication:')) {
    console.log('   ' + output.trim());
  }
  if (output.includes('Coordinator started')) {
    console.log('   🔄 In Progress started with local auth\n');
    localAuth.kill();
    demo2();
  }
});

localAuth.stderr.on('data', (data) => {
  console.error('   ❌ Error:', data.toString());
  localAuth.kill();
  demo2();
});

// Demo 2: API key authentication
function demo2() {
  console.log('2️⃣ Starting with API key authentication...');
  console.log('   Command: coordinator-claude start --api-key YOUR_KEY\n');
  
  const apiKeyAuth = spawn('node', [
    coordinatorPath, 
    'start', 
    '--api-key', 
    'demo-api-key-12345',
    '--no-interactive'
  ], {
    stdio: 'pipe'
  });
  
  apiKeyAuth.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('Authentication:')) {
      console.log('   ' + output.trim());
    }
  });
  
  apiKeyAuth.stderr.on('data', (data) => {
    console.error('   ❌ Error:', data.toString());
  });
  
  setTimeout(() => {
    apiKeyAuth.kill();
    demo3();
  }, 2000);
}

// Demo 3: Checking authentication status
function demo3() {
  console.log('\n3️⃣ Authentication Priority:');
  console.log('   - API key (if provided) takes precedence');
  console.log('   - Local Claude credentials used as fallback');
  console.log('   - Error if neither is available\n');
  
  console.log('📝 Environment Variables:');
  console.log('   CLAUDE_API_KEY: ' + (process.env.CLAUDE_API_KEY ? '🔄 Set' : '❌ Not set'));
  console.log('   CLAUDE_MODEL: ' + (process.env.CLAUDE_MODEL || 'claude-opus-4-20250514'));
  
  console.log('\n🏠 Local Credentials:');
  const fs = require('fs');
  const os = require('os');
  const credPath = path.join(os.homedir(), '.claude', '.credentials.json');
  
  try {
    fs.accessSync(credPath);
    const stats = fs.statSync(credPath);
    console.log('   🔄 Found at: ' + credPath);
    console.log('   📅 Modified: ' + stats.mtime.toLocaleString());
    
    // Check if expired
    const creds = JSON.parse(fs.readFileSync(credPath, 'utf-8'));
    if (creds.claudeAiOauth?.expiresAt) {
      const expiresAt = new Date(creds.claudeAiOauth.expiresAt);
      const isExpired = expiresAt < new Date();
      console.log('   ⏰ Expires: ' + expiresAt.toLocaleString() + 
                  (isExpired ? ' (EXPIRED)' : ' (Valid)'));
    }
  } catch (error) {
    console.log('   ❌ Not found or inaccessible');
  }
  
  console.log('\n✨ Demo In Progress!');
}

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('\n❌ Unexpected error:', error.message);
  process.exit(1);
});