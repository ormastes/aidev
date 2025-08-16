# Strict Filesystem MCP Server - Implementation Guide

## Overview

The Strict Filesystem MCP Server (`mcp-server-strict.js`) enforces project structure rules to maintain code organization and prevent file duplication. It implements the requirements from your request: "filesystem mcp prevent file on root and not allow make a new file until check name_id".

## Key Features

### 1. Root Directory Protection
- **Prevents unauthorized files in root directory**
- Only allows specific files like README.md, CLAUDE.md, package.json
- Enforces directory-based organization

### 2. NAME_ID.vf.json Integration
- **Mandatory registration before file creation**
- Tracks file purposes to prevent duplication
- Maintains file relationships and metadata

### 3. Duplicate Purpose Detection
- **Similarity scoring algorithm**
- Prevents creation of files with similar purposes
- Suggests existing files when duplicates detected

## Configuration

### Claude Desktop Integration

The server is configured in `~/.config/claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "filesystem-mcp-strict": {
      "command": "node",
      "args": [
        "/path/to/mcp-server-strict.js"
      ],
      "env": {
        "VF_BASE_PATH": "/path/to/project"
      }
    }
  }
}
```

### Project Configuration

Updated `mcp-config.json` with:
- Default server set to `filesystem-mcp-strict`
- Validation rules for allowed files and directories
- Feature flags for strict enforcement

## Available Tools

### 1. `check_file_allowed`
Validates if a file can be created based on:
- Root directory rules
- NAME_ID registration
- Duplicate purpose detection

**Example:**
```json
{
  "path": "new-file.js",
  "purpose": "Utility for data processing",
  "checkDuplicate": true
}
```

**Response:**
```json
{
  "allowed": false,
  "issues": [
    {
      "type": "ROOT_FILE_VIOLATION",
      "message": "Files cannot be created in root directory"
    }
  ],
  "suggestions": ["Move file to appropriate directory"]
}
```

### 2. `register_file`
Registers a new file in NAME_ID.vf.json:

**Example:**
```json
{
  "path": "layer/themes/new-theme/index.ts",
  "purpose": "New theme implementation",
  "category": "features",
  "tags": ["theme", "implementation"]
}
```

### 3. `write_file_with_validation`
Creates a file only after validation passes:

**Example:**
```json
{
  "path": "gen/doc/report.md",
  "content": "# Report Content",
  "purpose": "Test coverage report",
  "category": "documentation",
  "force": false
}
```

### 4. `check_duplicate_purpose`
Finds files with similar purposes:

**Example:**
```json
{
  "purpose": "error handling utility",
  "threshold": 0.7
}
```

### 5. `list_similar_files`
Lists files with similar purposes:

**Example:**
```json
{
  "purpose": "configuration management",
  "limit": 5
}
```

### 6. `validate_project_structure`
Validates entire project against rules:

**Example:**
```json
{
  "fix": false
}
```

## Validation Rules

### Allowed Root Files
Only these files can exist in the root directory:
- README.md
- CLAUDE.md
- package.json
- tsconfig.json
- .gitignore
- NAME_ID.vf.json
- TASK_QUEUE.vf.json
- FEATURE.vf.json
- FILE_STRUCTURE.vf.json
- pyproject.toml
- .behaverc
- .python-version

### Allowed Directories
New files should be created in:
- `gen/doc/` - Generated documentation
- `layer/themes/` - Theme implementations
- `layer/epics/` - Epic definitions
- `config/` - Configuration files
- `scripts/` - Utility scripts
- `tests/` - Test files
- `test/system/` - System tests
- `common/` - Common utilities
- `demo/` - Demo files
- `examples/` - Example code
- `xlib/` - External libraries

### File Naming Conventions
- Must use alphanumeric characters, dots, hyphens, underscores
- Pattern: `/^[a-zA-Z0-9._-]+$/`

## Workflow Examples

### Creating a New File

1. **Check if allowed:**
```bash
# Tool: check_file_allowed
{
  "path": "layer/themes/new-feature/index.ts",
  "purpose": "Feature entry point"
}
```

2. **If allowed, write with validation:**
```bash
# Tool: write_file_with_validation
{
  "path": "layer/themes/new-feature/index.ts",
  "content": "export const feature = {};",
  "purpose": "Feature entry point",
  "category": "features"
}
```

### Handling Violations

When a file creation is blocked:

1. **Root file violation:**
   - Move to appropriate directory
   - Use `gen/doc/` for documentation
   - Use `layer/themes/` for features

2. **Duplicate purpose:**
   - Extend existing file instead
   - Use more specific purpose
   - Force with justification if necessary

### Force Override

For exceptional cases:
```json
{
  "path": "emergency-fix.js",
  "content": "// Emergency patch",
  "purpose": "Critical production fix",
  "category": "utilities",
  "force": true,
  "justification": "Emergency production issue #123"
}
```

## Testing

Run validation tests:
```bash
node test-strict-mcp.js
```

Test results show:
- ✅ Root files properly blocked
- ✅ Allowed files pass validation
- ✅ Directory rules enforced
- ✅ Duplicate detection working
- ✅ Similar file search functional

## Benefits

1. **Prevents Root Clutter**: No unauthorized files in root
2. **Avoids Duplication**: Detects similar purposes before creation
3. **Maintains Organization**: Enforces directory structure
4. **Tracks Purpose**: Every file has documented purpose
5. **Enables Discovery**: Easy to find existing functionality

## Migration Path

To migrate existing projects:

1. Run `validate_project_structure` to identify issues
2. Move root files to appropriate directories
3. Register existing files in NAME_ID.vf.json
4. Enable strict mode as default

## Troubleshooting

### Common Issues

1. **"File creation blocked"**
   - Check if file is in root
   - Verify directory is allowed
   - Review duplicate purposes

2. **"NAME_ID registration failed"**
   - Ensure NAME_ID.vf.json exists
   - Check file permissions
   - Verify JSON syntax

3. **"Duplicate purpose detected"**
   - Review similar files
   - Consider extending existing file
   - Use more specific purpose

### Debug Mode

Set environment variable for verbose logging:
```bash
DEBUG=mcp:* node mcp-server-strict.js
```

## Future Enhancements

Planned improvements:
- Auto-suggest appropriate directories
- AI-powered purpose generation
- Visual file relationship mapping
- Git hook integration
- IDE plugin support

## Summary

The Strict MCP Server successfully implements:
- ✅ Root file prevention (as requested)
- ✅ NAME_ID validation before file creation (as requested)
- ✅ Duplicate purpose detection
- ✅ Project structure validation
- ✅ Force override with justification

This ensures clean project organization and prevents file duplication while maintaining flexibility for exceptional cases.

---
*Generated: 2025-08-15*
*Version: 3.0.0*