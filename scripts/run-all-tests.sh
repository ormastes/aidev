#!/bin/bash

# Comprehensive Theme Test Runner
# Runs unit, integration, and system tests for all themes/epics
# Supports virtual environment mode for safe testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
THEMES_DIR="$ROOT_DIR/layer/themes"
TEST_REPORT_DIR="$ROOT_DIR/gen/doc/test-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="$TEST_REPORT_DIR/test-run-$TIMESTAMP.md"

# Default settings
VIRTUAL_MODE=false
TEST_TYPES=("unit" "integration" "system")
SKIP_DANGEROUS=false
PARALLEL=false
VERBOSE=false
THEMES_FILTER=""
COVERAGE=false
FAIL_FAST=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --virtual|-v)
            VIRTUAL_MODE=true
            shift
            ;;
        --skip-dangerous|-s)
            SKIP_DANGEROUS=true
            shift
            ;;
        --type|-t)
            IFS=',' read -ra TEST_TYPES <<< "$2"
            shift 2
            ;;
        --theme)
            THEMES_FILTER="$2"
            shift 2
            ;;
        --parallel|-p)
            PARALLEL=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --coverage|-c)
            COVERAGE=true
            shift
            ;;
        --fail-fast|-f)
            FAIL_FAST=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -v, --virtual          Run in virtual environment mode (default: false)"
            echo "  -s, --skip-dangerous   Skip tests that require system changes (default: false)"
            echo "  -t, --type TYPE        Test types to run (unit,integration,system) (default: all)"
            echo "  --theme PATTERN        Filter themes by pattern (default: all)"
            echo "  -p, --parallel         Run tests in parallel (default: false)"
            echo "  --verbose              Show detailed output"
            echo "  -c, --coverage         Generate coverage report"
            echo "  -f, --fail-fast        Stop on first failure"
            echo "  -h, --help             Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                                    # Run all tests"
            echo "  $0 --virtual                         # Run in virtual environment"
            echo "  $0 --type unit,integration           # Run only unit and integration tests"
            echo "  $0 --theme portal --coverage         # Run tests for portal themes with coverage"
            echo "  $0 --virtual --skip-dangerous        # Safe mode for CI/CD"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Create report directory
mkdir -p "$TEST_REPORT_DIR"

# Initialize report
cat > "$REPORT_FILE" << EOF
# Theme Test Execution Report
**Date**: $(date)
**Mode**: $([ "$VIRTUAL_MODE" = true ] && echo "Virtual Environment" || echo "Normal")
**Skip Dangerous**: $SKIP_DANGEROUS
**Test Types**: ${TEST_TYPES[@]}
**Coverage**: $COVERAGE

---

## Test Results

EOF

# Function to log messages
log() {
    local level=$1
    shift
    local message="$@"
    
    case $level in
        INFO)
            echo -e "${BLUE}[INFO]${NC} $message"
            ;;
        SUCCESS)
            echo -e "${GREEN}[SUCCESS]${NC} $message"
            ;;
        WARNING)
            echo -e "${YELLOW}[WARNING]${NC} $message"
            ;;
        ERROR)
            echo -e "${RED}[ERROR]${NC} $message"
            ;;
    esac
    
    echo "[$(date +%H:%M:%S)] [$level] $message" >> "$REPORT_FILE"
}

# Function to check if test should be skipped
should_skip_test() {
    local test_file=$1
    
    if [ "$SKIP_DANGEROUS" = true ]; then
        # Check if test file contains dangerous operations
        if grep -q -E "(sudo|rm -rf|systemctl|docker|qemu)" "$test_file" 2>/dev/null; then
            return 0
        fi
    fi
    
    return 1
}

# Function to run tests for a theme
run_theme_tests() {
    local theme_path=$1
    local theme_name=$(basename "$theme_path")
    local tests_passed=0
    local tests_failed=0
    local tests_skipped=0
    
    log INFO "Testing theme: $theme_name"
    
    # Check if theme has tests directory
    if [ ! -d "$theme_path/tests" ] && [ ! -d "$theme_path/user-stories" ]; then
        log WARNING "No tests found for $theme_name"
        return 0
    fi
    
    # Run each test type
    for test_type in "${TEST_TYPES[@]}"; do
        case $test_type in
            unit)
                run_unit_tests "$theme_path" || ((tests_failed++))
                ;;
            integration)
                run_integration_tests "$theme_path" || ((tests_failed++))
                ;;
            system)
                if [ "$VIRTUAL_MODE" = true ] || [ "$SKIP_DANGEROUS" = false ]; then
                    run_system_tests "$theme_path" || ((tests_failed++))
                else
                    log WARNING "Skipping system tests for $theme_name (use --virtual to enable)"
                    ((tests_skipped++))
                fi
                ;;
        esac
        
        if [ "$FAIL_FAST" = true ] && [ $tests_failed -gt 0 ]; then
            log ERROR "Stopping due to test failure (fail-fast mode)"
            return 1
        fi
    done
    
    # Report theme results
    echo "### $theme_name" >> "$REPORT_FILE"
    echo "- Passed: $tests_passed" >> "$REPORT_FILE"
    echo "- Failed: $tests_failed" >> "$REPORT_FILE"
    echo "- Skipped: $tests_skipped" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    return $tests_failed
}

# Function to run unit tests
run_unit_tests() {
    local theme_path=$1
    local theme_name=$(basename "$theme_path")
    
    log INFO "Running unit tests for $theme_name"
    
    # Find unit test files
    local test_files=$(find "$theme_path" -name "*.test.ts" -o -name "*.test.js" 2>/dev/null)
    
    if [ -z "$test_files" ]; then
        log WARNING "No unit tests found for $theme_name"
        return 0
    fi
    
    # Run Jest for unit tests
    local jest_config="$ROOT_DIR/config/jest/jest.config.js"
    local test_pattern="$theme_path/**/tests/unit/**/*.test.ts"
    
    if [ "$COVERAGE" = true ]; then
        bunx jest -c "$jest_config" --testMatch="$test_pattern" --coverage --coverageDirectory="$TEST_REPORT_DIR/coverage/$theme_name"
    else
        bunx jest -c "$jest_config" --testMatch="$test_pattern"
    fi
    
    return $?
}

# Function to run integration tests
run_integration_tests() {
    local theme_path=$1
    local theme_name=$(basename "$theme_path")
    
    log INFO "Running integration tests for $theme_name"
    
    # Find integration test files
    local test_files=$(find "$theme_path" -name "*.itest.ts" -o -name "*.itest.js" 2>/dev/null)
    
    if [ -z "$test_files" ]; then
        log WARNING "No integration tests found for $theme_name"
        return 0
    fi
    
    # Run Jest for integration tests
    local jest_config="$ROOT_DIR/config/jest/jest.config.js"
    local test_pattern="$theme_path/**/tests/integration/**/*.itest.ts"
    
    bunx jest -c "$jest_config" --testMatch="$test_pattern"
    
    return $?
}

# Function to run system tests
run_system_tests() {
    local theme_path=$1
    local theme_name=$(basename "$theme_path")
    
    log INFO "Running system tests for $theme_name"
    
    # Check for Cucumber features
    local feature_files=$(find "$theme_path" -name "*.feature" 2>/dev/null)
    
    if [ -n "$feature_files" ]; then
        log INFO "Running Cucumber system tests for $theme_name"
        
        if [ "$VIRTUAL_MODE" = true ]; then
            # Run in virtual environment
            run_in_virtual_env "bunx cucumber-js --config cucumber.yml --profile system --require '$theme_path/**/step_definitions/*.ts'"
        else
            bunx cucumber-js --config cucumber.yml --profile system --require "$theme_path/**/step_definitions/*.ts"
        fi
        
        return $?
    fi
    
    # Fall back to old .stest.ts files if they exist
    local stest_files=$(find "$theme_path" -name "*.stest.ts" 2>/dev/null)
    
    if [ -n "$stest_files" ]; then
        log WARNING "Found legacy .stest.ts files for $theme_name (consider migrating to Cucumber)"
        
        for test_file in $stest_files; do
            if should_skip_test "$test_file"; then
                log WARNING "Skipping dangerous test: $test_file"
                continue
            fi
            
            if [ "$VIRTUAL_MODE" = true ]; then
                run_in_virtual_env "bunx jest --testMatch='$test_file'"
            else
                bunx jest --testMatch="$test_file"
            fi
        done
    else
        log WARNING "No system tests found for $theme_name"
    fi
    
    return 0
}

# Function to run tests in virtual environment
run_in_virtual_env() {
    local command=$1
    
    log INFO "Executing in virtual environment: $command"
    
    # Check if Docker is available for virtual environment
    if command -v docker &> /dev/null; then
        # Use Docker container for isolation
        docker run --rm \
            -v "$ROOT_DIR:/workspace" \
            -w /workspace \
            oven/bun:latest \
            sh -c "bun install && $command"
    else
        # Fall back to subprocess isolation
        log WARNING "Docker not available, using subprocess isolation"
        (
            cd "$ROOT_DIR"
            export NODE_ENV=test
            export VIRTUAL_ENV=true
            eval "$command"
        )
    fi
}

# Function to get list of themes to test
get_themes_to_test() {
    local themes=()
    
    if [ -n "$THEMES_FILTER" ]; then
        # Filter themes by pattern
        while IFS= read -r theme; do
            if [[ $(basename "$theme") == *"$THEMES_FILTER"* ]]; then
                themes+=("$theme")
            fi
        done < <(find "$THEMES_DIR" -mindepth 1 -maxdepth 1 -type d)
    else
        # Get all themes
        while IFS= read -r theme; do
            themes+=("$theme")
        done < <(find "$THEMES_DIR" -mindepth 1 -maxdepth 1 -type d)
    fi
    
    echo "${themes[@]}"
}

# Main execution
main() {
    log INFO "Starting comprehensive theme test execution"
    log INFO "Configuration: Virtual=$VIRTUAL_MODE, Skip Dangerous=$SKIP_DANGEROUS, Types=${TEST_TYPES[@]}"
    
    # Get themes to test
    local themes=($(get_themes_to_test))
    local total_themes=${#themes[@]}
    local current_theme=0
    local failed_themes=()
    
    log INFO "Found $total_themes themes to test"
    
    # Run tests for each theme
    if [ "$PARALLEL" = true ]; then
        log INFO "Running tests in parallel mode"
        
        # Use GNU parallel if available
        if command -v parallel &> /dev/null; then
            export -f run_theme_tests
            export -f run_unit_tests
            export -f run_integration_tests
            export -f run_system_tests
            export -f run_in_virtual_env
            export -f should_skip_test
            export -f log
            
            printf '%s\n' "${themes[@]}" | parallel -j 4 run_theme_tests {}
        else
            log WARNING "GNU parallel not found, falling back to sequential execution"
            PARALLEL=false
        fi
    fi
    
    if [ "$PARALLEL" = false ]; then
        for theme in "${themes[@]}"; do
            ((current_theme++))
            log INFO "Testing theme $current_theme/$total_themes"
            
            if ! run_theme_tests "$theme"; then
                failed_themes+=("$(basename "$theme")")
                
                if [ "$FAIL_FAST" = true ]; then
                    break
                fi
            fi
        done
    fi
    
    # Generate summary
    log INFO "Test execution completed"
    
    echo "" >> "$REPORT_FILE"
    echo "## Summary" >> "$REPORT_FILE"
    echo "- Total themes tested: $total_themes" >> "$REPORT_FILE"
    echo "- Failed themes: ${#failed_themes[@]}" >> "$REPORT_FILE"
    
    if [ ${#failed_themes[@]} -gt 0 ]; then
        echo "- Failed theme list:" >> "$REPORT_FILE"
        for theme in "${failed_themes[@]}"; do
            echo "  - $theme" >> "$REPORT_FILE"
        done
    fi
    
    # Generate coverage report if requested
    if [ "$COVERAGE" = true ]; then
        log INFO "Generating combined coverage report"
        bunx nyc report --reporter=html --reporter=text --report-dir="$TEST_REPORT_DIR/coverage/combined"
    fi
    
    # Display report location
    log SUCCESS "Test report saved to: $REPORT_FILE"
    
    # Exit with appropriate code
    if [ ${#failed_themes[@]} -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

# Run main function
main