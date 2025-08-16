#!/usr/bin/env python3
"""
Migrated from: simple-demo.sh
Auto-generated Python script
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path
import json
import re
import requests


#!/bin/bash
# Simple demo script to test GUI selector server features

BASE_URL = '"http://localhost:3256"'

echo " = '== GUI Selector Server Feature Test ==="'
print('')

# 1. Health check
print('1. Health Check:')
# TODO: Complex curl command: curl -s $BASE_URL/api/health | jq .
print('')

# 2. List templates
print('2. Available Templates:')
# TODO: Complex curl command: curl -s $BASE_URL/api/templates | jq '.[].name'
print('')

# 3. Get template preview
print('3. Modern Dashboard Preview:')
# TODO: Complex curl command: curl -s $BASE_URL/api/templates/modern-01/preview | jq '{html: .html | length, css: .css | length, assets: .assets}'
print('')

# 4. Session login
print('4. Session-based Login:')
# TODO: Complex curl command: curl -s -X POST $BASE_URL/api/auth/login \
subprocess.run('-H "Content-Type: application/json" \\', shell=True)
subprocess.run('-d \'{"username":"admin","password":"admin123"}\' \\', shell=True)
subprocess.run('-c /tmp/cookies.txt | jq .', shell=True)
print('')

# 5. JWT login  
print('5. JWT-based Login:')
JWT_RESPONSE = '$(curl -s -X POST $BASE_URL/api/v2/auth/token \\'
subprocess.run('-H "Content-Type: application/json" \\', shell=True)
subprocess.run('-d \'{"username":"admin","password":"admin123"}\')', shell=True)
print('$JWT_RESPONSE | jq .')

ACCESS_TOKEN = subprocess.check_output('echo $JWT_RESPONSE | jq -r .accessToken', shell=True, text=True).strip()
print('')

# 6. Create app
print('6. Create App/Project:')
# TODO: Complex curl command: curl -s -X POST $BASE_URL/api/apps \
subprocess.run('-H "Content-Type: application/json" \\', shell=True)
subprocess.run('-H "Authorization: Bearer $ACCESS_TOKEN" \\', shell=True)
subprocess.run('-d \'{"name":"Demo Calculator","description":"A demo calculator app"}\' | jq .', shell=True)
print('')

# 7. List apps
print('7. List Apps:')
# TODO: Complex curl command: curl -s $BASE_URL/api/apps \
subprocess.run('-H "Authorization: Bearer $ACCESS_TOKEN" | jq .', shell=True)
print('')

# 8. Check external logs
print('8. External Logs:')
print('Logs should be in: ../../../95.child_project/external_log_lib/logs/gui-selector/')
subprocess.run('ls -la ../../../95.child_project/external_log_lib/logs/gui-selector/ 2>/dev/null || echo "Log directory not found"', shell=True)
print('')

echo " = '== Feature Summary ==="'
print('✓ Health monitoring')
print('✓ Template management with 4 categories')
print('✓ Session-based authentication')
print('✓ JWT-based authentication')
print('✓ App/project management')
print('✓ SQLite database persistence')
print('✓ External logging integration')
print('')
print('Access the web UI at: http://localhost:3256')