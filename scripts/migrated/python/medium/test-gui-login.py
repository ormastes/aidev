#!/usr/bin/env python3
"""
Migrated from: test-gui-login.sh
Auto-generated Python - 2025-08-16T04:57:27.597Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    print("=== GUI Selector Login Test ===")
    print("")
    # Test 1: Check login page is shown
    print("Test 1: Checking if login page is shown when not authenticated...")
    subprocess.run("TITLE=$(curl -s http://localhost:3456/ | grep -o '<title>[^<]*</title>' | sed 's/<[^>]*>//g')", shell=True)
    if [ "$TITLE" == "Login - GUI Template Selector" ]:; then
    print("✓ PASS: Login page is shown")
    else:
    print("✗ FAIL: Expected login page, got: $TITLE")
    print("")
    # Test 2: Check API requires authentication
    print("Test 2: Checking if API requires authentication...")
    subprocess.run("API_RESPONSE=$(curl -s http://localhost:3456/api/templates)", shell=True)
    if [ "$API_RESPONSE" == *"Authentication required"* ]:; then
    print("✓ PASS: API is protected")
    else:
    print("✗ FAIL: API is not protected. Response: $API_RESPONSE")
    print("")
    # Test 3: Test login with valid credentials
    print("Test 3: Testing login with valid credentials...")
    subprocess.run("LOGIN_RESPONSE=$(curl -s -X POST \", shell=True)
    subprocess.run("-H "Content-Type: application/json" \", shell=True)
    subprocess.run("-d '{"username":"admin","password":"admin123"}' \", shell=True)
    subprocess.run("-c /tmp/gui-cookies.txt \", shell=True)
    subprocess.run("http://localhost:3456/api/auth/login)", shell=True)
    if [ "$LOGIN_RESPONSE" == *"Login successful"* ]:; then
    print("✓ PASS: Login successful")
    print("Response: $LOGIN_RESPONSE")
    else:
    print("✗ FAIL: Login failed. Response: $LOGIN_RESPONSE")
    print("")
    # Test 4: Check session after login
    print("Test 4: Checking session after login...")
    subprocess.run("SESSION_RESPONSE=$(curl -s -b /tmp/gui-cookies.txt http://localhost:3456/api/auth/session)", shell=True)
    if [ "$SESSION_RESPONSE" == *"authenticated\":true"* ]:; then
    print("✓ PASS: Session is authenticated")
    print("Response: $SESSION_RESPONSE")
    else:
    print("✗ FAIL: Session not authenticated. Response: $SESSION_RESPONSE")
    print("")
    # Test 5: Access protected API with session
    print("Test 5: Accessing protected API with session...")
    subprocess.run("TEMPLATES_COUNT=$(curl -s -b /tmp/gui-cookies.txt http://localhost:3456/api/templates | jq '. | length' 2>/dev/null || echo "error")", shell=True)
    if [ "$TEMPLATES_COUNT" != "error" ]] && [[ "$TEMPLATES_COUNT" -ge 0 ]:; then
    print("✓ PASS: Can access protected API. Found $TEMPLATES_COUNT templates")
    else:
    print("✗ FAIL: Cannot access protected API")
    print("")
    # Test 6: Access main page with session
    print("Test 6: Accessing main page with session...")
    subprocess.run("MAIN_TITLE=$(curl -s -b /tmp/gui-cookies.txt http://localhost:3456/ | grep -o '<title>[^<]*</title>' | sed 's/<[^>]*>//g')", shell=True)
    if [ "$MAIN_TITLE" == "GUI Template Selector - AI Dev Portal" ]:; then
    print("✓ PASS: Main page accessible with session")
    else:
    print("✗ FAIL: Cannot access main page. Got: $MAIN_TITLE")
    print("")
    # Test 7: Test invalid credentials
    print("Test 7: Testing login with invalid credentials...")
    subprocess.run("INVALID_RESPONSE=$(curl -s -X POST \", shell=True)
    subprocess.run("-H "Content-Type: application/json" \", shell=True)
    subprocess.run("-d '{"username":"wronguser","password":"wrongpass"}' \", shell=True)
    subprocess.run("http://localhost:3456/api/auth/login)", shell=True)
    if [ "$INVALID_RESPONSE" == *"Invalid credentials"* ]:; then
    print("✓ PASS: Invalid credentials rejected")
    else:
    print("✗ FAIL: Invalid credentials not handled properly. Response: $INVALID_RESPONSE")
    print("")
    # Clean up
    subprocess.run("rm -f /tmp/gui-cookies.txt", shell=True)
    print("=== Test Complete ===")

if __name__ == "__main__":
    main()