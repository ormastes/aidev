#include "Calculator.h"
#include <stdexcept>
#include <sstream>
#include <iomanip>

Calculator::Calculator() : lastResult(0.0) {
}

Calculator::~Calculator() {
}

int Calculator::add(int a, int b) {
    int result = a + b;
    lastResult = result;
    return result;
}

int Calculator::subtract(int a, int b) {
    int result = a - b;
    lastResult = result;
    return result;
}

int Calculator::multiply(int a, int b) {
    int result = a * b;
    lastResult = result;
    return result;
}

double Calculator::divide(int a, int b) {
    if (b == 0) {
        throw std::invalid_argument("Division by zero");
    }
    double result = static_cast<double>(a) / b;
    lastResult = result;
    return result;
}

int Calculator::factorial(int n) {
    if (n < 0) {
        throw std::invalid_argument("Factorial of negative number");
    }
    if (n == 0 || n == 1) {
        return 1;
    }
    int result = 1;
    for (int i = 2; i <= n; ++i) {
        result *= i;
    }
    lastResult = result;
    return result;
}

double Calculator::power(double base, int exponent) {
    double result = 1.0;
    bool negativeExponent = exponent < 0;
    int absExponent = negativeExponent ? -exponent : exponent;
    
    for (int i = 0; i < absExponent; ++i) {
        result *= base;
    }
    
    if (negativeExponent) {
        result = 1.0 / result;
    }
    
    lastResult = result;
    return result;
}

std::string Calculator::formatResult(double value) {
    std::ostringstream oss;
    oss << std::fixed << std::setprecision(2) << value;
    return oss.str();
}

bool Calculator::isValidExpression(const std::string& expr) {
    // Simple validation - just check if not empty and contains only valid chars
    if (expr.empty()) {
        return false;
    }
    
    for (char c : expr) {
        if (!std::isdigit(c) && c != '+' && c != '-' && c != '*' && c != '/' && 
            c != '(' && c != ')' && c != ' ' && c != '.') {
            return false;
        }
    }
    
    return true;
}

void Calculator::reset() {
    lastResult = 0.0;
}

double Calculator::getLastResult() const {
    return lastResult;
}