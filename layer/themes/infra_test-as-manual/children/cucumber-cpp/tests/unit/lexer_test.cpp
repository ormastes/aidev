#include <catch2/catch_test_macros.hpp>
#include "cucumber_cpp/gherkin/lexer.hpp"

using namespace cucumber_cpp::gherkin;

TEST_CASE("Lexer tokenizes simple feature", "[lexer]") {
    SECTION("Feature keyword is recognized") {
        std::string source = "Feature: User login";
        Lexer lexer(source);
        
        auto tokens = lexer.tokenize();
        
        REQUIRE(tokens.size() >= 2);
        REQUIRE(tokens[0].type == TokenType::FEATURE);
        REQUIRE(tokens[0].value == "Feature");
    }
    
    SECTION("Scenario keyword is recognized") {
        std::string source = "Scenario: Successful login";
        Lexer lexer(source);
        
        auto tokens = lexer.tokenize();
        
        REQUIRE(tokens.size() >= 2);
        REQUIRE(tokens[0].type == TokenType::SCENARIO);
        REQUIRE(tokens[0].value == "Scenario");
    }
    
    SECTION("Step keywords are recognized") {
        std::string source = R"(
Given I am on the login page
When I enter valid credentials
Then I should see the dashboard
And I should see a welcome message
But I should not see an error
)";
        Lexer lexer(source);
        auto tokens = lexer.tokenize();
        
        // Filter out newlines for easier checking
        std::vector<Token> stepTokens;
        for (const auto& token : tokens) {
            if (token.isStepKeyword()) {
                stepTokens.push_back(token);
            }
        }
        
        REQUIRE(stepTokens.size() == 5);
        REQUIRE(stepTokens[0].type == TokenType::GIVEN);
        REQUIRE(stepTokens[1].type == TokenType::WHEN);
        REQUIRE(stepTokens[2].type == TokenType::THEN);
        REQUIRE(stepTokens[3].type == TokenType::AND);
        REQUIRE(stepTokens[4].type == TokenType::BUT);
    }
}

TEST_CASE("Lexer handles tags", "[lexer]") {
    std::string source = R"(
@smoke @critical
Feature: Critical functionality
    
@wip @slow
Scenario: Complex scenario
)";
    
    Lexer lexer(source);
    auto tokens = lexer.tokenize();
    
    std::vector<Token> tags;
    for (const auto& token : tokens) {
        if (token.type == TokenType::TAG) {
            tags.push_back(token);
        }
    }
    
    REQUIRE(tags.size() == 4);
    REQUIRE(tags[0].value == "smoke");
    REQUIRE(tags[1].value == "critical");
    REQUIRE(tags[2].value == "wip");
    REQUIRE(tags[3].value == "slow");
}

TEST_CASE("Lexer handles data tables", "[lexer]") {
    std::string source = R"(
Given the following users exist:
    | name    | email           | role  |
    | Alice   | alice@test.com  | admin |
    | Bob     | bob@test.com    | user  |
)";
    
    Lexer lexer(source);
    auto tokens = lexer.tokenize();
    
    std::vector<Token> tableCells;
    for (const auto& token : tokens) {
        if (token.type == TokenType::TABLE_CELL) {
            tableCells.push_back(token);
        }
    }
    
    REQUIRE(tableCells.size() == 3); // 3 rows
}

TEST_CASE("Lexer handles doc strings", "[lexer]") {
    std::string source = R"(
Given the following JSON payload:
    """json
    {
        "user": "alice",
        "password": "secret"
    }
    """
)";
    
    Lexer lexer(source);
    auto tokens = lexer.tokenize();
    
    Token* docString = nullptr;
    for (auto& token : tokens) {
        if (token.type == TokenType::DOC_STRING) {
            docString = &token;
            break;
        }
    }
    
    REQUIRE(docString != nullptr);
    REQUIRE(docString->value.find("\"user\": \"alice\"") != std::string::npos);
}

TEST_CASE("Lexer handles scenario outlines with parameters", "[lexer]") {
    std::string source = R"(
Scenario Outline: Login with <username> and <password>
    Given I enter username "<username>"
    And I enter password "<password>"
    
Examples:
    | username | password |
    | alice    | pass123  |
    | bob      | secret   |
)";
    
    Lexer lexer(source);
    auto tokens = lexer.tokenize();
    
    std::vector<Token> parameters;
    for (const auto& token : tokens) {
        if (token.type == TokenType::PARAMETER) {
            parameters.push_back(token);
        }
    }
    
    REQUIRE(parameters.size() == 2);
    REQUIRE(parameters[0].value == "username");
    REQUIRE(parameters[1].value == "password");
}

TEST_CASE("Lexer handles comments", "[lexer]") {
    std::string source = R"(
# This is a comment
Feature: Test feature # inline comment
    # Another comment
    Scenario: Test scenario
)";
    
    Lexer lexer(source);
    auto tokens = lexer.tokenize();
    
    std::vector<Token> comments;
    for (const auto& token : tokens) {
        if (token.type == TokenType::COMMENT) {
            comments.push_back(token);
        }
    }
    
    REQUIRE(comments.size() == 3);
    REQUIRE(comments[0].value == "This is a comment");
    REQUIRE(comments[1].value == "inline comment");
    REQUIRE(comments[2].value == "Another comment");
}

TEST_CASE("Lexer handles quoted strings", "[lexer]") {
    std::string source = R"(
When I click the "Login" button
And I enter 'test@example.com' in the email field
)";
    
    Lexer lexer(source);
    auto tokens = lexer.tokenize();
    
    std::vector<Token> strings;
    for (const auto& token : tokens) {
        if (token.type == TokenType::STRING) {
            strings.push_back(token);
        }
    }
    
    REQUIRE(strings.size() == 2);
    REQUIRE(strings[0].value == "Login");
    REQUIRE(strings[1].value == "test@example.com");
}

TEST_CASE("Lexer tracks line and column numbers", "[lexer]") {
    std::string source = "Feature: Test\nScenario: Example";
    Lexer lexer(source);
    
    auto tokens = lexer.tokenize();
    
    // Find Feature token
    Token* feature = nullptr;
    Token* scenario = nullptr;
    
    for (auto& token : tokens) {
        if (token.type == TokenType::FEATURE) feature = &token;
        if (token.type == TokenType::SCENARIO) scenario = &token;
    }
    
    REQUIRE(feature != nullptr);
    REQUIRE(feature->location.line == 1);
    
    REQUIRE(scenario != nullptr);
    REQUIRE(scenario->location.line == 2);
}