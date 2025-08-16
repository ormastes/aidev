#ifndef CATCH2_INTEGRATION_HPP
#define CATCH2_INTEGRATION_HPP

#include <string>
#include <vector>
#include <memory>
#include <functional>
#include <sstream>
#include "gherkin_parser.hpp"
#include "step_registry.hpp"

// Simple Catch2-compatible test framework implementation
// This provides Catch2-like functionality without external dependencies

namespace cucumber_cpp {

// Test result status
enum class TestStatus {
    PASSED,
    FAILED,
    SKIPPED,
    PENDING
};

// Test result
struct TestResult {
    std::string name;
    TestStatus status;
    std::string message;
    double duration;
    std::string file;
    int line;
};

// Test case
class TestCase {
public:
    TestCase(const std::string& name, const std::string& tags = "");
    
    void run();
    TestResult getResult() const { return result_; }
    
    void setTestFunction(std::function<void()> func) { testFunc_ = func; }
    
private:
    std::string name_;
    std::string tags_;
    std::function<void()> testFunc_;
    TestResult result_;
};

// Test suite
class TestSuite {
public:
    TestSuite(const std::string& name);
    
    void addTestCase(std::shared_ptr<TestCase> testCase);
    void run();
    
    std::vector<TestResult> getResults() const;
    int getPassedCount() const;
    int getFailedCount() const;
    int getSkippedCount() const;
    
private:
    std::string name_;
    std::vector<std::shared_ptr<TestCase>> testCases_;
    std::vector<TestResult> results_;
};

// Catch2-style assertions
class Assertions {
public:
    static void require(bool condition, const std::string& message = "");
    static void requireEqual(const std::string& actual, const std::string& expected);
    static void requireNotEqual(const std::string& actual, const std::string& expected);
    static void requireThrows(std::function<void()> func);
    static void requireNoThrow(std::function<void()> func);
    
    template<typename T>
    static void requireEqual(T actual, T expected) {
        if (actual != expected) {
            std::stringstream ss;
            ss << "Expected: " << expected << ", but got: " << actual;
            throw std::runtime_error(ss.str());
        }
    }
};

// Cucumber to Catch2 test generator
class CucumberToCatch2 {
public:
    CucumberToCatch2();
    
    // Generate test suite from feature
    std::shared_ptr<TestSuite> generateTestSuite(std::shared_ptr<Feature> feature);
    
    // Generate test case from scenario
    std::shared_ptr<TestCase> generateTestCase(std::shared_ptr<Scenario> scenario);
    
    // Execute feature as tests
    void executeFeature(std::shared_ptr<Feature> feature);
    
    // Get test results
    std::vector<TestResult> getResults() const { return results_; }
    
private:
    StepRegistry& stepRegistry_;
    std::vector<TestResult> results_;
    
    std::function<void()> createScenarioTest(std::shared_ptr<Scenario> scenario);
    std::function<void()> createOutlineTest(std::shared_ptr<Scenario> scenario, 
                                           const std::map<std::string, std::string>& exampleData);
    void executeBackground(std::shared_ptr<Scenario> background);
};

// Test runner
class TestRunner {
public:
    TestRunner();
    
    // Add test suite
    void addSuite(std::shared_ptr<TestSuite> suite);
    
    // Run all tests
    void runAll();
    
    // Run tests matching tag
    void runWithTag(const std::string& tag);
    
    // Get results
    void printResults() const;
    void saveResults(const std::string& filename) const;
    
    int getTotalTests() const;
    int getPassedTests() const;
    int getFailedTests() const;
    
private:
    std::vector<std::shared_ptr<TestSuite>> suites_;
    std::vector<TestResult> allResults_;
    
    void collectResults();
    std::string formatResult(const TestResult& result) const;
};

// Test reporter
class TestReporter {
public:
    virtual ~TestReporter() = default;
    
    virtual void reportTestStart(const std::string& name) = 0;
    virtual void reportTestEnd(const TestResult& result) = 0;
    virtual void reportSuiteStart(const std::string& name) = 0;
    virtual void reportSuiteEnd(const std::string& name, const std::vector<TestResult>& results) = 0;
    virtual void reportSummary(int total, int passed, int failed, int skipped) = 0;
};

// Console reporter
class ConsoleReporter : public TestReporter {
public:
    ConsoleReporter(bool verbose = false);
    
    void reportTestStart(const std::string& name) override;
    void reportTestEnd(const TestResult& result) override;
    void reportSuiteStart(const std::string& name) override;
    void reportSuiteEnd(const std::string& name, const std::vector<TestResult>& results) override;
    void reportSummary(int total, int passed, int failed, int skipped) override;
    
private:
    bool verbose_;
    
    std::string getColorCode(TestStatus status) const;
    std::string getStatusSymbol(TestStatus status) const;
};

// JUnit XML reporter
class JUnitReporter : public TestReporter {
public:
    JUnitReporter(const std::string& filename);
    ~JUnitReporter();
    
    void reportTestStart(const std::string& name) override;
    void reportTestEnd(const TestResult& result) override;
    void reportSuiteStart(const std::string& name) override;
    void reportSuiteEnd(const std::string& name, const std::vector<TestResult>& results) override;
    void reportSummary(int total, int passed, int failed, int skipped) override;
    
private:
    std::string filename_;
    std::stringstream xml_;
    std::string currentSuite_;
    
    std::string escapeXml(const std::string& text) const;
};

// Catch2-style test macros
#define TEST_CASE(name, tags) \
    static void test_##__LINE__(); \
    static struct test_registrar_##__LINE__ { \
        test_registrar_##__LINE__() { \
            auto testCase = std::make_shared<cucumber_cpp::TestCase>(name, tags); \
            testCase->setTestFunction(test_##__LINE__); \
            cucumber_cpp::TestRunner::getInstance().addTestCase(testCase); \
        } \
    } test_registrar_instance_##__LINE__; \
    static void test_##__LINE__()

#define REQUIRE(condition) \
    cucumber_cpp::Assertions::require(condition, #condition)

#define REQUIRE_EQ(actual, expected) \
    cucumber_cpp::Assertions::requireEqual(actual, expected)

#define REQUIRE_THROWS(expr) \
    cucumber_cpp::Assertions::requireThrows([&]() { expr; })

#define REQUIRE_NOTHROW(expr) \
    cucumber_cpp::Assertions::requireNoThrow([&]() { expr; })

// Cucumber test execution
class CucumberTestExecutor {
public:
    CucumberTestExecutor();
    
    // Set reporter
    void setReporter(std::shared_ptr<TestReporter> reporter);
    
    // Execute feature file
    int executeFeatureFile(const std::string& featureFile);
    
    // Execute directory of features
    int executeFeatureDirectory(const std::string& directory);
    
    // Execute with tags
    int executeWithTags(const std::string& featureFile, const std::vector<std::string>& tags);
    
private:
    std::shared_ptr<TestReporter> reporter_;
    CucumberToCatch2 converter_;
    TestRunner runner_;
    
    std::vector<std::string> findFeatureFiles(const std::string& directory) const;
    bool shouldRunScenario(std::shared_ptr<Scenario> scenario, const std::vector<std::string>& tags) const;
};

} // namespace cucumber_cpp

#endif // CATCH2_INTEGRATION_HPP