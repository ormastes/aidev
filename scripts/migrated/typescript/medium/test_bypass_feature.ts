#!/usr/bin/env bun
/**
 * Migrated from: test_bypass_feature.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.596Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  console.log("=== Testing Bypass Build Feature ===");
  // Ensure we have built executables
  if ([ ! -f "build/hello_tests" ]) {; then
  console.log("Building demo first...");
  await $`./build_manual.sh`;
  console.log("");
  }
  console.log("1. Testing DEFAULT behavior (buildBeforeTest: true)");
  console.log("   - This should trigger builds when code changes");
  console.log("   - Default configuration should build before running tests");
  // Create a test configuration with default build behavior
  await $`cat > .vscode/settings_build_enabled.json << 'EOF'`;
  await $`{`;
  await $`"cdoctest.useCmakeTarget": true,`;
  await $`"cdoctest.buildDirectory": "${workspaceFolder}/build",`;
  await $`"cdoctest.exe_executable": "${workspaceFolder}/build/hello_tests",`;
  await $`"cdoctest.buildBeforeTest": true,`;
  await $`"cdoctest.exe_buildBeforeTest": true,`;
  await $`"cdoctest.bin_buildBeforeTest": true,`;
  await $`"ctest.buildBeforeTest": true,`;
  await $`"cdoctest.exe_listTestArgPattern": "GetTcList:",`;
  await $`"cdoctest.exe_testRunArgPattern": "TC/${test_suite_name}::${test_case_name}"`;
  await $`}`;
  await $`EOF`;
  console.log("✓ Created configuration with building enabled");
  console.log("");
  console.log("2. Testing BYPASS behavior (buildBeforeTest: false)");
  console.log("   - This should skip builds and run existing executables directly");
  console.log("   - Should be much faster as it bypasses compilation");
  // Create a test configuration with bypass build behavior
  await $`cat > .vscode/settings_build_bypassed.json << 'EOF'`;
  await $`{`;
  await $`"cdoctest.useCmakeTarget": true,`;
  await $`"cdoctest.buildDirectory": "${workspaceFolder}/build",`;
  await $`"cdoctest.exe_executable": "${workspaceFolder}/build/hello_tests",`;
  await $`"cdoctest.buildBeforeTest": false,`;
  await $`"cdoctest.exe_buildBeforeTest": false,`;
  await $`"cdoctest.bin_buildBeforeTest": false,`;
  await $`"ctest.buildBeforeTest": false,`;
  await $`"cdoctest.exe_listTestArgPattern": "GetTcList:",`;
  await $`"cdoctest.exe_testRunArgPattern": "TC/${test_suite_name}::${test_case_name}"`;
  await $`}`;
  await $`EOF`;
  console.log("✓ Created configuration with building bypassed");
  console.log("");
  console.log("3. Simulating code changes to test rebuild behavior");
  // Create original source backup
  await copyFile("src/hello.cpp", "src/hello.cpp.backup");
  // Modify source code to simulate changes
  console.log("Modifying source code...");
  await $`sed -i 's/Hello, /Greetings, /g' src/hello.cpp`;
  console.log("✓ Modified hello.cpp - changed 'Hello,' to 'Greetings,'");
  console.log("");
  console.log("4. Test with BUILD ENABLED configuration:");
  console.log("   (In real usage, this would trigger CMake build)");
  // Copy the build-enabled settings
  await copyFile(".vscode/settings_build_enabled.json", ".vscode/settings.json");
  // Run the test executable directly to show what would happen
  console.log("   Direct test execution (simulating post-build result):");
  process.chdir("build && ./hello_tests GetTcList: && echo "   → Would rebuild and run with new 'Greetings,' messages"");
  process.chdir("..");
  console.log("");
  console.log("5. Test with BUILD BYPASSED configuration:");
  console.log("   (This should use existing executable, showing old 'Hello,' messages)");
  // Copy the bypass settings
  await copyFile(".vscode/settings_build_bypassed.json", ".vscode/settings.json");
  console.log("   Direct test execution (simulating bypass behavior):");
  process.chdir("build && ./hello_tests "TC/HelloSuite::BasicGreeting" && echo "   → Used existing executable, still shows old behavior"");
  process.chdir("..");
  console.log("");
  console.log("6. Performance comparison simulation:");
  console.log("   WITH BUILD (simulated):");
  console.log("   - Time: ~2-5 seconds (includes compilation time)");
  console.log("   - Output: Updated code results");
  console.log("");
  console.log("   WITH BYPASS:");
  await $`time (cd build && ./hello_tests "TC/HelloSuite::BasicGreeting" > /dev/null)`;
  console.log("   - Output: Existing executable results (no rebuild)");
  console.log("");
  console.log("7. Cleanup and restore");
  await rename("src/hello.cpp.backup", "src/hello.cpp");
  console.log("✓ Restored original source code");
  // Rebuild to have clean executables
  console.log("Rebuilding with original code...");
  process.chdir("build");
  await $`g++ -std=c++17 -I../include ../src/test_main.cpp ../src/hello.cpp -o hello_tests`;
  process.chdir("..");
  console.log("");
  console.log("=== Test Summary ===");
  console.log("✅ Default behavior: Builds before running tests (safer, always up-to-date)");
  console.log("✅ Bypass behavior: Skips builds, runs existing executables (faster)");
  console.log("✅ Configuration works through buildBeforeTest settings");
  console.log("✅ Demo project supports both modes");
  console.log("");
  console.log("To use in VSCode:");
  console.log("1. Open this folder in VSCode with CDocTest extension");
  console.log("2. Set buildBeforeTest to false in .vscode/settings.json to bypass");
  console.log("3. Set buildBeforeTest to true (default) to rebuild on changes");
  await $`rm -f .vscode/settings_build_enabled.json .vscode/settings_build_bypassed.json`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}