#ifndef STRING_UTILS_H
#define STRING_UTILS_H

#include <string>
#include <vector>

class StringUtils {
public:
    // Constructor
    StringUtils();
    
    // String manipulation methods
    std::string toUpperCase(const std::string& str);
    std::string toLowerCase(const std::string& str);
    std::string trim(const std::string& str);
    std::string reverse(const std::string& str);
    
    // String analysis methods
    bool isPalindrome(const std::string& str);
    int countWords(const std::string& str);
    bool contains(const std::string& str, const std::string& substring);
    
    // String transformation methods
    std::vector<std::string> split(const std::string& str, char delimiter);
    std::string join(const std::vector<std::string>& parts, const std::string& delimiter);
    std::string replace(const std::string& str, const std::string& from, const std::string& to);
    
    // Validation methods
    bool isValidEmail(const std::string& email);
    bool isNumeric(const std::string& str);
    bool isAlphaNumeric(const std::string& str);

private:
    // Helper methods
    bool isWhitespace(char c) const;
};

#endif // STRING_UTILS_H