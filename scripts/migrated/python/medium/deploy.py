#!/usr/bin/env python3
"""
Migrated from: deploy.sh
Auto-generated Python - 2025-08-16T04:57:27.627Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # GUI Selector Server Deployment Script
    # This script properly integrates with portal_security theme
    # NO HARDCODED PORTS - all port allocation through EnhancedPortManager
    subprocess.run("DEPLOY_TYPE=${1:-release}", shell=True)
    print("🚀 Deploying GUI Selector Server")
    print("================================")
    print("📋 Deploy type: $DEPLOY_TYPE")
    print("🔒 Using portal_security for port allocation")
    print("")
    # Validate deploy type
    if [ ! "$DEPLOY_TYPE" =~ ^(local|dev|demo|release|production)$ ]:; then
    print("❌ Invalid deploy type: $DEPLOY_TYPE")
    print("Usage: $0 [local|dev|demo|release|production]")
    sys.exit(1)
    # Use the TypeScript deployment that integrates with portal_security
    subprocess.run("bunx tsx src/deploy-with-portal-security.ts "$DEPLOY_TYPE"", shell=True)
    subprocess.run("exit $?", shell=True)

if __name__ == "__main__":
    main()