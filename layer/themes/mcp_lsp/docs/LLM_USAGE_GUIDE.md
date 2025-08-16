# LSP-MCP Theme - LLM Usage Guide

## Quick Start for LLMs

The LSP-MCP theme provides TypeScript/JavaScript code intelligence through Language Server Protocol. Here's how to use it effectively:

### Simple Usage (Auto Mode)

Just call any LSP function with a file path. The system automatically:
1. Detects the project root
2. Creates an LSP instance if needed
3. Returns the requested information

```typescript
// Just provide the file - instance management is automatic
const typeInfo = await lspMcp.getTypeAtPosition({
  file: "/projects/my-app/src/utils.ts",
  line: 10,
  character: 15
});
```

### Key Concepts for LLMs

1. **Instances = Projects**: Each TypeScript/JavaScript project gets its own LSP instance
2. **Auto-Creation**: Instances are created automatically when you access files
3. **Persistent**: Instances stay running for fast subsequent queries
4. **Isolated**: Each instance has its own TypeScript configuration

## Common LLM Tasks

### 1. Understanding Code Types

**Purpose**: Get type information for any symbol in the code

```typescript
// What type is this variable/function/class?
const info = await lspMcp.getTypeAtPosition({
  file: "src/components/Button.tsx",
  line: 25,
  character: 10
});

// Returns:
// {
//   name: "ButtonProps",
//   kind: "interface",
//   type: "interface",
//   documentation: "Properties for Button component",
//   signature: "interface ButtonProps { onClick?: () => void; ... }"
// }
```

### 2. Finding Code Usage

**Purpose**: Find where something is defined or used

```typescript
// Where is this function defined?
const definitions = await lspMcp.goToDefinition({
  file: "src/app.ts",
  line: 15,
  character: 20
});

// Where is this variable used?
const references = await lspMcp.findReferences({
  file: "src/models/User.ts",
  line: 5,
  character: 10
});
```

### 3. Getting Code Suggestions

**Purpose**: Get intelligent code completions

```typescript
// What can I type here?
const suggestions = await lspMcp.getCompletions({
  file: "src/service.ts",
  line: 30,
  character: 15
});

// Returns array of completion items with:
// - label: what to insert
// - kind: type of suggestion (method, property, etc.)
// - documentation: explanation
```

### 4. Understanding Errors

**Purpose**: Get TypeScript errors and warnings

```typescript
// What errors are in this file?
const diagnostics = await lspMcp.getDiagnostics({
  file: "src/broken.ts"
});

// Returns array of:
// {
//   severity: "error",
//   message: "Cannot find name 'nonExistent'",
//   location: { file: "...", range: {...} }
// }
```

## Advanced Usage for Complex Projects

### Working with Multiple Projects

When working with multiple TypeScript projects (like a monorepo):

```typescript
// Option 1: Let auto-detection handle it
// Files from different projects automatically get separate instances
const frontendType = await lspMcp.getTypeAtPosition({
  file: "/monorepo/packages/frontend/src/App.tsx",
  line: 10, character: 5
});

const backendType = await lspMcp.getTypeAtPosition({
  file: "/monorepo/packages/backend/src/server.ts",
  line: 20, character: 10
});

// Option 2: Explicitly create instances for control
const webId = await lspMcp.createInstance({
  name: "Web App",
  rootPath: "/monorepo/packages/web"
});

// Use specific instance
const webTypes = await lspMcp.getTypeAtPosition({
  file: "/monorepo/packages/web/src/index.ts",
  line: 1, character: 0,
  instanceId: webId  // Optional: use specific instance
});
```

### Listing Active Instances

See what LSP servers are running:

```typescript
const instances = await lspMcp.listInstances();
// Returns:
// [{
//   id: "my-project",
//   name: "my-project", 
//   rootPath: "/home/user/my-project",
//   active: true,
//   isDefault: true,
//   isActive: true
// }]
```

## Best Practices for LLMs

### 1. File Paths
- Always use absolute paths (starting with `/`)
- The system finds the project root automatically
- No need to worry about working directories

### 2. Performance
- First call to a new project may be slower (LSP initialization)
- Subsequent calls are fast (LSP server stays running)
- Instances are shared across all queries

### 3. Error Handling
```typescript
try {
  const result = await lspMcp.getTypeAtPosition({
    file: "/path/to/file.ts",
    line: 10,
    character: 15
  });
} catch (error) {
  // Common errors:
  // - File not found
  // - Invalid position
  // - TypeScript syntax errors
}
```

## Quick Reference

### Most Used Functions

| Function | Purpose | Example |
|----------|---------|---------|
| `getTypeAtPosition` | Get type info for symbol | What type is this variable? |
| `goToDefinition` | Find where defined | Where is this function declared? |
| `findReferences` | Find all usages | Where is this class used? |
| `getCompletions` | Get code suggestions | What methods are available? |
| `getHover` | Get quick info | What does this do? |

### Instance Management (Usually Automatic)

| Function | Purpose | When to Use |
|----------|---------|-------------|
| `createInstance` | Create new LSP server | Multiple projects |
| `listInstances` | See running servers | Debugging |
| `removeInstance` | Stop LSP server | Cleanup |

## Examples for Common LLM Scenarios

### Scenario 1: Analyzing Unknown Code

```typescript
// User asks: "What does the processData function do?"

// Step 1: Find the function
const symbols = await lspMcp.getDocumentSymbols({
  file: "/project/src/processor.ts"
});
const processDataSymbol = symbols.find(s => s.name === "processData");

// Step 2: Get type information
const typeInfo = await lspMcp.getTypeAtPosition({
  file: "/project/src/processor.ts",
  line: processDataSymbol.location.range.start.line,
  character: processDataSymbol.location.range.start.character
});

// Step 3: Find usages
const references = await lspMcp.findReferences({
  file: "/project/src/processor.ts",
  line: processDataSymbol.location.range.start.line,
  character: processDataSymbol.location.range.start.character
});
```

### Scenario 2: Helping with Code Completion

```typescript
// User asks: "What methods can I call on this object?"

// Get completions after the dot
const completions = await lspMcp.getCompletions({
  file: "/project/src/app.ts",
  line: 25,
  character: 18  // Right after "myObject."
});

// Filter to just methods
const methods = completions.filter(c => c.kind === "method");
```

### Scenario 3: Understanding Type Errors

```typescript
// User asks: "Why is TypeScript complaining about this line?"

// Get diagnostics for the file
const diagnostics = await lspMcp.getDiagnostics({
  file: "/project/src/components/Form.tsx"
});

// Find errors on specific line
const lineErrors = diagnostics.filter(d => 
  d.location.range.start.line === 42 &&
  d.severity === "error"
);

// Get type info for context
const typeInfo = await lspMcp.getTypeAtPosition({
  file: "/project/src/components/Form.tsx",
  line: 42,
  character: 15
});
```

## Summary

For LLMs using LSP-MCP:
1. **Keep it simple**: Just provide file paths and positions
2. **Auto-magic works**: Instance management happens automatically
3. **Think in projects**: Each project folder gets its own TypeScript analysis
4. **Fast after first call**: LSP servers stay running for quick responses

The system is designed to "just work" without complex configuration. Focus on what information you need, not on managing LSP servers.