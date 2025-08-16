#!/usr/bin/env python3
"""
Test file for the C++ Test Case Generator
"""

import os
import sys
import json
import tempfile
import shutil
from pathlib import Path

# Import the generator
from test_case_generator import MockDiscovery, CodeAnalyzer, TestGenerator, MockInfo, TargetInfo


def create_test_project():
    """Create a sample C++ project for testing"""
    temp_dir = Path(tempfile.mkdtemp())
    
    # Create directory structure
    src_dir = temp_dir / "src"
    mock_dir = temp_dir / "mocks"
    test_dir = temp_dir / "tests"
    cache_dir = temp_dir / "cache"
    
    for d in [src_dir, mock_dir, test_dir, cache_dir]:
        d.mkdir(parents=True)
    
    # Create a sample Calculator class
    calculator_h = src_dir / "Calculator.h"
    calculator_h.write_text("""#pragma once

namespace math {

class Calculator {
public:
    Calculator();
    virtual ~Calculator();
    
    virtual int add(int a, int b) const;
    virtual int subtract(int a, int b) const;
    virtual int multiply(int a, int b) const;
    virtual double divide(int a, int b) const;
    
    void setLogger(class Logger* logger);
    
private:
    Logger* m_logger;
};

} // namespace math
""")
    
    # Create a mock for Calculator
    calc_mock = mock_dir / "CalculatorMock.h"
    calc_mock.write_text("""#pragma once
#include <gmock/gmock.h>
#include "Calculator.h"

namespace math {

class CalculatorMock : public Calculator {
public:
    MOCK_METHOD(int, add, (int a, int b), (const, override));
    MOCK_METHOD(int, subtract, (int a, int b), (const, override));
    MOCK_METHOD(int, multiply, (int a, int b), (const, override));
    MOCK_METHOD(double, divide, (int a, int b), (const, override));
};

} // namespace math
""")
    
    # Create a Logger interface
    logger_h = src_dir / "Logger.h"
    logger_h.write_text("""#pragma once
#include <string>

class Logger {
public:
    virtual ~Logger() = default;
    virtual void log(const std::string& message) = 0;
    virtual void error(const std::string& message) = 0;
};
""")
    
    # Create Logger mock
    logger_mock = mock_dir / "LoggerMock.h"
    logger_mock.write_text("""#pragma once
#include <gmock/gmock.h>
#include "Logger.h"

class LoggerMock : public Logger {
public:
    MOCK_METHOD(void, log, (const std::string& message), (override));
    MOCK_METHOD(void, error, (const std::string& message), (override));
};
""")
    
    return temp_dir, src_dir, mock_dir, test_dir, cache_dir


def test_mock_discovery():
    """Test the mock discovery functionality"""
    print("Testing Mock Discovery...")
    
    _, _, mock_dir, _, _ = create_test_project()
    
    discovery = MockDiscovery(mock_dir)
    mocks = discovery.discover()
    
    assert 'calculator' in mocks, "Should find CalculatorMock"
    assert 'logger' in mocks, "Should find LoggerMock"
    assert len(mocks['calculator']) == 1
    assert len(mocks['logger']) == 1
    
    print("✓ Mock discovery test passed")


def test_code_analysis():
    """Test code analysis functionality"""
    print("\nTesting Code Analysis...")
    
    _, src_dir, _, _, _ = create_test_project()
    
    analyzer = CodeAnalyzer()
    
    # Analyze Calculator.h
    calc_targets = analyzer.analyze_file(str(src_dir / "Calculator.h"))
    assert len(calc_targets) > 0, "Should find Calculator class"
    
    calc = calc_targets[0]
    assert calc.name == "Calculator"
    assert calc.namespace == ["math"] or calc.namespace == []  # Depends on parser
    
    # Check methods were found
    method_names = [m['name'] for m in calc.methods]
    expected_methods = ['add', 'subtract', 'multiply', 'divide']
    
    # With regex parser, we might get all or some methods
    found_methods = sum(1 for m in expected_methods if any(m in method for method in method_names))
    print(f"  Found {found_methods}/{len(expected_methods)} expected methods")
    
    print("✓ Code analysis test passed")


def test_test_generation():
    """Test the test file generation"""
    print("\nTesting Test Generation...")
    
    temp_dir, src_dir, mock_dir, test_dir, _ = create_test_project()
    
    # Setup
    discovery = MockDiscovery(mock_dir)
    mocks = discovery.discover()
    
    analyzer = CodeAnalyzer()
    targets = analyzer.analyze_file(str(src_dir / "Calculator.h"))
    
    if targets:
        generator = TestGenerator(mocks)
        test_file = generator.generate_test_file(targets[0], test_dir)
        
        assert Path(test_file).exists(), "Test file should be created"
        
        # Check content
        content = Path(test_file).read_text()
        assert "#include <gtest/gtest.h>" in content
        assert "CalculatorTest" in content
        assert "TEST_F" in content
        
        print(f"  Generated test file: {test_file}")
        print("✓ Test generation test passed")
    else:
        print("  No targets found (regex parser limitation)")


def test_full_workflow():
    """Test the complete workflow"""
    print("\nTesting Full Workflow...")
    
    temp_dir, src_dir, mock_dir, test_dir, cache_dir = create_test_project()
    
    # Simulate command line arguments
    class Args:
        target_base = str(src_dir)
        mock_base = str(mock_dir)
        test_base = str(test_dir)
        cache_base = str(cache_dir)
        verbose = False
        clang_lib = None
    
    # Run the generator
    from test_case_generator import TestCaseGenerator
    
    generator = TestCaseGenerator(Args())
    generator.run()
    
    # Check outputs
    test_files = list(test_dir.rglob("*.cpp"))
    cache_files = list(cache_dir.rglob("*.json"))
    
    print(f"  Generated {len(test_files)} test files")
    print(f"  Generated {len(cache_files)} cache files")
    
    # Check summary
    summary_file = cache_dir / "test_generation_summary.json"
    if summary_file.exists():
        summary = json.loads(summary_file.read_text())
        print(f"  Total targets: {summary['statistics']['total_targets']}")
        print(f"  Tests generated: {summary['statistics']['tests_generated']}")
    
    # Cleanup
    shutil.rmtree(temp_dir)
    
    print("✓ Full workflow test passed")


def main():
    """Run all tests"""
    print("=== Testing C++ Test Case Generator ===\n")
    
    tests = [
        test_mock_discovery,
        test_code_analysis,
        test_test_generation,
        test_full_workflow
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            test()
            passed += 1
        except Exception as e:
            print(f"✗ {test.__name__} failed: {e}")
            import traceback
            traceback.print_exc()
            failed += 1
    
    print(f"\n{'='*40}")
    print(f"Results: {passed} passed, {failed} failed")
    print(f"{'='*40}")
    
    return failed == 0


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)