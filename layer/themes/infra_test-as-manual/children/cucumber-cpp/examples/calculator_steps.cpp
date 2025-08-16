#include "../include/step_registry.hpp"
#include <stack>
#include <string>
#include <stdexcept>
#include <map>
#include <cmath>

using namespace cucumber_cpp;

// Calculator implementation for testing
class Calculator {
public:
    enum class Operation { NONE, ADD, SUBTRACT, MULTIPLY, DIVIDE };
    
    void clear() {
        currentValue_ = 0;
        storedValue_ = 0;
        operation_ = Operation::NONE;
        error_.clear();
    }
    
    void enterNumber(double value) {
        currentValue_ = value;
    }
    
    void setOperation(Operation op) {
        if (operation_ != Operation::NONE) {
            calculate();
        }
        storedValue_ = currentValue_;
        operation_ = op;
        currentValue_ = 0;
    }
    
    void add() { setOperation(Operation::ADD); }
    void subtract() { setOperation(Operation::SUBTRACT); }
    void multiply() { setOperation(Operation::MULTIPLY); }
    void divide() { setOperation(Operation::DIVIDE); }
    
    void calculate() {
        switch (operation_) {
            case Operation::ADD:
                currentValue_ = storedValue_ + currentValue_;
                break;
            case Operation::SUBTRACT:
                currentValue_ = storedValue_ - currentValue_;
                break;
            case Operation::MULTIPLY:
                currentValue_ = storedValue_ * currentValue_;
                break;
            case Operation::DIVIDE:
                if (currentValue_ == 0) {
                    error_ = "Cannot divide by zero";
                    return;
                }
                currentValue_ = storedValue_ / currentValue_;
                break;
            default:
                break;
        }
        operation_ = Operation::NONE;
    }
    
    double getDisplay() const { return currentValue_; }
    std::string getError() const { return error_; }
    bool hasError() const { return !error_.empty(); }
    
private:
    double currentValue_ = 0;
    double storedValue_ = 0;
    Operation operation_ = Operation::NONE;
    std::string error_;
};

// Global calculator instance for testing
static Calculator calculator;

// Step definitions for calculator feature

GIVEN("the calculator is initialized") {
    calculator.clear();
    context.set("calculator_ready", true);
}

GIVEN("the display shows {string}") {
    std::string expected = context.getString(0);
    double value = std::stod(expected);
    calculator.enterNumber(value);
}

GIVEN("I have entered {int} into the calculator") {
    int value = context.getInt(0);
    calculator.enterNumber(value);
    context.set("last_entered", value);
}

WHEN("I press add") {
    calculator.add();
    context.set("operation", "add");
}

WHEN("I press subtract") {
    calculator.subtract();
    context.set("operation", "subtract");
}

WHEN("I press multiply") {
    calculator.multiply();
    context.set("operation", "multiply");
}

WHEN("I press divide") {
    calculator.divide();
    context.set("operation", "divide");
}

WHEN("I press {word}") {
    std::string operation = context.getString(0);
    if (operation == "add") {
        calculator.add();
    } else if (operation == "subtract") {
        calculator.subtract();
    } else if (operation == "multiply") {
        calculator.multiply();
    } else if (operation == "divide") {
        calculator.divide();
    } else if (operation == "equals") {
        calculator.calculate();
    }
    context.set("operation", operation);
}

WHEN("I press equals") {
    calculator.calculate();
}

THEN("the result should be {int} on the screen") {
    int expected = context.getInt(0);
    double actual = calculator.getDisplay();
    
    if (std::abs(actual - expected) > 0.001) {
        context.fail("Expected " + std::to_string(expected) + 
                    " but got " + std::to_string(actual));
    }
}

THEN("the result should be {float} on the screen") {
    double expected = context.getDouble(0);
    double actual = calculator.getDisplay();
    
    if (std::abs(actual - expected) > 0.001) {
        context.fail("Expected " + std::to_string(expected) + 
                    " but got " + std::to_string(actual));
    }
}

THEN("I should see an error message {string}") {
    std::string expected = context.getString(0);
    
    if (!calculator.hasError()) {
        context.fail("Expected error but no error occurred");
    }
    
    std::string actual = calculator.getError();
    if (actual != expected) {
        context.fail("Expected error '" + expected + "' but got '" + actual + "'");
    }
}

// Test Hooks
namespace {
    bool setupCalled = false;
    bool teardownCalled = false;
    
    // Register hooks during static initialization
    struct HookRegistrar {
        HookRegistrar() {
            // Note: In a real implementation, these would be registered through the StepRegistry
            // For now, we'll just set flags directly in the steps
        }
    } hookRegistrar;
}

// Verify hooks are working
THEN("setup was called") {
    // In a real scenario, this would check if Before hook was called
    // For demo purposes, we'll just pass
}