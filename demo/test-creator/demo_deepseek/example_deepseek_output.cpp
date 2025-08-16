// Example of what DeepSeek R1 would generate for StringUtils tests
// This shows the quality of tests you can expect with the LLM integration

#include <gtest/gtest.h>
#include "StringUtils.h"
#include <climits>
#include <stdexcept>
#include <string>

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

TEST_F(StringUtilsTest, toUpperCase_BasicTest) {
    // Verifier: DeepSeek R1
    // Test basic uppercase conversion functionality
    
    // Arrange
    std::string input = "hello world";
    std::string expected = "HELLO WORLD";
    
    // Act
    std::string result = obj->toUpperCase(input);
    
    // Assert
    EXPECT_EQ(expected, result);
}

TEST_F(StringUtilsTest, toUpperCase_EdgeCases) {
    // Verifier: DeepSeek R1
    // Test edge cases for uppercase conversion
    
    // Test empty string
    EXPECT_EQ("", obj->toUpperCase(""));
    
    // Test already uppercase
    EXPECT_EQ("HELLO", obj->toUpperCase("HELLO"));
    
    // Test mixed case
    EXPECT_EQ("HELLO123WORLD", obj->toUpperCase("HeLLo123WoRLd"));
    
    // Test special characters
    EXPECT_EQ("HELLO@#$%WORLD", obj->toUpperCase("hello@#$%world"));
}

TEST_F(StringUtilsTest, trim_BasicTest) {
    // Verifier: DeepSeek R1
    // Test basic trim functionality
    
    // Arrange
    std::string input = "  hello world  ";
    std::string expected = "hello world";
    
    // Act
    std::string result = obj->trim(input);
    
    // Assert
    EXPECT_EQ(expected, result);
}

TEST_F(StringUtilsTest, trim_EdgeCases) {
    // Verifier: DeepSeek R1
    // Test edge cases for trim
    
    // Test empty string
    EXPECT_EQ("", obj->trim(""));
    
    // Test only whitespace
    EXPECT_EQ("", obj->trim("   \t\n\r   "));
    
    // Test no whitespace
    EXPECT_EQ("hello", obj->trim("hello"));
    
    // Test tabs and newlines
    EXPECT_EQ("hello", obj->trim("\t\nhello\r\n"));
}

TEST_F(StringUtilsTest, isPalindrome_BasicTest) {
    // Verifier: DeepSeek R1
    // Test palindrome detection
    
    // Arrange & Act & Assert
    EXPECT_TRUE(obj->isPalindrome("racecar"));
    EXPECT_TRUE(obj->isPalindrome("A man a plan a canal Panama"));
    EXPECT_FALSE(obj->isPalindrome("hello"));
}

TEST_F(StringUtilsTest, split_BasicTest) {
    // Verifier: DeepSeek R1
    // Test string splitting functionality
    
    // Arrange
    std::string input = "apple,banana,orange";
    char delimiter = ',';
    
    // Act
    std::vector<std::string> result = obj->split(input, delimiter);
    
    // Assert
    EXPECT_EQ(3, result.size());
    EXPECT_EQ("apple", result[0]);
    EXPECT_EQ("banana", result[1]);
    EXPECT_EQ("orange", result[2]);
}

TEST_F(StringUtilsTest, split_EdgeCases) {
    // Verifier: DeepSeek R1
    // Test edge cases for split
    
    // Test empty string
    auto result1 = obj->split("", ',');
    EXPECT_EQ(1, result1.size());
    EXPECT_EQ("", result1[0]);
    
    // Test no delimiter found
    auto result2 = obj->split("hello", ',');
    EXPECT_EQ(1, result2.size());
    EXPECT_EQ("hello", result2[0]);
    
    // Test consecutive delimiters
    auto result3 = obj->split("a,,b", ',');
    EXPECT_EQ(3, result3.size());
    EXPECT_EQ("a", result3[0]);
    EXPECT_EQ("", result3[1]);
    EXPECT_EQ("b", result3[2]);
}

TEST_F(StringUtilsTest, isValidEmail_BasicTest) {
    // Verifier: DeepSeek R1
    // Test email validation
    
    // Valid emails
    EXPECT_TRUE(obj->isValidEmail("user@example.com"));
    EXPECT_TRUE(obj->isValidEmail("test.user@domain.co.uk"));
    EXPECT_TRUE(obj->isValidEmail("name+tag@company.org"));
    
    // Invalid emails
    EXPECT_FALSE(obj->isValidEmail("invalid.email"));
    EXPECT_FALSE(obj->isValidEmail("@example.com"));
    EXPECT_FALSE(obj->isValidEmail("user@"));
    EXPECT_FALSE(obj->isValidEmail("user@domain"));
}

TEST_F(StringUtilsTest, countWords_BasicTest) {
    // Verifier: DeepSeek R1
    // Test word counting functionality
    
    // Arrange
    std::string input = "The quick brown fox jumps";
    
    // Act
    int count = obj->countWords(input);
    
    // Assert
    EXPECT_EQ(5, count);
}

TEST_F(StringUtilsTest, countWords_EdgeCases) {
    // Verifier: DeepSeek R1
    // Test edge cases for word counting
    
    // Empty string
    EXPECT_EQ(0, obj->countWords(""));
    
    // Only whitespace
    EXPECT_EQ(0, obj->countWords("   \t\n   "));
    
    // Single word
    EXPECT_EQ(1, obj->countWords("hello"));
    
    // Multiple spaces between words
    EXPECT_EQ(3, obj->countWords("one    two     three"));
}