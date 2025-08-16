#!/bin/bash

# Verify the CLI framework build

set -e

echo "Verifying CLI Framework Build..."
echo

# Check if build was successful
if [ -d "dist" ]; then
  echo "✓ Build directory exists"
else
  echo "✗ Build directory not found"
  exit 1
fi

# Check main files
files=(
  "dist/index.js"
  "dist/index.d.ts"
  "dist/domain/command.js"
  "dist/domain/types.js"
  "dist/application/cli.js"
  "dist/application/parser.js"
  "dist/utils/string.js"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "✓ $file exists"
  else
    echo "✗ $file not found"
    exit 1
  fi
done

echo
echo "✓ All build artifacts verified!"