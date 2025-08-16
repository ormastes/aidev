#include "manual_generator.hpp"
#include <algorithm>
#include <filesystem>
#include <iomanip>
#include <ctime>
#include <regex>
#include <iostream>

namespace cucumber_cpp {

// TemplateEngine implementation
TemplateEngine::TemplateEngine() {}

void TemplateEngine::loadTemplate(const std::string& templatePath) {
    std::ifstream file(templatePath);
    if (!file.is_open()) {
        throw std::runtime_error("Cannot open template file: " + templatePath);
    }
    
    std::stringstream buffer;
    buffer << file.rdbuf();
    template_ = buffer.str();
}

void TemplateEngine::setVariable(const std::string& name, const std::string& value) {
    variables_[name] = value;
}

void TemplateEngine::setListVariable(const std::string& name, const std::vector<std::string>& values) {
    listVariables_[name] = values;
}

std::string TemplateEngine::render() const {
    return replaceVariables(template_);
}

std::string TemplateEngine::replaceVariables(const std::string& input) const {
    std::string result = input;
    
    // Replace simple variables {{variable}}
    for (const auto& [name, value] : variables_) {
        std::string placeholder = "{{" + name + "}}";
        size_t pos = 0;
        while ((pos = result.find(placeholder, pos)) != std::string::npos) {
            result.replace(pos, placeholder.length(), value);
            pos += value.length();
        }
    }
    
    // Replace list variables {{#list}}...{{/list}}
    for (const auto& [name, values] : listVariables_) {
        std::string startTag = "{{#" + name + "}}";
        std::string endTag = "{{/" + name + "}}";
        
        size_t startPos = result.find(startTag);
        if (startPos != std::string::npos) {
            size_t endPos = result.find(endTag, startPos);
            if (endPos != std::string::npos) {
                std::string listTemplate = result.substr(
                    startPos + startTag.length(),
                    endPos - startPos - startTag.length()
                );
                
                std::string listContent;
                for (const auto& value : values) {
                    std::string item = listTemplate;
                    size_t itemPos = 0;
                    while ((itemPos = item.find("{{.}}", itemPos)) != std::string::npos) {
                        item.replace(itemPos, 5, value);
                        itemPos += value.length();
                    }
                    listContent += item;
                }
                
                result.replace(startPos, endPos + endTag.length() - startPos, listContent);
            }
        }
    }
    
    return result;
}

// FormatGenerator base implementation
std::string FormatGenerator::escapeHtml(const std::string& text) const {
    std::string result;
    for (char c : text) {
        switch (c) {
            case '<': result += "&lt;"; break;
            case '>': result += "&gt;"; break;
            case '&': result += "&amp;"; break;
            case '"': result += "&quot;"; break;
            case '\'': result += "&#39;"; break;
            default: result += c;
        }
    }
    return result;
}

std::string FormatGenerator::escapeJson(const std::string& text) const {
    std::string result;
    for (char c : text) {
        switch (c) {
            case '"': result += "\\\""; break;
            case '\\': result += "\\\\"; break;
            case '\n': result += "\\n"; break;
            case '\r': result += "\\r"; break;
            case '\t': result += "\\t"; break;
            default: result += c;
        }
    }
    return result;
}

// MarkdownGenerator implementation
std::string MarkdownGenerator::generate(const ManualTestItem& item) {
    std::stringstream ss;
    
    // Header
    ss << "# Test Case: " << item.name << "\n\n";
    
    // Test ID
    ss << "**Test ID:** " << item.id << "\n\n";
    
    // Tags
    if (!item.tags.empty()) {
        ss << "**Tags:** " << formatTags(item.tags) << "\n\n";
    }
    
    // Description
    if (!item.description.empty()) {
        ss << "## Description\n\n" << item.description << "\n\n";
    }
    
    // Preconditions
    if (!item.preconditions.empty()) {
        ss << "## Preconditions\n\n";
        for (const auto& precondition : item.preconditions) {
            ss << "- " << precondition << "\n";
        }
        ss << "\n";
    }
    
    // Test Steps
    ss << "## Test Steps\n\n";
    ss << formatSteps(item.steps) << "\n";
    
    // Expected Results
    if (!item.expectedResults.empty()) {
        ss << "## Expected Results\n\n";
        for (size_t i = 0; i < item.expectedResults.size(); ++i) {
            ss << (i + 1) << ". " << item.expectedResults[i] << "\n";
        }
        ss << "\n";
    }
    
    // Screenshots
    if (!item.screenshots.empty()) {
        ss << "## Screenshots\n\n";
        for (const auto& screenshot : item.screenshots) {
            ss << formatScreenshot(screenshot) << "\n";
        }
        ss << "\n";
    }
    
    // Metadata
    if (!item.metadata.empty()) {
        ss << "## Additional Information\n\n";
        for (const auto& [key, value] : item.metadata) {
            ss << "- **" << key << ":** " << value << "\n";
        }
        ss << "\n";
    }
    
    return ss.str();
}

std::string MarkdownGenerator::generateSuite(const std::vector<ManualTestItem>& items) {
    std::stringstream ss;
    
    // Title
    ss << "# Manual Test Suite\n\n";
    
    // Table of Contents
    ss << "## Table of Contents\n\n";
    for (size_t i = 0; i < items.size(); ++i) {
        ss << (i + 1) << ". [" << items[i].name << "](#" 
           << std::regex_replace(items[i].name, std::regex(" "), "-") << ")\n";
    }
    ss << "\n---\n\n";
    
    // Test Cases
    for (const auto& item : items) {
        ss << generate(item);
        ss << "\n---\n\n";
    }
    
    return ss.str();
}

std::string MarkdownGenerator::formatTags(const std::vector<std::string>& tags) const {
    std::string result;
    for (size_t i = 0; i < tags.size(); ++i) {
        result += "`" + tags[i] + "`";
        if (i < tags.size() - 1) result += ", ";
    }
    return result;
}

std::string MarkdownGenerator::formatSteps(const std::vector<std::string>& steps) const {
    std::stringstream ss;
    for (size_t i = 0; i < steps.size(); ++i) {
        ss << (i + 1) << ". " << steps[i] << "\n";
    }
    return ss.str();
}

std::string MarkdownGenerator::formatScreenshot(const Screenshot& screenshot) const {
    return "![" + screenshot.caption + "](" + screenshot.path + ")";
}

// HtmlGenerator implementation
HtmlGenerator::HtmlGenerator() {
    stylesheet_ = R"(
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .test-case { border: 1px solid #ddd; padding: 20px; margin-bottom: 20px; }
            .test-id { color: #666; font-size: 0.9em; }
            .tags { margin: 10px 0; }
            .tag { background: #e0e0e0; padding: 2px 8px; margin-right: 5px; border-radius: 3px; }
            .preconditions, .steps, .expected-results { margin: 15px 0; }
            h2 { color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 5px; }
            ol, ul { padding-left: 25px; }
            .screenshot { max-width: 100%; margin: 10px 0; }
        </style>
    )";
}

void HtmlGenerator::setStylesheet(const std::string& css) {
    stylesheet_ = "<style>" + css + "</style>";
}

void HtmlGenerator::setTemplate(const std::string& templatePath) {
    templateEngine_.loadTemplate(templatePath);
}

std::string HtmlGenerator::generate(const ManualTestItem& item) {
    std::stringstream ss;
    
    ss << "<div class='test-case'>\n";
    ss << "  <h2>" << escapeHtml(item.name) << "</h2>\n";
    ss << "  <p class='test-id'>Test ID: " << escapeHtml(item.id) << "</p>\n";
    
    // Tags
    if (!item.tags.empty()) {
        ss << "  <div class='tags'>";
        for (const auto& tag : item.tags) {
            ss << "<span class='tag'>" << escapeHtml(tag) << "</span>";
        }
        ss << "</div>\n";
    }
    
    // Description
    if (!item.description.empty()) {
        ss << "  <div class='description'>\n";
        ss << "    <h3>Description</h3>\n";
        ss << "    <p>" << escapeHtml(item.description) << "</p>\n";
        ss << "  </div>\n";
    }
    
    // Preconditions
    if (!item.preconditions.empty()) {
        ss << "  <div class='preconditions'>\n";
        ss << "    <h3>Preconditions</h3>\n";
        ss << "    <ul>\n";
        for (const auto& precondition : item.preconditions) {
            ss << "      <li>" << escapeHtml(precondition) << "</li>\n";
        }
        ss << "    </ul>\n";
        ss << "  </div>\n";
    }
    
    // Test Steps
    ss << "  <div class='steps'>\n";
    ss << "    <h3>Test Steps</h3>\n";
    ss << "    <ol>\n";
    for (const auto& step : item.steps) {
        ss << "      <li>" << escapeHtml(step) << "</li>\n";
    }
    ss << "    </ol>\n";
    ss << "  </div>\n";
    
    // Expected Results
    if (!item.expectedResults.empty()) {
        ss << "  <div class='expected-results'>\n";
        ss << "    <h3>Expected Results</h3>\n";
        ss << "    <ol>\n";
        for (const auto& result : item.expectedResults) {
            ss << "      <li>" << escapeHtml(result) << "</li>\n";
        }
        ss << "    </ol>\n";
        ss << "  </div>\n";
    }
    
    // Screenshots
    if (!item.screenshots.empty()) {
        ss << "  <div class='screenshots'>\n";
        ss << "    <h3>Screenshots</h3>\n";
        for (const auto& screenshot : item.screenshots) {
            ss << "    <img class='screenshot' src='" << escapeHtml(screenshot.path) 
               << "' alt='" << escapeHtml(screenshot.caption) << "' />\n";
        }
        ss << "  </div>\n";
    }
    
    ss << "</div>\n";
    
    return ss.str();
}

std::string HtmlGenerator::generateSuite(const std::vector<ManualTestItem>& items) {
    std::stringstream ss;
    
    ss << "<!DOCTYPE html>\n";
    ss << "<html>\n";
    ss << "<head>\n";
    ss << "  <title>Manual Test Suite</title>\n";
    ss << "  <meta charset='UTF-8'>\n";
    ss << stylesheet_ << "\n";
    ss << "</head>\n";
    ss << "<body>\n";
    ss << "  <h1>Manual Test Suite</h1>\n";
    
    // Navigation
    ss << generateNavigation(items);
    
    // Test Cases
    for (const auto& item : items) {
        ss << generate(item);
    }
    
    ss << "</body>\n";
    ss << "</html>\n";
    
    return ss.str();
}

std::string HtmlGenerator::generateNavigation(const std::vector<ManualTestItem>& items) const {
    std::stringstream ss;
    
    ss << "  <nav>\n";
    ss << "    <h2>Test Cases</h2>\n";
    ss << "    <ul>\n";
    for (const auto& item : items) {
        ss << "      <li><a href='#" << item.id << "'>" 
           << escapeHtml(item.name) << "</a></li>\n";
    }
    ss << "    </ul>\n";
    ss << "  </nav>\n";
    
    return ss.str();
}

// JsonGenerator implementation
std::string JsonGenerator::generate(const ManualTestItem& item) {
    return itemToJson(item);
}

std::string JsonGenerator::generateSuite(const std::vector<ManualTestItem>& items) {
    std::stringstream ss;
    
    ss << "{\n";
    ss << "  \"testSuite\": [\n";
    
    for (size_t i = 0; i < items.size(); ++i) {
        ss << itemToJson(items[i]);
        if (i < items.size() - 1) ss << ",";
        ss << "\n";
    }
    
    ss << "  ]\n";
    ss << "}\n";
    
    return ss.str();
}

std::string JsonGenerator::itemToJson(const ManualTestItem& item) const {
    std::stringstream ss;
    
    ss << "    {\n";
    ss << "      \"id\": \"" << escapeJson(item.id) << "\",\n";
    ss << "      \"name\": \"" << escapeJson(item.name) << "\",\n";
    ss << "      \"description\": \"" << escapeJson(item.description) << "\",\n";
    ss << "      \"tags\": " << vectorToJsonArray(item.tags) << ",\n";
    ss << "      \"preconditions\": " << vectorToJsonArray(item.preconditions) << ",\n";
    ss << "      \"steps\": " << vectorToJsonArray(item.steps) << ",\n";
    ss << "      \"expectedResults\": " << vectorToJsonArray(item.expectedResults) << ",\n";
    ss << "      \"metadata\": " << mapToJsonObject(item.metadata) << "\n";
    ss << "    }";
    
    return ss.str();
}

std::string JsonGenerator::vectorToJsonArray(const std::vector<std::string>& vec) const {
    std::stringstream ss;
    ss << "[";
    
    for (size_t i = 0; i < vec.size(); ++i) {
        ss << "\"" << escapeJson(vec[i]) << "\"";
        if (i < vec.size() - 1) ss << ", ";
    }
    
    ss << "]";
    return ss.str();
}

std::string JsonGenerator::mapToJsonObject(const std::map<std::string, std::string>& map) const {
    std::stringstream ss;
    ss << "{";
    
    size_t i = 0;
    for (const auto& [key, value] : map) {
        ss << "\"" << escapeJson(key) << "\": \"" << escapeJson(value) << "\"";
        if (i < map.size() - 1) ss << ", ";
        i++;
    }
    
    ss << "}";
    return ss.str();
}

// ManualTestGenerator implementation
ManualTestGenerator::ManualTestGenerator() 
    : format_(OutputFormat::MARKDOWN),
      screenshotsEnabled_(false) {
    createGenerator();
}

void ManualTestGenerator::setOutputFormat(OutputFormat format) {
    format_ = format;
    createGenerator();
}

void ManualTestGenerator::setOutputPath(const std::string& path) {
    outputPath_ = path;
}

void ManualTestGenerator::enableScreenshots(bool enable) {
    screenshotsEnabled_ = enable;
}

void ManualTestGenerator::setScreenshotPath(const std::string& path) {
    screenshotPath_ = path;
}

void ManualTestGenerator::generateFromFeature(std::shared_ptr<Feature> feature) {
    items_.clear();
    
    auto preconditions = extractPreconditions(feature);
    
    for (const auto& scenario : feature->getScenarios()) {
        auto item = convertScenario(scenario);
        item.preconditions = preconditions;
        
        // Add feature tags to scenario
        for (const auto& tag : feature->getTags()) {
            item.tags.push_back(tag);
        }
        
        items_.push_back(item);
    }
    
    generatedContent_ = generator_->generateSuite(items_);
}

void ManualTestGenerator::generateFromFeatureFile(const std::string& featurePath) {
    GherkinParser parser;
    auto feature = parser.parseFile(featurePath);
    generateFromFeature(feature);
}

void ManualTestGenerator::generateFromDirectory(const std::string& directoryPath) {
    auto featureFiles = findFeatureFiles(directoryPath);
    items_.clear();
    
    for (const auto& file : featureFiles) {
        try {
            GherkinParser parser;
            auto feature = parser.parseFile(file);
            
            auto preconditions = extractPreconditions(feature);
            
            for (const auto& scenario : feature->getScenarios()) {
                auto item = convertScenario(scenario);
                item.preconditions = preconditions;
                
                // Add feature tags to scenario
                for (const auto& tag : feature->getTags()) {
                    item.tags.push_back(tag);
                }
                
                items_.push_back(item);
            }
        } catch (const std::exception& e) {
            std::cerr << "Error processing " << file << ": " << e.what() << std::endl;
        }
    }
    
    generatedContent_ = generator_->generateSuite(items_);
}

std::vector<std::string> ManualTestGenerator::findFeatureFiles(const std::string& directory) const {
    std::vector<std::string> files;
    
    if (std::filesystem::exists(directory) && std::filesystem::is_directory(directory)) {
        for (const auto& entry : std::filesystem::recursive_directory_iterator(directory)) {
            if (entry.is_regular_file() && entry.path().extension() == ".feature") {
                files.push_back(entry.path().string());
            }
        }
    }
    
    return files;
}

void ManualTestGenerator::saveToFile() const {
    if (!outputPath_.empty()) {
        saveToFile(outputPath_);
    }
}

void ManualTestGenerator::saveToFile(const std::string& path) const {
    std::ofstream file(path);
    if (!file.is_open()) {
        throw std::runtime_error("Cannot open output file: " + path);
    }
    
    file << generatedContent_;
    file.close();
}

ManualTestItem ManualTestGenerator::convertScenario(std::shared_ptr<Scenario> scenario) const {
    ManualTestItem item;
    
    item.id = ManualTestUtils::generateTestId(scenario->getName());
    item.name = scenario->getName();
    item.description = scenario->getDescription();
    item.tags = scenario->getTags();
    
    // Convert steps
    item.steps = convertSteps(scenario->getSteps());
    
    // Extract expected results (typically from Then steps)
    for (const auto& step : scenario->getSteps()) {
        if (step->getType() == Step::Type::THEN) {
            item.expectedResults.push_back(formatStep(step));
        }
    }
    
    return item;
}

std::vector<std::string> ManualTestGenerator::extractPreconditions(std::shared_ptr<Feature> feature) const {
    std::vector<std::string> preconditions;
    
    // Extract from background
    if (feature->getBackground()) {
        for (const auto& step : feature->getBackground()->getSteps()) {
            preconditions.push_back(formatStep(step));
        }
    }
    
    return preconditions;
}

std::vector<std::string> ManualTestGenerator::convertSteps(
    const std::vector<std::shared_ptr<Step>>& steps) const {
    std::vector<std::string> result;
    
    for (const auto& step : steps) {
        result.push_back(formatStep(step));
    }
    
    return result;
}

std::string ManualTestGenerator::formatStep(std::shared_ptr<Step> step) const {
    std::string result = ManualTestUtils::gherkinToManualStep(step->getText());
    
    // Add data table if present
    if (step->getDataTable()) {
        result += "\n" + ManualTestUtils::formatDataTable(step->getDataTable());
    }
    
    // Add doc string if present
    if (step->getDocString()) {
        result += "\n" + ManualTestUtils::formatDocString(step->getDocString());
    }
    
    return result;
}

void ManualTestGenerator::createGenerator() {
    switch (format_) {
        case OutputFormat::MARKDOWN:
            generator_ = std::make_unique<MarkdownGenerator>();
            break;
        case OutputFormat::HTML:
            generator_ = std::make_unique<HtmlGenerator>();
            break;
        case OutputFormat::JSON:
            generator_ = std::make_unique<JsonGenerator>();
            break;
    }
}

// ManualTestUtils implementation
std::string ManualTestUtils::gherkinToManualStep(const std::string& gherkinStep) {
    std::string result = gherkinStep;
    
    // Convert Gherkin parameters to manual test format
    std::regex paramRegex("\"([^\"]*)\"");
    result = std::regex_replace(result, paramRegex, "[$1]");
    
    // Make it more human-readable
    if (result.find("I ") == 0) {
        result = "User " + result.substr(2);
    }
    
    return result;
}

std::string ManualTestUtils::generateTestId(const std::string& scenarioName) {
    std::string id = "TC_";
    
    // Generate timestamp-based ID
    auto t = std::time(nullptr);
    auto tm = *std::localtime(&t);
    
    std::stringstream ss;
    ss << std::put_time(&tm, "%Y%m%d_%H%M%S");
    id += ss.str() + "_";
    
    // Add sanitized scenario name
    for (char c : scenarioName) {
        if (std::isalnum(c)) {
            id += c;
        } else if (c == ' ') {
            id += '_';
        }
    }
    
    return id;
}

std::string ManualTestUtils::formatDataTable(std::shared_ptr<DataTable> table) {
    std::stringstream ss;
    ss << "Data Table:\n";
    
    for (const auto& row : table->getRows()) {
        ss << "  | ";
        for (const auto& cell : row) {
            ss << cell << " | ";
        }
        ss << "\n";
    }
    
    return ss.str();
}

std::string ManualTestUtils::formatDocString(std::shared_ptr<DocString> docString) {
    std::stringstream ss;
    ss << "Document:\n";
    ss << "  " << docString->getContent() << "\n";
    
    if (!docString->getContentType().empty()) {
        ss << "  (Type: " << docString->getContentType() << ")\n";
    }
    
    return ss.str();
}

} // namespace cucumber_cpp