#!/usr/bin/env bun
/**
 * Migrated from: generate-env.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.758Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Generate environment configuration template
  await $`set -e`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`NC='\033[0m'`;
  console.log("🔧 Generating environment configuration...");
  console.log("========================================");
  await $`EPIC_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"`;
  await $`CONFIG_DIR="$EPIC_ROOT/init/config"`;
  await $`ENV_TEMPLATE="$CONFIG_DIR/.env.template"`;
  // Create .env.template
  await $`cat > "$ENV_TEMPLATE" << 'EOF'`;
  // LLM Agent Epic Environment Configuration
  // Copy this file to .env and fill in your values
  // Environment
  await $`NODE_ENV=development`;
  await $`LOG_LEVEL=info`;
  // Epic Configuration
  await $`EPIC_ROOT=/path/to/layer/epics/llm-agent`;
  await $`THEMES_ROOT=/path/to/layer/themes`;
  // Claude Configuration
  await $`CLAUDE_API_KEY=your-claude-api-key-here`;
  await $`CLAUDE_MODEL=claude-opus-4-20250514`;
  await $`CLAUDE_MAX_TOKENS=4096`;
  await $`CLAUDE_TEMPERATURE=0.7`;
  // Use local Claude authentication (from ~/.claude/.credentials.json)
  await $`CLAUDE_USE_LOCAL_AUTH=true`;
  // Ollama Configuration
  await $`OLLAMA_HOST=http://localhost:11434`;
  await $`OLLAMA_MODEL=deepseek-r1:14b`;
  await $`OLLAMA_NUM_CTX=4096`;
  await $`OLLAMA_TEMPERATURE=0.7`;
  // Auto-start Ollama server if not running
  await $`OLLAMA_AUTO_START=true`;
  // vLLM Configuration
  await $`VLLM_HOST=http://localhost:8000`;
  await $`VLLM_MODEL=deepseek-ai/deepseek-coder-6.7b-instruct`;
  await $`VLLM_GPU_MEMORY_UTILIZATION=0.9`;
  await $`VLLM_MAX_MODEL_LEN=8192`;
  // Auto-start vLLM server if not running
  await $`VLLM_AUTO_START=false`;
  // MCP Server Configuration
  await $`MCP_SERVER_PORT=3456`;
  await $`MCP_SERVER_NAME=llm-agent-mcp`;
  await $`MCP_DEFAULT_PLATFORM=claude`;
  // Enable multiple platforms simultaneously
  await $`MCP_ENABLE_CLAUDE=true`;
  await $`MCP_ENABLE_OLLAMA=true`;
  await $`MCP_ENABLE_VLLM=true`;
  // Chat Space Configuration
  await $`CHAT_SPACE_PORT=3457`;
  await $`CHAT_SPACE_DEFAULT_ROOM=general`;
  await $`CHAT_SPACE_ENABLE_HISTORY=true`;
  await $`CHAT_SPACE_MAX_HISTORY=1000`;
  // PocketFlow Configuration
  await $`POCKETFLOW_PORT=3458`;
  await $`POCKETFLOW_WORKFLOW_DIR=./workflows`;
  await $`POCKETFLOW_ENABLE_AUTOMATION=true`;
  // Security Configuration
  // Enable dangerous mode (skip permissions) - USE WITH CAUTION
  await $`ENABLE_DANGEROUS_MODE=false`;
  // Session encryption key (generate with: openssl rand -base64 32)
  await $`SESSION_ENCRYPTION_KEY=`;
  // JWT secret for API authentication
  await $`JWT_SECRET=`;
  // Database Configuration (for session persistence)
  await $`DB_TYPE=sqlite`;
  await $`DB_PATH=./data/llm-agent.db`;
  // For PostgreSQL:
  // DB_TYPE=postgres
  // DB_HOST=localhost
  // DB_PORT=5432
  // DB_NAME=llm_agent
  // DB_USER=postgres
  // DB_PASSWORD=
  // Redis Configuration (optional, for distributed sessions)
  await $`REDIS_ENABLED=false`;
  await $`REDIS_HOST=localhost`;
  await $`REDIS_PORT=6379`;
  await $`REDIS_PASSWORD=`;
  // Monitoring Configuration
  await $`ENABLE_METRICS=true`;
  await $`METRICS_PORT=9090`;
  await $`ENABLE_TRACING=false`;
  await $`JAEGER_ENDPOINT=http://localhost:14268/api/traces`;
  // Development Configuration
  await $`DEV_MODE=true`;
  await $`DEV_HOT_RELOAD=true`;
  await $`DEV_VERBOSE_LOGGING=false`;
  // Testing Configuration
  await $`TEST_TIMEOUT=30000`;
  await $`TEST_RETRIES=3`;
  await $`TEST_PARALLEL=true`;
  await $`EOF`;
  console.log("-e ");${GREEN}✓ Created $ENV_TEMPLATE${NC}"
  // Create .env.development
  await $`cat > "$CONFIG_DIR/.env.development" << 'EOF'`;
  // Development Environment Overrides
  await $`NODE_ENV=development`;
  await $`LOG_LEVEL=debug`;
  await $`DEV_MODE=true`;
  await $`DEV_HOT_RELOAD=true`;
  await $`DEV_VERBOSE_LOGGING=true`;
  await $`ENABLE_DANGEROUS_MODE=true`;
  await $`EOF`;
  console.log("-e ");${GREEN}✓ Created $CONFIG_DIR/.env.development${NC}"
  // Create .env.production
  await $`cat > "$CONFIG_DIR/.env.production" << 'EOF'`;
  // Production Environment Overrides
  await $`NODE_ENV=production`;
  await $`LOG_LEVEL=warn`;
  await $`DEV_MODE=false`;
  await $`DEV_HOT_RELOAD=false`;
  await $`DEV_VERBOSE_LOGGING=false`;
  await $`ENABLE_DANGEROUS_MODE=false`;
  await $`ENABLE_METRICS=true`;
  await $`ENABLE_TRACING=true`;
  await $`EOF`;
  console.log("-e ");${GREEN}✓ Created $CONFIG_DIR/.env.production${NC}"
  // Create .env.test
  await $`cat > "$CONFIG_DIR/.env.test" << 'EOF'`;
  // Test Environment Overrides
  await $`NODE_ENV=test`;
  await $`LOG_LEVEL=error`;
  await $`DB_TYPE=sqlite`;
  await $`DB_PATH=:memory:`;
  await $`REDIS_ENABLED=false`;
  await $`TEST_TIMEOUT=60000`;
  await $`ENABLE_DANGEROUS_MODE=true`;
  await $`EOF`;
  console.log("-e ");${GREEN}✓ Created $CONFIG_DIR/.env.test${NC}"
  // Create .gitignore for config directory
  await $`cat > "$CONFIG_DIR/.gitignore" << 'EOF'`;
  // Ignore actual environment files
  await $`.env`;
  await $`.env.local`;
  await $`.env.*.local`;
  // Keep templates
  await $`!.env.template`;
  await $`!.env.development`;
  await $`!.env.production`;
  await $`!.env.test`;
  await $`EOF`;
  console.log("-e ");${GREEN}✓ Created $CONFIG_DIR/.gitignore${NC}"
  console.log("-e ");\n${GREEN}✅ Environment configuration generated!${NC}"
  console.log("-e ");\nNext steps:"
  console.log("-e ");1. Copy template: ${YELLOW}cp $ENV_TEMPLATE $EPIC_ROOT/.env${NC}"
  console.log("-e ");2. Edit the .env file with your actual values"
  console.log("-e ");3. For development: ${YELLOW}cp $CONFIG_DIR/.env.development $EPIC_ROOT/.env.development.local${NC}"
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}