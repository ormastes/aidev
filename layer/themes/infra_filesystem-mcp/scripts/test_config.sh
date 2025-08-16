#!/bin/bash

# Test Mode Configuration System
# Supports two modes:
# - normal: Safe tests that can run on any system
# - dangerous_virtual_needed: Tests requiring VM/container isolation

# Detect if running in virtual environment
detect_virtual_environment() {
    # Check for common virtualization indicators
    if [ -f /.dockerenv ]; then
        echo "docker"
        return 0
    fi
    
    if [ -n "${KUBERNETES_SERVICE_HOST}" ]; then
        echo "kubernetes"
        return 0
    fi
    
    if systemd-detect-virt -q 2>/dev/null; then
        echo "$(systemd-detect-virt)"
        return 0
    fi
    
    if [ -f /proc/1/cgroup ] && grep -q 'docker\|lxc\|kubepods' /proc/1/cgroup; then
        echo "container"
        return 0
    fi
    
    # Check for VM indicators
    if [ -f /sys/class/dmi/id/product_name ]; then
        product=$(cat /sys/class/dmi/id/product_name 2>/dev/null)
        case "$product" in
            *VirtualBox*|*VMware*|*KVM*|*Xen*|*Bochs*|*QEMU*)
                echo "vm"
                return 0
                ;;
        esac
    fi
    
    # Check for WSL
    if grep -qi microsoft /proc/version 2>/dev/null; then
        echo "wsl"
        return 0
    fi
    
    echo "none"
    return 1
}

# Get test mode based on environment
get_test_mode() {
    # Check explicit environment variable
    if [ -n "${TEST_MODE}" ]; then
        echo "${TEST_MODE}"
        return
    fi
    
    # Check if dangerous mode is explicitly enabled
    if [ "${ENABLE_DANGEROUS_TESTS}" = "true" ] || [ "${ENABLE_DANGEROUS_TESTS}" = "1" ]; then
        echo "dangerous_virtual_needed"
        return
    fi
    
    # Auto-detect based on virtual environment
    virt_type=$(detect_virtual_environment)
    if [ "$virt_type" != "none" ]; then
        # Default to dangerous mode in virtual environments
        if [ "${DISABLE_DANGEROUS_TESTS}" != "true" ]; then
            echo "dangerous_virtual_needed"
            return
        fi
    fi
    
    echo "normal"
}

# Check if a test should run based on its tags
should_run_test() {
    local test_tags="$1"
    local mode=$(get_test_mode)
    
    # If test has dangerous_virtual_needed tag
    if echo "$test_tags" | grep -q "dangerous_virtual_needed"; then
        if [ "$mode" = "dangerous_virtual_needed" ]; then
            return 0  # Run the test
        else
            return 1  # Skip the test
        fi
    fi
    
    # Normal tests always run
    return 0
}

# Print current configuration
print_test_config() {
    echo "========================================"
    echo "Test Configuration"
    echo "========================================"
    echo "Virtual Environment: $(detect_virtual_environment)"
    echo "Test Mode: $(get_test_mode)"
    echo "Environment Variables:"
    echo "  TEST_MODE: ${TEST_MODE:-<not set>}"
    echo "  ENABLE_DANGEROUS_TESTS: ${ENABLE_DANGEROUS_TESTS:-<not set>}"
    echo "  DISABLE_DANGEROUS_TESTS: ${DISABLE_DANGEROUS_TESTS:-<not set>}"
    echo "========================================"
}

# Export functions for use in other scripts
export -f detect_virtual_environment
export -f get_test_mode
export -f should_run_test
export -f print_test_config