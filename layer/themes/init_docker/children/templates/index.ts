/**
 * Template Manager
 * Manages Dockerfile and CMake templates
 */

export interface TemplateVariables {
  projectName: string;
  compiler: string;
  cxxStandard: string;
  buildType: string;
  dependencies?: string[];
  additionalPackages?: string[];
  cmakeVersion?: string;
  workdir?: string;
  user?: string;
}

export interface DockerfileTemplate {
  name: string;
  content: string;
  variables: TemplateVariables;
}

export interface CMakeTemplate {
  name: string;
  content: string;
  minVersion: string;
}

export interface ComposeTemplate {
  name: string;
  services: Record<string, any>;
  networks?: Record<string, any>;
  volumes?: Record<string, any>;
}

export class TemplateManager {
  private dockerTemplates: Map<string, string>;
  private cmakeTemplates: Map<string, string>;
  private composeTemplates: Map<string, any>;

  constructor() {
    this.dockerTemplates = new Map();
    this.cmakeTemplates = new Map();
    this.composeTemplates = new Map();
    this.loadDefaultTemplates();
  }

  private loadDefaultTemplates(): void {
    // Load default Dockerfile templates
    this.dockerTemplates.set('gcc', this.getGCCDockerfile());
    this.dockerTemplates.set('clang', this.getClangDockerfile());
    this.dockerTemplates.set('multi-stage', this.getMultiStageDockerfile());
    
    // Load default CMake templates
    this.cmakeTemplates.set('basic', this.getBasicCMake());
    this.cmakeTemplates.set('advanced', this.getAdvancedCMake());
    
    // Load default Compose templates
    this.composeTemplates.set('development', this.getDevelopmentCompose());
    this.composeTemplates.set('production', this.getProductionCompose());
  }

  generateDockerfile(variables: TemplateVariables): string {
    const template = this.dockerTemplates.get(variables.compiler) || 
                    this.dockerTemplates.get('gcc')!;
    
    return this.processTemplate(template, variables);
  }

  generateCMakeLists(projectName: string, options?: {
    minVersion?: string;
    language?: string;
    standard?: string;
    packages?: string[];
  }): string {
    const template = this.cmakeTemplates.get('basic')!;
    
    const variables = {
      projectName,
      cmakeVersion: options?.minVersion || '3.16',
      language: options?.language || 'CXX',
      standard: options?.standard || '17',
      packages: options?.packages || [],
    };
    
    return this.processTemplate(template, variables);
  }

  generateComposeFile(environment: string, services: any[]): any {
    const baseTemplate = this.composeTemplates.get(
      environment === 'production' ? 'production' : 'development'
    );
    
    return {
      ...baseTemplate,
      services: this.mergeServices(baseTemplate.services, services),
    };
  }

  private processTemplate(template: string, variables: any): string {
    let result = template;
    
    // Replace variables in format ${VAR_NAME}
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      result = result.replace(regex, String(value));
    }
    
    // Process conditionals in format {{#if VAR}}...{{/if}}
    result = this.processConditionals(result, variables);
    
    // Process loops in format {{#each ARRAY}}...{{/each}}
    result = this.processLoops(result, variables);
    
    return result;
  }

  private processConditionals(template: string, variables: any): string {
    const regex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
    
    return template.replace(regex, (match, varName, content) => {
      return variables[varName] ? content : '';
    });
  }

  private processLoops(template: string, variables: any): string {
    const regex = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
    
    return template.replace(regex, (match, varName, content) => {
      const array = variables[varName];
      if (!Array.isArray(array)) return '';
      
      return array.map(item => {
        let itemContent = content;
        if (typeof item === 'object') {
          for (const [key, value] of Object.entries(item)) {
            itemContent = itemContent.replace(
              new RegExp(`\\$\\{${key}\\}`, 'g'),
              String(value)
            );
          }
        } else {
          itemContent = itemContent.replace(/\$\{item\}/g, String(item));
        }
        return itemContent;
      }).join('');
    });
  }

  private mergeServices(base: any, additional: any[]): any {
    const result = { ...base };
    
    for (const service of additional) {
      const name = service.name || `service_${Date.now()}`;
      result[name] = service;
    }
    
    return result;
  }

  private getGCCDockerfile(): string {
    return `# Multi-stage build for C++ with GCC
FROM gcc:\${compiler_version:-latest} AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \\
    cmake \\
    ninja-build \\
    {{#if dependencies}}
    {{#each dependencies}}
    \${item} \\
    {{/each}}
    {{/if}}
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR \${workdir:-/workspace}

# Copy source code
COPY . .

# Configure CMake
RUN cmake -B build \\
    -G Ninja \\
    -DCMAKE_BUILD_TYPE=\${buildType} \\
    -DCMAKE_CXX_STANDARD=\${cxxStandard} \\
    {{#if cmakeArgs}}
    {{#each cmakeArgs}}
    \${item} \\
    {{/each}}
    {{/if}}
    .

# Build the project
RUN cmake --build build --parallel

# Run tests
RUN cd build && ctest --output-on-failure || true

# Production stage
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \\
    libstdc++6 \\
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built artifacts
COPY --from=builder /workspace/build/bin/* /app/

{{#if user}}
USER \${user}
{{/if}}

ENTRYPOINT ["/app/\${projectName}"]
`;
  }

  private getClangDockerfile(): string {
    return `# Multi-stage build for C++ with Clang
FROM silkeh/clang:\${compiler_version:-latest} AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \\
    cmake \\
    ninja-build \\
    clang-tools \\
    {{#if dependencies}}
    {{#each dependencies}}
    \${item} \\
    {{/each}}
    {{/if}}
    && rm -rf /var/lib/apt/lists/*

# Set compiler
ENV CC=clang
ENV CXX=clang++

WORKDIR \${workdir:-/workspace}

COPY . .

# Configure with Clang
RUN cmake -B build \\
    -G Ninja \\
    -DCMAKE_BUILD_TYPE=\${buildType} \\
    -DCMAKE_CXX_STANDARD=\${cxxStandard} \\
    -DCMAKE_C_COMPILER=clang \\
    -DCMAKE_CXX_COMPILER=clang++ \\
    .

# Build with Clang
RUN cmake --build build --parallel

# Analyze with clang-tidy
RUN run-clang-tidy -p build || true

# Production stage
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \\
    libc++1 \\
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /workspace/build/bin/* /app/

{{#if user}}
USER \${user}
{{/if}}

ENTRYPOINT ["/app/\${projectName}"]
`;
  }

  private getMultiStageDockerfile(): string {
    return `# Advanced multi-stage build with caching
# Stage 1: Dependencies
FROM \${base_image:-gcc:latest} AS deps

RUN apt-get update && apt-get install -y \\
    cmake ninja-build \\
    && rm -rf /var/lib/apt/lists/*

WORKDIR /deps

# Copy dependency files first for better caching
COPY CMakeLists.txt .
{{#if has_conan}}
COPY conanfile.txt .
RUN pip install conan && \\
    conan install . --build=missing
{{/if}}

# Stage 2: Build
FROM deps AS builder

WORKDIR /workspace

# Copy source code
COPY . .

{{#if has_conan}}
# Copy Conan dependencies
COPY --from=deps /deps/conan_paths.cmake .
{{/if}}

# Configure
RUN cmake -B build \\
    -G Ninja \\
    -DCMAKE_BUILD_TYPE=\${buildType} \\
    -DCMAKE_CXX_STANDARD=\${cxxStandard} \\
    {{#if has_conan}}
    -DCMAKE_TOOLCHAIN_FILE=conan_paths.cmake \\
    {{/if}}
    .

# Build
RUN cmake --build build --parallel

# Stage 3: Test
FROM builder AS tester

RUN cd build && ctest --output-on-failure

# Stage 4: Package
FROM builder AS packager

RUN cd build && cpack

# Stage 5: Runtime
FROM ubuntu:22.04 AS runtime

RUN apt-get update && apt-get install -y \\
    libstdc++6 \\
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy artifacts
COPY --from=packager /workspace/build/bin/* /app/
COPY --from=packager /workspace/build/*.deb /packages/ 2>/dev/null || true

{{#if user}}
RUN useradd -m -s /bin/bash \${user}
USER \${user}
{{/if}}

ENTRYPOINT ["/app/\${projectName}"]
`;
  }

  private getBasicCMake(): string {
    return `cmake_minimum_required(VERSION \${cmakeVersion})
project(\${projectName} LANGUAGES \${language})

# Set C++ standard
set(CMAKE_CXX_STANDARD \${standard})
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Set default build type
if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release)
endif()

# Compiler flags
set(CMAKE_CXX_FLAGS_DEBUG "-g -O0 -Wall -Wextra")
set(CMAKE_CXX_FLAGS_RELEASE "-O3 -DNDEBUG")

# Find packages
{{#each packages}}
find_package(\${name} REQUIRED)
{{/each}}

# Add subdirectories
add_subdirectory(src)
{{#if has_tests}}
add_subdirectory(tests)
enable_testing()
{{/if}}

# Installation
install(TARGETS \${projectName}
    RUNTIME DESTINATION bin
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib)
`;
  }

  private getAdvancedCMake(): string {
    return `cmake_minimum_required(VERSION \${cmakeVersion})
project(\${projectName} 
    VERSION \${version}
    DESCRIPTION "\${description}"
    LANGUAGES CXX)

# Options
option(BUILD_SHARED_LIBS "Build shared libraries" OFF)
option(BUILD_TESTS "Build tests" ON)
option(BUILD_DOCS "Build documentation" OFF)
option(ENABLE_COVERAGE "Enable coverage reporting" OFF)
option(ENABLE_SANITIZERS "Enable sanitizers" OFF)

# Set C++ standard
set(CMAKE_CXX_STANDARD \${standard})
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Export compile commands
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Set default build type
if(NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)
    set(CMAKE_BUILD_TYPE Release CACHE STRING "Build type" FORCE)
    set_property(CACHE CMAKE_BUILD_TYPE PROPERTY STRINGS
        "Debug" "Release" "MinSizeRel" "RelWithDebInfo")
endif()

# Compiler warnings
add_compile_options(
    $<$<CXX_COMPILER_ID:GNU,Clang>:-Wall -Wextra -Wpedantic>
    $<$<CXX_COMPILER_ID:MSVC>:/W4>
)

# Sanitizers
if(ENABLE_SANITIZERS)
    add_compile_options(-fsanitize=address,undefined)
    add_link_options(-fsanitize=address,undefined)
endif()

# Coverage
if(ENABLE_COVERAGE)
    add_compile_options(--coverage)
    add_link_options(--coverage)
endif()

# Dependencies
{{#each packages}}
find_package(\${name} \${version} REQUIRED)
{{/each}}

# Include directories
include_directories(
    $<BUILD_INTERFACE:$\\{CMAKE_CURRENT_SOURCE_DIR}/include>
    $<INSTALL_INTERFACE:include>
)

# Add library
add_library(\${projectName} 
    {{#each sources}}
    \${path}
    {{/each}}
)

# Link libraries
target_link_libraries(\${projectName}
    {{#each libraries}}
    \${name}
    {{/each}}
)

# Tests
if(BUILD_TESTS)
    enable_testing()
    add_subdirectory(tests)
endif()

# Documentation
if(BUILD_DOCS)
    find_package(Doxygen)
    if(DOXYGEN_FOUND)
        add_subdirectory(docs)
    endif()
endif()

# Installation
include(GNUInstallDirs)

install(TARGETS \${projectName}
    EXPORT \${projectName}Targets
    LIBRARY DESTINATION $\\{CMAKE_INSTALL_LIBDIR}
    ARCHIVE DESTINATION $\\{CMAKE_INSTALL_LIBDIR}
    RUNTIME DESTINATION $\\{CMAKE_INSTALL_BINDIR}
    INCLUDES DESTINATION $\\{CMAKE_INSTALL_INCLUDEDIR}
)

# Export targets
install(EXPORT \${projectName}Targets
    FILE \${projectName}Targets.cmake
    NAMESPACE \${projectName}::
    DESTINATION $\\{CMAKE_INSTALL_LIBDIR}/cmake/\${projectName}
)

# CPack
include(CPack)
`;
  }

  private getDevelopmentCompose(): any {
    return {
      version: '3.8',
      services: {
        app: {
          build: {
            context: '.',
            target: 'builder',
          },
          volumes: [
            '.:/workspace',
            'build-cache:/workspace/build',
            'cmake-cache:/cache',
          ],
          environment: {
            CMAKE_BUILD_TYPE: 'Debug',
          },
          ports: [
            '3000:3000',
            '9229:9229', // Node.js debug
            '2345:2345', // GDB debug
          ],
          command: 'tail -f /dev/null',
        },
      },
      volumes: {
        'build-cache': {},
        'cmake-cache': {},
      },
      networks: {
        default: {
          name: 'dev-network',
        },
      },
    };
  }

  private getProductionCompose(): any {
    return {
      version: '3.8',
      services: {
        app: {
          image: '${IMAGE_NAME}:${IMAGE_TAG}',
          deploy: {
            replicas: 2,
            resources: {
              limits: {
                cpus: '2',
                memory: '2G',
              },
              reservations: {
                cpus: '0.5',
                memory: '512M',
              },
            },
            restart_policy: {
              condition: 'on-failure',
              delay: '5s',
              max_attempts: 3,
            },
          },
          healthcheck: {
            test: ['CMD', 'curl', '-f', 'http://localhost/health'],
            interval: '30s',
            timeout: '10s',
            retries: 3,
            start_period: '40s',
          },
          networks: [
            'production',
          ],
        },
      },
      networks: {
        production: {
          driver: 'overlay',
          encrypted: true,
        },
      },
    };
  }

  addDockerTemplate(name: string, template: string): void {
    this.dockerTemplates.set(name, template);
  }

  addCMakeTemplate(name: string, template: string): void {
    this.cmakeTemplates.set(name, template);
  }

  addComposeTemplate(name: string, template: any): void {
    this.composeTemplates.set(name, template);
  }

  getDockerTemplate(name: string): string | undefined {
    return this.dockerTemplates.get(name);
  }

  getCMakeTemplate(name: string): string | undefined {
    return this.cmakeTemplates.get(name);
  }

  getComposeTemplate(name: string): any | undefined {
    return this.composeTemplates.get(name);
  }
}

export default TemplateManager;