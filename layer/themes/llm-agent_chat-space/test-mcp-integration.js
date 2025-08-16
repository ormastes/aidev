#!/usr/bin/env node

/**
 * Test script for Chat Space MCP Integration
 */

const io = require('socket.io-client');
const axios = require('axios');

const CHAT_SERVER_URL = process.env.CHAT_SERVER_URL || 'http://localhost:4567';
const userId = 'test-user-' + Math.random().toString(36).substr(2, 9);
const userName = 'Test User';
const spaceId = 'test-space';

console.log('========================================');
console.log('Chat Space MCP Integration Test');
console.log('========================================');
console.log(`Server: ${CHAT_SERVER_URL}`);
console.log(`User: ${userName} (${userId})`);
console.log('');

// Connect to Socket.IO
const socket = io(CHAT_SERVER_URL);

let testsPassed = 0;
let testsFailed = 0;

// Test functions
async function testHealthEndpoint() {
  console.log('1. Testing health endpoint...');
  try {
    const response = await axios.get(`${CHAT_SERVER_URL}/health`);
    console.log('   ✅ Health check passed');
    console.log(`   - Chat Space: ${response.data.chatSpace.name}`);
    console.log(`   - MCP Enabled: ${response.data.mcp.enabled}`);
    console.log(`   - MCP Connected: ${response.data.mcp.connected}`);
    testsPassed++;
    return response.data;
  } catch (error) {
    console.log('   ❌ Health check failed:', error.message);
    testsFailed++;
    return null;
  }
}

async function testSendMessage(content) {
  console.log(`2. Testing send message: "${content}"...`);
  try {
    const response = await axios.post(`${CHAT_SERVER_URL}/api/messages`, {
      userId,
      userName,
      spaceId,
      content
    });
    console.log('   ✅ Message sent successfully');
    console.log(`   - Message ID: ${response.data.id}`);
    testsPassed++;
    return response.data;
  } catch (error) {
    console.log('   ❌ Send message failed:', error.message);
    testsFailed++;
    return null;
  }
}

async function testGetMessages() {
  console.log('3. Testing get messages...');
  try {
    const response = await axios.get(`${CHAT_SERVER_URL}/api/messages/${spaceId}`);
    console.log('   ✅ Messages retrieved successfully');
    console.log(`   - Message count: ${response.data.length}`);
    testsPassed++;
    return response.data;
  } catch (error) {
    console.log('   ❌ Get messages failed:', error.message);
    testsFailed++;
    return null;
  }
}

async function testMCPStatus() {
  console.log('4. Testing MCP status...');
  try {
    const response = await axios.get(`${CHAT_SERVER_URL}/api/mcp/status`);
    console.log('   ✅ MCP status retrieved');
    console.log(`   - Enabled: ${response.data.enabled}`);
    console.log(`   - Connected: ${response.data.connected}`);
    if (response.data.serverUrl) {
      console.log(`   - Server URL: ${response.data.serverUrl}`);
    }
    testsPassed++;
    return response.data;
  } catch (error) {
    console.log('   ❌ MCP status failed:', error.message);
    testsFailed++;
    return null;
  }
}

async function testMCPTools() {
  console.log('5. Testing MCP tools list...');
  try {
    const response = await axios.get(`${CHAT_SERVER_URL}/api/mcp/tools`);
    console.log('   ✅ MCP tools retrieved');
    console.log(`   - Tool count: ${response.data.length}`);
    if (response.data.length > 0) {
      console.log('   - Available tools:');
      response.data.forEach(tool => {
        console.log(`     • ${tool.name}: ${tool.description}`);
      });
    }
    testsPassed++;
    return response.data;
  } catch (error) {
    if (error.response?.status === 503) {
      console.log('   ⚠️  MCP not connected (expected if MCP server not running)');
    } else {
      console.log('   ❌ MCP tools failed:', error.message);
      testsFailed++;
    }
    return null;
  }
}

// Socket.IO tests
function testSocketConnection() {
  return new Promise((resolve) => {
    console.log('6. Testing Socket.IO connection...');
    
    // Set up timeout first
    const timeout = setTimeout(() => {
      if (!socket.connected) {
        console.log('   ❌ Socket.IO connection timeout');
        testsFailed++;
        resolve(false);
      }
    }, 3000);
    
    socket.on('connect', () => {
      clearTimeout(timeout);
      console.log('   ✅ Socket.IO connected');
      console.log(`   - Socket ID: ${socket.id}`);
      testsPassed++;
      
      // Join space
      socket.emit('join_space', { userId, spaceId });
      resolve(true);
    });
    
    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      console.log('   ❌ Socket.IO connection failed:', error.message);
      testsFailed++;
      resolve(false);
    });
  });
}

function testSocketMessages() {
  return new Promise((resolve) => {
    console.log('7. Testing Socket.IO message handling...');
    
    let messageReceived = false;
    
    // Set up timeout first
    const timeout = setTimeout(() => {
      if (!messageReceived) {
        console.log('   ❌ No message received via Socket.IO');
        testsFailed++;
        resolve(false);
      }
    }, 2000);
    
    socket.on('new_message', (message) => {
      if (!messageReceived) {
        clearTimeout(timeout);
        console.log('   ✅ Message received via Socket.IO');
        console.log(`   - From: ${message.userName || message.userId}`);
        console.log(`   - Content: ${message.content.substring(0, 50)}...`);
        messageReceived = true;
        testsPassed++;
        resolve(true);
      }
    });
    
    // Send test message after a short delay to ensure event handlers are ready
    setTimeout(() => {
      socket.emit('send_message', {
        userId,
        userName,
        spaceId,
        content: 'Test message via Socket.IO'
      });
    }, 100);
  });
}

// Run tests
async function runTests() {
  console.log('Starting tests...\n');
  
  // REST API tests
  await testHealthEndpoint();
  await testSendMessage('Hello from test script!');
  await testGetMessages();
  await testMCPStatus();
  await testMCPTools();
  
  // Socket.IO tests
  const connected = await testSocketConnection();
  if (connected) {
    await testSocketMessages();
  }
  
  // Test commands
  console.log('\n8. Testing chat commands...');
  await testSendMessage('/help');
  await testSendMessage('/users');
  
  // Summary
  console.log('\n========================================');
  console.log('Test Summary');
  console.log('========================================');
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);
  
  // Cleanup
  socket.disconnect();
  process.exit(testsFailed > 0 ? 1 : 0);
}

// Run tests with delay for server startup
setTimeout(runTests, 1000);