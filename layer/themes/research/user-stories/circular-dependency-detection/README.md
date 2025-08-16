# Circular Dependency Detection System

A comprehensive, multi-language circular dependency detection system for TypeScript, C++, and Python codebases. Designed for large codebases and monorepos with advanced visualization and CI/CD integration.

## 🚀 Features

- **Multi-Language Support**: TypeScript, C++, and Python
- **Multiple Detection Tools**: Integrates with industry-standard tools for each language
- **Advanced Visualization**: Interactive dependency graphs with cycle highlighting
- **CI/CD Integration**: Ready-to-use scripts for continuous integration
- **Flexible Output Formats**: JSON, HTML, text, and visual reports
- **Large Codebase Support**: Optimized for projects with 10,000+ files
- **Incremental Analysis**: Efficient caching for faster subsequent runs

## 📦 Installation

### Prerequisites

- Node.js 16.0.0 or higher
- Python 3.8+ (for Python analysis)
- C++ compiler and tools (for C++ analysis)

### Install the Package

```bash
npm install circular-dependency-detection
```

### Install External Tools

```bash
npm run install-tools
```

This will install language-specific analysis tools:
- **TypeScript**: madge, dependency-cruiser, ds
- **C++**: clang-tidy, cpp-dependencies
- **Python**: pylint, pycycle, circular-imports
- **Visualization**: graphviz

## 🛠️ Usage

### Command Line Interface

#### Basic Analysis

```bash
# Analyze current directory for all languages
circle-deps analyze .

# Analyze specific languages
circle-deps analyze /path/to/project --languages typescript,python

# Generate HTML report with visualization
circle-deps analyze . --format html --visualization
```

#### CI/CD Integration

```bash
# Quick check for CI (fails if cycles found)
circle-deps check . --max-cycles 0

# Generate comprehensive report for CI
./scripts/ci-check.sh /path/to/project --verbose --report-only
```

#### Configuration

```bash
# Create default configuration file
circle-deps init --format json

# Use custom configuration
circle-deps analyze . --config circular-deps.config.json
```

### Programmatic API

```typescript
import { 
  MultiLanguageAnalyzer, 
  TypeScriptAnalyzer, 
  createAnalyzer 
} from 'circular-dependency-detection';

// Multi-language analysis
const analyzer = new MultiLanguageAnalyzer();
const results = await analyzer.analyzeMultiLanguage(
  '/path/to/project',
  ['typescript', 'cpp', 'python']
);

// Single language analysis
const tsAnalyzer = createAnalyzer('typescript');
const tsResult = await tsAnalyzer.analyze('/path/to/project', {
  exclude_patterns: ['node_modules/**', 'dist/**'],
  max_depth: 10
});
```

## ⚙️ Configuration

Create a `circular-deps.config.json` file:

```json
{
  "version": "1.0.0",
  "languages": {
    "typescript": {
      "include_patterns": ["src/**/*.ts", "src/**/*.tsx"],
      "exclude_patterns": ["node_modules/**", "dist/**", "**/*.test.ts"],
      "max_depth": 10,
      "follow_external": false
    },
    "cpp": {
      "include_patterns": ["src/**/*.cpp", "include/**/*.h"],
      "exclude_patterns": ["build/**", "third_party/**"],
      "max_depth": 15
    },
    "python": {
      "include_patterns": ["src/**/*.py"],
      "exclude_patterns": ["venv/**", "__pycache__/**"],
      "max_depth": 10
    }
  },
  "output": {
    "directory": "./circular-deps-report",
    "formats": ["json", "html"]
  },
  "ci": {
    "fail_on_cycles": true,
    "max_allowed_cycles": 0,
    "severity_threshold": "warning"
  }
}
```

## 📊 Output Formats

### JSON Report

Detailed machine-readable analysis results:

```json
{
  "generated_at": "2025-08-14T12:00:00.000Z",
  "summary": {
    "total_circular_dependencies": 3,
    "total_files": 1250,
    "languages_analyzed": 3
  },
  "results": [
    {
      "language": "typescript",
      "circular_dependencies": [
        {
          "cycle": ["src/moduleA.ts", "src/moduleB.ts"],
          "type": "import",
          "severity": "warning",
          "description": "Import cycle detected",
          "suggestions": ["Use dependency injection", "Extract common functionality"]
        }
      ]
    }
  ]
}
```

### HTML Report

Interactive web-based report with:
- Visual dependency graphs
- Detailed cycle analysis
- Fix suggestions
- Language-specific breakdowns

### Visualization

SVG/PNG dependency graphs showing:
- Node coloring by language
- Edge highlighting for cycles
- Interactive zoom and pan
- Exportable formats

## 🔧 Supported Tools

### TypeScript
- **Madge**: Module dependency analysis
- **Dependency Cruiser**: Advanced dependency rules and visualization
- **ds**: Simple and fast cycle detection
- **Custom AST Parser**: Handles complex import patterns

### C++
- **Clang-Tidy**: Static analysis and include cycle detection
- **cpp-dependencies**: Dependency graph generation
- **Custom Include Parser**: Preprocessor-aware analysis
- **CMake Integration**: Build dependency analysis

### Python
- **Pylint**: Static analysis with cyclic-import detection
- **Pycycle**: Specialized import cycle detection
- **circular-imports**: Runtime import cycle detection
- **Custom AST Parser**: Handles relative and absolute imports

## 🚀 CI/CD Integration

### GitHub Actions

```yaml
name: Circular Dependency Check

on: [push, pull_request]

jobs:
  circular-deps:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          npm install
          npm run install-tools
      
      - name: Check circular dependencies
        run: npm run ci
```

### Script Integration

```bash
# Add to your existing CI pipeline
./scripts/ci-check.sh . --languages typescript,python --max-cycles 0 --verbose
```

## 🎯 Examples

### Basic Project Structure

```
project/
├── src/
│   ├── typescript/
│   │   ├── moduleA.ts
│   │   └── moduleB.ts
│   ├── cpp/
│   │   ├── ClassA.h
│   │   └── ClassA.cpp
│   └── python/
│       ├── module_a.py
│       └── module_b.py
├── circular-deps.config.json
└── package.json
```

### Running Analysis

```bash
# Full analysis
npm run build
npm run demo

# Custom analysis
circle-deps analyze src/ \
  --languages typescript,python \
  --output ./reports \
  --format html \
  --visualization \
  --exclude "**/test/**,**/node_modules/**"
```

## 📈 Performance

- **Large Codebases**: Handles 10,000+ files efficiently
- **Incremental Analysis**: Caches results for faster subsequent runs
- **Memory Usage**: Optimized to use <1GB for most projects
- **Parallel Processing**: Multi-threaded analysis for better performance

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Ensure all tests pass: `npm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📝 Development

### Building

```bash
npm run build
```

### Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:system
```

### Development Scripts

```bash
# Install development tools
./scripts/install-tools.sh

# Run demo with sample project
./scripts/run-demo.sh

# CI check script
./scripts/ci-check.sh . --verbose
```

## 🐛 Troubleshooting

### Common Issues

1. **Tool not found errors**: Run `npm run install-tools` to install external dependencies
2. **Permission denied**: Make sure scripts are executable: `chmod +x scripts/*.sh`
3. **Out of memory**: Increase Node.js memory limit: `node --max-old-space-size=4096`
4. **Clang-tidy not found**: Install LLVM/Clang development tools
5. **Python tools missing**: Install with pip: `pip install pylint pycycle`

### Debug Mode

```bash
# Enable verbose output
circle-deps analyze . --verbose

# Generate debug information
DEBUG=* circle-deps analyze .
```

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Madge](https://github.com/pahen/madge) for TypeScript dependency analysis
- [Dependency Cruiser](https://github.com/sverweij/dependency-cruiser) for advanced rules
- [Clang-Tidy](https://clang.llvm.org/extra/clang-tidy/) for C++ static analysis
- [Pylint](https://pylint.org/) for Python code analysis
- [Graphviz](https://graphviz.org/) for graph visualization

## 📞 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/ai-dev-platform/circular-dependency-detection/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/ai-dev-platform/circular-dependency-detection/discussions)
- 📧 **Email**: support@ai-dev-platform.com