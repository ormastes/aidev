#!/usr/bin/env python3
"""
Test Health Check Script for AI Development Platform
Analyzes and reports test status for all themes
Converted from shell script for better security and maintainability
"""

import os
import sys
import json
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple
from enum import Enum

# Colors for output
class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'  # No Color

class TestStatus(Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    TIMEOUT = "TIMEOUT"
    NO_PACKAGE = "NO_PACKAGE"
    NO_TEST_SCRIPT = "NO_TEST_SCRIPT"

class TestHealthChecker:
    def __init__(self):
        self.base_dir = Path("/home/ormastes/dev/aidev/layer/themes")
        self.total_themes = 0
        self.passing_themes = 0
        self.failing_themes = 0
        self.no_test_themes = 0
        self.timeout_themes = 0
        self.test_results: Dict[str, TestStatus] = {}
        
    def log_colored(self, message: str, color: str = Colors.NC):
        """Print colored message"""
        print(f"{color}{message}{Colors.NC}")
        
    def check_package_json(self, theme_dir: Path) -> bool:
        """Check if package.json exists"""
        return (theme_dir / "package.json").exists()
    
    def check_test_script(self, theme_dir: Path) -> bool:
        """Check if test script exists in package.json"""
        package_json_path = theme_dir / "package.json"
        if not package_json_path.exists():
            return False
            
        try:
            with open(package_json_path, 'r') as f:
                package_data = json.load(f)
                return "test" in package_data.get("scripts", {})
        except (json.JSONDecodeError, IOError):
            return False
    
    def run_tests(self, theme_dir: Path, theme_name: str) -> TestStatus:
        """Run tests with timeout"""
        try:
            # Run tests with 20 second timeout
            result = subprocess.run(
                ["bun", "test", "--silent"],
                cwd=theme_dir,
                capture_output=True,
                text=True,
                timeout=20
            )
            
            if result.returncode == 0:
                return TestStatus.PASS
            else:
                return TestStatus.FAIL
                
        except subprocess.TimeoutExpired:
            return TestStatus.TIMEOUT
        except Exception:
            return TestStatus.FAIL
    
    def check_coverage(self, theme_dir: Path) -> str:
        """Check test coverage if available"""
        try:
            result = subprocess.run(
                ["bun", "test", "--coverage", "--silent"],
                cwd=theme_dir,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            # Extract coverage information
            for line in result.stdout.split('\n'):
                if 'Coverage' in line:
                    return line
            
            return "No coverage data"
            
        except Exception:
            return "Coverage check failed"
    
    def analyze_theme(self, theme_path: Path) -> None:
        """Analyze a single theme"""
        theme_name = theme_path.name
        
        # Skip non-theme directories
        if theme_name in ["temp", ".vscode"]:
            return
            
        self.total_themes += 1
        
        print(f"Testing {theme_name}... ", end='')
        
        # Check package.json
        if not self.check_package_json(theme_path):
            self.log_colored("NO PACKAGE.JSON", Colors.YELLOW)
            self.no_test_themes += 1
            self.test_results[theme_name] = TestStatus.NO_PACKAGE
            return
        
        # Check test script
        if not self.check_test_script(theme_path):
            self.log_colored("NO TEST SCRIPT", Colors.YELLOW)
            self.no_test_themes += 1
            self.test_results[theme_name] = TestStatus.NO_TEST_SCRIPT
            return
        
        # Run tests
        test_status = self.run_tests(theme_path, theme_name)
        
        if test_status == TestStatus.TIMEOUT:
            self.log_colored("TIMEOUT", Colors.YELLOW)
            self.timeout_themes += 1
        elif test_status == TestStatus.PASS:
            self.log_colored("PASS", Colors.GREEN)
            self.passing_themes += 1
        else:
            self.log_colored("FAIL", Colors.RED)
            self.failing_themes += 1
        
        self.test_results[theme_name] = test_status
    
    def print_summary(self) -> None:
        """Print test health summary"""
        print("\n" + "=" * 48)
        print("TEST HEALTH SUMMARY")
        print("=" * 48 + "\n")
        
        if self.total_themes > 0:
            pass_pct = (self.passing_themes * 100) // self.total_themes
            fail_pct = (self.failing_themes * 100) // self.total_themes
            timeout_pct = (self.timeout_themes * 100) // self.total_themes
            no_test_pct = (self.no_test_themes * 100) // self.total_themes
        else:
            pass_pct = fail_pct = timeout_pct = no_test_pct = 0
        
        self.log_colored(f"Total Themes:    {self.total_themes}", Colors.BLUE)
        self.log_colored(f"Passing:         {self.passing_themes} ({pass_pct}%)", Colors.GREEN)
        self.log_colored(f"Failing:         {self.failing_themes} ({fail_pct}%)", Colors.RED)
        self.log_colored(f"Timeout:         {self.timeout_themes} ({timeout_pct}%)", Colors.YELLOW)
        self.log_colored(f"No Tests:        {self.no_test_themes} ({no_test_pct}%)", Colors.YELLOW)
        
        print()
        
        # Platform Health Score
        if self.total_themes > 0:
            health_score = (self.passing_themes * 100) // self.total_themes
        else:
            health_score = 0
            
        print("Platform Health Score: ", end='')
        if health_score >= 80:
            self.log_colored(f"{health_score}/100 (HEALTHY)", Colors.GREEN)
        elif health_score >= 50:
            self.log_colored(f"{health_score}/100 (NEEDS ATTENTION)", Colors.YELLOW)
        else:
            self.log_colored(f"{health_score}/100 (CRITICAL)", Colors.RED)
    
    def print_detailed_results(self) -> None:
        """Print detailed results by status"""
        print("\n" + "=" * 48)
        print("DETAILED RESULTS")
        print("=" * 48 + "\n")
        
        # Passing themes
        self.log_colored("PASSING THEMES:", Colors.GREEN)
        for theme, status in sorted(self.test_results.items()):
            if status == TestStatus.PASS:
                print(f"  ✓ {theme}")
        
        # Failing themes
        print()
        self.log_colored("FAILING THEMES:", Colors.RED)
        for theme, status in sorted(self.test_results.items()):
            if status == TestStatus.FAIL:
                print(f"  ✗ {theme}")
        
        # Timeout themes
        print()
        self.log_colored("TIMEOUT THEMES:", Colors.YELLOW)
        for theme, status in sorted(self.test_results.items()):
            if status == TestStatus.TIMEOUT:
                print(f"  ⏱ {theme}")
        
        # No test themes
        print()
        self.log_colored("NO TEST THEMES:", Colors.YELLOW)
        for theme, status in sorted(self.test_results.items()):
            if status in [TestStatus.NO_PACKAGE, TestStatus.NO_TEST_SCRIPT]:
                print(f"  ⚠ {theme} ({status.value})")
    
    def run(self) -> int:
        """Main execution"""
        print("=" * 48)
        print("AI Development Platform - Test Health Check")
        print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 48 + "\n")
        
        print("Analyzing themes...")
        print("=" * 18 + "\n")
        
        # Check if base directory exists
        if not self.base_dir.exists():
            self.log_colored(f"Error: Base directory {self.base_dir} not found", Colors.RED)
            return 1
        
        # Analyze each theme
        for theme_path in sorted(self.base_dir.iterdir()):
            if theme_path.is_dir():
                self.analyze_theme(theme_path)
        
        # Print summaries
        self.print_summary()
        self.print_detailed_results()
        
        print("\n" + "=" * 48)
        print("Report complete. Check individual themes for details.")
        print("=" * 48)
        
        # Return exit code based on health
        if self.total_themes > 0:
            health_score = (self.passing_themes * 100) // self.total_themes
            return 0 if health_score >= 50 else 1
        return 1

def main():
    """Main entry point"""
    checker = TestHealthChecker()
    sys.exit(checker.run())

if __name__ == "__main__":
    main()