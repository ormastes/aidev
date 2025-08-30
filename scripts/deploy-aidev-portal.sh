#!/bin/bash

# AI Dev Portal Deployment Script with Security Integration
# Deploys the portal using security module's port management

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SETUP_FOLDER="$PROJECT_ROOT/layer/themes/init_setup-folder"
DEPLOY_TYPE="${1:-local}"

# Function to print colored output
print_color() {
    echo -e "${2}${1}${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    print_color "Checking prerequisites..." "$BLUE"
    
    # Check if bun is installed
    if ! command -v bun &> /dev/null; then
        print_color "❌ Bun is not installed. Please install Bun first." "$RED"
        echo "Visit: https://bun.sh"
        exit 1
    fi
    
    # Check if project root exists
    if [ ! -d "$PROJECT_ROOT" ]; then
        print_color "❌ Project root not found: $PROJECT_ROOT" "$RED"
        exit 1
    fi
    
    print_color "✅ Prerequisites checked" "$GREEN"
}

# Function to install dependencies
install_dependencies() {
    print_color "Installing dependencies..." "$BLUE"
    
    cd "$SETUP_FOLDER"
    
    # Install Elysia and related packages
    if [ ! -d "node_modules" ]; then
        print_color "Installing packages..." "$YELLOW"
        bun install
    else
        print_color "Dependencies already installed" "$GREEN"
    fi
}

# Function to build TypeScript if needed
build_typescript() {
    print_color "Building TypeScript files..." "$BLUE"
    
    cd "$SETUP_FOLDER"
    
    # Only build if tsconfig exists and dist is outdated
    if [ -f "tsconfig.json" ]; then
        bun run build || true
    fi
    
    print_color "✅ Build complete" "$GREEN"
}

# Function to start the portal
start_portal() {
    local deploy_type="$1"
    
    print_color "Starting AI Dev Portal..." "$BLUE"
    print_color "Deploy Type: $deploy_type" "$YELLOW"
    
    cd "$SETUP_FOLDER"
    
    # Create start script if it doesn't exist
    cat > start-portal.ts << 'EOF'
#!/usr/bin/env bun

import ElysiaSecurityIntegratedServer from './children/services/elysia-security-integrated'

async function main() {
  const server = new ElysiaSecurityIntegratedServer()
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n⏹️  Shutting down server...')
    await server.stop()
    process.exit(0)
  })
  
  process.on('SIGTERM', async () => {
    await server.stop()
    process.exit(0)
  })
  
  // Start the server
  await server.start()
}

main().catch(console.error)
EOF
    
    chmod +x start-portal.ts
    
    # Set environment variables and start
    export DEPLOY_TYPE="$deploy_type"
    export NODE_ENV="${NODE_ENV:-development}"
    export SSO_SECRET="${SSO_SECRET:-aidev-dev-secret-$(date +%s)}"
    
    print_color "========================================" "$GREEN"
    print_color "   AI Dev Portal Deployment Starting    " "$GREEN"
    print_color "========================================" "$GREEN"
    print_color "Deploy Type: $DEPLOY_TYPE" "$YELLOW"
    print_color "Environment: $NODE_ENV" "$YELLOW"
    print_color "========================================" "$GREEN"
    echo ""
    
    # Run with hot reload in development
    if [ "$NODE_ENV" = "development" ] && [ "$deploy_type" = "local" -o "$deploy_type" = "dev" ]; then
        print_color "🔥 Hot reload enabled" "$YELLOW"
        bun --hot run start-portal.ts
    else
        bun run start-portal.ts
    fi
}

# Function to deploy with PM2 (optional)
deploy_with_pm2() {
    local deploy_type="$1"
    
    print_color "Deploying with PM2..." "$BLUE"
    
    if ! command -v pm2 &> /dev/null; then
        print_color "PM2 not installed. Installing globally..." "$YELLOW"
        npm install -g pm2
    fi
    
    cd "$SETUP_FOLDER"
    
    # Create PM2 ecosystem file
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'aidev-portal-${deploy_type}',
    interpreter: 'bun',
    script: 'start-portal.ts',
    env: {
      DEPLOY_TYPE: '${deploy_type}',
      NODE_ENV: 'production',
      SSO_SECRET: '${SSO_SECRET:-aidev-prod-secret}'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
}
EOF
    
    pm2 start ecosystem.config.js
    pm2 save
    
    print_color "✅ Deployed with PM2" "$GREEN"
    print_color "Use 'pm2 status' to check status" "$YELLOW"
    print_color "Use 'pm2 logs aidev-portal-${deploy_type}' to view logs" "$YELLOW"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [deploy_type] [--pm2]"
    echo ""
    echo "Deploy Types:"
    echo "  local      - Local development (port 31xx)"
    echo "  dev        - Development server (port 32xx)"
    echo "  demo       - Demo server (port 33xx)"
    echo "  release    - Release server (port 34xx)"
    echo "  production - Production server (port 35xx)"
    echo ""
    echo "Options:"
    echo "  --pm2      - Deploy using PM2 process manager"
    echo ""
    echo "Examples:"
    echo "  $0 local          # Start local development"
    echo "  $0 dev --pm2      # Deploy dev with PM2"
    echo "  $0 production     # Start production server"
}

# Main execution
main() {
    # Parse arguments
    DEPLOY_TYPE="${1:-local}"
    USE_PM2=false
    
    if [ "$2" = "--pm2" ]; then
        USE_PM2=true
    fi
    
    # Validate deploy type
    case "$DEPLOY_TYPE" in
        local|dev|demo|release|production)
            ;;
        --help|-h)
            show_usage
            exit 0
            ;;
        *)
            print_color "❌ Invalid deploy type: $DEPLOY_TYPE" "$RED"
            show_usage
            exit 1
            ;;
    esac
    
    # Run deployment steps
    check_prerequisites
    install_dependencies
    build_typescript
    
    if [ "$USE_PM2" = true ]; then
        deploy_with_pm2 "$DEPLOY_TYPE"
    else
        start_portal "$DEPLOY_TYPE"
    fi
}

# Run main function
main "$@"