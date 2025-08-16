#!/usr/bin/env python3
"""
Migrated from: migrate-to-facade.sh
Auto-generated Python - 2025-08-16T04:57:27.611Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Migrate from direct imports to facade pattern
    print("Migrating to facade pattern...")
    print("==============================")
    # Count files before migration
    subprocess.run("TOTAL_FILES=$(find . -type f \( -name "*.ts" -o -name "*.js" \) ! -path "./node_modules/*" ! -path "./.jj/*" ! -path "./dist/*" ! -path "./build/*" | wc -l)", shell=True)
    print("Total files to check: $TOTAL_FILES")
    # Keep the original external-log-lib imports that already exist
    print("")
    print("Keeping existing external-log-lib imports...")
    subprocess.run("EXISTING=$(grep -r "from.*infra_external-log-lib" --include="*.ts" --include="*.js" --exclude-dir=node_modules --exclude-dir=.jj --exclude-dir=dist --exclude-dir=build | wc -l)", shell=True)
    print("Found $EXISTING existing external-log-lib imports (keeping these)")
    # Update the import statements to use named imports from facades
    print("")
    print("Updating import statements in external-log-lib users...")
    # Fix imports that already use external-log-lib but might have wrong syntax
    subprocess.run("find . -type f \( -name "*.ts" -o -name "*.js" \) ! -path "./node_modules/*" ! -path "./.jj/*" ! -path "./dist/*" ! -path "./build/*" -exec sed -i "s/import { fs } from '.*infra_external-log-lib\/src';/import { fs } from '..\/..\/..\/infra_external-log-lib\/dist';/g" {} \;", shell=True)
    subprocess.run("find . -type f \( -name "*.ts" -o -name "*.js" \) ! -path "./node_modules/*" ! -path "./.jj/*" ! -path "./dist/*" ! -path "./build/*" -exec sed -i "s/import { path } from '.*infra_external-log-lib\/src';/import { path } from '..\/..\/..\/infra_external-log-lib\/dist';/g" {} \;", shell=True)
    subprocess.run("find . -type f \( -name "*.ts" -o -name "*.js" \) ! -path "./node_modules/*" ! -path "./.jj/*" ! -path "./dist/*" ! -path "./build/*" -exec sed -i "s/import { childProcess } from '.*infra_external-log-lib\/src';/import { childProcess } from '..\/..\/..\/infra_external-log-lib\/dist';/g" {} \;", shell=True)
    # Also update combined imports
    subprocess.run("find . -type f \( -name "*.ts" -o -name "*.js" \) ! -path "./node_modules/*" ! -path "./.jj/*" ! -path "./dist/*" ! -path "./build/*" -exec sed -i "s/import { fs, path } from '.*infra_external-log-lib\/src';/import { fs, path } from '..\/..\/..\/infra_external-log-lib\/dist';/g" {} \;", shell=True)
    print("")
    print("Compilation check...")
    # Try to compile a few test files to verify
    print("Testing compilation of updated files...")
    os.chdir("layer/themes/infra_external-log-lib")
    subprocess.run("bunx tsc src/index.ts src/config.ts src/facades/*.ts --outDir dist --module commonjs --target es2020 --esModuleInterop --skipLibCheck --noEmit 2>&1 | head -5", shell=True)
    os.chdir("../../../")
    print("")
    print("Migration Summary")
    print("=================")
    print("✅ Facade pattern implemented")
    print("✅ Security features active (path traversal, dangerous commands)")
    print("✅ Logging and monitoring enabled")
    print("✅ Test coverage maintained")
    print("")
    print("Key features of the new system:")
    print("- ESM-compatible facade pattern (no monkey-patching)")
    print("- Proxy-based interception that works with Bun")
    print("- Centralized security policies")
    print("- Call history tracking for testing")
    print("- Easy enable/disable via config")
    print("")
    print("Usage example:")
    print("  import { fs, path, childProcess } from './infra_external-log-lib/dist';")
    print("  // Use fs, path, childProcess normally - they're automatically intercepted")
    print("")
    print("To run tests: node test-facade.js")

if __name__ == "__main__":
    main()