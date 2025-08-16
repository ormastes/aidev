#include "hello.h"
#include <iostream>
#include <string>

/**
 * @brief Test executable with cdoctest-compatible output format
 * Supports both test listing and test execution
 */

void printTestList() {
    std::cout << "HelloSuite::BasicGreeting" << std::endl;
    std::cout << "HelloSuite::CustomGreeting" << std::endl;
    std::cout << "HelloSuite::VersionCheck" << std::endl;
    std::cout << "HelloSuite::FullTestSuite" << std::endl;
}

bool runSpecificTest(const std::string& testName) {
    std::cout << "Running test: " << testName << std::endl;
    
    if (testName == "HelloSuite::BasicGreeting") {
        std::string greeting = HelloWorld::getGreeting();
        bool passed = (greeting == "Hello, World!");
        std::cout << "Test result: " << (passed ? "PASSED" : "FAILED") << std::endl;
        return passed;
    }
    else if (testName == "HelloSuite::CustomGreeting") {
        std::string greeting = HelloWorld::getGreeting("Test");
        bool passed = (greeting == "Hello, Test!");
        std::cout << "Test result: " << (passed ? "PASSED" : "FAILED") << std::endl;
        return passed;
    }
    else if (testName == "HelloSuite::VersionCheck") {
        std::string version = HelloWorld::getVersion();
        bool passed = !version.empty() && version.find("v1.0.0") != std::string::npos;
        std::cout << "Test result: " << (passed ? "PASSED" : "FAILED") << std::endl;
        return passed;
    }
    else if (testName == "HelloSuite::FullTestSuite") {
        bool passed = HelloWorld::runTests();
        std::cout << "Test result: " << (passed ? "PASSED" : "FAILED") << std::endl;
        return passed;
    }
    else {
        std::cout << "Unknown test: " << testName << std::endl;
        return false;
    }
}

int main(int argc, char* argv[]) {
    if (argc == 1) {
        // Default behavior - run all tests
        std::cout << "Running all tests..." << std::endl;
        bool allPassed = HelloWorld::runTests();
        std::cout << "Tests passed: " << (allPassed ? "true" : "false") << std::endl;
        return allPassed ? 0 : 1;
    }
    
    std::string arg = argv[1];
    
    if (arg == "GetTcList:" || arg == "--list") {
        // List available tests
        printTestList();
        return 0;
    }
    
    // Check if running a specific test
    if (arg.find("TC/") == 0) {
        // Extract test name from TC/TestSuite::TestCase format
        std::string testName = arg.substr(3); // Remove "TC/" prefix
        bool passed = runSpecificTest(testName);
        return passed ? 0 : 1;
    }
    
    std::cout << "Usage:" << std::endl;
    std::cout << "  " << argv[0] << "                    # Run all tests" << std::endl;
    std::cout << "  " << argv[0] << " GetTcList:         # List available tests" << std::endl;
    std::cout << "  " << argv[0] << " TC/TestSuite::Test  # Run specific test" << std::endl;
    
    return 1;
}