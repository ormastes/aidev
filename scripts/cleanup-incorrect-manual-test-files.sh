#!/bin/bash

# Script to clean up incorrectly created manual test files
# These were created with wrong understanding of test-as-manual theme

set -e

echo "Cleaning up incorrectly created manual test files..."
echo "These files were created thinking manual testing vs automated,"
echo "but test-as-manual is about generating documentation FROM tests."
echo ""

THEMES_DIR="layer/themes"
REMOVED_COUNT=0

# Remove incorrectly created Cucumber files and manual test features
for theme_dir in $THEMES_DIR/*/; do
  theme_name=$(basename "$theme_dir")
  
  # Skip the original test-as-manual theme
  if [[ "$theme_name" == "infra_test-as-manual" ]] || [[ "$theme_name" == "infra_cucumber" ]]; then
    continue
  fi
  
  # Check if we created incorrect manual test files
  FILES_TO_REMOVE=()
  
  # Files created by the incorrect manual test setup
  [ -f "$theme_dir/cucumber.config.ts" ] && FILES_TO_REMOVE+=("$theme_dir/cucumber.config.ts")
  [ -f "$theme_dir/cucumber.yml" ] && FILES_TO_REMOVE+=("$theme_dir/cucumber.yml")
  [ -f "$theme_dir/features/support/hooks.ts" ] && FILES_TO_REMOVE+=("$theme_dir/features/support/hooks.ts")
  [ -f "$theme_dir/features/support/world.ts" ] && FILES_TO_REMOVE+=("$theme_dir/features/support/world.ts")
  
  # Remove manual test feature files (but keep legitimate feature files)
  if [ -d "$theme_dir/features" ]; then
    # Remove files with pattern *-manual-tests.feature and system-*.feature
    find "$theme_dir/features" -name "*-manual-tests.feature" -o -name "system-*.feature" 2>/dev/null | while read -r file; do
      FILES_TO_REMOVE+=("$file")
    done
    
    # Remove step definitions created for manual tests
    [ -f "$theme_dir/features/step_definitions/system-test-steps.ts" ] && FILES_TO_REMOVE+=("$theme_dir/features/step_definitions/system-test-steps.ts")
  fi
  
  # Remove the files
  if [ ${#FILES_TO_REMOVE[@]} -gt 0 ]; then
    echo "Cleaning theme: $theme_name"
    for file in "${FILES_TO_REMOVE[@]}"; do
      if [ -f "$file" ]; then
        rm "$file"
        echo "  Removed: $(basename $file)"
        REMOVED_COUNT=$((REMOVED_COUNT + 1))
      fi
    done
    
    # Remove empty directories
    [ -d "$theme_dir/features/support" ] && rmdir --ignore-fail-on-non-empty "$theme_dir/features/support" 2>/dev/null || true
    [ -d "$theme_dir/features/step_definitions" ] && rmdir --ignore-fail-on-non-empty "$theme_dir/features/step_definitions" 2>/dev/null || true
    [ -d "$theme_dir/features" ] && rmdir --ignore-fail-on-non-empty "$theme_dir/features" 2>/dev/null || true
  fi
done

# Remove the incorrectly created shared manual test steps
if [ -f "$THEMES_DIR/shared/features/step_definitions/manual-test-steps.ts" ]; then
  rm "$THEMES_DIR/shared/features/step_definitions/manual-test-steps.ts"
  echo "Removed shared manual test steps"
  REMOVED_COUNT=$((REMOVED_COUNT + 1))
fi

# Remove incorrect scripts
SCRIPTS_TO_REMOVE=(
  "scripts/setup-cucumber-for-themes.sh"
  "scripts/generate-manual-test-scenarios.sh"
  "scripts/convert-system-tests-to-cucumber.sh"
  "scripts/run-manual-tests.sh"
)

for script in "${SCRIPTS_TO_REMOVE[@]}"; do
  if [ -f "$script" ]; then
    rm "$script"
    echo "Removed script: $(basename $script)"
    REMOVED_COUNT=$((REMOVED_COUNT + 1))
  fi
done

# Remove incorrect documentation
DOCS_TO_REMOVE=(
  "gen/doc/MANUAL_TEST_GUIDE.md"
  "gen/doc/SYSTEM_TEST_MANUAL_COMPATIBILITY_REPORT.md"
)

for doc in "${DOCS_TO_REMOVE[@]}"; do
  if [ -f "$doc" ]; then
    rm "$doc"
    echo "Removed documentation: $(basename $doc)"
    REMOVED_COUNT=$((REMOVED_COUNT + 1))
  fi
done

echo ""
echo "Cleanup complete!"
echo "Total files removed: $REMOVED_COUNT"
echo ""
echo "Now ready to implement proper test-as-manual documentation generation."