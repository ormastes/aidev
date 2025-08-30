#!/bin/bash

# File Structure Compliance Check Script
# This script checks for violations of project file structure rules

set -e

echo "==========================================="
echo "File Structure Compliance Check"
echo "==========================================="

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Base directory
BASE_DIR="/home/ormastes/dev/pub/aidev"
cd "$BASE_DIR"

# Track violations
VIOLATIONS=()
WARNING_COUNT=0
ERROR_COUNT=0

echo -e "\n${YELLOW}Checking for rule violations...${NC}\n"

# Rule 1: No files should be created in root directory
echo "1. Checking root directory for non-standard files..."
ROOT_FILES=$(ls -la | grep -E "^-" | grep -v -E "\.(md|json|yml|yaml|lock|gitignore|code-workspace|jj)$" | awk '{print $9}' || true)

if [ ! -z "$ROOT_FILES" ]; then
    echo -e "${RED}✗ Found non-standard files in root directory:${NC}"
    while IFS= read -r file; do
        if [ ! -z "$file" ]; then
            echo "  - $file"
            VIOLATIONS+=("ROOT_FILE: $file")
            ((ERROR_COUNT++))
        fi
    done <<< "$ROOT_FILES"
else
    echo -e "${GREEN}✓ No non-standard files in root directory${NC}"
fi

# Rule 2: No backup or archive files
echo -e "\n2. Checking for backup and archive files..."
BACKUP_FILES=$(find . -name "*.bak" -o -name "*backup*" -o -name "*archive*" 2>/dev/null | grep -v node_modules | grep -v ".jj" || true)

if [ ! -z "$BACKUP_FILES" ]; then
    echo -e "${RED}✗ Found backup/archive files:${NC}"
    while IFS= read -r file; do
        if [ ! -z "$file" ]; then
            echo "  - $file"
            VIOLATIONS+=("BACKUP_FILE: $file")
            ((ERROR_COUNT++))
        fi
    done <<< "$BACKUP_FILES"
else
    echo -e "${GREEN}✓ No backup or archive files found${NC}"
fi

# Rule 3: No permanent files in temp directory
echo -e "\n3. Checking temp directory..."
if [ -d "temp" ]; then
    TEMP_FILES=$(find temp -type f 2>/dev/null | head -10 || true)
    if [ ! -z "$TEMP_FILES" ]; then
        echo -e "${YELLOW}⚠ Found files in temp directory:${NC}"
        while IFS= read -r file; do
            if [ ! -z "$file" ]; then
                echo "  - $file"
                VIOLATIONS+=("TEMP_FILE: $file")
                ((WARNING_COUNT++))
            fi
        done <<< "$TEMP_FILES"
    else
        echo -e "${GREEN}✓ Temp directory is empty${NC}"
    fi
else
    echo -e "${GREEN}✓ No temp directory found${NC}"
fi

# Rule 4: Check for proper directory structure
echo -e "\n4. Checking directory structure..."

# Expected directories
EXPECTED_DIRS=("gen/doc" "layer/themes" "scripts" "llm_rules" "doc")
MISSING_DIRS=()

for dir in "${EXPECTED_DIRS[@]}"; do
    if [ ! -d "$dir" ]; then
        MISSING_DIRS+=("$dir")
        ((WARNING_COUNT++))
    fi
done

if [ ${#MISSING_DIRS[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠ Missing expected directories:${NC}"
    for dir in "${MISSING_DIRS[@]}"; do
        echo "  - $dir"
        VIOLATIONS+=("MISSING_DIR: $dir")
    done
else
    echo -e "${GREEN}✓ All expected directories present${NC}"
fi

# Rule 5: Check for setup directory (should be in proper location)
echo -e "\n5. Checking setup directory location..."
SETUP_DIRS=$(find . -maxdepth 2 -name "setup" -type d | grep -v node_modules || true)

if [ ! -z "$SETUP_DIRS" ]; then
    echo -e "${YELLOW}⚠ Found setup directories in non-standard locations:${NC}"
    while IFS= read -r dir; do
        if [ ! -z "$dir" ] && [ "$dir" != "./setup" ]; then
            echo "  - $dir"
            VIOLATIONS+=("MISPLACED_SETUP: $dir")
            ((WARNING_COUNT++))
        fi
    done <<< "$SETUP_DIRS"
fi

# Rule 6: Check for files that should be in gen/doc
echo -e "\n6. Checking for misplaced documentation..."
MISPLACED_DOCS=$(find . -maxdepth 1 -name "*report*.md" -o -name "*summary*.md" -o -name "*analysis*.md" | grep -v README.md || true)

if [ ! -z "$MISPLACED_DOCS" ]; then
    echo -e "${YELLOW}⚠ Found documentation files in root that should be in gen/doc:${NC}"
    while IFS= read -r file; do
        if [ ! -z "$file" ]; then
            echo "  - $file"
            VIOLATIONS+=("MISPLACED_DOC: $file")
            ((WARNING_COUNT++))
        fi
    done <<< "$MISPLACED_DOCS"
else
    echo -e "${GREEN}✓ Documentation files properly located${NC}"
fi

# Check filesystem-mcp protection status
echo -e "\n${YELLOW}Checking filesystem-mcp protection status...${NC}\n"

# Check if protection server is configured
PROTECTION_FILES=(
    "layer/themes/infra_filesystem-mcp/src/ProtectedMCPServer.ts"
    "layer/themes/infra_filesystem-mcp/children/VFProtectedFileWrapper.ts"
)

PROTECTION_STATUS="ACTIVE"
for file in "${PROTECTION_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}✗ Protection file missing: $file${NC}"
        PROTECTION_STATUS="INCOMPLETE"
    fi
done

if [ "$PROTECTION_STATUS" == "ACTIVE" ]; then
    echo -e "${GREEN}✓ Protection mechanisms are in place${NC}"
else
    echo -e "${RED}✗ Protection mechanisms are incomplete${NC}"
fi

# Check if unified server includes protection
echo -e "\n7. Checking if unified server includes protection..."
if [ -f "layer/themes/infra_filesystem-mcp/src/unified-server.ts" ]; then
    if grep -q "VFProtectedFileWrapper" "layer/themes/infra_filesystem-mcp/src/unified-server.ts"; then
        echo -e "${GREEN}✓ Unified server includes protection${NC}"
    else
        echo -e "${RED}✗ Unified server DOES NOT include protection mechanisms${NC}"
        VIOLATIONS+=("NO_PROTECTION: unified-server.ts lacks VFProtectedFileWrapper")
        ((ERROR_COUNT++))
    fi
fi

# Generate report
REPORT_FILE="$BASE_DIR/gen/doc/file-structure-compliance-report.md"

cat > "$REPORT_FILE" << EOF
# File Structure Compliance Report

Generated: $(date)

## Summary

- **Errors Found**: $ERROR_COUNT
- **Warnings Found**: $WARNING_COUNT
- **Total Violations**: ${#VIOLATIONS[@]}

## Rule Violations

### Critical Issues (Errors)

EOF

# List errors
for violation in "${VIOLATIONS[@]}"; do
    if [[ "$violation" == "ROOT_FILE:"* ]] || [[ "$violation" == "BACKUP_FILE:"* ]] || [[ "$violation" == "NO_PROTECTION:"* ]]; then
        echo "- $violation" >> "$REPORT_FILE"
    fi
done

cat >> "$REPORT_FILE" << EOF

### Warnings

EOF

# List warnings
for violation in "${VIOLATIONS[@]}"; do
    if [[ "$violation" == "TEMP_FILE:"* ]] || [[ "$violation" == "MISSING_DIR:"* ]] || [[ "$violation" == "MISPLACED_"* ]]; then
        echo "- $violation" >> "$REPORT_FILE"
    fi
done

cat >> "$REPORT_FILE" << EOF

## Files That Should Be Moved or Removed

### Root Directory Files (Should be moved)
EOF

# List root files with suggested locations
if [ ! -z "$ROOT_FILES" ]; then
    while IFS= read -r file; do
        if [ ! -z "$file" ]; then
            case "$file" in
                *.sh)
                    echo "- $file → scripts/$file" >> "$REPORT_FILE"
                    ;;
                *.js|*.ts)
                    echo "- $file → appropriate theme directory" >> "$REPORT_FILE"
                    ;;
                *.ini|*.toml|*.babelrc|*.behaverc|.python-version)
                    echo "- $file → config/ or appropriate theme directory" >> "$REPORT_FILE"
                    ;;
                *)
                    echo "- $file → determine appropriate location" >> "$REPORT_FILE"
                    ;;
            esac
        fi
    done <<< "$ROOT_FILES"
fi

cat >> "$REPORT_FILE" << EOF

### Backup/Archive Files (Should be removed)
EOF

if [ ! -z "$BACKUP_FILES" ]; then
    while IFS= read -r file; do
        if [ ! -z "$file" ]; then
            echo "- $file" >> "$REPORT_FILE"
        fi
    done <<< "$BACKUP_FILES"
fi

cat >> "$REPORT_FILE" << EOF

## Root Cause Analysis

### Why filesystem-mcp protection failed:

1. **New unified-server.ts lacks protection**
   - The recently created unified-server.ts doesn't import or use VFProtectedFileWrapper
   - Direct file operations bypass protection mechanisms

2. **Protection not enforced at file creation**
   - Files are created directly without going through MCP server
   - No pre-commit hooks to prevent rule violations

3. **Missing integration**
   - Protection mechanisms exist but aren't integrated into all entry points
   - Multiple server implementations with inconsistent protection

## Recommended Actions

### Immediate
1. Remove all files from root directory that violate rules
2. Delete all backup and archive files
3. Integrate VFProtectedFileWrapper into unified-server.ts

### Short-term
1. Add pre-commit hooks to prevent rule violations
2. Create automated cleanup script
3. Update all MCP server implementations to use protection

### Long-term
1. Implement file system monitoring daemon
2. Add real-time rule enforcement
3. Create comprehensive test suite for rule compliance

## Commands to Fix Issues

\`\`\`bash
# Move root files to appropriate locations
mkdir -p scripts config
mv *.sh scripts/
mv pytest.ini pyproject.toml .babelrc .behaverc .python-version config/

# Remove backup files
find . -name "*.bak" -o -name "*backup*" -o -name "*archive*" | grep -v node_modules | xargs rm -rf

# Clean temp directory
rm -rf temp/*
\`\`\`
EOF

echo -e "\n${GREEN}Report generated: $REPORT_FILE${NC}"

# Summary
echo -e "\n==========================================="
echo "Compliance Check Summary"
echo "==========================================="
echo -e "${RED}Errors: $ERROR_COUNT${NC}"
echo -e "${YELLOW}Warnings: $WARNING_COUNT${NC}"
echo -e "Total Violations: ${#VIOLATIONS[@]}"

if [ $ERROR_COUNT -gt 0 ]; then
    echo -e "\n${RED}❌ File structure is NOT compliant with project rules${NC}"
    echo "Run the fix commands in the report to resolve issues"
    exit 1
else
    echo -e "\n${GREEN}✅ File structure is mostly compliant (warnings only)${NC}"
fi

exit 0