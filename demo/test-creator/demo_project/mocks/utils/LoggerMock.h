#pragma once
#include "gmock/gmock.h"
#include "utils/Logger.h"

namespace utils {

class LoggerMock : public Logger {
public:
    MOCK_METHOD(void, log, (Level level, const std::string& message), (override));
    MOCK_METHOD(void, setOutput, (const std::string& filename), (override));
};

} // namespace utils
