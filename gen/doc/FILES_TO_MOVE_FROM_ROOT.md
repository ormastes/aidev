# Files That Should Not Be on Root Directory

## Overview

According to CLAUDE.md rules: **"Do not create files on root."** The following files and directories should be moved to appropriate locations.

## Python Scripts (Should move to `scripts/`)

1. **ollama_clean.py** → `scripts/ollama/ollama_clean.py`
2. **ollama_manager.py** → `scripts/ollama/ollama_manager.py`
3. **ollama_wrapper.py** → `scripts/ollama/ollama_wrapper.py`

## Shell Scripts (Should move to `scripts/`)

1. **setup_ollama_clean.sh** → `scripts/setup/setup_ollama_clean.sh`
2. **setup_ollama_manager.sh** → `scripts/setup/setup_ollama_manager.sh`

## Service Files (Should move to `config/services/`)

1. **ollama-manager.service** → `config/services/ollama-manager.service`

## Configuration Files (Acceptable on root but could be moved)

1. **pyproject.toml** → Can stay on root (standard Python project file) OR move to `config/python/`

## Temporary/Generated Directories (Should be in `gen/` or git-ignored)

1. **release/** → Should be git-ignored or moved to `gen/release/`
2. **temp/** → Should be removed or moved to `gen/temp/`
3. **test-output.log** → `gen/logs/test-output.log`
4. **test-results/** → `gen/test-results/`
5. **test-vf-files/** → `gen/test/test-vf-files/`
6. **ollama_manager.log** → `gen/logs/ollama_manager.log`

## Files That Can Stay on Root

These files are standard and acceptable on root:

- `.gitignore`
- `.behaverc`
- `.python-version`
- `.jj/` (version control)
- `.github/` (GitHub configuration)
- `.vscode/` (IDE configuration)
- `.claude/` (Claude configuration)
- `CLAUDE.md`
- `README.md`
- `FEATURE.md`
- `FEATURE.vf.json`
- `TASK_QUEUE.md`
- `TASK_QUEUE.vf.json`
- `FILE_STRUCTURE.md`
- `FILE_STRUCTURE.vf.json`
- `NAME_ID.vf.json`
- `package.json`

## Recommended Actions

### Move Script Files
```bash
# Create directories if needed
mkdir -p scripts/ollama
mkdir -p scripts/setup
mkdir -p config/services

# Move Python scripts
mv ollama_*.py scripts/ollama/
mv setup_ollama_*.sh scripts/setup/

# Move service file
mv ollama-manager.service config/services/
```

### Clean Temporary Files
```bash
# Move or remove temporary directories
mkdir -p gen/logs
mkdir -p gen/test

mv test-output.log gen/logs/
mv ollama_manager.log gen/logs/
mv test-results/ gen/
mv test-vf-files/ gen/test/

# Remove temp if empty or move contents
rm -rf temp/  # or mv temp/ gen/temp/
```

### Update .gitignore
Add these entries to `.gitignore`:
```
# Temporary and generated files
/release/
/temp/
*.log
test-results/
test-vf-files/

# Generated directories
gen/logs/
gen/temp/
gen/test/
gen/release/
```

## Summary

**Total files to move from root:** 14
- 3 Python scripts
- 2 Shell scripts  
- 1 Service file
- 2 Log files
- 3 Test directories
- 2 Temporary directories
- 1 Release directory

Moving these files will comply with the "Do not create files on root" rule and improve project organization.