#!/bin/bash

# Script to migrate from pip to uv
echo "Starting migration from pip to uv..."

# Replace pip commands in Python files (avoiding double replacement)
find . -name "*.py" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/\bpip install\b/uv pip install/g' {} \;
find . -name "*.py" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i "s/'\bpip install\b'/'uv pip install'/g" {} \;
find . -name "*.py" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"\bpip install\b"/"uv pip install"/g' {} \;
find . -name "*.py" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/`\bpip install\b/`uv pip install/g' {} \;

# Replace pip commands in shell scripts
find . -name "*.sh" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/uv pip install/uv uv pip install/g' {} \;
find . -name "*.sh" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/uv pip install/uv uv pip install/g' {} \;
find . -name "*.sh" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/python -m uv pip install/uv uv pip install/g' {} \;
find . -name "*.sh" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/python3 -m uv pip install/uv uv pip install/g' {} \;

# Replace pip commands in TypeScript and JavaScript files
find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/uv pip install/uv uv pip install/g' {} \;
find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i "s/'uv pip install'/'uv uv pip install'/g" {} \;
find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"uv pip install"/"uv uv pip install"/g' {} \;
find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/`uv pip install/`uv uv pip install/g' {} \;

# Replace pip commands in markdown files
find . -name "*.md" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/uv pip install/uv uv pip install/g' {} \;
find . -name "*.md" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/uv pip install/uv uv pip install/g' {} \;
find . -name "*.md" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/python -m uv pip install/uv uv pip install/g' {} \;
find . -name "*.md" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/python3 -m uv pip install/uv uv pip install/g' {} \;

# Replace requirements.txt references
find . \( -name "*.py" -o -name "*.sh" -o -name "*.md" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/uv pip install -r requirements.txt/uv uv pip install -r requirements.txt/g' {} \;
find . \( -name "*.py" -o -name "*.sh" -o -name "*.md" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i "s/'uv pip install -r requirements.txt'/'uv uv pip install -r requirements.txt'/g" {} \;
find . \( -name "*.py" -o -name "*.sh" -o -name "*.md" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"uv pip install -r requirements.txt"/"uv uv pip install -r requirements.txt"/g' {} \;

# Replace in pyproject.toml files
find . -name "pyproject.toml" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/uv pip install/uv uv pip install/g' {} \;

# Replace pip freeze commands
find . \( -name "*.py" -o -name "*.sh" -o -name "*.md" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/pip freeze/uv pip freeze/g' {} \;
find . \( -name "*.py" -o -name "*.sh" -o -name "*.md" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/pip list/uv pip list/g' {} \;

echo "Migration from pip to uv completed!"