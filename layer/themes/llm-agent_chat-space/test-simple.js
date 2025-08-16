#!/usr/bin/env node

/**
 * Simple test for Chat Space Server
 */

const axios = require('axios');

const SERVER_URL = 'http://localhost:4567';

async function testHealth() {
  console.log('Testing health endpoint...');
  try {
    const response = await axios.get(`${SERVER_URL}/health`);
    console.log('✅ Server is healthy');
    console.log('  - Chat Space:', response.data.chatSpace.name);
    console.log('  - MCP Enabled:', response.data.mcp.enabled);
    console.log('  - MCP Connected:', response.data.mcp.connected);
    return true;
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    return false;
  }
}

async function testMessage() {
  console.log('\nTesting message API...');
  try {
    // Send a message
    const sendResponse = await axios.post(`${SERVER_URL}/api/messages`, {
      userId: 'test-user',
      userName: 'Test User',
      spaceId: 'test-space',
      content: 'Hello from test script!'
    });
    console.log('✅ Message sent:', sendResponse.data.id);
    
    // Get messages
    const getResponse = await axios.get(`${SERVER_URL}/api/messages/test-space`);
    console.log('✅ Messages retrieved:', getResponse.data.length, 'messages');
    
    return true;
  } catch (error) {
    console.log('❌ Message test failed:', error.message);
    return false;
  }
}

async function testMCPStatus() {
  console.log('\nTesting MCP status...');
  try {
    const response = await axios.get(`${SERVER_URL}/api/mcp/status`);
    console.log('✅ MCP Status:');
    console.log('  - Enabled:', response.data.enabled);
    console.log('  - Connected:', response.data.connected);
    
    if (response.data.enabled && !response.data.connected) {
      console.log('  ⚠️  MCP enabled but not connected (expected if MCP server not running)');
    }
    
    return true;
  } catch (error) {
    console.log('❌ MCP status test failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('========================================');
  console.log('Chat Space Server Test');
  console.log('========================================\n');
  
  const results = [];
  
  results.push(await testHealth());
  results.push(await testMessage());
  results.push(await testMCPStatus());
  
  const passed = results.filter(r => r).length;
  const failed = results.filter(r => !r).length;
  
  console.log('\n========================================');
  console.log('Test Summary');
  console.log('========================================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${Math.round((passed / results.length) * 100)}%`);
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(console.error);