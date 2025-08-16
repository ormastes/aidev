#!/bin/bash

# Script to convert JavaScript files to TypeScript
# Handles special cases and reports files that cannot be converted

echo "JavaScript to TypeScript Conversion Analysis"
echo "============================================"

# Create report directory
REPORT_DIR="gen/doc/js-to-ts-conversion-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$REPORT_DIR"

# Files that should remain as JS (config files that tools expect as .js)
KEEP_AS_JS=(
  "jest.config.js"
  "cucumber.js"
  "webpack.config.js"
  "babel.config.js"
  ".eslintrc.js"
  "rollup.config.js"
  "playwright.config.js"
)

# Function to check if file should remain JS
should_keep_js() {
  local file=$1
  local basename=$(basename "$file")
  
  for pattern in "${KEEP_AS_JS[@]}"; do
    if [[ "$basename" == "$pattern" ]]; then
      return 0
    fi
  done
  return 1
}

# Find all JS files
echo "Finding all JavaScript files..."
JS_FILES=$(find . -name "*.js" \
  -not -path "./node_modules/*" \
  -not -path "./.venv/*" \
  -not -path "*/node_modules/*" \
  -not -path "*/dist/*" \
  -not -path "*/build/*" \
  -not -path "*/.next/*" \
  -not -path "*/coverage/*" \
  -not -path "*/compiled/*" \
  -type f)

# Categorize files
CONVERTIBLE=()
CONFIG_FILES=()
TEST_FILES=()
CANNOT_CONVERT=()

for file in $JS_FILES; do
  if should_keep_js "$file"; then
    CONFIG_FILES+=("$file")
  elif [[ "$file" == *".test.js" ]] || [[ "$file" == *".spec.js" ]]; then
    TEST_FILES+=("$file")
  elif [[ "$file" == *"compiled"* ]] || [[ "$file" == *"generated"* ]]; then
    CANNOT_CONVERT+=("$file")
  else
    CONVERTIBLE+=("$file")
  fi
done

# Generate report
cat > "$REPORT_DIR/conversion-report.md" << EOF
# JavaScript to TypeScript Conversion Report
Generated: $(date)

## Summary
- Total JS files found: $(echo "$JS_FILES" | wc -l)
- Convertible to TS: ${#CONVERTIBLE[@]}
- Test files to convert: ${#TEST_FILES[@]}
- Config files (keep as JS): ${#CONFIG_FILES[@]}
- Cannot convert: ${#CANNOT_CONVERT[@]}

## Files to Convert to TypeScript

### Source Files (${#CONVERTIBLE[@]} files)
EOF

for file in "${CONVERTIBLE[@]}"; do
  echo "- $file" >> "$REPORT_DIR/conversion-report.md"
done

cat >> "$REPORT_DIR/conversion-report.md" << EOF

### Test Files (${#TEST_FILES[@]} files)
EOF

for file in "${TEST_FILES[@]}"; do
  echo "- $file" >> "$REPORT_DIR/conversion-report.md"
done

cat >> "$REPORT_DIR/conversion-report.md" << EOF

## Files to Keep as JavaScript

### Configuration Files (${#CONFIG_FILES[@]} files)
These files should remain as .js because tools expect them in JavaScript format:
EOF

for file in "${CONFIG_FILES[@]}"; do
  echo "- $file" >> "$REPORT_DIR/conversion-report.md"
done

cat >> "$REPORT_DIR/conversion-report.md" << EOF

## Files That Cannot Be Converted (${#CANNOT_CONVERT[@]} files)
These are generated or compiled files:
EOF

for file in "${CANNOT_CONVERT[@]}"; do
  echo "- $file" >> "$REPORT_DIR/conversion-report.md"
done

echo ""
echo "Report generated at: $REPORT_DIR/conversion-report.md"
echo ""
echo "Summary:"
echo "- Convertible source files: ${#CONVERTIBLE[@]}"
echo "- Test files to convert: ${#TEST_FILES[@]}"
echo "- Config files (keep as JS): ${#CONFIG_FILES[@]}"
echo "- Cannot convert: ${#CANNOT_CONVERT[@]}"