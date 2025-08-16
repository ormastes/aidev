#!/bin/bash
# Generate environment configuration template

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔧 Generating environment configuration..."
echo "========================================"

EPIC_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONFIG_DIR="$EPIC_ROOT/init/config"
ENV_TEMPLATE="$CONFIG_DIR/.env.template"

# Create .env.template
cat > "$ENV_TEMPLATE" << 'EOF'
# LLM Agent Epic Environment Configuration
# Copy this file to .env and fill in your values

# Environment
NODE_ENV=development
LOG_LEVEL=info

# Epic Configuration
EPIC_ROOT=/path/to/layer/epics/llm-agent
THEMES_ROOT=/path/to/layer/themes

# Claude Configuration
CLAUDE_API_KEY=your-claude-api-key-here
CLAUDE_MODEL=claude-opus-4-20250514
CLAUDE_MAX_TOKENS=4096
CLAUDE_TEMPERATURE=0.7
# Use local Claude authentication (from ~/.claude/.credentials.json)
CLAUDE_USE_LOCAL_AUTH=true

# Ollama Configuration
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=deepseek-r1:14b
OLLAMA_NUM_CTX=4096
OLLAMA_TEMPERATURE=0.7
# Auto-start Ollama server if not running
OLLAMA_AUTO_START=true

# vLLM Configuration
VLLM_HOST=http://localhost:8000
VLLM_MODEL=deepseek-ai/deepseek-coder-6.7b-instruct
VLLM_GPU_MEMORY_UTILIZATION=0.9
VLLM_MAX_MODEL_LEN=8192
# Auto-start vLLM server if not running
VLLM_AUTO_START=false

# MCP Server Configuration
MCP_SERVER_PORT=3456
MCP_SERVER_NAME=llm-agent-mcp
MCP_DEFAULT_PLATFORM=claude
# Enable multiple platforms simultaneously
MCP_ENABLE_CLAUDE=true
MCP_ENABLE_OLLAMA=true
MCP_ENABLE_VLLM=true

# Chat Space Configuration
CHAT_SPACE_PORT=3457
CHAT_SPACE_DEFAULT_ROOM=general
CHAT_SPACE_ENABLE_HISTORY=true
CHAT_SPACE_MAX_HISTORY=1000

# PocketFlow Configuration
POCKETFLOW_PORT=3458
POCKETFLOW_WORKFLOW_DIR=./workflows
POCKETFLOW_ENABLE_AUTOMATION=true

# Security Configuration
# Enable dangerous mode (skip permissions) - USE WITH CAUTION
ENABLE_DANGEROUS_MODE=false
# Session encryption key (generate with: openssl rand -base64 32)
SESSION_ENCRYPTION_KEY=
# JWT secret for API authentication
JWT_SECRET=

# Database Configuration (for session persistence)
DB_TYPE=sqlite
DB_PATH=./data/llm-agent.db
# For PostgreSQL:
# DB_TYPE=postgres
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=llm_agent
# DB_USER=postgres
# DB_PASSWORD=

# Redis Configuration (optional, for distributed sessions)
REDIS_ENABLED=false
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Monitoring Configuration
ENABLE_METRICS=true
METRICS_PORT=9090
ENABLE_TRACING=false
JAEGER_ENDPOINT=http://localhost:14268/api/traces

# Development Configuration
DEV_MODE=true
DEV_HOT_RELOAD=true
DEV_VERBOSE_LOGGING=false

# Testing Configuration
TEST_TIMEOUT=30000
TEST_RETRIES=3
TEST_PARALLEL=true
EOF

echo -e "${GREEN}✓ Created $ENV_TEMPLATE${NC}"

# Create .env.development
cat > "$CONFIG_DIR/.env.development" << 'EOF'
# Development Environment Overrides
NODE_ENV=development
LOG_LEVEL=debug
DEV_MODE=true
DEV_HOT_RELOAD=true
DEV_VERBOSE_LOGGING=true
ENABLE_DANGEROUS_MODE=true
EOF

echo -e "${GREEN}✓ Created $CONFIG_DIR/.env.development${NC}"

# Create .env.production
cat > "$CONFIG_DIR/.env.production" << 'EOF'
# Production Environment Overrides
NODE_ENV=production
LOG_LEVEL=warn
DEV_MODE=false
DEV_HOT_RELOAD=false
DEV_VERBOSE_LOGGING=false
ENABLE_DANGEROUS_MODE=false
ENABLE_METRICS=true
ENABLE_TRACING=true
EOF

echo -e "${GREEN}✓ Created $CONFIG_DIR/.env.production${NC}"

# Create .env.test
cat > "$CONFIG_DIR/.env.test" << 'EOF'
# Test Environment Overrides
NODE_ENV=test
LOG_LEVEL=error
DB_TYPE=sqlite
DB_PATH=:memory:
REDIS_ENABLED=false
TEST_TIMEOUT=60000
ENABLE_DANGEROUS_MODE=true
EOF

echo -e "${GREEN}✓ Created $CONFIG_DIR/.env.test${NC}"

# Create .gitignore for config directory
cat > "$CONFIG_DIR/.gitignore" << 'EOF'
# Ignore actual environment files
.env
.env.local
.env.*.local

# Keep templates
!.env.template
!.env.development
!.env.production
!.env.test
EOF

echo -e "${GREEN}✓ Created $CONFIG_DIR/.gitignore${NC}"

echo -e "\n${GREEN}✅ Environment configuration generated!${NC}"
echo -e "\nNext steps:"
echo -e "1. Copy template: ${YELLOW}cp $ENV_TEMPLATE $EPIC_ROOT/.env${NC}"
echo -e "2. Edit the .env file with your actual values"
echo -e "3. For development: ${YELLOW}cp $CONFIG_DIR/.env.development $EPIC_ROOT/.env.development.local${NC}"