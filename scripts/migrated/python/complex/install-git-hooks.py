#!/usr/bin/env python3
"""
Migrated from: install-git-hooks.sh
Auto-generated Python - 2025-08-16T04:57:27.795Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Install Git hooks for File Creation API enforcement
    subprocess.run("HOOKS_DIR=".git/hooks"", shell=True)
    subprocess.run("PRE_COMMIT_HOOK="$HOOKS_DIR/pre-commit"", shell=True)
    print("📦 Installing Git hooks for File Creation API enforcement...")
    # Check if .git directory exists
    if ! -d ".git" :; then
    print("❌ Not a git repository. Please run from project root.")
    sys.exit(1)
    # Create hooks directory if it doesn't exist
    if ! -d "$HOOKS_DIR" :; then
    Path(""$HOOKS_DIR"").mkdir(parents=True, exist_ok=True)
    # Check if pre-commit hook already exists
    if -f "$PRE_COMMIT_HOOK" :; then
    print("⚠️  Pre-commit hook already exists. Creating backup...")
    shutil.copy2(""$PRE_COMMIT_HOOK" "$PRE_COMMIT_HOOK.backup.$(date", "+%Y%m%d%H%M%S)"")
    # Create pre-commit hook
    subprocess.run("cat > "$PRE_COMMIT_HOOK" << 'EOF'", shell=True)
    # Pre-commit hook for File Creation API enforcement
    # Run the file API check
    if -f "scripts/pre-commit-file-api.sh" :; then
    subprocess.run("bash scripts/pre-commit-file-api.sh", shell=True)
    subprocess.run("RESULT=$?", shell=True)
    if $RESULT -ne 0 :; then
    subprocess.run("exit $RESULT", shell=True)
    # Run other checks if needed (e.g., linting, tests)
    # Add your other pre-commit checks here
    sys.exit(0)
    subprocess.run("EOF", shell=True)
    # Make hook executable
    subprocess.run("chmod +x "$PRE_COMMIT_HOOK"", shell=True)
    print("✅ Git hooks installed successfully!")
    print("")
    print("The pre-commit hook will now check for direct file system access in staged files.")
    print("To bypass the check (not recommended), use: git commit --no-verify")
    print("")
    print("To uninstall, run: rm $PRE_COMMIT_HOOK")

if __name__ == "__main__":
    main()