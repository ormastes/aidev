# Circular Dependency Detection System - User Guide

## Overview

The Circular Dependency Detection System is a comprehensive solution for identifying and resolving circular dependencies in TypeScript, C++, and Python codebases. Located under `layer/themes/research/user-stories/circular-dependency-detection/`, this system provides unified tooling for maintaining clean architecture across multi-language projects.

## Features

### Multi-Language Support

#### TypeScript/JavaScript
- **Madge Integration**: Visual dependency graphs with cycle highlighting
- **Dependency Cruiser**: Rule-based validation with customizable policies
- **ds (circular-dependency-scanner)**: Fast AST-based detection

#### C++
- **Clang-Tidy**: Header include cycle detection with `misc-header-include-cycle`
- **cpp-dependencies**: Complete include graph analysis

#### Python
- **Pylint**: Cyclic import detection with R0401 warnings
- **Pycycle**: Dedicated circular import finder
- **circular-imports**: Modern tool with graph visualization

## Installation

### Quick Setup
```bash
# Install all tools at once
cd layer/themes/research/user-stories/circular-dependency-detection
./scripts/install-tools.sh

# Or install individually
npm install -g madge dependency-cruiser circular-dependency-scanner
pip install pylint pycycle circular-imports
# C++ tools require compilation or package manager installation
```

## Usage

### CLI Interface

The system provides a unified CLI tool `circle-deps`:

```bash
# Analyze entire project
circle-deps analyze /path/to/project --languages typescript,cpp,python

# Check for circular dependencies (CI/CD mode)
circle-deps check . --max-cycles 0

# Generate visualization
circle-deps visualize . --output dependency-graph.svg

# Initialize configuration
circle-deps init --languages typescript,python
```

### TypeScript Examples

#### Using Madge
```bash
# Find circular dependencies
madge --circular src/

# Generate visual graph
madge --image graph.svg src/

# Example output:
✖ Found 2 circular dependencies!
1) moduleA.ts -> moduleB.ts -> moduleA.ts  
2) moduleC.ts -> moduleD.ts -> moduleE.ts -> moduleC.ts
```

#### Using Dependency Cruiser
```bash
# Initialize configuration
depcruise --init

# Run analysis
depcruise src --include-only "^src"

# Example output:
error no-circular: Dependency is part of a circular relationship 
  src/moduleX.ts -> src/moduleY.ts -> src/moduleX.ts
```

#### Using ds (circular-dependency-scanner)
```bash
# Scan current directory
ds

# Scan with filters
ds --filter 'src/**/*.ts' --ignore node_modules,dist

# Example output:
Circle.1
  src/components/Header.tsx
  src/components/Navigation.tsx
  src/components/Header.tsx
```

### C++ Examples

#### Using Clang-Tidy
```bash
# Enable include cycle check
clang-tidy -checks=misc-header-include-cycle \
  -header-filter='.*' source.cpp -- -I/include/path

# Example output:
Include cycle detected: A.hpp -> B.hpp -> C.hpp -> A.hpp 
  [misc-header-include-cycle]
```

#### Using cpp-dependencies
```bash
# Analyze project
cpp-dependencies --stats .

# Generate graph
cpp-dependencies --dot dependencies.dot .

# Example output:
Components: 150
Components in cycles: 8
Cycle groups: 2
```

### Python Examples

#### Using Pylint
```bash
# Check for circular imports
pylint my_project/

# Example output:
module_a.py:1: [R0401(cyclic-import), ] Cyclic import (module_a -> module_b)
module_b.py:1: [R0401(cyclic-import), ] Cyclic import (module_b -> module_a)
```

#### Using Pycycle
```bash
# Analyze current project
pycycle --here

# Example output:
Cycle Found :(
a_module/a_file.py: Line 1 -> b_module/b_file.py: Line 1 -> 
c_module/c_file.py: Line 1 =>> a_module/a_file.py
```

#### Using circular-imports
```bash
# Check project
circular-imports path/to/project --exclude .venv,build

# Generate visualization
circular-imports . --output dependency-graph.mermaid

# Example output:
Circular import detected: moduleX -> moduleY -> moduleZ -> moduleX
```

## Configuration

### Configuration File (.circle-deps.json)
```json
{
  "languages": ["typescript", "cpp", "python"],
  "typescript": {
    "tool": "madge",
    "include": ["src/**/*.ts", "src/**/*.tsx"],
    "exclude": ["node_modules", "dist", "**/*.test.ts"],
    "tsConfig": "./tsconfig.json"
  },
  "cpp": {
    "tool": "clang-tidy",
    "include": ["src/**/*.cpp", "include/**/*.hpp"],
    "exclude": ["build", "third_party"],
    "compileCommands": "./build/compile_commands.json"
  },
  "python": {
    "tool": "pylint",
    "include": ["**/*.py"],
    "exclude": ["venv", "__pycache__", "*.pyc"]
  },
  "ci": {
    "failOnCycles": true,
    "maxCycles": 0,
    "outputFormat": "json"
  }
}
```

## CI/CD Integration

### GitHub Actions
```yaml
name: Circular Dependency Check

on: [push, pull_request]

jobs:
  check-dependencies:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Setup Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.10'
      
      - name: Install Dependencies
        run: |
          npm install -g madge dependency-cruiser
          pip install pylint pycycle
      
      - name: Check TypeScript Dependencies
        run: madge --circular src/ || exit 1
      
      - name: Check Python Dependencies
        run: |
          pylint --disable=all --enable=cyclic-import src/ || exit 1
```

### Jenkins Pipeline
```groovy
pipeline {
    agent any
    
    stages {
        stage('Dependency Check') {
            steps {
                sh '''
                    # TypeScript check
                    bunx madge --circular src/
                    
                    # Python check
                    python -m pylint --disable=all --enable=cyclic-import src/
                    
                    # C++ check (if applicable)
                    clang-tidy -checks=misc-header-include-cycle src/*.cpp
                '''
            }
        }
    }
    
    post {
        always {
            publishHTML([
                reportDir: 'reports',
                reportFiles: 'dependencies.html',
                reportName: 'Dependency Report'
            ])
        }
    }
}
```

## Output Formats

### JSON Output
```json
{
  "timestamp": "2025-08-14T12:00:00Z",
  "language": "typescript",
  "tool": "madge",
  "cycles": [
    {
      "id": 1,
      "files": [
        "src/moduleA.ts",
        "src/moduleB.ts",
        "src/moduleA.ts"
      ],
      "severity": "error"
    }
  ],
  "summary": {
    "totalFiles": 150,
    "filesInCycles": 4,
    "cycleCount": 2
  }
}
```

### HTML Report
The system generates interactive HTML reports with:
- Dependency graphs with cycle highlighting
- Sortable tables of detected cycles
- Fix suggestions and refactoring recommendations
- Historical trend charts

### Graph Visualization
Supports multiple formats:
- **SVG**: Scalable vector graphics for documentation
- **PNG**: Raster images for reports
- **DOT**: Graphviz format for further processing
- **Mermaid**: Markdown-compatible diagrams

## Best Practices

### Prevention Strategies

1. **Layer Architecture**: Organize code in clear layers
   ```
   presentation/
   business/
   data/
   ```

2. **Dependency Injection**: Use DI to break tight coupling
   ```typescript
   // Instead of direct import
   import { ServiceB } from './ServiceB';
   
   // Use injection
   constructor(private serviceB: IServiceB) {}
   ```

3. **Interface Segregation**: Define interfaces in separate files
   ```typescript
   // interfaces/IUserService.ts
   export interface IUserService {
     getUser(id: string): User;
   }
   ```

4. **Lazy Loading**: Defer imports when possible
   ```python
   def process_data():
       # Import inside function to avoid cycle
       from processors import DataProcessor
       return DataProcessor().process()
   ```

### Resolution Patterns

#### TypeScript/JavaScript
```typescript
// Break cycle by extracting shared types
// Before: A.ts imports B.ts, B.ts imports A.ts

// After: 
// types.ts
export interface SharedType { }

// A.ts
import { SharedType } from './types';

// B.ts  
import { SharedType } from './types';
```

#### C++
```cpp
// Use forward declarations
// Before: A.hpp includes B.hpp, B.hpp includes A.hpp

// After:
// A.hpp
class B; // Forward declaration
class A {
    B* b_ptr; // Use pointer/reference
};

// B.hpp
class A; // Forward declaration
class B {
    A* a_ptr;
};
```

#### Python
```python
# Use local imports
# Before: module_a imports module_b at top level

# After:
# module_a.py
def function_using_b():
    from module_b import some_function  # Import when needed
    return some_function()
```

## Troubleshooting

### Common Issues

1. **Tool not finding cycles that exist**
   - Check include/exclude patterns
   - Verify tool is analyzing the correct file types
   - Ensure tsconfig/compile_commands are correct

2. **Too many false positives**
   - Configure to ignore type-only imports (TypeScript)
   - Exclude test files from analysis
   - Filter out third-party dependencies

3. **Performance issues on large codebases**
   - Use incremental analysis when possible
   - Focus on changed files in CI/CD
   - Run full analysis nightly instead of per-commit

4. **Integration with existing tools**
   - Most tools support standard exit codes
   - Use wrapper scripts if needed
   - Parse JSON output for custom integration

## Advanced Features

### Custom Rules (Dependency Cruiser)
```javascript
// .dependency-cruiser.js
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies lead to maintenance issues',
      from: {},
      to: {
        circular: true
      }
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      comment: 'Orphan modules indicate dead code',
      from: {
        orphan: true
      }
    }
  ]
};
```

### Incremental Analysis
```bash
# Only check changed files
git diff --name-only main | xargs madge --circular

# Check affected modules
dependency-cruiser --focus src/changed-module.ts
```

### Monorepo Support
```bash
# Analyze specific packages
lerna run check-cycles --scope=@myorg/package-a

# Cross-package dependency check
madge --circular packages/*/src
```

## Performance Benchmarks

| Tool | 1K Files | 10K Files | 50K Files |
|------|----------|-----------|-----------|
| Madge | <1s | 3-5s | 15-20s |
| Dependency Cruiser | 1-2s | 5-10s | 30-45s |
| ds | <1s | 2-3s | 10-15s |
| Pylint | 2-3s | 15-20s | 60-90s |
| Pycycle | 1-2s | 8-12s | 40-60s |
| Clang-Tidy | 5-10s | 30-60s | 3-5min |

## API Usage

The system also provides a programmatic API:

```typescript
import { CircularDependencyDetector } from './src/core/detector';

const detector = new CircularDependencyDetector({
  languages: ['typescript'],
  rootPath: '/path/to/project'
});

const cycles = await detector.analyze();
console.log(`Found ${cycles.length} circular dependencies`);
```

## Contributing

The circular dependency detection system is located at:
`layer/themes/research/user-stories/circular-dependency-detection/`

To contribute:
1. Add new language support in `src/analyzers/`
2. Implement tool wrappers in `src/tools/`
3. Add tests in `tests/`
4. Update documentation

## License

The circular dependency detection system is part of the AI Development Platform and follows the project's licensing terms. Individual tools used (Madge, Pylint, etc.) retain their original licenses:
- Madge: MIT
- Dependency Cruiser: MIT
- Pylint: GPL v2
- Clang-Tidy: Apache 2.0

## Support

For issues or questions:
- Check the troubleshooting section
- Review examples in `examples/` directory
- Submit issues to the project repository

---

*Last updated: 2025-08-14*