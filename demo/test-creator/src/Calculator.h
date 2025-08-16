#pragma once
#include <vector>
#include <string>
#include <stdexcept>
#include <memory>

class Calculator {
public:
    class CalculatorException : public std::runtime_error {
    public:
        explicit CalculatorException(const std::string& message) 
            : std::runtime_error(message) {}
    };

    Calculator();
    virtual ~Calculator();
    
    // Basic operations
    int add(int a, int b) const;
    int subtract(int a, int b) const;
    int multiply(int a, int b) const;
    double divide(int a, int b) const;
    
    // Advanced operations
    long factorial(int n) const;
    double power(double base, int exponent) const;
    bool isPrime(int number) const;
    
    // Memory operations
    void store(double value);
    double recall() const;
    void clearMemory();
    
    // History operations
    void addToHistory(const std::string& operation, double result);
    std::vector<std::string> getHistory() const;
    void clearHistory();
    
    // Configuration
    void setPrecision(int digits);
    int getPrecision() const;

private:
    double memory_value;
    std::vector<std::string> calculation_history;
    int precision_digits;
    bool memory_initialized;
};
