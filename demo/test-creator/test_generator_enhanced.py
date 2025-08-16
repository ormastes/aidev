#!/usr/bin/env python3
"""
Enhanced C++ Test Case Generator with DeepSeek R1
- Starts new chat session for each test file
- Analyzes code behavior before generating tests
- Adds detailed comments about expectations
"""

import os
import sys
import json
import argparse
import logging
import subprocess
import tempfile
import re
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple
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
class MethodAnalysis:
    """Detailed analysis of a method's behavior"""
    name: str
    purpose: str
    parameters: List[Dict[str, str]]  # [{name, type, purpose}]
    return_info: Dict[str, str]  # {type, meaning}
    side_effects: List[str]
    dependencies: List[str]
    exceptions: List[str]
    preconditions: List[str]
    postconditions: List[str]

@dataclass
class MethodInfo:
    """Information about a C++ method"""
    name: str
    parameters: List[str]
    return_type: str
    is_const: bool = False
    is_static: bool = False
    analysis: Optional[MethodAnalysis] = None

@dataclass
class ClassInfo:
    """Information about a C++ class"""
    name: str
    file_path: str
    methods: List[MethodInfo]
    member_variables: List[Dict[str, str]]
    dependencies: List[str]
    purpose: str = ""

# ============================================================================
# Code Deep Analyzer
# ============================================================================

class CodeDeepAnalyzer:
    """Deep analysis of C++ code to understand behavior"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def analyze_file(self, header_path: str, cpp_path: str = "") -> List[ClassInfo]:
        """Analyze C++ files to extract detailed information"""
        classes = []
        
        # Read files
        header_content = self._read_file(header_path)
        cpp_content = self._read_file(cpp_path) if cpp_path else ""
        
        # Find classes
        class_pattern = r'class\s+(\w+)\s*(?::\s*public\s+\w+\s*)?{'
        
        for class_match in re.finditer(class_pattern, header_content):
            class_name = class_match.group(1)
            
            # Extract class body
            class_body = self._extract_class_body(header_content, class_match.end())
            
            # Analyze class
            class_info = ClassInfo(
                name=class_name,
                file_path=header_path,
                methods=[],
                member_variables=self._extract_member_variables(class_body),
                dependencies=self._extract_dependencies(header_content, class_body)
            )
            
            # Extract and analyze methods
            methods = self._extract_methods(class_body, class_name)
            for method in methods:
                # Analyze method implementation
                if cpp_content:
                    method.analysis = self._analyze_method(
                        method, class_name, cpp_content, class_info
                    )
                class_info.methods.append(method)
            
            # Determine class purpose
            class_info.purpose = self._determine_class_purpose(class_name, class_info)
            
            classes.append(class_info)
        
        return classes
    
    def _read_file(self, path: str) -> str:
        """Read file content"""
        try:
            with open(path, 'r') as f:
                return f.read()
        except:
            return ""
    
    def _extract_class_body(self, content: str, start: int) -> str:
        """Extract class body with proper brace matching"""
        brace_count = 1
        end = start
        
        while brace_count > 0 and end < len(content):
            if content[end] == '{':
                brace_count += 1
            elif content[end] == '}':
                brace_count -= 1
            end += 1
        
        return content[start:end-1]
    
    def _extract_member_variables(self, class_body: str) -> List[Dict[str, str]]:
        """Extract member variables from class"""
        members = []
        
        # Pattern for member variables
        member_pattern = r'^\s*(?!public:|private:|protected:)(?:mutable\s+)?(\w+(?:\s*[*&])?(?:\s*<[^>]+>)?)\s+(\w+)\s*(?:=.*)?;'
        
        for line in class_body.split('\n'):
            match = re.match(member_pattern, line)
            if match and 'static' not in line and 'friend' not in line:
                var_type = match.group(1).strip()
                var_name = match.group(2).strip()
                members.append({'type': var_type, 'name': var_name})
        
        return members
    
    def _extract_dependencies(self, header_content: str, class_body: str) -> List[str]:
        """Extract class dependencies"""
        deps = set()
        
        # From includes
        include_pattern = r'#include\s*[<"]([^>"]+)[>"]'
        for match in re.finditer(include_pattern, header_content):
            deps.add(match.group(1))
        
        # From forward declarations
        forward_pattern = r'class\s+(\w+)\s*;'
        for match in re.finditer(forward_pattern, header_content):
            deps.add(match.group(1))
        
        return list(deps)
    
    def _extract_methods(self, class_body: str, class_name: str) -> List[MethodInfo]:
        """Extract methods from class body"""
        methods = []
        
        # Method pattern
        method_pattern = r'^\s*(?:virtual\s+)?(?:static\s+)?([\w:]+(?:\s*[*&]+)?)\s+(\w+)\s*\(([^)]*)\)\s*(const)?'
        
        for line in class_body.split('\n'):
            match = re.match(method_pattern, line)
            if match:
                return_type = match.group(1).strip()
                method_name = match.group(2).strip()
                params = match.group(3).strip()
                is_const = bool(match.group(4))
                
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
                is_static = 'static' in line[:match.start()]
                
                methods.append(MethodInfo(
                    name=method_name,
                    parameters=param_list,
                    return_type=return_type,
                    is_const=is_const,
                    is_static=is_static
                ))
        
        return methods
    
    def _analyze_method(self, method: MethodInfo, class_name: str, 
                       cpp_content: str, class_info: ClassInfo) -> MethodAnalysis:
        """Analyze method implementation to understand behavior"""
        # Find method implementation
        impl_pattern = rf'{method.return_type}\s+{class_name}::{method.name}\s*\([^)]*\)'
        impl_match = re.search(impl_pattern, cpp_content)
        
        if not impl_match:
            # Try without return type
            impl_pattern = rf'{class_name}::{method.name}\s*\([^)]*\)'
            impl_match = re.search(impl_pattern, cpp_content)
        
        if impl_match:
            # Extract method body
            method_body = self._extract_method_body(cpp_content, impl_match.end())
            
            # Analyze the implementation
            return MethodAnalysis(
                name=method.name,
                purpose=self._infer_method_purpose(method, method_body),
                parameters=self._analyze_parameters(method.parameters, method_body),
                return_info=self._analyze_return(method.return_type, method_body),
                side_effects=self._find_side_effects(method_body, class_info),
                dependencies=self._find_method_dependencies(method_body),
                exceptions=self._find_exceptions(method_body),
                preconditions=self._find_preconditions(method_body),
                postconditions=self._find_postconditions(method_body)
            )
        
        # Fallback analysis based on signature
        return MethodAnalysis(
            name=method.name,
            purpose=self._infer_purpose_from_name(method.name),
            parameters=self._analyze_parameters(method.parameters, ""),
            return_info={'type': method.return_type, 'meaning': 'Unknown'},
            side_effects=[],
            dependencies=[],
            exceptions=[],
            preconditions=[],
            postconditions=[]
        )
    
    def _extract_method_body(self, content: str, start: int) -> str:
        """Extract method body"""
        # Find opening brace
        while start < len(content) and content[start] != '{':
            start += 1
        
        if start >= len(content):
            return ""
        
        # Extract body with brace matching
        brace_count = 1
        end = start + 1
        
        while brace_count > 0 and end < len(content):
            if content[end] == '{':
                brace_count += 1
            elif content[end] == '}':
                brace_count -= 1
            end += 1
        
        return content[start:end]
    
    def _infer_method_purpose(self, method: MethodInfo, body: str) -> str:
        """Infer method purpose from name and body"""
        name = method.name.lower()
        
        # Common patterns
        if name.startswith('get') or name.startswith('is') or name.startswith('has'):
            return f"Retrieves or checks {name[3:]} property"
        elif name.startswith('set'):
            return f"Sets {name[3:]} property"
        elif 'validate' in name:
            return "Validates input according to specific rules"
        elif 'convert' in name or 'transform' in name:
            return "Converts data from one format to another"
        elif 'count' in name:
            return "Counts occurrences or elements"
        elif 'find' in name or 'search' in name:
            return "Searches for specific elements or patterns"
        
        # Analyze body for clues
        if 'throw' in body:
            return "Performs operation with validation and error handling"
        elif 'return' in body and '==' in body:
            return "Performs comparison or validation"
        elif 'for' in body or 'while' in body:
            return "Iterates through data to perform operation"
        
        return f"Performs {method.name} operation"
    
    def _analyze_parameters(self, params: List[str], body: str) -> List[Dict[str, str]]:
        """Analyze parameters and their purpose"""
        analyzed = []
        
        for param in params:
            # Parse parameter
            parts = param.strip().split()
            if len(parts) >= 2:
                param_type = ' '.join(parts[:-1])
                param_name = parts[-1].strip('&*')
            else:
                param_type = param
                param_name = "param"
            
            # Infer purpose
            purpose = "Input parameter"
            if '&' in param_type and 'const' not in param_type:
                purpose = "Output parameter (modified by method)"
            elif 'const' in param_type:
                purpose = "Read-only input"
            elif '*' in param_type:
                purpose = "Pointer parameter (may be null)"
            
            analyzed.append({
                'name': param_name,
                'type': param_type,
                'purpose': purpose
            })
        
        return analyzed
    
    def _analyze_return(self, return_type: str, body: str) -> Dict[str, str]:
        """Analyze return value meaning"""
        if return_type == 'void':
            return {'type': 'void', 'meaning': 'No return value'}
        elif return_type == 'bool':
            if 'return true' in body and 'return false' in body:
                return {'type': 'bool', 'meaning': 'Success/failure indicator'}
            return {'type': 'bool', 'meaning': 'Boolean result'}
        elif 'int' in return_type:
            if 'count' in body or 'size' in body:
                return {'type': return_type, 'meaning': 'Count or size value'}
            return {'type': return_type, 'meaning': 'Numeric result'}
        elif 'string' in return_type:
            return {'type': return_type, 'meaning': 'String result'}
        elif 'vector' in return_type:
            return {'type': return_type, 'meaning': 'Collection of results'}
        
        return {'type': return_type, 'meaning': 'Processed result'}
    
    def _find_side_effects(self, body: str, class_info: ClassInfo) -> List[str]:
        """Find side effects in method"""
        effects = []
        
        # Check member variable modifications
        for member in class_info.member_variables:
            if f"{member['name']} =" in body or f"this->{member['name']}" in body:
                effects.append(f"Modifies {member['name']} member variable")
        
        # Check for file operations
        if 'fopen' in body or 'ofstream' in body or 'write' in body:
            effects.append("Performs file I/O operations")
        
        # Check for memory operations
        if 'new ' in body:
            effects.append("Allocates memory")
        elif 'delete ' in body:
            effects.append("Deallocates memory")
        
        return effects
    
    def _find_method_dependencies(self, body: str) -> List[str]:
        """Find external dependencies"""
        deps = []
        
        # Standard library calls
        std_calls = re.findall(r'std::(\w+)', body)
        for call in set(std_calls):
            deps.append(f"std::{call}")
        
        # Other method calls
        method_calls = re.findall(r'(\w+)\s*\(', body)
        for call in set(method_calls):
            if call not in ['if', 'for', 'while', 'switch', 'return']:
                deps.append(f"{call}()")
        
        return deps[:5]  # Limit to top 5
    
    def _find_exceptions(self, body: str) -> List[str]:
        """Find exceptions that might be thrown"""
        exceptions = []
        
        # Direct throws
        throw_pattern = r'throw\s+(\w+(?:::\w+)?)'
        for match in re.finditer(throw_pattern, body):
            exceptions.append(match.group(1))
        
        # Common exception patterns
        if 'invalid_argument' in body:
            exceptions.append("std::invalid_argument")
        if 'out_of_range' in body:
            exceptions.append("std::out_of_range")
        if 'runtime_error' in body:
            exceptions.append("std::runtime_error")
        
        return exceptions
    
    def _find_preconditions(self, body: str) -> List[str]:
        """Find preconditions from validation code"""
        conditions = []
        
        # Early returns/throws
        if_pattern = r'if\s*\(([^)]+)\)\s*{\s*(?:return|throw)'
        for match in re.finditer(if_pattern, body):
            condition = match.group(1).strip()
            if 'empty()' in condition:
                conditions.append("Input must not be empty")
            elif '== 0' in condition:
                conditions.append("Value must not be zero")
            elif '< 0' in condition:
                conditions.append("Value must be non-negative")
            elif 'null' in condition.lower():
                conditions.append("Pointer must not be null")
        
        return conditions
    
    def _find_postconditions(self, body: str) -> List[str]:
        """Find postconditions from return statements"""
        conditions = []
        
        # Analyze returns
        if 'return true' in body:
            conditions.append("Returns true on success")
        if 'return false' in body:
            conditions.append("Returns false on failure")
        if 'return result' in body:
            conditions.append("Returns computed result")
        
        return conditions
    
    def _infer_purpose_from_name(self, name: str) -> str:
        """Fallback purpose inference from method name"""
        name_lower = name.lower()
        
        patterns = {
            'get': 'Retrieves value',
            'set': 'Sets value',
            'is': 'Checks condition',
            'has': 'Checks existence',
            'add': 'Adds element',
            'remove': 'Removes element',
            'clear': 'Clears data',
            'reset': 'Resets to initial state',
            'validate': 'Validates input',
            'parse': 'Parses input',
            'format': 'Formats output',
            'convert': 'Converts between formats',
            'calculate': 'Performs calculation',
            'process': 'Processes data'
        }
        
        for key, purpose in patterns.items():
            if name_lower.startswith(key):
                return purpose
        
        return f"Performs {name} operation"
    
    def _determine_class_purpose(self, class_name: str, class_info: ClassInfo) -> str:
        """Determine overall class purpose"""
        # Based on class name
        if 'Utils' in class_name or 'Helper' in class_name:
            return "Utility class providing helper functions"
        elif 'Manager' in class_name:
            return "Manages and coordinates operations"
        elif 'Service' in class_name:
            return "Provides business logic services"
        elif 'Controller' in class_name:
            return "Controls application flow"
        
        # Based on methods
        method_names = [m.name for m in class_info.methods]
        if any('validate' in m for m in method_names):
            return "Provides validation and processing functionality"
        elif any('convert' in m or 'parse' in m for m in method_names):
            return "Handles data conversion and parsing"
        
        return f"Implements {class_name} functionality"

# ============================================================================
# Enhanced Test Generator with Session Management
# ============================================================================

class EnhancedTestGenerator:
    """Generates tests with new session per file and detailed analysis"""
    
    def __init__(self, llm_model: str = "deepseek-r1:7b", retry_threshold: int = 3):
        self.llm_model = llm_model
        self.retry_threshold = retry_threshold
        self.logger = logging.getLogger(__name__)
    
    def generate_test_file(self, class_info: ClassInfo, output_dir: Path, 
                         header_content: str, cpp_content: str = "") -> str:
        """Generate test file with new chat session"""
        
        # Start new session
        self.logger.info(f"Starting new chat session for {class_info.name}")
        self._reset_ollama_context()
        
        # Create output directory
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate test content with detailed analysis
        test_content = self._generate_test_content(
            class_info, header_content, cpp_content
        )
        
        # Write test file
        test_file = output_dir / f"{class_info.name}Test.cpp"
        test_file.write_text(test_content)
        
        self.logger.info(f"Generated test file: {test_file}")
        self.logger.info("Chat session completed and cleared")
        
        return str(test_file)
    
    def _reset_ollama_context(self):
        """Reset Ollama context for new session"""
        if OLLAMA_AVAILABLE:
            # Ollama doesn't maintain context between runs by default
            # This is a placeholder for any session management needed
            time.sleep(0.1)  # Small delay between sessions
    
    def _generate_test_content(self, class_info: ClassInfo, 
                             header_content: str, cpp_content: str) -> str:
        """Generate complete test file content"""
        
        # Generate comprehensive class analysis comment
        class_analysis = self._generate_class_analysis_comment(class_info)
        
        content = f"""// Generated test file for {class_info.name}
// Using DeepSeek R1 for intelligent test generation
// New chat session started for this file

{class_analysis}

#include <gtest/gtest.h>
#include "{Path(class_info.file_path).name}"
#include <climits>
#include <stdexcept>
#include <string>
#include <vector>

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
        
        # Generate test for each method with detailed analysis
        for method in class_info.methods:
            # Generate method analysis comment
            method_comment = self._generate_method_analysis_comment(method)
            
            # Generate basic test
            test_code = self._generate_method_test(
                class_info, method, header_content, cpp_content, method_comment
            )
            content += f"\nTEST_F({class_info.name}Test, {method.name}_BasicTest) {{\n"
            content += method_comment
            content += test_code
            content += "\n}\n"
            
            # Generate edge case test if needed
            if self._needs_edge_case_test(method):
                edge_comment = self._generate_edge_case_comment(method)
                edge_test_code = self._generate_edge_case_test(
                    class_info, method, header_content, cpp_content, edge_comment
                )
                content += f"\nTEST_F({class_info.name}Test, {method.name}_EdgeCases) {{\n"
                content += edge_comment
                content += edge_test_code
                content += "\n}\n"
        
        return content
    
    def _generate_class_analysis_comment(self, class_info: ClassInfo) -> str:
        """Generate detailed class analysis comment"""
        comment = f"""/*
 * Class Analysis: {class_info.name}
 * Purpose: {class_info.purpose}
 * 
 * Member Variables:"""
        
        if class_info.member_variables:
            for var in class_info.member_variables:
                comment += f"\n *   - {var['type']} {var['name']}"
        else:
            comment += "\n *   - None (stateless class)"
        
        comment += "\n * \n * Dependencies:"
        if class_info.dependencies:
            for dep in class_info.dependencies[:5]:
                comment += f"\n *   - {dep}"
        else:
            comment += "\n *   - None"
        
        comment += f"\n * \n * Total Methods: {len(class_info.methods)}"
        comment += "\n */"
        
        return comment
    
    def _generate_method_analysis_comment(self, method: MethodInfo) -> str:
        """Generate detailed method analysis comment"""
        if not method.analysis:
            return f"    // Verifier: None yet\n    // TODO: Analyze and test {method.name}\n"
        
        analysis = method.analysis
        comment = f"""    // Verifier: DeepSeek R1
    // Method: {method.name}
    // Purpose: {analysis.purpose}
    // 
    // Parameters:"""
        
        if analysis.parameters:
            for param in analysis.parameters:
                comment += f"\n    //   - {param['name']} ({param['type']}): {param['purpose']}"
        else:
            comment += "\n    //   - None"
        
        comment += f"\n    // Returns: {analysis.return_info['type']} - {analysis.return_info['meaning']}"
        
        if analysis.side_effects:
            comment += "\n    // Side Effects:"
            for effect in analysis.side_effects:
                comment += f"\n    //   - {effect}"
        
        if analysis.exceptions:
            comment += "\n    // Exceptions:"
            for exc in analysis.exceptions:
                comment += f"\n    //   - {exc}"
        
        if analysis.preconditions:
            comment += "\n    // Preconditions:"
            for pre in analysis.preconditions:
                comment += f"\n    //   - {pre}"
        
        comment += "\n"
        return comment
    
    def _generate_edge_case_comment(self, method: MethodInfo) -> str:
        """Generate edge case analysis comment"""
        comment = f"""    // Verifier: DeepSeek R1
    // Edge Case Testing for {method.name}
    // 
    // Test Scenarios:
    //   - Boundary values (empty, zero, maximum)
    //   - Invalid inputs
    //   - Exception conditions
    //   - Special cases
"""
        return comment
    
    def _generate_method_test(self, class_info: ClassInfo, method: MethodInfo,
                            header_content: str, cpp_content: str, 
                            method_comment: str) -> str:
        """Generate test with LLM"""
        if OLLAMA_AVAILABLE:
            # Create comprehensive prompt with analysis
            prompt = self._create_enhanced_prompt(
                class_info, method, header_content, cpp_content, method_comment
            )
            
            # Try LLM generation
            for attempt in range(self.retry_threshold):
                try:
                    test_code = self._call_llm(prompt)
                    
                    # Validate test code
                    if self._validate_test_code(test_code):
                        return test_code
                    
                except Exception as e:
                    self.logger.warning(f"LLM attempt {attempt + 1} failed: {e}")
        
        # Fallback to template
        return self._generate_template_test(class_info, method)
    
    def _generate_edge_case_test(self, class_info: ClassInfo, method: MethodInfo,
                                header_content: str, cpp_content: str,
                                edge_comment: str) -> str:
        """Generate edge case test"""
        if OLLAMA_AVAILABLE:
            try:
                prompt = self._create_edge_case_prompt(
                    class_info, method, header_content, cpp_content, edge_comment
                )
                test_code = self._call_llm(prompt)
                if self._validate_test_code(test_code):
                    return test_code
            except Exception as e:
                self.logger.warning(f"LLM edge case generation failed: {e}")
        
        return self._generate_template_edge_test(class_info, method)
    
    def _create_enhanced_prompt(self, class_info: ClassInfo, method: MethodInfo,
                              header_content: str, cpp_content: str,
                              method_comment: str) -> str:
        """Create enhanced prompt with full analysis"""
        analysis_text = ""
        if method.analysis:
            analysis_text = f"""
Method Analysis:
- Purpose: {method.analysis.purpose}
- Parameters: {', '.join([f"{p['name']} ({p['purpose']})" for p in method.analysis.parameters])}
- Returns: {method.analysis.return_info['meaning']}
- Side Effects: {', '.join(method.analysis.side_effects) or 'None'}
- Exceptions: {', '.join(method.analysis.exceptions) or 'None'}
- Dependencies: {', '.join(method.analysis.dependencies) or 'None'}
"""
        
        return f"""You are generating a unit test for a C++ method. This is a NEW conversation.

Class Context:
- Class: {class_info.name}
- Purpose: {class_info.purpose}
- Has {len(class_info.member_variables)} member variables
- Has {len(class_info.methods)} methods total

Method to Test: {method.name}
{analysis_text}

Header File:
```cpp
{header_content}
```

Implementation File:
```cpp
{cpp_content}
```

The test should verify:
1. Normal operation with typical inputs
2. Return values match expected results
3. Side effects occur as documented
4. Member variables are updated correctly
5. Proper interaction with dependencies

Generate ONLY the test body (what goes inside TEST_F). 
Start with the method analysis comment provided.
Use the 'obj' pointer to access the class instance.

Test body:"""
    
    def _call_llm(self, prompt: str) -> str:
        """Call Ollama with new session"""
        # Save prompt to temp file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write(prompt)
            prompt_file = f.name
        
        try:
            # Call Ollama (each call is a new session)
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
        """Validate generated test code"""
        required = ['obj->', 'EXPECT_', '// Verifier:', 'Arrange', 'Act', 'Assert']
        return sum(1 for r in required if r in test_code) >= 4
    
    def _needs_edge_case_test(self, method: MethodInfo) -> bool:
        """Check if method needs edge case testing"""
        # Based on analysis if available
        if method.analysis:
            return (len(method.analysis.exceptions) > 0 or
                   len(method.analysis.preconditions) > 0 or
                   len(method.parameters) > 0)
        
        # Fallback to simple check
        return len(method.parameters) > 0
    
    def _generate_template_test(self, class_info: ClassInfo, method: MethodInfo) -> str:
        """Generate template when LLM unavailable"""
        return f"""    
    // Arrange
    // TODO: Set up test data
    
    // Act
    // TODO: Call method
    {"auto result = " if method.return_type != "void" else ""}obj->{method.name}();
    
    // Assert
    // TODO: Verify results
    """
    
    def _generate_template_edge_test(self, class_info: ClassInfo, method: MethodInfo) -> str:
        """Generate edge case template"""
        return f"""    
    // Test edge cases
    // TODO: Test boundary values
    // TODO: Test invalid inputs
    // TODO: Test exceptions
    """
    
    def _create_edge_case_prompt(self, class_info: ClassInfo, method: MethodInfo,
                                header_content: str, cpp_content: str,
                                edge_comment: str) -> str:
        """Create prompt for edge case testing"""
        return f"""Generate edge case tests for {method.name} in {class_info.name}.

Focus on:
1. Empty or null inputs
2. Boundary values (0, -1, MAX values)
3. Invalid inputs that should throw exceptions
4. Special characters or formats
5. Resource limits

Method signature: {method.return_type} {method.name}({', '.join(method.parameters)})

Generate comprehensive edge case tests:"""

# ============================================================================
# Main Application
# ============================================================================

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='Enhanced C++ Test Generator with Deep Analysis'
    )
    parser.add_argument('source', help='C++ header file to generate tests for')
    parser.add_argument('-c', '--cpp', help='C++ implementation file', required=True)
    parser.add_argument('-o', '--output', default='tests', 
                      help='Output directory (default: tests)')
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
    
    # Check files exist
    if not os.path.exists(args.source):
        print(f"Error: Header file not found: {args.source}")
        sys.exit(1)
    
    if not os.path.exists(args.cpp):
        print(f"Error: Implementation file not found: {args.cpp}")
        sys.exit(1)
    
    # Deep analysis
    print(f"Performing deep analysis of {args.source}...")
    analyzer = CodeDeepAnalyzer()
    classes = analyzer.analyze_file(args.source, args.cpp)
    
    if not classes:
        print("No classes found in the file.")
        sys.exit(1)
    
    print(f"Found {len(classes)} class(es)")
    
    # Read source files for generator
    with open(args.source, 'r') as f:
        header_content = f.read()
    
    with open(args.cpp, 'r') as f:
        cpp_content = f.read()
    
    # Generate tests with new session per file
    generator = EnhancedTestGenerator(llm_model=args.model)
    output_dir = Path(args.output)
    
    for class_info in classes:
        print(f"\n{'='*60}")
        print(f"Generating tests for: {class_info.name}")
        print(f"Class purpose: {class_info.purpose}")
        print(f"Methods to test: {len(class_info.methods)}")
        print(f"Starting new chat session...")
        
        test_file = generator.generate_test_file(
            class_info, output_dir, header_content, cpp_content
        )
        
        print(f"Generated: {test_file}")
        print("Chat session closed.")
    
    print(f"\n{'='*60}")
    print("Test generation complete!")
    
    # Show example compilation
    print("\nTo compile the tests:")
    print(f"  g++ -std=c++14 {args.output}/*.cpp {args.cpp} -lgtest -lgtest_main -pthread")

if __name__ == '__main__':
    main()