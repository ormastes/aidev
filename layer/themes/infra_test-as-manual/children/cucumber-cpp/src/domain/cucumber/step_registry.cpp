#include "cucumber_cpp/cucumber/step_registry.hpp"
#include <sstream>

namespace cucumber_cpp {

// StepDefinition implementation
std::optional<Parameters> StepDefinition::match(const std::string& text) const {
    std::smatch matches;
    
    if (std::regex_match(text, matches, regex_)) {
        return extractParameters(matches);
    }
    
    return std::nullopt;
}

Parameters StepDefinition::extractParameters(const std::smatch& matches) const {
    Parameters params;
    
    // Skip first match (entire string) and process capture groups
    for (size_t i = 1; i < matches.size(); ++i) {
        std::string value = matches[i].str();
        
        // Try to parse as different types
        // First, check if it's a quoted string
        if ((value.front() == '"' && value.back() == '"') ||
            (value.front() == '\'' && value.back() == '\'')) {
            // Remove quotes
            value = value.substr(1, value.length() - 2);
            params.add(value);
        }
        // Try to parse as integer
        else if (std::all_of(value.begin(), value.end(), 
                            [](char c) { return std::isdigit(c) || c == '-'; })) {
            try {
                int intValue = std::stoi(value);
                params.add(intValue);
            } catch (...) {
                params.add(value); // Fall back to string
            }
        }
        // Try to parse as double
        else if (value.find('.') != std::string::npos) {
            try {
                double doubleValue = std::stod(value);
                params.add(doubleValue);
            } catch (...) {
                params.add(value); // Fall back to string
            }
        }
        // Try to parse as boolean
        else if (value == "true" || value == "false") {
            params.add(value == "true");
        }
        // Default to string
        else {
            params.add(value);
        }
    }
    
    return params;
}

} // namespace cucumber_cpp