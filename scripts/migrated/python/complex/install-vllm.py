#!/usr/bin/env python3
"""
Migrated from: install-vllm.sh
Auto-generated Python - 2025-08-16T04:57:27.776Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Install vLLM for high-performance inference
    subprocess.run("set -e", shell=True)
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("NC='\033[0m'", shell=True)
    print("⚡ Installing vLLM...")
    print("====================")
    # Check Python version
    subprocess.run("if ! command -v python3 >/dev/null 2>&1; then", shell=True)
    print("-e ")${RED}Error: Python 3 is required${NC}"
    sys.exit(1)
    subprocess.run("PYTHON_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')", shell=True)
    print("-e ")${GREEN}Python $PYTHON_VERSION detected${NC}"
    # Check for CUDA
    subprocess.run("if command -v nvidia-smi >/dev/null 2>&1; then", shell=True)
    print("-e ")${GREEN}✓ NVIDIA GPU detected${NC}"
    subprocess.run("nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv", shell=True)
    # Get CUDA version
    subprocess.run("CUDA_VERSION=$(nvidia-smi | grep "CUDA Version" | awk '{print $9}' | cut -d'.' -f1,2)", shell=True)
    print("-e ")${GREEN}CUDA Version: $CUDA_VERSION${NC}"
    # Install vLLM with CUDA support
    print("-e ")\n${YELLOW}Installing vLLM with CUDA support...${NC}"
    subprocess.run("uv uv pip install vllm", shell=True)
    else:
    print("-e ")${YELLOW}No NVIDIA GPU detected${NC}"
    print("-e ")${YELLOW}Installing vLLM with CPU support (limited functionality)...${NC}"
    subprocess.run("uv uv pip install vllm-cpu", shell=True)
    # Install additional dependencies
    print("-e ")\n${YELLOW}Installing additional dependencies...${NC}"
    subprocess.run("uv uv pip install transformers accelerate", shell=True)
    # Create vLLM service script
    subprocess.run("VLLM_SERVICE_PATH="/usr/local/bin/vllm-server"", shell=True)
    print("-e ")\n${YELLOW}Creating vLLM service script...${NC}"
    subprocess.run("sudo tee $VLLM_SERVICE_PATH > /dev/null << 'EOF'", shell=True)
    # vLLM Server Runner
    subprocess.run("MODEL=${1:-"NousResearch/Nous-Hermes-2-Yi-34B"}", shell=True)
    subprocess.run("PORT=${2:-8000}", shell=True)
    subprocess.run("GPU_MEMORY=${3:-0.9}", shell=True)
    print("Starting vLLM server...")
    print("Model: $MODEL")
    print("Port: $PORT")
    print("GPU Memory Utilization: $GPU_MEMORY")
    subprocess.run("python -m vllm.entrypoints.openai.api_server \", shell=True)
    subprocess.run("--model "$MODEL" \", shell=True)
    subprocess.run("--port $PORT \", shell=True)
    subprocess.run("--gpu-memory-utilization $GPU_MEMORY \", shell=True)
    subprocess.run("--max-model-len 8192", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("sudo chmod +x $VLLM_SERVICE_PATH", shell=True)
    # Create systemd service (optional)
    subprocess.run("if command -v systemctl >/dev/null 2>&1; then", shell=True)
    print("-e ")\n${YELLOW}Creating systemd service...${NC}"
    subprocess.run("sudo tee /etc/systemd/system/vllm.service > /dev/null << EOF", shell=True)
    subprocess.run("[Unit]", shell=True)
    subprocess.run("Description=vLLM OpenAI Compatible API Server", shell=True)
    subprocess.run("After=network.target", shell=True)
    subprocess.run("[Service]", shell=True)
    subprocess.run("Type=simple", shell=True)
    subprocess.run("User=$USER", shell=True)
    subprocess.run("WorkingDirectory=$HOME", shell=True)
    subprocess.run("ExecStart=$VLLM_SERVICE_PATH", shell=True)
    subprocess.run("Restart=on-failure", shell=True)
    subprocess.run("RestartSec=10", shell=True)
    subprocess.run("[Install]", shell=True)
    subprocess.run("WantedBy=multi-user.target", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("sudo systemctl daemon-reload", shell=True)
    print("-e ")${GREEN}✓ Systemd service created${NC}"
    print("-e ")To enable auto-start: ${YELLOW}sudo systemctl enable vllm${NC}"
    print("-e ")To start now: ${YELLOW}sudo systemctl start vllm${NC}"
    print("-e ")\n${GREEN}✅ vLLM installation complete!${NC}"
    print("-e ")\nTo start vLLM server manually:"
    print("-e ")${YELLOW}vllm-server [model_name] [port] [gpu_memory_fraction]${NC}"
    print("-e ")\nExample:"
    print("-e ")${YELLOW}vllm-server deepseek-ai/deepseek-coder-6.7b-instruct 8000 0.9${NC}"

if __name__ == "__main__":
    main()