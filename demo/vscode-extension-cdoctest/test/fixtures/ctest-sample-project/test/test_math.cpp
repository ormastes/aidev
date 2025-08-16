#include <gtest/gtest.h>
#include "math_utils.h"

using namespace MathUtils;

// Test fixture for Calculator tests
class CalculatorTest : public ::testing::Test {
protected:
    void SetUp() override {
        // Setup code if needed
    }
    
    void TearDown() override {
        // Cleanup code if needed
    }
};

// Basic arithmetic tests
TEST_F(CalculatorTest, Addition) {
    EXPECT_EQ(Calculator::add(2, 3), 5);
    EXPECT_EQ(Calculator::add(-1, 1), 0);
    EXPECT_EQ(Calculator::add(0, 0), 0);
    EXPECT_EQ(Calculator::add(-5, -3), -8);
}

TEST_F(CalculatorTest, Subtraction) {
    EXPECT_EQ(Calculator::subtract(5, 3), 2);
    EXPECT_EQ(Calculator::subtract(1, 1), 0);
    EXPECT_EQ(Calculator::subtract(0, 5), -5);
    EXPECT_EQ(Calculator::subtract(-3, -1), -2);
}

TEST_F(CalculatorTest, Multiplication) {
    EXPECT_EQ(Calculator::multiply(3, 4), 12);
    EXPECT_EQ(Calculator::multiply(-2, 3), -6);
    EXPECT_EQ(Calculator::multiply(0, 100), 0);
    EXPECT_EQ(Calculator::multiply(-4, -5), 20);
}

TEST_F(CalculatorTest, Division) {
    EXPECT_DOUBLE_EQ(Calculator::divide(10.0, 2.0), 5.0);
    EXPECT_DOUBLE_EQ(Calculator::divide(7.0, 2.0), 3.5);
    EXPECT_DOUBLE_EQ(Calculator::divide(-8.0, 4.0), -2.0);
    
    // Test division by zero
    EXPECT_THROW(Calculator::divide(5.0, 0.0), std::invalid_argument);
}

// Fibonacci sequence tests
TEST_F(CalculatorTest, Fibonacci) {
    EXPECT_EQ(Calculator::fibonacci(0), 0);
    EXPECT_EQ(Calculator::fibonacci(1), 1);
    EXPECT_EQ(Calculator::fibonacci(2), 1);
    EXPECT_EQ(Calculator::fibonacci(3), 2);
    EXPECT_EQ(Calculator::fibonacci(5), 5);
    EXPECT_EQ(Calculator::fibonacci(10), 55);
    
    // Test negative input
    EXPECT_THROW(Calculator::fibonacci(-1), std::invalid_argument);
}

// Prime number tests
TEST_F(CalculatorTest, PrimeNumbers) {
    EXPECT_FALSE(Calculator::isPrime(0));
    EXPECT_FALSE(Calculator::isPrime(1));
    EXPECT_TRUE(Calculator::isPrime(2));
    EXPECT_TRUE(Calculator::isPrime(3));
    EXPECT_FALSE(Calculator::isPrime(4));
    EXPECT_TRUE(Calculator::isPrime(5));
    EXPECT_FALSE(Calculator::isPrime(9));
    EXPECT_TRUE(Calculator::isPrime(17));
    EXPECT_TRUE(Calculator::isPrime(97));
    EXPECT_FALSE(Calculator::isPrime(100));
}

// Factorial tests
TEST_F(CalculatorTest, Factorial) {
    EXPECT_EQ(Calculator::factorial(0), 1);
    EXPECT_EQ(Calculator::factorial(1), 1);
    EXPECT_EQ(Calculator::factorial(5), 120);
    EXPECT_EQ(Calculator::factorial(6), 720);
    
    // Test negative input
    EXPECT_THROW(Calculator::factorial(-1), std::invalid_argument);
}

// Test fixture for AdvancedMath tests
class AdvancedMathTest : public ::testing::Test {
protected:
    const double EPSILON = 1e-9;
};

TEST_F(AdvancedMathTest, Power) {
    EXPECT_DOUBLE_EQ(AdvancedMath::power(2.0, 3), 8.0);
    EXPECT_DOUBLE_EQ(AdvancedMath::power(5.0, 0), 1.0);
    EXPECT_DOUBLE_EQ(AdvancedMath::power(10.0, 2), 100.0);
    EXPECT_NEAR(AdvancedMath::power(2.5, 2), 6.25, EPSILON);
}

TEST_F(AdvancedMathTest, SquareRoot) {
    EXPECT_DOUBLE_EQ(AdvancedMath::squareRoot(4.0), 2.0);
    EXPECT_DOUBLE_EQ(AdvancedMath::squareRoot(9.0), 3.0);
    EXPECT_DOUBLE_EQ(AdvancedMath::squareRoot(0.0), 0.0);
    EXPECT_NEAR(AdvancedMath::squareRoot(2.0), 1.41421356, 1e-8);
    
    // Test negative input
    EXPECT_THROW(AdvancedMath::squareRoot(-1.0), std::invalid_argument);
}

TEST_F(AdvancedMathTest, Logarithm) {
    EXPECT_NEAR(AdvancedMath::logarithm(8.0, 2.0), 3.0, EPSILON);
    EXPECT_NEAR(AdvancedMath::logarithm(100.0, 10.0), 2.0, EPSILON);
    EXPECT_NEAR(AdvancedMath::logarithm(1.0, 10.0), 0.0, EPSILON);
    
    // Test invalid inputs
    EXPECT_THROW(AdvancedMath::logarithm(-1.0, 2.0), std::invalid_argument);
    EXPECT_THROW(AdvancedMath::logarithm(5.0, -1.0), std::invalid_argument);
    EXPECT_THROW(AdvancedMath::logarithm(5.0, 1.0), std::invalid_argument);
}

// Intentionally failing test for error handling verification
TEST_F(CalculatorTest, IntentionalFailure) {
    // This test is designed to fail to test error handling in the test system
    EXPECT_EQ(Calculator::add(1, 1), 3) << "This test should fail - 1 + 1 should not equal 3";
}

// Test that takes longer time for timeout testing
TEST_F(CalculatorTest, SlowTest) {
    // Simulate a slow test by calculating many fibonacci numbers
    for (int i = 0; i < 30; ++i) {
        Calculator::fibonacci(i);
    }
    EXPECT_TRUE(true);  // Should pass if not timed out
}