#!/bin/bash
set -e

# System Test Runner with Mode Support
# Runs tests based on current mode (normal/dangerous_virtual_needed)

# Load test configuration
source "$(dirname "$0")/test_config.sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
PASSED_TESTS=()
FAILED_TESTS=()
SKIPPED_TESTS=()

# Print header
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}System Test Runner${NC}"
    echo -e "${BLUE}========================================${NC}"
    print_test_config
}

# Run a single test
run_test() {
    local test_name="$1"
    local test_script="$2"
    local test_tags="${3:-}"
    
    # Check if test should run
    if ! should_run_test "$test_tags"; then
        echo -e "${YELLOW}[SKIP]${NC} $test_name (requires: $test_tags)"
        SKIPPED_TESTS+=("$test_name")
        return
    fi
    
    echo -e "${BLUE}[RUN]${NC} $test_name"
    
    if [ -f "$test_script" ]; then
        # Change to test directory if needed
        test_dir=$(dirname "$test_script")
        test_file=$(basename "$test_script")
        if (cd "$test_dir" && bash "$test_file" > /tmp/test_output_$$.txt 2>&1); then
            echo -e "${GREEN}[PASS]${NC} $test_name"
            PASSED_TESTS+=("$test_name")
        else
            echo -e "${RED}[FAIL]${NC} $test_name"
            echo "Output:"
            cat /tmp/test_output_$$.txt | sed 's/^/  /'
            FAILED_TESTS+=("$test_name")
        fi
        rm -f /tmp/test_output_$$.txt
    else
        echo -e "${RED}[ERROR]${NC} Test script not found: $test_script"
        FAILED_TESTS+=("$test_name")
    fi
}

# Define tests with tags
declare -A TESTS
declare -A TEST_TAGS

# Normal tests (safe to run anywhere)
TESTS["hello_world_cpp"]="hello_world_tests/cpp-cli/test.sh"
TEST_TAGS["hello_world_cpp"]=""

TESTS["hello_world_bash"]="hello_world_tests/bash-cli/test.sh"
TEST_TAGS["hello_world_bash"]=""

TESTS["cmake_build"]="tests/test_cmake_build.sh"
TEST_TAGS["cmake_build"]=""

# Dangerous tests (require VM/container)
TESTS["docker_build"]="hello_world_tests/docker-app/test.sh"
TEST_TAGS["docker_build"]="dangerous_virtual_needed"

TESTS["system_modification"]="tests/test_system_modification.sh"
TEST_TAGS["system_modification"]="dangerous_virtual_needed"

TESTS["kernel_module"]="tests/test_kernel_module.sh"
TEST_TAGS["kernel_module"]="dangerous_virtual_needed"

TESTS["network_isolation"]="tests/test_network_isolation.sh"
TEST_TAGS["network_isolation"]="dangerous_virtual_needed"

TESTS["qemu_emulation"]="tests/test_qemu_emulation.sh"
TEST_TAGS["qemu_emulation"]="dangerous_virtual_needed"

# New dangerous tests for features
TESTS["typescript_cli"]="tests/test_typescript_cli.sh"
TEST_TAGS["typescript_cli"]="dangerous_virtual_needed"

TESTS["python_web"]="tests/test_python_web.sh"
TEST_TAGS["python_web"]="dangerous_virtual_needed"

TESTS["cpp_library"]="tests/test_cpp_library.sh"
TEST_TAGS["cpp_library"]="dangerous_virtual_needed"

TESTS["electron_gui"]="tests/test_electron_gui.sh"
TEST_TAGS["electron_gui"]="dangerous_virtual_needed"

TESTS["react_native"]="tests/test_react_native.sh"
TEST_TAGS["react_native"]="dangerous_virtual_needed"

# Main test execution
main() {
    print_header
    
    echo -e "\n${BLUE}Running Tests...${NC}\n"
    
    # Run all tests
    for test_name in "${!TESTS[@]}"; do
        run_test "$test_name" "${TESTS[$test_name]}" "${TEST_TAGS[$test_name]}"
    done
    
    # Print summary
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}Test Summary${NC}"
    echo -e "${BLUE}========================================${NC}"
    
    echo -e "${GREEN}Passed: ${#PASSED_TESTS[@]}${NC}"
    if [ ${#PASSED_TESTS[@]} -gt 0 ]; then
        for test in "${PASSED_TESTS[@]}"; do
            echo -e "  ✓ $test"
        done
    fi
    
    echo -e "${RED}Failed: ${#FAILED_TESTS[@]}${NC}"
    if [ ${#FAILED_TESTS[@]} -gt 0 ]; then
        for test in "${FAILED_TESTS[@]}"; do
            echo -e "  ✗ $test"
        done
    fi
    
    echo -e "${YELLOW}Skipped: ${#SKIPPED_TESTS[@]}${NC}"
    if [ ${#SKIPPED_TESTS[@]} -gt 0 ]; then
        for test in "${SKIPPED_TESTS[@]}"; do
            echo -e "  - $test"
        done
    fi
    
    echo -e "${BLUE}========================================${NC}"
    
    # Exit with error if any tests failed
    if [ ${#FAILED_TESTS[@]} -gt 0 ]; then
        exit 1
    fi
}

# Handle command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --mode)
            export TEST_MODE="$2"
            shift 2
            ;;
        --enable-dangerous)
            export ENABLE_DANGEROUS_TESTS="true"
            shift
            ;;
        --disable-dangerous)
            export DISABLE_DANGEROUS_TESTS="true"
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --mode MODE              Set test mode (normal|dangerous_virtual_needed)"
            echo "  --enable-dangerous       Enable dangerous tests"
            echo "  --disable-dangerous      Disable dangerous tests even in VMs"
            echo "  --help                   Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

main