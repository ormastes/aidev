// simple_demo.cpp - Simple demonstration of Cucumber-CPP framework
#include "../include/gherkin_parser.hpp"
#include "../include/manual_generator.hpp"
#include <iostream>
#include <memory>

using namespace cucumber_cpp;

int main() {
    std::cout << "===========================================\n";
    std::cout << "   Cucumber-CPP Framework Demonstration   \n";
    std::cout << "===========================================\n\n";
    
    // 1. Parse a feature file
    std::cout << "1. PARSING GHERKIN FEATURE FILE\n";
    std::cout << "--------------------------------\n";
    
    try {
        GherkinParser parser;
        auto feature = parser.parseFile("../features/calculator.feature");
        
        std::cout << "✓ Successfully parsed: " << feature->getName() << "\n";
        std::cout << "  Description: " << feature->getDescription() << "\n";
        std::cout << "  Scenarios: " << feature->getScenarios().size() << "\n";
        std::cout << "  Tags: ";
        for (const auto& tag : feature->getTags()) {
            std::cout << tag << " ";
        }
        std::cout << "\n\n";
        
        // 2. Display scenario details
        std::cout << "2. SCENARIO DETAILS\n";
        std::cout << "-------------------\n";
        
        for (const auto& scenario : feature->getScenarios()) {
            std::cout << "Scenario: " << scenario->getName() << "\n";
            std::cout << "  Tags: ";
            for (const auto& tag : scenario->getTags()) {
                std::cout << tag << " ";
            }
            std::cout << "\n  Steps: " << scenario->getSteps().size() << "\n";
            
            // Show first few steps
            int stepCount = 0;
            for (const auto& step : scenario->getSteps()) {
                if (++stepCount > 3) {
                    std::cout << "    ...\n";
                    break;
                }
                std::string stepType;
                switch (step->getType()) {
                    case Step::Type::GIVEN: stepType = "Given"; break;
                    case Step::Type::WHEN:  stepType = "When"; break;
                    case Step::Type::THEN:  stepType = "Then"; break;
                    case Step::Type::AND:   stepType = "And"; break;
                    case Step::Type::BUT:   stepType = "But"; break;
                }
                std::cout << "    " << stepType << " " << step->getText() << "\n";
            }
            std::cout << "\n";
        }
        
        // 3. Generate manual test documentation
        std::cout << "3. GENERATING MANUAL TEST DOCUMENTATION\n";
        std::cout << "---------------------------------------\n";
        
        ManualTestGenerator generator;
        
        // Generate Markdown
        generator.setOutputFormat(OutputFormat::MARKDOWN);
        generator.generateFromFeature(feature);
        generator.saveToFile("demo_manual_tests.md");
        std::cout << "✓ Generated: demo_manual_tests.md\n";
        
        // Generate HTML
        generator.setOutputFormat(OutputFormat::HTML);
        generator.generateFromFeature(feature);
        generator.saveToFile("demo_manual_tests.html");
        std::cout << "✓ Generated: demo_manual_tests.html\n";
        
        // Generate JSON
        generator.setOutputFormat(OutputFormat::JSON);
        generator.generateFromFeature(feature);
        generator.saveToFile("demo_manual_tests.json");
        std::cout << "✓ Generated: demo_manual_tests.json\n";
        
        std::cout << "\n";
        
        // 4. Parse and display data tables
        std::cout << "4. DATA TABLE SUPPORT\n";
        std::cout << "--------------------\n";
        
        // Find a scenario with data table
        for (const auto& scenario : feature->getScenarios()) {
            if (scenario->getName().find("various calculations") != std::string::npos) {
                std::cout << "Found Scenario Outline: " << scenario->getName() << "\n";
                if (scenario->getExamples()) {
                    std::cout << "  Examples table:\n";
                    auto examples = scenario->getExamples();
                    
                    // Print header
                    std::cout << "    ";
                    for (const auto& cell : examples->getHeader()) {
                        std::cout << "| " << cell << " ";
                    }
                    std::cout << "|\n";
                    
                    // Print rows
                    int rowCount = 0;
                    for (const auto& row : examples->getRows()) {
                        std::cout << "    ";
                        for (const auto& cell : row) {
                            std::cout << "| " << cell << " ";
                        }
                        std::cout << "|\n";
                        if (++rowCount > 3) {
                            std::cout << "    ...\n";
                            break;
                        }
                    }
                }
                break;
            }
        }
        
        std::cout << "\n";
        
        // 5. Feature statistics
        std::cout << "5. FEATURE STATISTICS\n";
        std::cout << "--------------------\n";
        
        int totalSteps = 0;
        int givenSteps = 0;
        int whenSteps = 0;
        int thenSteps = 0;
        
        for (const auto& scenario : feature->getScenarios()) {
            for (const auto& step : scenario->getSteps()) {
                totalSteps++;
                switch (step->getType()) {
                    case Step::Type::GIVEN: givenSteps++; break;
                    case Step::Type::WHEN:  whenSteps++; break;
                    case Step::Type::THEN:  thenSteps++; break;
                    default: break;
                }
            }
        }
        
        std::cout << "  Total steps: " << totalSteps << "\n";
        std::cout << "  Given steps: " << givenSteps << "\n";
        std::cout << "  When steps: " << whenSteps << "\n";
        std::cout << "  Then steps: " << thenSteps << "\n";
        
        std::cout << "\n";
        std::cout << "===========================================\n";
        std::cout << "✓ CUCUMBER-CPP FRAMEWORK DEMO SUCCESSFUL!\n";
        std::cout << "===========================================\n";
        
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << "\n";
        return 1;
    }
    
    return 0;
}