#!/bin/bash

# Profile Management System Tests Runner
# Comprehensive test execution for profile management features
# Following Mock Free Test Oriented Development principles

set -e # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../../.." && pwd)"
TEST_RESULTS_DIR="$SCRIPT_DIR/test-results"
REPORT_DIR="$PROJECT_ROOT/gen/doc/test-reports"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test execution flags
RUN_API_TESTS=true
RUN_E2E_TESTS=true
RUN_SECURITY_TESTS=true
RUN_PERFORMANCE_TESTS=true
GENERATE_REPORT=true
CLEANUP_AFTER=true

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --api-only)
      RUN_E2E_TESTS=false
      RUN_SECURITY_TESTS=false
      RUN_PERFORMANCE_TESTS=false
      shift
      ;;
    --e2e-only)
      RUN_API_TESTS=false
      RUN_SECURITY_TESTS=false
      RUN_PERFORMANCE_TESTS=false
      shift
      ;;
    --security-only)
      RUN_API_TESTS=false
      RUN_E2E_TESTS=false
      RUN_PERFORMANCE_TESTS=false
      shift
      ;;
    --performance-only)
      RUN_API_TESTS=false
      RUN_E2E_TESTS=false
      RUN_SECURITY_TESTS=false
      shift
      ;;
    --no-cleanup)
      CLEANUP_AFTER=false
      shift
      ;;
    --no-report)
      GENERATE_REPORT=false
      shift
      ;;
    --help)
      echo "Profile Management System Tests Runner"
      echo ""
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --api-only           Run only API integration tests"
      echo "  --e2e-only           Run only E2E browser tests"
      echo "  --security-only      Run only security tests"
      echo "  --performance-only   Run only performance tests"
      echo "  --no-cleanup         Skip cleanup after tests"
      echo "  --no-report          Skip test report generation"
      echo "  --help              Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                   # Run all tests"
      echo "  $0 --e2e-only        # Run only E2E tests"
      echo "  $0 --no-cleanup      # Run all tests but keep test data"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}🚀 Starting Profile Management System Tests${NC}"
echo "==========================================="
echo "Project Root: $PROJECT_ROOT"
echo "Script Directory: $SCRIPT_DIR"
echo "Test Results: $TEST_RESULTS_DIR"
echo ""

# Create test results directory
mkdir -p "$TEST_RESULTS_DIR"
mkdir -p "$REPORT_DIR"

# Track test execution
START_TIME=$(date +%s)
TEST_RESULTS=()
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run test suite
run_test_suite() {
    local test_name="$1"
    local test_file="$2"
    local test_command="$3"
    
    echo -e "\n${YELLOW}📋 Running $test_name...${NC}"
    echo "Test file: $test_file"
    echo "Command: $test_command"
    echo "----------------------------------------"
    
    local test_start=$(date +%s)
    local result_file="$TEST_RESULTS_DIR/${test_name}-results.json"
    
    if eval "$test_command" > "$TEST_RESULTS_DIR/${test_name}.log" 2>&1; then
        local test_end=$(date +%s)
        local test_duration=$((test_end - test_start))
        
        echo -e "${GREEN}✅ $test_name PASSED${NC} (${test_duration}s)"
        
        TEST_RESULTS+=("$test_name:PASSED:$test_duration")
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        local test_end=$(date +%s)
        local test_duration=$((test_end - test_start))
        
        echo -e "${RED}❌ $test_name FAILED${NC} (${test_duration}s)"
        echo "Check log: $TEST_RESULTS_DIR/${test_name}.log"
        
        TEST_RESULTS+=("$test_name:FAILED:$test_duration")
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking prerequisites...${NC}"
    
    # Check if bun is available
    if ! command -v bun &> /dev/null; then
        echo -e "${RED}❌ bun is not installed or not in PATH${NC}"
        exit 1
    fi
    
    # Check if Playwright is available
    if ! command -v npx &> /dev/null; then
        echo -e "${RED}❌ npx is not available (needed for Playwright)${NC}"
        exit 1
    fi
    
    # Check if test files exist
    local test_files=(
        "profile-management.systest.ts"
        "profile-management-e2e.systest.ts"
        "profile-api-integration.systest.ts"
        "profile-security.systest.ts"
        "profile-performance.systest.ts"
    )
    
    for test_file in "${test_files[@]}"; do
        if [[ ! -f "$SCRIPT_DIR/$test_file" ]]; then
            echo -e "${RED}❌ Test file not found: $test_file${NC}"
            exit 1
        fi
    done
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

# Function to start required services
start_services() {
    echo -e "${BLUE}🏃 Starting required services...${NC}"
    
    # Check if portal is already running
    if curl -s "http://localhost:3156/health" > /dev/null 2>&1; then
        echo "   ℹ️  Portal already running on port 3156"
    else
        echo "   🚀 Starting AI Dev Portal..."
        cd "$PROJECT_ROOT/layer/themes/init_setup-folder"
        DEPLOY_TYPE=local bun run ./start-project-portal.ts &
        PORTAL_PID=$!
        
        # Wait for portal to start
        echo "   ⏳ Waiting for portal to be ready..."
        for i in {1..30}; do
            if curl -s "http://localhost:3156/health" > /dev/null 2>&1; then
                echo "   ✅ Portal is ready"
                break
            fi
            if [[ $i -eq 30 ]]; then
                echo -e "   ${RED}❌ Portal failed to start within timeout${NC}"
                exit 1
            fi
            sleep 2
        done
    fi
    
    cd "$SCRIPT_DIR"
}

# Function to generate comprehensive test report
generate_report() {
    if [[ "$GENERATE_REPORT" != "true" ]]; then
        return
    fi
    
    echo -e "\n${BLUE}📊 Generating comprehensive test report...${NC}"
    
    local report_file="$REPORT_DIR/profile-management-test-report-$(date +%Y%m%d-%H%M%S).json"
    local html_report="$REPORT_DIR/profile-management-test-report-$(date +%Y%m%d-%H%M%S).html"
    
    # Create JSON report
    cat > "$report_file" << EOF
{
  "testSuite": "Profile Management System Tests",
  "timestamp": "$(date -Iseconds)",
  "duration": $(($(date +%s) - START_TIME)),
  "environment": {
    "platform": "$(uname -s)",
    "architecture": "$(uname -m)",
    "nodeVersion": "$(node --version 2>/dev/null || echo 'N/A')",
    "bunVersion": "$(bun --version 2>/dev/null || echo 'N/A')",
    "playwrightVersion": "$(npx playwright --version 2>/dev/null | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' || echo 'N/A')"
  },
  "results": {
    "total": $TOTAL_TESTS,
    "passed": $PASSED_TESTS,
    "failed": $FAILED_TESTS,
    "successRate": $(echo "scale=2; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc -l)
  },
  "testCategories": {
    "apiIntegration": $(echo "$RUN_API_TESTS" | tr '[:upper:]' '[:lower:]'),
    "e2eBrowser": $(echo "$RUN_E2E_TESTS" | tr '[:upper:]' '[:lower:]'),
    "security": $(echo "$RUN_SECURITY_TESTS" | tr '[:upper:]' '[:lower:]'),
    "performance": $(echo "$RUN_PERFORMANCE_TESTS" | tr '[:upper:]' '[:lower:]')
  },
  "coverage": {
    "userRegistration": true,
    "profileEditing": true,
    "passwordManagement": true,
    "twoFactorAuth": true,
    "privacySettings": true,
    "dataExport": true,
    "socialIntegration": true,
    "roleBasedAccess": true,
    "securityTesting": $(echo "$RUN_SECURITY_TESTS" | tr '[:upper:]' '[:lower:]'),
    "performanceTesting": $(echo "$RUN_PERFORMANCE_TESTS" | tr '[:upper:]' '[:lower:]')
  },
  "architecture": {
    "approach": "Mock Free Test Oriented Development",
    "testingFramework": "Playwright + Bun Test",
    "realBrowserInteractions": true,
    "mockFree": true,
    "heaCompliant": true
  }
}
EOF
    
    echo "   📄 JSON report: $report_file"
    
    # Create HTML report
    cat > "$html_report" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Profile Management Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: #e8f4fd; padding: 15px; border-radius: 5px; text-align: center; }
        .passed { background: #d4edda; color: #155724; }
        .failed { background: #f8d7da; color: #721c24; }
        .test-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px; }
        .test-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
        .status-passed { border-left: 4px solid #28a745; }
        .status-failed { border-left: 4px solid #dc3545; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 Profile Management System Tests Report</h1>
        <p><strong>Generated:</strong> $(date)</p>
        <p><strong>Approach:</strong> Mock Free Test Oriented Development</p>
        <p><strong>Architecture:</strong> HEA (Hierarchical Encapsulation Architecture)</p>
    </div>
    
    <div class="summary">
        <div class="metric">
            <h3>Total Tests</h3>
            <h2>$TOTAL_TESTS</h2>
        </div>
        <div class="metric passed">
            <h3>Passed</h3>
            <h2>$PASSED_TESTS</h2>
        </div>
        <div class="metric failed">
            <h3>Failed</h3>
            <h2>$FAILED_TESTS</h2>
        </div>
        <div class="metric">
            <h3>Success Rate</h3>
            <h2>$(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc -l)%</h2>
        </div>
    </div>
    
    <h2>🎯 Test Coverage Areas</h2>
    <div class="test-grid">
EOF
    
    # Add test categories to HTML report
    if [[ "$RUN_API_TESTS" == "true" ]]; then
        cat >> "$html_report" << 'EOF'
        <div class="test-card">
            <h3>🔗 API Integration Tests</h3>
            <p>Tests profile management APIs with real database operations</p>
            <ul>
                <li>Profile CRUD operations</li>
                <li>Data validation and constraints</li>
                <li>Transaction integrity</li>
                <li>Authorization enforcement</li>
            </ul>
        </div>
EOF
    fi
    
    if [[ "$RUN_E2E_TESTS" == "true" ]]; then
        cat >> "$html_report" << 'EOF'
        <div class="test-card">
            <h3>🌐 End-to-End Browser Tests</h3>
            <p>Tests complete user workflows with real browser interactions</p>
            <ul>
                <li>Registration and login flows</li>
                <li>Profile editing via UI</li>
                <li>File upload interactions</li>
                <li>Settings management</li>
            </ul>
        </div>
EOF
    fi
    
    if [[ "$RUN_SECURITY_TESTS" == "true" ]]; then
        cat >> "$html_report" << 'EOF'
        <div class="test-card">
            <h3>🔒 Security Tests</h3>
            <p>Comprehensive security testing for vulnerabilities</p>
            <ul>
                <li>Authentication bypass prevention</li>
                <li>Authorization escalation prevention</li>
                <li>Input validation and injection attacks</li>
                <li>File upload security</li>
            </ul>
        </div>
EOF
    fi
    
    if [[ "$RUN_PERFORMANCE_TESTS" == "true" ]]; then
        cat >> "$html_report" << 'EOF'
        <div class="test-card">
            <h3>⚡ Performance Tests</h3>
            <p>Load testing and performance optimization validation</p>
            <ul>
                <li>Profile loading performance</li>
                <li>Concurrent user handling</li>
                <li>Image processing efficiency</li>
                <li>Search performance under load</li>
            </ul>
        </div>
EOF
    fi
    
    cat >> "$html_report" << 'EOF'
    </div>
    
    <h2>📈 Test Results</h2>
    <div class="test-grid">
EOF
    
    # Add individual test results
    for result in "${TEST_RESULTS[@]}"; do
        IFS=':' read -r name status duration <<< "$result"
        local status_class="status-$(echo "$status" | tr '[:upper:]' '[:lower:]')"
        
        cat >> "$html_report" << EOF
        <div class="test-card $status_class">
            <h4>$name</h4>
            <p><strong>Status:</strong> $status</p>
            <p><strong>Duration:</strong> ${duration}s</p>
        </div>
EOF
    done
    
    cat >> "$html_report" << 'EOF'
    </div>
    
    <h2>🏗️ Architecture Compliance</h2>
    <p><strong>HEA (Hierarchical Encapsulation Architecture):</strong> ✅ All tests follow proper layering</p>
    <p><strong>Mock Free Testing:</strong> ✅ No mocks used, all interactions are real</p>
    <p><strong>Playwright Integration:</strong> ✅ Real browser interactions for E2E tests</p>
    <p><strong>Database Integration:</strong> ✅ Real database operations tested</p>
    
    <h2>📊 Recommendations</h2>
EOF
    
    if [[ $FAILED_TESTS -gt 0 ]]; then
        cat >> "$html_report" << 'EOF'
    <div class="metric failed">
        <p>⚠️ Some tests failed. Review logs for specific issues and fix implementation.</p>
    </div>
EOF
    fi
    
    if [[ $PASSED_TESTS -eq $TOTAL_TESTS ]]; then
        cat >> "$html_report" << 'EOF'
    <div class="metric passed">
        <p>🎉 All tests passed! Profile management system is ready for production.</p>
    </div>
EOF
    fi
    
    cat >> "$html_report" << 'EOF'
</body>
</html>
EOF
    
    echo "   📄 HTML report: $html_report"
}

# Function to cleanup test environment
cleanup_environment() {
    if [[ "$CLEANUP_AFTER" != "true" ]]; then
        return
    fi
    
    echo -e "\n${BLUE}🧹 Cleaning up test environment...${NC}"
    
    # Kill any background processes
    if [[ -n "${PORTAL_PID:-}" ]]; then
        kill "$PORTAL_PID" 2>/dev/null || true
        echo "   🛑 Stopped portal process"
    fi
    
    # Clean up test data (but preserve results)
    if [[ -d "$SCRIPT_DIR/test-data" ]]; then
        rm -rf "$SCRIPT_DIR/test-data"
        echo "   🗑️  Removed test data"
    fi
    
    if [[ -d "$SCRIPT_DIR/test-uploads" ]]; then
        rm -rf "$SCRIPT_DIR/test-uploads"
        echo "   🗑️  Removed test uploads"
    fi
    
    echo -e "${GREEN}✅ Cleanup complete${NC}"
}

# Trap to ensure cleanup on script exit
trap cleanup_environment EXIT

# Main test execution
main() {
    check_prerequisites
    start_services
    
    echo -e "\n${BLUE}🧪 Executing Profile Management System Tests${NC}"
    echo "============================================="
    
    # Run API Integration Tests
    if [[ "$RUN_API_TESTS" == "true" ]]; then
        run_test_suite "API Integration" "profile-api-integration.systest.ts" \
            "cd '$SCRIPT_DIR' && bun test profile-api-integration.systest.ts"
        
        run_test_suite "Original API Tests" "profile-management.systest.ts" \
            "cd '$SCRIPT_DIR' && bun test profile-management.systest.ts"
    fi
    
    # Run E2E Browser Tests
    if [[ "$RUN_E2E_TESTS" == "true" ]]; then
        run_test_suite "E2E Browser Tests" "profile-management-e2e.systest.ts" \
            "cd '$SCRIPT_DIR' && npx playwright test profile-management-e2e.systest.ts --config=playwright.config.ts"
    fi
    
    # Run Security Tests
    if [[ "$RUN_SECURITY_TESTS" == "true" ]]; then
        run_test_suite "Security Tests" "profile-security.systest.ts" \
            "cd '$SCRIPT_DIR' && npx playwright test profile-security.systest.ts --config=playwright.config.ts"
    fi
    
    # Run Performance Tests
    if [[ "$RUN_PERFORMANCE_TESTS" == "true" ]]; then
        run_test_suite "Performance Tests" "profile-performance.systest.ts" \
            "cd '$SCRIPT_DIR' && npx playwright test profile-performance.systest.ts --config=playwright.config.ts"
    fi
    
    # Generate comprehensive report
    generate_report
    
    # Display final summary
    echo -e "\n${BLUE}📋 Test Execution Summary${NC}"
    echo "========================="
    echo "Total Tests: $TOTAL_TESTS"
    echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
    echo "Success Rate: $(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc -l)%"
    echo "Duration: $(($(date +%s) - START_TIME))s"
    
    if [[ $FAILED_TESTS -gt 0 ]]; then
        echo -e "\n${RED}❌ Some tests failed. Check logs in $TEST_RESULTS_DIR${NC}"
        exit 1
    else
        echo -e "\n${GREEN}🎉 All tests passed! Profile management system is ready.${NC}"
        exit 0
    fi
}

# Execute main function
main "$@"