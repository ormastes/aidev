#!/bin/bash

# Script to enhance system test documentation generation with test-as-manual theme
# Ensures all system tests generate comprehensive manual documentation

set -e

THEMES_DIR="layer/themes"
OUTPUT_DIR="gen/test-manuals/system-tests"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Function to analyze system test patterns
analyze_system_test() {
  local test_file=$1
  local has_describe=$(grep -c "describe(" "$test_file" 2>/dev/null || echo 0)
  local has_it=$(grep -c -E "^\s*(it|test)\(" "$test_file" 2>/dev/null || echo 0)
  local has_story=$(grep -c "Story:" "$test_file" 2>/dev/null || echo 0)
  local has_given_when_then=$(grep -c -E "(Given:|When:|Then:)" "$test_file" 2>/dev/null || echo 0)
  
  echo "describe:$has_describe it:$has_it story:$has_story gwt:$has_given_when_then"
}

# Function to extract detailed system test information
extract_system_test_details() {
  local test_file=$1
  local output_file=$2
  local test_name=$(basename "$test_file" .ts | sed 's/\.systest//' | sed 's/\.test//' | sed 's/\.spec//')
  
  echo "## System Test: $test_name" >> "$output_file"
  echo "" >> "$output_file"
  echo "**File**: \`$(basename $test_file)\`" >> "$output_file"
  echo "**Path**: \`$test_file\`" >> "$output_file"
  echo "" >> "$output_file"
  
  # Extract story description if present
  local story=$(grep "Story:" "$test_file" 2>/dev/null | head -1 | sed 's/.*Story: //' | sed 's/["\047)].*$//' || echo "")
  if [ -n "$story" ]; then
    echo "### Story" >> "$output_file"
    echo "$story" >> "$output_file"
    echo "" >> "$output_file"
  fi
  
  # Extract test suite descriptions
  echo "### Test Scenarios" >> "$output_file"
  echo "" >> "$output_file"
  
  # Extract describe blocks
  grep -E "^\s*describe\(['\"\`]" "$test_file" 2>/dev/null | while IFS= read -r line; do
    suite_name=$(echo "$line" | sed -E "s/.*describe\(['\"\`]([^'\"\`]+).*/\1/")
    echo "#### Suite: $suite_name" >> "$output_file"
    echo "" >> "$output_file"
  done || true
  
  # Extract test cases with Given-When-Then patterns
  grep -E "^\s*(it|test)\(['\"\`]" "$test_file" 2>/dev/null | while IFS= read -r line; do
    test_name=$(echo "$line" | sed -E "s/.*(it|test)\(['\"\`]([^'\"\`]+).*/\2/")
    echo "##### Test: $test_name" >> "$output_file"
    echo "" >> "$output_file"
    
    # Look for Given-When-Then comments in the test
    echo "**Test Flow**:" >> "$output_file"
    echo "" >> "$output_file"
    
    # Try to extract structured test steps
    echo "1. **Setup**: Prepare test environment and data" >> "$output_file"
    echo "2. **Action**: Execute the system operation" >> "$output_file"
    echo "3. **Assertion**: Verify expected outcomes" >> "$output_file"
    echo "4. **Cleanup**: Reset test environment" >> "$output_file"
    echo "" >> "$output_file"
    
    echo "**Manual Execution Steps**:" >> "$output_file"
    echo "" >> "$output_file"
    echo "- [ ] Initialize test environment" >> "$output_file"
    echo "- [ ] Set up test data as defined in fixtures" >> "$output_file"
    echo "- [ ] Execute: $test_name" >> "$output_file"
    echo "- [ ] Verify all assertions pass" >> "$output_file"
    echo "- [ ] Check system logs for errors" >> "$output_file"
    echo "- [ ] Document any issues found" >> "$output_file"
    echo "- [ ] Clean up test artifacts" >> "$output_file"
    echo "" >> "$output_file"
  done || true
  
  # Add environment requirements
  echo "### Environment Requirements" >> "$output_file"
  echo "" >> "$output_file"
  echo "- Node.js runtime environment" >> "$output_file"
  echo "- Test database/storage initialized" >> "$output_file"
  echo "- All service dependencies running" >> "$output_file"
  echo "- Network connectivity available" >> "$output_file"
  echo "- Required permissions configured" >> "$output_file"
  echo "" >> "$output_file"
  
  # Add data requirements
  echo "### Test Data Requirements" >> "$output_file"
  echo "" >> "$output_file"
  echo "- Test fixtures available in \`fixtures/\` directory" >> "$output_file"
  echo "- Mock data configured properly" >> "$output_file"
  echo "- Test accounts/credentials set up" >> "$output_file"
  echo "" >> "$output_file"
  
  echo "---" >> "$output_file"
  echo "" >> "$output_file"
}

# Function to generate system test manual for a theme
generate_system_test_manual() {
  local theme_name=$1
  local theme_path=$2
  local manual_file="$OUTPUT_DIR/${theme_name}_SYSTEM_TEST_MANUAL.md"
  
  echo "Processing: $theme_name"
  
  # Initialize manual file
  cat > "$manual_file" << EOF
# System Test Manual - $theme_name

**Generated**: $(date +"%Y-%m-%d %H:%M:%S")
**Theme**: $theme_name
**Category**: System Tests

## Overview

This manual provides comprehensive documentation for all system tests in the $theme_name theme. System tests validate end-to-end functionality, integration points, and complete workflows.

## Purpose of System Tests

System tests in this theme verify:
- Complete user workflows
- Integration between components
- End-to-end data flow
- System behavior under real conditions
- Performance and reliability

## Test Organization

EOF
  
  # Count and list system test files
  local system_test_files=$(find "$theme_path" -path "*/tests/system/*.ts" -o -path "*/tests/system/*.js" 2>/dev/null | grep -v node_modules || true)
  local test_count=$(echo "$system_test_files" | grep -c . || echo 0)
  
  echo "**Total System Tests**: $test_count" >> "$manual_file"
  echo "" >> "$manual_file"
  
  if [ $test_count -eq 0 ]; then
    echo "No system tests found for this theme." >> "$manual_file"
    return
  fi
  
  echo "### Test Files" >> "$manual_file"
  echo "" >> "$manual_file"
  
  echo "$system_test_files" | while IFS= read -r test_file; do
    if [ -f "$test_file" ]; then
      local rel_path=$(echo "$test_file" | sed "s|^$theme_path/||")
      echo "- \`$rel_path\`" >> "$manual_file"
    fi
  done
  
  echo "" >> "$manual_file"
  echo "## Detailed Test Documentation" >> "$manual_file"
  echo "" >> "$manual_file"
  
  # Process each system test file
  echo "$system_test_files" | while IFS= read -r test_file; do
    if [ -f "$test_file" ]; then
      extract_system_test_details "$test_file" "$manual_file"
    fi
  done
  
  # Add execution guide
  cat >> "$manual_file" << EOF

## System Test Execution Guide

### Prerequisites

1. **Environment Setup**
   \`\`\`bash
   npm install
   npm run build
   \`\`\`

2. **Service Dependencies**
   - Start all required services
   - Verify network connectivity
   - Check database availability

3. **Test Data**
   - Initialize test database
   - Load test fixtures
   - Configure test accounts

### Running System Tests

#### Run All System Tests
\`\`\`bash
npm run test:system
\`\`\`

#### Run Specific Test File
\`\`\`bash
npm test -- tests/system/<test-file>.systest.ts
\`\`\`

#### Run with Coverage
\`\`\`bash
npm run test:system:coverage
\`\`\`

#### Run in Debug Mode
\`\`\`bash
node --inspect-brk ./node_modules/.bin/jest tests/system
\`\`\`

### Test Execution Checklist

- [ ] Environment variables configured
- [ ] All dependencies installed
- [ ] Services are running
- [ ] Test database is clean
- [ ] Network connectivity verified
- [ ] Logging configured for debugging
- [ ] Test timeout settings appropriate

### Interpreting Results

#### Success Indicators
- All tests pass (green)
- No console errors
- Expected logs generated
- Performance within thresholds

#### Failure Investigation
1. Check error messages and stack traces
2. Review system logs
3. Verify test data state
4. Check service connectivity
5. Validate environment configuration

### Manual Verification

When running tests manually, verify:
1. **Functional Correctness**: Does the feature work as expected?
2. **Data Integrity**: Is data correctly stored/retrieved?
3. **Error Handling**: Are errors properly caught and reported?
4. **Performance**: Are response times acceptable?
5. **Security**: Are security measures effective?

## Troubleshooting

### Common Issues

| Issue | Possible Cause | Solution |
|-------|---------------|----------|
| Test timeout | Slow network/service | Increase timeout settings |
| Connection refused | Service not running | Start required services |
| Data conflicts | Dirty test database | Reset database before tests |
| Permission denied | Insufficient privileges | Check user permissions |
| Module not found | Missing dependencies | Run npm install |

### Debug Strategies

1. **Isolate the Test**: Run single test in isolation
2. **Add Logging**: Increase log verbosity
3. **Check State**: Verify pre/post conditions
4. **Step Through**: Use debugger to step through code
5. **Review Changes**: Check recent code changes

## Best Practices

1. **Test Independence**: Each test should be independent
2. **Clean State**: Always start with clean test environment
3. **Meaningful Names**: Use descriptive test names
4. **Comprehensive Coverage**: Test happy path and edge cases
5. **Performance Monitoring**: Track test execution time
6. **Documentation**: Keep test documentation updated

---
*Generated by test-as-manual system for system tests*
*Last Updated: $(date +"%Y-%m-%d")*
EOF
  
  echo "  ✓ Generated system test manual for $theme_name"
}

# Main execution
echo "========================================="
echo "System Test Documentation Enhancement"
echo "========================================="
echo "Generating enhanced documentation for system tests..."
echo ""

THEMES_WITH_SYSTEM_TESTS=(
  "infra_docker"
  "infra_external-log-lib"
  "infra_filesystem-mcp"
  "infra_python-env"
  "infra_realtime"
  "init_env-config"
  "llm-agent_coordinator-claude"
  "llm-agent_pocketflow"
  "portal_aidev"
  "portal_aiide"
  "portal_gui-selector"
)

PROCESSED_COUNT=0

for theme_name in "${THEMES_WITH_SYSTEM_TESTS[@]}"; do
  theme_path="$THEMES_DIR/$theme_name"
  if [ -d "$theme_path" ]; then
    generate_system_test_manual "$theme_name" "$theme_path"
    PROCESSED_COUNT=$((PROCESSED_COUNT + 1))
  fi
done

# Generate index for system test manuals
INDEX_FILE="$OUTPUT_DIR/INDEX.md"
cat > "$INDEX_FILE" << EOF
# System Test Documentation Index

**Generated**: $(date +"%Y-%m-%d %H:%M:%S")
**Total Themes with System Tests**: $PROCESSED_COUNT

## Overview

This index provides access to detailed system test documentation for themes that include system-level testing. Each manual contains comprehensive information about test scenarios, execution procedures, and troubleshooting guides.

## Theme System Test Manuals

| Theme | Manual | Description |
|-------|--------|-------------|
EOF

for theme_name in "${THEMES_WITH_SYSTEM_TESTS[@]}"; do
  if [ -f "$OUTPUT_DIR/${theme_name}_SYSTEM_TEST_MANUAL.md" ]; then
    theme_type=$(echo $theme_name | cut -d'_' -f1)
    component=$(echo $theme_name | cut -d'_' -f2-)
    echo "| $theme_name | [View Manual](${theme_name}_SYSTEM_TEST_MANUAL.md) | $theme_type - $component system tests |" >> "$INDEX_FILE"
  fi
done

cat >> "$INDEX_FILE" << EOF

## System Test Categories

### Infrastructure Tests
- Network communication
- Service integration
- Database operations
- File system operations
- Performance benchmarks

### Portal Tests
- User interface workflows
- Authentication flows
- Data visualization
- User interactions

### Agent Tests
- AI model integration
- Multi-agent coordination
- Context management
- Response validation

## Using System Test Documentation

1. **Select a theme** from the table above
2. **Review test scenarios** to understand coverage
3. **Follow execution guide** to run tests
4. **Use troubleshooting section** for issues
5. **Apply best practices** for test maintenance

## Quick Commands

### Run All System Tests
\`\`\`bash
npm run test:system
\`\`\`

### Generate Updated Documentation
\`\`\`bash
./scripts/enhance-system-tests-documentation.sh
\`\`\`

### View Test Coverage
\`\`\`bash
npm run test:system:coverage
\`\`\`

---
*System Test Documentation powered by test-as-manual*
EOF

echo ""
echo "========================================="
echo "System Test Documentation Complete"
echo "========================================="
echo "Themes processed: $PROCESSED_COUNT"
echo "Output directory: $OUTPUT_DIR"
echo ""
echo "View the index at: $OUTPUT_DIR/INDEX.md"