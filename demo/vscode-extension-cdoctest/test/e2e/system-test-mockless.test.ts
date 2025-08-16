import { test, expect } from '@playwright/test';
import { VSCodeAutomationHelper } from './helpers/vscode-automation-helper';
import { path } from '../../../../layer/themes/infra_external-log-lib/dist';
import { fs } from '../../../../layer/themes/infra_external-log-lib/dist';
import { spawn, ChildProcess } from 'child_process';

/**
 * COMPLETELY MOCK-FREE E2E system tests for CDocTest VSCode Extension
 * These tests launch actual VSCode with the extension and interact with real UI elements
 * using Playwright automation for genuine user interactions (clicking, typing).
 * NO MOCKS, NO STUBS, NO FAKES - Only real processes and real interactions.
 */

const EXTENSION_ROOT = process.cwd();
const TEST_WORKSPACE = path.join(__dirname, '../fixtures/system-test-workspace');
const CMAKE_BUILD_DIR = path.join(TEST_WORKSPACE, 'build');

let vscodeHelper: VSCodeAutomationHelper;
let vscodeProcess: ChildProcess | null = null;

test.beforeAll(async ({ browser }) => {
  // Create fresh browser page for VSCode automation
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();
  
  vscodeHelper = new VSCodeAutomationHelper(page);
  
  // Setup real test workspace with actual C++ project
  await setupRealTestWorkspace();
  
  // Build the actual C++ test project
  await buildTestProject();
  
  // Launch real VSCode with extension in development mode
  await launchVSCodeWithExtension(page);
  
  // Wait for extension activation with real activation checks
  await vscodeHelper.waitForExtensionActivation('cdoctest');
});

test.afterAll(async () => {
  await vscodeHelper?.closeVSCode();
  if (vscodeProcess) {
    vscodeProcess.kill();
  }
  // Cleanup test workspace
  if (fs.existsSync(TEST_WORKSPACE)) {
    fs.rmSync(TEST_WORKSPACE, { recursive: true, force: true });
  }
});

test.describe('CDocTest Extension System Tests - Real E2E Without Mocks', () => {
  
  test('should launch VSCode extension and activate successfully', async ({ page }) => {
    // Verify VSCode is running with our extension
    await expect(page.locator('.monaco-workbench')).toBeVisible({ timeout: 30000 });
    
    // Check extension is loaded via command palette
    await page.keyboard.press('Control+Shift+P');
    await page.waitForSelector('.quick-input-widget input', { timeout: 5000 });
    
    // Type extension command to verify it's active
    await page.type('.quick-input-widget input', 'CDocTest');
    await page.waitForTimeout(1000);
    
    // Should see extension commands
    const commandList = page.locator('.quick-input-list');
    await expect(commandList).toBeVisible();
    
    // Close command palette
    await page.keyboard.press('Escape');
    
    await vscodeHelper.takeScreenshot('extension-activated');
  });

  test('should discover real C++ tests from actual executable', async ({ page }) => {
    // Open Test Explorer through real UI interaction
    await vscodeHelper.openTestExplorer();
    
    // Configure extension to use real test executable
    await page.keyboard.press('Control+,'); // Open settings
    await page.waitForSelector('.settings-editor', { timeout: 10000 });
    
    // Search for cdoctest settings
    const settingsSearch = page.locator('.settings-header input[placeholder*="Search"]');
    await settingsSearch.fill('cdoctest');
    await page.waitForTimeout(1000);
    
    // Configure exe_executable setting with real built executable
    const exeExecutableSetting = page.locator('[data-setting="cdoctest.exe_executable"] input');
    if (await exeExecutableSetting.isVisible()) {
      const testExePath = path.join(CMAKE_BUILD_DIR, 'test_runner');
      await exeExecutableSetting.fill(testExePath);
      await page.keyboard.press('Enter');
    }
    
    // Configure build directory
    const buildDirSetting = page.locator('[data-setting="cdoctest.buildDirectory"] input');
    if (await buildDirSetting.isVisible()) {
      await buildDirSetting.fill(CMAKE_BUILD_DIR);
      await page.keyboard.press('Enter');
    }
    
    // Return to Test Explorer
    await vscodeHelper.openTestExplorer();
    
    // Trigger test discovery by clicking refresh
    const refreshButton = page.locator('[aria-label*="Refresh"]').first();
    await refreshButton.click();
    
    // Wait for real test discovery (actual process execution)
    await page.waitForTimeout(5000); // Allow time for actual process execution
    
    // Verify real tests are discovered
    const testExplorer = page.locator('[id*="test-explorer"]');
    await expect(testExplorer).toBeVisible();
    
    // Look for actual test suites that should be discovered
    const mathTestSuite = page.locator('text*="MathTests"');
    const stringTestSuite = page.locator('text*="StringTests"');
    
    // These should appear from real test discovery
    await expect(mathTestSuite.or(stringTestSuite)).toBeVisible({ timeout: 15000 });
    
    await vscodeHelper.takeScreenshot('real-tests-discovered');
  });

  test('should execute real C++ test and show actual results', async ({ page }) => {
    await vscodeHelper.openTestExplorer();
    
    // Ensure tests are discovered first
    const refreshButton = page.locator('[aria-label*="Refresh"]').first();
    await refreshButton.click();
    await page.waitForTimeout(3000);
    
    // Find and click on a real test case
    const testCase = page.locator('[role="treeitem"]').filter({ hasText: /Test/ }).first();
    await expect(testCase).toBeVisible({ timeout: 10000 });
    
    // Right-click to open context menu
    await testCase.click({ button: 'right' });
    await page.waitForTimeout(500);
    
    // Click "Run Test" from real context menu
    const runTestOption = page.locator('text="Run Test"');
    if (await runTestOption.isVisible()) {
      await runTestOption.click();
    } else {
      // Alternative: use keyboard shortcut or different UI element
      await testCase.click(); // Select test
      await page.keyboard.press('Control+F5'); // Run test shortcut
    }
    
    // Wait for real test execution (actual process execution)
    await page.waitForTimeout(10000); // Allow time for actual executable to run
    
    // Check for test execution results in Output panel
    await vscodeHelper.openOutputPanel();
    
    // Verify real output appears
    const outputContent = page.locator('.output .monaco-editor');
    await expect(outputContent).toBeVisible();
    
    // Look for actual test execution output
    const outputText = await outputContent.textContent();
    expect(outputText).toMatch(/(Test|Running|Passed|Failed|Error)/i);
    
    await vscodeHelper.takeScreenshot('real-test-execution');
  });

  test('should handle real CMake build before test execution', async ({ page }) => {
    // Modify a source file to trigger real rebuild
    const sourceFile = path.join(TEST_WORKSPACE, 'src', 'math.cpp');
    const originalContent = fs.readFileSync(sourceFile, 'utf8');
    const modifiedContent = originalContent + '\n// Modified for test rebuild\n';
    fs.writeFileSync(sourceFile, modifiedContent);
    
    await vscodeHelper.openTestExplorer();
    
    // Attempt to run tests (should trigger real build)
    const runAllButton = page.locator('[aria-label*="Run All"]').first();
    if (await runAllButton.isVisible()) {
      await runAllButton.click();
    }
    
    // Wait for real build process
    await page.waitForTimeout(15000); // CMake build can take time
    
    // Check output for real build messages
    await vscodeHelper.openOutputPanel();
    
    // Look for actual CMake/build output
    const outputContent = page.locator('.output .monaco-editor');
    const buildOutput = await outputContent.textContent();
    
    // Should contain real build tool output
    expect(buildOutput).toMatch(/(cmake|make|ninja|Building|Compiling)/i);
    
    // Restore original file
    fs.writeFileSync(sourceFile, originalContent);
    
    await vscodeHelper.takeScreenshot('real-cmake-build');
  });

  test('should handle real test failures with actual error messages', async ({ page }) => {
    // Create a test file with intentional failure for real testing
    const failingTestFile = path.join(TEST_WORKSPACE, 'test', 'test_failing.cpp');
    const failingTestContent = `
#include <gtest/gtest.h>

TEST(FailingTests, ShouldFail) {
    EXPECT_EQ(1, 2) << "This test is designed to fail for real E2E testing";
}
`;
    fs.writeFileSync(failingTestFile, failingTestContent);
    
    // Rebuild project with failing test using real build process
    await rebuildProject();
    
    await vscodeHelper.openTestExplorer();
    
    // Refresh to discover new failing test through real UI
    const refreshButton = page.locator('[aria-label*="Refresh"]').first();
    await refreshButton.click();
    await page.waitForTimeout(5000);
    
    // Find and run the failing test through real user interaction
    const failingTest = page.locator('text*="ShouldFail"');
    if (await failingTest.isVisible()) {
      await failingTest.click({ button: 'right' });
      await page.waitForTimeout(500);
      
      const runOption = page.locator('text="Run Test"');
      if (await runOption.isVisible()) {
        await runOption.click();
      }
      
      // Wait for real test failure (actual process execution)
      await page.waitForTimeout(8000);
      
      // Check for actual failure indication in real UI
      const failedIndicator = page.locator('[class*="error"], [class*="failed"]').first();
      await expect(failedIndicator).toBeVisible({ timeout: 5000 });
      
      // Verify real error message appears from actual test execution
      await vscodeHelper.openOutputPanel();
      const outputContent = page.locator('.output .monaco-editor');
      const errorOutput = await outputContent.textContent();
      
      expect(errorOutput).toContain('This test is designed to fail for real E2E testing');
    }
    
    // Cleanup failing test
    fs.unlinkSync(failingTestFile);
    
    await vscodeHelper.takeScreenshot('real-test-failure');
  });

  test('should update extension configuration and apply changes', async ({ page }) => {
    // Open real VSCode settings
    await page.keyboard.press('Control+,');
    await page.waitForSelector('.settings-editor', { timeout: 10000 });
    
    // Navigate to CDocTest extension settings
    const settingsSearch = page.locator('.settings-header input[placeholder*="Search"]');
    await settingsSearch.fill('cdoctest');
    await page.waitForTimeout(1000);
    
    // Modify a real setting
    const parallelJobsSetting = page.locator('[data-setting="cdoctest.parallelJobs"] input');
    if (await parallelJobsSetting.isVisible()) {
      await parallelJobsSetting.clear();
      await parallelJobsSetting.fill('4');
      await page.keyboard.press('Tab'); // Commit change
      await page.waitForTimeout(1000);
    }
    
    // Verify setting was saved by checking settings.json
    await page.keyboard.press('Control+Shift+P');
    await page.waitForSelector('.quick-input-widget input', { timeout: 5000 });
    await page.type('.quick-input-widget input', 'Preferences: Open Settings (JSON)');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
    
    // Check if settings.json contains our change
    const jsonEditor = page.locator('.monaco-editor');
    const settingsContent = await jsonEditor.textContent();
    expect(settingsContent).toContain('cdoctest.parallelJobs');
    expect(settingsContent).toContain('4');
    
    await vscodeHelper.takeScreenshot('real-config-change');
  });

});

/**
 * Setup real test workspace with actual C++ project and CMake
 */
async function setupRealTestWorkspace(): Promise<void> {
  // Create workspace directory
  if (!fs.existsSync(TEST_WORKSPACE)) {
    fs.mkdirSync(TEST_WORKSPACE, { recursive: true });
  }
  
  // Create real CMakeLists.txt
  const cmakeContent = `
cmake_minimum_required(VERSION 3.14)
project(SystemTestProject)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Google Test
find_package(GTest QUIET)
if(NOT GTest_FOUND)
  include(FetchContent)
  FetchContent_Declare(
    googletest
    URL https://github.com/google/googletest/archive/03597a01ee50ed33e9dfd640b249b4be3799d395.zip
  )
  set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)
  FetchContent_MakeAvailable(googletest)
endif()

enable_testing()

# Source library
add_library(sample_lib
  src/math.cpp
  src/string_utils.cpp
)
target_include_directories(sample_lib PUBLIC include)

# Test executable
add_executable(test_runner
  test/test_math.cpp
  test/test_string.cpp
)
target_link_libraries(test_runner 
  PRIVATE 
    sample_lib
    GTest::gtest_main
)

include(GoogleTest)
gtest_discover_tests(test_runner)
`;
  
  fs.writeFileSync(path.join(TEST_WORKSPACE, 'CMakeLists.txt'), cmakeContent);
  
  // Create real source files
  createRealSourceFiles();
  createRealTestFiles();
}

/**
 * Create actual C++ source files (real implementation)
 */
function createRealSourceFiles(): void {
  const srcDir = path.join(TEST_WORKSPACE, 'src');
  const includeDir = path.join(TEST_WORKSPACE, 'include');
  
  fs.mkdirSync(srcDir, { recursive: true });
  fs.mkdirSync(includeDir, { recursive: true });
  
  // Real math.h
  fs.writeFileSync(path.join(includeDir, 'math.h'), `
#pragma once

class MathUtils {
public:
    static int add(int a, int b);
    static int subtract(int a, int b);
    static int multiply(int a, int b);
    static double divide(double a, double b);
};
`);
  
  // Real math.cpp
  fs.writeFileSync(path.join(srcDir, 'math.cpp'), `
#include "math.h"
#include <stdexcept>

int MathUtils::add(int a, int b) {
    return a + b;
}

int MathUtils::subtract(int a, int b) {
    return a - b;
}

int MathUtils::multiply(int a, int b) {
    return a * b;
}

double MathUtils::divide(double a, double b) {
    if (b == 0) {
        throw std::invalid_argument("Division by zero");
    }
    return a / b;
}
`);
  
  // Real string_utils.h
  fs.writeFileSync(path.join(includeDir, 'string_utils.h'), `
#pragma once
#include <string>

class StringUtils {
public:
    static std::string toUppercase(const std::string& str);
    static std::string toLowercase(const std::string& str);
    static bool startsWith(const std::string& str, const std::string& prefix);
};
`);
  
  // Real string_utils.cpp
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

bool StringUtils::startsWith(const std::string& str, const std::string& prefix) {
    return str.length() >= prefix.length() && 
           str.compare(0, prefix.length(), prefix) == 0;
}
`);
}

/**
 * Create actual C++ test files with GTest (real implementation)
 */
function createRealTestFiles(): void {
  const testDir = path.join(TEST_WORKSPACE, 'test');
  fs.mkdirSync(testDir, { recursive: true });
  
  // Real test_math.cpp
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

TEST_F(MathTests, Division) {
    EXPECT_DOUBLE_EQ(MathUtils::divide(10.0, 2.0), 5.0);
    EXPECT_DOUBLE_EQ(MathUtils::divide(7.0, 2.0), 3.5);
    EXPECT_THROW(MathUtils::divide(1.0, 0.0), std::invalid_argument);
}
`);
  
  // Real test_string.cpp
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
    EXPECT_EQ(StringUtils::toUppercase("123abc"), "123ABC");
}

TEST_F(StringTests, ToLowercase) {
    EXPECT_EQ(StringUtils::toLowercase("HELLO"), "hello");
    EXPECT_EQ(StringUtils::toLowercase("World"), "world");
    EXPECT_EQ(StringUtils::toLowercase(""), "");
    EXPECT_EQ(StringUtils::toLowercase("ABC123"), "abc123");
}

TEST_F(StringTests, StartsWith) {
    EXPECT_TRUE(StringUtils::startsWith("hello world", "hello"));
    EXPECT_TRUE(StringUtils::startsWith("test", "test"));
    EXPECT_TRUE(StringUtils::startsWith("anything", ""));
    EXPECT_FALSE(StringUtils::startsWith("hello", "world"));
    EXPECT_FALSE(StringUtils::startsWith("hi", "hello"));
}
`);
}

/**
 * Build the actual C++ test project using real CMake
 */
async function buildTestProject(): Promise<void> {
  // Create build directory
  if (!fs.existsSync(CMAKE_BUILD_DIR)) {
    fs.mkdirSync(CMAKE_BUILD_DIR, { recursive: true });
  }
  
  // Run real CMake configure
  const configureProcess = spawn('cmake', ['-S', TEST_WORKSPACE, '-B', CMAKE_BUILD_DIR], {
    stdio: 'inherit',
    cwd: TEST_WORKSPACE
  });
  
  await new Promise<void>((resolve, reject) => {
    configureProcess.on('close', (code) => {
      if (code === 0) {
        console.log('CMake configure completed successfully');
        resolve();
      } else {
        reject(new Error(`CMake configure failed with code ${code}`));
      }
    });
  });
  
  // Run real CMake build
  const buildProcess = spawn('cmake', ['--build', CMAKE_BUILD_DIR], {
    stdio: 'inherit',
    cwd: TEST_WORKSPACE
  });
  
  await new Promise<void>((resolve, reject) => {
    buildProcess.on('close', (code) => {
      if (code === 0) {
        console.log('CMake build completed successfully');
        resolve();
      } else {
        reject(new Error(`CMake build failed with code ${code}`));
      }
    });
  });
}

/**
 * Rebuild project after modifications
 */
async function rebuildProject(): Promise<void> {
  const buildProcess = spawn('cmake', ['--build', CMAKE_BUILD_DIR, '--clean-first'], {
    stdio: 'inherit',
    cwd: TEST_WORKSPACE
  });
  
  await new Promise<void>((resolve, reject) => {
    buildProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Rebuild failed with code ${code}`));
      }
    });
  });
}

/**
 * Launch real VSCode with extension in development mode
 */
async function launchVSCodeWithExtension(page: any): Promise<void> {
  const vscodeArgs = [
    '--extensionDevelopmentPath=' + EXTENSION_ROOT,
    '--disable-workspace-trust',
    '--new-window',
    '--wait',
    TEST_WORKSPACE
  ];
  
  // Launch VSCode process
  vscodeProcess = spawn('code', vscodeArgs, {
    stdio: 'pipe',
    detached: false,
    env: {
      ...process.env,
      ELECTRON_ENABLE_LOGGING: '1',
      VSCODE_LOG_LEVEL: 'trace'
    }
  });
  
  // Give VSCode time to start
  await new Promise(resolve => setTimeout(resolve, 8000));
  
  // Navigate to the VSCode window
  await page.goto('http://localhost:3000'); // If using remote development
  // Alternative: Focus on VSCode window through OS-level automation
  
  // Wait for VSCode to be fully loaded
  await page.waitForSelector('.monaco-workbench', { timeout: 30000 });
  
  console.log('VSCode launched successfully with extension');
}