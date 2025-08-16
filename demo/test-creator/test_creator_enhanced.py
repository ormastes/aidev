#!/usr/bin/env python3
"""
Enhanced C++ Test Creator with CMake integration

Requirements:
1. Use compile_commands.json from CMake build
2. Take src_dir and test_dir as arguments (not individual files)
3. Recursively search test_dir for *Test.cpp files
4. For each TestFile.cpp, find corresponding src file by removing 'Test' suffix
5. Generate comprehensive test cases using LLM if available
"""

import os
import sys
import json
import argparse
import logging
import subprocess
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import re


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


class TestGenerator:
    """Generate or enhance test files"""
    
    def __init__(self, compile_parser: CompileCommandsParser, build_command: str = ""):
        self.compile_parser = compile_parser
        self.build_command = build_command
        self.logger = logging.getLogger(__name__)
    
    def process_test_target(self, target: TestTarget) -> bool:
        """Process a single test target"""
        self.logger.info(f"Processing test target: {Path(target.test_file).name}")
        
        # Get compile information
        if target.source_file:
            target.compile_info = self.compile_parser.get_compile_info(target.source_file)
        elif target.header_file:
            target.compile_info = self.compile_parser.get_compile_info(target.header_file)
        
        # Check if test file exists and has content
        test_file_path = Path(target.test_file)
        if test_file_path.exists() and test_file_path.stat().st_size > 0:
            self.logger.info(f"Test file {test_file_path.name} already exists, enhancing...")
            return self._enhance_existing_test(target)
        else:
            self.logger.info(f"Creating new test file {test_file_path.name}")
            return self._create_new_test(target)
    
    def _create_new_test(self, target: TestTarget) -> bool:
        """Create a new test file from scratch"""
        test_content = self._generate_test_template(target)
        
        # Ensure directory exists
        Path(target.test_file).parent.mkdir(parents=True, exist_ok=True)
        
        # Write test file
        with open(target.test_file, 'w') as f:
            f.write(test_content)
        
        self.logger.info(f"Created test file: {target.test_file}")
        
        # Try to build to verify
        return self._verify_test_builds(target)
    
    def _enhance_existing_test(self, target: TestTarget) -> bool:
        """Enhance an existing test file"""
        # For now, just verify it builds
        # In a full implementation, this would use LLM to enhance tests
        return self._verify_test_builds(target)
    
    def _generate_test_template(self, target: TestTarget) -> str:
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
    // This is a placeholder test that should be enhanced
    EXPECT_TRUE(true);
}}

TEST_F({test_name}, EdgeCases) {{
    // TODO: Implement edge case tests
    // This is a placeholder test that should be enhanced
    EXPECT_TRUE(true);
}}

// TODO: Add more specific test cases based on the class methods
// Use the compile information and source analysis to generate comprehensive tests
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


class TestCreator:
    """Main test creator application"""
    
    def __init__(self, src_dir: str, test_dir: str, build_dir: str = "build", 
                 build_command: str = ""):
        self.src_dir = Path(src_dir)
        self.test_dir = Path(test_dir)
        self.build_dir = Path(build_dir)
        self.build_command = build_command
        
        # Validate directories
        if not self.src_dir.exists():
            raise ValueError(f"Source directory does not exist: {self.src_dir}")
        if not self.test_dir.exists():
            self.test_dir.mkdir(parents=True, exist_ok=True)
            logging.info(f"Created test directory: {self.test_dir}")
        
        # Initialize components
        self.compile_parser = CompileCommandsParser(self.build_dir)
        self.discovery = TestDiscovery(self.src_dir, self.test_dir)
        self.generator = TestGenerator(self.compile_parser, build_command)
    
    def run(self) -> bool:
        """Run the complete test creation process"""
        logging.info("Starting Enhanced C++ Test Creator")
        logging.info(f"Source directory: {self.src_dir}")
        logging.info(f"Test directory: {self.test_dir}")
        logging.info(f"Build directory: {self.build_dir}")
        
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
            logging.info("Test creation completed successfully!")
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
        description='Enhanced C++ Test Creator with CMake integration',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s src/ tests/ --build-dir build --build-command "cmake --build build"
  %(prog)s ./source ./test_cases -b ./build -c "make -j4"
  
The tool will:
  1. Scan test directory recursively for *Test.cpp files
  2. Find corresponding source files by removing 'Test' suffix
  3. Use compile_commands.json for compilation information
  4. Generate or enhance test files
  5. Verify tests build successfully
        """
    )
    
    parser.add_argument('src_dir', help='Source directory containing C++ source files')
    parser.add_argument('test_dir', help='Test directory containing *Test.cpp files')
    parser.add_argument('-b', '--build-dir', default='build',
                       help='Build directory containing compile_commands.json (default: build)')
    parser.add_argument('-c', '--build-command', default='',
                       help='Command to build tests (e.g., "cmake --build build")')
    parser.add_argument('-v', '--verbose', action='store_true',
                       help='Enable verbose logging')
    
    args = parser.parse_args()
    
    # Setup logging
    setup_logging(args.verbose)
    
    try:
        # Create and run test creator
        creator = TestCreator(
            src_dir=args.src_dir,
            test_dir=args.test_dir,
            build_dir=args.build_dir,
            build_command=args.build_command
        )
        
        success = creator.run()
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        print("\nOperation cancelled by user")
        sys.exit(1)
    except Exception as e:
        logging.error(f"Test creation failed: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()