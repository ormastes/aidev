#include "Calculator.h"
#include <cmath>
#include <sstream>
#include <iomanip>

Calculator::Calculator() 
    : memory_value(0.0), precision_digits(2), memory_initialized(false) {}

Calculator::~Calculator() {}

int Calculator::add(int a, int b) const {
    return a + b;
}

int Calculator::subtract(int a, int b) const {
    return a - b;
}

int Calculator::multiply(int a, int b) const {
    return a * b;
}

double Calculator::divide(int a, int b) const {
    if (b == 0) {
        throw CalculatorException("Division by zero");
    }
    return static_cast<double>(a) / b;
}

long Calculator::factorial(int n) const {
    if (n < 0) {
        throw CalculatorException("Factorial of negative number");
    }
    if (n > 20) {
        throw CalculatorException("Factorial too large");
    }
    
    long result = 1;
    for (int i = 2; i <= n; ++i) {
        result *= i;
    }
    return result;
}

double Calculator::power(double base, int exponent) const {
    return std::pow(base, exponent);
}

bool Calculator::isPrime(int number) const {
    if (number < 2) return false;
    if (number == 2) return true;
    if (number % 2 == 0) return false;
    
    for (int i = 3; i * i <= number; i += 2) {
        if (number % i == 0) return false;
    }
    return true;
}

void Calculator::store(double value) {
    memory_value = value;
    memory_initialized = true;
}

double Calculator::recall() const {
    if (!memory_initialized) {
        throw CalculatorException("Memory not initialized");
    }
    return memory_value;
}

void Calculator::clearMemory() {
    memory_value = 0.0;
    memory_initialized = false;
}

void Calculator::addToHistory(const std::string& operation, double result) {
    std::ostringstream oss;
    oss << std::fixed << std::setprecision(precision_digits) 
        << operation << " = " << result;
    calculation_history.push_back(oss.str());
}

std::vector<std::string> Calculator::getHistory() const {
    return calculation_history;
}

void Calculator::clearHistory() {
    calculation_history.clear();
}

void Calculator::setPrecision(int digits) {
    if (digits < 0 || digits > 10) {
        throw CalculatorException("Invalid precision");
    }
    precision_digits = digits;
}

int Calculator::getPrecision() const {
    return precision_digits;
}
