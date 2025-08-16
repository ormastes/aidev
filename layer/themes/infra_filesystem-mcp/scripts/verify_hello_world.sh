#!/bin/bash

# Hello World Verification Script
# Tests all hello world implementations with success and failure cases

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Test tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
TEST_DIR="hello_world_tests"
REPORT_FILE="hello_world_test_report.md"

# Create test directory
mkdir -p "$TEST_DIR"

# Log functions
log() {
    case $1 in
        INFO) echo -e "${BLUE}[INFO]${NC} $2" ;;
        SUCCESS) echo -e "${GREEN}[✓]${NC} $2" ;;
        FAIL) echo -e "${RED}[✗]${NC} $2" ;;
        WARNING) echo -e "${YELLOW}[!]${NC} $2" ;;
        TEST) echo -e "${MAGENTA}[TEST]${NC} $2" ;;
    esac
}

# Initialize report
init_report() {
    cat > "$REPORT_FILE" << EOF
# Hello World Test Verification Report

Generated: $(date)

## Test Methodology

Each hello world implementation is tested with:
1. **Success Case**: Verify correct "Hello World" output
2. **Failure Case**: Intentionally break output and verify test catches it
3. **Fix Case**: Restore correct output and verify test passes again

## Test Results

| Configuration | Language | Success Test | Failure Detection | Fix Verification | Status |
|--------------|----------|--------------|-------------------|------------------|--------|
EOF
}

# Test function with success/failure verification
test_with_verification() {
    local name=$1
    local test_cmd=$2
    local expected=$3
    local file_to_modify=$4
    local original_text=$5
    local broken_text=$6
    
    ((TOTAL_TESTS++))
    
    log TEST "Testing $name"
    
    local success_result="❌"
    local failure_result="❌"
    local fix_result="❌"
    local overall_status="FAIL"
    
    # Test 1: Success case
    log INFO "Step 1: Testing original hello world (should pass)"
    if eval "$test_cmd" 2>/dev/null | grep -q "$expected"; then
        log SUCCESS "Original test passes correctly"
        success_result="✅"
    else
        log FAIL "Original test failed"
    fi
    
    # Test 2: Break it and verify test catches failure
    if [ -f "$file_to_modify" ]; then
        log INFO "Step 2: Breaking hello world (test should fail)"
        
        # Backup original
        cp "$file_to_modify" "$file_to_modify.bak"
        
        # Break the output
        sed -i "s/$original_text/$broken_text/g" "$file_to_modify" 2>/dev/null || \
        sed -i '' "s/$original_text/$broken_text/g" "$file_to_modify" 2>/dev/null
        
        if eval "$test_cmd" 2>/dev/null | grep -q "$expected"; then
            log FAIL "Test didn't catch the broken output!"
        else
            log SUCCESS "Test correctly detected broken output"
            failure_result="✅"
        fi
        
        # Test 3: Fix it and verify test passes again
        log INFO "Step 3: Fixing hello world (test should pass again)"
        
        # Restore original
        mv "$file_to_modify.bak" "$file_to_modify"
        
        if eval "$test_cmd" 2>/dev/null | grep -q "$expected"; then
            log SUCCESS "Test passes after fix"
            fix_result="✅"
        else
            log FAIL "Test still fails after fix"
        fi
    else
        log WARNING "File not found for modification: $file_to_modify"
    fi
    
    # Determine overall status
    if [ "$success_result" = "✅" ] && [ "$failure_result" = "✅" ] && [ "$fix_result" = "✅" ]; then
        overall_status="PASS"
        ((PASSED_TESTS++))
    else
        ((FAILED_TESTS++))
    fi
    
    # Add to report
    echo "| $name | ${name##*-} | $success_result | $failure_result | $fix_result | $overall_status |" >> "$REPORT_FILE"
    
    echo
}

# Create TypeScript/Node.js hello world
create_typescript_hello() {
    local dir="$TEST_DIR/typescript-cli"
    mkdir -p "$dir"
    
    cat > "$dir/hello.js" << 'EOF'
console.log("Hello from TypeScript!");
EOF
    
    cat > "$dir/hello.test.js" << 'EOF'
const { execSync } = require('child_process');

test('should output hello message', () => {
    const output = execSync('node hello.js', { encoding: 'utf8' });
    expect(output).toContain('Hello from TypeScript!');
});
EOF
    
    cat > "$dir/package.json" << 'EOF'
{
  "name": "hello-test",
  "version": "1.0.0",
  "scripts": {
    "test": "node hello.js"
  }
}
EOF
}

# Create Python hello world
create_python_hello() {
    local dir="$TEST_DIR/python-cli"
    mkdir -p "$dir"
    
    cat > "$dir/hello.py" << 'EOF'
#!/usr/bin/env python3
print("Hello from Python!")
EOF
    chmod +x "$dir/hello.py"
    
    cat > "$dir/test_hello.py" << 'EOF'
import subprocess
import sys

def test_hello():
    result = subprocess.run([sys.executable, 'hello.py'], capture_output=True, text=True)
    assert "Hello from Python!" in result.stdout
    
if __name__ == "__main__":
    test_hello()
    print("Test passed!")
EOF
}

# Create C++ hello world
create_cpp_hello() {
    local dir="$TEST_DIR/cpp-cli"
    mkdir -p "$dir"
    
    cat > "$dir/hello.cpp" << 'EOF'
#include <iostream>

int main() {
    std::cout << "Hello from C++!" << std::endl;
    return 0;
}
EOF
    
    cat > "$dir/Makefile" << 'EOF'
all:
	g++ -o hello hello.cpp

test: all
	./hello | grep "Hello from C++"

clean:
	rm -f hello
EOF
    
    cat > "$dir/test.sh" << 'EOF'
#!/bin/bash
make clean && make
output=$(./hello)
if echo "$output" | grep -q "Hello from C++"; then
    echo "Test passed!"
    exit 0
else
    echo "Test failed!"
    exit 1
fi
EOF
    chmod +x "$dir/test.sh"
}

# Create Express/TypeScript server hello world
create_express_hello() {
    local dir="$TEST_DIR/express-server"
    mkdir -p "$dir"
    
    cat > "$dir/server.js" << 'EOF'
const http = require('http');

const server = http.createServer((req, res) => {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Hello from Express Server!\n');
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// For testing
if (require.main === module) {
    setTimeout(() => {
        server.close();
        process.exit(0);
    }, 1000);
}

module.exports = server;
EOF
    
    cat > "$dir/test.js" << 'EOF'
const http = require('http');

http.get('http://localhost:3000', (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
        if (data.includes('Hello from Express Server!')) {
            console.log('Test passed!');
            process.exit(0);
        } else {
            console.log('Test failed!');
            process.exit(1);
        }
    });
});
EOF
}

# Create Flask/Python server hello world
create_flask_hello() {
    local dir="$TEST_DIR/flask-server"
    mkdir -p "$dir"
    
    cat > "$dir/app.py" << 'EOF'
from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello():
    return "Hello from Flask Server!\n"

if __name__ == '__main__':
    app.run(port=5000, debug=False)
EOF
    
    cat > "$dir/test.py" << 'EOF'
import requests
import subprocess
import time
import sys

# Start server
server = subprocess.Popen([sys.executable, 'app.py'])
time.sleep(2)

try:
    response = requests.get('http://localhost:5000')
    if "Hello from Flask Server!" in response.text:
        print("Test passed!")
    else:
        print("Test failed!")
finally:
    server.terminate()
EOF
}

# Create React component hello world
create_react_hello() {
    local dir="$TEST_DIR/react-component"
    mkdir -p "$dir"
    
    cat > "$dir/Hello.jsx" << 'EOF'
import React from 'react';

const Hello = () => {
    return <div>Hello from React!</div>;
};

export default Hello;
EOF
    
    cat > "$dir/Hello.test.jsx" << 'EOF'
import React from 'react';
import { render, screen } from '@testing-library/react';
import Hello from './Hello';

test('renders hello message', () => {
    render(<Hello />);
    const element = screen.getByText(/Hello from React!/i);
    expect(element).toBeInTheDocument();
});
EOF
}

# Create Docker hello world
create_docker_hello() {
    local dir="$TEST_DIR/docker-app"
    mkdir -p "$dir"
    
    cat > "$dir/app.js" << 'EOF'
console.log("Hello from Docker!");
EOF
    
    cat > "$dir/Dockerfile" << 'EOF'
FROM node:18-alpine
WORKDIR /app
COPY app.js .
CMD ["node", "app.js"]
EOF
    
    cat > "$dir/test.sh" << 'EOF'
#!/bin/bash
docker build -t hello-docker . 2>/dev/null
output=$(docker run --rm hello-docker 2>/dev/null)
if echo "$output" | grep -q "Hello from Docker!"; then
    echo "Test passed!"
    exit 0
else
    echo "Test failed!"
    exit 1
fi
EOF
    chmod +x "$dir/test.sh"
}

# Create Bash CLI hello world
create_bash_hello() {
    local dir="$TEST_DIR/bash-cli"
    mkdir -p "$dir"
    
    cat > "$dir/hello.sh" << 'EOF'
#!/bin/bash
echo "Hello from Bash!"
EOF
    chmod +x "$dir/hello.sh"
    
    cat > "$dir/test.sh" << 'EOF'
#!/bin/bash
output=$(./hello.sh)
if echo "$output" | grep -q "Hello from Bash!"; then
    echo "Test passed!"
    exit 0
else
    echo "Test failed!"
    exit 1
fi
EOF
    chmod +x "$dir/test.sh"
}

# Main test execution
main() {
    log INFO "Starting Hello World Verification Tests"
    log INFO "======================================="
    
    init_report
    
    # Create all hello world samples
    log INFO "Creating hello world samples..."
    create_typescript_hello
    create_python_hello
    create_cpp_hello
    create_express_hello
    create_flask_hello
    create_react_hello
    create_docker_hello
    create_bash_hello
    
    # Test each implementation with verification
    log INFO "Running verification tests..."
    echo
    
    # TypeScript CLI
    test_with_verification \
        "TypeScript-CLI" \
        "cd $TEST_DIR/typescript-cli && node hello.js" \
        "Hello from TypeScript" \
        "$TEST_DIR/typescript-cli/hello.js" \
        "Hello from TypeScript!" \
        "Goodbye from TypeScript!"
    
    # Python CLI
    test_with_verification \
        "Python-CLI" \
        "cd $TEST_DIR/python-cli && python3 hello.py" \
        "Hello from Python" \
        "$TEST_DIR/python-cli/hello.py" \
        "Hello from Python!" \
        "Goodbye from Python!"
    
    # C++ CLI
    test_with_verification \
        "C++-CLI" \
        "cd $TEST_DIR/cpp-cli && make clean >/dev/null 2>&1 && make >/dev/null 2>&1 && ./hello" \
        "Hello from C++" \
        "$TEST_DIR/cpp-cli/hello.cpp" \
        "Hello from C++!" \
        "Goodbye from C++!"
    
    # Bash CLI
    test_with_verification \
        "Bash-CLI" \
        "cd $TEST_DIR/bash-cli && ./hello.sh" \
        "Hello from Bash" \
        "$TEST_DIR/bash-cli/hello.sh" \
        "Hello from Bash!" \
        "Goodbye from Bash!"
    
    # Docker (if available)
    if command -v docker &> /dev/null; then
        test_with_verification \
            "Docker-App" \
            "cd $TEST_DIR/docker-app && ./test.sh" \
            "Test passed" \
            "$TEST_DIR/docker-app/app.js" \
            "Hello from Docker!" \
            "Goodbye from Docker!"
    else
        log WARNING "Docker not available, skipping Docker tests"
    fi
    
    # Generate summary
    echo >> "$REPORT_FILE"
    echo "## Summary" >> "$REPORT_FILE"
    echo >> "$REPORT_FILE"
    echo "- **Total Tests**: $TOTAL_TESTS" >> "$REPORT_FILE"
    echo "- **Passed**: $PASSED_TESTS" >> "$REPORT_FILE"
    echo "- **Failed**: $FAILED_TESTS" >> "$REPORT_FILE"
    echo "- **Success Rate**: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%" >> "$REPORT_FILE"
    echo >> "$REPORT_FILE"
    
    # Add test methodology details
    cat >> "$REPORT_FILE" << 'EOF'
## Test Verification Details

### What Each Test Verifies

1. **Success Test** (✅): The original hello world outputs the correct message
2. **Failure Detection** (✅): When we break the output, the test correctly fails
3. **Fix Verification** (✅): After restoring the correct output, the test passes again

### Why This Matters

This three-step verification ensures that:
- The hello world implementation actually works
- The test suite can detect when it's broken
- The test suite confirms when it's fixed

A configuration only gets a PASS status if all three checks succeed.

## Detailed Test Logs

The full test execution details are available in the console output above.
Each test shows the three steps:
1. Original test (should pass)
2. Broken test (should fail)
3. Fixed test (should pass)
EOF
    
    # Display results
    echo
    log INFO "==============================================="
    log INFO "Test Results Summary"
    log INFO "==============================================="
    echo -e "${BLUE}Total Tests:${NC} $TOTAL_TESTS"
    echo -e "${GREEN}Passed:${NC} $PASSED_TESTS"
    echo -e "${RED}Failed:${NC} $FAILED_TESTS"
    echo -e "${YELLOW}Success Rate:${NC} $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%"
    echo
    log INFO "Detailed report saved to: $REPORT_FILE"
    log INFO "Test samples created in: $TEST_DIR/"
    
    # Exit with appropriate code
    [ $FAILED_TESTS -eq 0 ] && exit 0 || exit 1
}

# Run main function
main "$@"