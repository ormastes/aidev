#include "math_utils.h"
#include <cmath>
#include <stdexcept>

namespace MathUtils {

// Calculator implementation
int Calculator::add(int a, int b) {
    return a + b;
}

int Calculator::subtract(int a, int b) {
    return a - b;
}

int Calculator::multiply(int a, int b) {
    return a * b;
}

double Calculator::divide(double a, double b) {
    if (b == 0.0) {
        throw std::invalid_argument("Division by zero");
    }
    return a / b;
}

int Calculator::fibonacci(int n) {
    if (n < 0) {
        throw std::invalid_argument("Fibonacci not defined for negative numbers");
    }
    if (n <= 1) {
        return n;
    }
    
    int prev2 = 0, prev1 = 1, current = 0;
    for (int i = 2; i <= n; ++i) {
        current = prev1 + prev2;
        prev2 = prev1;
        prev1 = current;
    }
    return current;
}

bool Calculator::isPrime(int n) {
    if (n <= 1) return false;
    if (n <= 3) return true;
    if (n % 2 == 0 || n % 3 == 0) return false;
    
    for (int i = 5; i * i <= n; i += 6) {
        if (n % i == 0 || n % (i + 2) == 0) {
            return false;
        }
    }
    return true;
}

int Calculator::factorial(int n) {
    if (n < 0) {
        throw std::invalid_argument("Factorial not defined for negative numbers");
    }
    if (n <= 1) {
        return 1;
    }
    
    int result = 1;
    for (int i = 2; i <= n; ++i) {
        result *= i;
    }
    return result;
}

// AdvancedMath implementation
double AdvancedMath::power(double base, int exponent) {
    return std::pow(base, exponent);
}

double AdvancedMath::squareRoot(double value) {
    if (value < 0) {
        throw std::invalid_argument("Square root of negative number");
    }
    return std::sqrt(value);
}

double AdvancedMath::logarithm(double value, double base) {
    if (value <= 0 || base <= 0 || base == 1) {
        throw std::invalid_argument("Invalid arguments for logarithm");
    }
    return std::log(value) / std::log(base);
}

}  // namespace MathUtils