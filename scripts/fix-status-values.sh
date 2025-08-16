#!/bin/bash

echo "Fixing status values from 'In Progress' to 'completed'..."

# Fix test expectations
find layer/themes -type f \( -name "*.ts" -o -name "*.js" \) -exec grep -l "\.toBe('In Progress')" {} \; 2>/dev/null | while read file; do
    echo "Fixing test expectations in: $file"
    sed -i "s/\.toBe('In Progress')/\.toBe('completed')/g" "$file"
done

# Fix status type definitions
find layer/themes -type f \( -name "*.ts" -o -name "*.js" \) -exec grep -l "'In Progress'" {} \; 2>/dev/null | while read file; do
    if grep -q "status.*'In Progress'" "$file" || grep -q "'In Progress'.*status" "$file"; then
        echo "Fixing status type in: $file"
        sed -i "s/'In Progress'/'completed'/g" "$file"
    fi
done

# Fix array contains checks
find layer/themes -type f \( -name "*.ts" -o -name "*.js" \) -exec grep -l "\.toContain.*'In Progress'" {} \; 2>/dev/null | while read file; do
    echo "Fixing array contains in: $file"
    sed -i "s/\['In Progress'/\['completed'/g" "$file"
done

# Fix comments that reference status
find layer/themes -type f \( -name "*.ts" -o -name "*.js" \) -exec grep -l "// .*In Progress" {} \; 2>/dev/null | while read file; do
    echo "Fixing comments in: $file"
    sed -i "s/In Progress/completed/g" "$file"
done

echo "Status values fixed!"