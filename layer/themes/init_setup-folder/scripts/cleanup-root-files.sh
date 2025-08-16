#!/bin/bash
# Cleanup script to move misplaced files from root directory
# According to CLAUDE.md rules: No files should be created on root

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Checking for files that violate root directory rules...${NC}"

# Move documentation files to gen/doc/
DOCS=(*.md)
for doc in "${DOCS[@]}"; do
    # Skip allowed root files
    if [[ "$doc" == "CLAUDE.md" || "$doc" == "README.md" || "$doc" == "*.md" ]]; then
        continue
    fi
    if [[ -f "$doc" ]]; then
        echo -e "${RED}Found misplaced doc: $doc${NC}"
        mv "$doc" gen/doc/
        echo -e "${GREEN}Moved $doc to gen/doc/${NC}"
    fi
done

# Move screenshot/image files to temp/
IMAGES=(*.png *.jpg *.jpeg *.gif)
for img in "${IMAGES[@]}"; do
    if [[ -f "$img" ]]; then
        echo -e "${RED}Found misplaced image: $img${NC}"
        mkdir -p temp/test-screenshots
        mv "$img" temp/test-screenshots/
        echo -e "${GREEN}Moved $img to temp/test-screenshots/${NC}"
    fi
done

# Move test files to temp/
TEST_FILES=(test-*.js test-*.ts)
for test in "${TEST_FILES[@]}"; do
    if [[ -f "$test" ]]; then
        echo -e "${RED}Found misplaced test file: $test${NC}"
        mkdir -p temp/test-scripts
        mv "$test" temp/test-scripts/
        echo -e "${GREEN}Moved $test to temp/test-scripts/${NC}"
    fi
done

# Check for other unexpected files
echo -e "${YELLOW}Checking for other unexpected root files...${NC}"

# List allowed files
ALLOWED_FILES=(
    "CLAUDE.md"
    "README.md"
    "FEATURE.vf.json"
    "TASK_QUEUE.vf.json"
    "FILE_STRUCTURE.vf.json"
    "NAME_ID.vf.json"
    "package.json"
    "package-lock.json"
    "tsconfig.json"
    ".gitignore"
    ".prettierrc"
    ".eslintrc.js"
    "jest.config.js"
)

# Check all files in root
for file in *; do
    if [[ -f "$file" ]]; then
        # Check if file is in allowed list
        allowed=false
        for allowed_file in "${ALLOWED_FILES[@]}"; do
            if [[ "$file" == "$allowed_file" ]]; then
                allowed=true
                break
            fi
        done
        
        if [[ "$allowed" == false ]]; then
            echo -e "${YELLOW}Warning: Unexpected file in root: $file${NC}"
            echo "  Consider moving this file to an appropriate subdirectory"
        fi
    fi
done

echo -e "${GREEN}Root directory cleanup complete!${NC}"