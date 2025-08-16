#!/usr/bin/env bun
/**
 * Migrated from: validate-subagent-config.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.760Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Subagent Configuration Validation Script
  // Validates that Ollama roles are properly configured in the task queue
  await $`set -e`;
  await $`GREEN='\033[0;32m'`;
  await $`RED='\033[0;31m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`NC='\033[0m' # No Color`;
  console.log("🔍 Validating Subagent Configuration...");
  console.log("=======================================");
  // Check if required files exist
  await $`check_file() {`;
  if (-f "$1" ) {; then
  console.log("-e ");${GREEN}✅${NC} Found: $1"
  await $`return 0`;
  } else {
  console.log("-e ");${RED}❌${NC} Missing: $1"
  await $`return 1`;
  }
  await $`}`;
  // Check if string contains pattern
  await $`check_content() {`;
  await $`if grep -q "$2" "$1" 2>/dev/null; then`;
  console.log("-e ");${GREEN}✅${NC} $3"
  await $`return 0`;
  } else {
  console.log("-e ");${RED}❌${NC} $3"
  await $`return 1`;
  }
  await $`}`;
  await $`ERRORS=0`;
  console.log("");
  console.log("1️⃣ Checking Configuration Files:");
  console.log("---------------------------------");
  // Check main task queue
  await $`if check_file "TASK_QUEUE.vf.json"; then`;
  await $`check_content "TASK_QUEUE.vf.json" "__subagent_delegation" "Task queue has subagent delegation" || ((ERRORS++))`;
  await $`check_content "TASK_QUEUE.vf.json" "__ollama_mode" "Task queue has Ollama mode configuration" || ((ERRORS++))`;
  await $`check_content "TASK_QUEUE.vf.json" "__claude_mode" "Task queue has Claude mode configuration" || ((ERRORS++))`;
  } else {
  await $`((ERRORS++))`;
  }
  // Check template
  await $`TEMPLATE="layer/themes/infra_filesystem-mcp/schemas/templates/TASK_QUEUE.vf.json.template"`;
  await $`if check_file "$TEMPLATE"; then`;
  await $`check_content "$TEMPLATE" "subagentDelegation" "Template has subagent delegation section" || ((ERRORS++))`;
  await $`check_content "$TEMPLATE" "environments" "Template has environment configurations" || ((ERRORS++))`;
  await $`check_content "$TEMPLATE" "delegationRules" "Template has delegation rules" || ((ERRORS++))`;
  } else {
  await $`((ERRORS++))`;
  }
  console.log("");
  console.log("2️⃣ Checking Agent Definitions:");
  console.log("-------------------------------");
  // Check agent files
  await $`AGENTS=(".claude/agents/test-runner.md" ".claude/agents/code-reviewer.md" ".claude/agents/ollama-tester.md" ".claude/agents/feature-manager.md")`;
  for (const agent of ["${AGENTS[@]}"; do]) {
  await $`check_file "$agent" || ((ERRORS++))`;
  }
  console.log("");
  console.log("3️⃣ Checking Ollama Role References:");
  console.log("------------------------------------");
  // Check for Ollama roles in configuration
  await $`ROLES=("ROLE_TESTER" "ROLE_FEATURE_MANAGER" "ROLE_GUI_COORDINATOR" "ROLE_REVIEWER")`;
  for (const role of ["${ROLES[@]}"; do]) {
  await $`if grep -q "$role" TASK_QUEUE.vf.json 2>/dev/null || grep -q "$role" "$TEMPLATE" 2>/dev/null; then`;
  console.log("-e ");${GREEN}✅${NC} Role configured: $role"
  } else {
  console.log("-e ");${YELLOW}⚠️${NC} Role not found in configuration: $role"
  }
  }
  console.log("");
  console.log("4️⃣ Checking Task Types:");
  console.log("-----------------------");
  // Check for task types that map to roles
  await $`TASK_TYPES=("system_tests_implement" "user_story" "scenarios" "unit_tests")`;
  for (const task_type of ["${TASK_TYPES[@]}"; do]) {
  await $`if grep -q "\"$task_type\"" TASK_QUEUE.vf.json 2>/dev/null; then`;
  console.log("-e ");${GREEN}✅${NC} Task type found: $task_type"
  } else {
  console.log("-e ");${YELLOW}⚠️${NC} Task type not in queue: $task_type"
  }
  }
  console.log("");
  console.log("5️⃣ Checking Documentation:");
  console.log("--------------------------");
  // Check documentation
  await $`DOC="research/subagent-delegation-guide.md"`;
  await $`if check_file "$DOC"; then`;
  await $`check_content "$DOC" "Claude Code" "Documentation covers Claude Code" || ((ERRORS++))`;
  await $`check_content "$DOC" "Ollama" "Documentation covers Ollama" || ((ERRORS++))`;
  await $`check_content "$DOC" "Environment-Specific Configuration" "Documentation covers environment config" || ((ERRORS++))`;
  } else {
  await $`((ERRORS++))`;
  }
  console.log("");
  console.log("6️⃣ Checking Tests:");
  console.log("------------------");
  // Check test files
  await $`TESTS=(`;
  await $`"tests/system/ollama-chat-space-role-enablement.stest.ts"`;
  await $`"tests/integration/ollama-role-configuration.itest.ts"`;
  await $`)`;
  for (const test of ["${TESTS[@]}"; do]) {
  await $`check_file "$test" || ((ERRORS++))`;
  }
  console.log("");
  console.log("=======================================");
  if ($ERRORS -eq 0 ) {; then
  console.log("-e ");${GREEN}✅ All validations passed!${NC}"
  console.log("Subagent configuration is properly set up for both Claude and Ollama environments.");
  process.exit(0);
  } else {
  console.log("-e ");${RED}❌ Found $ERRORS validation error(s)${NC}"
  console.log("Please review the configuration and fix the issues.");
  process.exit(1);
  }
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}