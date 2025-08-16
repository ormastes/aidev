#!/usr/bin/env python3
"""
C++ Test Case Generator with LLM Integration
Generates complete test implementations using Ollama
"""

import os
import sys
import json
import argparse
import logging
import subprocess
import tempfile
import re
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional
from dataclasses import dataclass, field, asdict
from collections import defaultdict

# Check for libclang availability
try:
    from clang.cindex import Index, CursorKind, Config
    CLANG_AVAILABLE = True
except ImportError:
    CLANG_AVAILABLE = False
    print("Warning: libclang not available. Using regex parsing.")

# Check for Ollama availability
OLLAMA_AVAILABLE = True
try:
    result = subprocess.run(['ollama', 'list'], capture_output=True, text=True)
    if result.returncode != 0:
        OLLAMA_AVAILABLE = False
except FileNotFoundError:
    OLLAMA_AVAILABLE = False
    print("Warning: Ollama not available. Install from https://ollama.ai")

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
    is_implemented: bool = False

# ============================================================================
# Google Test/Mock Reference
# ============================================================================

GTEST_REFERENCE = """
Google Test (gtest) Quick Reference:
- TEST_F(TestFixture, TestName) - Define a test using a fixture
- EXPECT_EQ(expected, actual) - Non-fatal equality assertion
- EXPECT_NE(val1, val2) - Non-fatal inequality assertion
- EXPECT_TRUE(condition) - Non-fatal boolean true assertion
- EXPECT_FALSE(condition) - Non-fatal boolean false assertion
- EXPECT_GT(val1, val2) - val1 > val2
- EXPECT_LT(val1, val2) - val1 < val2
- EXPECT_GE(val1, val2) - val1 >= val2
- EXPECT_LE(val1, val2) - val1 <= val2
- EXPECT_THROW(statement, exception_type) - Expects exception
- EXPECT_NO_THROW(statement) - Expects no exception
- EXPECT_DEATH(statement, regex) - Expects death with message

Google Mock (gmock) Quick Reference:
- EXPECT_CALL(mock_object, method(matchers)) - Set expectation
- .Times(n) - Method called exactly n times
- .WillOnce(action) - Action for one call
- .WillRepeatedly(action) - Action for all calls
- Return(value) - Return specific value
- ReturnRef(variable) - Return reference
- Throw(exception) - Throw exception
- _ - Match any value
- Eq(value) - Match equal value
- Ne(value) - Match not equal
- Gt(value) - Match greater than
- Lt(value) - Match less than
"""

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
        
        lowercase_name = mock_name.lower()
        include_path = os.path.relpath(file_path, self.mock_base_folder)
        
        return MockInfo(
            mock_name=mock_name,
            file_path=file_path,
            lowercase_name=lowercase_name,
            include_path=include_path
        )

# ============================================================================
# Code Analysis
# ============================================================================

class CodeAnalyzer:
    """Analyzes C++ source code to extract structure"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def analyze_file(self, file_path: str) -> List[TargetInfo]:
        """Analyze a C++ header file"""
        if CLANG_AVAILABLE:
            return self._analyze_with_clang(file_path)
        else:
            return self._analyze_with_regex(file_path)
    
    def _analyze_with_regex(self, file_path: str) -> List[TargetInfo]:
        """Fallback regex-based analysis"""
        targets = []
        
        with open(file_path, 'r') as f:
            content = f.read()
        
        # Find class definitions
        class_pattern = r'class\s+(\w+)\s*(?::\s*public\s+\w+\s*)?{'
        method_pattern = r'^\s*(?:virtual\s+)?(?:static\s+)?(?:\w+(?:::\w+)?(?:\s*[*&]+)?)\s+(\w+)\s*\(([^)]*)\)'
        
        for class_match in re.finditer(class_pattern, content):
            class_name = class_match.group(1)
            
            # Find methods
            methods = []
            class_end = content.find('};', class_match.end())
            class_body = content[class_match.end():class_end]
            
            for method_match in re.finditer(method_pattern, class_body, re.MULTILINE):
                method_name = method_match.group(1)
                params = method_match.group(2)
                
                # Skip constructors/destructors
                if method_name == class_name or method_name == f'~{class_name}':
                    continue
                
                # Parse parameters
                param_list = []
                if params.strip():
                    for param in params.split(','):
                        param = param.strip()
                        if param and param != 'void':
                            param_list.append(param)
                
                methods.append({
                    'name': method_name,
                    'parameters': param_list,
                    'return_type': 'auto'  # Simplified for regex parsing
                })
            
            if methods:
                target = TargetInfo(
                    name=class_name,
                    full_path=class_name,
                    file_path=file_path,
                    header_path=file_path,
                    methods=methods
                )
                targets.append(target)
        
        return targets
    
    def _analyze_with_clang(self, file_path: str) -> List[TargetInfo]:
        """Analyze using libclang for accurate parsing"""
        # Implementation would use clang here
        # For now, fall back to regex
        return self._analyze_with_regex(file_path)

# ============================================================================
# LLM-Enhanced Test Generator
# ============================================================================

class LLMTestGenerator:
    """Generates test cases using LLM for implementation"""
    
    def __init__(self, mock_mapping: Dict[str, List[MockInfo]], 
                 retry_threshold: int = 3,
                 llm_model: str = "deepseek-r1:7b"):
        self.mock_mapping = mock_mapping
        self.retry_threshold = retry_threshold
        self.llm_model = llm_model
        self.logger = logging.getLogger(__name__)
    
    def generate_test_file(self, target: TargetInfo, output_dir: Path) -> str:
        """Generate a complete test file with LLM implementations"""
        # Read the source files
        header_content = self._read_file(target.header_path)
        cpp_content = ""
        cpp_path = target.header_path.replace('.h', '.cpp').replace('.hpp', '.cpp')
        if os.path.exists(cpp_path):
            cpp_content = self._read_file(cpp_path)
        
        # Generate test cases
        test_cases = self._generate_test_cases(target, header_content, cpp_content)
        
        # Create test file content
        test_content = self._create_test_file_content(target, test_cases)
        
        # Create output file path
        rel_path = Path(target.file_path).relative_to(Path(target.file_path).anchor)
        test_file = output_dir / rel_path.with_name(f"{target.name}Test.cpp")
        test_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Write test file
        test_file.write_text(test_content)
        self.logger.info(f"Generated test file: {test_file}")
        
        return str(test_file)
    
    def _read_file(self, path: str) -> str:
        """Read file content"""
        try:
            with open(path, 'r') as f:
                return f.read()
        except:
            return ""
    
    def _generate_test_cases(self, target: TargetInfo, 
                           header_content: str, 
                           cpp_content: str) -> List[TestCase]:
        """Generate test cases with LLM implementation"""
        test_cases = []
        
        for method in target.methods:
            # Check if test already exists and is properly implemented
            existing_test = self._check_existing_test(target, method)
            if existing_test and self._is_properly_implemented(existing_test):
                test_cases.append(existing_test)
                continue
            
            # Generate new test with LLM
            test_case = self._generate_llm_test(target, method, header_content, cpp_content)
            if test_case:
                test_cases.append(test_case)
        
        return test_cases
    
    def _check_existing_test(self, target: TargetInfo, method: Dict) -> Optional[TestCase]:
        """Check if a test already exists for this method"""
        # This would check existing test files
        # For now, return None to generate all tests
        return None
    
    def _is_properly_implemented(self, test_case: TestCase) -> bool:
        """Check if a test is properly implemented"""
        # Check for actual assertions, not just comments
        has_assertions = any(assertion in test_case.test_code 
                           for assertion in ['EXPECT_', 'ASSERT_'])
        has_verifier = '// Verifier:' in test_case.test_code
        return has_assertions and not has_verifier.endswith('None yet')
    
    def _generate_llm_test(self, target: TargetInfo, method: Dict,
                         header_content: str, cpp_content: str) -> Optional[TestCase]:
        """Generate test implementation using LLM"""
        test_name = f"Test_{target.name}_{method['name']}"
        
        # Find required mocks
        required_mocks = []
        for dep in target.dependencies:
            if dep.lower() in self.mock_mapping:
                required_mocks.append(self.mock_mapping[dep.lower()][0].mock_name)
        
        # Create prompt for LLM
        prompt = self._create_llm_prompt(target, method, header_content, 
                                       cpp_content, required_mocks)
        
        # Try to generate test with retries
        for attempt in range(self.retry_threshold):
            try:
                test_code = self._call_llm(prompt)
                
                # Compile test to verify
                if self._verify_compilation(target, test_code):
                    return TestCase(
                        name=test_name,
                        description=f"Test for {method['name']}",
                        test_code=test_code,
                        required_mocks=required_mocks,
                        assertions=self._extract_assertions(test_code),
                        is_implemented=True
                    )
                else:
                    self.logger.warning(f"Compilation failed for {test_name}, attempt {attempt + 1}")
                    # Add compilation error to prompt for next attempt
                    prompt += "\n\n// Previous attempt had compilation errors. Please fix."
                    
            except Exception as e:
                self.logger.error(f"LLM generation failed for {test_name}: {e}")
        
        # If all attempts failed, return skeleton
        return self._generate_skeleton_test(target, method, required_mocks)
    
    def _create_llm_prompt(self, target: TargetInfo, method: Dict,
                         header_content: str, cpp_content: str,
                         required_mocks: List[str]) -> str:
        """Create prompt for LLM"""
        return f"""Generate a complete Google Test implementation for the following C++ method.

{GTEST_REFERENCE}

Target Class: {target.name}
Method: {method['name']}
Parameters: {', '.join(method['parameters'])}
Return Type: {method['return_type']}

Header File:
```cpp
{header_content}
```

Implementation File:
```cpp
{cpp_content}
```

Required Mocks: {', '.join(required_mocks)}

Generate ONLY the test method body (what goes inside TEST_F). Include:
1. // Verifier: <Your Name> comment at the top
2. Arrange section with proper setup
3. Act section calling the method
4. Assert section with meaningful assertions
5. Test both success and edge cases

Example format:
```cpp
// Verifier: Assistant
// Arrange
Calculator calc;
// Act  
int result = calc.add(2, 3);
// Assert
EXPECT_EQ(5, result);
```

Generate the test body:"""
    
    def _call_llm(self, prompt: str) -> str:
        """Call Ollama LLM for test generation"""
        if not OLLAMA_AVAILABLE:
            raise Exception("Ollama not available")
        
        # Create temporary file with prompt
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write(prompt)
            prompt_file = f.name
        
        try:
            # Call Ollama
            result = subprocess.run(
                ['ollama', 'run', self.llm_model, f'< {prompt_file}'],
                shell=True,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode != 0:
                raise Exception(f"Ollama failed: {result.stderr}")
            
            # Extract code from response
            response = result.stdout
            
            # Extract code block if wrapped in ```
            code_match = re.search(r'```(?:cpp)?\n(.*?)\n```', response, re.DOTALL)
            if code_match:
                return code_match.group(1).strip()
            
            # Otherwise return the whole response
            return response.strip()
            
        finally:
            os.unlink(prompt_file)
    
    def _verify_compilation(self, target: TargetInfo, test_code: str) -> bool:
        """Verify that generated test compiles"""
        # Create temporary test file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.cpp', delete=False) as f:
            # Write minimal test file
            f.write(f"""
#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include "{os.path.basename(target.header_path)}"

class {target.name}Test : public ::testing::Test {{
protected:
    void SetUp() override {{}}
    void TearDown() override {{}}
}};

TEST_F({target.name}Test, TestMethod) {{
{test_code}
}}
""")
            test_file = f.name
        
        try:
            # Try to compile (syntax check only)
            result = subprocess.run(
                ['g++', '-std=c++14', '-fsyntax-only', 
                 '-I.', f'-I{os.path.dirname(target.header_path)}',
                 test_file],
                capture_output=True,
                text=True
            )
            
            return result.returncode == 0
            
        finally:
            os.unlink(test_file)
    
    def _extract_assertions(self, test_code: str) -> List[str]:
        """Extract assertion types from test code"""
        assertions = []
        for line in test_code.split('\n'):
            for assertion in ['EXPECT_EQ', 'EXPECT_TRUE', 'EXPECT_FALSE', 
                            'EXPECT_THROW', 'EXPECT_NO_THROW', 'ASSERT_EQ']:
                if assertion in line:
                    assertions.append(assertion)
        return list(set(assertions))
    
    def _generate_skeleton_test(self, target: TargetInfo, method: Dict,
                              required_mocks: List[str]) -> TestCase:
        """Generate skeleton test when LLM fails"""
        test_name = f"Test_{target.name}_{method['name']}"
        
        # Generate basic test code
        params = self._generate_test_params(method['parameters'])
        test_code = f"""    // Verifier: None yet
    // TODO: Implement test for {method['name']}
    
    // Arrange
    {target.name} obj;"""
        
        # Add mock setup
        for mock in required_mocks:
            test_code += f"""
    {mock}Mock mock{mock};
    obj.set{mock}(&mock{mock});"""
        
        # Add method call
        test_code += f"""
    
    // Act
    auto result = obj.{method['name']}({params});
    
    // Assert
    // Add assertions here
    """
        
        return TestCase(
            name=test_name,
            description=f"Test for {method['name']}",
            test_code=test_code,
            required_mocks=required_mocks,
            assertions=[],
            is_implemented=False
        )
    
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
    
    def _create_test_file_content(self, target: TargetInfo, 
                                test_cases: List[TestCase]) -> str:
        """Create complete test file content"""
        # Collect all required mocks
        all_mocks = set()
        for test_case in test_cases:
            all_mocks.update(test_case.required_mocks)
        
        # Generate includes
        content = f"""// Generated test file for {target.name}
#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include <climits>
#include <stdexcept>
#include "{os.path.basename(target.header_path)}"
"""
        
        # Add mock includes
        for mock in all_mocks:
            mock_info = self.mock_mapping.get(mock.lower(), [None])[0]
            if mock_info:
                content += f'#include "{mock_info.include_path}"\n'
        
        content += """
using namespace testing;
using namespace std;

"""
        
        # Add test fixture
        content += f"""class {target.name}Test : public ::testing::Test {{
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
{test_case.test_code}
}}
"""
        
        return content

# ============================================================================
# Main Application
# ============================================================================

class TestCaseGeneratorWithLLM:
    """Main application with LLM integration"""
    
    def __init__(self, args):
        self.args = args
        self.logger = logging.getLogger(__name__)
        
        # Initialize components
        self.mock_discovery = MockDiscovery(Path(args.mock_base))
        self.analyzer = CodeAnalyzer()
        self.retry_threshold = args.retry_threshold
    
    def run(self):
        """Run the complete test generation process"""
        self.logger.info("Starting C++ Test Case Generator with LLM")
        
        # Check Ollama availability
        if not OLLAMA_AVAILABLE:
            self.logger.error("Ollama is not available. Please install from https://ollama.ai")
            if not self.args.force:
                sys.exit(1)
        
        # Step 1: Discover mocks
        self.logger.info("Discovering mock files...")
        mock_mapping = self.mock_discovery.discover()
        self.logger.info(f"Found {len(mock_mapping)} unique mock types")
        
        # Step 2: Analyze source files
        self.logger.info("Analyzing source files...")
        all_targets = self._analyze_sources()
        self.logger.info(f"Found {len(all_targets)} target classes")
        
        # Step 3: Generate tests with LLM
        self.logger.info("Generating test cases with LLM...")
        generator = LLMTestGenerator(
            mock_mapping, 
            retry_threshold=self.retry_threshold,
            llm_model=self.args.llm_model
        )
        
        generated_count = 0
        failed_count = 0
        
        for target in all_targets:
            try:
                # Generate test file
                test_file = generator.generate_test_file(target, Path(self.args.test_base))
                generated_count += 1
                self.logger.info(f"Generated tests for {target.name}")
                
            except Exception as e:
                self.logger.error(f"Failed to generate tests for {target.name}: {e}")
                failed_count += 1
        
        # Step 4: Generate summary
        self._generate_summary(all_targets, mock_mapping, generated_count, failed_count)
        
        self.logger.info(f"Test generation complete! Generated {generated_count} test files.")
        if failed_count > 0:
            self.logger.warning(f"{failed_count} test files failed to generate.")
    
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
    
    def _generate_summary(self, targets: List[TargetInfo], 
                         mock_mapping: Dict[str, List[MockInfo]], 
                         generated_count: int,
                         failed_count: int):
        """Generate a summary report"""
        summary = {
            'statistics': {
                'total_targets': len(targets),
                'total_mocks': len(mock_mapping),
                'generated_tests': generated_count,
                'failed_tests': failed_count,
                'success_rate': f"{(generated_count / len(targets) * 100):.1f}%" if targets else "0%"
            },
            'targets': [t.name for t in targets],
            'mocks': list(mock_mapping.keys()),
            'llm_model': self.args.llm_model,
            'retry_threshold': self.retry_threshold
        }
        
        # Save summary
        summary_file = Path(self.args.test_base) / 'test_generation_summary.json'
        summary_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(summary_file, 'w') as f:
            json.dump(summary, f, indent=2)
        
        # Print summary
        print("\n" + "="*60)
        print("TEST GENERATION SUMMARY")
        print("="*60)
        print(f"Total target classes found: {len(targets)}")
        print(f"Total mock files found: {len(mock_mapping)}")
        print(f"Test files generated: {generated_count}")
        print(f"Test files failed: {failed_count}")
        print(f"Success rate: {summary['statistics']['success_rate']}")
        print(f"LLM Model: {self.args.llm_model}")
        print(f"\nSummary saved to: {summary_file}")

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='Generate C++ test cases with LLM implementation'
    )
    parser.add_argument('-t', '--target-base', required=True,
                      help='Base folder containing target C++ headers/sources')
    parser.add_argument('-m', '--mock-base', required=True,
                      help='Base folder containing mock files')
    parser.add_argument('-o', '--test-base', required=True,
                      help='Output base folder for generated tests')
    parser.add_argument('-v', '--verbose', action='store_true',
                      help='Enable verbose logging')
    parser.add_argument('--llm-model', default='deepseek-r1:7b',
                      help='Ollama model to use (default: deepseek-r1:7b)')
    parser.add_argument('--retry-threshold', type=int, default=3,
                      help='Number of retry attempts for failed compilations (default: 3)')
    parser.add_argument('--force', action='store_true',
                      help='Continue even if Ollama is not available')
    
    args = parser.parse_args()
    
    # Setup logging
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Run generator
    try:
        generator = TestCaseGeneratorWithLLM(args)
        generator.run()
    except KeyboardInterrupt:
        print("\nOperation cancelled by user")
        sys.exit(1)
    except Exception as e:
        logging.error(f"Test generation failed: {e}", exc_info=True)
        sys.exit(1)

if __name__ == '__main__':
    main()