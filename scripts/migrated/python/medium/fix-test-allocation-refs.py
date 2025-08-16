#!/usr/bin/env python3
"""
Migrated from: fix-test-allocation-refs.sh
Auto-generated Python - 2025-08-16T04:57:27.612Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Fix test allocation references to be consistent
    print("🔧 Fixing test allocation references...")
    # Fix all test files to use testAllocation consistently
    for file in [test/system/*.spec.ts test/*.spec.ts; do]:
    if -f "$file" :; then
    print("Processing: $file")
    # First ensure testAllocation is declared
    subprocess.run("if ! grep -q "let testAllocation:" "$file"; then", shell=True)
    # Add testAllocation declaration after testPort
    subprocess.run("sed -i '/let testPort: number;/a\  let testAllocation: any;' "$file"", shell=True)
    # Fix the allocation assignment - update allocateTestPort to registerTestSuite
    subprocess.run("sed -i "s/testPort = await testManager\.allocateTestPort('\([^']*\)');/testAllocation = await testManager.registerTestSuite({ suiteName: '\1', testType: 'e2e', framework: 'playwright' });\n    testPort = testAllocation.port;/g" "$file"", shell=True)
    # Fix references to use testAllocation
    subprocess.run("sed -i "s/process\.env\.TEST_PORT = String(testPort);/process.env.TEST_PORT = String(testAllocation.port);/g" "$file"", shell=True)
    # Ensure proper import
    subprocess.run("if ! grep -q "TestPortAllocation" "$file"; then", shell=True)
    subprocess.run("sed -i "s/import { TestPortManager }/import { TestPortManager, TestPortAllocation }/g" "$file"", shell=True)
    # Special fix for mcp-integration-system.spec.ts - has hardcoded MCP URLs
    if -f "test/system/mcp-integration-system.spec.ts" :; then
    print("Special fix for MCP integration test...")
    # Get domain from test-as-manual for MCP URLs too
    subprocess.run("cat > temp_mcp_fix.txt << 'EOF'", shell=True)
    subprocess.run("// Get MCP test ports from test-as-manual", shell=True)
    subprocess.run("const mcpPrimaryAllocation = await testManager.registerTestSuite({", shell=True)
    subprocess.run("suiteName: 'mcp-primary',", shell=True)
    subprocess.run("testType: 'integration',", shell=True)
    subprocess.run("framework: 'playwright'", shell=True)
    subprocess.run("});", shell=True)
    subprocess.run("const mcpSecondaryAllocation = await testManager.registerTestSuite({", shell=True)
    subprocess.run("suiteName: 'mcp-secondary',", shell=True)
    subprocess.run("testType: 'integration',", shell=True)
    subprocess.run("framework: 'playwright'", shell=True)
    subprocess.run("});", shell=True)
    subprocess.run("const MCP_API_URL = `${mcpPrimaryAllocation.baseUrl}/api/mcp`;", shell=True)
    subprocess.run("const MCP_PRIMARY_WS = `ws://${mcpPrimaryAllocation.baseUrl.replace('http://', '')}/mcp`;", shell=True)
    subprocess.run("const MCP_SECONDARY_WS = `ws://${mcpSecondaryAllocation.baseUrl.replace('http://', '')}/mcp`;", shell=True)
    subprocess.run("EOF", shell=True)
    # Replace hardcoded MCP URLs
    subprocess.run("sed -i "s|const MCP_API_URL = 'http://localhost:3458/api/mcp';|// MCP URLs will be set dynamically|g" "test/system/mcp-integration-system.spec.ts"", shell=True)
    subprocess.run("sed -i "s|ws://localhost:3458/mcp|' + MCP_PRIMARY_WS + '|g" "test/system/mcp-integration-system.spec.ts"", shell=True)
    subprocess.run("sed -i "s|ws://localhost:3459/mcp|' + MCP_SECONDARY_WS + '|g" "test/system/mcp-integration-system.spec.ts"", shell=True)
    subprocess.run("sed -i "s|ws://localhost:9999/mcp|ws://invalid.test:9999/mcp|g" "test/system/mcp-integration-system.spec.ts"", shell=True)
    print("✅ Test allocation references fixed!")

if __name__ == "__main__":
    main()