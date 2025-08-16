#!/bin/bash

# Script to migrate from npm to bun
echo "Starting migration from npm to bun..."

# Add bun to PATH
export PATH="$HOME/.bun/bin:$PATH"

# Replace npm commands in package.json files
find . -name "package.json" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm install"/"bun install"/g' {} \;
find . -name "package.json" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm i"/"bun i"/g' {} \;
find . -name "package.json" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm run"/"bun run"/g' {} \;
find . -name "package.json" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm test"/"bun test"/g' {} \;
find . -name "package.json" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm build"/"bun build"/g' {} \;
find . -name "package.json" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm start"/"bun start"/g' {} \;
find . -name "package.json" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm ci"/"bun install --frozen-lockfile"/g' {} \;

# Replace npm commands in TypeScript and JavaScript files
find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i "s/'npm install'/'bun install'/g" {} \;
find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm install"/"bun install"/g' {} \;
find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i "s/'npm i'/'bun i'/g" {} \;
find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm i"/"bun i"/g' {} \;
find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i "s/'npm run'/'bun run'/g" {} \;
find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm run"/"bun run"/g' {} \;
find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i "s/'npm test'/'bun test'/g" {} \;
find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm test"/"bun test"/g' {} \;
find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i "s/'npm build'/'bun build'/g" {} \;
find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm build"/"bun build"/g' {} \;
find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i "s/'npm start'/'bun start'/g" {} \;
find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm start"/"bun start"/g' {} \;
find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i "s/'npm ci'/'bun install --frozen-lockfile'/g" {} \;
find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"npm ci"/"bun install --frozen-lockfile"/g' {} \;

# Replace npm commands in shell scripts
find . -name "*.sh" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm install/bun install/g' {} \;
find . -name "*.sh" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm i/bun i/g' {} \;
find . -name "*.sh" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm run/bun run/g' {} \;
find . -name "*.sh" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm test/bun test/g' {} \;
find . -name "*.sh" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm build/bun build/g' {} \;
find . -name "*.sh" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm start/bun start/g' {} \;
find . -name "*.sh" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm ci/bun install --frozen-lockfile/g' {} \;

# Replace npm commands in markdown files  
find . -name "*.md" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm install/bun install/g' {} \;
find . -name "*.md" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm i/bun i/g' {} \;
find . -name "*.md" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm run/bun run/g' {} \;
find . -name "*.md" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm test/bun test/g' {} \;
find . -name "*.md" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm build/bun build/g' {} \;
find . -name "*.md" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm start/bun start/g' {} \;
find . -name "*.md" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/npm ci/bun install --frozen-lockfile/g' {} \;

# Replace backtick npm commands
find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/`npm install/`bun install/g' {} \;
find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/`npm i/`bun i/g' {} \;
find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/`npm run/`bun run/g' {} \;
find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/`npm test/`bun test/g' {} \;
find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/`npm build/`bun build/g' {} \;
find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/`npm start/`bun start/g' {} \;
find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/`npm ci/`bun install --frozen-lockfile/g' {} \;

echo "Migration from npm to bun completed!"