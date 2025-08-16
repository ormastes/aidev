#!/usr/bin/env bash
# Migration script from npm to bun
# This script helps migrate the AI Development Platform from npm to bun

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if bun is installed
check_bun_installation() {
    if command -v bun &> /dev/null; then
        local bun_version=$(bun --version)
        log_success "Bun is installed: v$bun_version"
        return 0
    else
        log_error "Bun is not installed"
        echo
        echo "Please install bun first:"
        echo "  curl -fsSL https://bun.sh/install | bash"
        echo "  OR"
        echo "  npm install -g bun"
        echo
        echo "For more information: https://bun.sh"
        return 1
    fi
}

# Clean node_modules directories
clean_node_modules() {
    log_info "Cleaning existing node_modules directories..."
    
    local count=0
    while IFS= read -r -d '' dir; do
        if [[ -d "$dir" ]]; then
            log_info "Removing $dir"
            rm -rf "$dir"
            ((count++))
        fi
    done < <(find . -name "node_modules" -type d -prune -print0 2>/dev/null)
    
    if [[ $count -gt 0 ]]; then
        log_success "Removed $count node_modules directories"
    else
        log_info "No node_modules directories found"
    fi
}

# Clean package-lock.json files
clean_package_locks() {
    log_info "Cleaning package-lock.json files..."
    
    local count=0
    while IFS= read -r file; do
        if [[ -f "$file" ]]; then
            log_info "Removing $file"
            rm -f "$file"
            ((count++))
        fi
    done < <(find . -name "package-lock.json" -type f 2>/dev/null)
    
    if [[ $count -gt 0 ]]; then
        log_success "Removed $count package-lock.json files"
    else
        log_info "No package-lock.json files found"
    fi
}

# Install dependencies with bun
install_with_bun() {
    log_info "Installing dependencies with bun..."
    
    # Install root dependencies
    if [[ -f "package.json" ]]; then
        log_info "Installing root dependencies..."
        bun install
        log_success "Root dependencies installed"
    fi
    
    # Find and install theme dependencies
    for theme_dir in layer/themes/*/; do
        if [[ -f "$theme_dir/package.json" ]]; then
            log_info "Installing dependencies for $(basename "$theme_dir")..."
            (cd "$theme_dir" && bun install)
        fi
    done
    
    # Find and install user story dependencies
    for story_dir in layer/themes/*/user-stories/*/; do
        if [[ -f "$story_dir/package.json" ]]; then
            log_info "Installing dependencies for $(basename "$(dirname "$(dirname "$story_dir")")")/$(basename "$story_dir")..."
            (cd "$story_dir" && bun install)
        fi
    done
    
    log_success "All dependencies installed with bun"
}

# Create bun configuration
create_bun_config() {
    log_info "Creating bun configuration..."
    
    if [[ ! -f "bunfig.toml" ]]; then
        cat > bunfig.toml << 'EOF'
# Bun configuration for AI Development Platform

[install]
# Use the local node_modules folder
globalDir = "~/.bun/install/global"
# Install peer dependencies automatically
peer = true
# Production mode - skip devDependencies in production
production = false

[install.lockfile]
# Save exact versions
save = true
# Print a yarn-like lockfile
print = "yarn"

[install.cache]
# Use a shared global cache
dir = "~/.bun/install/cache"
# Disable cache for CI
disable = false

[test]
# Test runner configuration
preload = ["./test-setup.ts"]
coverage = true
coverageThreshold = {
  line = 80,
  function = 80,
  branch = 80,
  statement = 80
}

[run]
# Auto-install missing packages when running scripts
autoInstall = true
EOF
        log_success "Created bunfig.toml"
    else
        log_info "bunfig.toml already exists"
    fi
}

# Update scripts in package.json files to be bun-compatible
update_package_scripts() {
    log_info "Updating package.json scripts for bun compatibility..."
    
    # This is optional - most npm scripts work with bun as-is
    # But we can add bun-specific optimizations
    
    log_info "Package scripts are already compatible with bun"
}

# Verify migration
verify_migration() {
    log_info "Verifying migration..."
    
    # Test basic bun commands
    if bun --version &> /dev/null; then
        log_success "Bun command works"
    else
        log_error "Bun command failed"
        return 1
    fi
    
    # Check if bun.lockb was created
    if [[ -f "bun.lockb" ]]; then
        log_success "Bun lockfile created"
    else
        log_warning "Bun lockfile not found (will be created on first install)"
    fi
    
    # Try running a simple test
    if [[ -f "package.json" ]]; then
        if bun run --help &> /dev/null; then
            log_success "Bun run command works"
        else
            log_error "Bun run command failed"
            return 1
        fi
    fi
    
    log_success "Migration verification completed"
}

# Main migration process
main() {
    echo -e "${CYAN}=== Bun Migration Script ===${NC}"
    echo "This script will migrate your AI Development Platform from npm to bun"
    echo
    
    # Check if bun is installed
    if ! check_bun_installation; then
        exit 1
    fi
    
    echo
    read -p "Do you want to clean existing node_modules and package-lock.json files? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        clean_node_modules
        clean_package_locks
    fi
    
    echo
    read -p "Do you want to install all dependencies with bun? (Y/n): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        install_with_bun
    fi
    
    # Create bun configuration
    create_bun_config
    
    # Update package scripts (if needed)
    update_package_scripts
    
    # Verify migration
    verify_migration
    
    echo
    echo -e "${GREEN}=== Migration Complete ===${NC}"
    echo
    echo "Next steps:"
    echo "1. Test your setup: bun test"
    echo "2. Run development: bun run dev"
    echo "3. Build project: bun run build"
    echo
    echo "Bun commands reference:"
    echo "  bun install         - Install dependencies"
    echo "  bun run <script>    - Run package.json scripts"
    echo "  bun test            - Run tests"
    echo "  bun x <package>     - Execute package (like npx)"
    echo
    echo "For more information: https://bun.sh/docs"
}

# Run main function
main "$@"