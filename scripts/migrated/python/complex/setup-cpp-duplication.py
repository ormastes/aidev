#!/usr/bin/env python3
"""
Migrated from: setup-cpp-duplication.sh
Auto-generated Python - 2025-08-16T04:57:27.751Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Setup script for C++ duplication detection
    # Configures duplication checking for C++ projects
    subprocess.run("set -e", shell=True)
    subprocess.run("PROJECT_PATH="${1:-.}"", shell=True)
    subprocess.run("MIN_TOKENS="${2:-50}"", shell=True)
    subprocess.run("MIN_LINES="${3:-5}"", shell=True)
    subprocess.run("THRESHOLD="${4:-5}"", shell=True)
    print("🔍 Setting up C++ duplication detection for project: $PROJECT_PATH")
    # Create duplication configuration
    Path(""$PROJECT_PATH/.duplication"").mkdir(parents=True, exist_ok=True)
    # Generate duplication configuration
    subprocess.run("cat > "$PROJECT_PATH/.duplication/config.json" << EOF", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""languages": ["cpp", "c", "hpp", "h"],", shell=True)
    subprocess.run(""minTokens": $MIN_TOKENS,", shell=True)
    subprocess.run(""minLines": $MIN_LINES,", shell=True)
    subprocess.run(""threshold": $THRESHOLD,", shell=True)
    subprocess.run(""exclude": [", shell=True)
    subprocess.run(""*/build/*",", shell=True)
    subprocess.run(""*/third_party/*",", shell=True)
    subprocess.run(""*/external/*",", shell=True)
    subprocess.run(""*/generated/*"", shell=True)
    subprocess.run("],", shell=True)
    subprocess.run(""reportFormat": "json",", shell=True)
    subprocess.run(""reportPath": ".duplication/report.json"", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF", shell=True)
    # Create clang-tidy configuration for duplication checks
    subprocess.run("cat > "$PROJECT_PATH/.clang-tidy" << 'EOF'", shell=True)
    subprocess.run("---", shell=True)
    subprocess.run("Checks: '", shell=True)
    subprocess.run("bugprone-*,", shell=True)
    subprocess.run("-bugprone-branch-clone,", shell=True)
    subprocess.run("misc-redundant-expression,", shell=True)
    subprocess.run("modernize-use-default-member-init,", shell=True)
    subprocess.run("readability-duplicate-include,", shell=True)
    subprocess.run("readability-redundant-*", shell=True)
    subprocess.run("'", shell=True)
    subprocess.run("WarningsAsErrors: ''", shell=True)
    subprocess.run("HeaderFilterRegex: '.*'", shell=True)
    subprocess.run("AnalyzeTemporaryDtors: false", shell=True)
    subprocess.run("FormatStyle: file", shell=True)
    subprocess.run("CheckOptions:", shell=True)
    subprocess.run("- key: bugprone-suspicious-string-compare.WarnOnImplicitComparison", shell=True)
    subprocess.run("value: true", shell=True)
    subprocess.run("- key: misc-redundant-expression.CheckRedundantReturn", shell=True)
    subprocess.run("value: true", shell=True)
    subprocess.run("EOF", shell=True)
    # Create duplication check script
    subprocess.run("cat > "$PROJECT_PATH/.duplication/check-duplication.sh" << 'EOF'", shell=True)
    # Check for code duplication
    subprocess.run("set -e", shell=True)
    print("🔍 Checking for code duplication...")
    # Use story-reporter if available
    subprocess.run("if command -v coverage-analyzer &> /dev/null; then", shell=True)
    print("Using story-reporter duplication checker...")
    subprocess.run("coverage-analyzer --mode app --duplication-only", shell=True)
    else:
    print("Using clang-tidy for duplication detection...")
    # Find all C++ files
    subprocess.run("find . -type f \( -name "*.cpp" -o -name "*.cc" -o -name "*.hpp" -o -name "*.h" \) \", shell=True)
    subprocess.run("-not -path "./build/*" \", shell=True)
    subprocess.run("-not -path "./third_party/*" \", shell=True)
    subprocess.run("-not -path "./external/*" | while read -r file; do", shell=True)
    print("Checking: $file")
    subprocess.run("clang-tidy "$file" 2>/dev/null || true", shell=True)
    # Generate report
    if -f ".duplication/report.json" :; then
    print("📊 Duplication report saved to .duplication/report.json")
    # Extract summary
    subprocess.run("DUPLICATION_PERCENT=$(jq -r '.percentage // 0' .duplication/report.json)", shell=True)
    subprocess.run("THRESHOLD=$(jq -r '.threshold // 5' .duplication/config.json)", shell=True)
    print("📈 Duplication: ${DUPLICATION_PERCENT}%")
    print("🎯 Threshold: ${THRESHOLD}%")
    subprocess.run("if (( $(echo "$DUPLICATION_PERCENT > $THRESHOLD" | bc -l) )); then", shell=True)
    print("❌ Duplication threshold exceeded!")
    sys.exit(1)
    else:
    print("✅ Duplication within acceptable limits")
    else:
    print("⚠️  No duplication report generated")
    subprocess.run("EOF", shell=True)
    subprocess.run("chmod +x "$PROJECT_PATH/.duplication/check-duplication.sh"", shell=True)
    # Create unified check script for both TS and C++
    subprocess.run("cat > "$PROJECT_PATH/check-quality.sh" << 'EOF'", shell=True)
    # Unified quality check for TypeScript and C++ code
    subprocess.run("set -e", shell=True)
    print("🔍 Running unified quality checks...")
    print("")
    # Check if this is a TypeScript project
    if -f "package.json" :; then
    print("📦 TypeScript/JavaScript project detected")
    # Run TypeScript tests and coverage
    if -f "jest.config.js" ] || [ -f "jest.config.ts" :; then
    print("Running Jest tests with coverage...")
    subprocess.run("npm test -- --coverage", shell=True)
    # Check if this is a C++ project
    if -f "CMakeLists.txt" :; then
    print("⚙️  C++ project detected")
    # Run C++ coverage if configured
    if -f ".coverage/check-coverage.sh" :; then
    print("Running C++ coverage check...")
    subprocess.run("./.coverage/check-coverage.sh", shell=True)
    # Run duplication check for all languages
    if -f ".duplication/check-duplication.sh" :; then
    print("")
    print("🔍 Running duplication check...")
    subprocess.run("./.duplication/check-duplication.sh", shell=True)
    print("")
    print("✅ All quality checks complete!")
    subprocess.run("EOF", shell=True)
    subprocess.run("chmod +x "$PROJECT_PATH/check-quality.sh"", shell=True)
    print("✅ C++ duplication detection setup complete!")
    print("")
    print("📝 Usage:")
    print("   Check duplication only:")
    print("      ./.duplication/check-duplication.sh")
    print("")
    print("   Run all quality checks (coverage + duplication):")
    print("      ./check-quality.sh")
    print("")
    print("🔧 Configuration: .duplication/config.json")
    print("📊 Clang-tidy config: .clang-tidy")

if __name__ == "__main__":
    main()