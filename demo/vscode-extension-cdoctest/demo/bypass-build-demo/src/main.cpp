#include "hello.h"
#include <iostream>
#include <chrono>

int main() {
    auto start = std::chrono::high_resolution_clock::now();
    
    std::cout << "=== Bypass Build Demo ===" << std::endl;
    std::cout << HelloWorld::getVersion() << std::endl;
    std::cout << std::endl;
    
    // Show greeting
    std::cout << HelloWorld::getGreeting() << std::endl;
    std::cout << HelloWorld::getGreeting("VSCode Extension") << std::endl;
    std::cout << HelloWorld::getGreeting("CMake Build System") << std::endl;
    std::cout << std::endl;
    
    // Run tests
    bool testsPass = HelloWorld::runTests();
    
    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
    
    std::cout << std::endl;
    std::cout << "Execution time: " << duration.count() << "ms" << std::endl;
    std::cout << "Tests result: " << (testsPass ? "PASSED" : "FAILED") << std::endl;
    std::cout << "=== Demo Complete ===" << std::endl;
    
    return testsPass ? 0 : 1;
}