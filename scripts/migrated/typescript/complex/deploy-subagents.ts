#!/usr/bin/env bun
/**
 * Migrated from: deploy-subagents.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.664Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Subagent Deployment Script
  // Deploys role-based subagents to project or user directory
  await $`set -e`;
  // Color codes for output
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`BLUE='\033[0;34m'`;
  await $`NC='\033[0m' # No Color`;
  // Default values
  await $`DEPLOY_LOCATION="project"`;
  await $`FORCE_OVERWRITE=false`;
  await $`VALIDATE_ONLY=false`;
  await $`GENERATE_FROM_RULES=true`;
  // Script directory
  await $`SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"`;
  await $`PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"`;
  await $`LLM_RULES_DIR="$PROJECT_ROOT/llm_rules"`;
  await $`SUBAGENTS_DIR="$PROJECT_ROOT/layer/themes/llm-agent_chat-space/subagents"`;
  // Function to display usage
  await $`usage() {`;
  const heredoc = `
Usage: $0 [OPTIONS]

Deploy role-based subagents to Claude Code compatible locations

OPTIONS:
    -h, --help              Show this help message
    -p, --project           Deploy to project directory (default)
    -u, --user              Deploy to user home directory
    -f, --force             Force overwrite existing subagents
    -v, --validate          Validate subagents without deploying
    -g, --generate          Generate subagents from role rules (default: true)
    --no-generate           Skip generation, use existing subagents
    -l, --list              List available subagents
    -s, --select AGENTS     Deploy specific agents (comma-separated)

EXAMPLES:
    $0 --project            Deploy all subagents to project
    $0 --user --force       Deploy to user directory, overwrite existing
    $0 --validate           Validate subagent formats only
    $0 -s tester,gui-coordinator  Deploy specific agents

  `;
  process.exit(0);
  await $`}`;
  // Function to print colored messages
  await $`print_message() {`;
  await $`local color=$1`;
  await $`local message=$2`;
  console.log("-e ");${color}${message}${NC}"
  await $`}`;
  // Function to validate subagent format
  await $`validate_subagent() {`;
  await $`local file=$1`;
  await $`local errors=0`;
  // Check if file exists
  if ([ ! -f "$file" ]) {; then
  await $`print_message "$RED" "✗ File not found: $file"`;
  await $`return 1`;
  }
  // Extract frontmatter
  await $`local in_frontmatter=false`;
  await $`local has_name=false`;
  await $`local has_description=false`;
  await $`local line_num=0`;
  while (IFS= read -r line; do) {
  await $`line_num=$((line_num + 1))`;
  if ([ $line_num -eq 1 && "$line" != "---" ]) {; then
  await $`print_message "$RED" "✗ Missing frontmatter start marker"`;
  await $`errors=$((errors + 1))`;
  await $`break`;
  }
  if ([ "$line" == "---" ]) {; then
  if ([ $line_num -eq 1 ]) {; then
  await $`in_frontmatter=true`;
  } else {
  await $`in_frontmatter=false`;
  await $`break`;
  }
  await $`elif [[ $in_frontmatter == true ]]; then`;
  if ([ "$line" =~ ^name: ]) {; then
  await $`has_name=true`;
  await $`local name="${line#name: }"`;
  await $`name="${name// /}"  # Remove spaces`;
  if ([ ! "$name" =~ ^[a-z][a-z-]*[a-z]$ ]) {; then
  await $`print_message "$RED" "✗ Invalid name format: $name"`;
  await $`errors=$((errors + 1))`;
  }
  await $`elif [[ "$line" =~ ^description: ]]; then`;
  await $`has_description=true`;
  await $`local desc="${line#description: }"`;
  if ([ ${#desc} -lt 20 ]) {; then
  await $`print_message "$YELLOW" "⚠ Description too short (min 20 chars)"`;
  }
  }
  }
  await $`done < "$file"`;
  if ([ $has_name == false ]) {; then
  await $`print_message "$RED" "✗ Missing required field: name"`;
  await $`errors=$((errors + 1))`;
  }
  if ([ $has_description == false ]) {; then
  await $`print_message "$RED" "✗ Missing required field: description"`;
  await $`errors=$((errors + 1))`;
  }
  if ([ $errors -eq 0 ]) {; then
  await $`print_message "$GREEN" "✓ Valid subagent format: $(basename "$file")"`;
  await $`return 0`;
  } else {
  await $`return 1`;
  }
  await $`}`;
  // Function to generate subagent from role rule
  await $`generate_subagent() {`;
  await $`local role_file=$1`;
  await $`local output_file=$2`;
  await $`local role_name=$(basename "$role_file" .md | sed 's/ROLE_//' | tr '[:upper:]' '[:lower:]' | tr '_' '-')`;
  await $`print_message "$BLUE" "Generating subagent: $role_name"`;
  // Read role file
  await $`local content=$(cat "$role_file")`;
  // Extract key information
  await $`local description=""`;
  await $`local tools=""`;
  // Determine tools based on role
  await $`case "$role_name" in`;
  await $`"requirement-analyst")`;
  await $`tools="Read, Write, TodoWrite, WebSearch"`;
  await $`description="Use proactively for gathering and analyzing requirements, creating user stories, and defining acceptance criteria"`;
  await $`;;`;
  await $`"auth-manager")`;
  await $`tools="Read, Edit, Bash, WebSearch, Write"`;
  await $`description="Implement and maintain secure authentication and authorization systems. Must be used for security-related tasks"`;
  await $`;;`;
  await $`"api-checker")`;
  await $`tools="Read, Grep, WebFetch, Bash"`;
  await $`description="Validate API contracts, compatibility, and documentation accuracy. Use for API testing and validation"`;
  await $`;;`;
  await $`"agent-scheduler")`;
  await $`tools="Task, TodoWrite, Read, Write"`;
  await $`description="Manage and coordinate multiple LLM agents for efficient task execution"`;
  await $`;;`;
  await $`"context-manager")`;
  await $`tools="Read, Write, TodoWrite"`;
  await $`description="Optimize context for LLM interactions and manage system state"`;
  await $`;;`;
  await $`"tester")`;
  await $`tools="Read, Edit, Bash, Grep, Glob"`;
  await $`description="Use proactively to write and run tests, ensure coverage, and fix test failures. Must be used after code changes"`;
  await $`;;`;
  await $`"gui-coordinator")`;
  await $`tools="Read, Write, Edit, WebSearch"`;
  await $`description="Design and implement user interfaces following the GUI design workflow. Use for all UI-related tasks"`;
  await $`;;`;
  await $`"feature-manager")`;
  await $`tools="Read, Write, TodoWrite, Task"`;
  await $`description="Oversee feature development from conception to deployment. Use for feature planning and coordination"`;
  await $`;;`;
  await $`*)`;
  await $`tools=""  # Inherit all tools`;
  await $`description="Specialized agent for $role_name tasks"`;
  await $`;;`;
  await $`esac`;
  // Create subagent file
  await $`cat > "$output_file" << EOF`;
  await $`---`;
  await $`name: $role_name`;
  await $`description: $description`;
  await $`tools: $tools`;
  await $`---`;
  // Role: ${role_name//-/ }
  await $`EOF`;
  // Process content to create system prompt
  await $`local in_responsibilities=false`;
  await $`local in_tasks=false`;
  await $`local in_best_practices=false`;
  await $`local system_prompt=""`;
  while (IFS= read -r line; do) {
  if ([ "$line" =~ "## Responsibilities" ]) {; then
  await $`in_responsibilities=true`;
  await $`system_prompt+="You are a ${role_name//-/ } with the following expertise:\n\n"`;
  await $`elif [[ "$line" =~ "## Primary Tasks" ]]; then`;
  await $`in_tasks=true`;
  await $`in_responsibilities=false`;
  await $`system_prompt+="\n## Your Primary Tasks\n\n"`;
  await $`elif [[ "$line" =~ "## Best Practices" ]]; then`;
  await $`in_best_practices=true`;
  await $`in_tasks=false`;
  await $`system_prompt+="\n## Best Practices to Follow\n\n"`;
  await $`elif [[ "$line" =~ ^## ]]; then`;
  await $`in_responsibilities=false`;
  await $`in_tasks=false`;
  await $`in_best_practices=false`;
  await $`elif [[ $in_responsibilities == true || $in_tasks == true || $in_best_practices == true ]]; then`;
  // Clean up the line and add to system prompt
  if ([ ! "$line" =~ ^\`\`\` && ! -z "$line" ]) {; then
  await $`system_prompt+="$line\n"`;
  }
  }
  await $`done <<< "$content"`;
  // Add general instructions
  await $`system_prompt+="\n## Approach\n\n"`;
  await $`system_prompt+="When invoked:\n"`;
  await $`system_prompt+="1. Understand the specific requirements of the task\n"`;
  await $`system_prompt+="2. Apply your specialized knowledge and best practices\n"`;
  await $`system_prompt+="3. Use the available tools effectively\n"`;
  await $`system_prompt+="4. Provide clear, actionable results\n"`;
  await $`system_prompt+="5. Document your work thoroughly\n\n"`;
  await $`system_prompt+="Always ensure your work is high quality, well-tested, and properly documented."`;
  // Write system prompt to file
  console.log("-e ");$system_prompt" >> "$output_file"
  await $`print_message "$GREEN" "✓ Generated: $output_file"`;
  await $`}`;
  // Function to deploy subagent
  await $`deploy_subagent() {`;
  await $`local source_file=$1`;
  await $`local target_dir=$2`;
  await $`local agent_name=$(basename "$source_file")`;
  await $`local target_file="$target_dir/$agent_name"`;
  // Check if target exists
  if ([ -f "$target_file" && $FORCE_OVERWRITE == false ]) {; then
  await $`print_message "$YELLOW" "⚠ Skipping (exists): $target_file"`;
  await $`print_message "$YELLOW" "  Use --force to overwrite"`;
  await $`return 1`;
  }
  // Copy file
  await copyFile(""$source_file"", ""$target_file"");
  await $`print_message "$GREEN" "✓ Deployed: $target_file"`;
  await $`return 0`;
  await $`}`;
  // Function to list available subagents
  await $`list_subagents() {`;
  await $`print_message "$BLUE" "\nAvailable Subagents:"`;
  await $`print_message "$BLUE" "===================="`;
  // List from role rules
  if ([ -d "$LLM_RULES_DIR" ]) {; then
  await $`print_message "$YELLOW" "\nFrom Role Rules:"`;
  for (const role of ["$LLM_RULES_DIR"/ROLE_*.md; do]) {
  if ([ -f "$role" ]) {; then
  await $`local name=$(basename "$role" .md | sed 's/ROLE_//' | tr '[:upper:]' '[:lower:]' | tr '_' '-')`;
  console.log("  - $name");
  }
  }
  }
  // List existing subagents
  if ([ -d "$SUBAGENTS_DIR" ]) {; then
  await $`print_message "$YELLOW" "\nExisting Subagents:"`;
  for (const agent of ["$SUBAGENTS_DIR"/*.md; do]) {
  if ([ -f "$agent" ]) {; then
  await $`local name=$(basename "$agent" .md)`;
  console.log("  - $name");
  }
  }
  }
  console.log("");
  await $`}`;
  // Parse command line arguments
  await $`SELECTED_AGENTS=""`;
  while ([[ $# -gt 0 ]]; do) {
  await $`case $1 in`;
  await $`-h|--help)`;
  await $`usage`;
  await $`;;`;
  await $`-p|--project)`;
  await $`DEPLOY_LOCATION="project"`;
  await $`shift`;
  await $`;;`;
  await $`-u|--user)`;
  await $`DEPLOY_LOCATION="user"`;
  await $`shift`;
  await $`;;`;
  await $`-f|--force)`;
  await $`FORCE_OVERWRITE=true`;
  await $`shift`;
  await $`;;`;
  await $`-v|--validate)`;
  await $`VALIDATE_ONLY=true`;
  await $`shift`;
  await $`;;`;
  await $`-g|--generate)`;
  await $`GENERATE_FROM_RULES=true`;
  await $`shift`;
  await $`;;`;
  await $`--no-generate)`;
  await $`GENERATE_FROM_RULES=false`;
  await $`shift`;
  await $`;;`;
  await $`-l|--list)`;
  await $`list_subagents`;
  process.exit(0);
  await $`;;`;
  await $`-s|--select)`;
  await $`SELECTED_AGENTS="$2"`;
  await $`shift 2`;
  await $`;;`;
  await $`*)`;
  await $`print_message "$RED" "Unknown option: $1"`;
  await $`usage`;
  await $`;;`;
  await $`esac`;
  }
  // Main execution
  await $`print_message "$BLUE" "🤖 Subagent Deployment Script"`;
  await $`print_message "$BLUE" "============================="`;
  console.log("");
  // Determine target directory
  if ([ "$DEPLOY_LOCATION" == "project" ]) {; then
  await $`TARGET_DIR="$PROJECT_ROOT/.claude/agents"`;
  await $`print_message "$YELLOW" "📁 Target: Project directory"`;
  } else {
  await $`TARGET_DIR="$HOME/.claude/agents"`;
  await $`print_message "$YELLOW" "📁 Target: User home directory"`;
  }
  // Create directories if needed
  await mkdir(""$SUBAGENTS_DIR"", { recursive: true });
  await mkdir(""$TARGET_DIR"", { recursive: true });
  // Generate subagents from rules
  if ([ $GENERATE_FROM_RULES == true ]) {; then
  await $`print_message "$BLUE" "\n📝 Generating Subagents from Role Rules..."`;
  for (const role_file of ["$LLM_RULES_DIR"/ROLE_*.md; do]) {
  if ([ -f "$role_file" ]) {; then
  await $`agent_name=$(basename "$role_file" .md | sed 's/ROLE_//' | tr '[:upper:]' '[:lower:]' | tr '_' '-')`;
  // Check if specific agents were selected
  if ([ ! -z "$SELECTED_AGENTS" ]) {; then
  if ([ ! ",$SELECTED_AGENTS," =~ ",$agent_name," ]) {; then
  await $`continue`;
  }
  }
  await $`output_file="$SUBAGENTS_DIR/${agent_name}.md"`;
  await $`generate_subagent "$role_file" "$output_file"`;
  }
  }
  }
  // Validate subagents
  await $`print_message "$BLUE" "\n🔍 Validating Subagents..."`;
  await $`validation_failed=false`;
  for (const agent_file of ["$SUBAGENTS_DIR"/*.md; do]) {
  if ([ -f "$agent_file" ]) {; then
  await $`agent_name=$(basename "$agent_file" .md)`;
  // Check if specific agents were selected
  if ([ ! -z "$SELECTED_AGENTS" ]) {; then
  if ([ ! ",$SELECTED_AGENTS," =~ ",$agent_name," ]) {; then
  await $`continue`;
  }
  }
  await $`if ! validate_subagent "$agent_file"; then`;
  await $`validation_failed=true`;
  }
  }
  }
  if ([ $validation_failed == true ]) {; then
  await $`print_message "$RED" "\n✗ Validation failed for some subagents"`;
  if ([ $VALIDATE_ONLY == true ]) {; then
  process.exit(1);
  }
  await $`read -p "Continue with deployment? (y/N) " -n 1 -r`;
  await $`echo`;
  if ([ ! $REPLY =~ ^[Yy]$ ]) {; then
  process.exit(1);
  }
  }
  // Exit if validate only
  if ([ $VALIDATE_ONLY == true ]) {; then
  await $`print_message "$GREEN" "\n✓ Validation complete"`;
  process.exit(0);
  }
  // Deploy subagents
  await $`print_message "$BLUE" "\n🚀 Deploying Subagents..."`;
  await $`deployed_count=0`;
  await $`skipped_count=0`;
  for (const agent_file of ["$SUBAGENTS_DIR"/*.md; do]) {
  if ([ -f "$agent_file" ]) {; then
  await $`agent_name=$(basename "$agent_file" .md)`;
  // Check if specific agents were selected
  if ([ ! -z "$SELECTED_AGENTS" ]) {; then
  if ([ ! ",$SELECTED_AGENTS," =~ ",$agent_name," ]) {; then
  await $`continue`;
  }
  }
  await $`if deploy_subagent "$agent_file" "$TARGET_DIR"; then`;
  await $`deployed_count=$((deployed_count + 1))`;
  } else {
  await $`skipped_count=$((skipped_count + 1))`;
  }
  }
  }
  // Summary
  await $`print_message "$BLUE" "\n📊 Deployment Summary"`;
  await $`print_message "$BLUE" "===================="`;
  await $`print_message "$GREEN" "✓ Deployed: $deployed_count subagents"`;
  if ([ $skipped_count -gt 0 ]) {; then
  await $`print_message "$YELLOW" "⚠ Skipped: $skipped_count subagents (already exist)"`;
  }
  await $`print_message "$BLUE" "📁 Location: $TARGET_DIR"`;
  // Instructions
  await $`print_message "$BLUE" "\n📚 Next Steps:"`;
  console.log("1. Subagents are now available for use");
  console.log("2. Claude will automatically use them when appropriate");
  console.log("3. You can also explicitly invoke them:");
  console.log("   > Use the tester subagent to check my code");
  console.log("   > Have the requirement-analyst review this feature");
  console.log("");
  await $`print_message "$GREEN" "✓ Deployment complete!"`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}