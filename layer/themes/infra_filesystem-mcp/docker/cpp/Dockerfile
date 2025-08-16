FROM ubuntu:22.04

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install build essentials and tools
RUN apt-get update && apt-get install -y \
    # Compilers
    clang \
    clang-tools \
    gcc \
    g++ \
    # Build tools
    cmake \
    ninja-build \
    make \
    # Version control
    git \
    # Utilities
    curl \
    wget \
    pkg-config \
    # Libraries
    libssl-dev \
    libxxhash-dev \
    zlib1g-dev \
    # Python for Conan
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install Conan
RUN pip3 install conan

# Install mold linker from source
RUN cd /tmp && \
    git clone https://github.com/rui314/mold.git && \
    cd mold && \
    git checkout v2.4.0 && \
    cmake -B build -DCMAKE_BUILD_TYPE=Release && \
    cmake --build build -j$(nproc) && \
    cmake --install build && \
    cd / && rm -rf /tmp/mold

# Install Catch2
RUN cd /tmp && \
    git clone https://github.com/catchorg/Catch2.git && \
    cd Catch2 && \
    git checkout v3.4.0 && \
    cmake -B build -DCMAKE_BUILD_TYPE=Release && \
    cmake --build build && \
    cmake --install build && \
    cd / && rm -rf /tmp/Catch2

# Set default compiler
ENV CC=clang
ENV CXX=clang++

# Create workspace directory
WORKDIR /workspace

# Copy test runner script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]