#!/usr/bin/env python3
"""
Migrated from: run-theme-coverage.sh
Auto-generated Python - 2025-08-16T04:57:27.784Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Run theme coverage tests with direct root connection
    # No CLI or server dependencies required
    subprocess.run("set -e", shell=True)
    subprocess.run("SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"", shell=True)
    subprocess.run("PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"", shell=True)
    # Colors
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("BLUE='\033[0;34m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("NC='\033[0m'", shell=True)
    print("-e ")${BLUE}=== Theme Coverage Runner (Direct Connection) ===${NC}"
    print("Running coverage tests for themes with direct root connection...")
    print("")
    # Create coverage directory
    Path(""$PROJECT_ROOT/gen/coverage/themes"").mkdir(parents=True, exist_ok=True)
    # Function to run coverage for a theme
    subprocess.run("run_theme_coverage() {", shell=True)
    subprocess.run("local theme_path="$1"", shell=True)
    subprocess.run("local theme_name="$(basename "$theme_path")"", shell=True)
    print("-e ")${BLUE}Testing $theme_name...${NC}"
    if ! -f "$theme_path/jest.config.js" :; then
    print("-e ")${YELLOW}Skipping $theme_name - no jest config${NC}"
    subprocess.run("return", shell=True)
    os.chdir(""$theme_path"")
    # Install dependencies if needed
    if -f "package.json" ] && [ ! -d "node_modules" :; then
    print("Installing dependencies...")
    subprocess.run("bun install --silent", shell=True)
    # Run tests with coverage
    subprocess.run("if bun test --coverage --silent; then", shell=True)
    print("-e ")${GREEN}✓ $theme_name coverage complete${NC}"
    # Copy coverage to root
    if -f "coverage/coverage-final.json" :; then
    shutil.copy2(""coverage/coverage-final.json"", ""$PROJECT_ROOT/gen/coverage/themes/$theme_name-coverage.json"")
    else:
    print("-e ")${RED}✗ $theme_name coverage failed${NC}"
    print("")
    subprocess.run("}", shell=True)
    # Run coverage for priority themes
    subprocess.run("PRIORITY_THEMES=(", shell=True)
    subprocess.run(""pocketflow"", shell=True)
    subprocess.run(""story-reporter"", shell=True)
    subprocess.run(""gui-selector"", shell=True)
    subprocess.run(""chat-space"", shell=True)
    subprocess.run(")", shell=True)
    for theme in ["${PRIORITY_THEMES[@]}"; do]:
    subprocess.run("theme_path="$PROJECT_ROOT/layer/themes/$theme"", shell=True)
    if -d "$theme_path" :; then
    subprocess.run("run_theme_coverage "$theme_path"", shell=True)
    print("-e ")${GREEN}=== Coverage Complete ===${NC}"
    print("Coverage reports saved to: $PROJECT_ROOT/gen/coverage/themes/")
    print("")
    print("To view aggregated coverage:")
    print("  cd $PROJECT_ROOT/layer/themes/coverage-aggregator")
    print("  bun run generate-report")

if __name__ == "__main__":
    main()