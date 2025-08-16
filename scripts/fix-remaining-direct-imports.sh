#!/bin/bash

echo "Fixing remaining direct Node.js imports..."
echo "=========================================="

# First compile the external-log-lib if not already done
echo "Ensuring external-log-lib is compiled..."
cd layer/themes/infra_external-log-lib
mkdir -p dist
bunx tsc src/config.ts src/facades/*.ts src/index.ts --outDir ./dist --module commonjs --target es2020 --esModuleInterop --skipLibCheck 2>/dev/null
cd ../../../

# Function to calculate relative path
get_relative_path() {
    local file_dir=$(dirname "$1")
    local target="layer/themes/infra_external-log-lib/dist"
    
    # Count how many directories up we need to go
    local depth=$(echo "$file_dir" | tr '/' '\n' | wc -l)
    local up_dirs=""
    
    # Build the relative path
    if [[ "$file_dir" == "." ]]; then
        echo "./$target"
    elif [[ "$file_dir" == *"layer/themes"* ]]; then
        # For files in layer/themes, calculate relative path
        local rel_path=$(realpath --relative-to="$file_dir" "$target" 2>/dev/null || echo "../../../infra_external-log-lib/dist")
        echo "$rel_path"
    else
        # For other files, use a standard path
        local slashes=$(echo "$file_dir" | sed 's/[^/]//g' | wc -c)
        for ((i=1; i<$slashes; i++)); do
            up_dirs="../$up_dirs"
        done
        echo "${up_dirs}layer/themes/infra_external-log-lib/dist"
    fi
}

# Arrays to track changes
declare -a fixed_files=()
declare -i fs_count=0
declare -i path_count=0
declare -i cp_count=0

echo ""
echo "Processing files..."

# Fix fs imports
for file in $(grep -l "import.*from ['\"]fs['\"]" --include="*.ts" --include="*.js" --exclude-dir=node_modules --exclude-dir=.jj --exclude-dir=dist --exclude-dir=build -r . 2>/dev/null); do
    if [[ "$file" == *"infra_external-log-lib"* ]]; then
        continue  # Skip the external-log-lib itself
    fi
    
    rel_path=$(get_relative_path "$file")
    
    # Replace various fs import patterns
    sed -i "s/import \* as fs from 'fs';/import { fs } from '$rel_path';/g" "$file"
    sed -i "s/import fs from 'fs';/import { fs } from '$rel_path';/g" "$file"
    sed -i "s/import { promises as fs } from 'fs';/import { fsPromises as fs } from '$rel_path';/g" "$file"
    sed -i "s/import { readFile, writeFile } from 'fs\/promises';/import { fsPromises } from '$rel_path';\nconst { readFile, writeFile } = fsPromises;/g" "$file"
    
    fixed_files+=("$file")
    ((fs_count++))
done

# Fix path imports
for file in $(grep -l "import.*from ['\"]path['\"]" --include="*.ts" --include="*.js" --exclude-dir=node_modules --exclude-dir=.jj --exclude-dir=dist --exclude-dir=build -r . 2>/dev/null); do
    if [[ "$file" == *"infra_external-log-lib"* ]]; then
        continue
    fi
    
    rel_path=$(get_relative_path "$file")
    
    sed -i "s/import \* as path from 'path';/import { path } from '$rel_path';/g" "$file"
    sed -i "s/import path from 'path';/import { path } from '$rel_path';/g" "$file"
    sed -i "s/import { join, resolve } from 'path';/import { path } from '$rel_path';\nconst { join, resolve } = path;/g" "$file"
    
    ((path_count++))
done

# Fix child_process imports  
for file in $(grep -l "import.*from ['\"]child_process['\"]" --include="*.ts" --include="*.js" --exclude-dir=node_modules --exclude-dir=.jj --exclude-dir=dist --exclude-dir=build -r . 2>/dev/null); do
    if [[ "$file" == *"infra_external-log-lib"* ]]; then
        continue
    fi
    
    rel_path=$(get_relative_path "$file")
    
    sed -i "s/import \* as child_process from 'child_process';/import { childProcess } from '$rel_path';/g" "$file"
    sed -i "s/import { exec, execSync } from 'child_process';/import { childProcess } from '$rel_path';\nconst { exec, execSync } = childProcess;/g" "$file"
    sed -i "s/import { spawn } from 'child_process';/import { childProcess } from '$rel_path';\nconst { spawn } = childProcess;/g" "$file"
    
    ((cp_count++))
done

echo ""
echo "Migration Results"
echo "================="
echo "✅ Fixed $fs_count files with fs imports"
echo "✅ Fixed $path_count files with path imports"  
echo "✅ Fixed $cp_count files with child_process imports"
echo ""
echo "Total files updated: $((fs_count + path_count + cp_count))"

# Check for any remaining direct imports
echo ""
echo "Checking for remaining direct imports..."
remaining_fs=$(grep -r "from ['\"]fs['\"]" --include="*.ts" --include="*.js" --exclude-dir=node_modules --exclude-dir=.jj --exclude-dir=dist --exclude-dir=build --exclude="*infra_external-log-lib*" 2>/dev/null | wc -l)
remaining_path=$(grep -r "from ['\"]path['\"]" --include="*.ts" --include="*.js" --exclude-dir=node_modules --exclude-dir=.jj --exclude-dir=dist --exclude-dir=build --exclude="*infra_external-log-lib*" 2>/dev/null | wc -l)
remaining_cp=$(grep -r "from ['\"]child_process['\"]" --include="*.ts" --include="*.js" --exclude-dir=node_modules --exclude-dir=.jj --exclude-dir=dist --exclude-dir=build --exclude="*infra_external-log-lib*" 2>/dev/null | wc -l)

if [[ $remaining_fs -eq 0 && $remaining_path -eq 0 && $remaining_cp -eq 0 ]]; then
    echo "✅ All direct imports have been fixed!"
else
    echo "⚠️  Some direct imports remain:"
    [[ $remaining_fs -gt 0 ]] && echo "  - fs: $remaining_fs"
    [[ $remaining_path -gt 0 ]] && echo "  - path: $remaining_path"
    [[ $remaining_cp -gt 0 ]] && echo "  - child_process: $remaining_cp"
fi