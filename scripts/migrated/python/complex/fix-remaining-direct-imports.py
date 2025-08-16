#!/usr/bin/env python3
"""
Migrated from: fix-remaining-direct-imports.sh
Auto-generated Python - 2025-08-16T04:57:27.768Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    print("Fixing remaining direct Node.js imports...")
    print("==========================================")
    # First compile the external-log-lib if not already done
    print("Ensuring external-log-lib is compiled...")
    os.chdir("layer/themes/infra_external-log-lib")
    Path("dist").mkdir(parents=True, exist_ok=True)
    subprocess.run("bunx tsc src/config.ts src/facades/*.ts src/index.ts --outDir ./dist --module commonjs --target es2020 --esModuleInterop --skipLibCheck 2>/dev/null", shell=True)
    os.chdir("../../../")
    # Function to calculate relative path
    subprocess.run("get_relative_path() {", shell=True)
    subprocess.run("local file_dir=$(dirname "$1")", shell=True)
    subprocess.run("local target="layer/themes/infra_external-log-lib/dist"", shell=True)
    # Count how many directories up we need to go
    subprocess.run("local depth=$(echo "$file_dir" | tr '/' '\n' | wc -l)", shell=True)
    subprocess.run("local up_dirs=""", shell=True)
    # Build the relative path
    if [ "$file_dir" == "." ]:; then
    print("./$target")
    elif [ "$file_dir" == *"layer/themes"* ]:; then
    # For files in layer/themes, calculate relative path
    subprocess.run("local rel_path=$(realpath --relative-to="$file_dir" "$target" 2>/dev/null || echo "../../../infra_external-log-lib/dist")", shell=True)
    print("$rel_path")
    else:
    # For other files, use a standard path
    subprocess.run("local slashes=$(echo "$file_dir" | sed 's/[^/]//g' | wc -c)", shell=True)
    subprocess.run("for ((i=1; i<$slashes; i++)); do", shell=True)
    subprocess.run("up_dirs="../$up_dirs"", shell=True)
    print("${up_dirs}layer/themes/infra_external-log-lib/dist")
    subprocess.run("}", shell=True)
    # Arrays to track changes
    subprocess.run("declare -a fixed_files=()", shell=True)
    subprocess.run("declare -i fs_count=0", shell=True)
    subprocess.run("declare -i path_count=0", shell=True)
    subprocess.run("declare -i cp_count=0", shell=True)
    print("")
    print("Processing files...")
    # Fix fs imports
    for file in [$(grep -l "import.*from ['\"]fs['\"]" --include="*.ts" --include="*.js" --exclude-dir=node_modules --exclude-dir=.jj --exclude-dir=dist --exclude-dir=build -r . 2>/dev/null); do]:
    if [ "$file" == *"infra_external-log-lib"* ]:; then
    subprocess.run("continue  # Skip the external-log-lib itself", shell=True)
    subprocess.run("rel_path=$(get_relative_path "$file")", shell=True)
    # Replace various fs import patterns
    subprocess.run("sed -i "s/import \* as fs from 'fs';/import { fs } from '$rel_path';/g" "$file"", shell=True)
    subprocess.run("sed -i "s/import fs from 'fs';/import { fs } from '$rel_path';/g" "$file"", shell=True)
    subprocess.run("sed -i "s/import { promises as fs } from 'fs';/import { fsPromises as fs } from '$rel_path';/g" "$file"", shell=True)
    subprocess.run("sed -i "s/import { readFile, writeFile } from 'fs\/promises';/import { fsPromises } from '$rel_path';\nconst { readFile, writeFile } = fsPromises;/g" "$file"", shell=True)
    subprocess.run("fixed_files+=("$file")", shell=True)
    subprocess.run("((fs_count++))", shell=True)
    # Fix path imports
    for file in [$(grep -l "import.*from ['\"]path['\"]" --include="*.ts" --include="*.js" --exclude-dir=node_modules --exclude-dir=.jj --exclude-dir=dist --exclude-dir=build -r . 2>/dev/null); do]:
    if [ "$file" == *"infra_external-log-lib"* ]:; then
    subprocess.run("continue", shell=True)
    subprocess.run("rel_path=$(get_relative_path "$file")", shell=True)
    subprocess.run("sed -i "s/import \* as path from 'path';/import { path } from '$rel_path';/g" "$file"", shell=True)
    subprocess.run("sed -i "s/import path from 'path';/import { path } from '$rel_path';/g" "$file"", shell=True)
    subprocess.run("sed -i "s/import { join, resolve } from 'path';/import { path } from '$rel_path';\nconst { join, resolve } = path;/g" "$file"", shell=True)
    subprocess.run("((path_count++))", shell=True)
    # Fix child_process imports
    for file in [$(grep -l "import.*from ['\"]child_process['\"]" --include="*.ts" --include="*.js" --exclude-dir=node_modules --exclude-dir=.jj --exclude-dir=dist --exclude-dir=build -r . 2>/dev/null); do]:
    if [ "$file" == *"infra_external-log-lib"* ]:; then
    subprocess.run("continue", shell=True)
    subprocess.run("rel_path=$(get_relative_path "$file")", shell=True)
    subprocess.run("sed -i "s/import \* as child_process from 'child_process';/import { childProcess } from '$rel_path';/g" "$file"", shell=True)
    subprocess.run("sed -i "s/import { exec, execSync } from 'child_process';/import { childProcess } from '$rel_path';\nconst { exec, execSync } = childProcess;/g" "$file"", shell=True)
    subprocess.run("sed -i "s/import { spawn } from 'child_process';/import { childProcess } from '$rel_path';\nconst { spawn } = childProcess;/g" "$file"", shell=True)
    subprocess.run("((cp_count++))", shell=True)
    print("")
    print("Migration Results")
    print("=================")
    print("✅ Fixed $fs_count files with fs imports")
    print("✅ Fixed $path_count files with path imports")
    print("✅ Fixed $cp_count files with child_process imports")
    print("")
    print("Total files updated: $((fs_count + path_count + cp_count))")
    # Check for any remaining direct imports
    print("")
    print("Checking for remaining direct imports...")
    subprocess.run("remaining_fs=$(grep -r "from ['\"]fs['\"]" --include="*.ts" --include="*.js" --exclude-dir=node_modules --exclude-dir=.jj --exclude-dir=dist --exclude-dir=build --exclude="*infra_external-log-lib*" 2>/dev/null | wc -l)", shell=True)
    subprocess.run("remaining_path=$(grep -r "from ['\"]path['\"]" --include="*.ts" --include="*.js" --exclude-dir=node_modules --exclude-dir=.jj --exclude-dir=dist --exclude-dir=build --exclude="*infra_external-log-lib*" 2>/dev/null | wc -l)", shell=True)
    subprocess.run("remaining_cp=$(grep -r "from ['\"]child_process['\"]" --include="*.ts" --include="*.js" --exclude-dir=node_modules --exclude-dir=.jj --exclude-dir=dist --exclude-dir=build --exclude="*infra_external-log-lib*" 2>/dev/null | wc -l)", shell=True)
    if [ $remaining_fs -eq 0 && $remaining_path -eq 0 && $remaining_cp -eq 0 ]:; then
    print("✅ All direct imports have been fixed!")
    else:
    print("⚠️  Some direct imports remain:")
    subprocess.run("[[ $remaining_fs -gt 0 ]] && echo "  - fs: $remaining_fs"", shell=True)
    subprocess.run("[[ $remaining_path -gt 0 ]] && echo "  - path: $remaining_path"", shell=True)
    subprocess.run("[[ $remaining_cp -gt 0 ]] && echo "  - child_process: $remaining_cp"", shell=True)

if __name__ == "__main__":
    main()