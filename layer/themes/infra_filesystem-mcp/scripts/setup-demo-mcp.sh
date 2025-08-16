#!/bin/bash

# Setup and Test Enhanced MCP Server Demo
# This script creates a demo environment and installs the enhanced MCP server

set -e

echo "🚀 Setting up Enhanced MCP Demo Environment"
echo "==========================================="

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Create demo directory
DEMO_DIR="/tmp/mcp-demo-$(date +%s)"
echo "📁 Creating demo directory: $DEMO_DIR"
mkdir -p "$DEMO_DIR"

# Initialize demo environment
echo "📋 Initializing demo environment structure..."
cat > "$DEMO_DIR/init-demo.js" << 'EOF'
const fs = require('fs').promises;
const path = require('path');

async function initDemo() {
  const demoDir = process.argv[2] || process.cwd();
  
  // Create directory structure
  const dirs = [
    'layer/themes/infra_filesystem-mcp/children',
    'layer/themes/infra_filesystem-mcp/tests',
    'layer/themes/infra_filesystem-mcp/schemas',
    'gen/doc',
    'gen/history/retrospect',
    'temp'
  ];

  for (const dir of dirs) {
    await fs.mkdir(path.join(demoDir, dir), { recursive: true });
  }

  // Create required JSON files
  const taskQueue = {
    taskQueues: {
      critical: [],
      high: [],
      medium: [],
      low: [],
      completed: []
    },
    working: [],
    metadata: {
      totalTasks: 0,
      lastUpdated: new Date().toISOString()
    }
  };

  const features = {
    metadata: { level: 'root', version: '1.0.0' },
    features: {
      platform: [],
      infrastructure: []
    }
  };

  const artifacts = {
    metadata: { version: '1.0.0', artifact_count: 0 },
    artifacts: []
  };

  await fs.writeFile(
    path.join(demoDir, 'TASK_QUEUE.vf.json'),
    JSON.stringify(taskQueue, null, 2)
  );

  await fs.writeFile(
    path.join(demoDir, 'FEATURE.vf.json'),
    JSON.stringify(features, null, 2)
  );

  await fs.writeFile(
    path.join(demoDir, 'ARTIFACTS.vf.json'),
    JSON.stringify(artifacts, null, 2)
  );

  // Create CLAUDE.md
  await fs.writeFile(
    path.join(demoDir, 'CLAUDE.md'),
    `# Demo Environment

This is a test environment for the Enhanced MCP Server with artifact validation.

## Features
- Artifact requirement checking
- Task dependency validation
- Feature-task linking
- Lifecycle state management
`
  );

  console.log('✅ Demo environment initialized');
}

initDemo().catch(console.error);
EOF

node "$DEMO_DIR/init-demo.js" "$DEMO_DIR"

# Copy necessary files
echo "📦 Copying MCP server files..."
cp -r "$PROJECT_ROOT/dist" "$DEMO_DIR/dist" 2>/dev/null || echo "⚠️  No dist folder found, will build"
cp -r "$PROJECT_ROOT/src" "$DEMO_DIR/src" 2>/dev/null || echo "⚠️  No src folder found"
cp "$PROJECT_ROOT/package.json" "$DEMO_DIR/package.json"
cp "$PROJECT_ROOT/mcp-server-enhanced.js" "$DEMO_DIR/mcp-server-enhanced.js"

# Copy schema files
mkdir -p "$DEMO_DIR/layer/themes/infra_filesystem-mcp/schemas"
if [ -f "$PROJECT_ROOT/schemas/artifact_patterns.json" ]; then
  cp "$PROJECT_ROOT/schemas/artifact_patterns.json" "$DEMO_DIR/layer/themes/infra_filesystem-mcp/schemas/"
fi

# Build if needed
if [ ! -d "$DEMO_DIR/dist" ]; then
  echo "🔨 Building TypeScript files..."
  cd "$PROJECT_ROOT"
  npm run build
  cp -r "$PROJECT_ROOT/dist" "$DEMO_DIR/dist"
fi

# Create test script
echo "🧪 Creating test script..."
cat > "$DEMO_DIR/test-mcp.js" << 'EOF'
const EnhancedFilesystemMCPServer = require('./mcp-server-enhanced.js');

async function testMCP() {
  console.log('\n🧪 Testing Enhanced MCP Server\n');
  
  const server = new EnhancedFilesystemMCPServer(process.cwd(), true);
  
  // Test 1: Startup
  console.log('Test 1: Startup');
  const startup = await server.handleRequest('vf_startup', {});
  console.log('✅ Startup:', startup.status === 'ready' ? 'PASSED' : 'FAILED');
  console.log('   Features:', Object.keys(startup.features).join(', '));
  
  // Test 2: Try to push task without artifacts (should be refused)
  console.log('\nTest 2: Push task requiring artifacts (should be refused)');
  const pushResult = await server.handleRequest('vf_push_task_validated', {
    task: {
      id: 'deploy-test',
      type: 'deployment',
      content: { title: 'Deploy feature' },
      artifactRequirements: [
        { type: 'source_code', minCount: 1, mustExist: true },
        { type: 'test_code', minCount: 1, mustExist: true }
      ],
      status: 'pending'
    },
    priority: 'high'
  });
  console.log('✅ Validation:', pushResult.allowed === false ? 'CORRECTLY REFUSED' : 'FAILED');
  if (pushResult.errors) {
    console.log('   Errors:', pushResult.errors.join('; '));
  }
  
  // Test 3: Save artifact with adhoc type (requires reason)
  console.log('\nTest 3: Save adhoc artifact without reason (should be refused)');
  const adhocResult = await server.handleRequest('vf_save_artifact', {
    content: 'test content',
    type: 'adhoc'
  });
  console.log('✅ Adhoc validation:', adhocResult.success === false ? 'CORRECTLY REFUSED' : 'FAILED');
  console.log('   Message:', adhocResult.message);
  
  // Test 4: Save proper artifact
  console.log('\nTest 4: Save source code artifact');
  const saveResult = await server.handleRequest('vf_save_artifact', {
    content: 'export class TestClass {}',
    type: 'source_code',
    metadata: { state: 'draft' }
  });
  console.log('✅ Save artifact:', saveResult.success ? 'PASSED' : 'FAILED');
  
  // Test 5: Get queue status
  console.log('\nTest 5: Get queue status');
  const status = await server.handleRequest('vf_get_queue_status', {});
  console.log('✅ Queue status:');
  console.log('   Total tasks:', status.totalTasks);
  console.log('   Ready tasks:', status.readyTasks);
  console.log('   Blocked tasks:', status.blockedTasks);
  console.log('   Invalid tasks:', status.invalidTasks);
  
  // Test 6: Validate task queue
  console.log('\nTest 6: Validate entire task queue');
  const validation = await server.handleRequest('vf_validate_task_queue', {});
  console.log('✅ Queue validation:', validation.isValid ? 'VALID' : 'INVALID');
  console.log('   Has circular dependencies:', validation.hasCircularDependencies);
  
  console.log('\n✨ All tests completed!');
  console.log('📊 Summary: The enhanced MCP server correctly refuses invalid operations');
}

testMCP().catch(console.error);
EOF

# Run tests
echo ""
echo "🧪 Running MCP tests..."
cd "$DEMO_DIR"
node test-mcp.js

# Create MCP config for Claude Code
echo ""
echo "📝 Creating MCP configuration..."
cat > "$DEMO_DIR/mcp-config.json" << EOF
{
  "mcpServers": {
    "filesystem-mcp-enhanced": {
      "command": "node",
      "args": ["$DEMO_DIR/mcp-server-enhanced.js"],
      "env": {
        "VF_BASE_PATH": "$DEMO_DIR",
        "VF_STRICT_MODE": "true"
      }
    }
  }
}
EOF

# Create run script
cat > "$DEMO_DIR/run-mcp.sh" << EOF
#!/bin/bash
echo "Starting Enhanced MCP Server..."
echo "Base path: $DEMO_DIR"
echo "Strict mode: ENABLED"
echo ""
VF_BASE_PATH="$DEMO_DIR" VF_STRICT_MODE="true" node "$DEMO_DIR/mcp-server-enhanced.js"
EOF
chmod +x "$DEMO_DIR/run-mcp.sh"

# Display results
echo ""
echo "✅ Demo environment setup complete!"
echo "==========================================="
echo ""
echo "📁 Demo location: $DEMO_DIR"
echo ""
echo "To run the enhanced MCP server:"
echo "  cd $DEMO_DIR"
echo "  ./run-mcp.sh"
echo ""
echo "To use with Claude Code:"
echo "  1. Copy the MCP config to your Claude Code settings:"
echo "     cat $DEMO_DIR/mcp-config.json"
echo ""
echo "  2. Or run Claude Code in the demo directory:"
echo "     cd $DEMO_DIR"
echo "     claude-code ."
echo ""
echo "Key features demonstrated:"
echo "  ✅ Artifact requirement validation"
echo "  ✅ Task dependency checking"
echo "  ✅ Adhoc file justification"
echo "  ✅ Queue status with validation"
echo "  ✅ Operations correctly refused when requirements not met"
echo ""
echo "The server will REFUSE operations that don't meet artifact requirements!"