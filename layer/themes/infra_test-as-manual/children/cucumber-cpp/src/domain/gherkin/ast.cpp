#include "cucumber_cpp/gherkin/ast.hpp"
#include "cucumber_cpp/gherkin/parser.hpp"
#include <regex>
#include <sstream>
#include <algorithm>

namespace cucumber_cpp {
namespace gherkin {

// DataTable implementation
std::vector<std::map<std::string, std::string>> DataTable::toMaps() const {
    std::vector<std::map<std::string, std::string>> result;
    
    if (rows_.size() <= 1) {
        return result;
    }
    
    auto headers = rows_[0];
    
    for (size_t i = 1; i < rows_.size(); ++i) {
        std::map<std::string, std::string> rowMap;
        for (size_t j = 0; j < headers.size() && j < rows_[i].size(); ++j) {
            rowMap[headers[j]] = rows_[i][j];
        }
        result.push_back(rowMap);
    }
    
    return result;
}

void DataTable::accept(ASTVisitor& visitor) const {
    visitor.visitDataTable(*this);
}

// DocString implementation
void DocString::accept(ASTVisitor& visitor) const {
    visitor.visitDocString(*this);
}

// Step implementation
void Step::accept(ASTVisitor& visitor) const {
    visitor.visitStep(*this);
}

// Background implementation
void Background::accept(ASTVisitor& visitor) const {
    visitor.visitBackground(*this);
}

// Scenario implementation
bool Scenario::hasTag(const std::string& tag) const {
    return std::find(tags_.begin(), tags_.end(), tag) != tags_.end();
}

void Scenario::accept(ASTVisitor& visitor) const {
    visitor.visitScenario(*this);
}

// Examples implementation
void Examples::accept(ASTVisitor& visitor) const {
    visitor.visitExamples(*this);
}

// ScenarioOutline implementation
std::vector<std::string> ScenarioOutline::extractParameters() const {
    std::vector<std::string> parameters;
    std::regex paramRegex("<([^>]+)>");
    
    // Search in step text
    for (const auto& step : steps_) {
        std::smatch matches;
        std::string text = step->text();
        
        while (std::regex_search(text, matches, paramRegex)) {
            std::string param = matches[1];
            if (std::find(parameters.begin(), parameters.end(), param) == parameters.end()) {
                parameters.push_back(param);
            }
            text = matches.suffix();
        }
        
        // Also check in data tables and doc strings
        if (step->hasDataTable()) {
            for (const auto& row : step->dataTable()->rows()) {
                for (const auto& cell : row) {
                    std::string cellText = cell;
                    while (std::regex_search(cellText, matches, paramRegex)) {
                        std::string param = matches[1];
                        if (std::find(parameters.begin(), parameters.end(), param) == parameters.end()) {
                            parameters.push_back(param);
                        }
                        cellText = matches.suffix();
                    }
                }
            }
        }
        
        if (step->hasDocString()) {
            std::string docText = step->docString()->content();
            while (std::regex_search(docText, matches, paramRegex)) {
                std::string param = matches[1];
                if (std::find(parameters.begin(), parameters.end(), param) == parameters.end()) {
                    parameters.push_back(param);
                }
                docText = matches.suffix();
            }
        }
    }
    
    return parameters;
}

std::vector<std::unique_ptr<Scenario>> ScenarioOutline::expand() const {
    std::vector<std::unique_ptr<Scenario>> expanded;
    
    for (const auto& example : examples_) {
        if (!example->table()) continue;
        
        auto dataMaps = example->table()->toMaps();
        
        for (const auto& dataMap : dataMaps) {
            auto scenario = expandRow(dataMap);
            
            // Copy tags from outline and examples
            for (const auto& tag : tags_) {
                scenario->addTag(tag);
            }
            for (const auto& tag : example->tags()) {
                scenario->addTag(tag);
            }
            
            expanded.push_back(std::move(scenario));
        }
    }
    
    return expanded;
}

std::unique_ptr<Scenario> ScenarioOutline::expandRow(
    const std::map<std::string, std::string>& values) const {
    
    // Create scenario name with substituted values
    std::string expandedName = name_;
    for (const auto& [param, value] : values) {
        std::regex paramRegex("<" + param + ">");
        expandedName = std::regex_replace(expandedName, paramRegex, value);
    }
    
    auto scenario = std::make_unique<Scenario>(expandedName);
    scenario->setDescription(description_);
    
    // Expand steps
    for (const auto& step : steps_) {
        std::string expandedText = step->text();
        
        // Replace parameters in step text
        for (const auto& [param, value] : values) {
            std::regex paramRegex("<" + param + ">");
            expandedText = std::regex_replace(expandedText, paramRegex, value);
        }
        
        auto expandedStep = std::make_unique<Step>(step->type(), expandedText);
        
        // Expand data table if present
        if (step->hasDataTable()) {
            auto expandedTable = std::make_unique<DataTable>();
            
            for (const auto& row : step->dataTable()->rows()) {
                DataTable::Row expandedRow;
                for (const auto& cell : row) {
                    std::string expandedCell = cell;
                    for (const auto& [param, value] : values) {
                        std::regex paramRegex("<" + param + ">");
                        expandedCell = std::regex_replace(expandedCell, paramRegex, value);
                    }
                    expandedRow.push_back(expandedCell);
                }
                expandedTable->addRow(expandedRow);
            }
            
            expandedStep->setDataTable(std::move(expandedTable));
        }
        
        // Expand doc string if present
        if (step->hasDocString()) {
            std::string expandedContent = step->docString()->content();
            for (const auto& [param, value] : values) {
                std::regex paramRegex("<" + param + ">");
                expandedContent = std::regex_replace(expandedContent, paramRegex, value);
            }
            
            auto expandedDocString = std::make_unique<DocString>(
                expandedContent, 
                step->docString()->contentType()
            );
            expandedStep->setDocString(std::move(expandedDocString));
        }
        
        scenario->addStep(std::move(expandedStep));
    }
    
    return scenario;
}

void ScenarioOutline::accept(ASTVisitor& visitor) const {
    visitor.visitScenarioOutline(*this);
}

// Feature implementation
std::vector<std::unique_ptr<Scenario>> Feature::allScenarios() const {
    std::vector<std::unique_ptr<Scenario>> all;
    
    // Add regular scenarios (need to clone them)
    for (const auto& scenario : scenarios_) {
        auto clone = std::make_unique<Scenario>(scenario->name());
        clone->setDescription(scenario->description());
        for (const auto& tag : scenario->tags()) {
            clone->addTag(tag);
        }
        // Note: Steps would need to be cloned too in a full implementation
        all.push_back(std::move(clone));
    }
    
    // Add expanded scenario outlines
    for (const auto& outline : scenario_outlines_) {
        auto expanded = outline->expand();
        for (auto& scenario : expanded) {
            all.push_back(std::move(scenario));
        }
    }
    
    return all;
}

bool Feature::hasTag(const std::string& tag) const {
    return std::find(tags_.begin(), tags_.end(), tag) != tags_.end();
}

void Feature::accept(ASTVisitor& visitor) const {
    visitor.visitFeature(*this);
}

// Helper functions
std::string stepTypeToString(StepType type) {
    switch (type) {
        case StepType::GIVEN: return "Given";
        case StepType::WHEN: return "When";
        case StepType::THEN: return "Then";
        case StepType::AND: return "And";
        case StepType::BUT: return "But";
        default: return "Unknown";
    }
}

StepType stepTypeFromString(const std::string& str) {
    if (str == "Given") return StepType::GIVEN;
    if (str == "When") return StepType::WHEN;
    if (str == "Then") return StepType::THEN;
    if (str == "And") return StepType::AND;
    if (str == "But") return StepType::BUT;
    return StepType::GIVEN; // Default
}

// ASTPrinter implementation
ASTPrinter::ASTPrinter(std::ostream& out)
    : out_(out), indent_level_(0) {}

void ASTPrinter::indent() {
    indent_level_++;
}

void ASTPrinter::dedent() {
    if (indent_level_ > 0) indent_level_--;
}

void ASTPrinter::printIndent() {
    for (int i = 0; i < indent_level_; ++i) {
        out_ << "  ";
    }
}

void ASTPrinter::visitFeature(const Feature& feature) {
    for (const auto& tag : feature.tags()) {
        printIndent();
        out_ << "@" << tag << "\n";
    }
    
    printIndent();
    out_ << "Feature: " << feature.name() << "\n";
    
    if (!feature.description().empty()) {
        indent();
        printIndent();
        out_ << feature.description() << "\n";
        dedent();
    }
    
    out_ << "\n";
    
    if (feature.background()) {
        indent();
        feature.background()->accept(*this);
        dedent();
    }
    
    for (const auto& scenario : feature.scenarios()) {
        indent();
        scenario->accept(*this);
        dedent();
        out_ << "\n";
    }
    
    for (const auto& outline : feature.scenarioOutlines()) {
        indent();
        outline->accept(*this);
        dedent();
        out_ << "\n";
    }
}

void ASTPrinter::visitBackground(const Background& background) {
    printIndent();
    out_ << "Background:";
    if (!background.name().empty()) {
        out_ << " " << background.name();
    }
    out_ << "\n";
    
    if (!background.description().empty()) {
        indent();
        printIndent();
        out_ << background.description() << "\n";
        dedent();
    }
    
    indent();
    for (const auto& step : background.steps()) {
        step->accept(*this);
    }
    dedent();
    out_ << "\n";
}

void ASTPrinter::visitScenario(const Scenario& scenario) {
    for (const auto& tag : scenario.tags()) {
        printIndent();
        out_ << "@" << tag << "\n";
    }
    
    printIndent();
    out_ << "Scenario: " << scenario.name() << "\n";
    
    if (!scenario.description().empty()) {
        indent();
        printIndent();
        out_ << scenario.description() << "\n";
        dedent();
    }
    
    indent();
    for (const auto& step : scenario.steps()) {
        step->accept(*this);
    }
    dedent();
}

void ASTPrinter::visitScenarioOutline(const ScenarioOutline& outline) {
    for (const auto& tag : outline.tags()) {
        printIndent();
        out_ << "@" << tag << "\n";
    }
    
    printIndent();
    out_ << "Scenario Outline: " << outline.name() << "\n";
    
    if (!outline.description().empty()) {
        indent();
        printIndent();
        out_ << outline.description() << "\n";
        dedent();
    }
    
    indent();
    for (const auto& step : outline.steps()) {
        step->accept(*this);
    }
    dedent();
    
    for (const auto& examples : outline.examples()) {
        out_ << "\n";
        indent();
        examples->accept(*this);
        dedent();
    }
}

void ASTPrinter::visitStep(const Step& step) {
    printIndent();
    out_ << stepTypeToString(step.type()) << " " << step.text() << "\n";
    
    if (step.hasDataTable()) {
        indent();
        step.dataTable()->accept(*this);
        dedent();
    }
    
    if (step.hasDocString()) {
        indent();
        step.docString()->accept(*this);
        dedent();
    }
}

void ASTPrinter::visitExamples(const Examples& examples) {
    for (const auto& tag : examples.tags()) {
        printIndent();
        out_ << "@" << tag << "\n";
    }
    
    printIndent();
    out_ << "Examples:";
    if (!examples.name().empty()) {
        out_ << " " << examples.name();
    }
    out_ << "\n";
    
    if (!examples.description().empty()) {
        indent();
        printIndent();
        out_ << examples.description() << "\n";
        dedent();
    }
    
    if (examples.table()) {
        indent();
        examples.table()->accept(*this);
        dedent();
    }
}

void ASTPrinter::visitDataTable(const DataTable& table) {
    for (const auto& row : table.rows()) {
        printIndent();
        out_ << "|";
        for (const auto& cell : row) {
            out_ << " " << cell << " |";
        }
        out_ << "\n";
    }
}

void ASTPrinter::visitDocString(const DocString& docString) {
    printIndent();
    out_ << "\"\"\"";
    if (!docString.contentType().empty()) {
        out_ << docString.contentType();
    }
    out_ << "\n";
    
    // Print content with proper indentation
    std::istringstream stream(docString.content());
    std::string line;
    while (std::getline(stream, line)) {
        printIndent();
        out_ << line << "\n";
    }
    
    printIndent();
    out_ << "\"\"\"\n";
}

} // namespace gherkin
} // namespace cucumber_cpp