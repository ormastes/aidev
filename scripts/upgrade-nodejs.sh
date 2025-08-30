#!/bin/bash

# Node.js Upgrade Script
# Upgrades Node.js to v20 LTS using various methods

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          Node.js v20 LTS Upgrade Script                  ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check current Node.js version
CURRENT_VERSION=$(node -v 2>/dev/null || echo "not installed")
echo -e "${YELLOW}Current Node.js version:${NC} $CURRENT_VERSION"

# Check if already on v20+
if [[ "$CURRENT_VERSION" =~ ^v2[0-9]\. || "$CURRENT_VERSION" =~ ^v[3-9][0-9]\. ]]; then
    echo -e "${GREEN}✅ Node.js is already at version 20 or higher!${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}Choose installation method:${NC}"
echo "1) Using Node Version Manager (nvm) - Recommended"
echo "2) Using n (Node.js version manager)"
echo "3) Using fnm (Fast Node Manager)"
echo "4) Direct download from nodejs.org"
echo "5) Using system package manager (apt/yum/brew)"
echo ""
read -p "Enter choice (1-5): " choice

case $choice in
    1)
        echo -e "\n${BLUE}Installing Node.js v20 using NVM...${NC}"
        
        # Check if nvm is installed
        if ! command -v nvm &> /dev/null; then
            echo -e "${YELLOW}NVM not found. Installing NVM first...${NC}"
            curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
            
            # Source nvm
            export NVM_DIR="$HOME/.nvm"
            [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
            [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
        fi
        
        # Install Node.js v20
        nvm install 20
        nvm use 20
        nvm alias default 20
        
        echo -e "${GREEN}✅ Node.js v20 installed via NVM${NC}"
        echo "Run 'source ~/.bashrc' or restart your terminal to use the new version"
        ;;
        
    2)
        echo -e "\n${BLUE}Installing Node.js v20 using n...${NC}"
        
        # Check if n is installed
        if ! command -v n &> /dev/null; then
            echo -e "${YELLOW}n not found. Installing n first...${NC}"
            if command -v bun &> /dev/null; then
                bun install -g n
            else
                echo -e "${RED}bun not found. Please install bun first.${NC}"
                exit 1
            fi
        fi
        
        # Install Node.js v20
        sudo n 20
        
        echo -e "${GREEN}✅ Node.js v20 installed via n${NC}"
        ;;
        
    3)
        echo -e "\n${BLUE}Installing Node.js v20 using fnm...${NC}"
        
        # Check if fnm is installed
        if ! command -v fnm &> /dev/null; then
            echo -e "${YELLOW}fnm not found. Installing fnm first...${NC}"
            curl -fsSL https://fnm.vercel.app/install | bash
            
            # Add fnm to PATH
            export PATH="$HOME/.fnm:$PATH"
            eval "$(fnm env)"
        fi
        
        # Install Node.js v20
        fnm install 20
        fnm use 20
        fnm default 20
        
        echo -e "${GREEN}✅ Node.js v20 installed via fnm${NC}"
        echo "Run 'source ~/.bashrc' or restart your terminal to use the new version"
        ;;
        
    4)
        echo -e "\n${BLUE}Downloading Node.js v20 from nodejs.org...${NC}"
        
        # Detect OS and architecture
        OS=$(uname -s | tr '[:upper:]' '[:lower:]')
        ARCH=$(uname -m)
        
        if [[ "$ARCH" == "x86_64" ]]; then
            ARCH="x64"
        elif [[ "$ARCH" == "aarch64" ]]; then
            ARCH="arm64"
        fi
        
        NODE_VERSION="v20.18.0"
        FILENAME="node-${NODE_VERSION}-${OS}-${ARCH}.tar.gz"
        URL="https://nodejs.org/dist/${NODE_VERSION}/${FILENAME}"
        
        echo "Downloading from: $URL"
        curl -O "$URL"
        
        echo "Extracting..."
        tar -xzf "$FILENAME"
        
        echo "Installing to /usr/local..."
        sudo cp -r "node-${NODE_VERSION}-${OS}-${ARCH}"/* /usr/local/
        
        # Cleanup
        rm -rf "node-${NODE_VERSION}-${OS}-${ARCH}" "$FILENAME"
        
        echo -e "${GREEN}✅ Node.js v20 installed from nodejs.org${NC}"
        ;;
        
    5)
        echo -e "\n${BLUE}Installing Node.js v20 using system package manager...${NC}"
        
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            # Linux
            if command -v apt-get &> /dev/null; then
                # Debian/Ubuntu
                echo "Setting up NodeSource repository..."
                curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
                sudo apt-get install -y nodejs
                
            elif command -v yum &> /dev/null; then
                # RHEL/CentOS/Fedora
                echo "Setting up NodeSource repository..."
                curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
                sudo yum install -y nodejs
                
            elif command -v dnf &> /dev/null; then
                # Fedora 22+
                echo "Setting up NodeSource repository..."
                curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
                sudo dnf install -y nodejs
                
            else
                echo -e "${RED}Unsupported Linux distribution${NC}"
                exit 1
            fi
            
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            if command -v brew &> /dev/null; then
                brew install node@20
                brew link --overwrite node@20
            else
                echo -e "${RED}Homebrew not found. Please install Homebrew first.${NC}"
                exit 1
            fi
            
        else
            echo -e "${RED}Unsupported operating system${NC}"
            exit 1
        fi
        
        echo -e "${GREEN}✅ Node.js v20 installed via package manager${NC}"
        ;;
        
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

# Verify installation
echo ""
echo -e "${BLUE}Verifying installation...${NC}"
NEW_VERSION=$(node -v 2>/dev/null || echo "not installed")
echo -e "${GREEN}New Node.js version:${NC} $NEW_VERSION"

if [[ "$NEW_VERSION" =~ ^v20\. ]]; then
    echo -e "${GREEN}✅ Successfully upgraded to Node.js v20!${NC}"
    
    # Test Cucumber compatibility
    echo ""
    echo -e "${BLUE}Testing Cucumber compatibility...${NC}"
    if bunx cucumber-js --version &> /dev/null; then
        echo -e "${GREEN}✅ Cucumber is now compatible with Node.js $NEW_VERSION${NC}"
    else
        echo -e "${YELLOW}⚠️  Please run 'bun install' to reinstall dependencies${NC}"
    fi
else
    echo -e "${RED}❌ Upgrade failed. Please try a different method.${NC}"
    exit 1
fi