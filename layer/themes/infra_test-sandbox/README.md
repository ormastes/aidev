# Test Sandbox Infrastructure

This theme provides virtual environment sandboxing for dangerous system tests.

## Features

- **Docker Containers**: Isolated test execution in containers
- **QEMU VMs**: Full system virtualization for OS-level tests  
- **Process Isolation**: Safe process spawning and termination
- **Resource Limits**: Memory, CPU, and I/O constraints
- **Network Isolation**: Separate network namespaces
- **Filesystem Protection**: Read-only mounts and tmpfs

## Supported Environments

- Docker (lightweight, fast startup)
- QEMU (full isolation, slower)
- Podman (rootless containers)
- Firecracker (micro-VMs)

## Usage

```typescript
import { TestSandbox } from '@aidev/test-sandbox';

const sandbox = new TestSandbox({
  type: 'docker',
  limits: {
    memory: '512m',
    cpus: '0.5'
  }
});

await sandbox.run(async () => {
  // Dangerous operations safe here
  await exec('rm -rf /tmp/*');
});
```