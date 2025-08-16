#!/usr/bin/env bun
/**
 * Migrated from: check-coverage-duplication.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.777Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Coverage and Duplication Check Script - Thin Wrapper
  // Delegates all logic to story-reporter theme
  // Usage: ./check_coverage_duplication.sh <base_folder> <mode>
  // Mode: app | epic | theme | story
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
  console.log("-e ");${CYAN}Usage: $0 <base_folder> <mode>${NC}"
  console.log("-e ");${CYAN}Modes: app | epic | theme | story${NC}"
  process.exit(1);
  await $`}`;
  // Check arguments
  if ($# -ne 2 ) {; then
  await $`usage`;
  }
  await $`BASE_FOLDER="$1"`;
  await $`MODE="$2"`;
  // Convert to absolute path if relative
  if ([ ! "$BASE_FOLDER" = /* ]) {; then
  await $`BASE_FOLDER="$PROJECT_ROOT/$BASE_FOLDER"`;
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
  await $`REQUEST_FILE="/tmp/coverage-analysis-request-$$.json"`;
  await $`cat > "$REQUEST_FILE" << EOF`;
  await $`{`;
  await $`"type": "coverage-duplication-analysis",`;
  await $`"mode": "$MODE",`;
  await $`"targetPath": "$BASE_FOLDER",`;
  await $`"timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",`;
  await $`"outputPath": "$BASE_FOLDER/gen",`;
  await $`"outputPrefix": "coverage-duplication-check-$TIMESTAMP",`;
  await $`"analyses": [`;
  await $`{`;
  await $`"type": "branch-coverage",`;
  await $`"enabled": true`;
  await $`},`;
  await $`{`;
  await $`"type": "system-test-class-coverage",`;
  await $`"enabled": true`;
  await $`},`;
  await $`{`;
  await $`"type": "duplication-check",`;
  await $`"enabled": true,`;
  await $`"config": {`;
  await $`"minTokens": 50,`;
  await $`"minLines": 5`;
  await $`}`;
  await $`}`;
  await $`]`;
  await $`}`;
  await $`EOF`;
  // Execute analysis
  if (-f "$STORY_REPORTER_PATH/dist/cli/coverage-analyzer.js" ) {; then
  await $`node "$STORY_REPORTER_PATH/dist/cli/coverage-analyzer.js" "$REQUEST_FILE"`;
  await $`EXIT_CODE=$?`;
  } else {
  await $`bunx ts-node "$STORY_REPORTER_PATH/src/cli/coverage-analyzer.ts" "$REQUEST_FILE"`;
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