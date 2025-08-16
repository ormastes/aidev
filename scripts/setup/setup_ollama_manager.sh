#!/bin/bash

# Setup script for Ollama Manager

echo "🚀 Setting up Ollama Manager..."

# Make the Python script executable
chmod +x ollama_manager.py

# Test the script
echo "📋 Testing basic functionality..."
python3 ollama_manager.py --list
python3 ollama_manager.py --gpu-status

# Option 1: Run as systemd service (requires sudo)
echo ""
echo "To install as systemd service (auto-start on boot):"
echo "  sudo cp ollama-manager.service /etc/systemd/system/"
echo "  sudo systemctl daemon-reload"
echo "  sudo systemctl enable ollama-manager@$USER"
echo "  sudo systemctl start ollama-manager@$USER"
echo ""

# Option 2: Run in background
echo "To run in background now:"
echo "  nohup python3 ollama_manager.py --monitor --timeout 60 > ollama_manager.log 2>&1 &"
echo ""

# Option 3: Run in screen/tmux
echo "To run in screen session:"
echo "  screen -dmS ollama-manager python3 ollama_manager.py --monitor --timeout 60"
echo ""

echo "✅ Setup complete!"
echo ""
echo "Available commands:"
echo "  ./ollama_manager.py --list                    # List loaded models"
echo "  ./ollama_manager.py --gpu-status              # Show GPU memory"
echo "  ./ollama_manager.py --unload MODEL_NAME       # Manually unload model"
echo "  ./ollama_manager.py --monitor --timeout 60    # Start monitoring"
echo "  ./ollama_manager.py --query 'Your prompt'     # Query with parsed response"