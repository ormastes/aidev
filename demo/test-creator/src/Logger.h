#pragma once
#include <string>
#include <vector>

class Logger {
public:
    enum LogLevel { DEBUG = 0, INFO = 1, WARNING = 2, ERROR = 3 };
    
    Logger(const std::string& filename = "");
    virtual ~Logger();
    
    void log(const std::string& message, LogLevel level = INFO);
    void debug(const std::string& message);
    void info(const std::string& message);
    void warning(const std::string& message);
    void error(const std::string& message);
    
    void setLogLevel(LogLevel level);
    LogLevel getLogLevel() const;
    
    std::vector<std::string> getRecentLogs(int count = 10) const;
    void clearLogs();
    
    bool isEnabled() const;
    void setEnabled(bool enabled);

private:
    std::string log_filename;
    LogLevel current_level;
    bool enabled;
    std::vector<std::string> recent_logs;
};
