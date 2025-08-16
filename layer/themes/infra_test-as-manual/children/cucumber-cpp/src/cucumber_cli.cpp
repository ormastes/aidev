#include <iostream>
#include <string>
#include <vector>
#include <filesystem>
#include <chrono>
#include <thread>
#include "../include/gherkin_parser.hpp"
#include "../include/step_registry.hpp"
#include "../include/manual_generator.hpp"
#include "../include/catch2_integration.hpp"

using namespace cucumber_cpp;

// CLI commands
enum class Command {
    RUN,
    MANUAL,
    WATCH,
    HELP,
    VERSION,
    UNKNOWN
};

// CLI options
struct CliOptions {
    Command command = Command::HELP;
    std::string input;
    std::string output;
    OutputFormat format = OutputFormat::MARKDOWN;
    bool verbose = false;
    bool recursive = false;
    std::vector<std::string> tags;
    std::string reporter = "console";
    int watchInterval = 2; // seconds
};

// Parse command line arguments
CliOptions parseArgs(int argc, char** argv) {
    CliOptions options;
    
    if (argc < 2) {
        return options;
    }
    
    std::string cmd = argv[1];
    if (cmd == "run") {
        options.command = Command::RUN;
    } else if (cmd == "manual") {
        options.command = Command::MANUAL;
    } else if (cmd == "watch") {
        options.command = Command::WATCH;
    } else if (cmd == "help" || cmd == "--help" || cmd == "-h") {
        options.command = Command::HELP;
    } else if (cmd == "version" || cmd == "--version" || cmd == "-v") {
        options.command = Command::VERSION;
    } else {
        options.command = Command::UNKNOWN;
        options.input = cmd; // Assume it's a file path
    }
    
    // Parse remaining arguments
    for (int i = 2; i < argc; ++i) {
        std::string arg = argv[i];
        
        if (arg == "-i" || arg == "--input") {
            if (++i < argc) {
                options.input = argv[i];
            }
        } else if (arg == "-o" || arg == "--output") {
            if (++i < argc) {
                options.output = argv[i];
            }
        } else if (arg == "-f" || arg == "--format") {
            if (++i < argc) {
                std::string fmt = argv[i];
                if (fmt == "markdown" || fmt == "md") {
                    options.format = OutputFormat::MARKDOWN;
                } else if (fmt == "html") {
                    options.format = OutputFormat::HTML;
                } else if (fmt == "json") {
                    options.format = OutputFormat::JSON;
                }
            }
        } else if (arg == "-t" || arg == "--tag") {
            if (++i < argc) {
                options.tags.push_back(argv[i]);
            }
        } else if (arg == "-r" || arg == "--reporter") {
            if (++i < argc) {
                options.reporter = argv[i];
            }
        } else if (arg == "-v" || arg == "--verbose") {
            options.verbose = true;
        } else if (arg == "-R" || arg == "--recursive") {
            options.recursive = true;
        } else if (arg == "--watch-interval") {
            if (++i < argc) {
                options.watchInterval = std::stoi(argv[i]);
            }
        } else if (options.input.empty()) {
            options.input = arg;
        }
    }
    
    return options;
}

// Print help message
void printHelp() {
    std::cout << R"(
Cucumber-CPP CLI Tool
=====================

Usage: cucumber-cpp <command> [options]

Commands:
  run <file/dir>     Run Cucumber tests
  manual <file/dir>  Generate manual test documentation
  watch <file/dir>   Watch for changes and run tests
  help              Show this help message
  version           Show version information

Options:
  -i, --input <path>       Input file or directory
  -o, --output <path>      Output file path
  -f, --format <format>    Output format (markdown|html|json)
  -t, --tag <tag>          Run only scenarios with this tag
  -r, --reporter <type>    Test reporter (console|junit|json)
  -v, --verbose            Enable verbose output
  -R, --recursive          Process directories recursively
  --watch-interval <sec>   Watch interval in seconds (default: 2)

Examples:
  # Run all tests in a feature file
  cucumber-cpp run features/login.feature

  # Run tests with specific tag
  cucumber-cpp run features/ -t @smoke

  # Generate manual test documentation
  cucumber-cpp manual features/ -o manual_tests.md -f markdown

  # Watch for changes and run tests
  cucumber-cpp watch features/ --watch-interval 5

  # Run tests with JUnit reporter
  cucumber-cpp run features/ -r junit -o test_results.xml
)";
}

// Print version information
void printVersion() {
    std::cout << "Cucumber-CPP version 1.0.0\n";
    std::cout << "Custom Cucumber implementation for C++\n";
    std::cout << "Part of the AI Development Platform\n";
}

// Run tests command
int runTests(const CliOptions& options) {
    CucumberTestExecutor executor;
    
    // Set reporter
    if (options.reporter == "junit") {
        std::string outputFile = options.output.empty() ? "test_results.xml" : options.output;
        executor.setReporter(std::make_shared<JUnitReporter>(outputFile));
        std::cout << "Running tests with JUnit reporter...\n";
    } else {
        executor.setReporter(std::make_shared<ConsoleReporter>(options.verbose));
        std::cout << "Running tests...\n";
    }
    
    // Check if input is file or directory
    if (std::filesystem::is_regular_file(options.input)) {
        std::cout << "Executing feature file: " << options.input << "\n";
        return executor.executeFeatureFile(options.input);
    } else if (std::filesystem::is_directory(options.input)) {
        std::cout << "Executing features in directory: " << options.input << "\n";
        return executor.executeFeatureDirectory(options.input);
    } else {
        std::cerr << "Error: Input path not found: " << options.input << "\n";
        return 1;
    }
}

// Generate manual tests command
int generateManual(const CliOptions& options) {
    ManualTestGenerator generator;
    
    // Set output format
    generator.setOutputFormat(options.format);
    
    // Set output path
    if (!options.output.empty()) {
        generator.setOutputPath(options.output);
    }
    
    std::cout << "Generating manual test documentation...\n";
    
    try {
        // Process input
        if (std::filesystem::is_regular_file(options.input)) {
            std::cout << "Processing feature file: " << options.input << "\n";
            generator.generateFromFeatureFile(options.input);
        } else if (std::filesystem::is_directory(options.input)) {
            std::cout << "Processing features in directory: " << options.input << "\n";
            generator.generateFromDirectory(options.input);
        } else {
            std::cerr << "Error: Input path not found: " << options.input << "\n";
            return 1;
        }
        
        // Save output
        if (!options.output.empty()) {
            generator.saveToFile(options.output);
            std::cout << "✓ Manual tests saved to: " << options.output << "\n";
        } else {
            // Print to console if no output file specified
            std::cout << "\n" << generator.getGeneratedContent() << "\n";
        }
        
        return 0;
        
    } catch (const std::exception& e) {
        std::cerr << "Error generating manual tests: " << e.what() << "\n";
        return 1;
    }
}

// Watch command - monitor files for changes
int watchTests(const CliOptions& options) {
    std::cout << "Watching for changes (press Ctrl+C to stop)...\n";
    std::cout << "Watch interval: " << options.watchInterval << " seconds\n";
    
    std::map<std::string, std::filesystem::file_time_type> lastModified;
    
    // Get initial file timestamps
    if (std::filesystem::is_directory(options.input)) {
        for (const auto& entry : std::filesystem::recursive_directory_iterator(options.input)) {
            if (entry.is_regular_file() && entry.path().extension() == ".feature") {
                lastModified[entry.path().string()] = entry.last_write_time();
            }
        }
    } else if (std::filesystem::is_regular_file(options.input)) {
        lastModified[options.input] = std::filesystem::last_write_time(options.input);
    }
    
    // Watch loop
    while (true) {
        std::this_thread::sleep_for(std::chrono::seconds(options.watchInterval));
        
        bool changesDetected = false;
        
        // Check for changes
        for (auto& [file, lastTime] : lastModified) {
            if (std::filesystem::exists(file)) {
                auto currentTime = std::filesystem::last_write_time(file);
                if (currentTime != lastTime) {
                    std::cout << "\n✎ Change detected in: " << file << "\n";
                    lastTime = currentTime;
                    changesDetected = true;
                }
            }
        }
        
        // Check for new files
        if (std::filesystem::is_directory(options.input)) {
            for (const auto& entry : std::filesystem::recursive_directory_iterator(options.input)) {
                if (entry.is_regular_file() && entry.path().extension() == ".feature") {
                    std::string path = entry.path().string();
                    if (lastModified.find(path) == lastModified.end()) {
                        std::cout << "\n+ New file detected: " << path << "\n";
                        lastModified[path] = entry.last_write_time();
                        changesDetected = true;
                    }
                }
            }
        }
        
        // Run tests if changes detected
        if (changesDetected) {
            std::cout << "\nRunning tests...\n";
            std::cout << std::string(50, '-') << "\n";
            
            CliOptions runOptions = options;
            runOptions.command = Command::RUN;
            int result = runTests(runOptions);
            
            std::cout << std::string(50, '-') << "\n";
            if (result == 0) {
                std::cout << "✅ All tests passed\n";
            } else {
                std::cout << "❌ Some tests failed\n";
            }
            std::cout << "\nContinuing to watch for changes...\n";
        }
    }
    
    return 0;
}

int main(int argc, char** argv) {
    CliOptions options = parseArgs(argc, argv);
    
    // Validate input
    if (options.command != Command::HELP && 
        options.command != Command::VERSION && 
        options.input.empty()) {
        std::cerr << "Error: No input file or directory specified\n";
        std::cerr << "Use 'cucumber-cpp help' for usage information\n";
        return 1;
    }
    
    // Execute command
    switch (options.command) {
        case Command::RUN:
            return runTests(options);
            
        case Command::MANUAL:
            return generateManual(options);
            
        case Command::WATCH:
            return watchTests(options);
            
        case Command::VERSION:
            printVersion();
            return 0;
            
        case Command::HELP:
            printHelp();
            return 0;
            
        case Command::UNKNOWN:
            // Try to infer command from file extension
            if (!options.input.empty()) {
                if (std::filesystem::exists(options.input)) {
                    std::cout << "Running tests for: " << options.input << "\n";
                    options.command = Command::RUN;
                    return runTests(options);
                }
            }
            std::cerr << "Error: Unknown command\n";
            std::cerr << "Use 'cucumber-cpp help' for usage information\n";
            return 1;
            
        default:
            printHelp();
            return 0;
    }
}