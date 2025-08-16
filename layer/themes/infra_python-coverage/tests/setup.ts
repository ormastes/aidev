/**
 * Test setup for Python Coverage theme
 */

import * as fs from 'fs-extra';
import { path } from '../../infra_external-log-lib/src';

// Mock Python environment for testing
export const mockPythonEnvironment = {
  pythonVersion: 'Python 3.11.0',
  pipVersion: '23.0.1',
  coverageVersion: '7.2.0',
  pytestVersion: '7.3.0',
  installedPackages: [
    'coverage==7.2.0',
    'pytest==7.3.0',
    'pytest-cov==4.0.0'
  ]
};

// Mock coverage data for testing
export const mockCoverageData = {
  files: {
    'src/module1.py': {
      summary: {
        num_statements: 100,
        covered_lines: 85,
        percent_covered: 85,
        num_branches: 20,
        covered_branches: 16,
        percent_covered_branches: 80
      },
      missing_lines: [15, 16, 17, 45, 46, 78, 79, 80, 81, 82, 83, 84, 85, 99, 100],
      executed_lines: Array.from({ length: 85 }, (_, i) => i + 1).filter(i => ![15, 16, 17, 45, 46, 78, 79, 80, 81, 82, 83, 84, 85, 99, 100].includes(i))
    },
    'src/module2.py': {
      summary: {
        num_statements: 50,
        covered_lines: 48,
        percent_covered: 96,
        num_branches: 10,
        covered_branches: 9,
        percent_covered_branches: 90
      },
      missing_lines: [25, 26],
      executed_lines: Array.from({ length: 48 }, (_, i) => i + 1).filter(i => ![25, 26].includes(i))
    },
    'src/utils.py': {
      summary: {
        num_statements: 30,
        covered_lines: 30,
        percent_covered: 100,
        num_branches: 5,
        covered_branches: 5,
        percent_covered_branches: 100
      },
      missing_lines: [],
      executed_lines: Array.from({ length: 30 }, (_, i) => i + 1)
    }
  },
  totals: {
    num_statements: 180,
    covered_lines: 163,
    percent_covered: 90.56,
    num_branches: 35,
    covered_branches: 30,
    percent_covered_branches: 85.71,
    class_coverage: 88.5,
    method_coverage: 92.3
  }
};

// Mock class coverage data
export const mockClassData = {
  'src/module1.py::MyClass': {
    name: 'MyClass',
    file: 'src/module1.py',
    lineCoverage: 85,
    methodCoverage: 80,
    totalMethods: 5,
    coveredMethods: 4,
    totalLines: 50,
    coveredLines: 42,
    uncoveredMethods: ['private_method'],
    complexity: 8
  },
  'src/module2.py::AnotherClass': {
    name: "AnotherClass",
    file: 'src/module2.py',
    lineCoverage: 95,
    methodCoverage: 100,
    totalMethods: 3,
    coveredMethods: 3,
    totalLines: 30,
    coveredLines: 28,
    uncoveredMethods: [],
    complexity: 5
  }
};

// Setup test directories
export async function setupTestDirectories(): Promise<void> {
  const testDirs = [
    'test-temp',
    'test-temp/src',
    'test-temp/tests',
    'test-temp/htmlcov'
  ];

  for (const dir of testDirs) {
    await fs.ensureDir(dir);
  }
}

// Cleanup test directories
export async function cleanupTestDirectories(): Promise<void> {
  try {
    await fs.remove('test-temp');
  } catch (error) {
    // Ignore cleanup errors
  }
}

// Create mock Python files for testing
export async function createMockPythonFiles(): Promise<void> {
  const files = {
    'test-temp/src/module1.py': `
class MyClass:
    def __init__(self):
        self.value = 0
    
    def public_method(self):
        return self.value * 2
    
    def another_method(self, x):
        if x > 0:
            return x + self.value
        else:
            return x - self.value
    
    def private_method(self):
        # This method is not covered
        pass
`,
    'test-temp/src/module2.py': `
class AnotherClass:
    def method1(self):
        return True
    
    def method2(self, param):
        if param:
            return "yes"
        return "no"
    
    def method3(self):
        for i in range(10):
            if i % 2 == 0:
                print(i)
`,
    'test-temp/src/utils.py': `
def add(a, b):
    return a + b

def multiply(a, b):
    return a * b

def divide(a, b):
    if b == 0:
        raise ValueError("Cannot divide by zero")
    return a / b
`,
    'test-temp/tests/test_module1.py': `
import pytest
from src.module1 import MyClass

def test_myclass():
    obj = MyClass()
    assert obj.public_method() == 0
    assert obj.another_method(5) == 5
    assert obj.another_method(-5) == -5
`,
    'test-temp/tests/test_utils.py': `
import pytest
from src.utils import add, multiply, divide

def test_add():
    assert add(2, 3) == 5

def test_multiply():
    assert multiply(3, 4) == 12

def test_divide():
    assert divide(10, 2) == 5
    with pytest.raises(ValueError):
        divide(10, 0)
`
  };

  for (const [filePath, content] of Object.entries(files)) {
    await fs.writeFile(filePath, content);
  }
}

// Create mock coverage JSON file
export async function createMockCoverageFile(filePath: string): Promise<void> {
  await fs.writeJson(filePath, mockCoverageData, { spaces: 2 });
}

// Global test setup
beforeAll(async () => {
  await setupTestDirectories();
  await createMockPythonFiles();
});

// Global test cleanup
afterAll(async () => {
  await cleanupTestDirectories();
});