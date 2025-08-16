# NAME_ID.vf.json - File Management & Purpose Tracking System

## Overview

The `NAME_ID.vf.json` file is a critical infrastructure component that serves as a **centralized registry** for tracking files, their purposes, and relationships within the AI Development Platform. It acts as a "phone book" for the entire project, mapping human-readable names to unique IDs while maintaining crucial metadata about each file's purpose and location.

## Core Functions

### 1. Name-to-ID Mapping
- Maps file names to unique identifiers (e.g., `README.md` → `doc-001`)
- Enables quick lookup and reference across the system
- Prevents naming conflicts and duplication

### 2. Purpose Tracking
- Documents WHY each file exists
- Tracks the intended use case for every file
- Helps prevent duplicate files with similar purposes

### 3. Relationship Management
- Maintains parent-child relationships between files
- Tracks dependencies and related files
- Enables hierarchical file organization

### 4. Duplication Prevention
- Detects when a new file would duplicate existing functionality
- Enforces single-responsibility principle
- Reduces code redundancy

## File Structure

```json
{
  "metadata": {
    "version": "2.0.0",
    "features": {
      "purpose_tracking": true,
      "duplication_prevention": true,
      "parent_child_relationships": true,
      "content_hashing": true
    }
  },
  "purposes": {
    "documentation": [...],
    "configuration": [...],
    "utilities": [...],
    "purpose-tracker": [...]
  },
  "rules": {
    "file_creation": {...},
    "naming_conventions": {...},
    "parent_child_rules": {...}
  }
}
```

## Purpose Categories

### 1. Documentation (`documentation`)
Files that provide information, guides, or instructions:
- `README.md` - Main project documentation
- `CLAUDE.md` - Claude Code configuration
- API documentation
- User guides

### 2. Configuration (`configuration`)
System configuration and settings files:
- `FEATURE.vf.json` - Feature tracking
- `TASK_QUEUE.vf.json` - Task management
- `FILE_STRUCTURE.vf.json` - File organization
- Environment configs

### 3. Utilities (`utilities`)
Reusable code components:
- Error handlers
- Service naming utilities
- Docker configuration generators
- Common helper functions

### 4. Purpose Tracker (`purpose-tracker`)
Infrastructure for the tracking system itself:
- `VFFilePurposeTracker.ts` - Core tracking implementation
- Validation systems
- Duplication detection logic

## Entry Structure

Each entry in NAME_ID.vf.json contains:

```json
{
  "id": "unique-identifier",
  "name": "filename.ext",
  "data": {
    "filePath": "full/path/to/file",
    "purpose": "Clear description of why this file exists",
    "theme": "associated theme/module",
    "directory": "parent directory",
    "parentId": "parent file ID (if applicable)",
    "children": ["child-id-1", "child-id-2"],
    "metadata": {
      "contentHash": "hash for duplicate detection",
      "size": 1234,
      "mimeType": "text/typescript",
      "createdAt": "ISO timestamp",
      "updatedAt": "ISO timestamp"
    },
    "tags": ["relevant", "searchable", "tags"],
    "status": "active|deprecated|archived"
  },
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp"
}
```

## Rules and Validation

### File Creation Rules
```json
{
  "require_purpose": true,        // Must specify why file exists
  "require_theme_or_directory": true,  // Must belong somewhere
  "prevent_duplication": true,    // Check for existing similar files
  "validation_timeout_minutes": 10  // Time limit for validation
}
```

### Naming Conventions
- **Themes**: `^[a-z0-9]+(-[a-z0-9]+)*$` (lowercase, hyphenated)
- **Directories**: `^[a-zA-Z0-9/_-]+$` (alphanumeric with separators)
- **Files**: `^[a-zA-Z0-9._-]+$` (standard file naming)

### Parent-Child Rules
- No circular dependencies allowed
- Maximum depth of 10 levels
- Children inherit tags from parents

## Usage Examples

### Adding a New File Entry

```javascript
// When creating a new utility file
{
  "id": "util-004",
  "name": "cache-manager.ts",
  "data": {
    "filePath": "layer/themes/shared/src/utils/cache-manager.ts",
    "purpose": "Manages in-memory caching with TTL support for API responses",
    "theme": "shared",
    "directory": "layer/themes/shared/src/utils",
    "metadata": {
      "contentHash": "sha256:abc123...",
      "size": 3456,
      "mimeType": "text/typescript",
      "createdAt": "2025-08-14T12:00:00.000Z",
      "updatedAt": "2025-08-14T12:00:00.000Z"
    },
    "tags": ["utility", "caching", "performance", "shared"],
    "status": "active"
  }
}
```

### Querying Files by Purpose

To find all error handling utilities:
1. Look in the `utilities` category
2. Filter by tags containing "error-handling"
3. Check purpose descriptions for error-related keywords

### Detecting Duplicates

Before creating a new file:
1. Check if similar purpose exists in NAME_ID.vf.json
2. Compare against existing file purposes
3. Verify no content hash matches
4. Ensure unique functionality

## Integration with MCP

The filesystem MCP servers use NAME_ID.vf.json for:

1. **Validation**: Ensuring new files have defined purposes
2. **Lookup**: Quick file discovery by name or ID
3. **Relationships**: Understanding file dependencies
4. **Organization**: Maintaining project structure

### MCP Tools for NAME_ID Management

```bash
# Read NAME_ID.vf.json
mcp-tool read_vf_file --path NAME_ID.vf.json

# Search for files by purpose
mcp-tool search_vf_content --query "error handling" --fields "purposes.*.data.purpose"

# Add new file entry
mcp-tool write_vf_file --path NAME_ID.vf.json --content {...}
```

## Best Practices

### 1. Always Define Purpose
Every file should have a clear, specific purpose:
- ❌ Bad: "Utility functions"
- ✅ Good: "Service name conversion utilities for environment variables and Docker"

### 2. Use Descriptive IDs
IDs should indicate category and sequence:
- `doc-001` for documentation
- `util-003` for utilities
- `config-002` for configuration

### 3. Maintain Relationships
Link related files:
- Parent configs to child configs
- Main modules to sub-modules
- Documentation to implementation

### 4. Tag Appropriately
Use consistent, searchable tags:
- Category tags: `utility`, `documentation`, `configuration`
- Function tags: `error-handling`, `caching`, `validation`
- Scope tags: `shared`, `platform`, `theme-specific`

### 5. Update Status
Mark deprecated or archived files:
- `active` - Currently in use
- `deprecated` - Scheduled for removal
- `archived` - Kept for reference only

## Common Operations

### Finding a File's Purpose
```javascript
// Look up by name
const entry = purposes.utilities.find(e => e.name === 'error-handler.ts');
console.log(entry.data.purpose);
```

### Checking for Duplicates
```javascript
// Before creating new error handler
const existing = Object.values(purposes).flat()
  .filter(e => e.data.purpose.includes('error') && e.data.status === 'active');
```

### Adding Parent-Child Relationship
```javascript
// Link configuration files
parentEntry.data.children = ['config-002', 'config-003'];
childEntry.data.parentId = 'config-001';
```

## Maintenance

### Regular Tasks
1. **Audit**: Review entries for accuracy monthly
2. **Cleanup**: Remove deprecated entries quarterly
3. **Validation**: Check all file paths exist
4. **Deduplication**: Identify and merge similar files

### Automated Checks
The VFFilePurposeTracker.ts implements:
- Duplicate detection on file creation
- Purpose validation before commits
- Relationship integrity checks
- Content hash verification

## Benefits

1. **Discoverability**: Easy to find existing functionality
2. **Prevention**: Stops duplicate file creation
3. **Documentation**: Self-documenting codebase
4. **Organization**: Clear project structure
5. **Maintenance**: Easier refactoring and cleanup
6. **Onboarding**: New developers understand file purposes

## Integration Points

NAME_ID.vf.json integrates with:
- **TASK_QUEUE.vf.json**: Links tasks to relevant files
- **FEATURE.vf.json**: Associates features with implementation files
- **FILE_STRUCTURE.vf.json**: Defines organizational hierarchy
- **CI/CD**: Validates file purposes in pipelines
- **IDE**: Provides context in development tools

## Troubleshooting

### File Not Found in Registry
- Check if recently added
- Verify correct category
- Ensure NAME_ID.vf.json is updated

### Duplicate Purpose Detected
- Review existing files with similar purpose
- Consider extending existing file instead
- Update purpose to be more specific

### Invalid Relationship
- Check for circular dependencies
- Verify parent exists
- Ensure depth limit not exceeded

## Future Enhancements

Planned improvements:
1. **Auto-generation**: Scan codebase and generate entries
2. **AI-assisted**: Use LLM to suggest purposes
3. **Visual mapping**: Graph visualization of relationships
4. **Smart search**: Fuzzy matching and semantic search
5. **Version tracking**: History of purpose changes

---

*The NAME_ID.vf.json file is essential for maintaining a well-organized, discoverable, and maintainable codebase. Always update it when adding new files to the project.*