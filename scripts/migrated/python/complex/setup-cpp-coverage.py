#!/usr/bin/env python3
"""
Migrated from: setup-cpp-coverage.sh
Auto-generated Python - 2025-08-16T04:57:27.749Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Setup script for C++ coverage configuration
    # Configures LLVM coverage tools and CMake for C++ projects
    subprocess.run("set -e", shell=True)
    subprocess.run("PROJECT_PATH="${1:-.}"", shell=True)
    subprocess.run("COVERAGE_TOOL="${2:-llvm}" # llvm or gcc", shell=True)
    subprocess.run("THRESHOLD_LINE="${3:-80}"", shell=True)
    subprocess.run("THRESHOLD_BRANCH="${4:-75}"", shell=True)
    subprocess.run("THRESHOLD_FUNCTION="${5:-80}"", shell=True)
    subprocess.run("THRESHOLD_CLASS="${6:-90}"", shell=True)
    print("🔧 Setting up C++ coverage for project: $PROJECT_PATH")
    # Create coverage configuration directory
    Path(""$PROJECT_PATH/.coverage"").mkdir(parents=True, exist_ok=True)
    # Generate coverage configuration
    subprocess.run("cat > "$PROJECT_PATH/.coverage/config.json" << EOF", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""tool": "$COVERAGE_TOOL",", shell=True)
    subprocess.run(""thresholds": {", shell=True)
    subprocess.run(""line": $THRESHOLD_LINE,", shell=True)
    subprocess.run(""branch": $THRESHOLD_BRANCH,", shell=True)
    subprocess.run(""function": $THRESHOLD_FUNCTION,", shell=True)
    subprocess.run(""class": $THRESHOLD_CLASS", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run(""exclude": [", shell=True)
    subprocess.run(""*/test/*",", shell=True)
    subprocess.run(""*/tests/*",", shell=True)
    subprocess.run(""*/third_party/*",", shell=True)
    subprocess.run(""*/external/*",", shell=True)
    subprocess.run(""*/build/*"", shell=True)
    subprocess.run("],", shell=True)
    subprocess.run(""reportFormats": ["html", "json", "lcov"],", shell=True)
    subprocess.run(""reportDirectory": "coverage"", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF", shell=True)
    # Create CMakeLists.txt additions for coverage
    subprocess.run("cat > "$PROJECT_PATH/.coverage/coverage.cmake" << 'EOF'", shell=True)
    # Coverage configuration for C++ projects
    subprocess.run("option(ENABLE_COVERAGE "Enable coverage reporting" OFF)", shell=True)
    subprocess.run("if(ENABLE_COVERAGE)", shell=True)
    subprocess.run("if(CMAKE_CXX_COMPILER_ID MATCHES "Clang")", shell=True)
    # LLVM/Clang coverage
    subprocess.run("message(STATUS "Configuring LLVM coverage")", shell=True)
    subprocess.run("set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fprofile-instr-generate -fcoverage-mapping")", shell=True)
    subprocess.run("set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -fprofile-instr-generate -fcoverage-mapping")", shell=True)
    subprocess.run("set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -fprofile-instr-generate -fcoverage-mapping")", shell=True)
    # Add custom target for coverage
    subprocess.run("add_custom_target(coverage", shell=True)
    subprocess.run("COMMAND LLVM_PROFILE_FILE=default.profraw $<TARGET_FILE:${PROJECT_NAME}_tests>", shell=True)
    subprocess.run("COMMAND llvm-profdata merge -sparse default.profraw -o default.profdata", shell=True)
    subprocess.run("COMMAND llvm-cov report $<TARGET_FILE:${PROJECT_NAME}_tests> -instr-profile=default.profdata", shell=True)
    subprocess.run("COMMAND llvm-cov show $<TARGET_FILE:${PROJECT_NAME}_tests> -instr-profile=default.profdata -format=html -output-dir=${CMAKE_BINARY_DIR}/coverage", shell=True)
    subprocess.run("WORKING_DIRECTORY ${CMAKE_BINARY_DIR}", shell=True)
    subprocess.run("COMMENT "Generating coverage report with LLVM"", shell=True)
    subprocess.run(")", shell=True)
    subprocess.run("elseif(CMAKE_CXX_COMPILER_ID MATCHES "GNU")", shell=True)
    # GCC/gcov coverage
    subprocess.run("message(STATUS "Configuring GCC coverage")", shell=True)
    subprocess.run("set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} --coverage -fprofile-arcs -ftest-coverage")", shell=True)
    subprocess.run("set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} --coverage -fprofile-arcs -ftest-coverage")", shell=True)
    subprocess.run("set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} --coverage")", shell=True)
    # Add custom target for coverage
    subprocess.run("add_custom_target(coverage", shell=True)
    subprocess.run("COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_BINARY_DIR}/coverage", shell=True)
    subprocess.run("COMMAND $<TARGET_FILE:${PROJECT_NAME}_tests>", shell=True)
    subprocess.run("COMMAND lcov --capture --directory . --output-file coverage.info", shell=True)
    subprocess.run("COMMAND lcov --remove coverage.info '/usr/*' '*/test/*' --output-file coverage.info", shell=True)
    subprocess.run("COMMAND genhtml coverage.info --output-directory ${CMAKE_BINARY_DIR}/coverage", shell=True)
    subprocess.run("WORKING_DIRECTORY ${CMAKE_BINARY_DIR}", shell=True)
    subprocess.run("COMMENT "Generating coverage report with gcov"", shell=True)
    subprocess.run(")", shell=True)
    subprocess.run("else()", shell=True)
    subprocess.run("message(WARNING "Coverage not supported for compiler: ${CMAKE_CXX_COMPILER_ID}")", shell=True)
    subprocess.run("endif()", shell=True)
    subprocess.run("endif()", shell=True)
    # Function to add coverage to a target
    subprocess.run("function(add_coverage_target TARGET_NAME)", shell=True)
    subprocess.run("if(ENABLE_COVERAGE)", shell=True)
    subprocess.run("if(CMAKE_CXX_COMPILER_ID MATCHES "Clang")", shell=True)
    subprocess.run("target_compile_options(${TARGET_NAME} PRIVATE -fprofile-instr-generate -fcoverage-mapping)", shell=True)
    subprocess.run("target_link_options(${TARGET_NAME} PRIVATE -fprofile-instr-generate -fcoverage-mapping)", shell=True)
    subprocess.run("elseif(CMAKE_CXX_COMPILER_ID MATCHES "GNU")", shell=True)
    subprocess.run("target_compile_options(${TARGET_NAME} PRIVATE --coverage)", shell=True)
    subprocess.run("target_link_libraries(${TARGET_NAME} PRIVATE gcov)", shell=True)
    subprocess.run("endif()", shell=True)
    subprocess.run("endif()", shell=True)
    subprocess.run("endfunction()", shell=True)
    subprocess.run("EOF", shell=True)
    # Create coverage check script
    subprocess.run("cat > "$PROJECT_PATH/.coverage/check-coverage.sh" << 'EOF'", shell=True)
    # Check coverage thresholds
    subprocess.run("CONFIG_FILE=".coverage/config.json"", shell=True)
    if ! -f "$CONFIG_FILE" :; then
    print("❌ Coverage configuration not found")
    sys.exit(1)
    # Extract thresholds
    subprocess.run("LINE_THRESHOLD=$(jq -r '.thresholds.line' "$CONFIG_FILE")", shell=True)
    subprocess.run("BRANCH_THRESHOLD=$(jq -r '.thresholds.branch' "$CONFIG_FILE")", shell=True)
    # Run coverage
    subprocess.run("cmake -B build -DENABLE_COVERAGE=ON", shell=True)
    subprocess.run("cmake --build build", shell=True)
    os.chdir("build && make coverage")
    # Check thresholds (simplified - would need actual parsing)
    print("✅ Coverage report generated in build/coverage/")
    print("📊 Thresholds: Line: $LINE_THRESHOLD%, Branch: $BRANCH_THRESHOLD%")
    subprocess.run("EOF", shell=True)
    subprocess.run("chmod +x "$PROJECT_PATH/.coverage/check-coverage.sh"", shell=True)
    # Create .gitignore for coverage files
    subprocess.run("cat >> "$PROJECT_PATH/.gitignore" << 'EOF'", shell=True)
    # Coverage files
    subprocess.run("*.profraw", shell=True)
    subprocess.run("*.profdata", shell=True)
    subprocess.run("*.gcda", shell=True)
    subprocess.run("*.gcno", shell=True)
    subprocess.run("*.gcov", shell=True)
    subprocess.run("coverage/", shell=True)
    subprocess.run("coverage.info", shell=True)
    subprocess.run(".coverage/", shell=True)
    subprocess.run("EOF", shell=True)
    print("✅ C++ coverage setup complete!")
    print("")
    print("📝 To use coverage in your CMake project:")
    print("   1. Add to your CMakeLists.txt:")
    print("      include(.coverage/coverage.cmake)")
    print("")
    print("   2. Build with coverage:")
    print("      cmake -B build -DENABLE_COVERAGE=ON")
    print("      cmake --build build")
    print("      make coverage")
    print("")
    print("   3. Check coverage:")
    print("      ./.coverage/check-coverage.sh")
    print("")
    print("📊 Coverage reports will be in: build/coverage/")

if __name__ == "__main__":
    main()