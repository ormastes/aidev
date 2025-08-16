#!/usr/bin/env bun
/**
 * Migrated from: update-references.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.772Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Update all references from .md to .vf.json in rule files
  await $`set -e`;
  // Colors for output
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`RED='\033[0;31m'`;
  await $`BLUE='\033[0;34m'`;
  await $`NC='\033[0m' # No Color`;
  console.log("-e ");${YELLOW}Updating all .md references to .vf.json${NC}"
  console.log("=============================================");
  // Get the script directory
  await $`SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"`;
  await $`PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"`;
  // Function to update references in a file
  await $`update_references() {`;
  await $`local file="$1"`;
  await $`local filename=$(basename "$file")`;
  console.log("-e ");${BLUE}Processing: $filename${NC}"
  // Create backup
  await copyFile(""$file"", ""$file.bak"");
  // Update TASK_QUEUE.md to TASK_QUEUE.vf.json
  await $`sed -i 's/TASK_QUEUE\.md/TASK_QUEUE.vf.json/g' "$file"`;
  // Update FEATURE.md to FEATURE.vf.json
  await $`sed -i 's/FEATURE\.md/FEATURE.vf.json/g' "$file"`;
  // Update FILE_STRUCTURE.md to FILE_STRUCTURE.vf.json
  await $`sed -i 's/FILE_STRUCTURE\.md/FILE_STRUCTURE.vf.json/g' "$file"`;
  // Check if changes were made
  await $`if ! diff -q "$file" "$file.bak" > /dev/null; then`;
  console.log("-e ");${GREEN}✅ Updated: $filename${NC}"
  await $`rm "$file.bak"`;
  } else {
  console.log("-e ");${YELLOW}No changes needed: $filename${NC}"
  await $`rm "$file.bak"`;
  }
  await $`}`;
  // Update all rule files
  console.log("-e ");${YELLOW}Updating rule files in llm_rules/...${NC}"
  for (const rule_file of ["$PROJECT_ROOT"/llm_rules/*.md; do]) {
  if (-f "$rule_file" ) {; then
  await $`update_references "$rule_file"`;
  }
  }
  // Update additional rule files
  console.log("-e ");${YELLOW}Updating additional rule files...${NC}"
  if (-d "$PROJECT_ROOT/llm_rules/additional" ) {; then
  for (const rule_file of ["$PROJECT_ROOT"/llm_rules/additional/*.md; do]) {
  if (-f "$rule_file" ) {; then
  await $`update_references "$rule_file"`;
  }
  }
  }
  // Update README files
  console.log("-e ");${YELLOW}Updating README files...${NC}"
  for (const readme of ["$PROJECT_ROOT"/README.md "$PROJECT_ROOT"/llm_rules/README.md "$PROJECT_ROOT"/docs/README.md; do]) {
  if (-f "$readme" ) {; then
  await $`update_references "$readme"`;
  }
  }
  // Update TypeScript test files
  console.log("-e ");${YELLOW}Updating TypeScript test files...${NC}"
  for (const ts_file of ["$PROJECT_ROOT"/llm_rules/steps/*.ts "$PROJECT_ROOT"/test/**/*.ts; do]) {
  if (-f "$ts_file" ) {; then
  console.log("-e ");${BLUE}Processing: $(basename "$ts_file")${NC}"
  // Create backup
  await copyFile(""$ts_file"", ""$ts_file.bak"");
  // Update references
  await $`sed -i "s/'TASK_QUEUE\.md'/'TASK_QUEUE.vf.json'/g" "$ts_file"`;
  await $`sed -i 's/"TASK_QUEUE\.md"/"TASK_QUEUE.vf.json"/g' "$ts_file"`;
  await $`sed -i "s/'FEATURE\.md'/'FEATURE.vf.json'/g" "$ts_file"`;
  await $`sed -i 's/"FEATURE\.md"/"FEATURE.vf.json"/g' "$ts_file"`;
  await $`sed -i "s/'FILE_STRUCTURE\.md'/'FILE_STRUCTURE.vf.json'/g" "$ts_file"`;
  await $`sed -i 's/"FILE_STRUCTURE\.md"/"FILE_STRUCTURE.vf.json"/g' "$ts_file"`;
  // Check if changes were made
  await $`if ! diff -q "$ts_file" "$ts_file.bak" > /dev/null; then`;
  console.log("-e ");${GREEN}✅ Updated: $(basename "$ts_file")${NC}"
  await $`rm "$ts_file.bak"`;
  } else {
  await $`rm "$ts_file.bak"`;
  }
  }
  }
  // Update demo-setup.ts specifically for the README generation
  console.log("-e ");${YELLOW}Updating demo-setup.ts README generation...${NC}"
  await $`DEMO_SETUP="$PROJECT_ROOT/src/layer/themes/setup-folder/src/setup/demo-setup.ts"`;
  if (-f "$DEMO_SETUP" ) {; then
  await $`sed -i "s/'TASK_QUEUE\.\${this\.mode === 'vf' ? 'vf\.json' : 'md'\}'/'TASK_QUEUE.vf.json'/g" "$DEMO_SETUP"`;
  console.log("-e ");${GREEN}✅ Updated demo-setup.ts${NC}"
  }
  // Summary
  console.log("-e ");${GREEN}✅ Update complete!${NC}"
  console.log("");
  console.log("-e ");${YELLOW}Summary:${NC}"
  console.log("- All .md references updated to .vf.json");
  console.log("- Backup files removed after successful updates");
  console.log("- TypeScript files updated");
  console.log("");
  console.log("-e ");${BLUE}Note: The system now uses .vf.json format exclusively${NC}"
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}