#!/usr/bin/env python3
"""
Migrated from: simple-demo.sh
Auto-generated Python - 2025-08-16T04:57:27.580Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Simple demo script to test GUI selector server features
    subprocess.run("BASE_URL="http://localhost:3256"", shell=True)
    print("=== GUI Selector Server Feature Test ===")
    print("")
    # 1. Health check
    print("1. Health Check:")
    subprocess.run("curl -s $BASE_URL/api/health | jq .", shell=True)
    print("")
    # 2. List templates
    print("2. Available Templates:")
    subprocess.run("curl -s $BASE_URL/api/templates | jq '.[].name'", shell=True)
    print("")
    # 3. Get template preview
    print("3. Modern Dashboard Preview:")
    subprocess.run("curl -s $BASE_URL/api/templates/modern-01/preview | jq '{html: .html | length, css: .css | length, assets: .assets}'", shell=True)
    print("")
    # 4. Session login
    print("4. Session-based Login:")
    subprocess.run("curl -s -X POST $BASE_URL/api/auth/login \", shell=True)
    subprocess.run("-H "Content-Type: application/json" \", shell=True)
    subprocess.run("-d '{"username":"admin","password":"admin123"}' \", shell=True)
    subprocess.run("-c /tmp/cookies.txt | jq .", shell=True)
    print("")
    # 5. JWT login
    print("5. JWT-based Login:")
    subprocess.run("JWT_RESPONSE=$(curl -s -X POST $BASE_URL/api/v2/auth/token \", shell=True)
    subprocess.run("-H "Content-Type: application/json" \", shell=True)
    subprocess.run("-d '{"username":"admin","password":"admin123"}')", shell=True)
    print("$JWT_RESPONSE | jq .")
    subprocess.run("ACCESS_TOKEN=$(echo $JWT_RESPONSE | jq -r .accessToken)", shell=True)
    print("")
    # 6. Create app
    print("6. Create App/Project:")
    subprocess.run("curl -s -X POST $BASE_URL/api/apps \", shell=True)
    subprocess.run("-H "Content-Type: application/json" \", shell=True)
    subprocess.run("-H "Authorization: Bearer $ACCESS_TOKEN" \", shell=True)
    subprocess.run("-d '{"name":"Demo Calculator","description":"A demo calculator app"}' | jq .", shell=True)
    print("")
    # 7. List apps
    print("7. List Apps:")
    subprocess.run("curl -s $BASE_URL/api/apps \", shell=True)
    subprocess.run("-H "Authorization: Bearer $ACCESS_TOKEN" | jq .", shell=True)
    print("")
    # 8. Check external logs
    print("8. External Logs:")
    print("Logs should be in: ../../../95.child_project/external_log_lib/logs/gui-selector/")
    subprocess.run("ls -la ../../../95.child_project/external_log_lib/logs/gui-selector/ 2>/dev/null || echo "Log directory not found"", shell=True)
    print("")
    print("=== Feature Summary ===")
    print("✓ Health monitoring")
    print("✓ Template management with 4 categories")
    print("✓ Session-based authentication")
    print("✓ JWT-based authentication")
    print("✓ App/project management")
    print("✓ SQLite database persistence")
    print("✓ External logging integration")
    print("")
    print("Access the web UI at: http://localhost:3256")

if __name__ == "__main__":
    main()