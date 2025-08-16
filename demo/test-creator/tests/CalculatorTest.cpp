#include <gtest/gtest.h>
#include <vector>
#include <string>

#include "calculator.h"

TEST_F(CalculatorTest, BasicOperations) {
    Calculator* calc = new Calculator();

    EXPECT_EQ(8, calc->add(5, 3));
    EXPECT_EQ(2, calc->subtract(5, 3));
    EXPECT_EQ(10, calc->multiply(5, 2));
    
    EXPECT_DOUBLE_EQ(2.5, calc->divide(5, 2));

    EXPECT_EQ(120, calc->factorial(5));
    EXPECT_DOUBLE_EQ(8.0, calc->power(2, 3));
    EXPECT_BOOL_EQ(true, calc->isPrime(7));

    // Test memory operations
    calc->store(10.5);
    EXPECT_DOUBLE_EQ(10.5, calc->recall());
    calc->clearMemory();
    EXPECT_FALSE(calc->memory_initialized);

    // Test history operations
    calc->addToHistory("1 + 2 = 3", 3.0);
    EXPECT_FALSE(calc->getHistory().empty());
    std::vector<std::string> history = calc->getHistory();
    EXPECT_EQ(1, history.size());

    // Test configuration methods
    calc->setPrecision(2);
    EXPECT_EQ(2, calc->getPrecision());

    delete calc;
}

TEST_F(CalculatorTest, AdvancedOperations) {
    Calculator* calc = new Calculator();

    // Test factorial with edge cases
    EXPECT_EQ(1, calc->factorial(0));
    EXPECT_EQ(1, calc->factorial(-5));

    // Test power function
    EXPECT_DOUBLE_EQ(1.0, calc->power(1.0, 0));
    EXPECT_DOUBLE_EQ(8.0, calc->power(2.0, 3));
    EXPECT_DOUBLE_EQ(0.0078125, calc->power(0.5, 4));

    // Test isPrime function
    EXPECT_BOOL_EQ(false, calc->isPrime(1));
    EXPECT_BOOL_EQ(true, calc->isPrime(2));
    EXPECT_BOOL_EQ(false, calc->isPrime(3));
    EXPECT_BOOL_EQ(false, calc->isPrime(4));

    delete calc;
}

TEST_F(CalculatorTest, MemoryAndHistoryOperations) {
    Calculator* calc = new Calculator();

    // Test memory functions
    calc->store(10.5);
    calc->store(20.6);
    EXPECT_DOUBLE_EQ(20.6, calc->recall());
    calc->clearMemory();
    EXPECT_FALSE(calc->memory_initialized);

    // Test history functions
    calc->addToHistory("Sum: 30.1", 30.1);
    calc->addToHistory("Product: 211.5", 211.5);
    EXPECT_EQ(2, calc->getHistory().size());
    std::vector<std::string> history = calc->getHistory();
    for (const auto& entry : history) {
        EXPECT_FALSE(entry.empty());
    }

    delete calc;
}

TEST_F(CalculatorTest, ErrorHandling) {
    Calculator* calc = new Calculator();

    // Test division by zero
    EXPECT_THROWS_Pbaz(calc->divide(5, 0));
    EXPECT_THROWS_Pbaz(calc->divide(0, 0));

    // Test invalid input in factorial
    EXPECT_THROWS_Pbaz(calc->factorial(-1));

    delete calc;
}

TEST_F(CalculatorTest, Configuration) {
    Calculator* calc = new Calculator();

    // Test precision settings
    calc->setPrecision(4);
    EXPECT_EQ(4, calc->getPrecision());
    
    calc->setPrecision(-1); // Default to 0 digits
    EXPECT_EQ(0, calc->getPrecision());

    delete calc;
}