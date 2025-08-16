cmake_minimum_required(VERSION 3.10)
project(CalculatorTests)

set(CMAKE_CXX_STANDARD 14)

# Find Google Test
find_package(GTest REQUIRED)
include_directories(${GTEST_INCLUDE_DIRS})

# Add source files
add_library(calculator_lib
    Calculator.cpp
)

# Add test executable
add_executable(calculator_tests
    output/example/CalculatorTest.cpp
)

# Link libraries
target_link_libraries(calculator_tests
    calculator_lib
    ${GTEST_LIBRARIES}
    ${GTEST_MAIN_LIBRARIES}
    pthread
)

# Include directories
target_include_directories(calculator_tests PRIVATE 
    ${CMAKE_CURRENT_SOURCE_DIR}
)