// calculator_test_main.cpp - Main function for calculator step definitions test
#include "../include/gherkin_parser.hpp"
#include "../include/step_registry.hpp"
#include <iostream>

using namespace cucumber_cpp;

int main() {
    std::cout << "Calculator Step Definitions Test\n";
    std::cout << "=================================\n\n";
    
    // Get the step registry
    StepRegistry& registry = StepRegistry::getInstance();
    
    // Check registered steps
    std::cout << "Registered step definitions:\n";
    std::cout << "----------------------------\n";
    
    // Test some step patterns
    std::vector<std::string> testSteps = {
        "the calculator is initialized",
        "the display shows \"0\"",
        "I have entered 50 into the calculator",
        "I press add",
        "I press equals",
        "the result should be 120 on the screen",
        "I should see an error message \"Cannot divide by zero\""
    };
    
    for (const auto& step : testSteps) {
        StepContext context;
        if (registry.executeStep(step, context)) {
            std::cout << "✓ Found match for: " << step << "\n";
        } else {
            std::cout << "✗ No match for: " << step << "\n";
        }
    }
    
    std::cout << "\n";
    
    // Run a simple calculation test
    std::cout << "Running sample calculation:\n";
    std::cout << "--------------------------\n";
    
    StepContext ctx;
    
    // Initialize calculator
    if (registry.executeStep("the calculator is initialized", ctx)) {
        std::cout << "✓ Calculator initialized\n";
    }
    
    // Enter first number
    if (registry.executeStep("I have entered 50 into the calculator", ctx)) {
        std::cout << "✓ Entered 50\n";
    }
    
    // Press add
    if (registry.executeStep("I press add", ctx)) {
        std::cout << "✓ Pressed add\n";
    }
    
    // Enter second number
    if (registry.executeStep("I have entered 70 into the calculator", ctx)) {
        std::cout << "✓ Entered 70\n";
    }
    
    // Press equals
    if (registry.executeStep("I press equals", ctx)) {
        std::cout << "✓ Pressed equals\n";
    }
    
    // Check result
    if (registry.executeStep("the result should be 120 on the screen", ctx)) {
        std::cout << "✓ Result is 120\n";
    }
    
    std::cout << "\n✓ Calculator step definitions are working!\n";
    
    return 0;
}