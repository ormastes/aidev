cmake_minimum_required(VERSION 3.14)
project(GTestExample)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Enable testing
enable_testing()

# Find or fetch Google Test
include(FetchContent)
FetchContent_Declare(
  googletest
  GIT_REPOSITORY https://github.com/google/googletest.git
  GIT_TAG        v1.14.0
)
FetchContent_MakeAvailable(googletest)

# Add source files
add_library(math_lib src/math_operations.cpp)

# Add test executable
add_executable(math_tests 
    tests/test_main.cpp
    tests/test_math_operations.cpp
    tests/test_string_utils.cpp
)

# Link test executable with Google Test and our library
target_link_libraries(math_tests 
    PRIVATE 
    GTest::gtest 
    GTest::gtest_main
    math_lib
)

# Include Google Test module for test discovery
include(GoogleTest)

# Discover tests - this is what enables CTest integration
gtest_discover_tests(math_tests
    PROPERTIES
        LABELS "unit"
    DISCOVERY_TIMEOUT 30
)

# Add a custom test using add_test (alternative method)
add_test(NAME QuickSmokeTest COMMAND math_tests --gtest_filter=MathOperations.AddPositiveNumbers)