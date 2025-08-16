# File Structure Documentation

Project structure is defined in FILE_STRUCTURE.vf.json.
This documentation provides a human-readable overview.

## Structure Definition
See: [FILE_STRUCTURE.vf.json](./FILE_STRUCTURE.vf.json)

## Key Directories

### Root Level
- `CLAUDE.md` - Claude Code configuration
- `README.md` - Project documentation
- `layer/` - Hierarchical theme layers
- `gen/` - Generated content
- `llm_rules/` - LLM agent rules

### Theme Structure
Each theme in `layer/themes/*/` follows:
- `pipe/index.ts` - Public API gateway (required)
- `src/` - Source code
- `tests/` - Test files
- `FEATURE.vf.json` - Feature definitions
- `TASK_QUEUE.vf.json` - Task queue
- `NAME_ID.vf.json` - Entity registry

---
*Generated to satisfy FILE_STRUCTURE.vf.json requirements*