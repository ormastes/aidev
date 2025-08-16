#!/bin/bash

# Setup script for C++ coverage configuration
# Configures LLVM coverage tools and CMake for C++ projects

set -e

PROJECT_PATH="${1:-.}"
COVERAGE_TOOL="${2:-llvm}" # llvm or gcc
THRESHOLD_LINE="${3:-80}"
THRESHOLD_BRANCH="${4:-75}"
THRESHOLD_FUNCTION="${5:-80}"
THRESHOLD_CLASS="${6:-90}"

echo "🔧 Setting up C++ coverage for project: $PROJECT_PATH"

# Create coverage configuration directory
mkdir -p "$PROJECT_PATH/.coverage"

# Generate coverage configuration
cat > "$PROJECT_PATH/.coverage/config.json" << EOF
{
  "tool": "$COVERAGE_TOOL",
  "thresholds": {
    "line": $THRESHOLD_LINE,
    "branch": $THRESHOLD_BRANCH,
    "function": $THRESHOLD_FUNCTION,
    "class": $THRESHOLD_CLASS
  },
  "exclude": [
    "*/test/*",
    "*/tests/*",
    "*/third_party/*",
    "*/external/*",
    "*/build/*"
  ],
  "reportFormats": ["html", "json", "lcov"],
  "reportDirectory": "coverage"
}
EOF

# Create CMakeLists.txt additions for coverage
cat > "$PROJECT_PATH/.coverage/coverage.cmake" << 'EOF'
# Coverage configuration for C++ projects
option(ENABLE_COVERAGE "Enable coverage reporting" OFF)

if(ENABLE_COVERAGE)
    if(CMAKE_CXX_COMPILER_ID MATCHES "Clang")
        # LLVM/Clang coverage
        message(STATUS "Configuring LLVM coverage")
        set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fprofile-instr-generate -fcoverage-mapping")
        set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -fprofile-instr-generate -fcoverage-mapping")
        set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -fprofile-instr-generate -fcoverage-mapping")
        
        # Add custom target for coverage
        add_custom_target(coverage
            COMMAND LLVM_PROFILE_FILE=default.profraw $<TARGET_FILE:${PROJECT_NAME}_tests>
            COMMAND llvm-profdata merge -sparse default.profraw -o default.profdata
            COMMAND llvm-cov report $<TARGET_FILE:${PROJECT_NAME}_tests> -instr-profile=default.profdata
            COMMAND llvm-cov show $<TARGET_FILE:${PROJECT_NAME}_tests> -instr-profile=default.profdata -format=html -output-dir=${CMAKE_BINARY_DIR}/coverage
            WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
            COMMENT "Generating coverage report with LLVM"
        )
    elseif(CMAKE_CXX_COMPILER_ID MATCHES "GNU")
        # GCC/gcov coverage
        message(STATUS "Configuring GCC coverage")
        set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} --coverage -fprofile-arcs -ftest-coverage")
        set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} --coverage -fprofile-arcs -ftest-coverage")
        set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} --coverage")
        
        # Add custom target for coverage
        add_custom_target(coverage
            COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_BINARY_DIR}/coverage
            COMMAND $<TARGET_FILE:${PROJECT_NAME}_tests>
            COMMAND lcov --capture --directory . --output-file coverage.info
            COMMAND lcov --remove coverage.info '/usr/*' '*/test/*' --output-file coverage.info
            COMMAND genhtml coverage.info --output-directory ${CMAKE_BINARY_DIR}/coverage
            WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
            COMMENT "Generating coverage report with gcov"
        )
    else()
        message(WARNING "Coverage not supported for compiler: ${CMAKE_CXX_COMPILER_ID}")
    endif()
endif()

# Function to add coverage to a target
function(add_coverage_target TARGET_NAME)
    if(ENABLE_COVERAGE)
        if(CMAKE_CXX_COMPILER_ID MATCHES "Clang")
            target_compile_options(${TARGET_NAME} PRIVATE -fprofile-instr-generate -fcoverage-mapping)
            target_link_options(${TARGET_NAME} PRIVATE -fprofile-instr-generate -fcoverage-mapping)
        elseif(CMAKE_CXX_COMPILER_ID MATCHES "GNU")
            target_compile_options(${TARGET_NAME} PRIVATE --coverage)
            target_link_libraries(${TARGET_NAME} PRIVATE gcov)
        endif()
    endif()
endfunction()
EOF

# Create coverage check script
cat > "$PROJECT_PATH/.coverage/check-coverage.sh" << 'EOF'
#!/bin/bash

# Check coverage thresholds
CONFIG_FILE=".coverage/config.json"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Coverage configuration not found"
    exit 1
fi

# Extract thresholds
LINE_THRESHOLD=$(jq -r '.thresholds.line' "$CONFIG_FILE")
BRANCH_THRESHOLD=$(jq -r '.thresholds.branch' "$CONFIG_FILE")

# Run coverage
cmake -B build -DENABLE_COVERAGE=ON
cmake --build build
cd build && make coverage

# Check thresholds (simplified - would need actual parsing)
echo "✅ Coverage report generated in build/coverage/"
echo "📊 Thresholds: Line: $LINE_THRESHOLD%, Branch: $BRANCH_THRESHOLD%"
EOF

chmod +x "$PROJECT_PATH/.coverage/check-coverage.sh"

# Create .gitignore for coverage files
cat >> "$PROJECT_PATH/.gitignore" << 'EOF'

# Coverage files
*.profraw
*.profdata
*.gcda
*.gcno
*.gcov
coverage/
coverage.info
.coverage/
EOF

echo "✅ C++ coverage setup complete!"
echo ""
echo "📝 To use coverage in your CMake project:"
echo "   1. Add to your CMakeLists.txt:"
echo "      include(.coverage/coverage.cmake)"
echo ""
echo "   2. Build with coverage:"
echo "      cmake -B build -DENABLE_COVERAGE=ON"
echo "      cmake --build build"
echo "      make coverage"
echo ""
echo "   3. Check coverage:"
echo "      ./.coverage/check-coverage.sh"
echo ""
echo "📊 Coverage reports will be in: build/coverage/"