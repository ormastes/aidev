#!/bin/bash

##
# Install external tools required for circular dependency detection
##

set -e

echo "🔧 Installing Circular Dependency Detection Tools..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Install Node.js tools
install_node_tools() {
    print_status "Installing Node.js tools..."
    
    if ! command_exists npm; then
        print_error "npm not found. Please install Node.js first."
        return 1
    fi
    
    # Install global tools
    npm install -g madge dependency-cruiser
    
    # Try to install ds tool
    if npm install -g ds 2>/dev/null; then
        print_success "ds tool installed"
    else
        print_warning "Failed to install ds tool (optional)"
    fi
    
    print_success "Node.js tools installed"
}

# Install Python tools
install_python_tools() {
    print_status "Installing Python tools..."
    
    # Try different Python package managers
    if command_exists pip3; then
        PIP_CMD="pip3"
    elif command_exists pip; then
        PIP_CMD="pip"
    else
        print_error "pip not found. Please install Python and pip first."
        return 1
    fi
    
    # Install Python tools
    $PIP_CMD install --user pylint pycycle || print_warning "Some Python tools failed to install"
    
    # Try to install circular-imports
    if $PIP_CMD install --user circular-imports 2>/dev/null; then
        print_success "circular-imports tool installed"
    else
        print_warning "circular-imports tool not available (optional)"
    fi
    
    print_success "Python tools installed"
}

# Install C++ tools
install_cpp_tools() {
    print_status "Installing C++ tools..."
    
    # Check for package managers
    if command_exists apt-get; then
        # Ubuntu/Debian
        print_status "Detected Debian-based system, installing clang-tidy..."
        sudo apt-get update
        sudo apt-get install -y clang-tidy
    elif command_exists yum; then
        # RHEL/CentOS/Fedora
        print_status "Detected RHEL-based system, installing clang-tools-extra..."
        sudo yum install -y clang-tools-extra
    elif command_exists brew; then
        # macOS with Homebrew
        print_status "Detected macOS with Homebrew, installing llvm..."
        brew install llvm
    elif command_exists pacman; then
        # Arch Linux
        print_status "Detected Arch Linux, installing clang..."
        sudo pacman -S --noconfirm clang
    else
        print_warning "Unknown package manager. Please install clang-tidy manually."
    fi
    
    # Try to install cpp-dependencies via pip
    if command_exists pip3; then
        uv pip install --user cpp-dependencies 2>/dev/null || print_warning "cpp-dependencies not available (optional)"
    fi
    
    print_success "C++ tools installation attempted"
}

# Install Graphviz for visualization
install_graphviz() {
    print_status "Installing Graphviz for visualization..."
    
    if command_exists dot; then
        print_success "Graphviz already installed"
        return 0
    fi
    
    if command_exists apt-get; then
        sudo apt-get install -y graphviz
    elif command_exists yum; then
        sudo yum install -y graphviz
    elif command_exists brew; then
        brew install graphviz
    elif command_exists pacman; then
        sudo pacman -S --noconfirm graphviz
    else
        print_warning "Please install Graphviz manually for visualization support"
        return 1
    fi
    
    print_success "Graphviz installed"
}

# Verify installations
verify_installations() {
    print_status "Verifying installations..."
    
    echo
    echo "✅ Tool Installation Status:"
    echo "==============================="
    
    # Node.js tools
    if command_exists madge; then
        echo "✓ madge: $(madge --version)"
    else
        echo "✗ madge: Not found"
    fi
    
    if command_exists depcruise; then
        echo "✓ dependency-cruiser: $(depcruise --version)"
    else
        echo "✗ dependency-cruiser: Not found"
    fi
    
    if command_exists ds; then
        echo "✓ ds: Available"
    else
        echo "✗ ds: Not found (optional)"
    fi
    
    # Python tools
    if command_exists pylint; then
        echo "✓ pylint: $(pylint --version | head -n1)"
    else
        echo "✗ pylint: Not found"
    fi
    
    if command_exists pycycle; then
        echo "✓ pycycle: Available"
    else
        echo "✗ pycycle: Not found"
    fi
    
    # C++ tools
    if command_exists clang-tidy; then
        echo "✓ clang-tidy: $(clang-tidy --version | head -n1)"
    else
        echo "✗ clang-tidy: Not found"
    fi
    
    # Graphviz
    if command_exists dot; then
        echo "✓ graphviz: $(dot -V 2>&1 | head -n1)"
    else
        echo "✗ graphviz: Not found (visualization disabled)"
    fi
    
    echo
}

# Main installation process
main() {
    print_status "Starting tool installation process..."
    echo
    
    # Install tools by category
    install_node_tools
    echo
    
    install_python_tools
    echo
    
    install_cpp_tools  
    echo
    
    install_graphviz
    echo
    
    # Verify installations
    verify_installations
    
    print_success "Installation process completed!"
    echo
    print_status "You can now use the circular dependency detection tool."
    print_status "Run 'npm run build' to build the project."
    print_status "Run 'npm run cli -- --help' to see available commands."
}

# Handle script arguments
case "${1:-}" in
    --node-only)
        install_node_tools
        ;;
    --python-only)
        install_python_tools
        ;;
    --cpp-only)
        install_cpp_tools
        ;;
    --graphviz-only)
        install_graphviz
        ;;
    --verify)
        verify_installations
        ;;
    *)
        main
        ;;
esac