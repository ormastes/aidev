#include "hello.h"
#include <iostream>
#include <sstream>

std::string HelloWorld::getGreeting(const std::string& name) {
    return "Hello, " + name + "!";
}

std::string HelloWorld::getVersion() {
    return "BypassBuildDemo v1.0.0";
}

bool HelloWorld::runTests() {
    std::cout << "Running basic tests..." << std::endl;
    
    // Test 1: Basic greeting
    std::string greeting = getGreeting();
    if (greeting != "Hello, World!") {
        std::cout << "❌ Test 1 failed: Expected 'Hello, World!', got '" << greeting << "'" << std::endl;
        return false;
    }
    std::cout << "✅ Test 1 passed: Basic greeting" << std::endl;
    
    // Test 2: Custom name greeting
    std::string customGreeting = getGreeting("CMake");
    if (customGreeting != "Hello, CMake!") {
        std::cout << "❌ Test 2 failed: Expected 'Hello, CMake!', got '" << customGreeting << "'" << std::endl;
        return false;
    }
    std::cout << "✅ Test 2 passed: Custom name greeting" << std::endl;
    
    // Test 3: Version check
    std::string version = getVersion();
    if (version.empty() || version.find("v1.0.0") == std::string::npos) {
        std::cout << "❌ Test 3 failed: Invalid version string '" << version << "'" << std::endl;
        return false;
    }
    std::cout << "✅ Test 3 passed: Version check" << std::endl;
    
    std::cout << "All tests passed!" << std::endl;
    return true;
}