#!/bin/bash

# Simple script to run fraud checks on all themes

echo "🔍 Running Fraud Checks on All Themes"
echo "===================================="
echo ""

# Create output directory
mkdir -p gen/doc/fraud-reports

# Get all theme directories
themes_dir="layer/themes"
themes=$(ls -d $themes_dir/*/ | grep -v "temp/" | sort)

# Summary counters
total_themes=0
passed_themes=0
failed_themes=0

# Run fraud check on each theme
for theme_path in $themes; do
    theme_name=$(basename "$theme_path")
    echo "Checking $theme_name..."
    
    # Skip if no test files
    if ! find "$theme_path" -name "*.test.ts" -o -name "*.spec.ts" | grep -q .; then
        echo "  ⏭️  No test files found, skipping"
        continue
    fi
    
    # Run the fraud checker using node directly
    output_file="gen/doc/fraud-reports/${theme_name}-fraud-report.json"
    
    # Use node to run the compiled JavaScript
    if node layer/themes/fraud-checker/dist/scripts/check-fraud.js "$theme_path" -o "$output_file" 2>/dev/null; then
        echo "  ✅ PASSED"
        ((passed_themes++))
    else
        echo "  ❌ FAILED"
        ((failed_themes++))
    fi
    
    ((total_themes++))
done

echo ""
echo "📊 Summary"
echo "========="
echo "Total themes checked: $total_themes"
echo "Passed: $passed_themes"
echo "Failed: $failed_themes"
echo ""
echo "Reports saved in: gen/doc/fraud-reports/"