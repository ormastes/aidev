# CucumberCpp.cmake - CMake helper functions for Cucumber-CPP integration
#
# This module provides convenient functions for integrating Cucumber-CPP
# into your CMake project.
#
# Usage:
#   include(CucumberCpp)
#   
#   add_cucumber_test(
#     NAME my_test
#     FEATURES features/my_feature.feature
#     STEPS src/step_definitions.cpp
#   )

# Find Cucumber-CPP installation
function(find_cucumber_cpp)
    find_path(CUCUMBER_CPP_INCLUDE_DIR
        NAMES gherkin_parser.hpp
        PATHS
            ${CMAKE_CURRENT_LIST_DIR}/../include
            ${CMAKE_INSTALL_PREFIX}/include/cucumber_cpp
            /usr/local/include/cucumber_cpp
            /usr/include/cucumber_cpp
    )
    
    find_library(CUCUMBER_CPP_LIBRARY
        NAMES cucumber_cpp
        PATHS
            ${CMAKE_CURRENT_LIST_DIR}/../build
            ${CMAKE_INSTALL_PREFIX}/lib
            /usr/local/lib
            /usr/lib
    )
    
    if(CUCUMBER_CPP_INCLUDE_DIR AND CUCUMBER_CPP_LIBRARY)
        set(CUCUMBER_CPP_FOUND TRUE PARENT_SCOPE)
        message(STATUS "Found Cucumber-CPP: ${CUCUMBER_CPP_LIBRARY}")
    else()
        set(CUCUMBER_CPP_FOUND FALSE PARENT_SCOPE)
        message(WARNING "Cucumber-CPP not found")
    endif()
endfunction()

# Add a Cucumber test executable
function(add_cucumber_test)
    set(options MANUAL_DOCS WATCH_MODE)
    set(oneValueArgs NAME OUTPUT_DIR REPORTER)
    set(multiValueArgs FEATURES STEPS INCLUDE_DIRS LIBRARIES)
    cmake_parse_arguments(TEST "${options}" "${oneValueArgs}" "${multiValueArgs}" ${ARGN})
    
    # Default values
    if(NOT TEST_OUTPUT_DIR)
        set(TEST_OUTPUT_DIR "${CMAKE_CURRENT_BINARY_DIR}/cucumber_output")
    endif()
    
    if(NOT TEST_REPORTER)
        set(TEST_REPORTER "console")
    endif()
    
    # Create test executable
    add_executable(${TEST_NAME}_runner ${TEST_STEPS})
    
    # Include directories
    target_include_directories(${TEST_NAME}_runner PRIVATE
        ${CUCUMBER_CPP_INCLUDE_DIR}
        ${TEST_INCLUDE_DIRS}
    )
    
    # Link libraries
    target_link_libraries(${TEST_NAME}_runner
        ${CUCUMBER_CPP_LIBRARY}
        ${TEST_LIBRARIES}
    )
    
    # Copy feature files to build directory
    foreach(feature ${TEST_FEATURES})
        get_filename_component(feature_name ${feature} NAME)
        configure_file(${feature} ${CMAKE_CURRENT_BINARY_DIR}/${feature_name} COPYONLY)
    endforeach()
    
    # Add test to CTest
    add_test(
        NAME ${TEST_NAME}
        COMMAND ${TEST_NAME}_runner ${CMAKE_CURRENT_BINARY_DIR}
    )
    
    # Set test properties
    set_tests_properties(${TEST_NAME} PROPERTIES
        WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}
        ENVIRONMENT "CUCUMBER_OUTPUT_DIR=${TEST_OUTPUT_DIR}"
    )
    
    # Add custom target for running with specific reporter
    add_custom_target(${TEST_NAME}_junit
        COMMAND ${TEST_NAME}_runner ${CMAKE_CURRENT_BINARY_DIR} -r junit -o ${TEST_OUTPUT_DIR}/results.xml
        WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}
        COMMENT "Running ${TEST_NAME} with JUnit reporter"
    )
    
    # Add manual documentation generation if requested
    if(TEST_MANUAL_DOCS)
        add_custom_target(${TEST_NAME}_manual
            COMMAND cucumber-cpp manual ${CMAKE_CURRENT_BINARY_DIR} -o ${TEST_OUTPUT_DIR}/manual_tests.md
            WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}
            COMMENT "Generating manual test documentation for ${TEST_NAME}"
        )
    endif()
    
    # Add watch mode target if requested
    if(TEST_WATCH_MODE)
        add_custom_target(${TEST_NAME}_watch
            COMMAND cucumber-cpp watch ${CMAKE_CURRENT_BINARY_DIR}
            WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}
            COMMENT "Watching ${TEST_NAME} for changes"
        )
    endif()
endfunction()

# Add multiple Cucumber tests from a directory
function(add_cucumber_test_directory)
    set(options RECURSIVE)
    set(oneValueArgs NAME DIRECTORY STEP_PATTERN)
    set(multiValueArgs EXCLUDE_PATTERNS)
    cmake_parse_arguments(DIR "${options}" "${oneValueArgs}" "${multiValueArgs}" ${ARGN})
    
    # Default step pattern
    if(NOT DIR_STEP_PATTERN)
        set(DIR_STEP_PATTERN "*_steps.cpp")
    endif()
    
    # Find feature files
    if(DIR_RECURSIVE)
        file(GLOB_RECURSE feature_files "${DIR_DIRECTORY}/*.feature")
    else()
        file(GLOB feature_files "${DIR_DIRECTORY}/*.feature")
    endif()
    
    # Find step definition files
    if(DIR_RECURSIVE)
        file(GLOB_RECURSE step_files "${DIR_DIRECTORY}/${DIR_STEP_PATTERN}")
    else()
        file(GLOB step_files "${DIR_DIRECTORY}/${DIR_STEP_PATTERN}")
    endif()
    
    # Filter out excluded patterns
    foreach(pattern ${DIR_EXCLUDE_PATTERNS})
        list(FILTER feature_files EXCLUDE REGEX ${pattern})
        list(FILTER step_files EXCLUDE REGEX ${pattern})
    endforeach()
    
    # Add test if files found
    if(feature_files AND step_files)
        add_cucumber_test(
            NAME ${DIR_NAME}
            FEATURES ${feature_files}
            STEPS ${step_files}
        )
    else()
        message(WARNING "No feature or step files found in ${DIR_DIRECTORY}")
    endif()
endfunction()

# Generate step definition template
function(generate_step_definitions)
    set(oneValueArgs FEATURE OUTPUT)
    cmake_parse_arguments(GEN "" "${oneValueArgs}" "" ${ARGN})
    
    if(NOT GEN_OUTPUT)
        get_filename_component(feature_name ${GEN_FEATURE} NAME_WE)
        set(GEN_OUTPUT "${CMAKE_CURRENT_BINARY_DIR}/${feature_name}_steps.cpp")
    endif()
    
    add_custom_command(
        OUTPUT ${GEN_OUTPUT}
        COMMAND cucumber-cpp generate-steps ${GEN_FEATURE} -o ${GEN_OUTPUT}
        DEPENDS ${GEN_FEATURE}
        COMMENT "Generating step definitions for ${GEN_FEATURE}"
    )
    
    add_custom_target(generate_${feature_name}_steps
        DEPENDS ${GEN_OUTPUT}
    )
endfunction()

# Enable Cucumber testing for the project
macro(enable_cucumber_testing)
    enable_testing()
    find_cucumber_cpp()
    
    if(CUCUMBER_CPP_FOUND)
        message(STATUS "Cucumber-CPP testing enabled")
        
        # Add custom target for running all cucumber tests
        add_custom_target(cucumber_tests
            COMMAND ${CMAKE_CTEST_COMMAND} -R "cucumber_*"
            COMMENT "Running all Cucumber tests"
        )
        
        # Add custom target for generating all manual docs
        add_custom_target(cucumber_manual_docs
            COMMAND cucumber-cpp manual ${CMAKE_CURRENT_SOURCE_DIR} -R -o ${CMAKE_BINARY_DIR}/manual_tests.md
            COMMENT "Generating manual test documentation"
        )
    else()
        message(WARNING "Cucumber-CPP not found, testing disabled")
    endif()
endmacro()

# Install Cucumber-CPP
function(install_cucumber_cpp)
    set(oneValueArgs DESTINATION)
    cmake_parse_arguments(INSTALL "" "${oneValueArgs}" "" ${ARGN})
    
    if(NOT INSTALL_DESTINATION)
        set(INSTALL_DESTINATION ${CMAKE_INSTALL_PREFIX})
    endif()
    
    # Install library
    install(FILES ${CUCUMBER_CPP_LIBRARY}
        DESTINATION ${INSTALL_DESTINATION}/lib
    )
    
    # Install headers
    install(DIRECTORY ${CUCUMBER_CPP_INCLUDE_DIR}/
        DESTINATION ${INSTALL_DESTINATION}/include/cucumber_cpp
    )
    
    # Install CMake module
    install(FILES ${CMAKE_CURRENT_LIST_FILE}
        DESTINATION ${INSTALL_DESTINATION}/lib/cmake/cucumber_cpp
    )
    
    # Install CLI tool
    find_program(CUCUMBER_CPP_CLI cucumber-cpp
        PATHS ${CMAKE_CURRENT_LIST_DIR}/../build
    )
    
    if(CUCUMBER_CPP_CLI)
        install(PROGRAMS ${CUCUMBER_CPP_CLI}
            DESTINATION ${INSTALL_DESTINATION}/bin
        )
    endif()
endfunction()

# Create a test report
function(create_cucumber_report)
    set(oneValueArgs NAME FORMAT OUTPUT)
    set(multiValueArgs RESULTS)
    cmake_parse_arguments(REPORT "" "${oneValueArgs}" "${multiValueArgs}" ${ARGN})
    
    if(NOT REPORT_FORMAT)
        set(REPORT_FORMAT "html")
    endif()
    
    if(NOT REPORT_OUTPUT)
        set(REPORT_OUTPUT "${CMAKE_BINARY_DIR}/cucumber_report.${REPORT_FORMAT}")
    endif()
    
    add_custom_target(${REPORT_NAME}_report
        COMMAND cucumber-cpp report ${REPORT_RESULTS} -f ${REPORT_FORMAT} -o ${REPORT_OUTPUT}
        COMMENT "Generating ${REPORT_FORMAT} report: ${REPORT_OUTPUT}"
    )
endfunction()