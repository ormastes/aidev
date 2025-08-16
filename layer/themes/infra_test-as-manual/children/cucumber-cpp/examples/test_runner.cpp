// test_runner.cpp - Example test runner demonstrating Cucumber-CPP framework usage
#include "../include/gherkin_parser.hpp"
#include "../include/step_registry.hpp"
#include "../include/catch2_integration.hpp"
#include "../include/manual_generator.hpp"
#include <iostream>
#include <filesystem>
#include <chrono>
#include <iomanip>

using namespace cucumber_cpp;

// Color output helpers for terminal
class ConsoleColor {
public:
    static std::string green(const std::string& text) {
        return "\033[32m" + text + "\033[0m";
    }
    
    static std::string red(const std::string& text) {
        return "\033[31m" + text + "\033[0m";
    }
    
    static std::string yellow(const std::string& text) {
        return "\033[33m" + text + "\033[0m";
    }
    
    static std::string blue(const std::string& text) {
        return "\033[34m" + text + "\033[0m";
    }
    
    static std::string bold(const std::string& text) {
        return "\033[1m" + text + "\033[0m";
    }
};

// Test execution statistics
struct TestStats {
    int totalScenarios = 0;
    int passedScenarios = 0;
    int failedScenarios = 0;
    int skippedScenarios = 0;
    int totalSteps = 0;
    int passedSteps = 0;
    int failedSteps = 0;
    int skippedSteps = 0;
    int undefinedSteps = 0;
    std::chrono::milliseconds duration{0};
    
    void printSummary() const {
        std::cout << "\n" << ConsoleColor::bold("Test Execution Summary") << "\n";
        std::cout << "=====================\n";
        
        // Scenarios summary
        std::cout << "Scenarios: ";
        if (passedScenarios > 0) {
            std::cout << ConsoleColor::green(std::to_string(passedScenarios) + " passed") << ", ";
        }
        if (failedScenarios > 0) {
            std::cout << ConsoleColor::red(std::to_string(failedScenarios) + " failed") << ", ";
        }
        if (skippedScenarios > 0) {
            std::cout << ConsoleColor::yellow(std::to_string(skippedScenarios) + " skipped") << ", ";
        }
        std::cout << totalScenarios << " total\n";
        
        // Steps summary
        std::cout << "Steps:     ";
        if (passedSteps > 0) {
            std::cout << ConsoleColor::green(std::to_string(passedSteps) + " passed") << ", ";
        }
        if (failedSteps > 0) {
            std::cout << ConsoleColor::red(std::to_string(failedSteps) + " failed") << ", ";
        }
        if (skippedSteps > 0) {
            std::cout << ConsoleColor::yellow(std::to_string(skippedSteps) + " skipped") << ", ";
        }
        if (undefinedSteps > 0) {
            std::cout << ConsoleColor::yellow(std::to_string(undefinedSteps) + " undefined") << ", ";
        }
        std::cout << totalSteps << " total\n";
        
        // Duration
        std::cout << "Duration:  " << duration.count() << "ms\n";
        
        // Overall result
        if (failedScenarios == 0 && undefinedSteps == 0) {
            std::cout << "\n" << ConsoleColor::green("✓ All tests passed!") << "\n";
        } else {
            std::cout << "\n" << ConsoleColor::red("✗ Some tests failed or have undefined steps") << "\n";
        }
    }
};

// Test runner class
class TestRunner {
public:
    TestRunner() : integration_(std::make_unique<ConsoleReporter>()) {}
    
    void setReporter(std::unique_ptr<TestReporter> reporter) {
        integration_.setReporter(std::move(reporter));
    }
    
    void setTags(const std::vector<std::string>& tags) {
        tags_ = tags;
    }
    
    void setDryRun(bool dryRun) {
        dryRun_ = dryRun;
    }
    
    void setStrictMode(bool strict) {
        strictMode_ = strict;
    }
    
    TestStats runFeatureFile(const std::string& featurePath) {
        TestStats stats;
        auto startTime = std::chrono::steady_clock::now();
        
        std::cout << ConsoleColor::bold("Running feature: ") << featurePath << "\n\n";
        
        try {
            // Parse feature file
            GherkinParser parser;
            auto feature = parser.parseFile(featurePath);
            
            // Print feature info
            std::cout << ConsoleColor::blue("Feature: " + feature->getName()) << "\n";
            if (!feature->getDescription().empty()) {
                std::cout << "  " << feature->getDescription() << "\n";
            }
            std::cout << "\n";
            
            // Run scenarios
            for (const auto& scenario : feature->getScenarios()) {
                if (shouldRunScenario(scenario)) {
                    auto scenarioResult = runScenario(scenario, feature);
                    updateStats(stats, scenarioResult);
                } else {
                    stats.skippedScenarios++;
                    stats.totalScenarios++;
                }
            }
            
        } catch (const std::exception& e) {
            std::cerr << ConsoleColor::red("Error parsing feature file: " + std::string(e.what())) << "\n";
            stats.failedScenarios++;
            stats.totalScenarios++;
        }
        
        auto endTime = std::chrono::steady_clock::now();
        stats.duration = std::chrono::duration_cast<std::chrono::milliseconds>(endTime - startTime);
        
        return stats;
    }
    
    TestStats runDirectory(const std::string& directory) {
        TestStats totalStats;
        
        std::cout << ConsoleColor::bold("Running features in directory: ") << directory << "\n";
        std::cout << "=" << std::string(50, '=') << "\n\n";
        
        auto featureFiles = findFeatureFiles(directory);
        
        for (const auto& file : featureFiles) {
            auto fileStats = runFeatureFile(file);
            mergeStats(totalStats, fileStats);
            std::cout << "\n";
        }
        
        return totalStats;
    }
    
private:
    Catch2Integration integration_;
    StepRegistry& registry_ = StepRegistry::getInstance();
    std::vector<std::string> tags_;
    bool dryRun_ = false;
    bool strictMode_ = false;
    
    struct ScenarioResult {
        bool passed = true;
        int totalSteps = 0;
        int passedSteps = 0;
        int failedSteps = 0;
        int skippedSteps = 0;
        int undefinedSteps = 0;
    };
    
    bool shouldRunScenario(std::shared_ptr<Scenario> scenario) {
        if (tags_.empty()) {
            return true;
        }
        
        for (const auto& tag : scenario->getTags()) {
            if (std::find(tags_.begin(), tags_.end(), tag) != tags_.end()) {
                return true;
            }
        }
        
        return false;
    }
    
    ScenarioResult runScenario(std::shared_ptr<Scenario> scenario, 
                                std::shared_ptr<Feature> feature) {
        ScenarioResult result;
        
        std::cout << "  " << ConsoleColor::bold("Scenario: " + scenario->getName()) << "\n";
        
        // Run background steps if present
        if (feature->getBackground()) {
            for (const auto& step : feature->getBackground()->getSteps()) {
                auto stepResult = runStep(step);
                updateScenarioResult(result, stepResult);
                if (!stepResult.passed && !dryRun_) {
                    break; // Stop on first failure unless in dry-run mode
                }
            }
        }
        
        // Run scenario steps
        for (const auto& step : scenario->getSteps()) {
            auto stepResult = runStep(step);
            updateScenarioResult(result, stepResult);
            if (!stepResult.passed && !dryRun_) {
                break; // Stop on first failure unless in dry-run mode
            }
        }
        
        // Print scenario result
        if (result.passed && result.undefinedSteps == 0) {
            std::cout << "    " << ConsoleColor::green("✓ Scenario passed") << "\n";
        } else if (result.undefinedSteps > 0) {
            std::cout << "    " << ConsoleColor::yellow("⚠ Scenario has undefined steps") << "\n";
        } else {
            std::cout << "    " << ConsoleColor::red("✗ Scenario failed") << "\n";
        }
        
        return result;
    }
    
    struct StepResult {
        bool passed = true;
        bool undefined = false;
        bool skipped = false;
        std::string errorMessage;
    };
    
    StepResult runStep(std::shared_ptr<Step> step) {
        StepResult result;
        
        std::string stepTypeStr = getStepTypeString(step->getType());
        std::string stepText = step->getText();
        
        std::cout << "    " << stepTypeStr << " " << stepText;
        
        if (dryRun_) {
            // In dry-run mode, just check if step is defined
            if (registry_.hasMatchingStep(stepText)) {
                std::cout << " " << ConsoleColor::green("✓") << "\n";
                result.passed = true;
            } else {
                std::cout << " " << ConsoleColor::yellow("?") << " (undefined)\n";
                result.undefined = true;
                result.passed = false;
                
                // Print suggested step definition
                printSuggestedStepDefinition(step);
            }
        } else {
            // Actually execute the step
            try {
                StepContext context;
                
                // Add data table to context if present
                if (step->getDataTable()) {
                    context.setDataTable(step->getDataTable());
                }
                
                // Add doc string to context if present
                if (step->getDocString()) {
                    context.setDocString(step->getDocString());
                }
                
                // Execute step
                if (registry_.executeStep(stepText, context)) {
                    std::cout << " " << ConsoleColor::green("✓") << "\n";
                    result.passed = true;
                } else {
                    std::cout << " " << ConsoleColor::yellow("?") << " (undefined)\n";
                    result.undefined = true;
                    result.passed = false;
                    
                    // Print suggested step definition
                    printSuggestedStepDefinition(step);
                }
            } catch (const std::exception& e) {
                std::cout << " " << ConsoleColor::red("✗") << "\n";
                std::cout << "      Error: " << ConsoleColor::red(e.what()) << "\n";
                result.passed = false;
                result.errorMessage = e.what();
            }
        }
        
        return result;
    }
    
    std::string getStepTypeString(Step::Type type) {
        switch (type) {
            case Step::Type::GIVEN: return "Given";
            case Step::Type::WHEN:  return "When ";
            case Step::Type::THEN:  return "Then ";
            case Step::Type::AND:   return "And  ";
            case Step::Type::BUT:   return "But  ";
            default: return "     ";
        }
    }
    
    void printSuggestedStepDefinition(std::shared_ptr<Step> step) {
        std::cout << "      Suggested step definition:\n";
        std::cout << "      " << ConsoleColor::yellow(generateStepDefinition(step)) << "\n";
    }
    
    std::string generateStepDefinition(std::shared_ptr<Step> step) {
        std::string macro;
        switch (step->getType()) {
            case Step::Type::GIVEN: macro = "GIVEN"; break;
            case Step::Type::WHEN:  macro = "WHEN"; break;
            case Step::Type::THEN:  macro = "THEN"; break;
            default: macro = "STEP"; break;
        }
        
        // Convert step text to regex pattern
        std::string pattern = step->getText();
        
        // Replace numbers with {int}
        pattern = std::regex_replace(pattern, std::regex("\\d+"), "{int}");
        
        // Replace quoted strings with {string}
        pattern = std::regex_replace(pattern, std::regex("\"[^\"]*\""), "{string}");
        
        return macro + "(\"" + pattern + "\") {\n    // TODO: Implement step\n}";
    }
    
    void updateScenarioResult(ScenarioResult& result, const StepResult& stepResult) {
        result.totalSteps++;
        
        if (stepResult.undefined) {
            result.undefinedSteps++;
        } else if (stepResult.skipped) {
            result.skippedSteps++;
        } else if (stepResult.passed) {
            result.passedSteps++;
        } else {
            result.failedSteps++;
            result.passed = false;
        }
    }
    
    void updateStats(TestStats& stats, const ScenarioResult& result) {
        stats.totalScenarios++;
        stats.totalSteps += result.totalSteps;
        stats.passedSteps += result.passedSteps;
        stats.failedSteps += result.failedSteps;
        stats.skippedSteps += result.skippedSteps;
        stats.undefinedSteps += result.undefinedSteps;
        
        if (result.passed && result.undefinedSteps == 0) {
            stats.passedScenarios++;
        } else if (result.undefinedSteps > 0 && strictMode_) {
            stats.failedScenarios++;
        } else if (!result.passed) {
            stats.failedScenarios++;
        }
    }
    
    void mergeStats(TestStats& total, const TestStats& partial) {
        total.totalScenarios += partial.totalScenarios;
        total.passedScenarios += partial.passedScenarios;
        total.failedScenarios += partial.failedScenarios;
        total.skippedScenarios += partial.skippedScenarios;
        total.totalSteps += partial.totalSteps;
        total.passedSteps += partial.passedSteps;
        total.failedSteps += partial.failedSteps;
        total.skippedSteps += partial.skippedSteps;
        total.undefinedSteps += partial.undefinedSteps;
        total.duration += partial.duration;
    }
    
    std::vector<std::string> findFeatureFiles(const std::string& directory) {
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
};

// Main function demonstrating test runner usage
int main(int argc, char** argv) {
    std::cout << ConsoleColor::bold("Cucumber-CPP Test Runner Example") << "\n";
    std::cout << "================================\n\n";
    
    // Register step definitions (would normally be in separate files)
    // These would be loaded from calculator_steps.cpp in a real scenario
    
    TestRunner runner;
    
    // Parse command line arguments
    std::string targetPath = "../features";
    std::vector<std::string> tags;
    bool dryRun = false;
    bool strictMode = false;
    std::string reportFormat = "console";
    
    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];
        
        if (arg == "--tags" && i + 1 < argc) {
            std::string tagList = argv[++i];
            size_t pos = 0;
            while ((pos = tagList.find(',')) != std::string::npos) {
                tags.push_back(tagList.substr(0, pos));
                tagList.erase(0, pos + 1);
            }
            if (!tagList.empty()) {
                tags.push_back(tagList);
            }
        } else if (arg == "--dry-run") {
            dryRun = true;
        } else if (arg == "--strict") {
            strictMode = true;
        } else if (arg == "--format" && i + 1 < argc) {
            reportFormat = argv[++i];
        } else if (arg[0] != '-') {
            targetPath = arg;
        }
    }
    
    // Configure runner
    if (!tags.empty()) {
        runner.setTags(tags);
    }
    runner.setDryRun(dryRun);
    runner.setStrictMode(strictMode);
    
    // Set reporter based on format
    if (reportFormat == "junit") {
        runner.setReporter(std::make_unique<JUnitReporter>("test-results.xml"));
    } else {
        runner.setReporter(std::make_unique<ConsoleReporter>());
    }
    
    // Run tests
    TestStats stats;
    
    if (std::filesystem::is_directory(targetPath)) {
        stats = runner.runDirectory(targetPath);
    } else if (std::filesystem::is_regular_file(targetPath)) {
        stats = runner.runFeatureFile(targetPath);
    } else {
        std::cerr << ConsoleColor::red("Error: Invalid path: " + targetPath) << "\n";
        return 1;
    }
    
    // Print summary
    stats.printSummary();
    
    // Generate manual test documentation
    if (!dryRun) {
        std::cout << "\n" << ConsoleColor::bold("Generating Manual Test Documentation") << "\n";
        std::cout << "=====================================\n";
        
        ManualTestGenerator manualGen;
        manualGen.setOutputFormat(ManualTestGenerator::OutputFormat::MARKDOWN);
        manualGen.setOutputPath("manual_tests.md");
        
        if (std::filesystem::is_directory(targetPath)) {
            manualGen.generateFromDirectory(targetPath);
        } else {
            manualGen.generateFromFeatureFile(targetPath);
        }
        
        manualGen.saveToFile();
        std::cout << ConsoleColor::green("✓ Manual test documentation saved to manual_tests.md") << "\n";
    }
    
    // Return exit code based on test results
    if (stats.failedScenarios > 0 || (strictMode && stats.undefinedSteps > 0)) {
        return 1;
    }
    
    return 0;
}