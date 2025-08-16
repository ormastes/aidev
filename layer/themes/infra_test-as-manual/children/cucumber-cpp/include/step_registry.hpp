#ifndef STEP_REGISTRY_HPP
#define STEP_REGISTRY_HPP

#include <string>
#include <regex>
#include <functional>
#include <vector>
#include <memory>
#include <unordered_map>
#include <any>
#include <typeinfo>
#include <sstream>
#include "gherkin_parser.hpp"

namespace cucumber_cpp {

// Forward declarations
class StepContext;
class StepRegistry;
class StepDefinition;

// Type aliases for step functions
using StepFunction = std::function<void(StepContext&)>;
using ParameterExtractor = std::function<std::vector<std::any>(const std::string&)>;

// Step execution context
class StepContext {
public:
    StepContext(const Step& step, const std::vector<std::any>& params);
    
    // Parameter access
    template<typename T>
    T get(size_t index) const {
        if (index >= parameters_.size()) {
            throw std::out_of_range("Parameter index out of range");
        }
        return std::any_cast<T>(parameters_[index]);
    }
    
    // Get parameter as string
    std::string getString(size_t index) const;
    int getInt(size_t index) const;
    double getDouble(size_t index) const;
    bool getBool(size_t index) const;
    
    // Access to step data
    const Step& getStep() const { return step_; }
    std::shared_ptr<DataTable> getDataTable() const { return step_.getDataTable(); }
    std::shared_ptr<DocString> getDocString() const { return step_.getDocString(); }
    
    // Test state management
    void setPending(const std::string& message = "");
    void setSkipped(const std::string& reason = "");
    void fail(const std::string& message);
    
    // Shared data between steps
    template<typename T>
    void set(const std::string& key, const T& value) {
        sharedData_[key] = value;
    }
    
    template<typename T>
    T get(const std::string& key) const {
        auto it = sharedData_.find(key);
        if (it == sharedData_.end()) {
            throw std::runtime_error("Shared data key not found: " + key);
        }
        return std::any_cast<T>(it->second);
    }
    
    bool hasKey(const std::string& key) const {
        return sharedData_.find(key) != sharedData_.end();
    }
    
private:
    const Step& step_;
    std::vector<std::any> parameters_;
    std::unordered_map<std::string, std::any> sharedData_;
    static std::unordered_map<std::string, std::any> globalSharedData_;
};

// Step definition class
class StepDefinition {
public:
    StepDefinition(const std::string& pattern, StepFunction func);
    
    bool matches(const std::string& stepText) const;
    std::vector<std::any> extractParameters(const std::string& stepText) const;
    void execute(StepContext& context) const;
    
    const std::string& getPattern() const { return pattern_; }
    
private:
    std::string pattern_;
    std::regex regex_;
    StepFunction function_;
    std::vector<std::string> parameterTypes_;
    
    void parsePattern();
    std::any convertParameter(const std::string& value, const std::string& type) const;
};

// Step registry singleton
class StepRegistry {
public:
    static StepRegistry& getInstance();
    
    // Register step definitions
    void registerStep(Step::Type type, const std::string& pattern, StepFunction func);
    void registerGiven(const std::string& pattern, StepFunction func);
    void registerWhen(const std::string& pattern, StepFunction func);
    void registerThen(const std::string& pattern, StepFunction func);
    
    // Find matching step definition
    std::shared_ptr<StepDefinition> findStep(Step::Type type, const std::string& stepText) const;
    
    // Execute a step
    void executeStep(const Step& step);
    
    // Clear all registered steps
    void clear();
    
    // Get all registered patterns for a step type
    std::vector<std::string> getPatterns(Step::Type type) const;
    
private:
    StepRegistry() = default;
    StepRegistry(const StepRegistry&) = delete;
    StepRegistry& operator=(const StepRegistry&) = delete;
    
    std::unordered_map<Step::Type, std::vector<std::shared_ptr<StepDefinition>>> steps_;
    
    Step::Type resolveStepType(Step::Type type) const;
};

// Cucumber expression parser for parameter types
class CucumberExpressions {
public:
    // Convert Cucumber expressions to regex
    static std::string toRegex(const std::string& expression);
    
    // Common parameter types
    static const std::string INT_PATTERN;
    static const std::string FLOAT_PATTERN;
    static const std::string STRING_PATTERN;
    static const std::string WORD_PATTERN;
    
private:
    static std::string replaceParameterTypes(const std::string& expression);
};

// Helper macros for unique name generation
#define CUCUMBER_CONCAT(a, b) a##b
#define CUCUMBER_MAKE_UNIQUE(base, line) CUCUMBER_CONCAT(base, line)

// Step definition macros
#define GIVEN(pattern) \
    static void CUCUMBER_MAKE_UNIQUE(cucumber_step_given_, __LINE__)(cucumber_cpp::StepContext& context); \
    static struct CUCUMBER_MAKE_UNIQUE(cucumber_registrar_given_, __LINE__) { \
        CUCUMBER_MAKE_UNIQUE(cucumber_registrar_given_, __LINE__)() { \
            cucumber_cpp::StepRegistry::getInstance().registerGiven( \
                pattern, CUCUMBER_MAKE_UNIQUE(cucumber_step_given_, __LINE__)); \
        } \
    } CUCUMBER_MAKE_UNIQUE(cucumber_registrar_instance_given_, __LINE__); \
    static void CUCUMBER_MAKE_UNIQUE(cucumber_step_given_, __LINE__)(cucumber_cpp::StepContext& context)

#define WHEN(pattern) \
    static void CUCUMBER_MAKE_UNIQUE(cucumber_step_when_, __LINE__)(cucumber_cpp::StepContext& context); \
    static struct CUCUMBER_MAKE_UNIQUE(cucumber_registrar_when_, __LINE__) { \
        CUCUMBER_MAKE_UNIQUE(cucumber_registrar_when_, __LINE__)() { \
            cucumber_cpp::StepRegistry::getInstance().registerWhen( \
                pattern, CUCUMBER_MAKE_UNIQUE(cucumber_step_when_, __LINE__)); \
        } \
    } CUCUMBER_MAKE_UNIQUE(cucumber_registrar_instance_when_, __LINE__); \
    static void CUCUMBER_MAKE_UNIQUE(cucumber_step_when_, __LINE__)(cucumber_cpp::StepContext& context)

#define THEN(pattern) \
    static void CUCUMBER_MAKE_UNIQUE(cucumber_step_then_, __LINE__)(cucumber_cpp::StepContext& context); \
    static struct CUCUMBER_MAKE_UNIQUE(cucumber_registrar_then_, __LINE__) { \
        CUCUMBER_MAKE_UNIQUE(cucumber_registrar_then_, __LINE__)() { \
            cucumber_cpp::StepRegistry::getInstance().registerThen( \
                pattern, CUCUMBER_MAKE_UNIQUE(cucumber_step_then_, __LINE__)); \
        } \
    } CUCUMBER_MAKE_UNIQUE(cucumber_registrar_instance_then_, __LINE__); \
    static void CUCUMBER_MAKE_UNIQUE(cucumber_step_then_, __LINE__)(cucumber_cpp::StepContext& context)

// Aliases for And/But (they inherit the previous step type)
#define AND(pattern) GIVEN(pattern)
#define BUT(pattern) GIVEN(pattern)

// Table iteration helpers
class TableIterator {
public:
    TableIterator(std::shared_ptr<DataTable> table);
    
    bool hasNext() const;
    std::vector<std::string> next();
    
    // Column access helpers
    std::string get(const std::string& column) const;
    std::string get(size_t index) const;
    
    // Convert current row to map
    std::unordered_map<std::string, std::string> toMap() const;
    
private:
    std::shared_ptr<DataTable> table_;
    size_t currentRow_;
    std::vector<std::string> headers_;
    std::vector<std::string> currentRowData_;
};

// Test hooks
class Hooks {
public:
    using HookFunction = std::function<void()>;
    using TaggedHookFunction = std::function<void(const std::vector<std::string>&)>;
    
    static void Before(HookFunction func);
    static void Before(const std::string& tag, TaggedHookFunction func);
    static void After(HookFunction func);
    static void After(const std::string& tag, TaggedHookFunction func);
    static void BeforeStep(HookFunction func);
    static void AfterStep(HookFunction func);
    
    static void executeBeforeHooks(const std::vector<std::string>& tags = {});
    static void executeAfterHooks(const std::vector<std::string>& tags = {});
    static void executeBeforeStepHooks();
    static void executeAfterStepHooks();
    
private:
    static std::vector<HookFunction> beforeHooks_;
    static std::vector<std::pair<std::string, TaggedHookFunction>> taggedBeforeHooks_;
    static std::vector<HookFunction> afterHooks_;
    static std::vector<std::pair<std::string, TaggedHookFunction>> taggedAfterHooks_;
    static std::vector<HookFunction> beforeStepHooks_;
    static std::vector<HookFunction> afterStepHooks_;
};

} // namespace cucumber_cpp

#endif // STEP_REGISTRY_HPP