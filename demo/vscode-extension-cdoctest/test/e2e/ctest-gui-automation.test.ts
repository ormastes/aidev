import { test, expect } from '@playwright/test';
import { VSCodeTestHelper } from './helpers/vscode-test-helper';
import { path } from '../../../../layer/themes/infra_external-log-lib/dist';
import { fs } from '../../../../layer/themes/infra_external-log-lib/dist';

/**
 * E2E GUI tests for CTest functionality using Playwright
 * Tests real user interactions with VSCode Test Explorer
 */

let vscodeHelper: VSCodeTestHelper;
const testWorkspacePath = path.join(__dirname, '../fixtures/ctest-sample-project');

test.beforeAll(async ({ page }) => {
  vscodeHelper = new VSCodeTestHelper(page);
  
  // Setup test workspace with CMake and GTest
  await setupTestWorkspace();
  
  // Launch VSCode with test workspace
  await vscodeHelper.launchVSCode(testWorkspacePath);
  
  // Wait for extension activation
  await vscodeHelper.waitForExtensionActivation('cdoctest');
});

test.afterAll(async () => {
  await vscodeHelper.closeVSCode();
});

test.describe('CTest GUI Automation Tests', () => {
  
  test('should activate extension and show CTest controller in Test Explorer', async ({ page }) => {
    // Open Test Explorer panel
    await vscodeHelper.openTestExplorer();
    
    // Verify CTest controller is present
    const ctestController = page.locator('[data-testid="test-explorer"] >> text="CTest GTest"');
    await expect(ctestController).toBeVisible({ timeout: 30000 });
    
    // Take screenshot for verification
    await page.screenshot({ path: 'test-results/ctest-controller-visible.png' });
  });

  test('should discover CTest tests when clicking refresh', async ({ page }) => {
    // Navigate to Test Explorer
    await vscodeHelper.openTestExplorer();
    
    // Click refresh button for CTest controller
    const refreshButton = page.locator('[aria-label="Refresh Tests"]').first();
    await refreshButton.click();
    
    // Wait for test discovery to complete
    await vscodeHelper.waitForTestDiscovery();
    
    // Verify test suites are discovered
    const mathTestSuite = page.locator('text="MathTests"');
    await expect(mathTestSuite).toBeVisible({ timeout: 10000 });
    
    const stringTestSuite = page.locator('text="StringTests"');
    await expect(stringTestSuite).toBeVisible({ timeout: 10000 });
    
    // Expand test suites to see individual tests
    await mathTestSuite.click();
    await stringTestSuite.click();
    
    // Verify individual test cases
    const additionTest = page.locator('text="Addition"');
    const subtractionTest = page.locator('text="Subtraction"');
    const uppercaseTest = page.locator('text="ToUppercase"');
    
    await expect(additionTest).toBeVisible();
    await expect(subtractionTest).toBeVisible();
    await expect(uppercaseTest).toBeVisible();
    
    await page.screenshot({ path: 'test-results/ctest-tests-discovered.png' });
  });

  test('should run individual test when clicked', async ({ page }) => {
    await vscodeHelper.openTestExplorer();
    
    // Ensure tests are discovered
    await vscodeHelper.refreshTests('CTest GTest');
    
    // Right-click on a specific test to open context menu
    const additionTest = page.locator('text="Addition"');
    await additionTest.click({ button: 'right' });
    
    // Click "Run Test" from context menu
    const runTestOption = page.locator('text="Run Test"');
    await runTestOption.click();
    
    // Wait for test execution to complete
    await vscodeHelper.waitForTestExecution();
    
    // Verify test result icon (passed/failed)
    const testResult = page.locator('[data-testid="test-result-Addition"]');
    await expect(testResult).toHaveClass(/passed|failed/);
    
    // Check output panel for test results
    await vscodeHelper.openOutputPanel();
    const outputContent = page.locator('[data-testid="output-content"]');
    await expect(outputContent).toContainText('Test #');
    
    await page.screenshot({ path: 'test-results/ctest-individual-test-run.png' });
  });

  test('should run all tests in suite when clicking run on suite', async ({ page }) => {
    await vscodeHelper.openTestExplorer();
    
    // Right-click on test suite
    const mathTestSuite = page.locator('text="MathTests"');
    await mathTestSuite.click({ button: 'right' });
    
    // Click "Run Tests" from context menu
    const runTestsOption = page.locator('text="Run Tests"');
    await runTestsOption.click();
    
    // Wait for all tests in suite to complete
    await vscodeHelper.waitForTestExecution();
    
    // Verify all tests in suite show results
    const additionResult = page.locator('[data-testid="test-result-Addition"]');
    const subtractionResult = page.locator('[data-testid="test-result-Subtraction"]');
    
    await expect(additionResult).toHaveClass(/passed|failed/);
    await expect(subtractionResult).toHaveClass(/passed|failed/);
    
    await page.screenshot({ path: 'test-results/ctest-suite-run.png' });
  });

  test('should show test execution progress and results', async ({ page }) => {
    await vscodeHelper.openTestExplorer();
    
    // Start running a test
    const testToRun = page.locator('text="Addition"');
    await testToRun.click({ button: 'right' });
    await page.locator('text="Run Test"').click();
    
    // Verify progress indicator appears
    const progressIndicator = page.locator('[data-testid="test-progress"]');
    await expect(progressIndicator).toBeVisible({ timeout: 5000 });
    
    // Wait for completion
    await vscodeHelper.waitForTestExecution();
    
    // Verify progress indicator disappears
    await expect(progressIndicator).not.toBeVisible();
    
    // Verify final result state
    const finalResult = page.locator('[data-testid="test-result-Addition"]');
    await expect(finalResult).toBeVisible();
    
    await page.screenshot({ path: 'test-results/ctest-execution-progress.png' });
  });

  test('should handle test failures and show error messages', async ({ page }) => {
    // This test assumes we have a failing test in our test project
    await vscodeHelper.openTestExplorer();
    
    // Run a test that should fail
    const failingTest = page.locator('text="FailingTest"');
    if (await failingTest.isVisible()) {
      await failingTest.click({ button: 'right' });
      await page.locator('text="Run Test"').click();
      
      await vscodeHelper.waitForTestExecution();
      
      // Verify test shows as failed
      const failedResult = page.locator('[data-testid="test-result-FailingTest"]');
      await expect(failedResult).toHaveClass(/failed/);
      
      // Click on failed test to see details
      await failedResult.click();
      
      // Verify error message is displayed
      const errorMessage = page.locator('[data-testid="test-error-message"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText('Assertion');
      
      await page.screenshot({ path: 'test-results/ctest-test-failure.png' });
    }
  });

  test('should update configuration and reflect changes', async ({ page }) => {
    // Open settings
    await vscodeHelper.openSettings();
    
    // Navigate to CTest settings
    await page.locator('input[placeholder="Search settings"]').fill('ctest');
    
    // Modify CTest configuration
    const parallelJobsSetting = page.locator('input[data-setting="ctest.parallelJobs"]');
    await parallelJobsSetting.fill('2');
    
    // Verify setting is saved
    await page.keyboard.press('Enter');
    
    // Return to Test Explorer
    await vscodeHelper.openTestExplorer();
    
    // Refresh tests to apply new configuration
    await vscodeHelper.refreshTests('CTest GTest');
    
    // Verify tests still work with new configuration
    const testSuite = page.locator('text="MathTests"');
    await expect(testSuite).toBeVisible();
    
    await page.screenshot({ path: 'test-results/ctest-config-change.png' });
  });

  test('should handle CMake build before test execution', async ({ page }) => {
    await vscodeHelper.openTestExplorer();
    
    // Modify a source file to trigger rebuild
    const sourceFile = path.join(testWorkspacePath, 'src', 'math.cpp');
    await vscodeHelper.modifySourceFile(sourceFile, '// Modified for test');
    
    // Run tests (should trigger build first)
    const testToRun = page.locator('text="Addition"');
    await testToRun.click({ button: 'right' });
    await page.locator('text="Run Test"').click();
    
    // Verify build output appears
    await vscodeHelper.openOutputPanel();
    const buildOutput = page.locator('[data-testid="output-content"]');
    await expect(buildOutput).toContainText('Building');
    
    // Wait for test completion
    await vscodeHelper.waitForTestExecution();
    
    // Verify test ran successfully after build
    const testResult = page.locator('[data-testid="test-result-Addition"]');
    await expect(testResult).toHaveClass(/passed|failed/);
    
    await page.screenshot({ path: 'test-results/ctest-build-before-test.png' });
  });

  test('should handle multiple test controllers simultaneously', async ({ page }) => {
    await vscodeHelper.openTestExplorer();
    
    // Verify multiple controllers are present
    const ctestController = page.locator('text="CTest GTest"');
    const cdoctestController = page.locator('text="codctest Test"');
    const exeController = page.locator('text="Cpp Executable Test"');
    
    await expect(ctestController).toBeVisible();
    
    // Expand all controllers
    await ctestController.click();
    if (await cdoctestController.isVisible()) {
      await cdoctestController.click();
    }
    if (await exeController.isVisible()) {
      await exeController.click();
    }
    
    // Verify each controller shows its own tests
    const ctestTests = page.locator('[data-controller="ctest"] >> text="MathTests"');
    await expect(ctestTests).toBeVisible();
    
    await page.screenshot({ path: 'test-results/ctest-multiple-controllers.png' });
  });
});

/**
 * Setup test workspace with CMake project and GTest tests
 */
async function setupTestWorkspace() {
  // Create test workspace directory
  if (!fs.existsSync(testWorkspacePath)) {
    fs.mkdirSync(testWorkspacePath, { recursive: true });
  }
  
  // Create CMakeLists.txt
  const cmakeContent = `
cmake_minimum_required(VERSION 3.14)
project(CTestSampleProject)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# GoogleTest
include(FetchContent)
FetchContent_Declare(
  googletest
  URL https://github.com/google/googletest/archive/03597a01ee50ed33e9dfd640b249b4be3799d395.zip
)
set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(googletest)

enable_testing()
include(GoogleTest)

# Source files
add_library(sample_lib
  src/math.cpp
  src/string_utils.cpp
)

target_include_directories(sample_lib PUBLIC include)

# Test executable
add_executable(sample_tests
  test/test_math.cpp
  test/test_string.cpp
)

target_link_libraries(sample_tests 
  PRIVATE 
    sample_lib
    GTest::gtest_main
)

# Discover tests
gtest_discover_tests(sample_tests
  PROPERTIES
    LABELS "unit"
    TIMEOUT 30
)
`;
  
  fs.writeFileSync(path.join(testWorkspacePath, 'CMakeLists.txt'), cmakeContent);
  
  // Create source files
  createSourceFiles(testWorkspacePath);
  
  // Create test files
  createTestFiles(testWorkspacePath);
}

function createSourceFiles(workspacePath: string) {
  // Create directories
  const srcDir = path.join(workspacePath, 'src');
  const includeDir = path.join(workspacePath, 'include');
  
  fs.mkdirSync(srcDir, { recursive: true });
  fs.mkdirSync(includeDir, { recursive: true });
  
  // math.h
  fs.writeFileSync(path.join(includeDir, 'math.h'), `
#pragma once

class MathUtils {
public:
    static int add(int a, int b);
    static int subtract(int a, int b);
    static int multiply(int a, int b);
};
`);
  
  // math.cpp
  fs.writeFileSync(path.join(srcDir, 'math.cpp'), `
#include "math.h"

int MathUtils::add(int a, int b) {
    return a + b;
}

int MathUtils::subtract(int a, int b) {
    return a - b;
}

int MathUtils::multiply(int a, int b) {
    return a * b;
}
`);
  
  // string_utils.h
  fs.writeFileSync(path.join(includeDir, 'string_utils.h'), `
#pragma once
#include <string>

class StringUtils {
public:
    static std::string toUppercase(const std::string& str);
    static std::string toLowercase(const std::string& str);
};
`);
  
  // string_utils.cpp
  fs.writeFileSync(path.join(srcDir, 'string_utils.cpp'), `
#include "string_utils.h"
#include <algorithm>

std::string StringUtils::toUppercase(const std::string& str) {
    std::string result = str;
    std::transform(result.begin(), result.end(), result.begin(), ::toupper);
    return result;
}

std::string StringUtils::toLowercase(const std::string& str) {
    std::string result = str;
    std::transform(result.begin(), result.end(), result.begin(), ::tolower);
    return result;
}
`);
}

function createTestFiles(workspacePath: string) {
  const testDir = path.join(workspacePath, 'test');
  fs.mkdirSync(testDir, { recursive: true });
  
  // test_math.cpp
  fs.writeFileSync(path.join(testDir, 'test_math.cpp'), `
#include <gtest/gtest.h>
#include "math.h"

class MathTests : public ::testing::Test {
protected:
    void SetUp() override {}
    void TearDown() override {}
};

TEST_F(MathTests, Addition) {
    EXPECT_EQ(MathUtils::add(2, 3), 5);
    EXPECT_EQ(MathUtils::add(-1, 1), 0);
    EXPECT_EQ(MathUtils::add(0, 0), 0);
}

TEST_F(MathTests, Subtraction) {
    EXPECT_EQ(MathUtils::subtract(5, 3), 2);
    EXPECT_EQ(MathUtils::subtract(1, 1), 0);
    EXPECT_EQ(MathUtils::subtract(0, 5), -5);
}

TEST_F(MathTests, Multiplication) {
    EXPECT_EQ(MathUtils::multiply(3, 4), 12);
    EXPECT_EQ(MathUtils::multiply(-2, 3), -6);
    EXPECT_EQ(MathUtils::multiply(0, 100), 0);
}

// Intentionally failing test for error handling verification
TEST_F(MathTests, FailingTest) {
    EXPECT_EQ(MathUtils::add(1, 1), 3); // This should fail
}
`);
  
  // test_string.cpp
  fs.writeFileSync(path.join(testDir, 'test_string.cpp'), `
#include <gtest/gtest.h>
#include "string_utils.h"

class StringTests : public ::testing::Test {
protected:
    void SetUp() override {}
    void TearDown() override {}
};

TEST_F(StringTests, ToUppercase) {
    EXPECT_EQ(StringUtils::toUppercase("hello"), "HELLO");
    EXPECT_EQ(StringUtils::toUppercase("World"), "WORLD");
    EXPECT_EQ(StringUtils::toUppercase(""), "");
}

TEST_F(StringTests, ToLowercase) {
    EXPECT_EQ(StringUtils::toLowercase("HELLO"), "hello");
    EXPECT_EQ(StringUtils::toLowercase("World"), "world");
    EXPECT_EQ(StringUtils::toLowercase(""), "");
}
`);
}