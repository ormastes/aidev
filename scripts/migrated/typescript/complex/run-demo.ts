#!/usr/bin/env bun
/**
 * Migrated from: run-demo.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.691Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // #
  // Demo script for circular dependency detection
  // #
  await $`set -e`;
  // Colors for output
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`BLUE='\033[0;34m'`;
  await $`NC='\033[0m' # No Color`;
  await $`print_status() {`;
  console.log("-e ");${BLUE}[DEMO]${NC} $1"
  await $`}`;
  await $`print_success() {`;
  console.log("-e ");${GREEN}[SUCCESS]${NC} $1"
  await $`}`;
  await $`print_warning() {`;
  console.log("-e ");${YELLOW}[WARNING]${NC} $1"
  await $`}`;
  await $`print_error() {`;
  console.log("-e ");${RED}[ERROR]${NC} $1"
  await $`}`;
  // Check if the tool is built
  await $`check_build() {`;
  if (! -f "dist/cli/index.js" ) {; then
  await $`print_status "Building the tool..."`;
  await $`npm run build`;
  }
  await $`}`;
  // Create sample project with circular dependencies
  await $`create_sample_project() {`;
  await $`local sample_dir="$1"`;
  await $`print_status "Creating sample project at: $sample_dir"`;
  await mkdir(""$sample_dir"/{src/typescript,src/cpp,src/python}", { recursive: true });
  // TypeScript circular dependency example
  await $`cat > "$sample_dir/src/typescript/moduleA.ts" << 'EOF'`;
  await $`import { functionB } from './moduleB';`;
  await $`export function functionA(): string {`;
  await $`return `A calls ${functionB()}`;`;
  await $`}`;
  await $`EOF`;
  await $`cat > "$sample_dir/src/typescript/moduleB.ts" << 'EOF'`;
  await $`import { functionA } from './moduleA';`;
  await $`export function functionB(): string {`;
  await $`return `B calls ${functionA()}`;`;
  await $`}`;
  await $`EOF`;
  await $`cat > "$sample_dir/src/typescript/moduleC.ts" << 'EOF'`;
  await $`import { functionA } from './moduleA';`;
  await $`import { utilD } from './utils/moduleD';`;
  await $`export function functionC(): string {`;
  await $`return `C uses ${functionA()} and ${utilD()}`;`;
  await $`}`;
  await $`EOF`;
  await mkdir(""$sample_dir/src/typescript/utils"", { recursive: true });
  await $`cat > "$sample_dir/src/typescript/utils/moduleD.ts" << 'EOF'`;
  await $`import { functionC } from '../moduleC';`;
  await $`export function utilD(): string {`;
  await $`return `D indirectly calls ${functionC()}`;`;
  await $`}`;
  await $`EOF`;
  // C++ circular dependency example
  await $`cat > "$sample_dir/src/cpp/ClassA.h" << 'EOF'`;
  // ifndef CLASS_A_H
  // define CLASS_A_H
  // include "ClassB.h"
  await $`class ClassA {`;
  await $`public:`;
  await $`void methodA();`;
  await $`ClassB* getB();`;
  await $`private:`;
  await $`ClassB* b;`;
  await $`};`;
  // endif
  await $`EOF`;
  await $`cat > "$sample_dir/src/cpp/ClassB.h" << 'EOF'`;
  // ifndef CLASS_B_H
  // define CLASS_B_H
  // include "ClassA.h"
  await $`class ClassB {`;
  await $`public:`;
  await $`void methodB();`;
  await $`ClassA* getA();`;
  await $`private:`;
  await $`ClassA* a;`;
  await $`};`;
  // endif
  await $`EOF`;
  await $`cat > "$sample_dir/src/cpp/ClassA.cpp" << 'EOF'`;
  // include "ClassA.h"
  await $`void ClassA::methodA() {`;
  // Implementation
  await $`}`;
  await $`ClassB* ClassA::getB() {`;
  await $`return b;`;
  await $`}`;
  await $`EOF`;
  await $`cat > "$sample_dir/src/cpp/ClassB.cpp" << 'EOF'`;
  // include "ClassB.h"
  await $`void ClassB::methodB() {`;
  // Implementation
  await $`}`;
  await $`ClassA* ClassB::getA() {`;
  await $`return a;`;
  await $`}`;
  await $`EOF`;
  // Python circular dependency example
  await $`cat > "$sample_dir/src/python/module_a.py" << 'EOF'`;
  await $`from .module_b import function_b`;
  await $`def function_a():`;
  await $`return f"A calls {function_b()}"`;
  await $`EOF`;
  await $`cat > "$sample_dir/src/python/module_b.py" << 'EOF'`;
  await $`from .module_a import function_a`;
  await $`def function_b():`;
  await $`return f"B calls {function_a()}"`;
  await $`EOF`;
  await $`cat > "$sample_dir/src/python/module_c.py" << 'EOF'`;
  await $`from .module_a import function_a`;
  await $`from .utils.module_d import util_d`;
  await $`def function_c():`;
  await $`return f"C uses {function_a()} and {util_d()}"`;
  await $`EOF`;
  await mkdir(""$sample_dir/src/python/utils"", { recursive: true });
  await $`cat > "$sample_dir/src/python/utils/__init__.py" << 'EOF'`;
  await $`EOF`;
  await $`cat > "$sample_dir/src/python/utils/module_d.py" << 'EOF'`;
  await $`from ..module_c import function_c`;
  await $`def util_d():`;
  await $`return f"D indirectly calls {function_c()}"`;
  await $`EOF`;
  await $`cat > "$sample_dir/src/python/__init__.py" << 'EOF'`;
  await $`EOF`;
  await $`print_success "Sample project created with circular dependencies"`;
  await $`}`;
  // Run analysis on sample project
  await $`run_analysis() {`;
  await $`local sample_dir="$1"`;
  await $`local output_dir="$2"`;
  await $`print_status "Running circular dependency analysis..."`;
  // Full analysis with all languages
  await $`echo`;
  await $`print_status "1. Running comprehensive analysis..."`;
  await $`node dist/cli/index.js analyze "$sample_dir" \`;
  await $`--languages "typescript,cpp,python" \`;
  await $`--output "$output_dir" \`;
  await $`--format "json" \`;
  await $`--visualization`;
  await $`echo`;
  await $`print_status "2. Running HTML report generation..."`;
  await $`node dist/cli/index.js analyze "$sample_dir" \`;
  await $`--languages "typescript,cpp,python" \`;
  await $`--output "$output_dir" \`;
  await $`--format "html"`;
  await $`echo`;
  await $`print_status "3. Running quick check (CI mode)..."`;
  await $`if node dist/cli/index.js check "$sample_dir" \`;
  await $`--languages "typescript,cpp,python" \`;
  await $`--max-cycles 0; then`;
  await $`print_warning "Quick check passed (unexpected - sample has cycles)"`;
  } else {
  await $`print_success "Quick check detected cycles as expected"`;
  }
  await $`echo`;
  await $`print_status "4. Generating visualization..."`;
  await $`node dist/cli/index.js visualize "$sample_dir" \`;
  await $`--languages "typescript,cpp,python" \`;
  await $`--output "$output_dir/dependency-graph.svg"`;
  await $`}`;
  // Display results
  await $`display_results() {`;
  await $`local output_dir="$1"`;
  await $`print_status "Analysis Results:"`;
  console.log("==================");
  await $`echo`;
  if (-f "$output_dir/report.json" ) {; then
  await $`print_success "JSON Report: $output_dir/report.json"`;
  console.log("  Sample content:");
  await $`head -n 20 "$output_dir/report.json" | sed 's/^/  /'`;
  console.log("  ...");
  await $`echo`;
  }
  if (-f "$output_dir/report.html" ) {; then
  await $`print_success "HTML Report: $output_dir/report.html"`;
  console.log("  Open in browser to view interactive report");
  await $`echo`;
  }
  if (-f "$output_dir/dependency-graph.svg" ) {; then
  await $`print_success "Visualization: $output_dir/dependency-graph.svg"`;
  console.log("  Open in browser or SVG viewer");
  await $`echo`;
  }
  console.log("📁 All files in output directory:");
  await $`ls -la "$output_dir/" | sed 's/^/  /'`;
  await $`}`;
  // Cleanup function
  await $`cleanup() {`;
  await $`local temp_dir="$1"`;
  if (-n "$temp_dir" ] && [ -d "$temp_dir" ) {; then
  await $`print_status "Cleaning up temporary files..."`;
  await rm(""$temp_dir"", { recursive: true, force: true });
  await $`print_success "Cleanup completed"`;
  }
  await $`}`;
  // Main demo function
  await $`main() {`;
  await $`local temp_dir`;
  await $`local output_dir`;
  await $`print_status "🎯 Circular Dependency Detection Demo"`;
  console.log("======================================");
  await $`echo`;
  // Set up temporary directories
  await $`temp_dir=$(mktemp -d)`;
  await $`output_dir="$temp_dir/output"`;
  // Trap to ensure cleanup
  await $`trap "cleanup '$temp_dir'" EXIT`;
  // Check if tool is built
  await $`check_build`;
  // Create sample project
  await $`create_sample_project "$temp_dir/sample-project"`;
  // Run analysis
  await $`run_analysis "$temp_dir/sample-project" "$output_dir"`;
  // Display results
  await $`display_results "$output_dir"`;
  // Keep results for inspection
  await $`local keep_dir="./demo-output"`;
  await $`print_status "Copying results to: $keep_dir"`;
  await rm(""$keep_dir"", { recursive: true, force: true });
  await copyFile("-r "$output_dir"", ""$keep_dir"");
  await $`print_success "Demo completed! Results saved to: $keep_dir"`;
  await $`echo`;
  await $`print_status "Next Steps:"`;
  console.log("  1. Open $keep_dir/report.html in your browser");
  console.log("  2. View $keep_dir/dependency-graph.svg for visual representation");
  console.log("  3. Examine $keep_dir/report.json for detailed analysis data");
  console.log("  4. Try running analysis on your own projects!");
  await $`}`;
  // Handle command line arguments
  await $`case "${1:-}" in`;
  await $`--help|-h)`;
  console.log("Circular Dependency Detection Demo");
  await $`echo`;
  console.log("Usage: $0 [options]");
  await $`echo`;
  console.log("Options:");
  console.log("  --help, -h     Show this help message");
  console.log("  --build-only   Only build the tool, don't run demo");
  console.log("  --no-cleanup   Keep temporary files after demo");
  await $`echo`;
  process.exit(0);
  await $`;;`;
  await $`--build-only)`;
  await $`check_build`;
  process.exit(0);
  await $`;;`;
  await $`--no-cleanup)`;
  // Disable cleanup trap
  await $`trap '' EXIT`;
  await $`main`;
  await $`;;`;
  await $`*)`;
  await $`main`;
  await $`;;`;
  await $`esac`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}