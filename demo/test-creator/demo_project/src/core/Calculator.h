#pragma once

namespace core {

class Calculator {
public:
    Calculator() = default;
    virtual ~Calculator() = default;
    
    virtual int add(int a, int b) const;
    virtual int subtract(int a, int b) const;
    virtual int multiply(int a, int b) const;
    virtual double divide(int a, int b) const;
    
    void setLogger(class Logger* logger) { m_logger = logger; }
    
private:
    class Logger* m_logger = nullptr;
};

} // namespace core
