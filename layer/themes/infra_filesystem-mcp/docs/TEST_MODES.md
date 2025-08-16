# Test Modes Documentation

## Overview

The setup system supports two test execution modes to ensure safe testing on development machines while enabling comprehensive testing in isolated environments.

## Test Modes

### 1. Normal Mode (Default on Physical Machines)
- **Description**: Safe tests that can run on any system without risk
- **Use Case**: Developer workstations, CI/CD pipelines, production systems
- **Tests Include**:
  - Hello world examples
  - CMake builds
  - Compilation tests
  - Unit tests
  - Basic integration tests

### 2. Dangerous Virtual Needed Mode
- **Description**: Tests requiring VM or container isolation
- **Use Case**: Virtual machines, Docker containers, dedicated test environments
- **Auto-enabled**: When running in detected virtual environments
- **Tag**: `dangerous_virtual_needed`
- **Tests Include**:
  - System file modifications
  - Network namespace creation
  - Kernel module operations
  - QEMU emulation
  - Docker container builds
  - Root privilege operations

## Environment Detection

The system automatically detects the following virtual environments:
- Docker containers
- Kubernetes pods
- VirtualBox VMs
- VMware VMs
- KVM/QEMU VMs
- Xen VMs
- WSL (Windows Subsystem for Linux)
- LXC containers
- systemd-nspawn containers

## Configuration

### Environment Variables

```bash
# Explicitly set test mode
export TEST_MODE="dangerous_virtual_needed"  # or "normal"

# Enable dangerous tests (overrides auto-detection)
export ENABLE_DANGEROUS_TESTS="true"

# Disable dangerous tests even in VMs
export DISABLE_DANGEROUS_TESTS="true"
```

### Command Line Options

```bash
# Run with specific mode
./run_system_tests.sh --mode dangerous_virtual_needed

# Enable dangerous tests
./run_system_tests.sh --enable-dangerous

# Disable dangerous tests in VM
./run_system_tests.sh --disable-dangerous
```

## Features

### Safety Features
- **Automatic Mode Selection**: Detects virtual environments and adjusts test mode
- **Tag-based Filtering**: Tests tagged with `dangerous_virtual_needed` only run in appropriate environments
- **Clear Warnings**: Dangerous tests display warnings about their requirements
- **Skip Reporting**: Shows which tests were skipped and why

### Testing Features
- **Parallel Execution Support**: Tests can run in parallel when safe
- **Detailed Output**: Failed tests show complete output for debugging
- **Summary Report**: Clear pass/fail/skip summary with counts
- **Exit Codes**: Proper exit codes for CI/CD integration

### Virtual Environment Features
- **Multi-platform Detection**: Supports various virtualization technologies
- **Container-aware**: Detects Docker, Kubernetes, LXC environments
- **VM-aware**: Detects VirtualBox, VMware, KVM, QEMU, Xen
- **WSL Support**: Properly detects Windows Subsystem for Linux

## Usage Examples

### Check Current Configuration
```bash
source setup/test_config.sh
print_test_config
```

### Run Tests on Developer Machine
```bash
# Only runs safe tests
./run_system_tests.sh
```

### Run All Tests in Docker
```bash
# Inside Docker container - automatically enables dangerous tests
docker run -it myimage ./run_system_tests.sh
```

### Force Dangerous Tests (Use with Caution)
```bash
# Override safety checks - only use in isolated environments!
ENABLE_DANGEROUS_TESTS=true ./run_system_tests.sh
```

### Run in CI/CD Pipeline
```bash
# Explicitly set mode for CI environment
TEST_MODE=normal ./run_system_tests.sh
```

## Adding New Tests

### Normal Test
```bash
# In run_system_tests.sh
TESTS["my_safe_test"]="tests/my_safe_test.sh"
TEST_TAGS["my_safe_test"]=""  # No tags needed
```

### Dangerous Test
```bash
# In run_system_tests.sh
TESTS["my_dangerous_test"]="tests/my_dangerous_test.sh"
TEST_TAGS["my_dangerous_test"]="dangerous_virtual_needed"
```

## Best Practices

1. **Always Tag Dangerous Tests**: Any test that modifies system state should be tagged
2. **Document Requirements**: Clearly document why a test needs isolation
3. **Provide Cleanup**: Dangerous tests must clean up after themselves
4. **Use Minimal Privileges**: Only request root when absolutely necessary
5. **Test Both Modes**: Ensure your test suite works in both modes
6. **CI/CD Configuration**: Explicitly configure test mode in CI/CD pipelines
7. **Virtual Environment Testing**: Regularly test in actual VMs/containers

## Troubleshooting

### Tests Not Running
- Check mode with `print_test_config`
- Verify virtual environment detection
- Check test tags match current mode

### False Positives in Detection
- Use `DISABLE_DANGEROUS_TESTS=true` to force normal mode
- Report detection issues for new virtualization platforms

### Tests Failing in VMs
- Ensure VM has required capabilities (network namespaces, etc.)
- Check if running with sufficient privileges
- Verify VM configuration supports the test requirements