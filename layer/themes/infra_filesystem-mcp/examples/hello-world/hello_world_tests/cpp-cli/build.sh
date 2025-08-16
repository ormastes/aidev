#!/bin/bash
set -e

# Clean previous build
rm -rf build
mkdir -p build
cd build

# Set compilers if not already set
export CC=${CC:-clang}
export CXX=${CXX:-clang++}

# Install dependencies with Conan (if conanfile.txt has dependencies)
if command -v conan &> /dev/null; then
    conan install .. --build=missing
fi

# Configure with CMake using Ninja generator
if command -v ninja &> /dev/null; then
    cmake .. -G Ninja -DCMAKE_BUILD_TYPE=Release -DCMAKE_C_COMPILER=$CC -DCMAKE_CXX_COMPILER=$CXX
    ninja
else
    cmake .. -DCMAKE_BUILD_TYPE=Release -DCMAKE_C_COMPILER=$CC -DCMAKE_CXX_COMPILER=$CXX
    make -j$(nproc)
fi

echo "Build complete. Executable: build/hello"