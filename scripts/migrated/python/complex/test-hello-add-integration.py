#!/usr/bin/env python3
"""
Migrated from: test-hello-add-integration.sh
Auto-generated Python - 2025-08-16T04:57:27.745Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    print("🧪 Testing Hello Add Integration with Local LLM")
    print("=============================================")
    print("")
    # Colors for output
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("NC='\033[0m' # No Color", shell=True)
    # Check if Ollama is installed
    print("1. Checking Ollama installation...")
    subprocess.run("if command -v ollama &> /dev/null; then", shell=True)
    print("-e ")${GREEN}✅ Ollama is installed${NC}"
    subprocess.run("ollama --version", shell=True)
    else:
    print("-e ")${RED}❌ Ollama is not installed${NC}"
    print("   Please install from https://ollama.ai")
    sys.exit(1)
    # Check if Ollama service is running
    print("")
    print("2. Checking Ollama service...")
    subprocess.run("if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then", shell=True)
    print("-e ")${GREEN}✅ Ollama service is running${NC}"
    else:
    print("-e ")${YELLOW}⚠️  Ollama service is not running${NC}"
    print("   Starting Ollama service...")
    subprocess.run("ollama serve &", shell=True)
    subprocess.run("OLLAMA_PID=$!", shell=True)
    time.sleep(3)
    # Check for DeepSeek R1 model
    print("")
    print("3. Checking for DeepSeek R1 model...")
    subprocess.run("if ollama list | grep -q "deepseek-r1"; then", shell=True)
    print("-e ")${GREEN}✅ DeepSeek R1 model is available${NC}"
    else:
    print("-e ")${YELLOW}⚠️  DeepSeek R1 model not found${NC}"
    print("   You can install it with: ollama pull deepseek-r1:latest")
    print("   Checking for alternative models...")
    subprocess.run("if ollama list | grep -q "llama"; then", shell=True)
    print("-e ")${GREEN}✅ Found Llama model as alternative${NC}"
    else:
    print("   No suitable models found. Using default.")
    # Test the chat-space theme system test
    print("")
    print("4. Running chat-space hello-add system test...")
    os.chdir("/home/ormastes/dev/aidev/layer/themes/llm-agent_chat-space")
    if -f "package.json" :; then
    # Install dependencies if needed
    if ! -d "node_modules" :; then
    print("   Installing dependencies...")
    subprocess.run("npm install --quiet", shell=True)
    # Run the specific test
    print("   Running hello-add-local-llm.stest.ts...")
    subprocess.run("bunx jest user-stories/007-chat-room-cli/tests/system/hello-add-local-llm.stest.ts --verbose", shell=True)
    subprocess.run("TEST_RESULT=$?", shell=True)
    if $TEST_RESULT -eq 0 :; then
    print("-e ")${GREEN}✅ Chat-space test passed${NC}"
    else:
    print("-e ")${YELLOW}⚠️  Chat-space test had issues (this is expected if Ollama is not configured)${NC}"
    else:
    print("-e ")${RED}❌ package.json not found in chat-space theme${NC}"
    # Test the Ollama coordinator demo
    print("")
    print("5. Running Ollama coordinator hello-add demo...")
    os.chdir("/home/ormastes/dev/aidev/layer/themes/llm-agent_coordinator-ollama")
    if -f "demo-hello-add.ts" :; then
    if ! -d "node_modules" :; then
    print("   Installing dependencies...")
    subprocess.run("npm install --quiet", shell=True)
    print("   Running demo-hello-add.ts...")
    subprocess.run("bunx ts-node demo-hello-add.ts", shell=True)
    subprocess.run("DEMO_RESULT=$?", shell=True)
    if $DEMO_RESULT -eq 0 :; then
    print("-e ")${GREEN}✅ Ollama coordinator demo completed${NC}"
    else:
    print("-e ")${YELLOW}⚠️  Ollama coordinator demo had issues${NC}"
    else:
    print("-e ")${RED}❌ demo-hello-add.ts not found${NC}"
    # Quick API test
    print("")
    print("6. Quick API test with curl...")
    subprocess.run("RESPONSE=$(curl -s -X POST http://localhost:11434/api/generate \", shell=True)
    subprocess.run("-H "Content-Type: application/json" \", shell=True)
    subprocess.run("-d '{", shell=True)
    subprocess.run(""model": "deepseek-r1:latest",", shell=True)
    subprocess.run(""prompt": "What is 5 + 7? Answer with just the number.",", shell=True)
    subprocess.run(""stream": false,", shell=True)
    subprocess.run(""options": {", shell=True)
    subprocess.run(""temperature": 0.1,", shell=True)
    subprocess.run(""max_tokens": 10", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("}' 2>/dev/null || echo "{}")", shell=True)
    subprocess.run("if echo "$RESPONSE" | grep -q "response"; then", shell=True)
    subprocess.run("ANSWER=$(echo "$RESPONSE" | grep -o '"response":"[^"]*"' | sed 's/"response":"\([^"]*\)"/\1/')", shell=True)
    print("-e ")${GREEN}✅ API test successful${NC}"
    print("   Q: What is 5 + 7?")
    print("   A: $ANSWER")
    else:
    print("-e ")${YELLOW}⚠️  API test failed or model not available${NC}"
    # Summary
    print("")
    print("=============================================")
    print("📊 Integration Test Summary:")
    print("")
    if $TEST_RESULT -eq 0 ] && [ $DEMO_RESULT -eq 0 :; then
    print("-e ")${GREEN}✅ All tests passed successfully!${NC}"
    print("   The hello-add functionality is working with local LLM.")
    else:
    print("-e ")${YELLOW}⚠️  Some tests had issues.${NC}"
    print("   This is normal if Ollama or DeepSeek R1 is not fully configured.")
    print("")
    print("   To fix:")
    print("   1. Install Ollama: https://ollama.ai")
    print("   2. Start service: ollama serve")
    print("   3. Install model: ollama pull deepseek-r1:latest")
    # Cleanup
    if ! -z "$OLLAMA_PID" :; then
    print("")
    print("Stopping Ollama service started by this script...")
    subprocess.run("kill $OLLAMA_PID 2>/dev/null", shell=True)
    print("")
    print("✅ Integration test completed")

if __name__ == "__main__":
    main()