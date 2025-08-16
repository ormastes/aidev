#include "../include/gherkin_parser.hpp"
#include "../include/manual_generator.hpp"
#include <iostream>

using namespace cucumber_cpp;

int main(int argc, char** argv) {
    // Example Gherkin feature
    std::string gherkinFeature = R"(
@smoke @regression
Feature: E-Commerce Shopping Cart
  As a customer
  I want to manage items in my shopping cart
  So that I can purchase products

  Background:
    Given I am logged in as a customer
    And I have an empty shopping cart

  @priority-high
  Scenario: Add single item to cart
    Given I am on the product page for "Laptop"
    When I click the "Add to Cart" button
    Then the item should be added to my cart
    And the cart count should show "1"
    And I should see a confirmation message

  @priority-medium
  Scenario: Remove item from cart
    Given I have the following items in my cart:
      | Product | Quantity | Price  |
      | Laptop  | 1        | $999   |
      | Mouse   | 2        | $25    |
    When I remove "Mouse" from the cart
    Then the cart should only contain "Laptop"
    And the total price should be "$999"

  @data-driven
  Scenario Outline: Apply discount codes
    Given I have items worth "<total>" in my cart
    When I apply the discount code "<code>"
    Then the discount of "<discount>" should be applied
    And the final price should be "<final>"

    Examples:
      | total | code    | discount | final |
      | $100  | SAVE10  | 10%      | $90   |
      | $200  | SAVE20  | 20%      | $160  |
      | $50   | INVALID | 0%       | $50   |
)";

    std::cout << "=== Cucumber-CPP Manual Test Generator Example ===" << std::endl;
    std::cout << std::endl;
    
    try {
        // Parse the Gherkin feature
        GherkinParser parser;
        auto feature = parser.parse(gherkinFeature);
        
        std::cout << "✓ Parsed feature: " << feature->getName() << std::endl;
        std::cout << "  Found " << feature->getScenarios().size() << " scenarios" << std::endl;
        std::cout << std::endl;
        
        // Generate manual test documentation in different formats
        ManualTestGenerator generator;
        
        // 1. Generate Markdown
        std::cout << "Generating Markdown documentation..." << std::endl;
        generator.setOutputFormat(OutputFormat::MARKDOWN);
        generator.generateFromFeature(feature);
        generator.saveToFile("manual_tests.md");
        std::cout << "✓ Saved to manual_tests.md" << std::endl;
        
        // Show a preview
        std::string markdown = generator.getGeneratedContent();
        std::cout << "\nMarkdown Preview (first 500 chars):" << std::endl;
        std::cout << "----------------------------------------" << std::endl;
        std::cout << markdown.substr(0, 500) << "..." << std::endl;
        std::cout << "----------------------------------------" << std::endl;
        
        // 2. Generate HTML
        std::cout << "\nGenerating HTML documentation..." << std::endl;
        generator.setOutputFormat(OutputFormat::HTML);
        generator.generateFromFeature(feature);
        generator.saveToFile("manual_tests.html");
        std::cout << "✓ Saved to manual_tests.html" << std::endl;
        
        // 3. Generate JSON
        std::cout << "\nGenerating JSON documentation..." << std::endl;
        generator.setOutputFormat(OutputFormat::JSON);
        generator.generateFromFeature(feature);
        generator.saveToFile("manual_tests.json");
        std::cout << "✓ Saved to manual_tests.json" << std::endl;
        
        // Show JSON preview
        std::string json = generator.getGeneratedContent();
        std::cout << "\nJSON Preview (first 400 chars):" << std::endl;
        std::cout << "----------------------------------------" << std::endl;
        std::cout << json.substr(0, 400) << "..." << std::endl;
        std::cout << "----------------------------------------" << std::endl;
        
        std::cout << "\n✅ Manual test documentation generated successfully!" << std::endl;
        std::cout << "\nYou can now:" << std::endl;
        std::cout << "  1. View manual_tests.md in any markdown viewer" << std::endl;
        std::cout << "  2. Open manual_tests.html in a web browser" << std::endl;
        std::cout << "  3. Process manual_tests.json programmatically" << std::endl;
        
    } catch (const std::exception& e) {
        std::cerr << "❌ Error: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
}