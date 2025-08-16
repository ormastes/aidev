#pragma once
#include <string>

namespace utils {

class Logger {
public:
    enum Level {
        DEBUG,
        INFO,
        WARNING,
        ERROR
    };
    
    virtual ~Logger() = default;
    
    virtual void log(Level level, const std::string& message) = 0;
    virtual void setOutput(const std::string& filename) = 0;
};

} // namespace utils
