#ifndef CUCUMBER_CPP_GHERKIN_PARSER_HPP
#define CUCUMBER_CPP_GHERKIN_PARSER_HPP

#include "cucumber_cpp/gherkin/lexer.hpp"
#include "cucumber_cpp/gherkin/ast.hpp"
#include <memory>
#include <vector>
#include <string>
#include <variant>

namespace cucumber_cpp {
namespace gherkin {

class ParseError : public std::runtime_error {
public:
    ParseError(const std::string& message, const Location& location)
        : std::runtime_error(formatError(message, location))
        , location_(location) {}
    
    const Location& location() const { return location_; }
    
private:
    static std::string formatError(const std::string& msg, const Location& loc) {
        return "Parse error at " + std::to_string(loc.line) + ":" + 
               std::to_string(loc.column) + ": " + msg;
    }
    
    Location location_;
};

class Parser {
public:
    explicit Parser(const std::string& source);
    explicit Parser(std::vector<Token> tokens);
    
    // Parse complete feature file
    std::unique_ptr<Feature> parse();
    
    // Parse individual elements
    std::unique_ptr<Feature> parseFeature();
    std::unique_ptr<Background> parseBackground();
    std::unique_ptr<Scenario> parseScenario();
    std::unique_ptr<ScenarioOutline> parseScenarioOutline();
    std::unique_ptr<Examples> parseExamples();
    std::unique_ptr<Step> parseStep();
    std::unique_ptr<DataTable> parseDataTable();
    std::unique_ptr<DocString> parseDocString();
    
    // Error handling
    bool hasError() const { return !errors_.empty(); }
    const std::vector<ParseError>& errors() const { return errors_; }
    
private:
    // Token stream management
    Token current() const;
    Token peek(size_t offset = 1) const;
    Token advance();
    bool check(TokenType type) const;
    bool match(TokenType type);
    bool match(std::initializer_list<TokenType> types);
    Token consume(TokenType type, const std::string& message);
    bool isAtEnd() const;
    
    // Parsing helpers
    std::vector<std::string> parseTags();
    std::string parseText();
    std::string parseDescription();
    void skipNewlines();
    void skipToNextScenario();
    
    // Error recovery
    void error(const std::string& message);
    void synchronize();
    
    // Validation
    void validateScenarioOutline(const ScenarioOutline& outline);
    void validateExamples(const Examples& examples, const std::vector<std::string>& parameters);
    
private:
    std::vector<Token> tokens_;
    size_t current_index_;
    std::vector<ParseError> errors_;
    
    // Parse state
    bool in_scenario_outline_;
    std::vector<std::string> current_parameters_;
};

// Visitor pattern for AST traversal
class ASTVisitor {
public:
    virtual ~ASTVisitor() = default;
    
    virtual void visitFeature(const Feature& feature) = 0;
    virtual void visitBackground(const Background& background) = 0;
    virtual void visitScenario(const Scenario& scenario) = 0;
    virtual void visitScenarioOutline(const ScenarioOutline& outline) = 0;
    virtual void visitStep(const Step& step) = 0;
    virtual void visitExamples(const Examples& examples) = 0;
    virtual void visitDataTable(const DataTable& table) = 0;
    virtual void visitDocString(const DocString& docString) = 0;
};

// Pretty printer for debugging
class ASTPrinter : public ASTVisitor {
public:
    explicit ASTPrinter(std::ostream& out = std::cout);
    
    void visitFeature(const Feature& feature) override;
    void visitBackground(const Background& background) override;
    void visitScenario(const Scenario& scenario) override;
    void visitScenarioOutline(const ScenarioOutline& outline) override;
    void visitStep(const Step& step) override;
    void visitExamples(const Examples& examples) override;
    void visitDataTable(const DataTable& table) override;
    void visitDocString(const DocString& docString) override;
    
private:
    void indent();
    void dedent();
    void printIndent();
    
    std::ostream& out_;
    int indent_level_;
};

} // namespace gherkin
} // namespace cucumber_cpp

#endif // CUCUMBER_CPP_GHERKIN_PARSER_HPP