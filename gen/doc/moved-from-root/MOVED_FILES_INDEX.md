# Documentation Files Moved from Root

This directory contains documentation files that were previously in the root directory.
According to CLAUDE.md rules, only README.md and CLAUDE.md should remain in root.

## Files Moved (Date: 2025-08-16)

The following files have been moved from the root directory to `gen/doc/moved-from-root/`:

1. **EXECUTIVE_SUMMARY_FILE_API.md**
   - Executive summary of File API implementation
   - Original location: `/EXECUTIVE_SUMMARY_FILE_API.md`

2. **FEATURE.md**
   - Feature documentation and backlog
   - Original location: `/FEATURE.md`
   - Note: The active feature tracking uses `FEATURE.vf.json` format

3. **FILE_API_PROJECT_COMPLETION.md**
   - File API project completion report
   - Original location: `/FILE_API_PROJECT_COMPLETION.md`

4. **FILE_STRUCTURE.md**
   - File structure documentation
   - Original location: `/FILE_STRUCTURE.md`
   - Note: The active file structure uses `FILE_STRUCTURE.vf.json` format

5. **FRAUD_CHECK_REPORT.md**
   - Fraud check analysis report
   - Original location: `/FRAUD_CHECK_REPORT.md`

6. **PROJECT_FRAUD_CHECK_REPORT.md**
   - Project-wide fraud check report
   - Original location: `/PROJECT_FRAUD_CHECK_REPORT.md`

7. **TASK_QUEUE.md**
   - Task queue documentation
   - Original location: `/TASK_QUEUE.md`
   - Note: The active task queue uses `TASK_QUEUE.vf.json` format

## Why These Were Moved

Per CLAUDE.md rules:
- "Do not create files on root"
- "Reports go under 'gen/doc/'"
- Only essential configuration files (CLAUDE.md, README.md) and vf.json files should remain in root

## Active Files Still in Root

The following files correctly remain in the root directory:
- `CLAUDE.md` - Main Claude Code configuration
- `README.md` - Project overview
- `FEATURE.vf.json` - Active feature backlog (filesystem-mcp format)
- `TASK_QUEUE.vf.json` - Active task queue (filesystem-mcp format)
- `FILE_STRUCTURE.vf.json` - Active file structure definitions
- `NAME_ID.vf.json` - Name-based entity storage
- `TASK_QUEUE_REGISTRY.vf.json` - Task queue registry

## Accessing Moved Documentation

All moved documentation can be accessed at:
```
gen/doc/moved-from-root/<filename>
```

These files are preserved for historical reference and documentation purposes.