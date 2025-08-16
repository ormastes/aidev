#!/usr/bin/env python3
"""
Migrated from: test-mcp.sh
Auto-generated Python - 2025-08-16T04:57:27.598Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Use full path to Bun or find it
    subprocess.run("BUN_PATH="${BUN_PATH:-$HOME/.bun/bin/bun}"", shell=True)
    if ! -f "$BUN_PATH" :; then
    subprocess.run("BUN_PATH=$(which bun)", shell=True)
    print("=== Testing MCP Server with Bun ===")
    print("")
    print("Bun version:")
    subprocess.run("$BUN_PATH --version", shell=True)
    print("")
    print("TypeScript version:")
    subprocess.run("$BUN_PATH x tsc --version", shell=True)
    print("")
    print("Testing TypeScript compilation:")
    subprocess.run("$BUN_PATH run build:mcp", shell=True)
    if $? -eq 0 :; then
    print("✅ TypeScript compilation successful")
    else:
    print("❌ TypeScript compilation failed")
    sys.exit(1)
    print("")
    print("Testing MCP server startup:")
    subprocess.run("timeout 5 $BUN_PATH dist/mcp-main.js 2>&1 | head -5", shell=True)
    if ${PIPESTATUS[0]} -eq 124 :; then
    print("✅ MCP server started successfully (timeout expected)")
    else:
    print("⚠️ MCP server exited unexpectedly")
    print("")
    print("Testing direct TypeScript execution with Bun:")
    subprocess.run("timeout 5 $BUN_PATH src/mcp-bun.ts 2>&1 | head -5", shell=True)
    if ${PIPESTATUS[0]} -eq 124 :; then
    print("✅ Direct TypeScript execution works")
    else:
    print("⚠️ Direct TypeScript execution failed")
    print("")
    print("Checking compiled output:")
    if -f dist/mcp-main.js :; then
    print("✅ Compiled JavaScript exists")
    subprocess.run("ls -la dist/*.js", shell=True)
    else:
    print("❌ Compiled JavaScript not found")
    print("")
    print("Testing file operations security:")
    subprocess.run("cat > test-security.js << 'EOF'", shell=True)
    subprocess.run("const path = require('path');", shell=True)
    subprocess.run("// Test path traversal protection", shell=True)
    subprocess.run("const tests = [", shell=True)
    subprocess.run("{ path: '../../../etc/passwd', should: 'block' },", shell=True)
    subprocess.run("{ path: 'test.vf.json', should: 'allow' },", shell=True)
    subprocess.run("{ path: '/etc/passwd', should: 'block' },", shell=True)
    subprocess.run("{ path: './valid/path.vf.json', should: 'allow' }", shell=True)
    subprocess.run("];", shell=True)
    subprocess.run("tests.forEach(test => {", shell=True)
    subprocess.run("const fullPath = path.join(process.env.VF_BASE_PATH || '.', test.path);", shell=True)
    subprocess.run("const isBlocked = !fullPath.startsWith(process.env.VF_BASE_PATH || '.') ||", shell=True)
    subprocess.run("test.path.includes('../');", shell=True)
    subprocess.run("const expected = test.should === 'block';", shell=True)
    subprocess.run("const result = isBlocked === expected ? '✅' : '❌';", shell=True)
    subprocess.run("console.log(`${result} ${test.path} - ${test.should} (${isBlocked ? 'blocked' : 'allowed'})`);", shell=True)
    subprocess.run("});", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("VF_BASE_PATH=/app $BUN_PATH test-security.js", shell=True)
    print("")
    print("=== All Tests Complete ===")

if __name__ == "__main__":
    main()