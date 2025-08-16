#!/bin/bash

# Fix async describe and async beforeAll in test files
echo "Fixing async describe and async beforeAll issues..."

# List of files to fix
files=(
  "common/tests-system/system/config-manager-system.stest.ts"
  "common/tests-system/system/coverage-analyzer-system.stest.ts"
  "common/tests-system/system/test-environment-system.stest.ts"
  "common/tests-system/system/branch-coverage-enhancement.stest.ts"
  "common/tests-system/system/duplication-detector-system.stest.ts"
  "common/tests-system/system/enhanced-branch-coverage-system.stest.ts"
  "common/tests-system/system/runnable-comment-system.stest.ts"
  "common/tests-system/system/theme-manager-fraud-checker-system.stest.ts"
  "common/tests-system/system/comprehensive-branch-coverage.stest.ts"
  "common/tests-system/system/error-edge-case-coverage.stest.ts"
  "common/tests-system/system/report-generator-system.stest.ts"
)

for file in "${files[@]}"; do
  if [[ -f "$file" ]]; then
    echo "Fixing $file..."
    # Remove async from describe
    sed -i 's/^async describe(/describe(/g' "$file"
    # Remove async from beforeAll, beforeEach, afterAll, afterEach
    sed -i 's/async beforeAll(/beforeAll(async /g' "$file"
    sed -i 's/async beforeEach(/beforeEach(async /g' "$file"
    sed -i 's/async afterAll(/afterAll(async /g' "$file"
    sed -i 's/async afterEach(/afterEach(async /g' "$file"
    # Remove async from it
    sed -i 's/async it(/it(/g' "$file"
  fi
done

echo "Done fixing async test syntax!"