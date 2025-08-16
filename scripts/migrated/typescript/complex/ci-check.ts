#!/usr/bin/env bun
/**
 * Migrated from: ci-check.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.684Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // #
  // CI/CD integration script for circular dependency checking
  // #
  await $`set -e`;
  // Default values
  await $`MAX_CYCLES=0`;
  await $`LANGUAGES="typescript,cpp,python"`;
  await $`CONFIG_FILE=""`;
  await $`OUTPUT_DIR="./ci-circular-deps-report"`;
  await $`EXIT_ON_FAILURE=true`;
  await $`VERBOSE=false`;
  // Colors for output
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`BLUE='\033[0;34m'`;
  await $`NC='\033[0m' # No Color`;
  await $`print_status() {`;
  if ("$VERBOSE" = true ) {; then
  console.log("-e ");${BLUE}[CI-CHECK]${NC} $1"
  }
  await $`}`;
  await $`print_success() {`;
  console.log("-e ");${GREEN}[SUCCESS]${NC} $1"
  await $`}`;
  await $`print_warning() {`;
  console.log("-e ");${YELLOW}[WARNING]${NC} $1"
  await $`}`;
  await $`print_error() {`;
  console.log("-e ");${RED}[ERROR]${NC} $1"
  await $`}`;
  // Help function
  await $`show_help() {`;
  const heredoc = `
Circular Dependency CI/CD Check Script

Usage: $0 [options] <project-path>

Arguments:
  project-path              Path to the project to analyze

Options:
  -h, --help               Show this help message
  -l, --languages LANGS    Comma-separated list of languages (default: typescript,cpp,python)
  -c, --config FILE        Configuration file path
  -m, --max-cycles NUM     Maximum allowed circular dependencies (default: 0)
  -o, --output DIR         Output directory for reports (default: ./ci-circular-deps-report)
  -v, --verbose            Enable verbose output
  --no-fail                Don't exit with error code on failure
  --report-only            Generate reports without failing the build
  
Examples:
  $0 /path/to/project                          # Check with defaults
  $0 -l typescript -m 5 /path/to/project       # Allow up to 5 TypeScript cycles
  $0 -c circular-deps.config.json .           # Use custom config
  $0 --report-only --verbose /path/to/project # Generate detailed report only

Exit Codes:
  0 - No issues or cycles within allowed limit
  1 - Circular dependencies exceed allowed limit
  2 - Analysis failed or configuration error
  `;
  await $`}`;
  // Parse command line arguments
  await $`parse_arguments() {`;
  while ([[ $# -gt 0 ]]; do) {
  await $`case $1 in`;
  await $`-h|--help)`;
  await $`show_help`;
  process.exit(0);
  await $`;;`;
  await $`-l|--languages)`;
  await $`LANGUAGES="$2"`;
  await $`shift 2`;
  await $`;;`;
  await $`-c|--config)`;
  await $`CONFIG_FILE="$2"`;
  await $`shift 2`;
  await $`;;`;
  await $`-m|--max-cycles)`;
  await $`MAX_CYCLES="$2"`;
  await $`shift 2`;
  await $`;;`;
  await $`-o|--output)`;
  await $`OUTPUT_DIR="$2"`;
  await $`shift 2`;
  await $`;;`;
  await $`-v|--verbose)`;
  await $`VERBOSE=true`;
  await $`shift`;
  await $`;;`;
  await $`--no-fail)`;
  await $`EXIT_ON_FAILURE=false`;
  await $`shift`;
  await $`;;`;
  await $`--report-only)`;
  await $`EXIT_ON_FAILURE=false`;
  await $`MAX_CYCLES=999999  # Effectively unlimited`;
  await $`shift`;
  await $`;;`;
  await $`-*)`;
  await $`print_error "Unknown option: $1"`;
  await $`show_help`;
  process.exit(2);
  await $`;;`;
  await $`*)`;
  await $`PROJECT_PATH="$1"`;
  await $`shift`;
  await $`;;`;
  await $`esac`;
  }
  if (-z "$PROJECT_PATH" ) {; then
  await $`print_error "Project path is required"`;
  await $`show_help`;
  process.exit(2);
  }
  if (! -d "$PROJECT_PATH" ) {; then
  await $`print_error "Project path does not exist: $PROJECT_PATH"`;
  process.exit(2);
  }
  await $`}`;
  // Check if the tool is available
  await $`check_tool() {`;
  if (! -f "$(dirname "$0")/../dist/cli/index.js" ) {; then
  await $`print_error "Circular dependency detection tool not built"`;
  await $`print_status "Run 'npm run build' first"`;
  process.exit(2);
  }
  await $`}`;
  // Run the circular dependency check
  await $`run_check() {`;
  await $`local project_path="$1"`;
  await $`local temp_report_file`;
  await $`print_status "Starting circular dependency analysis..."`;
  await $`print_status "Project: $project_path"`;
  await $`print_status "Languages: $LANGUAGES"`;
  await $`print_status "Max allowed cycles: $MAX_CYCLES"`;
  // Prepare output directory
  await mkdir(""$OUTPUT_DIR"", { recursive: true });
  // Build command
  await $`local cmd_args=()`;
  await $`cmd_args+=("$(dirname "$0")/../dist/cli/index.js" "analyze" "$project_path")`;
  await $`cmd_args+=("--languages" "$LANGUAGES")`;
  await $`cmd_args+=("--output" "$OUTPUT_DIR")`;
  await $`cmd_args+=("--format" "json")`;
  if (-n "$CONFIG_FILE" ) {; then
  await $`cmd_args+=("--config" "$CONFIG_FILE")`;
  }
  // Run analysis
  if ("$VERBOSE" = true ) {; then
  await $`print_status "Running: node ${cmd_args[*]}"`;
  }
  await $`if ! node "${cmd_args[@]}" >&2; then`;
  await $`print_error "Analysis failed"`;
  await $`return 2`;
  }
  // Parse results
  await $`local report_file="$OUTPUT_DIR/report.json"`;
  if (! -f "$report_file" ) {; then
  await $`print_error "Report file not found: $report_file"`;
  await $`return 2`;
  }
  // Extract total cycles from report
  await $`local total_cycles`;
  await $`if command -v jq >/dev/null 2>&1; then`;
  await $`total_cycles=$(jq -r '.summary.total_circular_dependencies' "$report_file" 2>/dev/null || echo "unknown")`;
  } else {
  // Fallback parsing without jq
  await $`total_cycles=$(grep -o '"total_circular_dependencies":[0-9]*' "$report_file" | cut -d: -f2 | head -n1)`;
  }
  if (-z "$total_cycles" ] || [ "$total_cycles" = "null" ) {; then
  await $`total_cycles="unknown"`;
  }
  await $`print_status "Analysis completed"`;
  await $`print_status "Total circular dependencies found: $total_cycles"`;
  // Generate additional reports
  await $`generate_reports "$project_path"`;
  // Check against limit
  if ("$total_cycles" = "unknown" ) {; then
  await $`print_warning "Could not determine cycle count from report"`;
  if ("$EXIT_ON_FAILURE" = true ) {; then
  await $`return 2`;
  } else {
  await $`return 0`;
  }
  }
  if ("$total_cycles" -gt "$MAX_CYCLES" ) {; then
  await $`print_error "Found $total_cycles circular dependencies (max allowed: $MAX_CYCLES)"`;
  // Show details if available
  await $`if command -v jq >/dev/null 2>&1; then`;
  await $`print_status "Circular dependencies by language:"`;
  await $`jq -r '.results[] | select(.circular_dependencies | length > 0) | "\(.language): \(.circular_dependencies | length)"' "$report_file" | sed 's/^/  /'`;
  }
  if ("$EXIT_ON_FAILURE" = true ) {; then
  await $`return 1`;
  } else {
  await $`print_warning "Continuing despite circular dependencies (--no-fail mode)"`;
  await $`return 0`;
  }
  } else {
  await $`print_success "Circular dependencies within acceptable limit ($total_cycles/$MAX_CYCLES)"`;
  await $`return 0`;
  }
  await $`}`;
  // Generate additional reports
  await $`generate_reports() {`;
  await $`local project_path="$1"`;
  await $`print_status "Generating additional reports..."`;
  // HTML report
  await $`if node "$(dirname "$0")/../dist/cli/index.js" analyze "$project_path" \`;
  await $`--languages "$LANGUAGES" \`;
  await $`--output "$OUTPUT_DIR" \`;
  await $`--format "html" \`;
  await $`${CONFIG_FILE:+--config "$CONFIG_FILE"} >/dev/null 2>&1; then`;
  await $`print_status "HTML report generated: $OUTPUT_DIR/report.html"`;
  } else {
  await $`print_warning "Failed to generate HTML report"`;
  }
  // Text report
  await $`if node "$(dirname "$0")/../dist/cli/index.js" analyze "$project_path" \`;
  await $`--languages "$LANGUAGES" \`;
  await $`--output "$OUTPUT_DIR" \`;
  await $`--format "text" \`;
  await $`${CONFIG_FILE:+--config "$CONFIG_FILE"} >/dev/null 2>&1; then`;
  await $`print_status "Text report generated: $OUTPUT_DIR/report.txt"`;
  } else {
  await $`print_warning "Failed to generate text report"`;
  }
  // Visualization (if possible)
  await $`if node "$(dirname "$0")/../dist/cli/index.js" visualize "$project_path" \`;
  await $`--languages "$LANGUAGES" \`;
  await $`--output "$OUTPUT_DIR/dependency-graph.svg" \`;
  await $`>/dev/null 2>&1; then`;
  await $`print_status "Visualization generated: $OUTPUT_DIR/dependency-graph.svg"`;
  } else {
  await $`print_warning "Failed to generate visualization"`;
  }
  await $`}`;
  // Generate CI summary
  await $`generate_ci_summary() {`;
  await $`local exit_code="$1"`;
  await $`local summary_file="$OUTPUT_DIR/ci-summary.txt"`;
  await $`cat > "$summary_file" << EOF`;
  await $`Circular Dependency Analysis Summary`;
  await $`===================================`;
  await $`Date: $(date -u +"%Y-%m-%d %H:%M:%S UTC")`;
  await $`Project: $PROJECT_PATH`;
  await $`Languages: $LANGUAGES`;
  await $`Max Allowed Cycles: $MAX_CYCLES`;
  await $`Result: $(case $exit_code in`;
  await $`0) echo "PASS" ;;`;
  await $`1) echo "FAIL - Circular dependencies found" ;;`;
  await $`2) echo "ERROR - Analysis failed" ;;`;
  await $`*) echo "UNKNOWN" ;;`;
  await $`esac)`;
  await $`Reports Generated:`;
  await $`- JSON: $OUTPUT_DIR/report.json`;
  await $`- HTML: $OUTPUT_DIR/report.html`;
  await $`- Text: $OUTPUT_DIR/report.txt`;
  await $`- Visualization: $OUTPUT_DIR/dependency-graph.svg`;
  await $`EOF`;
  if (-f "$OUTPUT_DIR/report.json" ) { && command -v jq >/dev/null 2>&1; then
  console.log("Detailed Results:"); >> "$summary_file"
  await $`jq -r '.results[] | "- \(.language): \(.circular_dependencies | length) circular dependencies"' "$OUTPUT_DIR/report.json" >> "$summary_file"`;
  }
  await $`print_status "CI summary saved: $summary_file"`;
  await $`}`;
  // Main function
  await $`main() {`;
  await $`local exit_code`;
  // Parse arguments
  await $`parse_arguments "$@"`;
  // Check if tool is available
  await $`check_tool`;
  // Run the check
  await $`if run_check "$PROJECT_PATH"; then`;
  await $`exit_code=0`;
  } else {
  await $`exit_code=$?`;
  }
  // Generate CI summary
  await $`generate_ci_summary "$exit_code"`;
  // Exit with appropriate code
  await $`exit "$exit_code"`;
  await $`}`;
  // Run if called directly
  if ("${BASH_SOURCE[0]}" = "${0}" ) {; then
  await $`main "$@"`;
  }
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}