# Migration Guide: LSP-MCP v1.0 to v1.1

## Overview

Version 1.1.0 introduces multi-instance support, allowing you to run multiple Language Server Protocol instances for different projects simultaneously. This guide helps you migrate from v1.0 to v1.1.

## Breaking Changes

None. Version 1.1 is fully backward compatible with v1.0. Existing code will continue to work without modifications.

## New Features

### 1. Instance Management

You can now create and manage multiple LSP instances:

```typescript
// Create instances for different projects
const frontendId = await lspMcp.createInstance({
  name: "Frontend",
  rootPath: "/projects/frontend"
});

const backendId = await lspMcp.createInstance({
  name: "Backend", 
  rootPath: "/projects/backend"
});

// List all instances
const instances = await lspMcp.listInstances();

// Switch active instance
await lspMcp.setActiveInstance({ instanceId: backendId });
```

### 2. Instance-Specific Operations

All existing operations now accept an optional `instanceId` parameter:

```typescript
// Old way (still works - uses active instance)
const typeInfo = await lspMcp.getTypeAtPosition({
  file: "src/index.ts",
  line: 10,
  character: 15
});

// New way - specify instance explicitly
const typeInfo = await lspMcp.getTypeAtPosition({
  file: "src/index.ts",
  line: 10,
  character: 15,
  instanceId: "frontend"
});
```

### 3. Automatic Instance Creation

If no instances exist, one will be created automatically based on the file location:

```typescript
// This will auto-create an instance for the project containing the file
const refs = await lspMcp.findReferences({
  file: "/new-project/src/utils.ts",
  line: 5,
  character: 10
});
```

## Migration Strategies

### Option 1: No Changes Required

If you're working with a single project, no changes are needed. The system will:
- Create a default instance on first use
- Use that instance for all operations
- Behave exactly like v1.0

### Option 2: Explicit Instance Management

For multi-project scenarios, explicitly create instances:

```typescript
// Initialize your instances at startup
async function initializeLSP() {
  // Create instances for your projects
  await lspMcp.createInstance({
    name: "Main Project",
    rootPath: process.cwd()
  });
  
  // Additional instances as needed
  if (hasMonorepo) {
    await lspMcp.createInstance({
      name: "Packages",
      rootPath: path.join(process.cwd(), "packages")
    });
  }
}
```

### Option 3: Dynamic Instance Creation

Let instances be created automatically as needed:

```typescript
// Just use the API normally - instances created on demand
const results = await Promise.all([
  lspMcp.getTypeAtPosition({ file: "/project1/src/file.ts", line: 0, character: 0 }),
  lspMcp.getTypeAtPosition({ file: "/project2/src/file.ts", line: 0, character: 0 })
]);
// Two instances will be created automatically
```

## Best Practices

### 1. Instance Naming

Use descriptive names for instances:

```typescript
// Good
await lspMcp.createInstance({
  name: "E-commerce Frontend",
  rootPath: "/projects/ecommerce/frontend"
});

// Less descriptive
await lspMcp.createInstance({
  name: "project1",
  rootPath: "/projects/ecommerce/frontend"
});
```

### 2. Instance Lifecycle

Clean up instances when done:

```typescript
// Remove instances you no longer need
await lspMcp.removeInstance({ instanceId: "old-project" });

// Or keep them for faster access later
const instances = await lspMcp.listInstances();
console.log(`${instances.length} instances running`);
```

### 3. Performance Considerations

- Instances initialize in the background
- First request to a new instance may be slower
- Keep frequently-used instances running
- Remove unused instances to free memory

## Example: Monorepo Setup

```typescript
// Setup for a monorepo with multiple packages
async function setupMonorepoLSP() {
  // Root instance for shared types
  const rootId = await lspMcp.createInstance({
    name: "Monorepo Root",
    rootPath: "/monorepo"
  });
  
  // Package-specific instances
  const webId = await lspMcp.createInstance({
    name: "Web App",
    rootPath: "/monorepo/packages/web"
  });
  
  const apiId = await lspMcp.createInstance({
    name: "API Server",
    rootPath: "/monorepo/packages/api"
  });
  
  // Set default based on current work
  await lspMcp.setDefaultInstance({ 
    instanceId: process.cwd().includes("web") ? webId : apiId 
  });
}
```

## Troubleshooting

### Instance Not Found

If you get "No LSP instance found" errors:

1. Check that the instance exists:
   ```typescript
   const instances = await lspMcp.listInstances();
   console.log(instances.map(i => i.id));
   ```

2. Ensure instance is initialized:
   ```typescript
   // Wait a moment after creation for background init
   await new Promise(resolve => setTimeout(resolve, 1000));
   ```

### Memory Usage

Monitor memory usage with multiple instances:

```typescript
// Remove unused instances
const instances = await lspMcp.listInstances();
for (const instance of instances) {
  if (Date.now() - instance.lastUsed.getTime() > 3600000) { // 1 hour
    await lspMcp.removeInstance({ instanceId: instance.id });
  }
}
```

## Summary

Version 1.1 adds powerful multi-instance capabilities while maintaining full backward compatibility. You can:
- Continue using existing code unchanged
- Gradually adopt instance management features
- Scale to handle multiple projects efficiently

For questions or issues, please refer to the main documentation or file an issue on the project repository.