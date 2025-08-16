#!/usr/bin/env python3
"""
Migrated from: check-coverage-duplication.sh
Auto-generated Python - 2025-08-16T04:57:27.777Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Coverage and Duplication Check Script - Thin Wrapper
    # Delegates all logic to story-reporter theme
    # Usage: ./check_coverage_duplication.sh <base_folder> <mode>
    # Mode: app | epic | theme | story
    subprocess.run("set -e", shell=True)
    # Get script directory and project root
    subprocess.run("SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"", shell=True)
    subprocess.run("PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"", shell=True)
    subprocess.run("STORY_REPORTER_PATH="$PROJECT_ROOT/layer/themes/story-reporter"", shell=True)
    # Colors for output
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("CYAN='\033[0;36m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("NC='\033[0m' # No Color", shell=True)
    # Display usage
    subprocess.run("usage() {", shell=True)
    print("-e ")${CYAN}Usage: $0 <base_folder> <mode>${NC}"
    print("-e ")${CYAN}Modes: app | epic | theme | story${NC}"
    sys.exit(1)
    subprocess.run("}", shell=True)
    # Check arguments
    if $# -ne 2 :; then
    subprocess.run("usage", shell=True)
    subprocess.run("BASE_FOLDER="$1"", shell=True)
    subprocess.run("MODE="$2"", shell=True)
    # Convert to absolute path if relative
    if [ ! "$BASE_FOLDER" = /* ]:; then
    subprocess.run("BASE_FOLDER="$PROJECT_ROOT/$BASE_FOLDER"", shell=True)
    # Check if story-reporter exists
    if ! -d "$STORY_REPORTER_PATH" :; then
    print("-e ")${RED}Error: story-reporter theme not found at $STORY_REPORTER_PATH${NC}"
    sys.exit(1)
    # Prepare story-reporter
    os.chdir(""$STORY_REPORTER_PATH"")
    if ! -d "node_modules" :; then
    print("-e ")${YELLOW}Installing story-reporter dependencies...${NC}"
    subprocess.run("npm install --silent", shell=True)
    # Generate request file
    subprocess.run("TIMESTAMP=$(date +"%Y%m%d-%H%M%S")", shell=True)
    subprocess.run("REQUEST_FILE="/tmp/coverage-analysis-request-$$.json"", shell=True)
    subprocess.run("cat > "$REQUEST_FILE" << EOF", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""type": "coverage-duplication-analysis",", shell=True)
    subprocess.run(""mode": "$MODE",", shell=True)
    subprocess.run(""targetPath": "$BASE_FOLDER",", shell=True)
    subprocess.run(""timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",", shell=True)
    subprocess.run(""outputPath": "$BASE_FOLDER/gen",", shell=True)
    subprocess.run(""outputPrefix": "coverage-duplication-check-$TIMESTAMP",", shell=True)
    subprocess.run(""analyses": [", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""type": "branch-coverage",", shell=True)
    subprocess.run(""enabled": true", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""type": "system-test-class-coverage",", shell=True)
    subprocess.run(""enabled": true", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""type": "duplication-check",", shell=True)
    subprocess.run(""enabled": true,", shell=True)
    subprocess.run(""config": {", shell=True)
    subprocess.run(""minTokens": 50,", shell=True)
    subprocess.run(""minLines": 5", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("]", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF", shell=True)
    # Execute analysis
    if -f "$STORY_REPORTER_PATH/dist/cli/coverage-analyzer.js" :; then
    subprocess.run("node "$STORY_REPORTER_PATH/dist/cli/coverage-analyzer.js" "$REQUEST_FILE"", shell=True)
    subprocess.run("EXIT_CODE=$?", shell=True)
    else:
    subprocess.run("bunx ts-node "$STORY_REPORTER_PATH/src/cli/coverage-analyzer.ts" "$REQUEST_FILE"", shell=True)
    subprocess.run("EXIT_CODE=$?", shell=True)
    # Clean up and exit
    subprocess.run("rm -f "$REQUEST_FILE"", shell=True)
    subprocess.run("exit $EXIT_CODE", shell=True)

if __name__ == "__main__":
    main()