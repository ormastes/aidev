import { EventEmitter } from 'node:events';
import { exec } from 'child_process';
import { promisify } from 'node:util';
import { path } from '../../../infra_external-log-lib/src';
import { CompilerConfig, CompilerFlags, CrossCompileConfig, Architecture } from './BuildEnvironmentManager';

const execAsync = promisify(exec);

export interface ToolchainInfo {
  compiler: CompilerConfig;
  supportedArchitectures: Architecture[];
  supportedStandards: string[];
  supportedOptimizations: string[];
  features: CompilerFeatures;
  version: CompilerVersion;
}

export interface CompilerFeatures {
  openmp: boolean;
  sanitizers: string[];
  lto: boolean;
  pgo: boolean;
  staticAnalysis: boolean;
  modules: boolean;
  coroutines: boolean;
  concepts: boolean;
}

export interface CompilerVersion {
  major: number;
  minor: number;
  patch: number;
  full: string;
}

export class CompilerToolchain extends EventEmitter {
  private toolchains: Map<string, ToolchainInfo>;
  private activeToolchain?: ToolchainInfo;

  constructor() {
    super();
    this.toolchains = new Map();
  }

  async detectToolchains(): Promise<ToolchainInfo[]> {
    this.emit('detect:start');
    
    const detected: ToolchainInfo[] = [];

    // Detect GCC toolchains
    detected.push(...await this.detectGCCToolchains());

    // Detect Clang/LLVM toolchains
    detected.push(...await this.detectClangToolchains());

    // Detect cross-compilation toolchains
    detected.push(...await this.detectCrossToolchains());

    // Detect MSVC (on Windows)
    if (process.platform === 'win32') {
      detected.push(...await this.detectMSVCToolchains());
    }

    // Store detected toolchains
    for (const toolchain of detected) {
      const key = `${toolchain.compiler.type}-${toolchain.version.full}`;
      this.toolchains.set(key, toolchain);
    }

    this.emit('detect:complete', { count: detected.length });
    return detected;
  }

  private async detectGCCToolchains(): Promise<ToolchainInfo[]> {
    const toolchains: ToolchainInfo[] = [];
    
    // Check for various GCC versions
    const gccCommands = [
      'gcc', 'gcc-11', 'gcc-12', 'gcc-13',
      'g++', 'g++-11', 'g++-12', 'g++-13'
    ];

    for (const cmd of gccCommands) {
      try {
        const info = await this.probeGCC(cmd);
        if (info && !toolchains.some(t => t.version.full === info.version.full)) {
          toolchains.push(info);
        }
      } catch {
        // Command not found
      }
    }

    return toolchains;
  }

  private async probeGCC(command: string): Promise<ToolchainInfo | null> {
    try {
      const { stdout } = await execAsync(`${command} --version`);
      const versionMatch = stdout.match(/gcc.*?(\d+)\.(\d+)\.(\d+)/);
      
      if (!versionMatch) return null;

      const version: CompilerVersion = {
        major: parseInt(versionMatch[1]),
        minor: parseInt(versionMatch[2]),
        patch: parseInt(versionMatch[3]),
        full: `${versionMatch[1]}.${versionMatch[2]}.${versionMatch[3]}`
      };

      // Get detailed compiler info
      const { stdout: dumpSpecs } = await execAsync(`${command} -dumpspecs`);
      const { stdout: dumpMachine } = await execAsync(`${command} -dumpmachine`);
      
      const cCompiler = command.startsWith('g++') ? command.replace('g++', 'gcc') : command;
      const cppCompiler = command.startsWith('gcc') ? command.replace('gcc', 'g++') : command;

      return {
        compiler: {
          type: 'gcc',
          version: version.full,
          cCompiler,
          cppCompiler,
          linker: 'ld',
          archiver: 'ar',
          flags: this.getGCCFlags(version),
          path: await this.getCompilerPath(command)
        },
        supportedArchitectures: this.getGCCArchitectures(dumpMachine.trim()),
        supportedStandards: this.getGCCStandards(version),
        supportedOptimizations: this.getGCCOptimizations(),
        features: this.getGCCFeatures(version),
        version
      };
    } catch (error) {
      return null;
    }
  }

  private async detectClangToolchains(): Promise<ToolchainInfo[]> {
    const toolchains: ToolchainInfo[] = [];
    
    // Check for various Clang versions
    const clangCommands = [
      'clang', 'clang-14', 'clang-15', 'clang-16', 'clang-17',
      'clang++', 'clang++-14', 'clang++-15', 'clang++-16', 'clang++-17'
    ];

    for (const cmd of clangCommands) {
      try {
        const info = await this.probeClang(cmd);
        if (info && !toolchains.some(t => t.version.full === info.version.full)) {
          toolchains.push(info);
        }
      } catch {
        // Command not found
      }
    }

    return toolchains;
  }

  private async probeClang(command: string): Promise<ToolchainInfo | null> {
    try {
      const { stdout } = await execAsync(`${command} --version`);
      const versionMatch = stdout.match(/clang version (\d+)\.(\d+)\.(\d+)/);
      
      if (!versionMatch) return null;

      const version: CompilerVersion = {
        major: parseInt(versionMatch[1]),
        minor: parseInt(versionMatch[2]),
        patch: parseInt(versionMatch[3]),
        full: `${versionMatch[1]}.${versionMatch[2]}.${versionMatch[3]}`
      };

      const cCompiler = command.includes('++') ? command.replace('++', '') : command;
      const cppCompiler = command.includes('++') ? command : command + '++';

      return {
        compiler: {
          type: 'clang',
          version: version.full,
          cCompiler,
          cppCompiler,
          linker: 'lld',
          archiver: 'llvm-ar',
          flags: this.getClangFlags(version),
          path: await this.getCompilerPath(command)
        },
        supportedArchitectures: await this.getClangArchitectures(command),
        supportedStandards: this.getClangStandards(version),
        supportedOptimizations: this.getClangOptimizations(),
        features: this.getClangFeatures(version),
        version
      };
    } catch (error) {
      return null;
    }
  }

  private async detectCrossToolchains(): Promise<ToolchainInfo[]> {
    const toolchains: ToolchainInfo[] = [];
    
    // Common cross-compilation prefixes
    const crossPrefixes = [
      'arm-linux-gnueabihf-',
      'aarch64-linux-gnu-',
      'riscv64-linux-gnu-',
      'mips-linux-gnu-',
      'powerpc64le-linux-gnu-',
      'x86_64-w64-mingw32-',
      'i686-w64-mingw32-'
    ];

    for (const prefix of crossPrefixes) {
      try {
        const info = await this.probeCrossCompiler(prefix);
        if (info) {
          toolchains.push(info);
        }
      } catch {
        // Toolchain not found
      }
    }

    return toolchains;
  }

  private async probeCrossCompiler(prefix: string): Promise<ToolchainInfo | null> {
    try {
      const gccCmd = `${prefix}gcc`;
      const { stdout } = await execAsync(`${gccCmd} --version`);
      
      const versionMatch = stdout.match(/(\d+)\.(\d+)\.(\d+)/);
      if (!versionMatch) return null;

      const version: CompilerVersion = {
        major: parseInt(versionMatch[1]),
        minor: parseInt(versionMatch[2]),
        patch: parseInt(versionMatch[3]),
        full: `${versionMatch[1]}.${versionMatch[2]}.${versionMatch[3]}`
      };

      // Get target architecture
      const { stdout: targetTriple } = await execAsync(`${gccCmd} -dumpmachine`);
      const arch = this.parseTargetTriple(targetTriple.trim());

      // Get sysroot
      const { stdout: sysrootOutput } = await execAsync(`${gccCmd} -print-sysroot`);
      const sysroot = sysrootOutput.trim() || '/usr/' + prefix.slice(0, -1);

      const crossConfig: CrossCompileConfig = {
        prefix,
        sysroot,
        targetTriple: targetTriple.trim(),
        hostTriple: await this.getHostTriple()
      };

      return {
        compiler: {
          type: 'cross',
          version: version.full,
          cCompiler: `${prefix}gcc`,
          cppCompiler: `${prefix}g++`,
          linker: `${prefix}ld`,
          archiver: `${prefix}ar`,
          flags: this.getCrossCompilerFlags(arch),
          crossCompile: crossConfig
        },
        supportedArchitectures: [arch],
        supportedStandards: this.getGCCStandards(version),
        supportedOptimizations: this.getGCCOptimizations(),
        features: this.getGCCFeatures(version),
        version
      };
    } catch {
      return null;
    }
  }

  private async detectMSVCToolchains(): Promise<ToolchainInfo[]> {
    const toolchains: ToolchainInfo[] = [];
    
    try {
      // Use vswhere to find Visual Studio installations
      const { stdout } = await execAsync(
        'vswhere -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath'
      );

      const installations = stdout.trim().split('\n');
      
      for (const installPath of installations) {
        const info = await this.probeMSVC(installPath);
        if (info) {
          toolchains.push(info);
        }
      }
    } catch {
      // vswhere not available or no VS installations
    }

    return toolchains;
  }

  private async probeMSVC(installPath: string): Promise<ToolchainInfo | null> {
    try {
      // Find cl.exe
      const clPath = path.join(installPath, 'VC', 'Tools', 'MSVC', '*', 'bin', 'Hostx64', 'x64', 'cl.exe');
      
      // Get version
      const { stdout } = await execAsync(`"${clPath}" /?`);
      const versionMatch = stdout.match(/Version (\d+)\.(\d+)\.(\d+)/);
      
      if (!versionMatch) return null;

      const version: CompilerVersion = {
        major: parseInt(versionMatch[1]),
        minor: parseInt(versionMatch[2]),
        patch: parseInt(versionMatch[3]),
        full: `${versionMatch[1]}.${versionMatch[2]}.${versionMatch[3]}`
      };

      return {
        compiler: {
          type: 'msvc',
          version: version.full,
          cCompiler: clPath,
          cppCompiler: clPath,
          linker: path.join(path.dirname(clPath), 'link.exe'),
          archiver: path.join(path.dirname(clPath), 'lib.exe'),
          flags: this.getMSVCFlags(version),
          path: clPath
        },
        supportedArchitectures: this.getMSVCArchitectures(),
        supportedStandards: this.getMSVCStandards(version),
        supportedOptimizations: this.getMSVCOptimizations(),
        features: this.getMSVCFeatures(version),
        version
      };
    } catch {
      return null;
    }
  }

  private getGCCFlags(version: CompilerVersion): CompilerFlags {
    return {
      common: ['-Wall', '-Wextra', '-pthread'],
      debug: ['-g', '-O0', '-DDEBUG'],
      release: ['-O3', '-DNDEBUG'],
      optimization: ['-O0', '-O1', '-O2', '-O3', '-Os', '-Ofast'],
      warnings: ['-Wall', '-Wextra', '-Wpedantic', '-Werror'],
      includes: [],
      defines: [],
      linkFlags: ['-pthread']
    };
  }

  private getClangFlags(version: CompilerVersion): CompilerFlags {
    return {
      common: ['-Wall', '-Wextra', '-pthread'],
      debug: ['-g', '-O0', '-DDEBUG', '-fstandalone-debug'],
      release: ['-O3', '-DNDEBUG'],
      optimization: ['-O0', '-O1', '-O2', '-O3', '-Os', '-Oz'],
      warnings: ['-Wall', '-Wextra', '-Wpedantic', '-Werror', '-Weverything'],
      includes: [],
      defines: [],
      linkFlags: ['-pthread', '-fuse-ld=lld']
    };
  }

  private getCrossCompilerFlags(arch: Architecture): CompilerFlags {
    const baseFlags = this.getGCCFlags({ major: 0, minor: 0, patch: 0, full: '' });
    
    // Add architecture-specific flags
    if (arch.arch === 'arm') {
      baseFlags.common.push('-mfpu=neon', '-mfloat-abi=hard');
    } else if (arch.arch === 'aarch64') {
      baseFlags.common.push('-march=armv8-a');
    }

    return baseFlags;
  }

  private getMSVCFlags(version: CompilerVersion): CompilerFlags {
    return {
      common: ['/W4', '/EHsc'],
      debug: ['/Od', '/MDd', '/Zi', '/DDEBUG'],
      release: ['/O2', '/MD', '/DNDEBUG'],
      optimization: ['/Od', '/O1', '/O2', '/Ox'],
      warnings: ['/W1', '/W2', '/W3', '/W4', '/WX'],
      includes: [],
      defines: [],
      linkFlags: []
    };
  }

  private getGCCArchitectures(machine: string): Architecture[] {
    const arch = this.parseTargetTriple(machine);
    return [arch];
  }

  private async getClangArchitectures(command: string): Promise<Architecture[]> {
    try {
      const { stdout } = await execAsync(`${command} --print-targets`);
      const architectures: Architecture[] = [];
      
      const lines = stdout.split('\n');
      for (const line of lines) {
        if (line.includes('- ')) {
          const arch = this.parseClangTarget(line);
          if (arch) {
            architectures.push(arch);
          }
        }
      }

      return architectures;
    } catch {
      // Default to host architecture
      return [this.getHostArchitecture()];
    }
  }

  private getMSVCArchitectures(): Architecture[] {
    return [
      { arch: 'x86_64', bits: 64, endianness: 'little', abi: 'msvc' },
      { arch: 'x86_64', bits: 32, endianness: 'little', abi: 'msvc' },
      { arch: 'aarch64', bits: 64, endianness: 'little', abi: 'msvc' }
    ];
  }

  private getGCCStandards(version: CompilerVersion): string[] {
    const standards = ['c89', 'c99', 'c11', 'c++98', 'c++03', 'c++11', 'c++14', 'c++17'];
    
    if (version.major >= 8) {
      standards.push('c++20');
    }
    if (version.major >= 11) {
      standards.push('c++23');
    }
    if (version.major >= 9) {
      standards.push('c18', 'c2x');
    }

    return standards;
  }

  private getClangStandards(version: CompilerVersion): string[] {
    const standards = ['c89', 'c99', 'c11', 'c17', 'c++98', 'c++03', 'c++11', 'c++14', 'c++17'];
    
    if (version.major >= 10) {
      standards.push('c++20');
    }
    if (version.major >= 16) {
      standards.push('c++23');
    }
    if (version.major >= 12) {
      standards.push('c2x');
    }

    return standards;
  }

  private getMSVCStandards(version: CompilerVersion): string[] {
    const standards = ['c++14', 'c++17'];
    
    if (version.major >= 19 && version.minor >= 20) {
      standards.push('c++20');
    }
    if (version.major >= 19 && version.minor >= 30) {
      standards.push('c++23');
    }

    return standards;
  }

  private getGCCOptimizations(): string[] {
    return [
      '-O0', '-O1', '-O2', '-O3', '-Os', '-Ofast',
      '-march=native', '-mtune=native',
      '-fomit-frame-pointer', '-funroll-loops',
      '-ftree-vectorize', '-ffast-math'
    ];
  }

  private getClangOptimizations(): string[] {
    return [
      '-O0', '-O1', '-O2', '-O3', '-Os', '-Oz',
      '-march=native', '-mtune=native',
      '-fomit-frame-pointer', '-funroll-loops',
      '-fvectorize', '-ffast-math',
      '-flto', '-flto=thin'
    ];
  }

  private getMSVCOptimizations(): string[] {
    return [
      '/Od', '/O1', '/O2', '/Ox',
      '/favor:INTEL64', '/favor:AMD64',
      '/arch:AVX', '/arch:AVX2', '/arch:AVX512',
      '/GL', '/Gy', '/Gw'
    ];
  }

  private getGCCFeatures(version: CompilerVersion): CompilerFeatures {
    return {
      openmp: true,
      sanitizers: version.major >= 4 ? ['address', 'thread', "undefined"] : [],
      lto: version.major >= 4,
      pgo: version.major >= 4,
      staticAnalysis: version.major >= 10,
      modules: false,
      coroutines: version.major >= 10,
      concepts: version.major >= 10
    };
  }

  private getClangFeatures(version: CompilerVersion): CompilerFeatures {
    return {
      openmp: true,
      sanitizers: ['address', 'thread', 'memory', "undefined", "dataflow"],
      lto: true,
      pgo: true,
      staticAnalysis: true,
      modules: version.major >= 3,
      coroutines: version.major >= 5,
      concepts: version.major >= 10
    };
  }

  private getMSVCFeatures(version: CompilerVersion): CompilerFeatures {
    return {
      openmp: true,
      sanitizers: version.major >= 19 ? ['address'] : [],
      lto: true,
      pgo: true,
      staticAnalysis: true,
      modules: version.major >= 19 && version.minor >= 20,
      coroutines: version.major >= 19 && version.minor >= 10,
      concepts: version.major >= 19 && version.minor >= 20
    };
  }

  private parseTargetTriple(triple: string): Architecture {
    const parts = triple.split('-');
    const archStr = parts[0];
    
    let arch: Architecture['arch'] = 'x86_64';
    let bits: 32 | 64 = 64;
    let endianness: 'little' | 'big' = 'little';
    
    if (archStr.includes('x86_64') || archStr.includes('amd64')) {
      arch = 'x86_64';
      bits = 64;
    } else if (archStr.includes('i386') || archStr.includes('i686')) {
      arch = 'x86_64';
      bits = 32;
    } else if (archStr.includes('aarch64') || archStr.includes('arm64')) {
      arch = 'aarch64';
      bits = 64;
    } else if (archStr.includes('arm')) {
      arch = 'arm';
      bits = 32;
    } else if (archStr.includes('riscv64')) {
      arch = 'riscv64';
      bits = 64;
    } else if (archStr.includes('mips')) {
      arch = 'mips';
      bits = archStr.includes('64') ? 64 : 32;
      endianness = archStr.includes('el') ? 'little' : 'big';
    } else if (archStr.includes('ppc64le')) {
      arch = 'ppc64le';
      bits = 64;
      endianness = 'little';
    }

    return { arch, bits, endianness, abi: parts[2] };
  }

  private parseClangTarget(line: string): Architecture | null {
    // Parse Clang target output line
    const match = line.match(/^\s*(\S+)\s+-\s+/);
    if (match) {
      return this.parseTargetTriple(match[1]);
    }
    return null;
  }

  private getHostArchitecture(): Architecture {
    const arch = process.arch;
    
    switch (arch) {
      case 'x64':
        return { arch: 'x86_64', bits: 64, endianness: 'little' };
      case 'ia32':
        return { arch: 'x86_64', bits: 32, endianness: 'little' };
      case 'arm64':
        return { arch: 'aarch64', bits: 64, endianness: 'little' };
      case 'arm':
        return { arch: 'arm', bits: 32, endianness: 'little' };
      default:
        return { arch: 'x86_64', bits: 64, endianness: 'little' };
    }
  }

  private async getHostTriple(): Promise<string> {
    try {
      const { stdout } = await execAsync('gcc -dumpmachine');
      return stdout.trim();
    } catch {
      return `${process.arch}-${process.platform}-gnu`;
    }
  }

  private async getCompilerPath(command: string): Promise<string | undefined> {
    try {
      const { stdout } = await execAsync(`which ${command}`);
      return stdout.trim();
    } catch {
      return undefined;
    }
  }

  createCompilerConfig(
    type: 'gcc' | 'clang' | 'msvc' | 'cross',
    version: string,
    options: Partial<CompilerConfig> = {}
  ): CompilerConfig {
    const baseConfig: CompilerConfig = {
      type,
      version,
      cCompiler: options.cCompiler || `${type}`,
      cppCompiler: options.cppCompiler || `${type}++`,
      linker: options.linker,
      archiver: options.archiver,
      flags: options.flags || this.getDefaultFlags(type),
      path: options.path,
      crossCompile: options.crossCompile
    };

    return { ...baseConfig, ...options };
  }

  private getDefaultFlags(type: string): CompilerFlags {
    switch (type) {
      case 'gcc':
        return this.getGCCFlags({ major: 0, minor: 0, patch: 0, full: '' });
      case 'clang':
        return this.getClangFlags({ major: 0, minor: 0, patch: 0, full: '' });
      case 'msvc':
        return this.getMSVCFlags({ major: 0, minor: 0, patch: 0, full: '' });
      default:
        return {
          common: [],
          debug: [],
          release: [],
          optimization: [],
          warnings: [],
          includes: [],
          defines: [],
          linkFlags: []
        };
    }
  }

  getToolchain(name: string): ToolchainInfo | undefined {
    return this.toolchains.get(name);
  }

  getActiveToolchain(): ToolchainInfo | undefined {
    return this.activeToolchain;
  }

  setActiveToolchain(name: string): void {
    const toolchain = this.toolchains.get(name);
    if (toolchain) {
      this.activeToolchain = toolchain;
      this.emit('toolchain:activated', toolchain);
    }
  }

  listToolchains(): string[] {
    return Array.from(this.toolchains.keys());
  }
}