#!/usr/bin/env bun
/**
 * Migrated from: generate-report.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.692Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Generate final HTML report from test results
  await $`SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"`;
  await $`RESULTS_DIR="$(dirname "$SCRIPT_DIR")/results"`;
  await $`REPORT_FILE="$RESULTS_DIR/test-report.html"`;
  console.log("📄 Generating HTML report...");
  // Start HTML document
  await $`cat > "$REPORT_FILE" << 'EOF'`;
  await $`<!DOCTYPE html>`;
  await $`<html lang="en">`;
  await $`<head>`;
  await $`<meta charset="UTF-8">`;
  await $`<meta name="viewport" content="width=device-width, initial-scale=1.0">`;
  await $`<title>MCP Docker Test Report</title>`;
  await $`<style>`;
  await $`body {`;
  await $`font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;`;
  await $`line-height: 1.6;`;
  await $`color: #333;`;
  await $`max-width: 1200px;`;
  await $`margin: 0 auto;`;
  await $`padding: 20px;`;
  await $`background-color: #f5f5f5;`;
  await $`}`;
  await $`h1 {`;
  await $`color: #2c3e50;`;
  await $`border-bottom: 3px solid #3498db;`;
  await $`padding-bottom: 10px;`;
  await $`}`;
  await $`h2 {`;
  await $`color: #34495e;`;
  await $`margin-top: 30px;`;
  await $`}`;
  await $`.summary {`;
  await $`background: white;`;
  await $`padding: 20px;`;
  await $`border-radius: 8px;`;
  await $`box-shadow: 0 2px 4px rgba(0,0,0,0.1);`;
  await $`margin-bottom: 30px;`;
  await $`}`;
  await $`.stats {`;
  await $`display: grid;`;
  await $`grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));`;
  await $`gap: 20px;`;
  await $`margin-top: 20px;`;
  await $`}`;
  await $`.stat-card {`;
  await $`background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);`;
  await $`color: white;`;
  await $`padding: 20px;`;
  await $`border-radius: 8px;`;
  await $`text-align: center;`;
  await $`}`;
  await $`.stat-value {`;
  await $`font-size: 2em;`;
  await $`font-weight: bold;`;
  await $`}`;
  await $`.stat-label {`;
  await $`font-size: 0.9em;`;
  await $`opacity: 0.9;`;
  await $`margin-top: 5px;`;
  await $`}`;
  await $`.mode-results {`;
  await $`background: white;`;
  await $`padding: 20px;`;
  await $`border-radius: 8px;`;
  await $`box-shadow: 0 2px 4px rgba(0,0,0,0.1);`;
  await $`margin-bottom: 20px;`;
  await $`}`;
  await $`.pass {`;
  await $`color: #27ae60;`;
  await $`font-weight: bold;`;
  await $`}`;
  await $`.fail {`;
  await $`color: #e74c3c;`;
  await $`font-weight: bold;`;
  await $`}`;
  await $`.warning {`;
  await $`color: #f39c12;`;
  await $`font-weight: bold;`;
  await $`}`;
  await $`table {`;
  await $`width: 100%;`;
  await $`border-collapse: collapse;`;
  await $`margin-top: 10px;`;
  await $`}`;
  await $`th, td {`;
  await $`padding: 10px;`;
  await $`text-align: left;`;
  await $`border-bottom: 1px solid #ddd;`;
  await $`}`;
  await $`th {`;
  await $`background-color: #f8f9fa;`;
  await $`font-weight: 600;`;
  await $`}`;
  await $`.timestamp {`;
  await $`color: #7f8c8d;`;
  await $`font-size: 0.9em;`;
  await $`margin-top: 30px;`;
  await $`text-align: center;`;
  await $`}`;
  await $`.violation-badge {`;
  await $`display: inline-block;`;
  await $`padding: 2px 8px;`;
  await $`border-radius: 4px;`;
  await $`font-size: 0.85em;`;
  await $`margin: 2px;`;
  await $`}`;
  await $`.violation-error {`;
  await $`background-color: #ff4757;`;
  await $`color: white;`;
  await $`}`;
  await $`.violation-warning {`;
  await $`background-color: #ffa502;`;
  await $`color: white;`;
  await $`}`;
  await $`.violation-info {`;
  await $`background-color: #3742fa;`;
  await $`color: white;`;
  await $`}`;
  await $`</style>`;
  await $`</head>`;
  await $`<body>`;
  await $`<h1>🧪 MCP Docker Test Report</h1>`;
  await $`EOF`;
  // Read summary data
  if (-f "$RESULTS_DIR/summary.json" ) {; then
  await $`total_tests=$(jq -r '.statistics.totalTests // 0' "$RESULTS_DIR/summary.json")`;
  await $`total_passed=$(jq -r '.statistics.totalPassed // 0' "$RESULTS_DIR/summary.json")`;
  await $`total_failed=$(jq -r '.statistics.totalFailed // 0' "$RESULTS_DIR/summary.json")`;
  await $`pass_rate=$(jq -r '.statistics.passRate // 0' "$RESULTS_DIR/summary.json")`;
  } else {
  await $`total_tests=0`;
  await $`total_passed=0`;
  await $`total_failed=0`;
  await $`pass_rate=0`;
  }
  // Add summary section
  await $`cat >> "$REPORT_FILE" << EOF`;
  await $`<div class="summary">`;
  await $`<h2>Test Summary</h2>`;
  await $`<div class="stats">`;
  await $`<div class="stat-card">`;
  await $`<div class="stat-value">$total_tests</div>`;
  await $`<div class="stat-label">Total Tests</div>`;
  await $`</div>`;
  await $`<div class="stat-card" style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);">`;
  await $`<div class="stat-value">$total_passed</div>`;
  await $`<div class="stat-label">Passed</div>`;
  await $`</div>`;
  await $`<div class="stat-card" style="background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);">`;
  await $`<div class="stat-value">$total_failed</div>`;
  await $`<div class="stat-label">Failed</div>`;
  await $`</div>`;
  await $`<div class="stat-card" style="background: linear-gradient(135deg, #FC466B 0%, #3F5EFB 100%);">`;
  await $`<div class="stat-value">${pass_rate}%</div>`;
  await $`<div class="stat-label">Pass Rate</div>`;
  await $`</div>`;
  await $`</div>`;
  await $`</div>`;
  await $`EOF`;
  // Add results for each mode
  for (const mode of [strict enhanced basic; do]) {
  await $`latest=$(ls -t "$RESULTS_DIR"/mcp-test-$mode-*.json 2>/dev/null | head -1)`;
  if (-f "$latest" ) {; then
  await $`mode_tests=$(jq -r '.summary.totalTests // 0' "$latest")`;
  await $`mode_passed=$(jq -r '.summary.totalPassed // 0' "$latest")`;
  await $`mode_failed=$(jq -r '.summary.totalFailed // 0' "$latest")`;
  await $`mode_rate=$(jq -r '.summary.passRate // 0' "$latest")`;
  await $`cat >> "$REPORT_FILE" << EOF`;
  await $`<div class="mode-results">`;
  await $`<h2>${mode^^} Mode Results</h2>`;
  await $`<table>`;
  await $`<tr>`;
  await $`<th>Metric</th>`;
  await $`<th>Value</th>`;
  await $`<th>Status</th>`;
  await $`</tr>`;
  await $`<tr>`;
  await $`<td>Total Tests</td>`;
  await $`<td>$mode_tests</td>`;
  await $`<td>-</td>`;
  await $`</tr>`;
  await $`<tr>`;
  await $`<td>Passed</td>`;
  await $`<td>$mode_passed</td>`;
  await $`<td class="pass">✅</td>`;
  await $`</tr>`;
  await $`<tr>`;
  await $`<td>Failed</td>`;
  await $`<td>$mode_failed</td>`;
  await $`<td class="fail">$([ $mode_failed -gt 0 ] && echo "❌" || echo "✅")</td>`;
  await $`</tr>`;
  await $`<tr>`;
  await $`<td>Pass Rate</td>`;
  await $`<td>${mode_rate}%</td>`;
  await $`<td class="$([ $mode_rate -ge 80 ] && echo "pass" || echo "warning")">`;
  await $`$([ $mode_rate -ge 80 ] && echo "✅" || echo "⚠️")`;
  await $`</td>`;
  await $`</tr>`;
  await $`</table>`;
  await $`EOF`;
  // Add violation details if available
  await $`violations=$(ls -t "$RESULTS_DIR"/violations-*.json 2>/dev/null | head -1)`;
  if (-f "$violations" ) {; then
  await $`cat >> "$REPORT_FILE" << EOF`;
  await $`<h3>Violations Detected</h3>`;
  await $`<div>`;
  await $`EOF`;
  await $`jq -r '.byType | to_entries[] | "<span class=\"violation-badge violation-\(.value.severity)\">\(.key): \(.value.count)</span>"' "$violations" >> "$REPORT_FILE" 2>/dev/null || true`;
  await $`cat >> "$REPORT_FILE" << EOF`;
  await $`</div>`;
  await $`EOF`;
  }
  console.log("    </div>"); >> "$REPORT_FILE"
  }
  }
  // Add timestamp
  await $`cat >> "$REPORT_FILE" << EOF`;
  await $`<div class="timestamp">`;
  await $`Report generated: $(date)`;
  await $`</div>`;
  await $`</body>`;
  await $`</html>`;
  await $`EOF`;
  console.log("✅ HTML report generated: $REPORT_FILE");
  // Open report if possible
  await $`if command -v xdg-open &> /dev/null; then`;
  console.log("Opening report in browser...");
  await $`xdg-open "$REPORT_FILE"`;
  await $`elif command -v open &> /dev/null; then`;
  console.log("Opening report in browser...");
  await $`open "$REPORT_FILE"`;
  } else {
  console.log("Report available at: $REPORT_FILE");
  }
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}