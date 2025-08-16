#pragma once
#include <string>
#include <vector>

namespace core {

struct Record {
    int id;
    std::string name;
    double value;
};

class Database {
public:
    virtual ~Database() = default;
    
    virtual bool connect(const std::string& connectionString) = 0;
    virtual void disconnect() = 0;
    virtual bool insert(const Record& record) = 0;
    virtual std::vector<Record> query(const std::string& sql) = 0;
};

} // namespace core
