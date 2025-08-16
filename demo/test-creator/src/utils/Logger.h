#pragma once
#include <string>

class Logger {
public:
    Logger();
    virtual ~Logger();
    
    void log(const std::string& message);
    void error(const std::string& message);
    void debug(const std::string& message);
    
private:
    bool enabled;
};