#include "catch2_integration.hpp"
#include <iostream>
#include <fstream>
#include <chrono>
#include <filesystem>
#include <algorithm>

namespace cucumber_cpp {

// TestCase implementation
TestCase::TestCase(const std::string& name, const std::string& tags)
    : name_(name), tags_(tags) {
    result_.name = name;
    result_.status = TestStatus::PENDING;
}

void TestCase::run() {
    auto start = std::chrono::high_resolution_clock::now();
    
    try {
        if (testFunc_) {
            testFunc_();
            result_.status = TestStatus::PASSED;
        } else {
            result_.status = TestStatus::SKIPPED;
            result_.message = "No test function defined";
        }
    } catch (const std::exception& e) {
        result_.status = TestStatus::FAILED;
        result_.message = e.what();
    } catch (...) {
        result_.status = TestStatus::FAILED;
        result_.message = "Unknown exception";
    }
    
    auto end = std::chrono::high_resolution_clock::now();
    std::chrono::duration<double> duration = end - start;
    result_.duration = duration.count();
}

// TestSuite implementation
TestSuite::TestSuite(const std::string& name) : name_(name) {}

void TestSuite::addTestCase(std::shared_ptr<TestCase> testCase) {
    testCases_.push_back(testCase);
}

void TestSuite::run() {
    results_.clear();
    
    for (auto& testCase : testCases_) {
        testCase->run();
        results_.push_back(testCase->getResult());
    }
}

std::vector<TestResult> TestSuite::getResults() const {
    return results_;
}

int TestSuite::getPassedCount() const {
    return std::count_if(results_.begin(), results_.end(),
        [](const TestResult& r) { return r.status == TestStatus::PASSED; });
}

int TestSuite::getFailedCount() const {
    return std::count_if(results_.begin(), results_.end(),
        [](const TestResult& r) { return r.status == TestStatus::FAILED; });
}

int TestSuite::getSkippedCount() const {
    return std::count_if(results_.begin(), results_.end(),
        [](const TestResult& r) { return r.status == TestStatus::SKIPPED; });
}

// Assertions implementation
void Assertions::require(bool condition, const std::string& message) {
    if (!condition) {
        throw std::runtime_error(message.empty() ? "Assertion failed" : message);
    }
}

void Assertions::requireEqual(const std::string& actual, const std::string& expected) {
    if (actual != expected) {
        throw std::runtime_error("Expected: '" + expected + "', but got: '" + actual + "'");
    }
}

void Assertions::requireNotEqual(const std::string& actual, const std::string& expected) {
    if (actual == expected) {
        throw std::runtime_error("Expected values to be different, but both were: '" + actual + "'");
    }
}

void Assertions::requireThrows(std::function<void()> func) {
    bool threw = false;
    try {
        func();
    } catch (...) {
        threw = true;
    }
    
    if (!threw) {
        throw std::runtime_error("Expected exception to be thrown");
    }
}

void Assertions::requireNoThrow(std::function<void()> func) {
    try {
        func();
    } catch (const std::exception& e) {
        throw std::runtime_error("Expected no exception, but got: " + std::string(e.what()));
    } catch (...) {
        throw std::runtime_error("Expected no exception, but got unknown exception");
    }
}

// CucumberToCatch2 implementation
CucumberToCatch2::CucumberToCatch2() : stepRegistry_(StepRegistry::getInstance()) {}

std::shared_ptr<TestSuite> CucumberToCatch2::generateTestSuite(std::shared_ptr<Feature> feature) {
    auto suite = std::make_shared<TestSuite>(feature->getName());
    
    for (const auto& scenario : feature->getScenarios()) {
        auto testCase = generateTestCase(scenario);
        suite->addTestCase(testCase);
    }
    
    return suite;
}

std::shared_ptr<TestCase> CucumberToCatch2::generateTestCase(std::shared_ptr<Scenario> scenario) {
    std::string tags;
    for (const auto& tag : scenario->getTags()) {
        tags += tag + " ";
    }
    
    auto testCase = std::make_shared<TestCase>(scenario->getName(), tags);
    
    if (scenario->isOutline() && scenario->getExamples()) {
        // For scenario outlines, create a test for each example row
        auto examples = scenario->getExamples();
        const auto& header = examples->getHeader();
        
        for (const auto& row : examples->getRows()) {
            std::map<std::string, std::string> exampleData;
            for (size_t i = 0; i < header.size() && i < row.size(); ++i) {
                exampleData[header[i]] = row[i];
            }
            
            testCase->setTestFunction(createOutlineTest(scenario, exampleData));
        }
    } else {
        testCase->setTestFunction(createScenarioTest(scenario));
    }
    
    return testCase;
}

void CucumberToCatch2::executeFeature(std::shared_ptr<Feature> feature) {
    auto suite = generateTestSuite(feature);
    suite->run();
    
    auto results = suite->getResults();
    results_.insert(results_.end(), results.begin(), results.end());
}

std::function<void()> CucumberToCatch2::createScenarioTest(std::shared_ptr<Scenario> scenario) {
    return [this, scenario]() {
        // Execute background if present
        // Note: In a full implementation, we'd get the background from the feature
        
        // Execute scenario steps
        for (const auto& step : scenario->getSteps()) {
            stepRegistry_.executeStep(*step);
        }
    };
}

std::function<void()> CucumberToCatch2::createOutlineTest(
    std::shared_ptr<Scenario> scenario,
    const std::map<std::string, std::string>& exampleData) {
    
    return [this, scenario, exampleData]() {
        // Execute scenario steps with example data substitution
        for (const auto& step : scenario->getSteps()) {
            std::string stepText = step->getText();
            
            // Replace placeholders with example data
            for (const auto& [key, value] : exampleData) {
                std::string placeholder = "<" + key + ">";
                size_t pos = 0;
                while ((pos = stepText.find(placeholder, pos)) != std::string::npos) {
                    stepText.replace(pos, placeholder.length(), value);
                    pos += value.length();
                }
            }
            
            // Create new step with substituted text
            Step substitutedStep(step->getType(), stepText, step->getLine());
            if (step->getDataTable()) {
                substitutedStep.setDataTable(step->getDataTable());
            }
            if (step->getDocString()) {
                substitutedStep.setDocString(step->getDocString());
            }
            
            stepRegistry_.executeStep(substitutedStep);
        }
    };
}

// TestRunner implementation
TestRunner::TestRunner() {}

void TestRunner::addSuite(std::shared_ptr<TestSuite> suite) {
    suites_.push_back(suite);
}

void TestRunner::runAll() {
    allResults_.clear();
    
    for (auto& suite : suites_) {
        suite->run();
        auto results = suite->getResults();
        allResults_.insert(allResults_.end(), results.begin(), results.end());
    }
}

void TestRunner::printResults() const {
    ConsoleReporter reporter(true);
    
    for (const auto& suite : suites_) {
        reporter.reportSuiteStart("Test Suite");
        
        for (const auto& result : suite->getResults()) {
            reporter.reportTestEnd(result);
        }
        
        reporter.reportSuiteEnd("Test Suite", suite->getResults());
    }
    
    reporter.reportSummary(getTotalTests(), getPassedTests(), getFailedTests(), 
                          getTotalTests() - getPassedTests() - getFailedTests());
}

void TestRunner::saveResults(const std::string& filename) const {
    JUnitReporter reporter(filename);
    
    for (const auto& suite : suites_) {
        reporter.reportSuiteStart("Test Suite");
        
        for (const auto& result : suite->getResults()) {
            reporter.reportTestEnd(result);
        }
        
        reporter.reportSuiteEnd("Test Suite", suite->getResults());
    }
    
    reporter.reportSummary(getTotalTests(), getPassedTests(), getFailedTests(),
                          getTotalTests() - getPassedTests() - getFailedTests());
}

int TestRunner::getTotalTests() const {
    return allResults_.size();
}

int TestRunner::getPassedTests() const {
    return std::count_if(allResults_.begin(), allResults_.end(),
        [](const TestResult& r) { return r.status == TestStatus::PASSED; });
}

int TestRunner::getFailedTests() const {
    return std::count_if(allResults_.begin(), allResults_.end(),
        [](const TestResult& r) { return r.status == TestStatus::FAILED; });
}

// ConsoleReporter implementation
ConsoleReporter::ConsoleReporter(bool verbose) : verbose_(verbose) {}

void ConsoleReporter::reportTestStart(const std::string& name) {
    if (verbose_) {
        std::cout << "Running: " << name << "..." << std::endl;
    }
}

void ConsoleReporter::reportTestEnd(const TestResult& result) {
    std::cout << getStatusSymbol(result.status) << " " << result.name;
    
    if (result.status == TestStatus::FAILED && !result.message.empty()) {
        std::cout << "\n  Error: " << result.message;
    }
    
    if (verbose_) {
        std::cout << " (" << result.duration << "s)";
    }
    
    std::cout << std::endl;
}

void ConsoleReporter::reportSuiteStart(const std::string& name) {
    std::cout << "\n" << "=" << std::string(50, '=') << std::endl;
    std::cout << "Running Suite: " << name << std::endl;
    std::cout << std::string(50, '=') << std::endl;
}

void ConsoleReporter::reportSuiteEnd(const std::string& name, const std::vector<TestResult>& results) {
    int passed = std::count_if(results.begin(), results.end(),
        [](const TestResult& r) { return r.status == TestStatus::PASSED; });
    int failed = std::count_if(results.begin(), results.end(),
        [](const TestResult& r) { return r.status == TestStatus::FAILED; });
    
    std::cout << "\nSuite Summary: " << passed << " passed, " << failed << " failed" << std::endl;
}

void ConsoleReporter::reportSummary(int total, int passed, int failed, int skipped) {
    std::cout << "\n" << std::string(50, '=') << std::endl;
    std::cout << "Test Summary:" << std::endl;
    std::cout << "  Total:   " << total << std::endl;
    std::cout << "  Passed:  " << passed << " ✓" << std::endl;
    std::cout << "  Failed:  " << failed << " ✗" << std::endl;
    std::cout << "  Skipped: " << skipped << " ○" << std::endl;
    std::cout << std::string(50, '=') << std::endl;
    
    if (failed == 0) {
        std::cout << "\n✅ All tests passed!" << std::endl;
    } else {
        std::cout << "\n❌ Some tests failed!" << std::endl;
    }
}

std::string ConsoleReporter::getStatusSymbol(TestStatus status) const {
    switch (status) {
        case TestStatus::PASSED: return "✓";
        case TestStatus::FAILED: return "✗";
        case TestStatus::SKIPPED: return "○";
        case TestStatus::PENDING: return "⧖";
        default: return "?";
    }
}

// JUnitReporter implementation
JUnitReporter::JUnitReporter(const std::string& filename) : filename_(filename) {
    xml_ << "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
    xml_ << "<testsuites>\n";
}

JUnitReporter::~JUnitReporter() {
    xml_ << "</testsuites>\n";
    
    std::ofstream file(filename_);
    if (file.is_open()) {
        file << xml_.str();
        file.close();
    }
}

void JUnitReporter::reportTestStart(const std::string& name) {
    // Not needed for JUnit XML
}

void JUnitReporter::reportTestEnd(const TestResult& result) {
    xml_ << "    <testcase name=\"" << escapeXml(result.name) 
         << "\" time=\"" << result.duration << "\"";
    
    if (result.status == TestStatus::FAILED) {
        xml_ << ">\n";
        xml_ << "      <failure message=\"" << escapeXml(result.message) << "\"/>\n";
        xml_ << "    </testcase>\n";
    } else if (result.status == TestStatus::SKIPPED) {
        xml_ << ">\n";
        xml_ << "      <skipped/>\n";
        xml_ << "    </testcase>\n";
    } else {
        xml_ << "/>\n";
    }
}

void JUnitReporter::reportSuiteStart(const std::string& name) {
    currentSuite_ = name;
    xml_ << "  <testsuite name=\"" << escapeXml(name) << "\">\n";
}

void JUnitReporter::reportSuiteEnd(const std::string& name, const std::vector<TestResult>& results) {
    xml_ << "  </testsuite>\n";
}

void JUnitReporter::reportSummary(int total, int passed, int failed, int skipped) {
    // Summary is in the testsuite attributes
}

std::string JUnitReporter::escapeXml(const std::string& text) const {
    std::string result;
    for (char c : text) {
        switch (c) {
            case '<': result += "&lt;"; break;
            case '>': result += "&gt;"; break;
            case '&': result += "&amp;"; break;
            case '"': result += "&quot;"; break;
            case '\'': result += "&apos;"; break;
            default: result += c;
        }
    }
    return result;
}

// CucumberTestExecutor implementation
CucumberTestExecutor::CucumberTestExecutor() {
    reporter_ = std::make_shared<ConsoleReporter>(true);
}

void CucumberTestExecutor::setReporter(std::shared_ptr<TestReporter> reporter) {
    reporter_ = reporter;
}

int CucumberTestExecutor::executeFeatureFile(const std::string& featureFile) {
    try {
        GherkinParser parser;
        auto feature = parser.parseFile(featureFile);
        
        converter_.executeFeature(feature);
        
        auto results = converter_.getResults();
        
        reporter_->reportSuiteStart(feature->getName());
        for (const auto& result : results) {
            reporter_->reportTestEnd(result);
        }
        reporter_->reportSuiteEnd(feature->getName(), results);
        
        int failed = std::count_if(results.begin(), results.end(),
            [](const TestResult& r) { return r.status == TestStatus::FAILED; });
        
        return failed > 0 ? 1 : 0;
        
    } catch (const std::exception& e) {
        std::cerr << "Error executing feature file: " << e.what() << std::endl;
        return 1;
    }
}

int CucumberTestExecutor::executeFeatureDirectory(const std::string& directory) {
    auto featureFiles = findFeatureFiles(directory);
    int totalFailed = 0;
    
    for (const auto& file : featureFiles) {
        int result = executeFeatureFile(file);
        if (result != 0) {
            totalFailed++;
        }
    }
    
    return totalFailed;
}

std::vector<std::string> CucumberTestExecutor::findFeatureFiles(const std::string& directory) const {
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

} // namespace cucumber_cpp