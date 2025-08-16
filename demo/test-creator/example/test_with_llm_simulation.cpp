// Example of what the LLM would generate for Calculator tests
#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include <climits>
#include <stdexcept>
#include "Calculator.h"

using namespace testing;
using namespace std;

class CalculatorTest : public ::testing::Test {
protected:
    Calculator* calculator;
    
    void SetUp() override {
        calculator = new Calculator();
    }
    
    void TearDown() override {
        delete calculator;
    }
};

TEST_F(CalculatorTest, Test_Calculator_add) {
    // Verifier: LLM Assistant
    // Test basic addition functionality
    
    // Arrange
    int a = 5;
    int b = 3;
    
    // Act
    int result = calculator->add(a, b);
    
    // Assert
    EXPECT_EQ(8, result);
    EXPECT_EQ(8, calculator->getLastResult());
}

TEST_F(CalculatorTest, Test_Calculator_add_NegativeNumbers) {
    // Verifier: LLM Assistant
    // Test addition with negative numbers
    
    // Arrange
    int a = -10;
    int b = 5;
    
    // Act
    int result = calculator->add(a, b);
    
    // Assert
    EXPECT_EQ(-5, result);
}

TEST_F(CalculatorTest, Test_Calculator_divide) {
    // Verifier: LLM Assistant
    // Test basic division functionality
    
    // Arrange
    int dividend = 10;
    int divisor = 2;
    
    // Act
    double result = calculator->divide(dividend, divisor);
    
    // Assert
    EXPECT_DOUBLE_EQ(5.0, result);
    EXPECT_DOUBLE_EQ(5.0, calculator->getLastResult());
}

TEST_F(CalculatorTest, Test_Calculator_divide_ByZero) {
    // Verifier: LLM Assistant
    // Test division by zero throws exception
    
    // Arrange
    int dividend = 10;
    int divisor = 0;
    
    // Act & Assert
    EXPECT_THROW(calculator->divide(dividend, divisor), std::invalid_argument);
}

TEST_F(CalculatorTest, Test_Calculator_factorial) {
    // Verifier: LLM Assistant
    // Test factorial calculation
    
    // Arrange
    int n = 5;
    
    // Act
    int result = calculator->factorial(n);
    
    // Assert
    EXPECT_EQ(120, result); // 5! = 120
}

TEST_F(CalculatorTest, Test_Calculator_factorial_Negative) {
    // Verifier: LLM Assistant
    // Test factorial with negative number throws exception
    
    // Arrange
    int n = -5;
    
    // Act & Assert
    EXPECT_THROW(calculator->factorial(n), std::invalid_argument);
}

TEST_F(CalculatorTest, Test_Calculator_isValidExpression) {
    // Verifier: LLM Assistant
    // Test expression validation
    
    // Arrange & Act & Assert
    EXPECT_TRUE(calculator->isValidExpression("2+3"));
    EXPECT_TRUE(calculator->isValidExpression("10 * (5 + 3)"));
    EXPECT_FALSE(calculator->isValidExpression(""));
    EXPECT_FALSE(calculator->isValidExpression("2 + a"));
    EXPECT_FALSE(calculator->isValidExpression("invalid@expression"));
}

TEST_F(CalculatorTest, Test_Calculator_reset) {
    // Verifier: LLM Assistant
    // Test reset functionality
    
    // Arrange
    calculator->add(10, 20); // Set lastResult to 30
    EXPECT_EQ(30, calculator->getLastResult());
    
    // Act
    calculator->reset();
    
    // Assert
    EXPECT_EQ(0.0, calculator->getLastResult());
}