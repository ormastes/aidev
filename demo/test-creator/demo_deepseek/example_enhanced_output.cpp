// Example output with DeepSeek R1 and enhanced analysis
// This shows the detailed test generation with full method understanding

#include <gtest/gtest.h>
#include "StringUtils.h"
#include <climits>
#include <stdexcept>
#include <string>
#include <vector>

using namespace testing;
using namespace std;

class StringUtilsTest : public ::testing::Test {
protected:
    StringUtils* obj;
    
    void SetUp() override {
        obj = new StringUtils();
    }
    
    void TearDown() override {
        delete obj;
    }
};

TEST_F(StringUtilsTest, trim_BasicTest) {
    // Verifier: DeepSeek R1
    // Method: trim
    // Purpose: Removes leading and trailing whitespace from strings
    // 
    // Parameters:
    //   - str (const std::string&): Read-only input string to trim
    // Returns: std::string - Trimmed string with whitespace removed
    // Side Effects:
    //   - None (const method, no state changes)
    // Preconditions:
    //   - None (handles empty strings gracefully)
    
    // Arrange - Set up various test strings
    string normalString = "  hello world  ";
    string tabsAndSpaces = "\t\ttest string\n\n";
    string noWhitespace = "already_trimmed";
    string internalSpaces = "  keep  internal  spaces  ";
    
    // Act - Call trim on each test case
    string result1 = obj->trim(normalString);
    string result2 = obj->trim(tabsAndSpaces);
    string result3 = obj->trim(noWhitespace);
    string result4 = obj->trim(internalSpaces);
    
    // Assert - Verify whitespace is removed correctly
    EXPECT_EQ("hello world", result1) << "Should remove leading/trailing spaces";
    EXPECT_EQ("test string", result2) << "Should remove tabs and newlines";
    EXPECT_EQ("already_trimmed", result3) << "Should not modify string without whitespace";
    EXPECT_EQ("keep  internal  spaces", result4) << "Should preserve internal spaces";
}

TEST_F(StringUtilsTest, trim_EdgeCases) {
    // Verifier: DeepSeek R1
    // Edge Case Testing for trim
    // 
    // Test Scenarios:
    //   - Empty strings
    //   - Strings with only whitespace
    //   - Single character strings
    //   - Mixed whitespace types
    
    // Test 1: Empty string
    EXPECT_EQ("", obj->trim("")) << "Empty string should remain empty";
    
    // Test 2: Only whitespace
    EXPECT_EQ("", obj->trim("   ")) << "Spaces only should return empty";
    EXPECT_EQ("", obj->trim("\t\t\t")) << "Tabs only should return empty";
    EXPECT_EQ("", obj->trim("\n\r\n")) << "Newlines only should return empty";
    EXPECT_EQ("", obj->trim(" \t\n\r ")) << "Mixed whitespace should return empty";
    
    // Test 3: Single character
    EXPECT_EQ("a", obj->trim(" a ")) << "Single char with spaces";
    EXPECT_EQ("x", obj->trim("\tx\n")) << "Single char with tabs/newlines";
    
    // Test 4: Unicode spaces (if supported)
    EXPECT_EQ("test", obj->trim(" test ")) << "Regular spaces";
}

TEST_F(StringUtilsTest, split_BasicTest) {
    // Verifier: DeepSeek R1
    // Method: split
    // Purpose: Splits string into vector of substrings based on delimiter
    // 
    // Parameters:
    //   - str (const std::string&): Input string to split
    //   - delimiter (char): Character to split on
    // Returns: std::vector<std::string> - Collection of split parts
    // Dependencies:
    //   - std::stringstream
    //   - std::getline()
    // Side Effects:
    //   - None (returns new vector)
    // Postconditions:
    //   - Result vector contains all parts between delimiters
    //   - Empty parts are included for consecutive delimiters
    
    // Arrange
    string csvData = "apple,banana,orange,grape";
    string pathData = "/usr/local/bin/app";
    string sentence = "The quick brown fox";
    
    // Act
    vector<string> fruits = obj->split(csvData, ',');
    vector<string> pathParts = obj->split(pathData, '/');
    vector<string> words = obj->split(sentence, ' ');
    
    // Assert - Verify correct splitting
    ASSERT_EQ(4, fruits.size()) << "Should have 4 fruits";
    EXPECT_EQ("apple", fruits[0]);
    EXPECT_EQ("banana", fruits[1]);
    EXPECT_EQ("orange", fruits[2]);
    EXPECT_EQ("grape", fruits[3]);
    
    ASSERT_EQ(5, pathParts.size()) << "Path should have 5 parts (including empty)";
    EXPECT_EQ("", pathParts[0]) << "Leading slash creates empty part";
    EXPECT_EQ("usr", pathParts[1]);
    EXPECT_EQ("local", pathParts[2]);
    EXPECT_EQ("bin", pathParts[3]);
    EXPECT_EQ("app", pathParts[4]);
    
    ASSERT_EQ(4, words.size()) << "Should have 4 words";
    EXPECT_EQ("The", words[0]);
    EXPECT_EQ("quick", words[1]);
    EXPECT_EQ("brown", words[2]);
    EXPECT_EQ("fox", words[3]);
}

TEST_F(StringUtilsTest, isValidEmail_BasicTest) {
    // Verifier: DeepSeek R1
    // Method: isValidEmail
    // Purpose: Validates email format using regex pattern
    // 
    // Parameters:
    //   - email (const std::string&): Email address to validate
    // Returns: bool - true if valid email format, false otherwise
    // Dependencies:
    //   - std::regex
    //   - regex pattern: [a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}
    // Preconditions:
    //   - Input must not be empty
    // Implementation Details:
    //   - Uses regex matching for validation
    //   - Requires @ symbol and domain with TLD
    
    // Arrange - Valid email addresses
    vector<string> validEmails = {
        "user@example.com",
        "john.doe@company.org",
        "test123@subdomain.example.co.uk",
        "name+tag@email.net",
        "admin_user@my-company.io"
    };
    
    // Act & Assert - All valid emails should return true
    for (const string& email : validEmails) {
        EXPECT_TRUE(obj->isValidEmail(email)) 
            << "Should accept valid email: " << email;
    }
    
    // Arrange - Invalid email addresses
    vector<string> invalidEmails = {
        "notanemail",           // No @ symbol
        "@example.com",         // Missing local part
        "user@",                // Missing domain
        "user@domain",          // Missing TLD
        "user @example.com",    // Space in address
        "user@.com",            // Invalid domain
        "",                     // Empty string
        "user@@example.com"     // Double @
    };
    
    // Act & Assert - All invalid emails should return false
    for (const string& email : invalidEmails) {
        EXPECT_FALSE(obj->isValidEmail(email)) 
            << "Should reject invalid email: " << email;
    }
}

TEST_F(StringUtilsTest, replace_BasicTest) {
    // Verifier: DeepSeek R1
    // Method: replace
    // Purpose: Replaces all occurrences of substring with new string
    // 
    // Parameters:
    //   - str (const std::string&): Source string
    //   - from (const std::string&): Substring to find
    //   - to (const std::string&): Replacement string
    // Returns: std::string - String with replacements made
    // Side Effects:
    //   - None (returns new string)
    // Dependencies:
    //   - std::string::find()
    //   - std::string::replace()
    // Preconditions:
    //   - 'from' parameter must not be empty
    // Algorithm:
    //   - Iterates through string finding and replacing all occurrences
    
    // Arrange
    string template1 = "Hello {{name}}, welcome to {{place}}!";
    string text = "The cat in the hat sat on the mat";
    
    // Act - Single replacement
    string result1 = obj->replace(template1, "{{name}}", "Alice");
    
    // Assert
    EXPECT_EQ("Hello Alice, welcome to {{place}}!", result1)
        << "Should replace first placeholder";
    
    // Act - Second replacement on result
    string result2 = obj->replace(result1, "{{place}}", "Wonderland");
    
    // Assert
    EXPECT_EQ("Hello Alice, welcome to Wonderland!", result2)
        << "Should replace second placeholder";
    
    // Act - Multiple occurrences
    string result3 = obj->replace(text, "at", "og");
    
    // Assert
    EXPECT_EQ("The cog in the hog sog on the mog", result3)
        << "Should replace all occurrences of 'at'";
    
    // Act - Replace with longer string
    string result4 = obj->replace("a-b-c", "-", "---");
    
    // Assert
    EXPECT_EQ("a---b---c", result4)
        << "Should handle replacement with longer string";
}

TEST_F(StringUtilsTest, replace_EdgeCases) {
    // Verifier: DeepSeek R1
    // Edge Case Testing for replace
    // 
    // Test Scenarios:
    //   - Empty strings
    //   - No matches found
    //   - Overlapping patterns
    //   - Replace with empty string
    
    // Test 1: Empty source string
    EXPECT_EQ("", obj->replace("", "find", "replace"))
        << "Empty string should remain empty";
    
    // Test 2: Empty search string (precondition check)
    string original = "test string";
    EXPECT_EQ(original, obj->replace(original, "", "replace"))
        << "Empty 'from' should return original string";
    
    // Test 3: No matches
    EXPECT_EQ("hello world", obj->replace("hello world", "xyz", "abc"))
        << "No matches should return original";
    
    // Test 4: Replace with empty (deletion)
    EXPECT_EQ("helloworld", obj->replace("hello world", " ", ""))
        << "Should delete spaces when replacing with empty";
    
    // Test 5: Overlapping patterns
    EXPECT_EQ("xxy", obj->replace("aaa", "aa", "x"))
        << "Should handle overlapping patterns correctly";
}