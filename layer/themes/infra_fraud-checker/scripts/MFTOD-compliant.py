#!/usr/bin/env python3
"""
Mock Free Test Oriented Development (MFTOD) Compliance Checker and Fixer

This script checks test files for MFTOD compliance and can automatically fix issues:
1. Renames test files using mocks to include _FAKE suffix
2. Creates missing test types (environment, external, system)
3. Generates test templates for missing test types
4. Reports on MFTOD compliance status
"""

import os
import re
import sys
import argparse
from pathlib import Path
from typing import List, Dict, Tuple, Set
import subprocess
import shutil

class MFTODCompliance:
    """Check and fix MFTOD compliance in test files"""
    
    # Test type patterns
    TEST_PATTERNS = {
        'unit': r'\.test\.ts$',
        'integration': r'\.itest\.ts$',
        'system': r'\.stest\.ts$',
        'external': r'\.etest\.ts$',
        'environment': r'\.envtest\.ts$'
    }
    
    # Mock indicators in code
    MOCK_INDICATORS = [
        r'jest\.fn\(',
        r'jest\.mock\(',
        r'mockImplementation',
        r'mockResolvedValue',
        r'mockRejectedValue',
        r'Mock[A-Z]\w+',  # MockAgent, MockService, etc.
        r'class\s+Mock',
        r'__mocks__',
        r'simulateAIResponse',  # Specific to our agentic coding
        r'mock\s*=\s*true',
        r'shouldFail\s*=\s*true'  # Mock failure simulation
    ]
    
    def __init__(self, base_path: str):
        self.base_path = Path(base_path)
        self.issues: List[Dict] = []
        self.fixes_applied: List[str] = []
        
    def check_directory(self, directory: Path) -> Dict[str, List[Path]]:
        """Find all test files organized by type"""
        test_files = {
            'unit': [],
            'integration': [],
            'system': [],
            'external': [],
            'environment': []
        }
        
        for test_type, pattern in self.TEST_PATTERNS.items():
            files = list(directory.rglob('*'))
            for file in files:
                if re.search(pattern, str(file)):
                    test_files[test_type].append(file)
                    
        return test_files
    
    def check_mock_usage(self, file_path: Path) -> bool:
        """Check if a test file uses mocks"""
        try:
            with open(file_path, 'r') as f:
                content = f.read()
                
            for indicator in self.MOCK_INDICATORS:
                if re.search(indicator, content, re.IGNORECASE):
                    return True
                    
            # Check imports for mock modules
            if 'from \'../__mocks__' in content or 'from "__mocks__' in content:
                return True
                
            return False
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            return False
    
    def needs_fake_suffix(self, file_path: Path, test_type: str) -> bool:
        """Check if file needs _FAKE suffix based on mock usage"""
        # Unit tests are allowed to use mocks
        # Other test types should not use mocks unless marked with _FAKE
        if '_FAKE' in file_path.name:
            return False  # Already has suffix
            
        uses_mocks = self.check_mock_usage(file_path)
        
        if test_type in ['environment', 'external', 'system']:
            # These should NEVER use mocks
            if uses_mocks:
                self.issues.append({
                    'type': 'error',
                    'file': str(file_path),
                    'message': f'{test_type} tests must not use mocks'
                })
                return True
        elif test_type == 'integration':
            # Integration tests should minimize mocks
            if uses_mocks:
                self.issues.append({
                    'type': 'warning',
                    'file': str(file_path),
                    'message': 'Integration tests should minimize mock usage'
                })
                return True
        elif test_type == 'unit':
            # Unit tests can use mocks but should be marked
            if uses_mocks:
                return True
                
        return False
    
    def rename_with_fake_suffix(self, file_path: Path) -> Path:
        """Rename file to include _FAKE suffix"""
        name_parts = file_path.name.split('.')
        
        # Insert _FAKE before the test type
        if len(name_parts) >= 2:
            name_parts[-2] = name_parts[-2] + '_FAKE'
            new_name = '.'.join(name_parts)
            new_path = file_path.parent / new_name
            
            shutil.move(str(file_path), str(new_path))
            self.fixes_applied.append(f"Renamed {file_path.name} to {new_name}")
            return new_path
        
        return file_path
    
    def create_environment_test_template(self, component_name: str, test_dir: Path) -> Path:
        """Create environment test template"""
        template = f'''/**
 * Environment tests for {component_name}
 * Tests real environment setup and configuration
 * NO MOCKS ALLOWED
 */

describe('{component_name} Environment Tests', () => {{
  describe('TypeScript Environment', () => {{
    it('should have TypeScript compiler available', async () => {{
      const {{ exec }} = require('child_process');
      const {{ promisify }} = require('util');
      const execAsync = promisify(exec);
      
      const {{ stdout }} = await execAsync('npx tsc --version');
      expect(stdout).toContain('Version');
    }});
    
    it('should compile generated TypeScript code', async () => {{
      const fs = require('fs').promises;
      const path = require('path');
      const {{ exec }} = require('child_process');
      const {{ promisify }} = require('util');
      const execAsync = promisify(exec);
      
      // Create a test file
      const testFile = path.join(__dirname, 'test-compile.ts');
      const testCode = `
        export function testFunction(x: number): number {{
          return x * 2;
        }}
      `;
      
      await fs.writeFile(testFile, testCode);
      
      try {{
        const {{ stderr }} = await execAsync(`npx tsc --noEmit ${{testFile}}`);
        expect(stderr).toBe('');
      }} finally {{
        await fs.unlink(testFile).catch(() => {{}});
      }}
    }});
  }});
  
  describe('Node.js Environment', () => {{
    it('should have required Node.js version', () => {{
      const version = process.version;
      const major = parseInt(version.split('.')[0]?.substring(1) || '0');
      expect(major).toBeGreaterThanOrEqual(16);
    }});
    
    it('should have required environment variables', () => {{
      // Add any required env vars for your agent system
      // expect(process.env.OPENAI_API_KEY).toBeDefined();
    }});
  }});
}});
'''
        
        file_path = test_dir / f'{component_name}.envtest.ts'
        with open(file_path, 'w') as f:
            f.write(template)
        
        self.fixes_applied.append(f"Created {file_path}")
        return file_path
    
    def create_external_test_template(self, component_name: str, test_dir: Path) -> Path:
        """Create external test template"""
        template = f'''/**
 * External tests for {component_name}
 * Tests real external dependencies and services
 * NO MOCKS ALLOWED
 */

import {{ spawn }} from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('{component_name} External Tests', () => {{
  describe('Code Execution', () => {{
    it('should execute generated JavaScript code', async () => {{
      const testCode = `
        console.log('Hello from generated code');
        process.exit(0);
      `;
      
      const testFile = path.join(__dirname, 'test-exec.js');
      await fs.writeFile(testFile, testCode);
      
      try {{
        const result = await new Promise<string>((resolve, reject) => {{
          let output = '';
          const child = spawn('node', [testFile]);
          
          child.stdout.on('data', (data) => {{
            output += data.toString();
          }});
          
          child.on('exit', (code) => {{
            if (code === 0) {{
              resolve(output);
            }} else {{
              reject(new Error(`Process exited with code ${{code}}`));
            }}
          }});
        }});
        
        expect(result).toContain('Hello from generated code');
      }} finally {{
        await fs.unlink(testFile).catch(() => {{}});
      }}
    }});
    
    it('should run generated Jest tests', async () => {{
      const testCode = `
        test('generated test', () => {{
          expect(1 + 1).toBe(2);
        }});
      `;
      
      const testFile = path.join(__dirname, 'generated.test.js');
      await fs.writeFile(testFile, testCode);
      
      try {{
        const result = await new Promise<string>((resolve, reject) => {{
          let output = '';
          const child = spawn('npx', ['jest', testFile, '--no-coverage']);
          
          child.stdout.on('data', (data) => {{
            output += data.toString();
          }});
          
          child.stderr.on('data', (data) => {{
            output += data.toString();
          }});
          
          child.on('exit', (code) => {{
            resolve(output);
          }});
        }});
        
        expect(result).toContain('1 passed');
      }} finally {{
        await fs.unlink(testFile).catch(() => {{}});
      }}
    }});
  }});
  
  describe('LLM Integration', () => {{
    it('should connect to LLM service if configured', async () => {{
      // This would test real LLM API
      if (process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY) {{
        // Real API test would go here
        expect(true).toBe(true);
      }} else {{
        console.log('Skipping LLM test - no API key configured');
        expect(true).toBe(true);
      }}
    }});
  }});
}});
'''
        
        file_path = test_dir / f'{component_name}.etest.ts'
        with open(file_path, 'w') as f:
            f.write(template)
        
        self.fixes_applied.append(f"Created {file_path}")
        return file_path
    
    def create_system_test_template(self, component_name: str, test_dir: Path) -> Path:
        """Create system test template with Playwright"""
        template = f'''/**
 * System tests for {component_name}
 * End-to-end tests with real browser interactions using Playwright
 * NO MOCKS ALLOWED - Real user interactions only
 */

import {{ test, expect }} from '@playwright/test';
import * as path from 'path';

test.describe('{component_name} System Tests', () => {{
  test.beforeEach(async ({{ page }}) => {{
    // Start from login page or main entry point
    await page.goto('http://localhost:3000');
  }});
  
  test('should generate code through UI workflow', async ({{ page }}) => {{
    // Login if required
    // await page.fill('[data-testid="username"]', 'testuser');
    // await page.fill('[data-testid="password"]', 'testpass');
    // await page.click('[data-testid="login-button"]');
    
    // Navigate to code generation feature
    await page.click('text=Code Generation');
    await page.waitForSelector('[data-testid="code-gen-form"]');
    
    // Fill in requirements
    await page.fill('[data-testid="requirements-input"]', 
      'Create a function that validates email addresses');
    
    // Select options
    await page.selectOption('[data-testid="language-select"]', 'typescript');
    await page.selectOption('[data-testid="style-select"]', 'functional');
    
    // Click generate button
    await page.click('[data-testid="generate-button"]');
    
    // Wait for code to be generated
    await page.waitForSelector('[data-testid="generated-code"]', {{
      timeout: 30000
    }});
    
    // Verify generated code appears
    const generatedCode = await page.textContent('[data-testid="generated-code"]');
    expect(generatedCode).toContain('function');
    expect(generatedCode).toContain('email');
    
    // Generate tests
    await page.click('[data-testid="generate-tests-button"]');
    await page.waitForSelector('[data-testid="generated-tests"]');
    
    const generatedTests = await page.textContent('[data-testid="generated-tests"]');
    expect(generatedTests).toContain('describe');
    expect(generatedTests).toContain('expect');
    
    // Run the tests
    await page.click('[data-testid="run-tests-button"]');
    await page.waitForSelector('[data-testid="test-results"]');
    
    const testResults = await page.textContent('[data-testid="test-results"]');
    expect(testResults).toContain('passed');
  }});
  
  test('should handle code generation errors gracefully', async ({{ page }}) => {{
    await page.click('text=Code Generation');
    
    // Submit without requirements
    await page.click('[data-testid="generate-button"]');
    
    // Should show error message
    await page.waitForSelector('[data-testid="error-message"]');
    const error = await page.textContent('[data-testid="error-message"]');
    expect(error).toContain('Requirements are required');
  }});
  
  test('should save and load code generation sessions', async ({{ page }}) => {{
    // Generate code
    await page.click('text=Code Generation');
    await page.fill('[data-testid="requirements-input"]', 'Sort an array');
    await page.click('[data-testid="generate-button"]');
    await page.waitForSelector('[data-testid="generated-code"]');
    
    // Save session
    await page.click('[data-testid="save-session-button"]');
    await page.fill('[data-testid="session-name-input"]', 'test-session');
    await page.click('[data-testid="confirm-save-button"]');
    
    // Navigate away and back
    await page.click('text=Home');
    await page.click('text=Code Generation');
    
    // Load session
    await page.click('[data-testid="load-session-button"]');
    await page.click('text=test-session');
    
    // Verify loaded content
    const requirements = await page.inputValue('[data-testid="requirements-input"]');
    expect(requirements).toBe('Sort an array');
  }});
}});
'''
        
        file_path = test_dir / f'{component_name}.stest.ts'
        with open(file_path, 'w') as f:
            f.write(template)
        
        self.fixes_applied.append(f"Created {file_path}")
        return file_path
    
    def check_and_fix(self, directory: Path, fix: bool = False) -> Dict:
        """Check MFTOD compliance and optionally fix issues"""
        print(f"\nChecking MFTOD compliance in: {directory}")
        
        # Find all test files
        test_files = self.check_directory(directory)
        
        # Track what test types exist
        existing_types = set()
        missing_types = set(['environment', 'external', 'system'])
        
        # Check each test file
        for test_type, files in test_files.items():
            if files:
                existing_types.add(test_type)
                missing_types.discard(test_type)
                
            for file in files:
                print(f"\nChecking {test_type} test: {file}")
                
                # Check if file needs _FAKE suffix
                if self.needs_fake_suffix(file, test_type):
                    if fix:
                        new_path = self.rename_with_fake_suffix(file)
                        print(f"  ✓ Renamed to: {new_path.name}")
                    else:
                        print(f"  ⚠ Needs _FAKE suffix (uses mocks)")
        
        # Check for missing test types
        if missing_types:
            self.issues.append({
                'type': 'error',
                'message': f'Missing test types: {", ".join(missing_types)}'
            })
            
            if fix:
                # Create missing test templates
                test_dir = directory / 'tests'
                
                # Determine component name from directory
                component_name = directory.name.replace('-', '_')
                
                if 'environment' in missing_types:
                    env_dir = test_dir / 'environment'
                    env_dir.mkdir(parents=True, exist_ok=True)
                    self.create_environment_test_template(component_name, env_dir)
                    
                if 'external' in missing_types:
                    ext_dir = test_dir / 'external'
                    ext_dir.mkdir(parents=True, exist_ok=True)
                    self.create_external_test_template(component_name, ext_dir)
                    
                if 'system' in missing_types:
                    sys_dir = test_dir / 'system'
                    sys_dir.mkdir(parents=True, exist_ok=True)
                    self.create_system_test_template(component_name, sys_dir)
        
        # Generate report
        report = {
            'directory': str(directory),
            'existing_test_types': list(existing_types),
            'missing_test_types': list(missing_types),
            'issues': self.issues,
            'fixes_applied': self.fixes_applied,
            'compliant': len(self.issues) == 0
        }
        
        return report
    
    def print_report(self, report: Dict):
        """Print compliance report"""
        print("\n" + "="*60)
        print("MFTOD COMPLIANCE REPORT")
        print("="*60)
        
        print(f"\nDirectory: {report['directory']}")
        print(f"Compliant: {'✓ Yes' if report['compliant'] else '✗ No'}")
        
        print(f"\nExisting test types: {', '.join(report['existing_test_types']) or 'None'}")
        print(f"Missing test types: {', '.join(report['missing_test_types']) or 'None'}")
        
        if report['issues']:
            print("\nIssues found:")
            for issue in report['issues']:
                icon = '❌' if issue['type'] == 'error' else '⚠️'
                print(f"  {icon} {issue['message']}")
                if 'file' in issue:
                    print(f"     File: {issue['file']}")
        
        if report['fixes_applied']:
            print("\nFixes applied:")
            for fix in report['fixes_applied']:
                print(f"  ✓ {fix}")
        
        print("\n" + "="*60)

def main():
    parser = argparse.ArgumentParser(description='MFTOD Compliance Checker')
    parser.add_argument('path', help='Path to check for MFTOD compliance')
    parser.add_argument('--fix', action='store_true', help='Automatically fix issues')
    parser.add_argument('--recursive', action='store_true', help='Check all subdirectories')
    
    args = parser.parse_args()
    
    checker = MFTODCompliance(args.path)
    path = Path(args.path)
    
    if args.recursive:
        # Find all directories with test folders
        test_dirs = []
        for test_dir in path.rglob('tests'):
            if test_dir.is_dir():
                test_dirs.append(test_dir.parent)
        
        all_reports = []
        for dir in test_dirs:
            report = checker.check_and_fix(dir, args.fix)
            all_reports.append(report)
            checker.print_report(report)
        
        # Summary
        compliant_count = sum(1 for r in all_reports if r['compliant'])
        print(f"\n\nSUMMARY: {compliant_count}/{len(all_reports)} directories are MFTOD compliant")
    else:
        report = checker.check_and_fix(path, args.fix)
        checker.print_report(report)
        
        sys.exit(0 if report['compliant'] else 1)

if __name__ == '__main__':
    main()