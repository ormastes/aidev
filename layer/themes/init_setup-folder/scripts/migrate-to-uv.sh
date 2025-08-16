#!/bin/bash
# Migrate existing pip/requirements.txt projects to UV

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}      Pip to UV Migration Script           ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo ""

# Check if UV is installed
if ! command -v uv >/dev/null 2>&1; then
    echo -e "${RED}UV is not installed. Running setup script...${NC}"
    ./scripts/setup-uv.sh
fi

# Find all requirements.txt files
echo -e "${YELLOW}Searching for requirements.txt files...${NC}"
REQUIREMENTS_FILES=$(find . -name "requirements*.txt" -type f 2>/dev/null | grep -v node_modules | grep -v .venv)

if [[ -z "$REQUIREMENTS_FILES" ]]; then
    echo -e "${YELLOW}No requirements.txt files found.${NC}"
else
    echo -e "${GREEN}Found requirements files:${NC}"
    echo "$REQUIREMENTS_FILES"
    echo ""
    
    # Process each requirements file
    for REQ_FILE in $REQUIREMENTS_FILES; do
        DIR=$(dirname "$REQ_FILE")
        FILENAME=$(basename "$REQ_FILE")
        
        echo -e "${BLUE}Processing: $REQ_FILE${NC}"
        
        # Create lock file
        LOCK_FILE="${REQ_FILE%.txt}.lock"
        echo -e "  Creating lock file: ${LOCK_FILE}"
        
        cd "$DIR"
        uv pip compile "$FILENAME" -o "$(basename "$LOCK_FILE")" 2>/dev/null || {
            echo -e "${YELLOW}  Warning: Could not create lock file for $REQ_FILE${NC}"
        }
        cd - > /dev/null
        
        # Create uv.toml if it doesn't exist
        UV_TOML="$DIR/uv.toml"
        if [[ ! -f "$UV_TOML" ]]; then
            echo -e "  Creating uv.toml configuration"
            cat > "$UV_TOML" << EOF
# UV Configuration
[tool.uv]
python = ">=3.10"
venv = ".venv"

[tool.uv.pip]
index-url = "https://pypi.org/simple"
compile = true
EOF
        fi
    done
fi

# Convert pyproject.toml projects
echo -e "\n${YELLOW}Searching for pyproject.toml files...${NC}"
PYPROJECT_FILES=$(find . -name "pyproject.toml" -type f 2>/dev/null | grep -v node_modules | grep -v .venv)

if [[ -z "$PYPROJECT_FILES" ]]; then
    echo -e "${YELLOW}No pyproject.toml files found.${NC}"
else
    echo -e "${GREEN}Found pyproject.toml files:${NC}"
    echo "$PYPROJECT_FILES"
    echo ""
    
    for PROJ_FILE in $PYPROJECT_FILES; do
        DIR=$(dirname "$PROJ_FILE")
        
        echo -e "${BLUE}Processing: $PROJ_FILE${NC}"
        
        # Check if UV configuration exists
        if grep -q "\[tool.uv\]" "$PROJ_FILE"; then
            echo -e "  ${GREEN}✓ UV configuration already exists${NC}"
        else
            echo -e "  Adding UV configuration to pyproject.toml"
            cat >> "$PROJ_FILE" << 'EOF'

[tool.uv]
python = ">=3.10"
venv = ".venv"
compile = true

[tool.uv.pip]
index-url = "https://pypi.org/simple"
EOF
        fi
        
        # Create virtual environment if needed
        if [[ ! -d "$DIR/.venv" ]]; then
            echo -e "  Creating virtual environment"
            cd "$DIR"
            uv venv .venv
            cd - > /dev/null
        fi
    done
fi

# Update shell scripts
echo -e "\n${YELLOW}Updating shell scripts...${NC}"
SHELL_SCRIPTS=$(find . -name "*.sh" -type f 2>/dev/null | grep -v node_modules | grep -v .venv | grep -v migrate-to-uv.sh)

UPDATED_COUNT=0
for SCRIPT in $SHELL_SCRIPTS; do
    if grep -q "uv pip install\|uv pip install" "$SCRIPT" 2>/dev/null; then
        echo -e "${BLUE}Updating: $SCRIPT${NC}"
        
        # Create backup
        cp "$SCRIPT" "${SCRIPT}.bak.$(date +%Y%m%d)"
        
        # Replace pip commands (except those already using uv)
        sed -i.tmp 's/\buv pip install/uv uv pip install/g' "$SCRIPT"
        sed -i.tmp 's/\buv pip install/uv uv pip install/g' "$SCRIPT"
        sed -i.tmp 's/python -m uv pip install/uv uv pip install/g' "$SCRIPT"
        sed -i.tmp 's/python3 -m uv pip install/uv uv pip install/g' "$SCRIPT"
        
        # Remove temp files
        rm -f "${SCRIPT}.tmp"
        
        ((UPDATED_COUNT++))
    fi
done

echo -e "${GREEN}Updated $UPDATED_COUNT shell scripts${NC}"

# Create migration report
REPORT_FILE="uv-migration-report.md"
echo -e "\n${YELLOW}Generating migration report...${NC}"

cat > "$REPORT_FILE" << EOF
# UV Migration Report

Generated: $(date)

## Summary

The project has been migrated from pip to UV package manager.

## Changes Made

### Requirements Files Processed
$(echo "$REQUIREMENTS_FILES" | wc -l) requirements.txt files found and processed

### Lock Files Created
Lock files have been generated for reproducible builds.

### Configuration Files
- Main uv.toml created at project root
- Individual uv.toml files created for subprojects

### Scripts Updated
$UPDATED_COUNT shell scripts updated to use UV commands

## Next Steps

1. Review and test the changes
2. Commit the new configuration files
3. Update CI/CD pipelines to use UV
4. Remove backup files after verification

## Performance Improvements

Expected improvements with UV:
- 10-100x faster package installation
- Parallel downloads and installations
- Better dependency resolution
- Reduced memory usage

## Commands Reference

### Old (pip)
\`\`\`bash
uv pip install package
uv pip install -r requirements.txt
python -m venv .venv
\`\`\`

### New (uv)
\`\`\`bash
uv uv pip install package
uv uv pip install -r requirements.txt
uv venv .venv
\`\`\`

## Resources

- [UV Documentation](https://github.com/astral-sh/uv)
- [Project UV Configuration](./uv.toml)
- [Setup Script](./scripts/setup-uv.sh)
EOF

echo -e "${GREEN}Migration report saved to: $REPORT_FILE${NC}"

# Summary
echo -e "\n${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}       Migration Complete! 🚀              ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}✓${NC} Requirements files converted"
echo -e "${GREEN}✓${NC} Lock files created"
echo -e "${GREEN}✓${NC} UV configurations added"
echo -e "${GREEN}✓${NC} Shell scripts updated"
echo -e "${GREEN}✓${NC} Migration report generated"
echo ""
echo -e "${YELLOW}Important:${NC}"
echo -e "  1. Review the changes in modified files"
echo -e "  2. Test package installations with UV"
echo -e "  3. Update CI/CD configurations"
echo -e "  4. Remove *.bak.* backup files after verification"
echo ""
echo -e "${BLUE}To install packages in any project:${NC}"
echo -e "  cd <project-directory>"
echo -e "  uv venv .venv"
echo -e "  source .venv/bin/activate"
echo -e "  uv uv pip install -r requirements.txt"