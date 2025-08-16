#pragma once
#include <string>
#include <vector>

namespace StringUtils {

/**
 * String manipulation utilities
 */
class TextProcessor {
public:
    static std::string toUppercase(const std::string& str);
    static std::string toLowercase(const std::string& str);
    static std::string trim(const std::string& str);
    static std::string reverse(const std::string& str);
    
    // Advanced operations
    static std::vector<std::string> split(const std::string& str, char delimiter);
    static std::string join(const std::vector<std::string>& strings, const std::string& separator);
    static bool startsWith(const std::string& str, const std::string& prefix);
    static bool endsWith(const std::string& str, const std::string& suffix);
    static std::string replace(const std::string& str, const std::string& from, const std::string& to);
};

/**
 * String validation utilities
 */
class Validator {
public:
    static bool isEmail(const std::string& email);
    static bool isNumeric(const std::string& str);
    static bool isPalindrome(const std::string& str);
    static bool isValidPassword(const std::string& password);
};

}  // namespace StringUtils