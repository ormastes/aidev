# CMakeLists.txt for Cucumber-CPP Examples
cmake_minimum_required(VERSION 3.14)
project(CucumberCppExamples)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Add parent directory for includes
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/..)

# Find Cucumber-CPP library (assuming it's built in parent directory)
set(CUCUMBER_CPP_DIR ${CMAKE_CURRENT_SOURCE_DIR}/..)
include_directories(${CUCUMBER_CPP_DIR}/include)

# Link to the cucumber-cpp library
link_directories(${CUCUMBER_CPP_DIR}/build)

# Calculator example with step definitions
add_executable(calculator_example
    calculator_test_main.cpp
    calculator_steps.cpp
    ../src/step_registry.cpp
    ../src/gherkin_parser.cpp
)

# Test runner example
add_executable(test_runner
    test_runner.cpp
    calculator_steps.cpp
    ../src/step_registry.cpp
    ../src/gherkin_parser.cpp
    ../src/catch2_integration.cpp
    ../src/manual_generator.cpp
)

# Manual test generator example
add_executable(manual_test_example
    manual_test_example.cpp
    ../src/manual_generator.cpp
    ../src/gherkin_parser.cpp
)

# Set properties for examples
set_target_properties(calculator_example test_runner manual_test_example
    PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}
)

# Add a custom target to run the test runner
add_custom_target(run_tests
    COMMAND test_runner ${CMAKE_CURRENT_SOURCE_DIR}/../features
    DEPENDS test_runner
    WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}
    COMMENT "Running Cucumber tests..."
)

# Add a custom target to run tests with specific tags
add_custom_target(run_smoke_tests
    COMMAND test_runner ${CMAKE_CURRENT_SOURCE_DIR}/../features --tags @smoke
    DEPENDS test_runner
    WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}
    COMMENT "Running smoke tests..."
)

# Add a custom target for dry run
add_custom_target(dry_run
    COMMAND test_runner ${CMAKE_CURRENT_SOURCE_DIR}/../features --dry-run
    DEPENDS test_runner
    WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}
    COMMENT "Performing dry run to check step definitions..."
)

# Installation rules
install(TARGETS calculator_example test_runner manual_test_example
    RUNTIME DESTINATION bin
)

# Copy feature files for testing
file(COPY ${CMAKE_CURRENT_SOURCE_DIR}/../features
    DESTINATION ${CMAKE_CURRENT_BINARY_DIR}
)