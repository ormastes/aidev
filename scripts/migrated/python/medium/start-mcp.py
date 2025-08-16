#!/usr/bin/env python3
"""
Migrated from: start-mcp.sh
Auto-generated Python - 2025-08-16T04:57:27.622Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Quick start script for Filesystem MCP
    print("🚀 Starting Filesystem MCP Server")
    print("Choose version:")
    print("  1) Standard MCP")
    print("  2) Enhanced MCP (with validation)")
    print("")
    subprocess.run("read -p "Enter choice [1-2]: " choice", shell=True)
    subprocess.run("case $choice in", shell=True)
    subprocess.run("1)", shell=True)
    print("Starting standard MCP server...")
    subprocess.run("mcp-filesystem", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("2)", shell=True)
    print("Starting enhanced MCP server...")
    subprocess.run("mcp-filesystem-enhanced", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("*)", shell=True)
    print("Invalid choice. Starting standard MCP...")
    subprocess.run("mcp-filesystem", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("esac", shell=True)

if __name__ == "__main__":
    main()