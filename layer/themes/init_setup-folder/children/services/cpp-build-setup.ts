/**
 * C++ Build Setup Service
 * Configures CMake integration for coverage builds
 */

import * as fs from 'fs/promises';
import { path } from '../../../infra_external-log-lib/src';
import { exec } from 'child_process';
import { promisify } from 'node:util';
import { getFileAPI, FileType } from '../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


const execAsync = promisify(exec);

export interface CppBuildConfig {
  buildSystem: 'cmake' | 'make' | 'bazel';
  buildDirectory: string;
  coverageFlags: string[];
  testTarget: string;
  compiler: 'clang' | 'gcc' | 'msvc';
  cppStandard: 'c++11' | 'c++14' | 'c++17' | 'c++20' | 'c++23';
  optimizationLevel: 'O0' | 'O1' | 'O2' | 'O3';
}

export class CppBuildSetup {
  private defaultConfig: CppBuildConfig = {
    buildSystem: 'cmake',
    buildDirectory: 'build',
    coverageFlags: [],
    testTarget: 'test',
    compiler: 'clang',
    cppStandard: 'c++17',
    optimizationLevel: 'O0'
  };

  async setup(projectPath: string, config?: Partial<CppBuildConfig>): Promise<void> {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    console.log(`🔨 Setting up C++ build configuration for: ${projectPath}`);
    
    // Detect build system if not specified
    if (!config?.buildSystem) {
      finalConfig.buildSystem = await this.detectBuildSystem(projectPath);
    }
    
    // Detect compiler if not specified
    if (!config?.compiler) {
      finalConfig.compiler = await this.detectCompiler();
    }
    
    // Setup based on build system
    switch (finalConfig.buildSystem) {
      case 'cmake':
        await this.setupCMake(projectPath, finalConfig);
        break;
      case 'make':
        await this.setupMake(projectPath, finalConfig);
        break;
      case 'bazel':
        await this.setupBazel(projectPath, finalConfig);
        break;
    }
    
    // Create build scripts
    await this.createBuildScripts(projectPath, finalConfig);
    
    console.log('✅ C++ build setup complete!');
  }

  private async detectBuildSystem(projectPath: string): Promise<CppBuildConfig["buildSystem"]> {
    try {
      // Check for CMakeLists.txt
      await fs.access(path.join(projectPath, 'CMakeLists.txt'));
      return 'cmake';
    } catch {}
    
    try {
      // Check for Makefile
      await fs.access(path.join(projectPath, "Makefile"));
      return 'make';
    } catch {}
    
    try {
      // Check for BUILD or BUILD.bazel
      await fs.access(path.join(projectPath, 'BUILD'));
      return 'bazel';
    } catch {}
    
    // Default to CMake
    return 'cmake';
  }

  private async detectCompiler(): Promise<CppBuildConfig["compiler"]> {
    try {
      await execAsync('clang++ --version');
      return 'clang';
    } catch {}
    
    try {
      await execAsync('g++ --version');
      return 'gcc';
    } catch {}
    
    try {
      await execAsync('cl /?');
      return 'msvc';
    } catch {}
    
    return 'gcc'; // Default fallback
  }

  private async setupCMake(projectPath: string, config: CppBuildConfig): Promise<void> {
    const cmakePresets = {
      version: 3,
      configurePresets: [
        {
          name: "coverage",
          displayName: 'Coverage Build',
          generator: 'Ninja',
          binaryDir: '${sourceDir}/build-coverage',
          cacheVariables: {
            CMAKE_BUILD_TYPE: 'Debug',
            CMAKE_CXX_STANDARD: config.cppStandard.replace('c++', ''),
            ENABLE_COVERAGE: 'ON',
            CMAKE_CXX_FLAGS: this.getCoverageFlags(config.compiler).join(' '),
            CMAKE_C_FLAGS: this.getCoverageFlags(config.compiler).join(' '),
            CMAKE_EXE_LINKER_FLAGS: this.getLinkerFlags(config.compiler).join(' ')
          }
        },
        {
          name: 'debug',
          displayName: 'Debug Build',
          generator: 'Ninja',
          binaryDir: '${sourceDir}/build-debug',
          cacheVariables: {
            CMAKE_BUILD_TYPE: 'Debug',
            CMAKE_CXX_STANDARD: config.cppStandard.replace('c++', '')
          }
        },
        {
          name: 'release',
          displayName: 'Release Build',
          generator: 'Ninja',
          binaryDir: '${sourceDir}/build-release',
          cacheVariables: {
            CMAKE_BUILD_TYPE: 'Release',
            CMAKE_CXX_STANDARD: config.cppStandard.replace('c++', '')
          }
        }
      ],
      buildPresets: [
        {
          name: "coverage",
          configurePreset: "coverage",
          jobs: 4
        },
        {
          name: 'debug',
          configurePreset: 'debug',
          jobs: 4
        },
        {
          name: 'release',
          configurePreset: 'release',
          jobs: 4
        }
      ],
      testPresets: [
        {
          name: "coverage",
          configurePreset: "coverage",
          output: {
            outputOnFailure: true
          }
        }
      ]
    };
    
    const presetsPath = path.join(projectPath, 'CMakePresets.json');
    await fileAPI.createFile(presetsPath, JSON.stringify(cmakePresets, { type: FileType.TEMPORARY }));
    
    // Update CMakeLists.txt if needed
    await this.updateCMakeLists(projectPath, config);
  }

  private async updateCMakeLists(projectPath: string, config: CppBuildConfig): Promise<void> {
    const cmakeListsPath = path.join(projectPath, 'CMakeLists.txt');
    
    try {
      let content = await fileAPI.readFile(cmakeListsPath, 'utf-8');
      
      // Check if coverage is already included
      if (!content.includes('coverage.cmake')) {
        // Add coverage include after project declaration
        const projectMatch = content.match(/project\([^)]+\)/);
        if (projectMatch) {
          const insertPos = projectMatch.index! + projectMatch[0].length;
          const coverageInclude = `

# Coverage configuration
if(EXISTS \${CMAKE_CURRENT_SOURCE_DIR}/.coverage/coverage.cmake)
    include(.coverage/coverage.cmake)
endif()
`;
          content = content.slice(0, insertPos) + coverageInclude + content.slice(insertPos);
          await fileAPI.createFile(cmakeListsPath, content);
        }
      }
    } catch (error) {
      // Create a basic CMakeLists.txt if it doesn't exist
      const basicCMake = `cmake_minimum_required(VERSION 3.14)
project(${path.basename(projectPath)} CXX)

set(CMAKE_CXX_STANDARD ${config.cppStandard.replace('c++', { type: FileType.TEMPORARY });
    }
  }

  private async setupMake(projectPath: string, config: CppBuildConfig): Promise<void> {
    const makefileContent = `# Makefile with coverage support
CXX := ${config.compiler === 'clang' ? 'clang++' : 'g++'}
CXXFLAGS := -std=${config.cppStandard} -Wall -Wextra ${config.optimizationLevel}
COVERAGE_FLAGS := ${this.getCoverageFlags(config.compiler).join(' ')}
LDFLAGS := ${this.getLinkerFlags(config.compiler).join(' ')}

# Directories
BUILD_DIR := ${config.buildDirectory}
SRC_DIR := src
TEST_DIR := tests
COVERAGE_DIR := coverage

# Source files
SRCS := $(wildcard $(SRC_DIR)/*.cpp)
TEST_SRCS := $(wildcard $(TEST_DIR)/*.cpp)
OBJS := $(SRCS:$(SRC_DIR)/%.cpp=$(BUILD_DIR)/%.o)
TEST_OBJS := $(TEST_SRCS:$(TEST_DIR)/%.cpp=$(BUILD_DIR)/test_%.o)

# Targets
.PHONY: all clean test coverage

all: $(BUILD_DIR)/app

coverage: CXXFLAGS += $(COVERAGE_FLAGS)
coverage: LDFLAGS += $(COVERAGE_FLAGS)
coverage: test
	@echo "Generating coverage report..."
	${this.getCoverageCommand(config.compiler)}

test: $(BUILD_DIR)/test_runner
	./$(BUILD_DIR)/test_runner

$(BUILD_DIR)/app: $(OBJS)
	$(CXX) $(OBJS) -o $@ $(LDFLAGS)

$(BUILD_DIR)/test_runner: $(OBJS) $(TEST_OBJS)
	$(CXX) $(OBJS) $(TEST_OBJS) -o $@ $(LDFLAGS)

$(BUILD_DIR)/%.o: $(SRC_DIR)/%.cpp
	@mkdir -p $(BUILD_DIR)
	$(CXX) $(CXXFLAGS) -c $< -o $@

$(BUILD_DIR)/test_%.o: $(TEST_DIR)/%.cpp
	@mkdir -p $(BUILD_DIR)
	$(CXX) $(CXXFLAGS) -c $< -o $@

clean:
	rm -rf $(BUILD_DIR) $(COVERAGE_DIR) *.gcda *.gcno *.profraw *.profdata
`;
    
    const makefilePath = path.join(projectPath, 'Makefile.coverage');
    await fileAPI.createFile(makefilePath, makefileContent);
  }

  private async setupBazel(projectPath: string, { type: FileType.TEMPORARY });
    await fileAPI.createFile(bazelrcPath, bazelrcContent);
  }

  private async getCoverageFlags(compiler: CppBuildConfig["compiler"]): string[] {
    switch (compiler) {
      case 'clang':
        return ['-fprofile-instr-generate', { type: FileType.TEMPORARY }): string[] {
    switch (compiler) {
      case 'clang':
        return ['-fprofile-instr-generate', '-fcoverage-mapping'];
      case 'gcc':
        return ['--coverage'];
      case 'msvc':
        return ['/PROFILE'];
      default:
        return [];
    }
  }

  private async getCoverageCommand(compiler: CppBuildConfig["compiler"]): string {
    switch (compiler) {
      case 'clang':
        return `llvm-profdata merge -sparse *.profraw -o default.profdata && \\
	llvm-cov report ./$(BUILD_DIR)/test_runner -instr-profile=default.profdata && \\
	llvm-cov show ./$(BUILD_DIR)/test_runner -instr-profile=default.profdata -format=html -output-dir=$(COVERAGE_DIR)`;
      case 'gcc':
        return `lcov --capture --directory . --output-file coverage.info && \\
	lcov --remove coverage.info '/usr/*' '*/test/*' --output-file coverage.info && \\
	genhtml coverage.info --output-directory $(COVERAGE_DIR)`;
      default:
        return 'echo "Coverage not configured for this compiler"';
    }
  }

  private async createBuildScripts(projectPath: string, config: CppBuildConfig): Promise<void> {
    const scriptsDir = path.join(projectPath, 'scripts');
    await fileAPI.createDirectory(scriptsDir);
    
    // Build script
    const buildScript = `#!/bin/bash
# Build script for C++ project with coverage support

set -e

BUILD_TYPE=\${1:-Debug}
ENABLE_COVERAGE=\${2:-OFF}

echo "Building with BUILD_TYPE=$BUILD_TYPE and ENABLE_COVERAGE=$ENABLE_COVERAGE"

if [ "$BUILD_TYPE" = "Coverage" ]; then
    ENABLE_COVERAGE=ON
    BUILD_TYPE=Debug
fi

case "${config.buildSystem}" in
    cmake)
        cmake -B ${config.buildDirectory} \\
            -DCMAKE_BUILD_TYPE=$BUILD_TYPE \\
            -DENABLE_COVERAGE=$ENABLE_COVERAGE \\
            -DCMAKE_CXX_COMPILER=${config.compiler === 'clang' ? 'clang++' : 'g++'}
        cmake --build ${config.buildDirectory} --parallel
        ;;
    make)
        if [ "$ENABLE_COVERAGE" = "ON" ]; then
            make -f Makefile.coverage coverage
        else
            make
        fi
        ;;
    bazel)
        if [ "$ENABLE_COVERAGE" = "ON" ]; then
            bazel coverage //... --config=coverage
        else
            bazel build //...
        fi
        ;;
esac

echo "Build complete!"
`;
    
    const buildScriptPath = path.join(scriptsDir, 'build.sh');
    await fileAPI.createFile(buildScriptPath, buildScript);
    await fs.chmod(buildScriptPath, { type: FileType.TEMPORARY });
    await fileAPI.createFile(testScriptPath, testScript);
    await fs.chmod(testScriptPath, { type: FileType.TEMPORARY });
  }
}