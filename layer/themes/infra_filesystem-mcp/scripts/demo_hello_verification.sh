#!/bin/bash

# Demo script showing hello world verification with failure detection
# This demonstrates that tests properly detect broken outputs

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Hello World Verification Demo${NC}"
echo -e "${BLUE}================================================${NC}"
echo

# Create test directory
TEST_DIR="hello_demo"
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"

echo -e "${YELLOW}Creating hello world samples in multiple languages...${NC}"
echo

# 1. Python Hello World
echo -e "${BLUE}1. Python Hello World${NC}"
cat > "$TEST_DIR/hello.py" << 'EOF'
#!/usr/bin/env python3
print("Hello from Python!")
EOF
chmod +x "$TEST_DIR/hello.py"

echo "   Testing original (should pass):"
if python3 "$TEST_DIR/hello.py" | grep -q "Hello from Python"; then
    echo -e "   ${GREEN}✓ Test passed - outputs correct message${NC}"
else
    echo -e "   ${RED}✗ Test failed${NC}"
fi

echo "   Breaking the output:"
sed -i 's/Hello from Python!/Goodbye from Python!/g' "$TEST_DIR/hello.py" 2>/dev/null || \
sed -i '' 's/Hello from Python!/Goodbye from Python!/g' "$TEST_DIR/hello.py" 2>/dev/null

if python3 "$TEST_DIR/hello.py" | grep -q "Hello from Python"; then
    echo -e "   ${RED}✗ Test didn't detect broken output!${NC}"
else
    echo -e "   ${GREEN}✓ Test correctly detected broken output${NC}"
fi

echo "   Fixing the output:"
sed -i 's/Goodbye from Python!/Hello from Python!/g' "$TEST_DIR/hello.py" 2>/dev/null || \
sed -i '' 's/Goodbye from Python!/Hello from Python!/g' "$TEST_DIR/hello.py" 2>/dev/null

if python3 "$TEST_DIR/hello.py" | grep -q "Hello from Python"; then
    echo -e "   ${GREEN}✓ Test passes after fix${NC}"
else
    echo -e "   ${RED}✗ Test still failing after fix${NC}"
fi
echo

# 2. JavaScript/Node.js Hello World
echo -e "${BLUE}2. JavaScript/Node.js Hello World${NC}"
cat > "$TEST_DIR/hello.js" << 'EOF'
console.log("Hello from JavaScript!");
EOF

echo "   Testing original (should pass):"
if node "$TEST_DIR/hello.js" | grep -q "Hello from JavaScript"; then
    echo -e "   ${GREEN}✓ Test passed - outputs correct message${NC}"
else
    echo -e "   ${RED}✗ Test failed${NC}"
fi

echo "   Breaking the output:"
sed -i 's/Hello from JavaScript!/Broken JavaScript!/g' "$TEST_DIR/hello.js" 2>/dev/null || \
sed -i '' 's/Hello from JavaScript!/Broken JavaScript!/g' "$TEST_DIR/hello.js" 2>/dev/null

if node "$TEST_DIR/hello.js" | grep -q "Hello from JavaScript"; then
    echo -e "   ${RED}✗ Test didn't detect broken output!${NC}"
else
    echo -e "   ${GREEN}✓ Test correctly detected broken output${NC}"
fi

echo "   Fixing the output:"
sed -i 's/Broken JavaScript!/Hello from JavaScript!/g' "$TEST_DIR/hello.js" 2>/dev/null || \
sed -i '' 's/Broken JavaScript!/Hello from JavaScript!/g' "$TEST_DIR/hello.js" 2>/dev/null

if node "$TEST_DIR/hello.js" | grep -q "Hello from JavaScript"; then
    echo -e "   ${GREEN}✓ Test passes after fix${NC}"
else
    echo -e "   ${RED}✗ Test still failing after fix${NC}"
fi
echo

# 3. C++ Hello World
echo -e "${BLUE}3. C++ Hello World${NC}"
cat > "$TEST_DIR/hello.cpp" << 'EOF'
#include <iostream>
int main() {
    std::cout << "Hello from C++!" << std::endl;
    return 0;
}
EOF

echo "   Compiling C++ program:"
g++ -o "$TEST_DIR/hello_cpp" "$TEST_DIR/hello.cpp"
echo -e "   ${GREEN}✓ Compilation successful${NC}"

echo "   Testing original (should pass):"
if "$TEST_DIR/hello_cpp" | grep -q "Hello from C++"; then
    echo -e "   ${GREEN}✓ Test passed - outputs correct message${NC}"
else
    echo -e "   ${RED}✗ Test failed${NC}"
fi

echo "   Breaking the output:"
sed -i 's/Hello from C++!/Error from C++!/g' "$TEST_DIR/hello.cpp" 2>/dev/null || \
sed -i '' 's/Hello from C++!/Error from C++!/g' "$TEST_DIR/hello.cpp" 2>/dev/null
g++ -o "$TEST_DIR/hello_cpp" "$TEST_DIR/hello.cpp" 2>/dev/null

if "$TEST_DIR/hello_cpp" | grep -q "Hello from C++"; then
    echo -e "   ${RED}✗ Test didn't detect broken output!${NC}"
else
    echo -e "   ${GREEN}✓ Test correctly detected broken output${NC}"
fi

echo "   Fixing the output:"
sed -i 's/Error from C++!/Hello from C++!/g' "$TEST_DIR/hello.cpp" 2>/dev/null || \
sed -i '' 's/Error from C++!/Hello from C++!/g' "$TEST_DIR/hello.cpp" 2>/dev/null
g++ -o "$TEST_DIR/hello_cpp" "$TEST_DIR/hello.cpp" 2>/dev/null

if "$TEST_DIR/hello_cpp" | grep -q "Hello from C++"; then
    echo -e "   ${GREEN}✓ Test passes after fix${NC}"
else
    echo -e "   ${RED}✗ Test still failing after fix${NC}"
fi
echo

# 4. Bash Hello World
echo -e "${BLUE}4. Bash Hello World${NC}"
cat > "$TEST_DIR/hello.sh" << 'EOF'
#!/bin/bash
echo "Hello from Bash!"
EOF
chmod +x "$TEST_DIR/hello.sh"

echo "   Testing original (should pass):"
if "$TEST_DIR/hello.sh" | grep -q "Hello from Bash"; then
    echo -e "   ${GREEN}✓ Test passed - outputs correct message${NC}"
else
    echo -e "   ${RED}✗ Test failed${NC}"
fi

echo "   Breaking the output:"
sed -i 's/Hello from Bash!/Failed Bash!/g' "$TEST_DIR/hello.sh" 2>/dev/null || \
sed -i '' 's/Hello from Bash!/Failed Bash!/g' "$TEST_DIR/hello.sh" 2>/dev/null

if "$TEST_DIR/hello.sh" | grep -q "Hello from Bash"; then
    echo -e "   ${RED}✗ Test didn't detect broken output!${NC}"
else
    echo -e "   ${GREEN}✓ Test correctly detected broken output${NC}"
fi

echo "   Fixing the output:"
sed -i 's/Failed Bash!/Hello from Bash!/g' "$TEST_DIR/hello.sh" 2>/dev/null || \
sed -i '' 's/Failed Bash!/Hello from Bash!/g' "$TEST_DIR/hello.sh" 2>/dev/null

if "$TEST_DIR/hello.sh" | grep -q "Hello from Bash"; then
    echo -e "   ${GREEN}✓ Test passes after fix${NC}"
else
    echo -e "   ${RED}✗ Test still failing after fix${NC}"
fi
echo

# Summary
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}================================================${NC}"
echo
echo "This demo shows that:"
echo "1. All hello world implementations work correctly"
echo "2. Tests can detect when outputs are broken"
echo "3. Tests verify fixes restore correct behavior"
echo
echo -e "${GREEN}✓ All verification tests completed successfully!${NC}"
echo
echo "Test samples are in: $TEST_DIR/"
echo
echo "You can run individual samples:"
echo "  python3 $TEST_DIR/hello.py"
echo "  node $TEST_DIR/hello.js"
echo "  $TEST_DIR/hello_cpp"
echo "  $TEST_DIR/hello.sh"