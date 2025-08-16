#!/bin/bash
# Install vLLM for high-performance inference

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "⚡ Installing vLLM..."
echo "===================="

# Check Python version
if ! command -v python3 >/dev/null 2>&1; then
    echo -e "${RED}Error: Python 3 is required${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
echo -e "${GREEN}Python $PYTHON_VERSION detected${NC}"

# Check for CUDA
if command -v nvidia-smi >/dev/null 2>&1; then
    echo -e "${GREEN}✓ NVIDIA GPU detected${NC}"
    nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv
    
    # Get CUDA version
    CUDA_VERSION=$(nvidia-smi | grep "CUDA Version" | awk '{print $9}' | cut -d'.' -f1,2)
    echo -e "${GREEN}CUDA Version: $CUDA_VERSION${NC}"
    
    # Install vLLM with CUDA support
    echo -e "\n${YELLOW}Installing vLLM with CUDA support...${NC}"
    uv uv pip install vllm
    
else
    echo -e "${YELLOW}No NVIDIA GPU detected${NC}"
    echo -e "${YELLOW}Installing vLLM with CPU support (limited functionality)...${NC}"
    uv uv pip install vllm-cpu
fi

# Install additional dependencies
echo -e "\n${YELLOW}Installing additional dependencies...${NC}"
uv uv pip install transformers accelerate

# Create vLLM service script
VLLM_SERVICE_PATH="/usr/local/bin/vllm-server"
echo -e "\n${YELLOW}Creating vLLM service script...${NC}"

sudo tee $VLLM_SERVICE_PATH > /dev/null << 'EOF'
#!/bin/bash
# vLLM Server Runner

MODEL=${1:-"NousResearch/Nous-Hermes-2-Yi-34B"}
PORT=${2:-8000}
GPU_MEMORY=${3:-0.9}

echo "Starting vLLM server..."
echo "Model: $MODEL"
echo "Port: $PORT"
echo "GPU Memory Utilization: $GPU_MEMORY"

python -m vllm.entrypoints.openai.api_server \
    --model "$MODEL" \
    --port $PORT \
    --gpu-memory-utilization $GPU_MEMORY \
    --max-model-len 8192
EOF

sudo chmod +x $VLLM_SERVICE_PATH

# Create systemd service (optional)
if command -v systemctl >/dev/null 2>&1; then
    echo -e "\n${YELLOW}Creating systemd service...${NC}"
    
    sudo tee /etc/systemd/system/vllm.service > /dev/null << EOF
[Unit]
Description=vLLM OpenAI Compatible API Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$HOME
ExecStart=$VLLM_SERVICE_PATH
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    echo -e "${GREEN}✓ Systemd service created${NC}"
    echo -e "To enable auto-start: ${YELLOW}sudo systemctl enable vllm${NC}"
    echo -e "To start now: ${YELLOW}sudo systemctl start vllm${NC}"
fi

echo -e "\n${GREEN}✅ vLLM installation complete!${NC}"
echo -e "\nTo start vLLM server manually:"
echo -e "${YELLOW}vllm-server [model_name] [port] [gpu_memory_fraction]${NC}"
echo -e "\nExample:"
echo -e "${YELLOW}vllm-server deepseek-ai/deepseek-coder-6.7b-instruct 8000 0.9${NC}"