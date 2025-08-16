#ifndef CUCUMBER_CPP_GHERKIN_AST_HPP
#define CUCUMBER_CPP_GHERKIN_AST_HPP

#include <string>
#include <vector>
#include <memory>
#include <optional>
#include <map>

namespace cucumber_cpp {
namespace gherkin {

// Forward declarations
class ASTVisitor;

// Base class for all AST nodes
class ASTNode {
public:
    virtual ~ASTNode() = default;
    virtual void accept(ASTVisitor& visitor) const = 0;
    
    size_t line() const { return line_; }
    size_t column() const { return column_; }
    
protected:
    ASTNode(size_t line = 0, size_t column = 0) 
        : line_(line), column_(column) {}
    
private:
    size_t line_;
    size_t column_;
};

// Data table for steps
class DataTable : public ASTNode {
public:
    using Row = std::vector<std::string>;
    
    DataTable() = default;
    explicit DataTable(std::vector<Row> rows) : rows_(std::move(rows)) {}
    
    void addRow(Row row) { rows_.push_back(std::move(row)); }
    const std::vector<Row>& rows() const { return rows_; }
    
    // Helper methods
    size_t rowCount() const { return rows_.size(); }
    size_t columnCount() const { return rows_.empty() ? 0 : rows_[0].size(); }
    
    // Get headers (first row)
    std::vector<std::string> headers() const {
        return rows_.empty() ? std::vector<std::string>{} : rows_[0];
    }
    
    // Get data rows (all except first)
    std::vector<Row> dataRows() const {
        if (rows_.size() <= 1) return {};
        return std::vector<Row>(rows_.begin() + 1, rows_.end());
    }
    
    // Convert to map (using first row as headers)
    std::vector<std::map<std::string, std::string>> toMaps() const;
    
    void accept(ASTVisitor& visitor) const override;
    
private:
    std::vector<Row> rows_;
};

// Doc string for steps
class DocString : public ASTNode {
public:
    DocString() = default;
    DocString(const std::string& content, const std::string& contentType = "")
        : content_(content), content_type_(contentType) {}
    
    const std::string& content() const { return content_; }
    const std::string& contentType() const { return content_type_; }
    
    void accept(ASTVisitor& visitor) const override;
    
private:
    std::string content_;
    std::string content_type_;
};

// Step types
enum class StepType {
    GIVEN,
    WHEN,
    THEN,
    AND,
    BUT
};

// Individual step
class Step : public ASTNode {
public:
    Step(StepType type, const std::string& text)
        : type_(type), text_(text) {}
    
    StepType type() const { return type_; }
    const std::string& text() const { return text_; }
    
    // Optional data
    void setDataTable(std::unique_ptr<DataTable> table) { 
        data_table_ = std::move(table); 
    }
    void setDocString(std::unique_ptr<DocString> docString) { 
        doc_string_ = std::move(docString); 
    }
    
    const DataTable* dataTable() const { return data_table_.get(); }
    const DocString* docString() const { return doc_string_.get(); }
    
    bool hasDataTable() const { return data_table_ != nullptr; }
    bool hasDocString() const { return doc_string_ != nullptr; }
    
    void accept(ASTVisitor& visitor) const override;
    
private:
    StepType type_;
    std::string text_;
    std::unique_ptr<DataTable> data_table_;
    std::unique_ptr<DocString> doc_string_;
};

// Background section
class Background : public ASTNode {
public:
    explicit Background(const std::string& name = "") : name_(name) {}
    
    const std::string& name() const { return name_; }
    const std::string& description() const { return description_; }
    const std::vector<std::unique_ptr<Step>>& steps() const { return steps_; }
    
    void setDescription(const std::string& desc) { description_ = desc; }
    void addStep(std::unique_ptr<Step> step) { steps_.push_back(std::move(step)); }
    
    void accept(ASTVisitor& visitor) const override;
    
private:
    std::string name_;
    std::string description_;
    std::vector<std::unique_ptr<Step>> steps_;
};

// Regular scenario
class Scenario : public ASTNode {
public:
    explicit Scenario(const std::string& name) : name_(name) {}
    
    const std::string& name() const { return name_; }
    const std::string& description() const { return description_; }
    const std::vector<std::string>& tags() const { return tags_; }
    const std::vector<std::unique_ptr<Step>>& steps() const { return steps_; }
    
    void setDescription(const std::string& desc) { description_ = desc; }
    void addTag(const std::string& tag) { tags_.push_back(tag); }
    void addStep(std::unique_ptr<Step> step) { steps_.push_back(std::move(step)); }
    
    bool hasTag(const std::string& tag) const;
    
    void accept(ASTVisitor& visitor) const override;
    
protected:
    std::string name_;
    std::string description_;
    std::vector<std::string> tags_;
    std::vector<std::unique_ptr<Step>> steps_;
};

// Examples for scenario outline
class Examples : public ASTNode {
public:
    explicit Examples(const std::string& name = "") : name_(name) {}
    
    const std::string& name() const { return name_; }
    const std::string& description() const { return description_; }
    const std::vector<std::string>& tags() const { return tags_; }
    
    void setDescription(const std::string& desc) { description_ = desc; }
    void addTag(const std::string& tag) { tags_.push_back(tag); }
    void setTable(std::unique_ptr<DataTable> table) { table_ = std::move(table); }
    
    const DataTable* table() const { return table_.get(); }
    
    void accept(ASTVisitor& visitor) const override;
    
private:
    std::string name_;
    std::string description_;
    std::vector<std::string> tags_;
    std::unique_ptr<DataTable> table_;
};

// Scenario outline with examples
class ScenarioOutline : public Scenario {
public:
    explicit ScenarioOutline(const std::string& name) : Scenario(name) {}
    
    void addExamples(std::unique_ptr<Examples> examples) {
        examples_.push_back(std::move(examples));
    }
    
    const std::vector<std::unique_ptr<Examples>>& examples() const { 
        return examples_; 
    }
    
    // Extract parameters from steps
    std::vector<std::string> extractParameters() const;
    
    // Generate concrete scenarios from examples
    std::vector<std::unique_ptr<Scenario>> expand() const;
    
    void accept(ASTVisitor& visitor) const override;
    
private:
    std::vector<std::unique_ptr<Examples>> examples_;
    
    // Helper for expansion
    std::unique_ptr<Scenario> expandRow(
        const std::map<std::string, std::string>& values) const;
};

// Feature file
class Feature : public ASTNode {
public:
    explicit Feature(const std::string& name) : name_(name) {}
    
    const std::string& name() const { return name_; }
    const std::string& description() const { return description_; }
    const std::vector<std::string>& tags() const { return tags_; }
    const Background* background() const { return background_.get(); }
    
    const std::vector<std::unique_ptr<Scenario>>& scenarios() const { 
        return scenarios_; 
    }
    
    const std::vector<std::unique_ptr<ScenarioOutline>>& scenarioOutlines() const { 
        return scenario_outlines_; 
    }
    
    void setDescription(const std::string& desc) { description_ = desc; }
    void addTag(const std::string& tag) { tags_.push_back(tag); }
    void setBackground(std::unique_ptr<Background> bg) { 
        background_ = std::move(bg); 
    }
    void addScenario(std::unique_ptr<Scenario> scenario) { 
        scenarios_.push_back(std::move(scenario)); 
    }
    void addScenarioOutline(std::unique_ptr<ScenarioOutline> outline) { 
        scenario_outlines_.push_back(std::move(outline)); 
    }
    
    // Get all scenarios (regular + expanded outlines)
    std::vector<std::unique_ptr<Scenario>> allScenarios() const;
    
    bool hasTag(const std::string& tag) const;
    
    void accept(ASTVisitor& visitor) const override;
    
private:
    std::string name_;
    std::string description_;
    std::vector<std::string> tags_;
    std::unique_ptr<Background> background_;
    std::vector<std::unique_ptr<Scenario>> scenarios_;
    std::vector<std::unique_ptr<ScenarioOutline>> scenario_outlines_;
};

// Helper functions
std::string stepTypeToString(StepType type);
StepType stepTypeFromString(const std::string& str);

} // namespace gherkin
} // namespace cucumber_cpp

#endif // CUCUMBER_CPP_GHERKIN_AST_HPP