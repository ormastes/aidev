#!/usr/bin/env python3
"""
Migrated from: check-all-themes-simple.sh
Auto-generated Python - 2025-08-16T04:57:27.793Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Simple script to run fraud checks on all themes
    print("🔍 Running Fraud Checks on All Themes")
    print("====================================")
    print("")
    # Create output directory
    Path("gen/doc/fraud-reports").mkdir(parents=True, exist_ok=True)
    # Get all theme directories
    subprocess.run("themes_dir="layer/themes"", shell=True)
    subprocess.run("themes=$(ls -d $themes_dir/*/ | grep -v "temp/" | sort)", shell=True)
    # Summary counters
    subprocess.run("total_themes=0", shell=True)
    subprocess.run("passed_themes=0", shell=True)
    subprocess.run("failed_themes=0", shell=True)
    # Run fraud check on each theme
    for theme_path in [$themes; do]:
    subprocess.run("theme_name=$(basename "$theme_path")", shell=True)
    print("Checking $theme_name...")
    # Skip if no test files
    subprocess.run("if ! find "$theme_path" -name "*.test.ts" -o -name "*.spec.ts" | grep -q .; then", shell=True)
    print("  ⏭️  No test files found, skipping")
    subprocess.run("continue", shell=True)
    # Run the fraud checker using node directly
    subprocess.run("output_file="gen/doc/fraud-reports/${theme_name}-fraud-report.json"", shell=True)
    # Use node to run the compiled JavaScript
    subprocess.run("if node layer/themes/fraud-checker/dist/scripts/check-fraud.js "$theme_path" -o "$output_file" 2>/dev/null; then", shell=True)
    print("  ✅ PASSED")
    subprocess.run("((passed_themes++))", shell=True)
    else:
    print("  ❌ FAILED")
    subprocess.run("((failed_themes++))", shell=True)
    subprocess.run("((total_themes++))", shell=True)
    print("")
    print("📊 Summary")
    print("=========")
    print("Total themes checked: $total_themes")
    print("Passed: $passed_themes")
    print("Failed: $failed_themes")
    print("")
    print("Reports saved in: gen/doc/fraud-reports/")

if __name__ == "__main__":
    main()