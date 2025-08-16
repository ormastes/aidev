#include "cucumber_cpp/gherkin/lexer.hpp"
#include <algorithm>
#include <cctype>
#include <sstream>
#include <iostream>

namespace cucumber_cpp {
namespace gherkin {

// Token implementation
bool Token::isKeyword() const {
    return type >= TokenType::FEATURE && type <= TokenType::BUT;
}

bool Token::isStepKeyword() const {
    return type >= TokenType::GIVEN && type <= TokenType::BUT;
}

// Lexer implementation
Lexer::Lexer(const std::string& source)
    : source_(source)
    , current_(0)
    , line_(1)
    , column_(1)
    , token_start_(0)
    , current_indent_(0) {
    initializeKeywords();
    indent_stack_.push_back(0);
}

void Lexer::initializeKeywords() {
    // English keywords (default)
    keywords_.feature = {"Feature"};
    keywords_.background = {"Background"};
    keywords_.scenario = {"Scenario"};
    keywords_.scenario_outline = {"Scenario Outline", "Scenario Template"};
    keywords_.examples = {"Examples", "Scenarios"};
    keywords_.given = {"Given"};
    keywords_.when = {"When"};
    keywords_.then = {"Then"};
    keywords_.and_ = {"And"};
    keywords_.but = {"But"};
}

std::vector<Token> Lexer::tokenize() {
    std::vector<Token> tokens;
    
    while (!isAtEnd()) {
        Token token = nextToken();
        tokens.push_back(token);
        
        if (token.type == TokenType::EOF_TOKEN) {
            break;
        }
        
        if (hasError()) {
            break;
        }
    }
    
    return tokens;
}

Token Lexer::nextToken() {
    skipWhitespace();
    
    if (isAtEnd()) {
        return makeToken(TokenType::EOF_TOKEN);
    }
    
    token_start_ = current_;
    return scanToken();
}

Token Lexer::scanToken() {
    char c = peek();
    
    // Handle newlines
    if (c == '\n') {
        advance();
        line_++;
        column_ = 1;
        return makeToken(TokenType::NEWLINE);
    }
    
    // Handle comments
    if (c == '#') {
        return scanComment();
    }
    
    // Handle tags
    if (c == '@') {
        return scanTag();
    }
    
    // Handle table cells
    if (c == '|') {
        return scanTableRow();
    }
    
    // Handle doc strings
    if (c == '"' && peek(1) == '"' && peek(2) == '"') {
        return scanDocString();
    }
    
    // Handle parameters in scenario outlines
    if (c == '<') {
        size_t start = current_;
        advance(); // skip '<'
        
        while (!isAtEnd() && peek() != '>' && peek() != '\n') {
            advance();
        }
        
        if (peek() == '>') {
            advance(); // skip '>'
            std::string param = source_.substr(start + 1, current_ - start - 2);
            return makeToken(TokenType::PARAMETER, param);
        }
    }
    
    // Handle quoted strings
    if (c == '"' || c == '\'') {
        char quote = c;
        advance(); // skip opening quote
        size_t start = current_;
        
        while (!isAtEnd() && peek() != quote && peek() != '\n') {
            if (peek() == '\\') {
                advance(); // skip escape char
                if (!isAtEnd()) advance(); // skip escaped char
            } else {
                advance();
            }
        }
        
        if (peek() == quote) {
            std::string str = source_.substr(start, current_ - start);
            advance(); // skip closing quote
            return makeToken(TokenType::STRING, str);
        }
    }
    
    // Handle keywords and text
    if (std::isalpha(c)) {
        return scanKeyword();
    }
    
    // Default to text
    return scanText();
}

Token Lexer::scanKeyword() {
    size_t start = current_;
    
    // Read word
    while (!isAtEnd() && (std::isalnum(peek()) || peek() == ' ')) {
        advance();
    }
    
    std::string word = source_.substr(start, current_ - start);
    
    // Trim trailing spaces
    size_t end = word.find_last_not_of(" ");
    if (end != std::string::npos) {
        word = word.substr(0, end + 1);
        current_ = start + end + 1;
    }
    
    // Check if it's a keyword
    auto keywordType = detectKeyword(word);
    if (keywordType) {
        return makeToken(*keywordType, word);
    }
    
    // Otherwise, it's text
    return makeToken(TokenType::TEXT, word);
}

std::optional<TokenType> Lexer::detectKeyword(const std::string& word) const {
    // Feature
    if (std::find(keywords_.feature.begin(), keywords_.feature.end(), word) != keywords_.feature.end()) {
        return TokenType::FEATURE;
    }
    
    // Background
    if (std::find(keywords_.background.begin(), keywords_.background.end(), word) != keywords_.background.end()) {
        return TokenType::BACKGROUND;
    }
    
    // Scenario Outline (check before Scenario)
    for (const auto& outline : keywords_.scenario_outline) {
        if (word == outline) {
            return TokenType::SCENARIO_OUTLINE;
        }
    }
    
    // Scenario
    if (std::find(keywords_.scenario.begin(), keywords_.scenario.end(), word) != keywords_.scenario.end()) {
        return TokenType::SCENARIO;
    }
    
    // Examples
    if (std::find(keywords_.examples.begin(), keywords_.examples.end(), word) != keywords_.examples.end()) {
        return TokenType::EXAMPLES;
    }
    
    // Step keywords
    if (std::find(keywords_.given.begin(), keywords_.given.end(), word) != keywords_.given.end()) {
        return TokenType::GIVEN;
    }
    if (std::find(keywords_.when.begin(), keywords_.when.end(), word) != keywords_.when.end()) {
        return TokenType::WHEN;
    }
    if (std::find(keywords_.then.begin(), keywords_.then.end(), word) != keywords_.then.end()) {
        return TokenType::THEN;
    }
    if (std::find(keywords_.and_.begin(), keywords_.and_.end(), word) != keywords_.and_.end()) {
        return TokenType::AND;
    }
    if (std::find(keywords_.but.begin(), keywords_.but.end(), word) != keywords_.but.end()) {
        return TokenType::BUT;
    }
    
    return std::nullopt;
}

Token Lexer::scanTag() {
    advance(); // skip '@'
    size_t start = current_;
    
    while (!isAtEnd() && (std::isalnum(peek()) || peek() == '_' || peek() == '-')) {
        advance();
    }
    
    std::string tag = source_.substr(start, current_ - start);
    return makeToken(TokenType::TAG, tag);
}

Token Lexer::scanTableRow() {
    std::string row;
    advance(); // skip first '|'
    
    while (!isAtEnd() && peek() != '\n') {
        if (peek() == '|') {
            row += '|';
        }
        row += advance();
    }
    
    return makeToken(TokenType::TABLE_CELL, row);
}

Token Lexer::scanDocString() {
    advance(); advance(); advance(); // skip """
    
    // Check for type annotation
    std::string type;
    if (!isAtEnd() && peek() != '\n') {
        while (!isAtEnd() && peek() != '\n') {
            type += advance();
        }
    }
    
    if (peek() == '\n') {
        advance();
        line_++;
        column_ = 1;
    }
    
    // Read content until closing """
    std::string content;
    while (!isAtEnd()) {
        if (peek() == '"' && peek(1) == '"' && peek(2) == '"') {
            advance(); advance(); advance(); // skip closing """
            break;
        }
        
        char c = advance();
        content += c;
        
        if (c == '\n') {
            line_++;
            column_ = 1;
        }
    }
    
    return makeToken(TokenType::DOC_STRING, content);
}

Token Lexer::scanText() {
    std::string text;
    
    while (!isAtEnd() && peek() != '\n' && peek() != '#' && peek() != '@' && peek() != '|') {
        text += advance();
    }
    
    // Trim trailing whitespace
    size_t end = text.find_last_not_of(" \t");
    if (end != std::string::npos) {
        text = text.substr(0, end + 1);
    }
    
    return makeToken(TokenType::TEXT, text);
}

Token Lexer::scanComment() {
    advance(); // skip '#'
    
    std::string comment;
    while (!isAtEnd() && peek() != '\n') {
        comment += advance();
    }
    
    // Trim leading whitespace
    size_t start = comment.find_first_not_of(" \t");
    if (start != std::string::npos) {
        comment = comment.substr(start);
    }
    
    return makeToken(TokenType::COMMENT, comment);
}

char Lexer::peek(size_t offset) const {
    size_t pos = current_ + offset;
    if (pos >= source_.length()) {
        return '\0';
    }
    return source_[pos];
}

char Lexer::advance() {
    if (isAtEnd()) return '\0';
    column_++;
    return source_[current_++];
}

void Lexer::skipWhitespace() {
    while (!isAtEnd()) {
        char c = peek();
        if (c == ' ' || c == '\t' || c == '\r') {
            advance();
        } else {
            break;
        }
    }
}

bool Lexer::isAtEnd() const {
    return current_ >= source_.length();
}

Token Lexer::makeToken(TokenType type, const std::string& value) const {
    Location loc(line_, column_ - (current_ - token_start_), token_start_);
    return Token(type, value.empty() ? tokenTypeToString(type) : value, loc);
}

// Helper functions
std::string tokenTypeToString(TokenType type) {
    switch (type) {
        case TokenType::FEATURE: return "FEATURE";
        case TokenType::BACKGROUND: return "BACKGROUND";
        case TokenType::SCENARIO: return "SCENARIO";
        case TokenType::SCENARIO_OUTLINE: return "SCENARIO_OUTLINE";
        case TokenType::EXAMPLES: return "EXAMPLES";
        case TokenType::GIVEN: return "GIVEN";
        case TokenType::WHEN: return "WHEN";
        case TokenType::THEN: return "THEN";
        case TokenType::AND: return "AND";
        case TokenType::BUT: return "BUT";
        case TokenType::TAG: return "TAG";
        case TokenType::COMMENT: return "COMMENT";
        case TokenType::TABLE_CELL: return "TABLE_CELL";
        case TokenType::DOC_STRING: return "DOC_STRING";
        case TokenType::TEXT: return "TEXT";
        case TokenType::NUMBER: return "NUMBER";
        case TokenType::STRING: return "STRING";
        case TokenType::PARAMETER: return "PARAMETER";
        case TokenType::NEWLINE: return "NEWLINE";
        case TokenType::INDENT: return "INDENT";
        case TokenType::DEDENT: return "DEDENT";
        case TokenType::EOF_TOKEN: return "EOF";
        case TokenType::UNKNOWN: return "UNKNOWN";
        default: return "UNKNOWN";
    }
}

void printToken(const Token& token) {
    std::cout << "[" << tokenTypeToString(token.type) << "] "
              << "'" << token.value << "' "
              << "at " << token.location.line << ":" << token.location.column
              << std::endl;
}

void printTokens(const std::vector<Token>& tokens) {
    for (const auto& token : tokens) {
        printToken(token);
    }
}

} // namespace gherkin
} // namespace cucumber_cpp