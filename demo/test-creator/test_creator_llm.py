#!/usr/bin/env python3
"""
LLM-Enhanced C++ Test Creator with DeepSeek R1 integration

This version extends the enhanced test creator with Ollama DeepSeek R1 integration
for intelligent test case generation and implementation.
"""

import os
import sys
import json
import argparse
import logging
import subprocess
import requests
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import re
import time


@dataclass
class CompileInfo:
    """Information from compile_commands.json"""
    file_path: str
    compile_flags: List[str]
    include_dirs: List[str]
    defines: List[str]


@dataclass
class TestTarget:
    """Information about a test target"""
    test_file: str
    source_file: str
    header_file: str
    compile_info: Optional[CompileInfo]


class OllamaClient:
    """Client for interacting with Ollama DeepSeek R1"""
    
    def __init__(self, model_name: str = "deepseek-r1:7b", base_url: str = "http://localhost:11434"):
        self.model_name = model_name
        self.base_url = base_url
        self.logger = logging.getLogger(__name__)
    
    def generate_test_implementation(self, class_name: str, method_signature: str, 
                                   header_content: str, existing_test: str = "") -> str:
        """Generate test implementation using DeepSeek R1"""
        
        prompt = f"""You are an expert C++ test developer. Generate a comprehensive test implementation for the following:

Class: {class_name}
Method: {method_signature}

Header file content:
```cpp
{header_content}
```

Current test file content:
```cpp
{existing_test}
```

Requirements:
1. Use Google Test (gtest) framework
2. Use Google Mock (gmock) if needed for dependencies
3. Test both normal cases and edge cases
4. Include proper error handling tests
5. Use descriptive test names following the pattern: TEST_F(ClassNameTest, MethodName_Scenario)
6. Add meaningful assertions with EXPECT_* or ASSERT_*
7. Include setup and teardown if needed
8. Generate complete, compilable test code

Generate ONLY the test method implementation, not the entire file. Focus on comprehensive testing of the method.
"""

        try:
            response = requests.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model_name,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.3,
                        "top_p": 0.9,
                        "num_predict": 1000
                    }
                },
                timeout=60
            )
            
            if response.status_code == 200:
                result = response.json()
                generated_code = result.get('response', '').strip()
                self.logger.info(f"Generated test implementation for {class_name}::{method_signature}")
                return generated_code
            else:
                self.logger.error(f"Ollama API error: {response.status_code}")
                return ""
                
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Failed to connect to Ollama: {e}")
            return ""
        except Exception as e:
            self.logger.error(f"Error generating test: {e}")
            return ""
    
    def enhance_test_file(self, class_name: str, header_content: str, 
                         current_test_content: str) -> str:
        """Enhance an entire test file using DeepSeek R1"""
        
        prompt = f"""You are an expert C++ test developer. Enhance the following test file to be comprehensive and production-ready.

Class being tested: {class_name}

Header file content:
```cpp
{header_content}
```

Current test file:
```cpp
{current_test_content}
```

Requirements:
1. Analyze the header file to identify all public methods
2. Generate comprehensive test cases for each method
3. Include edge cases, error conditions, and boundary testing
4. Use Google Test and Google Mock best practices
5. Add proper setup/teardown methods
6. Use meaningful test names and descriptions
7. Include both positive and negative test scenarios
8. Ensure all tests are compilable and follow C++ best practices

Generate the complete enhanced test file with all necessary includes and test cases.
"""

        try:
            response = requests.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model_name,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.2,
                        "top_p": 0.8,
                        "num_predict": 2000
                    }
                },
                timeout=120
            )
            
            if response.status_code == 200:
                result = response.json()
                enhanced_code = result.get('response', '').strip()
                self.logger.info(f"Enhanced test file for {class_name}")
                return enhanced_code
            else:
                self.logger.error(f"Ollama API error: {response.status_code}")
                return current_test_content
                
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Failed to connect to Ollama: {e}")
            return current_test_content
        except Exception as e:
            self.logger.error(f"Error enhancing test: {e}")
            return current_test_content


class CompileCommandsParser:
    """Parse compile_commands.json for compilation information"""
    
    def __init__(self, build_dir: Path):
        self.build_dir = build_dir
        self.compile_commands_file = build_dir / "compile_commands.json"
        self.compile_db = {}
        self._load_compile_commands()
    
    def _load_compile_commands(self):
        """Load and parse compile_commands.json"""
        if not self.compile_commands_file.exists():
            logging.warning(f"compile_commands.json not found at {self.compile_commands_file}")
            return
        
        try:
            with open(self.compile_commands_file, 'r') as f:
                commands = json.load(f)
            
            for cmd in commands:
                file_path = Path(cmd['file']).resolve()
                compile_info = self._parse_compile_command(cmd)
                self.compile_db[str(file_path)] = compile_info
                
            logging.info(f"Loaded compile information for {len(self.compile_db)} files")
            
        except Exception as e:
            logging.error(f"Failed to parse compile_commands.json: {e}")
    
    def _parse_compile_command(self, cmd: dict) -> CompileInfo:
        """Parse a single compile command entry"""
        command = cmd.get('command', '')
        if not command and 'arguments' in cmd:
            command = ' '.join(cmd['arguments'])
        
        # Extract include directories
        include_dirs = []
        defines = []
        
        # Parse -I flags
        include_pattern = r'-I\s*([^\s]+)'
        for match in re.finditer(include_pattern, command):
            include_dirs.append(match.group(1))
        
        # Parse -D flags
        define_pattern = r'-D\s*([^\s]+)'
        for match in re.finditer(define_pattern, command):
            defines.append(match.group(1))
        
        # Extract all compile flags
        compile_flags = command.split()
        
        return CompileInfo(
            file_path=cmd['file'],
            compile_flags=compile_flags,
            include_dirs=include_dirs,
            defines=defines
        )
    
    def get_compile_info(self, file_path: str) -> Optional[CompileInfo]:
        """Get compile information for a specific file"""
        abs_path = str(Path(file_path).resolve())
        return self.compile_db.get(abs_path)


class TestDiscovery:
    """Discover test files and their corresponding source files"""
    
    def __init__(self, src_dir: Path, test_dir: Path):
        self.src_dir = src_dir
        self.test_dir = test_dir
    
    def discover_test_targets(self) -> List[TestTarget]:
        """Discover all test targets by scanning test directory"""
        test_targets = []
        
        # Recursively find all *Test.cpp files
        for test_file in self.test_dir.rglob("*Test.cpp"):
            source_file, header_file = self._find_corresponding_source(test_file)
            
            if source_file or header_file:
                test_targets.append(TestTarget(
                    test_file=str(test_file),
                    source_file=str(source_file) if source_file else "",
                    header_file=str(header_file) if header_file else "",
                    compile_info=None  # Will be filled later
                ))
                logging.info(f"Found test target: {test_file.name}")
            else:
                logging.warning(f"No corresponding source found for {test_file}")
        
        return test_targets
    
    def _find_corresponding_source(self, test_file: Path) -> Tuple[Optional[Path], Optional[Path]]:
        """Find corresponding .cpp and .h files for a test file"""
        # Remove 'Test' suffix from filename
        test_name = test_file.stem  # e.g., 'CalculatorTest'
        if test_name.endswith('Test'):
            base_name = test_name[:-4]  # e.g., 'Calculator'
        else:
            logging.warning(f"Test file {test_file} doesn't end with 'Test'")
            return None, None
        
        # Get relative path from test_dir to maintain directory structure
        rel_path = test_file.relative_to(self.test_dir).parent
        
        # Look for corresponding source files in src_dir with same relative path
        source_base = self.src_dir / rel_path / base_name
        
        # Try different combinations
        cpp_file = source_base.with_suffix('.cpp')
        h_file = source_base.with_suffix('.h')
        hpp_file = source_base.with_suffix('.hpp')
        
        # Also try in src_dir root
        root_cpp = self.src_dir / f"{base_name}.cpp"
        root_h = self.src_dir / f"{base_name}.h"
        root_hpp = self.src_dir / f"{base_name}.hpp"
        
        # Find existing files
        source_file = None
        header_file = None
        
        for candidate in [cpp_file, root_cpp]:
            if candidate.exists():
                source_file = candidate
                break
        
        for candidate in [h_file, hpp_file, root_h, root_hpp]:
            if candidate.exists():
                header_file = candidate
                break
        
        return source_file, header_file


class LLMTestGenerator:
    """Generate or enhance test files using LLM"""
    
    def __init__(self, compile_parser: CompileCommandsParser, build_command: str = "", 
                 use_llm: bool = True):
        self.compile_parser = compile_parser
        self.build_command = build_command
        self.use_llm = use_llm
        self.logger = logging.getLogger(__name__)
        
        if use_llm:
            self.ollama_client = OllamaClient()
        else:
            self.ollama_client = None
    
    def process_test_target(self, target: TestTarget) -> bool:
        """Process a single test target with LLM enhancement"""
        self.logger.info(f"Processing test target: {Path(target.test_file).name}")
        
        # Get compile information
        if target.source_file:
            target.compile_info = self.compile_parser.get_compile_info(target.source_file)
        elif target.header_file:
            target.compile_info = self.compile_parser.get_compile_info(target.header_file)
        
        # Check if test file exists and has content
        test_file_path = Path(target.test_file)
        if test_file_path.exists() and test_file_path.stat().st_size > 0:
            self.logger.info(f"Test file {test_file_path.name} exists, enhancing with LLM...")
            return self._enhance_existing_test_with_llm(target)
        else:
            self.logger.info(f"Creating new test file {test_file_path.name} with LLM...")
            return self._create_new_test_with_llm(target)
    
    def _create_new_test_with_llm(self, target: TestTarget) -> bool:
        """Create a new test file using LLM"""
        # First create basic template
        test_content = self._generate_basic_template(target)
        
        # Enhance with LLM if available
        if self.use_llm and self.ollama_client and target.header_file:
            try:
                header_content = Path(target.header_file).read_text()
                class_name = Path(target.test_file).stem[:-4]  # Remove 'Test' suffix
                
                enhanced_content = self.ollama_client.enhance_test_file(
                    class_name, header_content, test_content
                )
                
                if enhanced_content and enhanced_content != test_content:
                    test_content = enhanced_content
                    self.logger.info(f"LLM enhanced test file for {class_name}")
                else:
                    self.logger.warning(f"LLM enhancement failed, using basic template")
                    
            except Exception as e:
                self.logger.error(f"LLM enhancement error: {e}")
        
        # Write test file
        Path(target.test_file).parent.mkdir(parents=True, exist_ok=True)
        with open(target.test_file, 'w') as f:
            f.write(test_content)
        
        self.logger.info(f"Created test file: {target.test_file}")
        
        # Try to build to verify
        return self._verify_test_builds(target)
    
    def _enhance_existing_test_with_llm(self, target: TestTarget) -> bool:
        """Enhance an existing test file using LLM"""
        if not self.use_llm or not self.ollama_client or not target.header_file:
            return self._verify_test_builds(target)
        
        try:
            current_content = Path(target.test_file).read_text()
            header_content = Path(target.header_file).read_text()
            class_name = Path(target.test_file).stem[:-4]  # Remove 'Test' suffix
            
            enhanced_content = self.ollama_client.enhance_test_file(
                class_name, header_content, current_content
            )
            
            if enhanced_content and enhanced_content != current_content:
                # Backup original
                backup_file = Path(target.test_file).with_suffix('.cpp.backup')
                Path(target.test_file).rename(backup_file)
                
                # Write enhanced version
                with open(target.test_file, 'w') as f:
                    f.write(enhanced_content)
                
                self.logger.info(f"LLM enhanced existing test file for {class_name}")
                
                # Verify it builds
                if self._verify_test_builds(target):
                    # Success, remove backup
                    backup_file.unlink()
                    return True
                else:
                    # Build failed, restore backup
                    self.logger.warning(f"Enhanced test failed to build, restoring original")
                    Path(target.test_file).unlink()
                    backup_file.rename(target.test_file)
                    return False
            else:
                self.logger.info(f"No LLM enhancement needed for {class_name}")
                return self._verify_test_builds(target)
                
        except Exception as e:
            self.logger.error(f"LLM enhancement error: {e}")
            return self._verify_test_builds(target)
    
    def _generate_basic_template(self, target: TestTarget) -> str:
        """Generate a basic test template"""
        test_name = Path(target.test_file).stem
        class_name = test_name[:-4] if test_name.endswith('Test') else test_name
        
        includes = []
        if target.header_file:
            includes.append(f'#include "{Path(target.header_file).name}"')
        if target.source_file:
            # Sometimes we need to include the header, not the cpp
            header_name = Path(target.source_file).with_suffix('.h').name
            if header_name not in [Path(target.header_file).name if target.header_file else ""]:
                includes.append(f'#include "{header_name}"')
        
        include_section = '\n'.join(includes)
        
        content = f'''// Generated test file for {class_name}
#include <gtest/gtest.h>
#include <gmock/gmock.h>
{include_section}

using namespace testing;

class {test_name} : public ::testing::Test {{
protected:
    void SetUp() override {{
        // Test setup code
    }}
    
    void TearDown() override {{
        // Test cleanup code
    }}
}};

TEST_F({test_name}, BasicFunctionality) {{
    // TODO: Implement basic functionality test
    // This test will be enhanced by LLM
    EXPECT_TRUE(true);
}}

TEST_F({test_name}, EdgeCases) {{
    // TODO: Implement edge case tests
    // This test will be enhanced by LLM
    EXPECT_TRUE(true);
}}

// TODO: Add more specific test cases based on the class methods
// LLM will analyze the header file and generate comprehensive tests
'''
        return content
    
    def _verify_test_builds(self, target: TestTarget) -> bool:
        """Verify that the test file builds successfully"""
        if not self.build_command:
            self.logger.warning("No build command specified, skipping build verification")
            return True
        
        try:
            # Run build command
            result = subprocess.run(
                self.build_command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.returncode == 0:
                self.logger.info(f"Test {Path(target.test_file).name} builds successfully")
                return True
            else:
                self.logger.error(f"Build failed for {Path(target.test_file).name}:")
                self.logger.error(result.stderr)
                return False
                
        except subprocess.TimeoutExpired:
            self.logger.error(f"Build timeout for {Path(target.test_file).name}")
            return False
        except Exception as e:
            self.logger.error(f"Build error for {Path(target.test_file).name}: {e}")
            return False


class LLMTestCreator:
    """Main LLM-enhanced test creator application"""
    
    def __init__(self, src_dir: str, test_dir: str, build_dir: str = "build", 
                 build_command: str = "", use_llm: bool = True):
        self.src_dir = Path(src_dir)
        self.test_dir = Path(test_dir)
        self.build_dir = Path(build_dir)
        self.build_command = build_command
        self.use_llm = use_llm
        
        # Validate directories
        if not self.src_dir.exists():
            raise ValueError(f"Source directory does not exist: {self.src_dir}")
        if not self.test_dir.exists():
            self.test_dir.mkdir(parents=True, exist_ok=True)
            logging.info(f"Created test directory: {self.test_dir}")
        
        # Initialize components
        self.compile_parser = CompileCommandsParser(self.build_dir)
        self.discovery = TestDiscovery(self.src_dir, self.test_dir)
        self.generator = LLMTestGenerator(self.compile_parser, build_command, use_llm)
    
    def run(self) -> bool:
        """Run the complete LLM-enhanced test creation process"""
        logging.info("Starting LLM-Enhanced C++ Test Creator with DeepSeek R1")
        logging.info(f"Source directory: {self.src_dir}")
        logging.info(f"Test directory: {self.test_dir}")
        logging.info(f"Build directory: {self.build_dir}")
        logging.info(f"LLM enhancement: {'Enabled' if self.use_llm else 'Disabled'}")
        
        # Test Ollama connection if using LLM
        if self.use_llm:
            try:
                response = requests.get("http://localhost:11434/api/tags", timeout=5)
                if response.status_code == 200:
                    models = response.json().get('models', [])
                    deepseek_models = [m for m in models if 'deepseek' in m.get('name', '')]
                    if deepseek_models:
                        logging.info(f"Found DeepSeek models: {[m['name'] for m in deepseek_models]}")
                    else:
                        logging.warning("No DeepSeek models found, LLM enhancement may fail")
                else:
                    logging.warning("Could not connect to Ollama API")
            except Exception as e:
                logging.warning(f"Ollama connection test failed: {e}")
        
        # Discover test targets
        test_targets = self.discovery.discover_test_targets()
        if not test_targets:
            logging.warning("No test targets found")
            return False
        
        logging.info(f"Found {len(test_targets)} test targets")
        
        # Process each target
        success_count = 0
        for target in test_targets:
            try:
                if self.generator.process_test_target(target):
                    success_count += 1
            except Exception as e:
                logging.error(f"Failed to process {Path(target.test_file).name}: {e}")
        
        # Summary
        logging.info(f"Processed {success_count}/{len(test_targets)} test targets successfully")
        
        if success_count > 0:
            logging.info("LLM-enhanced test creation completed successfully!")
            if self.build_command:
                logging.info("Run your build command to compile the tests")
            return True
        else:
            logging.error("No test targets were processed successfully")
            return False


def setup_logging(verbose: bool):
    """Setup logging configuration"""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='LLM-Enhanced C++ Test Creator with DeepSeek R1',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s src/ tests/ --build-dir build --build-command "cmake --build build" --llm
  %(prog)s ./source ./test_cases -b ./build -c "make -j4" --no-llm --verbose
  
The tool will:
  1. Scan test directory recursively for *Test.cpp files
  2. Find corresponding source files by removing 'Test' suffix
  3. Use compile_commands.json for compilation information
  4. Generate or enhance test files using DeepSeek R1 LLM
  5. Verify tests build successfully
        """
    )
    
    parser.add_argument('src_dir', help='Source directory containing C++ source files')
    parser.add_argument('test_dir', help='Test directory containing *Test.cpp files')
    parser.add_argument('-b', '--build-dir', default='build',
                       help='Build directory containing compile_commands.json (default: build)')
    parser.add_argument('-c', '--build-command', default='',
                       help='Command to build tests (e.g., "cmake --build build")')
    parser.add_argument('--llm', action='store_true', default=True,
                       help='Enable LLM enhancement (default: enabled)')
    parser.add_argument('--no-llm', action='store_false', dest='llm',
                       help='Disable LLM enhancement')
    parser.add_argument('-v', '--verbose', action='store_true',
                       help='Enable verbose logging')
    
    args = parser.parse_args()
    
    # Setup logging
    setup_logging(args.verbose)
    
    try:
        # Create and run LLM test creator
        creator = LLMTestCreator(
            src_dir=args.src_dir,
            test_dir=args.test_dir,
            build_dir=args.build_dir,
            build_command=args.build_command,
            use_llm=args.llm
        )
        
        success = creator.run()
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        print("\nOperation cancelled by user")
        sys.exit(1)
    except Exception as e:
        logging.error(f"LLM test creation failed: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()