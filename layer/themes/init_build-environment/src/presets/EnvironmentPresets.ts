import { BuildEnvironment, Architecture, CompilerConfig, CPUConfig, TargetConfig, DependencyConfig } from '../core/BuildEnvironmentManager';

export class EnvironmentPresets {
  static readonly PRESETS = {
    // PotonMock environment - Heavy CPU and cross-compilation setup
    'poton-mock': (): BuildEnvironment => ({
      name: 'poton-mock',
      type: 'container',
      architecture: {
        arch: 'x86_64',
        bits: 64,
        endianness: 'little',
        abi: 'gnu'
      },
      compiler: {
        type: 'gcc',
        version: '12.2.0',
        cCompiler: 'gcc-12',
        cppCompiler: 'g++-12',
        linker: 'ld',
        archiver: 'ar',
        flags: {
          common: ['-Wall', '-Wextra', '-pthread', '-march=native'],
          debug: ['-g', '-O0', '-DDEBUG', '-fsanitize=address,undefined'],
          release: ['-O3', '-DNDEBUG', '-flto', '-fomit-frame-pointer'],
          optimization: ['-O3', '-march=native', '-mtune=native', '-funroll-loops'],
          warnings: ['-Wall', '-Wextra', '-Wpedantic', '-Werror'],
          includes: ['/usr/local/include', '/opt/poton/include'],
          defines: ['POTON_MOCK_BUILD', '_GNU_SOURCE'],
          linkFlags: ['-pthread', '-latomic', '-ldl']
        }
      },
      cpu: {
        cores: 16,
        threadsPerCore: 2,
        model: 'Intel(R) Xeon(R) Platinum 8275CL',
        features: ['avx2', 'avx512', 'sse4.2', 'popcnt'],
        cache: {
          l1: 32,
          l2: 1024,
          l3: 36608
        },
        frequency: 3000
      },
      target: {
        os: 'linux',
        variant: 'ubuntu-22.04',
        runtime: 'glibc',
        minVersion: '2.35'
      },
      dependencies: [
        {
          name: 'boost',
          version: '1.80.0',
          type: 'source',
          location: 'https://boostorg.jfrog.io/artifactory/main/release/1.80.0/source/boost_1_80_0.tar.gz',
          buildCommand: './bootstrap.sh && ./b2 install',
          configureFlags: ['--with-thread', '--with-system', '--with-filesystem']
        },
        {
          name: 'opencv',
          version: '4.7.0',
          type: 'source',
          location: 'https://github.com/opencv/opencv.git',
          buildCommand: 'cmake -B build && cmake --build build --parallel',
          environment: {
            'OPENCV_EXTRA_MODULES_PATH': '/opt/opencv_contrib/modules'
          }
        },
        {
          name: 'eigen3',
          version: '3.4.0',
          type: 'header-only',
          location: 'https://gitlab.com/libeigen/eigen.git'
        },
        {
          name: 'protobuf',
          version: '3.21.0',
          type: 'source',
          location: 'https://github.com/protocolbuffers/protobuf.git',
          buildCommand: 'cmake -B build -DCMAKE_BUILD_TYPE=Release && cmake --build build'
        }
      ],
      environment: {
        'CC': 'gcc-12',
        'CXX': 'g++-12',
        'MAKEFLAGS': '-j32',
        'CXXFLAGS': '-std=c++20',
        'LD_LIBRARY_PATH': '/usr/local/lib:/opt/poton/lib',
        'PKG_CONFIG_PATH': '/usr/local/lib/pkgconfig:/opt/poton/lib/pkgconfig'
      },
      volumes: [
        {
          source: '~/dev/pub/PotonMock',
          target: '/workspace',
          readOnly: false
        },
        {
          source: '~/.cache/build',
          target: '/cache',
          readOnly: false
        }
      ],
      network: {
        type: 'bridge',
        ports: [
          { host: 8080, container: 8080 },
          { host: 9090, container: 9090 }
        ]
      }
    }),

    // Embedded ARM development
    'embedded-arm': (): BuildEnvironment => ({
      name: 'embedded-arm',
      type: 'qemu',
      architecture: {
        arch: 'arm',
        bits: 32,
        endianness: 'little',
        abi: 'eabi'
      },
      compiler: {
        type: 'cross',
        version: '11.3.0',
        cCompiler: 'arm-none-eabi-gcc',
        cppCompiler: 'arm-none-eabi-g++',
        linker: 'arm-none-eabi-ld',
        archiver: 'arm-none-eabi-ar',
        flags: {
          common: ['-mcpu=cortex-m4', '-mthumb', '-mfloat-abi=hard', '-mfpu=fpv4-sp-d16'],
          debug: ['-g', '-O0', '-DDEBUG'],
          release: ['-Os', '-DNDEBUG'],
          optimization: ['-Os', '-ffunction-sections', '-fdata-sections'],
          warnings: ['-Wall', '-Wextra'],
          includes: [],
          defines: ['STM32F4', 'USE_HAL_DRIVER'],
          linkFlags: ['-Wl,--gc-sections', '-specs=nano.specs', '-specs=nosys.specs']
        },
        crossCompile: {
          prefix: 'arm-none-eabi-',
          sysroot: '/usr/arm-none-eabi',
          targetTriple: 'arm-none-eabi',
          hostTriple: 'x86_64-linux-gnu'
        }
      },
      cpu: {
        cores: 1,
        threadsPerCore: 1,
        model: 'cortex-m4',
        features: ['thumb2', 'dsp', 'fpu'],
        frequency: 168
      },
      target: {
        os: 'bare-metal',
        runtime: 'none'
      },
      dependencies: [
        {
          name: 'cmsis',
          version: '5.9.0',
          type: 'header-only',
          location: 'https://github.com/ARM-software/CMSIS_5.git'
        },
        {
          name: 'freertos',
          version: '10.5.1',
          type: 'source',
          location: 'https://github.com/FreeRTOS/FreeRTOS-Kernel.git'
        }
      ],
      environment: {
        'CROSS_COMPILE': 'arm-none-eabi-',
        'ARCH': 'arm'
      }
    }),

    // High-performance computing with Intel compilers
    'hpc-intel': (): BuildEnvironment => ({
      name: 'hpc-intel',
      type: 'local',
      architecture: {
        arch: 'x86_64',
        bits: 64,
        endianness: 'little',
        abi: 'gnu'
      },
      compiler: {
        type: 'icc',
        version: '2023.0',
        cCompiler: 'icc',
        cppCompiler: 'icpc',
        linker: 'xild',
        archiver: 'xiar',
        flags: {
          common: ['-qopenmp', '-xHost', '-ipo'],
          debug: ['-g', '-O0', '-DDEBUG', '-traceback'],
          release: ['-O3', '-DNDEBUG', '-no-prec-div', '-fp-model fast=2'],
          optimization: ['-O3', '-xCORE-AVX512', '-qopt-zmm-usage=high'],
          warnings: ['-Wall', '-Wcheck'],
          includes: ['/opt/intel/mkl/include'],
          defines: ['USE_MKL', 'INTEL_COMPILER'],
          linkFlags: ['-qopenmp', '-lmkl_intel_lp64', '-lmkl_sequential', '-lmkl_core']
        }
      },
      cpu: {
        cores: 32,
        threadsPerCore: 2,
        model: 'Intel(R) Xeon(R) Gold 6338',
        features: ['avx512', 'avx512_vnni', 'avx512_bf16'],
        cache: {
          l1: 32,
          l2: 1280,
          l3: 49152
        },
        frequency: 2000
      },
      target: {
        os: 'linux',
        variant: 'centos-8',
        runtime: 'glibc'
      },
      dependencies: [
        {
          name: 'intel-mkl',
          version: '2023.0',
          type: 'binary',
          location: '/opt/intel/mkl'
        },
        {
          name: 'openmpi',
          version: '4.1.5',
          type: 'system'
        }
      ],
      environment: {
        'I_MPI_CC': 'icc',
        'I_MPI_CXX': 'icpc',
        'MKL_NUM_THREADS': '64',
        'OMP_NUM_THREADS': '64'
      }
    }),

    // Android development
    'android-ndk': (): BuildEnvironment => ({
      name: 'android-ndk',
      type: 'container',
      architecture: {
        arch: 'aarch64',
        bits: 64,
        endianness: 'little',
        abi: 'android'
      },
      compiler: {
        type: 'clang',
        version: '14.0.0',
        cCompiler: 'aarch64-linux-android31-clang',
        cppCompiler: 'aarch64-linux-android31-clang++',
        linker: 'lld',
        archiver: 'llvm-ar',
        flags: {
          common: ['-fPIC', '-DANDROID'],
          debug: ['-g', '-O0', '-DDEBUG'],
          release: ['-O2', '-DNDEBUG', '-fvisibility=hidden'],
          optimization: ['-O2', '-flto'],
          warnings: ['-Wall', '-Wextra'],
          includes: [],
          defines: ['ANDROID_PLATFORM=31'],
          linkFlags: ['-shared', '-Wl,--build-id=sha1']
        },
        crossCompile: {
          prefix: 'aarch64-linux-android-',
          sysroot: '/opt/android-ndk/toolchains/llvm/prebuilt/linux-x86_64/sysroot',
          targetTriple: 'aarch64-linux-android31',
          hostTriple: 'x86_64-linux-gnu'
        }
      },
      cpu: {
        cores: 8,
        threadsPerCore: 1,
        model: 'Snapdragon 888',
        features: ['neon', 'crypto', 'fp16']
      },
      target: {
        os: 'android',
        minVersion: '31',
        runtime: 'bionic'
      },
      dependencies: [
        {
          name: 'android-ndk',
          version: 'r25c',
          type: 'binary',
          location: 'https://dl.google.com/android/repository/android-ndk-r25c-linux.zip'
        }
      ],
      environment: {
        'ANDROID_NDK_ROOT': '/opt/android-ndk',
        'ANDROID_API': '31',
        'ANDROID_ABI': 'arm64-v8a'
      }
    }),

    // WebAssembly with Emscripten
    'wasm-emscripten': (): BuildEnvironment => ({
      name: 'wasm-emscripten',
      type: 'container',
      architecture: {
        arch: 'x86_64',
        bits: 32,
        endianness: 'little',
        abi: 'wasm32'
      },
      compiler: {
        type: 'clang',
        version: '3.1.47',
        cCompiler: 'emcc',
        cppCompiler: 'em++',
        linker: 'emcc',
        archiver: 'emar',
        flags: {
          common: ['-s', 'WASM=1', '-s', 'MODULARIZE=1'],
          debug: ['-g', '-O0', '-DDEBUG', '-s', 'ASSERTIONS=2'],
          release: ['-O3', '-DNDEBUG'],
          optimization: ['-O3', '-flto', '--closure', '1'],
          warnings: ['-Wall'],
          includes: [],
          defines: ['__EMSCRIPTEN__'],
          linkFlags: ['-s', 'ALLOW_MEMORY_GROWTH=1', '-s', 'EXPORTED_RUNTIME_METHODS=ccall,cwrap']
        }
      },
      cpu: {
        cores: 4,
        threadsPerCore: 1,
        model: 'wasm32'
      },
      target: {
        os: 'linux',
        variant: 'wasm',
        runtime: 'none'
      },
      dependencies: [
        {
          name: 'emscripten',
          version: '3.1.47',
          type: 'binary',
          location: 'https://github.com/emscripten-core/emsdk.git',
          buildCommand: './emsdk install latest && ./emsdk activate latest'
        }
      ],
      environment: {
        'EMSDK': '/opt/emsdk',
        'EM_CONFIG': '/opt/emsdk/.emscripten'
      }
    }),

    // RISC-V development
    'riscv64-linux': (): BuildEnvironment => ({
      name: 'riscv64-linux',
      type: 'qemu',
      architecture: {
        arch: 'riscv64',
        bits: 64,
        endianness: 'little',
        abi: 'lp64d'
      },
      compiler: {
        type: 'cross',
        version: '12.2.0',
        cCompiler: 'riscv64-linux-gnu-gcc',
        cppCompiler: 'riscv64-linux-gnu-g++',
        linker: 'riscv64-linux-gnu-ld',
        archiver: 'riscv64-linux-gnu-ar',
        flags: {
          common: ['-march=rv64gc', '-mabi=lp64d'],
          debug: ['-g', '-O0', '-DDEBUG'],
          release: ['-O2', '-DNDEBUG'],
          optimization: ['-O2', '-funroll-loops'],
          warnings: ['-Wall', '-Wextra'],
          includes: [],
          defines: ['__riscv', '__riscv_xlen=64'],
          linkFlags: []
        },
        crossCompile: {
          prefix: 'riscv64-linux-gnu-',
          sysroot: '/usr/riscv64-linux-gnu',
          targetTriple: 'riscv64-linux-gnu',
          hostTriple: 'x86_64-linux-gnu'
        }
      },
      cpu: {
        cores: 4,
        threadsPerCore: 1,
        model: 'rv64gc',
        features: ['i', 'm', 'a', 'f', 'd', 'c']
      },
      target: {
        os: 'linux',
        variant: 'debian',
        runtime: 'glibc'
      },
      dependencies: [],
      environment: {
        'ARCH': 'riscv',
        'CROSS_COMPILE': 'riscv64-linux-gnu-'
      }
    }),

    // Windows MinGW cross-compilation
    'windows-mingw': (): BuildEnvironment => ({
      name: 'windows-mingw',
      type: 'container',
      architecture: {
        arch: 'x86_64',
        bits: 64,
        endianness: 'little',
        abi: 'mingw'
      },
      compiler: {
        type: 'cross',
        version: '12.2.0',
        cCompiler: 'x86_64-w64-mingw32-gcc',
        cppCompiler: 'x86_64-w64-mingw32-g++',
        linker: 'x86_64-w64-mingw32-ld',
        archiver: 'x86_64-w64-mingw32-ar',
        flags: {
          common: ['-static-libgcc', '-static-libstdc++'],
          debug: ['-g', '-O0', '-DDEBUG'],
          release: ['-O2', '-DNDEBUG', '-mwindows'],
          optimization: ['-O2', '-fomit-frame-pointer'],
          warnings: ['-Wall', '-Wextra'],
          includes: [],
          defines: ['_WIN32', 'WINVER=0x0A00'],
          linkFlags: ['-static', '-lws2_32', '-lwinmm']
        },
        crossCompile: {
          prefix: 'x86_64-w64-mingw32-',
          sysroot: '/usr/x86_64-w64-mingw32',
          targetTriple: 'x86_64-w64-mingw32',
          hostTriple: 'x86_64-linux-gnu'
        }
      },
      cpu: {
        cores: 8,
        threadsPerCore: 2,
        model: 'x86_64'
      },
      target: {
        os: 'windows',
        minVersion: '10',
        runtime: 'msvcrt'
      },
      dependencies: [
        {
          name: 'mingw-w64',
          version: '10.0.0',
          type: 'system'
        }
      ],
      environment: {
        'WINDRES': 'x86_64-w64-mingw32-windres',
        'RC': 'x86_64-w64-mingw32-windres'
      }
    }),

    // macOS cross-compilation with osxcross
    'macos-cross': (): BuildEnvironment => ({
      name: 'macos-cross',
      type: 'container',
      architecture: {
        arch: 'x86_64',
        bits: 64,
        endianness: 'little',
        abi: 'darwin'
      },
      compiler: {
        type: 'clang',
        version: '14.0.0',
        cCompiler: 'o64-clang',
        cppCompiler: 'o64-clang++',
        linker: 'x86_64-apple-darwin21.4-ld',
        archiver: 'x86_64-apple-darwin21.4-ar',
        flags: {
          common: ['-target', 'x86_64-apple-darwin21.4', '-mmacosx-version-min=10.15'],
          debug: ['-g', '-O0', '-DDEBUG'],
          release: ['-O2', '-DNDEBUG'],
          optimization: ['-O2', '-flto'],
          warnings: ['-Wall', '-Wextra'],
          includes: [],
          defines: ['__APPLE__', 'TARGET_OS_MAC'],
          linkFlags: ['-framework', 'Foundation', '-framework', 'CoreFoundation']
        },
        crossCompile: {
          prefix: 'x86_64-apple-darwin21.4-',
          sysroot: '/opt/osxcross/target/SDK/MacOSX12.3.sdk',
          targetTriple: 'x86_64-apple-darwin21.4',
          hostTriple: 'x86_64-linux-gnu'
        }
      },
      cpu: {
        cores: 8,
        threadsPerCore: 1,
        model: 'x86_64'
      },
      target: {
        os: 'macos',
        minVersion: '10.15',
        sdk: 'MacOSX12.3.sdk'
      },
      dependencies: [
        {
          name: 'osxcross',
          version: 'latest',
          type: 'binary',
          location: 'https://github.com/tpoechtrager/osxcross.git'
        }
      ],
      environment: {
        'OSXCROSS_ROOT': '/opt/osxcross',
        'PATH': '/opt/osxcross/target/bin:$PATH'
      }
    }),

    // Minimal container environment
    'minimal-alpine': (): BuildEnvironment => ({
      name: 'minimal-alpine',
      type: 'container',
      architecture: {
        arch: 'x86_64',
        bits: 64,
        endianness: 'little',
        abi: 'musl'
      },
      compiler: {
        type: 'gcc',
        version: '12.2.1',
        cCompiler: 'gcc',
        cppCompiler: 'g++',
        linker: 'ld',
        archiver: 'ar',
        flags: {
          common: ['-static'],
          debug: ['-g', '-O0'],
          release: ['-Os'],
          optimization: ['-Os', '-ffunction-sections', '-fdata-sections'],
          warnings: ['-Wall'],
          includes: [],
          defines: [],
          linkFlags: ['-static', '-Wl,--gc-sections']
        }
      },
      cpu: {
        cores: 2,
        threadsPerCore: 1
      },
      target: {
        os: 'linux',
        variant: 'alpine',
        runtime: 'musl'
      },
      dependencies: [],
      environment: {
        'CC': 'gcc',
        'CXX': 'g++'
      }
    }),

    // Development environment with all tools
    'dev-full': (): BuildEnvironment => ({
      name: 'dev-full',
      type: 'local',
      architecture: {
        arch: 'x86_64',
        bits: 64,
        endianness: 'little',
        abi: 'gnu'
      },
      compiler: {
        type: 'gcc',
        version: '12.2.0',
        cCompiler: 'gcc',
        cppCompiler: 'g++',
        linker: 'ld',
        archiver: 'ar',
        flags: {
          common: ['-Wall', '-Wextra', '-pthread'],
          debug: ['-g', '-O0', '-DDEBUG', '-fsanitize=address,undefined', '--coverage'],
          release: ['-O2', '-DNDEBUG'],
          optimization: ['-O2', '-march=native'],
          warnings: ['-Wall', '-Wextra', '-Wpedantic'],
          includes: [],
          defines: [],
          linkFlags: ['-pthread']
        }
      },
      cpu: {
        cores: 8,
        threadsPerCore: 2,
        model: 'native'
      },
      target: {
        os: 'linux',
        runtime: 'glibc'
      },
      dependencies: [
        {
          name: 'cmake',
          version: '3.25+',
          type: 'system'
        },
        {
          name: 'ninja-build',
          version: '1.11+',
          type: 'system'
        },
        {
          name: 'ccache',
          version: '4.0+',
          type: 'system'
        },
        {
          name: 'valgrind',
          version: '3.19+',
          type: 'system'
        },
        {
          name: 'gdb',
          version: '12+',
          type: 'system'
        }
      ],
      environment: {
        'CMAKE_BUILD_TYPE': 'Debug',
        'CMAKE_EXPORT_COMPILE_COMMANDS': 'ON',
        'CCACHE_DIR': '~/.ccache'
      }
    })
  };

  static getPreset(name: string): BuildEnvironment | undefined {
    const presetFactory = this.PRESETS[name as keyof typeof this.PRESETS];
    return presetFactory ? presetFactory() : undefined;
  }

  static listPresets(): string[] {
    return Object.keys(this.PRESETS);
  }

  static getPresetDescription(name: string): string {
    const descriptions: Record<string, string> = {
      'poton-mock': 'Heavy CPU and compiler setup for PotonMock development',
      'embedded-arm': 'ARM Cortex-M embedded development with cross-compilation',
      'hpc-intel': 'High-performance computing with Intel compilers and MKL',
      'android-ndk': 'Android native development with NDK',
      'wasm-emscripten': 'WebAssembly development with Emscripten',
      'riscv64-linux': 'RISC-V 64-bit Linux cross-compilation',
      'windows-mingw': 'Windows cross-compilation with MinGW-w64',
      'macos-cross': 'macOS cross-compilation with osxcross',
      'minimal-alpine': 'Minimal Alpine Linux container with musl',
      'dev-full': 'Full development environment with all tools'
    };

    return descriptions[name] || 'Unknown preset';
  }

  static createCustomPreset(
    base: string,
    customizations: Partial<BuildEnvironment>
  ): BuildEnvironment | undefined {
    const basePreset = this.getPreset(base);
    if (!basePreset) return undefined;

    return {
      ...basePreset,
      ...customizations,
      compiler: {
        ...basePreset.compiler,
        ...(customizations.compiler || {})
      },
      cpu: {
        ...basePreset.cpu,
        ...(customizations.cpu || {})
      },
      target: {
        ...basePreset.target,
        ...(customizations.target || {})
      },
      environment: {
        ...basePreset.environment,
        ...(customizations.environment || {})
      }
    };
  }
}