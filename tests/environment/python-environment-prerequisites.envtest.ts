import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

/**
 * Environment Tests for Python Environment Prerequisites
 * Tests that validate the Python environment is properly configured
 * before running system tests
 */

describe('Python Environment Prerequisites', () => {
  const workspaceRoot = process.cwd();
  const testDir = path.join(workspaceRoot, 'gen/test-env-python');

  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to clean up test directory:', error);
    }
  });

  describe('Python Installation Validation', () => {
    it('should have Python 3 installed', async () => {
      try {
        const { stdout } = await execAsync('python3 --version');
        expect(stdout).toMatch(/Python 3\.(\d+)\.(\d+)/);
        console.log('Python version detected:', stdout.trim());
      } catch (error: any) {
        console.error('Python 3 not found. Install with: sudo apt install python3');
        throw error;
      }
    });

    it('should check pip availability or provide installation guidance', async () => {
      try {
        const { stdout } = await execAsync('python3 -m pip --version');
        expect(stdout).toMatch(/pip \d+\.\d+/);
        console.log('Pip detected:', stdout.trim());
      } catch (error: any) {
        console.log('Pip not available. Install with: sudo apt install python3-pip');
        
        // Check if pip is available as standalone command
        try {
          const { stdout } = await execAsync('pip3 --version');
          expect(stdout).toMatch(/pip \d+\.\d+/);
          console.log('Pip3 detected:', stdout.trim());
        } catch (pip3Error: any) {
          console.log('Neither python3 -m pip nor pip3 available');
          console.log('Install with: sudo apt install python3-pip python3-venv');
          
          // Fail with helpful message
          throw new Error('Python pip module not available. Install with: sudo apt install python3-pip');
        }
      }
    });

    it('should check venv availability or provide installation guidance', async () => {
      try {
        // Test venv by creating a temporary environment
        const tempVenv = path.join(testDir, 'temp-venv-test');
        await execAsync(`python3 -m venv ${tempVenv}`);
        
        // Cleanup immediately
        await fs.rm(tempVenv, { recursive: true, force: true });
        
        console.log('Python venv module is available');
      } catch (error: any) {
        console.log('Python venv module not available');
        console.log('Install with: sudo apt install python3-venv');
        
        // Provide installation guidance but don't fail the test
        console.log('Error details:', error.message);
        
        // Check if this is the expected Ubuntu/Debian error
        if (error.message.includes('ensurepip is not available')) {
          console.log('Detected Ubuntu/Debian system missing python3-venv package');
          throw new Error('Python venv module not available. Install with: sudo apt install python3-venv');
        } else {
          throw error;
        }
      }
    });
  });

  describe('Optional Tool Detection', () => {
    it('should detect UV availability (optional)', async () => {
      try {
        const { stdout } = await execAsync('uv --version');
        console.log('UV tool detected:', stdout.trim());
        expect(stdout).toMatch(/uv \d+\.\d+/);
      } catch (error) {
        console.log('UV tool not available (optional)');
        console.log('Install UV with: curl -LsSf https://astral.sh/uv/install.sh | sh');
        
        // UV is optional, so we just log and continue
        expect(true).toBe(true); // Pass the test
      }
    });

    it('should check system Python package manager', async () => {
      try {
        // Check if apt is available (Ubuntu/Debian)
        await execAsync('which apt');
        console.log('Detected Debian/Ubuntu system with apt package manager');
        
        // Provide installation commands for missing Python components
        console.log('To install Python development environment:');
        console.log('sudo apt update');
        console.log('sudo apt install python3 python3-pip python3-venv python3-dev');
        
      } catch (error) {
        // Check for other package managers
        try {
          await execAsync('which yum');
          console.log('Detected RHEL/CentOS system with yum package manager');
          console.log('To install Python development environment:');
          console.log('sudo yum install python3 python3-pip python3-venv python3-devel');
        } catch (yumError) {
          try {
            await execAsync('which pacman');
            console.log('Detected Arch Linux system with pacman');
            console.log('To install Python development environment:');
            console.log('sudo pacman -S python python-pip');
          } catch (pacmanError) {
            console.log('Unknown package manager. Manual Python installation required.');
          }
        }
      }
      
      // This test always passes as it's informational
      expect(true).toBe(true);
    });
  });

  describe('Environment Readiness Assessment', () => {
    it('should create environment readiness report', async () => {
      const reportPath = path.join(testDir, 'environment-readiness.json');
      
      const checks = {
        python3: false,
        pip: false,
        venv: false,
        uv: false,
        pytest: false,
        coverage: false,
        behave: false
      };
      
      const details: any = {};
      
      // Check Python 3
      try {
        const { stdout } = await execAsync('python3 --version');
        checks.python3 = true;
        details.python3 = stdout.trim();
      } catch (error: any) {
        details.python3 = error.message;
      }
      
      // Check pip
      try {
        const { stdout } = await execAsync('python3 -m pip --version');
        checks.pip = true;
        details.pip = stdout.trim();
      } catch (error: any) {
        try {
          const { stdout } = await execAsync('pip3 --version');
          checks.pip = true;
          details.pip = stdout.trim();
        } catch (pip3Error: any) {
          details.pip = error.message;
        }
      }
      
      // Check venv
      try {
        const tempVenv = path.join(testDir, 'readiness-venv-test');
        await execAsync(`python3 -m venv ${tempVenv}`);
        checks.venv = true;
        details.venv = 'Available';
        await fs.rm(tempVenv, { recursive: true, force: true });
      } catch (error: any) {
        details.venv = error.message;
      }
      
      // Check UV
      try {
        const { stdout } = await execAsync('uv --version');
        checks.uv = true;
        details.uv = stdout.trim();
      } catch (error: any) {
        details.uv = 'Not available';
      }
      
      // Check pytest (if pip is available)
      if (checks.pip) {
        try {
          const { stdout } = await execAsync('python3 -m pytest --version');
          checks.pytest = true;
          details.pytest = stdout.trim();
        } catch (error: any) {
          details.pytest = 'Not installed';
        }
      }
      
      // Check coverage (if pip is available)
      if (checks.pip) {
        try {
          const { stdout } = await execAsync('python3 -m coverage --version');
          checks.coverage = true;
          details.coverage = stdout.trim();
        } catch (error: any) {
          details.coverage = 'Not installed';
        }
      }
      
      // Check behave (if pip is available)
      if (checks.pip) {
        try {
          const { stdout } = await execAsync('python3 -m behave --version');
          checks.behave = true;
          details.behave = stdout.trim();
        } catch (error: any) {
          details.behave = 'Not installed';
        }
      }
      
      const report = {
        timestamp: new Date().toISOString(),
        environment: process.platform,
        cwd: process.cwd(),
        checks,
        details,
        readiness_score: Object.values(checks).filter(Boolean).length / Object.keys(checks).length,
        recommendations: []
      };
      
      // Generate recommendations
      const recommendations: string[] = [];
      
      if (!checks.python3) {
        recommendations.push('Install Python 3: sudo apt install python3');
      }
      if (!checks.pip) {
        recommendations.push('Install pip: sudo apt install python3-pip');
      }
      if (!checks.venv) {
        recommendations.push('Install venv: sudo apt install python3-venv');
      }
      if (!checks.uv) {
        recommendations.push('Install UV (optional): curl -LsSf https://astral.sh/uv/install.sh | sh');
      }
      if (!checks.pytest) {
        recommendations.push('Install pytest: python3 -m pip install pytest');
      }
      if (!checks.coverage) {
        recommendations.push('Install coverage: python3 -m pip install coverage');
      }
      if (!checks.behave) {
        recommendations.push('Install behave: python3 -m pip install behave');
      }
      
      report.recommendations = recommendations;
      
      // Save report
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      
      console.log('\n=== Python Environment Readiness Report ===');
      console.log(`Readiness Score: ${(report.readiness_score * 100).toFixed(1)}%`);
      console.log('\nAvailable Tools:');
      Object.entries(checks).forEach(([tool, available]) => {
        console.log(`  ${tool}: ${available ? '✓' : '✗'}`);
      });
      
      if (recommendations.length > 0) {
        console.log('\nRecommendations:');
        recommendations.forEach(rec => console.log(`  - ${rec}`));
      }
      
      console.log(`\nFull report saved to: ${reportPath}`);
      
      // Test should pass regardless of environment state
      expect(report.readiness_score).toBeGreaterThanOrEqual(0);
      expect(checks.python3).toBe(true); // Python 3 is mandatory
    });
  });

  describe('Manual Installation Verification', () => {
    it('should provide installation verification script', async () => {
      const verificationScript = path.join(testDir, 'verify-installation.py');
      
      await fs.writeFile(verificationScript, `
#!/usr/bin/env python3
"""
Python Environment Installation Verification Script
Run this script to verify your Python environment is ready for development
"""

import sys
import subprocess
import importlib.util

def check_python_version():
    """Check Python version"""
    version = sys.version_info
    print(f"✓ Python {version.major}.{version.minor}.{version.micro}")
    return version.major == 3 and version.minor >= 8

def check_module(module_name, import_name=None):
    """Check if a module is available"""
    if import_name is None:
        import_name = module_name
    
    try:
        spec = importlib.util.find_spec(import_name)
        if spec is not None:
            print(f"✓ {module_name} available")
            return True
        else:
            print(f"✗ {module_name} not available")
            return False
    except ImportError:
        print(f"✗ {module_name} not available")
        return False

def check_command(command, name=None):
    """Check if a command is available"""
    if name is None:
        name = command[0]
    
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            version = result.stdout.strip().split('\n')[0]
            print(f"✓ {name}: {version}")
            return True
        else:
            print(f"✗ {name} command failed")
            return False
    except (subprocess.TimeoutExpired, FileNotFoundError):
        print(f"✗ {name} not found")
        return False

def main():
    """Main verification function"""
    print("Python Environment Verification\n" + "=" * 35)
    
    checks = []
    
    # Core Python
    checks.append(('Python 3.8+', check_python_version()))
    
    # Package management
    checks.append(('pip', check_command(['python3', '-m', 'pip', '--version'], 'pip')))
    checks.append(('venv', check_module('venv')))
    
    # Testing tools
    checks.append(('pytest', check_module('pytest')))
    checks.append(('coverage', check_module('coverage')))
    checks.append(('behave', check_module('behave')))
    
    # Optional tools
    checks.append(('UV (optional)', check_command(['uv', '--version'], 'UV')))
    
    print("\nSummary:")
    passed = sum(1 for _, result in checks if result)
    total = len(checks)
    print(f"Passed: {passed}/{total} ({passed/total*100:.1f}%)")
    
    if passed < total:
        print("\nTo install missing components on Ubuntu/Debian:")
        print("sudo apt update")
        print("sudo apt install python3 python3-pip python3-venv python3-dev")
        print("python3 -m pip install pytest coverage behave")
        print("\nOptional UV installation:")
        print("curl -LsSf https://astral.sh/uv/install.sh | sh")
    
    return passed == total

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
`);
      
      // Make script executable
      try {
        await execAsync(`chmod +x ${verificationScript}`);
      } catch (error) {
        console.log('Could not make script executable (Windows/permission issue)');
      }
      
      // Run verification script
      try {
        const { stdout, stderr } = await execAsync(`python3 ${verificationScript}`);
        console.log('\nVerification script output:');
        console.log(stdout);
        
        if (stderr) {
          console.log('Verification stderr:', stderr);
        }
        
        // Script should run without crashing
        expect(stdout).toContain('Python Environment Verification');
        expect(stdout).toContain('Python 3.');
        
      } catch (error: any) {
        console.error('Verification script failed:', error.message);
        throw error;
      }
    });

    it('should create Python environment setup guide', async () => {
      const setupGuide = path.join(testDir, 'PYTHON_SETUP_GUIDE.md');
      
      const guideContent = `
# Python Environment Setup Guide

## Prerequisites

This guide helps you set up a complete Python development environment for the AI Development Platform.

### System Requirements

- **Operating System**: Linux (Ubuntu/Debian preferred), macOS, or Windows with WSL
- **Python Version**: 3.8 or higher
- **Disk Space**: At least 500MB for Python packages
- **Internet Connection**: Required for package downloads

### Core Installation

#### Ubuntu/Debian Systems

\`\`\`bash
# Update package list
sudo apt update

# Install Python and essential tools
sudo apt install python3 python3-pip python3-venv python3-dev

# Verify installation
python3 --version
python3 -m pip --version
\`\`\`

#### RHEL/CentOS/Fedora Systems

\`\`\`bash
# Install Python and tools
sudo yum install python3 python3-pip python3-venv python3-devel
# or for newer versions:
sudo dnf install python3 python3-pip python3-venv python3-devel
\`\`\`

#### macOS Systems

\`\`\`bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Python
brew install python
\`\`\`

### Development Tools Installation

#### Core Testing Framework

\`\`\`bash
# Create virtual environment
python3 -m venv aidev-env
source aidev-env/bin/activate  # On Windows: aidev-env\Scripts\activate

# Install testing tools
python3 -m pip install pytest coverage behave

# Install additional development tools
python3 -m pip install black flake8 mypy pylint
\`\`\`

#### UV Package Manager (Optional but Recommended)

\`\`\`bash
# Install UV for faster package management
curl -LsSf https://astral.sh/uv/install.sh | sh

# Verify UV installation
uv --version

# Create environment with UV
uv venv aidev-uv-env
source aidev-uv-env/bin/activate

# Install packages with UV (much faster)
uv pip install pytest coverage behave requests
\`\`\`

### Verification

Run the verification script to ensure everything is installed correctly:

\`\`\`bash
python3 verify-installation.py
\`\`\`

### Integration with AI Development Platform

#### Configure IDE Integration

1. **VSCode Python Extension**: Install the Python extension for VSCode
2. **Python Interpreter**: Select the virtual environment Python interpreter
3. **Testing Framework**: Configure pytest as the test framework
4. **Coverage**: Enable coverage reporting in IDE

#### Configure Testing Environment

1. **Test Discovery**: Ensure pytest can discover tests in the \`tests/\` directory
2. **Coverage Configuration**: Set up \`.coveragerc\` or \`pyproject.toml\` configuration
3. **BDD Integration**: Configure behave for behavior-driven development

#### Environment Variables

\`\`\`bash
# Add to your shell profile (.bashrc, .zshrc, etc.)
export PYTHONPATH="$PYTHONPATH:$PWD/src"
export COVERAGE_PROCESS_START="$PWD/.coveragerc"
\`\`\`

### Troubleshooting

#### Common Issues

1. **"python3: command not found"**
   - Install Python 3: \`sudo apt install python3\`

2. **"No module named pip"**
   - Install pip: \`sudo apt install python3-pip\`

3. **"No module named venv"**
   - Install venv: \`sudo apt install python3-venv\`

4. **"Permission denied" during pip install**
   - Use virtual environment or \`--user\` flag: \`python3 -m pip install --user <package>\`

5. **"Package not found" errors**
   - Update pip: \`python3 -m pip install --upgrade pip\`
   - Check internet connection
   - Try using UV: \`uv pip install <package>\`

#### Getting Help

- Run environment verification: \`python3 verify-installation.py\`
- Check system test logs in \`gen/test-python-comprehensive/\`
- Review environment readiness report: \`gen/test-env-python/environment-readiness.json\`

### Next Steps

Once your environment is set up:

1. Run the comprehensive system tests: \`bun test tests/system/python-environment-comprehensive.systest.ts\`
2. Check coverage reports in \`htmlcov/\` directory
3. Review BDD test results
4. Integrate with your development workflow
`;
      
      await fs.writeFile(setupGuide, guideContent);
      
      // Verify guide was created
      const guideExists = await fs.access(setupGuide).then(() => true).catch(() => false);
      expect(guideExists).toBe(true);
      
      const content = await fs.readFile(setupGuide, 'utf-8');
      expect(content).toContain('Python Environment Setup Guide');
      expect(content).toContain('sudo apt install python3');
      expect(content).toContain('uv pip install');
      
      console.log(`\nSetup guide created: ${setupGuide}`);
    });
  });
});
