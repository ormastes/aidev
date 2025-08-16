#!/bin/bash

##
# Demo script for circular dependency detection
##

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[DEMO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if the tool is built
check_build() {
    if [ ! -f "dist/cli/index.js" ]; then
        print_status "Building the tool..."
        npm run build
    fi
}

# Create sample project with circular dependencies
create_sample_project() {
    local sample_dir="$1"
    
    print_status "Creating sample project at: $sample_dir"
    
    mkdir -p "$sample_dir"/{src/typescript,src/cpp,src/python}
    
    # TypeScript circular dependency example
    cat > "$sample_dir/src/typescript/moduleA.ts" << 'EOF'
import { functionB } from './moduleB';

export function functionA(): string {
    return `A calls ${functionB()}`;
}
EOF
    
    cat > "$sample_dir/src/typescript/moduleB.ts" << 'EOF'
import { functionA } from './moduleA';

export function functionB(): string {
    return `B calls ${functionA()}`;
}
EOF
    
    cat > "$sample_dir/src/typescript/moduleC.ts" << 'EOF'
import { functionA } from './moduleA';
import { utilD } from './utils/moduleD';

export function functionC(): string {
    return `C uses ${functionA()} and ${utilD()}`;
}
EOF
    
    mkdir -p "$sample_dir/src/typescript/utils"
    cat > "$sample_dir/src/typescript/utils/moduleD.ts" << 'EOF'
import { functionC } from '../moduleC';

export function utilD(): string {
    return `D indirectly calls ${functionC()}`;
}
EOF
    
    # C++ circular dependency example
    cat > "$sample_dir/src/cpp/ClassA.h" << 'EOF'
#ifndef CLASS_A_H
#define CLASS_A_H

#include "ClassB.h"

class ClassA {
public:
    void methodA();
    ClassB* getB();
private:
    ClassB* b;
};

#endif
EOF
    
    cat > "$sample_dir/src/cpp/ClassB.h" << 'EOF'
#ifndef CLASS_B_H
#define CLASS_B_H

#include "ClassA.h"

class ClassB {
public:
    void methodB();
    ClassA* getA();
private:
    ClassA* a;
};

#endif
EOF
    
    cat > "$sample_dir/src/cpp/ClassA.cpp" << 'EOF'
#include "ClassA.h"

void ClassA::methodA() {
    // Implementation
}

ClassB* ClassA::getB() {
    return b;
}
EOF
    
    cat > "$sample_dir/src/cpp/ClassB.cpp" << 'EOF'
#include "ClassB.h"

void ClassB::methodB() {
    // Implementation
}

ClassA* ClassB::getA() {
    return a;
}
EOF
    
    # Python circular dependency example
    cat > "$sample_dir/src/python/module_a.py" << 'EOF'
from .module_b import function_b

def function_a():
    return f"A calls {function_b()}"
EOF
    
    cat > "$sample_dir/src/python/module_b.py" << 'EOF'
from .module_a import function_a

def function_b():
    return f"B calls {function_a()}"
EOF
    
    cat > "$sample_dir/src/python/module_c.py" << 'EOF'
from .module_a import function_a
from .utils.module_d import util_d

def function_c():
    return f"C uses {function_a()} and {util_d()}"
EOF
    
    mkdir -p "$sample_dir/src/python/utils"
    cat > "$sample_dir/src/python/utils/__init__.py" << 'EOF'
EOF
    
    cat > "$sample_dir/src/python/utils/module_d.py" << 'EOF'
from ..module_c import function_c

def util_d():
    return f"D indirectly calls {function_c()}"
EOF
    
    cat > "$sample_dir/src/python/__init__.py" << 'EOF'
EOF
    
    print_success "Sample project created with circular dependencies"
}

# Run analysis on sample project
run_analysis() {
    local sample_dir="$1"
    local output_dir="$2"
    
    print_status "Running circular dependency analysis..."
    
    # Full analysis with all languages
    echo
    print_status "1. Running comprehensive analysis..."
    node dist/cli/index.js analyze "$sample_dir" \
        --languages "typescript,cpp,python" \
        --output "$output_dir" \
        --format "json" \
        --visualization
    
    echo
    print_status "2. Running HTML report generation..."
    node dist/cli/index.js analyze "$sample_dir" \
        --languages "typescript,cpp,python" \
        --output "$output_dir" \
        --format "html"
    
    echo
    print_status "3. Running quick check (CI mode)..."
    if node dist/cli/index.js check "$sample_dir" \
        --languages "typescript,cpp,python" \
        --max-cycles 0; then
        print_warning "Quick check passed (unexpected - sample has cycles)"
    else
        print_success "Quick check detected cycles as expected"
    fi
    
    echo
    print_status "4. Generating visualization..."
    node dist/cli/index.js visualize "$sample_dir" \
        --languages "typescript,cpp,python" \
        --output "$output_dir/dependency-graph.svg"
}

# Display results
display_results() {
    local output_dir="$1"
    
    print_status "Analysis Results:"
    echo "=================="
    echo
    
    if [ -f "$output_dir/report.json" ]; then
        print_success "JSON Report: $output_dir/report.json"
        echo "  Sample content:"
        head -n 20 "$output_dir/report.json" | sed 's/^/  /'
        echo "  ..."
        echo
    fi
    
    if [ -f "$output_dir/report.html" ]; then
        print_success "HTML Report: $output_dir/report.html"
        echo "  Open in browser to view interactive report"
        echo
    fi
    
    if [ -f "$output_dir/dependency-graph.svg" ]; then
        print_success "Visualization: $output_dir/dependency-graph.svg"
        echo "  Open in browser or SVG viewer"
        echo
    fi
    
    echo "📁 All files in output directory:"
    ls -la "$output_dir/" | sed 's/^/  /'
}

# Cleanup function
cleanup() {
    local temp_dir="$1"
    if [ -n "$temp_dir" ] && [ -d "$temp_dir" ]; then
        print_status "Cleaning up temporary files..."
        rm -rf "$temp_dir"
        print_success "Cleanup completed"
    fi
}

# Main demo function
main() {
    local temp_dir
    local output_dir
    
    print_status "🎯 Circular Dependency Detection Demo"
    echo "======================================"
    echo
    
    # Set up temporary directories
    temp_dir=$(mktemp -d)
    output_dir="$temp_dir/output"
    
    # Trap to ensure cleanup
    trap "cleanup '$temp_dir'" EXIT
    
    # Check if tool is built
    check_build
    
    # Create sample project
    create_sample_project "$temp_dir/sample-project"
    
    # Run analysis
    run_analysis "$temp_dir/sample-project" "$output_dir"
    
    # Display results
    display_results "$output_dir"
    
    # Keep results for inspection
    local keep_dir="./demo-output"
    print_status "Copying results to: $keep_dir"
    rm -rf "$keep_dir"
    cp -r "$output_dir" "$keep_dir"
    print_success "Demo completed! Results saved to: $keep_dir"
    
    echo
    print_status "Next Steps:"
    echo "  1. Open $keep_dir/report.html in your browser"
    echo "  2. View $keep_dir/dependency-graph.svg for visual representation"
    echo "  3. Examine $keep_dir/report.json for detailed analysis data"
    echo "  4. Try running analysis on your own projects!"
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "Circular Dependency Detection Demo"
        echo
        echo "Usage: $0 [options]"
        echo
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --build-only   Only build the tool, don't run demo"
        echo "  --no-cleanup   Keep temporary files after demo"
        echo
        exit 0
        ;;
    --build-only)
        check_build
        exit 0
        ;;
    --no-cleanup)
        # Disable cleanup trap
        trap '' EXIT
        main
        ;;
    *)
        main
        ;;
esac