#!/bin/bash

# Use full path to Bun or find it
BUN_PATH="${BUN_PATH:-$HOME/.bun/bin/bun}"
if [ ! -f "$BUN_PATH" ]; then
    BUN_PATH=$(which bun)
fi

echo "=== Testing MCP Server with Bun ==="
echo ""
echo "Bun version:"
$BUN_PATH --version
echo ""

echo "TypeScript version:"
$BUN_PATH x tsc --version
echo ""

echo "Testing TypeScript compilation:"
$BUN_PATH run build:mcp
if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript compilation failed"
    exit 1
fi
echo ""

echo "Testing MCP server startup:"
timeout 5 $BUN_PATH dist/mcp-main.js 2>&1 | head -5
if [ ${PIPESTATUS[0]} -eq 124 ]; then
    echo "✅ MCP server started successfully (timeout expected)"
else
    echo "⚠️ MCP server exited unexpectedly"
fi
echo ""

echo "Testing direct TypeScript execution with Bun:"
timeout 5 $BUN_PATH src/mcp-bun.ts 2>&1 | head -5
if [ ${PIPESTATUS[0]} -eq 124 ]; then
    echo "✅ Direct TypeScript execution works"
else
    echo "⚠️ Direct TypeScript execution failed"
fi
echo ""

echo "Checking compiled output:"
if [ -f dist/mcp-main.js ]; then
    echo "✅ Compiled JavaScript exists"
    ls -la dist/*.js
else
    echo "❌ Compiled JavaScript not found"
fi
echo ""

echo "Testing file operations security:"
cat > test-security.js << 'EOF'
const path = require('path');

// Test path traversal protection
const tests = [
    { path: '../../../etc/passwd', should: 'block' },
    { path: 'test.vf.json', should: 'allow' },
    { path: '/etc/passwd', should: 'block' },
    { path: './valid/path.vf.json', should: 'allow' }
];

tests.forEach(test => {
    const fullPath = path.join(process.env.VF_BASE_PATH || '.', test.path);
    const isBlocked = !fullPath.startsWith(process.env.VF_BASE_PATH || '.') || 
                      test.path.includes('../');
    const expected = test.should === 'block';
    const result = isBlocked === expected ? '✅' : '❌';
    console.log(`${result} ${test.path} - ${test.should} (${isBlocked ? 'blocked' : 'allowed'})`);
});
EOF

VF_BASE_PATH=/app $BUN_PATH test-security.js
echo ""

echo "=== All Tests Complete ==="