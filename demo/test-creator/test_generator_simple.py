#!/usr/bin/env python3
"""
Simple C++ Test Case Generator with DeepSeek R1
No mock dependencies - pure unit test generation
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
from typing import Dict, List, Optional
from dataclasses import dataclass, field

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
class MethodInfo:
    """Information about a C++ method"""
    name: str
    parameters: List[str]
    return_type: str
    is_const: bool = False
    is_static: bool = False

@dataclass
class ClassInfo:
    """Information about a C++ class"""
    name: str
    file_path: str
    methods: List[MethodInfo]
    has_constructor: bool = True
    has_destructor: bool = False

# ============================================================================
# Google Test Reference
# ============================================================================

GTEST_REFERENCE = """
Google Test (gtest) Quick Reference:
- TEST_F(TestFixture, TestName) - Define a test using a fixture
- EXPECT_EQ(expected, actual) - Check equality
- EXPECT_NE(val1, val2) - Check inequality
- EXPECT_TRUE(condition) - Check true condition
- EXPECT_FALSE(condition) - Check false condition
- EXPECT_GT(val1, val2) - Check greater than
- EXPECT_LT(val1, val2) - Check less than
- EXPECT_GE(val1, val2) - Check greater or equal
- EXPECT_LE(val1, val2) - Check less or equal
- EXPECT_NEAR(val1, val2, abs_error) - Check floating point near
- EXPECT_THROW(statement, exception_type) - Check exception thrown
- EXPECT_NO_THROW(statement) - Check no exception
- EXPECT_STREQ(str1, str2) - Check C string equality
"""

# ============================================================================
# Code Analysis
# ============================================================================

class SimpleCodeAnalyzer:
    """Simple C++ header analyzer using regex"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def analyze_file(self, file_path: str) -> List[ClassInfo]:
        """Analyze a C++ header file"""
        classes = []
        
        try:
            with open(file_path, 'r') as f:
                content = f.read()
            
            # Find class definitions
            class_pattern = r'class\s+(\w+)\s*(?::\s*public\s+\w+\s*)?{'
            
            for class_match in re.finditer(class_pattern, content):
                class_name = class_match.group(1)
                
                # Find the class body
                start = class_match.end()
                brace_count = 1
                end = start
                
                while brace_count > 0 and end < len(content):
                    if content[end] == '{':
                        brace_count += 1
                    elif content[end] == '}':
                        brace_count -= 1
                    end += 1
                
                class_body = content[start:end-1]
                
                # Extract methods
                methods = self._extract_methods(class_body, class_name)
                
                if methods:
                    classes.append(ClassInfo(
                        name=class_name,
                        file_path=file_path,
                        methods=methods
                    ))
        
        except Exception as e:
            self.logger.error(f"Failed to analyze {file_path}: {e}")
        
        return classes
    
    def _extract_methods(self, class_body: str, class_name: str) -> List[MethodInfo]:
        """Extract methods from class body"""
        methods = []
        
        # Method pattern
        method_pattern = r'^\s*(?:virtual\s+)?(?:static\s+)?([\w:]+(?:\s*[*&]+)?)\s+(\w+)\s*\(([^)]*)\)\s*(?:const)?'
        
        for line in class_body.split('\n'):
            match = re.match(method_pattern, line)
            if match:
                return_type = match.group(1).strip()
                method_name = match.group(2).strip()
                params = match.group(3).strip()
                
                # Skip constructors and destructors
                if method_name == class_name or method_name == f'~{class_name}':
                    continue
                
                # Parse parameters
                param_list = []
                if params and params != 'void':
                    for param in params.split(','):
                        param = param.strip()
                        if param:
                            param_list.append(param)
                
                # Check modifiers
                is_const = 'const' in line[match.end():]
                is_static = 'static' in line[:match.start()]
                
                methods.append(MethodInfo(
                    name=method_name,
                    parameters=param_list,
                    return_type=return_type,
                    is_const=is_const,
                    is_static=is_static
                ))
        
        return methods

# ============================================================================
# Test Generator with LLM
# ============================================================================

class TestGenerator:
    """Generates test cases using DeepSeek R1"""
    
    def __init__(self, llm_model: str = "deepseek-r1:7b", retry_threshold: int = 3):
        self.llm_model = llm_model
        self.retry_threshold = retry_threshold
        self.logger = logging.getLogger(__name__)
    
    def generate_test_file(self, class_info: ClassInfo, output_dir: Path, 
                         header_content: str, cpp_content: str = "") -> str:
        """Generate a complete test file for a class"""
        # Create output directory
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate test content
        test_content = self._generate_test_content(class_info, header_content, cpp_content)
        
        # Write test file
        test_file = output_dir / f"{class_info.name}Test.cpp"
        test_file.write_text(test_content)
        
        self.logger.info(f"Generated test file: {test_file}")
        return str(test_file)
    
    def _generate_test_content(self, class_info: ClassInfo, 
                             header_content: str, cpp_content: str) -> str:
        """Generate complete test file content"""
        content = f"""// Generated test file for {class_info.name}
// Using DeepSeek R1 for test implementation
#include <gtest/gtest.h>
#include "{Path(class_info.file_path).name}"
#include <climits>
#include <stdexcept>
#include <string>

using namespace testing;
using namespace std;

class {class_info.name}Test : public ::testing::Test {{
protected:
    {class_info.name}* obj;
    
    void SetUp() override {{
        obj = new {class_info.name}();
    }}
    
    void TearDown() override {{
        delete obj;
    }}
}};

"""
        
        # Generate test for each method
        for method in class_info.methods:
            test_code = self._generate_method_test(class_info, method, 
                                                 header_content, cpp_content)
            content += f"\nTEST_F({class_info.name}Test, {method.name}_BasicTest) {{\n"
            content += test_code
            content += "\n}\n"
            
            # Add edge case test if applicable
            if self._needs_edge_case_test(method):
                edge_test_code = self._generate_edge_case_test(class_info, method,
                                                             header_content, cpp_content)
                content += f"\nTEST_F({class_info.name}Test, {method.name}_EdgeCases) {{\n"
                content += edge_test_code
                content += "\n}\n"
        
        return content
    
    def _generate_method_test(self, class_info: ClassInfo, method: MethodInfo,
                            header_content: str, cpp_content: str) -> str:
        """Generate test for a single method using LLM"""
        if OLLAMA_AVAILABLE:
            # Try LLM generation
            for attempt in range(self.retry_threshold):
                try:
                    prompt = self._create_test_prompt(class_info, method, 
                                                    header_content, cpp_content)
                    test_code = self._call_llm(prompt)
                    
                    # Verify it looks reasonable
                    if self._validate_test_code(test_code):
                        return test_code
                    
                except Exception as e:
                    self.logger.warning(f"LLM attempt {attempt + 1} failed: {e}")
        
        # Fallback to template
        return self._generate_template_test(class_info, method)
    
    def _generate_edge_case_test(self, class_info: ClassInfo, method: MethodInfo,
                                header_content: str, cpp_content: str) -> str:
        """Generate edge case test"""
        if OLLAMA_AVAILABLE:
            try:
                prompt = self._create_edge_case_prompt(class_info, method,
                                                     header_content, cpp_content)
                test_code = self._call_llm(prompt)
                if self._validate_test_code(test_code):
                    return test_code
            except Exception as e:
                self.logger.warning(f"LLM edge case generation failed: {e}")
        
        # Fallback
        return self._generate_template_edge_test(class_info, method)
    
    def _needs_edge_case_test(self, method: MethodInfo) -> bool:
        """Check if method needs edge case testing"""
        # Methods with parameters or specific return types need edge cases
        return (len(method.parameters) > 0 or 
                method.return_type in ['int', 'double', 'float', 'bool', 'string'])
    
    def _create_test_prompt(self, class_info: ClassInfo, method: MethodInfo,
                          header_content: str, cpp_content: str) -> str:
        """Create LLM prompt for test generation"""
        return f"""Generate a unit test for the following C++ method.

{GTEST_REFERENCE}

Class: {class_info.name}
Method: {method.name}
Parameters: {', '.join(method.parameters) if method.parameters else 'none'}
Return Type: {method.return_type}
Is Const: {method.is_const}
Is Static: {method.is_static}

Header File:
```cpp
{header_content}
```

{f"Implementation File:\n```cpp\n{cpp_content}\n```" if cpp_content else ""}

Generate ONLY the test body (what goes inside TEST_F). Requirements:
1. Start with: // Verifier: DeepSeek R1
2. Use Arrange-Act-Assert pattern
3. Include meaningful assertions
4. Test normal behavior
5. Use the 'obj' pointer to access the class instance

Example format:
    // Verifier: DeepSeek R1
    // Test description
    
    // Arrange
    int input = 5;
    
    // Act
    int result = obj->method(input);
    
    // Assert
    EXPECT_EQ(expected, result);

Generate the test body:"""
    
    def _create_edge_case_prompt(self, class_info: ClassInfo, method: MethodInfo,
                                header_content: str, cpp_content: str) -> str:
        """Create prompt for edge case testing"""
        return f"""Generate edge case tests for the following C++ method.

Class: {class_info.name}
Method: {method.name}
Parameters: {', '.join(method.parameters) if method.parameters else 'none'}
Return Type: {method.return_type}

Focus on:
- Boundary values (0, -1, INT_MAX, empty strings)
- Invalid inputs
- Exception cases
- Special conditions

Generate ONLY the test body starting with // Verifier: DeepSeek R1"""
    
    def _call_llm(self, prompt: str) -> str:
        """Call Ollama with DeepSeek R1"""
        # Save prompt to temp file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write(prompt)
            prompt_file = f.name
        
        try:
            # Call Ollama
            cmd = f'ollama run {self.llm_model} < {prompt_file}'
            result = subprocess.run(cmd, shell=True, capture_output=True, 
                                  text=True, timeout=30)
            
            if result.returncode != 0:
                raise Exception(f"Ollama failed: {result.stderr}")
            
            response = result.stdout.strip()
            
            # Extract code if in markdown
            code_match = re.search(r'```(?:cpp)?\n(.*?)\n```', response, re.DOTALL)
            if code_match:
                return code_match.group(1).strip()
            
            return response
            
        finally:
            os.unlink(prompt_file)
    
    def _validate_test_code(self, test_code: str) -> bool:
        """Basic validation of generated test code"""
        required_elements = ['// Verifier:', 'EXPECT_', '->']
        return all(elem in test_code for elem in required_elements)
    
    def _generate_template_test(self, class_info: ClassInfo, method: MethodInfo) -> str:
        """Generate template test when LLM is not available"""
        params = self._generate_test_params(method.parameters)
        
        test = f"""    // Verifier: None yet
    // TODO: Implement test for {method.name}
    
    // Arrange
    {self._generate_param_setup(method.parameters)}
    
    // Act
    {"auto result = " if method.return_type != "void" else ""}obj->{method.name}({params});
    
    // Assert
    // TODO: Add assertions
    """
        
        return test
    
    def _generate_template_edge_test(self, class_info: ClassInfo, method: MethodInfo) -> str:
        """Generate template for edge cases"""
        return f"""    // Verifier: None yet
    // TODO: Test edge cases for {method.name}
    
    // Test boundary values
    // Test invalid inputs
    // Test exception cases
    """
    
    def _generate_test_params(self, parameters: List[str]) -> str:
        """Generate test parameter values"""
        if not parameters:
            return ""
        
        values = []
        for param in parameters:
            if 'int' in param:
                values.append('42')
            elif 'double' in param or 'float' in param:
                values.append('3.14')
            elif 'string' in param:
                values.append('"test"')
            elif 'bool' in param:
                values.append('true')
            elif 'char' in param:
                values.append("'A'")
            else:
                values.append('/* value */')
        
        return ', '.join(values)
    
    def _generate_param_setup(self, parameters: List[str]) -> str:
        """Generate parameter setup code"""
        if not parameters:
            return "// No parameters"
        
        setup = []
        for i, param in enumerate(parameters):
            # Extract type and name
            parts = param.strip().split()
            if len(parts) >= 2:
                param_type = ' '.join(parts[:-1])
                param_name = parts[-1].strip('&*')
            else:
                param_type = param
                param_name = f'param{i}'
            
            if 'int' in param_type:
                setup.append(f'int {param_name} = 42;')
            elif 'double' in param_type:
                setup.append(f'double {param_name} = 3.14;')
            elif 'string' in param_type:
                setup.append(f'std::string {param_name} = "test";')
            elif 'bool' in param_type:
                setup.append(f'bool {param_name} = true;')
            elif 'char' in param_type:
                setup.append(f'char {param_name} = \'A\';')
        
        return '\n    '.join(setup) if setup else "// No parameters"

# ============================================================================
# Main Application
# ============================================================================

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='Simple C++ Test Generator with DeepSeek R1'
    )
    parser.add_argument('source', help='C++ header file to generate tests for')
    parser.add_argument('-o', '--output', default='tests', 
                      help='Output directory (default: tests)')
    parser.add_argument('-c', '--cpp', help='Optional C++ implementation file')
    parser.add_argument('--model', default='deepseek-r1:7b',
                      help='Ollama model (default: deepseek-r1:7b)')
    parser.add_argument('-v', '--verbose', action='store_true',
                      help='Enable verbose output')
    
    args = parser.parse_args()
    
    # Setup logging
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format='%(levelname)s: %(message)s'
    )
    
    # Check file exists
    if not os.path.exists(args.source):
        print(f"Error: File not found: {args.source}")
        sys.exit(1)
    
    # Read source files
    with open(args.source, 'r') as f:
        header_content = f.read()
    
    cpp_content = ""
    if args.cpp and os.path.exists(args.cpp):
        with open(args.cpp, 'r') as f:
            cpp_content = f.read()
    
    # Analyze code
    print(f"Analyzing {args.source}...")
    analyzer = SimpleCodeAnalyzer()
    classes = analyzer.analyze_file(args.source)
    
    if not classes:
        print("No classes found in the file.")
        sys.exit(1)
    
    print(f"Found {len(classes)} class(es)")
    
    # Generate tests
    generator = TestGenerator(llm_model=args.model)
    output_dir = Path(args.output)
    
    for class_info in classes:
        print(f"\nGenerating tests for class: {class_info.name}")
        print(f"  Methods found: {len(class_info.methods)}")
        
        test_file = generator.generate_test_file(
            class_info, output_dir, header_content, cpp_content
        )
        
        print(f"  Generated: {test_file}")
    
    print("\nTest generation complete!")
    
    # Show compilation example
    print("\nTo compile the tests:")
    print(f"  g++ -std=c++14 {args.output}/*.cpp {args.cpp or 'implementation.cpp'} -lgtest -lgtest_main -pthread")

if __name__ == '__main__':
    main()