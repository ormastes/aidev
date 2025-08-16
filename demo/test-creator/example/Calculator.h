#ifndef CALCULATOR_H
#define CALCULATOR_H

#include <string>

class Calculator {
public:
    Calculator();
    ~Calculator();
    
    // Basic arithmetic operations
    int add(int a, int b);
    int subtract(int a, int b);
    int multiply(int a, int b);
    double divide(int a, int b);
    
    // Advanced operations
    int factorial(int n);
    double power(double base, int exponent);
    
    // String operations
    std::string formatResult(double value);
    bool isValidExpression(const std::string& expr);
    
    // State management
    void reset();
    double getLastResult() const;
    
private:
    double lastResult;
};

#endif // CALCULATOR_H