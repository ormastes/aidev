include(CTest)
include(Catch)

# Unit tests
add_executable(cucumber_cpp_unit_tests
    unit/lexer_test.cpp
    unit/parser_test.cpp
    unit/step_registry_test.cpp
    unit/manual_generator_test.cpp
)

target_link_libraries(cucumber_cpp_unit_tests
    PRIVATE
        cucumber_cpp
        Catch2::Catch2WithMain
)

catch_discover_tests(cucumber_cpp_unit_tests)

# Integration tests
add_executable(cucumber_cpp_integration_tests
    integration/catch2_backend_test.cpp
    integration/file_parsing_test.cpp
    integration/runner_test.cpp
)

target_link_libraries(cucumber_cpp_integration_tests
    PRIVATE
        cucumber_cpp
        Catch2::Catch2WithMain
)

catch_discover_tests(cucumber_cpp_integration_tests)

# System tests
add_executable(cucumber_cpp_system_tests
    system/end_to_end_test.cpp
    system/cli_test.cpp
)

target_link_libraries(cucumber_cpp_system_tests
    PRIVATE
        cucumber_cpp
        Catch2::Catch2WithMain
)

catch_discover_tests(cucumber_cpp_system_tests)

# Test data
file(COPY ${CMAKE_CURRENT_SOURCE_DIR}/fixtures
    DESTINATION ${CMAKE_CURRENT_BINARY_DIR}
)