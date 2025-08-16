#!/usr/bin/env python3
"""
Migrated from: migrate-pip-to-uv.sh
Auto-generated Python - 2025-08-16T04:57:27.586Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Script to migrate from pip to uv
    print("Starting migration from pip to uv...")
    # Replace pip commands in Python files (avoiding double replacement)
    subprocess.run("find . -name "*.py" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/\bpip install\b/uv pip install/g' {} \;", shell=True)
    subprocess.run("find . -name "*.py" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i "s/'\bpip install\b'/'uv pip install'/g" {} \;", shell=True)
    subprocess.run("find . -name "*.py" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"\bpip install\b"/"uv pip install"/g' {} \;", shell=True)
    subprocess.run("find . -name "*.py" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/`\bpip install\b/`uv pip install/g' {} \;", shell=True)
    # Replace pip commands in shell scripts
    subprocess.run("find . -name "*.sh" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/uv pip install/uv uv pip install/g' {} \;", shell=True)
    subprocess.run("find . -name "*.sh" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/uv pip install/uv uv pip install/g' {} \;", shell=True)
    subprocess.run("find . -name "*.sh" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/python -m uv pip install/uv uv pip install/g' {} \;", shell=True)
    subprocess.run("find . -name "*.sh" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/python3 -m uv pip install/uv uv pip install/g' {} \;", shell=True)
    # Replace pip commands in TypeScript and JavaScript files
    subprocess.run("find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/uv pip install/uv uv pip install/g' {} \;", shell=True)
    subprocess.run("find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i "s/'uv pip install'/'uv uv pip install'/g" {} \;", shell=True)
    subprocess.run("find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"uv pip install"/"uv uv pip install"/g' {} \;", shell=True)
    subprocess.run("find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/`uv pip install/`uv uv pip install/g' {} \;", shell=True)
    # Replace pip commands in markdown files
    subprocess.run("find . -name "*.md" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/uv pip install/uv uv pip install/g' {} \;", shell=True)
    subprocess.run("find . -name "*.md" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/uv pip install/uv uv pip install/g' {} \;", shell=True)
    subprocess.run("find . -name "*.md" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/python -m uv pip install/uv uv pip install/g' {} \;", shell=True)
    subprocess.run("find . -name "*.md" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/python3 -m uv pip install/uv uv pip install/g' {} \;", shell=True)
    # Replace requirements.txt references
    subprocess.run("find . \( -name "*.py" -o -name "*.sh" -o -name "*.md" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/uv pip install -r requirements.txt/uv uv pip install -r requirements.txt/g' {} \;", shell=True)
    subprocess.run("find . \( -name "*.py" -o -name "*.sh" -o -name "*.md" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i "s/'uv pip install -r requirements.txt'/'uv uv pip install -r requirements.txt'/g" {} \;", shell=True)
    subprocess.run("find . \( -name "*.py" -o -name "*.sh" -o -name "*.md" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/"uv pip install -r requirements.txt"/"uv uv pip install -r requirements.txt"/g' {} \;", shell=True)
    # Replace in pyproject.toml files
    subprocess.run("find . -name "pyproject.toml" -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/uv pip install/uv uv pip install/g' {} \;", shell=True)
    # Replace pip freeze commands
    subprocess.run("find . \( -name "*.py" -o -name "*.sh" -o -name "*.md" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/pip freeze/uv pip freeze/g' {} \;", shell=True)
    subprocess.run("find . \( -name "*.py" -o -name "*.sh" -o -name "*.md" \) -type f ! -path "./node_modules/*" ! -path "./.jj/*" -exec sed -i 's/pip list/uv pip list/g' {} \;", shell=True)
    print("Migration from pip to uv completed!")

if __name__ == "__main__":
    main()