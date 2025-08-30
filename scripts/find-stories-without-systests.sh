#!/bin/bash

echo "Finding user stories without system tests..."
echo "==========================================="
echo

missing_count=0
total_count=0

find layer/themes -type d -path "*/user-stories/*" -maxdepth 3 | sort | while read story; do
  story_name=$(basename "$story")
  theme=$(echo "$story" | sed 's|.*/themes/\([^/]*\)/.*|\1|')
  
  total_count=$((total_count + 1))
  
  # Check for system tests
  systest_files=$(find "$story" -type f \( -name "*systest*" -o -name "*system*.test*" -o -name "*.systest.ts" -o -name "*.systest.js" \) 2>/dev/null)
  systest_count=$(echo "$systest_files" | grep -c "." 2>/dev/null || echo "0")
  
  if [ -z "$systest_files" ] || [ "$systest_count" -eq 0 ]; then
    echo "❌ $theme/$story_name"
    missing_count=$((missing_count + 1))
  else
    echo "✅ $theme/$story_name (has $systest_count system tests)"
  fi
done

echo
echo "Summary:"
echo "Total user stories: $total_count"
echo "Stories without system tests: $missing_count"