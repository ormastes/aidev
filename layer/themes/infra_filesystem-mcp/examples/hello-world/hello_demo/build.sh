#!/bin/bash
set -e

# Clean previous build
rm -rf build
mkdir -p build
cd build

# Set compilers
export CC=${CC:-clang}
export CXX=${CXX:-clang++}

# Configure with CMake using Ninja if available
if command -v ninja &> /dev/null; then
    echo "Building with Ninja and $CXX..."
    cmake .. -G Ninja -DCMAKE_BUILD_TYPE=Release
    ninja
else
    echo "Building with Make and $CXX..."
    cmake .. -DCMAKE_BUILD_TYPE=Release
    make -j$(nproc)
fi

# Copy executable to parent directory for compatibility
cp hello_cpp ../

echo "Build complete. Executables: hello_cpp, build/hello_cpp"