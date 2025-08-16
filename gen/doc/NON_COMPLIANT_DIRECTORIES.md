# Non-Compliant Directories Report

## Overview

This report identifies directories that violate the project structure rules or should be cleaned up.

## Categories of Issues

### 1. Build/Dependency Directories in Themes

**Issue:** Node modules and build directories should not be committed to version control.

**Found in:** `layer/themes/research/user-stories/circular-dependency-detection/`
- `node_modules/` - Should be git-ignored
- `dist/` - Build output, should be git-ignored
- `build/` - Build output, should be git-ignored

**Action Required:**
```bash
# Add to .gitignore
layer/**/node_modules/
layer/**/dist/
layer/**/build/
layer/**/.next/
layer/**/out/
layer/**/coverage/
```

### 2. Temporary Directories Throughout Project

**Issue:** Multiple `temp/` directories exist in various locations.

**Locations Found:**
- `./layer/themes/temp/` - Empty theme directory
- `./layer/themes/portal_security/temp/`
- `./layer/themes/portal_security/tests/temp/`
- `./layer/themes/init_env-config/user-stories/026-auto-env-generation/temp/`
- Multiple environment subdirectories with `temp/` folders (19 total)

**Action Required:**
```bash
# Remove all temp directories
find . -type d -name "temp" -not -path "./_aidev/*" -not -path "./gen/temp" -exec rm -rf {} +

# Or add to .gitignore if they're needed for runtime
**/temp/
!gen/temp/
```

### 3. Acceptable Hidden Directories

These directories are standard and acceptable:
- `.git/` - Git version control (standard)
- `.venv/` - Python virtual environment (standard, already in .gitignore)

### 4. Empty or Placeholder Directories

**Issue:** Some directories appear to be empty placeholders.

- `layer/themes/temp/` - Appears to be an empty theme, should be removed or properly implemented

## Summary Statistics

- **Node modules found:** 1 location (with many subdirectories)
- **Build directories found:** Multiple in circular-dependency-detection
- **Temp directories found:** 20+ locations
- **Total non-compliant:** ~25 directories

## Recommended Actions

### Immediate Actions

1. **Update .gitignore** to exclude build artifacts:
```gitignore
# Build and dependency directories
**/node_modules/
**/dist/
**/build/
**/.next/
**/out/
**/coverage/
**/temp/
!gen/temp/
```

2. **Clean existing directories:**
```bash
# Remove node_modules and build artifacts
find layer -type d \( -name "node_modules" -o -name "dist" -o -name "build" \) -exec rm -rf {} +

# Remove temp directories (except gen/temp)
find . -type d -name "temp" -not -path "./gen/temp" -not -path "./_aidev/*" -exec rm -rf {} +
```

3. **Remove empty theme:**
```bash
# Check if layer/themes/temp is empty and remove
[ -z "$(ls -A layer/themes/temp)" ] && rm -rf layer/themes/temp
```

### Long-term Actions

1. **Establish directory structure guidelines** in documentation
2. **Create pre-commit hooks** to prevent committing build artifacts
3. **Regular cleanup scripts** to maintain project hygiene
4. **Document temporary directory usage** if they're needed for runtime

## Compliance Status

- **Root directory:** ✅ Clean (after recent cleanup)
- **Layer structure:** ⚠️ Contains build artifacts and temp directories
- **Config directory:** ✅ Properly organized
- **Gen directory:** ✅ Properly used for generated content
- **Scripts directory:** ✅ Well organized

## Next Steps

1. Execute the cleanup commands above
2. Update .gitignore with recommended patterns
3. Run `git rm -r --cached` on already tracked directories
4. Commit the cleanup changes
5. Document the directory structure rules clearly