#ifndef CUCUMBER_CPP_GHERKIN_LEXER_HPP
#define CUCUMBER_CPP_GHERKIN_LEXER_HPP

#include <string>
#include <vector>
#include <memory>
#include <optional>

namespace cucumber_cpp {
namespace gherkin {

enum class TokenType {
    // Keywords
    FEATURE,
    BACKGROUND,
    SCENARIO,
    SCENARIO_OUTLINE,
    EXAMPLES,
    GIVEN,
    WHEN,
    THEN,
    AND,
    BUT,
    
    // Structural
    TAG,              // @tag
    COMMENT,          // # comment
    TABLE_CELL,       // | cell |
    DOC_STRING,       // """
    
    // Content
    TEXT,             // Regular text
    NUMBER,           // Numeric value
    STRING,           // "quoted string"
    PARAMETER,        // <parameter>
    
    // Control
    NEWLINE,
    INDENT,
    DEDENT,
    EOF_TOKEN,
    
    // Special
    UNKNOWN
};

struct Location {
    size_t line;
    size_t column;
    size_t offset;
    
    Location(size_t l = 1, size_t c = 1, size_t o = 0)
        : line(l), column(c), offset(o) {}
};

struct Token {
    TokenType type;
    std::string value;
    Location location;
    
    Token(TokenType t, const std::string& v, const Location& loc)
        : type(t), value(v), location(loc) {}
        
    bool is(TokenType t) const { return type == t; }
    bool isKeyword() const;
    bool isStepKeyword() const;
};

class Lexer {
public:
    explicit Lexer(const std::string& source);
    
    // Tokenize entire source
    std::vector<Token> tokenize();
    
    // Token-by-token iteration
    Token nextToken();
    Token peekToken() const;
    bool hasMoreTokens() const;
    
    // Error reporting
    std::string getErrorMessage() const { return error_message_; }
    bool hasError() const { return !error_message_.empty(); }
    
private:
    // Input management
    char peek(size_t offset = 0) const;
    char advance();
    void skipWhitespace();
    void skipToEndOfLine();
    bool match(char expected);
    bool isAtEnd() const;
    
    // Token recognition
    Token scanToken();
    Token scanKeyword();
    Token scanTag();
    Token scanTableRow();
    Token scanDocString();
    Token scanText();
    Token scanComment();
    
    // Language detection
    std::optional<TokenType> detectKeyword(const std::string& word) const;
    bool isStepKeyword(const std::string& word) const;
    
    // Indentation tracking
    void trackIndentation();
    size_t countIndent(size_t pos) const;
    
    // Error handling
    void reportError(const std::string& message);
    Token makeToken(TokenType type, const std::string& value = "") const;
    
private:
    std::string source_;
    size_t current_;
    size_t line_;
    size_t column_;
    size_t token_start_;
    
    // Indentation stack
    std::vector<size_t> indent_stack_;
    size_t current_indent_;
    
    // Error state
    std::string error_message_;
    
    // Language keywords (configurable)
    struct Keywords {
        std::vector<std::string> feature;
        std::vector<std::string> background;
        std::vector<std::string> scenario;
        std::vector<std::string> scenario_outline;
        std::vector<std::string> examples;
        std::vector<std::string> given;
        std::vector<std::string> when;
        std::vector<std::string> then;
        std::vector<std::string> and_;
        std::vector<std::string> but;
    };
    
    Keywords keywords_;
    
    // Default English keywords
    void initializeKeywords();
};

// Helper functions
std::string tokenTypeToString(TokenType type);
void printToken(const Token& token);
void printTokens(const std::vector<Token>& tokens);

} // namespace gherkin
} // namespace cucumber_cpp

#endif // CUCUMBER_CPP_GHERKIN_LEXER_HPP