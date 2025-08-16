#!/usr/bin/env bun
/**
 * Migrated from: setup-cpp-duplication.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.751Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Setup script for C++ duplication detection
  // Configures duplication checking for C++ projects
  await $`set -e`;
  await $`PROJECT_PATH="${1:-.}"`;
  await $`MIN_TOKENS="${2:-50}"`;
  await $`MIN_LINES="${3:-5}"`;
  await $`THRESHOLD="${4:-5}"`;
  console.log("🔍 Setting up C++ duplication detection for project: $PROJECT_PATH");
  // Create duplication configuration
  await mkdir(""$PROJECT_PATH/.duplication"", { recursive: true });
  // Generate duplication configuration
  await $`cat > "$PROJECT_PATH/.duplication/config.json" << EOF`;
  await $`{`;
  await $`"languages": ["cpp", "c", "hpp", "h"],`;
  await $`"minTokens": $MIN_TOKENS,`;
  await $`"minLines": $MIN_LINES,`;
  await $`"threshold": $THRESHOLD,`;
  await $`"exclude": [`;
  await $`"*/build/*",`;
  await $`"*/third_party/*",`;
  await $`"*/external/*",`;
  await $`"*/generated/*"`;
  await $`],`;
  await $`"reportFormat": "json",`;
  await $`"reportPath": ".duplication/report.json"`;
  await $`}`;
  await $`EOF`;
  // Create clang-tidy configuration for duplication checks
  await $`cat > "$PROJECT_PATH/.clang-tidy" << 'EOF'`;
  await $`---`;
  await $`Checks: '`;
  await $`bugprone-*,`;
  await $`-bugprone-branch-clone,`;
  await $`misc-redundant-expression,`;
  await $`modernize-use-default-member-init,`;
  await $`readability-duplicate-include,`;
  await $`readability-redundant-*`;
  await $`'`;
  await $`WarningsAsErrors: ''`;
  await $`HeaderFilterRegex: '.*'`;
  await $`AnalyzeTemporaryDtors: false`;
  await $`FormatStyle: file`;
  await $`CheckOptions:`;
  await $`- key: bugprone-suspicious-string-compare.WarnOnImplicitComparison`;
  await $`value: true`;
  await $`- key: misc-redundant-expression.CheckRedundantReturn`;
  await $`value: true`;
  await $`EOF`;
  // Create duplication check script
  await $`cat > "$PROJECT_PATH/.duplication/check-duplication.sh" << 'EOF'`;
  // Check for code duplication
  await $`set -e`;
  console.log("🔍 Checking for code duplication...");
  // Use story-reporter if available
  await $`if command -v coverage-analyzer &> /dev/null; then`;
  console.log("Using story-reporter duplication checker...");
  await $`coverage-analyzer --mode app --duplication-only`;
  } else {
  console.log("Using clang-tidy for duplication detection...");
  // Find all C++ files
  await $`find . -type f \( -name "*.cpp" -o -name "*.cc" -o -name "*.hpp" -o -name "*.h" \) \`;
  await $`-not -path "./build/*" \`;
  await $`-not -path "./third_party/*" \`;
  await $`-not -path "./external/*" | while read -r file; do`;
  console.log("Checking: $file");
  await $`clang-tidy "$file" 2>/dev/null || true`;
  }
  }
  // Generate report
  if (-f ".duplication/report.json" ) {; then
  console.log("📊 Duplication report saved to .duplication/report.json");
  // Extract summary
  await $`DUPLICATION_PERCENT=$(jq -r '.percentage // 0' .duplication/report.json)`;
  await $`THRESHOLD=$(jq -r '.threshold // 5' .duplication/config.json)`;
  console.log("📈 Duplication: ${DUPLICATION_PERCENT}%");
  console.log("🎯 Threshold: ${THRESHOLD}%");
  await $`if (( $(echo "$DUPLICATION_PERCENT > $THRESHOLD" | bc -l) )); then`;
  console.log("❌ Duplication threshold exceeded!");
  process.exit(1);
  } else {
  console.log("✅ Duplication within acceptable limits");
  }
  } else {
  console.log("⚠️  No duplication report generated");
  }
  await $`EOF`;
  await $`chmod +x "$PROJECT_PATH/.duplication/check-duplication.sh"`;
  // Create unified check script for both TS and C++
  await $`cat > "$PROJECT_PATH/check-quality.sh" << 'EOF'`;
  // Unified quality check for TypeScript and C++ code
  await $`set -e`;
  console.log("🔍 Running unified quality checks...");
  console.log("");
  // Check if this is a TypeScript project
  if (-f "package.json" ) {; then
  console.log("📦 TypeScript/JavaScript project detected");
  // Run TypeScript tests and coverage
  if (-f "jest.config.js" ] || [ -f "jest.config.ts" ) {; then
  console.log("Running Jest tests with coverage...");
  await $`npm test -- --coverage`;
  }
  }
  // Check if this is a C++ project
  if (-f "CMakeLists.txt" ) {; then
  console.log("⚙️  C++ project detected");
  // Run C++ coverage if configured
  if (-f ".coverage/check-coverage.sh" ) {; then
  console.log("Running C++ coverage check...");
  await $`./.coverage/check-coverage.sh`;
  }
  }
  // Run duplication check for all languages
  if (-f ".duplication/check-duplication.sh" ) {; then
  console.log("");
  console.log("🔍 Running duplication check...");
  await $`./.duplication/check-duplication.sh`;
  }
  console.log("");
  console.log("✅ All quality checks complete!");
  await $`EOF`;
  await $`chmod +x "$PROJECT_PATH/check-quality.sh"`;
  console.log("✅ C++ duplication detection setup complete!");
  console.log("");
  console.log("📝 Usage:");
  console.log("   Check duplication only:");
  console.log("      ./.duplication/check-duplication.sh");
  console.log("");
  console.log("   Run all quality checks (coverage + duplication):");
  console.log("      ./check-quality.sh");
  console.log("");
  console.log("🔧 Configuration: .duplication/config.json");
  console.log("📊 Clang-tidy config: .clang-tidy");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}