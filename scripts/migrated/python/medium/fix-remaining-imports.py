#!/usr/bin/env python3
"""
Migrated from: fix-remaining-imports.sh
Auto-generated Python - 2025-08-16T04:57:27.620Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    print("Fixing remaining direct imports...")
    # Fix imports from 'fs'
    subprocess.run("find layer/themes -name "*.ts" -o -name "*.js" | while read file; do", shell=True)
    if [ "$file" == *"infra_external-log-lib"* ]:; then
    subprocess.run("continue", shell=True)
    # Fix: import { createWriteStream } from 'fs'
    subprocess.run("sed -i "s/import { createWriteStream, WriteStream } from 'fs'/import { fs } from '..\/..\/..\/infra_external-log-lib\/src';\nconst { createWriteStream } = fs;\ntype WriteStream = ReturnType<typeof createWriteStream>/g" "$file"", shell=True)
    # Fix: import { promises as fs } from 'fs'
    subprocess.run("sed -i "s/import { promises as fs } from 'fs'/import { fsPromises as fs } from '..\/..\/..\/..\/infra_external-log-lib\/src'/g" "$file"", shell=True)
    # Fix fraud-checker itself to use external-log-lib
    if [ "$file" == *"infra_fraud-checker"* ]:; then
    subprocess.run("sed -i "s/import \* as fs from 'fs'/import { fs } from '..\/..\/..\/infra_external-log-lib\/src'/g" "$file"", shell=True)
    subprocess.run("sed -i "s/import \* as path from 'path'/import { path } from '..\/..\/..\/infra_external-log-lib\/src'/g" "$file"", shell=True)
    # Fix specific files with proper relative paths
    print("Fixing specific files...")
    # Fix tool_web-scraper
    subprocess.run("sed -i "s/import { createWriteStream, WriteStream } from 'fs'/import { fs } from '..\/..\/..\/infra_external-log-lib\/src';\nconst { createWriteStream } = fs;\ntype WriteStream = any/g" \", shell=True)
    subprocess.run("layer/themes/tool_web-scraper/children/exporter/index.ts", shell=True)
    # Fix llm-agent_chat-space test files
    for file in [layer/themes/llm-agent_chat-space/user-stories/007-chat-room-cli/tests/**/*.ts; do]:
    subprocess.run("sed -i "s/import { promises as fs } from 'fs'/import { fsPromises as fs } from '..\/..\/..\/..\/..\/..\/infra_external-log-lib\/src'/g" "$file"", shell=True)
    # Fix helpers
    subprocess.run("sed -i "s/import { promises as fs } from 'fs'/import { fsPromises as fs } from '..\/..\/..\/..\/..\/..\/infra_external-log-lib\/src'/g" \", shell=True)
    subprocess.run("layer/themes/llm-agent_chat-space/user-stories/007-chat-room-cli/tests/helpers/test-file-system.ts", shell=True)
    print("Done fixing remaining imports!")

if __name__ == "__main__":
    main()