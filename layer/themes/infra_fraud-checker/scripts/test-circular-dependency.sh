#!/bin/bash

# Test circular dependency detection integration
# This script demonstrates the fraud checker using story reporter's circular dependency detection

echo "🔍 Testing Circular Dependency Detection Integration"
echo "===================================================="
echo ""

# Set project root
PROJECT_ROOT="${1:-../../../}"

echo "Analyzing project: $PROJECT_ROOT"
echo ""

# Run the circular dependency example
echo "Running circular dependency detection..."
npx ts-node ../examples/circular-dependency-example.ts "$PROJECT_ROOT"

echo ""
echo "✅ Test complete!"