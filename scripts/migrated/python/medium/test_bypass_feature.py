#!/usr/bin/env python3
"""
Migrated from: test_bypass_feature.sh
Auto-generated Python - 2025-08-16T04:57:27.596Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    print("=== Testing Bypass Build Feature ===")
    # Ensure we have built executables
    if [ ! -f "build/hello_tests" ]:; then
    print("Building demo first...")
    subprocess.run("./build_manual.sh", shell=True)
    print("")
    print("1. Testing DEFAULT behavior (buildBeforeTest: true)")
    print("   - This should trigger builds when code changes")
    print("   - Default configuration should build before running tests")
    # Create a test configuration with default build behavior
    subprocess.run("cat > .vscode/settings_build_enabled.json << 'EOF'", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""cdoctest.useCmakeTarget": true,", shell=True)
    subprocess.run(""cdoctest.buildDirectory": "${workspaceFolder}/build",", shell=True)
    subprocess.run(""cdoctest.exe_executable": "${workspaceFolder}/build/hello_tests",", shell=True)
    subprocess.run(""cdoctest.buildBeforeTest": true,", shell=True)
    subprocess.run(""cdoctest.exe_buildBeforeTest": true,", shell=True)
    subprocess.run(""cdoctest.bin_buildBeforeTest": true,", shell=True)
    subprocess.run(""ctest.buildBeforeTest": true,", shell=True)
    subprocess.run(""cdoctest.exe_listTestArgPattern": "GetTcList:",", shell=True)
    subprocess.run(""cdoctest.exe_testRunArgPattern": "TC/${test_suite_name}::${test_case_name}"", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF", shell=True)
    print("✓ Created configuration with building enabled")
    print("")
    print("2. Testing BYPASS behavior (buildBeforeTest: false)")
    print("   - This should skip builds and run existing executables directly")
    print("   - Should be much faster as it bypasses compilation")
    # Create a test configuration with bypass build behavior
    subprocess.run("cat > .vscode/settings_build_bypassed.json << 'EOF'", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""cdoctest.useCmakeTarget": true,", shell=True)
    subprocess.run(""cdoctest.buildDirectory": "${workspaceFolder}/build",", shell=True)
    subprocess.run(""cdoctest.exe_executable": "${workspaceFolder}/build/hello_tests",", shell=True)
    subprocess.run(""cdoctest.buildBeforeTest": false,", shell=True)
    subprocess.run(""cdoctest.exe_buildBeforeTest": false,", shell=True)
    subprocess.run(""cdoctest.bin_buildBeforeTest": false,", shell=True)
    subprocess.run(""ctest.buildBeforeTest": false,", shell=True)
    subprocess.run(""cdoctest.exe_listTestArgPattern": "GetTcList:",", shell=True)
    subprocess.run(""cdoctest.exe_testRunArgPattern": "TC/${test_suite_name}::${test_case_name}"", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF", shell=True)
    print("✓ Created configuration with building bypassed")
    print("")
    print("3. Simulating code changes to test rebuild behavior")
    # Create original source backup
    shutil.copy2("src/hello.cpp", "src/hello.cpp.backup")
    # Modify source code to simulate changes
    print("Modifying source code...")
    subprocess.run("sed -i 's/Hello, /Greetings, /g' src/hello.cpp", shell=True)
    print("✓ Modified hello.cpp - changed 'Hello,' to 'Greetings,'")
    print("")
    print("4. Test with BUILD ENABLED configuration:")
    print("   (In real usage, this would trigger CMake build)")
    # Copy the build-enabled settings
    shutil.copy2(".vscode/settings_build_enabled.json", ".vscode/settings.json")
    # Run the test executable directly to show what would happen
    print("   Direct test execution (simulating post-build result):")
    os.chdir("build && ./hello_tests GetTcList: && echo "   → Would rebuild and run with new 'Greetings,' messages"")
    os.chdir("..")
    print("")
    print("5. Test with BUILD BYPASSED configuration:")
    print("   (This should use existing executable, showing old 'Hello,' messages)")
    # Copy the bypass settings
    shutil.copy2(".vscode/settings_build_bypassed.json", ".vscode/settings.json")
    print("   Direct test execution (simulating bypass behavior):")
    os.chdir("build && ./hello_tests "TC/HelloSuite::BasicGreeting" && echo "   → Used existing executable, still shows old behavior"")
    os.chdir("..")
    print("")
    print("6. Performance comparison simulation:")
    print("   WITH BUILD (simulated):")
    print("   - Time: ~2-5 seconds (includes compilation time)")
    print("   - Output: Updated code results")
    print("")
    print("   WITH BYPASS:")
    subprocess.run("time (cd build && ./hello_tests "TC/HelloSuite::BasicGreeting" > /dev/null)", shell=True)
    print("   - Output: Existing executable results (no rebuild)")
    print("")
    print("7. Cleanup and restore")
    shutil.move("src/hello.cpp.backup", "src/hello.cpp")
    print("✓ Restored original source code")
    # Rebuild to have clean executables
    print("Rebuilding with original code...")
    os.chdir("build")
    subprocess.run("g++ -std=c++17 -I../include ../src/test_main.cpp ../src/hello.cpp -o hello_tests", shell=True)
    os.chdir("..")
    print("")
    print("=== Test Summary ===")
    print("✅ Default behavior: Builds before running tests (safer, always up-to-date)")
    print("✅ Bypass behavior: Skips builds, runs existing executables (faster)")
    print("✅ Configuration works through buildBeforeTest settings")
    print("✅ Demo project supports both modes")
    print("")
    print("To use in VSCode:")
    print("1. Open this folder in VSCode with CDocTest extension")
    print("2. Set buildBeforeTest to false in .vscode/settings.json to bypass")
    print("3. Set buildBeforeTest to true (default) to rebuild on changes")
    subprocess.run("rm -f .vscode/settings_build_enabled.json .vscode/settings_build_bypassed.json", shell=True)

if __name__ == "__main__":
    main()