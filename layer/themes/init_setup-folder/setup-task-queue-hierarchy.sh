#!/bin/bash

# Setup Task Queue Hierarchy for New Themes
# Automatically creates and registers task queues with parent-child relationships

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
HIERARCHY_SCRIPT="$PROJECT_ROOT/layer/themes/infra_filesystem-mcp/scripts/manage-task-queue-hierarchy.js"

# Function to print colored messages
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to create task queue for theme
create_theme_queue() {
    local theme_path=$1
    local theme_name=$(basename "$theme_path")
    local queue_path="$theme_path/TASK_QUEUE.vf.json"
    
    print_message "$BLUE" "📁 Creating task queue for theme: $theme_name"
    
    # Check if queue already exists
    if [[ -f "$queue_path" ]]; then
        print_message "$YELLOW" "  Queue already exists, updating parent..."
    else
        # Create queue template
        cat > "$queue_path" << EOF
{
  "metadata": {
    "version": "1.0.0",
    "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",
    "updated_at": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",
    "total_items": 0,
    "description": "Task queue for $theme_name theme"
  },
  "parentQueue": "/TASK_QUEUE.vf.json",
  "theme": "$theme_name",
  "working_item": null,
  "queues": {
    "adhoc_temp_user_request": {
      "items": [],
      "insert_comment": "📋 Add urgent tasks specific to $theme_name",
      "pop_comment": "🎯 Handle $theme_name urgent request"
    },
    "user_story": {
      "items": [],
      "insert_comment": "📋 Add user stories for $theme_name features",
      "pop_comment": "🎯 Implement $theme_name user story"
    },
    "scenarios": {
      "items": [],
      "insert_comment": "📋 Add scenarios for $theme_name",
      "pop_comment": "🎯 Process $theme_name scenario"
    },
    "environment_tests": {
      "items": [],
      "insert_comment": "📋 Add environment tests for $theme_name",
      "pop_comment": "🎯 Run $theme_name environment test"
    },
    "external_tests": {
      "items": [],
      "insert_comment": "📋 Add external tests for $theme_name",
      "pop_comment": "🎯 Run $theme_name external test"
    },
    "system_tests_implement": {
      "items": [],
      "insert_comment": "📋 Add system tests for $theme_name",
      "pop_comment": "🎯 Implement $theme_name system test"
    },
    "integration_tests_implement": {
      "items": [],
      "insert_comment": "📋 Add integration tests for $theme_name",
      "pop_comment": "🎯 Implement $theme_name integration test"
    },
    "unit_tests": {
      "items": [],
      "insert_comment": "📋 Add unit tests for $theme_name",
      "pop_comment": "🎯 Implement $theme_name unit test"
    },
    "integration_tests_verify": {
      "items": [],
      "insert_comment": "📋 Verify integration tests for $theme_name",
      "pop_comment": "🎯 Verify $theme_name integration test"
    },
    "system_tests_verify": {
      "items": [],
      "insert_comment": "📋 Verify system tests for $theme_name",
      "pop_comment": "🎯 Verify $theme_name system test"
    },
    "coverage_duplication": {
      "items": [],
      "insert_comment": "📋 Check coverage for $theme_name",
      "pop_comment": "🎯 Analyze $theme_name coverage"
    },
    "retrospective": {
      "items": [],
      "insert_comment": "📋 Add retrospective for $theme_name",
      "pop_comment": "🎯 Process $theme_name retrospective"
    }
  },
  "global_config": {
    "seldom_display_default": 5,
    "operation_counters": {}
  },
  "priority_order": [
    "adhoc_temp_user_request",
    "environment_tests",
    "external_tests",
    "system_tests_implement",
    "integration_tests_implement",
    "unit_tests",
    "integration_tests_verify",
    "system_tests_verify",
    "scenarios",
    "user_story",
    "coverage_duplication",
    "retrospective"
  ]
}
EOF
        print_message "$GREEN" "  ✓ Created queue: $queue_path"
    fi
    
    # Register with hierarchy manager
    local relative_path="${queue_path#$PROJECT_ROOT/}"
    if [[ -f "$HIERARCHY_SCRIPT" ]]; then
        node "$HIERARCHY_SCRIPT" add "$relative_path" "/TASK_QUEUE.vf.json"
    fi
}

# Function to create sub-theme queue
create_subtheme_queue() {
    local parent_theme=$1
    local subtheme_path=$2
    local subtheme_name=$(basename "$subtheme_path")
    local queue_path="$subtheme_path/TASK_QUEUE.vf.json"
    local parent_queue_path="/layer/themes/$parent_theme/TASK_QUEUE.vf.json"
    
    print_message "$BLUE" "  📂 Creating sub-queue for: $subtheme_name"
    
    if [[ ! -f "$queue_path" ]]; then
        # Create minimal sub-queue
        cat > "$queue_path" << EOF
{
  "metadata": {
    "version": "1.0.0",
    "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",
    "updated_at": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",
    "total_items": 0,
    "description": "Sub-queue for $subtheme_name under $parent_theme"
  },
  "parentQueue": "$parent_queue_path",
  "parentTheme": "$parent_theme",
  "theme": "$parent_theme",
  "subtheme": "$subtheme_name",
  "working_item": null,
  "queues": {
    "adhoc_temp_user_request": { "items": [] },
    "user_story": { "items": [] },
    "scenarios": { "items": [] },
    "environment_tests": { "items": [] },
    "external_tests": { "items": [] },
    "system_tests_implement": { "items": [] },
    "integration_tests_implement": { "items": [] },
    "unit_tests": { "items": [] },
    "integration_tests_verify": { "items": [] },
    "system_tests_verify": { "items": [] },
    "coverage_duplication": { "items": [] },
    "retrospective": { "items": [] }
  },
  "global_config": {
    "seldom_display_default": 5,
    "operation_counters": {}
  },
  "priority_order": [
    "adhoc_temp_user_request",
    "environment_tests",
    "external_tests",
    "system_tests_implement",
    "integration_tests_implement",
    "unit_tests",
    "integration_tests_verify",
    "system_tests_verify",
    "scenarios",
    "user_story",
    "coverage_duplication",
    "retrospective"
  ]
}
EOF
        print_message "$GREEN" "    ✓ Created sub-queue"
    fi
    
    # Register with hierarchy
    local relative_path="${queue_path#$PROJECT_ROOT/}"
    if [[ -f "$HIERARCHY_SCRIPT" ]]; then
        node "$HIERARCHY_SCRIPT" add "$relative_path" "$parent_queue_path"
    fi
}

# Function to setup hierarchy for all themes
setup_all_themes() {
    print_message "$BLUE" "🔄 Setting up task queue hierarchy for all themes"
    print_message "$BLUE" "================================================"
    echo ""
    
    local themes_dir="$PROJECT_ROOT/layer/themes"
    
    if [[ ! -d "$themes_dir" ]]; then
        print_message "$RED" "✗ Themes directory not found: $themes_dir"
        exit 1
    fi
    
    # Process each theme
    for theme_dir in "$themes_dir"/*; do
        if [[ -d "$theme_dir" ]]; then
            local theme_name=$(basename "$theme_dir")
            
            # Skip if not a valid theme directory
            if [[ "$theme_name" == ".*" ]] || [[ "$theme_name" == "node_modules" ]]; then
                continue
            fi
            
            # Create main theme queue
            create_theme_queue "$theme_dir"
            
            # Check for sub-directories that might need queues
            for subdir in "$theme_dir"/*; do
                if [[ -d "$subdir" ]]; then
                    local subdir_name=$(basename "$subdir")
                    
                    # Check if it's a known sub-theme pattern
                    case "$subdir_name" in
                        user-stories|children|pipe|scripts|docs|tests)
                            # These typically don't need their own queue
                            ;;
                        layer)
                            # This might have nested themes
                            if [[ -d "$subdir/themes" ]]; then
                                for nested_theme in "$subdir/themes"/*; do
                                    if [[ -d "$nested_theme" ]]; then
                                        create_subtheme_queue "$theme_name" "$nested_theme"
                                    fi
                                done
                            fi
                            ;;
                        *)
                            # Check if it looks like it needs a queue
                            if [[ -f "$subdir/package.json" ]] || [[ -f "$subdir/tsconfig.json" ]]; then
                                create_subtheme_queue "$theme_name" "$subdir"
                            fi
                            ;;
                    esac
                fi
            done
        fi
    done
}

# Function to update registry
update_registry() {
    print_message "$BLUE" "\n📊 Updating Task Queue Registry..."
    
    # Compile TypeScript if needed
    if [[ ! -f "$HIERARCHY_SCRIPT" ]]; then
        print_message "$YELLOW" "Compiling hierarchy manager..."
        cd "$(dirname "$HIERARCHY_SCRIPT")"
        bunx tsc manage-task-queue-hierarchy.ts
    fi
    
    # Run discovery
    node "$HIERARCHY_SCRIPT" discover
}

# Function to validate hierarchy
validate_hierarchy() {
    print_message "$BLUE" "\n🔍 Validating Hierarchy..."
    
    if [[ -f "$HIERARCHY_SCRIPT" ]]; then
        node "$HIERARCHY_SCRIPT" validate
    else
        print_message "$RED" "✗ Hierarchy script not found"
    fi
}

# Function to show hierarchy
show_hierarchy() {
    if [[ -f "$HIERARCHY_SCRIPT" ]]; then
        node "$HIERARCHY_SCRIPT" show
    else
        print_message "$RED" "✗ Hierarchy script not found"
    fi
}

# Main execution
case "${1:-setup}" in
    setup)
        setup_all_themes
        update_registry
        show_hierarchy
        ;;
    validate)
        validate_hierarchy
        ;;
    show)
        show_hierarchy
        ;;
    fix)
        if [[ -f "$HIERARCHY_SCRIPT" ]]; then
            node "$HIERARCHY_SCRIPT" fix
        fi
        ;;
    add)
        if [[ -z "$2" ]]; then
            print_message "$RED" "Usage: $0 add <theme-path>"
            exit 1
        fi
        create_theme_queue "$2"
        update_registry
        ;;
    help)
        print_message "$BLUE" "Task Queue Hierarchy Setup"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  setup    - Setup queues for all themes (default)"
        echo "  validate - Validate parent-child relationships"
        echo "  show     - Display current hierarchy"
        echo "  fix      - Fix orphaned queues"
        echo "  add <p>  - Add queue for specific theme"
        echo "  help     - Show this help"
        ;;
    *)
        print_message "$RED" "Unknown command: $1"
        echo "Run '$0 help' for usage"
        exit 1
        ;;
esac

print_message "$GREEN" "\n✓ Task queue hierarchy setup complete!"