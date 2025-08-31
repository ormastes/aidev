import { spawn, exec, execSync } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

/**
 * Helper function to extract manual test procedures from test docstrings
 */
function extractManualTestProcedures(testContent: string): string {
  const lines = testContent.split('\\n');
  let manualDoc = '# Manual Test Procedures\\n\\n';
  let inDocstring = false;
  let currentProcedure = '';
  
  for (const line of lines) {
    if (line.trim().includes('Manual Test:')) {
      inDocstring = true;
      currentProcedure = '## ' + line.trim().replace('Manual Test:', '').trim() + '\\n\\n';
    } else if (inDocstring && line.trim().startsWith('\"\"\"')) {
      inDocstring = false;
      manualDoc += currentProcedure + '\\n';
      currentProcedure = '';
    } else if (inDocstring && line.trim()) {
      if (line.trim().match(/^\\d+\\./)) {
        currentProcedure += '- ' + line.trim() + '\\n';
      } else if (line.trim() !== '\"\"\"') {
        currentProcedure += line.trim() + '\\n';
      }
    }
  }
  
  return manualDoc;
}

/**
 * Comprehensive System Tests for Python Environment Integration
 * Tests Python process management, virtual environments, UV tool, package management,
 * coverage tools, BDD frameworks, and IDE integration
 * 
 * Requirements tested:
 * - UV environment management
 * - Package installation and dependency resolution 
 * - Virtual environment creation and isolation
 * - Python version management
 * - Coverage tools (branch and class coverage)
 * - Test runner integration (pytest, unittest)
 * - Cucumber-Python BDD support (behave)
 * - IDE integration and environment detection
 */

describe('Python Environment System Tests', () => {
  const workspaceRoot = process.cwd();
  const pythonTestDir = path.join(workspaceRoot, 'gen/test-python-comprehensive');
  const venvPath = path.join(pythonTestDir, 'test-venv');
  const uvVenvPath = path.join(pythonTestDir, 'uv-venv');
  const testProjectDir = path.join(pythonTestDir, 'test-project');
  
  beforeAll(async () => {
    // Create test directories
    await fs.mkdir(pythonTestDir, { recursive: true });
    await fs.mkdir(testProjectDir, { recursive: true });
    
    // Create test project structure
    await fs.mkdir(path.join(testProjectDir, 'src'), { recursive: true });
    await fs.mkdir(path.join(testProjectDir, 'tests'), { recursive: true });
    await fs.mkdir(path.join(testProjectDir, 'features'), { recursive: true });
    
    // Setup basic project files
    await fs.writeFile(path.join(testProjectDir, 'pyproject.toml'), `
[build-system]
requires = ["setuptools>=61.0"]
build-backend = "setuptools.build_meta"

[project]
name = "test-project"
version = "0.1.0"
description = "Test project for Python environment validation"
dependencies = [
    "pytest>=7.0.0",
    "coverage>=7.0.0",
    "behave>=1.2.6",
    "requests>=2.28.0"
]

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py", "*_test.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
addopts = "-v --tb=short"

[tool.coverage.run]
source = ["src"]
branch = true
omit = ["*/tests/*"]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "raise AssertionError",
    "raise NotImplementedError"
]
`);

    // Create requirements.txt for pip testing
    await fs.writeFile(path.join(testProjectDir, 'requirements.txt'), `
pytest==7.4.4
coverage==7.4.4
behave==1.2.6
requests==2.31.0
click==8.1.7
`);

    // Create setup.cfg for additional configuration
    await fs.writeFile(path.join(testProjectDir, 'setup.cfg'), `
[tool:pytest]
testpaths = tests
python_files = test_*.py *_test.py
python_classes = Test*
python_functions = test_*
addopts = -v --tb=short --strict-markers
markers =
    slow: marks tests as slow (deselect with '-m "not slow"')
    integration: marks tests as integration tests
    unit: marks tests as unit tests
    system: marks tests as system tests

[coverage:run]
source = src
branch = true
omit = */tests/*

[coverage:report]
exclude_lines =
    pragma: no cover
    def __repr__
    raise AssertionError
    raise NotImplementedError
    if __name__ == .__main__.:
`);
  });

  afterAll(async () => {
    // Cleanup test directory
    try {
      await fs.rm(pythonTestDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to clean up test directory:', error);
    }
  });

  describe('Python Runtime Detection and Version Management', () => {
    it('should detect Python installation and version', async () => {
      // Test python3 detection
      const { stdout: python3Version } = await execAsync('python3 --version');
      expect(python3Version).toMatch(/Python 3\.(\d+)\.(\d+)/);
      
      // Test python detection (if available)
      try {
        const { stdout: pythonVersion } = await execAsync('python --version');
        expect(pythonVersion).toMatch(/Python (2|3)\.(\d+)\.(\d+)/);
      } catch {
        // Python 2 might not be available, which is fine
        console.log('Python 2 not available (expected in modern environments)');
      }
    });

    it('should detect pip installation and functionality', async () => {
      const { stdout: pipVersion } = await execAsync('python3 -m pip --version');
      expect(pipVersion).toMatch(/pip \d+\.\d+/);
      
      // Test pip list functionality
      const { stdout: packageList } = await execAsync('python3 -m pip list --format=json');
      const packages = JSON.parse(packageList);
      expect(Array.isArray(packages)).toBe(true);
      expect(packages.length).toBeGreaterThan(0);
      
      // Verify pip can show package info
      const { stdout: pipInfo } = await execAsync('python3 -m pip show pip');
      expect(pipInfo).toContain('Name: pip');
      expect(pipInfo).toContain('Version:');
    });

    it('should test UV tool availability and basic functionality', async () => {
      try {
        // Check if UV is installed
        const { stdout: uvVersion } = await execAsync('uv --version');
        expect(uvVersion).toMatch(/uv \d+\.\d+/);
        
        // Test UV basic commands
        const { stdout: uvHelp } = await execAsync('uv --help');
        expect(uvHelp).toContain('Python package installer');
        
        console.log('UV is available:', uvVersion.trim());
        
      } catch (error) {
        console.log('UV not installed, testing fallback to pip');
        
        // If UV is not available, ensure pip works as fallback
        const { stdout } = await execAsync('python3 -m pip --version');
        expect(stdout).toMatch(/pip \d+\.\d+/);
      }
    });
  });

  describe('Virtual Environment Management', () => {
    it('should create and manage virtual environments with venv', async () => {
      // Create virtual environment
      await execAsync(`python3 -m venv ${venvPath}`);
      
      // Verify venv structure
      const venvExists = await fs.access(venvPath).then(() => true).catch(() => false);
      expect(venvExists).toBe(true);
      
      const binDir = path.join(venvPath, 'bin');
      const binExists = await fs.access(binDir).then(() => true).catch(() => false);
      expect(binExists).toBe(true);
      
      // Check Python executable in venv
      const pythonBin = path.join(binDir, 'python');
      const pythonExists = await fs.access(pythonBin).then(() => true).catch(() => false);
      expect(pythonExists).toBe(true);
      
      // Verify venv isolation
      const testScript = path.join(pythonTestDir, 'test_venv_isolation.py');
      await fs.writeFile(testScript, `
import sys
import json

result = {
    'prefix': sys.prefix,
    'executable': sys.executable,
    'path': sys.path[:3]  # First 3 entries
}
print(json.dumps(result))
`);
      
      const { stdout } = await execAsync(`${pythonBin} ${testScript}`);
      const result = JSON.parse(stdout);
      
      expect(result.prefix).toContain('test-venv');
      expect(result.executable).toContain('test-venv');
    });

    it('should create virtual environments with UV (if available)', async () => {
      try {
        // Test UV virtual environment creation
        await execAsync(`uv venv ${uvVenvPath}`);
        
        const uvVenvExists = await fs.access(uvVenvPath).then(() => true).catch(() => false);
        expect(uvVenvExists).toBe(true);
        
        // Check UV venv structure
        const binDir = path.join(uvVenvPath, 'bin');
        const binExists = await fs.access(binDir).then(() => true).catch(() => false);
        expect(binExists).toBe(true);
        
        console.log('UV virtual environment created successfully');
        
      } catch (error) {
        console.log('UV not available, skipping UV-specific venv tests');
        
        // Fallback test with standard venv
        const fallbackVenv = path.join(pythonTestDir, 'fallback-venv');
        await execAsync(`python3 -m venv ${fallbackVenv}`);
        
        const fallbackExists = await fs.access(fallbackVenv).then(() => true).catch(() => false);
        expect(fallbackExists).toBe(true);
      }
    });

    it('should verify environment isolation between different venvs', async () => {
      // Create two separate environments
      const venv1 = path.join(pythonTestDir, 'isolation-test-1');
      const venv2 = path.join(pythonTestDir, 'isolation-test-2');
      
      await execAsync(`python3 -m venv ${venv1}`);
      await execAsync(`python3 -m venv ${venv2}`);
      
      // Install different packages in each environment
      const pip1 = path.join(venv1, 'bin', 'pip');
      const pip2 = path.join(venv2, 'bin', 'pip');
      
      await execAsync(`${pip1} install requests==2.31.0`);
      await execAsync(`${pip2} install click==8.1.7`);
      
      // Verify isolation
      const { stdout: packages1 } = await execAsync(`${pip1} list --format=json`);
      const { stdout: packages2 } = await execAsync(`${pip2} list --format=json`);
      
      const pkgs1 = JSON.parse(packages1);
      const pkgs2 = JSON.parse(packages2);
      
      const hasRequests1 = pkgs1.some((pkg: any) => pkg.name === 'requests');
      const hasClick1 = pkgs1.some((pkg: any) => pkg.name === 'click');
      const hasRequests2 = pkgs2.some((pkg: any) => pkg.name === 'requests');
      const hasClick2 = pkgs2.some((pkg: any) => pkg.name === 'click');
      
      expect(hasRequests1).toBe(true);
      expect(hasClick1).toBe(false);
      expect(hasRequests2).toBe(false);
      expect(hasClick2).toBe(true);
    });
  });

  describe('Package Installation and Dependency Resolution', () => {
    it('should install packages using pip with requirements.txt', async () => {
      const venvPip = path.join(venvPath, 'bin', 'pip');
      const requirementsFile = path.join(testProjectDir, 'requirements.txt');
      
      // Install from requirements.txt
      await execAsync(`${venvPip} install -r ${requirementsFile}`);
      
      // Verify installations
      const { stdout } = await execAsync(`${venvPip} list --format=json`);
      const packages = JSON.parse(stdout);
      
      const expectedPackages = ['pytest', 'coverage', 'behave', 'requests', 'click'];
      
      for (const expectedPkg of expectedPackages) {
        const found = packages.some((pkg: any) => pkg.name === expectedPkg);
        expect(found).toBe(true);
      }
    });

    it('should handle dependency conflicts and resolution', async () => {
      const venvPip = path.join(venvPath, 'bin', 'pip');
      
      // Create conflicting requirements
      const conflictReqs = path.join(pythonTestDir, 'conflict-requirements.txt');
      await fs.writeFile(conflictReqs, `
requests==2.31.0
requests==2.30.0
`);
      
      // Attempt installation (should handle conflict)
      try {
        await execAsync(`${venvPip} install -r ${conflictReqs}`);
      } catch (error: any) {
        // Should fail with version conflict
        expect(error.message).toContain('version conflict');
      }
      
      // Verify only one version is installed
      const { stdout } = await execAsync(`${venvPip} show requests`);
      expect(stdout).toContain('Version:');
      
      // Count version occurrences (should be 1)
      const versionMatches = stdout.match(/Version:/g);
      expect(versionMatches?.length).toBe(1);
    });

    it('should test UV package installation (if available)', async () => {
      try {
        // Test UV installation in UV venv
        const uvPython = path.join(uvVenvPath, 'bin', 'python');
        
        // Install package with UV
        await execAsync(`uv pip install requests --python ${uvPython}`);
        
        // Verify installation
        const { stdout } = await execAsync(`uv pip list --python ${uvPython}`);
        expect(stdout).toContain('requests');
        
        console.log('UV package installation successful');
        
      } catch (error) {
        console.log('UV not available for package installation testing');
        
        // Fallback to pip installation test
        const venvPip = path.join(venvPath, 'bin', 'pip');
        await execAsync(`${venvPip} install jsonschema`);
        
        const { stdout } = await execAsync(`${venvPip} show jsonschema`);
        expect(stdout).toContain('Version:');
      }
    });

    it('should freeze and restore package environments', async () => {
      const venvPip = path.join(venvPath, 'bin', 'pip');
      
      // Freeze current environment
      const { stdout: frozenPackages } = await execAsync(`${venvPip} freeze`);
      const freezeFile = path.join(pythonTestDir, 'frozen-requirements.txt');
      await fs.writeFile(freezeFile, frozenPackages);
      
      // Create new environment for restoration
      const restoreVenv = path.join(pythonTestDir, 'restore-venv');
      await execAsync(`python3 -m venv ${restoreVenv}`);
      
      const restorePip = path.join(restoreVenv, 'bin', 'pip');
      
      // Install from frozen requirements
      await execAsync(`${restorePip} install -r ${freezeFile}`);
      
      // Compare package lists
      const { stdout: originalList } = await execAsync(`${venvPip} list --format=json`);
      const { stdout: restoredList } = await execAsync(`${restorePip} list --format=json`);
      
      const originalPkgs = JSON.parse(originalList);
      const restoredPkgs = JSON.parse(restoredList);
      
      // Should have similar package counts (accounting for possible differences in pip/setuptools versions)
      expect(Math.abs(originalPkgs.length - restoredPkgs.length)).toBeLessThanOrEqual(2);
    });
  });

  describe('Test Runner Integration', () => {
    it('should run pytest with various configurations', async () => {
      const venvPython = path.join(venvPath, 'bin', 'python');
      const venvPytest = path.join(venvPath, 'bin', 'pytest');
      
      // Create test files
      const testFile = path.join(testProjectDir, 'tests', 'test_basic.py');
      await fs.writeFile(testFile, `
import pytest
import unittest

def test_simple_assertion():
    assert 1 + 1 == 2

def test_with_fixture():
    data = {'key': 'value'}
    assert data['key'] == 'value'

class TestClass:
    def test_method(self):
        assert True
    
    def test_parametrized(self):
        for i in range(3):
            assert i >= 0

@pytest.mark.slow
def test_slow_operation():
    import time
    time.sleep(0.1)
    assert True
`);
      
      // Run pytest with different options
      const { stdout: basicRun } = await execAsync(`${venvPytest} ${testFile} -v`, {
        cwd: testProjectDir
      });
      expect(basicRun).toContain('PASSED');
      expect(basicRun).toContain('test_simple_assertion');
      
      // Run with markers
      const { stdout: markerRun } = await execAsync(`${venvPytest} ${testFile} -m "not slow" -v`, {
        cwd: testProjectDir
      });
      expect(markerRun).not.toContain('test_slow_operation');
      
      // Run with collection only
      const { stdout: collectOnly } = await execAsync(`${venvPytest} ${testFile} --collect-only`, {
        cwd: testProjectDir
      });
      expect(collectOnly).toContain('test_simple_assertion');
      expect(collectOnly).toContain('TestClass::test_method');
    });

    it('should run unittest discovery and execution', async () => {
      const venvPython = path.join(venvPath, 'bin', 'python');
      
      // Create unittest test file
      const unittestFile = path.join(testProjectDir, 'tests', 'test_unittest_style.py');
      await fs.writeFile(unittestFile, `
import unittest
import json
import tempfile
import os

class TestBasicFunctionality(unittest.TestCase):
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
    
    def tearDown(self):
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_basic_assertions(self):
        self.assertEqual(1 + 1, 2)
        self.assertTrue(True)
        self.assertFalse(False)
    
    def test_json_operations(self):
        data = {'test': 'value', 'number': 42}
        json_str = json.dumps(data)
        parsed = json.loads(json_str)
        self.assertEqual(parsed['test'], 'value')
        self.assertEqual(parsed['number'], 42)
    
    def test_file_operations(self):
        test_file = os.path.join(self.temp_dir, 'test.txt')
        with open(test_file, 'w') as f:
            f.write('test content')
        
        with open(test_file, 'r') as f:
            content = f.read()
        
        self.assertEqual(content, 'test content')

if __name__ == '__main__':
    unittest.main()
`);
      
      // Run unittest discovery
      const { stdout: unittestRun } = await execAsync(
        `${venvPython} -m unittest discover -s tests -p "test_*.py" -v`,
        { cwd: testProjectDir }
      );
      
      expect(unittestRun).toContain('test_basic_assertions');
      expect(unittestRun).toContain('test_json_operations');
      expect(unittestRun).toContain('test_file_operations');
      expect(unittestRun).toContain('OK');
    });
  });

  describe('Coverage Tools Integration', () => {
    it('should generate line and branch coverage reports', async () => {
      const venvPython = path.join(venvPath, 'bin', 'python');
      const venvCoverage = path.join(venvPath, 'bin', 'coverage');
      
      // Create source code to test
      const srcFile = path.join(testProjectDir, 'src', 'calculator.py');
      await fs.writeFile(srcFile, `
def add(a, b):
    """Add two numbers."""
    return a + b

def divide(a, b):
    """Divide two numbers with error handling."""
    if b == 0:
        raise ValueError("Cannot divide by zero")
    return a / b

def complex_function(x):
    """Function with multiple branches."""
    if x > 10:
        result = x * 2
    elif x > 5:
        result = x + 10
    else:
        result = x
    
    if result > 20:
        return result * 1.1
    else:
        return result

class Calculator:
    def __init__(self):
        self.history = []
    
    def calculate(self, operation, a, b):
        if operation == 'add':
            result = add(a, b)
        elif operation == 'divide':
            result = divide(a, b)
        else:
            raise ValueError(f"Unknown operation: {operation}")
        
        self.history.append((operation, a, b, result))
        return result
    
    def get_history(self):
        return self.history.copy()
`);
      
      // Create test for the source code
      const testFile = path.join(testProjectDir, 'tests', 'test_calculator.py');
      await fs.writeFile(testFile, `
import pytest
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from calculator import add, divide, complex_function, Calculator

def test_add():
    assert add(2, 3) == 5
    assert add(-1, 1) == 0

def test_divide():
    assert divide(10, 2) == 5
    
    with pytest.raises(ValueError):
        divide(10, 0)

def test_complex_function_partial():
    # Only test some branches to demonstrate coverage
    result = complex_function(15)  # x > 10 branch
    assert result == 33.0  # 15 * 2 * 1.1
    
    result = complex_function(3)   # x <= 5 branch  
    assert result == 3

class TestCalculator:
    def test_calculator_add(self):
        calc = Calculator()
        result = calc.calculate('add', 5, 3)
        assert result == 8
        assert len(calc.get_history()) == 1
    
    def test_calculator_divide(self):
        calc = Calculator()
        result = calc.calculate('divide', 10, 2)
        assert result == 5
`);
      
      // Run tests with coverage
      await execAsync(
        `${venvCoverage} run --source=src --branch -m pytest tests/test_calculator.py -v`,
        { cwd: testProjectDir }
      );
      
      // Generate coverage report
      const { stdout: coverageReport } = await execAsync(
        `${venvCoverage} report`,
        { cwd: testProjectDir }
      );
      
      expect(coverageReport).toContain('calculator.py');
      expect(coverageReport).toMatch(/\d+%/);
      
      // Generate JSON coverage report
      await execAsync(
        `${venvCoverage} json -o coverage.json`,
        { cwd: testProjectDir }
      );
      
      // Verify JSON report
      const coverageJson = await fs.readFile(
        path.join(testProjectDir, 'coverage.json'),
        'utf-8'
      );
      const coverageData = JSON.parse(coverageJson);
      
      expect(coverageData.files).toBeDefined();
      expect(Object.keys(coverageData.files).length).toBeGreaterThan(0);
      
      // Check for branch coverage data
      const calculatorFile = Object.keys(coverageData.files).find(f => f.includes('calculator.py'));
      expect(calculatorFile).toBeDefined();
      
      if (calculatorFile) {
        const fileData = coverageData.files[calculatorFile];
        expect(fileData.summary.percent_covered).toBeGreaterThan(0);
        expect(fileData.summary.covered_lines).toBeGreaterThan(0);
      }
    });

    it('should generate HTML coverage reports', async () => {
      const venvCoverage = path.join(venvPath, 'bin', 'coverage');
      
      // Generate HTML report
      await execAsync(
        `${venvCoverage} html -d htmlcov`,
        { cwd: testProjectDir }
      );
      
      // Verify HTML files exist
      const htmlDir = path.join(testProjectDir, 'htmlcov');
      const htmlDirExists = await fs.access(htmlDir).then(() => true).catch(() => false);
      expect(htmlDirExists).toBe(true);
      
      const indexFile = path.join(htmlDir, 'index.html');
      const indexExists = await fs.access(indexFile).then(() => true).catch(() => false);
      expect(indexExists).toBe(true);
      
      // Check HTML content
      const htmlContent = await fs.readFile(indexFile, 'utf-8');
      expect(htmlContent).toContain('Coverage report');
      expect(htmlContent).toContain('calculator.py');
    });
  });

  describe('BDD Framework Integration (Behave/Cucumber-Python)', () => {
    it('should setup and run BDD tests with behave', async () => {
      const venvPython = path.join(venvPath, 'bin', 'python');
      const venvBehave = path.join(venvPath, 'bin', 'behave');
      
      // Create BDD feature file
      const featureFile = path.join(testProjectDir, 'features', 'calculator.feature');
      await fs.writeFile(featureFile, `
Feature: Calculator functionality
  As a user
  I want to perform calculations
  So that I can solve mathematical problems

  Scenario: Adding two numbers
    Given I have a calculator
    When I add 5 and 3
    Then the result should be 8

  Scenario: Dividing numbers
    Given I have a calculator
    When I divide 10 by 2
    Then the result should be 5

  Scenario: Division by zero error
    Given I have a calculator
    When I divide 10 by 0
    Then I should get a division error
`);
      
      // Create step definitions
      const stepsDir = path.join(testProjectDir, 'features', 'steps');
      await fs.mkdir(stepsDir, { recursive: true });
      
      const stepsFile = path.join(stepsDir, 'calculator_steps.py');
      await fs.writeFile(stepsFile, `
from behave import given, when, then
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src'))

from calculator import Calculator

@given('I have a calculator')
def step_given_calculator(context):
    context.calculator = Calculator()

@when('I add {a:d} and {b:d}')
def step_when_add(context, a, b):
    context.result = context.calculator.calculate('add', a, b)

@when('I divide {a:d} by {b:d}')
def step_when_divide(context, a, b):
    try:
        context.result = context.calculator.calculate('divide', a, b)
        context.error = None
    except Exception as e:
        context.error = e
        context.result = None

@then('the result should be {expected:d}')
def step_then_result(context, expected):
    assert context.result == expected

@then('I should get a division error')
def step_then_division_error(context):
    assert context.error is not None
    assert 'zero' in str(context.error).lower()
`);
      
      // Run behave tests
      const { stdout: behaveOutput } = await execAsync(
        `${venvBehave} features/ -v`,
        { cwd: testProjectDir }
      );
      
      expect(behaveOutput).toContain('Feature: Calculator functionality');
      expect(behaveOutput).toContain('Scenario: Adding two numbers');
      expect(behaveOutput).toContain('passed');
    });

    it('should generate BDD test reports', async () => {
      const venvBehave = path.join(venvPath, 'bin', 'behave');
      
      // Run behave with JSON formatter
      const reportFile = path.join(testProjectDir, 'bdd-report.json');
      await execAsync(
        `${venvBehave} features/ -f json -o ${reportFile}`,
        { cwd: testProjectDir }
      );
      
      // Verify report file
      const reportExists = await fs.access(reportFile).then(() => true).catch(() => false);
      expect(reportExists).toBe(true);
      
      const reportContent = await fs.readFile(reportFile, 'utf-8');
      const reportData = JSON.parse(reportContent);
      
      expect(Array.isArray(reportData)).toBe(true);
      expect(reportData.length).toBeGreaterThan(0);
      
      // Check feature structure
      const feature = reportData[0];
      expect(feature.name).toContain('Calculator functionality');
      expect(feature.elements).toBeDefined();
      expect(feature.elements.length).toBeGreaterThan(0);
    });
  });

  describe('Coverage Analysis and Class-Level Metrics', () => {
    it('should analyze class-level coverage metrics', async () => {
      const venvCoverage = path.join(venvPath, 'bin', 'coverage');
      const venvPython = path.join(venvPath, 'bin', 'python');
      
      // Create a more complex class for coverage analysis
      const complexClass = path.join(testProjectDir, 'src', 'complex_calculator.py');
      await fs.writeFile(complexClass, `
class AdvancedCalculator:
    def __init__(self):
        self.memory = 0
        self.operations_count = 0
    
    def add(self, a, b):
        self.operations_count += 1
        return a + b
    
    def subtract(self, a, b):
        self.operations_count += 1
        return a - b
    
    def multiply(self, a, b):
        self.operations_count += 1
        return a * b
    
    def divide(self, a, b):
        self.operations_count += 1
        if b == 0:
            raise ValueError("Division by zero")
        return a / b
    
    def store_in_memory(self, value):
        self.memory = value
    
    def recall_memory(self):
        return self.memory
    
    def clear_memory(self):
        self.memory = 0
    
    def get_statistics(self):
        return {
            'operations_count': self.operations_count,
            'memory_value': self.memory
        }
`);
      
      // Create partial test to demonstrate coverage gaps
      const partialTestFile = path.join(testProjectDir, 'tests', 'test_advanced_calculator.py');
      await fs.writeFile(partialTestFile, `
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from complex_calculator import AdvancedCalculator

def test_basic_operations():
    calc = AdvancedCalculator()
    
    # Test add and multiply (but not subtract/divide)
    assert calc.add(2, 3) == 5
    assert calc.multiply(4, 5) == 20
    
    # Test memory operations (but not clear_memory)
    calc.store_in_memory(42)
    assert calc.recall_memory() == 42
    
    # Test statistics
    stats = calc.get_statistics()
    assert stats['operations_count'] == 2
    assert stats['memory_value'] == 42
`);
      
      // Run tests with coverage
      await execAsync(
        `${venvCoverage} run --source=src --branch -m pytest tests/test_advanced_calculator.py -v`,
        { cwd: testProjectDir }
      );
      
      // Generate detailed coverage report
      const { stdout: detailedReport } = await execAsync(
        `${venvCoverage} report --show-missing`,
        { cwd: testProjectDir }
      );
      
      expect(detailedReport).toContain('complex_calculator.py');
      expect(detailedReport).toMatch(/\d+\s+\d+\s+\d+%/);
      
      // Generate JSON report for programmatic analysis
      await execAsync(
        `${venvCoverage} json -o detailed-coverage.json`,
        { cwd: testProjectDir }
      );
      
      const detailedJson = await fs.readFile(
        path.join(testProjectDir, 'detailed-coverage.json'),
        'utf-8'
      );
      const detailedData = JSON.parse(detailedJson);
      
      // Analyze class coverage
      const classFile = Object.keys(detailedData.files).find(f => f.includes('complex_calculator.py'));
      expect(classFile).toBeDefined();
      
      if (classFile) {
        const fileData = detailedData.files[classFile];
        expect(fileData.summary.percent_covered).toBeLessThan(100); // Should have uncovered lines
        expect(fileData.missing_lines.length).toBeGreaterThan(0); // Should have missing lines
        expect(fileData.summary.covered_lines).toBeGreaterThan(0);
      }
    });

    it('should measure branch coverage accurately', async () => {
      const venvCoverage = path.join(venvPath, 'bin', 'coverage');
      
      // Create a comprehensive test to achieve better branch coverage
      const comprehensiveTest = path.join(testProjectDir, 'tests', 'test_branches.py');
      await fs.writeFile(comprehensiveTest, `
import pytest
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from complex_calculator import AdvancedCalculator
from calculator import complex_function, divide

def test_all_branches_complex_function():
    # Test all branches of complex_function
    assert complex_function(15) == 33.0  # x > 10, result > 20
    assert complex_function(8) == 18     # 5 < x <= 10, result <= 20
    assert complex_function(3) == 3      # x <= 5, result <= 20

def test_all_calculator_operations():
    calc = AdvancedCalculator()
    
    # Test all operations
    assert calc.add(2, 3) == 5
    assert calc.subtract(5, 2) == 3
    assert calc.multiply(4, 3) == 12
    assert calc.divide(10, 2) == 5
    
    # Test memory operations
    calc.store_in_memory(100)
    assert calc.recall_memory() == 100
    calc.clear_memory()
    assert calc.recall_memory() == 0

def test_error_handling():
    calc = AdvancedCalculator()
    
    # Test division by zero
    with pytest.raises(ValueError, match="Division by zero"):
        calc.divide(10, 0)
        
    # Test using function directly
    with pytest.raises(ValueError, match="Cannot divide by zero"):
        divide(5, 0)
`);
      
      // Run comprehensive tests with branch coverage
      await execAsync(
        `${venvCoverage} run --source=src --branch -m pytest tests/test_branches.py -v`,
        { cwd: testProjectDir }
      );
      
      // Generate branch coverage report
      const { stdout: branchReport } = await execAsync(
        `${venvCoverage} report --show-missing`,
        { cwd: testProjectDir }
      );
      
      expect(branchReport).toContain('complex_calculator.py');
      
      // Generate JSON for branch analysis
      await execAsync(
        `${venvCoverage} json -o branch-coverage.json`,
        { cwd: testProjectDir }
      );
      
      const branchJson = await fs.readFile(
        path.join(testProjectDir, 'branch-coverage.json'),
        'utf-8'
      );
      const branchData = JSON.parse(branchJson);
      
      // Verify branch coverage data
      const classFile = Object.keys(branchData.files).find(f => f.includes('complex_calculator.py'));
      if (classFile) {
        const fileData = branchData.files[classFile];
        expect(fileData.summary.percent_covered).toBeGreaterThan(80); // Should have good coverage
        
        // Should have branch data if coverage supports it
        if (fileData.summary.num_branches) {
          expect(fileData.summary.num_branches).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Test-as-Manual Integration', () => {
    it('should generate manual test procedures from automated tests', async () => {
      const venvPython = path.join(venvPath, 'bin', 'python');
      
      // Create a test with detailed comments for manual generation
      const manualTestFile = path.join(testProjectDir, 'tests', 'test_manual_procedures.py');
      await fs.writeFile(manualTestFile, `
"""
Manual Test Procedures for Python Environment
This test file contains procedures that can be converted to manual tests
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from calculator import Calculator

def test_user_workflow_add_numbers():
    """
    Manual Test: User adds two numbers using calculator
    
    Steps:
    1. Create calculator instance
    2. Input first number: 10
    3. Input second number: 5
    4. Select add operation
    5. Verify result is 15
    6. Check operation is recorded in history
    """
    # Step 1: Create calculator instance
    calc = Calculator()
    
    # Steps 2-4: Perform calculation
    result = calc.calculate('add', 10, 5)
    
    # Step 5: Verify result
    assert result == 15
    
    # Step 6: Check history
    history = calc.get_history()
    assert len(history) == 1
    assert history[0] == ('add', 10, 5, 15)

def test_error_handling_workflow():
    """
    Manual Test: Error handling when dividing by zero
    
    Steps:
    1. Create calculator instance
    2. Input dividend: 10
    3. Input divisor: 0
    4. Select divide operation
    5. Verify error message is displayed
    6. Verify no result is stored in history
    """
    # Step 1: Create calculator
    calc = Calculator()
    
    # Steps 2-4: Attempt division by zero
    try:
        calc.calculate('divide', 10, 0)
        assert False, "Should have raised an error"
    except ValueError as e:
        # Step 5: Verify error message
        assert 'zero' in str(e).lower()
    
    # Step 6: Verify no history entry
    history = calc.get_history()
    assert len(history) == 0
`);
      
      // Run manual procedure tests
      const { stdout: manualTestOutput } = await execAsync(
        `${venvPython} -m pytest tests/test_manual_procedures.py -v`,
        { cwd: testProjectDir }
      );
      
      expect(manualTestOutput).toContain('test_user_workflow_add_numbers');
      expect(manualTestOutput).toContain('test_error_handling_workflow');
      expect(manualTestOutput).toContain('PASSED');
      
      // Extract manual test documentation
      const testContent = await fs.readFile(manualTestFile, 'utf-8');
      const manualDocPath = path.join(testProjectDir, 'manual-test-procedures.md');
      
      // Generate manual test documentation
      const manualDoc = extractManualTestProcedures(testContent);
      await fs.writeFile(manualDocPath, manualDoc);
      
      const manualDocExists = await fs.access(manualDocPath).then(() => true).catch(() => false);
      expect(manualDocExists).toBe(true);
      
      const docContent = await fs.readFile(manualDocPath, 'utf-8');
      expect(docContent).toContain('Manual Test Procedures');
      expect(docContent).toContain('User adds two numbers');
    });
  });

  describe('IDE Integration and Environment Detection', () => {
    it('should provide environment information for IDE integration', async () => {
      const venvPython = path.join(venvPath, 'bin', 'python');
      
      // Create environment detection script
      const envScript = path.join(pythonTestDir, 'detect_environment.py');
      await fs.writeFile(envScript, `
import sys
import os
import json
import site
from pathlib import Path

def get_environment_info():
    """Get comprehensive Python environment information for IDE integration"""
    
    # Get virtual environment info
    venv_path = os.environ.get('VIRTUAL_ENV')
    if not venv_path and hasattr(sys, 'prefix') and hasattr(sys, 'base_prefix'):
        is_venv = sys.prefix != sys.base_prefix
        if is_venv:
            venv_path = sys.prefix
    
    # Get package locations
    site_packages = site.getsitepackages()
    user_site = site.getusersitepackages()
    
    # Get installed packages
    try:
        import pkg_resources
        installed = [(d.project_name, d.version) for d in pkg_resources.working_set]
    except ImportError:
        installed = []
    
    env_info = {
        'python_version': sys.version,
        'python_executable': sys.executable,
        'python_prefix': sys.prefix,
        'python_path': sys.path,
        'virtual_env': venv_path,
        'is_virtual_env': venv_path is not None,
        'site_packages': site_packages,
        'user_site': user_site,
        'platform': sys.platform,
        'installed_packages': installed,
        'working_directory': os.getcwd()
    }
    
    return env_info

if __name__ == '__main__':
    info = get_environment_info()
    print(json.dumps(info, indent=2, default=str))
`);
      
      // Run environment detection
      const { stdout: envInfo } = await execAsync(`${venvPython} ${envScript}`);
      const environmentData = JSON.parse(envInfo);
      
      expect(environmentData.python_version).toMatch(/3\.\d+\.\d+/);
      expect(environmentData.python_executable).toContain('test-venv');
      expect(environmentData.is_virtual_env).toBe(true);
      expect(environmentData.virtual_env).toContain('test-venv');
      expect(Array.isArray(environmentData.installed_packages)).toBe(true);
      expect(environmentData.platform).toBeDefined();
    });

    it('should detect Python tools and extensions for IDE', async () => {
      const venvPython = path.join(venvPath, 'bin', 'python');
      
      // Create tool detection script
      const toolScript = path.join(pythonTestDir, 'detect_tools.py');
      await fs.writeFile(toolScript, `
import subprocess
import json
import sys

def check_tool(command):
    """Check if a tool is available"""
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=10)
        return {
            'available': result.returncode == 0,
            'version': result.stdout.strip(),
            'error': result.stderr.strip() if result.returncode != 0 else None
        }
    except Exception as e:
        return {
            'available': False,
            'error': str(e)
        }

tools_to_check = [
    (['python3', '--version'], 'python'),
    (['python3', '-m', 'pip', '--version'], 'pip'),
    (['python3', '-m', 'pytest', '--version'], 'pytest'),
    (['python3', '-m', 'coverage', '--version'], 'coverage'),
    (['python3', '-m', 'behave', '--version'], 'behave'),
    (['uv', '--version'], 'uv')
]

tools_status = {}
for command, name in tools_to_check:
    tools_status[name] = check_tool(command)

print(json.dumps(tools_status, indent=2))
`);
      
      // Run tool detection
      const { stdout: toolsInfo } = await execAsync(`${venvPython} ${toolScript}`);
      const toolsData = JSON.parse(toolsInfo);
      
      // Verify core tools
      expect(toolsData.python.available).toBe(true);
      expect(toolsData.pip.available).toBe(true);
      expect(toolsData.pytest.available).toBe(true);
      expect(toolsData.coverage.available).toBe(true);
      expect(toolsData.behave.available).toBe(true);
      
      // UV might not be available
      if (toolsData.uv.available) {
        console.log('UV tool is available:', toolsData.uv.version);
      } else {
        console.log('UV tool not available (using pip fallback)');
      }
    });
  });

  describe('Python Environment Integration with External Systems', () => {
    it('should integrate with external log library', async () => {
      const venvPython = path.join(venvPath, 'bin', 'python');
      
      // Create Python script that integrates with external logging
      const logIntegrationScript = path.join(testProjectDir, 'src', 'log_integration.py');
      await fs.writeFile(logIntegrationScript, `
import logging
import json
import sys
from datetime import datetime

class ExternalLogIntegrator:
    def __init__(self):
        self.setup_logging()
    
    def setup_logging(self):
        """Setup logging that can be captured by external log library"""
        # Configure JSON logging for external capture
        class JsonFormatter(logging.Formatter):
            def format(self, record):
                log_entry = {
                    'timestamp': datetime.fromtimestamp(record.created).isoformat(),
                    'level': record.levelname,
                    'logger': record.name,
                    'message': record.getMessage(),
                    'module': record.module,
                    'function': record.funcName,
                    'line': record.lineno,
                    'process_id': record.process,
                    'thread_id': record.thread
                }
                return json.dumps(log_entry)
        
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JsonFormatter())
        
        self.logger = logging.getLogger('python_integration')
        self.logger.addHandler(handler)
        self.logger.setLevel(logging.DEBUG)
    
    def perform_operations(self):
        """Perform operations with logging"""
        self.logger.info('Starting Python operations')
        
        try:
            # Simulate some work
            result = sum(range(1000))
            self.logger.debug(f'Calculation result: {result}')
            
            # Simulate external API call
            import time
            time.sleep(0.1)
            self.logger.info('External API call completed')
            
            return result
        except Exception as e:
            self.logger.error(f'Operation failed: {str(e)}')
            raise
        finally:
            self.logger.info('Python operations completed')

if __name__ == '__main__':
    integrator = ExternalLogIntegrator()
    result = integrator.perform_operations()
    print(f'RESULT:{result}', file=sys.stderr)  # Result on stderr for separation
`);
      
      // Run log integration test
      const proc = spawn(venvPython, [logIntegrationScript]);
      
      const logs: string[] = [];
      let result: string = '';
      
      proc.stdout.on('data', (data) => {
        logs.push(data.toString());
      });
      
      proc.stderr.on('data', (data) => {
        result += data.toString();
      });
      
      const exitCode = await new Promise<number>((resolve) => {
        proc.on('close', (code) => resolve(code || 0));
      });
      
      expect(exitCode).toBe(0);
      expect(result).toContain('RESULT:499500');
      expect(logs.length).toBeGreaterThan(0);
      
      // Parse and verify log entries
      const parsedLogs = logs.map(log => {
        try {
          return JSON.parse(log.trim());
        } catch {
          return null;
        }
      }).filter(log => log !== null);
      
      expect(parsedLogs.length).toBeGreaterThan(0);
      
      const hasStartLog = parsedLogs.some(log => log.message === 'Starting Python operations');
      const hasCompleteLog = parsedLogs.some(log => log.message === 'Python operations completed');
      
      expect(hasStartLog).toBe(true);
      expect(hasCompleteLog).toBe(true);
    });

    it('should test Python subprocess management', async () => {
      const venvPython = path.join(venvPath, 'bin', 'python');
      
      // Create subprocess test script
      const subprocessScript = path.join(pythonTestDir, 'subprocess_test.py');
      await fs.writeFile(subprocessScript, `
import subprocess
import json
import sys
import time

def run_python_subprocess():
    """Test subprocess execution from Python"""
    
    # Create a simple Python script to run as subprocess
    script_content = '''
import time
import json
time.sleep(0.1)
result = {"status": "success", "data": [1, 2, 3]}
print(json.dumps(result))
'''
    
    # Write temporary script
    with open('temp_script.py', 'w') as f:
        f.write(script_content)
    
    try:
        # Run subprocess
        start_time = time.time()
        result = subprocess.run(
            [sys.executable, 'temp_script.py'],
            capture_output=True,
            text=True,
            timeout=5
        )
        end_time = time.time()
        
        execution_info = {
            'return_code': result.returncode,
            'stdout': result.stdout.strip(),
            'stderr': result.stderr.strip(),
            'execution_time': end_time - start_time
        }
        
        print(json.dumps(execution_info))
        
    finally:
        import os
        try:
            os.remove('temp_script.py')
        except:
            pass

if __name__ == '__main__':
    run_python_subprocess()
`);
      
      // Run subprocess test
      const { stdout: subprocessOutput } = await execAsync(
        `${venvPython} ${subprocessScript}`,
        { cwd: pythonTestDir }
      );
      
      const subprocessResult = JSON.parse(subprocessOutput);
      
      expect(subprocessResult.return_code).toBe(0);
      expect(subprocessResult.execution_time).toBeGreaterThan(0.1);
      expect(subprocessResult.execution_time).toBeLessThan(2);
      
      const stdoutData = JSON.parse(subprocessResult.stdout);
      expect(stdoutData.status).toBe('success');
      expect(stdoutData.data).toEqual([1, 2, 3]);
    });
  });

  describe('Advanced Python Environment Features', () => {
    it('should test Python module import and PYTHONPATH manipulation', async () => {
      const venvPython = path.join(venvPath, 'bin', 'python');
      
      // Create custom module
      const moduleDir = path.join(testProjectDir, 'custom_modules');
      await fs.mkdir(moduleDir, { recursive: true });
      
      const customModule = path.join(moduleDir, 'custom_math.py');
      await fs.writeFile(customModule, `
def advanced_add(a, b, multiplier=1):
    """Advanced addition with optional multiplier"""
    return (a + b) * multiplier

def fibonacci(n):
    """Generate fibonacci sequence"""
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

CONSTANT_VALUE = 42
`);
      
      // Create test that imports custom module
      const moduleTestScript = path.join(pythonTestDir, 'test_module_import.py');
      await fs.writeFile(moduleTestScript, `
import sys
import os
import json

# Add custom module to path
sys.path.insert(0, '${moduleDir}')

try:
    import custom_math
    
    # Test module functions
    result1 = custom_math.advanced_add(5, 3, 2)
    result2 = custom_math.fibonacci(6)
    constant = custom_math.CONSTANT_VALUE
    
    test_results = {
        'import_success': True,
        'advanced_add_result': result1,
        'fibonacci_result': result2,
        'constant_value': constant,
        'module_path': custom_math.__file__
    }
    
except ImportError as e:
    test_results = {
        'import_success': False,
        'error': str(e)
    }

print(json.dumps(test_results))
`);
      
      // Run module import test
      const { stdout: moduleOutput } = await execAsync(`${venvPython} ${moduleTestScript}`);
      const moduleResult = JSON.parse(moduleOutput);
      
      expect(moduleResult.import_success).toBe(true);
      expect(moduleResult.advanced_add_result).toBe(16); // (5+3)*2
      expect(moduleResult.fibonacci_result).toBe(8);     // fibonacci(6)
      expect(moduleResult.constant_value).toBe(42);
      expect(moduleResult.module_path).toContain('custom_math.py');
    });

    it('should test Python environment variables and configuration', async () => {
      const venvPython = path.join(venvPath, 'bin', 'python');
      
      // Create environment configuration test
      const envConfigScript = path.join(pythonTestDir, 'test_env_config.py');
      await fs.writeFile(envConfigScript, `
import os
import sys
import json

# Test environment variable access
test_env_var = 'PYTHON_TEST_VAR'
os.environ[test_env_var] = 'test_value_123'

# Get various environment configurations
env_config = {
    'environment_variables': {
        'PYTHONPATH': os.environ.get('PYTHONPATH'),
        'VIRTUAL_ENV': os.environ.get('VIRTUAL_ENV'),
        'PATH': os.environ.get('PATH', '')[:200] + '...',  # Truncate for readability
        'PYTHON_TEST_VAR': os.environ.get(test_env_var)
    },
    'python_flags': {
        'debug': sys.flags.debug,
        'inspect': sys.flags.inspect,
        'interactive': sys.flags.interactive,
        'optimize': sys.flags.optimize,
        'verbose': sys.flags.verbose
    },
    'system_info': {
        'platform': sys.platform,
        'version_info': list(sys.version_info),
        'api_version': sys.api_version,
        'max_size': sys.maxsize
    }
}

print(json.dumps(env_config, indent=2))
`);
      
      // Run with custom environment variable
      const { stdout: envConfigOutput } = await execAsync(
        `PYTHON_CUSTOM_CONFIG=enabled ${venvPython} ${envConfigScript}`
      );
      
      const envConfig = JSON.parse(envConfigOutput);
      
      expect(envConfig.environment_variables.PYTHON_TEST_VAR).toBe('test_value_123');
      expect(envConfig.system_info.platform).toBeDefined();
      expect(envConfig.system_info.version_info[0]).toBe(3); // Python 3.x
      expect(typeof envConfig.system_info.max_size).toBe('number');
    });
  });

  describe('Integration with Test-as-Manual Framework', () => {
    it('should convert pytest tests to manual procedures', async () => {
      const venvPython = path.join(venvPath, 'bin', 'python');
      
      // Create converter script
      const converterScript = path.join(pythonTestDir, 'test_to_manual_converter.py');
      await fs.writeFile(converterScript, `
import ast
import json
import re

def extract_test_procedures(file_path):
    """Extract manual test procedures from Python test files"""
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    try:
        tree = ast.parse(content)
    except SyntaxError:
        return []
    
    procedures = []
    
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name.startswith('test_'):
            docstring = ast.get_docstring(node)
            
            if docstring and 'Manual Test:' in docstring:
                # Extract manual test information
                lines = docstring.split('\n')
                title = ''
                steps = []
                
                for line in lines:
                    line = line.strip()
                    if line.startswith('Manual Test:'):
                        title = line.replace('Manual Test:', '').strip()
                    elif line and line[0].isdigit() and '.' in line:
                        steps.append(line)
                
                procedures.append({
                    'function_name': node.name,
                    'title': title,
                    'steps': steps,
                    'line_number': node.lineno
                })
    
    return procedures

if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1:
        procedures = extract_test_procedures(sys.argv[1])
        print(json.dumps(procedures, indent=2))
    else:
        print('Usage: python script.py <test_file>')
`);
      
      // Run converter on our manual test file
      const manualTestFile = path.join(testProjectDir, 'tests', 'test_manual_procedures.py');
      const { stdout: extractedProcedures } = await execAsync(
        `${venvPython} ${converterScript} ${manualTestFile}`
      );
      
      const procedures = JSON.parse(extractedProcedures);
      
      expect(procedures.length).toBeGreaterThan(0);
      
      const addWorkflow = procedures.find((p: any) => p.function_name === 'test_user_workflow_add_numbers');
      expect(addWorkflow).toBeDefined();
      expect(addWorkflow.title).toContain('adds two numbers');
      expect(addWorkflow.steps.length).toBeGreaterThan(3);
    });

    it('should generate comprehensive test documentation', async () => {
      // Generate comprehensive test documentation
      const docPath = path.join(testProjectDir, 'PYTHON_TEST_DOCUMENTATION.md');
      
      const documentation = `
# Python Environment Test Documentation

## Environment Setup

### Virtual Environment
- **Location**: ${venvPath}
- **Python Version**: $(python3 --version)
- **Pip Version**: $(python3 -m pip --version)

### Installed Packages
$(cat ${testProjectDir}/requirements.txt)

### Configuration Files
- **pyproject.toml**: Project configuration and dependencies
- **setup.cfg**: Testing and coverage configuration
- **requirements.txt**: Package specifications

## Test Coverage Areas

### 1. Virtual Environment Management
- Environment creation and activation
- Package isolation verification
- Environment switching and management

### 2. Package Management
- Installation from requirements.txt
- Dependency resolution
- Package freezing and restoration

### 3. Test Framework Integration
- Pytest configuration and execution
- Unittest discovery and running
- BDD testing with behave

### 4. Coverage Analysis
- Line coverage measurement
- Branch coverage analysis
- Class and method level metrics
- HTML and JSON report generation

### 5. IDE Integration
- Environment detection
- Tool availability checking
- Configuration management

### 6. External System Integration
- Log capture and forwarding
- Subprocess management
- Inter-process communication

## Manual Test Procedures

See generated manual test procedures in manual-test-procedures.md
`;
      
      await fs.writeFile(docPath, documentation);
      
      const docExists = await fs.access(docPath).then(() => true).catch(() => false);
      expect(docExists).toBe(true);
      
      const docContent = await fs.readFile(docPath, 'utf-8');
      expect(docContent).toContain('Python Environment Test Documentation');
      expect(docContent).toContain('Virtual Environment Management');
      expect(docContent).toContain('Coverage Analysis');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle Python environment errors gracefully', async () => {
      // Test various error conditions
      
      // 1. Invalid Python command
      try {
        await execAsync('invalid-python-command --version');
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('Command failed');
      }
      
      // 2. Package installation error
      const venvPip = path.join(venvPath, 'bin', 'pip');
      try {
        await execAsync(`${venvPip} install non-existent-package-xyz-123`);
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('No matching distribution found');
      }
      
      // 3. Virtual environment creation in invalid location
      try {
        await execAsync('python3 -m venv /root/invalid-venv');
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('Permission denied');
      }
    });

    it('should handle resource constraints and limits', async () => {
      const venvPython = path.join(venvPath, 'bin', 'python');
      
      // Create resource-intensive test
      const resourceScript = path.join(pythonTestDir, 'resource_test.py');
      await fs.writeFile(resourceScript, `
import sys
import gc
import json
import time
import threading
import queue

def memory_test():
    """Test memory usage patterns"""
    initial_objects = len(gc.get_objects())
    
    # Create and delete large data structure
    large_list = [i for i in range(100000)]
    after_creation = len(gc.get_objects())
    
    del large_list
    gc.collect()
    after_cleanup = len(gc.get_objects())
    
    return {
        'initial_objects': initial_objects,
        'after_creation': after_creation,
        'after_cleanup': after_cleanup,
        'memory_recovered': after_creation - after_cleanup > 0
    }

def threading_test():
    """Test threading capabilities"""
    result_queue = queue.Queue()
    
    def worker(n):
        result = sum(range(n))
        result_queue.put(result)
    
    # Start multiple threads
    threads = []
    for i in range(3):
        thread = threading.Thread(target=worker, args=(1000,))
        threads.append(thread)
        thread.start()
    
    # Wait for completion
    for thread in threads:
        thread.join()
    
    # Collect results
    results = []
    while not result_queue.empty():
        results.append(result_queue.get())
    
    return {
        'thread_count': len(threads),
        'results': results,
        'all_results_equal': len(set(results)) == 1
    }

if __name__ == '__main__':
    memory_result = memory_test()
    threading_result = threading_test()
    
    combined_result = {
        'memory_test': memory_result,
        'threading_test': threading_result
    }
    
    print(json.dumps(combined_result, indent=2))
`);
      
      // Run resource test
      const { stdout: resourceOutput } = await execAsync(`${venvPython} ${resourceScript}`);
      const resourceResult = JSON.parse(resourceOutput);
      
      expect(resourceResult.memory_test.initial_objects).toBeGreaterThan(0);
      expect(resourceResult.memory_test.after_creation).toBeGreaterThan(resourceResult.memory_test.initial_objects);
      
      expect(resourceResult.threading_test.thread_count).toBe(3);
      expect(resourceResult.threading_test.results.length).toBe(3);
      expect(resourceResult.threading_test.all_results_equal).toBe(true);
    });
  });

});
