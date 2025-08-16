#!/usr/bin/env python3
"""
Enhanced LLM Test Creator with Retry Mechanism

Key improvements:
1. Mock-less approach - uses real objects, not mocks
2. Compilation verification with LLM retry
3. Clear input/output tracking
4. Up to 10 retry attempts on compilation failure
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
class TestTarget:
    """Information about a test target"""
    test_file: str
    source_file: str
    header_file: str
    input_content: str = ""    # Original test content
    output_content: str = ""   # LLM-generated content
    build_attempts: int = 0    # Number of build attempts
    build_errors: List[str] = None   # Build error messages
    
    def __post_init__(self):
        if self.build_errors is None:
            self.build_errors = []


class OllamaClient:
    """Client for interacting with Ollama DeepSeek R1"""
    
    def __init__(self, model_name: str = "deepseek-r1:7b", base_url: str = "http://localhost:11434"):
        self.model_name = model_name
        self.base_url = base_url
        self.logger = logging.getLogger(__name__)
    
    def generate_test_with_retry(self, class_name: str, header_content: str, 
                               current_test: str = "", build_errors: List[str] = None,
                               attempt: int = 1) -> str:
        """Generate test with compilation error feedback for retry"""
        
        # Build the prompt based on attempt number
        if attempt == 1:
            prompt = self._create_initial_prompt(class_name, header_content, current_test)
        else:
            prompt = self._create_retry_prompt(class_name, header_content, current_test, 
                                             build_errors, attempt)
        
        try:
            response = requests.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model_name,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.2 if attempt == 1 else 0.3,  # Slightly more creative on retry
                        "top_p": 0.8,
                        "num_predict": 2000
                    }
                },
                timeout=120
            )
            
            if response.status_code == 200:
                result = response.json()
                generated_code = result.get('response', '').strip()
                
                # Clean up the response (remove thinking tags if present)
                generated_code = self._clean_llm_output(generated_code)
                
                self.logger.info(f"Generated test (attempt {attempt}) for {class_name}")
                return generated_code
            else:
                self.logger.error(f"Ollama API error: {response.status_code}")
                return current_test
                
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Failed to connect to Ollama: {e}")
            return current_test
        except Exception as e:
            self.logger.error(f"Error generating test: {e}")
            return current_test
    
    def _create_initial_prompt(self, class_name: str, header_content: str, current_test: str) -> str:
        """Create initial prompt for test generation"""
        return f"""You are an expert C++ test developer. Generate a comprehensive, mock-less test file for the class '{class_name}'.

IMPORTANT REQUIREMENTS:
1. Create a COMPLETE, COMPILABLE test file (not just snippets)
2. Use REAL objects, NOT mocks - this is a mock-less testing approach
3. Use Google Test (gtest) framework only
4. Include ALL necessary headers and using statements
5. Test ALL public methods with multiple scenarios
6. Include edge cases and error handling
7. Use proper EXPECT_* macros with correct syntax

Header file content:
```cpp
{header_content}
```

Current test file (if any):
```cpp
{current_test}
```

Generate a complete, production-ready test file that compiles without errors."""

    def _create_retry_prompt(self, class_name: str, header_content: str, current_test: str,
                           build_errors: List[str], attempt: int) -> str:
        """Create retry prompt with build error feedback"""
        error_summary = "\n".join(build_errors[-3:])  # Last 3 errors
        
        return f"""The previous test file for '{class_name}' failed to compile. Please fix the compilation errors.

COMPILATION ERRORS (attempt {attempt-1}):
{error_summary}

REQUIREMENTS:
1. Fix ALL compilation errors shown above
2. Ensure ALL includes are correct
3. Use proper C++ syntax and GTest macros
4. Keep the mock-less approach (use real objects)
5. Make sure all referenced methods actually exist in the class
6. Use correct namespace and class names

Header file:
```cpp
{header_content}
```

Previous test file that failed:
```cpp
{current_test}
```

Generate a CORRECTED, compilable test file."""

    def _clean_llm_output(self, output: str) -> str:
        """Clean up LLM output by removing thinking tags and extra text"""
        # Remove <think> tags and content
        output = re.sub(r'<think>.*?</think>', '', output, flags=re.DOTALL)
        
        # Remove any text before the first #include
        lines = output.split('\n')
        start_idx = 0
        for i, line in enumerate(lines):
            if line.strip().startswith('#include') or line.strip().startswith('//'):
                start_idx = i
                break
        
        if start_idx > 0:
            output = '\n'.join(lines[start_idx:])
        
        # Remove any text after the last }
        lines = output.split('\n')
        end_idx = len(lines)
        for i in range(len(lines) - 1, -1, -1):
            if lines[i].strip() == '}' and i > 0:
                end_idx = i + 1
                break
        
        return '\n'.join(lines[:end_idx]).strip()


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
                # Read input content if file exists
                input_content = ""
                if test_file.exists() and test_file.stat().st_size > 0:
                    input_content = test_file.read_text()
                
                test_targets.append(TestTarget(
                    test_file=str(test_file),
                    source_file=str(source_file) if source_file else "",
                    header_file=str(header_file) if header_file else "",
                    input_content=input_content
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


class RetryTestGenerator:
    """Generate test files with retry mechanism on compilation failure"""
    
    def __init__(self, build_command: str = "", max_retries: int = 10):
        self.build_command = build_command
        self.max_retries = max_retries
        self.logger = logging.getLogger(__name__)
        self.ollama_client = OllamaClient()
    
    def process_test_target(self, target: TestTarget) -> bool:
        """Process a single test target with retry mechanism"""
        self.logger.info(f"Processing test target: {Path(target.test_file).name}")
        
        if not target.header_file:
            self.logger.warning(f"No header file found for {target.test_file}")
            return False
        
        # Read header content
        try:
            header_content = Path(target.header_file).read_text()
        except Exception as e:
            self.logger.error(f"Failed to read header file {target.header_file}: {e}")
            return False
        
        class_name = Path(target.test_file).stem[:-4]  # Remove 'Test' suffix
        current_content = target.input_content
        
        # Try generating and building test up to max_retries times
        for attempt in range(1, self.max_retries + 1):
            self.logger.info(f"Attempt {attempt}/{self.max_retries} for {class_name}")
            
            # Generate test content using LLM
            generated_content = self.ollama_client.generate_test_with_retry(
                class_name=class_name,
                header_content=header_content,
                current_test=current_content,
                build_errors=target.build_errors,
                attempt=attempt
            )
            
            if not generated_content or generated_content == current_content:
                self.logger.warning(f"LLM generated no new content for attempt {attempt}")
                continue
            
            # Save generated content
            target.output_content = generated_content
            target.build_attempts = attempt
            
            # Write to test file
            try:
                with open(target.test_file, 'w') as f:
                    f.write(generated_content)
                self.logger.info(f"Wrote test file: {target.test_file}")
            except Exception as e:
                self.logger.error(f"Failed to write test file: {e}")
                continue
            
            # Try to build
            if self._verify_test_builds(target):
                self.logger.info(f"✅ SUCCESS: Test builds after {attempt} attempts")
                return True
            else:
                self.logger.warning(f"❌ Build failed on attempt {attempt}")
                current_content = generated_content  # Use this as base for next attempt
        
        self.logger.error(f"❌ FAILED: Could not generate compilable test after {self.max_retries} attempts")
        return False
    
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
                timeout=60,
                cwd=Path(target.test_file).parent.parent  # Go to project root
            )
            
            if result.returncode == 0:
                self.logger.info(f"✅ Build successful for {Path(target.test_file).name}")
                return True
            else:
                # Capture build errors for retry
                error_msg = f"Build failed:\nSTDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}"
                target.build_errors.append(error_msg)
                self.logger.error(f"❌ Build failed for {Path(target.test_file).name}")
                self.logger.error(f"Error: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            error_msg = "Build timeout after 60 seconds"
            target.build_errors.append(error_msg)
            self.logger.error(f"❌ Build timeout for {Path(target.test_file).name}")
            return False
        except Exception as e:
            error_msg = f"Build error: {str(e)}"
            target.build_errors.append(error_msg)
            self.logger.error(f"❌ Build error for {Path(target.test_file).name}: {e}")
            return False


class RetryTestCreator:
    """Main test creator with retry mechanism"""
    
    def __init__(self, src_dir: str, test_dir: str, build_command: str = "", max_retries: int = 10):
        self.src_dir = Path(src_dir)
        self.test_dir = Path(test_dir)
        self.build_command = build_command
        self.max_retries = max_retries
        
        # Validate directories
        if not self.src_dir.exists():
            raise ValueError(f"Source directory does not exist: {self.src_dir}")
        if not self.test_dir.exists():
            self.test_dir.mkdir(parents=True, exist_ok=True)
            logging.info(f"Created test directory: {self.test_dir}")
        
        # Initialize components
        self.discovery = TestDiscovery(self.src_dir, self.test_dir)
        self.generator = RetryTestGenerator(build_command, max_retries)
    
    def run(self) -> bool:
        """Run the complete test creation process with retry"""
        logging.info("🚀 Starting Mock-less Test Creator with LLM Retry")
        logging.info(f"📁 Source directory: {self.src_dir}")
        logging.info(f"🧪 Test directory: {self.test_dir}")
        logging.info(f"🔧 Build command: {self.build_command or 'None (skip build verification)'}")
        logging.info(f"🔄 Max retries: {self.max_retries}")
        
        # Test Ollama connection
        try:
            response = requests.get("http://localhost:11434/api/tags", timeout=5)
            if response.status_code == 200:
                models = response.json().get('models', [])
                deepseek_models = [m for m in models if 'deepseek' in m.get('name', '')]
                if deepseek_models:
                    logging.info(f"🤖 Found DeepSeek models: {[m['name'] for m in deepseek_models]}")
                else:
                    logging.warning("⚠️ No DeepSeek models found")
            else:
                logging.warning("⚠️ Could not connect to Ollama API")
        except Exception as e:
            logging.warning(f"⚠️ Ollama connection test failed: {e}")
        
        # Discover test targets
        test_targets = self.discovery.discover_test_targets()
        if not test_targets:
            logging.warning("❌ No test targets found")
            return False
        
        logging.info(f"📋 Found {len(test_targets)} test targets")
        
        # Process each target
        success_count = 0
        total_attempts = 0
        
        for target in test_targets:
            try:
                logging.info(f"\n{'='*60}")
                logging.info(f"🎯 Processing: {Path(target.test_file).name}")
                logging.info(f"📥 Input size: {len(target.input_content)} chars")
                
                if self.generator.process_test_target(target):
                    success_count += 1
                    logging.info(f"📤 Output size: {len(target.output_content)} chars")
                    logging.info(f"🔢 Build attempts: {target.build_attempts}")
                
                total_attempts += target.build_attempts
                
            except Exception as e:
                logging.error(f"❌ Failed to process {Path(target.test_file).name}: {e}")
        
        # Summary
        logging.info(f"\n{'='*60}")
        logging.info(f"📊 SUMMARY")
        logging.info(f"✅ Successful: {success_count}/{len(test_targets)} test files")
        logging.info(f"🔄 Total LLM attempts: {total_attempts}")
        logging.info(f"📈 Average attempts per file: {total_attempts/len(test_targets):.1f}")
        
        if success_count > 0:
            logging.info("🎉 Mock-less test creation completed successfully!")
            return True
        else:
            logging.error("❌ No test targets were processed successfully")
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
        description='Mock-less C++ Test Creator with LLM Retry Mechanism',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s src/ tests/ --build-command "make test" --max-retries 5
  %(prog)s ./source ./test_cases -c "cmake --build build" -r 10 --verbose
  
Features:
  • Mock-less testing (uses real objects, not mocks)
  • Automatic compilation verification
  • LLM retry up to 10 times on build failure
  • Clear input/output tracking
  • Comprehensive error reporting
        """
    )
    
    parser.add_argument('src_dir', help='Source directory containing C++ source files')
    parser.add_argument('test_dir', help='Test directory containing *Test.cpp files')
    parser.add_argument('-c', '--build-command', default='',
                       help='Command to build tests (e.g., "cmake --build build")')
    parser.add_argument('-r', '--max-retries', type=int, default=10,
                       help='Maximum LLM retry attempts on build failure (default: 10)')
    parser.add_argument('-v', '--verbose', action='store_true',
                       help='Enable verbose logging')
    
    args = parser.parse_args()
    
    # Setup logging
    setup_logging(args.verbose)
    
    try:
        # Create and run retry test creator
        creator = RetryTestCreator(
            src_dir=args.src_dir,
            test_dir=args.test_dir,
            build_command=args.build_command,
            max_retries=args.max_retries
        )
        
        success = creator.run()
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        print("\n❌ Operation cancelled by user")
        sys.exit(1)
    except Exception as e:
        logging.error(f"❌ Test creation failed: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()