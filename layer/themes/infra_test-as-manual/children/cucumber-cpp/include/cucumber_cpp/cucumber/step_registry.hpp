#ifndef CUCUMBER_CPP_STEP_REGISTRY_HPP
#define CUCUMBER_CPP_STEP_REGISTRY_HPP

#include <string>
#include <vector>
#include <regex>
#include <functional>
#include <memory>
#include <any>
#include <typeindex>
#include <map>

namespace cucumber_cpp {

// Forward declarations
class World;
class StepMatch;

// Parameter container for step functions
class Parameters {
public:
    template<typename T>
    void add(const T& value) {
        params_.push_back(value);
        types_.push_back(std::type_index(typeid(T)));
    }
    
    template<typename T>
    T get(size_t index) const {
        if (index >= params_.size()) {
            throw std::out_of_range("Parameter index out of range");
        }
        
        try {
            return std::any_cast<T>(params_[index]);
        } catch (const std::bad_any_cast& e) {
            throw std::runtime_error("Parameter type mismatch");
        }
    }
    
    size_t size() const { return params_.size(); }
    
    // String convenience methods
    std::string getString(size_t index) const { return get<std::string>(index); }
    int getInt(size_t index) const { return get<int>(index); }
    double getDouble(size_t index) const { return get<double>(index); }
    bool getBool(size_t index) const { return get<bool>(index); }
    
private:
    std::vector<std::any> params_;
    std::vector<std::type_index> types_;
};

// Step function signature
using StepFunction = std::function<void(World&, const Parameters&)>;

// Step definition
class StepDefinition {
public:
    StepDefinition(const std::string& pattern, StepFunction func)
        : pattern_(pattern)
        , regex_(pattern)
        , function_(func) {}
    
    const std::string& pattern() const { return pattern_; }
    const std::regex& regex() const { return regex_; }
    const StepFunction& function() const { return function_; }
    
    // Try to match step text
    std::optional<Parameters> match(const std::string& text) const;
    
private:
    std::string pattern_;
    std::regex regex_;
    StepFunction function_;
    
    // Extract parameters from matched groups
    Parameters extractParameters(const std::smatch& matches) const;
};

// Step match result
class StepMatch {
public:
    StepMatch(const StepDefinition* definition, Parameters params)
        : definition_(definition)
        , parameters_(std::move(params)) {}
    
    const StepDefinition* definition() const { return definition_; }
    const Parameters& parameters() const { return parameters_; }
    
    void execute(World& world) const {
        definition_->function()(world, parameters_);
    }
    
private:
    const StepDefinition* definition_;
    Parameters parameters_;
};

// Global step registry
class StepRegistry {
public:
    static StepRegistry& instance() {
        static StepRegistry registry;
        return registry;
    }
    
    // Register a step definition
    void registerStep(const std::string& pattern, StepFunction func) {
        definitions_.emplace_back(pattern, func);
    }
    
    // Find matching step definition
    std::optional<StepMatch> findMatch(const std::string& text) const {
        for (const auto& def : definitions_) {
            auto params = def.match(text);
            if (params) {
                return StepMatch(&def, *params);
            }
        }
        return std::nullopt;
    }
    
    // Clear all definitions (useful for testing)
    void clear() {
        definitions_.clear();
    }
    
    size_t size() const { return definitions_.size(); }
    
private:
    StepRegistry() = default;
    std::vector<StepDefinition> definitions_;
};

// Base World class - users should inherit from this
class World {
public:
    virtual ~World() = default;
    
    // Reset world state between scenarios
    virtual void reset() {}
    
    // Store scenario-specific data
    template<typename T>
    void set(const std::string& key, T value) {
        data_[key] = value;
    }
    
    template<typename T>
    T get(const std::string& key) const {
        auto it = data_.find(key);
        if (it == data_.end()) {
            throw std::runtime_error("Key not found: " + key);
        }
        return std::any_cast<T>(it->second);
    }
    
    template<typename T>
    T* getPtr(const std::string& key) {
        auto it = data_.find(key);
        if (it == data_.end()) {
            return nullptr;
        }
        return std::any_cast<T>(&it->second);
    }
    
    bool has(const std::string& key) const {
        return data_.find(key) != data_.end();
    }
    
private:
    std::map<std::string, std::any> data_;
};

// Hook functions
using HookFunction = std::function<void(World&)>;

class Hooks {
public:
    static Hooks& instance() {
        static Hooks hooks;
        return hooks;
    }
    
    void addBeforeScenario(HookFunction func) {
        before_scenario_.push_back(func);
    }
    
    void addAfterScenario(HookFunction func) {
        after_scenario_.push_back(func);
    }
    
    void addBeforeStep(HookFunction func) {
        before_step_.push_back(func);
    }
    
    void addAfterStep(HookFunction func) {
        after_step_.push_back(func);
    }
    
    void runBeforeScenario(World& world) {
        for (const auto& hook : before_scenario_) {
            hook(world);
        }
    }
    
    void runAfterScenario(World& world) {
        for (const auto& hook : after_scenario_) {
            hook(world);
        }
    }
    
    void runBeforeStep(World& world) {
        for (const auto& hook : before_step_) {
            hook(world);
        }
    }
    
    void runAfterStep(World& world) {
        for (const auto& hook : after_step_) {
            hook(world);
        }
    }
    
    void clear() {
        before_scenario_.clear();
        after_scenario_.clear();
        before_step_.clear();
        after_step_.clear();
    }
    
private:
    Hooks() = default;
    
    std::vector<HookFunction> before_scenario_;
    std::vector<HookFunction> after_scenario_;
    std::vector<HookFunction> before_step_;
    std::vector<HookFunction> after_step_;
};

// Registration helpers
inline void registerStep(const std::string& pattern, StepFunction func) {
    StepRegistry::instance().registerStep(pattern, func);
}

inline void Before(HookFunction func) {
    Hooks::instance().addBeforeScenario(func);
}

inline void After(HookFunction func) {
    Hooks::instance().addAfterScenario(func);
}

inline void BeforeStep(HookFunction func) {
    Hooks::instance().addBeforeStep(func);
}

inline void AfterStep(HookFunction func) {
    Hooks::instance().addAfterStep(func);
}

// Macros for step definitions
#define CUCUMBER_STEP(pattern, world_type) \
    static void CUCUMBER_STEP_FUNC_##__LINE__(cucumber_cpp::World& w, const cucumber_cpp::Parameters& p); \
    static struct CUCUMBER_STEP_REG_##__LINE__ { \
        CUCUMBER_STEP_REG_##__LINE__() { \
            cucumber_cpp::registerStep(pattern, CUCUMBER_STEP_FUNC_##__LINE__); \
        } \
    } CUCUMBER_STEP_REG_INSTANCE_##__LINE__; \
    static void CUCUMBER_STEP_FUNC_##__LINE__(cucumber_cpp::World& w, const cucumber_cpp::Parameters& p) { \
        auto& world = static_cast<world_type&>(w); \
        auto& params = p;

#define GIVEN(pattern) CUCUMBER_STEP("^Given " pattern "$", World)
#define WHEN(pattern) CUCUMBER_STEP("^When " pattern "$", World)
#define THEN(pattern) CUCUMBER_STEP("^Then " pattern "$", World)
#define AND(pattern) CUCUMBER_STEP("^And " pattern "$", World)
#define BUT(pattern) CUCUMBER_STEP("^But " pattern "$", World)

// End step definition
#define END_STEP }

} // namespace cucumber_cpp

#endif // CUCUMBER_CPP_STEP_REGISTRY_HPP