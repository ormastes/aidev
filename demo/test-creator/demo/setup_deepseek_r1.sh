#!/bin/bash
# Setup script for DeepSeek R1 Test Generator Demo

echo "=========================================="
echo "DeepSeek R1 Test Generator Setup"
echo "=========================================="

# Check if running on Linux/Mac
if [[ "$OSTYPE" == "linux-gnu"* ]] || [[ "$OSTYPE" == "darwin"* ]]; then
    echo "✓ Compatible OS detected: $OSTYPE"
else
    echo "⚠ Warning: This script is designed for Linux/Mac. Windows users should use WSL."
fi

# Step 1: Check Python
echo -e "\n[1/5] Checking Python installation..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo "✓ Python installed: $PYTHON_VERSION"
else
    echo "✗ Python 3 not found. Please install Python 3.8 or higher."
    exit 1
fi

# Step 2: Install Python dependencies
echo -e "\n[2/5] Installing Python dependencies..."
uv pip install --user libclang 2>/dev/null || echo "⚠ libclang installation failed (optional)"

# Step 3: Check/Install Ollama
echo -e "\n[3/5] Checking Ollama installation..."
if command -v ollama &> /dev/null; then
    echo "✓ Ollama is already installed"
else
    echo "✗ Ollama not found. Installing..."
    echo "Please visit https://ollama.ai for installation instructions"
    echo ""
    echo "Quick install for Linux/Mac:"
    echo "curl -fsSL https://ollama.ai/install.sh | sh"
    echo ""
    read -p "Press Enter after installing Ollama to continue..."
fi

# Step 4: Pull DeepSeek R1 model
echo -e "\n[4/5] Pulling DeepSeek R1 model..."
if command -v ollama &> /dev/null; then
    echo "This will download the DeepSeek R1 7B model (~4GB)"
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ollama pull deepseek-r1:7b
        if [ $? -eq 0 ]; then
            echo "✓ DeepSeek R1 model downloaded successfully"
        else
            echo "✗ Failed to download model. Please check your internet connection."
        fi
    else
        echo "⚠ Skipping model download. You'll need to run: ollama pull deepseek-r1:7b"
    fi
else
    echo "⚠ Ollama not available. Skipping model download."
fi

# Step 5: Verify setup
echo -e "\n[5/5] Verifying setup..."
echo "Checking components:"

# Check Python
python3 -c "print('✓ Python: OK')" 2>/dev/null || echo "✗ Python: FAILED"

# Check Ollama
if command -v ollama &> /dev/null; then
    echo "✓ Ollama: OK"
    # Check if model is available
    if ollama list | grep -q "deepseek-r1:7b"; then
        echo "✓ DeepSeek R1 Model: OK"
    else
        echo "✗ DeepSeek R1 Model: NOT FOUND"
    fi
else
    echo "✗ Ollama: NOT FOUND"
fi

# Check test generator
if [ -f "../test_case_generator_llm.py" ]; then
    echo "✓ Test Generator: OK"
else
    echo "✗ Test Generator: NOT FOUND"
fi

echo -e "\n=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "To run the demo:"
echo "  ./run_demo.sh"
echo ""
echo "To manually test:"
echo "  python3 ../test_case_generator_llm.py -t src -m mocks -o output"
echo ""