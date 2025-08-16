cmake_minimum_required(VERSION 3.14)
project(TestCreatorDemo)

set(CMAKE_CXX_STANDARD 14)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Download and configure GoogleTest
include(FetchContent)
FetchContent_Declare(
    googletest
    URL https://github.com/google/googletest/archive/refs/tags/release-1.12.1.zip
)
FetchContent_MakeAvailable(googletest)

# Enable testing
enable_testing()

# Calculator library
add_library(calculator
    src/calculator.cpp
)
target_include_directories(calculator PUBLIC src)

# Test executable
add_executable(calculator_test
    tests/calculator_test.cpp
)

target_link_libraries(calculator_test
    calculator
    gtest_main
    gmock_main
)

# Add test
include(GoogleTest)
gtest_discover_tests(calculator_test)

# Custom test case compilation (if TEST_CASE is defined)
if(DEFINED TEST_CASE)
    target_compile_definitions(calculator_test PRIVATE TEST_CASE="${TEST_CASE}")
endif()