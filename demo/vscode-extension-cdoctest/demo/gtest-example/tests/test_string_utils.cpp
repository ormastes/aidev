#include <gtest/gtest.h>
#include <string>
#include <algorithm>

// Simple string utilities for demonstration
namespace StringUtils {
    std::string toUpperCase(const std::string& str) {
        std::string result = str;
        std::transform(result.begin(), result.end(), result.begin(), ::toupper);
        return result;
    }

    std::string toLowerCase(const std::string& str) {
        std::string result = str;
        std::transform(result.begin(), result.end(), result.begin(), ::tolower);
        return result;
    }

    std::string trim(const std::string& str) {
        size_t first = str.find_first_not_of(" \t\n\r");
        if (first == std::string::npos) return "";
        size_t last = str.find_last_not_of(" \t\n\r");
        return str.substr(first, (last - first + 1));
    }
}

// String utility tests
TEST(StringUtilsTest, ToUpperCase) {
    EXPECT_EQ(StringUtils::toUpperCase("hello"), "HELLO");
    EXPECT_EQ(StringUtils::toUpperCase("Hello World"), "HELLO WORLD");
    EXPECT_EQ(StringUtils::toUpperCase("123abc"), "123ABC");
    EXPECT_EQ(StringUtils::toUpperCase(""), "");
}

TEST(StringUtilsTest, ToLowerCase) {
    EXPECT_EQ(StringUtils::toLowerCase("HELLO"), "hello");
    EXPECT_EQ(StringUtils::toLowerCase("Hello World"), "hello world");
    EXPECT_EQ(StringUtils::toLowerCase("123ABC"), "123abc");
    EXPECT_EQ(StringUtils::toLowerCase(""), "");
}

TEST(StringUtilsTest, Trim) {
    EXPECT_EQ(StringUtils::trim("  hello  "), "hello");
    EXPECT_EQ(StringUtils::trim("\t\nworld\r\n"), "world");
    EXPECT_EQ(StringUtils::trim("no trim needed"), "no trim needed");
    EXPECT_EQ(StringUtils::trim("   "), "");
    EXPECT_EQ(StringUtils::trim(""), "");
}

// Test suite with shared test data
class StringTestWithData : public ::testing::Test {
protected:
    std::vector<std::string> testStrings = {
        "Hello", "World", "Test", "String", "C++", "GTest"
    };
};

TEST_F(StringTestWithData, CaseConversion) {
    for (const auto& str : testStrings) {
        std::string upper = StringUtils::toUpperCase(str);
        std::string lower = StringUtils::toLowerCase(upper);
        EXPECT_EQ(StringUtils::toLowerCase(str), lower);
    }
}

// Disabled test example
TEST(StringUtilsTest, DISABLED_FutureFeature) {
    // This test is disabled and won't run
    EXPECT_TRUE(false) << "This test should not run";
}