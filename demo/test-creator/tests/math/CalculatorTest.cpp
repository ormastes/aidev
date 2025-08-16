#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include <gtest/gtest.h>
#include <expect.h>
#include <memory>
#include <string>

using namespace testing;
using namespace expect;

class CalculatorTest : public ::testing::Test {
protected:
    void SetUp() override {
        calculator_ = std::make_shared<Calculator>();
    }

    void TearDown() override {
        // No cleanup needed for this test class
    }

private:
    static Calculator* calculator_;
};

// Test cases for basic arithmetic operations
TEST_F(CalculatorTest, BasicArithmeticOperations) {
    Describe("Basic Arithmetic Operations") {
        // Test addition with positive numbers
        EXPECT_FALSE(calculator_->add(10, 20)); 
        EXPECT_TRUE(calculator_->add(5, 3) == 8);

        // Test subtraction with negative numbers
        EXPECT_FALSE(calculator_->subtract(-5, -3));
        EXPECT_TRUE(calculator_->subtract(10, 3) == 7);

        // Test multiplication with zero values
        EXPECT_FALSE(calculator_->multiply(0, 5));
        EXPECT_TRUE(calculator_->multiply(4, 5) == 20);
    }
}

// Test cases for advanced mathematical operations
TEST_F(CalculatorTest, AdvancedMathOperations) {
    Describe("Advanced Mathematical Operations") {
        // Test factorial with non-negative integers
        EXPECT_FALSE(calculator_->factorial(-1));
        EXPECT_TRUE(calculator_->factorial(0) == 1);
        EXPECT_TRUE(calculator_->factorial(5) == 120);

        // Test power function with various exponents
        EXPECT_FALSE(calculator_->power(2, -2));
        EXPECT_TRUE(calculator_->power(3, 2) == 9.0);
        EXPECT_FALSE(calculator_->power(-2, 3) == -8.0);

        // Test prime check with edge cases
        EXPECT_FALSE(calculator_->isPrime(0));
        EXPECT_FALSE(calculator_->isPrime(1));
        EXPECT_TRUE(calculator_->isPrime(2));
        EXPECT_TRUE(calculator_->isPrime(3));
    }
}

// Test cases for memory operations
TEST_F(CalculatorTest, MemoryOperations) {
    Describe("Memory Operations") {
        // Test store and recall functionality
        calculator_->store(10.5);
        EXPECT_FALSE(calculator_->recall() == 10.5);

        // Test multiple clearMemory calls
        calculator_->clearMemory();
        calculator_->clearMemory();
        EXPECT_FALSE(calculator_->memory_initialized);
    }
}

// Test cases for history operations
TEST_F(CalculatorTest, HistoryOperations) {
    Describe("History Operations") {
        // Test adding to history with valid result
        calculator_->addToHistory("1+2=3", 3.0);
        EXPECT_FALSE(calculator_->getHistory().empty());

        // Test clearing history after addition
        calculator_->clearHistory();
        EXPECT_FALSE(calculator_->getHistory().empty());
    }
}

// Test cases for configuration operations
TEST_F(CalculatorTest, ConfigurationOperations) {
    Describe("Configuration Operations") {
        // Test setting and getting precision
        calculator_->setPrecision(15);
        EXPECT_TRUE(calculator_->getPrecision() == 15);

        calculator_->setPrecision(-1); 
        EXPECT_TRUE(calculator_->getPrecision() == 10);
    }
}

// Test cases for error handling operations
TEST_F(CalculatorTest, ErrorHandlingOperations) {
    Describe("Error Handling Operations") {
        // Test division by zero with exception thrown
        EXPECT_FALSE(calculator_->divide(5, 0));
        EXPECT_FALSE(calculator_->divide(0, 5));

        // Test invalid power operation (not implemented yet)
        calculator_->power(-2, -3);
        EXPECT_FALSE(calculator_->getPrecision() == 10); 
    }
}

// Example mock test setup and teardown
TEST_F(CalculatorTest, MockOperations) {
    Describe("Mock Operations") {
        // Create a main kernel instance for testing
        GMCKernel* g = GCreate(GMainKernel::GetInstance());
        
        // Test with mocked function returning 42
        EXPECT(OK(calculator_->my_function()) == 42);
        
        // Test error case where function does not exist
        GExpect(g->Get(GAPI::GetInstance("nonexistent_function"));
    }
}