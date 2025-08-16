#!/usr/bin/env python3
"""
Migrated from: validate-subagent-config.sh
Auto-generated Python - 2025-08-16T04:57:27.761Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Subagent Configuration Validation Script
    # Validates that Ollama roles are properly configured in the task queue
    subprocess.run("set -e", shell=True)
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("NC='\033[0m' # No Color", shell=True)
    print("🔍 Validating Subagent Configuration...")
    print("=======================================")
    # Check if required files exist
    subprocess.run("check_file() {", shell=True)
    if -f "$1" :; then
    print("-e ")${GREEN}✅${NC} Found: $1"
    subprocess.run("return 0", shell=True)
    else:
    print("-e ")${RED}❌${NC} Missing: $1"
    subprocess.run("return 1", shell=True)
    subprocess.run("}", shell=True)
    # Check if string contains pattern
    subprocess.run("check_content() {", shell=True)
    subprocess.run("if grep -q "$2" "$1" 2>/dev/null; then", shell=True)
    print("-e ")${GREEN}✅${NC} $3"
    subprocess.run("return 0", shell=True)
    else:
    print("-e ")${RED}❌${NC} $3"
    subprocess.run("return 1", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("ERRORS=0", shell=True)
    print("")
    print("1️⃣ Checking Configuration Files:")
    print("---------------------------------")
    # Check main task queue
    subprocess.run("if check_file "TASK_QUEUE.vf.json"; then", shell=True)
    subprocess.run("check_content "TASK_QUEUE.vf.json" "__subagent_delegation" "Task queue has subagent delegation" || ((ERRORS++))", shell=True)
    subprocess.run("check_content "TASK_QUEUE.vf.json" "__ollama_mode" "Task queue has Ollama mode configuration" || ((ERRORS++))", shell=True)
    subprocess.run("check_content "TASK_QUEUE.vf.json" "__claude_mode" "Task queue has Claude mode configuration" || ((ERRORS++))", shell=True)
    else:
    subprocess.run("((ERRORS++))", shell=True)
    # Check template
    subprocess.run("TEMPLATE="layer/themes/infra_filesystem-mcp/schemas/templates/TASK_QUEUE.vf.json.template"", shell=True)
    subprocess.run("if check_file "$TEMPLATE"; then", shell=True)
    subprocess.run("check_content "$TEMPLATE" "subagentDelegation" "Template has subagent delegation section" || ((ERRORS++))", shell=True)
    subprocess.run("check_content "$TEMPLATE" "environments" "Template has environment configurations" || ((ERRORS++))", shell=True)
    subprocess.run("check_content "$TEMPLATE" "delegationRules" "Template has delegation rules" || ((ERRORS++))", shell=True)
    else:
    subprocess.run("((ERRORS++))", shell=True)
    print("")
    print("2️⃣ Checking Agent Definitions:")
    print("-------------------------------")
    # Check agent files
    subprocess.run("AGENTS=(".claude/agents/test-runner.md" ".claude/agents/code-reviewer.md" ".claude/agents/ollama-tester.md" ".claude/agents/feature-manager.md")", shell=True)
    for agent in ["${AGENTS[@]}"; do]:
    subprocess.run("check_file "$agent" || ((ERRORS++))", shell=True)
    print("")
    print("3️⃣ Checking Ollama Role References:")
    print("------------------------------------")
    # Check for Ollama roles in configuration
    subprocess.run("ROLES=("ROLE_TESTER" "ROLE_FEATURE_MANAGER" "ROLE_GUI_COORDINATOR" "ROLE_REVIEWER")", shell=True)
    for role in ["${ROLES[@]}"; do]:
    subprocess.run("if grep -q "$role" TASK_QUEUE.vf.json 2>/dev/null || grep -q "$role" "$TEMPLATE" 2>/dev/null; then", shell=True)
    print("-e ")${GREEN}✅${NC} Role configured: $role"
    else:
    print("-e ")${YELLOW}⚠️${NC} Role not found in configuration: $role"
    print("")
    print("4️⃣ Checking Task Types:")
    print("-----------------------")
    # Check for task types that map to roles
    subprocess.run("TASK_TYPES=("system_tests_implement" "user_story" "scenarios" "unit_tests")", shell=True)
    for task_type in ["${TASK_TYPES[@]}"; do]:
    subprocess.run("if grep -q "\"$task_type\"" TASK_QUEUE.vf.json 2>/dev/null; then", shell=True)
    print("-e ")${GREEN}✅${NC} Task type found: $task_type"
    else:
    print("-e ")${YELLOW}⚠️${NC} Task type not in queue: $task_type"
    print("")
    print("5️⃣ Checking Documentation:")
    print("--------------------------")
    # Check documentation
    subprocess.run("DOC="research/subagent-delegation-guide.md"", shell=True)
    subprocess.run("if check_file "$DOC"; then", shell=True)
    subprocess.run("check_content "$DOC" "Claude Code" "Documentation covers Claude Code" || ((ERRORS++))", shell=True)
    subprocess.run("check_content "$DOC" "Ollama" "Documentation covers Ollama" || ((ERRORS++))", shell=True)
    subprocess.run("check_content "$DOC" "Environment-Specific Configuration" "Documentation covers environment config" || ((ERRORS++))", shell=True)
    else:
    subprocess.run("((ERRORS++))", shell=True)
    print("")
    print("6️⃣ Checking Tests:")
    print("------------------")
    # Check test files
    subprocess.run("TESTS=(", shell=True)
    subprocess.run(""tests/system/ollama-chat-space-role-enablement.stest.ts"", shell=True)
    subprocess.run(""tests/integration/ollama-role-configuration.itest.ts"", shell=True)
    subprocess.run(")", shell=True)
    for test in ["${TESTS[@]}"; do]:
    subprocess.run("check_file "$test" || ((ERRORS++))", shell=True)
    print("")
    print("=======================================")
    if $ERRORS -eq 0 :; then
    print("-e ")${GREEN}✅ All validations passed!${NC}"
    print("Subagent configuration is properly set up for both Claude and Ollama environments.")
    sys.exit(0)
    else:
    print("-e ")${RED}❌ Found $ERRORS validation error(s)${NC}"
    print("Please review the configuration and fix the issues.")
    sys.exit(1)

if __name__ == "__main__":
    main()