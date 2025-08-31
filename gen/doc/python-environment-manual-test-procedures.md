# Manual Test Procedures for Python Environment System Tests

**Generated from**: `tests/system/python-environment-comprehensive.systest.ts`  
**Date**: $(date)  
**Test Suite**: Python Environment System Tests  
**Version**: 1.0.0

## Overview

This document provides manual test procedures derived from the automated Python environment system tests. These procedures can be executed manually to validate Python environment setup and functionality when automated testing is not available.

## Prerequisites

### Required Software
- Python 3.8 or higher
- pip (Python package installer)
- python3-venv (virtual environment module)
- Terminal/Command prompt access
- Text editor

### Environment Setup
1. Open terminal/command prompt
2. Navigate to project directory
3. Ensure Python 3 is accessible via `python3` command
4. Verify write permissions in project directory

## Test Procedures

### Test Group 1: Python Runtime Detection and Version Management

#### Manual Test 1.1: Python Installation Verification

**Objective**: Verify Python 3 is properly installed and accessible

**Steps**:
1. Open terminal/command prompt
2. Execute command: `python3 --version`
3. Verify output shows "Python 3.x.x" where x are version numbers
4. Execute command: `which python3` (Linux/macOS) or `where python3` (Windows)
5. Verify command returns valid path to Python executable

**Expected Results**:
- Python version 3.8 or higher is displayed
- Python executable path is valid and accessible
- No error messages appear

**Pass Criteria**: Both commands execute successfully and show expected output

---

#### Manual Test 1.2: Pip Installation and Functionality

**Objective**: Verify pip package manager is available and functional

**Steps**:
1. Execute command: `python3 -m pip --version`
2. Note the pip version displayed
3. Execute command: `python3 -m pip list --format=json`
4. Verify output is valid JSON with package list
5. Execute command: `python3 -m pip show pip`
6. Verify detailed information about pip package is displayed

**Expected Results**:
- Pip version information is displayed (pip 20.0 or higher recommended)
- JSON package list is returned without errors
- Detailed pip package information includes Name, Version, Summary

**Pass Criteria**: All commands execute without errors and return expected information

---

#### Manual Test 1.3: UV Tool Detection (Optional)

**Objective**: Check for UV tool availability and provide fallback guidance

**Steps**:
1. Execute command: `uv --version`
2. If successful, note the UV version
3. If command fails, execute: `python3 -m pip --version`
4. Verify pip is available as fallback
5. Execute command: `uv --help` (if UV is available)
6. Review UV functionality overview

**Expected Results**:
- If UV available: Version information and help text displayed
- If UV unavailable: Pip fallback works correctly
- Clear indication of which tool is being used

**Pass Criteria**: Either UV works correctly OR pip fallback is functional

---

### Test Group 2: Virtual Environment Management

#### Manual Test 2.1: Virtual Environment Creation

**Objective**: Create and verify virtual environment functionality

**Steps**:
1. Create test directory: `mkdir manual-test-venv`
2. Navigate to directory: `cd manual-test-venv`
3. Create virtual environment: `python3 -m venv test-venv`
4. Verify directory structure was created
5. Check for presence of: `test-venv/bin/python` (Linux/macOS) or `test-venv/Scripts/python.exe` (Windows)
6. List contents of virtual environment directory

**Expected Results**:
- Virtual environment directory created successfully
- Python executable present in venv/bin or venv/Scripts
- Directory structure includes lib, include, and pyvenv.cfg files

**Pass Criteria**: Virtual environment created with complete directory structure

---

#### Manual Test 2.2: Virtual Environment Activation and Isolation

**Objective**: Verify virtual environment activation and package isolation

**Steps**:
1. Activate virtual environment:
   - Linux/macOS: `source test-venv/bin/activate`
   - Windows: `test-venv\Scripts\activate`
2. Verify prompt changes to show (test-venv)
3. Execute: `which python` or `where python`
4. Verify path points to virtual environment Python
5. Create test script `isolation_test.py`:
   ```python
   import sys
   print(f"Python executable: {sys.executable}")
   print(f"Python prefix: {sys.prefix}")
   ```
6. Execute script: `python isolation_test.py`
7. Verify paths contain virtual environment directory
8. Deactivate environment: `deactivate`
9. Verify prompt returns to normal

**Expected Results**:
- Environment activates successfully with prompt change
- Python paths point to virtual environment
- Script execution shows isolated environment paths
- Deactivation returns to system Python

**Pass Criteria**: Complete activation, isolation verification, and deactivation cycle

---

#### Manual Test 2.3: Package Installation in Virtual Environment

**Objective**: Test package installation and isolation within virtual environment

**Steps**:
1. Activate virtual environment (from Test 2.2)
2. Install test package: `pip install requests`
3. Verify installation: `pip show requests`
4. Create test script `package_test.py`:
   ```python
   try:
       import requests
       print("✓ requests imported successfully")
       print(f"Version: {requests.__version__}")
   except ImportError:
       print("✗ requests not found")
   ```
5. Execute script: `python package_test.py`
6. Deactivate environment: `deactivate`
7. Try importing requests in system Python: `python3 -c "import requests"`
8. Verify it fails (unless previously installed globally)

**Expected Results**:
- Package installs successfully in virtual environment
- Import works within activated environment
- Package not accessible outside virtual environment
- Clean separation between venv and system packages

**Pass Criteria**: Package isolated to virtual environment only

---

### Test Group 3: Package Management and Dependencies

#### Manual Test 3.1: Requirements.txt Installation

**Objective**: Test package installation from requirements file

**Steps**:
1. Create `requirements.txt` file with content:
   ```
   pytest==7.4.4
   coverage==7.4.4
   requests==2.31.0
   ```
2. Activate virtual environment
3. Install from requirements: `pip install -r requirements.txt`
4. Verify installations: `pip list`
5. Check specific versions: `pip show pytest coverage requests`
6. Verify all packages show correct versions

**Expected Results**:
- All packages install successfully
- Correct versions are installed
- No dependency conflicts reported
- All packages show in pip list

**Pass Criteria**: All specified packages installed with correct versions

---

#### Manual Test 3.2: Package Freezing and Restoration

**Objective**: Test environment replication through package freezing

**Steps**:
1. With packages installed (from Test 3.1), freeze environment: `pip freeze > frozen-requirements.txt`
2. Examine frozen-requirements.txt contents
3. Create new virtual environment: `python3 -m venv restore-test-venv`
4. Activate new environment: `source restore-test-venv/bin/activate`
5. Install from frozen requirements: `pip install -r frozen-requirements.txt`
6. Compare package lists: `pip list` vs original environment
7. Verify package versions match exactly

**Expected Results**:
- Freeze captures all installed packages with exact versions
- New environment installs identical package set
- Version numbers match exactly between environments
- No missing or extra packages

**Pass Criteria**: Environments are functionally identical after restoration

---

### Test Group 4: Testing Framework Integration

#### Manual Test 4.1: Pytest Setup and Execution

**Objective**: Verify pytest installation and basic functionality

**Steps**:
1. Ensure pytest is installed: `pip show pytest`
2. Create test directory: `mkdir tests`
3. Create test file `tests/test_basic.py`:
   ```python
   def test_simple_assertion():
       assert 1 + 1 == 2
   
   def test_string_operations():
       text = "hello world"
       assert text.upper() == "HELLO WORLD"
       assert len(text) == 11
   
   class TestClass:
       def test_method(self):
           assert True
   ```
4. Run pytest: `pytest tests/ -v`
5. Verify all tests pass
6. Run with collection only: `pytest tests/ --collect-only`
7. Verify test discovery works

**Expected Results**:
- Pytest executes without errors
- All test functions are discovered and executed
- Test results clearly show pass/fail status
- Verbose output shows individual test names

**Pass Criteria**: All tests pass and pytest functionality confirmed

---

#### Manual Test 4.2: Unittest Framework Integration

**Objective**: Test unittest discovery and execution capabilities

**Steps**:
1. Create unittest file `tests/test_unittest_style.py`:
   ```python
   import unittest
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
       
       def test_file_operations(self):
           test_file = os.path.join(self.temp_dir, 'test.txt')
           with open(test_file, 'w') as f:
               f.write('test content')
           
           with open(test_file, 'r') as f:
               content = f.read()
           
           self.assertEqual(content, 'test content')
   ```
2. Run unittest discovery: `python -m unittest discover -s tests -p "test_*.py" -v`
3. Verify tests execute and pass
4. Check setUp and tearDown execution

**Expected Results**:
- Unittest discovers and runs all test methods
- setUp and tearDown methods execute properly
- File operations work within test environment
- All assertions pass successfully

**Pass Criteria**: Unittest framework integrates and executes successfully

---

### Test Group 5: Coverage Analysis

#### Manual Test 5.1: Coverage Tool Installation and Basic Usage

**Objective**: Verify coverage analysis functionality

**Steps**:
1. Ensure coverage is installed: `pip show coverage`
2. Create source file `src/calculator.py`:
   ```python
   def add(a, b):
       return a + b
   
   def divide(a, b):
       if b == 0:
           raise ValueError("Cannot divide by zero")
       return a / b
   
   def complex_function(x):
       if x > 10:
           result = x * 2
       elif x > 5:
           result = x + 10
       else:
           result = x
       return result
   ```
3. Create test file `tests/test_calculator.py`:
   ```python
   import sys
   import os
   sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))
   
   from calculator import add, divide, complex_function
   
   def test_add():
       assert add(2, 3) == 5
   
   def test_divide():
       assert divide(10, 2) == 5
   
   def test_complex_function():
       assert complex_function(15) == 30  # x > 10
       assert complex_function(3) == 3    # x <= 5
   ```
4. Run tests with coverage: `coverage run --source=src -m pytest tests/test_calculator.py`
5. Generate report: `coverage report`
6. Generate HTML report: `coverage html`
7. Open htmlcov/index.html in browser

**Expected Results**:
- Coverage tool executes tests successfully
- Coverage report shows percentage coverage
- HTML report provides detailed line-by-line coverage
- Uncovered lines are clearly identified

**Pass Criteria**: Coverage analysis provides accurate code coverage metrics

---

### Test Group 6: BDD Framework Integration

#### Manual Test 6.1: Behave Framework Setup

**Objective**: Verify BDD testing with behave framework

**Steps**:
1. Ensure behave is installed: `pip show behave`
2. Create features directory: `mkdir features`
3. Create feature file `features/calculator.feature`:
   ```gherkin
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
   ```
4. Create steps directory: `mkdir features/steps`
5. Create step definitions `features/steps/calculator_steps.py`:
   ```python
   from behave import given, when, then
   import sys
   import os
   sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src'))
   
   from calculator import add, divide
   
   @given('I have a calculator')
   def step_given_calculator(context):
       context.result = None
   
   @when('I add {a:d} and {b:d}')
   def step_when_add(context, a, b):
       context.result = add(a, b)
   
   @when('I divide {a:d} by {b:d}')
   def step_when_divide(context, a, b):
       context.result = divide(a, b)
   
   @then('the result should be {expected:d}')
   def step_then_result(context, expected):
       assert context.result == expected
   ```
6. Run behave tests: `behave features/ -v`
7. Verify scenarios execute and pass

**Expected Results**:
- Behave discovers and parses feature files
- Step definitions are matched correctly
- All scenarios execute successfully
- Clear pass/fail reporting provided

**Pass Criteria**: BDD scenarios execute successfully with proper step matching

---

### Test Group 7: IDE Integration

#### Manual Test 7.1: Environment Detection

**Objective**: Verify environment can be detected and configured for IDE integration

**Steps**:
1. Create detection script `detect_environment.py`:
   ```python
   import sys
   import os
   import site
   from pathlib import Path
   
   def get_environment_info():
       venv_path = os.environ.get('VIRTUAL_ENV')
       if not venv_path and hasattr(sys, 'prefix') and hasattr(sys, 'base_prefix'):
           is_venv = sys.prefix != sys.base_prefix
           if is_venv:
               venv_path = sys.prefix
       
       site_packages = site.getsitepackages()
       
       env_info = {
           'python_version': sys.version,
           'python_executable': sys.executable,
           'python_prefix': sys.prefix,
           'virtual_env': venv_path,
           'is_virtual_env': venv_path is not None,
           'site_packages': site_packages,
           'platform': sys.platform,
           'working_directory': os.getcwd()
       }
       
       return env_info
   
   if __name__ == '__main__':
       import json
       info = get_environment_info()
       print(json.dumps(info, indent=2, default=str))
   ```
2. Execute with system Python: `python3 detect_environment.py`
3. Activate virtual environment and execute again
4. Compare outputs to verify environment detection
5. Note differences in python_executable and virtual_env fields

**Expected Results**:
- Script detects system vs virtual environment correctly
- Python executable paths differ between environments
- Virtual environment flag changes appropriately
- Site packages locations reflect environment isolation

**Pass Criteria**: Environment detection accurately identifies current Python context

---

### Test Group 8: Error Handling and Edge Cases

#### Manual Test 8.1: Error Condition Testing

**Objective**: Verify graceful handling of error conditions

**Steps**:
1. Test invalid Python command: `invalid-python-command --version`
2. Verify appropriate error message is displayed
3. Test package installation failure: `pip install non-existent-package-xyz-123`
4. Verify error handling and helpful message
5. Test virtual environment creation in restricted location:
   - Try: `python3 -m venv /root/invalid-venv` (if not running as root)
6. Verify permission error is handled gracefully
7. Test import of non-existent module:
   ```python
   try:
       import non_existent_module
   except ImportError as e:
       print(f"Expected error: {e}")
   ```
8. Verify error is caught and handled appropriately

**Expected Results**:
- Invalid commands produce clear error messages
- Package installation failures are reported with helpful information
- Permission errors provide guidance on resolution
- Import errors are handled gracefully

**Pass Criteria**: All error conditions handled gracefully with informative messages

---

## Test Execution Summary

### Manual Test Execution Checklist

- [ ] **Test Group 1**: Python Runtime Detection (3 tests)
  - [ ] 1.1: Python Installation Verification
  - [ ] 1.2: Pip Installation and Functionality  
  - [ ] 1.3: UV Tool Detection (Optional)

- [ ] **Test Group 2**: Virtual Environment Management (3 tests)
  - [ ] 2.1: Virtual Environment Creation
  - [ ] 2.2: Virtual Environment Activation and Isolation
  - [ ] 2.3: Package Installation in Virtual Environment

- [ ] **Test Group 3**: Package Management and Dependencies (2 tests)
  - [ ] 3.1: Requirements.txt Installation
  - [ ] 3.2: Package Freezing and Restoration

- [ ] **Test Group 4**: Testing Framework Integration (2 tests)
  - [ ] 4.1: Pytest Setup and Execution
  - [ ] 4.2: Unittest Framework Integration

- [ ] **Test Group 5**: Coverage Analysis (1 test)
  - [ ] 5.1: Coverage Tool Installation and Basic Usage

- [ ] **Test Group 6**: BDD Framework Integration (1 test)
  - [ ] 6.1: Behave Framework Setup

- [ ] **Test Group 7**: IDE Integration (1 test)
  - [ ] 7.1: Environment Detection

- [ ] **Test Group 8**: Error Handling and Edge Cases (1 test)
  - [ ] 8.1: Error Condition Testing

**Total Manual Tests**: 14  
**Estimated Execution Time**: 45-60 minutes  
**Prerequisites Setup Time**: 15-30 minutes

### Environment Validation Results

After completing all manual tests, document the results:

**System Information**:
- Operating System: ________________
- Python Version: ________________
- Virtual Environment Support: [ ] Yes [ ] No
- Package Manager (pip/UV): ________________

**Test Results Summary**:
- Tests Passed: _____ / 14
- Tests Failed: _____ / 14
- Tests Skipped: _____ / 14
- Overall Success Rate: _____%

**Issues Encountered**:
1. _________________________________
2. _________________________________
3. _________________________________

**Recommendations**:
1. _________________________________
2. _________________________________
3. _________________________________

### Next Steps

After completing manual testing:

1. **Environment Setup**: Address any failed tests by installing missing components
2. **Automation**: Run automated system tests to validate environment setup
3. **Integration**: Proceed with AI Development Platform integration
4. **Documentation**: Update environment setup documentation based on findings

---

**Document Version**: 1.0.0  
**Last Updated**: $(date)  
**Generated By**: Python Environment System Tests  
**Contact**: Development Team
