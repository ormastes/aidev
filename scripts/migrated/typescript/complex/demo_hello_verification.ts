#!/usr/bin/env bun
/**
 * Migrated from: demo_hello_verification.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.727Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Demo script showing hello world verification with failure detection
  // This demonstrates that tests properly detect broken outputs
  await $`set -e`;
  // Colors
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`BLUE='\033[0;34m'`;
  await $`NC='\033[0m'`;
  console.log("-e ");${BLUE}================================================${NC}"
  console.log("-e ");${BLUE}Hello World Verification Demo${NC}"
  console.log("-e ");${BLUE}================================================${NC}"
  await $`echo`;
  // Create test directory
  await $`TEST_DIR="hello_demo"`;
  await rm(""$TEST_DIR"", { recursive: true, force: true });
  await mkdir(""$TEST_DIR"", { recursive: true });
  console.log("-e ");${YELLOW}Creating hello world samples in multiple languages...${NC}"
  await $`echo`;
  // 1. Python Hello World
  console.log("-e ");${BLUE}1. Python Hello World${NC}"
  await $`cat > "$TEST_DIR/hello.py" << 'EOF'`;
  await $`print("Hello from Python!")`;
  await $`EOF`;
  await $`chmod +x "$TEST_DIR/hello.py"`;
  console.log("   Testing original (should pass):");
  await $`if python3 "$TEST_DIR/hello.py" | grep -q "Hello from Python"; then`;
  console.log("-e ");   ${GREEN}✓ Test passed - outputs correct message${NC}"
  } else {
  console.log("-e ");   ${RED}✗ Test failed${NC}"
  }
  console.log("   Breaking the output:");
  await $`sed -i 's/Hello from Python!/Goodbye from Python!/g' "$TEST_DIR/hello.py" 2>/dev/null || \`;
  await $`sed -i '' 's/Hello from Python!/Goodbye from Python!/g' "$TEST_DIR/hello.py" 2>/dev/null`;
  await $`if python3 "$TEST_DIR/hello.py" | grep -q "Hello from Python"; then`;
  console.log("-e ");   ${RED}✗ Test didn't detect broken output!${NC}"
  } else {
  console.log("-e ");   ${GREEN}✓ Test correctly detected broken output${NC}"
  }
  console.log("   Fixing the output:");
  await $`sed -i 's/Goodbye from Python!/Hello from Python!/g' "$TEST_DIR/hello.py" 2>/dev/null || \`;
  await $`sed -i '' 's/Goodbye from Python!/Hello from Python!/g' "$TEST_DIR/hello.py" 2>/dev/null`;
  await $`if python3 "$TEST_DIR/hello.py" | grep -q "Hello from Python"; then`;
  console.log("-e ");   ${GREEN}✓ Test passes after fix${NC}"
  } else {
  console.log("-e ");   ${RED}✗ Test still failing after fix${NC}"
  }
  await $`echo`;
  // 2. JavaScript/Node.js Hello World
  console.log("-e ");${BLUE}2. JavaScript/Node.js Hello World${NC}"
  await $`cat > "$TEST_DIR/hello.js" << 'EOF'`;
  await $`console.log("Hello from JavaScript!");`;
  await $`EOF`;
  console.log("   Testing original (should pass):");
  await $`if node "$TEST_DIR/hello.js" | grep -q "Hello from JavaScript"; then`;
  console.log("-e ");   ${GREEN}✓ Test passed - outputs correct message${NC}"
  } else {
  console.log("-e ");   ${RED}✗ Test failed${NC}"
  }
  console.log("   Breaking the output:");
  await $`sed -i 's/Hello from JavaScript!/Broken JavaScript!/g' "$TEST_DIR/hello.js" 2>/dev/null || \`;
  await $`sed -i '' 's/Hello from JavaScript!/Broken JavaScript!/g' "$TEST_DIR/hello.js" 2>/dev/null`;
  await $`if node "$TEST_DIR/hello.js" | grep -q "Hello from JavaScript"; then`;
  console.log("-e ");   ${RED}✗ Test didn't detect broken output!${NC}"
  } else {
  console.log("-e ");   ${GREEN}✓ Test correctly detected broken output${NC}"
  }
  console.log("   Fixing the output:");
  await $`sed -i 's/Broken JavaScript!/Hello from JavaScript!/g' "$TEST_DIR/hello.js" 2>/dev/null || \`;
  await $`sed -i '' 's/Broken JavaScript!/Hello from JavaScript!/g' "$TEST_DIR/hello.js" 2>/dev/null`;
  await $`if node "$TEST_DIR/hello.js" | grep -q "Hello from JavaScript"; then`;
  console.log("-e ");   ${GREEN}✓ Test passes after fix${NC}"
  } else {
  console.log("-e ");   ${RED}✗ Test still failing after fix${NC}"
  }
  await $`echo`;
  // 3. C++ Hello World
  console.log("-e ");${BLUE}3. C++ Hello World${NC}"
  await $`cat > "$TEST_DIR/hello.cpp" << 'EOF'`;
  // include <iostream>
  await $`int main() {`;
  await $`std::cout << "Hello from C++!" << std::endl;`;
  await $`return 0;`;
  await $`}`;
  await $`EOF`;
  console.log("   Compiling C++ program:");
  await $`g++ -o "$TEST_DIR/hello_cpp" "$TEST_DIR/hello.cpp"`;
  console.log("-e ");   ${GREEN}✓ Compilation successful${NC}"
  console.log("   Testing original (should pass):");
  await $`if "$TEST_DIR/hello_cpp" | grep -q "Hello from C++"; then`;
  console.log("-e ");   ${GREEN}✓ Test passed - outputs correct message${NC}"
  } else {
  console.log("-e ");   ${RED}✗ Test failed${NC}"
  }
  console.log("   Breaking the output:");
  await $`sed -i 's/Hello from C++!/Error from C++!/g' "$TEST_DIR/hello.cpp" 2>/dev/null || \`;
  await $`sed -i '' 's/Hello from C++!/Error from C++!/g' "$TEST_DIR/hello.cpp" 2>/dev/null`;
  await $`g++ -o "$TEST_DIR/hello_cpp" "$TEST_DIR/hello.cpp" 2>/dev/null`;
  await $`if "$TEST_DIR/hello_cpp" | grep -q "Hello from C++"; then`;
  console.log("-e ");   ${RED}✗ Test didn't detect broken output!${NC}"
  } else {
  console.log("-e ");   ${GREEN}✓ Test correctly detected broken output${NC}"
  }
  console.log("   Fixing the output:");
  await $`sed -i 's/Error from C++!/Hello from C++!/g' "$TEST_DIR/hello.cpp" 2>/dev/null || \`;
  await $`sed -i '' 's/Error from C++!/Hello from C++!/g' "$TEST_DIR/hello.cpp" 2>/dev/null`;
  await $`g++ -o "$TEST_DIR/hello_cpp" "$TEST_DIR/hello.cpp" 2>/dev/null`;
  await $`if "$TEST_DIR/hello_cpp" | grep -q "Hello from C++"; then`;
  console.log("-e ");   ${GREEN}✓ Test passes after fix${NC}"
  } else {
  console.log("-e ");   ${RED}✗ Test still failing after fix${NC}"
  }
  await $`echo`;
  // 4. Bash Hello World
  console.log("-e ");${BLUE}4. Bash Hello World${NC}"
  await $`cat > "$TEST_DIR/hello.sh" << 'EOF'`;
  console.log("Hello from Bash!");
  await $`EOF`;
  await $`chmod +x "$TEST_DIR/hello.sh"`;
  console.log("   Testing original (should pass):");
  await $`if "$TEST_DIR/hello.sh" | grep -q "Hello from Bash"; then`;
  console.log("-e ");   ${GREEN}✓ Test passed - outputs correct message${NC}"
  } else {
  console.log("-e ");   ${RED}✗ Test failed${NC}"
  }
  console.log("   Breaking the output:");
  await $`sed -i 's/Hello from Bash!/Failed Bash!/g' "$TEST_DIR/hello.sh" 2>/dev/null || \`;
  await $`sed -i '' 's/Hello from Bash!/Failed Bash!/g' "$TEST_DIR/hello.sh" 2>/dev/null`;
  await $`if "$TEST_DIR/hello.sh" | grep -q "Hello from Bash"; then`;
  console.log("-e ");   ${RED}✗ Test didn't detect broken output!${NC}"
  } else {
  console.log("-e ");   ${GREEN}✓ Test correctly detected broken output${NC}"
  }
  console.log("   Fixing the output:");
  await $`sed -i 's/Failed Bash!/Hello from Bash!/g' "$TEST_DIR/hello.sh" 2>/dev/null || \`;
  await $`sed -i '' 's/Failed Bash!/Hello from Bash!/g' "$TEST_DIR/hello.sh" 2>/dev/null`;
  await $`if "$TEST_DIR/hello.sh" | grep -q "Hello from Bash"; then`;
  console.log("-e ");   ${GREEN}✓ Test passes after fix${NC}"
  } else {
  console.log("-e ");   ${RED}✗ Test still failing after fix${NC}"
  }
  await $`echo`;
  // Summary
  console.log("-e ");${BLUE}================================================${NC}"
  console.log("-e ");${BLUE}Summary${NC}"
  console.log("-e ");${BLUE}================================================${NC}"
  await $`echo`;
  console.log("This demo shows that:");
  console.log("1. All hello world implementations work correctly");
  console.log("2. Tests can detect when outputs are broken");
  console.log("3. Tests verify fixes restore correct behavior");
  await $`echo`;
  console.log("-e ");${GREEN}✓ All verification tests completed successfully!${NC}"
  await $`echo`;
  console.log("Test samples are in: $TEST_DIR/");
  await $`echo`;
  console.log("You can run individual samples:");
  console.log("  python3 $TEST_DIR/hello.py");
  console.log("  node $TEST_DIR/hello.js");
  console.log("  $TEST_DIR/hello_cpp");
  console.log("  $TEST_DIR/hello.sh");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}