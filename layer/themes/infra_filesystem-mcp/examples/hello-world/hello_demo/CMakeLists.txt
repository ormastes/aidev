cmake_minimum_required(VERSION 3.16)
project(HelloDemo)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Use Clang as compiler by default
if(NOT CMAKE_C_COMPILER)
    set(CMAKE_C_COMPILER clang)
endif()
if(NOT CMAKE_CXX_COMPILER)
    set(CMAKE_CXX_COMPILER clang++)
endif()

# Use mold linker if available
find_program(MOLD_LINKER mold)
if(MOLD_LINKER)
    set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -fuse-ld=mold")
    set(CMAKE_SHARED_LINKER_FLAGS "${CMAKE_SHARED_LINKER_FLAGS} -fuse-ld=mold")
endif()

# Windows/MinGW optimizations for faster builds
if(WIN32 OR MINGW)
    add_compile_definitions(
        NOMINMAX              # Prevent Windows min/max macros
        WIN32_LEAN_AND_MEAN   # Exclude rarely-used Windows headers
    )
endif()

# Enable all warnings
add_compile_options(-Wall -Wextra -Wpedantic)

# Add executable
add_executable(hello_cpp hello.cpp)