#include <gtest/gtest.h>
#include "string_utils.h"

using namespace StringUtils;

// Test fixture for TextProcessor tests
class TextProcessorTest : public ::testing::Test {
protected:
    void SetUp() override {
        // Setup test data
        testString = "Hello World";
        emptyString = "";
        mixedCaseString = "HeLLo WoRLd";
    }
    
    std::string testString;
    std::string emptyString;
    std::string mixedCaseString;
};

TEST_F(TextProcessorTest, ToUppercase) {
    EXPECT_EQ(TextProcessor::toUppercase("hello"), "HELLO");
    EXPECT_EQ(TextProcessor::toUppercase("World"), "WORLD");
    EXPECT_EQ(TextProcessor::toUppercase(""), "");
    EXPECT_EQ(TextProcessor::toUppercase("123abc"), "123ABC");
    EXPECT_EQ(TextProcessor::toUppercase(mixedCaseString), "HELLO WORLD");
}

TEST_F(TextProcessorTest, ToLowercase) {
    EXPECT_EQ(TextProcessor::toLowercase("HELLO"), "hello");
    EXPECT_EQ(TextProcessor::toLowercase("World"), "world");
    EXPECT_EQ(TextProcessor::toLowercase(""), "");
    EXPECT_EQ(TextProcessor::toLowercase("123ABC"), "123abc");
    EXPECT_EQ(TextProcessor::toLowercase(mixedCaseString), "hello world");
}

TEST_F(TextProcessorTest, Trim) {
    EXPECT_EQ(TextProcessor::trim("  hello  "), "hello");
    EXPECT_EQ(TextProcessor::trim("\t\nworld\r\n"), "world");
    EXPECT_EQ(TextProcessor::trim("   "), "");
    EXPECT_EQ(TextProcessor::trim("no-spaces"), "no-spaces");
    EXPECT_EQ(TextProcessor::trim(""), "");
}

TEST_F(TextProcessorTest, Reverse) {
    EXPECT_EQ(TextProcessor::reverse("hello"), "olleh");
    EXPECT_EQ(TextProcessor::reverse(""), "");
    EXPECT_EQ(TextProcessor::reverse("a"), "a");
    EXPECT_EQ(TextProcessor::reverse("12345"), "54321");
    EXPECT_EQ(TextProcessor::reverse(testString), "dlroW olleH");
}

TEST_F(TextProcessorTest, Split) {
    auto result = TextProcessor::split("a,b,c", ',');
    EXPECT_EQ(result.size(), 3);
    EXPECT_EQ(result[0], "a");
    EXPECT_EQ(result[1], "b");
    EXPECT_EQ(result[2], "c");
    
    auto singleResult = TextProcessor::split("hello", ',');
    EXPECT_EQ(singleResult.size(), 1);
    EXPECT_EQ(singleResult[0], "hello");
    
    auto emptyResult = TextProcessor::split("", ',');
    EXPECT_EQ(emptyResult.size(), 1);
    EXPECT_EQ(emptyResult[0], "");
}

TEST_F(TextProcessorTest, Join) {
    std::vector<std::string> words = {"hello", "world", "test"};
    EXPECT_EQ(TextProcessor::join(words, " "), "hello world test");
    EXPECT_EQ(TextProcessor::join(words, ","), "hello,world,test");
    EXPECT_EQ(TextProcessor::join({}, ","), "");
    EXPECT_EQ(TextProcessor::join({"single"}, ","), "single");
}

TEST_F(TextProcessorTest, StartsWith) {
    EXPECT_TRUE(TextProcessor::startsWith("hello world", "hello"));
    EXPECT_TRUE(TextProcessor::startsWith("test", "test"));
    EXPECT_FALSE(TextProcessor::startsWith("hello", "world"));
    EXPECT_FALSE(TextProcessor::startsWith("hi", "hello"));
    EXPECT_TRUE(TextProcessor::startsWith("", ""));
}

TEST_F(TextProcessorTest, EndsWith) {
    EXPECT_TRUE(TextProcessor::endsWith("hello world", "world"));
    EXPECT_TRUE(TextProcessor::endsWith("test", "test"));
    EXPECT_FALSE(TextProcessor::endsWith("hello", "world"));
    EXPECT_FALSE(TextProcessor::endsWith("hi", "hello"));
    EXPECT_TRUE(TextProcessor::endsWith("", ""));
}

TEST_F(TextProcessorTest, Replace) {
    EXPECT_EQ(TextProcessor::replace("hello world", "world", "universe"), "hello universe");
    EXPECT_EQ(TextProcessor::replace("test test test", "test", "quiz"), "quiz quiz quiz");
    EXPECT_EQ(TextProcessor::replace("no matches", "xyz", "abc"), "no matches");
    EXPECT_EQ(TextProcessor::replace("", "a", "b"), "");
}

// Test fixture for Validator tests
class ValidatorTest : public ::testing::Test {
protected:
    void SetUp() override {
        validEmails = {
            "test@example.com",
            "user.name@domain.co.uk",
            "user+tag@example.org"
        };
        
        invalidEmails = {
            "invalid-email",
            "@example.com",
            "test@",
            "test.example.com"
        };
    }
    
    std::vector<std::string> validEmails;
    std::vector<std::string> invalidEmails;
};

TEST_F(ValidatorTest, IsEmail) {
    for (const auto& email : validEmails) {
        EXPECT_TRUE(Validator::isEmail(email)) << "Should be valid: " << email;
    }
    
    for (const auto& email : invalidEmails) {
        EXPECT_FALSE(Validator::isEmail(email)) << "Should be invalid: " << email;
    }
}

TEST_F(ValidatorTest, IsNumeric) {
    EXPECT_TRUE(Validator::isNumeric("123"));
    EXPECT_TRUE(Validator::isNumeric("-456"));
    EXPECT_TRUE(Validator::isNumeric("+789"));
    EXPECT_TRUE(Validator::isNumeric("12.34"));
    EXPECT_TRUE(Validator::isNumeric("-5.67"));
    
    EXPECT_FALSE(Validator::isNumeric(""));
    EXPECT_FALSE(Validator::isNumeric("abc"));
    EXPECT_FALSE(Validator::isNumeric("12.34.56"));
    EXPECT_FALSE(Validator::isNumeric("12a34"));
    EXPECT_FALSE(Validator::isNumeric("++123"));
}

TEST_F(ValidatorTest, IsPalindrome) {
    EXPECT_TRUE(Validator::isPalindrome("racecar"));
    EXPECT_TRUE(Validator::isPalindrome("A man a plan a canal Panama"));
    EXPECT_TRUE(Validator::isPalindrome("race a car"));  // ignores spaces and case
    EXPECT_TRUE(Validator::isPalindrome(""));
    EXPECT_TRUE(Validator::isPalindrome("a"));
    
    EXPECT_FALSE(Validator::isPalindrome("hello"));
    EXPECT_FALSE(Validator::isPalindrome("world"));
    EXPECT_FALSE(Validator::isPalindrome("almost a palindrome"));
}

TEST_F(ValidatorTest, IsValidPassword) {
    // Valid passwords (at least 8 chars, 3 of 4 character types)
    EXPECT_TRUE(Validator::isValidPassword("Password1"));
    EXPECT_TRUE(Validator::isValidPassword("MyPass123!"));
    EXPECT_TRUE(Validator::isValidPassword("lowercase123!"));
    EXPECT_TRUE(Validator::isValidPassword("UPPERCASE123!"));
    
    // Invalid passwords
    EXPECT_FALSE(Validator::isValidPassword("short"));     // too short
    EXPECT_FALSE(Validator::isValidPassword("lowercase"));  // only lowercase
    EXPECT_FALSE(Validator::isValidPassword("UPPERCASE"));  // only uppercase
    EXPECT_FALSE(Validator::isValidPassword("12345678"));   // only digits
    EXPECT_FALSE(Validator::isValidPassword("!@#$%^&*"));   // only special chars
    EXPECT_FALSE(Validator::isValidPassword("Lower123"));   // only 2 types
}

// Edge case tests
class StringEdgeCaseTest : public ::testing::Test {
};

TEST_F(StringEdgeCaseTest, UnicodeCharacters) {
    // Test with unicode characters
    std::string unicode = "café";
    EXPECT_EQ(TextProcessor::reverse(TextProcessor::reverse(unicode)), unicode);
    
    // Test with emojis (if supported)
    std::string emoji = "hello 🌍";
    EXPECT_GT(emoji.length(), 7);  // Should be longer due to emoji encoding
}

TEST_F(StringEdgeCaseTest, VeryLongStrings) {
    std::string longString(10000, 'a');
    std::string result = TextProcessor::toUppercase(longString);
    EXPECT_EQ(result.length(), 10000);
    EXPECT_EQ(result[0], 'A');
    EXPECT_EQ(result[9999], 'A');
}

TEST_F(StringEdgeCaseTest, SpecialCharacters) {
    std::string special = "!@#$%^&*()_+-=[]{}|;':\",./<>?";
    EXPECT_EQ(TextProcessor::toUppercase(special), special);  // Should remain unchanged
    EXPECT_EQ(TextProcessor::toLowercase(special), special);  // Should remain unchanged
}

// Performance test
TEST_F(StringEdgeCaseTest, LargeStringOperations) {
    std::string large(50000, 'x');
    auto start = std::chrono::high_resolution_clock::now();
    
    std::string result = TextProcessor::toUppercase(large);
    
    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
    
    EXPECT_EQ(result.length(), 50000);
    EXPECT_LT(duration.count(), 1000);  // Should complete in less than 1 second
}