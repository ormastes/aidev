#pragma once
#include "gmock/gmock.h"
#include "core/Database.h"

namespace core {

class DatabaseMock : public Database {
public:
    MOCK_METHOD(bool, connect, (const std::string& connectionString), (override));
    MOCK_METHOD(void, disconnect, (), (override));
    MOCK_METHOD(bool, insert, (const Record& record), (override));
    MOCK_METHOD(std::vector<Record>, query, (const std::string& sql), (override));
};

} // namespace core
