#!/bin/bash

# Subagent Configuration Validation Script
# Validates that Ollama roles are properly configured in the task queue

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Validating Subagent Configuration..."
echo "======================================="

# Check if required files exist
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅${NC} Found: $1"
        return 0
    else
        echo -e "${RED}❌${NC} Missing: $1"
        return 1
    fi
}

# Check if string contains pattern
check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✅${NC} $3"
        return 0
    else
        echo -e "${RED}❌${NC} $3"
        return 1
    fi
}

ERRORS=0

echo ""
echo "1️⃣ Checking Configuration Files:"
echo "---------------------------------"

# Check main task queue
if check_file "TASK_QUEUE.vf.json"; then
    check_content "TASK_QUEUE.vf.json" "__subagent_delegation" "Task queue has subagent delegation" || ((ERRORS++))
    check_content "TASK_QUEUE.vf.json" "__ollama_mode" "Task queue has Ollama mode configuration" || ((ERRORS++))
    check_content "TASK_QUEUE.vf.json" "__claude_mode" "Task queue has Claude mode configuration" || ((ERRORS++))
else
    ((ERRORS++))
fi

# Check template
TEMPLATE="layer/themes/infra_filesystem-mcp/schemas/templates/TASK_QUEUE.vf.json.template"
if check_file "$TEMPLATE"; then
    check_content "$TEMPLATE" "subagentDelegation" "Template has subagent delegation section" || ((ERRORS++))
    check_content "$TEMPLATE" "environments" "Template has environment configurations" || ((ERRORS++))
    check_content "$TEMPLATE" "delegationRules" "Template has delegation rules" || ((ERRORS++))
else
    ((ERRORS++))
fi

echo ""
echo "2️⃣ Checking Agent Definitions:"
echo "-------------------------------"

# Check agent files
AGENTS=(".claude/agents/test-runner.md" ".claude/agents/code-reviewer.md" ".claude/agents/ollama-tester.md" ".claude/agents/feature-manager.md")
for agent in "${AGENTS[@]}"; do
    check_file "$agent" || ((ERRORS++))
done

echo ""
echo "3️⃣ Checking Ollama Role References:"
echo "------------------------------------"

# Check for Ollama roles in configuration
ROLES=("ROLE_TESTER" "ROLE_FEATURE_MANAGER" "ROLE_GUI_COORDINATOR" "ROLE_REVIEWER")
for role in "${ROLES[@]}"; do
    if grep -q "$role" TASK_QUEUE.vf.json 2>/dev/null || grep -q "$role" "$TEMPLATE" 2>/dev/null; then
        echo -e "${GREEN}✅${NC} Role configured: $role"
    else
        echo -e "${YELLOW}⚠️${NC} Role not found in configuration: $role"
    fi
done

echo ""
echo "4️⃣ Checking Task Types:"
echo "-----------------------"

# Check for task types that map to roles
TASK_TYPES=("system_tests_implement" "user_story" "scenarios" "unit_tests")
for task_type in "${TASK_TYPES[@]}"; do
    if grep -q "\"$task_type\"" TASK_QUEUE.vf.json 2>/dev/null; then
        echo -e "${GREEN}✅${NC} Task type found: $task_type"
    else
        echo -e "${YELLOW}⚠️${NC} Task type not in queue: $task_type"
    fi
done

echo ""
echo "5️⃣ Checking Documentation:"
echo "--------------------------"

# Check documentation
DOC="research/subagent-delegation-guide.md"
if check_file "$DOC"; then
    check_content "$DOC" "Claude Code" "Documentation covers Claude Code" || ((ERRORS++))
    check_content "$DOC" "Ollama" "Documentation covers Ollama" || ((ERRORS++))
    check_content "$DOC" "Environment-Specific Configuration" "Documentation covers environment config" || ((ERRORS++))
else
    ((ERRORS++))
fi

echo ""
echo "6️⃣ Checking Tests:"
echo "------------------"

# Check test files
TESTS=(
    "tests/system/ollama-chat-space-role-enablement.stest.ts"
    "tests/integration/ollama-role-configuration.itest.ts"
)

for test in "${TESTS[@]}"; do
    check_file "$test" || ((ERRORS++))
done

echo ""
echo "======================================="
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All validations passed!${NC}"
    echo "Subagent configuration is properly set up for both Claude and Ollama environments."
    exit 0
else
    echo -e "${RED}❌ Found $ERRORS validation error(s)${NC}"
    echo "Please review the configuration and fix the issues."
    exit 1
fi