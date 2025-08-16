#!/usr/bin/env bun
/**
 * Migrated from: demonstrate_failure_detection.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.696Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Demonstration of Failure Detection Testing
  // This script proves that tests can detect when hello world outputs are broken
  await $`set -e`;
  // Colors
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`BLUE='\033[0;34m'`;
  await $`MAGENTA='\033[0;35m'`;
  await $`NC='\033[0m'`;
  console.log("-e ");${MAGENTA}=====================================================${NC}"
  console.log("-e ");${MAGENTA}FAILURE DETECTION DEMONSTRATION${NC}"
  console.log("-e ");${MAGENTA}Proving tests can detect broken hello world outputs${NC}"
  console.log("-e ");${MAGENTA}=====================================================${NC}"
  await $`echo`;
  // Create test directory
  await $`TEST_DIR="failure_detection_demo"`;
  await rm(""$TEST_DIR"", { recursive: true, force: true });
  await mkdir(""$TEST_DIR"", { recursive: true });
  // ============================================
  // PYTHON FAILURE DETECTION TEST
  // ============================================
  console.log("-e ");${BLUE}=== PYTHON FAILURE DETECTION TEST ===${NC}"
  await $`echo`;
  // Create Python hello world
  await $`cat > "$TEST_DIR/hello.py" << 'EOF'`;
  await $`print("Hello World from Python!")`;
  await $`EOF`;
  // Create Python test
  await $`cat > "$TEST_DIR/test_python.py" << 'EOF'`;
  await $`import subprocess`;
  await $`import sys`;
  await $`def test_hello():`;
  await $`result = subprocess.run([sys.executable, 'hello.py'],`;
  await $`capture_output=True, text=True, cwd='.')`;
  await $`expected = "Hello World from Python!"`;
  await $`if expected in result.stdout:`;
  await $`print("✅ TEST PASSED: Found expected output")`;
  await $`return True`;
  await $`else:`;
  await $`print(f"❌ TEST FAILED: Expected '{expected}' but got '{result.stdout.strip()}'")`;
  await $`return False`;
  await $`if __name__ == "__main__":`;
  await $`if test_hello():`;
  await $`sys.exit(0)`;
  await $`else:`;
  await $`sys.exit(1)`;
  await $`EOF`;
  await $`chmod +x "$TEST_DIR/test_python.py"`;
  console.log("-e ");${YELLOW}Step 1: Test with CORRECT output${NC}"
  process.chdir(""$TEST_DIR"");
  await $`python3 hello.py`;
  console.log("-n ");Running test: "
  await $`if python3 test_python.py; then`;
  console.log("-e ");${GREEN}✓ Test correctly PASSES when output is correct${NC}"
  } else {
  console.log("-e ");${RED}✗ Test incorrectly fails${NC}"
  }
  process.chdir("- > /dev/null");
  await $`echo`;
  console.log("-e ");${YELLOW}Step 2: BREAK the output (change Hello to Goodbye)${NC}"
  await $`sed -i 's/Hello World/Goodbye World/g' "$TEST_DIR/hello.py"`;
  process.chdir(""$TEST_DIR"");
  console.log("New output: $(python3 hello.py)");
  console.log("-n ");Running test: "
  await $`if python3 test_python.py 2>/dev/null; then`;
  console.log("-e ");${RED}✗ PROBLEM: Test didn't detect the broken output!${NC}"
  } else {
  console.log("-e ");${GREEN}✓ GOOD: Test correctly FAILED when output was wrong${NC}"
  }
  process.chdir("- > /dev/null");
  await $`echo`;
  console.log("-e ");${YELLOW}Step 3: FIX the output (change back to Hello)${NC}"
  await $`sed -i 's/Goodbye World/Hello World/g' "$TEST_DIR/hello.py"`;
  process.chdir(""$TEST_DIR"");
  await $`python3 hello.py`;
  console.log("-n ");Running test: "
  await $`if python3 test_python.py; then`;
  console.log("-e ");${GREEN}✓ Test correctly PASSES again after fix${NC}"
  } else {
  console.log("-e ");${RED}✗ Test still failing after fix${NC}"
  }
  process.chdir("- > /dev/null");
  await $`echo`;
  // ============================================
  // JAVASCRIPT FAILURE DETECTION TEST
  // ============================================
  console.log("-e ");${BLUE}=== JAVASCRIPT FAILURE DETECTION TEST ===${NC}"
  await $`echo`;
  // Create JavaScript hello world
  await $`cat > "$TEST_DIR/hello.js" << 'EOF'`;
  await $`console.log("Hello World from JavaScript!");`;
  await $`EOF`;
  // Create JavaScript test
  await $`cat > "$TEST_DIR/test_javascript.js" << 'EOF'`;
  await $`const { execSync } = require('child_process');`;
  await $`function testHello() {`;
  await $`try {`;
  await $`const output = execSync('node hello.js', { encoding: 'utf8' });`;
  await $`const expected = "Hello World from JavaScript!";`;
  await $`if (output.includes(expected)) {`;
  await $`console.log("✅ TEST PASSED: Found expected output");`;
  await $`return true;`;
  await $`} else {`;
  await $`console.log(`❌ TEST FAILED: Expected '${expected}' but got '${output.trim()}'`);`;
  await $`return false;`;
  await $`}`;
  await $`} catch (error) {`;
  await $`console.log("❌ TEST FAILED: Error running hello.js");`;
  await $`return false;`;
  await $`}`;
  await $`}`;
  await $`if (!testHello()) {`;
  await $`process.exit(1);`;
  await $`}`;
  await $`EOF`;
  console.log("-e ");${YELLOW}Step 1: Test with CORRECT output${NC}"
  process.chdir(""$TEST_DIR"");
  await $`node hello.js`;
  console.log("-n ");Running test: "
  await $`if node test_javascript.js; then`;
  console.log("-e ");${GREEN}✓ Test correctly PASSES when output is correct${NC}"
  } else {
  console.log("-e ");${RED}✗ Test incorrectly fails${NC}"
  }
  process.chdir("- > /dev/null");
  await $`echo`;
  console.log("-e ");${YELLOW}Step 2: BREAK the output (change Hello to Error)${NC}"
  await $`sed -i 's/Hello World/Error Message/g' "$TEST_DIR/hello.js"`;
  process.chdir(""$TEST_DIR"");
  console.log("New output: $(node hello.js)");
  console.log("-n ");Running test: "
  await $`if node test_javascript.js 2>/dev/null; then`;
  console.log("-e ");${RED}✗ PROBLEM: Test didn't detect the broken output!${NC}"
  } else {
  console.log("-e ");${GREEN}✓ GOOD: Test correctly FAILED when output was wrong${NC}"
  }
  process.chdir("- > /dev/null");
  await $`echo`;
  console.log("-e ");${YELLOW}Step 3: FIX the output (change back to Hello)${NC}"
  await $`sed -i 's/Error Message/Hello World/g' "$TEST_DIR/hello.js"`;
  process.chdir(""$TEST_DIR"");
  await $`node hello.js`;
  console.log("-n ");Running test: "
  await $`if node test_javascript.js; then`;
  console.log("-e ");${GREEN}✓ Test correctly PASSES again after fix${NC}"
  } else {
  console.log("-e ");${RED}✗ Test still failing after fix${NC}"
  }
  process.chdir("- > /dev/null");
  await $`echo`;
  // ============================================
  // C++ FAILURE DETECTION TEST
  // ============================================
  console.log("-e ");${BLUE}=== C++ FAILURE DETECTION TEST ===${NC}"
  await $`echo`;
  // Create C++ hello world
  await $`cat > "$TEST_DIR/hello.cpp" << 'EOF'`;
  // include <iostream>
  await $`int main() {`;
  await $`std::cout << "Hello World from C++!" << std::endl;`;
  await $`return 0;`;
  await $`}`;
  await $`EOF`;
  // Create test script for C++
  await $`cat > "$TEST_DIR/test_cpp.sh" << 'EOF'`;
  // Compile
  await $`g++ -o hello_cpp hello.cpp 2>/dev/null`;
  if ($? -ne 0 ) {; then
  console.log("❌ TEST FAILED: Compilation error");
  process.exit(1);
  }
  // Run and check output
  await $`output=$(./hello_cpp)`;
  await $`expected="Hello World from C++!"`;
  await $`if echo "$output" | grep -q "$expected"; then`;
  console.log("✅ TEST PASSED: Found expected output");
  process.exit(0);
  } else {
  console.log("❌ TEST FAILED: Expected '$expected' but got '$output'");
  process.exit(1);
  }
  await $`EOF`;
  await $`chmod +x "$TEST_DIR/test_cpp.sh"`;
  console.log("-e ");${YELLOW}Step 1: Test with CORRECT output${NC}"
  process.chdir(""$TEST_DIR"");
  await $`g++ -o hello_cpp hello.cpp`;
  await $`./hello_cpp`;
  console.log("-n ");Running test: "
  await $`if ./test_cpp.sh; then`;
  console.log("-e ");${GREEN}✓ Test correctly PASSES when output is correct${NC}"
  } else {
  console.log("-e ");${RED}✗ Test incorrectly fails${NC}"
  }
  process.chdir("- > /dev/null");
  await $`echo`;
  console.log("-e ");${YELLOW}Step 2: BREAK the output (change Hello to Broken)${NC}"
  await $`sed -i 's/Hello World/Broken Output/g' "$TEST_DIR/hello.cpp"`;
  process.chdir(""$TEST_DIR"");
  await $`g++ -o hello_cpp hello.cpp`;
  console.log("New output: $(./hello_cpp)");
  console.log("-n ");Running test: "
  await $`if ./test_cpp.sh 2>/dev/null; then`;
  console.log("-e ");${RED}✗ PROBLEM: Test didn't detect the broken output!${NC}"
  } else {
  console.log("-e ");${GREEN}✓ GOOD: Test correctly FAILED when output was wrong${NC}"
  }
  process.chdir("- > /dev/null");
  await $`echo`;
  console.log("-e ");${YELLOW}Step 3: FIX the output (change back to Hello)${NC}"
  await $`sed -i 's/Broken Output/Hello World/g' "$TEST_DIR/hello.cpp"`;
  process.chdir(""$TEST_DIR"");
  await $`g++ -o hello_cpp hello.cpp`;
  await $`./hello_cpp`;
  console.log("-n ");Running test: "
  await $`if ./test_cpp.sh; then`;
  console.log("-e ");${GREEN}✓ Test correctly PASSES again after fix${NC}"
  } else {
  console.log("-e ");${RED}✗ Test still failing after fix${NC}"
  }
  process.chdir("- > /dev/null");
  await $`echo`;
  // ============================================
  // SUMMARY
  // ============================================
  console.log("-e ");${MAGENTA}=====================================================${NC}"
  console.log("-e ");${MAGENTA}SUMMARY OF FAILURE DETECTION${NC}"
  console.log("-e ");${MAGENTA}=====================================================${NC}"
  await $`echo`;
  console.log("This demonstration proves that:");
  console.log("-e ");${GREEN}✅ All tests PASS when hello world outputs are correct${NC}"
  console.log("-e ");${GREEN}✅ All tests FAIL when hello world outputs are broken${NC}"
  console.log("-e ");${GREEN}✅ All tests PASS again when outputs are fixed${NC}"
  await $`echo`;
  console.log("This confirms that the test system can properly detect failures!");
  await $`echo`;
  console.log("Test files are available in: $TEST_DIR/");
  console.log("You can manually verify by running:");
  console.log("  - Python: cd $TEST_DIR && python3 test_python.py");
  console.log("  - JavaScript: cd $TEST_DIR && node test_javascript.js");
  console.log("  - C++: cd $TEST_DIR && ./test_cpp.sh");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}