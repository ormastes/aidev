#include "cucumber_cpp/gherkin/parser.hpp"
#include <sstream>
#include <algorithm>
#include <regex>

namespace cucumber_cpp {
namespace gherkin {

Parser::Parser(const std::string& source) 
    : current_index_(0)
    , in_scenario_outline_(false) {
    Lexer lexer(source);
    tokens_ = lexer.tokenize();
}

Parser::Parser(std::vector<Token> tokens)
    : tokens_(std::move(tokens))
    , current_index_(0)
    , in_scenario_outline_(false) {}

std::unique_ptr<Feature> Parser::parse() {
    try {
        return parseFeature();
    } catch (const ParseError& e) {
        errors_.push_back(e);
        return nullptr;
    }
}

std::unique_ptr<Feature> Parser::parseFeature() {
    // Skip initial comments and newlines
    skipNewlines();
    while (check(TokenType::COMMENT)) {
        advance();
        skipNewlines();
    }
    
    // Parse tags
    std::vector<std::string> tags = parseTags();
    skipNewlines();
    
    // Expect Feature keyword
    Token featureToken = consume(TokenType::FEATURE, "Expected 'Feature' keyword");
    
    // Parse feature name (rest of the line)
    std::string name = parseText();
    skipNewlines();
    
    auto feature = std::make_unique<Feature>(name);
    
    // Add tags
    for (const auto& tag : tags) {
        feature->addTag(tag);
    }
    
    // Parse optional description
    std::string description = parseDescription();
    if (!description.empty()) {
        feature->setDescription(description);
    }
    
    // Parse optional background
    if (check(TokenType::BACKGROUND)) {
        feature->setBackground(parseBackground());
    }
    
    // Parse scenarios and scenario outlines
    while (!isAtEnd()) {
        skipNewlines();
        
        // Skip comments
        while (check(TokenType::COMMENT)) {
            advance();
            skipNewlines();
        }
        
        if (isAtEnd()) break;
        
        // Parse tags for next scenario
        tags = parseTags();
        skipNewlines();
        
        if (check(TokenType::SCENARIO_OUTLINE)) {
            auto outline = parseScenarioOutline();
            for (const auto& tag : tags) {
                outline->addTag(tag);
            }
            feature->addScenarioOutline(std::move(outline));
        } else if (check(TokenType::SCENARIO)) {
            auto scenario = parseScenario();
            for (const auto& tag : tags) {
                scenario->addTag(tag);
            }
            feature->addScenario(std::move(scenario));
        } else if (!isAtEnd()) {
            // Unexpected token
            error("Expected 'Scenario' or 'Scenario Outline'");
            skipToNextScenario();
        }
    }
    
    return feature;
}

std::unique_ptr<Background> Parser::parseBackground() {
    consume(TokenType::BACKGROUND, "Expected 'Background'");
    
    // Optional background name
    std::string name = parseText();
    skipNewlines();
    
    auto background = std::make_unique<Background>(name);
    
    // Parse optional description
    std::string description = parseDescription();
    if (!description.empty()) {
        background->setDescription(description);
    }
    
    // Parse steps
    while (!isAtEnd() && (check(TokenType::GIVEN) || check(TokenType::WHEN) || 
           check(TokenType::THEN) || check(TokenType::AND) || check(TokenType::BUT))) {
        background->addStep(parseStep());
        skipNewlines();
    }
    
    return background;
}

std::unique_ptr<Scenario> Parser::parseScenario() {
    consume(TokenType::SCENARIO, "Expected 'Scenario'");
    
    std::string name = parseText();
    skipNewlines();
    
    auto scenario = std::make_unique<Scenario>(name);
    
    // Parse optional description
    std::string description = parseDescription();
    if (!description.empty()) {
        scenario->setDescription(description);
    }
    
    // Parse steps
    while (!isAtEnd() && (check(TokenType::GIVEN) || check(TokenType::WHEN) || 
           check(TokenType::THEN) || check(TokenType::AND) || check(TokenType::BUT))) {
        scenario->addStep(parseStep());
        skipNewlines();
    }
    
    return scenario;
}

std::unique_ptr<ScenarioOutline> Parser::parseScenarioOutline() {
    in_scenario_outline_ = true;
    consume(TokenType::SCENARIO_OUTLINE, "Expected 'Scenario Outline'");
    
    std::string name = parseText();
    skipNewlines();
    
    auto outline = std::make_unique<ScenarioOutline>(name);
    
    // Parse optional description
    std::string description = parseDescription();
    if (!description.empty()) {
        outline->setDescription(description);
    }
    
    // Parse steps
    while (!isAtEnd() && (check(TokenType::GIVEN) || check(TokenType::WHEN) || 
           check(TokenType::THEN) || check(TokenType::AND) || check(TokenType::BUT))) {
        outline->addStep(parseStep());
        skipNewlines();
    }
    
    // Extract parameters from steps
    current_parameters_ = outline->extractParameters();
    
    // Parse examples
    while (!isAtEnd() && check(TokenType::EXAMPLES)) {
        outline->addExamples(parseExamples());
        skipNewlines();
    }
    
    in_scenario_outline_ = false;
    return outline;
}

std::unique_ptr<Examples> Parser::parseExamples() {
    consume(TokenType::EXAMPLES, "Expected 'Examples'");
    
    std::string name = parseText();
    skipNewlines();
    
    auto examples = std::make_unique<Examples>(name);
    
    // Parse optional description
    std::string description = parseDescription();
    if (!description.empty()) {
        examples->setDescription(description);
    }
    
    // Parse tags
    std::vector<std::string> tags = parseTags();
    for (const auto& tag : tags) {
        examples->addTag(tag);
    }
    skipNewlines();
    
    // Parse data table
    if (check(TokenType::TABLE_CELL)) {
        examples->setTable(parseDataTable());
        
        // Validate table headers match parameters
        if (!current_parameters_.empty()) {
            validateExamples(*examples, current_parameters_);
        }
    }
    
    return examples;
}

std::unique_ptr<Step> Parser::parseStep() {
    StepType stepType;
    
    if (match(TokenType::GIVEN)) {
        stepType = StepType::GIVEN;
    } else if (match(TokenType::WHEN)) {
        stepType = StepType::WHEN;
    } else if (match(TokenType::THEN)) {
        stepType = StepType::THEN;
    } else if (match(TokenType::AND)) {
        stepType = StepType::AND;
    } else if (match(TokenType::BUT)) {
        stepType = StepType::BUT;
    } else {
        throw ParseError("Expected step keyword", current().location);
    }
    
    // Parse step text (rest of the line)
    std::string text = parseText();
    
    auto step = std::make_unique<Step>(stepType, text);
    skipNewlines();
    
    // Check for data table or doc string
    if (check(TokenType::TABLE_CELL)) {
        step->setDataTable(parseDataTable());
    } else if (check(TokenType::DOC_STRING)) {
        step->setDocString(parseDocString());
    }
    
    return step;
}

std::unique_ptr<DataTable> Parser::parseDataTable() {
    auto table = std::make_unique<DataTable>();
    
    while (check(TokenType::TABLE_CELL)) {
        Token cellToken = advance();
        
        // Parse table row
        std::vector<std::string> row;
        std::string cellContent = cellToken.value;
        
        // Split by | delimiter
        std::stringstream ss(cellContent);
        std::string cell;
        
        while (std::getline(ss, cell, '|')) {
            // Trim whitespace
            cell.erase(0, cell.find_first_not_of(" \t"));
            cell.erase(cell.find_last_not_of(" \t") + 1);
            
            if (!cell.empty()) {
                row.push_back(cell);
            }
        }
        
        if (!row.empty()) {
            table->addRow(row);
        }
        
        skipNewlines();
    }
    
    return table;
}

std::unique_ptr<DocString> Parser::parseDocString() {
    Token docToken = consume(TokenType::DOC_STRING, "Expected doc string");
    
    // Extract content type if present (e.g., """json)
    std::string contentType;
    std::string content = docToken.value;
    
    // Check if first line contains content type
    size_t firstNewline = content.find('\n');
    if (firstNewline != std::string::npos && firstNewline > 0) {
        std::string firstLine = content.substr(0, firstNewline);
        if (!firstLine.empty() && firstLine.find_first_of(" \t") == std::string::npos) {
            contentType = firstLine;
            content = content.substr(firstNewline + 1);
        }
    }
    
    return std::make_unique<DocString>(content, contentType);
}

std::vector<std::string> Parser::parseTags() {
    std::vector<std::string> tags;
    
    while (check(TokenType::TAG)) {
        Token tagToken = advance();
        tags.push_back(tagToken.value);
        
        // Tags can be on same line or separate lines
        if (check(TokenType::TAG)) {
            continue;
        }
        skipNewlines();
        if (!check(TokenType::TAG)) {
            break;
        }
    }
    
    return tags;
}

std::string Parser::parseText() {
    std::string text;
    
    // Collect all text until newline or end
    while (!isAtEnd() && !check(TokenType::NEWLINE)) {
        if (check(TokenType::TEXT) || check(TokenType::STRING) || 
            check(TokenType::PARAMETER) || check(TokenType::NUMBER)) {
            text += advance().value;
            text += " ";
        } else if (check(TokenType::COMMENT)) {
            break; // Stop at comments
        } else {
            advance(); // Skip other tokens
        }
    }
    
    // Trim trailing whitespace
    if (!text.empty() && text.back() == ' ') {
        text.pop_back();
    }
    
    return text;
}

std::string Parser::parseDescription() {
    std::string description;
    
    // Description is any text lines before the next keyword
    while (!isAtEnd()) {
        if (check(TokenType::GIVEN) || check(TokenType::WHEN) || 
            check(TokenType::THEN) || check(TokenType::SCENARIO) ||
            check(TokenType::SCENARIO_OUTLINE) || check(TokenType::BACKGROUND) ||
            check(TokenType::EXAMPLES) || check(TokenType::TAG)) {
            break;
        }
        
        if (check(TokenType::TEXT)) {
            if (!description.empty()) description += "\n";
            description += advance().value;
        } else if (check(TokenType::NEWLINE)) {
            advance();
        } else if (check(TokenType::COMMENT)) {
            advance(); // Skip comments in description
        } else {
            advance();
        }
    }
    
    return description;
}

void Parser::skipNewlines() {
    while (match(TokenType::NEWLINE)) {
        // Continue
    }
}

void Parser::skipToNextScenario() {
    while (!isAtEnd()) {
        if (check(TokenType::SCENARIO) || check(TokenType::SCENARIO_OUTLINE)) {
            break;
        }
        advance();
    }
}

Token Parser::current() const {
    if (current_index_ >= tokens_.size()) {
        return Token(TokenType::EOF_TOKEN, "", Location());
    }
    return tokens_[current_index_];
}

Token Parser::peek(size_t offset) const {
    size_t index = current_index_ + offset;
    if (index >= tokens_.size()) {
        return Token(TokenType::EOF_TOKEN, "", Location());
    }
    return tokens_[index];
}

Token Parser::advance() {
    if (!isAtEnd()) {
        current_index_++;
    }
    return tokens_[current_index_ - 1];
}

bool Parser::check(TokenType type) const {
    return current().type == type;
}

bool Parser::match(TokenType type) {
    if (check(type)) {
        advance();
        return true;
    }
    return false;
}

bool Parser::match(std::initializer_list<TokenType> types) {
    for (TokenType type : types) {
        if (check(type)) {
            advance();
            return true;
        }
    }
    return false;
}

Token Parser::consume(TokenType type, const std::string& message) {
    if (check(type)) {
        return advance();
    }
    
    throw ParseError(message, current().location);
}

bool Parser::isAtEnd() const {
    return current().type == TokenType::EOF_TOKEN;
}

void Parser::error(const std::string& message) {
    errors_.push_back(ParseError(message, current().location));
}

void Parser::synchronize() {
    advance();
    
    while (!isAtEnd()) {
        if (tokens_[current_index_ - 1].type == TokenType::NEWLINE) {
            return;
        }
        
        switch (current().type) {
            case TokenType::FEATURE:
            case TokenType::BACKGROUND:
            case TokenType::SCENARIO:
            case TokenType::SCENARIO_OUTLINE:
            case TokenType::EXAMPLES:
                return;
            default:
                advance();
        }
    }
}

void Parser::validateScenarioOutline(const ScenarioOutline& outline) {
    auto parameters = outline.extractParameters();
    
    for (const auto& examples : outline.examples()) {
        validateExamples(*examples, parameters);
    }
}

void Parser::validateExamples(const Examples& examples, 
                              const std::vector<std::string>& parameters) {
    if (!examples.table()) {
        error("Examples must have a data table");
        return;
    }
    
    auto headers = examples.table()->headers();
    
    for (const auto& param : parameters) {
        if (std::find(headers.begin(), headers.end(), param) == headers.end()) {
            error("Parameter <" + param + "> not found in Examples table headers");
        }
    }
}

} // namespace gherkin
} // namespace cucumber_cpp