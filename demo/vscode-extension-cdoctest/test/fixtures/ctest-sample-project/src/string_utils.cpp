#include "string_utils.h"
#include <algorithm>
#include <cctype>
#include <sstream>
#include <regex>

namespace StringUtils {

// TextProcessor implementation
std::string TextProcessor::toUppercase(const std::string& str) {
    std::string result = str;
    std::transform(result.begin(), result.end(), result.begin(), ::toupper);
    return result;
}

std::string TextProcessor::toLowercase(const std::string& str) {
    std::string result = str;
    std::transform(result.begin(), result.end(), result.begin(), ::tolower);
    return result;
}

std::string TextProcessor::trim(const std::string& str) {
    size_t start = str.find_first_not_of(" \t\n\r\f\v");
    if (start == std::string::npos) {
        return "";
    }
    
    size_t end = str.find_last_not_of(" \t\n\r\f\v");
    return str.substr(start, end - start + 1);
}

std::string TextProcessor::reverse(const std::string& str) {
    std::string result = str;
    std::reverse(result.begin(), result.end());
    return result;
}

std::vector<std::string> TextProcessor::split(const std::string& str, char delimiter) {
    std::vector<std::string> tokens;
    std::stringstream ss(str);
    std::string token;
    
    while (std::getline(ss, token, delimiter)) {
        tokens.push_back(token);
    }
    
    return tokens;
}

std::string TextProcessor::join(const std::vector<std::string>& strings, const std::string& separator) {
    if (strings.empty()) {
        return "";
    }
    
    std::string result = strings[0];
    for (size_t i = 1; i < strings.size(); ++i) {
        result += separator + strings[i];
    }
    
    return result;
}

bool TextProcessor::startsWith(const std::string& str, const std::string& prefix) {
    if (prefix.length() > str.length()) {
        return false;
    }
    return str.substr(0, prefix.length()) == prefix;
}

bool TextProcessor::endsWith(const std::string& str, const std::string& suffix) {
    if (suffix.length() > str.length()) {
        return false;
    }
    return str.substr(str.length() - suffix.length()) == suffix;
}

std::string TextProcessor::replace(const std::string& str, const std::string& from, const std::string& to) {
    std::string result = str;
    size_t pos = 0;
    
    while ((pos = result.find(from, pos)) != std::string::npos) {
        result.replace(pos, from.length(), to);
        pos += to.length();
    }
    
    return result;
}

// Validator implementation
bool Validator::isEmail(const std::string& email) {
    // Simple email validation regex
    const std::regex pattern(R"([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})");
    return std::regex_match(email, pattern);
}

bool Validator::isNumeric(const std::string& str) {
    if (str.empty()) {
        return false;
    }
    
    size_t start = 0;
    if (str[0] == '+' || str[0] == '-') {
        start = 1;
    }
    
    bool hasDecimal = false;
    for (size_t i = start; i < str.length(); ++i) {
        if (str[i] == '.') {
            if (hasDecimal) {
                return false;  // Multiple decimal points
            }
            hasDecimal = true;
        } else if (!std::isdigit(str[i])) {
            return false;
        }
    }
    
    return start < str.length();  // Must have at least one digit
}

bool Validator::isPalindrome(const std::string& str) {
    std::string cleaned;
    for (char c : str) {
        if (std::isalnum(c)) {
            cleaned += std::tolower(c);
        }
    }
    
    std::string reversed = cleaned;
    std::reverse(reversed.begin(), reversed.end());
    
    return cleaned == reversed;
}

bool Validator::isValidPassword(const std::string& password) {
    // Password must be at least 8 characters long
    if (password.length() < 8) {
        return false;
    }
    
    bool hasUpper = false, hasLower = false, hasDigit = false, hasSpecial = false;
    
    for (char c : password) {
        if (std::isupper(c)) hasUpper = true;
        else if (std::islower(c)) hasLower = true;
        else if (std::isdigit(c)) hasDigit = true;
        else if (std::ispunct(c)) hasSpecial = true;
    }
    
    // Must have at least 3 of the 4 character types
    int typeCount = hasUpper + hasLower + hasDigit + hasSpecial;
    return typeCount >= 3;
}

}  // namespace StringUtils