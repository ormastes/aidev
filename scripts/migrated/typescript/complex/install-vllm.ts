#!/usr/bin/env bun
/**
 * Migrated from: install-vllm.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.776Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Install vLLM for high-performance inference
  await $`set -e`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`RED='\033[0;31m'`;
  await $`NC='\033[0m'`;
  console.log("⚡ Installing vLLM...");
  console.log("====================");
  // Check Python version
  await $`if ! command -v python3 >/dev/null 2>&1; then`;
  console.log("-e ");${RED}Error: Python 3 is required${NC}"
  process.exit(1);
  }
  await $`PYTHON_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')`;
  console.log("-e ");${GREEN}Python $PYTHON_VERSION detected${NC}"
  // Check for CUDA
  await $`if command -v nvidia-smi >/dev/null 2>&1; then`;
  console.log("-e ");${GREEN}✓ NVIDIA GPU detected${NC}"
  await $`nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv`;
  // Get CUDA version
  await $`CUDA_VERSION=$(nvidia-smi | grep "CUDA Version" | awk '{print $9}' | cut -d'.' -f1,2)`;
  console.log("-e ");${GREEN}CUDA Version: $CUDA_VERSION${NC}"
  // Install vLLM with CUDA support
  console.log("-e ");\n${YELLOW}Installing vLLM with CUDA support...${NC}"
  await $`uv uv pip install vllm`;
  } else {
  console.log("-e ");${YELLOW}No NVIDIA GPU detected${NC}"
  console.log("-e ");${YELLOW}Installing vLLM with CPU support (limited functionality)...${NC}"
  await $`uv uv pip install vllm-cpu`;
  }
  // Install additional dependencies
  console.log("-e ");\n${YELLOW}Installing additional dependencies...${NC}"
  await $`uv uv pip install transformers accelerate`;
  // Create vLLM service script
  await $`VLLM_SERVICE_PATH="/usr/local/bin/vllm-server"`;
  console.log("-e ");\n${YELLOW}Creating vLLM service script...${NC}"
  await $`sudo tee $VLLM_SERVICE_PATH > /dev/null << 'EOF'`;
  // vLLM Server Runner
  await $`MODEL=${1:-"NousResearch/Nous-Hermes-2-Yi-34B"}`;
  await $`PORT=${2:-8000}`;
  await $`GPU_MEMORY=${3:-0.9}`;
  console.log("Starting vLLM server...");
  console.log("Model: $MODEL");
  console.log("Port: $PORT");
  console.log("GPU Memory Utilization: $GPU_MEMORY");
  await $`python -m vllm.entrypoints.openai.api_server \`;
  await $`--model "$MODEL" \`;
  await $`--port $PORT \`;
  await $`--gpu-memory-utilization $GPU_MEMORY \`;
  await $`--max-model-len 8192`;
  await $`EOF`;
  await $`sudo chmod +x $VLLM_SERVICE_PATH`;
  // Create systemd service (optional)
  await $`if command -v systemctl >/dev/null 2>&1; then`;
  console.log("-e ");\n${YELLOW}Creating systemd service...${NC}"
  await $`sudo tee /etc/systemd/system/vllm.service > /dev/null << EOF`;
  await $`[Unit]`;
  await $`Description=vLLM OpenAI Compatible API Server`;
  await $`After=network.target`;
  await $`[Service]`;
  await $`Type=simple`;
  await $`User=$USER`;
  await $`WorkingDirectory=$HOME`;
  await $`ExecStart=$VLLM_SERVICE_PATH`;
  await $`Restart=on-failure`;
  await $`RestartSec=10`;
  await $`[Install]`;
  await $`WantedBy=multi-user.target`;
  await $`EOF`;
  await $`sudo systemctl daemon-reload`;
  console.log("-e ");${GREEN}✓ Systemd service created${NC}"
  console.log("-e ");To enable auto-start: ${YELLOW}sudo systemctl enable vllm${NC}"
  console.log("-e ");To start now: ${YELLOW}sudo systemctl start vllm${NC}"
  }
  console.log("-e ");\n${GREEN}✅ vLLM installation complete!${NC}"
  console.log("-e ");\nTo start vLLM server manually:"
  console.log("-e ");${YELLOW}vllm-server [model_name] [port] [gpu_memory_fraction]${NC}"
  console.log("-e ");\nExample:"
  console.log("-e ");${YELLOW}vllm-server deepseek-ai/deepseek-coder-6.7b-instruct 8000 0.9${NC}"
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}