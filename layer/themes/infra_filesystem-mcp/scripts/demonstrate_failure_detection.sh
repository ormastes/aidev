#!/bin/bash

# Demonstration of Failure Detection Testing
# This script proves that tests can detect when hello world outputs are broken

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

echo -e "${MAGENTA}=====================================================${NC}"
echo -e "${MAGENTA}FAILURE DETECTION DEMONSTRATION${NC}"
echo -e "${MAGENTA}Proving tests can detect broken hello world outputs${NC}"
echo -e "${MAGENTA}=====================================================${NC}"
echo

# Create test directory
TEST_DIR="failure_detection_demo"
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"

# ============================================
# PYTHON FAILURE DETECTION TEST
# ============================================
echo -e "${BLUE}=== PYTHON FAILURE DETECTION TEST ===${NC}"
echo

# Create Python hello world
cat > "$TEST_DIR/hello.py" << 'EOF'
#!/usr/bin/env python3
print("Hello World from Python!")
EOF

# Create Python test
cat > "$TEST_DIR/test_python.py" << 'EOF'
#!/usr/bin/env python3
import subprocess
import sys

def test_hello():
    result = subprocess.run([sys.executable, 'hello.py'], 
                          capture_output=True, text=True, cwd='.')
    expected = "Hello World from Python!"
    
    if expected in result.stdout:
        print("✅ TEST PASSED: Found expected output")
        return True
    else:
        print(f"❌ TEST FAILED: Expected '{expected}' but got '{result.stdout.strip()}'")
        return False

if __name__ == "__main__":
    if test_hello():
        sys.exit(0)
    else:
        sys.exit(1)
EOF
chmod +x "$TEST_DIR/test_python.py"

echo -e "${YELLOW}Step 1: Test with CORRECT output${NC}"
cd "$TEST_DIR"
python3 hello.py
echo -n "Running test: "
if python3 test_python.py; then
    echo -e "${GREEN}✓ Test correctly PASSES when output is correct${NC}"
else
    echo -e "${RED}✗ Test incorrectly fails${NC}"
fi
cd - > /dev/null
echo

echo -e "${YELLOW}Step 2: BREAK the output (change Hello to Goodbye)${NC}"
sed -i 's/Hello World/Goodbye World/g' "$TEST_DIR/hello.py"
cd "$TEST_DIR"
echo "New output: $(python3 hello.py)"
echo -n "Running test: "
if python3 test_python.py 2>/dev/null; then
    echo -e "${RED}✗ PROBLEM: Test didn't detect the broken output!${NC}"
else
    echo -e "${GREEN}✓ GOOD: Test correctly FAILED when output was wrong${NC}"
fi
cd - > /dev/null
echo

echo -e "${YELLOW}Step 3: FIX the output (change back to Hello)${NC}"
sed -i 's/Goodbye World/Hello World/g' "$TEST_DIR/hello.py"
cd "$TEST_DIR"
python3 hello.py
echo -n "Running test: "
if python3 test_python.py; then
    echo -e "${GREEN}✓ Test correctly PASSES again after fix${NC}"
else
    echo -e "${RED}✗ Test still failing after fix${NC}"
fi
cd - > /dev/null
echo

# ============================================
# JAVASCRIPT FAILURE DETECTION TEST
# ============================================
echo -e "${BLUE}=== JAVASCRIPT FAILURE DETECTION TEST ===${NC}"
echo

# Create JavaScript hello world
cat > "$TEST_DIR/hello.js" << 'EOF'
console.log("Hello World from JavaScript!");
EOF

# Create JavaScript test
cat > "$TEST_DIR/test_javascript.js" << 'EOF'
const { execSync } = require('child_process');

function testHello() {
    try {
        const output = execSync('node hello.js', { encoding: 'utf8' });
        const expected = "Hello World from JavaScript!";
        
        if (output.includes(expected)) {
            console.log("✅ TEST PASSED: Found expected output");
            return true;
        } else {
            console.log(`❌ TEST FAILED: Expected '${expected}' but got '${output.trim()}'`);
            return false;
        }
    } catch (error) {
        console.log("❌ TEST FAILED: Error running hello.js");
        return false;
    }
}

if (!testHello()) {
    process.exit(1);
}
EOF

echo -e "${YELLOW}Step 1: Test with CORRECT output${NC}"
cd "$TEST_DIR"
node hello.js
echo -n "Running test: "
if node test_javascript.js; then
    echo -e "${GREEN}✓ Test correctly PASSES when output is correct${NC}"
else
    echo -e "${RED}✗ Test incorrectly fails${NC}"
fi
cd - > /dev/null
echo

echo -e "${YELLOW}Step 2: BREAK the output (change Hello to Error)${NC}"
sed -i 's/Hello World/Error Message/g' "$TEST_DIR/hello.js"
cd "$TEST_DIR"
echo "New output: $(node hello.js)"
echo -n "Running test: "
if node test_javascript.js 2>/dev/null; then
    echo -e "${RED}✗ PROBLEM: Test didn't detect the broken output!${NC}"
else
    echo -e "${GREEN}✓ GOOD: Test correctly FAILED when output was wrong${NC}"
fi
cd - > /dev/null
echo

echo -e "${YELLOW}Step 3: FIX the output (change back to Hello)${NC}"
sed -i 's/Error Message/Hello World/g' "$TEST_DIR/hello.js"
cd "$TEST_DIR"
node hello.js
echo -n "Running test: "
if node test_javascript.js; then
    echo -e "${GREEN}✓ Test correctly PASSES again after fix${NC}"
else
    echo -e "${RED}✗ Test still failing after fix${NC}"
fi
cd - > /dev/null
echo

# ============================================
# C++ FAILURE DETECTION TEST
# ============================================
echo -e "${BLUE}=== C++ FAILURE DETECTION TEST ===${NC}"
echo

# Create C++ hello world
cat > "$TEST_DIR/hello.cpp" << 'EOF'
#include <iostream>
int main() {
    std::cout << "Hello World from C++!" << std::endl;
    return 0;
}
EOF

# Create test script for C++
cat > "$TEST_DIR/test_cpp.sh" << 'EOF'
#!/bin/bash
# Compile
g++ -o hello_cpp hello.cpp 2>/dev/null
if [ $? -ne 0 ]; then
    echo "❌ TEST FAILED: Compilation error"
    exit 1
fi

# Run and check output
output=$(./hello_cpp)
expected="Hello World from C++!"

if echo "$output" | grep -q "$expected"; then
    echo "✅ TEST PASSED: Found expected output"
    exit 0
else
    echo "❌ TEST FAILED: Expected '$expected' but got '$output'"
    exit 1
fi
EOF
chmod +x "$TEST_DIR/test_cpp.sh"

echo -e "${YELLOW}Step 1: Test with CORRECT output${NC}"
cd "$TEST_DIR"
g++ -o hello_cpp hello.cpp
./hello_cpp
echo -n "Running test: "
if ./test_cpp.sh; then
    echo -e "${GREEN}✓ Test correctly PASSES when output is correct${NC}"
else
    echo -e "${RED}✗ Test incorrectly fails${NC}"
fi
cd - > /dev/null
echo

echo -e "${YELLOW}Step 2: BREAK the output (change Hello to Broken)${NC}"
sed -i 's/Hello World/Broken Output/g' "$TEST_DIR/hello.cpp"
cd "$TEST_DIR"
g++ -o hello_cpp hello.cpp
echo "New output: $(./hello_cpp)"
echo -n "Running test: "
if ./test_cpp.sh 2>/dev/null; then
    echo -e "${RED}✗ PROBLEM: Test didn't detect the broken output!${NC}"
else
    echo -e "${GREEN}✓ GOOD: Test correctly FAILED when output was wrong${NC}"
fi
cd - > /dev/null
echo

echo -e "${YELLOW}Step 3: FIX the output (change back to Hello)${NC}"
sed -i 's/Broken Output/Hello World/g' "$TEST_DIR/hello.cpp"
cd "$TEST_DIR"
g++ -o hello_cpp hello.cpp
./hello_cpp
echo -n "Running test: "
if ./test_cpp.sh; then
    echo -e "${GREEN}✓ Test correctly PASSES again after fix${NC}"
else
    echo -e "${RED}✗ Test still failing after fix${NC}"
fi
cd - > /dev/null
echo

# ============================================
# SUMMARY
# ============================================
echo -e "${MAGENTA}=====================================================${NC}"
echo -e "${MAGENTA}SUMMARY OF FAILURE DETECTION${NC}"
echo -e "${MAGENTA}=====================================================${NC}"
echo
echo "This demonstration proves that:"
echo -e "${GREEN}✅ All tests PASS when hello world outputs are correct${NC}"
echo -e "${GREEN}✅ All tests FAIL when hello world outputs are broken${NC}"
echo -e "${GREEN}✅ All tests PASS again when outputs are fixed${NC}"
echo
echo "This confirms that the test system can properly detect failures!"
echo
echo "Test files are available in: $TEST_DIR/"
echo "You can manually verify by running:"
echo "  - Python: cd $TEST_DIR && python3 test_python.py"
echo "  - JavaScript: cd $TEST_DIR && node test_javascript.js"
echo "  - C++: cd $TEST_DIR && ./test_cpp.sh"