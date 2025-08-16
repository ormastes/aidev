#!/bin/bash

# Collect and aggregate test results

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="$(dirname "$SCRIPT_DIR")/results"

echo "📊 Collecting test results..."

# Create summary file
SUMMARY_FILE="$RESULTS_DIR/summary.json"

# Aggregate all JSON results
echo "{" > "$SUMMARY_FILE"
echo '  "timestamp": "'$(date -Iseconds)'",' >> "$SUMMARY_FILE"
echo '  "results": {' >> "$SUMMARY_FILE"

# Process each mode's results
first=true
for mode in strict enhanced basic; do
    # Find latest result file for this mode
    latest=$(ls -t "$RESULTS_DIR"/mcp-test-$mode-*.json 2>/dev/null | head -1)
    
    if [ -f "$latest" ]; then
        if [ "$first" = false ]; then
            echo "," >> "$SUMMARY_FILE"
        fi
        echo -n "    \"$mode\": " >> "$SUMMARY_FILE"
        cat "$latest" | jq -c '.' >> "$SUMMARY_FILE"
        first=false
    fi
done

echo "  }," >> "$SUMMARY_FILE"

# Add statistics
echo '  "statistics": {' >> "$SUMMARY_FILE"

# Count total tests
total_tests=$(find "$RESULTS_DIR" -name "*.json" -exec grep -h '"totalTests"' {} \; | grep -o '[0-9]*' | awk '{s+=$1} END {print s}')
total_passed=$(find "$RESULTS_DIR" -name "*.json" -exec grep -h '"totalPassed"' {} \; | grep -o '[0-9]*' | awk '{s+=$1} END {print s}')
total_failed=$(find "$RESULTS_DIR" -name "*.json" -exec grep -h '"totalFailed"' {} \; | grep -o '[0-9]*' | awk '{s+=$1} END {print s}')

echo "    \"totalTests\": ${total_tests:-0}," >> "$SUMMARY_FILE"
echo "    \"totalPassed\": ${total_passed:-0}," >> "$SUMMARY_FILE"
echo "    \"totalFailed\": ${total_failed:-0}," >> "$SUMMARY_FILE"

if [ "${total_tests:-0}" -gt 0 ]; then
    pass_rate=$((total_passed * 100 / total_tests))
else
    pass_rate=0
fi

echo "    \"passRate\": $pass_rate" >> "$SUMMARY_FILE"
echo "  }" >> "$SUMMARY_FILE"
echo "}" >> "$SUMMARY_FILE"

echo "✅ Results collected in $SUMMARY_FILE"

# Create consolidated markdown report
REPORT_FILE="$RESULTS_DIR/consolidated-report.md"

echo "# MCP Docker Test Results - Consolidated Report" > "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "Generated: $(date)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "## Overall Statistics" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "- Total Tests: ${total_tests:-0}" >> "$REPORT_FILE"
echo "- Total Passed: ${total_passed:-0}" >> "$REPORT_FILE"
echo "- Total Failed: ${total_failed:-0}" >> "$REPORT_FILE"
echo "- Pass Rate: ${pass_rate}%" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Add individual mode results
for mode in strict enhanced basic; do
    latest_md=$(ls -t "$RESULTS_DIR"/mcp-test-$mode-*.md 2>/dev/null | head -1)
    if [ -f "$latest_md" ]; then
        echo "## ${mode^^} Mode Results" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        tail -n +5 "$latest_md" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
    fi
done

echo "✅ Consolidated report created: $REPORT_FILE"