cmake_minimum_required(VERSION 3.14)
project(CTestSampleProject VERSION 1.0.0 LANGUAGES CXX)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Enable testing
enable_testing()

# GoogleTest setup
include(FetchContent)
FetchContent_Declare(
  googletest
  URL https://github.com/google/googletest/archive/03597a01ee50ed33e9dfd640b249b4be3799d395.zip
  DOWNLOAD_EXTRACT_TIMESTAMP OFF
)

# For Windows: Prevent overriding the parent project's compiler/linker settings
set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(googletest)

# Include GoogleTest module for test discovery
include(GoogleTest)

# Create source library
add_library(${PROJECT_NAME}_lib
  src/math_utils.cpp
  src/string_utils.cpp
)

target_include_directories(${PROJECT_NAME}_lib 
  PUBLIC 
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
    $<INSTALL_INTERFACE:include>
)

# Test executable
add_executable(${PROJECT_NAME}_tests
  test/test_math.cpp
  test/test_string.cpp
  test/test_performance.cpp
  test/test_edge_cases.cpp
)

target_link_libraries(${PROJECT_NAME}_tests 
  PRIVATE 
    ${PROJECT_NAME}_lib
    GTest::gtest_main
)

# Discover tests with different configurations
gtest_discover_tests(${PROJECT_NAME}_tests
  WORKING_DIRECTORY ${PROJECT_SOURCE_DIR}
  PROPERTIES
    TIMEOUT 30
    LABELS "unit;core"
  DISCOVERY_TIMEOUT 10
)

# Additional test executable for performance tests
add_executable(${PROJECT_NAME}_perf_tests
  test/test_performance_only.cpp
)

target_link_libraries(${PROJECT_NAME}_perf_tests 
  PRIVATE 
    ${PROJECT_NAME}_lib
    GTest::gtest_main
)

gtest_discover_tests(${PROJECT_NAME}_perf_tests
  WORKING_DIRECTORY ${PROJECT_SOURCE_DIR}
  PROPERTIES
    TIMEOUT 60
    LABELS "performance;slow"
  TEST_PREFIX "Perf."
)

# Test for parameterized tests
add_executable(${PROJECT_NAME}_param_tests
  test/test_parameterized.cpp
)

target_link_libraries(${PROJECT_NAME}_param_tests 
  PRIVATE 
    ${PROJECT_NAME}_lib
    GTest::gtest_main
)

gtest_discover_tests(${PROJECT_NAME}_param_tests
  WORKING_DIRECTORY ${PROJECT_SOURCE_DIR}
  PROPERTIES
    TIMEOUT 30
    LABELS "parameterized"
  TEST_PREFIX "Param."
)

# Install targets (optional)
install(TARGETS ${PROJECT_NAME}_lib
  EXPORT ${PROJECT_NAME}Targets
  LIBRARY DESTINATION lib
  ARCHIVE DESTINATION lib
  RUNTIME DESTINATION bin
  INCLUDES DESTINATION include
)

install(DIRECTORY include/ DESTINATION include)

# Export configuration
install(EXPORT ${PROJECT_NAME}Targets
  FILE ${PROJECT_NAME}Targets.cmake
  NAMESPACE ${PROJECT_NAME}::
  DESTINATION lib/cmake/${PROJECT_NAME}
)