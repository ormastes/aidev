#!/bin/bash

# Script to generate test documentation from all test files across themes
# This creates manual-style documentation from test code

set -e

THEMES_DIR="layer/themes"
OUTPUT_DIR="gen/test-manuals"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Function to extract test information from a test file
extract_test_info() {
  local test_file=$1
  local output_file=$2
  
  echo "## Test File: $(basename $test_file)" >> "$output_file"
  echo "" >> "$output_file"
  echo "**Path**: \`$test_file\`" >> "$output_file"
  echo "" >> "$output_file"
  
  # Extract describe blocks and test cases
  echo "### Test Suites" >> "$output_file"
  echo "" >> "$output_file"
  
  # Extract describe blocks
  grep -E "^\s*describe\(['\"]" "$test_file" 2>/dev/null | while read -r line; do
    suite_name=$(echo "$line" | sed -E "s/.*describe\(['\"]([^'\"]+).*/\1/")
    echo "- **$suite_name**" >> "$output_file"
  done || true
  
  echo "" >> "$output_file"
  echo "### Test Cases" >> "$output_file"
  echo "" >> "$output_file"
  
  # Extract test/it blocks with their descriptions
  grep -E "^\s*(test|it)\(['\"]" "$test_file" 2>/dev/null | while read -r line; do
    test_name=$(echo "$line" | sed -E "s/.*(test|it)\(['\"]([^'\"]+).*/\2/")
    echo "#### $test_name" >> "$output_file"
    echo "" >> "$output_file"
    echo "**Purpose**: This test verifies that $test_name" >> "$output_file"
    echo "" >> "$output_file"
    echo "**Steps**:" >> "$output_file"
    echo "1. Setup test environment" >> "$output_file"
    echo "2. Execute test scenario" >> "$output_file"
    echo "3. Verify expected outcome" >> "$output_file"
    echo "4. Cleanup test data" >> "$output_file"
    echo "" >> "$output_file"
  done || true
  
  echo "---" >> "$output_file"
  echo "" >> "$output_file"
}

# Function to generate manual for a theme
generate_theme_manual() {
  local theme_name=$1
  local theme_path=$2
  local manual_file="$OUTPUT_DIR/$theme_name/TEST_MANUAL.md"
  
  # Create theme directory
  mkdir -p "$OUTPUT_DIR/$theme_name"
  
  # Initialize manual file
  cat > "$manual_file" << EOF
# Test Manual - $theme_name

**Generated**: $(date +"%Y-%m-%d %H:%M:%S")
**Theme Path**: \`$theme_path\`

## Overview

This manual documents all tests for the $theme_name theme. It provides a comprehensive guide for understanding test coverage, test scenarios, and testing procedures.

## Theme Information

- **Type**: $(echo $theme_name | cut -d'_' -f1)
- **Component**: $(echo $theme_name | cut -d'_' -f2-)

## Test Structure

EOF
  
  # Count different types of tests
  local unit_count=$(find "$theme_path" -name "*.test.ts" -o -name "*.spec.ts" 2>/dev/null | grep -E "(unit|spec)" | wc -l || echo 0)
  local integration_count=$(find "$theme_path" -name "*.test.ts" -o -name "*.spec.ts" 2>/dev/null | grep -E "integration" | wc -l || echo 0)
  local system_count=$(find "$theme_path" -name "*.systest.ts" -o -name "*.test.ts" 2>/dev/null | grep -E "system" | wc -l || echo 0)
  
  echo "- **Unit Tests**: $unit_count files" >> "$manual_file"
  echo "- **Integration Tests**: $integration_count files" >> "$manual_file"
  echo "- **System Tests**: $system_count files" >> "$manual_file"
  echo "" >> "$manual_file"
  
  # Add test documentation sections
  echo "## Test Documentation" >> "$manual_file"
  echo "" >> "$manual_file"
  
  # Process unit tests
  echo "### Unit Tests" >> "$manual_file"
  echo "" >> "$manual_file"
  
  find "$theme_path" -path "*/tests/unit/*.ts" -o -path "*/tests/unit/*.js" 2>/dev/null | while read -r test_file; do
    if [ -f "$test_file" ]; then
      extract_test_info "$test_file" "$manual_file"
    fi
  done || true
  
  # Process integration tests
  echo "### Integration Tests" >> "$manual_file"
  echo "" >> "$manual_file"
  
  find "$theme_path" -path "*/tests/integration/*.ts" -o -path "*/tests/integration/*.js" 2>/dev/null | while read -r test_file; do
    if [ -f "$test_file" ]; then
      extract_test_info "$test_file" "$manual_file"
    fi
  done || true
  
  # Process system tests
  echo "### System Tests" >> "$manual_file"
  echo "" >> "$manual_file"
  
  find "$theme_path" -path "*/tests/system/*.ts" -o -path "*/tests/system/*.js" 2>/dev/null | while read -r test_file; do
    if [ -f "$test_file" ]; then
      extract_test_info "$test_file" "$manual_file"
    fi
  done || true
  
  # Add testing procedures section
  cat >> "$manual_file" << EOF

## Testing Procedures

### Environment Setup

1. Install dependencies: \`npm install\`
2. Configure environment variables
3. Initialize test database (if applicable)
4. Start required services

### Running Tests

\`\`\`bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run system tests
npm run test:system

# Run with coverage
npm run test:coverage
\`\`\`

### Test Data Management

- Test data location: \`tests/fixtures/\`
- Mock data: \`tests/mocks/\`
- Test configuration: \`tests/config/\`

### Continuous Integration

Tests are automatically run on:
- Pull request creation
- Push to main branch
- Nightly builds

## Coverage Requirements

- **Unit Test Coverage**: Minimum 90%
- **Integration Test Coverage**: Minimum 80%
- **System Test Coverage**: Critical paths only

## Troubleshooting

### Common Issues

1. **Test Timeout**
   - Increase timeout in test configuration
   - Check network connectivity
   - Verify service availability

2. **Test Data Issues**
   - Reset test database
   - Clear test cache
   - Regenerate fixtures

3. **Environment Issues**
   - Verify environment variables
   - Check service configurations
   - Review dependency versions

---
*Generated by test-as-manual documentation system*
EOF
  
  echo "  ✓ Generated manual for $theme_name"
}

# Main execution
echo "========================================="
echo "Test Documentation Generator"
echo "========================================="
echo "Generating test manuals from test files..."
echo ""

THEME_COUNT=0
TEST_COUNT=0

# Process each theme
for theme_dir in $THEMES_DIR/*/; do
  theme_name=$(basename "$theme_dir")
  
  # Check if theme has test files
  if find "$theme_dir" -name "*.test.ts" -o -name "*.spec.ts" -o -name "*.systest.ts" 2>/dev/null | grep -q .; then
    generate_theme_manual "$theme_name" "$theme_dir"
    THEME_COUNT=$((THEME_COUNT + 1))
    
    # Count tests in this theme
    theme_tests=$(find "$theme_dir" -name "*.test.ts" -o -name "*.spec.ts" -o -name "*.systest.ts" 2>/dev/null | wc -l || echo 0)
    TEST_COUNT=$((TEST_COUNT + theme_tests))
  fi
done

# Generate master index
INDEX_FILE="$OUTPUT_DIR/INDEX.md"
cat > "$INDEX_FILE" << EOF
# Test Documentation Index

**Generated**: $(date +"%Y-%m-%d %H:%M:%S")
**Total Themes**: $THEME_COUNT
**Total Test Files**: $TEST_COUNT

## Theme Documentation

| Theme | Test Manual | Test Count |
|-------|-------------|------------|
EOF

# Add links to each theme manual
for theme_dir in $OUTPUT_DIR/*/; do
  if [ -d "$theme_dir" ] && [ "$theme_dir" != "$OUTPUT_DIR/" ]; then
    theme_name=$(basename "$theme_dir")
    if [ -f "$theme_dir/TEST_MANUAL.md" ]; then
      test_count=$(find "$THEMES_DIR/$theme_name" -name "*.test.ts" -o -name "*.spec.ts" -o -name "*.systest.ts" 2>/dev/null | wc -l || echo 0)
      echo "| $theme_name | [View Manual]($theme_name/TEST_MANUAL.md) | $test_count |" >> "$INDEX_FILE"
    fi
  fi
done

cat >> "$INDEX_FILE" << EOF

## How to Use Test Manuals

1. **Navigate to a theme**: Click on "View Manual" link for the theme
2. **Review test documentation**: Each manual contains:
   - Test suite descriptions
   - Individual test cases
   - Testing procedures
   - Coverage requirements
3. **Execute tests**: Follow the testing procedures in each manual
4. **Report issues**: Document any test failures or gaps

## Manual Generation

To regenerate these manuals:
\`\`\`bash
./scripts/generate-test-documentation.sh
\`\`\`

---
*Generated by test-as-manual system*
EOF

echo ""
echo "========================================="
echo "Documentation Generation Complete"
echo "========================================="
echo "Themes documented: $THEME_COUNT"
echo "Total test files: $TEST_COUNT"
echo "Output directory: $OUTPUT_DIR"
echo ""
echo "View the index at: $OUTPUT_DIR/INDEX.md"