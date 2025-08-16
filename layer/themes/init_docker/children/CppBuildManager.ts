import { fs } from '../../infra_external-log-lib/src';
import { path } from '../../infra_external-log-lib/src';
import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export type CppCompiler = 'gcc' | 'clang' | 'msvc';
export type BuildType = 'Debug' | 'Release' | "RelWithDebInfo" | "MinSizeRel";
export type CppStandard = 'c++11' | 'c++14' | 'c++17' | 'c++20' | 'c++23';

export interface CMakeConfig {
  projectName: string;
  version?: string;
  standard?: CppStandard;
  buildType?: BuildType;
  compiler?: CppCompiler;
  enableTests?: boolean;
  enableCoverage?: boolean;
  enableSanitizers?: boolean;
  enableLTO?: boolean;
  staticLink?: boolean;
  installPrefix?: string;
  additionalFlags?: string[];
  dependencies?: string[];
}

export interface BuildResult {
  success: boolean;
  output: string;
  errors?: string;
  buildTime?: number;
  artifacts?: string[];
}

export interface TestResult {
  success: boolean;
  passed: number;
  failed: number;
  skipped: number;
  output: string;
  coverage?: CoverageReport;
}

export interface CoverageReport {
  linesCovered: number;
  linesTotal: number;
  percentage: number;
  files: Map<string, FileCoverage>;
}

export interface FileCoverage {
  path: string;
  linesCovered: number;
  linesTotal: number;
  percentage: number;
}

export class CppBuildManager {
  private projectPath: string;
  private buildPath: string;
  private cmakeCache: Map<string, string>;

  constructor(projectPath?: string) {
    this.projectPath = projectPath || process.cwd();
    this.buildPath = path.join(this.projectPath, 'build');
    this.cmakeCache = new Map();
  }

  /**
   * Generate CMakeLists.txt from configuration
   */
  async generateCMakeLists(config: CMakeConfig): string {
    const lines: string[] = [];
    
    // CMake minimum version
    lines.push('cmake_minimum_required(VERSION 3.20)');
    lines.push(`project(${config.projectName} VERSION ${config.version || '1.0.0'} LANGUAGES CXX)`);
    lines.push('');
    
    // C++ standard
    const standard = (config.standard || 'c++17').substring(3);
    lines.push(`set(CMAKE_CXX_STANDARD ${standard})`);
    lines.push('set(CMAKE_CXX_STANDARD_REQUIRED ON)');
    lines.push('set(CMAKE_CXX_EXTENSIONS OFF)');
    lines.push('');
    
    // Build type
    lines.push('if(NOT CMAKE_BUILD_TYPE)');
    lines.push(`    set(CMAKE_BUILD_TYPE ${config.buildType || 'Release'} CACHE STRING "Build type" FORCE)`);
    lines.push('endif()');
    lines.push('');
    
    // Options
    lines.push(`option(ENABLE_TESTING "Enable testing" ${config.enableTests ? 'ON' : 'OFF'})`);
    lines.push(`option(ENABLE_COVERAGE "Enable coverage" ${config.enableCoverage ? 'ON' : 'OFF'})`);
    lines.push(`option(ENABLE_SANITIZERS "Enable sanitizers" ${config.enableSanitizers ? 'ON' : 'OFF'})`);
    lines.push(`option(ENABLE_LTO "Enable LTO" ${config.enableLTO ? 'ON' : 'OFF'})`);
    lines.push(`option(BUILD_SHARED_LIBS "Build shared libs" ${!config.staticLink ? 'ON' : 'OFF'})`);
    lines.push('');
    
    // Output directories
    lines.push('set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)');
    lines.push('set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)');
    lines.push('set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)');
    lines.push('');
    
    // Compiler flags
    lines.push('if(CMAKE_CXX_COMPILER_ID MATCHES "Clang|GNU")');
    lines.push('    add_compile_options(-Wall -Wextra -Wpedantic)');
    lines.push('    if(CMAKE_BUILD_TYPE STREQUAL "Debug")');
    lines.push('        add_compile_options(-g -O0)');
    lines.push('    elseif(CMAKE_BUILD_TYPE STREQUAL "Release")');
    lines.push('        add_compile_options(-O3 -DNDEBUG)');
    lines.push('    endif()');
    
    if(config.enableCoverage) {
      lines.push('    if(ENABLE_COVERAGE)');
      lines.push('        add_compile_options(--coverage)');
      lines.push('        add_link_options(--coverage)');
      lines.push('    endif()');
    }
    
    if(config.enableSanitizers) {
      lines.push('    if(ENABLE_SANITIZERS)');
      lines.push('        add_compile_options(-fsanitize=address,undefined)');
      lines.push('        add_link_options(-fsanitize=address,undefined)');
      lines.push('    endif()');
    }
    
    lines.push('endif()');
    lines.push('');
    
    // LTO
    if(config.enableLTO) {
      lines.push('if(ENABLE_LTO AND CMAKE_BUILD_TYPE STREQUAL "Release")');
      lines.push('    include(CheckIPOSupported)');
      lines.push('    check_ipo_supported(RESULT ipo_supported)');
      lines.push('    if(ipo_supported)');
      lines.push('        set(CMAKE_INTERPROCEDURAL_OPTIMIZATION ON)');
      lines.push('    endif()');
      lines.push('endif()');
      lines.push('');
    }
    
    // Dependencies
    lines.push('find_package(Threads REQUIRED)');
    if(config.dependencies) {
      config.dependencies.forEach(dep => {
        lines.push(`find_package(${dep} REQUIRED)`);
      });
    }
    lines.push('');
    
    // Include directories
    lines.push('include_directories(include)');
    lines.push('');
    
    // Add subdirectories
    lines.push('add_subdirectory(src)');
    if(config.enableTests) {
      lines.push('if(ENABLE_TESTING)');
      lines.push('    enable_testing()');
      lines.push('    add_subdirectory(tests)');
      lines.push('endif()');
    }
    lines.push('');
    
    // Export compile commands
    lines.push('set(CMAKE_EXPORT_COMPILE_COMMANDS ON)');
    lines.push('');
    
    // Installation
    lines.push('install(DIRECTORY include/ DESTINATION include)');
    lines.push(`install(TARGETS ${config.projectName}`);
    lines.push('    RUNTIME DESTINATION bin');
    lines.push('    LIBRARY DESTINATION lib');
    lines.push('    ARCHIVE DESTINATION lib)');
    
    return lines.join('\n');
  }

  /**
   * Configure CMake project
   */
  async configure(config?: Partial<CMakeConfig>): Promise<BuildResult> {
    const startTime = Date.now();
    
    // Create build directory
    await fileAPI.createDirectory(this.buildPath);
    
    // Build CMake command
    const args = ['cmake', '..'];
    
    if(config?.buildType) {
      args.push(`-DCMAKE_BUILD_TYPE=${config.buildType}`);
    }
    
    if(config?.compiler) {
      const compilers = {
        gcc: { CC: 'gcc', CXX: 'g++' },
        clang: { CC: 'clang', CXX: 'clang++' },
        msvc: { CC: 'cl', CXX: 'cl' }
      };
      const comp = compilers[config.compiler];
      args.push(`-DCMAKE_C_COMPILER=${comp.CC}`);
      args.push(`-DCMAKE_CXX_COMPILER=${comp.CXX}`);
    }
    
    if(config?.standard) {
      const standard = config.standard.substring(3);
      args.push(`-DCMAKE_CXX_STANDARD=${standard}`);
    }
    
    if(config?.enableTests !== undefined) {
      args.push(`-DENABLE_TESTING=${config.enableTests ? 'ON' : 'OFF'}`);
    }
    
    if(config?.enableCoverage !== undefined) {
      args.push(`-DENABLE_COVERAGE=${config.enableCoverage ? 'ON' : 'OFF'}`);
    }
    
    if(config?.staticLink !== undefined) {
      args.push(`-DBUILD_SHARED_LIBS=${config.staticLink ? 'OFF' : 'ON'}`);
    }
    
    // Use Ninja if available
    try {
      await execAsync('ninja --version');
      args.push('-G', 'Ninja');
    } catch {
      // Fall back to Make
    }
    
    // Export compile commands
    args.push('-DCMAKE_EXPORT_COMPILE_COMMANDS=ON');
    
    try {
      const { stdout, stderr } = await execAsync(args.join(' '), {
        cwd: this.buildPath
      });
      
      const buildTime = Date.now() - startTime;
      
      // Load CMake cache
      await this.loadCMakeCache();
      
      return {
        success: true,
        output: stdout,
        buildTime,
        errors: stderr
      };
    } catch (error: any) {
      return {
        success: false,
        output: error.stdout || '',
        errors: error.stderr || error.message,
        buildTime: Date.now() - startTime
      };
    }
  }

  /**
   * Build the project
   */
  async build(target?: string, parallel?: number): Promise<BuildResult> {
    const startTime = Date.now();
    
    // Check if configured
    if(!fs.existsSync(path.join(this.buildPath, 'CMakeCache.txt'))) {
      await this.configure();
    }
    
    const args = ['cmake', '--build', '.'];
    
    if(target) {
      args.push('--target', target);
    }
    
    if(parallel) {
      args.push('--parallel', parallel.toString());
    }
    
    try {
      const { stdout, stderr } = await execAsync(args.join(' '), {
        cwd: this.buildPath
      });
      
      const buildTime = Date.now() - startTime;
      
      // Find built artifacts
      const artifacts = await this.findArtifacts();
      
      return {
        success: true,
        output: stdout,
        buildTime,
        artifacts,
        errors: stderr
      };
    } catch (error: any) {
      return {
        success: false,
        output: error.stdout || '',
        errors: error.stderr || error.message,
        buildTime: Date.now() - startTime
      };
    }
  }

  /**
   * Clean build directory
   */
  async clean(): Promise<void> {
    if(fs.existsSync(this.buildPath)) {
      await fs.promises.rm(this.buildPath, { recursive: true, force: true });
    }
  }

  /**
   * Run tests
   */
  async runTests(filter?: string): Promise<TestResult> {
    const ctestArgs = ['ctest', '--output-on-failure'];
    
    if(filter) {
      ctestArgs.push('-R', filter);
    }
    
    try {
      const { stdout } = await execAsync(ctestArgs.join(' '), {
        cwd: this.buildPath
      });
      
      // Parse CTest output
      const result = this.parseCTestOutput(stdout);
      
      // Get coverage if enabled
      if (this.cmakeCache.get('ENABLE_COVERAGE') === 'ON') {
        result.coverage = await this.generateCoverageReport();
      }
      
      return result;
    } catch (error: any) {
      const output = error.stdout || error.message;
      return this.parseCTestOutput(output);
    }
  }

  /**
   * Parse CTest output
   */
  private parseCTestOutput(output: string): TestResult {
    const lines = output.split('\n');
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    
    for (const line of lines) {
      if (line.includes('tests passed')) {
        const match = line.match(/(\d+) tests? passed/);
        if (match) passed = parseInt(match[1]);
      }
      if (line.includes('tests failed')) {
        const match = line.match(/(\d+) tests? failed/);
        if (match) failed = parseInt(match[1]);
      }
      if (line.includes('tests skipped')) {
        const match = line.match(/(\d+) tests? skipped/);
        if (match) skipped = parseInt(match[1]);
      }
    }
    
    return {
      success: failed === 0,
      passed,
      failed,
      skipped,
      output
    };
  }

  /**
   * Generate coverage report
   */
  async generateCoverageReport(): Promise<CoverageReport> {
    try {
      // Generate coverage info
      await execAsync('lcov --capture --directory . --output-file coverage.info', {
        cwd: this.buildPath
      });
      
      // Parse coverage info
      const coverageInfo = await fs.promises.readFile(
        path.join(this.buildPath, 'coverage.info'),
        'utf8'
      );
      
      return this.parseLcovInfo(coverageInfo);
    } catch {
      return {
        linesCovered: 0,
        linesTotal: 0,
        percentage: 0,
        files: new Map()
      };
    }
  }

  /**
   * Parse LCOV coverage info
   */
  private parseLcovInfo(info: string): CoverageReport {
    const files = new Map<string, FileCoverage>();
    let totalCovered = 0;
    let totalLines = 0;
    
    const sections = info.split('SF:');
    
    for (const section of sections.slice(1)) {
      const lines = section.split('\n');
      const filePath = lines[0];
      
      let covered = 0;
      let total = 0;
      
      for (const line of lines) {
        if (line.startsWith('DA:')) {
          total++;
          const parts = line.substring(3).split(',');
          if (parseInt(parts[1]) > 0) {
            covered++;
          }
        }
      }
      
      if (total > 0) {
        files.set(filePath, {
          path: filePath,
          linesCovered: covered,
          linesTotal: total,
          percentage: (covered / total) * 100
        });
        
        totalCovered += covered;
        totalLines += total;
      }
    }
    
    return {
      linesCovered: totalCovered,
      linesTotal: totalLines,
      percentage: totalLines > 0 ? (totalCovered / totalLines) * 100 : 0,
      files
    };
  }

  /**
   * Run static analysis
   */
  async runStaticAnalysis(): Promise<{ success: boolean; issues: any[] }> {
    const issues: any[] = [];
    
    // Run clang-tidy if available
    try {
      const { stdout } = await execAsync(
        'clang-tidy -p . ../src/**/*.cpp ../include/**/*.hpp',
        { cwd: this.buildPath }
      );
      
      // Parse clang-tidy output
      const lines = stdout.split('\n');
      for (const line of lines) {
        if (line.includes('warning:') || line.includes('error:')) {
          issues.push({
            tool: 'clang-tidy',
            severity: line.includes('error:') ? 'error' : 'warning',
            message: line
          });
        }
      }
    } catch (error) {
      // clang-tidy not available
    }
    
    // Run cppcheck if available
    try {
      const { stdout } = await execAsync(
        'cppcheck --enable=all --xml ../src ../include 2>&1',
        { cwd: this.buildPath }
      );
      
      // Parse cppcheck XML output
      // ... parsing logic ...
    } catch (error) {
      // cppcheck not available
    }
    
    return {
      success: issues.filter(i => i.severity === 'error').length === 0,
      issues
    };
  }

  /**
   * Format code
   */
  formatCode(): Promise<void> {
    try {
      // Format with clang-format
      await execAsync('clang-format -i ../src/**/*.cpp ../include/**/*.hpp', {
        cwd: this.buildPath
      });
    } catch {
      // clang-format not available
    }
  }

  /**
   * Install project
   */
  async install(prefix?: string): Promise<BuildResult> {
    const args = ['cmake', '--install', '.'];
    
    if(prefix) {
      args.push('--prefix', prefix);
    }
    
    try {
      const { stdout, stderr } = await execAsync(args.join(' '), {
        cwd: this.buildPath
      });
      
      return {
        success: true,
        output: stdout,
        errors: stderr
      };
    } catch (error: any) {
      return {
        success: false,
        output: error.stdout || '',
        errors: error.stderr || error.message
      };
    }
  }

  /**
   * Package project
   */
  async package(generator?: string): Promise<BuildResult> {
    const args = ['cpack'];
    
    if(generator) {
      args.push('-G', generator);
    }
    
    try {
      const { stdout, stderr } = await execAsync(args.join(' '), {
        cwd: this.buildPath
      });
      
      // Find generated packages
      const packages = await this.findPackages();
      
      return {
        success: true,
        output: stdout,
        errors: stderr,
        artifacts: packages
      };
    } catch (error: any) {
      return {
        success: false,
        output: error.stdout || '',
        errors: error.stderr || error.message
      };
    }
  }

  /**
   * Load CMake cache
   */
  private async loadCMakeCache(): Promise<void> {
    const cachePath = path.join(this.buildPath, 'CMakeCache.txt');
    
    if(!fs.existsSync(cachePath)) {
      return;
    }
    
    const content = await fs.promises.readFile(cachePath, 'utf8');
    const lines = content.split('\n');
    
    this.cmakeCache.clear();
    
    for (const line of lines) {
      if (!line.startsWith('//') && line.includes('=')) {
        const [key, value] = line.split('=', 2);
        const keyParts = key.split(':');
        this.cmakeCache.set(keyParts[0], value);
      }
    }
  }

  /**
   * Find built artifacts
   */
  private async findArtifacts(): Promise<string[]> {
    const artifacts: string[] = [];
    const binDir = path.join(this.buildPath, 'bin');
    const libDir = path.join(this.buildPath, 'lib');
    
    if(fs.existsSync(binDir)) {
      const files = await fs.promises.readdir(binDir);
      artifacts.push(...files.map(f => path.join(binDir, f)));
    }
    
    if(fs.existsSync(libDir)) {
      const files = await fs.promises.readdir(libDir);
      artifacts.push(...files.map(f => path.join(libDir, f)));
    }
    
    return artifacts;
  }

  /**
   * Find generated packages
   */
  private async findPackages(): Promise<string[]> {
    const packages: string[] = [];
    const files = await fs.promises.readdir(this.buildPath);
    
    for (const file of files) {
      if (file.endsWith('.tar.gz') || 
          file.endsWith('.deb') || 
          file.endsWith('.rpm') ||
          file.endsWith('.zip')) {
        packages.push(path.join(this.buildPath, file));
      }
    }
    
    return packages;
  }

  /**
   * Watch for file changes and rebuild
   */
  watchAndBuild(callback?: (result: BuildResult) => void): fs.FSWatcher {
    const srcDir = path.join(this.projectPath, 'src');
    const includeDir = path.join(this.projectPath, 'include');
    
    const watcher = fs.watch(srcDir, { recursive: true }, async (eventType, filename) => {
      if (filename && (filename.endsWith('.cpp') || filename.endsWith('.hpp'))) {
        console.log(`File changed: ${filename}, rebuilding...`);
        const result = await this.build();
        if (callback) {
          callback(result);
        }
      }
    });
    
    // Also watch include directory if it exists
    if(fs.existsSync(includeDir)) {
      fs.watch(includeDir, { recursive: true }, async (eventType, filename) => {
        if (filename && filename.endsWith('.hpp')) {
          console.log(`Header changed: ${filename}, rebuilding...`);
          const result = await this.build();
          if (callback) {
            callback(result);
          }
        }
      });
    }
    
    return watcher;
  }
}