#!/usr/bin/env bun
/**
 * Migrated from: check-rule-suggestion.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.746Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Check Rule Suggestion Script - Thin Wrapper
  // Delegates all logic to story-reporter theme
  // Usage: check-rule-suggestion.sh <current_folder> <app-epic-theme-user_story>
  await $`set -e`;
  // Get script directory and project root
  await $`SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"`;
  await $`PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"`;
  await $`STORY_REPORTER_PATH="$PROJECT_ROOT/layer/themes/story-reporter"`;
  // Colors for output
  await $`RED='\033[0;31m'`;
  await $`CYAN='\033[0;36m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`NC='\033[0m' # No Color`;
  // Display usage
  await $`usage() {`;
  console.log("-e ");${CYAN}Usage: $0 <current_folder> <mode>${NC}"
  console.log("-e ");${CYAN}Modes: app | epic | theme | user_story${NC}"
  process.exit(1);
  await $`}`;
  // Check arguments
  if ($# -ne 2 ) {; then
  await $`usage`;
  }
  await $`CURRENT_FOLDER="$1"`;
  await $`MODE="$2"`;
  // Get absolute path
  await $`BASE_FOLDER=$(cd "$CURRENT_FOLDER" 2>/dev/null && pwd || echo "")`;
  if (-z "$BASE_FOLDER" ) {; then
  console.log("-e ");${RED}Error: Invalid folder path: $CURRENT_FOLDER${NC}"
  process.exit(1);
  }
  // Check if story-reporter exists
  if (! -d "$STORY_REPORTER_PATH" ) {; then
  console.log("-e ");${RED}Error: story-reporter theme not found at $STORY_REPORTER_PATH${NC}"
  process.exit(1);
  }
  // Prepare story-reporter
  process.chdir(""$STORY_REPORTER_PATH"");
  if (! -d "node_modules" ) {; then
  console.log("-e ");${YELLOW}Installing story-reporter dependencies...${NC}"
  await $`npm install --silent`;
  }
  // Generate request file
  await $`TIMESTAMP=$(date +"%Y%m%d-%H%M%S")`;
  await $`REQUEST_FILE="/tmp/rule-suggestion-request-$$.json"`;
  await $`cat > "$REQUEST_FILE" << EOF`;
  await $`{`;
  await $`"type": "rule-suggestion-analysis",`;
  await $`"mode": "$MODE",`;
  await $`"targetPath": "$BASE_FOLDER",`;
  await $`"timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",`;
  await $`"outputPath": "$BASE_FOLDER/gen",`;
  await $`"outputPrefix": "rule-suggestion-check-$TIMESTAMP",`;
  await $`"checks": [`;
  await $`{`;
  await $`"type": "retrospective-format",`;
  await $`"enabled": true,`;
  await $`"severity": "high",`;
  await $`"description": "Validate retrospective document format and required sections"`;
  await $`},`;
  await $`{`;
  await $`"type": "story-report-steps",`;
  await $`"enabled": true,`;
  await $`"severity": "high",`;
  await $`"description": "Validate story report steps implementation"`;
  await $`},`;
  await $`{`;
  await $`"type": "rule-extraction",`;
  await $`"enabled": true,`;
  await $`"severity": "medium",`;
  await $`"description": "Extract and validate rule suggestions from retrospectives"`;
  await $`},`;
  await $`{`;
  await $`"type": "knowledge-updates",`;
  await $`"enabled": true,`;
  await $`"severity": "medium",`;
  await $`"description": "Check for knowledge base and know-how updates"`;
  await $`},`;
  await $`{`;
  await $`"type": "lessons-learned",`;
  await $`"enabled": true,`;
  await $`"severity": "medium",`;
  await $`"description": "Validate lessons learned documentation"`;
  await $`},`;
  await $`{`;
  await $`"type": "process-improvements",`;
  await $`"enabled": true,`;
  await $`"severity": "low",`;
  await $`"description": "Identify process improvement suggestions"`;
  await $`}`;
  await $`],`;
  await $`"retrospectivePatterns": {`;
  await $`"requiredSections": [`;
  await $`"Product Owner Perspective",`;
  await $`"Developer Perspective",`;
  await $`"QA Engineer Perspective",`;
  await $`"System Architect Perspective",`;
  await $`"DevOps Perspective",`;
  await $`"Key Takeaways",`;
  await $`"Lessons Learned",`;
  await $`"Rule Suggestions",`;
  await $`"Know-How Updates"`;
  await $`],`;
  await $`"filePatterns": [`;
  await $`"**/retrospective.md",`;
  await $`"**/retrospect.md",`;
  await $`"**/gen/history/retrospect/*.md",`;
  await $`"**/docs/retrospective.md"`;
  await $`]`;
  await $`},`;
  await $`"storyReportPatterns": {`;
  await $`"requiredFields": [`;
  await $`"storyId",`;
  await $`"status",`;
  await $`"coverage",`;
  await $`"tests",`;
  await $`"fraudCheck"`;
  await $`],`;
  await $`"filePatterns": [`;
  await $`"**/story-report.json",`;
  await $`"**/gen/reports/story-report-*.json"`;
  await $`]`;
  await $`}`;
  await $`}`;
  await $`EOF`;
  // Execute analysis
  if (-f "$STORY_REPORTER_PATH/dist/cli/rule-suggestion-analyzer.js" ) {; then
  await $`node "$STORY_REPORTER_PATH/dist/cli/rule-suggestion-analyzer.js" "$REQUEST_FILE"`;
  await $`EXIT_CODE=$?`;
  } else {
  await $`bunx ts-node "$STORY_REPORTER_PATH/src/cli/rule-suggestion-analyzer.ts" "$REQUEST_FILE"`;
  await $`EXIT_CODE=$?`;
  }
  // Clean up and exit
  await $`rm -f "$REQUEST_FILE"`;
  await $`exit $EXIT_CODE`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}