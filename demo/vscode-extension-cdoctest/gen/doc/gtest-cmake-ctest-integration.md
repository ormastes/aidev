# GTest, CMake, and CTest Integration Guide

This document provides a comprehensive guide to integrating GoogleTest with CMake and CTest, focusing on practical patterns for VSCode extension development.

## Overview

The relationship between GTest, CMake, and CTest forms a powerful testing ecosystem:

- **GTest**: The actual testing framework that provides test macros and assertions
- **CMake**: The build system that compiles tests and integrates with GTest
- **CTest**: The test runner that discovers and executes tests, providing reporting capabilities

## 1. CMake Integration with GTest

### Modern Pattern (2025): FetchContent Approach

The current best practice uses CMake's `FetchContent` to automatically download and integrate GoogleTest:

```cmake
cmake_minimum_required(VERSION 3.14)
project(my_project)

# GoogleTest requires at least C++17
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Fetch GoogleTest from GitHub
include(FetchContent)
FetchContent_Declare(
  googletest
  URL https://github.com/google/googletest/archive/03597a01ee50ed33e9dfd640b249b4be3799d395.zip
)
# For Windows: Prevent overriding parent project's compiler/linker settings
set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(googletest)

# Enable testing
enable_testing()

# Add test executable
add_executable(my_tests test_main.cpp test_feature.cpp)

# Link against GoogleTest
target_link_libraries(my_tests GTest::gtest_main)

# Include GoogleTest module for test discovery
include(GoogleTest)
gtest_discover_tests(my_tests)
```

### Alternative: System-Installed GTest

If GoogleTest is installed system-wide:

```cmake
cmake_minimum_required(VERSION 3.14)
project(my_project)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

enable_testing()

# Find GoogleTest
find_package(GTest REQUIRED)
include(GoogleTest)

# Add test executable
add_executable(tests 
  tests/foo_test.cpp 
  tests/bar_test.cpp
)

# Link against GoogleTest
target_link_libraries(tests GTest::GTest GTest::Main)

# Discover tests
gtest_discover_tests(tests)
```

### Advanced Configuration with Options

```cmake
gtest_discover_tests(my_tests
  # Working directory for running tests
  WORKING_DIRECTORY ${PROJECT_SOURCE_DIR}
  
  # Prefix for test names in CTest
  TEST_PREFIX "MyProject."
  
  # Properties to set on all discovered tests
  PROPERTIES 
    TIMEOUT 30
    LABELS "unit"
  
  # Extra arguments to pass to test executable
  EXTRA_ARGS --gtest_shuffle
  
  # Timeout for test discovery process
  DISCOVERY_TIMEOUT 10
  
  # Store test list in a variable
  TEST_LIST my_test_list
)
```

## 2. CTest Test Discovery and Execution

### How gtest_discover_tests Works

The `gtest_discover_tests()` function works by:

1. Setting up a post-build step that runs the test executable
2. Parsing the executable's output to enumerate individual tests
3. Generating CTest scripts that register each test case separately
4. Creating individual CTest entries for each GTest test case

This approach provides several advantages:
- No need to re-run CMake when tests are added/removed
- Better handling of parameterized tests
- Individual test case reporting in CTest
- Automatic test discovery at build time

### Test Discovery Process

```bash
# The discovery process happens automatically, but conceptually:
# 1. CMake builds the test executable
# 2. CMake runs: ./my_tests --gtest_list_tests
# 3. CMake parses the output to find all test cases
# 4. CMake generates CTest entries for each test
```

## 3. CTest Interface and Commands

### Listing Tests

```bash
# List all tests (human-readable format)
ctest -N

# List tests in JSON format (for programmatic parsing)
ctest --show-only=json-v1

# List tests matching a pattern
ctest -N -R "MyTest.*"
```

### Running Tests

```bash
# Run all tests
ctest

# Run tests matching a regex pattern
ctest -R "Unit.*"

# Exclude tests matching a pattern
ctest -E "Integration.*"

# Run tests with specific labels
ctest -L "unit"

# Run with verbose output
ctest -V

# Run with output on failure
ctest --output-on-failure

# Run tests in parallel
ctest -j 4
```

### Programmatic Test Execution

```bash
# Run specific tests by number/range
ctest -I 1,5  # Run tests 1 through 5

# Run with timeout
ctest --timeout 30

# Stop on first failure
ctest --stop-on-failure
```

## 4. CTest Output Formats

### JSON Output Format

When using `--show-only=json-v1`, CTest outputs test information in JSON format:

```json
{
  "tests": [
    {
      "name": "MyTest.BasicTest",
      "command": ["/path/to/test_executable", "--gtest_filter=MyTest.BasicTest"],
      "properties": {
        "TIMEOUT": "30",
        "LABELS": "unit"
      }
    }
  ],
  "config": "Debug"
}
```

### JUnit XML Output

For CI/CD integration:

```bash
# Generate JUnit XML report
ctest --output-junit results.xml

# Combine with other options
ctest -R "Unit.*" --output-junit unit_tests.xml --output-on-failure
```

### Structured Logging

```bash
# Output to log file
ctest -O test_output.log

# Combine with verbose output
ctest -V -O detailed_test_log.txt
```

## 5. VSCode Extension Integration Patterns

### Test Discovery for VSCode

For a VSCode extension, you can programmatically discover tests:

```typescript
// Discover available tests
async function discoverTests(buildDir: string): Promise<TestInfo[]> {
  const result = await execAsync('ctest --show-only=json-v1', { cwd: buildDir });
  const testData = JSON.parse(result.stdout);
  
  return testData.tests.map(test => ({
    name: test.name,
    command: test.command,
    properties: test.properties
  }));
}

// Run specific test
async function runTest(testName: string, buildDir: string): Promise<TestResult> {
  const result = await execAsync(`ctest -R "^${testName}$" --output-junit results.xml`, 
    { cwd: buildDir });
  
  // Parse JUnit XML for detailed results
  return parseJUnitXML(path.join(buildDir, 'results.xml'));
}
```

### Build Integration

```typescript
// Ensure tests are built before discovery
async function ensureTestsBuilt(buildDir: string): Promise<void> {
  await execAsync('cmake --build . --target all', { cwd: buildDir });
}

// Full workflow
async function refreshTests(buildDir: string): Promise<TestInfo[]> {
  await ensureTestsBuilt(buildDir);
  return await discoverTests(buildDir);
}
```

### Test Execution with Real-time Output

```typescript
async function runTestWithOutput(testName: string, buildDir: string): Promise<void> {
  const proc = spawn('ctest', ['-R', `^${testName}$`, '-V'], { 
    cwd: buildDir,
    stdio: 'pipe'
  });
  
  proc.stdout.on('data', (data) => {
    // Stream output to VSCode terminal or output panel
    outputChannel.append(data.toString());
  });
  
  return new Promise((resolve, reject) => {
    proc.on('close', (code) => {
      code === 0 ? resolve() : reject(new Error(`Test failed with code ${code}`));
    });
  });
}
```

## 6. Best Practices

### CMakeLists.txt Structure

```cmake
# Root CMakeLists.txt
cmake_minimum_required(VERSION 3.14)
project(MyProject)

# Enable testing at the top level
enable_testing()

# Add your main targets
add_subdirectory(src)

# Add tests in a separate directory
if(BUILD_TESTING)
  add_subdirectory(tests)
endif()
```

```cmake
# tests/CMakeLists.txt
include(FetchContent)
FetchContent_Declare(
  googletest
  URL https://github.com/google/googletest/archive/03597a01ee50ed33e9dfd640b249b4be3799d395.zip
)
FetchContent_MakeAvailable(googletest)

include(GoogleTest)

# Create test executable for each module
add_executable(unit_tests
  test_math.cpp
  test_string_utils.cpp
)

target_link_libraries(unit_tests 
  PRIVATE
    my_project_lib  # Link to your main library
    GTest::gtest_main
)

# Discover tests with appropriate settings
gtest_discover_tests(unit_tests
  WORKING_DIRECTORY ${PROJECT_SOURCE_DIR}
  PROPERTIES
    LABELS "unit"
    TIMEOUT 30
)
```

### Test Organization

- Use descriptive test names that include the module being tested
- Group related tests using GTest test fixtures
- Use appropriate labels for different test categories (unit, integration, etc.)
- Set reasonable timeouts to prevent hanging tests

### CI/CD Integration

```bash
# Typical CI workflow
mkdir build && cd build
cmake .. -DBUILD_TESTING=ON
cmake --build .
ctest --output-junit results.xml --output-on-failure
```

## 7. Troubleshooting Common Issues

### Test Discovery Problems

- Ensure `enable_testing()` is called before adding tests
- Verify `include(GoogleTest)` is present
- Check that the test executable can run independently
- Ensure CMake version is 3.14 or higher for modern GTest support

### Runtime Issues

- Verify working directory is set correctly for tests that depend on files
- Check that all dependencies are properly linked
- Ensure test executables have proper permissions

### Performance Considerations

- Use parallel test execution: `ctest -j N`
- Consider test timeouts to prevent hanging
- Group fast and slow tests using labels for selective execution

This integration provides a robust foundation for test automation in C++ projects, with excellent support for VSCode extension development through programmatic interfaces and structured output formats.