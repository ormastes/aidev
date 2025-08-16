#!/usr/bin/env python3
"""
Migrated from: run-demo.sh
Auto-generated Python - 2025-08-16T04:57:27.692Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # #
    # Demo script for circular dependency detection
    # #
    subprocess.run("set -e", shell=True)
    # Colors for output
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("BLUE='\033[0;34m'", shell=True)
    subprocess.run("NC='\033[0m' # No Color", shell=True)
    subprocess.run("print_status() {", shell=True)
    print("-e ")${BLUE}[DEMO]${NC} $1"
    subprocess.run("}", shell=True)
    subprocess.run("print_success() {", shell=True)
    print("-e ")${GREEN}[SUCCESS]${NC} $1"
    subprocess.run("}", shell=True)
    subprocess.run("print_warning() {", shell=True)
    print("-e ")${YELLOW}[WARNING]${NC} $1"
    subprocess.run("}", shell=True)
    subprocess.run("print_error() {", shell=True)
    print("-e ")${RED}[ERROR]${NC} $1"
    subprocess.run("}", shell=True)
    # Check if the tool is built
    subprocess.run("check_build() {", shell=True)
    if ! -f "dist/cli/index.js" :; then
    subprocess.run("print_status "Building the tool..."", shell=True)
    subprocess.run("npm run build", shell=True)
    subprocess.run("}", shell=True)
    # Create sample project with circular dependencies
    subprocess.run("create_sample_project() {", shell=True)
    subprocess.run("local sample_dir="$1"", shell=True)
    subprocess.run("print_status "Creating sample project at: $sample_dir"", shell=True)
    Path(""$sample_dir"/{src/typescript,src/cpp,src/python}").mkdir(parents=True, exist_ok=True)
    # TypeScript circular dependency example
    subprocess.run("cat > "$sample_dir/src/typescript/moduleA.ts" << 'EOF'", shell=True)
    subprocess.run("import { functionB } from './moduleB';", shell=True)
    subprocess.run("export function functionA(): string {", shell=True)
    subprocess.run("return `A calls ${functionB()}`;", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("cat > "$sample_dir/src/typescript/moduleB.ts" << 'EOF'", shell=True)
    subprocess.run("import { functionA } from './moduleA';", shell=True)
    subprocess.run("export function functionB(): string {", shell=True)
    subprocess.run("return `B calls ${functionA()}`;", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("cat > "$sample_dir/src/typescript/moduleC.ts" << 'EOF'", shell=True)
    subprocess.run("import { functionA } from './moduleA';", shell=True)
    subprocess.run("import { utilD } from './utils/moduleD';", shell=True)
    subprocess.run("export function functionC(): string {", shell=True)
    subprocess.run("return `C uses ${functionA()} and ${utilD()}`;", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF", shell=True)
    Path(""$sample_dir/src/typescript/utils"").mkdir(parents=True, exist_ok=True)
    subprocess.run("cat > "$sample_dir/src/typescript/utils/moduleD.ts" << 'EOF'", shell=True)
    subprocess.run("import { functionC } from '../moduleC';", shell=True)
    subprocess.run("export function utilD(): string {", shell=True)
    subprocess.run("return `D indirectly calls ${functionC()}`;", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF", shell=True)
    # C++ circular dependency example
    subprocess.run("cat > "$sample_dir/src/cpp/ClassA.h" << 'EOF'", shell=True)
    # ifndef CLASS_A_H
    # define CLASS_A_H
    # include "ClassB.h"
    subprocess.run("class ClassA {", shell=True)
    subprocess.run("public:", shell=True)
    subprocess.run("void methodA();", shell=True)
    subprocess.run("ClassB* getB();", shell=True)
    subprocess.run("private:", shell=True)
    subprocess.run("ClassB* b;", shell=True)
    subprocess.run("};", shell=True)
    # endif
    subprocess.run("EOF", shell=True)
    subprocess.run("cat > "$sample_dir/src/cpp/ClassB.h" << 'EOF'", shell=True)
    # ifndef CLASS_B_H
    # define CLASS_B_H
    # include "ClassA.h"
    subprocess.run("class ClassB {", shell=True)
    subprocess.run("public:", shell=True)
    subprocess.run("void methodB();", shell=True)
    subprocess.run("ClassA* getA();", shell=True)
    subprocess.run("private:", shell=True)
    subprocess.run("ClassA* a;", shell=True)
    subprocess.run("};", shell=True)
    # endif
    subprocess.run("EOF", shell=True)
    subprocess.run("cat > "$sample_dir/src/cpp/ClassA.cpp" << 'EOF'", shell=True)
    # include "ClassA.h"
    subprocess.run("void ClassA::methodA() {", shell=True)
    subprocess.run("// Implementation", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("ClassB* ClassA::getB() {", shell=True)
    subprocess.run("return b;", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("cat > "$sample_dir/src/cpp/ClassB.cpp" << 'EOF'", shell=True)
    # include "ClassB.h"
    subprocess.run("void ClassB::methodB() {", shell=True)
    subprocess.run("// Implementation", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("ClassA* ClassB::getA() {", shell=True)
    subprocess.run("return a;", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF", shell=True)
    # Python circular dependency example
    subprocess.run("cat > "$sample_dir/src/python/module_a.py" << 'EOF'", shell=True)
    subprocess.run("from .module_b import function_b", shell=True)
    subprocess.run("def function_a():", shell=True)
    subprocess.run("return f"A calls {function_b()}"", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("cat > "$sample_dir/src/python/module_b.py" << 'EOF'", shell=True)
    subprocess.run("from .module_a import function_a", shell=True)
    subprocess.run("def function_b():", shell=True)
    subprocess.run("return f"B calls {function_a()}"", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("cat > "$sample_dir/src/python/module_c.py" << 'EOF'", shell=True)
    subprocess.run("from .module_a import function_a", shell=True)
    subprocess.run("from .utils.module_d import util_d", shell=True)
    subprocess.run("def function_c():", shell=True)
    subprocess.run("return f"C uses {function_a()} and {util_d()}"", shell=True)
    subprocess.run("EOF", shell=True)
    Path(""$sample_dir/src/python/utils"").mkdir(parents=True, exist_ok=True)
    subprocess.run("cat > "$sample_dir/src/python/utils/__init__.py" << 'EOF'", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("cat > "$sample_dir/src/python/utils/module_d.py" << 'EOF'", shell=True)
    subprocess.run("from ..module_c import function_c", shell=True)
    subprocess.run("def util_d():", shell=True)
    subprocess.run("return f"D indirectly calls {function_c()}"", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("cat > "$sample_dir/src/python/__init__.py" << 'EOF'", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("print_success "Sample project created with circular dependencies"", shell=True)
    subprocess.run("}", shell=True)
    # Run analysis on sample project
    subprocess.run("run_analysis() {", shell=True)
    subprocess.run("local sample_dir="$1"", shell=True)
    subprocess.run("local output_dir="$2"", shell=True)
    subprocess.run("print_status "Running circular dependency analysis..."", shell=True)
    # Full analysis with all languages
    subprocess.run("echo", shell=True)
    subprocess.run("print_status "1. Running comprehensive analysis..."", shell=True)
    subprocess.run("node dist/cli/index.js analyze "$sample_dir" \", shell=True)
    subprocess.run("--languages "typescript,cpp,python" \", shell=True)
    subprocess.run("--output "$output_dir" \", shell=True)
    subprocess.run("--format "json" \", shell=True)
    subprocess.run("--visualization", shell=True)
    subprocess.run("echo", shell=True)
    subprocess.run("print_status "2. Running HTML report generation..."", shell=True)
    subprocess.run("node dist/cli/index.js analyze "$sample_dir" \", shell=True)
    subprocess.run("--languages "typescript,cpp,python" \", shell=True)
    subprocess.run("--output "$output_dir" \", shell=True)
    subprocess.run("--format "html"", shell=True)
    subprocess.run("echo", shell=True)
    subprocess.run("print_status "3. Running quick check (CI mode)..."", shell=True)
    subprocess.run("if node dist/cli/index.js check "$sample_dir" \", shell=True)
    subprocess.run("--languages "typescript,cpp,python" \", shell=True)
    subprocess.run("--max-cycles 0; then", shell=True)
    subprocess.run("print_warning "Quick check passed (unexpected - sample has cycles)"", shell=True)
    else:
    subprocess.run("print_success "Quick check detected cycles as expected"", shell=True)
    subprocess.run("echo", shell=True)
    subprocess.run("print_status "4. Generating visualization..."", shell=True)
    subprocess.run("node dist/cli/index.js visualize "$sample_dir" \", shell=True)
    subprocess.run("--languages "typescript,cpp,python" \", shell=True)
    subprocess.run("--output "$output_dir/dependency-graph.svg"", shell=True)
    subprocess.run("}", shell=True)
    # Display results
    subprocess.run("display_results() {", shell=True)
    subprocess.run("local output_dir="$1"", shell=True)
    subprocess.run("print_status "Analysis Results:"", shell=True)
    print("==================")
    subprocess.run("echo", shell=True)
    if -f "$output_dir/report.json" :; then
    subprocess.run("print_success "JSON Report: $output_dir/report.json"", shell=True)
    print("  Sample content:")
    subprocess.run("head -n 20 "$output_dir/report.json" | sed 's/^/  /'", shell=True)
    print("  ...")
    subprocess.run("echo", shell=True)
    if -f "$output_dir/report.html" :; then
    subprocess.run("print_success "HTML Report: $output_dir/report.html"", shell=True)
    print("  Open in browser to view interactive report")
    subprocess.run("echo", shell=True)
    if -f "$output_dir/dependency-graph.svg" :; then
    subprocess.run("print_success "Visualization: $output_dir/dependency-graph.svg"", shell=True)
    print("  Open in browser or SVG viewer")
    subprocess.run("echo", shell=True)
    print("📁 All files in output directory:")
    subprocess.run("ls -la "$output_dir/" | sed 's/^/  /'", shell=True)
    subprocess.run("}", shell=True)
    # Cleanup function
    subprocess.run("cleanup() {", shell=True)
    subprocess.run("local temp_dir="$1"", shell=True)
    if -n "$temp_dir" ] && [ -d "$temp_dir" :; then
    subprocess.run("print_status "Cleaning up temporary files..."", shell=True)
    shutil.rmtree(""$temp_dir"", ignore_errors=True)
    subprocess.run("print_success "Cleanup completed"", shell=True)
    subprocess.run("}", shell=True)
    # Main demo function
    subprocess.run("main() {", shell=True)
    subprocess.run("local temp_dir", shell=True)
    subprocess.run("local output_dir", shell=True)
    subprocess.run("print_status "🎯 Circular Dependency Detection Demo"", shell=True)
    print("======================================")
    subprocess.run("echo", shell=True)
    # Set up temporary directories
    subprocess.run("temp_dir=$(mktemp -d)", shell=True)
    subprocess.run("output_dir="$temp_dir/output"", shell=True)
    # Trap to ensure cleanup
    subprocess.run("trap "cleanup '$temp_dir'" EXIT", shell=True)
    # Check if tool is built
    subprocess.run("check_build", shell=True)
    # Create sample project
    subprocess.run("create_sample_project "$temp_dir/sample-project"", shell=True)
    # Run analysis
    subprocess.run("run_analysis "$temp_dir/sample-project" "$output_dir"", shell=True)
    # Display results
    subprocess.run("display_results "$output_dir"", shell=True)
    # Keep results for inspection
    subprocess.run("local keep_dir="./demo-output"", shell=True)
    subprocess.run("print_status "Copying results to: $keep_dir"", shell=True)
    shutil.rmtree(""$keep_dir"", ignore_errors=True)
    shutil.copy2("-r "$output_dir"", ""$keep_dir"")
    subprocess.run("print_success "Demo completed! Results saved to: $keep_dir"", shell=True)
    subprocess.run("echo", shell=True)
    subprocess.run("print_status "Next Steps:"", shell=True)
    print("  1. Open $keep_dir/report.html in your browser")
    print("  2. View $keep_dir/dependency-graph.svg for visual representation")
    print("  3. Examine $keep_dir/report.json for detailed analysis data")
    print("  4. Try running analysis on your own projects!")
    subprocess.run("}", shell=True)
    # Handle command line arguments
    subprocess.run("case "${1:-}" in", shell=True)
    subprocess.run("--help|-h)", shell=True)
    print("Circular Dependency Detection Demo")
    subprocess.run("echo", shell=True)
    print("Usage: $0 [options]")
    subprocess.run("echo", shell=True)
    print("Options:")
    print("  --help, -h     Show this help message")
    print("  --build-only   Only build the tool, don't run demo")
    print("  --no-cleanup   Keep temporary files after demo")
    subprocess.run("echo", shell=True)
    sys.exit(0)
    subprocess.run(";;", shell=True)
    subprocess.run("--build-only)", shell=True)
    subprocess.run("check_build", shell=True)
    sys.exit(0)
    subprocess.run(";;", shell=True)
    subprocess.run("--no-cleanup)", shell=True)
    # Disable cleanup trap
    subprocess.run("trap '' EXIT", shell=True)
    subprocess.run("main", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("*)", shell=True)
    subprocess.run("main", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("esac", shell=True)

if __name__ == "__main__":
    main()