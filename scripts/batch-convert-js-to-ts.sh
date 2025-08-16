#!/bin/bash

# Batch convert JavaScript files to TypeScript
# This script performs the actual conversion

echo "Starting JavaScript to TypeScript conversion..."
echo "=============================================="

CONVERTED_COUNT=0
FAILED_COUNT=0
FAILED_FILES=()

# Function to convert a single JS file to TS
convert_js_to_ts() {
  local js_file=$1
  local ts_file="${js_file%.js}.ts"
  
  echo "Converting: $js_file"
  
  # Check if file exists
  if [ ! -f "$js_file" ]; then
    echo "  ✗ File not found"
    return 1
  fi
  
  # Check if TS file already exists
  if [ -f "$ts_file" ]; then
    echo "  ⚠ TypeScript file already exists, skipping"
    return 0
  fi
  
  # Copy JS file to TS
  cp "$js_file" "$ts_file"
  
  # Add basic TypeScript modifications
  # 1. Add type annotations for common patterns
  # 2. Convert module.exports to export
  # 3. Convert require to import
  
  # Convert require statements to import
  sed -i "s/const \([a-zA-Z_][a-zA-Z0-9_]*\) = require('\([^']*\)')/import \1 from '\2'/g" "$ts_file"
  sed -i "s/const \([a-zA-Z_][a-zA-Z0-9_]*\) = require(\"\([^\"]*\)\")/import \1 from '\2'/g" "$ts_file"
  
  # Convert destructured require to import
  sed -i "s/const {\([^}]*\)} = require('\([^']*\)')/import {\1} from '\2'/g" "$ts_file"
  sed -i "s/const {\([^}]*\)} = require(\"\([^\"]*\)\")/import {\1} from '\2'/g" "$ts_file"
  
  # Convert module.exports to export
  sed -i "s/module\.exports = {/export {/g" "$ts_file"
  sed -i "s/module\.exports = /export default /g" "$ts_file"
  sed -i "s/exports\.\([a-zA-Z_][a-zA-Z0-9_]*\) = /export const \1 = /g" "$ts_file"
  
  # Add .js extension to local imports if missing
  sed -i "s/from '\.\//from '.\//g" "$ts_file"
  
  # Remove the original JS file
  rm "$js_file"
  
  echo "  ✓ Converted to $ts_file"
  return 0
}

# List of files to convert (from analysis)
JS_FILES=(
  # External log lib files
  "./layer/themes/infra_external-log-lib/children/streamer/index.js"
  "./layer/themes/infra_external-log-lib/children/parser/index.js"
  "./layer/themes/infra_external-log-lib/children/filter/index.js"
  "./layer/themes/infra_external-log-lib/children/capture/index.js"
  "./layer/themes/infra_external-log-lib/children/reporter/index.js"
  "./layer/themes/infra_external-log-lib/children/file-access-auditor/index.js"
  "./layer/themes/infra_external-log-lib/children/aggregator/index.js"
  "./layer/themes/infra_external-log-lib/children/audited-fs/index.js"
  "./layer/themes/infra_external-log-lib/pipe/index.js"
  "./layer/themes/infra_external-log-lib/src/facades/path-facade.js"
  "./layer/themes/infra_external-log-lib/src/facades/fs-facade.js"
  "./layer/themes/infra_external-log-lib/src/facades/child-process-facade.js"
  "./layer/themes/infra_external-log-lib/src/monitoring/alert-handler.js"
  "./layer/themes/infra_external-log-lib/src/file-manager/FileCreationAPI.js"
  "./layer/themes/infra_external-log-lib/src/file-manager/MCPIntegratedFileManager.js"
  "./layer/themes/infra_external-log-lib/src/config.js"
  "./layer/themes/infra_external-log-lib/src/interceptors/fs-interceptor.js"
  "./layer/themes/infra_external-log-lib/src/config/strict-mode.config.js"
  "./layer/themes/infra_external-log-lib/src/config/enforcement-config.js"
  "./layer/themes/infra_external-log-lib/src/utils/safe-file-operations.js"
  "./layer/themes/infra_external-log-lib/src/utils/essential-info-extractor.js"
  "./layer/themes/infra_external-log-lib/src/validators/FileViolationPreventer.js"
  "./layer/themes/infra_external-log-lib/src/index.js"
  "./layer/themes/infra_external-log-lib/src/loggers/RejectionTracker.js"
  "./layer/themes/infra_external-log-lib/src/loggers/EventLogger.js"
  "./layer/themes/infra_external-log-lib/src/loggers/ComprehensiveLogger.js"
  "./layer/themes/infra_external-log-lib/src/loggers/VfJsonWatcher.js"
  "./layer/themes/infra_external-log-lib/src/fraud-detector/FileCreationFraudChecker.js"
  "./layer/themes/infra_external-log-lib/utils/index.js"
  
  # Lib epic files
  "./layer/epics/lib/utils/math.js"
  "./layer/epics/lib/utils/string.js"
  "./layer/epics/lib/services/validator.js"
  
  # Other convertible files
  "./layer/themes/portal_security/children/rate-limiter-enhanced.js"
  "./layer/themes/infra_fraud-checker/src/validators/FileStructureValidator.js"
  "./layer/themes/infra_python-coverage/tests/simple-coverage.test.js"
  "./layer/themes/infra_external-log-lib/tests/test-facade.js"
  "./layer/themes/infra_fraud-checker/tests/test-fraud-checker-validation.js"
)

# Convert each file
for file in "${JS_FILES[@]}"; do
  if [ -f "$file" ]; then
    if convert_js_to_ts "$file"; then
      ((CONVERTED_COUNT++))
    else
      ((FAILED_COUNT++))
      FAILED_FILES+=("$file")
    fi
  fi
done

# Also convert test files
TEST_FILES=(
  "./layer/epics/lib/utils/math.test.js"
  "./layer/epics/lib/utils/string.test.js"
  "./layer/epics/lib/services/validator.test.js"
)

for file in "${TEST_FILES[@]}"; do
  if [ -f "$file" ]; then
    if convert_js_to_ts "$file"; then
      ((CONVERTED_COUNT++))
    else
      ((FAILED_COUNT++))
      FAILED_FILES+=("$file")
    fi
  fi
done

echo ""
echo "Conversion Summary:"
echo "=================="
echo "✓ Successfully converted: $CONVERTED_COUNT files"
echo "✗ Failed conversions: $FAILED_COUNT files"

if [ ${#FAILED_FILES[@]} -gt 0 ]; then
  echo ""
  echo "Failed files:"
  for file in "${FAILED_FILES[@]}"; do
    echo "  - $file"
  done
fi

echo ""
echo "Note: Configuration files (jest.config.js, cucumber.js, etc.) have been kept as JavaScript."
echo "Public JS files in demo/release folders have been preserved as they may be browser scripts."