#pragma once

namespace MathUtils {
    
/**
 * Basic arithmetic operations for testing
 */
class Calculator {
public:
    static int add(int a, int b);
    static int subtract(int a, int b);
    static int multiply(int a, int b);
    static double divide(double a, double b);
    
    // Edge case functions
    static int fibonacci(int n);
    static bool isPrime(int n);
    static int factorial(int n);
};

/**
 * Advanced math operations
 */
class AdvancedMath {
public:
    static double power(double base, int exponent);
    static double squareRoot(double value);
    static double logarithm(double value, double base = 2.71828); // e
};

}  // namespace MathUtils