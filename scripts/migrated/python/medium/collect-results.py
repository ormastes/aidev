#!/usr/bin/env python3
"""
Migrated from: collect-results.sh
Auto-generated Python - 2025-08-16T04:57:27.604Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Collect and aggregate test results
    subprocess.run("SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"", shell=True)
    subprocess.run("RESULTS_DIR="$(dirname "$SCRIPT_DIR")/results"", shell=True)
    print("📊 Collecting test results...")
    # Create summary file
    subprocess.run("SUMMARY_FILE="$RESULTS_DIR/summary.json"", shell=True)
    # Aggregate all JSON results
    print("{") > "$SUMMARY_FILE"
    print("'  ")timestamp": "'$(date -Iseconds)'",' >> "$SUMMARY_FILE"
    print("'  ")results": {' >> "$SUMMARY_FILE"
    # Process each mode's results
    subprocess.run("first=true", shell=True)
    for mode in [strict enhanced basic; do]:
    # Find latest result file for this mode
    subprocess.run("latest=$(ls -t "$RESULTS_DIR"/mcp-test-$mode-*.json 2>/dev/null | head -1)", shell=True)
    if -f "$latest" :; then
    if "$first" = false :; then
    print(",") >> "$SUMMARY_FILE"
    print("-n ")    \"$mode\": " >> "$SUMMARY_FILE"
    subprocess.run("cat "$latest" | jq -c '.' >> "$SUMMARY_FILE"", shell=True)
    subprocess.run("first=false", shell=True)
    print("  },") >> "$SUMMARY_FILE"
    # Add statistics
    print("'  ")statistics": {' >> "$SUMMARY_FILE"
    # Count total tests
    subprocess.run("total_tests=$(find "$RESULTS_DIR" -name "*.json" -exec grep -h '"totalTests"' {} \; | grep -o '[0-9]*' | awk '{s+=$1} END {print s}')", shell=True)
    subprocess.run("total_passed=$(find "$RESULTS_DIR" -name "*.json" -exec grep -h '"totalPassed"' {} \; | grep -o '[0-9]*' | awk '{s+=$1} END {print s}')", shell=True)
    subprocess.run("total_failed=$(find "$RESULTS_DIR" -name "*.json" -exec grep -h '"totalFailed"' {} \; | grep -o '[0-9]*' | awk '{s+=$1} END {print s}')", shell=True)
    print("    \")totalTests\": ${total_tests:-0}," >> "$SUMMARY_FILE"
    print("    \")totalPassed\": ${total_passed:-0}," >> "$SUMMARY_FILE"
    print("    \")totalFailed\": ${total_failed:-0}," >> "$SUMMARY_FILE"
    if "${total_tests:-0}" -gt 0 :; then
    subprocess.run("pass_rate=$((total_passed * 100 / total_tests))", shell=True)
    else:
    subprocess.run("pass_rate=0", shell=True)
    print("    \")passRate\": $pass_rate" >> "$SUMMARY_FILE"
    print("  }") >> "$SUMMARY_FILE"
    print("}") >> "$SUMMARY_FILE"
    print("✅ Results collected in $SUMMARY_FILE")
    # Create consolidated markdown report
    subprocess.run("REPORT_FILE="$RESULTS_DIR/consolidated-report.md"", shell=True)
    print("# MCP Docker Test Results - Consolidated Report") > "$REPORT_FILE"
    print("") >> "$REPORT_FILE"
    print("Generated: $(date)") >> "$REPORT_FILE"
    print("") >> "$REPORT_FILE"
    print("## Overall Statistics") >> "$REPORT_FILE"
    print("") >> "$REPORT_FILE"
    print("- Total Tests: ${total_tests:-0}") >> "$REPORT_FILE"
    print("- Total Passed: ${total_passed:-0}") >> "$REPORT_FILE"
    print("- Total Failed: ${total_failed:-0}") >> "$REPORT_FILE"
    print("- Pass Rate: ${pass_rate}%") >> "$REPORT_FILE"
    print("") >> "$REPORT_FILE"
    # Add individual mode results
    for mode in [strict enhanced basic; do]:
    subprocess.run("latest_md=$(ls -t "$RESULTS_DIR"/mcp-test-$mode-*.md 2>/dev/null | head -1)", shell=True)
    if -f "$latest_md" :; then
    print("## ${mode^^} Mode Results") >> "$REPORT_FILE"
    print("") >> "$REPORT_FILE"
    subprocess.run("tail -n +5 "$latest_md" >> "$REPORT_FILE"", shell=True)
    print("") >> "$REPORT_FILE"
    print("✅ Consolidated report created: $REPORT_FILE")

if __name__ == "__main__":
    main()