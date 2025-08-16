#!/usr/bin/env python3
"""
Migrated from: migrate-npm-to-bun.sh
Auto-generated Python - 2025-08-16T04:57:27.581Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Script to migrate from npm to bun
    print("Starting migration from npm to bun...")
    # Add bun to PATH
    os.environ["PATH"] = ""$HOME/.bun/bin:$PATH""
    # Replace npm commands in package.json files
    subprocess.run("find . -name "package.json" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm install"/"bun install"/g' {} \;", shell=True)
    subprocess.run("find . -name "package.json" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm i"/"bun i"/g' {} \;", shell=True)
    subprocess.run("find . -name "package.json" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm run"/"bun run"/g' {} \;", shell=True)
    subprocess.run("find . -name "package.json" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm test"/"bun test"/g' {} \;", shell=True)
    subprocess.run("find . -name "package.json" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm build"/"bun build"/g' {} \;", shell=True)
    subprocess.run("find . -name "package.json" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm start"/"bun start"/g' {} \;", shell=True)
    subprocess.run("find . -name "package.json" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm ci"/"bun install --frozen-lockfile"/g' {} \;", shell=True)
    # Replace npm commands in TypeScript and JavaScript files
    subprocess.run("find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i "s/'npm install'/'bun install'/g" {} \;", shell=True)
    subprocess.run("find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm install"/"bun install"/g' {} \;", shell=True)
    subprocess.run("find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i "s/'npm i'/'bun i'/g" {} \;", shell=True)
    subprocess.run("find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm i"/"bun i"/g' {} \;", shell=True)
    subprocess.run("find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i "s/'npm run'/'bun run'/g" {} \;", shell=True)
    subprocess.run("find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm run"/"bun run"/g' {} \;", shell=True)
    subprocess.run("find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i "s/'npm test'/'bun test'/g" {} \;", shell=True)
    subprocess.run("find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm test"/"bun test"/g' {} \;", shell=True)
    subprocess.run("find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i "s/'npm build'/'bun build'/g" {} \;", shell=True)
    subprocess.run("find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm build"/"bun build"/g' {} \;", shell=True)
    subprocess.run("find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i "s/'npm start'/'bun start'/g" {} \;", shell=True)
    subprocess.run("find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm start"/"bun start"/g' {} \;", shell=True)
    subprocess.run("find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i "s/'npm ci'/'bun install --frozen-lockfile'/g" {} \;", shell=True)
    subprocess.run("find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm ci"/"bun install --frozen-lockfile"/g' {} \;", shell=True)
    # Replace npm commands in shell scripts
    subprocess.run("find . -name "*.sh" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm install/bun install/g' {} \;", shell=True)
    subprocess.run("find . -name "*.sh" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm i/bun i/g' {} \;", shell=True)
    subprocess.run("find . -name "*.sh" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm run/bun run/g' {} \;", shell=True)
    subprocess.run("find . -name "*.sh" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm test/bun test/g' {} \;", shell=True)
    subprocess.run("find . -name "*.sh" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm build/bun build/g' {} \;", shell=True)
    subprocess.run("find . -name "*.sh" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm start/bun start/g' {} \;", shell=True)
    subprocess.run("find . -name "*.sh" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm ci/bun install --frozen-lockfile/g' {} \;", shell=True)
    # Replace npm commands in markdown files
    subprocess.run("find . -name "*.md" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm install/bun install/g' {} \;", shell=True)
    subprocess.run("find . -name "*.md" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm i/bun i/g' {} \;", shell=True)
    subprocess.run("find . -name "*.md" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm run/bun run/g' {} \;", shell=True)
    subprocess.run("find . -name "*.md" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm test/bun test/g' {} \;", shell=True)
    subprocess.run("find . -name "*.md" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm build/bun build/g' {} \;", shell=True)
    subprocess.run("find . -name "*.md" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm start/bun start/g' {} \;", shell=True)
    subprocess.run("find . -name "*.md" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm ci/bun install --frozen-lockfile/g' {} \;", shell=True)
    # Replace backtick npm commands
    subprocess.run("find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/`npm install/`bun install/g' {} \;", shell=True)
    subprocess.run("find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/`npm i/`bun i/g' {} \;", shell=True)
    subprocess.run("find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/`npm run/`bun run/g' {} \;", shell=True)
    subprocess.run("find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/`npm test/`bun test/g' {} \;", shell=True)
    subprocess.run("find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/`npm build/`bun build/g' {} \;", shell=True)
    subprocess.run("find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/`npm start/`bun start/g' {} \;", shell=True)
    subprocess.run("find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/`npm ci/`bun install --frozen-lockfile/g' {} \;", shell=True)
    print("Migration from npm to bun completed!")

if __name__ == "__main__":
    main()