#!/bin/bash

# LSP-MCP Theme Setup Script
# Sets up TypeScript/JavaScript Language Server Protocol integration with MCP

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
THEME_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
REQUIRED_NODE_VERSION="18.0.0"

# Print colored output
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

# Show usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

LSP-MCP Theme Setup Script

OPTIONS:
    -h, --help              Show this help message
    -s, --skip-checks       Skip system requirement checks
    -v, --verbose           Enable verbose output

EXAMPLES:
    $0                      Run full setup
    $0 --skip-checks        Skip requirement checks

EOF
}

# Parse command line arguments
SKIP_CHECKS=false
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            exit 0
            ;;
        -s|--skip-checks)
            SKIP_CHECKS=true
            shift
            ;;
        -v|--verbose)
            set -x
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Welcome message
show_welcome() {
    cat << "EOF"
     _     ____  ____     __  __  ____ ____  
    | |   / ___||  _ \   |  \/  |/ ___|  _ \ 
    | |   \___ \| |_) |  | |\/| | |   | |_) |
    | |___ ___) |  __/   | |  | | |___|  __/ 
    |_____|____/|_|      |_|  |_|\____|_|    
                                             
    Language Server Protocol to MCP Bridge
    Setup Script v1.0.0

EOF
    echo "This script will set up the LSP-MCP theme for TypeScript/JavaScript language server integration."
    echo
}

# Check system requirements
check_requirements() {
    print_status "Checking system requirements..."
    
    local has_errors=false
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v | cut -d 'v' -f 2)
        if [[ "$(printf '%s\n' "$REQUIRED_NODE_VERSION" "$NODE_VERSION" | sort -V | head -n1)" == "$REQUIRED_NODE_VERSION" ]]; then
            print_success "Node.js $NODE_VERSION found (>= $REQUIRED_NODE_VERSION required)"
        else
            print_error "Node.js version $NODE_VERSION is too old (>= $REQUIRED_NODE_VERSION required)"
            has_errors=true
        fi
    else
        print_error "Node.js not found. Please install Node.js >= $REQUIRED_NODE_VERSION"
        has_errors=true
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm -v)
        print_success "npm $NPM_VERSION found"
    else
        print_error "npm not found"
        has_errors=true
    fi
    
    # Check TypeScript (optional but recommended)
    if command -v tsc &> /dev/null; then
        TSC_VERSION=$(tsc -v | cut -d ' ' -f 2)
        print_success "TypeScript $TSC_VERSION found globally"
    else
        print_warning "TypeScript not found globally (will be installed locally)"
    fi
    
    if [[ "$has_errors" == "true" ]]; then
        print_error "Some requirements are not met. Please install missing dependencies."
        exit 1
    fi
    
    print_success "All required dependencies are installed!"
    echo
}

# Initialize package.json
initialize_package() {
    print_status "Initializing package.json..."
    
    cd "$THEME_ROOT"
    
    if [[ ! -f "package.json" ]]; then
        cat > package.json << EOF
{
  "name": "@aidev/lsp-mcp-theme",
  "version": "1.0.0",
  "description": "Language Server Protocol to MCP bridge for TypeScript/JavaScript",
  "main": "pipe/index.js",
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint . --ext .ts,.tsx",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist coverage"
  },
  "keywords": [
    "lsp",
    "language-server",
    "typescript",
    "javascript",
    "mcp"
  ],
  "author": "AI Dev Platform",
  "license": "MIT",
  "engines": {
    "node": ">= 18.0.0"
  }
}
EOF
        print_success "package.json created"
    else
        print_warning "package.json already exists, skipping creation"
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing LSP-MCP dependencies..."
    
    cd "$THEME_ROOT"
    
    # Core dependencies
    print_status "Installing core dependencies..."
    npm install --save \
        typescript-language-server \
        vscode-languageserver \
        vscode-languageserver-textdocument \
        vscode-languageserver-protocol \
        vscode-jsonrpc
    
    # Development dependencies
    print_status "Installing development dependencies..."
    npm install --save-dev \
        typescript \
        @types/node \
        jest \
        @types/jest \
        ts-jest \
        eslint \
        @typescript-eslint/parser \
        @typescript-eslint/eslint-plugin \
        prettier
    
    print_success "Dependencies installed successfully!"
    echo
}

# Create TypeScript configuration
create_tsconfig() {
    print_status "Creating TypeScript configuration..."
    
    cd "$THEME_ROOT"
    
    if [[ ! -f "tsconfig.json" ]]; then
        cat > tsconfig.json << EOF
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": false,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": [
    "pipe/**/*",
    "children/**/*",
    "tests/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "coverage"
  ]
}
EOF
        print_success "tsconfig.json created"
    else
        print_warning "tsconfig.json already exists, skipping"
    fi
}

# Create Jest configuration
create_jest_config() {
    print_status "Creating Jest configuration..."
    
    cd "$THEME_ROOT"
    
    if [[ ! -f "jest.config.js" ]]; then
        cat > jest.config.js << EOF
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'pipe/**/*.ts',
    'children/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000
};
EOF
        print_success "jest.config.js created"
    else
        print_warning "jest.config.js already exists, skipping"
    fi
}

# Create ESLint configuration
create_eslint_config() {
    print_status "Creating ESLint configuration..."
    
    cd "$THEME_ROOT"
    
    if [[ ! -f ".eslintrc.js" ]]; then
        cat > .eslintrc.js << EOF
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json'
  },
  env: {
    node: true,
    jest: true,
    es2022: true
  },
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }]
  },
  ignorePatterns: ['dist/', 'coverage/', 'node_modules/', '*.js']
};
EOF
        print_success ".eslintrc.js created"
    else
        print_warning ".eslintrc.js already exists, skipping"
    fi
}

# Create test setup file
create_test_setup() {
    print_status "Creating test setup..."
    
    mkdir -p "$THEME_ROOT/tests"
    
    if [[ ! -f "$THEME_ROOT/tests/setup.ts" ]]; then
        cat > "$THEME_ROOT/tests/setup.ts" << EOF
// Test setup for LSP-MCP theme
import { TextEncoder, TextDecoder } from 'util';

// Polyfill for Node.js < 20
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock console methods for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Increase timeout for LSP server startup
jest.setTimeout(30000);
EOF
        print_success "tests/setup.ts created"
    else
        print_warning "tests/setup.ts already exists, skipping"
    fi
}

# Create example test
create_example_test() {
    print_status "Creating example test..."
    
    mkdir -p "$THEME_ROOT/tests/integration"
    
    if [[ ! -f "$THEME_ROOT/tests/integration/lsp-client.test.ts" ]]; then
        cat > "$THEME_ROOT/tests/integration/lsp-client.test.ts" << EOF
import { LSPClient } from '../../children/LSPClient';
import * as path from 'path';
import * as fs from 'fs/promises';

describe('LSPClient', () => {
  let client: LSPClient;
  
  beforeEach(() => {
    client = new LSPClient();
  });
  
  afterEach(async () => {
    if (client) {
      await client.shutdown();
    }
  });
  
  it('should initialize successfully', async () => {
    await expect(client.initialize()).resolves.not.toThrow();
  });
  
  it('should open and close documents', async () => {
    await client.initialize();
    
    const testFile = path.join(__dirname, '../fixtures/test.ts');
    const content = 'const x: number = 42;';
    
    await expect(client.openDocument(testFile, content)).resolves.not.toThrow();
    await expect(client.closeDocument(testFile)).resolves.not.toThrow();
  });
});
EOF
        print_success "Example test created"
    else
        print_warning "Example test already exists, skipping"
    fi
}

# Create README for tests
create_test_readme() {
    print_status "Creating test documentation..."
    
    if [[ ! -f "$THEME_ROOT/tests/README.md" ]]; then
        cat > "$THEME_ROOT/tests/README.md" << EOF
# LSP-MCP Tests

## Running Tests

\`\`\`bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
\`\`\`

## Test Structure

- \`unit/\` - Unit tests for individual components
- \`integration/\` - Integration tests for LSP client/server
- \`fixtures/\` - Test fixtures and sample files
- \`setup.ts\` - Test environment setup

## Writing Tests

1. Create test files with \`.test.ts\` extension
2. Use descriptive test names
3. Mock external dependencies
4. Test both success and error cases
5. Ensure tests are deterministic
EOF
        print_success "tests/README.md created"
    else
        print_warning "tests/README.md already exists, skipping"
    fi
}

# Verify setup
verify_setup() {
    print_status "Verifying LSP-MCP setup..."
    
    cd "$THEME_ROOT"
    
    local has_errors=false
    
    # Check if dependencies are installed
    if [[ -d "node_modules" ]]; then
        print_success "node_modules directory found"
        
        # Check for specific dependencies
        if [[ -d "node_modules/typescript-language-server" ]]; then
            print_success "typescript-language-server installed"
        else
            print_error "typescript-language-server not found"
            has_errors=true
        fi
        
        if [[ -d "node_modules/vscode-languageserver" ]]; then
            print_success "vscode-languageserver installed"
        else
            print_error "vscode-languageserver not found"
            has_errors=true
        fi
    else
        print_error "node_modules directory not found"
        has_errors=true
    fi
    
    # Try to compile TypeScript
    print_status "Testing TypeScript compilation..."
    if bunx tsc --noEmit; then
        print_success "TypeScript compilation successful"
    else
        print_warning "TypeScript compilation issues found"
    fi
    
    # Check if language server binary exists
    if [[ -f "node_modules/.bin/typescript-language-server" ]]; then
        print_success "TypeScript language server binary found"
    else
        print_warning "TypeScript language server binary not found in node_modules/.bin/"
    fi
    
    if [[ "$has_errors" == "true" ]]; then
        print_error "Setup verification found some issues"
        return 1
    else
        print_success "Setup verification complete!"
    fi
    echo
}

# Main execution
main() {
    show_welcome
    
    if [[ "$SKIP_CHECKS" != "true" ]]; then
        check_requirements
    fi
    
    # Run setup steps
    initialize_package
    install_dependencies
    create_tsconfig
    create_jest_config
    create_eslint_config
    create_test_setup
    create_example_test
    create_test_readme
    verify_setup
    
    # Final success message
    cat << EOF

${GREEN}🎉 LSP-MCP Setup Complete!${NC}

The Language Server Protocol to MCP bridge is ready for use.

${BLUE}Project Structure:${NC}
  pipe/           - MCP tool interface
  children/       - LSP client implementation
  schemas/        - JSON schemas
  tests/          - Test files
  scripts/        - Setup and utility scripts

${YELLOW}Next steps:${NC}
1. Build the TypeScript files: npm run build
2. Run tests: npm test
3. Start using the LSP-MCP tools in your project

${YELLOW}Available npm scripts:${NC}
  npm run build      - Compile TypeScript
  npm run watch      - Watch mode compilation
  npm test           - Run tests
  npm run lint       - Run ESLint
  npm run typecheck  - Type check without emit

${GREEN}Happy coding with intelligent code assistance!${NC}
EOF
}

# Make script executable
chmod +x "$0"

# Run main function
main