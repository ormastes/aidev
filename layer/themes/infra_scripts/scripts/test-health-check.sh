#!/bin/bash

# Test Health Check Script for AI Development Platform
# Analyzes and reports test status for all themes

echo "================================================"
echo "AI Development Platform - Test Health Check"
echo "Date: $(date)"
echo "================================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base directory
BASE_DIR="/home/ormastes/dev/aidev/layer/themes"

# Counters
TOTAL_THEMES=0
PASSING_THEMES=0
FAILING_THEMES=0
NO_TEST_THEMES=0
TIMEOUT_THEMES=0

# Results array
declare -A TEST_RESULTS

# Function to check if package.json exists
check_package_json() {
    local theme_dir=$1
    if [ -f "$theme_dir/package.json" ]; then
        return 0
    fi
    return 1
}

# Function to run tests with timeout
run_tests() {
    local theme_dir=$1
    local theme_name=$2
    
    cd "$theme_dir" || return 1
    
    # Run tests with timeout
    timeout 20s bun test --silent 2>&1 | head -100
    local exit_code=$?
    
    if [ $exit_code -eq 124 ]; then
        echo "TIMEOUT"
        return 124
    elif [ $exit_code -eq 0 ]; then
        echo "PASS"
        return 0
    else
        echo "FAIL"
        return 1
    fi
}

# Function to check test coverage
check_coverage() {
    local theme_dir=$1
    cd "$theme_dir" || return
    
    # Try to get coverage if tests pass
    bun test --coverage --silent 2>&1 | grep -A 5 "Coverage" || echo "No coverage data"
}

# Main analysis loop
echo "Analyzing themes..."
echo "=================="
echo ""

for theme_path in "$BASE_DIR"/*; do
    if [ -d "$theme_path" ]; then
        theme_name=$(basename "$theme_path")
        
        # Skip non-theme directories
        if [[ "$theme_name" == "temp" ]] || [[ "$theme_name" == ".vscode" ]]; then
            continue
        fi
        
        TOTAL_THEMES=$((TOTAL_THEMES + 1))
        
        echo -n "Testing $theme_name... "
        
        if ! check_package_json "$theme_path"; then
            echo -e "${YELLOW}NO PACKAGE.JSON${NC}"
            NO_TEST_THEMES=$((NO_TEST_THEMES + 1))
            TEST_RESULTS["$theme_name"]="NO_PACKAGE"
            continue
        fi
        
        # Check if test script exists in package.json
        if ! grep -q '"test"' "$theme_path/package.json"; then
            echo -e "${YELLOW}NO TEST SCRIPT${NC}"
            NO_TEST_THEMES=$((NO_TEST_THEMES + 1))
            TEST_RESULTS["$theme_name"]="NO_TEST_SCRIPT"
            continue
        fi
        
        # Run tests
        test_output=$(run_tests "$theme_path" "$theme_name")
        
        if [[ "$test_output" == "TIMEOUT" ]]; then
            echo -e "${YELLOW}TIMEOUT${NC}"
            TIMEOUT_THEMES=$((TIMEOUT_THEMES + 1))
            TEST_RESULTS["$theme_name"]="TIMEOUT"
        elif [[ "$test_output" == "PASS" ]]; then
            echo -e "${GREEN}PASS${NC}"
            PASSING_THEMES=$((PASSING_THEMES + 1))
            TEST_RESULTS["$theme_name"]="PASS"
        else
            echo -e "${RED}FAIL${NC}"
            FAILING_THEMES=$((FAILING_THEMES + 1))
            TEST_RESULTS["$theme_name"]="FAIL"
        fi
    fi
done

# Summary Report
echo ""
echo "================================================"
echo "TEST HEALTH SUMMARY"
echo "================================================"
echo ""
echo -e "Total Themes:    ${BLUE}$TOTAL_THEMES${NC}"
echo -e "Passing:         ${GREEN}$PASSING_THEMES${NC} ($(( PASSING_THEMES * 100 / TOTAL_THEMES ))%)"
echo -e "Failing:         ${RED}$FAILING_THEMES${NC} ($(( FAILING_THEMES * 100 / TOTAL_THEMES ))%)"
echo -e "Timeout:         ${YELLOW}$TIMEOUT_THEMES${NC} ($(( TIMEOUT_THEMES * 100 / TOTAL_THEMES ))%)"
echo -e "No Tests:        ${YELLOW}$NO_TEST_THEMES${NC} ($(( NO_TEST_THEMES * 100 / TOTAL_THEMES ))%)"
echo ""

# Platform Health Score
HEALTH_SCORE=$(( PASSING_THEMES * 100 / TOTAL_THEMES ))
echo -n "Platform Health Score: "
if [ $HEALTH_SCORE -ge 80 ]; then
    echo -e "${GREEN}$HEALTH_SCORE/100 (HEALTHY)${NC}"
elif [ $HEALTH_SCORE -ge 50 ]; then
    echo -e "${YELLOW}$HEALTH_SCORE/100 (NEEDS ATTENTION)${NC}"
else
    echo -e "${RED}$HEALTH_SCORE/100 (CRITICAL)${NC}"
fi

echo ""
echo "================================================"
echo "DETAILED RESULTS"
echo "================================================"
echo ""

# List themes by status
echo -e "${GREEN}PASSING THEMES:${NC}"
for theme in "${!TEST_RESULTS[@]}"; do
    if [[ "${TEST_RESULTS[$theme]}" == "PASS" ]]; then
        echo "  ✓ $theme"
    fi
done

echo ""
echo -e "${RED}FAILING THEMES:${NC}"
for theme in "${!TEST_RESULTS[@]}"; do
    if [[ "${TEST_RESULTS[$theme]}" == "FAIL" ]]; then
        echo "  ✗ $theme"
    fi
done

echo ""
echo -e "${YELLOW}TIMEOUT THEMES:${NC}"
for theme in "${!TEST_RESULTS[@]}"; do
    if [[ "${TEST_RESULTS[$theme]}" == "TIMEOUT" ]]; then
        echo "  ⏱ $theme"
    fi
done

echo ""
echo -e "${YELLOW}NO TEST THEMES:${NC}"
for theme in "${!TEST_RESULTS[@]}"; do
    if [[ "${TEST_RESULTS[$theme]}" == "NO_PACKAGE" ]] || [[ "${TEST_RESULTS[$theme]}" == "NO_TEST_SCRIPT" ]]; then
        echo "  ⚠ $theme (${TEST_RESULTS[$theme]})"
    fi
done

echo ""
echo "================================================"
echo "Report complete. Check individual themes for details."
echo "================================================"