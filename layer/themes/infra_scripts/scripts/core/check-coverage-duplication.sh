#!/bin/bash

# Coverage and Duplication Check Script - Thin Wrapper
# Delegates all logic to story-reporter theme
# Usage: ./check_coverage_duplication.sh <base_folder> <mode>
# Mode: app | epic | theme | story

set -e

# Get script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
STORY_REPORTER_PATH="$PROJECT_ROOT/layer/themes/story-reporter"

# Colors for output
RED='\033[0;31m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Display usage
usage() {
    echo -e "${CYAN}Usage: $0 <base_folder> <mode>${NC}"
    echo -e "${CYAN}Modes: app | epic | theme | story${NC}"
    exit 1
}

# Check arguments
if [ $# -ne 2 ]; then
    usage
fi

BASE_FOLDER="$1"
MODE="$2"

# Convert to absolute path if relative
if [[ ! "$BASE_FOLDER" = /* ]]; then
    BASE_FOLDER="$PROJECT_ROOT/$BASE_FOLDER"
fi

# Check if story-reporter exists
if [ ! -d "$STORY_REPORTER_PATH" ]; then
    echo -e "${RED}Error: story-reporter theme not found at $STORY_REPORTER_PATH${NC}"
    exit 1
fi

# Prepare story-reporter
cd "$STORY_REPORTER_PATH"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing story-reporter dependencies...${NC}"
    npm install --silent
fi

# Generate request file
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
REQUEST_FILE="/tmp/coverage-analysis-request-$$.json"

cat > "$REQUEST_FILE" << EOF
{
  "type": "coverage-duplication-analysis",
  "mode": "$MODE",
  "targetPath": "$BASE_FOLDER",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "outputPath": "$BASE_FOLDER/gen",
  "outputPrefix": "coverage-duplication-check-$TIMESTAMP",
  "analyses": [
    {
      "type": "branch-coverage",
      "enabled": true
    },
    {
      "type": "system-test-class-coverage",
      "enabled": true
    },
    {
      "type": "duplication-check",
      "enabled": true,
      "config": {
        "minTokens": 50,
        "minLines": 5
      }
    }
  ]
}
EOF

# Execute analysis
if [ -f "$STORY_REPORTER_PATH/dist/cli/coverage-analyzer.js" ]; then
    node "$STORY_REPORTER_PATH/dist/cli/coverage-analyzer.js" "$REQUEST_FILE"
    EXIT_CODE=$?
else
    bunx ts-node "$STORY_REPORTER_PATH/src/cli/coverage-analyzer.ts" "$REQUEST_FILE"
    EXIT_CODE=$?
fi

# Clean up and exit
rm -f "$REQUEST_FILE"
exit $EXIT_CODE