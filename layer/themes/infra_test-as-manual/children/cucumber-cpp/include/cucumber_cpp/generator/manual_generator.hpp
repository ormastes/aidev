#ifndef CUCUMBER_CPP_MANUAL_GENERATOR_HPP
#define CUCUMBER_CPP_MANUAL_GENERATOR_HPP

#include "cucumber_cpp/gherkin/ast.hpp"
#include "cucumber_cpp/gherkin/parser.hpp"
#include <string>
#include <memory>
#include <vector>
#include <sstream>

namespace cucumber_cpp {
namespace generator {

// Output format options
enum class OutputFormat {
    MARKDOWN,
    HTML,
    JSON
};

// Manual test document structure
struct ManualTestStep {
    std::string action;
    std::string expected;
    std::string data;
    std::vector<std::string> notes;
};

struct ManualTestCase {
    std::string id;
    std::string name;
    std::string description;
    std::vector<std::string> tags;
    std::vector<std::string> prerequisites;
    std::vector<ManualTestStep> steps;
    std::string expected_result;
    std::vector<std::string> test_data;
};

struct ManualTestSuite {
    std::string name;
    std::string description;
    std::vector<ManualTestCase> test_cases;
    std::string version;
    std::string created_date;
    std::string author;
};

// Base formatter interface
class IFormatter {
public:
    virtual ~IFormatter() = default;
    virtual std::string format(const ManualTestSuite& suite) = 0;
    virtual std::string formatTestCase(const ManualTestCase& testCase) = 0;
};

// Markdown formatter
class MarkdownFormatter : public IFormatter {
public:
    std::string format(const ManualTestSuite& suite) override;
    std::string formatTestCase(const ManualTestCase& testCase) override;
    
private:
    std::string formatTags(const std::vector<std::string>& tags);
    std::string formatPrerequisites(const std::vector<std::string>& prereqs);
    std::string formatSteps(const std::vector<ManualTestStep>& steps);
    std::string formatTestData(const std::vector<std::string>& data);
};

// HTML formatter
class HtmlFormatter : public IFormatter {
public:
    std::string format(const ManualTestSuite& suite) override;
    std::string formatTestCase(const ManualTestCase& testCase) override;
    
private:
    std::string htmlHeader();
    std::string htmlFooter();
    std::string escapeHtml(const std::string& text);
};

// JSON formatter
class JsonFormatter : public IFormatter {
public:
    std::string format(const ManualTestSuite& suite) override;
    std::string formatTestCase(const ManualTestCase& testCase) override;
    
private:
    std::string escapeJson(const std::string& text);
};

// Main manual test generator
class ManualTestGenerator : public gherkin::ASTVisitor {
public:
    ManualTestGenerator();
    
    // Generate from feature file
    std::string generate(const std::string& featureFile, OutputFormat format);
    std::string generate(const gherkin::Feature& feature, OutputFormat format);
    
    // AST visitor methods
    void visitFeature(const gherkin::Feature& feature) override;
    void visitBackground(const gherkin::Background& background) override;
    void visitScenario(const gherkin::Scenario& scenario) override;
    void visitScenarioOutline(const gherkin::ScenarioOutline& outline) override;
    void visitStep(const gherkin::Step& step) override;
    void visitExamples(const gherkin::Examples& examples) override;
    void visitDataTable(const gherkin::DataTable& table) override;
    void visitDocString(const gherkin::DocString& docString) override;
    
    // Configuration
    void setAuthor(const std::string& author) { author_ = author; }
    void setVersion(const std::string& version) { version_ = version; }
    void includeScreenshots(bool include) { include_screenshots_ = include; }
    void includeNotes(bool include) { include_notes_ = include; }
    
private:
    // Convert AST to manual test structure
    ManualTestCase convertScenario(const gherkin::Scenario& scenario);
    ManualTestStep convertStep(const gherkin::Step& step);
    std::vector<std::string> extractPrerequisites(const gherkin::Background* background);
    
    // Enhance step descriptions for manual testing
    std::string enhanceStepDescription(const gherkin::Step& step);
    std::string generateExpectedResult(const gherkin::Step& step);
    std::vector<std::string> generateNotes(const gherkin::Step& step);
    
    // Data handling
    std::vector<std::string> convertDataTable(const gherkin::DataTable& table);
    std::string convertDocString(const gherkin::DocString& docString);
    
    // Formatter selection
    std::unique_ptr<IFormatter> createFormatter(OutputFormat format);
    
private:
    ManualTestSuite current_suite_;
    ManualTestCase current_test_case_;
    std::vector<ManualTestStep> current_steps_;
    std::vector<std::string> background_steps_;
    
    std::string author_;
    std::string version_;
    bool include_screenshots_;
    bool include_notes_;
    
    // State during traversal
    bool in_background_;
    bool in_scenario_;
    bool in_scenario_outline_;
};

// Utility functions
std::string generateTestId(const std::string& featureName, const std::string& scenarioName);
std::string getCurrentDate();
std::string stepTypeToInstruction(gherkin::StepType type);

// Template-based formatter for custom formats
class TemplateFormatter : public IFormatter {
public:
    explicit TemplateFormatter(const std::string& templatePath);
    
    std::string format(const ManualTestSuite& suite) override;
    std::string formatTestCase(const ManualTestCase& testCase) override;
    
    // Set custom template
    void setTemplate(const std::string& templateContent);
    
private:
    std::string applyTemplate(const std::string& templateStr, 
                             const std::map<std::string, std::string>& values);
    
    std::string template_content_;
    std::string test_case_template_;
};

} // namespace generator
} // namespace cucumber_cpp

#endif // CUCUMBER_CPP_MANUAL_GENERATOR_HPP