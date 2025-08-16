#!/bin/bash

# Check Rule Suggestion Script - Thin Wrapper
# Delegates all logic to story-reporter theme
# Usage: check-rule-suggestion.sh <current_folder> <app-epic-theme-user_story>

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
    echo -e "${CYAN}Usage: $0 <current_folder> <mode>${NC}"
    echo -e "${CYAN}Modes: app | epic | theme | user_story${NC}"
    exit 1
}

# Check arguments
if [ $# -ne 2 ]; then
    usage
fi

CURRENT_FOLDER="$1"
MODE="$2"

# Get absolute path
BASE_FOLDER=$(cd "$CURRENT_FOLDER" 2>/dev/null && pwd || echo "")

if [ -z "$BASE_FOLDER" ]; then
    echo -e "${RED}Error: Invalid folder path: $CURRENT_FOLDER${NC}"
    exit 1
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
REQUEST_FILE="/tmp/rule-suggestion-request-$$.json"

cat > "$REQUEST_FILE" << EOF
{
  "type": "rule-suggestion-analysis",
  "mode": "$MODE",
  "targetPath": "$BASE_FOLDER",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "outputPath": "$BASE_FOLDER/gen",
  "outputPrefix": "rule-suggestion-check-$TIMESTAMP",
  "checks": [
    {
      "type": "retrospective-format",
      "enabled": true,
      "severity": "high",
      "description": "Validate retrospective document format and required sections"
    },
    {
      "type": "story-report-steps",
      "enabled": true,
      "severity": "high",
      "description": "Validate story report steps implementation"
    },
    {
      "type": "rule-extraction",
      "enabled": true,
      "severity": "medium",
      "description": "Extract and validate rule suggestions from retrospectives"
    },
    {
      "type": "knowledge-updates",
      "enabled": true,
      "severity": "medium",
      "description": "Check for knowledge base and know-how updates"
    },
    {
      "type": "lessons-learned",
      "enabled": true,
      "severity": "medium",
      "description": "Validate lessons learned documentation"
    },
    {
      "type": "process-improvements",
      "enabled": true,
      "severity": "low",
      "description": "Identify process improvement suggestions"
    }
  ],
  "retrospectivePatterns": {
    "requiredSections": [
      "Product Owner Perspective",
      "Developer Perspective",
      "QA Engineer Perspective",
      "System Architect Perspective",
      "DevOps Perspective",
      "Key Takeaways",
      "Lessons Learned",
      "Rule Suggestions",
      "Know-How Updates"
    ],
    "filePatterns": [
      "**/retrospective.md",
      "**/retrospect.md",
      "**/gen/history/retrospect/*.md",
      "**/docs/retrospective.md"
    ]
  },
  "storyReportPatterns": {
    "requiredFields": [
      "storyId",
      "status",
      "coverage",
      "tests",
      "fraudCheck"
    ],
    "filePatterns": [
      "**/story-report.json",
      "**/gen/reports/story-report-*.json"
    ]
  }
}
EOF

# Execute analysis
if [ -f "$STORY_REPORTER_PATH/dist/cli/rule-suggestion-analyzer.js" ]; then
    node "$STORY_REPORTER_PATH/dist/cli/rule-suggestion-analyzer.js" "$REQUEST_FILE"
    EXIT_CODE=$?
else
    bunx ts-node "$STORY_REPORTER_PATH/src/cli/rule-suggestion-analyzer.ts" "$REQUEST_FILE"
    EXIT_CODE=$?
fi

# Clean up and exit
rm -f "$REQUEST_FILE"
exit $EXIT_CODE