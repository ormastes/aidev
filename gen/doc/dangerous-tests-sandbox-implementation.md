# Dangerous Tests Virtual Environment Sandbox Implementation

## Summary

Implemented comprehensive virtual environment protection for dangerous system tests across the AI Development Platform.

## Identified Dangerous User Stories

### High-Risk Stories Requiring Sandbox Protection:

1. **infra_external-log-lib/001-basic-log-capture**
   - Process termination operations (`kill()`)
   - Child process management

2. **infra_external-log-lib/004-real-time-streaming**
   - Process spawning and monitoring
   - System resource manipulation

3. **llm-agent_pocketflow/002-quick-automation-flows**
   - Arbitrary command execution (`exec()`, `system()`)
   - Dynamic code evaluation

4. **llm-agent_coordinator-vllm/027-vllm-coordinator**
   - System-level package installation
   - GPU/hardware access

5. **infra_story-reporter/007-story-reporter**
   - Distributed build execution
   - External process coordination

6. **portal_gui-selector/023-gui-selector-server**
   - Browser automation
   - Authentication flow testing

## Implementation Details

### Created Infrastructure Theme: `infra_test-sandbox`

#### Core Components:

1. **SandboxManager** (`src/sandbox-manager.ts`)
   - Supports Docker, QEMU, Podman, Firecracker
   - Resource limits (memory, CPU, timeout)
   - Network isolation options
   - Automatic cleanup

2. **TestWrapper** (`src/test-wrapper.ts`)
   - Playwright test integration
   - Automatic danger level detection
   - Decorator support for easy adoption
   - Profile-based configuration

3. **Configuration System** (`config/sandbox-config.json`)
   - Danger pattern matching
   - User story specific overrides
   - Environment-based profiles
   - Runtime provider detection

### Sandbox Providers:

| Provider | Use Case | Isolation Level | Performance |
|----------|----------|-----------------|-------------|
| Docker | General testing | High | Fast |
| QEMU | System modifications | Maximum | Slower |
| Podman | Rootless containers | High | Fast |
| Firecracker | Micro-VMs | Maximum | Very Fast |

### Danger Levels:

- **Critical**: Full system isolation (QEMU/Firecracker)
- **High**: Container with strict limits
- **Medium**: Standard container isolation
- **Low**: Basic sandboxing

## Usage Examples

```typescript
// Automatic sandboxing with danger detection
import { test } from '@aidev/test-sandbox';

test('dangerous process operation', async ({ sandbox }) => {
  await sandbox.runTest(async () => {
    // Dangerous operations safe in sandbox
    await exec('pkill -f test-process');
  }, { 
    useSandbox: true,
    dangerLevel: 'high'
  });
});

// Decorator-based sandboxing
class SystemTests {
  @sandboxed({ useSandbox: true, dangerLevel: 'critical' })
  async testSystemModification() {
    await exec('rm -rf /tmp/*');
  }
}
```

## Setup Instructions

```bash
# Install and configure sandbox
cd layer/themes/infra_test-sandbox
npm install
./scripts/setup-sandbox.sh

# Run sandboxed tests
npm test -- --sandbox
npm test -- --sandbox=docker
npm test -- --sandbox=qemu
```

## Benefits

1. **Safety**: Prevents dangerous operations from affecting host system
2. **Reproducibility**: Consistent test environment
3. **Isolation**: Network, filesystem, and process isolation
4. **Flexibility**: Multiple virtualization backends
5. **Performance**: Optimized for different danger levels

## Next Steps

1. Migrate existing dangerous tests to use sandbox
2. Add CI/CD pipeline integration
3. Implement sandbox metrics and monitoring
4. Create sandbox test templates
5. Add Windows/macOS specific providers

## Files Created

- `layer/themes/infra_test-sandbox/README.md`
- `layer/themes/infra_test-sandbox/src/sandbox-manager.ts`
- `layer/themes/infra_test-sandbox/src/test-wrapper.ts`
- `layer/themes/infra_test-sandbox/src/global-setup.ts`
- `layer/themes/infra_test-sandbox/src/global-teardown.ts`
- `layer/themes/infra_test-sandbox/config/sandbox-config.json`
- `layer/themes/infra_test-sandbox/examples/dangerous-test-sandboxed.ts`
- `layer/themes/infra_test-sandbox/scripts/setup-sandbox.sh`
- `layer/themes/infra_test-sandbox/package.json`
- `layer/themes/infra_test-sandbox/playwright.sandbox.config.ts`