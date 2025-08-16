#!/bin/bash

echo "Fixing all async test syntax issues..."

# Fix files in common/tests-system/system/
for file in common/tests-system/system/*.stest.ts; do
  if [[ -f "$file" ]]; then
    echo "Fixing $file..."
    # Remove async from describe blocks
    sed -i 's/async describe(/describe(/g' "$file"
    # Fix nested async in test blocks
    sed -i 's/async test(/test(/g' "$file"
    # Fix double async in beforeAll/afterAll/beforeEach/afterEach
    sed -i 's/beforeAll(async async/beforeAll(async/g' "$file"
    sed -i 's/afterAll(async async/afterAll(async/g' "$file"
    sed -i 's/beforeEach(async async/beforeEach(async/g' "$file"
    sed -i 's/afterEach(async async/afterEach(async/g' "$file"
    # Fix double await
    sed -i 's/await await/await/g' "$file"
    # Fix async function declarations in test blocks
    sed -i 's/async function /function /g' "$file"
  fi
done

# Also fix the demo and scaffold files that appeared in the grep
sed -i 's/async describe(/describe(/g' layer/themes/infra_test-as-manual/user-stories/002-enhanced-manual-generator/examples/demo.ts 2>/dev/null || true
sed -i 's/async describe(/describe(/g' layer/themes/check_hea-architecture/user-stories/006-hea-implementation/scripts/scaffold.ts 2>/dev/null || true

echo "Done fixing async issues!"