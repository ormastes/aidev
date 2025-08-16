#!/bin/bash
set -e

echo "Installing C++ development tools..."

# Update package list
sudo apt-get update

# Install Clang
if ! command -v clang &> /dev/null; then
    echo "Installing Clang..."
    sudo apt-get install -y clang clang-tools
else
    echo "Clang already installed: $(clang --version | head -n1)"
fi

# Install CMake
if ! command -v cmake &> /dev/null; then
    echo "Installing CMake..."
    sudo apt-get install -y cmake
else
    echo "CMake already installed: $(cmake --version | head -n1)"
fi

# Install Ninja
if ! command -v ninja &> /dev/null; then
    echo "Installing Ninja..."
    sudo apt-get install -y ninja-build
else
    echo "Ninja already installed: $(ninja --version)"
fi

# Install Conan
if ! command -v conan &> /dev/null; then
    echo "Installing Conan..."
    pip install --user conan
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
    export PATH="$HOME/.local/bin:$PATH"
else
    echo "Conan already installed: $(conan --version)"
fi

# Install mold linker
if ! command -v mold &> /dev/null; then
    echo "Installing mold linker from source..."
    
    # Install dependencies
    sudo apt-get install -y build-essential git cmake libssl-dev libxxhash-dev zlib1g-dev
    
    # Clone and build mold
    cd /tmp
    git clone https://github.com/rui314/mold.git
    cd mold
    git checkout v2.4.0  # Use stable version
    cmake -B build -DCMAKE_BUILD_TYPE=Release -DCMAKE_CXX_COMPILER=c++
    cmake --build build -j$(nproc)
    sudo cmake --install build
    cd /
    rm -rf /tmp/mold
else
    echo "mold already installed: $(mold --version | head -n1)"
fi

echo "\nInstallation complete!"
echo "Installed tools:"
clang --version | head -n1
cmake --version | head -n1
echo "Ninja: $(ninja --version)"
conan --version 2>/dev/null || echo "Conan: not in PATH (may need to restart shell)"
mold --version 2>/dev/null | head -n1 || echo "mold: installation may have failed"

echo "\nNote: You may need to restart your shell or run 'source ~/.bashrc' for PATH updates."