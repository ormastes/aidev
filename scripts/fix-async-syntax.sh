#!/bin/bash

# Fix async syntax errors in TypeScript files
echo "Fixing async syntax errors..."

# Find all TypeScript files and fix common async syntax errors
find layer/ -name "*.ts" -type f -exec sed -i \
  -e 's/async if/if/g' \
  -e 's/async for/for/g' \
  -e 's/async while/while/g' \
  -e 's/async switch/switch/g' \
  -e 's/async try/try/g' \
  -e 's/async catch/catch/g' \
  -e 's/async constructor/constructor/g' \
  -e 's/await await/await/g' \
  {} \;

echo "Fixed async syntax errors in TypeScript files"