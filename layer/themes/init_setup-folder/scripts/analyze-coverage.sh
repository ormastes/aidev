#!/bin/bash

echo "=== Coverage Analysis Report ==="
echo "Date: $(date)"
echo ""

THEMES_DIR="/home/ormastes/dev/aidev/layer/themes"
TOTAL_THEMES=0
THEMES_WITH_TESTS=0
THEMES_WITH_COVERAGE=0

echo "Analyzing themes..."
echo ""

for theme_dir in $THEMES_DIR/*/; do
    if [ -d "$theme_dir" ]; then
        theme_name=$(basename "$theme_dir")
        TOTAL_THEMES=$((TOTAL_THEMES + 1))
        
        if [ -f "$theme_dir/package.json" ]; then
            # Check if test script exists
            if grep -q '"test"' "$theme_dir/package.json" 2>/dev/null; then
                THEMES_WITH_TESTS=$((THEMES_WITH_TESTS + 1))
                
                # Check if coverage script exists
                if grep -q '"test:coverage"' "$theme_dir/package.json" 2>/dev/null; then
                    THEMES_WITH_COVERAGE=$((THEMES_WITH_COVERAGE + 1))
                    echo "✅ $theme_name - Has coverage configuration"
                else
                    echo "⚠️  $theme_name - Has tests but no coverage"
                fi
            else
                echo "❌ $theme_name - No test configuration"
            fi
        fi
    fi
done

echo ""
echo "=== Summary ==="
echo "Total themes: $TOTAL_THEMES"
echo "Themes with tests: $THEMES_WITH_TESTS ($((THEMES_WITH_TESTS * 100 / TOTAL_THEMES))%)"
echo "Themes with coverage: $THEMES_WITH_COVERAGE ($((THEMES_WITH_COVERAGE * 100 / TOTAL_THEMES))%)"
echo ""

# Check for existing coverage reports
echo "=== Existing Coverage Reports ==="
for coverage_dir in $THEMES_DIR/*/coverage/; do
    if [ -d "$coverage_dir" ]; then
        theme_name=$(basename $(dirname "$coverage_dir"))
        if [ -f "$coverage_dir/coverage-summary.json" ]; then
            echo "📊 $theme_name has coverage report"
        fi
    fi
done

echo ""
echo "=== Recommendations ==="
echo "1. Enable coverage for all themes with existing tests"
echo "2. Add test infrastructure to themes without tests"
echo "3. Run coverage tests for all configured themes"
echo "4. Generate unified coverage report"