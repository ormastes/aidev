// Generated test file for Calculator using DeepSeek R1
#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include "Calculator.h"

using namespace testing;

class CalculatorTest : public ::testing::Test {
protected:
    void SetUp() override {
        calculator = std::make_unique<Calculator>();
    }
    
    void TearDown() override {
        // Cleanup handled by unique_ptr
    }
    
    std::unique_ptr<Calculator> calculator;
};

// Basic arithmetic operations tests
TEST_F(CalculatorTest, AddPositiveNumbers) {
    EXPECT_EQ(5, calculator->add(2, 3));
    EXPECT_EQ(10, calculator->add(7, 3));
    EXPECT_EQ(0, calculator->add(-5, 5));
}

TEST_F(CalculatorTest, AddNegativeNumbers) {
    EXPECT_EQ(-5, calculator->add(-2, -3));
    EXPECT_EQ(-1, calculator->add(-4, 3));
}

TEST_F(CalculatorTest, SubtractNumbers) {
    EXPECT_EQ(2, calculator->subtract(5, 3));
    EXPECT_EQ(-2, calculator->subtract(3, 5));
    EXPECT_EQ(0, calculator->subtract(7, 7));
}

TEST_F(CalculatorTest, MultiplyNumbers) {
    EXPECT_EQ(6, calculator->multiply(2, 3));
    EXPECT_EQ(-6, calculator->multiply(-2, 3));
    EXPECT_EQ(0, calculator->multiply(0, 5));
}

TEST_F(CalculatorTest, DivideNumbers) {
    EXPECT_DOUBLE_EQ(2.5, calculator->divide(5, 2));
    EXPECT_DOUBLE_EQ(-2.0, calculator->divide(6, -3));
}

TEST_F(CalculatorTest, DivideByZeroThrowsException) {
    EXPECT_THROW(calculator->divide(5, 0), Calculator::CalculatorException);
    EXPECT_THROW(calculator->divide(-3, 0), Calculator::CalculatorException);
}

// Advanced operations tests
TEST_F(CalculatorTest, FactorialPositiveNumbers) {
    EXPECT_EQ(1, calculator->factorial(0));
    EXPECT_EQ(1, calculator->factorial(1));
    EXPECT_EQ(6, calculator->factorial(3));
    EXPECT_EQ(120, calculator->factorial(5));
}

TEST_F(CalculatorTest, FactorialNegativeThrowsException) {
    EXPECT_THROW(calculator->factorial(-1), Calculator::CalculatorException);
    EXPECT_THROW(calculator->factorial(-5), Calculator::CalculatorException);
}

TEST_F(CalculatorTest, FactorialTooLargeThrowsException) {
    EXPECT_THROW(calculator->factorial(25), Calculator::CalculatorException);
}

TEST_F(CalculatorTest, PowerCalculation) {
    EXPECT_DOUBLE_EQ(8.0, calculator->power(2.0, 3));
    EXPECT_DOUBLE_EQ(1.0, calculator->power(5.0, 0));
    EXPECT_DOUBLE_EQ(0.25, calculator->power(2.0, -2));
}

TEST_F(CalculatorTest, IsPrimeTest) {
    EXPECT_FALSE(calculator->isPrime(0));
    EXPECT_FALSE(calculator->isPrime(1));
    EXPECT_TRUE(calculator->isPrime(2));
    EXPECT_TRUE(calculator->isPrime(3));
    EXPECT_FALSE(calculator->isPrime(4));
    EXPECT_TRUE(calculator->isPrime(7));
    EXPECT_FALSE(calculator->isPrime(9));
    EXPECT_TRUE(calculator->isPrime(17));
    EXPECT_FALSE(calculator->isPrime(-5));
}

// Memory operations tests
TEST_F(CalculatorTest, StoreAndRecallMemory) {
    calculator->store(42.5);
    EXPECT_DOUBLE_EQ(42.5, calculator->recall());
    
    calculator->store(-10.25);
    EXPECT_DOUBLE_EQ(-10.25, calculator->recall());
}

TEST_F(CalculatorTest, RecallUninitializedMemoryThrowsException) {
    EXPECT_THROW(calculator->recall(), Calculator::CalculatorException);
}

TEST_F(CalculatorTest, ClearMemory) {
    calculator->store(100.0);
    calculator->clearMemory();
    EXPECT_THROW(calculator->recall(), Calculator::CalculatorException);
}

// History operations tests
TEST_F(CalculatorTest, AddToHistoryAndRetrieve) {
    calculator->addToHistory("2 + 3", 5.0);
    calculator->addToHistory("10 / 2", 5.0);
    
    auto history = calculator->getHistory();
    EXPECT_EQ(2, history.size());
    EXPECT_THAT(history[0], HasSubstr("2 + 3"));
    EXPECT_THAT(history[1], HasSubstr("10 / 2"));
}

TEST_F(CalculatorTest, ClearHistory) {
    calculator->addToHistory("test", 1.0);
    calculator->clearHistory();
    
    auto history = calculator->getHistory();
    EXPECT_TRUE(history.empty());
}

// Configuration tests
TEST_F(CalculatorTest, SetAndGetPrecision) {
    calculator->setPrecision(3);
    EXPECT_EQ(3, calculator->getPrecision());
    
    calculator->setPrecision(8);
    EXPECT_EQ(8, calculator->getPrecision());
}

TEST_F(CalculatorTest, InvalidPrecisionThrowsException) {
    EXPECT_THROW(calculator->setPrecision(-1), Calculator::CalculatorException);
    EXPECT_THROW(calculator->setPrecision(15), Calculator::CalculatorException);
}

TEST_F(CalculatorTest, PrecisionAffectsHistoryFormatting) {
    calculator->setPrecision(1);
    calculator->addToHistory("test", 3.14159);
    
    auto history = calculator->getHistory();
    EXPECT_THAT(history[0], HasSubstr("3.1"));
    EXPECT_THAT(history[0], Not(HasSubstr("3.14")));
}

// Integration tests
TEST_F(CalculatorTest, ComplexCalculationWithMemoryAndHistory) {
    // Perform calculation: (5 + 3) * 2 = 16
    int sum = calculator->add(5, 3);
    calculator->store(sum);
    calculator->addToHistory("5 + 3", sum);
    
    double result = calculator->multiply(calculator->recall(), 2);
    calculator->addToHistory("8 * 2", result);
    
    EXPECT_EQ(16, result);
    
    auto history = calculator->getHistory();
    EXPECT_EQ(2, history.size());
}

TEST_F(CalculatorTest, ExceptionMessagesAreDescriptive) {
    try {
        calculator->divide(5, 0);
        FAIL() << "Expected CalculatorException";
    } catch (const Calculator::CalculatorException& e) {
        EXPECT_THAT(e.what(), HasSubstr("Division by zero"));
    }
    
    try {
        calculator->factorial(-5);
        FAIL() << "Expected CalculatorException";
    } catch (const Calculator::CalculatorException& e) {
        EXPECT_THAT(e.what(), HasSubstr("negative"));
    }
}