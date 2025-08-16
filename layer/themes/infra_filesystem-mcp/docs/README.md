# Setup System - Complete Testing Infrastructure

## Overview

Comprehensive setup system with dual-mode testing infrastructure supporting both safe local tests and dangerous virtualized tests.

## Features

### 🔧 Build Systems
- **C++**: Clang, CMake, Ninja, Conan, Mold linker
- **TypeScript**: Node.js, Bun (preferred), yarn, pnpm
- **Python**: pip, UV, Poetry
- **Cross-compilation**: ARM, RISC-V support

### 🧪 Test Modes

#### Normal Mode (Default)
- Safe tests that run on host machine
- No system modifications
- Basic compilation and unit tests
- Enabled by default on physical machines

#### Dangerous Virtual Mode
- Tests requiring isolation
- System modifications, kernel modules
- Network namespace operations
- Auto-enabled in virtual environments

### 🐳 Docker Environments

| Environment | Purpose | Base Image |
|------------|---------|------------|
| `node-tests` | TypeScript/JavaScript | node:18-alpine |
| `python-tests` | Python applications | python:3.11-slim |
| `cpp-tests` | C++ builds | ubuntu:22.04 |
| `gui-tests` | GUI applications | ubuntu:22.04 + X11 |
| `android-tests` | React Native | Android SDK |

### 🖥️ QEMU Environments

| Environment | Architecture | Use Case |
|------------|--------------|----------|
| Linux Kernel | x86_64 | Driver development |
| ARM Bare-metal | ARMv7/v8 | Embedded systems |
| RISC-V | RV64 | RISC-V development |

## Quick Start

### Run Safe Tests
```bash
./run_system_tests.sh
```

### Run All Tests in Docker
```bash
docker-compose -f docker/test-compose.yml up
```

### Run QEMU Tests
```bash
./qemu/setup_qemu_environments.sh  # First time setup
./qemu/run_qemu_tests.sh --all
```

### Force Dangerous Mode (Use Carefully)
```bash
ENABLE_DANGEROUS_TESTS=true ./run_system_tests.sh
```

## Test Coverage

### ✅ Implemented Tests

| Feature | Type | Environment | Status |
|---------|------|-------------|--------|
| C++ CLI | Normal | Host | ✅ Working |
| Bash CLI | Normal | Host | ✅ Working |
| CMake Build | Normal | Host | ✅ Working |
| TypeScript CLI | Dangerous | Docker | ✅ Implemented |
| Python Web (FastAPI) | Dangerous | Docker | ✅ Implemented |
| C++ Library | Dangerous | Docker | ✅ Implemented |
| Electron GUI | Dangerous | Docker | ✅ Implemented |
| React Native | Dangerous | Docker | ✅ Implemented |
| System Modification | Dangerous | VM | ✅ Implemented |
| Network Isolation | Dangerous | VM | ✅ Implemented |
| Kernel Module | Dangerous | QEMU | ✅ Implemented |
| ARM Cross-compile | Dangerous | QEMU | ✅ Implemented |

## Environment Detection

Automatically detects:
- Docker containers
- Kubernetes pods
- VirtualBox, VMware, KVM, QEMU VMs
- WSL (Windows Subsystem for Linux)
- LXC containers

## Configuration

### Environment Variables
```bash
export TEST_MODE="dangerous_virtual_needed"  # Force mode
export ENABLE_DANGEROUS_TESTS="true"         # Enable dangerous
export DISABLE_DANGEROUS_TESTS="true"        # Disable even in VM
```

### Command Line
```bash
./run_system_tests.sh --mode dangerous_virtual_needed
./run_system_tests.sh --enable-dangerous
./run_system_tests.sh --disable-dangerous
```

## Directory Structure

```
setup/
├── docker/                  # Docker test environments
│   ├── test-compose.yml    # Docker Compose configuration
│   ├── node/               # Node.js environment
│   ├── python/             # Python environment
│   ├── cpp/                # C++ build environment
│   └── gui/                # GUI testing environment
├── qemu/                   # QEMU test environments
│   ├── setup_qemu_environments.sh
│   ├── run_qemu_tests.sh
│   └── images/             # QEMU disk images
├── tests/                  # Test scripts
│   ├── test_*.sh          # Individual test scripts
│   └── features/          # Cucumber feature files
├── hello_world_tests/      # Basic hello world tests
├── templates/              # Project templates
├── cmake_template/         # CMake template with optimizations
├── test_config.sh          # Test configuration system
├── run_system_tests.sh     # Main test runner
├── TEST_MODES.md          # Test modes documentation
└── FEATURE_TEST_MATRIX.md # Feature coverage matrix
```

## C++ Build Configuration

### Default Settings
- Compiler: Clang
- Build system: CMake + Ninja
- Package manager: Conan
- Linker: Mold (for faster linking)
- Windows optimizations: NOMINMAX, WIN32_LEAN_AND_MEAN

### Install Tools
```bash
./install_cpp_tools.sh
```

## Adding New Tests

### Normal Test
```bash
# In run_system_tests.sh
TESTS["my_test"]="tests/my_test.sh"
TEST_TAGS["my_test"]=""  # No tags for normal tests
```

### Dangerous Test
```bash
# In run_system_tests.sh
TESTS["my_dangerous_test"]="tests/my_dangerous_test.sh"
TEST_TAGS["my_dangerous_test"]="dangerous_virtual_needed"
```

## Best Practices

1. **Always tag dangerous tests** with `dangerous_virtual_needed`
2. **Test in both modes** during development
3. **Clean up** after dangerous tests
4. **Document requirements** for each test
5. **Use minimal privileges** - only request root when needed
6. **CI/CD**: Explicitly configure test mode

## Troubleshooting

### Tests Not Running
```bash
source test_config.sh
print_test_config  # Check current configuration
```

### Force Normal Mode
```bash
DISABLE_DANGEROUS_TESTS=true ./run_system_tests.sh
```

### Debug Docker Tests
```bash
docker-compose -f docker/test-compose.yml run node-tests bash
```

### Debug QEMU Tests
```bash
./qemu/run_qemu_tests.sh --kernel  # Test specific component
```