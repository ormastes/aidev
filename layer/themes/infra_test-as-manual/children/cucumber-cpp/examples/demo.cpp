#include <iostream>
#include <fstream>
#include "cucumber_cpp/gherkin/lexer.hpp"
#include "cucumber_cpp/gherkin/parser.hpp"
#include "cucumber_cpp/gherkin/ast.hpp"
#include "cucumber_cpp/generator/manual_generator.hpp"

using namespace cucumber_cpp;

int main(int argc, char* argv[]) {
    if (argc < 2) {
        std::cout << "Usage: " << argv[0] << " <feature_file> [output_format]\n";
        std::cout << "Output formats: markdown (default), html, json\n";
        return 1;
    }
    
    std::string featureFile = argv[1];
    std::string formatStr = argc > 2 ? argv[2] : "markdown";
    
    // Determine output format
    generator::OutputFormat format = generator::OutputFormat::MARKDOWN;
    if (formatStr == "html") {
        format = generator::OutputFormat::HTML;
    } else if (formatStr == "json") {
        format = generator::OutputFormat::JSON;
    }
    
    try {
        // Read feature file
        std::ifstream file(featureFile);
        if (!file.is_open()) {
            std::cerr << "Error: Cannot open file " << featureFile << std::endl;
            return 1;
        }
        
        std::string content((std::istreambuf_iterator<char>(file)),
                           std::istreambuf_iterator<char>());
        
        std::cout << "=== Parsing Feature File ===" << std::endl;
        
        // Parse with lexer
        gherkin::Lexer lexer(content);
        auto tokens = lexer.tokenize();
        
        std::cout << "Lexer found " << tokens.size() << " tokens" << std::endl;
        
        // Parse to AST
        gherkin::Parser parser(tokens);
        auto feature = parser.parse();
        
        if (!feature) {
            std::cerr << "Error: Failed to parse feature file" << std::endl;
            if (parser.hasError()) {
                for (const auto& error : parser.errors()) {
                    std::cerr << error.what() << std::endl;
                }
            }
            return 1;
        }
        
        std::cout << "Successfully parsed feature: " << feature->name() << std::endl;
        std::cout << "Found " << feature->scenarios().size() << " scenarios" << std::endl;
        std::cout << "Found " << feature->scenarioOutlines().size() << " scenario outlines" << std::endl;
        
        // Print AST
        std::cout << "\n=== Abstract Syntax Tree ===" << std::endl;
        gherkin::ASTPrinter printer(std::cout);
        feature->accept(printer);
        
        // Generate manual test documentation
        std::cout << "\n=== Generating Manual Test Documentation ===" << std::endl;
        
        generator::ManualTestGenerator generator;
        generator.setAuthor("Cucumber-CPP Demo");
        generator.setVersion("1.0.0");
        generator.includeScreenshots(true);
        generator.includeNotes(true);
        
        std::string manualDoc = generator.generate(*feature, format);
        
        // Save to file
        std::string outputFile = featureFile + ".manual";
        if (format == generator::OutputFormat::MARKDOWN) {
            outputFile += ".md";
        } else if (format == generator::OutputFormat::HTML) {
            outputFile += ".html";
        } else if (format == generator::OutputFormat::JSON) {
            outputFile += ".json";
        }
        
        std::ofstream outFile(outputFile);
        outFile << manualDoc;
        outFile.close();
        
        std::cout << "Manual test documentation saved to: " << outputFile << std::endl;
        
        // Also print to console
        std::cout << "\n=== Manual Test Documentation Preview ===" << std::endl;
        std::cout << manualDoc.substr(0, 1000) << "..." << std::endl;
        
        return 0;
        
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
}