#include "step_registry.hpp"
#include <iostream>
#include <algorithm>
#include <stdexcept>

namespace cucumber_cpp {

// Static member initialization
std::unordered_map<std::string, std::any> StepContext::globalSharedData_;

// Hooks static members
std::vector<Hooks::HookFunction> Hooks::beforeHooks_;
std::vector<std::pair<std::string, Hooks::TaggedHookFunction>> Hooks::taggedBeforeHooks_;
std::vector<Hooks::HookFunction> Hooks::afterHooks_;
std::vector<std::pair<std::string, Hooks::TaggedHookFunction>> Hooks::taggedAfterHooks_;
std::vector<Hooks::HookFunction> Hooks::beforeStepHooks_;
std::vector<Hooks::HookFunction> Hooks::afterStepHooks_;

// CucumberExpressions constants
const std::string CucumberExpressions::INT_PATTERN = "(-?\\d+)";
const std::string CucumberExpressions::FLOAT_PATTERN = "(-?\\d+\\.\\d+)";
const std::string CucumberExpressions::STRING_PATTERN = "\"([^\"]*)\"";
const std::string CucumberExpressions::WORD_PATTERN = "(\\w+)";

// StepContext implementation
StepContext::StepContext(const Step& step, const std::vector<std::any>& params)
    : step_(step), parameters_(params) {}

std::string StepContext::getString(size_t index) const {
    if (index >= parameters_.size()) {
        throw std::out_of_range("Parameter index out of range");
    }
    
    // Try to cast to string directly
    try {
        return std::any_cast<std::string>(parameters_[index]);
    } catch (const std::bad_any_cast&) {
        // Try to convert from other types
        if (parameters_[index].type() == typeid(int)) {
            return std::to_string(std::any_cast<int>(parameters_[index]));
        } else if (parameters_[index].type() == typeid(double)) {
            return std::to_string(std::any_cast<double>(parameters_[index]));
        } else if (parameters_[index].type() == typeid(bool)) {
            return std::any_cast<bool>(parameters_[index]) ? "true" : "false";
        }
        throw;
    }
}

int StepContext::getInt(size_t index) const {
    if (index >= parameters_.size()) {
        throw std::out_of_range("Parameter index out of range");
    }
    
    try {
        return std::any_cast<int>(parameters_[index]);
    } catch (const std::bad_any_cast&) {
        // Try to convert from string
        if (parameters_[index].type() == typeid(std::string)) {
            return std::stoi(std::any_cast<std::string>(parameters_[index]));
        }
        throw;
    }
}

double StepContext::getDouble(size_t index) const {
    if (index >= parameters_.size()) {
        throw std::out_of_range("Parameter index out of range");
    }
    
    try {
        return std::any_cast<double>(parameters_[index]);
    } catch (const std::bad_any_cast&) {
        // Try to convert from string or int
        if (parameters_[index].type() == typeid(std::string)) {
            return std::stod(std::any_cast<std::string>(parameters_[index]));
        } else if (parameters_[index].type() == typeid(int)) {
            return static_cast<double>(std::any_cast<int>(parameters_[index]));
        }
        throw;
    }
}

bool StepContext::getBool(size_t index) const {
    if (index >= parameters_.size()) {
        throw std::out_of_range("Parameter index out of range");
    }
    
    try {
        return std::any_cast<bool>(parameters_[index]);
    } catch (const std::bad_any_cast&) {
        // Try to convert from string
        if (parameters_[index].type() == typeid(std::string)) {
            std::string str = std::any_cast<std::string>(parameters_[index]);
            return str == "true" || str == "yes" || str == "1";
        }
        throw;
    }
}

void StepContext::setPending(const std::string& message) {
    throw std::runtime_error("Step pending: " + message);
}

void StepContext::setSkipped(const std::string& reason) {
    throw std::runtime_error("Step skipped: " + reason);
}

void StepContext::fail(const std::string& message) {
    throw std::runtime_error("Step failed: " + message);
}

// StepDefinition implementation
StepDefinition::StepDefinition(const std::string& pattern, StepFunction func)
    : pattern_(pattern), function_(func) {
    parsePattern();
}

void StepDefinition::parsePattern() {
    std::string regexPattern = pattern_;
    
    // Replace Cucumber expression parameters with regex
    regexPattern = CucumberExpressions::toRegex(regexPattern);
    
    // Escape special regex characters (except our parameter markers)
    std::string escaped;
    for (char c : regexPattern) {
        if (c == '.' || c == '^' || c == '$' || c == '*' || c == '+' || 
            c == '?' || c == '[' || c == ']' || c == '|') {
            escaped += '\\';
        }
        escaped += c;
    }
    
    // Create regex
    regex_ = std::regex(regexPattern);
    
    // Extract parameter types from pattern
    std::regex paramRegex("\\{(\\w+)\\}");
    std::smatch match;
    std::string temp = pattern_;
    
    while (std::regex_search(temp, match, paramRegex)) {
        parameterTypes_.push_back(match[1]);
        temp = match.suffix();
    }
}

bool StepDefinition::matches(const std::string& stepText) const {
    return std::regex_match(stepText, regex_);
}

std::vector<std::any> StepDefinition::extractParameters(const std::string& stepText) const {
    std::vector<std::any> parameters;
    std::smatch match;
    
    if (std::regex_match(stepText, match, regex_)) {
        // Skip the first match (full string)
        for (size_t i = 1; i < match.size(); ++i) {
            std::string value = match[i];
            std::string type = (i - 1 < parameterTypes_.size()) ? 
                              parameterTypes_[i - 1] : "string";
            parameters.push_back(convertParameter(value, type));
        }
    }
    
    return parameters;
}

std::any StepDefinition::convertParameter(const std::string& value, const std::string& type) const {
    if (type == "int") {
        return std::stoi(value);
    } else if (type == "float" || type == "double") {
        return std::stod(value);
    } else if (type == "bool") {
        return value == "true" || value == "yes" || value == "1";
    } else {
        return value;
    }
}

void StepDefinition::execute(StepContext& context) const {
    Hooks::executeBeforeStepHooks();
    function_(context);
    Hooks::executeAfterStepHooks();
}

// CucumberExpressions implementation
std::string CucumberExpressions::toRegex(const std::string& expression) {
    std::string result = expression;
    
    // Replace {int} with integer pattern
    size_t pos = 0;
    while ((pos = result.find("{int}", pos)) != std::string::npos) {
        result.replace(pos, 5, INT_PATTERN);
        pos += INT_PATTERN.length();
    }
    
    // Replace {float} with float pattern
    pos = 0;
    while ((pos = result.find("{float}", pos)) != std::string::npos) {
        result.replace(pos, 7, FLOAT_PATTERN);
        pos += FLOAT_PATTERN.length();
    }
    
    // Replace {string} with string pattern
    pos = 0;
    while ((pos = result.find("{string}", pos)) != std::string::npos) {
        result.replace(pos, 8, STRING_PATTERN);
        pos += STRING_PATTERN.length();
    }
    
    // Replace {word} with word pattern
    pos = 0;
    while ((pos = result.find("{word}", pos)) != std::string::npos) {
        result.replace(pos, 6, WORD_PATTERN);
        pos += WORD_PATTERN.length();
    }
    
    // Replace generic {parameter} with (.+)
    std::regex genericParam("\\{\\w+\\}");
    result = std::regex_replace(result, genericParam, "(.+)");
    
    return "^" + result + "$";
}

// StepRegistry implementation
StepRegistry& StepRegistry::getInstance() {
    static StepRegistry instance;
    return instance;
}

void StepRegistry::registerStep(Step::Type type, const std::string& pattern, StepFunction func) {
    auto stepDef = std::make_shared<StepDefinition>(pattern, func);
    steps_[type].push_back(stepDef);
}

void StepRegistry::registerGiven(const std::string& pattern, StepFunction func) {
    registerStep(Step::Type::GIVEN, pattern, func);
}

void StepRegistry::registerWhen(const std::string& pattern, StepFunction func) {
    registerStep(Step::Type::WHEN, pattern, func);
}

void StepRegistry::registerThen(const std::string& pattern, StepFunction func) {
    registerStep(Step::Type::THEN, pattern, func);
}

std::shared_ptr<StepDefinition> StepRegistry::findStep(Step::Type type, const std::string& stepText) const {
    // Resolve And/But to the appropriate type based on context
    Step::Type actualType = resolveStepType(type);
    
    auto it = steps_.find(actualType);
    if (it != steps_.end()) {
        for (const auto& stepDef : it->second) {
            if (stepDef->matches(stepText)) {
                return stepDef;
            }
        }
    }
    
    // Try all step types if not found in specific type
    for (const auto& [stepType, definitions] : steps_) {
        for (const auto& stepDef : definitions) {
            if (stepDef->matches(stepText)) {
                return stepDef;
            }
        }
    }
    
    return nullptr;
}

void StepRegistry::executeStep(const Step& step) {
    auto stepDef = findStep(step.getType(), step.getText());
    
    if (!stepDef) {
        throw std::runtime_error("No step definition found for: " + step.getText());
    }
    
    auto parameters = stepDef->extractParameters(step.getText());
    StepContext context(step, parameters);
    stepDef->execute(context);
}

void StepRegistry::clear() {
    steps_.clear();
}

std::vector<std::string> StepRegistry::getPatterns(Step::Type type) const {
    std::vector<std::string> patterns;
    
    auto it = steps_.find(type);
    if (it != steps_.end()) {
        for (const auto& stepDef : it->second) {
            patterns.push_back(stepDef->getPattern());
        }
    }
    
    return patterns;
}

Step::Type StepRegistry::resolveStepType(Step::Type type) const {
    // For now, And/But inherit from the previous step type
    // This would need more context in a real implementation
    if (type == Step::Type::AND || type == Step::Type::BUT) {
        return Step::Type::GIVEN; // Default fallback
    }
    return type;
}

// TableIterator implementation
TableIterator::TableIterator(std::shared_ptr<DataTable> table)
    : table_(table), currentRow_(0) {
    if (table_ && !table_->getRows().empty()) {
        headers_ = table_->getRows()[0];
        currentRow_ = 1; // Skip header row
    }
}

bool TableIterator::hasNext() const {
    return table_ && currentRow_ < table_->getRows().size();
}

std::vector<std::string> TableIterator::next() {
    if (!hasNext()) {
        throw std::runtime_error("No more rows in table");
    }
    
    currentRowData_ = table_->getRows()[currentRow_];
    currentRow_++;
    return currentRowData_;
}

std::string TableIterator::get(const std::string& column) const {
    auto it = std::find(headers_.begin(), headers_.end(), column);
    if (it == headers_.end()) {
        throw std::runtime_error("Column not found: " + column);
    }
    
    size_t index = std::distance(headers_.begin(), it);
    return get(index);
}

std::string TableIterator::get(size_t index) const {
    if (index >= currentRowData_.size()) {
        throw std::out_of_range("Column index out of range");
    }
    return currentRowData_[index];
}

std::unordered_map<std::string, std::string> TableIterator::toMap() const {
    std::unordered_map<std::string, std::string> map;
    
    for (size_t i = 0; i < headers_.size() && i < currentRowData_.size(); ++i) {
        map[headers_[i]] = currentRowData_[i];
    }
    
    return map;
}

// Hooks implementation
void Hooks::Before(HookFunction func) {
    beforeHooks_.push_back(func);
}

void Hooks::Before(const std::string& tag, TaggedHookFunction func) {
    taggedBeforeHooks_.push_back({tag, func});
}

void Hooks::After(HookFunction func) {
    afterHooks_.push_back(func);
}

void Hooks::After(const std::string& tag, TaggedHookFunction func) {
    taggedAfterHooks_.push_back({tag, func});
}

void Hooks::BeforeStep(HookFunction func) {
    beforeStepHooks_.push_back(func);
}

void Hooks::AfterStep(HookFunction func) {
    afterStepHooks_.push_back(func);
}

void Hooks::executeBeforeHooks(const std::vector<std::string>& tags) {
    // Execute general before hooks
    for (const auto& hook : beforeHooks_) {
        hook();
    }
    
    // Execute tagged before hooks
    for (const auto& [tag, hook] : taggedBeforeHooks_) {
        if (std::find(tags.begin(), tags.end(), tag) != tags.end()) {
            hook(tags);
        }
    }
}

void Hooks::executeAfterHooks(const std::vector<std::string>& tags) {
    // Execute general after hooks
    for (const auto& hook : afterHooks_) {
        hook();
    }
    
    // Execute tagged after hooks
    for (const auto& [tag, hook] : taggedAfterHooks_) {
        if (std::find(tags.begin(), tags.end(), tag) != tags.end()) {
            hook(tags);
        }
    }
}

void Hooks::executeBeforeStepHooks() {
    for (const auto& hook : beforeStepHooks_) {
        hook();
    }
}

void Hooks::executeAfterStepHooks() {
    for (const auto& hook : afterStepHooks_) {
        hook();
    }
}

} // namespace cucumber_cpp