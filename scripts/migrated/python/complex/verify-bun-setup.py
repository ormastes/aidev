#!/usr/bin/env python3
"""
Migrated from: verify-bun-setup.sh
Auto-generated Python - 2025-08-16T04:57:27.780Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Script to verify Bun setup and configuration
    print("🔍 Verifying Bun Setup in Setup Folder")
    print("=======================================")
    print("")
    # Check if Bun is installed
    subprocess.run("if command -v bun &> /dev/null; then", shell=True)
    print("✅ Bun is installed: $(bun --version)")
    else:
    print("❌ Bun is not installed")
    print("   To install: curl -fsSL https://bun.sh/install | bash")
    print("")
    print("📊 npm/bunx vs Bun usage in setup folder:")
    print("----------------------------------------")
    # Count npm references
    subprocess.run("npm_count=$(grep -r "\bnpm\b" setup 2>/dev/null | grep -v "Binary file" | grep -v ".git" | wc -l)", shell=True)
    subprocess.run("npx_count=$(grep -r "\bnpx\b" setup 2>/dev/null | grep -v "Binary file" | grep -v ".git" | wc -l)", shell=True)
    subprocess.run("bun_count=$(grep -r "\bbun\b" setup 2>/dev/null | grep -v "Binary file" | grep -v ".git" | grep -v "ubuntu" | wc -l)", shell=True)
    subprocess.run("bunx_count=$(grep -r "\bbunx\b" setup 2>/dev/null | grep -v "Binary file" | grep -v ".git" | wc -l)", shell=True)
    print("  npm references:  $npm_count")
    print("  bunx references:  $npx_count")
    print("  bun references:  $bun_count")
    print("  bunx references: $bunx_count")
    print("")
    print("📁 Files still containing npm/npx:")
    print("----------------------------------")
    subprocess.run("grep -r "\bnpm\b\|\bnpx\b" setup 2>/dev/null | grep -v "Binary file" | grep -v ".git" | cut -d: -f1 | sort | uniq | head -10", shell=True)
    print("")
    print("✨ Configuration Files:")
    print("----------------------")
    # Check for bunfig.toml
    if -f "bunfig.toml" :; then
    print("✅ bunfig.toml exists")
    else:
    print("❌ bunfig.toml not found")
    # Check for bun.lockb
    if -f "bun.lockb" :; then
    print("✅ bun.lockb exists (Bun lockfile)")
    else:
    print("⚠️  bun.lockb not found (will be created on first 'bun install')")
    print("")
    print("🎯 Recommendation:")
    print("-----------------")
    if $npm_count -gt 0 ] || [ $npx_count -gt 0 :; then
    print("There are still $((npm_count + npx_count)) references to npm/bunx in the setup folder.")
    print("Most are in comments or documentation, which is acceptable.")
    print("Critical script files have been migrated to use Bun.")
    else:
    print("All npm/bunx references have been replaced with Bun equivalents!")
    print("")
    print("📝 Next Steps:")
    print("-------------")
    print("1. Install Bun if not already installed:")
    print("   curl -fsSL https://bun.sh/install | bash")
    print("")
    print("2. Test the setup with Bun:")
    print("   cd setup/hello_world_tests/typescript-cli")
    print("   bun install")
    print("   bun test")
    print("")
    print("3. Remove the backup if everything works:")
    print("   rm -rf setup_backup_*")

if __name__ == "__main__":
    main()