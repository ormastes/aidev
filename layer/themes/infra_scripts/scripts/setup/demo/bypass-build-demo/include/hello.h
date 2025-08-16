#pragma once

#include <string>

/**
 * @brief Simple hello world functions for testing bypass build functionality
 */
class HelloWorld {
public:
    /**
     * @brief Get a greeting message
     * @param name The name to greet (default: "World")
     * @return Greeting message
     */
    static std::string getGreeting(const std::string& name = "World");
    
    /**
     * @brief Get version information
     * @return Version string
     */
    static std::string getVersion();
    
    /**
     * @brief Run basic tests
     * @return true if all tests pass, false otherwise
     */
    static bool runTests();
};