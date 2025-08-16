cmake_minimum_required(VERSION 3.10)
project(cucumber_cpp VERSION 1.0.0 LANGUAGES CXX)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Include directories
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/include)

# Source files
set(SOURCES
    src/gherkin_parser.cpp
    src/step_registry.cpp
    src/manual_generator.cpp
    src/catch2_integration.cpp
)

# Create library
add_library(cucumber_cpp STATIC ${SOURCES})

# Test executables
add_executable(test_gherkin_parser tests/test_gherkin_parser.cpp)
target_link_libraries(test_gherkin_parser cucumber_cpp)

add_executable(test_step_registry tests/test_step_registry.cpp)
target_link_libraries(test_step_registry cucumber_cpp)

# Example executables
add_executable(manual_test_example examples/manual_test_example.cpp)
target_link_libraries(manual_test_example cucumber_cpp)

# CLI tool
add_executable(cucumber-cpp src/cucumber_cli.cpp)
target_link_libraries(cucumber-cpp cucumber_cpp)
set_target_properties(cucumber-cpp PROPERTIES OUTPUT_NAME "cucumber-cpp")

# Enable testing
enable_testing()
add_test(NAME GherkinParserTest COMMAND test_gherkin_parser)
add_test(NAME StepRegistryTest COMMAND test_step_registry)

# Installation rules
install(TARGETS cucumber_cpp cucumber-cpp
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
    RUNTIME DESTINATION bin
)

install(DIRECTORY include/
    DESTINATION include/cucumber_cpp
)

install(FILES cmake/CucumberCpp.cmake
    DESTINATION lib/cmake/cucumber_cpp
)

# Export for use in other projects
export(TARGETS cucumber_cpp FILE cucumber_cpp-config.cmake)

# Include CMake module
list(APPEND CMAKE_MODULE_PATH ${CMAKE_CURRENT_SOURCE_DIR}/cmake)

# Make CLI tool available during build
set(CUCUMBER_CPP_CLI $<TARGET_FILE:cucumber-cpp> CACHE INTERNAL "Path to cucumber-cpp CLI")