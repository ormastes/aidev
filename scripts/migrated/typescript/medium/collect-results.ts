#!/usr/bin/env bun
/**
 * Migrated from: collect-results.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.603Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Collect and aggregate test results
  await $`SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"`;
  await $`RESULTS_DIR="$(dirname "$SCRIPT_DIR")/results"`;
  console.log("📊 Collecting test results...");
  // Create summary file
  await $`SUMMARY_FILE="$RESULTS_DIR/summary.json"`;
  // Aggregate all JSON results
  console.log("{"); > "$SUMMARY_FILE"
  console.log("'  ");timestamp": "'$(date -Iseconds)'",' >> "$SUMMARY_FILE"
  console.log("'  ");results": {' >> "$SUMMARY_FILE"
  // Process each mode's results
  await $`first=true`;
  for (const mode of [strict enhanced basic; do]) {
  // Find latest result file for this mode
  await $`latest=$(ls -t "$RESULTS_DIR"/mcp-test-$mode-*.json 2>/dev/null | head -1)`;
  if (-f "$latest" ) {; then
  if ("$first" = false ) {; then
  console.log(","); >> "$SUMMARY_FILE"
  }
  console.log("-n ");    \"$mode\": " >> "$SUMMARY_FILE"
  await $`cat "$latest" | jq -c '.' >> "$SUMMARY_FILE"`;
  await $`first=false`;
  }
  }
  console.log("  },"); >> "$SUMMARY_FILE"
  // Add statistics
  console.log("'  ");statistics": {' >> "$SUMMARY_FILE"
  // Count total tests
  await $`total_tests=$(find "$RESULTS_DIR" -name "*.json" -exec grep -h '"totalTests"' {} \; | grep -o '[0-9]*' | awk '{s+=$1} END {print s}')`;
  await $`total_passed=$(find "$RESULTS_DIR" -name "*.json" -exec grep -h '"totalPassed"' {} \; | grep -o '[0-9]*' | awk '{s+=$1} END {print s}')`;
  await $`total_failed=$(find "$RESULTS_DIR" -name "*.json" -exec grep -h '"totalFailed"' {} \; | grep -o '[0-9]*' | awk '{s+=$1} END {print s}')`;
  console.log("    \");totalTests\": ${total_tests:-0}," >> "$SUMMARY_FILE"
  console.log("    \");totalPassed\": ${total_passed:-0}," >> "$SUMMARY_FILE"
  console.log("    \");totalFailed\": ${total_failed:-0}," >> "$SUMMARY_FILE"
  if ("${total_tests:-0}" -gt 0 ) {; then
  await $`pass_rate=$((total_passed * 100 / total_tests))`;
  } else {
  await $`pass_rate=0`;
  }
  console.log("    \");passRate\": $pass_rate" >> "$SUMMARY_FILE"
  console.log("  }"); >> "$SUMMARY_FILE"
  console.log("}"); >> "$SUMMARY_FILE"
  console.log("✅ Results collected in $SUMMARY_FILE");
  // Create consolidated markdown report
  await $`REPORT_FILE="$RESULTS_DIR/consolidated-report.md"`;
  console.log("# MCP Docker Test Results - Consolidated Report"); > "$REPORT_FILE"
  console.log(""); >> "$REPORT_FILE"
  console.log("Generated: $(date)"); >> "$REPORT_FILE"
  console.log(""); >> "$REPORT_FILE"
  console.log("## Overall Statistics"); >> "$REPORT_FILE"
  console.log(""); >> "$REPORT_FILE"
  console.log("- Total Tests: ${total_tests:-0}"); >> "$REPORT_FILE"
  console.log("- Total Passed: ${total_passed:-0}"); >> "$REPORT_FILE"
  console.log("- Total Failed: ${total_failed:-0}"); >> "$REPORT_FILE"
  console.log("- Pass Rate: ${pass_rate}%"); >> "$REPORT_FILE"
  console.log(""); >> "$REPORT_FILE"
  // Add individual mode results
  for (const mode of [strict enhanced basic; do]) {
  await $`latest_md=$(ls -t "$RESULTS_DIR"/mcp-test-$mode-*.md 2>/dev/null | head -1)`;
  if (-f "$latest_md" ) {; then
  console.log("## ${mode^^} Mode Results"); >> "$REPORT_FILE"
  console.log(""); >> "$REPORT_FILE"
  await $`tail -n +5 "$latest_md" >> "$REPORT_FILE"`;
  console.log(""); >> "$REPORT_FILE"
  }
  }
  console.log("✅ Consolidated report created: $REPORT_FILE");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}