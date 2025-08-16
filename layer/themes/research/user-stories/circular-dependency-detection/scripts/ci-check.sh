#!/bin/bash

##
# CI/CD integration script for circular dependency checking
##

set -e

# Default values
MAX_CYCLES=0
LANGUAGES="typescript,cpp,python"
CONFIG_FILE=""
OUTPUT_DIR="./ci-circular-deps-report"
EXIT_ON_FAILURE=true
VERBOSE=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${BLUE}[CI-CHECK]${NC} $1"
    fi
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Help function
show_help() {
    cat << EOF
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
EOF
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -l|--languages)
                LANGUAGES="$2"
                shift 2
                ;;
            -c|--config)
                CONFIG_FILE="$2"
                shift 2
                ;;
            -m|--max-cycles)
                MAX_CYCLES="$2"
                shift 2
                ;;
            -o|--output)
                OUTPUT_DIR="$2"
                shift 2
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            --no-fail)
                EXIT_ON_FAILURE=false
                shift
                ;;
            --report-only)
                EXIT_ON_FAILURE=false
                MAX_CYCLES=999999  # Effectively unlimited
                shift
                ;;
            -*)
                print_error "Unknown option: $1"
                show_help
                exit 2
                ;;
            *)
                PROJECT_PATH="$1"
                shift
                ;;
        esac
    done
    
    if [ -z "$PROJECT_PATH" ]; then
        print_error "Project path is required"
        show_help
        exit 2
    fi
    
    if [ ! -d "$PROJECT_PATH" ]; then
        print_error "Project path does not exist: $PROJECT_PATH"
        exit 2
    fi
}

# Check if the tool is available
check_tool() {
    if [ ! -f "$(dirname "$0")/../dist/cli/index.js" ]; then
        print_error "Circular dependency detection tool not built"
        print_status "Run 'npm run build' first"
        exit 2
    fi
}

# Run the circular dependency check
run_check() {
    local project_path="$1"
    local temp_report_file
    
    print_status "Starting circular dependency analysis..."
    print_status "Project: $project_path"
    print_status "Languages: $LANGUAGES"
    print_status "Max allowed cycles: $MAX_CYCLES"
    
    # Prepare output directory
    mkdir -p "$OUTPUT_DIR"
    
    # Build command
    local cmd_args=()
    cmd_args+=("$(dirname "$0")/../dist/cli/index.js" "analyze" "$project_path")
    cmd_args+=("--languages" "$LANGUAGES")
    cmd_args+=("--output" "$OUTPUT_DIR")
    cmd_args+=("--format" "json")
    
    if [ -n "$CONFIG_FILE" ]; then
        cmd_args+=("--config" "$CONFIG_FILE")
    fi
    
    # Run analysis
    if [ "$VERBOSE" = true ]; then
        print_status "Running: node ${cmd_args[*]}"
    fi
    
    if ! node "${cmd_args[@]}" >&2; then
        print_error "Analysis failed"
        return 2
    fi
    
    # Parse results
    local report_file="$OUTPUT_DIR/report.json"
    if [ ! -f "$report_file" ]; then
        print_error "Report file not found: $report_file"
        return 2
    fi
    
    # Extract total cycles from report
    local total_cycles
    if command -v jq >/dev/null 2>&1; then
        total_cycles=$(jq -r '.summary.total_circular_dependencies' "$report_file" 2>/dev/null || echo "unknown")
    else
        # Fallback parsing without jq
        total_cycles=$(grep -o '"total_circular_dependencies":[0-9]*' "$report_file" | cut -d: -f2 | head -n1)
    fi
    
    if [ -z "$total_cycles" ] || [ "$total_cycles" = "null" ]; then
        total_cycles="unknown"
    fi
    
    print_status "Analysis completed"
    print_status "Total circular dependencies found: $total_cycles"
    
    # Generate additional reports
    generate_reports "$project_path"
    
    # Check against limit
    if [ "$total_cycles" = "unknown" ]; then
        print_warning "Could not determine cycle count from report"
        if [ "$EXIT_ON_FAILURE" = true ]; then
            return 2
        else
            return 0
        fi
    fi
    
    if [ "$total_cycles" -gt "$MAX_CYCLES" ]; then
        print_error "Found $total_cycles circular dependencies (max allowed: $MAX_CYCLES)"
        
        # Show details if available
        if command -v jq >/dev/null 2>&1; then
            print_status "Circular dependencies by language:"
            jq -r '.results[] | select(.circular_dependencies | length > 0) | "\(.language): \(.circular_dependencies | length)"' "$report_file" | sed 's/^/  /'
        fi
        
        if [ "$EXIT_ON_FAILURE" = true ]; then
            return 1
        else
            print_warning "Continuing despite circular dependencies (--no-fail mode)"
            return 0
        fi
    else
        print_success "Circular dependencies within acceptable limit ($total_cycles/$MAX_CYCLES)"
        return 0
    fi
}

# Generate additional reports
generate_reports() {
    local project_path="$1"
    
    print_status "Generating additional reports..."
    
    # HTML report
    if node "$(dirname "$0")/../dist/cli/index.js" analyze "$project_path" \
        --languages "$LANGUAGES" \
        --output "$OUTPUT_DIR" \
        --format "html" \
        ${CONFIG_FILE:+--config "$CONFIG_FILE"} >/dev/null 2>&1; then
        print_status "HTML report generated: $OUTPUT_DIR/report.html"
    else
        print_warning "Failed to generate HTML report"
    fi
    
    # Text report  
    if node "$(dirname "$0")/../dist/cli/index.js" analyze "$project_path" \
        --languages "$LANGUAGES" \
        --output "$OUTPUT_DIR" \
        --format "text" \
        ${CONFIG_FILE:+--config "$CONFIG_FILE"} >/dev/null 2>&1; then
        print_status "Text report generated: $OUTPUT_DIR/report.txt"
    else
        print_warning "Failed to generate text report"
    fi
    
    # Visualization (if possible)
    if node "$(dirname "$0")/../dist/cli/index.js" visualize "$project_path" \
        --languages "$LANGUAGES" \
        --output "$OUTPUT_DIR/dependency-graph.svg" \
        >/dev/null 2>&1; then
        print_status "Visualization generated: $OUTPUT_DIR/dependency-graph.svg"
    else
        print_warning "Failed to generate visualization"
    fi
}

# Generate CI summary
generate_ci_summary() {
    local exit_code="$1"
    local summary_file="$OUTPUT_DIR/ci-summary.txt"
    
    cat > "$summary_file" << EOF
Circular Dependency Analysis Summary
===================================

Date: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
Project: $PROJECT_PATH
Languages: $LANGUAGES
Max Allowed Cycles: $MAX_CYCLES

Result: $(case $exit_code in
    0) echo "PASS" ;;
    1) echo "FAIL - Circular dependencies found" ;;
    2) echo "ERROR - Analysis failed" ;;
    *) echo "UNKNOWN" ;;
esac)

Reports Generated:
- JSON: $OUTPUT_DIR/report.json
- HTML: $OUTPUT_DIR/report.html
- Text: $OUTPUT_DIR/report.txt
- Visualization: $OUTPUT_DIR/dependency-graph.svg

EOF
    
    if [ -f "$OUTPUT_DIR/report.json" ] && command -v jq >/dev/null 2>&1; then
        echo "Detailed Results:" >> "$summary_file"
        jq -r '.results[] | "- \(.language): \(.circular_dependencies | length) circular dependencies"' "$OUTPUT_DIR/report.json" >> "$summary_file"
    fi
    
    print_status "CI summary saved: $summary_file"
}

# Main function
main() {
    local exit_code
    
    # Parse arguments
    parse_arguments "$@"
    
    # Check if tool is available
    check_tool
    
    # Run the check
    if run_check "$PROJECT_PATH"; then
        exit_code=0
    else
        exit_code=$?
    fi
    
    # Generate CI summary
    generate_ci_summary "$exit_code"
    
    # Exit with appropriate code
    exit "$exit_code"
}

# Run if called directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi