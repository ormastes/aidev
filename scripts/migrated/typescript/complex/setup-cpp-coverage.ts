#!/usr/bin/env bun
/**
 * Migrated from: setup-cpp-coverage.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.749Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Setup script for C++ coverage configuration
  // Configures LLVM coverage tools and CMake for C++ projects
  await $`set -e`;
  await $`PROJECT_PATH="${1:-.}"`;
  await $`COVERAGE_TOOL="${2:-llvm}" # llvm or gcc`;
  await $`THRESHOLD_LINE="${3:-80}"`;
  await $`THRESHOLD_BRANCH="${4:-75}"`;
  await $`THRESHOLD_FUNCTION="${5:-80}"`;
  await $`THRESHOLD_CLASS="${6:-90}"`;
  console.log("🔧 Setting up C++ coverage for project: $PROJECT_PATH");
  // Create coverage configuration directory
  await mkdir(""$PROJECT_PATH/.coverage"", { recursive: true });
  // Generate coverage configuration
  await $`cat > "$PROJECT_PATH/.coverage/config.json" << EOF`;
  await $`{`;
  await $`"tool": "$COVERAGE_TOOL",`;
  await $`"thresholds": {`;
  await $`"line": $THRESHOLD_LINE,`;
  await $`"branch": $THRESHOLD_BRANCH,`;
  await $`"function": $THRESHOLD_FUNCTION,`;
  await $`"class": $THRESHOLD_CLASS`;
  await $`},`;
  await $`"exclude": [`;
  await $`"*/test/*",`;
  await $`"*/tests/*",`;
  await $`"*/third_party/*",`;
  await $`"*/external/*",`;
  await $`"*/build/*"`;
  await $`],`;
  await $`"reportFormats": ["html", "json", "lcov"],`;
  await $`"reportDirectory": "coverage"`;
  await $`}`;
  await $`EOF`;
  // Create CMakeLists.txt additions for coverage
  await $`cat > "$PROJECT_PATH/.coverage/coverage.cmake" << 'EOF'`;
  // Coverage configuration for C++ projects
  await $`option(ENABLE_COVERAGE "Enable coverage reporting" OFF)`;
  await $`if(ENABLE_COVERAGE)`;
  await $`if(CMAKE_CXX_COMPILER_ID MATCHES "Clang")`;
  // LLVM/Clang coverage
  await $`message(STATUS "Configuring LLVM coverage")`;
  await $`set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fprofile-instr-generate -fcoverage-mapping")`;
  await $`set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -fprofile-instr-generate -fcoverage-mapping")`;
  await $`set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -fprofile-instr-generate -fcoverage-mapping")`;
  // Add custom target for coverage
  await $`add_custom_target(coverage`;
  await $`COMMAND LLVM_PROFILE_FILE=default.profraw $<TARGET_FILE:${PROJECT_NAME}_tests>`;
  await $`COMMAND llvm-profdata merge -sparse default.profraw -o default.profdata`;
  await $`COMMAND llvm-cov report $<TARGET_FILE:${PROJECT_NAME}_tests> -instr-profile=default.profdata`;
  await $`COMMAND llvm-cov show $<TARGET_FILE:${PROJECT_NAME}_tests> -instr-profile=default.profdata -format=html -output-dir=${CMAKE_BINARY_DIR}/coverage`;
  await $`WORKING_DIRECTORY ${CMAKE_BINARY_DIR}`;
  await $`COMMENT "Generating coverage report with LLVM"`;
  await $`)`;
  await $`elseif(CMAKE_CXX_COMPILER_ID MATCHES "GNU")`;
  // GCC/gcov coverage
  await $`message(STATUS "Configuring GCC coverage")`;
  await $`set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} --coverage -fprofile-arcs -ftest-coverage")`;
  await $`set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} --coverage -fprofile-arcs -ftest-coverage")`;
  await $`set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} --coverage")`;
  // Add custom target for coverage
  await $`add_custom_target(coverage`;
  await $`COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_BINARY_DIR}/coverage`;
  await $`COMMAND $<TARGET_FILE:${PROJECT_NAME}_tests>`;
  await $`COMMAND lcov --capture --directory . --output-file coverage.info`;
  await $`COMMAND lcov --remove coverage.info '/usr/*' '*/test/*' --output-file coverage.info`;
  await $`COMMAND genhtml coverage.info --output-directory ${CMAKE_BINARY_DIR}/coverage`;
  await $`WORKING_DIRECTORY ${CMAKE_BINARY_DIR}`;
  await $`COMMENT "Generating coverage report with gcov"`;
  await $`)`;
  await $`else()`;
  await $`message(WARNING "Coverage not supported for compiler: ${CMAKE_CXX_COMPILER_ID}")`;
  await $`endif()`;
  await $`endif()`;
  // Function to add coverage to a target
  await $`function(add_coverage_target TARGET_NAME)`;
  await $`if(ENABLE_COVERAGE)`;
  await $`if(CMAKE_CXX_COMPILER_ID MATCHES "Clang")`;
  await $`target_compile_options(${TARGET_NAME} PRIVATE -fprofile-instr-generate -fcoverage-mapping)`;
  await $`target_link_options(${TARGET_NAME} PRIVATE -fprofile-instr-generate -fcoverage-mapping)`;
  await $`elseif(CMAKE_CXX_COMPILER_ID MATCHES "GNU")`;
  await $`target_compile_options(${TARGET_NAME} PRIVATE --coverage)`;
  await $`target_link_libraries(${TARGET_NAME} PRIVATE gcov)`;
  await $`endif()`;
  await $`endif()`;
  await $`endfunction()`;
  await $`EOF`;
  // Create coverage check script
  await $`cat > "$PROJECT_PATH/.coverage/check-coverage.sh" << 'EOF'`;
  // Check coverage thresholds
  await $`CONFIG_FILE=".coverage/config.json"`;
  if (! -f "$CONFIG_FILE" ) {; then
  console.log("❌ Coverage configuration not found");
  process.exit(1);
  }
  // Extract thresholds
  await $`LINE_THRESHOLD=$(jq -r '.thresholds.line' "$CONFIG_FILE")`;
  await $`BRANCH_THRESHOLD=$(jq -r '.thresholds.branch' "$CONFIG_FILE")`;
  // Run coverage
  await $`cmake -B build -DENABLE_COVERAGE=ON`;
  await $`cmake --build build`;
  process.chdir("build && make coverage");
  // Check thresholds (simplified - would need actual parsing)
  console.log("✅ Coverage report generated in build/coverage/");
  console.log("📊 Thresholds: Line: $LINE_THRESHOLD%, Branch: $BRANCH_THRESHOLD%");
  await $`EOF`;
  await $`chmod +x "$PROJECT_PATH/.coverage/check-coverage.sh"`;
  // Create .gitignore for coverage files
  await $`cat >> "$PROJECT_PATH/.gitignore" << 'EOF'`;
  // Coverage files
  await $`*.profraw`;
  await $`*.profdata`;
  await $`*.gcda`;
  await $`*.gcno`;
  await $`*.gcov`;
  await $`coverage/`;
  await $`coverage.info`;
  await $`.coverage/`;
  await $`EOF`;
  console.log("✅ C++ coverage setup complete!");
  console.log("");
  console.log("📝 To use coverage in your CMake project:");
  console.log("   1. Add to your CMakeLists.txt:");
  console.log("      include(.coverage/coverage.cmake)");
  console.log("");
  console.log("   2. Build with coverage:");
  console.log("      cmake -B build -DENABLE_COVERAGE=ON");
  console.log("      cmake --build build");
  console.log("      make coverage");
  console.log("");
  console.log("   3. Check coverage:");
  console.log("      ./.coverage/check-coverage.sh");
  console.log("");
  console.log("📊 Coverage reports will be in: build/coverage/");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}