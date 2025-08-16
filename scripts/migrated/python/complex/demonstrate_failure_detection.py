#!/usr/bin/env python3
"""
Migrated from: demonstrate_failure_detection.sh
Auto-generated Python - 2025-08-16T04:57:27.697Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Demonstration of Failure Detection Testing
    # This script proves that tests can detect when hello world outputs are broken
    subprocess.run("set -e", shell=True)
    # Colors
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("BLUE='\033[0;34m'", shell=True)
    subprocess.run("MAGENTA='\033[0;35m'", shell=True)
    subprocess.run("NC='\033[0m'", shell=True)
    print("-e ")${MAGENTA}=====================================================${NC}"
    print("-e ")${MAGENTA}FAILURE DETECTION DEMONSTRATION${NC}"
    print("-e ")${MAGENTA}Proving tests can detect broken hello world outputs${NC}"
    print("-e ")${MAGENTA}=====================================================${NC}"
    subprocess.run("echo", shell=True)
    # Create test directory
    subprocess.run("TEST_DIR="failure_detection_demo"", shell=True)
    shutil.rmtree(""$TEST_DIR"", ignore_errors=True)
    Path(""$TEST_DIR"").mkdir(parents=True, exist_ok=True)
    # ============================================
    # PYTHON FAILURE DETECTION TEST
    # ============================================
    print("-e ")${BLUE}=== PYTHON FAILURE DETECTION TEST ===${NC}"
    subprocess.run("echo", shell=True)
    # Create Python hello world
    subprocess.run("cat > "$TEST_DIR/hello.py" << 'EOF'", shell=True)
    subprocess.run("print("Hello World from Python!")", shell=True)
    subprocess.run("EOF", shell=True)
    # Create Python test
    subprocess.run("cat > "$TEST_DIR/test_python.py" << 'EOF'", shell=True)
    subprocess.run("import subprocess", shell=True)
    subprocess.run("import sys", shell=True)
    subprocess.run("def test_hello():", shell=True)
    subprocess.run("result = subprocess.run([sys.executable, 'hello.py'],", shell=True)
    subprocess.run("capture_output=True, text=True, cwd='.')", shell=True)
    subprocess.run("expected = "Hello World from Python!"", shell=True)
    subprocess.run("if expected in result.stdout:", shell=True)
    subprocess.run("print("✅ TEST PASSED: Found expected output")", shell=True)
    subprocess.run("return True", shell=True)
    subprocess.run("else:", shell=True)
    subprocess.run("print(f"❌ TEST FAILED: Expected '{expected}' but got '{result.stdout.strip()}'")", shell=True)
    subprocess.run("return False", shell=True)
    subprocess.run("if __name__ == "__main__":", shell=True)
    subprocess.run("if test_hello():", shell=True)
    subprocess.run("sys.exit(0)", shell=True)
    subprocess.run("else:", shell=True)
    subprocess.run("sys.exit(1)", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("chmod +x "$TEST_DIR/test_python.py"", shell=True)
    print("-e ")${YELLOW}Step 1: Test with CORRECT output${NC}"
    os.chdir(""$TEST_DIR"")
    subprocess.run("python3 hello.py", shell=True)
    print("-n ")Running test: "
    subprocess.run("if python3 test_python.py; then", shell=True)
    print("-e ")${GREEN}✓ Test correctly PASSES when output is correct${NC}"
    else:
    print("-e ")${RED}✗ Test incorrectly fails${NC}"
    os.chdir("- > /dev/null")
    subprocess.run("echo", shell=True)
    print("-e ")${YELLOW}Step 2: BREAK the output (change Hello to Goodbye)${NC}"
    subprocess.run("sed -i 's/Hello World/Goodbye World/g' "$TEST_DIR/hello.py"", shell=True)
    os.chdir(""$TEST_DIR"")
    print("New output: $(python3 hello.py)")
    print("-n ")Running test: "
    subprocess.run("if python3 test_python.py 2>/dev/null; then", shell=True)
    print("-e ")${RED}✗ PROBLEM: Test didn't detect the broken output!${NC}"
    else:
    print("-e ")${GREEN}✓ GOOD: Test correctly FAILED when output was wrong${NC}"
    os.chdir("- > /dev/null")
    subprocess.run("echo", shell=True)
    print("-e ")${YELLOW}Step 3: FIX the output (change back to Hello)${NC}"
    subprocess.run("sed -i 's/Goodbye World/Hello World/g' "$TEST_DIR/hello.py"", shell=True)
    os.chdir(""$TEST_DIR"")
    subprocess.run("python3 hello.py", shell=True)
    print("-n ")Running test: "
    subprocess.run("if python3 test_python.py; then", shell=True)
    print("-e ")${GREEN}✓ Test correctly PASSES again after fix${NC}"
    else:
    print("-e ")${RED}✗ Test still failing after fix${NC}"
    os.chdir("- > /dev/null")
    subprocess.run("echo", shell=True)
    # ============================================
    # JAVASCRIPT FAILURE DETECTION TEST
    # ============================================
    print("-e ")${BLUE}=== JAVASCRIPT FAILURE DETECTION TEST ===${NC}"
    subprocess.run("echo", shell=True)
    # Create JavaScript hello world
    subprocess.run("cat > "$TEST_DIR/hello.js" << 'EOF'", shell=True)
    subprocess.run("console.log("Hello World from JavaScript!");", shell=True)
    subprocess.run("EOF", shell=True)
    # Create JavaScript test
    subprocess.run("cat > "$TEST_DIR/test_javascript.js" << 'EOF'", shell=True)
    subprocess.run("const { execSync } = require('child_process');", shell=True)
    subprocess.run("function testHello() {", shell=True)
    subprocess.run("try {", shell=True)
    subprocess.run("const output = execSync('node hello.js', { encoding: 'utf8' });", shell=True)
    subprocess.run("const expected = "Hello World from JavaScript!";", shell=True)
    subprocess.run("if (output.includes(expected)) {", shell=True)
    subprocess.run("console.log("✅ TEST PASSED: Found expected output");", shell=True)
    subprocess.run("return true;", shell=True)
    subprocess.run("} else {", shell=True)
    subprocess.run("console.log(`❌ TEST FAILED: Expected '${expected}' but got '${output.trim()}'`);", shell=True)
    subprocess.run("return false;", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("} catch (error) {", shell=True)
    subprocess.run("console.log("❌ TEST FAILED: Error running hello.js");", shell=True)
    subprocess.run("return false;", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("if (!testHello()) {", shell=True)
    subprocess.run("process.exit(1);", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF", shell=True)
    print("-e ")${YELLOW}Step 1: Test with CORRECT output${NC}"
    os.chdir(""$TEST_DIR"")
    subprocess.run("node hello.js", shell=True)
    print("-n ")Running test: "
    subprocess.run("if node test_javascript.js; then", shell=True)
    print("-e ")${GREEN}✓ Test correctly PASSES when output is correct${NC}"
    else:
    print("-e ")${RED}✗ Test incorrectly fails${NC}"
    os.chdir("- > /dev/null")
    subprocess.run("echo", shell=True)
    print("-e ")${YELLOW}Step 2: BREAK the output (change Hello to Error)${NC}"
    subprocess.run("sed -i 's/Hello World/Error Message/g' "$TEST_DIR/hello.js"", shell=True)
    os.chdir(""$TEST_DIR"")
    print("New output: $(node hello.js)")
    print("-n ")Running test: "
    subprocess.run("if node test_javascript.js 2>/dev/null; then", shell=True)
    print("-e ")${RED}✗ PROBLEM: Test didn't detect the broken output!${NC}"
    else:
    print("-e ")${GREEN}✓ GOOD: Test correctly FAILED when output was wrong${NC}"
    os.chdir("- > /dev/null")
    subprocess.run("echo", shell=True)
    print("-e ")${YELLOW}Step 3: FIX the output (change back to Hello)${NC}"
    subprocess.run("sed -i 's/Error Message/Hello World/g' "$TEST_DIR/hello.js"", shell=True)
    os.chdir(""$TEST_DIR"")
    subprocess.run("node hello.js", shell=True)
    print("-n ")Running test: "
    subprocess.run("if node test_javascript.js; then", shell=True)
    print("-e ")${GREEN}✓ Test correctly PASSES again after fix${NC}"
    else:
    print("-e ")${RED}✗ Test still failing after fix${NC}"
    os.chdir("- > /dev/null")
    subprocess.run("echo", shell=True)
    # ============================================
    # C++ FAILURE DETECTION TEST
    # ============================================
    print("-e ")${BLUE}=== C++ FAILURE DETECTION TEST ===${NC}"
    subprocess.run("echo", shell=True)
    # Create C++ hello world
    subprocess.run("cat > "$TEST_DIR/hello.cpp" << 'EOF'", shell=True)
    # include <iostream>
    subprocess.run("int main() {", shell=True)
    subprocess.run("std::cout << "Hello World from C++!" << std::endl;", shell=True)
    subprocess.run("return 0;", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF", shell=True)
    # Create test script for C++
    subprocess.run("cat > "$TEST_DIR/test_cpp.sh" << 'EOF'", shell=True)
    # Compile
    subprocess.run("g++ -o hello_cpp hello.cpp 2>/dev/null", shell=True)
    if $? -ne 0 :; then
    print("❌ TEST FAILED: Compilation error")
    sys.exit(1)
    # Run and check output
    subprocess.run("output=$(./hello_cpp)", shell=True)
    subprocess.run("expected="Hello World from C++!"", shell=True)
    subprocess.run("if echo "$output" | grep -q "$expected"; then", shell=True)
    print("✅ TEST PASSED: Found expected output")
    sys.exit(0)
    else:
    print("❌ TEST FAILED: Expected '$expected' but got '$output'")
    sys.exit(1)
    subprocess.run("EOF", shell=True)
    subprocess.run("chmod +x "$TEST_DIR/test_cpp.sh"", shell=True)
    print("-e ")${YELLOW}Step 1: Test with CORRECT output${NC}"
    os.chdir(""$TEST_DIR"")
    subprocess.run("g++ -o hello_cpp hello.cpp", shell=True)
    subprocess.run("./hello_cpp", shell=True)
    print("-n ")Running test: "
    subprocess.run("if ./test_cpp.sh; then", shell=True)
    print("-e ")${GREEN}✓ Test correctly PASSES when output is correct${NC}"
    else:
    print("-e ")${RED}✗ Test incorrectly fails${NC}"
    os.chdir("- > /dev/null")
    subprocess.run("echo", shell=True)
    print("-e ")${YELLOW}Step 2: BREAK the output (change Hello to Broken)${NC}"
    subprocess.run("sed -i 's/Hello World/Broken Output/g' "$TEST_DIR/hello.cpp"", shell=True)
    os.chdir(""$TEST_DIR"")
    subprocess.run("g++ -o hello_cpp hello.cpp", shell=True)
    print("New output: $(./hello_cpp)")
    print("-n ")Running test: "
    subprocess.run("if ./test_cpp.sh 2>/dev/null; then", shell=True)
    print("-e ")${RED}✗ PROBLEM: Test didn't detect the broken output!${NC}"
    else:
    print("-e ")${GREEN}✓ GOOD: Test correctly FAILED when output was wrong${NC}"
    os.chdir("- > /dev/null")
    subprocess.run("echo", shell=True)
    print("-e ")${YELLOW}Step 3: FIX the output (change back to Hello)${NC}"
    subprocess.run("sed -i 's/Broken Output/Hello World/g' "$TEST_DIR/hello.cpp"", shell=True)
    os.chdir(""$TEST_DIR"")
    subprocess.run("g++ -o hello_cpp hello.cpp", shell=True)
    subprocess.run("./hello_cpp", shell=True)
    print("-n ")Running test: "
    subprocess.run("if ./test_cpp.sh; then", shell=True)
    print("-e ")${GREEN}✓ Test correctly PASSES again after fix${NC}"
    else:
    print("-e ")${RED}✗ Test still failing after fix${NC}"
    os.chdir("- > /dev/null")
    subprocess.run("echo", shell=True)
    # ============================================
    # SUMMARY
    # ============================================
    print("-e ")${MAGENTA}=====================================================${NC}"
    print("-e ")${MAGENTA}SUMMARY OF FAILURE DETECTION${NC}"
    print("-e ")${MAGENTA}=====================================================${NC}"
    subprocess.run("echo", shell=True)
    print("This demonstration proves that:")
    print("-e ")${GREEN}✅ All tests PASS when hello world outputs are correct${NC}"
    print("-e ")${GREEN}✅ All tests FAIL when hello world outputs are broken${NC}"
    print("-e ")${GREEN}✅ All tests PASS again when outputs are fixed${NC}"
    subprocess.run("echo", shell=True)
    print("This confirms that the test system can properly detect failures!")
    subprocess.run("echo", shell=True)
    print("Test files are available in: $TEST_DIR/")
    print("You can manually verify by running:")
    print("  - Python: cd $TEST_DIR && python3 test_python.py")
    print("  - JavaScript: cd $TEST_DIR && node test_javascript.js")
    print("  - C++: cd $TEST_DIR && ./test_cpp.sh")

if __name__ == "__main__":
    main()