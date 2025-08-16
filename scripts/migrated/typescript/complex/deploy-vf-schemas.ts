#!/usr/bin/env bun
/**
 * Migrated from: deploy-vf-schemas.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.712Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // VF Schema Deployment Script
  // Deploys .vf.json schema files from the filesystem-mcp theme to project environments
  await $`set -e`;
  // Colors for output
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`BLUE='\033[0;34m'`;
  await $`NC='\033[0m' # No Color`;
  // Get script directory
  await $`SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"`;
  await $`THEME_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"`;
  await $`SCHEMA_DIR="$THEME_DIR/schemas"`;
  await $`TEMPLATE_DIR="$SCHEMA_DIR/templates"`;
  // Default target is project root
  await $`TARGET_DIR="${1:-$(cd "$THEME_DIR/../../.." && pwd)}"`;
  console.log("╔════════════════════════════════════════════════╗");
  console.log("║       VF Schema Files Deployment Tool          ║");
  console.log("╚════════════════════════════════════════════════╝");
  console.log("");
  console.log("-e ");${BLUE}📁 Schema source: $SCHEMA_DIR${NC}"
  console.log("-e ");${BLUE}📁 Template source: $TEMPLATE_DIR${NC}"
  console.log("-e ");${BLUE}📁 Target directory: $TARGET_DIR${NC}"
  console.log("");
  // Function to deploy a schema file
  await $`deploy_schema() {`;
  await $`local filename="$1"`;
  await $`local force="${2:-false}"`;
  await $`local source_file=""`;
  // Check template directory first, then schema directory
  if (-f "$TEMPLATE_DIR/$filename" ) {; then
  await $`source_file="$TEMPLATE_DIR/$filename"`;
  console.log("-e ");  Using template: $filename"
  await $`elif [ -f "$SCHEMA_DIR/$filename" ]; then`;
  await $`source_file="$SCHEMA_DIR/$filename"`;
  console.log("-e ");  Using schema: $filename"
  } else {
  console.log("-e ");${YELLOW}  ⚠️  $filename not found in schema or template directories${NC}"
  await $`return 1`;
  }
  await $`local target_file="$TARGET_DIR/$filename"`;
  if (-f "$target_file" ] && [ "$force" != "true" ) {; then
  console.log("-e ");${YELLOW}  ⚠️  $filename already exists in target directory${NC}"
  await $`read -p "      Overwrite? (y/N): " -n 1 -r`;
  await $`echo`;
  if ([ ! $REPLY =~ ^[Yy]$ ]) {; then
  console.log("      Skipping $filename");
  await $`return 0`;
  }
  }
  await copyFile(""$source_file"", ""$target_file"");
  console.log("-e ");${GREEN}  ✅ Deployed $filename${NC}"
  await $`return 0`;
  await $`}`;
  // Function to initialize environment with all schema files
  await $`init_environment() {`;
  console.log("🚀 Initializing environment with VF schema files...");
  console.log("");
  await $`local vf_files=(`;
  await $`"TASK_QUEUE.vf.json"`;
  await $`"FEATURE.vf.json"`;
  await $`"FILE_STRUCTURE.vf.json"`;
  await $`"NAME_ID.vf.json"`;
  await $`)`;
  for (const file of ["${vf_files[@]}"; do]) {
  await $`deploy_schema "$file"`;
  }
  await $`}`;
  // Function to update schemas in target
  await $`update_schemas() {`;
  console.log("🔄 Updating VF schema files...");
  console.log("");
  // Find all vf.json files in schema directory
  while (IFS= read -r -d '' schema_file; do) {
  await $`local filename=$(basename "$schema_file")`;
  // Skip template files
  if ([ "$schema_file" != *"/templates/"* ]) {; then
  await $`deploy_schema "$filename"`;
  }
  await $`done < <(find "$SCHEMA_DIR" -maxdepth 1 -name "*.vf.json" -type f -print0)`;
  await $`}`;
  // Function to list available schemas
  await $`list_schemas() {`;
  console.log("📋 Available VF Schema Files:");
  console.log("");
  console.log("Main Schemas:");
  for (const file of ["$SCHEMA_DIR"/*.vf.json; do]) {
  if (-f "$file" ) {; then
  console.log("  • $(basename ");$file")"
  }
  }
  console.log("");
  console.log("Templates:");
  for (const file of ["$TEMPLATE_DIR"/*.template; do]) {
  if (-f "$file" ) {; then
  console.log("  • $(basename ");$file")"
  }
  }
  await $`}`;
  // Function to validate deployed schemas
  await $`validate_deployment() {`;
  console.log("🔍 Validating deployed schemas...");
  console.log("");
  await $`local all_valid=true`;
  await $`local vf_files=(`;
  await $`"TASK_QUEUE.vf.json"`;
  await $`"FEATURE.vf.json"`;
  await $`"FILE_STRUCTURE.vf.json"`;
  await $`"NAME_ID.vf.json"`;
  await $`)`;
  for (const file of ["${vf_files[@]}"; do]) {
  if (-f "$TARGET_DIR/$file" ) {; then
  // Check if it's valid JSON
  await $`if jq empty "$TARGET_DIR/$file" 2>/dev/null; then`;
  console.log("-e ");${GREEN}  ✅ $file is valid JSON${NC}"
  } else {
  console.log("-e ");${RED}  ❌ $file has invalid JSON${NC}"
  await $`all_valid=false`;
  }
  } else {
  console.log("-e ");${YELLOW}  ⚠️  $file not deployed${NC}"
  }
  }
  if ("$all_valid" = true ) {; then
  console.log("");
  console.log("-e ");${GREEN}✅ All deployed schemas are valid${NC}"
  } else {
  console.log("");
  console.log("-e ");${RED}❌ Some schemas have issues${NC}"
  await $`return 1`;
  }
  await $`}`;
  // Parse command line arguments
  await $`case "${1:-init}" in`;
  await $`init)`;
  await $`init_environment`;
  await $`;;`;
  await $`update)`;
  await $`update_schemas`;
  await $`;;`;
  await $`list)`;
  await $`list_schemas`;
  await $`;;`;
  await $`validate)`;
  await $`validate_deployment`;
  await $`;;`;
  await $`deploy)`;
  if (-z "$2" ) {; then
  console.log("-e ");${RED}Error: Please specify a file to deploy${NC}"
  console.log("Usage: $0 deploy <filename>");
  process.exit(1);
  }
  await $`deploy_schema "$2" "${3:-false}"`;
  await $`;;`;
  await $`help)`;
  console.log("Usage: $0 [command] [options]");
  console.log("");
  console.log("Commands:");
  console.log("  init      - Initialize environment with all VF schema files (default)");
  console.log("  update    - Update existing schemas from templates");
  console.log("  list      - List available schema files and templates");
  console.log("  validate  - Validate deployed schemas");
  console.log("  deploy    - Deploy a specific schema file");
  console.log("  help      - Show this help message");
  console.log("");
  console.log("Examples:");
  console.log("  $0 init                    # Initialize with all schemas");
  console.log("  $0 deploy TASK_QUEUE.vf.json  # Deploy specific file");
  console.log("  $0 validate                # Check deployed schemas");
  await $`;;`;
  await $`*)`;
  // If first argument is a directory path, use it as target
  if (-d "$1" ) {; then
  await $`TARGET_DIR="$1"`;
  await $`init_environment`;
  } else {
  console.log("-e ");${RED}Error: Unknown command '$1'${NC}"
  console.log("Use '$0 help' for usage information");
  process.exit(1);
  }
  await $`;;`;
  await $`esac`;
  console.log("");
  console.log("════════════════════════════════════════════════");
  console.log("Deployment complete!");
  console.log("Schema files are managed in: $SCHEMA_DIR");
  console.log("Templates are stored in: $TEMPLATE_DIR");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}