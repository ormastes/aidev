#!/bin/bash

# Run Cucumber tests using Bun or upgrade Node.js
# This script provides multiple options for running Cucumber tests

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          Cucumber Test Runner                            ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check current Node.js version
NODE_VERSION=$(node -v 2>/dev/null || echo "not installed")
echo -e "${YELLOW}Current Node.js version:${NC} $NODE_VERSION"

# Check Bun version
BUN_VERSION=$(bun --version 2>/dev/null || echo "not installed")
echo -e "${YELLOW}Bun version:${NC} $BUN_VERSION"
echo ""

# Function to run Cucumber with Bun using a different approach
run_cucumber_with_bun() {
    echo -e "${BLUE}Attempting to run Cucumber with Bun...${NC}"
    
    # Method 1: Try using Bun with tsx loader
    if command -v bun &> /dev/null; then
        echo -e "${GREEN}Method 1: Using Bun with tsx${NC}"
        
        # Install tsx if not present
        if ! bun pm ls | grep -q tsx; then
            echo "Installing tsx..."
            bun add -d tsx
        fi
        
        # Create a wrapper that uses tsx to run cucumber
        cat > /tmp/cucumber-bun-wrapper.mjs << 'EOF'
#!/usr/bin/env bun
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get command line arguments
const args = process.argv.slice(2);

// Run tsx with cucumber
const tsx = spawn('bunx', ['tsx', 'node_modules/.bin/cucumber-js', ...args], {
    stdio: 'inherit',
    env: {
        ...process.env,
        NODE_OPTIONS: '--loader tsx',
        TS_NODE_PROJECT: 'tsconfig.json'
    }
});

tsx.on('close', (code) => {
    process.exit(code || 0);
});
EOF
        
        chmod +x /tmp/cucumber-bun-wrapper.mjs
        bun /tmp/cucumber-bun-wrapper.mjs "$@"
        rm -f /tmp/cucumber-bun-wrapper.mjs
        return $?
    fi
    
    return 1
}

# Function to use Jest as alternative for system tests
run_with_jest() {
    echo -e "${BLUE}Using Jest as alternative for system tests...${NC}"
    
    # Create a Jest wrapper for Cucumber features
    cat > /tmp/cucumber-jest-adapter.js << 'EOF'
const { loadConfiguration, loadSupport, loadFeatures } = require('@cucumber/cucumber/api');
const { describe, it, beforeAll, afterAll } = require('@jest/globals');

async function runCucumberFeature(featurePath) {
    const { runConfiguration } = await loadConfiguration();
    const { support } = await loadSupport(runConfiguration);
    const { features } = await loadFeatures(runConfiguration);
    
    features.forEach(feature => {
        describe(feature.name, () => {
            feature.scenarios.forEach(scenario => {
                it(scenario.name, async () => {
                    // Run scenario steps
                    for (const step of scenario.steps) {
                        await support.runStep(step);
                    }
                });
            });
        });
    });
}

module.exports = { runCucumberFeature };
EOF
    
    # Run with Jest
    bunx jest --testMatch="**/features/**/*.feature" --transform='{".*": "/tmp/cucumber-jest-adapter.js"}'
    local result=$?
    
    rm -f /tmp/cucumber-jest-adapter.js
    return $result
}

# Main execution logic
echo -e "${BLUE}Choose an option:${NC}"
echo "1) Try running Cucumber with Bun (experimental)"
echo "2) Run with Jest adapter (alternative)"
echo "3) Upgrade Node.js to v20 and run normally"
echo "4) Show instructions for manual Node.js upgrade"
echo ""
read -p "Enter choice (1-4): " choice

case $choice in
    1)
        run_cucumber_with_bun "$@"
        if [ $? -ne 0 ]; then
            echo -e "${RED}Failed to run with Bun. Try option 3 to upgrade Node.js.${NC}"
            exit 1
        fi
        ;;
        
    2)
        run_with_jest "$@"
        ;;
        
    3)
        echo -e "${BLUE}Running Node.js upgrade script...${NC}"
        bash scripts/upgrade-nodejs.sh
        
        # After upgrade, run Cucumber normally
        if [[ $(node -v) =~ ^v2[0-9]\. ]]; then
            echo -e "${GREEN}Running Cucumber with upgraded Node.js...${NC}"
            bunx cucumber-js "$@"
        else
            echo -e "${RED}Node.js upgrade failed${NC}"
            exit 1
        fi
        ;;
        
    4)
        echo -e "${BLUE}Manual Node.js v20 Installation Instructions:${NC}"
        echo ""
        echo "Option 1: Using nvm (Node Version Manager)"
        echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
        echo "  source ~/.bashrc"
        echo "  nvm install 20"
        echo "  nvm use 20"
        echo ""
        echo "Option 2: Using NodeSource repository (Ubuntu/Debian)"
        echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
        echo "  sudo apt-get install -y nodejs"
        echo ""
        echo "Option 3: Using Homebrew (macOS)"
        echo "  brew install node@20"
        echo "  brew link --overwrite node@20"
        echo ""
        echo "After installation, run:"
        echo "  bunx cucumber-js --config cucumber.yml"
        ;;
        
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac