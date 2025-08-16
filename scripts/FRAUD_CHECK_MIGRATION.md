# Fraud Check Scripts Migration Notice

## Migration Complete: August 16, 2025

All fraud checking logic has been consolidated into the `infra_fraud-checker` theme for better organization and maintainability.

## New Location

All fraud checking functionality is now located at:
```
layer/themes/infra_fraud-checker/
```

## Updated Script Locations

| Old Location | New Location | Status |
|--------------|--------------|--------|
| `scripts/run-fraud-check.ts` | `layer/themes/infra_fraud-checker/scripts/run-fraud-check.ts` | ✅ Migrated (wrapper remains) |
| `scripts/scan-direct-file-access.js` | `layer/themes/infra_fraud-checker/src/scanners/direct-file-access-scanner.js` | ✅ Migrated |
| `scripts/test-fraud-checker-implementation.ts` | `layer/themes/infra_fraud-checker/tests/` | ⚠️ To be migrated |
| `scripts/test-fraud-checker-skip.js` | `layer/themes/infra_fraud-checker/tests/` | ⚠️ To be migrated |

## How to Use

### Option 1: Use the wrapper script (recommended for compatibility)
```bash
# From project root
bash scripts/run-fraud-check.sh [options]
```

### Option 2: Use the theme directly
```bash
# From project root
bun layer/themes/infra_fraud-checker/scripts/run-fraud-check.ts [options]
```

### Available Options
```
--mode <type>      Check mode: comprehensive, direct-access, all (default: all)
--fix              Auto-fix issues where possible
--imports-only     Only check for direct external imports
--format <type>    Output format: console, json, markdown (default: console)
--output <path>    Save report to file
--help, -h         Show help message
```

## Examples

### Run all fraud checks
```bash
bun layer/themes/infra_fraud-checker/scripts/run-fraud-check.ts
```

### Run with auto-fix
```bash
bun layer/themes/infra_fraud-checker/scripts/run-fraud-check.ts --fix
```

### Generate markdown report
```bash
bun layer/themes/infra_fraud-checker/scripts/run-fraud-check.ts \
  --format markdown \
  --output gen/doc/fraud-report.md
```

### Run only direct file access scan
```bash
bun layer/themes/infra_fraud-checker/scripts/run-fraud-check.ts \
  --mode direct-access
```

## Benefits of Migration

1. **Centralized Logic**: All fraud checking code in one theme
2. **Better Organization**: Follows the Hierarchical Encapsulation Architecture
3. **Easier Testing**: Tests co-located with implementation
4. **Theme Isolation**: Can be developed and tested independently
5. **Reusability**: Can be easily shared across projects

## Deprecated Scripts

The following scripts in the `scripts/` directory are now deprecated and will be removed in a future version:
- `scan-direct-file-access.js` (use theme version)
- `test-fraud-checker-implementation.ts` (move to theme tests)
- `test-fraud-checker-skip.js` (move to theme tests)

## Migration Status

✅ **Completed**:
- Core fraud checking logic
- Direct file access scanner
- Comprehensive fraud checker
- CLI interface
- Report generation

⚠️ **Pending**:
- Test file migration
- Integration with CI/CD
- Documentation updates

## Support

For issues or questions about the migration, please refer to:
- Theme documentation: `layer/themes/infra_fraud-checker/docs/`
- Theme README: `layer/themes/infra_fraud-checker/README.md`