#!/usr/bin/env python3
"""
Migrated from: demo_hello_verification.sh
Auto-generated Python - 2025-08-16T04:57:27.728Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Demo script showing hello world verification with failure detection
    # This demonstrates that tests properly detect broken outputs
    subprocess.run("set -e", shell=True)
    # Colors
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("BLUE='\033[0;34m'", shell=True)
    subprocess.run("NC='\033[0m'", shell=True)
    print("-e ")${BLUE}================================================${NC}"
    print("-e ")${BLUE}Hello World Verification Demo${NC}"
    print("-e ")${BLUE}================================================${NC}"
    subprocess.run("echo", shell=True)
    # Create test directory
    subprocess.run("TEST_DIR="hello_demo"", shell=True)
    shutil.rmtree(""$TEST_DIR"", ignore_errors=True)
    Path(""$TEST_DIR"").mkdir(parents=True, exist_ok=True)
    print("-e ")${YELLOW}Creating hello world samples in multiple languages...${NC}"
    subprocess.run("echo", shell=True)
    # 1. Python Hello World
    print("-e ")${BLUE}1. Python Hello World${NC}"
    subprocess.run("cat > "$TEST_DIR/hello.py" << 'EOF'", shell=True)
    subprocess.run("print("Hello from Python!")", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("chmod +x "$TEST_DIR/hello.py"", shell=True)
    print("   Testing original (should pass):")
    subprocess.run("if python3 "$TEST_DIR/hello.py" | grep -q "Hello from Python"; then", shell=True)
    print("-e ")   ${GREEN}✓ Test passed - outputs correct message${NC}"
    else:
    print("-e ")   ${RED}✗ Test failed${NC}"
    print("   Breaking the output:")
    subprocess.run("sed -i 's/Hello from Python!/Goodbye from Python!/g' "$TEST_DIR/hello.py" 2>/dev/null || \", shell=True)
    subprocess.run("sed -i '' 's/Hello from Python!/Goodbye from Python!/g' "$TEST_DIR/hello.py" 2>/dev/null", shell=True)
    subprocess.run("if python3 "$TEST_DIR/hello.py" | grep -q "Hello from Python"; then", shell=True)
    print("-e ")   ${RED}✗ Test didn't detect broken output!${NC}"
    else:
    print("-e ")   ${GREEN}✓ Test correctly detected broken output${NC}"
    print("   Fixing the output:")
    subprocess.run("sed -i 's/Goodbye from Python!/Hello from Python!/g' "$TEST_DIR/hello.py" 2>/dev/null || \", shell=True)
    subprocess.run("sed -i '' 's/Goodbye from Python!/Hello from Python!/g' "$TEST_DIR/hello.py" 2>/dev/null", shell=True)
    subprocess.run("if python3 "$TEST_DIR/hello.py" | grep -q "Hello from Python"; then", shell=True)
    print("-e ")   ${GREEN}✓ Test passes after fix${NC}"
    else:
    print("-e ")   ${RED}✗ Test still failing after fix${NC}"
    subprocess.run("echo", shell=True)
    # 2. JavaScript/Node.js Hello World
    print("-e ")${BLUE}2. JavaScript/Node.js Hello World${NC}"
    subprocess.run("cat > "$TEST_DIR/hello.js" << 'EOF'", shell=True)
    subprocess.run("console.log("Hello from JavaScript!");", shell=True)
    subprocess.run("EOF", shell=True)
    print("   Testing original (should pass):")
    subprocess.run("if node "$TEST_DIR/hello.js" | grep -q "Hello from JavaScript"; then", shell=True)
    print("-e ")   ${GREEN}✓ Test passed - outputs correct message${NC}"
    else:
    print("-e ")   ${RED}✗ Test failed${NC}"
    print("   Breaking the output:")
    subprocess.run("sed -i 's/Hello from JavaScript!/Broken JavaScript!/g' "$TEST_DIR/hello.js" 2>/dev/null || \", shell=True)
    subprocess.run("sed -i '' 's/Hello from JavaScript!/Broken JavaScript!/g' "$TEST_DIR/hello.js" 2>/dev/null", shell=True)
    subprocess.run("if node "$TEST_DIR/hello.js" | grep -q "Hello from JavaScript"; then", shell=True)
    print("-e ")   ${RED}✗ Test didn't detect broken output!${NC}"
    else:
    print("-e ")   ${GREEN}✓ Test correctly detected broken output${NC}"
    print("   Fixing the output:")
    subprocess.run("sed -i 's/Broken JavaScript!/Hello from JavaScript!/g' "$TEST_DIR/hello.js" 2>/dev/null || \", shell=True)
    subprocess.run("sed -i '' 's/Broken JavaScript!/Hello from JavaScript!/g' "$TEST_DIR/hello.js" 2>/dev/null", shell=True)
    subprocess.run("if node "$TEST_DIR/hello.js" | grep -q "Hello from JavaScript"; then", shell=True)
    print("-e ")   ${GREEN}✓ Test passes after fix${NC}"
    else:
    print("-e ")   ${RED}✗ Test still failing after fix${NC}"
    subprocess.run("echo", shell=True)
    # 3. C++ Hello World
    print("-e ")${BLUE}3. C++ Hello World${NC}"
    subprocess.run("cat > "$TEST_DIR/hello.cpp" << 'EOF'", shell=True)
    # include <iostream>
    subprocess.run("int main() {", shell=True)
    subprocess.run("std::cout << "Hello from C++!" << std::endl;", shell=True)
    subprocess.run("return 0;", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF", shell=True)
    print("   Compiling C++ program:")
    subprocess.run("g++ -o "$TEST_DIR/hello_cpp" "$TEST_DIR/hello.cpp"", shell=True)
    print("-e ")   ${GREEN}✓ Compilation successful${NC}"
    print("   Testing original (should pass):")
    subprocess.run("if "$TEST_DIR/hello_cpp" | grep -q "Hello from C++"; then", shell=True)
    print("-e ")   ${GREEN}✓ Test passed - outputs correct message${NC}"
    else:
    print("-e ")   ${RED}✗ Test failed${NC}"
    print("   Breaking the output:")
    subprocess.run("sed -i 's/Hello from C++!/Error from C++!/g' "$TEST_DIR/hello.cpp" 2>/dev/null || \", shell=True)
    subprocess.run("sed -i '' 's/Hello from C++!/Error from C++!/g' "$TEST_DIR/hello.cpp" 2>/dev/null", shell=True)
    subprocess.run("g++ -o "$TEST_DIR/hello_cpp" "$TEST_DIR/hello.cpp" 2>/dev/null", shell=True)
    subprocess.run("if "$TEST_DIR/hello_cpp" | grep -q "Hello from C++"; then", shell=True)
    print("-e ")   ${RED}✗ Test didn't detect broken output!${NC}"
    else:
    print("-e ")   ${GREEN}✓ Test correctly detected broken output${NC}"
    print("   Fixing the output:")
    subprocess.run("sed -i 's/Error from C++!/Hello from C++!/g' "$TEST_DIR/hello.cpp" 2>/dev/null || \", shell=True)
    subprocess.run("sed -i '' 's/Error from C++!/Hello from C++!/g' "$TEST_DIR/hello.cpp" 2>/dev/null", shell=True)
    subprocess.run("g++ -o "$TEST_DIR/hello_cpp" "$TEST_DIR/hello.cpp" 2>/dev/null", shell=True)
    subprocess.run("if "$TEST_DIR/hello_cpp" | grep -q "Hello from C++"; then", shell=True)
    print("-e ")   ${GREEN}✓ Test passes after fix${NC}"
    else:
    print("-e ")   ${RED}✗ Test still failing after fix${NC}"
    subprocess.run("echo", shell=True)
    # 4. Bash Hello World
    print("-e ")${BLUE}4. Bash Hello World${NC}"
    subprocess.run("cat > "$TEST_DIR/hello.sh" << 'EOF'", shell=True)
    print("Hello from Bash!")
    subprocess.run("EOF", shell=True)
    subprocess.run("chmod +x "$TEST_DIR/hello.sh"", shell=True)
    print("   Testing original (should pass):")
    subprocess.run("if "$TEST_DIR/hello.sh" | grep -q "Hello from Bash"; then", shell=True)
    print("-e ")   ${GREEN}✓ Test passed - outputs correct message${NC}"
    else:
    print("-e ")   ${RED}✗ Test failed${NC}"
    print("   Breaking the output:")
    subprocess.run("sed -i 's/Hello from Bash!/Failed Bash!/g' "$TEST_DIR/hello.sh" 2>/dev/null || \", shell=True)
    subprocess.run("sed -i '' 's/Hello from Bash!/Failed Bash!/g' "$TEST_DIR/hello.sh" 2>/dev/null", shell=True)
    subprocess.run("if "$TEST_DIR/hello.sh" | grep -q "Hello from Bash"; then", shell=True)
    print("-e ")   ${RED}✗ Test didn't detect broken output!${NC}"
    else:
    print("-e ")   ${GREEN}✓ Test correctly detected broken output${NC}"
    print("   Fixing the output:")
    subprocess.run("sed -i 's/Failed Bash!/Hello from Bash!/g' "$TEST_DIR/hello.sh" 2>/dev/null || \", shell=True)
    subprocess.run("sed -i '' 's/Failed Bash!/Hello from Bash!/g' "$TEST_DIR/hello.sh" 2>/dev/null", shell=True)
    subprocess.run("if "$TEST_DIR/hello.sh" | grep -q "Hello from Bash"; then", shell=True)
    print("-e ")   ${GREEN}✓ Test passes after fix${NC}"
    else:
    print("-e ")   ${RED}✗ Test still failing after fix${NC}"
    subprocess.run("echo", shell=True)
    # Summary
    print("-e ")${BLUE}================================================${NC}"
    print("-e ")${BLUE}Summary${NC}"
    print("-e ")${BLUE}================================================${NC}"
    subprocess.run("echo", shell=True)
    print("This demo shows that:")
    print("1. All hello world implementations work correctly")
    print("2. Tests can detect when outputs are broken")
    print("3. Tests verify fixes restore correct behavior")
    subprocess.run("echo", shell=True)
    print("-e ")${GREEN}✓ All verification tests completed successfully!${NC}"
    subprocess.run("echo", shell=True)
    print("Test samples are in: $TEST_DIR/")
    subprocess.run("echo", shell=True)
    print("You can run individual samples:")
    print("  python3 $TEST_DIR/hello.py")
    print("  node $TEST_DIR/hello.js")
    print("  $TEST_DIR/hello_cpp")
    print("  $TEST_DIR/hello.sh")

if __name__ == "__main__":
    main()