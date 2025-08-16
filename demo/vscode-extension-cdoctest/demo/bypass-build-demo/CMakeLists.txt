cmake_minimum_required(VERSION 3.14)
project(BypassBuildDemo VERSION 1.0.0 DESCRIPTION "Hello World CMake demo for testing bypass build feature")

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Enable testing for CTest integration
enable_testing()

# Create hello_world executable
add_executable(hello_world 
    src/main.cpp
    src/hello.cpp
)

target_include_directories(hello_world PRIVATE include)

# Create test executable for cdoctest/executable tests
add_executable(hello_tests
    src/test_main.cpp
    src/hello.cpp
)

target_include_directories(hello_tests PRIVATE include)

# Add CTest tests
add_test(NAME HelloWorldTest COMMAND hello_world)
add_test(NAME HelloTestsRun COMMAND hello_tests)

# Set test properties
set_tests_properties(HelloWorldTest PROPERTIES
    TIMEOUT 10
    PASS_REGULAR_EXPRESSION "Hello, World!"
)

set_tests_properties(HelloTestsRun PROPERTIES  
    TIMEOUT 10
    PASS_REGULAR_EXPRESSION "Tests passed"
)

# Add install targets
install(TARGETS hello_world hello_tests
    RUNTIME DESTINATION bin
)

# Print build information
message(STATUS "Bypass Build Demo - CMakeLists.txt processed")
message(STATUS "Build configuration: ${CMAKE_BUILD_TYPE}")
message(STATUS "C++ Standard: ${CMAKE_CXX_STANDARD}")