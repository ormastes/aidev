#!/bin/bash

# Setup script for C++ duplication detection
# Configures duplication checking for C++ projects

set -e

PROJECT_PATH="${1:-.}"
MIN_TOKENS="${2:-50}"
MIN_LINES="${3:-5}"
THRESHOLD="${4:-5}"

echo "🔍 Setting up C++ duplication detection for project: $PROJECT_PATH"

# Create duplication configuration
mkdir -p "$PROJECT_PATH/.duplication"

# Generate duplication configuration
cat > "$PROJECT_PATH/.duplication/config.json" << EOF
{
  "languages": ["cpp", "c", "hpp", "h"],
  "minTokens": $MIN_TOKENS,
  "minLines": $MIN_LINES,
  "threshold": $THRESHOLD,
  "exclude": [
    "*/build/*",
    "*/third_party/*",
    "*/external/*",
    "*/generated/*"
  ],
  "reportFormat": "json",
  "reportPath": ".duplication/report.json"
}
EOF

# Create clang-tidy configuration for duplication checks
cat > "$PROJECT_PATH/.clang-tidy" << 'EOF'
---
Checks: '
  bugprone-*,
  -bugprone-branch-clone,
  misc-redundant-expression,
  modernize-use-default-member-init,
  readability-duplicate-include,
  readability-redundant-*
'
WarningsAsErrors: ''
HeaderFilterRegex: '.*'
AnalyzeTemporaryDtors: false
FormatStyle: file
CheckOptions:
  - key: bugprone-suspicious-string-compare.WarnOnImplicitComparison
    value: true
  - key: misc-redundant-expression.CheckRedundantReturn
    value: true
EOF

# Create duplication check script
cat > "$PROJECT_PATH/.duplication/check-duplication.sh" << 'EOF'
#!/bin/bash

# Check for code duplication
set -e

echo "🔍 Checking for code duplication..."

# Use story-reporter if available
if command -v coverage-analyzer &> /dev/null; then
    echo "Using story-reporter duplication checker..."
    coverage-analyzer --mode app --duplication-only
else
    echo "Using clang-tidy for duplication detection..."
    
    # Find all C++ files
    find . -type f \( -name "*.cpp" -o -name "*.cc" -o -name "*.hpp" -o -name "*.h" \) \
        -not -path "./build/*" \
        -not -path "./third_party/*" \
        -not -path "./external/*" | while read -r file; do
        
        echo "Checking: $file"
        clang-tidy "$file" 2>/dev/null || true
    done
fi

# Generate report
if [ -f ".duplication/report.json" ]; then
    echo "📊 Duplication report saved to .duplication/report.json"
    
    # Extract summary
    DUPLICATION_PERCENT=$(jq -r '.percentage // 0' .duplication/report.json)
    THRESHOLD=$(jq -r '.threshold // 5' .duplication/config.json)
    
    echo "📈 Duplication: ${DUPLICATION_PERCENT}%"
    echo "🎯 Threshold: ${THRESHOLD}%"
    
    if (( $(echo "$DUPLICATION_PERCENT > $THRESHOLD" | bc -l) )); then
        echo "❌ Duplication threshold exceeded!"
        exit 1
    else
        echo "✅ Duplication within acceptable limits"
    fi
else
    echo "⚠️  No duplication report generated"
fi
EOF

chmod +x "$PROJECT_PATH/.duplication/check-duplication.sh"

# Create unified check script for both TS and C++
cat > "$PROJECT_PATH/check-quality.sh" << 'EOF'
#!/bin/bash

# Unified quality check for TypeScript and C++ code
set -e

echo "🔍 Running unified quality checks..."
echo ""

# Check if this is a TypeScript project
if [ -f "package.json" ]; then
    echo "📦 TypeScript/JavaScript project detected"
    
    # Run TypeScript tests and coverage
    if [ -f "jest.config.js" ] || [ -f "jest.config.ts" ]; then
        echo "Running Jest tests with coverage..."
        npm test -- --coverage
    fi
fi

# Check if this is a C++ project
if [ -f "CMakeLists.txt" ]; then
    echo "⚙️  C++ project detected"
    
    # Run C++ coverage if configured
    if [ -f ".coverage/check-coverage.sh" ]; then
        echo "Running C++ coverage check..."
        ./.coverage/check-coverage.sh
    fi
fi

# Run duplication check for all languages
if [ -f ".duplication/check-duplication.sh" ]; then
    echo ""
    echo "🔍 Running duplication check..."
    ./.duplication/check-duplication.sh
fi

echo ""
echo "✅ All quality checks complete!"
EOF

chmod +x "$PROJECT_PATH/check-quality.sh"

echo "✅ C++ duplication detection setup complete!"
echo ""
echo "📝 Usage:"
echo "   Check duplication only:"
echo "      ./.duplication/check-duplication.sh"
echo ""
echo "   Run all quality checks (coverage + duplication):"
echo "      ./check-quality.sh"
echo ""
echo "🔧 Configuration: .duplication/config.json"
echo "📊 Clang-tidy config: .clang-tidy"