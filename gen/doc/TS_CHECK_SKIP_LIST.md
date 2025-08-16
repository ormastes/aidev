# TypeScript Check Skip List

This document defines files and patterns that should be skipped during TypeScript type checking and fraud detection.

## Skip Patterns

### 1. Configuration Files (Required as JavaScript)
These files MUST remain as `.js` because tools expect them in JavaScript format:

```
# Jest Configuration
**/jest.config.js
**/jest.setup.js
**/jest.preset.js

# Cucumber Configuration  
**/cucumber.js
**/.cucumberrc.js

# Build Tools Configuration
**/webpack.config.js
**/webpack.*.js
**/rollup.config.js
**/vite.config.js
**/.eslintrc.js
**/.prettierrc.js
**/babel.config.js
**/.babelrc.js
**/postcss.config.js
**/tailwind.config.js

# Playwright Configuration
**/playwright.config.js

# Next.js Configuration
**/next.config.js

# Package Configuration
**/commitlint.config.js
**/lint-staged.config.js
**/stylelint.config.js
```

### 2. Browser/Client-Side Scripts
Files that run in browsers and may not support TypeScript:

```
**/public/**/*.js
**/static/**/*.js
**/assets/**/*.js
**/dist/**/*.js
**/build/**/*.js
**/out/**/*.js
```

### 3. Database Configuration
Runtime database configuration files:

```
**/config/database.js
**/config/db.js
**/database.config.js
**/knexfile.js
**/ormconfig.js
**/sequelize.config.js
```

### 4. Test Fixtures and Mock Applications
Test helper files that simulate specific behaviors:

```
**/fixtures/**/*.js
**/mocks/**/*.js
**/__mocks__/**/*.js
**/test-helpers/**/*.js
**/test-utils/**/*.js
**/test-apps/**/*.js
**/test-*-app.js
**/mock-*.js
```

### 5. Demo and Release Artifacts
Demo applications and release builds:

```
**/demo/**/*.js
**/release/**/*.js
**/releases/**/*.js
**/examples/**/*.js
**/samples/**/*.js
```

### 6. Generated and Vendor Files
Third-party libraries and generated code:

```
**/vendor/**/*.js
**/vendors/**/*.js
**/lib/vendor/**/*.js
**/third-party/**/*.js
**/generated/**/*.js
**/gen/**/*.js
**/.next/**/*.js
**/*generated*.js
**/prism.js
**/prism-*.js
```

### 7. Scripts and Utilities
Standalone scripts that may not need TypeScript:

```
**/scripts/**/*.js
**/bin/**/*.js
**/tools/**/*.js
**/utils/**/*.js
```

### 8. Node Modules and Dependencies
External dependencies:

```
**/node_modules/**
**/.pnpm/**
**/bower_components/**
```

### 9. Environment and Cache
Build caches and environment files:

```
**/.cache/**
**/.temp/**
**/.tmp/**
**/temp/**
**/tmp/**
**/.env.js
**/env.config.js
```

### 10. Coverage and Test Results
Generated test artifacts:

```
**/coverage/**
**/.nyc_output/**
**/test-results/**
**/test-reports/**
**/.jest/**
```

## File Extension Rules

### Always Skip
- `*.min.js` - Minified files
- `*.bundle.js` - Bundled files  
- `*.chunk.js` - Code split chunks
- `*.compiled.js` - Compiled output
- `*.generated.js` - Generated files
- `*.config.js` - Configuration files
- `*.setup.js` - Setup files
- `*.preset.js` - Preset files

### Conditional Skip
These should be evaluated case-by-case:
- `*.test.js` - Test files (convert if possible)
- `*.spec.js` - Spec files (convert if possible)
- `*.d.ts` - TypeScript declaration files (already TS)

## Implementation Notes

1. **Priority Order**: If a file matches multiple patterns, the most specific pattern takes precedence.

2. **Case Sensitivity**: Pattern matching should be case-insensitive for file extensions.

3. **Path Matching**: Use glob patterns for path matching, supporting:
   - `*` - Match any characters except path separator
   - `**` - Match any characters including path separator
   - `?` - Match single character
   - `{a,b}` - Match either a or b

4. **Dynamic Updates**: This list should be maintained and updated as new patterns are discovered.

## Usage in Fraud Checker

The fraud checker should:
1. Load this skip list on initialization
2. Check each file against these patterns before analysis
3. Mark skipped files with reason: "Legitimate JavaScript file (see TS_CHECK_SKIP_LIST.md)"
4. Optionally log skipped files for audit purposes

## Maintenance

This file should be reviewed and updated:
- When new tools are added that require JavaScript configuration
- When new demo or release processes are established
- When third-party libraries are added
- Quarterly, to ensure patterns remain current