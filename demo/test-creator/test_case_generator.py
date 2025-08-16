#!/usr/bin/env python3
"""
C++ Test Case Generator with Mock Discovery

A single-file Python CLI tool that:
1. Discovers C++ mock files
2. Analyzes source code using Clang C-Index
3. Generates test cases with proper mock integration
4. Creates LLM-ready context for test generation
"""

import os
import sys
import json
import argparse
import logging
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional
from dataclasses import dataclass, field, asdict
from collections import defaultdict
import subprocess
import tempfile

# Check for libclang availability
try:
    from clang.cindex import Index, CursorKind, Config
    CLANG_AVAILABLE = True
except ImportError:
    CLANG_AVAILABLE = False
    print("Warning: libclang not available. Install with: uv pip install libclang")
    print("Continuing with limited functionality...")


# ============================================================================
# Data Classes
# ============================================================================

@dataclass
class MockInfo:
    """Information about a discovered mock"""
    mock_name: str
    file_path: str
    lowercase_name: str
    include_path: str


@dataclass
class TargetInfo:
    """Information about a target class/function"""
    name: str
    full_path: str
    file_path: str
    header_path: str
    namespace: List[str] = field(default_factory=list)
    enclosing_class: Optional[str] = None
    parameter_types: List[str] = field(default_factory=list)
    return_type: Optional[str] = None
    dependencies: Set[str] = field(default_factory=set)
    methods: List[Dict] = field(default_factory=list)


@dataclass
class TestCase:
    """Represents a generated test case"""
    name: str
    description: str
    test_code: str
    required_mocks: List[str]
    assertions: List[str]


# ============================================================================
# Mock Discovery
# ============================================================================

class MockDiscovery:
    """Discovers and manages mock files"""
    
    def __init__(self, mock_base_folder: Path):
        self.mock_base_folder = mock_base_folder
        self.mock_mapping: Dict[str, List[MockInfo]] = defaultdict(list)
    
    def discover(self) -> Dict[str, List[MockInfo]]:
        """Recursively discover all mock files"""
        for root, dirs, files in os.walk(self.mock_base_folder):
            for file in files:
                if file.endswith('Mock.h') or file.endswith('Mock.hpp'):
                    file_path = os.path.join(root, file)
                    mock_info = self._extract_mock_info(file_path)
                    if mock_info:
                        self.mock_mapping[mock_info.lowercase_name].append(mock_info)
        return self.mock_mapping
    
    def _extract_mock_info(self, file_path: str) -> Optional[MockInfo]:
        """Extract mock information from a file"""
        file_name = os.path.basename(file_path)
        if file_name.endswith('Mock.h'):
            mock_name = file_name[:-6]
        elif file_name.endswith('Mock.hpp'):
            mock_name = file_name[:-8]
        else:
            return None
        
        rel_path = os.path.relpath(file_path, self.mock_base_folder)
        return MockInfo(
            mock_name=mock_name,
            file_path=file_path,
            lowercase_name=mock_name.lower(),
            include_path=rel_path.replace('\\', '/')
        )


# ============================================================================
# Clang Analysis
# ============================================================================

class CodeAnalyzer:
    """Analyzes C++ code to extract class and method information"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def analyze_file(self, file_path: str) -> List[TargetInfo]:
        """Analyze a C++ file and extract target information"""
        if CLANG_AVAILABLE:
            return self._analyze_with_clang(file_path)
        else:
            return self._analyze_with_regex(file_path)
    
    def _analyze_with_clang(self, file_path: str) -> List[TargetInfo]:
        """Use Clang to analyze the file"""
        try:
            index = Index.create()
            tu = index.parse(file_path, args=['-std=c++17'])
            
            targets = []
            self._traverse_ast(tu.cursor, file_path, targets)
            return targets
        except Exception as e:
            self.logger.error(f"Clang analysis failed: {e}")
            return self._analyze_with_regex(file_path)
    
    def _traverse_ast(self, cursor, file_path: str, targets: List[TargetInfo],
                      namespace: List[str] = None, class_name: str = None):
        """Traverse AST and extract information"""
        if namespace is None:
            namespace = []
        
        if cursor.location.file and cursor.location.file.name != file_path:
            return
        
        if cursor.kind == CursorKind.NAMESPACE:
            namespace.append(cursor.spelling)
            for child in cursor.get_children():
                self._traverse_ast(child, file_path, targets, namespace, class_name)
            namespace.pop()
        
        elif cursor.kind in [CursorKind.CLASS_DECL, CursorKind.STRUCT_DECL]:
            if cursor.spelling:
                target = TargetInfo(
                    name=cursor.spelling,
                    full_path='::'.join(namespace + [cursor.spelling]),
                    file_path=file_path,
                    header_path=file_path,
                    namespace=namespace.copy()
                )
                
                # Extract methods
                for child in cursor.get_children():
                    if child.kind == CursorKind.CXX_METHOD:
                        method_info = {
                            'name': child.spelling,
                            'return_type': child.result_type.spelling if child.result_type else 'void',
                            'parameters': [p.type.spelling for p in child.get_arguments()],
                            'is_virtual': child.is_virtual_method(),
                            'is_const': child.is_const_method()
                        }
                        target.methods.append(method_info)
                
                targets.append(target)
    
    def _analyze_with_regex(self, file_path: str) -> List[TargetInfo]:
        """Fallback regex-based analysis"""
        import re
        
        targets = []
        try:
            with open(file_path, 'r') as f:
                content = f.read()
            
            # Find classes
            class_pattern = r'class\s+(\w+)\s*(?::\s*public\s+\w+)?\s*\{'
            namespace_pattern = r'namespace\s+(\w+)\s*\{'
            method_pattern = r'(?:virtual\s+)?(\w+(?:\s*<[^>]+>)?)\s+(\w+)\s*\(([^)]*)\)(?:\s*const)?'
            
            # Simple namespace detection
            namespaces = re.findall(namespace_pattern, content)
            
            for match in re.finditer(class_pattern, content):
                class_name = match.group(1)
                target = TargetInfo(
                    name=class_name,
                    full_path='::'.join(namespaces + [class_name]) if namespaces else class_name,
                    file_path=file_path,
                    header_path=file_path,
                    namespace=namespaces
                )
                
                # Find methods within the class
                class_start = match.end()
                brace_count = 1
                pos = class_start
                
                # Find the matching closing brace
                while pos < len(content) and brace_count > 0:
                    if content[pos] == '{':
                        brace_count += 1
                    elif content[pos] == '}':
                        brace_count -= 1
                    pos += 1
                
                class_content = content[class_start:pos-1]
                
                # Extract methods
                for method_match in re.finditer(method_pattern, class_content):
                    return_type = method_match.group(1).strip()
                    method_name = method_match.group(2).strip()
                    params = method_match.group(3).strip()
                    
                    if method_name and not method_name.startswith('~'):  # Skip destructors
                        method_info = {
                            'name': method_name,
                            'return_type': return_type,
                            'parameters': [p.strip() for p in params.split(',')] if params else [],
                            'is_virtual': 'virtual' in method_match.group(0),
                            'is_const': 'const' in method_match.group(0)
                        }
                        target.methods.append(method_info)
                
                targets.append(target)
        
        except Exception as e:
            self.logger.error(f"Regex analysis failed: {e}")
        
        return targets


# ============================================================================
# Test Generation
# ============================================================================

class TestGenerator:
    """Generates test cases for C++ classes"""
    
    def __init__(self, mock_mapping: Dict[str, List[MockInfo]]):
        self.mock_mapping = mock_mapping
        self.logger = logging.getLogger(__name__)
    
    def generate_test_file(self, target: TargetInfo, output_dir: Path) -> str:
        """Generate a complete test file for a target"""
        test_cases = self._generate_test_cases(target)
        test_content = self._create_test_file_content(target, test_cases)
        
        # Create output file path
        rel_path = Path(target.file_path).relative_to(Path(target.file_path).anchor)
        test_file = output_dir / rel_path.with_name(f"{target.name}Test.cpp")
        test_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Write test file
        test_file.write_text(test_content)
        self.logger.info(f"Generated test file: {test_file}")
        
        return str(test_file)
    
    def _generate_test_cases(self, target: TargetInfo) -> List[TestCase]:
        """Generate test cases for all methods in the target"""
        test_cases = []
        
        for method in target.methods:
            # Generate basic test case
            test_case = self._generate_method_test(target, method)
            test_cases.append(test_case)
            
            # Generate edge case tests
            if method['parameters']:
                edge_case = self._generate_edge_case_test(target, method)
                test_cases.append(edge_case)
        
        return test_cases
    
    def _generate_method_test(self, target: TargetInfo, method: Dict) -> TestCase:
        """Generate a basic test case for a method"""
        test_name = f"Test_{target.name}_{method['name']}_BasicFunctionality"
        
        # Find available mocks
        required_mocks = []
        for dep in target.dependencies:
            if dep.lower() in self.mock_mapping:
                required_mocks.append(self.mock_mapping[dep.lower()][0].mock_name)
        
        # Generate test code
        test_code = self._generate_test_code(target, method, required_mocks)
        
        # Generate assertions
        assertions = self._generate_assertions(method)
        
        return TestCase(
            name=test_name,
            description=f"Test basic functionality of {method['name']}",
            test_code=test_code,
            required_mocks=required_mocks,
            assertions=assertions
        )
    
    def _generate_edge_case_test(self, target: TargetInfo, method: Dict) -> TestCase:
        """Generate edge case test for a method"""
        test_name = f"Test_{target.name}_{method['name']}_EdgeCases"
        
        test_code = f"""
    // Test edge cases
    {target.name} obj;
    
    // Test with extreme values
    """
        
        # Add parameter-specific edge cases
        for param in method['parameters']:
            if 'int' in param:
                test_code += f"""
    // Test with zero
    EXPECT_NO_THROW(obj.{method['name']}(0));
    
    // Test with negative
    EXPECT_NO_THROW(obj.{method['name']}(-1));
    """
            elif 'string' in param:
                test_code += f"""
    // Test with empty string
    EXPECT_NO_THROW(obj.{method['name']}(""));
    
    // Test with special characters
    EXPECT_NO_THROW(obj.{method['name']}("!@#$%"));
    """
        
        # Add verifier comment at the end
        test_code += """
    
    // Verifier: None yet
    """
        
        return TestCase(
            name=test_name,
            description=f"Test edge cases for {method['name']}",
            test_code=test_code,
            required_mocks=[],
            assertions=["EXPECT_NO_THROW"]
        )
    
    def _generate_test_code(self, target: TargetInfo, method: Dict, mocks: List[str]) -> str:
        """Generate the actual test code"""
        code = f"""
    // Arrange
    {target.name} obj;"""
        
        # Add mock setup
        for mock in mocks:
            code += f"""
    {mock}Mock mock{mock};
    obj.set{mock}(&mock{mock});"""
        
        # Add method call
        params = self._generate_test_params(method['parameters'])
        code += f"""
    
    // Act
    auto result = obj.{method['name']}({params});
    
    // Assert
    // Add specific assertions based on expected behavior
    
    // Verifier: None yet
    """
        
        return code
    
    def _generate_test_params(self, parameters: List[str]) -> str:
        """Generate test parameters based on types"""
        params = []
        for param in parameters:
            if 'int' in param:
                params.append('42')
            elif 'string' in param:
                params.append('"test_string"')
            elif 'bool' in param:
                params.append('true')
            elif 'double' in param or 'float' in param:
                params.append('3.14')
            else:
                params.append(f'/* {param} */')
        return ', '.join(params)
    
    def _generate_assertions(self, method: Dict) -> List[str]:
        """Generate appropriate assertions based on method signature"""
        assertions = []
        
        if method['return_type'] == 'void':
            assertions.append("// Method returns void - test for no exceptions")
            assertions.append("EXPECT_NO_THROW")
        elif 'bool' in method['return_type']:
            assertions.append("EXPECT_TRUE(result) or EXPECT_FALSE(result)")
        elif 'int' in method['return_type']:
            assertions.append("EXPECT_EQ(result, expected_value)")
        else:
            assertions.append(f"// Add assertion for {method['return_type']} return type")
        
        return assertions
    
    def _create_test_file_content(self, target: TargetInfo, test_cases: List[TestCase]) -> str:
        """Create the complete test file content"""
        # Find required mock includes
        mock_includes = set()
        for tc in test_cases:
            for mock in tc.required_mocks:
                if mock.lower() in self.mock_mapping:
                    mock_includes.add(self.mock_mapping[mock.lower()][0].include_path)
        
        content = f"""// Generated test file for {target.name}
#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include "{os.path.basename(target.header_path)}"
"""
        
        # Add mock includes
        for mock_include in sorted(mock_includes):
            content += f'#include "{mock_include}"\n'
        
        content += f"""
using namespace testing;
using namespace {target.namespace[0] if target.namespace else 'std'};

class {target.name}Test : public ::testing::Test {{
protected:
    void SetUp() override {{
        // Test setup code
    }}
    
    void TearDown() override {{
        // Test cleanup code
    }}
}};
"""
        
        # Add test cases
        for test_case in test_cases:
            content += f"""
TEST_F({target.name}Test, {test_case.name}) {{
    // {test_case.description}
    {test_case.test_code}
}}
"""
        
        return content


# ============================================================================
# Cache Management
# ============================================================================

class CacheManager:
    """Manages cache files for test generation context"""
    
    def __init__(self, cache_dir: Path):
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)
    
    def save_test_context(self, target: TargetInfo, mocks: List[MockInfo], 
                         test_file: str) -> str:
        """Save test generation context to cache"""
        cache_data = {
            'target': {
                'name': target.name,
                'full_path': target.full_path,
                'file_path': target.file_path,
                'methods': target.methods,
                'dependencies': list(target.dependencies)
            },
            'mocks': [
                {
                    'name': mock.mock_name,
                    'include': f'#include "{mock.include_path}"',
                    'file_path': mock.file_path
                }
                for mock in mocks
            ],
            'test_file': test_file,
            'llm_context': {
                'prompt': self._generate_llm_prompt(target, mocks),
                'example_usage': self._generate_example_usage(target)
            }
        }
        
        cache_file = self.cache_dir / f"{target.name}_test_context.json"
        cache_file.write_text(json.dumps(cache_data, indent=2))
        
        return str(cache_file)
    
    def _generate_llm_prompt(self, target: TargetInfo, mocks: List[MockInfo]) -> str:
        """Generate a prompt for LLM-based test generation"""
        mock_list = ', '.join([m.mock_name for m in mocks])
        
        return f"""Generate comprehensive unit tests for the C++ class '{target.name}'.

Class details:
- Full path: {target.full_path}
- Methods: {len(target.methods)}
- Available mocks: {mock_list}

Requirements:
1. Use Google Test (gtest) and Google Mock (gmock)
2. Test all public methods
3. Include edge cases and error conditions
4. Use mocks for dependencies
5. Follow AAA pattern (Arrange, Act, Assert)
"""
    
    def _generate_example_usage(self, target: TargetInfo) -> str:
        """Generate example usage code"""
        return f"""
// Example usage of {target.name}
{target.name} instance;

// Method calls:
"""


# ============================================================================
# Main CLI Application
# ============================================================================

class TestCaseGenerator:
    """Main application orchestrating the test generation process"""
    
    def __init__(self, args):
        self.args = args
        self.logger = logging.getLogger(__name__)
        
        # Initialize components
        self.mock_discovery = MockDiscovery(Path(args.mock_base))
        self.analyzer = CodeAnalyzer()
        self.cache_manager = CacheManager(Path(args.cache_base))
    
    def run(self):
        """Run the complete test generation process"""
        self.logger.info("Starting C++ Test Case Generator")
        
        # Step 1: Discover mocks
        self.logger.info("Discovering mock files...")
        mock_mapping = self.mock_discovery.discover()
        self.logger.info(f"Found {len(mock_mapping)} unique mock types")
        
        # Step 2: Analyze source files
        self.logger.info("Analyzing source files...")
        all_targets = self._analyze_sources()
        self.logger.info(f"Found {len(all_targets)} target classes")
        
        # Step 3: Generate tests
        self.logger.info("Generating test cases...")
        generator = TestGenerator(mock_mapping)
        
        generated_count = 0
        for target in all_targets:
            try:
                # Find matching mocks
                matching_mocks = self._find_matching_mocks(target, mock_mapping)
                
                # Generate test file
                test_file = generator.generate_test_file(target, Path(self.args.test_base))
                
                # Save context for LLM
                cache_file = self.cache_manager.save_test_context(target, matching_mocks, test_file)
                
                generated_count += 1
                self.logger.info(f"Generated tests for {target.name}")
                
            except Exception as e:
                self.logger.error(f"Failed to generate tests for {target.name}: {e}")
        
        # Step 4: Generate summary
        self._generate_summary(all_targets, mock_mapping, generated_count)
        
        self.logger.info(f"Test generation complete! Generated {generated_count} test files.")
    
    def _analyze_sources(self) -> List[TargetInfo]:
        """Analyze all source files in the target directory"""
        targets = []
        
        for root, dirs, files in os.walk(self.args.target_base):
            for file in files:
                if file.endswith('.h') or file.endswith('.hpp'):
                    file_path = os.path.join(root, file)
                    file_targets = self.analyzer.analyze_file(file_path)
                    targets.extend(file_targets)
        
        return targets
    
    def _find_matching_mocks(self, target: TargetInfo, 
                            mock_mapping: Dict[str, List[MockInfo]]) -> List[MockInfo]:
        """Find mocks that match the target or its dependencies"""
        matching_mocks = []
        
        # Check for direct match
        target_lower = target.name.lower()
        if target_lower in mock_mapping:
            matching_mocks.extend(mock_mapping[target_lower])
        
        # Check dependencies
        for dep in target.dependencies:
            dep_lower = dep.lower()
            if dep_lower in mock_mapping:
                matching_mocks.extend(mock_mapping[dep_lower])
        
        return matching_mocks
    
    def _generate_summary(self, targets: List[TargetInfo], 
                         mock_mapping: Dict[str, List[MockInfo]], 
                         generated_count: int):
        """Generate a summary report"""
        summary = {
            'statistics': {
                'total_targets': len(targets),
                'total_mocks': sum(len(v) for v in mock_mapping.values()),
                'tests_generated': generated_count,
                'success_rate': f"{(generated_count/len(targets)*100):.1f}%" if targets else "0%"
            },
            'targets': [
                {
                    'name': t.name,
                    'methods': len(t.methods),
                    'file': t.file_path
                }
                for t in targets
            ],
            'configuration': {
                'target_base': self.args.target_base,
                'mock_base': self.args.mock_base,
                'test_base': self.args.test_base,
                'cache_base': self.args.cache_base
            }
        }
        
        summary_file = Path(self.args.cache_base) / 'test_generation_summary.json'
        summary_file.write_text(json.dumps(summary, indent=2))
        
        # Print summary to console
        print("\n" + "="*60)
        print("TEST GENERATION SUMMARY")
        print("="*60)
        print(f"Total target classes found: {summary['statistics']['total_targets']}")
        print(f"Total mock files found: {summary['statistics']['total_mocks']}")
        print(f"Test files generated: {summary['statistics']['tests_generated']}")
        print(f"Success rate: {summary['statistics']['success_rate']}")
        print(f"\nSummary saved to: {summary_file}")


def setup_logging(verbose: bool):
    """Setup logging configuration"""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='C++ Test Case Generator - Automatically generate test cases with mock discovery',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --target-base ./src --mock-base ./mocks --test-base ./tests --cache-base ./cache
  %(prog)s -t ./src -m ./mocks -o ./tests -c ./cache --verbose
  
The tool will:
  1. Discover all mock files in the mock directory
  2. Analyze C++ source files to find classes and methods
  3. Generate comprehensive test files with proper mock integration
  4. Create cache files with context for LLM-based test enhancement
        """
    )
    
    parser.add_argument('-t', '--target-base', required=True,
                       help='Base directory containing C++ source files to test')
    parser.add_argument('-m', '--mock-base', required=True,
                       help='Base directory containing mock implementations')
    parser.add_argument('-o', '--test-base', required=True,
                       help='Output directory for generated test files')
    parser.add_argument('-c', '--cache-base', required=True,
                       help='Directory for cache and context files')
    parser.add_argument('-v', '--verbose', action='store_true',
                       help='Enable verbose logging')
    parser.add_argument('--clang-lib', help='Path to libclang library (if not in system path)')
    
    args = parser.parse_args()
    
    # Setup logging
    setup_logging(args.verbose)
    
    # Configure libclang if provided
    if CLANG_AVAILABLE and args.clang_lib:
        Config.set_library_path(args.clang_lib)
    
    # Validate directories
    for path_name, path_value in [
        ('target-base', args.target_base),
        ('mock-base', args.mock_base)
    ]:
        if not os.path.exists(path_value):
            print(f"Error: {path_name} directory does not exist: {path_value}")
            sys.exit(1)
    
    # Create output directories
    os.makedirs(args.test_base, exist_ok=True)
    os.makedirs(args.cache_base, exist_ok=True)
    
    # Run the generator
    try:
        generator = TestCaseGenerator(args)
        generator.run()
    except KeyboardInterrupt:
        print("\nOperation cancelled by user")
        sys.exit(1)
    except Exception as e:
        logging.error(f"Test generation failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()