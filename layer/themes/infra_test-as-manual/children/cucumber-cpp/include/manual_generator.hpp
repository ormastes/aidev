#ifndef MANUAL_GENERATOR_HPP
#define MANUAL_GENERATOR_HPP

#include <string>
#include <vector>
#include <memory>
#include <fstream>
#include <sstream>
#include <map>
#include "gherkin_parser.hpp"

namespace cucumber_cpp {

// Output format types
enum class OutputFormat {
    MARKDOWN,
    HTML,
    JSON
};

// Screenshot integration
struct Screenshot {
    std::string path;
    std::string caption;
    int stepIndex;
};

// Manual test documentation item
struct ManualTestItem {
    std::string id;
    std::string name;
    std::string description;
    std::vector<std::string> preconditions;
    std::vector<std::string> steps;
    std::vector<std::string> expectedResults;
    std::vector<std::string> tags;
    std::vector<Screenshot> screenshots;
    std::map<std::string, std::string> metadata;
};

// Template system for customizable output
class TemplateEngine {
public:
    TemplateEngine();
    
    void loadTemplate(const std::string& templatePath);
    void setVariable(const std::string& name, const std::string& value);
    void setListVariable(const std::string& name, const std::vector<std::string>& values);
    std::string render() const;
    
private:
    std::string template_;
    std::map<std::string, std::string> variables_;
    std::map<std::string, std::vector<std::string>> listVariables_;
    
    std::string replaceVariables(const std::string& input) const;
    std::string renderList(const std::string& listName) const;
};

// Base class for format generators
class FormatGenerator {
public:
    virtual ~FormatGenerator() = default;
    virtual std::string generate(const ManualTestItem& item) = 0;
    virtual std::string generateSuite(const std::vector<ManualTestItem>& items) = 0;
    
protected:
    std::string escapeHtml(const std::string& text) const;
    std::string escapeJson(const std::string& text) const;
};

// Markdown generator
class MarkdownGenerator : public FormatGenerator {
public:
    std::string generate(const ManualTestItem& item) override;
    std::string generateSuite(const std::vector<ManualTestItem>& items) override;
    
private:
    std::string formatTags(const std::vector<std::string>& tags) const;
    std::string formatSteps(const std::vector<std::string>& steps) const;
    std::string formatScreenshot(const Screenshot& screenshot) const;
};

// HTML generator
class HtmlGenerator : public FormatGenerator {
public:
    HtmlGenerator();
    
    void setStylesheet(const std::string& css);
    void setTemplate(const std::string& templatePath);
    
    std::string generate(const ManualTestItem& item) override;
    std::string generateSuite(const std::vector<ManualTestItem>& items) override;
    
private:
    std::string stylesheet_;
    TemplateEngine templateEngine_;
    
    std::string generateTestCard(const ManualTestItem& item) const;
    std::string generateNavigation(const std::vector<ManualTestItem>& items) const;
};

// JSON generator
class JsonGenerator : public FormatGenerator {
public:
    std::string generate(const ManualTestItem& item) override;
    std::string generateSuite(const std::vector<ManualTestItem>& items) override;
    
private:
    std::string itemToJson(const ManualTestItem& item) const;
    std::string vectorToJsonArray(const std::vector<std::string>& vec) const;
    std::string mapToJsonObject(const std::map<std::string, std::string>& map) const;
};

// Main manual test generator
class ManualTestGenerator {
public:
    ManualTestGenerator();
    
    // Configure output
    void setOutputFormat(OutputFormat format);
    void setOutputPath(const std::string& path);
    void enableScreenshots(bool enable);
    void setScreenshotPath(const std::string& path);
    
    // Template configuration
    void setTemplate(const std::string& templatePath);
    void setStylesheet(const std::string& cssPath);
    
    // Generate from feature
    void generateFromFeature(std::shared_ptr<Feature> feature);
    void generateFromFeatureFile(const std::string& featurePath);
    
    // Generate from multiple features
    void generateFromDirectory(const std::string& directoryPath);
    
    // Get generated content
    std::string getGeneratedContent() const { return generatedContent_; }
    
    // Save to file
    void saveToFile() const;
    void saveToFile(const std::string& path) const;
    
private:
    OutputFormat format_;
    std::string outputPath_;
    bool screenshotsEnabled_;
    std::string screenshotPath_;
    std::string generatedContent_;
    
    std::unique_ptr<FormatGenerator> generator_;
    std::vector<ManualTestItem> items_;
    
    ManualTestItem convertScenario(std::shared_ptr<Scenario> scenario) const;
    std::vector<std::string> extractPreconditions(std::shared_ptr<Feature> feature) const;
    std::vector<std::string> convertSteps(const std::vector<std::shared_ptr<Step>>& steps) const;
    std::string formatStep(std::shared_ptr<Step> step) const;
    
    void createGenerator();
    std::vector<std::string> findFeatureFiles(const std::string& directory) const;
};

// Utility functions
class ManualTestUtils {
public:
    // Convert Gherkin to manual test format
    static std::string gherkinToManualStep(const std::string& gherkinStep);
    
    // Generate unique test ID
    static std::string generateTestId(const std::string& scenarioName);
    
    // Format data table for manual test
    static std::string formatDataTable(std::shared_ptr<DataTable> table);
    
    // Format doc string for manual test
    static std::string formatDocString(std::shared_ptr<DocString> docString);
    
    // Extract test data from examples
    static std::vector<std::map<std::string, std::string>> extractTestData(
        std::shared_ptr<Examples> examples);
};

// Configuration for manual test generation
struct ManualTestConfig {
    bool includeFeatureDescription = true;
    bool includeScenarioDescription = true;
    bool includeTags = true;
    bool includeScreenshots = false;
    bool generateTableOfContents = true;
    bool generateIndex = true;
    bool splitByFeature = false;
    
    std::string screenshotNamingPattern = "screenshot_{feature}_{scenario}_{step}.png";
    std::string testIdPattern = "TC_{feature}_{scenario}_{index}";
    
    std::map<std::string, std::string> metadata;
};

} // namespace cucumber_cpp

#endif // MANUAL_GENERATOR_HPP