#include "gherkin_parser.hpp"
#include <fstream>
#include <sstream>
#include <algorithm>
#include <cctype>
#include <stdexcept>
#include <regex>

namespace cucumber_cpp {

// Helper functions
static std::string trim(const std::string& str) {
    size_t first = str.find_first_not_of(" \t\r\n");
    if (first == std::string::npos) return "";
    size_t last = str.find_last_not_of(" \t\r\n");
    return str.substr(first, last - first + 1);
}

static std::string toLower(const std::string& str) {
    std::string result = str;
    std::transform(result.begin(), result.end(), result.begin(), ::tolower);
    return result;
}

// Step implementation
Step::Step(Type type, const std::string& text, int line)
    : type_(type), text_(text), line_(line) {}

void Step::setDataTable(std::shared_ptr<DataTable> table) {
    dataTable_ = table;
}

void Step::setDocString(std::shared_ptr<DocString> docString) {
    docString_ = docString;
}

std::string Step::toString() const {
    std::string typeStr;
    switch (type_) {
        case Type::GIVEN: typeStr = "Given"; break;
        case Type::WHEN: typeStr = "When"; break;
        case Type::THEN: typeStr = "Then"; break;
        case Type::AND: typeStr = "And"; break;
        case Type::BUT: typeStr = "But"; break;
    }
    
    std::string result = typeStr + " " + text_;
    if (dataTable_) {
        result += "\n" + dataTable_->toString();
    }
    if (docString_) {
        result += "\n" + docString_->toString();
    }
    return result;
}

// DataTable implementation
void DataTable::addRow(const Row& row) {
    rows_.push_back(row);
}

std::string DataTable::toString() const {
    std::stringstream ss;
    for (const auto& row : rows_) {
        ss << "| ";
        for (size_t i = 0; i < row.size(); ++i) {
            ss << row[i];
            if (i < row.size() - 1) ss << " | ";
        }
        ss << " |\n";
    }
    return ss.str();
}

// DocString implementation
DocString::DocString(const std::string& content, const std::string& contentType)
    : content_(content), contentType_(contentType) {}

std::string DocString::toString() const {
    std::stringstream ss;
    ss << "\"\"\"";
    if (!contentType_.empty()) {
        ss << contentType_;
    }
    ss << "\n" << content_ << "\n\"\"\"";
    return ss.str();
}

// Examples implementation
void Examples::setHeader(const std::vector<std::string>& header) {
    header_ = header;
}

void Examples::addRow(const std::vector<std::string>& row) {
    rows_.push_back(row);
}

std::string Examples::toString() const {
    std::stringstream ss;
    ss << "Examples:\n";
    
    // Header
    ss << "| ";
    for (size_t i = 0; i < header_.size(); ++i) {
        ss << header_[i];
        if (i < header_.size() - 1) ss << " | ";
    }
    ss << " |\n";
    
    // Rows
    for (const auto& row : rows_) {
        ss << "| ";
        for (size_t i = 0; i < row.size(); ++i) {
            ss << row[i];
            if (i < row.size() - 1) ss << " | ";
        }
        ss << " |\n";
    }
    
    return ss.str();
}

// Scenario implementation
Scenario::Scenario(const std::string& name, int line)
    : name_(name), line_(line) {}

void Scenario::setDescription(const std::string& description) {
    description_ = description;
}

void Scenario::addTag(const std::string& tag) {
    tags_.push_back(tag);
}

void Scenario::addStep(std::shared_ptr<Step> step) {
    steps_.push_back(step);
}

void Scenario::setExamples(std::shared_ptr<Examples> examples) {
    examples_ = examples;
}

std::string Scenario::toString() const {
    std::stringstream ss;
    
    // Tags
    for (const auto& tag : tags_) {
        ss << tag << "\n";
    }
    
    // Scenario line
    if (isOutline()) {
        ss << "Scenario Outline: " << name_ << "\n";
    } else {
        ss << "Scenario: " << name_ << "\n";
    }
    
    // Description
    if (!description_.empty()) {
        ss << description_ << "\n";
    }
    
    // Steps
    for (const auto& step : steps_) {
        ss << "  " << step->toString() << "\n";
    }
    
    // Examples
    if (examples_) {
        ss << examples_->toString();
    }
    
    return ss.str();
}

// Feature implementation
Feature::Feature(const std::string& name, int line)
    : name_(name), line_(line) {}

void Feature::setDescription(const std::string& description) {
    description_ = description;
}

void Feature::addTag(const std::string& tag) {
    tags_.push_back(tag);
}

void Feature::addScenario(std::shared_ptr<Scenario> scenario) {
    scenarios_.push_back(scenario);
}

void Feature::setBackground(std::shared_ptr<Scenario> background) {
    background_ = background;
}

std::string Feature::toString() const {
    std::stringstream ss;
    
    // Tags
    for (const auto& tag : tags_) {
        ss << tag << "\n";
    }
    
    // Feature line
    ss << "Feature: " << name_ << "\n";
    
    // Description
    if (!description_.empty()) {
        ss << description_ << "\n";
    }
    
    // Background
    if (background_) {
        ss << "\nBackground:\n";
        for (const auto& step : background_->getSteps()) {
            ss << "  " << step->toString() << "\n";
        }
    }
    
    // Scenarios
    for (const auto& scenario : scenarios_) {
        ss << "\n" << scenario->toString();
    }
    
    return ss.str();
}

// GherkinLexer implementation
GherkinLexer::GherkinLexer(const std::string& input)
    : input_(input), position_(0), line_(1), column_(1) {}

Token GherkinLexer::nextToken() {
    skipWhitespace();
    
    if (position_ >= input_.length()) {
        return {TokenType::EOF_TOKEN, "", line_, column_};
    }
    
    // Check for comment
    if (input_[position_] == '#') {
        skipComment();
        return nextToken();
    }
    
    // Check for tag
    if (input_[position_] == '@') {
        return readTag();
    }
    
    // Check for data row
    if (input_[position_] == '|') {
        return readDataRow();
    }
    
    // Check for doc string
    if (position_ + 2 < input_.length() && 
        input_.substr(position_, 3) == "\"\"\"") {
        return readDocString();
    }
    
    // Check for keyword or text
    return readKeyword();
}

bool GherkinLexer::hasMoreTokens() const {
    return position_ < input_.length();
}

void GherkinLexer::skipWhitespace() {
    while (position_ < input_.length() && 
           (input_[position_] == ' ' || input_[position_] == '\t')) {
        position_++;
        column_++;
    }
}

void GherkinLexer::skipComment() {
    while (position_ < input_.length() && input_[position_] != '\n') {
        position_++;
    }
    if (position_ < input_.length() && input_[position_] == '\n') {
        position_++;
        line_++;
        column_ = 1;
    }
}

Token GherkinLexer::readTag() {
    int startCol = column_;
    std::string tag;
    
    while (position_ < input_.length() && 
           (std::isalnum(input_[position_]) || 
            input_[position_] == '@' || 
            input_[position_] == '_' ||
            input_[position_] == '-')) {
        tag += input_[position_++];
        column_++;
    }
    
    return {TokenType::TAG, tag, line_, startCol};
}

Token GherkinLexer::readDataRow() {
    int startCol = column_;
    std::string row;
    
    while (position_ < input_.length() && input_[position_] != '\n') {
        row += input_[position_++];
        column_++;
    }
    
    return {TokenType::DATA_ROW, row, line_, startCol};
}

Token GherkinLexer::readDocString() {
    int startLine = line_;
    int startCol = column_;
    
    // Skip opening """
    position_ += 3;
    column_ += 3;
    
    // Check for content type
    std::string contentType;
    while (position_ < input_.length() && 
           input_[position_] != '\n' && 
           input_[position_] != '"') {
        contentType += input_[position_++];
        column_++;
    }
    
    // Skip newline after opening
    if (position_ < input_.length() && input_[position_] == '\n') {
        position_++;
        line_++;
        column_ = 1;
    }
    
    // Read content until closing """
    std::string content;
    while (position_ + 2 < input_.length()) {
        if (input_.substr(position_, 3) == "\"\"\"") {
            position_ += 3;
            column_ += 3;
            break;
        }
        
        if (input_[position_] == '\n') {
            content += input_[position_++];
            line_++;
            column_ = 1;
        } else {
            content += input_[position_++];
            column_++;
        }
    }
    
    return {TokenType::DOC_STRING, content + "|" + trim(contentType), startLine, startCol};
}

Token GherkinLexer::readKeyword() {
    int startLine = line_;
    int startCol = column_;
    
    // Read the first word
    std::string word;
    while (position_ < input_.length() && 
           std::isalpha(input_[position_])) {
        word += input_[position_++];
        column_++;
    }
    
    // Check if it's a keyword
    if (isKeyword(word)) {
        TokenType type = getKeywordType(word);
        
        // Skip colon if present
        skipWhitespace();
        if (position_ < input_.length() && input_[position_] == ':') {
            position_++;
            column_++;
        }
        
        // Read the rest of the line as text
        skipWhitespace();
        std::string text;
        while (position_ < input_.length() && input_[position_] != '\n') {
            text += input_[position_++];
            column_++;
        }
        
        return {type, trim(text), startLine, startCol};
    }
    
    // Not a keyword, read as text
    return readText();
}

Token GherkinLexer::readText() {
    int startLine = line_;
    int startCol = column_;
    std::string text;
    
    while (position_ < input_.length() && input_[position_] != '\n') {
        text += input_[position_++];
        column_++;
    }
    
    if (position_ < input_.length() && input_[position_] == '\n') {
        position_++;
        line_++;
        column_ = 1;
        return {TokenType::NEWLINE, trim(text), startLine, startCol};
    }
    
    return {TokenType::TEXT, trim(text), startLine, startCol};
}

bool GherkinLexer::isKeyword(const std::string& word) const {
    std::string lower = toLower(word);
    return lower == "feature" || lower == "background" || 
           lower == "scenario" || lower == "examples" ||
           lower == "given" || lower == "when" || 
           lower == "then" || lower == "and" || lower == "but";
}

TokenType GherkinLexer::getKeywordType(const std::string& word) const {
    std::string lower = toLower(word);
    
    if (lower == "feature") return TokenType::FEATURE;
    if (lower == "background") return TokenType::BACKGROUND;
    if (lower == "scenario") return TokenType::SCENARIO;
    if (lower == "examples") return TokenType::EXAMPLES;
    if (lower == "given") return TokenType::GIVEN;
    if (lower == "when") return TokenType::WHEN;
    if (lower == "then") return TokenType::THEN;
    if (lower == "and") return TokenType::AND;
    if (lower == "but") return TokenType::BUT;
    
    return TokenType::TEXT;
}

// GherkinParser implementation
GherkinParser::GherkinParser() {}

std::shared_ptr<Feature> GherkinParser::parse(const std::string& input) {
    lexer_ = std::make_unique<GherkinLexer>(input);
    advance();
    return parseFeature();
}

std::shared_ptr<Feature> GherkinParser::parseFile(const std::string& filename) {
    std::ifstream file(filename);
    if (!file.is_open()) {
        throw std::runtime_error("Cannot open file: " + filename);
    }
    
    std::stringstream buffer;
    buffer << file.rdbuf();
    return parse(buffer.str());
}

void GherkinParser::advance() {
    currentToken_ = lexer_->nextToken();
    
    // Skip newlines and collect tags
    while (currentToken_.type == TokenType::NEWLINE || 
           currentToken_.type == TokenType::TAG) {
        if (currentToken_.type == TokenType::TAG) {
            currentTags_.push_back(currentToken_.value);
        }
        currentToken_ = lexer_->nextToken();
    }
}

bool GherkinParser::match(TokenType type) {
    return currentToken_.type == type;
}

void GherkinParser::expect(TokenType type) {
    if (!match(type)) {
        throw std::runtime_error("Unexpected token at line " + 
                                std::to_string(currentToken_.line));
    }
    advance();
}

std::shared_ptr<Feature> GherkinParser::parseFeature() {
    parseTags();
    
    if (!match(TokenType::FEATURE)) {
        expect(TokenType::FEATURE);
    }
    
    std::string featureName = currentToken_.value;
    int featureLine = currentToken_.line;
    auto feature = std::make_shared<Feature>(featureName, featureLine);
    
    // Apply collected tags
    for (const auto& tag : currentTags_) {
        feature->addTag(tag);
    }
    currentTags_.clear();
    
    advance();
    
    // Parse description
    std::string description = parseDescription();
    if (!description.empty()) {
        feature->setDescription(description);
    }
    
    // Parse background if present
    if (match(TokenType::BACKGROUND)) {
        feature->setBackground(parseBackground());
    }
    
    // Parse scenarios
    while (match(TokenType::SCENARIO) || !currentTags_.empty()) {
        feature->addScenario(parseScenario());
    }
    
    return feature;
}

std::shared_ptr<Scenario> GherkinParser::parseScenario() {
    parseTags();
    
    bool isOutline = false;
    std::string name;
    int line = currentToken_.line;
    
    if (match(TokenType::SCENARIO)) {
        name = currentToken_.value;
        advance();
        
        // Check for "Outline" keyword
        if (currentToken_.type == TokenType::TEXT && 
            toLower(currentToken_.value).find("outline") != std::string::npos) {
            isOutline = true;
            advance();
        }
    }
    
    auto scenario = std::make_shared<Scenario>(name, line);
    
    // Apply collected tags
    for (const auto& tag : currentTags_) {
        scenario->addTag(tag);
    }
    currentTags_.clear();
    
    // Parse description
    std::string description = parseDescription();
    if (!description.empty()) {
        scenario->setDescription(description);
    }
    
    // Parse steps
    while (match(TokenType::GIVEN) || match(TokenType::WHEN) || 
           match(TokenType::THEN) || match(TokenType::AND) || 
           match(TokenType::BUT)) {
        scenario->addStep(parseStep());
    }
    
    // Parse examples for scenario outline
    if (isOutline && match(TokenType::EXAMPLES)) {
        scenario->setExamples(parseExamples());
    }
    
    return scenario;
}

std::shared_ptr<Scenario> GherkinParser::parseBackground() {
    expect(TokenType::BACKGROUND);
    
    auto background = std::make_shared<Scenario>("Background", currentToken_.line);
    
    // Parse steps
    while (match(TokenType::GIVEN) || match(TokenType::WHEN) || 
           match(TokenType::THEN) || match(TokenType::AND) || 
           match(TokenType::BUT)) {
        background->addStep(parseStep());
    }
    
    return background;
}

std::shared_ptr<Step> GherkinParser::parseStep() {
    Step::Type type;
    
    switch (currentToken_.type) {
        case TokenType::GIVEN: type = Step::Type::GIVEN; break;
        case TokenType::WHEN: type = Step::Type::WHEN; break;
        case TokenType::THEN: type = Step::Type::THEN; break;
        case TokenType::AND: type = Step::Type::AND; break;
        case TokenType::BUT: type = Step::Type::BUT; break;
        default:
            throw std::runtime_error("Expected step keyword");
    }
    
    std::string text = currentToken_.value;
    int line = currentToken_.line;
    advance();
    
    auto step = std::make_shared<Step>(type, text, line);
    
    // Check for data table
    if (match(TokenType::DATA_ROW)) {
        step->setDataTable(parseDataTable());
    }
    
    // Check for doc string
    if (match(TokenType::DOC_STRING)) {
        step->setDocString(parseDocString());
    }
    
    return step;
}

std::shared_ptr<DataTable> GherkinParser::parseDataTable() {
    auto table = std::make_shared<DataTable>();
    
    while (match(TokenType::DATA_ROW)) {
        std::string rowStr = currentToken_.value;
        std::vector<std::string> row;
        
        // Parse row cells
        std::stringstream ss(rowStr);
        std::string cell;
        
        // Skip first |
        std::getline(ss, cell, '|');
        
        while (std::getline(ss, cell, '|')) {
            row.push_back(trim(cell));
        }
        
        if (!row.empty() && row.back().empty()) {
            row.pop_back();
        }
        
        table->addRow(row);
        advance();
    }
    
    return table;
}

std::shared_ptr<DocString> GherkinParser::parseDocString() {
    std::string content = currentToken_.value;
    
    // Split content and content type
    size_t pos = content.find('|');
    std::string actualContent = content.substr(0, pos);
    std::string contentType = (pos != std::string::npos) ? 
                              content.substr(pos + 1) : "";
    
    advance();
    
    return std::make_shared<DocString>(actualContent, contentType);
}

std::shared_ptr<Examples> GherkinParser::parseExamples() {
    expect(TokenType::EXAMPLES);
    
    auto examples = std::make_shared<Examples>();
    
    // Parse header row
    if (match(TokenType::DATA_ROW)) {
        std::string rowStr = currentToken_.value;
        std::vector<std::string> header;
        
        // Parse row cells
        std::stringstream ss(rowStr);
        std::string cell;
        
        // Skip first |
        std::getline(ss, cell, '|');
        
        while (std::getline(ss, cell, '|')) {
            header.push_back(trim(cell));
        }
        
        if (!header.empty() && header.back().empty()) {
            header.pop_back();
        }
        
        examples->setHeader(header);
        advance();
    }
    
    // Parse data rows
    while (match(TokenType::DATA_ROW)) {
        std::string rowStr = currentToken_.value;
        std::vector<std::string> row;
        
        // Parse row cells
        std::stringstream ss(rowStr);
        std::string cell;
        
        // Skip first |
        std::getline(ss, cell, '|');
        
        while (std::getline(ss, cell, '|')) {
            row.push_back(trim(cell));
        }
        
        if (!row.empty() && row.back().empty()) {
            row.pop_back();
        }
        
        examples->addRow(row);
        advance();
    }
    
    return examples;
}

void GherkinParser::parseTags() {
    while (match(TokenType::TAG)) {
        currentTags_.push_back(currentToken_.value);
        advance();
    }
}

std::string GherkinParser::parseDescription() {
    std::string description;
    
    while (match(TokenType::TEXT) || match(TokenType::NEWLINE)) {
        if (!currentToken_.value.empty()) {
            if (!description.empty()) {
                description += "\n";
            }
            description += currentToken_.value;
        }
        advance();
    }
    
    return description;
}

} // namespace cucumber_cpp