#!/bin/bash

# Setup Folder Theme System - Main CLI Interface
# Supports multi-platform development and deployment configurations

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATES_DIR="$SCRIPT_DIR/templates"
CONFIG_DIR="$SCRIPT_DIR/config"
TOOLS_DIR="$SCRIPT_DIR/tools"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
DEFAULT_CPU="x86_64"
DEFAULT_OS="linux"
DEFAULT_WORDSIZE="64"
DEFAULT_ENV="none"
DEFAULT_LANGUAGE="c"
DEFAULT_APP_TYPE="cli"

# Function to print colored output
print_color() {
    local color=$1
    shift
    echo -e "${color}$@${NC}"
}

# Function to print help
print_help() {
    cat << EOF
Setup Folder Theme System - Multi-Platform Configuration Tool

USAGE:
    ./setup.sh [COMMAND] [OPTIONS]

COMMANDS:
    create      Create new project from template
    list        List available templates
    validate    Validate configuration file
    generate    Generate build scripts from config
    compose     Combine multiple templates
    import      Import configuration from existing project
    info        Show template information
    test        Test hello world example

OPTIONS:
    --name NAME                 Project name
    --type TYPE                 Application type (cli, web, mobile, desktop, driver, embedded)
    --template TEMPLATE         Template name
    --config CONFIG            Configuration file path
    
    Development Target:
    --dev-cpu CPU              Development CPU (x86, x86_64, arm, arm64, riscv, mips, ppc)
    --dev-os OS                Development OS (linux, windows, macos, freebsd, android, ios, baremetal)
    --dev-wordsize SIZE        Development word size (16, 32, 64, 128)
    --dev-env ENV              Development environment (none, docker, podman, uv, conda, vmware, virtualbox, qemu)
    
    Deployment Target:
    --deploy-cpu CPU           Deployment CPU
    --deploy-os OS             Deployment OS
    --deploy-wordsize SIZE     Deployment word size
    --deploy-env ENV           Deployment environment
    
    Language Options:
    --language LANG            Programming language (c, cpp, rust, go, python, javascript, typescript, java, kotlin, swift)
    --language-version VER     Language version
    --framework FRAMEWORK      Framework (if applicable)
    
    Other Options:
    --output DIR               Output directory
    --force                    Overwrite existing files
    --verbose                  Verbose output
    --dry-run                  Show what would be done without doing it
    --help                     Show this help message

EXAMPLES:
    # Create CLI application for Linux x86_64
    ./setup.sh create --type=cli --dev-cpu=x86_64 --dev-os=linux --language=rust --name=myapp
    
    # List all available templates
    ./setup.sh list
    
    # Create cross-compiled embedded application
    ./setup.sh create --type=embedded --dev-cpu=x86_64 --dev-os=linux \\
                     --deploy-cpu=arm --deploy-os=baremetal --language=c --name=firmware
    
    # Validate configuration
    ./setup.sh validate config.json
    
    # Generate build scripts
    ./setup.sh generate --config=config.json --output=build/

EOF
}

# Function to list templates
list_templates() {
    print_color "$BLUE" "Available Templates:"
    echo ""
    
    if [ -d "$TEMPLATES_DIR" ]; then
        for category in "$TEMPLATES_DIR"/*; do
            if [ -d "$category" ]; then
                category_name=$(basename "$category")
                print_color "$YELLOW" "  $category_name:"
                for template in "$category"/*; do
                    if [ -d "$template" ]; then
                        template_name=$(basename "$template")
                        if [ -f "$template/config.json" ]; then
                            description=$(grep -o '"description"[[:space:]]*:[[:space:]]*"[^"]*"' "$template/config.json" | cut -d'"' -f4 || echo "No description")
                            echo "    - $template_name: $description"
                        else
                            echo "    - $template_name"
                        fi
                    fi
                done
                echo ""
            fi
        done
    else
        print_color "$YELLOW" "No templates directory found. Creating default structure..."
        create_default_structure
    fi
}

# Function to create default directory structure
create_default_structure() {
    print_color "$GREEN" "Creating default setup structure..."
    
    # Create main directories
    mkdir -p "$TEMPLATES_DIR"/{platforms,languages,app-types,environments}
    mkdir -p "$CONFIG_DIR"
    mkdir -p "$TOOLS_DIR"
    mkdir -p "$SCRIPT_DIR/examples"
    
    # Install Playwright MCP if not already installed
    if [ -f "$SCRIPT_DIR/install-playwright-mcp.sh" ]; then
        print_color "$BLUE" "Installing Playwright MCP for Explorer testing..."
        "$SCRIPT_DIR/install-playwright-mcp.sh" 2>/dev/null || true
    fi
    
    # Create default configuration schema
    cat > "$CONFIG_DIR/schema.json" << 'EOF'
{
  "schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "project": {
      "type": "object",
      "properties": {
        "name": {"type": "string"},
        "version": {"type": "string"},
        "type": {"enum": ["cli", "web", "mobile", "desktop", "driver", "embedded", "library"]}
      },
      "required": ["name", "type"]
    },
    "development": {
      "type": "object",
      "properties": {
        "cpu": {"enum": ["x86", "x86_64", "arm", "arm64", "riscv", "mips", "ppc"]},
        "os": {"enum": ["linux", "windows", "macos", "freebsd", "android", "ios", "baremetal"]},
        "wordsize": {"enum": [16, 32, 64, 128]},
        "environment": {"enum": ["none", "docker", "podman", "uv", "conda", "vmware", "virtualbox", "qemu"]},
        "language": {"type": "string"},
        "language_version": {"type": "string"}
      },
      "required": ["cpu", "os", "wordsize", "language"]
    },
    "deployment": {
      "type": "object",
      "properties": {
        "cpu": {"enum": ["x86", "x86_64", "arm", "arm64", "riscv", "mips", "ppc"]},
        "os": {"enum": ["linux", "windows", "macos", "freebsd", "android", "ios", "baremetal"]},
        "wordsize": {"enum": [16, 32, 64, 128]},
        "environment": {"enum": ["none", "docker", "podman", "uv", "conda", "vmware", "virtualbox", "qemu"]}
      }
    },
    "dependencies": {
      "type": "object",
      "additionalProperties": {"type": "string"}
    }
  },
  "required": ["project", "development"]
}
EOF
    
    print_color "$GREEN" "Default structure created successfully!"
}

# Function to create new project
create_project() {
    local project_name=""
    local app_type="$DEFAULT_APP_TYPE"
    local dev_cpu="$DEFAULT_CPU"
    local dev_os="$DEFAULT_OS"
    local dev_wordsize="$DEFAULT_WORDSIZE"
    local dev_env="$DEFAULT_ENV"
    local deploy_cpu=""
    local deploy_os=""
    local deploy_wordsize=""
    local deploy_env=""
    local language="$DEFAULT_LANGUAGE"
    local language_version=""
    local output_dir=""
    local template=""
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --name) project_name="$2"; shift 2 ;;
            --type) app_type="$2"; shift 2 ;;
            --template) template="$2"; shift 2 ;;
            --dev-cpu) dev_cpu="$2"; shift 2 ;;
            --dev-os) dev_os="$2"; shift 2 ;;
            --dev-wordsize) dev_wordsize="$2"; shift 2 ;;
            --dev-env) dev_env="$2"; shift 2 ;;
            --deploy-cpu) deploy_cpu="$2"; shift 2 ;;
            --deploy-os) deploy_os="$2"; shift 2 ;;
            --deploy-wordsize) deploy_wordsize="$2"; shift 2 ;;
            --deploy-env) deploy_env="$2"; shift 2 ;;
            --language) language="$2"; shift 2 ;;
            --language-version) language_version="$2"; shift 2 ;;
            --output) output_dir="$2"; shift 2 ;;
            *) shift ;;
        esac
    done
    
    # Set Docker as default for C++ libraries and clang dependencies
    if [ "$language" = "cpp" ] || [ "$language" = "c++" ]; then
        if [ "$app_type" = "library" ] || [ "$app_type" = "clang-depend" ]; then
            if [ -z "$dev_env" ] || [ "$dev_env" = "none" ]; then
                dev_env="docker"
                print_color "$BLUE" "Note: Setting Docker as default environment for C++ $app_type"
            fi
        fi
    fi
    
    # Validate required parameters
    if [ -z "$project_name" ]; then
        print_color "$RED" "Error: Project name is required (--name)"
        exit 1
    fi
    
    # Set output directory
    if [ -z "$output_dir" ]; then
        output_dir="./$project_name"
    fi
    
    # Check if output directory exists
    if [ -d "$output_dir" ] && [ "$FORCE" != "true" ]; then
        print_color "$RED" "Error: Directory $output_dir already exists. Use --force to overwrite."
        exit 1
    fi
    
    print_color "$GREEN" "Creating project: $project_name"
    print_color "$BLUE" "Configuration:"
    echo "  Type: $app_type"
    echo "  Development: $dev_cpu/$dev_os ($dev_wordsize-bit) - $language"
    if [ -n "$deploy_cpu" ]; then
        echo "  Deployment: $deploy_cpu/$deploy_os"
    fi
    echo "  Output: $output_dir"
    
    # Create project directory
    mkdir -p "$output_dir"
    
    # Generate configuration file
    cat > "$output_dir/config.json" << EOF
{
  "project": {
    "name": "$project_name",
    "version": "1.0.0",
    "type": "$app_type"
  },
  "development": {
    "cpu": "$dev_cpu",
    "os": "$dev_os",
    "wordsize": $dev_wordsize,
    "environment": "$dev_env",
    "language": "$language"$([ -n "$language_version" ] && echo ",\n    \"language_version\": \"$language_version\"")
  }$([ -n "$deploy_cpu" ] && echo ",\n  \"deployment\": {\n    \"cpu\": \"$deploy_cpu\",\n    \"os\": \"$deploy_os\",\n    \"wordsize\": ${deploy_wordsize:-$dev_wordsize},\n    \"environment\": \"${deploy_env:-none}\"\n  }")
}
EOF
    
    # Create basic project structure
    mkdir -p "$output_dir"/{src,build,test,docs}
    
    # Generate hello world based on language
    generate_hello_world "$output_dir" "$language" "$app_type"
    
    # Generate build script
    generate_build_script "$output_dir" "$language" "$app_type" "$dev_os"
    
    print_color "$GREEN" "Project created successfully!"
    print_color "$BLUE" "Next steps:"
    echo "  1. cd $output_dir"
    echo "  2. ./build.sh"
    echo "  3. ./run.sh"
}

# Function to generate hello world example
generate_hello_world() {
    local output_dir=$1
    local language=$2
    local app_type=$3
    
    # For library and clang-depend types, hello world is handled by templates
    if [ "$app_type" = "library" ] || [ "$app_type" = "clang-depend" ]; then
        # These types have their own specialized hello world in templates
        return 0
    fi
    
    case "$language" in
        c)
            cat > "$output_dir/src/main.c" << 'EOF'
#include <stdio.h>

int main(int argc, char *argv[]) {
    printf("Hello World from C!\n");
    printf("Platform: %s\n", PLATFORM);
    printf("Architecture: %s\n", ARCH);
    return 0;
}
EOF
            ;;
        cpp)
            cat > "$output_dir/src/main.cpp" << 'EOF'
#include <iostream>
#include <string>

int main(int argc, char *argv[]) {
    std::cout << "Hello World from C++!" << std::endl;
    std::cout << "Platform: " << PLATFORM << std::endl;
    std::cout << "Architecture: " << ARCH << std::endl;
    return 0;
}
EOF
            ;;
        rust)
            cat > "$output_dir/src/main.rs" << 'EOF'
fn main() {
    println!("Hello World from Rust!");
    println!("Platform: {}", env!("TARGET"));
    println!("Architecture: {}", std::env::consts::ARCH);
}
EOF
            # Create Cargo.toml
            cat > "$output_dir/Cargo.toml" << EOF
[package]
name = "$(basename "$output_dir")"
version = "1.0.0"
edition = "2021"

[dependencies]
EOF
            ;;
        go)
            cat > "$output_dir/src/main.go" << 'EOF'
package main

import (
    "fmt"
    "runtime"
)

func main() {
    fmt.Println("Hello World from Go!")
    fmt.Printf("Platform: %s/%s\n", runtime.GOOS, runtime.GOARCH)
    fmt.Printf("Go version: %s\n", runtime.Version())
}
EOF
            ;;
        python)
            cat > "$output_dir/src/main.py" << 'EOF'
#!/usr/bin/env python3
import sys
import platform

def main():
    print("Hello World from Python!")
    print(f"Platform: {platform.system()}")
    print(f"Architecture: {platform.machine()}")
    print(f"Python version: {sys.version}")

if __name__ == "__main__":
    main()
EOF
            chmod +x "$output_dir/src/main.py"
            ;;
        javascript|typescript)
            if [ "$language" = "typescript" ]; then
                cat > "$output_dir/src/main.ts" << 'EOF'
console.log("Hello World from TypeScript!");
console.log(`Platform: ${process.platform}`);
console.log(`Architecture: ${process.arch}`);
console.log(`Node version: ${process.version}`);
EOF
                # Create tsconfig.json
                cat > "$output_dir/tsconfig.json" << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
EOF
            else
                cat > "$output_dir/src/main.js" << 'EOF'
console.log("Hello World from JavaScript!");
console.log(`Platform: ${process.platform}`);
console.log(`Architecture: ${process.arch}`);
console.log(`Node version: ${process.version}`);
EOF
            fi
            # Create package.json
            cat > "$output_dir/package.json" << EOF
{
  "name": "$(basename "$output_dir")",
  "version": "1.0.0",
  "main": "src/main.$([[ "$language" == "typescript" ]] && echo "ts" || echo "js")",
  "scripts": {
    "start": "$([[ "$language" == "typescript" ]] && echo "ts-node" || echo "node") src/main.$([[ "$language" == "typescript" ]] && echo "ts" || echo "js")",
    "build": "$([[ "$language" == "typescript" ]] && echo "tsc" || echo "echo 'No build needed for JavaScript'")"
  }
}
EOF
            ;;
        java)
            mkdir -p "$output_dir/src/main/java"
            cat > "$output_dir/src/main/java/Main.java" << 'EOF'
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello World from Java!");
        System.out.println("Platform: " + System.getProperty("os.name"));
        System.out.println("Architecture: " + System.getProperty("os.arch"));
        System.out.println("Java version: " + System.getProperty("java.version"));
    }
}
EOF
            ;;
        kotlin)
            mkdir -p "$output_dir/src/main/kotlin"
            cat > "$output_dir/src/main/kotlin/Main.kt" << 'EOF'
fun main() {
    println("Hello World from Kotlin!")
    println("Platform: ${System.getProperty("os.name")}")
    println("Architecture: ${System.getProperty("os.arch")}")
    println("Kotlin version: ${KotlinVersion.CURRENT}")
}
EOF
            ;;
        swift)
            cat > "$output_dir/src/main.swift" << 'EOF'
import Foundation

print("Hello World from Swift!")
#if os(macOS)
    print("Platform: macOS")
#elseif os(Linux)
    print("Platform: Linux")
#else
    print("Platform: Unknown")
#endif
print("Architecture: \(ProcessInfo.processInfo.machineHardwareName ?? "Unknown")")
EOF
            ;;
        *)
            print_color "$YELLOW" "Warning: Unknown language $language, creating generic hello world"
            echo "echo 'Hello World!'" > "$output_dir/src/main.sh"
            chmod +x "$output_dir/src/main.sh"
            ;;
    esac
}

# Function to generate build script
generate_build_script() {
    local output_dir=$1
    local language=$2
    local app_type=$3
    local os=$4
    
    cat > "$output_dir/build.sh" << 'EOF'
#!/bin/bash
set -e

echo "Building project..."

EOF
    
    case "$language" in
        c|cpp)
            local compiler=$([[ "$language" == "cpp" ]] && echo "g++" || echo "gcc")
            local ext=$([[ "$language" == "cpp" ]] && echo "cpp" || echo "c")
            cat >> "$output_dir/build.sh" << EOF
# Build C/C++ project
COMPILER=$compiler
FLAGS="-Wall -O2 -DPLATFORM=\\\"$os\\\" -DARCH=\\\"$(uname -m)\\\""
OUTPUT="build/$(basename "$output_dir")"

mkdir -p build
\$COMPILER \$FLAGS src/main.$ext -o \$OUTPUT
echo "Build complete: \$OUTPUT"
EOF
            ;;
        rust)
            cat >> "$output_dir/build.sh" << 'EOF'
# Build Rust project
cargo build --release
echo "Build complete: target/release/$(basename "$PWD")"
EOF
            ;;
        go)
            cat >> "$output_dir/build.sh" << 'EOF'
# Build Go project
go build -o build/$(basename "$PWD") src/main.go
echo "Build complete: build/$(basename "$PWD")"
EOF
            ;;
        python)
            cat >> "$output_dir/build.sh" << 'EOF'
# Python doesn't need compilation
echo "Python project ready to run"
echo "Run with: python3 src/main.py"
EOF
            ;;
        javascript|typescript)
            if [ "$language" = "typescript" ]; then
                cat >> "$output_dir/build.sh" << 'EOF'
# Build TypeScript project
bun install
bun run build
echo "Build complete: dist/"
EOF
            else
                cat >> "$output_dir/build.sh" << 'EOF'
# JavaScript doesn't need compilation
bun install
echo "JavaScript project ready to run"
echo "Run with: bun start"
EOF
            fi
            ;;
        java)
            cat >> "$output_dir/build.sh" << 'EOF'
# Build Java project
mkdir -p build
javac -d build src/main/java/Main.java
echo "Build complete: build/"
echo "Run with: java -cp build Main"
EOF
            ;;
        kotlin)
            cat >> "$output_dir/build.sh" << 'EOF'
# Build Kotlin project
mkdir -p build
kotlinc src/main/kotlin/Main.kt -d build
echo "Build complete: build/"
echo "Run with: kotlin -cp build MainKt"
EOF
            ;;
        swift)
            cat >> "$output_dir/build.sh" << 'EOF'
# Build Swift project
mkdir -p build
swiftc src/main.swift -o build/$(basename "$PWD")
echo "Build complete: build/$(basename "$PWD")"
EOF
            ;;
        *)
            cat >> "$output_dir/build.sh" << 'EOF'
echo "Build script not implemented for this language"
EOF
            ;;
    esac
    
    chmod +x "$output_dir/build.sh"
    
    # Create run script
    cat > "$output_dir/run.sh" << 'EOF'
#!/bin/bash
set -e

echo "Running project..."

EOF
    
    case "$language" in
        c|cpp)
            echo "./build/$(basename "$output_dir")" >> "$output_dir/run.sh"
            ;;
        rust)
            echo "./target/release/$(basename "$output_dir")" >> "$output_dir/run.sh"
            ;;
        go)
            echo "./build/$(basename "$output_dir")" >> "$output_dir/run.sh"
            ;;
        python)
            echo "python3 src/main.py" >> "$output_dir/run.sh"
            ;;
        javascript|typescript)
            echo "bun start" >> "$output_dir/run.sh"
            ;;
        java)
            echo "java -cp build Main" >> "$output_dir/run.sh"
            ;;
        kotlin)
            echo "kotlin -cp build MainKt" >> "$output_dir/run.sh"
            ;;
        swift)
            echo "./build/$(basename "$output_dir")" >> "$output_dir/run.sh"
            ;;
        *)
            echo "./src/main.sh" >> "$output_dir/run.sh"
            ;;
    esac
    
    chmod +x "$output_dir/run.sh"
}

# Function to validate configuration
validate_config() {
    local config_file=$1
    
    if [ ! -f "$config_file" ]; then
        print_color "$RED" "Error: Configuration file not found: $config_file"
        exit 1
    fi
    
    print_color "$BLUE" "Validating configuration: $config_file"
    
    # Check if Python is available for JSON validation
    if command -v python3 &> /dev/null; then
        python3 << EOF
import json
import sys

try:
    with open("$config_file", "r") as f:
        config = json.load(f)
    
    # Validate required fields
    required = ["project", "development"]
    for field in required:
        if field not in config:
            print("Error: Missing required field: " + field)
            sys.exit(1)
    
    # Validate project fields
    if "name" not in config["project"]:
        print("Error: Missing project name")
        sys.exit(1)
    
    if "type" not in config["project"]:
        print("Error: Missing project type")
        sys.exit(1)
    
    # Validate development fields
    dev = config["development"]
    required_dev = ["cpu", "os", "wordsize", "language"]
    for field in required_dev:
        if field not in dev:
            print("Error: Missing development field: " + field)
            sys.exit(1)
    
    print("✓ Configuration is valid")
    print("✓ All required fields present")
    
    # Check optional deployment config
    if "deployment" in config:
        print("✓ Deployment configuration found")
    
    # Check dependencies
    if "dependencies" in config:
        print("✓ Dependencies specified: " + ", ".join(config["dependencies"].keys()))
    
except json.JSONDecodeError as e:
    print("Error: Invalid JSON format: " + str(e))
    sys.exit(1)
except Exception as e:
    print("Error: " + str(e))
    sys.exit(1)
EOF
    else
        print_color "$YELLOW" "Warning: Python not found, using basic validation"
        if grep -q '"project"' "$config_file" && grep -q '"development"' "$config_file"; then
            print_color "$GREEN" "✓ Basic validation passed"
        else
            print_color "$RED" "Error: Invalid configuration format"
            exit 1
        fi
    fi
}

# Function to show template info
show_template_info() {
    local template=$1
    local template_path=""
    
    # Search for template in categories
    for category in "$TEMPLATES_DIR"/*; do
        if [ -d "$category/$template" ]; then
            template_path="$category/$template"
            break
        fi
    done
    
    if [ -z "$template_path" ] || [ ! -d "$template_path" ]; then
        print_color "$RED" "Error: Template not found: $template"
        exit 1
    fi
    
    print_color "$BLUE" "Template: $template"
    
    if [ -f "$template_path/config.json" ]; then
        echo ""
        print_color "$YELLOW" "Configuration:"
        cat "$template_path/config.json" | python3 -m json.tool 2>/dev/null || cat "$template_path/config.json"
    fi
    
    if [ -f "$template_path/README.md" ]; then
        echo ""
        print_color "$YELLOW" "Documentation:"
        head -20 "$template_path/README.md"
    fi
    
    if [ -d "$template_path/hello-world" ]; then
        echo ""
        print_color "$YELLOW" "Hello World Example:"
        find "$template_path/hello-world" -type f -name "*.c" -o -name "*.cpp" -o -name "*.rs" -o -name "*.go" -o -name "*.py" -o -name "*.js" -o -name "*.ts" | head -1 | xargs head -10 2>/dev/null
    fi
}

# Main script logic
main() {
    # Check if no arguments provided
    if [ $# -eq 0 ]; then
        print_help
        exit 0
    fi
    
    # Parse global options
    FORCE=false
    VERBOSE=false
    DRY_RUN=false
    
    # Parse command
    COMMAND=$1
    shift
    
    # Handle global flags
    while [[ $# -gt 0 ]] && [[ "$1" == "--"* ]]; do
        case $1 in
            --force) FORCE=true; shift ;;
            --verbose) VERBOSE=true; shift ;;
            --dry-run) DRY_RUN=true; shift ;;
            --help) print_help; exit 0 ;;
            *) break ;;
        esac
    done
    
    # Execute command
    case $COMMAND in
        create)
            create_project "$@"
            ;;
        list)
            list_templates
            ;;
        validate)
            if [ $# -eq 0 ]; then
                print_color "$RED" "Error: Configuration file required"
                exit 1
            fi
            validate_config "$1"
            ;;
        generate)
            print_color "$YELLOW" "Generate command not yet implemented"
            ;;
        compose)
            print_color "$YELLOW" "Compose command not yet implemented"
            ;;
        import)
            print_color "$YELLOW" "Import command not yet implemented"
            ;;
        info)
            if [ $# -eq 0 ]; then
                print_color "$RED" "Error: Template name required"
                exit 1
            fi
            show_template_info "$1"
            ;;
        test)
            print_color "$YELLOW" "Test command not yet implemented"
            ;;
        help|--help)
            print_help
            ;;
        *)
            print_color "$RED" "Error: Unknown command: $COMMAND"
            echo "Run './setup.sh --help' for usage information"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"