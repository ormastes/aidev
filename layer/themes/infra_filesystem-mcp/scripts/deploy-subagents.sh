#!/bin/bash

# Subagent Deployment Script
# Deploys role-based subagents to project or user directory

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
DEPLOY_LOCATION="project"
FORCE_OVERWRITE=false
VALIDATE_ONLY=false
GENERATE_FROM_RULES=true

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LLM_RULES_DIR="$PROJECT_ROOT/llm_rules"
SUBAGENTS_DIR="$PROJECT_ROOT/layer/themes/llm-agent_chat-space/subagents"

# Function to display usage
usage() {
    cat << EOF
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

EOF
    exit 0
}

# Function to print colored messages
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to validate subagent format
validate_subagent() {
    local file=$1
    local errors=0
    
    # Check if file exists
    if [[ ! -f "$file" ]]; then
        print_message "$RED" "✗ File not found: $file"
        return 1
    fi
    
    # Extract frontmatter
    local in_frontmatter=false
    local has_name=false
    local has_description=false
    local line_num=0
    
    while IFS= read -r line; do
        line_num=$((line_num + 1))
        
        if [[ $line_num -eq 1 && "$line" != "---" ]]; then
            print_message "$RED" "✗ Missing frontmatter start marker"
            errors=$((errors + 1))
            break
        fi
        
        if [[ "$line" == "---" ]]; then
            if [[ $line_num -eq 1 ]]; then
                in_frontmatter=true
            else
                in_frontmatter=false
                break
            fi
        elif [[ $in_frontmatter == true ]]; then
            if [[ "$line" =~ ^name: ]]; then
                has_name=true
                local name="${line#name: }"
                name="${name// /}"  # Remove spaces
                if [[ ! "$name" =~ ^[a-z][a-z-]*[a-z]$ ]]; then
                    print_message "$RED" "✗ Invalid name format: $name"
                    errors=$((errors + 1))
                fi
            elif [[ "$line" =~ ^description: ]]; then
                has_description=true
                local desc="${line#description: }"
                if [[ ${#desc} -lt 20 ]]; then
                    print_message "$YELLOW" "⚠ Description too short (min 20 chars)"
                fi
            fi
        fi
    done < "$file"
    
    if [[ $has_name == false ]]; then
        print_message "$RED" "✗ Missing required field: name"
        errors=$((errors + 1))
    fi
    
    if [[ $has_description == false ]]; then
        print_message "$RED" "✗ Missing required field: description"
        errors=$((errors + 1))
    fi
    
    if [[ $errors -eq 0 ]]; then
        print_message "$GREEN" "✓ Valid subagent format: $(basename "$file")"
        return 0
    else
        return 1
    fi
}

# Function to generate subagent from role rule
generate_subagent() {
    local role_file=$1
    local output_file=$2
    local role_name=$(basename "$role_file" .md | sed 's/ROLE_//' | tr '[:upper:]' '[:lower:]' | tr '_' '-')
    
    print_message "$BLUE" "Generating subagent: $role_name"
    
    # Read role file
    local content=$(cat "$role_file")
    
    # Extract key information
    local description=""
    local tools=""
    
    # Determine tools based on role
    case "$role_name" in
        "requirement-analyst")
            tools="Read, Write, TodoWrite, WebSearch"
            description="Use proactively for gathering and analyzing requirements, creating user stories, and defining acceptance criteria"
            ;;
        "auth-manager")
            tools="Read, Edit, Bash, WebSearch, Write"
            description="Implement and maintain secure authentication and authorization systems. Must be used for security-related tasks"
            ;;
        "api-checker")
            tools="Read, Grep, WebFetch, Bash"
            description="Validate API contracts, compatibility, and documentation accuracy. Use for API testing and validation"
            ;;
        "agent-scheduler")
            tools="Task, TodoWrite, Read, Write"
            description="Manage and coordinate multiple LLM agents for efficient task execution"
            ;;
        "context-manager")
            tools="Read, Write, TodoWrite"
            description="Optimize context for LLM interactions and manage system state"
            ;;
        "tester")
            tools="Read, Edit, Bash, Grep, Glob"
            description="Use proactively to write and run tests, ensure coverage, and fix test failures. Must be used after code changes"
            ;;
        "gui-coordinator")
            tools="Read, Write, Edit, WebSearch"
            description="Design and implement user interfaces following the GUI design workflow. Use for all UI-related tasks"
            ;;
        "feature-manager")
            tools="Read, Write, TodoWrite, Task"
            description="Oversee feature development from conception to deployment. Use for feature planning and coordination"
            ;;
        *)
            tools=""  # Inherit all tools
            description="Specialized agent for $role_name tasks"
            ;;
    esac
    
    # Create subagent file
    cat > "$output_file" << EOF
---
name: $role_name
description: $description
tools: $tools
---

# Role: ${role_name//-/ }

EOF
    
    # Process content to create system prompt
    local in_responsibilities=false
    local in_tasks=false
    local in_best_practices=false
    local system_prompt=""
    
    while IFS= read -r line; do
        if [[ "$line" =~ "## Responsibilities" ]]; then
            in_responsibilities=true
            system_prompt+="You are a ${role_name//-/ } with the following expertise:\n\n"
        elif [[ "$line" =~ "## Primary Tasks" ]]; then
            in_tasks=true
            in_responsibilities=false
            system_prompt+="\n## Your Primary Tasks\n\n"
        elif [[ "$line" =~ "## Best Practices" ]]; then
            in_best_practices=true
            in_tasks=false
            system_prompt+="\n## Best Practices to Follow\n\n"
        elif [[ "$line" =~ ^## ]]; then
            in_responsibilities=false
            in_tasks=false
            in_best_practices=false
        elif [[ $in_responsibilities == true || $in_tasks == true || $in_best_practices == true ]]; then
            # Clean up the line and add to system prompt
            if [[ ! "$line" =~ ^\`\`\` && ! -z "$line" ]]; then
                system_prompt+="$line\n"
            fi
        fi
    done <<< "$content"
    
    # Add general instructions
    system_prompt+="\n## Approach\n\n"
    system_prompt+="When invoked:\n"
    system_prompt+="1. Understand the specific requirements of the task\n"
    system_prompt+="2. Apply your specialized knowledge and best practices\n"
    system_prompt+="3. Use the available tools effectively\n"
    system_prompt+="4. Provide clear, actionable results\n"
    system_prompt+="5. Document your work thoroughly\n\n"
    system_prompt+="Always ensure your work is high quality, well-tested, and properly documented."
    
    # Write system prompt to file
    echo -e "$system_prompt" >> "$output_file"
    
    print_message "$GREEN" "✓ Generated: $output_file"
}

# Function to deploy subagent
deploy_subagent() {
    local source_file=$1
    local target_dir=$2
    local agent_name=$(basename "$source_file")
    local target_file="$target_dir/$agent_name"
    
    # Check if target exists
    if [[ -f "$target_file" && $FORCE_OVERWRITE == false ]]; then
        print_message "$YELLOW" "⚠ Skipping (exists): $target_file"
        print_message "$YELLOW" "  Use --force to overwrite"
        return 1
    fi
    
    # Copy file
    cp "$source_file" "$target_file"
    print_message "$GREEN" "✓ Deployed: $target_file"
    return 0
}

# Function to list available subagents
list_subagents() {
    print_message "$BLUE" "\nAvailable Subagents:"
    print_message "$BLUE" "===================="
    
    # List from role rules
    if [[ -d "$LLM_RULES_DIR" ]]; then
        print_message "$YELLOW" "\nFrom Role Rules:"
        for role in "$LLM_RULES_DIR"/ROLE_*.md; do
            if [[ -f "$role" ]]; then
                local name=$(basename "$role" .md | sed 's/ROLE_//' | tr '[:upper:]' '[:lower:]' | tr '_' '-')
                echo "  - $name"
            fi
        done
    fi
    
    # List existing subagents
    if [[ -d "$SUBAGENTS_DIR" ]]; then
        print_message "$YELLOW" "\nExisting Subagents:"
        for agent in "$SUBAGENTS_DIR"/*.md; do
            if [[ -f "$agent" ]]; then
                local name=$(basename "$agent" .md)
                echo "  - $name"
            fi
        done
    fi
    
    echo ""
}

# Parse command line arguments
SELECTED_AGENTS=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            ;;
        -p|--project)
            DEPLOY_LOCATION="project"
            shift
            ;;
        -u|--user)
            DEPLOY_LOCATION="user"
            shift
            ;;
        -f|--force)
            FORCE_OVERWRITE=true
            shift
            ;;
        -v|--validate)
            VALIDATE_ONLY=true
            shift
            ;;
        -g|--generate)
            GENERATE_FROM_RULES=true
            shift
            ;;
        --no-generate)
            GENERATE_FROM_RULES=false
            shift
            ;;
        -l|--list)
            list_subagents
            exit 0
            ;;
        -s|--select)
            SELECTED_AGENTS="$2"
            shift 2
            ;;
        *)
            print_message "$RED" "Unknown option: $1"
            usage
            ;;
    esac
done

# Main execution
print_message "$BLUE" "🤖 Subagent Deployment Script"
print_message "$BLUE" "============================="
echo ""

# Determine target directory
if [[ "$DEPLOY_LOCATION" == "project" ]]; then
    TARGET_DIR="$PROJECT_ROOT/.claude/agents"
    print_message "$YELLOW" "📁 Target: Project directory"
else
    TARGET_DIR="$HOME/.claude/agents"
    print_message "$YELLOW" "📁 Target: User home directory"
fi

# Create directories if needed
mkdir -p "$SUBAGENTS_DIR"
mkdir -p "$TARGET_DIR"

# Generate subagents from rules
if [[ $GENERATE_FROM_RULES == true ]]; then
    print_message "$BLUE" "\n📝 Generating Subagents from Role Rules..."
    
    for role_file in "$LLM_RULES_DIR"/ROLE_*.md; do
        if [[ -f "$role_file" ]]; then
            agent_name=$(basename "$role_file" .md | sed 's/ROLE_//' | tr '[:upper:]' '[:lower:]' | tr '_' '-')
            
            # Check if specific agents were selected
            if [[ ! -z "$SELECTED_AGENTS" ]]; then
                if [[ ! ",$SELECTED_AGENTS," =~ ",$agent_name," ]]; then
                    continue
                fi
            fi
            
            output_file="$SUBAGENTS_DIR/${agent_name}.md"
            generate_subagent "$role_file" "$output_file"
        fi
    done
fi

# Validate subagents
print_message "$BLUE" "\n🔍 Validating Subagents..."
validation_failed=false

for agent_file in "$SUBAGENTS_DIR"/*.md; do
    if [[ -f "$agent_file" ]]; then
        agent_name=$(basename "$agent_file" .md)
        
        # Check if specific agents were selected
        if [[ ! -z "$SELECTED_AGENTS" ]]; then
            if [[ ! ",$SELECTED_AGENTS," =~ ",$agent_name," ]]; then
                continue
            fi
        fi
        
        if ! validate_subagent "$agent_file"; then
            validation_failed=true
        fi
    fi
done

if [[ $validation_failed == true ]]; then
    print_message "$RED" "\n✗ Validation failed for some subagents"
    if [[ $VALIDATE_ONLY == true ]]; then
        exit 1
    fi
    read -p "Continue with deployment? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Exit if validate only
if [[ $VALIDATE_ONLY == true ]]; then
    print_message "$GREEN" "\n✓ Validation complete"
    exit 0
fi

# Deploy subagents
print_message "$BLUE" "\n🚀 Deploying Subagents..."
deployed_count=0
skipped_count=0

for agent_file in "$SUBAGENTS_DIR"/*.md; do
    if [[ -f "$agent_file" ]]; then
        agent_name=$(basename "$agent_file" .md)
        
        # Check if specific agents were selected
        if [[ ! -z "$SELECTED_AGENTS" ]]; then
            if [[ ! ",$SELECTED_AGENTS," =~ ",$agent_name," ]]; then
                continue
            fi
        fi
        
        if deploy_subagent "$agent_file" "$TARGET_DIR"; then
            deployed_count=$((deployed_count + 1))
        else
            skipped_count=$((skipped_count + 1))
        fi
    fi
done

# Summary
print_message "$BLUE" "\n📊 Deployment Summary"
print_message "$BLUE" "===================="
print_message "$GREEN" "✓ Deployed: $deployed_count subagents"
if [[ $skipped_count -gt 0 ]]; then
    print_message "$YELLOW" "⚠ Skipped: $skipped_count subagents (already exist)"
fi
print_message "$BLUE" "📁 Location: $TARGET_DIR"

# Instructions
print_message "$BLUE" "\n📚 Next Steps:"
echo "1. Subagents are now available for use"
echo "2. Claude will automatically use them when appropriate"
echo "3. You can also explicitly invoke them:"
echo "   > Use the tester subagent to check my code"
echo "   > Have the requirement-analyst review this feature"
echo ""
print_message "$GREEN" "✓ Deployment complete!"