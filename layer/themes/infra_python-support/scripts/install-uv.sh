#!/bin/bash

# UV Installation Script
# Installs UV - the fast Python package installer and resolver

set -e

echo "Installing UV Python package manager..."

# Detect OS
OS="$(uname -s)"
ARCH="$(uname -m)"

# Check if UV is already installed
if command -v uv &> /dev/null; then
    echo "UV is already installed: $(uv --version)"
    exit 0
fi

# Install UV using the official installer
echo "Downloading and installing UV..."

if [ "$OS" = "Darwin" ] || [ "$OS" = "Linux" ]; then
    # Unix-like systems
    curl -LsSf https://astral.sh/uv/install.sh | sh
    
    # Add to PATH if not already there
    if [[ ":$PATH:" != *":$HOME/.cargo/bin:"* ]]; then
        echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.bashrc
        echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.zshrc 2>/dev/null || true
        export PATH="$HOME/.cargo/bin:$PATH"
    fi
elif [ "$OS" = "Windows_NT" ]; then
    # Windows (Git Bash/WSL)
    powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
else
    echo "Unsupported operating system: $OS"
    echo "Please install UV manually from: https://github.com/astral-sh/uv"
    exit 1
fi

# Verify installation
if command -v uv &> /dev/null; then
    echo "UV successfully installed: $(uv --version)"
    
    # Configure UV settings
    echo "Configuring UV..."
    uv config set python-preference only-managed
    uv config set cache-dir .uv-cache
    
    echo "UV installation complete!"
else
    echo "UV installation failed. Please install manually from: https://github.com/astral-sh/uv"
    exit 1
fi