#!/bin/bash

# Architecture Check Logic for Fraud Checker Theme
# This contains all the actual checking logic for architecture compliance

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
THEME_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
PROJECT_ROOT="$( cd "$THEME_ROOT/../../.." && pwd )"

# Parse command line arguments
CHECK_TYPE="${1:-all}"  # all, layer-imports, pipe-compliance, mftod

# Track errors
TOTAL_ERRORS=0

# Function to check layer imports
check_layer_imports() {
    echo -e "${CYAN}=====================================${NC}"
    echo -e "${CYAN}Layer Import Violation Check${NC}"
    echo -e "${CYAN}=====================================${NC}"
    echo ""
    
    local errors=0
    
    # Define layer hierarchy
    echo -e "${BLUE}Layer Hierarchy:${NC}"
    echo "  ui → ui_logic → application → domain → core"
    echo "  external → domain only"
    echo ""
    
    # Check all TypeScript files
    for ts_file in $(find "$PROJECT_ROOT" -name "*.ts" -o -name "*.tsx" | grep -E "(src|layer)" | grep -v node_modules | grep -v dist | grep -v coverage); do
        # Determine which layer this file belongs to
        local file_layer=""
        if echo "$ts_file" | grep -q "/core/"; then
            file_layer="core"
        elif echo "$ts_file" | grep -q "/domain/"; then
            file_layer="domain"
        elif echo "$ts_file" | grep -q "/application/"; then
            file_layer="application"
        elif echo "$ts_file" | grep -q "/ui_logic/"; then
            file_layer="ui_logic"
        elif echo "$ts_file" | grep -q "/ui/"; then
            file_layer="ui"
        elif echo "$ts_file" | grep -q "/external/"; then
            file_layer="external"
        fi
        
        if [ -n "$file_layer" ]; then
            # Check imports in the file
            case "$file_layer" in
                "core")
                    # Core cannot import from any other layer
                    if grep -E "from ['\"][^'\"]*/(domain|application|ui_logic|ui|external)/" "$ts_file" > /dev/null 2>&1; then
                        echo -e "${RED}❌ Layer violation in $ts_file: core importing from higher layers${NC}"
                        ((errors++))
                    fi
                    ;;
                "domain")
                    # Domain cannot import from application, ui_logic, ui
                    if grep -E "from ['\"][^'\"]*/(application|ui_logic|ui)/" "$ts_file" > /dev/null 2>&1; then
                        echo -e "${RED}❌ Layer violation in $ts_file: domain importing from higher layers${NC}"
                        ((errors++))
                    fi
                    ;;
                "application")
                    # Application cannot import from ui_logic, ui
                    if grep -E "from ['\"][^'\"]*/(ui_logic|ui)/" "$ts_file" > /dev/null 2>&1; then
                        echo -e "${RED}❌ Layer violation in $ts_file: application importing from higher layers${NC}"
                        ((errors++))
                    fi
                    ;;
                "external")
                    # External should only import from domain
                    if grep -E "from ['\"][^'\"]*/(ui_logic|ui|application)/" "$ts_file" > /dev/null 2>&1; then
                        echo -e "${RED}❌ Layer violation in $ts_file: external importing from presentation layers${NC}"
                        ((errors++))
                    fi
                    ;;
            esac
        fi
    done
    
    if [ $errors -eq 0 ]; then
        echo -e "${GREEN}✅ No layer import violations found${NC}"
    else
        echo -e "${RED}Found $errors layer import violations${NC}"
        TOTAL_ERRORS=$((TOTAL_ERRORS + errors))
    fi
    
    return $errors
}

# Function to check pipe compliance
check_pipe_compliance() {
    echo -e "${CYAN}=====================================${NC}"
    echo -e "${CYAN}Pipe Gateway Compliance Check${NC}"
    echo -e "${CYAN}=====================================${NC}"
    echo ""
    
    local errors=0
    
    # Check all pipe/index.ts files exist
    for layer_dir in $(find "$PROJECT_ROOT" -type d -name "src" | grep -v node_modules | grep -v dist); do
        for layer in core domain application ui_logic ui external; do
            if [ -d "$layer_dir/$layer" ]; then
                if [ ! -f "$layer_dir/$layer/pipe/index.ts" ]; then
                    echo -e "${RED}❌ Missing pipe gateway: $layer_dir/$layer/pipe/index.ts${NC}"
                    ((errors++))
                else
                    # Check if pipe/index.ts has exports
                    if ! grep -E "^export" "$layer_dir/$layer/pipe/index.ts" > /dev/null 2>&1; then
                        echo -e "${YELLOW}⚠️  Empty pipe gateway: $layer_dir/$layer/pipe/index.ts${NC}"
                    fi
                fi
            fi
        done
    done
    
    # Check theme pipe gateways
    for theme_dir in "$PROJECT_ROOT"/layer/themes/*/; do
        if [ -d "$theme_dir" ]; then
            theme_name=$(basename "$theme_dir")
            if [ ! -f "$theme_dir/pipe/index.ts" ]; then
                echo -e "${RED}❌ Missing theme pipe gateway: $theme_name/pipe/index.ts${NC}"
                ((errors++))
            fi
        fi
    done
    
    # Check for bypassed pipe imports
    echo -e "${BLUE}Checking for bypassed pipe imports...${NC}"
    for ts_file in $(find "$PROJECT_ROOT" -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v dist | grep -v coverage); do
        # Skip pipe files themselves
        if echo "$ts_file" | grep -q "/pipe/"; then
            continue
        fi
        
        # Check for imports that go directly into layer subdirectories
        if grep -E "from ['\"][^'\"]*/src/(core|domain|application|ui_logic|ui|external)/[^/]+/[^'\"]+['\"]" "$ts_file" > /dev/null 2>&1; then
            echo -e "${RED}❌ Bypassed pipe import in $ts_file${NC}"
            ((errors++))
        fi
    done
    
    if [ $errors -eq 0 ]; then
        echo -e "${GREEN}✅ All pipe gateways are compliant${NC}"
    else
        echo -e "${RED}Found $errors pipe compliance issues${NC}"
        TOTAL_ERRORS=$((TOTAL_ERRORS + errors))
    fi
    
    return $errors
}

# Function to check MFTOD compliance
check_mftod_compliance() {
    echo -e "${CYAN}=====================================${NC}"
    echo -e "${CYAN}Mock-Free Test-Oriented Development Check${NC}"
    echo -e "${CYAN}=====================================${NC}"
    echo ""
    
    # Run the MFTOD compliance script
    if [ -f "$SCRIPT_DIR/MFTOD-compliant.sh" ]; then
        bash "$SCRIPT_DIR/MFTOD-compliant.sh"
        return $?
    else
        echo -e "${YELLOW}⚠️  MFTOD compliance script not found${NC}"
        return 1
    fi
}

# Function to run fraud detection
run_fraud_detection() {
    echo -e "${CYAN}=====================================${NC}"
    echo -e "${CYAN}Fraud Detection Analysis${NC}"
    echo -e "${CYAN}=====================================${NC}"
    echo ""
    
    # Run Python fraud checkers
    if [ -f "$SCRIPT_DIR/fix-all-frauds.py" ]; then
        echo -e "${BLUE}Running comprehensive fraud detection...${NC}"
        python3 "$SCRIPT_DIR/fix-all-frauds.py" --check-only
    fi
    
    # Run TypeScript fraud checker if available
    if [ -f "$SCRIPT_DIR/check-fraud.ts" ]; then
        echo -e "${BLUE}Running TypeScript fraud analysis...${NC}"
        cd "$THEME_ROOT" && npm run check-fraud -- --architecture
    fi
}

# Main execution based on check type
case "$CHECK_TYPE" in
    "layer-imports")
        check_layer_imports
        ;;
    "pipe-compliance")
        check_pipe_compliance
        ;;
    "mftod")
        check_mftod_compliance
        ;;
    "fraud")
        run_fraud_detection
        ;;
    "all")
        check_layer_imports
        echo ""
        check_pipe_compliance
        echo ""
        check_mftod_compliance
        echo ""
        run_fraud_detection
        ;;
    *)
        echo -e "${RED}Unknown check type: $CHECK_TYPE${NC}"
        echo "Usage: $0 [all|layer-imports|pipe-compliance|mftod|fraud]"
        exit 1
        ;;
esac

# Summary
echo ""
echo -e "${CYAN}=====================================${NC}"
echo -e "${CYAN}Architecture Check Summary${NC}"
echo -e "${CYAN}=====================================${NC}"

if [ $TOTAL_ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All architecture checks passed!${NC}"
else
    echo -e "${RED}❌ Found $TOTAL_ERRORS architecture issues${NC}"
    
    # Offer to run fixes
    echo ""
    echo -e "${BLUE}Run automated fixes? (y/n)${NC}"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        if [ -f "$SCRIPT_DIR/fix-all-frauds.py" ]; then
            python3 "$SCRIPT_DIR/fix-all-frauds.py" --architecture
        fi
        if [ -f "$SCRIPT_DIR/fix-working-on-pattern.py" ]; then
            python3 "$SCRIPT_DIR/fix-working-on-pattern.py"
        fi
    fi
fi

exit $TOTAL_ERRORS