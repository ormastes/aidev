#include "StringUtils.h"
#include <algorithm>
#include <cctype>
#include <sstream>
#include <regex>

StringUtils::StringUtils() {
}

std::string StringUtils::toUpperCase(const std::string& str) {
    std::string result = str;
    std::transform(result.begin(), result.end(), result.begin(), ::toupper);
    return result;
}

std::string StringUtils::toLowerCase(const std::string& str) {
    std::string result = str;
    std::transform(result.begin(), result.end(), result.begin(), ::tolower);
    return result;
}

std::string StringUtils::trim(const std::string& str) {
    size_t first = str.find_first_not_of(" \t\n\r");
    if (first == std::string::npos) {
        return "";
    }
    size_t last = str.find_last_not_of(" \t\n\r");
    return str.substr(first, (last - first + 1));
}

std::string StringUtils::reverse(const std::string& str) {
    std::string result = str;
    std::reverse(result.begin(), result.end());
    return result;
}

bool StringUtils::isPalindrome(const std::string& str) {
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

int StringUtils::countWords(const std::string& str) {
    std::istringstream stream(str);
    std::string word;
    int count = 0;
    while (stream >> word) {
        count++;
    }
    return count;
}

bool StringUtils::contains(const std::string& str, const std::string& substring) {
    return str.find(substring) != std::string::npos;
}

std::vector<std::string> StringUtils::split(const std::string& str, char delimiter) {
    std::vector<std::string> result;
    std::stringstream ss(str);
    std::string token;
    
    while (std::getline(ss, token, delimiter)) {
        result.push_back(token);
    }
    
    return result;
}

std::string StringUtils::join(const std::vector<std::string>& parts, const std::string& delimiter) {
    if (parts.empty()) {
        return "";
    }
    
    std::string result = parts[0];
    for (size_t i = 1; i < parts.size(); i++) {
        result += delimiter + parts[i];
    }
    
    return result;
}

std::string StringUtils::replace(const std::string& str, const std::string& from, const std::string& to) {
    if (from.empty()) {
        return str;
    }
    
    std::string result = str;
    size_t pos = 0;
    while ((pos = result.find(from, pos)) != std::string::npos) {
        result.replace(pos, from.length(), to);
        pos += to.length();
    }
    
    return result;
}

bool StringUtils::isValidEmail(const std::string& email) {
    const std::regex pattern(R"([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})");
    return std::regex_match(email, pattern);
}

bool StringUtils::isNumeric(const std::string& str) {
    if (str.empty()) {
        return false;
    }
    
    for (size_t i = 0; i < str.length(); i++) {
        if (i == 0 && (str[i] == '-' || str[i] == '+')) {
            continue;
        }
        if (!std::isdigit(str[i])) {
            return false;
        }
    }
    
    return true;
}

bool StringUtils::isAlphaNumeric(const std::string& str) {
    if (str.empty()) {
        return false;
    }
    
    for (char c : str) {
        if (!std::isalnum(c)) {
            return false;
        }
    }
    
    return true;
}

bool StringUtils::isWhitespace(char c) const {
    return c == ' ' || c == '\t' || c == '\n' || c == '\r';
}