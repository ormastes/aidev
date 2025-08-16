#!/usr/bin/env bun
/**
 * Migrated from: test-hello-add-integration.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.744Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  console.log("🧪 Testing Hello Add Integration with Local LLM");
  console.log("=============================================");
  console.log("");
  // Colors for output
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`NC='\033[0m' # No Color`;
  // Check if Ollama is installed
  console.log("1. Checking Ollama installation...");
  await $`if command -v ollama &> /dev/null; then`;
  console.log("-e ");${GREEN}✅ Ollama is installed${NC}"
  await $`ollama --version`;
  } else {
  console.log("-e ");${RED}❌ Ollama is not installed${NC}"
  console.log("   Please install from https://ollama.ai");
  process.exit(1);
  }
  // Check if Ollama service is running
  console.log("");
  console.log("2. Checking Ollama service...");
  await $`if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then`;
  console.log("-e ");${GREEN}✅ Ollama service is running${NC}"
  } else {
  console.log("-e ");${YELLOW}⚠️  Ollama service is not running${NC}"
  console.log("   Starting Ollama service...");
  await $`ollama serve &`;
  await $`OLLAMA_PID=$!`;
  await Bun.sleep(3 * 1000);
  }
  // Check for DeepSeek R1 model
  console.log("");
  console.log("3. Checking for DeepSeek R1 model...");
  await $`if ollama list | grep -q "deepseek-r1"; then`;
  console.log("-e ");${GREEN}✅ DeepSeek R1 model is available${NC}"
  } else {
  console.log("-e ");${YELLOW}⚠️  DeepSeek R1 model not found${NC}"
  console.log("   You can install it with: ollama pull deepseek-r1:latest");
  console.log("   Checking for alternative models...");
  await $`if ollama list | grep -q "llama"; then`;
  console.log("-e ");${GREEN}✅ Found Llama model as alternative${NC}"
  } else {
  console.log("   No suitable models found. Using default.");
  }
  }
  // Test the chat-space theme system test
  console.log("");
  console.log("4. Running chat-space hello-add system test...");
  process.chdir("/home/ormastes/dev/aidev/layer/themes/llm-agent_chat-space");
  if (-f "package.json" ) {; then
  // Install dependencies if needed
  if (! -d "node_modules" ) {; then
  console.log("   Installing dependencies...");
  await $`npm install --quiet`;
  }
  // Run the specific test
  console.log("   Running hello-add-local-llm.stest.ts...");
  await $`bunx jest user-stories/007-chat-room-cli/tests/system/hello-add-local-llm.stest.ts --verbose`;
  await $`TEST_RESULT=$?`;
  if ($TEST_RESULT -eq 0 ) {; then
  console.log("-e ");${GREEN}✅ Chat-space test passed${NC}"
  } else {
  console.log("-e ");${YELLOW}⚠️  Chat-space test had issues (this is expected if Ollama is not configured)${NC}"
  }
  } else {
  console.log("-e ");${RED}❌ package.json not found in chat-space theme${NC}"
  }
  // Test the Ollama coordinator demo
  console.log("");
  console.log("5. Running Ollama coordinator hello-add demo...");
  process.chdir("/home/ormastes/dev/aidev/layer/themes/llm-agent_coordinator-ollama");
  if (-f "demo-hello-add.ts" ) {; then
  if (! -d "node_modules" ) {; then
  console.log("   Installing dependencies...");
  await $`npm install --quiet`;
  }
  console.log("   Running demo-hello-add.ts...");
  await $`bunx ts-node demo-hello-add.ts`;
  await $`DEMO_RESULT=$?`;
  if ($DEMO_RESULT -eq 0 ) {; then
  console.log("-e ");${GREEN}✅ Ollama coordinator demo completed${NC}"
  } else {
  console.log("-e ");${YELLOW}⚠️  Ollama coordinator demo had issues${NC}"
  }
  } else {
  console.log("-e ");${RED}❌ demo-hello-add.ts not found${NC}"
  }
  // Quick API test
  console.log("");
  console.log("6. Quick API test with curl...");
  await $`RESPONSE=$(curl -s -X POST http://localhost:11434/api/generate \`;
  await $`-H "Content-Type: application/json" \`;
  await $`-d '{`;
  await $`"model": "deepseek-r1:latest",`;
  await $`"prompt": "What is 5 + 7? Answer with just the number.",`;
  await $`"stream": false,`;
  await $`"options": {`;
  await $`"temperature": 0.1,`;
  await $`"max_tokens": 10`;
  await $`}`;
  await $`}' 2>/dev/null || echo "{}")`;
  await $`if echo "$RESPONSE" | grep -q "response"; then`;
  await $`ANSWER=$(echo "$RESPONSE" | grep -o '"response":"[^"]*"' | sed 's/"response":"\([^"]*\)"/\1/')`;
  console.log("-e ");${GREEN}✅ API test successful${NC}"
  console.log("   Q: What is 5 + 7?");
  console.log("   A: $ANSWER");
  } else {
  console.log("-e ");${YELLOW}⚠️  API test failed or model not available${NC}"
  }
  // Summary
  console.log("");
  console.log("=============================================");
  console.log("📊 Integration Test Summary:");
  console.log("");
  if ($TEST_RESULT -eq 0 ] && [ $DEMO_RESULT -eq 0 ) {; then
  console.log("-e ");${GREEN}✅ All tests passed successfully!${NC}"
  console.log("   The hello-add functionality is working with local LLM.");
  } else {
  console.log("-e ");${YELLOW}⚠️  Some tests had issues.${NC}"
  console.log("   This is normal if Ollama or DeepSeek R1 is not fully configured.");
  console.log("");
  console.log("   To fix:");
  console.log("   1. Install Ollama: https://ollama.ai");
  console.log("   2. Start service: ollama serve");
  console.log("   3. Install model: ollama pull deepseek-r1:latest");
  }
  // Cleanup
  if (! -z "$OLLAMA_PID" ) {; then
  console.log("");
  console.log("Stopping Ollama service started by this script...");
  await $`kill $OLLAMA_PID 2>/dev/null`;
  }
  console.log("");
  console.log("✅ Integration test completed");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}