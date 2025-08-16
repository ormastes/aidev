#!/usr/bin/env bash
# Setup script for deploying aidev folder structure with MCP configuration
# This script creates a complete aidev environment for demo/release purposes

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TARGET_DIR="${1:-./aidev}"
MODE="${2:-demo}" # demo or release

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if target directory already exists
check_target_directory() {
    if [[ -d "$TARGET_DIR" ]]; then
        log_warning "Target directory $TARGET_DIR already exists"
        read -p "Do you want to overwrite it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Aborting setup"
            exit 1
        fi
        rm -rf "$TARGET_DIR"
    fi
}

# Create directory structure
create_directory_structure() {
    log_info "Creating directory structure at $TARGET_DIR"
    
    # Core directories
    mkdir -p "$TARGET_DIR"/{scripts,config,docs,llm_rules,templates,gen,layer,src,tests}
    mkdir -p "$TARGET_DIR"/scripts/{core,setup,utils}
    mkdir -p "$TARGET_DIR"/config/{mcp,typescript,testing}
    mkdir -p "$TARGET_DIR"/gen/{doc,history/retrospect}
    mkdir -p "$TARGET_DIR"/layer/themes
    mkdir -p "$TARGET_DIR"/templates/llm_rules
    
    log_success "Directory structure created"
}

# Copy essential files
copy_essential_files() {
    log_info "Copying essential files"
    
    # Copy CLAUDE.md
    if [[ -f "$PROJECT_ROOT/CLAUDE.md" ]]; then
        cp "$PROJECT_ROOT/CLAUDE.md" "$TARGET_DIR/"
        log_success "Copied CLAUDE.md"
    else
        log_error "CLAUDE.md not found in source"
    fi
    
    # Copy llm_rules directory
    if [[ -d "$PROJECT_ROOT/llm_rules" ]]; then
        cp -r "$PROJECT_ROOT/llm_rules" "$TARGET_DIR/"
        log_success "Copied llm_rules directory"
    else
        log_warning "llm_rules directory not found in source"
    fi
    
    # Copy other essential files
    for file in README.md FEATURE.vf.json TASK_QUEUE.vf.json FILE_STRUCTURE.vf.json NAME_ID.vf.json; do
        if [[ -f "$PROJECT_ROOT/$file" ]]; then
            cp "$PROJECT_ROOT/$file" "$TARGET_DIR/"
            log_success "Copied $file"
        else
            log_warning "$file not found in source"
        fi
    done
    
    # Copy documentation
    if [[ -d "$PROJECT_ROOT/docs" ]]; then
        cp -r "$PROJECT_ROOT/docs" "$TARGET_DIR/"
        log_success "Copied documentation"
    fi
    
    # Copy templates
    if [[ -d "$PROJECT_ROOT/templates" ]]; then
        cp -r "$PROJECT_ROOT/templates" "$TARGET_DIR/"
        log_success "Copied templates"
    fi
    
    # Copy setup-folder theme
    if [[ -d "$PROJECT_ROOT/layer/themes/setup-folder" ]]; then
        mkdir -p "$TARGET_DIR/layer/themes"
        cp -r "$PROJECT_ROOT/layer/themes/setup-folder" "$TARGET_DIR/layer/themes/"
        log_success "Copied setup-folder theme"
    else
        log_warning "setup-folder theme not found in source"
    fi
}

# Create MCP configuration
create_mcp_configuration() {
    log_info "Creating MCP configuration"
    
    # Create Claude Desktop configuration directory
    CLAUDE_CONFIG_DIR="$TARGET_DIR/config/claude"
    mkdir -p "$CLAUDE_CONFIG_DIR"
    
    # Create MCP server configuration
    cat > "$CLAUDE_CONFIG_DIR/claude_desktop_config.json" << 'EOF'
{
  "mcpServers": {
    "aidev": {
      "command": "node",
      "args": ["${AIDEV_PATH}/scripts/mcp-server.js"],
      "env": {
        "AIDEV_ROOT": "${AIDEV_PATH}"
      }
    },
    "filesystem": {
      "command": "bunx",
      "args": ["@modelcontextprotocol/server-filesystem", "${AIDEV_PATH}"]
    }
  }
}
EOF
    
    # Create MCP agent configuration
    cat > "$TARGET_DIR/config/mcp/mcp-agent.json" << 'EOF'
{
  "agents": {
    "architect": {
      "description": "System architecture and design",
      "capabilities": ["design", "architecture", "patterns"],
      "tools": ["filesystem", "search", "edit"]
    },
    "developer": {
      "description": "Implementation and coding",
      "capabilities": ["coding", "testing", "debugging"],
      "tools": ["filesystem", "edit", "bash", "git"]
    },
    "tester": {
      "description": "Testing and quality assurance",
      "capabilities": ["testing", "coverage", "e2e"],
      "tools": ["filesystem", "bash", "playwright"]
    },
    "gui": {
      "description": "GUI design and implementation",
      "capabilities": ["ui", "ux", "design"],
      "tools": ["filesystem", "edit", "preview"]
    }
  }
}
EOF
    
    log_success "Created MCP configuration"
}

# Create setup script
create_setup_script() {
    log_info "Creating setup.sh script"
    
    cat > "$TARGET_DIR/setup.sh" << 'EOF'
#!/usr/bin/env bash
# Setup script for aidev environment
# This is a wrapper that delegates to the setup-folder theme
# By default installs locally, use --user-wide for system-wide installation

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AIDEV_PATH="$SCRIPT_DIR"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== Aidev Setup ===${NC}"
echo "Using setup-folder theme for configuration"

# Check if setup-folder theme is available
if [[ ! -d "$AIDEV_PATH/layer/themes/setup-folder" ]]; then
    echo -e "${RED}[ERROR]${NC} setup-folder theme not found!"
    echo "Please ensure the aidev folder was properly installed."
    exit 1
fi

# Check if bun is available
if ! command -v bun &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Bun is required but not found!"
    echo "Please install bun: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi
PACKAGE_MANAGER="bun"
echo -e "${GREEN}Using bun as package manager${NC}"

# Navigate to setup-folder theme
cd "$AIDEV_PATH/layer/themes/setup-folder"

# Install dependencies if needed
if [[ ! -d "node_modules" ]]; then
    echo -e "${BLUE}Installing setup-folder dependencies...${NC}"
    bun install
fi

# Build if necessary
if [[ ! -d "dist" ]] || [[ ! -f "dist/cli.js" ]]; then
    echo -e "${BLUE}Building setup-folder theme...${NC}"
    bun run build
fi

# Create a setup configuration file
cat > "$AIDEV_PATH/setup-config.json" << EOJ
{
  "targetDir": "$AIDEV_PATH",
  "deployedEnvironment": true,
  "mode": "$MODE"
}
EOJ

# Run the setup-folder MCP configuration
echo -e "${BLUE}Running MCP configuration...${NC}"

# Execute with bun, passing all arguments
bun run "$AIDEV_PATH/layer/themes/setup-folder/dist/cli.js" mcp-config \
    --target-dir "$AIDEV_PATH" \
    --deployed-environment \
    "$@"

# Clean up temporary config
rm -f "$AIDEV_PATH/setup-config.json"

echo -e "${GREEN}Setup complete!${NC}"
EOF
    
    chmod +x "$TARGET_DIR/setup.sh"
    log_success "Created setup.sh script"
}

# Create MCP server script
create_mcp_server() {
    log_info "Creating MCP server script"
    
    cat > "$TARGET_DIR/scripts/mcp-server.js" << 'EOF'
#!/usr/bin/env node
// MCP Server for aidev
// This server provides tools for Claude to interact with the aidev environment

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { readFile, writeFile, readdir } = require('fs').promises;
const path = require('path');

const AIDEV_ROOT = process.env.AIDEV_ROOT || __dirname;

class AidevMcpServer {
  constructor() {
    this.server = new Server(
      {
        name: 'aidev-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler('tools/list', async () => ({
      tools: [
        {
          name: 'read_task_queue',
          description: 'Read the current task queue',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'read_feature_backlog',
          description: 'Read the feature backlog',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'read_llm_rule',
          description: 'Read a specific LLM rule',
          inputSchema: {
            type: 'object',
            properties: {
              ruleName: {
                type: 'string',
                description: 'Name of the rule file (without .md extension)',
              },
            },
            required: ['ruleName'],
          },
        },
        {
          name: 'list_llm_rules',
          description: 'List all available LLM rules',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'read_task_queue':
          return await this.readTaskQueue();
        case 'read_feature_backlog':
          return await this.readFeatureBacklog();
        case 'read_llm_rule':
          return await this.readLlmRule(args.ruleName);
        case 'list_llm_rules':
          return await this.listLlmRules();
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async readTaskQueue() {
    try {
      const content = await readFile(
        path.join(AIDEV_ROOT, 'TASK_QUEUE.vf.json'),
        'utf-8'
      );
      return {
        content: [
          {
            type: 'text',
            text: content,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error reading task queue: ${error.message}`,
          },
        ],
      };
    }
  }

  async readFeatureBacklog() {
    try {
      const content = await readFile(
        path.join(AIDEV_ROOT, 'FEATURE.vf.json'),
        'utf-8'
      );
      return {
        content: [
          {
            type: 'text',
            text: content,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error reading feature backlog: ${error.message}`,
          },
        ],
      };
    }
  }

  async readLlmRule(ruleName) {
    try {
      const content = await readFile(
        path.join(AIDEV_ROOT, 'llm_rules', `${ruleName}.md`),
        'utf-8'
      );
      return {
        content: [
          {
            type: 'text',
            text: content,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error reading LLM rule: ${error.message}`,
          },
        ],
      };
    }
  }

  async listLlmRules() {
    try {
      const files = await readdir(path.join(AIDEV_ROOT, 'llm_rules'));
      const rules = files
        .filter((file) => file.endsWith('.md'))
        .map((file) => file.replace('.md', ''));
      return {
        content: [
          {
            type: 'text',
            text: `Available LLM rules:\n${rules.join('\n')}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error listing LLM rules: ${error.message}`,
          },
        ],
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Aidev MCP server running');
  }
}

const server = new AidevMcpServer();
server.run().catch(console.error);
EOF
    
    chmod +x "$TARGET_DIR/scripts/mcp-server.js"
    log_success "Created MCP server script"
}

# Create package.json for MCP server
create_package_json() {
    log_info "Creating package.json for MCP server"
    
    cat > "$TARGET_DIR/scripts/package.json" << 'EOF'
{
  "name": "aidev-mcp-server",
  "version": "1.0.0",
  "description": "MCP server for aidev environment",
  "main": "mcp-server.js",
  "scripts": {
    "start": "node mcp-server.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF
    
    log_success "Created package.json"
}

# Install dependencies if in release mode
install_dependencies() {
    if [[ "$MODE" == "release" ]]; then
        log_info "Installing MCP server dependencies"
        cd "$TARGET_DIR/scripts"
        if command -v bun &> /dev/null; then
            bun install
            log_success "Dependencies installed with bun"
        else
            log_warning "Bun not found, skipping dependency installation"
        fi
        cd - > /dev/null
    fi
}

# Main execution
main() {
    echo -e "${BLUE}=== Aidev Folder Setup ===${NC}"
    echo "Target directory: $TARGET_DIR"
    echo "Mode: $MODE"
    echo
    
    check_target_directory
    create_directory_structure
    copy_essential_files
    create_mcp_configuration
    create_setup_script
    create_mcp_server
    create_package_json
    install_dependencies
    
    echo
    echo -e "${GREEN}=== Setup Complete ===${NC}"
    echo -e "${GREEN}✅ Aidev environment created at: $TARGET_DIR${NC}"
    echo
    echo "Next steps:"
    echo "1. cd $TARGET_DIR"
    echo "2. ./setup.sh"
    echo "3. Restart Claude Desktop"
    echo
    
    if [[ "$MODE" == "demo" ]]; then
        echo "This is a DEMO setup - perfect for testing and evaluation"
    else
        echo "This is a RELEASE setup - ready for production deployment"
    fi
}

# Run main function
main