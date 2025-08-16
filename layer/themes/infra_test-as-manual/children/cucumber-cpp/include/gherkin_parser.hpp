#ifndef GHERKIN_PARSER_HPP
#define GHERKIN_PARSER_HPP

#include <string>
#include <vector>
#include <memory>
#include <map>
#include <variant>

namespace cucumber_cpp {

// Forward declarations
class Feature;
class Scenario;
class Step;
class DataTable;
class DocString;
class Examples;

// Token types for lexical analysis
enum class TokenType {
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
    TAG,
    DATA_ROW,
    DOC_STRING,
    COMMENT,
    TEXT,
    NEWLINE,
    EOF_TOKEN
};

// Token structure
struct Token {
    TokenType type;
    std::string value;
    int line;
    int column;
};

// AST Node base class
class ASTNode {
public:
    virtual ~ASTNode() = default;
    virtual std::string toString() const = 0;
};

// Step class
class Step : public ASTNode {
public:
    enum class Type { GIVEN, WHEN, THEN, AND, BUT };
    
    Step(Type type, const std::string& text, int line);
    
    void setDataTable(std::shared_ptr<DataTable> table);
    void setDocString(std::shared_ptr<DocString> docString);
    
    Type getType() const { return type_; }
    std::string getText() const { return text_; }
    int getLine() const { return line_; }
    std::shared_ptr<DataTable> getDataTable() const { return dataTable_; }
    std::shared_ptr<DocString> getDocString() const { return docString_; }
    
    std::string toString() const override;
    
private:
    Type type_;
    std::string text_;
    int line_;
    std::shared_ptr<DataTable> dataTable_;
    std::shared_ptr<DocString> docString_;
};

// DataTable class
class DataTable : public ASTNode {
public:
    using Row = std::vector<std::string>;
    
    void addRow(const Row& row);
    const std::vector<Row>& getRows() const { return rows_; }
    
    std::string toString() const override;
    
private:
    std::vector<Row> rows_;
};

// DocString class
class DocString : public ASTNode {
public:
    DocString(const std::string& content, const std::string& contentType = "");
    
    std::string getContent() const { return content_; }
    std::string getContentType() const { return contentType_; }
    
    std::string toString() const override;
    
private:
    std::string content_;
    std::string contentType_;
};

// Examples class for Scenario Outlines
class Examples : public ASTNode {
public:
    void setHeader(const std::vector<std::string>& header);
    void addRow(const std::vector<std::string>& row);
    
    const std::vector<std::string>& getHeader() const { return header_; }
    const std::vector<std::vector<std::string>>& getRows() const { return rows_; }
    
    std::string toString() const override;
    
private:
    std::vector<std::string> header_;
    std::vector<std::vector<std::string>> rows_;
};

// Scenario class
class Scenario : public ASTNode {
public:
    Scenario(const std::string& name, int line);
    
    void setDescription(const std::string& description);
    void addTag(const std::string& tag);
    void addStep(std::shared_ptr<Step> step);
    void setExamples(std::shared_ptr<Examples> examples);
    
    std::string getName() const { return name_; }
    std::string getDescription() const { return description_; }
    const std::vector<std::string>& getTags() const { return tags_; }
    const std::vector<std::shared_ptr<Step>>& getSteps() const { return steps_; }
    std::shared_ptr<Examples> getExamples() const { return examples_; }
    bool isOutline() const { return examples_ != nullptr; }
    
    std::string toString() const override;
    
private:
    std::string name_;
    std::string description_;
    int line_;
    std::vector<std::string> tags_;
    std::vector<std::shared_ptr<Step>> steps_;
    std::shared_ptr<Examples> examples_;
};

// Feature class
class Feature : public ASTNode {
public:
    Feature(const std::string& name, int line);
    
    void setDescription(const std::string& description);
    void addTag(const std::string& tag);
    void addScenario(std::shared_ptr<Scenario> scenario);
    void setBackground(std::shared_ptr<Scenario> background);
    
    std::string getName() const { return name_; }
    std::string getDescription() const { return description_; }
    const std::vector<std::string>& getTags() const { return tags_; }
    const std::vector<std::shared_ptr<Scenario>>& getScenarios() const { return scenarios_; }
    std::shared_ptr<Scenario> getBackground() const { return background_; }
    
    std::string toString() const override;
    
private:
    std::string name_;
    std::string description_;
    int line_;
    std::vector<std::string> tags_;
    std::vector<std::shared_ptr<Scenario>> scenarios_;
    std::shared_ptr<Scenario> background_;
};

// Lexer class
class GherkinLexer {
public:
    GherkinLexer(const std::string& input);
    
    Token nextToken();
    bool hasMoreTokens() const;
    
private:
    std::string input_;
    size_t position_;
    int line_;
    int column_;
    
    void skipWhitespace();
    void skipComment();
    Token readKeyword();
    Token readTag();
    Token readDataRow();
    Token readDocString();
    Token readText();
    
    bool isKeyword(const std::string& word) const;
    TokenType getKeywordType(const std::string& word) const;
};

// Parser class
class GherkinParser {
public:
    GherkinParser();
    
    std::shared_ptr<Feature> parse(const std::string& input);
    std::shared_ptr<Feature> parseFile(const std::string& filename);
    
private:
    std::unique_ptr<GherkinLexer> lexer_;
    Token currentToken_;
    std::vector<std::string> currentTags_;
    
    void advance();
    bool match(TokenType type);
    void expect(TokenType type);
    
    std::shared_ptr<Feature> parseFeature();
    std::shared_ptr<Scenario> parseScenario();
    std::shared_ptr<Scenario> parseBackground();
    std::shared_ptr<Step> parseStep();
    std::shared_ptr<DataTable> parseDataTable();
    std::shared_ptr<DocString> parseDocString();
    std::shared_ptr<Examples> parseExamples();
    
    void parseTags();
    std::string parseDescription();
};

} // namespace cucumber_cpp

#endif // GHERKIN_PARSER_HPP