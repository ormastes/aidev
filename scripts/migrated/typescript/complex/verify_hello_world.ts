#!/usr/bin/env bun
/**
 * Migrated from: verify_hello_world.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.660Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Hello World Verification Script
  // Tests all hello world implementations with success and failure cases
  await $`set -e`;
  // Colors
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`BLUE='\033[0;34m'`;
  await $`MAGENTA='\033[0;35m'`;
  await $`NC='\033[0m'`;
  // Test tracking
  await $`TOTAL_TESTS=0`;
  await $`PASSED_TESTS=0`;
  await $`FAILED_TESTS=0`;
  await $`TEST_DIR="hello_world_tests"`;
  await $`REPORT_FILE="hello_world_test_report.md"`;
  // Create test directory
  await mkdir(""$TEST_DIR"", { recursive: true });
  // Log functions
  await $`log() {`;
  await $`case $1 in`;
  await $`INFO) echo -e "${BLUE}[INFO]${NC} $2" ;;`;
  await $`SUCCESS) echo -e "${GREEN}[✓]${NC} $2" ;;`;
  await $`FAIL) echo -e "${RED}[✗]${NC} $2" ;;`;
  await $`WARNING) echo -e "${YELLOW}[!]${NC} $2" ;;`;
  await $`TEST) echo -e "${MAGENTA}[TEST]${NC} $2" ;;`;
  await $`esac`;
  await $`}`;
  // Initialize report
  await $`init_report() {`;
  await $`cat > "$REPORT_FILE" << EOF`;
  // Hello World Test Verification Report
  await $`Generated: $(date)`;
  // # Test Methodology
  await $`Each hello world implementation is tested with:`;
  await $`1. **Success Case**: Verify correct "Hello World" output`;
  await $`2. **Failure Case**: Intentionally break output and verify test catches it`;
  await $`3. **Fix Case**: Restore correct output and verify test passes again`;
  // # Test Results
  await $`| Configuration | Language | Success Test | Failure Detection | Fix Verification | Status |`;
  await $`|--------------|----------|--------------|-------------------|------------------|--------|`;
  await $`EOF`;
  await $`}`;
  // Test function with success/failure verification
  await $`test_with_verification() {`;
  await $`local name=$1`;
  await $`local test_cmd=$2`;
  await $`local expected=$3`;
  await $`local file_to_modify=$4`;
  await $`local original_text=$5`;
  await $`local broken_text=$6`;
  await $`((TOTAL_TESTS++))`;
  await $`log TEST "Testing $name"`;
  await $`local success_result="❌"`;
  await $`local failure_result="❌"`;
  await $`local fix_result="❌"`;
  await $`local overall_status="FAIL"`;
  // Test 1: Success case
  await $`log INFO "Step 1: Testing original hello world (should pass)"`;
  await $`if eval "$test_cmd" 2>/dev/null | grep -q "$expected"; then`;
  await $`log SUCCESS "Original test passes correctly"`;
  await $`success_result="✅"`;
  } else {
  await $`log FAIL "Original test failed"`;
  }
  // Test 2: Break it and verify test catches failure
  if (-f "$file_to_modify" ) {; then
  await $`log INFO "Step 2: Breaking hello world (test should fail)"`;
  // Backup original
  await copyFile(""$file_to_modify"", ""$file_to_modify.bak"");
  // Break the output
  await $`sed -i "s/$original_text/$broken_text/g" "$file_to_modify" 2>/dev/null || \`;
  await $`sed -i '' "s/$original_text/$broken_text/g" "$file_to_modify" 2>/dev/null`;
  await $`if eval "$test_cmd" 2>/dev/null | grep -q "$expected"; then`;
  await $`log FAIL "Test didn't catch the broken output!"`;
  } else {
  await $`log SUCCESS "Test correctly detected broken output"`;
  await $`failure_result="✅"`;
  }
  // Test 3: Fix it and verify test passes again
  await $`log INFO "Step 3: Fixing hello world (test should pass again)"`;
  // Restore original
  await rename(""$file_to_modify.bak"", ""$file_to_modify"");
  await $`if eval "$test_cmd" 2>/dev/null | grep -q "$expected"; then`;
  await $`log SUCCESS "Test passes after fix"`;
  await $`fix_result="✅"`;
  } else {
  await $`log FAIL "Test still fails after fix"`;
  }
  } else {
  await $`log WARNING "File not found for modification: $file_to_modify"`;
  }
  // Determine overall status
  if ("$success_result" = "✅" ] && [ "$failure_result" = "✅" ] && [ "$fix_result" = "✅" ) {; then
  await $`overall_status="PASS"`;
  await $`((PASSED_TESTS++))`;
  } else {
  await $`((FAILED_TESTS++))`;
  }
  // Add to report
  console.log("| $name | ${name##*-} | $success_result | $failure_result | $fix_result | $overall_status |"); >> "$REPORT_FILE"
  await $`echo`;
  await $`}`;
  // Create TypeScript/Node.js hello world
  await $`create_typescript_hello() {`;
  await $`local dir="$TEST_DIR/typescript-cli"`;
  await mkdir(""$dir"", { recursive: true });
  await $`cat > "$dir/hello.js" << 'EOF'`;
  await $`console.log("Hello from TypeScript!");`;
  await $`EOF`;
  await $`cat > "$dir/hello.test.js" << 'EOF'`;
  await $`const { execSync } = require('child_process');`;
  await $`test('should output hello message', () => {`;
  await $`const output = execSync('node hello.js', { encoding: 'utf8' });`;
  await $`expect(output).toContain('Hello from TypeScript!');`;
  await $`});`;
  await $`EOF`;
  await $`cat > "$dir/package.json" << 'EOF'`;
  await $`{`;
  await $`"name": "hello-test",`;
  await $`"version": "1.0.0",`;
  await $`"scripts": {`;
  await $`"test": "node hello.js"`;
  await $`}`;
  await $`}`;
  await $`EOF`;
  await $`}`;
  // Create Python hello world
  await $`create_python_hello() {`;
  await $`local dir="$TEST_DIR/python-cli"`;
  await mkdir(""$dir"", { recursive: true });
  await $`cat > "$dir/hello.py" << 'EOF'`;
  await $`print("Hello from Python!")`;
  await $`EOF`;
  await $`chmod +x "$dir/hello.py"`;
  await $`cat > "$dir/test_hello.py" << 'EOF'`;
  await $`import subprocess`;
  await $`import sys`;
  await $`def test_hello():`;
  await $`result = subprocess.run([sys.executable, 'hello.py'], capture_output=True, text=True)`;
  await $`assert "Hello from Python!" in result.stdout`;
  await $`if __name__ == "__main__":`;
  await $`test_hello()`;
  await $`print("Test passed!")`;
  await $`EOF`;
  await $`}`;
  // Create C++ hello world
  await $`create_cpp_hello() {`;
  await $`local dir="$TEST_DIR/cpp-cli"`;
  await mkdir(""$dir"", { recursive: true });
  await $`cat > "$dir/hello.cpp" << 'EOF'`;
  // include <iostream>
  await $`int main() {`;
  await $`std::cout << "Hello from C++!" << std::endl;`;
  await $`return 0;`;
  await $`}`;
  await $`EOF`;
  await $`cat > "$dir/Makefile" << 'EOF'`;
  await $`all:`;
  await $`g++ -o hello hello.cpp`;
  await $`test: all`;
  await $`./hello | grep "Hello from C++"`;
  await $`clean:`;
  await $`rm -f hello`;
  await $`EOF`;
  await $`cat > "$dir/test.sh" << 'EOF'`;
  await $`make clean && make`;
  await $`output=$(./hello)`;
  await $`if echo "$output" | grep -q "Hello from C++"; then`;
  console.log("Test passed!");
  process.exit(0);
  } else {
  console.log("Test failed!");
  process.exit(1);
  }
  await $`EOF`;
  await $`chmod +x "$dir/test.sh"`;
  await $`}`;
  // Create Express/TypeScript server hello world
  await $`create_express_hello() {`;
  await $`local dir="$TEST_DIR/express-server"`;
  await mkdir(""$dir"", { recursive: true });
  await $`cat > "$dir/server.js" << 'EOF'`;
  await $`const http = require('http');`;
  await $`const server = http.createServer((req, res) => {`;
  await $`res.writeHead(200, {'Content-Type': 'text/plain'});`;
  await $`res.end('Hello from Express Server!\n');`;
  await $`});`;
  await $`const port = process.env.PORT || 3000;`;
  await $`server.listen(port, () => {`;
  await $`console.log(`Server running on port ${port}`);`;
  await $`});`;
  // For testing
  await $`if (require.main === module) {`;
  await $`setTimeout(() => {`;
  await $`server.close();`;
  await $`process.exit(0);`;
  await $`}, 1000);`;
  await $`}`;
  await $`module.exports = server;`;
  await $`EOF`;
  await $`cat > "$dir/test.js" << 'EOF'`;
  await $`const http = require('http');`;
  await $`http.get('http://localhost:3000', (res) => {`;
  await $`let data = '';`;
  await $`res.on('data', chunk => { data += chunk; });`;
  await $`res.on('end', () => {`;
  await $`if (data.includes('Hello from Express Server!')) {`;
  await $`console.log('Test passed!');`;
  await $`process.exit(0);`;
  await $`} else {`;
  await $`console.log('Test failed!');`;
  await $`process.exit(1);`;
  await $`}`;
  await $`});`;
  await $`});`;
  await $`EOF`;
  await $`}`;
  // Create Flask/Python server hello world
  await $`create_flask_hello() {`;
  await $`local dir="$TEST_DIR/flask-server"`;
  await mkdir(""$dir"", { recursive: true });
  await $`cat > "$dir/app.py" << 'EOF'`;
  await $`from flask import Flask`;
  await $`app = Flask(__name__)`;
  await $`@app.route('/')`;
  await $`def hello():`;
  await $`return "Hello from Flask Server!\n"`;
  await $`if __name__ == '__main__':`;
  await $`app.run(port=5000, debug=False)`;
  await $`EOF`;
  await $`cat > "$dir/test.py" << 'EOF'`;
  await $`import requests`;
  await $`import subprocess`;
  await $`import time`;
  await $`import sys`;
  // Start server
  await $`server = subprocess.Popen([sys.executable, 'app.py'])`;
  await $`time.sleep(2)`;
  await $`try:`;
  await $`response = requests.get('http://localhost:5000')`;
  await $`if "Hello from Flask Server!" in response.text:`;
  await $`print("Test passed!")`;
  await $`else:`;
  await $`print("Test failed!")`;
  await $`finally:`;
  await $`server.terminate()`;
  await $`EOF`;
  await $`}`;
  // Create React component hello world
  await $`create_react_hello() {`;
  await $`local dir="$TEST_DIR/react-component"`;
  await mkdir(""$dir"", { recursive: true });
  await $`cat > "$dir/Hello.jsx" << 'EOF'`;
  await $`import React from 'react';`;
  await $`const Hello = () => {`;
  await $`return <div>Hello from React!</div>;`;
  await $`};`;
  await $`export default Hello;`;
  await $`EOF`;
  await $`cat > "$dir/Hello.test.jsx" << 'EOF'`;
  await $`import React from 'react';`;
  await $`import { render, screen } from '@testing-library/react';`;
  await $`import Hello from './Hello';`;
  await $`test('renders hello message', () => {`;
  await $`render(<Hello />);`;
  await $`const element = screen.getByText(/Hello from React!/i);`;
  await $`expect(element).toBeInTheDocument();`;
  await $`});`;
  await $`EOF`;
  await $`}`;
  // Create Docker hello world
  await $`create_docker_hello() {`;
  await $`local dir="$TEST_DIR/docker-app"`;
  await mkdir(""$dir"", { recursive: true });
  await $`cat > "$dir/app.js" << 'EOF'`;
  await $`console.log("Hello from Docker!");`;
  await $`EOF`;
  await $`cat > "$dir/Dockerfile" << 'EOF'`;
  await $`FROM node:18-alpine`;
  await $`WORKDIR /app`;
  await $`COPY app.js .`;
  await $`CMD ["node", "app.js"]`;
  await $`EOF`;
  await $`cat > "$dir/test.sh" << 'EOF'`;
  await $`docker build -t hello-docker . 2>/dev/null`;
  await $`output=$(docker run --rm hello-docker 2>/dev/null)`;
  await $`if echo "$output" | grep -q "Hello from Docker!"; then`;
  console.log("Test passed!");
  process.exit(0);
  } else {
  console.log("Test failed!");
  process.exit(1);
  }
  await $`EOF`;
  await $`chmod +x "$dir/test.sh"`;
  await $`}`;
  // Create Bash CLI hello world
  await $`create_bash_hello() {`;
  await $`local dir="$TEST_DIR/bash-cli"`;
  await mkdir(""$dir"", { recursive: true });
  await $`cat > "$dir/hello.sh" << 'EOF'`;
  console.log("Hello from Bash!");
  await $`EOF`;
  await $`chmod +x "$dir/hello.sh"`;
  await $`cat > "$dir/test.sh" << 'EOF'`;
  await $`output=$(./hello.sh)`;
  await $`if echo "$output" | grep -q "Hello from Bash!"; then`;
  console.log("Test passed!");
  process.exit(0);
  } else {
  console.log("Test failed!");
  process.exit(1);
  }
  await $`EOF`;
  await $`chmod +x "$dir/test.sh"`;
  await $`}`;
  // Main test execution
  await $`main() {`;
  await $`log INFO "Starting Hello World Verification Tests"`;
  await $`log INFO "======================================="`;
  await $`init_report`;
  // Create all hello world samples
  await $`log INFO "Creating hello world samples..."`;
  await $`create_typescript_hello`;
  await $`create_python_hello`;
  await $`create_cpp_hello`;
  await $`create_express_hello`;
  await $`create_flask_hello`;
  await $`create_react_hello`;
  await $`create_docker_hello`;
  await $`create_bash_hello`;
  // Test each implementation with verification
  await $`log INFO "Running verification tests..."`;
  await $`echo`;
  // TypeScript CLI
  await $`test_with_verification \`;
  await $`"TypeScript-CLI" \`;
  await $`"cd $TEST_DIR/typescript-cli && node hello.js" \`;
  await $`"Hello from TypeScript" \`;
  await $`"$TEST_DIR/typescript-cli/hello.js" \`;
  await $`"Hello from TypeScript!" \`;
  await $`"Goodbye from TypeScript!"`;
  // Python CLI
  await $`test_with_verification \`;
  await $`"Python-CLI" \`;
  await $`"cd $TEST_DIR/python-cli && python3 hello.py" \`;
  await $`"Hello from Python" \`;
  await $`"$TEST_DIR/python-cli/hello.py" \`;
  await $`"Hello from Python!" \`;
  await $`"Goodbye from Python!"`;
  // C++ CLI
  await $`test_with_verification \`;
  await $`"C++-CLI" \`;
  await $`"cd $TEST_DIR/cpp-cli && make clean >/dev/null 2>&1 && make >/dev/null 2>&1 && ./hello" \`;
  await $`"Hello from C++" \`;
  await $`"$TEST_DIR/cpp-cli/hello.cpp" \`;
  await $`"Hello from C++!" \`;
  await $`"Goodbye from C++!"`;
  // Bash CLI
  await $`test_with_verification \`;
  await $`"Bash-CLI" \`;
  await $`"cd $TEST_DIR/bash-cli && ./hello.sh" \`;
  await $`"Hello from Bash" \`;
  await $`"$TEST_DIR/bash-cli/hello.sh" \`;
  await $`"Hello from Bash!" \`;
  await $`"Goodbye from Bash!"`;
  // Docker (if available)
  await $`if command -v docker &> /dev/null; then`;
  await $`test_with_verification \`;
  await $`"Docker-App" \`;
  await $`"cd $TEST_DIR/docker-app && ./test.sh" \`;
  await $`"Test passed" \`;
  await $`"$TEST_DIR/docker-app/app.js" \`;
  await $`"Hello from Docker!" \`;
  await $`"Goodbye from Docker!"`;
  } else {
  await $`log WARNING "Docker not available, skipping Docker tests"`;
  }
  // Generate summary
  console.log(">> ");$REPORT_FILE"
  console.log("## Summary"); >> "$REPORT_FILE"
  console.log(">> ");$REPORT_FILE"
  console.log("- **Total Tests**: $TOTAL_TESTS"); >> "$REPORT_FILE"
  console.log("- **Passed**: $PASSED_TESTS"); >> "$REPORT_FILE"
  console.log("- **Failed**: $FAILED_TESTS"); >> "$REPORT_FILE"
  console.log("- **Success Rate**: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%"); >> "$REPORT_FILE"
  console.log(">> ");$REPORT_FILE"
  // Add test methodology details
  await $`cat >> "$REPORT_FILE" << 'EOF'`;
  // # Test Verification Details
  // ## What Each Test Verifies
  await $`1. **Success Test** (✅): The original hello world outputs the correct message`;
  await $`2. **Failure Detection** (✅): When we break the output, the test correctly fails`;
  await $`3. **Fix Verification** (✅): After restoring the correct output, the test passes again`;
  // ## Why This Matters
  await $`This three-step verification ensures that:`;
  await $`- The hello world implementation actually works`;
  await $`- The test suite can detect when it's broken`;
  await $`- The test suite confirms when it's fixed`;
  await $`A configuration only gets a PASS status if all three checks succeed.`;
  // # Detailed Test Logs
  await $`The full test execution details are available in the console output above.`;
  await $`Each test shows the three steps:`;
  await $`1. Original test (should pass)`;
  await $`2. Broken test (should fail)`;
  await $`3. Fixed test (should pass)`;
  await $`EOF`;
  // Display results
  await $`echo`;
  await $`log INFO "==============================================="`;
  await $`log INFO "Test Results Summary"`;
  await $`log INFO "==============================================="`;
  console.log("-e ");${BLUE}Total Tests:${NC} $TOTAL_TESTS"
  console.log("-e ");${GREEN}Passed:${NC} $PASSED_TESTS"
  console.log("-e ");${RED}Failed:${NC} $FAILED_TESTS"
  console.log("-e ");${YELLOW}Success Rate:${NC} $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%"
  await $`echo`;
  await $`log INFO "Detailed report saved to: $REPORT_FILE"`;
  await $`log INFO "Test samples created in: $TEST_DIR/"`;
  // Exit with appropriate code
  await $`[ $FAILED_TESTS -eq 0 ] && exit 0 || exit 1`;
  await $`}`;
  // Run main function
  await $`main "$@"`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}