#!/usr/bin/env bun
/**
 * Migrated from: run-system-tests.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.755Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // HEA Architecture System Tests Runner
  // This script runs comprehensive system tests for the HEA architecture
  await $`set -e`;
  console.log("======================================");
  console.log("HEA Architecture System Tests");
  console.log("======================================");
  console.log("");
  // Colors for output
  await $`GREEN='\033[0;32m'`;
  await $`RED='\033[0;31m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`NC='\033[0m' # No Color`;
  // Get the directory of this script
  await $`SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"`;
  await $`PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"`;
  process.chdir(""$PROJECT_DIR"");
  // Check if dependencies are installed
  if (! -d "node_modules" ) {; then
  console.log("-e ");${YELLOW}Installing dependencies...${NC}"
  await $`npm install`;
  }
  // Run TypeScript compilation check
  console.log("-e ");\n${YELLOW}1. Running TypeScript compilation check...${NC}"
  await $`if bunx tsc --noEmit --skipLibCheck; then`;
  console.log("-e ");${GREEN}✓ TypeScript compilation successful${NC}"
  } else {
  console.log("-e ");${RED}✗ TypeScript compilation failed${NC}"
  process.exit(1);
  }
  // Run layer validation tests
  console.log("-e ");\n${YELLOW}2. Running layer validation tests...${NC}"
  await $`if npm test -- tests/layer-validator.test.ts; then`;
  console.log("-e ");${GREEN}✓ Layer validation tests passed${NC}"
  } else {
  console.log("-e ");${RED}✗ Layer validation tests failed${NC}"
  process.exit(1);
  }
  // Run HEA system tests
  console.log("-e ");\n${YELLOW}3. Running HEA system tests...${NC}"
  await $`if npm test -- tests/hea-system.test.ts; then`;
  console.log("-e ");${GREEN}✓ HEA system tests passed${NC}"
  } else {
  console.log("-e ");${RED}✗ HEA system tests failed${NC}"
  process.exit(1);
  }
  // Run pipe system tests
  console.log("-e ");\n${YELLOW}4. Running pipe pattern system tests...${NC}"
  await $`if npm test -- tests/pipe-system.test.ts; then`;
  console.log("-e ");${GREEN}✓ Pipe system tests passed${NC}"
  } else {
  console.log("-e ");${RED}✗ Pipe system tests failed${NC}"
  process.exit(1);
  }
  // Run real-world scenario tests
  console.log("-e ");\n${YELLOW}5. Running real-world scenario tests...${NC}"
  await $`if npm test -- tests/hea-real-world.test.ts; then`;
  console.log("-e ");${GREEN}✓ Real-world scenario tests passed${NC}"
  } else {
  console.log("-e ");${RED}✗ Real-world scenario tests failed${NC}"
  process.exit(1);
  }
  // Run dependency graph tests
  console.log("-e ");\n${YELLOW}6. Running dependency graph analysis tests...${NC}"
  await $`if npm test -- tests/dependency-graph-system.test.ts; then`;
  console.log("-e ");${GREEN}✓ Dependency graph tests passed${NC}"
  } else {
  console.log("-e ");${RED}✗ Dependency graph tests failed${NC}"
  process.exit(1);
  }
  // Run all tests together with coverage
  console.log("-e ");\n${YELLOW}7. Running all tests with coverage...${NC}"
  await $`if npm test -- --coverage; then`;
  console.log("-e ");${GREEN}✓ All tests passed with coverage${NC}"
  } else {
  console.log("-e ");${RED}✗ Some tests failed${NC}"
  process.exit(1);
  }
  // Validate HEA structure in the actual project
  console.log("-e ");\n${YELLOW}8. Validating HEA structure in project...${NC}"
  await $`if node -e "`;
  await $`const { LayerValidator } = require('./dist/core/layer-validator');`;
  await $`const validator = new LayerValidator();`;
  await $`console.log('Layer validator loaded successfully');`;
  await $`process.exit(0);`;
  await $`" 2>/dev/null; then`;
  console.log("-e ");${GREEN}✓ HEA structure validation passed${NC}"
  } else {
  console.log("-e ");${YELLOW}! Could not validate compiled structure (build may be needed)${NC}"
  }
  console.log("-e ");\n======================================"
  console.log("-e ");${GREEN}All HEA system tests completed successfully!${NC}"
  console.log("======================================");
  // Generate test report
  console.log("-e ");\n${YELLOW}Generating test report...${NC}"
  await $`REPORT_FILE="$PROJECT_DIR/test-report-$(date +%Y%m%d-%H%M%S).txt"`;
  await $`cat > "$REPORT_FILE" << EOF`;
  await $`HEA Architecture System Test Report`;
  await $`Generated: $(date)`;
  await $`Test Results:`;
  await $`- TypeScript Compilation: PASSED`;
  await $`- Layer Validation: PASSED`;
  await $`- HEA System Tests: PASSED`;
  await $`- Pipe Pattern Tests: PASSED`;
  await $`- Real-World Scenarios: PASSED`;
  await $`- Dependency Graph Analysis: PASSED`;
  await $`Coverage Report:`;
  await $`$(npm test -- --coverage --silent 2>&1 | grep -A 10 "Coverage summary" || echo "Coverage data not available")`;
  await $`HEA Principles Validated:`;
  await $`1. Layer Hierarchy Enforcement ✓`;
  await $`2. Dependency Flow Validation ✓`;
  await $`3. Pipe Pattern Implementation ✓`;
  await $`4. Encapsulation Boundaries ✓`;
  await $`5. Circular Dependency Detection ✓`;
  await $`6. TypeScript Integration ✓`;
  await $`7. Real File System Analysis ✓`;
  await $`8. Module Resolution ✓`;
  await $`Notes:`;
  await $`- All tests use real file system operations`;
  await $`- No mocks were used in system tests`;
  await $`- TypeScript compilation validates import rules`;
  await $`- Pipe pattern ensures proper cross-layer communication`;
  await $`EOF`;
  console.log("-e ");${GREEN}Test report saved to: $REPORT_FILE${NC}"
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}