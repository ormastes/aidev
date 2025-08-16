#!/bin/bash

# Unified Theme Test Runner with Coverage Aggregation
# Runs tests for all themes in both root and setup folders
# Usage: ./test-all-themes.sh [--coverage] [--setup-only] [--root-only]

set -e

# Get script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
COVERAGE_ENABLED=false
SETUP_ONLY=false
ROOT_ONLY=false
FAILED_THEMES=()
TESTED_THEMES=()

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --coverage)
            COVERAGE_ENABLED=true
            shift
            ;;
        --setup-only)
            SETUP_ONLY=true
            shift
            ;;
        --root-only)
            ROOT_ONLY=true
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_theme() { echo -e "${CYAN}[THEME]${NC} $1"; }

# Test a single theme
test_theme() {
    local theme_path="$1"
    local theme_name="$2"
    local theme_type="$3"  # root or setup
    
    log_theme "Testing $theme_type theme: $theme_name"
    
    # Check if theme has tests
    if [[ ! -d "$theme_path/tests" ]] && [[ ! -d "$theme_path/user-stories" ]]; then
        log_warning "No tests found for $theme_name"
        return 0
    fi
    
    # Check for jest.config.js
    if [[ ! -f "$theme_path/jest.config.js" ]] && [[ ! -f "$theme_path/package.json" ]]; then
        log_warning "No test configuration found for $theme_name"
        return 0
    fi
    
    cd "$theme_path"
    
    # Install dependencies if needed
    if [[ -f "package.json" ]] && [[ ! -d "node_modules" ]]; then
        log_info "Installing dependencies for $theme_name..."
        if command -v bun &> /dev/null; then
            bun install --silent
        else
            bun install --silent
        fi
    fi
    
    # Run tests
    local test_cmd="bun test"
    if [[ "$COVERAGE_ENABLED" == true ]]; then
        test_cmd="bun test --coverage"
    fi
    
    if $test_cmd; then
        log_success "$theme_name tests passed"
        TESTED_THEMES+=("$theme_type:$theme_name")
        
        # Copy coverage data to aggregation directory if coverage is enabled
        if [[ "$COVERAGE_ENABLED" == true ]] && [[ -f "coverage/coverage-final.json" ]]; then
            local agg_dir="$PROJECT_ROOT/gen/coverage/themes/$theme_type/$theme_name"
            mkdir -p "$agg_dir"
            cp -r coverage/* "$agg_dir/"
            log_info "Coverage data copied for $theme_name"
        fi
        
        return 0
    else
        log_error "$theme_name tests failed"
        FAILED_THEMES+=("$theme_type:$theme_name")
        return 1
    fi
}

# Test all themes in a directory
test_themes_in_directory() {
    local base_dir="$1"
    local type="$2"
    
    if [[ ! -d "$base_dir" ]]; then
        log_warning "Directory not found: $base_dir"
        return
    fi
    
    log_info "Scanning $type themes in: $base_dir"
    
    for theme_dir in "$base_dir"/*; do
        if [[ -d "$theme_dir" ]] && [[ "$(basename "$theme_dir")" != "shared" ]]; then
            local theme_name=$(basename "$theme_dir")
            test_theme "$theme_dir" "$theme_name" "$type" || true
        fi
    done
}

# Test root themes
test_root_themes() {
    log_info "Testing root themes..."
    test_themes_in_directory "$PROJECT_ROOT/layer/themes" "root"
}

# Test setup themes
test_setup_themes() {
    log_info "Testing setup themes..."
    
    # Test demo themes
    for demo_dir in "$PROJECT_ROOT/scripts/setup/demo"/*; do
        if [[ -d "$demo_dir" ]] && [[ -f "$demo_dir/package.json" ]]; then
            local demo_name=$(basename "$demo_dir")
            test_theme "$demo_dir" "$demo_name" "setup-demo" || true
        fi
    done
    
    # Test release themes
    for release_dir in "$PROJECT_ROOT/scripts/setup/release"/*; do
        if [[ -d "$release_dir" ]] && [[ -f "$release_dir/package.json" ]]; then
            local release_name=$(basename "$release_dir")
            test_theme "$release_dir" "$release_name" "setup-release" || true
        fi
    done
}

# Aggregate coverage reports
aggregate_coverage() {
    log_info "Aggregating coverage reports..."
    
    # Use coverage-aggregator theme if available
    local aggregator_path="$PROJECT_ROOT/layer/themes/coverage-aggregator/user-stories/001-app-level-coverage"
    if [[ -d "$aggregator_path" ]]; then
        cd "$aggregator_path"
        
        # Install dependencies if needed
        if [[ ! -d "node_modules" ]]; then
            if command -v bun &> /dev/null; then
                bun install --silent
            else
                bun install --silent
            fi
        fi
        
        # Run aggregation
        if [[ -f "scripts/generate-coverage-report.ts" ]]; then
            if command -v bun &> /dev/null; then
                bunx ts-node scripts/generate-coverage-report.ts "$PROJECT_ROOT/layer" "$PROJECT_ROOT/gen/doc/coverage"
            else
                bunx ts-node scripts/generate-coverage-report.ts "$PROJECT_ROOT/layer" "$PROJECT_ROOT/gen/doc/coverage"
            fi
            log_success "Coverage aggregation completed"
        else
            log_warning "Coverage aggregator script not found"
        fi
    else
        log_warning "Coverage aggregator theme not found"
    fi
}

# Main execution
main() {
    echo -e "${CYAN}=== Unified Theme Test Runner ===${NC}"
    echo "Coverage: $([ "$COVERAGE_ENABLED" == true ] && echo "ENABLED" || echo "DISABLED")"
    echo
    
    # Create coverage directory if needed
    if [[ "$COVERAGE_ENABLED" == true ]]; then
        mkdir -p "$PROJECT_ROOT/gen/coverage/themes"
    fi
    
    # Run tests based on options
    if [[ "$SETUP_ONLY" != true ]]; then
        test_root_themes
    fi
    
    if [[ "$ROOT_ONLY" != true ]]; then
        test_setup_themes
    fi
    
    # Aggregate coverage if enabled
    if [[ "$COVERAGE_ENABLED" == true ]]; then
        aggregate_coverage
    fi
    
    # Summary
    echo
    echo -e "${CYAN}=== Test Summary ===${NC}"
    echo "Tested themes: ${#TESTED_THEMES[@]}"
    echo "Failed themes: ${#FAILED_THEMES[@]}"
    
    if [[ ${#TESTED_THEMES[@]} -gt 0 ]]; then
        echo
        echo -e "${GREEN}Tested themes:${NC}"
        for theme in "${TESTED_THEMES[@]}"; do
            echo "  ✓ $theme"
        done
    fi
    
    if [[ ${#FAILED_THEMES[@]} -gt 0 ]]; then
        echo
        echo -e "${RED}Failed themes:${NC}"
        for theme in "${FAILED_THEMES[@]}"; do
            echo "  ✗ $theme"
        done
        exit 1
    else
        echo
        echo -e "${GREEN}All tests passed!${NC}"
        
        if [[ "$COVERAGE_ENABLED" == true ]]; then
            echo -e "${GREEN}Coverage reports generated in: $PROJECT_ROOT/gen/doc/coverage${NC}"
        fi
    fi
}

# Run main function
main