#!/usr/bin/env python3
"""
Migrated from: generate-env.sh
Auto-generated Python - 2025-08-16T04:57:27.758Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Generate environment configuration template
    subprocess.run("set -e", shell=True)
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("NC='\033[0m'", shell=True)
    print("🔧 Generating environment configuration...")
    print("========================================")
    subprocess.run("EPIC_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"", shell=True)
    subprocess.run("CONFIG_DIR="$EPIC_ROOT/init/config"", shell=True)
    subprocess.run("ENV_TEMPLATE="$CONFIG_DIR/.env.template"", shell=True)
    # Create .env.template
    subprocess.run("cat > "$ENV_TEMPLATE" << 'EOF'", shell=True)
    # LLM Agent Epic Environment Configuration
    # Copy this file to .env and fill in your values
    # Environment
    subprocess.run("NODE_ENV=development", shell=True)
    subprocess.run("LOG_LEVEL=info", shell=True)
    # Epic Configuration
    subprocess.run("EPIC_ROOT=/path/to/layer/epics/llm-agent", shell=True)
    subprocess.run("THEMES_ROOT=/path/to/layer/themes", shell=True)
    # Claude Configuration
    subprocess.run("CLAUDE_API_KEY=your-claude-api-key-here", shell=True)
    subprocess.run("CLAUDE_MODEL=claude-opus-4-20250514", shell=True)
    subprocess.run("CLAUDE_MAX_TOKENS=4096", shell=True)
    subprocess.run("CLAUDE_TEMPERATURE=0.7", shell=True)
    # Use local Claude authentication (from ~/.claude/.credentials.json)
    subprocess.run("CLAUDE_USE_LOCAL_AUTH=true", shell=True)
    # Ollama Configuration
    subprocess.run("OLLAMA_HOST=http://localhost:11434", shell=True)
    subprocess.run("OLLAMA_MODEL=deepseek-r1:14b", shell=True)
    subprocess.run("OLLAMA_NUM_CTX=4096", shell=True)
    subprocess.run("OLLAMA_TEMPERATURE=0.7", shell=True)
    # Auto-start Ollama server if not running
    subprocess.run("OLLAMA_AUTO_START=true", shell=True)
    # vLLM Configuration
    subprocess.run("VLLM_HOST=http://localhost:8000", shell=True)
    subprocess.run("VLLM_MODEL=deepseek-ai/deepseek-coder-6.7b-instruct", shell=True)
    subprocess.run("VLLM_GPU_MEMORY_UTILIZATION=0.9", shell=True)
    subprocess.run("VLLM_MAX_MODEL_LEN=8192", shell=True)
    # Auto-start vLLM server if not running
    subprocess.run("VLLM_AUTO_START=false", shell=True)
    # MCP Server Configuration
    subprocess.run("MCP_SERVER_PORT=3456", shell=True)
    subprocess.run("MCP_SERVER_NAME=llm-agent-mcp", shell=True)
    subprocess.run("MCP_DEFAULT_PLATFORM=claude", shell=True)
    # Enable multiple platforms simultaneously
    subprocess.run("MCP_ENABLE_CLAUDE=true", shell=True)
    subprocess.run("MCP_ENABLE_OLLAMA=true", shell=True)
    subprocess.run("MCP_ENABLE_VLLM=true", shell=True)
    # Chat Space Configuration
    subprocess.run("CHAT_SPACE_PORT=3457", shell=True)
    subprocess.run("CHAT_SPACE_DEFAULT_ROOM=general", shell=True)
    subprocess.run("CHAT_SPACE_ENABLE_HISTORY=true", shell=True)
    subprocess.run("CHAT_SPACE_MAX_HISTORY=1000", shell=True)
    # PocketFlow Configuration
    subprocess.run("POCKETFLOW_PORT=3458", shell=True)
    subprocess.run("POCKETFLOW_WORKFLOW_DIR=./workflows", shell=True)
    subprocess.run("POCKETFLOW_ENABLE_AUTOMATION=true", shell=True)
    # Security Configuration
    # Enable dangerous mode (skip permissions) - USE WITH CAUTION
    subprocess.run("ENABLE_DANGEROUS_MODE=false", shell=True)
    # Session encryption key (generate with: openssl rand -base64 32)
    subprocess.run("SESSION_ENCRYPTION_KEY=", shell=True)
    # JWT secret for API authentication
    subprocess.run("JWT_SECRET=", shell=True)
    # Database Configuration (for session persistence)
    subprocess.run("DB_TYPE=sqlite", shell=True)
    subprocess.run("DB_PATH=./data/llm-agent.db", shell=True)
    # For PostgreSQL:
    # DB_TYPE=postgres
    # DB_HOST=localhost
    # DB_PORT=5432
    # DB_NAME=llm_agent
    # DB_USER=postgres
    # DB_PASSWORD=
    # Redis Configuration (optional, for distributed sessions)
    subprocess.run("REDIS_ENABLED=false", shell=True)
    subprocess.run("REDIS_HOST=localhost", shell=True)
    subprocess.run("REDIS_PORT=6379", shell=True)
    subprocess.run("REDIS_PASSWORD=", shell=True)
    # Monitoring Configuration
    subprocess.run("ENABLE_METRICS=true", shell=True)
    subprocess.run("METRICS_PORT=9090", shell=True)
    subprocess.run("ENABLE_TRACING=false", shell=True)
    subprocess.run("JAEGER_ENDPOINT=http://localhost:14268/api/traces", shell=True)
    # Development Configuration
    subprocess.run("DEV_MODE=true", shell=True)
    subprocess.run("DEV_HOT_RELOAD=true", shell=True)
    subprocess.run("DEV_VERBOSE_LOGGING=false", shell=True)
    # Testing Configuration
    subprocess.run("TEST_TIMEOUT=30000", shell=True)
    subprocess.run("TEST_RETRIES=3", shell=True)
    subprocess.run("TEST_PARALLEL=true", shell=True)
    subprocess.run("EOF", shell=True)
    print("-e ")${GREEN}✓ Created $ENV_TEMPLATE${NC}"
    # Create .env.development
    subprocess.run("cat > "$CONFIG_DIR/.env.development" << 'EOF'", shell=True)
    # Development Environment Overrides
    subprocess.run("NODE_ENV=development", shell=True)
    subprocess.run("LOG_LEVEL=debug", shell=True)
    subprocess.run("DEV_MODE=true", shell=True)
    subprocess.run("DEV_HOT_RELOAD=true", shell=True)
    subprocess.run("DEV_VERBOSE_LOGGING=true", shell=True)
    subprocess.run("ENABLE_DANGEROUS_MODE=true", shell=True)
    subprocess.run("EOF", shell=True)
    print("-e ")${GREEN}✓ Created $CONFIG_DIR/.env.development${NC}"
    # Create .env.production
    subprocess.run("cat > "$CONFIG_DIR/.env.production" << 'EOF'", shell=True)
    # Production Environment Overrides
    subprocess.run("NODE_ENV=production", shell=True)
    subprocess.run("LOG_LEVEL=warn", shell=True)
    subprocess.run("DEV_MODE=false", shell=True)
    subprocess.run("DEV_HOT_RELOAD=false", shell=True)
    subprocess.run("DEV_VERBOSE_LOGGING=false", shell=True)
    subprocess.run("ENABLE_DANGEROUS_MODE=false", shell=True)
    subprocess.run("ENABLE_METRICS=true", shell=True)
    subprocess.run("ENABLE_TRACING=true", shell=True)
    subprocess.run("EOF", shell=True)
    print("-e ")${GREEN}✓ Created $CONFIG_DIR/.env.production${NC}"
    # Create .env.test
    subprocess.run("cat > "$CONFIG_DIR/.env.test" << 'EOF'", shell=True)
    # Test Environment Overrides
    subprocess.run("NODE_ENV=test", shell=True)
    subprocess.run("LOG_LEVEL=error", shell=True)
    subprocess.run("DB_TYPE=sqlite", shell=True)
    subprocess.run("DB_PATH=:memory:", shell=True)
    subprocess.run("REDIS_ENABLED=false", shell=True)
    subprocess.run("TEST_TIMEOUT=60000", shell=True)
    subprocess.run("ENABLE_DANGEROUS_MODE=true", shell=True)
    subprocess.run("EOF", shell=True)
    print("-e ")${GREEN}✓ Created $CONFIG_DIR/.env.test${NC}"
    # Create .gitignore for config directory
    subprocess.run("cat > "$CONFIG_DIR/.gitignore" << 'EOF'", shell=True)
    # Ignore actual environment files
    subprocess.run(".env", shell=True)
    subprocess.run(".env.local", shell=True)
    subprocess.run(".env.*.local", shell=True)
    # Keep templates
    subprocess.run("!.env.template", shell=True)
    subprocess.run("!.env.development", shell=True)
    subprocess.run("!.env.production", shell=True)
    subprocess.run("!.env.test", shell=True)
    subprocess.run("EOF", shell=True)
    print("-e ")${GREEN}✓ Created $CONFIG_DIR/.gitignore${NC}"
    print("-e ")\n${GREEN}✅ Environment configuration generated!${NC}"
    print("-e ")\nNext steps:"
    print("-e ")1. Copy template: ${YELLOW}cp $ENV_TEMPLATE $EPIC_ROOT/.env${NC}"
    print("-e ")2. Edit the .env file with your actual values"
    print("-e ")3. For development: ${YELLOW}cp $CONFIG_DIR/.env.development $EPIC_ROOT/.env.development.local${NC}"

if __name__ == "__main__":
    main()