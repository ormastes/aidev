#!/usr/bin/env python3
"""
Migrated from: demo-db-diff.sh
Auto-generated Python - 2025-08-16T04:57:27.599Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Database Diff Demo Script
    # Shows how to use the database diff feature
    print("===================================")
    print("🔍 Database Diff Feature Demo")
    print("===================================")
    print("")
    print("This demonstrates the database diff tracking feature")
    print("that captures before/after states of database changes")
    print("without persisting any modifications.")
    print("")
    print("Key Features:")
    print("✅ Transaction-based diffs with automatic rollback")
    print("✅ Zero data persistence - changes are not saved")
    print("✅ Row-level change detection")
    print("✅ Works with PostgreSQL, MySQL, MongoDB, Redis, SQLite")
    print("✅ Easy parseable JSONL output format")
    print("")
    print("===================================")
    print("Usage:")
    print("===================================")
    print("")
    print("1. Enable database diff tracking:")
    print("   export INTERCEPT_DB_DIFF=true")
    print("")
    print("2. Run your application with the preload script:")
    print("   node --require ./dist/logging/preload-interceptors.js app.js")
    print("")
    print("3. View diff logs in real-time:")
    print("   export INTERCEPT_CONSOLE=true")
    print("")
    print("4. Check log files:")
    print("   logs/intercepted/database-diff-*.jsonl")
    print("")
    print("===================================")
    print("Example Output:")
    print("===================================")
    print("")
    subprocess.run("cat << 'EOF'", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""timestamp": "2024-01-20T10:30:00Z",", shell=True)
    subprocess.run(""type": "db-diff",", shell=True)
    subprocess.run(""database": "myapp",", shell=True)
    subprocess.run(""table": "users",", shell=True)
    subprocess.run(""operation": "UPDATE",", shell=True)
    subprocess.run(""summary": {", shell=True)
    subprocess.run(""rowsAdded": 0,", shell=True)
    subprocess.run(""rowsRemoved": 0,", shell=True)
    subprocess.run(""rowsModified": 1,", shell=True)
    subprocess.run(""columnsChanged": ["last_login"],", shell=True)
    subprocess.run(""totalChanges": 1", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run(""changes": [", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""type": "modified",", shell=True)
    subprocess.run(""path": "row[id:123].last_login",", shell=True)
    subprocess.run(""oldValue": null,", shell=True)
    subprocess.run(""newValue": "2024-01-20T10:30:00Z"", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("]", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF", shell=True)
    print("")
    print("===================================")
    print("Try it now:")
    print("===================================")
    print("")
    print("npm run demo:db-diff")
    print("")

if __name__ == "__main__":
    main()