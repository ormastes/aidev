#include <gtest/gtest.h>
#include "../src/math_operations.h"

using namespace MathOps;

// Test fixture for Math Operations
class MathOperationsTest : public ::testing::Test {
protected:
    void SetUp() override {
        // Setup code if needed
    }

    void TearDown() override {
        // Cleanup code if needed
    }
};

// Basic arithmetic tests
TEST_F(MathOperationsTest, AddPositiveNumbers) {
    EXPECT_EQ(add(2, 3), 5);
    EXPECT_EQ(add(10, 20), 30);
    EXPECT_EQ(add(0, 0), 0);
}

TEST_F(MathOperationsTest, AddNegativeNumbers) {
    EXPECT_EQ(add(-2, -3), -5);
    EXPECT_EQ(add(-10, 5), -5);
    EXPECT_EQ(add(10, -5), 5);
}

TEST_F(MathOperationsTest, SubtractNumbers) {
    EXPECT_EQ(subtract(5, 3), 2);
    EXPECT_EQ(subtract(3, 5), -2);
    EXPECT_EQ(subtract(0, 0), 0);
    EXPECT_EQ(subtract(-5, -3), -2);
}

TEST_F(MathOperationsTest, MultiplyNumbers) {
    EXPECT_EQ(multiply(2, 3), 6);
    EXPECT_EQ(multiply(-2, 3), -6);
    EXPECT_EQ(multiply(-2, -3), 6);
    EXPECT_EQ(multiply(0, 100), 0);
}

TEST_F(MathOperationsTest, DivideNumbers) {
    EXPECT_DOUBLE_EQ(divide(10, 2), 5.0);
    EXPECT_DOUBLE_EQ(divide(7, 2), 3.5);
    EXPECT_DOUBLE_EQ(divide(-10, 2), -5.0);
    EXPECT_DOUBLE_EQ(divide(0, 5), 0.0);
}

TEST_F(MathOperationsTest, DivideByZero) {
    EXPECT_THROW(divide(10, 0), std::invalid_argument);
    EXPECT_THROW(divide(-5, 0), std::invalid_argument);
}

// Advanced operations tests
TEST(FactorialTest, ValidInputs) {
    EXPECT_EQ(factorial(0), 1);
    EXPECT_EQ(factorial(1), 1);
    EXPECT_EQ(factorial(5), 120);
    EXPECT_EQ(factorial(6), 720);
}

TEST(FactorialTest, NegativeInput) {
    EXPECT_THROW(factorial(-1), std::invalid_argument);
    EXPECT_THROW(factorial(-10), std::invalid_argument);
}

// Parameterized test for prime numbers
class PrimeTest : public ::testing::TestWithParam<std::pair<int, bool>> {};

TEST_P(PrimeTest, CheckPrime) {
    int number = GetParam().first;
    bool expected = GetParam().second;
    EXPECT_EQ(isPrime(number), expected);
}

INSTANTIATE_TEST_SUITE_P(
    PrimeNumbers,
    PrimeTest,
    ::testing::Values(
        std::make_pair(2, true),
        std::make_pair(3, true),
        std::make_pair(4, false),
        std::make_pair(5, true),
        std::make_pair(11, true),
        std::make_pair(13, true),
        std::make_pair(15, false),
        std::make_pair(17, true),
        std::make_pair(20, false),
        std::make_pair(29, true)
    )
);

// Fibonacci tests
TEST(FibonacciTest, BasicCases) {
    EXPECT_EQ(fibonacci(0), 0);
    EXPECT_EQ(fibonacci(1), 1);
    EXPECT_EQ(fibonacci(2), 1);
    EXPECT_EQ(fibonacci(3), 2);
    EXPECT_EQ(fibonacci(4), 3);
    EXPECT_EQ(fibonacci(5), 5);
    EXPECT_EQ(fibonacci(10), 55);
}

TEST(FibonacciTest, NegativeInput) {
    EXPECT_THROW(fibonacci(-1), std::invalid_argument);
}

// Death test example (for demonstration)
TEST(MathDeathTest, AssertionFailure) {
    EXPECT_DEATH({
        int* p = nullptr;
        // This would crash in a real scenario
        // *p = 10;
    }, "");
}