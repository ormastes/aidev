#include "../include/step_registry.hpp"
#include <iostream>
#include <cassert>

using namespace cucumber_cpp;

// Test step definitions using macros
GIVEN("I have {int} cucumbers") {
    int count = context.getInt(0);
    context.set("cucumber_count", count);
    std::cout << "  Setting cucumber count to " << count << std::endl;
}

WHEN("I eat {int} cucumbers") {
    int eaten = context.getInt(0);
    int current = context.get<int>("cucumber_count");
    context.set("cucumber_count", current - eaten);
    std::cout << "  Eating " << eaten << " cucumbers" << std::endl;
}

THEN("I should have {int} cucumbers") {
    int expected = context.getInt(0);
    int actual = context.get<int>("cucumber_count");
    assert(actual == expected);
    std::cout << "  Verified: " << actual << " cucumbers remaining" << std::endl;
}

// Test with string parameters
GIVEN("a user named {string}") {
    std::string name = context.getString(0);
    context.set("user_name", name);
    std::cout << "  User name set to: " << name << std::endl;
}

THEN("the user should be {string}") {
    std::string expected = context.getString(0);
    std::string actual = context.get<std::string>("user_name");
    assert(actual == expected);
    std::cout << "  Verified user is: " << actual << std::endl;
}

// Test with data table
GIVEN("the following users:") {
    auto table = context.getDataTable();
    if (table) {
        TableIterator iter(table);
        std::vector<std::string> users;
        
        while (iter.hasNext()) {
            auto row = iter.next();
            users.push_back(row[0]); // First column
        }
        
        context.set("users", users);
        std::cout << "  Loaded " << users.size() << " users" << std::endl;
    }
}

void test_basic_step_matching() {
    std::cout << "\n=== Testing Basic Step Matching ===" << std::endl;
    
    StepRegistry& registry = StepRegistry::getInstance();
    
    // Create a step
    Step step1(Step::Type::GIVEN, "I have 5 cucumbers", 1);
    
    // Find matching step definition
    auto stepDef = registry.findStep(step1.getType(), step1.getText());
    assert(stepDef != nullptr);
    
    // Execute the step
    registry.executeStep(step1);
    
    std::cout << "✓ Basic step matching test passed" << std::endl;
}

void test_parameter_extraction() {
    std::cout << "\n=== Testing Parameter Extraction ===" << std::endl;
    
    StepRegistry& registry = StepRegistry::getInstance();
    
    // Test integer parameter
    Step step1(Step::Type::GIVEN, "I have 10 cucumbers", 1);
    Step step2(Step::Type::WHEN, "I eat 3 cucumbers", 2);
    Step step3(Step::Type::THEN, "I should have 7 cucumbers", 3);
    
    registry.executeStep(step1);
    registry.executeStep(step2);
    registry.executeStep(step3);
    
    std::cout << "✓ Parameter extraction test passed" << std::endl;
}

void test_string_parameters() {
    std::cout << "\n=== Testing String Parameters ===" << std::endl;
    
    StepRegistry& registry = StepRegistry::getInstance();
    
    Step step1(Step::Type::GIVEN, "a user named \"Alice\"", 1);
    Step step2(Step::Type::THEN, "the user should be \"Alice\"", 2);
    
    registry.executeStep(step1);
    registry.executeStep(step2);
    
    std::cout << "✓ String parameter test passed" << std::endl;
}

void test_data_table() {
    std::cout << "\n=== Testing Data Table ===" << std::endl;
    
    StepRegistry& registry = StepRegistry::getInstance();
    
    // Create a step with data table
    Step step(Step::Type::GIVEN, "the following users:", 1);
    
    auto table = std::make_shared<DataTable>();
    table->addRow({"Name", "Age"});
    table->addRow({"Alice", "30"});
    table->addRow({"Bob", "25"});
    
    step.setDataTable(table);
    
    registry.executeStep(step);
    
    std::cout << "✓ Data table test passed" << std::endl;
}

void test_hooks() {
    std::cout << "\n=== Testing Hooks ===" << std::endl;
    
    static bool beforeHookCalled = false;
    static bool afterHookCalled = false;
    
    Hooks::Before([]() {
        beforeHookCalled = true;
        std::cout << "  Before hook executed" << std::endl;
    });
    
    Hooks::After([]() {
        afterHookCalled = true;
        std::cout << "  After hook executed" << std::endl;
    });
    
    Hooks::executeBeforeHooks();
    assert(beforeHookCalled);
    
    Hooks::executeAfterHooks();
    assert(afterHookCalled);
    
    std::cout << "✓ Hooks test passed" << std::endl;
}

void test_cucumber_expressions() {
    std::cout << "\n=== Testing Cucumber Expressions ===" << std::endl;
    
    // Test conversion of Cucumber expressions to regex
    std::string expr1 = "I have {int} items";
    std::string regex1 = CucumberExpressions::toRegex(expr1);
    assert(regex1 == "^I have (-?\\d+) items$");
    
    std::string expr2 = "User {string} is logged in";
    std::string regex2 = CucumberExpressions::toRegex(expr2);
    assert(regex2 == "^User \"([^\"]*)\" is logged in$");
    
    std::cout << "✓ Cucumber expressions test passed" << std::endl;
}

int main() {
    std::cout << "Running Step Registry Tests..." << std::endl;
    
    try {
        test_cucumber_expressions();
        test_basic_step_matching();
        test_parameter_extraction();
        test_string_parameters();
        test_data_table();
        test_hooks();
        
        std::cout << "\n✅ All Step Registry tests passed!" << std::endl;
        return 0;
    } catch (const std::exception& e) {
        std::cerr << "\n❌ Test failed: " << e.what() << std::endl;
        return 1;
    }
}