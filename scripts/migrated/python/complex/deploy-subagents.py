#!/usr/bin/env python3
"""
Migrated from: deploy-subagents.sh
Auto-generated Python - 2025-08-16T04:57:27.665Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Subagent Deployment Script
    # Deploys role-based subagents to project or user directory
    subprocess.run("set -e", shell=True)
    # Color codes for output
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("BLUE='\033[0;34m'", shell=True)
    subprocess.run("NC='\033[0m' # No Color", shell=True)
    # Default values
    subprocess.run("DEPLOY_LOCATION="project"", shell=True)
    subprocess.run("FORCE_OVERWRITE=false", shell=True)
    subprocess.run("VALIDATE_ONLY=false", shell=True)
    subprocess.run("GENERATE_FROM_RULES=true", shell=True)
    # Script directory
    subprocess.run("SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"", shell=True)
    subprocess.run("PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"", shell=True)
    subprocess.run("LLM_RULES_DIR="$PROJECT_ROOT/llm_rules"", shell=True)
    subprocess.run("SUBAGENTS_DIR="$PROJECT_ROOT/layer/themes/llm-agent_chat-space/subagents"", shell=True)
    # Function to display usage
    subprocess.run("usage() {", shell=True)
    heredoc = """
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
    
    """
    sys.exit(0)
    subprocess.run("}", shell=True)
    # Function to print colored messages
    subprocess.run("print_message() {", shell=True)
    subprocess.run("local color=$1", shell=True)
    subprocess.run("local message=$2", shell=True)
    print("-e ")${color}${message}${NC}"
    subprocess.run("}", shell=True)
    # Function to validate subagent format
    subprocess.run("validate_subagent() {", shell=True)
    subprocess.run("local file=$1", shell=True)
    subprocess.run("local errors=0", shell=True)
    # Check if file exists
    if [ ! -f "$file" ]:; then
    subprocess.run("print_message "$RED" "✗ File not found: $file"", shell=True)
    subprocess.run("return 1", shell=True)
    # Extract frontmatter
    subprocess.run("local in_frontmatter=false", shell=True)
    subprocess.run("local has_name=false", shell=True)
    subprocess.run("local has_description=false", shell=True)
    subprocess.run("local line_num=0", shell=True)
    while IFS= read -r line; do:
    subprocess.run("line_num=$((line_num + 1))", shell=True)
    if [ $line_num -eq 1 && "$line" != "---" ]:; then
    subprocess.run("print_message "$RED" "✗ Missing frontmatter start marker"", shell=True)
    subprocess.run("errors=$((errors + 1))", shell=True)
    subprocess.run("break", shell=True)
    if [ "$line" == "---" ]:; then
    if [ $line_num -eq 1 ]:; then
    subprocess.run("in_frontmatter=true", shell=True)
    else:
    subprocess.run("in_frontmatter=false", shell=True)
    subprocess.run("break", shell=True)
    elif [ $in_frontmatter == true ]:; then
    if [ "$line" =~ ^name: ]:; then
    subprocess.run("has_name=true", shell=True)
    subprocess.run("local name="${line#name: }"", shell=True)
    subprocess.run("name="${name// /}"  # Remove spaces", shell=True)
    if [ ! "$name" =~ ^[a-z][a-z-]*[a-z]$ ]:; then
    subprocess.run("print_message "$RED" "✗ Invalid name format: $name"", shell=True)
    subprocess.run("errors=$((errors + 1))", shell=True)
    elif [ "$line" =~ ^description: ]:; then
    subprocess.run("has_description=true", shell=True)
    subprocess.run("local desc="${line#description: }"", shell=True)
    if [ ${#desc} -lt 20 ]:; then
    subprocess.run("print_message "$YELLOW" "⚠ Description too short (min 20 chars)"", shell=True)
    subprocess.run("done < "$file"", shell=True)
    if [ $has_name == false ]:; then
    subprocess.run("print_message "$RED" "✗ Missing required field: name"", shell=True)
    subprocess.run("errors=$((errors + 1))", shell=True)
    if [ $has_description == false ]:; then
    subprocess.run("print_message "$RED" "✗ Missing required field: description"", shell=True)
    subprocess.run("errors=$((errors + 1))", shell=True)
    if [ $errors -eq 0 ]:; then
    subprocess.run("print_message "$GREEN" "✓ Valid subagent format: $(basename "$file")"", shell=True)
    subprocess.run("return 0", shell=True)
    else:
    subprocess.run("return 1", shell=True)
    subprocess.run("}", shell=True)
    # Function to generate subagent from role rule
    subprocess.run("generate_subagent() {", shell=True)
    subprocess.run("local role_file=$1", shell=True)
    subprocess.run("local output_file=$2", shell=True)
    subprocess.run("local role_name=$(basename "$role_file" .md | sed 's/ROLE_//' | tr '[:upper:]' '[:lower:]' | tr '_' '-')", shell=True)
    subprocess.run("print_message "$BLUE" "Generating subagent: $role_name"", shell=True)
    # Read role file
    subprocess.run("local content=$(cat "$role_file")", shell=True)
    # Extract key information
    subprocess.run("local description=""", shell=True)
    subprocess.run("local tools=""", shell=True)
    # Determine tools based on role
    subprocess.run("case "$role_name" in", shell=True)
    subprocess.run(""requirement-analyst")", shell=True)
    subprocess.run("tools="Read, Write, TodoWrite, WebSearch"", shell=True)
    subprocess.run("description="Use proactively for gathering and analyzing requirements, creating user stories, and defining acceptance criteria"", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run(""auth-manager")", shell=True)
    subprocess.run("tools="Read, Edit, Bash, WebSearch, Write"", shell=True)
    subprocess.run("description="Implement and maintain secure authentication and authorization systems. Must be used for security-related tasks"", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run(""api-checker")", shell=True)
    subprocess.run("tools="Read, Grep, WebFetch, Bash"", shell=True)
    subprocess.run("description="Validate API contracts, compatibility, and documentation accuracy. Use for API testing and validation"", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run(""agent-scheduler")", shell=True)
    subprocess.run("tools="Task, TodoWrite, Read, Write"", shell=True)
    subprocess.run("description="Manage and coordinate multiple LLM agents for efficient task execution"", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run(""context-manager")", shell=True)
    subprocess.run("tools="Read, Write, TodoWrite"", shell=True)
    subprocess.run("description="Optimize context for LLM interactions and manage system state"", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run(""tester")", shell=True)
    subprocess.run("tools="Read, Edit, Bash, Grep, Glob"", shell=True)
    subprocess.run("description="Use proactively to write and run tests, ensure coverage, and fix test failures. Must be used after code changes"", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run(""gui-coordinator")", shell=True)
    subprocess.run("tools="Read, Write, Edit, WebSearch"", shell=True)
    subprocess.run("description="Design and implement user interfaces following the GUI design workflow. Use for all UI-related tasks"", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run(""feature-manager")", shell=True)
    subprocess.run("tools="Read, Write, TodoWrite, Task"", shell=True)
    subprocess.run("description="Oversee feature development from conception to deployment. Use for feature planning and coordination"", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("*)", shell=True)
    subprocess.run("tools=""  # Inherit all tools", shell=True)
    subprocess.run("description="Specialized agent for $role_name tasks"", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("esac", shell=True)
    # Create subagent file
    subprocess.run("cat > "$output_file" << EOF", shell=True)
    subprocess.run("---", shell=True)
    subprocess.run("name: $role_name", shell=True)
    subprocess.run("description: $description", shell=True)
    subprocess.run("tools: $tools", shell=True)
    subprocess.run("---", shell=True)
    # Role: ${role_name//-/ }
    subprocess.run("EOF", shell=True)
    # Process content to create system prompt
    subprocess.run("local in_responsibilities=false", shell=True)
    subprocess.run("local in_tasks=false", shell=True)
    subprocess.run("local in_best_practices=false", shell=True)
    subprocess.run("local system_prompt=""", shell=True)
    while IFS= read -r line; do:
    if [ "$line" =~ "## Responsibilities" ]:; then
    subprocess.run("in_responsibilities=true", shell=True)
    subprocess.run("system_prompt+="You are a ${role_name//-/ } with the following expertise:\n\n"", shell=True)
    elif [ "$line" =~ "## Primary Tasks" ]:; then
    subprocess.run("in_tasks=true", shell=True)
    subprocess.run("in_responsibilities=false", shell=True)
    subprocess.run("system_prompt+="\n## Your Primary Tasks\n\n"", shell=True)
    elif [ "$line" =~ "## Best Practices" ]:; then
    subprocess.run("in_best_practices=true", shell=True)
    subprocess.run("in_tasks=false", shell=True)
    subprocess.run("system_prompt+="\n## Best Practices to Follow\n\n"", shell=True)
    elif [ "$line" =~ ^## ]:; then
    subprocess.run("in_responsibilities=false", shell=True)
    subprocess.run("in_tasks=false", shell=True)
    subprocess.run("in_best_practices=false", shell=True)
    elif [ $in_responsibilities == true || $in_tasks == true || $in_best_practices == true ]:; then
    # Clean up the line and add to system prompt
    if [ ! "$line" =~ ^\`\`\` && ! -z "$line" ]:; then
    subprocess.run("system_prompt+="$line\n"", shell=True)
    subprocess.run("done <<< "$content"", shell=True)
    # Add general instructions
    subprocess.run("system_prompt+="\n## Approach\n\n"", shell=True)
    subprocess.run("system_prompt+="When invoked:\n"", shell=True)
    subprocess.run("system_prompt+="1. Understand the specific requirements of the task\n"", shell=True)
    subprocess.run("system_prompt+="2. Apply your specialized knowledge and best practices\n"", shell=True)
    subprocess.run("system_prompt+="3. Use the available tools effectively\n"", shell=True)
    subprocess.run("system_prompt+="4. Provide clear, actionable results\n"", shell=True)
    subprocess.run("system_prompt+="5. Document your work thoroughly\n\n"", shell=True)
    subprocess.run("system_prompt+="Always ensure your work is high quality, well-tested, and properly documented."", shell=True)
    # Write system prompt to file
    print("-e ")$system_prompt" >> "$output_file"
    subprocess.run("print_message "$GREEN" "✓ Generated: $output_file"", shell=True)
    subprocess.run("}", shell=True)
    # Function to deploy subagent
    subprocess.run("deploy_subagent() {", shell=True)
    subprocess.run("local source_file=$1", shell=True)
    subprocess.run("local target_dir=$2", shell=True)
    subprocess.run("local agent_name=$(basename "$source_file")", shell=True)
    subprocess.run("local target_file="$target_dir/$agent_name"", shell=True)
    # Check if target exists
    if [ -f "$target_file" && $FORCE_OVERWRITE == false ]:; then
    subprocess.run("print_message "$YELLOW" "⚠ Skipping (exists): $target_file"", shell=True)
    subprocess.run("print_message "$YELLOW" "  Use --force to overwrite"", shell=True)
    subprocess.run("return 1", shell=True)
    # Copy file
    shutil.copy2(""$source_file"", ""$target_file"")
    subprocess.run("print_message "$GREEN" "✓ Deployed: $target_file"", shell=True)
    subprocess.run("return 0", shell=True)
    subprocess.run("}", shell=True)
    # Function to list available subagents
    subprocess.run("list_subagents() {", shell=True)
    subprocess.run("print_message "$BLUE" "\nAvailable Subagents:"", shell=True)
    subprocess.run("print_message "$BLUE" "===================="", shell=True)
    # List from role rules
    if [ -d "$LLM_RULES_DIR" ]:; then
    subprocess.run("print_message "$YELLOW" "\nFrom Role Rules:"", shell=True)
    for role in ["$LLM_RULES_DIR"/ROLE_*.md; do]:
    if [ -f "$role" ]:; then
    subprocess.run("local name=$(basename "$role" .md | sed 's/ROLE_//' | tr '[:upper:]' '[:lower:]' | tr '_' '-')", shell=True)
    print("  - $name")
    # List existing subagents
    if [ -d "$SUBAGENTS_DIR" ]:; then
    subprocess.run("print_message "$YELLOW" "\nExisting Subagents:"", shell=True)
    for agent in ["$SUBAGENTS_DIR"/*.md; do]:
    if [ -f "$agent" ]:; then
    subprocess.run("local name=$(basename "$agent" .md)", shell=True)
    print("  - $name")
    print("")
    subprocess.run("}", shell=True)
    # Parse command line arguments
    subprocess.run("SELECTED_AGENTS=""", shell=True)
    while [[ $# -gt 0 ]]; do:
    subprocess.run("case $1 in", shell=True)
    subprocess.run("-h|--help)", shell=True)
    subprocess.run("usage", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("-p|--project)", shell=True)
    subprocess.run("DEPLOY_LOCATION="project"", shell=True)
    subprocess.run("shift", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("-u|--user)", shell=True)
    subprocess.run("DEPLOY_LOCATION="user"", shell=True)
    subprocess.run("shift", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("-f|--force)", shell=True)
    subprocess.run("FORCE_OVERWRITE=true", shell=True)
    subprocess.run("shift", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("-v|--validate)", shell=True)
    subprocess.run("VALIDATE_ONLY=true", shell=True)
    subprocess.run("shift", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("-g|--generate)", shell=True)
    subprocess.run("GENERATE_FROM_RULES=true", shell=True)
    subprocess.run("shift", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("--no-generate)", shell=True)
    subprocess.run("GENERATE_FROM_RULES=false", shell=True)
    subprocess.run("shift", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("-l|--list)", shell=True)
    subprocess.run("list_subagents", shell=True)
    sys.exit(0)
    subprocess.run(";;", shell=True)
    subprocess.run("-s|--select)", shell=True)
    subprocess.run("SELECTED_AGENTS="$2"", shell=True)
    subprocess.run("shift 2", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("*)", shell=True)
    subprocess.run("print_message "$RED" "Unknown option: $1"", shell=True)
    subprocess.run("usage", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("esac", shell=True)
    # Main execution
    subprocess.run("print_message "$BLUE" "🤖 Subagent Deployment Script"", shell=True)
    subprocess.run("print_message "$BLUE" "============================="", shell=True)
    print("")
    # Determine target directory
    if [ "$DEPLOY_LOCATION" == "project" ]:; then
    subprocess.run("TARGET_DIR="$PROJECT_ROOT/.claude/agents"", shell=True)
    subprocess.run("print_message "$YELLOW" "📁 Target: Project directory"", shell=True)
    else:
    subprocess.run("TARGET_DIR="$HOME/.claude/agents"", shell=True)
    subprocess.run("print_message "$YELLOW" "📁 Target: User home directory"", shell=True)
    # Create directories if needed
    Path(""$SUBAGENTS_DIR"").mkdir(parents=True, exist_ok=True)
    Path(""$TARGET_DIR"").mkdir(parents=True, exist_ok=True)
    # Generate subagents from rules
    if [ $GENERATE_FROM_RULES == true ]:; then
    subprocess.run("print_message "$BLUE" "\n📝 Generating Subagents from Role Rules..."", shell=True)
    for role_file in ["$LLM_RULES_DIR"/ROLE_*.md; do]:
    if [ -f "$role_file" ]:; then
    subprocess.run("agent_name=$(basename "$role_file" .md | sed 's/ROLE_//' | tr '[:upper:]' '[:lower:]' | tr '_' '-')", shell=True)
    # Check if specific agents were selected
    if [ ! -z "$SELECTED_AGENTS" ]:; then
    if [ ! ",$SELECTED_AGENTS," =~ ",$agent_name," ]:; then
    subprocess.run("continue", shell=True)
    subprocess.run("output_file="$SUBAGENTS_DIR/${agent_name}.md"", shell=True)
    subprocess.run("generate_subagent "$role_file" "$output_file"", shell=True)
    # Validate subagents
    subprocess.run("print_message "$BLUE" "\n🔍 Validating Subagents..."", shell=True)
    subprocess.run("validation_failed=false", shell=True)
    for agent_file in ["$SUBAGENTS_DIR"/*.md; do]:
    if [ -f "$agent_file" ]:; then
    subprocess.run("agent_name=$(basename "$agent_file" .md)", shell=True)
    # Check if specific agents were selected
    if [ ! -z "$SELECTED_AGENTS" ]:; then
    if [ ! ",$SELECTED_AGENTS," =~ ",$agent_name," ]:; then
    subprocess.run("continue", shell=True)
    subprocess.run("if ! validate_subagent "$agent_file"; then", shell=True)
    subprocess.run("validation_failed=true", shell=True)
    if [ $validation_failed == true ]:; then
    subprocess.run("print_message "$RED" "\n✗ Validation failed for some subagents"", shell=True)
    if [ $VALIDATE_ONLY == true ]:; then
    sys.exit(1)
    subprocess.run("read -p "Continue with deployment? (y/N) " -n 1 -r", shell=True)
    subprocess.run("echo", shell=True)
    if [ ! $REPLY =~ ^[Yy]$ ]:; then
    sys.exit(1)
    # Exit if validate only
    if [ $VALIDATE_ONLY == true ]:; then
    subprocess.run("print_message "$GREEN" "\n✓ Validation complete"", shell=True)
    sys.exit(0)
    # Deploy subagents
    subprocess.run("print_message "$BLUE" "\n🚀 Deploying Subagents..."", shell=True)
    subprocess.run("deployed_count=0", shell=True)
    subprocess.run("skipped_count=0", shell=True)
    for agent_file in ["$SUBAGENTS_DIR"/*.md; do]:
    if [ -f "$agent_file" ]:; then
    subprocess.run("agent_name=$(basename "$agent_file" .md)", shell=True)
    # Check if specific agents were selected
    if [ ! -z "$SELECTED_AGENTS" ]:; then
    if [ ! ",$SELECTED_AGENTS," =~ ",$agent_name," ]:; then
    subprocess.run("continue", shell=True)
    subprocess.run("if deploy_subagent "$agent_file" "$TARGET_DIR"; then", shell=True)
    subprocess.run("deployed_count=$((deployed_count + 1))", shell=True)
    else:
    subprocess.run("skipped_count=$((skipped_count + 1))", shell=True)
    # Summary
    subprocess.run("print_message "$BLUE" "\n📊 Deployment Summary"", shell=True)
    subprocess.run("print_message "$BLUE" "===================="", shell=True)
    subprocess.run("print_message "$GREEN" "✓ Deployed: $deployed_count subagents"", shell=True)
    if [ $skipped_count -gt 0 ]:; then
    subprocess.run("print_message "$YELLOW" "⚠ Skipped: $skipped_count subagents (already exist)"", shell=True)
    subprocess.run("print_message "$BLUE" "📁 Location: $TARGET_DIR"", shell=True)
    # Instructions
    subprocess.run("print_message "$BLUE" "\n📚 Next Steps:"", shell=True)
    print("1. Subagents are now available for use")
    print("2. Claude will automatically use them when appropriate")
    print("3. You can also explicitly invoke them:")
    print("   > Use the tester subagent to check my code")
    print("   > Have the requirement-analyst review this feature")
    print("")
    subprocess.run("print_message "$GREEN" "✓ Deployment complete!"", shell=True)

if __name__ == "__main__":
    main()