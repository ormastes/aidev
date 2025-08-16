// Generated test file for Logger using DeepSeek R1
#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include <fstream>
#include <sstream>
#include "Logger.h"

using namespace testing;

class LoggerTest : public ::testing::Test {
protected:
    void SetUp() override {
        test_filename = "test_log.txt";
        logger = std::make_unique<Logger>(test_filename);
    }
    
    void TearDown() override {
        // Remove test file if it exists
        std::remove(test_filename.c_str());
    }
    
    std::unique_ptr<Logger> logger;
    std::string test_filename;
};

// Basic logging functionality tests
TEST_F(LoggerTest, LogWithDifferentLevels) {
    logger->log("Debug message", Logger::DEBUG);
    logger->log("Info message", Logger::INFO);
    logger->log("Warning message", Logger::WARNING);
    logger->log("Error message", Logger::ERROR);
    
    auto recent_logs = logger->getRecentLogs(4);
    EXPECT_EQ(4, recent_logs.size());
}

TEST_F(LoggerTest, ConvenienceMethodsWork) {
    logger->debug("Debug test");
    logger->info("Info test");
    logger->warning("Warning test");
    logger->error("Error test");
    
    auto recent_logs = logger->getRecentLogs(4);
    EXPECT_EQ(4, recent_logs.size());
    
    EXPECT_THAT(recent_logs[0], HasSubstr("Debug test"));
    EXPECT_THAT(recent_logs[1], HasSubstr("Info test"));
    EXPECT_THAT(recent_logs[2], HasSubstr("Warning test"));
    EXPECT_THAT(recent_logs[3], HasSubstr("Error test"));
}

// Log level management tests
TEST_F(LoggerTest, SetAndGetLogLevel) {
    logger->setLogLevel(Logger::WARNING);
    EXPECT_EQ(Logger::WARNING, logger->getLogLevel());
    
    logger->setLogLevel(Logger::ERROR);
    EXPECT_EQ(Logger::ERROR, logger->getLogLevel());
}

TEST_F(LoggerTest, LogLevelFiltersMessages) {
    logger->setLogLevel(Logger::WARNING);
    
    logger->debug("Should not appear");
    logger->info("Should not appear");
    logger->warning("Should appear");
    logger->error("Should appear");
    
    auto recent_logs = logger->getRecentLogs(10);
    EXPECT_EQ(2, recent_logs.size());
    EXPECT_THAT(recent_logs[0], HasSubstr("Should appear"));
    EXPECT_THAT(recent_logs[1], HasSubstr("Should appear"));
}

// Enable/disable functionality tests
TEST_F(LoggerTest, EnableDisableLogging) {
    EXPECT_TRUE(logger->isEnabled()); // Should be enabled by default
    
    logger->setEnabled(false);
    EXPECT_FALSE(logger->isEnabled());
    
    logger->info("This should not be logged");
    auto recent_logs = logger->getRecentLogs(1);
    EXPECT_TRUE(recent_logs.empty());
    
    logger->setEnabled(true);
    logger->info("This should be logged");
    recent_logs = logger->getRecentLogs(1);
    EXPECT_EQ(1, recent_logs.size());
}

// Recent logs functionality tests
TEST_F(LoggerTest, GetRecentLogsWithCount) {
    for (int i = 0; i < 15; i++) {
        logger->info("Message " + std::to_string(i));
    }
    
    auto recent_5 = logger->getRecentLogs(5);
    EXPECT_EQ(5, recent_5.size());
    
    auto recent_10 = logger->getRecentLogs(10);
    EXPECT_EQ(10, recent_10.size());
    
    auto recent_20 = logger->getRecentLogs(20);
    EXPECT_EQ(15, recent_20.size()); // Only 15 messages were logged
}

TEST_F(LoggerTest, GetRecentLogsDefaultCount) {
    for (int i = 0; i < 15; i++) {
        logger->info("Message " + std::to_string(i));
    }
    
    auto recent_default = logger->getRecentLogs();
    EXPECT_EQ(10, recent_default.size()); // Default should be 10
}

TEST_F(LoggerTest, GetRecentLogsWhenEmpty) {
    auto recent_logs = logger->getRecentLogs(5);
    EXPECT_TRUE(recent_logs.empty());
}

// Clear logs functionality tests
TEST_F(LoggerTest, ClearLogs) {
    logger->info("Message 1");
    logger->info("Message 2");
    logger->info("Message 3");
    
    auto logs_before = logger->getRecentLogs(5);
    EXPECT_EQ(3, logs_before.size());
    
    logger->clearLogs();
    
    auto logs_after = logger->getRecentLogs(5);
    EXPECT_TRUE(logs_after.empty());
}

// File logging tests (if applicable)
TEST_F(LoggerTest, LogsWrittenToFile) {
    logger->info("Test file message");
    
    // Force flush or close to ensure write
    logger.reset(); // This should trigger destructor and close file
    
    // Read file content
    std::ifstream file(test_filename);
    if (file.is_open()) {
        std::string line;
        bool found = false;
        while (std::getline(file, line)) {
            if (line.find("Test file message") != std::string::npos) {
                found = true;
                break;
            }
        }
        EXPECT_TRUE(found);
    }
}

// Edge cases and error handling tests
TEST_F(LoggerTest, LogEmptyMessage) {
    logger->info("");
    
    auto recent_logs = logger->getRecentLogs(1);
    EXPECT_EQ(1, recent_logs.size());
}

TEST_F(LoggerTest, LogVeryLongMessage) {
    std::string long_message(10000, 'A');
    logger->info(long_message);
    
    auto recent_logs = logger->getRecentLogs(1);
    EXPECT_EQ(1, recent_logs.size());
    EXPECT_THAT(recent_logs[0], HasSubstr("AAA"));
}

TEST_F(LoggerTest, GetRecentLogsWithZeroCount) {
    logger->info("Test message");
    
    auto recent_logs = logger->getRecentLogs(0);
    EXPECT_TRUE(recent_logs.empty());
}

TEST_F(LoggerTest, GetRecentLogsWithNegativeCount) {
    logger->info("Test message");
    
    auto recent_logs = logger->getRecentLogs(-5);
    EXPECT_TRUE(recent_logs.empty());
}

// Constructor tests
TEST_F(LoggerTest, ConstructorWithEmptyFilename) {
    auto logger_no_file = std::make_unique<Logger>("");
    EXPECT_TRUE(logger_no_file->isEnabled());
    
    logger_no_file->info("Test message");
    auto recent_logs = logger_no_file->getRecentLogs(1);
    EXPECT_EQ(1, recent_logs.size());
}

// Integration tests
TEST_F(LoggerTest, ComplexLoggingScenario) {
    // Set up logging environment
    logger->setLogLevel(Logger::INFO);
    
    // Log various messages
    logger->debug("Debug message - should be filtered");
    logger->info("Starting process");
    logger->warning("Process warning");
    logger->error("Process error");
    
    // Check log count
    auto all_logs = logger->getRecentLogs(10);
    EXPECT_EQ(3, all_logs.size()); // Debug should be filtered out
    
    // Change log level and log more
    logger->setLogLevel(Logger::ERROR);
    logger->info("Another info - should be filtered");
    logger->error("Another error");
    
    // Verify filtering worked
    auto filtered_logs = logger->getRecentLogs(10);
    EXPECT_EQ(4, filtered_logs.size()); // 3 previous + 1 new error
    
    // Clear and verify
    logger->clearLogs();
    auto cleared_logs = logger->getRecentLogs(10);
    EXPECT_TRUE(cleared_logs.empty());
}