#!/usr/bin/env python3
"""
Migrated from: check-rule-suggestion.sh
Auto-generated Python - 2025-08-16T04:57:27.747Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Check Rule Suggestion Script - Thin Wrapper
    # Delegates all logic to story-reporter theme
    # Usage: check-rule-suggestion.sh <current_folder> <app-epic-theme-user_story>
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
    print("-e ")${CYAN}Usage: $0 <current_folder> <mode>${NC}"
    print("-e ")${CYAN}Modes: app | epic | theme | user_story${NC}"
    sys.exit(1)
    subprocess.run("}", shell=True)
    # Check arguments
    if $# -ne 2 :; then
    subprocess.run("usage", shell=True)
    subprocess.run("CURRENT_FOLDER="$1"", shell=True)
    subprocess.run("MODE="$2"", shell=True)
    # Get absolute path
    subprocess.run("BASE_FOLDER=$(cd "$CURRENT_FOLDER" 2>/dev/null && pwd || echo "")", shell=True)
    if -z "$BASE_FOLDER" :; then
    print("-e ")${RED}Error: Invalid folder path: $CURRENT_FOLDER${NC}"
    sys.exit(1)
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
    subprocess.run("REQUEST_FILE="/tmp/rule-suggestion-request-$$.json"", shell=True)
    subprocess.run("cat > "$REQUEST_FILE" << EOF", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""type": "rule-suggestion-analysis",", shell=True)
    subprocess.run(""mode": "$MODE",", shell=True)
    subprocess.run(""targetPath": "$BASE_FOLDER",", shell=True)
    subprocess.run(""timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",", shell=True)
    subprocess.run(""outputPath": "$BASE_FOLDER/gen",", shell=True)
    subprocess.run(""outputPrefix": "rule-suggestion-check-$TIMESTAMP",", shell=True)
    subprocess.run(""checks": [", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""type": "retrospective-format",", shell=True)
    subprocess.run(""enabled": true,", shell=True)
    subprocess.run(""severity": "high",", shell=True)
    subprocess.run(""description": "Validate retrospective document format and required sections"", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""type": "story-report-steps",", shell=True)
    subprocess.run(""enabled": true,", shell=True)
    subprocess.run(""severity": "high",", shell=True)
    subprocess.run(""description": "Validate story report steps implementation"", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""type": "rule-extraction",", shell=True)
    subprocess.run(""enabled": true,", shell=True)
    subprocess.run(""severity": "medium",", shell=True)
    subprocess.run(""description": "Extract and validate rule suggestions from retrospectives"", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""type": "knowledge-updates",", shell=True)
    subprocess.run(""enabled": true,", shell=True)
    subprocess.run(""severity": "medium",", shell=True)
    subprocess.run(""description": "Check for knowledge base and know-how updates"", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""type": "lessons-learned",", shell=True)
    subprocess.run(""enabled": true,", shell=True)
    subprocess.run(""severity": "medium",", shell=True)
    subprocess.run(""description": "Validate lessons learned documentation"", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""type": "process-improvements",", shell=True)
    subprocess.run(""enabled": true,", shell=True)
    subprocess.run(""severity": "low",", shell=True)
    subprocess.run(""description": "Identify process improvement suggestions"", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("],", shell=True)
    subprocess.run(""retrospectivePatterns": {", shell=True)
    subprocess.run(""requiredSections": [", shell=True)
    subprocess.run(""Product Owner Perspective",", shell=True)
    subprocess.run(""Developer Perspective",", shell=True)
    subprocess.run(""QA Engineer Perspective",", shell=True)
    subprocess.run(""System Architect Perspective",", shell=True)
    subprocess.run(""DevOps Perspective",", shell=True)
    subprocess.run(""Key Takeaways",", shell=True)
    subprocess.run(""Lessons Learned",", shell=True)
    subprocess.run(""Rule Suggestions",", shell=True)
    subprocess.run(""Know-How Updates"", shell=True)
    subprocess.run("],", shell=True)
    subprocess.run(""filePatterns": [", shell=True)
    subprocess.run(""**/retrospective.md",", shell=True)
    subprocess.run(""**/retrospect.md",", shell=True)
    subprocess.run(""**/gen/history/retrospect/*.md",", shell=True)
    subprocess.run(""**/docs/retrospective.md"", shell=True)
    subprocess.run("]", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run(""storyReportPatterns": {", shell=True)
    subprocess.run(""requiredFields": [", shell=True)
    subprocess.run(""storyId",", shell=True)
    subprocess.run(""status",", shell=True)
    subprocess.run(""coverage",", shell=True)
    subprocess.run(""tests",", shell=True)
    subprocess.run(""fraudCheck"", shell=True)
    subprocess.run("],", shell=True)
    subprocess.run(""filePatterns": [", shell=True)
    subprocess.run(""**/story-report.json",", shell=True)
    subprocess.run(""**/gen/reports/story-report-*.json"", shell=True)
    subprocess.run("]", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF", shell=True)
    # Execute analysis
    if -f "$STORY_REPORTER_PATH/dist/cli/rule-suggestion-analyzer.js" :; then
    subprocess.run("node "$STORY_REPORTER_PATH/dist/cli/rule-suggestion-analyzer.js" "$REQUEST_FILE"", shell=True)
    subprocess.run("EXIT_CODE=$?", shell=True)
    else:
    subprocess.run("bunx ts-node "$STORY_REPORTER_PATH/src/cli/rule-suggestion-analyzer.ts" "$REQUEST_FILE"", shell=True)
    subprocess.run("EXIT_CODE=$?", shell=True)
    # Clean up and exit
    subprocess.run("rm -f "$REQUEST_FILE"", shell=True)
    subprocess.run("exit $EXIT_CODE", shell=True)

if __name__ == "__main__":
    main()