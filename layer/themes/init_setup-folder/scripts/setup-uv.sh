#!/bin/bash
# Setup UV package manager for Python development

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}     UV Package Manager Setup Script        ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to get Python version
get_python_version() {
    python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}")'
}

# Check for Python
if ! command_exists python3; then
    echo -e "${RED}✗ Python 3 is required but not installed.${NC}"
    echo -e "${YELLOW}Please install Python 3.10 or later.${NC}"
    exit 1
fi

PYTHON_VERSION=$(get_python_version)
echo -e "${GREEN}✓ Python ${PYTHON_VERSION} detected${NC}"

# Check Python version (minimum 3.10)
PYTHON_MAJOR=$(python3 -c 'import sys; print(sys.version_info.major)')
PYTHON_MINOR=$(python3 -c 'import sys; print(sys.version_info.minor)')

if [[ $PYTHON_MAJOR -lt 3 ]] || [[ $PYTHON_MAJOR -eq 3 && $PYTHON_MINOR -lt 10 ]]; then
    echo -e "${RED}✗ Python 3.10+ is required. Current version: ${PYTHON_VERSION}${NC}"
    exit 1
fi

# Install UV if not present
if ! command_exists uv; then
    echo -e "\n${YELLOW}Installing UV package manager...${NC}"
    
    # Detect OS
    OS="$(uname -s)"
    case "${OS}" in
        Linux*)     
            echo -e "${BLUE}Detected Linux${NC}"
            curl -LsSf https://astral.sh/uv/install.sh | sh
            ;;
        Darwin*)    
            echo -e "${BLUE}Detected macOS${NC}"
            if command_exists brew; then
                brew install uv
            else
                curl -LsSf https://astral.sh/uv/install.sh | sh
            fi
            ;;
        MINGW*|CYGWIN*|MSYS*)
            echo -e "${BLUE}Detected Windows${NC}"
            powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
            ;;
        *)
            echo -e "${RED}Unsupported OS: ${OS}${NC}"
            exit 1
            ;;
    esac
    
    # Add to PATH if needed
    if [[ -f "$HOME/.cargo/env" ]]; then
        source "$HOME/.cargo/env"
    fi
    
    # Verify installation
    if command_exists uv; then
        echo -e "${GREEN}✓ UV installed successfully${NC}"
    else
        echo -e "${RED}✗ UV installation failed${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ UV is already installed${NC}"
fi

# Display UV version
UV_VERSION=$(uv --version 2>/dev/null | cut -d' ' -f2)
echo -e "${BLUE}UV version: ${UV_VERSION}${NC}"

# Create virtual environment with UV
echo -e "\n${YELLOW}Setting up Python virtual environment...${NC}"

if [[ ! -d ".venv" ]]; then
    uv venv .venv
    echo -e "${GREEN}✓ Virtual environment created${NC}"
else
    echo -e "${GREEN}✓ Virtual environment already exists${NC}"
fi

# Activate virtual environment
echo -e "\n${YELLOW}Activating virtual environment...${NC}"
source .venv/bin/activate || source .venv/Scripts/activate 2>/dev/null

# Upgrade pip, setuptools, wheel in the venv
echo -e "\n${YELLOW}Upgrading core packages...${NC}"
uv uv pip install --upgrade pip setuptools wheel

# Install dependencies based on available config files
echo -e "\n${YELLOW}Installing project dependencies...${NC}"

# Check for different dependency files
if [[ -f "pyproject.toml" ]]; then
    echo -e "${BLUE}Found pyproject.toml - installing dependencies...${NC}"
    uv pip sync pyproject.toml
elif [[ -f "requirements.txt" ]]; then
    echo -e "${BLUE}Found requirements.txt - installing dependencies...${NC}"
    uv uv pip install -r requirements.txt
elif [[ -f "uv.toml" ]]; then
    echo -e "${BLUE}Found uv.toml - installing dependencies...${NC}"
    uv sync
fi

# Install development dependencies if available
if [[ -f "requirements-dev.txt" ]]; then
    echo -e "${BLUE}Installing development dependencies...${NC}"
    uv uv pip install -r requirements-dev.txt
fi

# Install optional dependencies
echo -e "\n${YELLOW}Would you like to install optional dependencies? (y/n)${NC}"
read -r INSTALL_OPTIONAL

if [[ "$INSTALL_OPTIONAL" == "y" || "$INSTALL_OPTIONAL" == "Y" ]]; then
    echo -e "${BLUE}Select optional dependencies to install:${NC}"
    echo "1) Development tools (ipython, jupyter, pre-commit)"
    echo "2) ML/AI tools (torch, transformers, vllm)"
    echo "3) Testing tools (pytest plugins, hypothesis)"
    echo "4) Documentation tools (mkdocs, mkdocs-material)"
    echo "5) All optional dependencies"
    echo "6) None"
    
    read -r OPTION
    
    case $OPTION in
        1)
            echo -e "${YELLOW}Installing development tools...${NC}"
            uv uv pip install ipython jupyter notebook pre-commit
            ;;
        2)
            echo -e "${YELLOW}Installing ML/AI tools...${NC}"
            uv uv pip install torch transformers openai langchain
            ;;
        3)
            echo -e "${YELLOW}Installing testing tools...${NC}"
            uv uv pip install pytest-xdist pytest-mock pytest-benchmark hypothesis faker
            ;;
        4)
            echo -e "${YELLOW}Installing documentation tools...${NC}"
            uv uv pip install mkdocs mkdocs-material mkdocstrings[python]
            ;;
        5)
            echo -e "${YELLOW}Installing all optional dependencies...${NC}"
            uv uv pip install ipython jupyter notebook pre-commit \
                          torch transformers openai langchain \
                          pytest-xdist pytest-mock pytest-benchmark hypothesis faker \
                          mkdocs mkdocs-material mkdocstrings[python]
            ;;
        *)
            echo -e "${BLUE}Skipping optional dependencies${NC}"
            ;;
    esac
fi

# Show installed packages
echo -e "\n${YELLOW}Installed packages:${NC}"
uv pip list

# Create activation script
echo -e "\n${YELLOW}Creating activation helper script...${NC}"
cat > activate-uv.sh << 'EOF'
#!/bin/bash
# Quick activation script for UV environment

if [[ -f .venv/bin/activate ]]; then
    source .venv/bin/activate
    echo "✓ Virtual environment activated"
    echo "Python: $(which python)"
    echo "UV: $(which uv)"
elif [[ -f .venv/Scripts/activate ]]; then
    source .venv/Scripts/activate
    echo "✓ Virtual environment activated (Windows)"
else
    echo "✗ Virtual environment not found. Run setup-uv.sh first."
    exit 1
fi
EOF

chmod +x activate-uv.sh

# Setup UV configuration
echo -e "\n${YELLOW}Configuring UV settings...${NC}"

# Create UV config directory if it doesn't exist
mkdir -p ~/.config/uv

# Create or update UV config
cat > ~/.config/uv/config.toml << 'EOF'
# UV Global Configuration

[pip]
# Use system trust store for HTTPS
system-certs = true

# Compile Python files for better performance
compile = true

# Number of parallel downloads
concurrent-downloads = 8

# Number of parallel builds
concurrent-builds = 4

[cache]
# Cache directory
dir = "~/.cache/uv"

# Cache packages
enabled = true

[index]
# Primary index
url = "https://pypi.org/simple"

# Extra indices (uncomment to add more)
# extra-urls = ["https://download.pytorch.org/whl/cpu"]
EOF

echo -e "${GREEN}✓ UV configuration created${NC}"

# Create helpful aliases
echo -e "\n${YELLOW}Setting up helpful aliases...${NC}"

SHELL_RC=""
if [[ -f "$HOME/.bashrc" ]]; then
    SHELL_RC="$HOME/.bashrc"
elif [[ -f "$HOME/.zshrc" ]]; then
    SHELL_RC="$HOME/.zshrc"
fi

if [[ -n "$SHELL_RC" ]]; then
    # Check if aliases already exist
    if ! grep -q "alias uvinstall=" "$SHELL_RC"; then
        cat >> "$SHELL_RC" << 'EOF'

# UV Python Package Manager Aliases
alias uvinstall='uv uv pip install'
alias uvuninstall='uv pip uninstall'
alias uvlist='uv pip list'
alias uvfreeze='uv pip freeze'
alias uvupgrade='uv uv pip install --upgrade'
alias uvenv='source .venv/bin/activate 2>/dev/null || source .venv/Scripts/activate'
alias uvnew='uv venv .venv && uvenv'
alias uvsync='uv pip sync pyproject.toml'
EOF
        echo -e "${GREEN}✓ Aliases added to $SHELL_RC${NC}"
        echo -e "${YELLOW}Run 'source $SHELL_RC' to load aliases${NC}"
    else
        echo -e "${GREEN}✓ Aliases already configured${NC}"
    fi
fi

# Summary
echo -e "\n${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}       UV Setup Complete! 🚀               ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}✓${NC} UV package manager installed and configured"
echo -e "${GREEN}✓${NC} Virtual environment created at .venv"
echo -e "${GREEN}✓${NC} Dependencies installed"
echo -e "${GREEN}✓${NC} Configuration files created"
echo ""
echo -e "${YELLOW}Quick Commands:${NC}"
echo -e "  ${BLUE}Activate environment:${NC} source activate-uv.sh"
echo -e "  ${BLUE}Install package:${NC}      uv uv pip install <package>"
echo -e "  ${BLUE}List packages:${NC}        uv pip list"
echo -e "  ${BLUE}Sync dependencies:${NC}    uv sync"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Activate the environment: ${BLUE}source .venv/bin/activate${NC}"
echo -e "  2. Start developing with fast package management!"
echo ""

# Check for migration from pip
if [[ -f "requirements.txt" ]] && [[ ! -f "uv.toml" ]]; then
    echo -e "${YELLOW}💡 Tip:${NC} Found requirements.txt. To fully migrate to UV:"
    echo -e "   1. Review the created uv.toml configuration"
    echo -e "   2. Run: ${BLUE}uv pip compile requirements.txt -o requirements.lock${NC}"
    echo -e "   3. Use: ${BLUE}uv pip sync requirements.lock${NC} for reproducible installs"
fi