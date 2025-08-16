"""
Coverage Enforcer

Enforces coverage thresholds and generates badges.
"""

import json
import os
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from pathlib import Path
import tomli
import sys


@dataclass
class Threshold:
    """Coverage threshold configuration."""
    line_coverage: float = 90.0
    branch_coverage: float = 85.0
    class_coverage: float = 95.0
    file_coverage: float = 80.0
    fail_under: Optional[float] = None
    per_file_thresholds: Dict[str, float] = field(default_factory=dict)
    exclude_patterns: List[str] = field(default_factory=list)


@dataclass
class Violation:
    """Coverage threshold violation."""
    type: str  # line, branch, class, file
    actual: float
    threshold: float
    message: str
    file_path: Optional[str] = None


@dataclass
class EnforcementResult:
    """Result of coverage enforcement check."""
    passed: bool
    violations: List[Violation]
    line_coverage: float
    branch_coverage: float
    class_coverage: float
    summary: str


class CoverageEnforcer:
    """Enforces coverage thresholds for Python projects."""
    
    def __init__(self, config_file: Optional[str] = None):
        """
        Initialize coverage enforcer.
        
        Args:
            config_file: Path to configuration file (pyproject.toml or .coveragerc)
        """
        self.config_file = config_file
        self.thresholds = Threshold()
        
        if config_file:
            self.load_config(config_file)
    
    def load_config(self, config_file: str):
        """Load threshold configuration from file."""
        if config_file.endswith('.toml'):
            self._load_toml_config(config_file)
        elif config_file.endswith('.json'):
            self._load_json_config(config_file)
        else:
            self._load_ini_config(config_file)
    
    def _load_toml_config(self, config_file: str):
        """Load configuration from pyproject.toml."""
        with open(config_file, 'rb') as f:
            config = tomli.load(f)
        
        # Look for coverage configuration
        coverage_config = config.get('tool', {}).get('python-coverage', {})
        thresholds = coverage_config.get('thresholds', {})
        
        self.thresholds.line_coverage = thresholds.get('line', 90.0)
        self.thresholds.branch_coverage = thresholds.get('branch', 85.0)
        self.thresholds.class_coverage = thresholds.get('class', 95.0)
        self.thresholds.file_coverage = thresholds.get('file', 80.0)
        self.thresholds.fail_under = coverage_config.get('fail_under')
        self.thresholds.per_file_thresholds = coverage_config.get('per_file', {})
        self.thresholds.exclude_patterns = coverage_config.get('exclude', [])
    
    def _load_json_config(self, config_file: str):
        """Load configuration from JSON file."""
        with open(config_file, 'r') as f:
            config = json.load(f)
        
        thresholds = config.get('thresholds', {})
        self.thresholds.line_coverage = thresholds.get('line', 90.0)
        self.thresholds.branch_coverage = thresholds.get('branch', 85.0)
        self.thresholds.class_coverage = thresholds.get('class', 95.0)
        self.thresholds.file_coverage = thresholds.get('file', 80.0)
        self.thresholds.fail_under = config.get('fail_under')
        self.thresholds.per_file_thresholds = config.get('per_file', {})
        self.thresholds.exclude_patterns = config.get('exclude', [])
    
    def _load_ini_config(self, config_file: str):
        """Load configuration from .coveragerc."""
        import configparser
        
        config = configparser.ConfigParser()
        config.read(config_file)
        
        if 'coverage:thresholds' in config:
            section = config['coverage:thresholds']
            self.thresholds.line_coverage = float(section.get('line', 90.0))
            self.thresholds.branch_coverage = float(section.get('branch', 85.0))
            self.thresholds.class_coverage = float(section.get('class', 95.0))
            self.thresholds.file_coverage = float(section.get('file', 80.0))
            self.thresholds.fail_under = float(section.get('fail_under')) if 'fail_under' in section else None
    
    def set_thresholds(self, line_coverage: Optional[float] = None,
                      branch_coverage: Optional[float] = None,
                      class_coverage: Optional[float] = None,
                      file_coverage: Optional[float] = None,
                      fail_under: Optional[float] = None):
        """
        Set coverage thresholds programmatically.
        
        Args:
            line_coverage: Minimum line coverage percentage
            branch_coverage: Minimum branch coverage percentage
            class_coverage: Minimum class coverage percentage
            file_coverage: Minimum per-file coverage percentage
            fail_under: Overall coverage threshold to fail
        """
        if line_coverage is not None:
            self.thresholds.line_coverage = line_coverage
        if branch_coverage is not None:
            self.thresholds.branch_coverage = branch_coverage
        if class_coverage is not None:
            self.thresholds.class_coverage = class_coverage
        if file_coverage is not None:
            self.thresholds.file_coverage = file_coverage
        if fail_under is not None:
            self.thresholds.fail_under = fail_under
    
    def check_coverage(self, coverage_file: str) -> EnforcementResult:
        """
        Check if coverage meets thresholds.
        
        Args:
            coverage_file: Path to coverage data file (JSON format)
            
        Returns:
            EnforcementResult with pass/fail status and violations
        """
        # Load coverage data
        with open(coverage_file, 'r') as f:
            coverage_data = json.load(f)
        
        violations = []
        
        # Extract metrics
        line_coverage = coverage_data.get('line_coverage', 0)
        branch_coverage = coverage_data.get('branch_coverage', 0)
        class_coverage = coverage_data.get('class_coverage', 0)
        
        # Check line coverage
        if line_coverage < self.thresholds.line_coverage:
            violations.append(Violation(
                type='line',
                actual=line_coverage,
                threshold=self.thresholds.line_coverage,
                message=f"Line coverage {line_coverage:.2f}% is below threshold {self.thresholds.line_coverage:.2f}%"
            ))
        
        # Check branch coverage
        if branch_coverage < self.thresholds.branch_coverage:
            violations.append(Violation(
                type='branch',
                actual=branch_coverage,
                threshold=self.thresholds.branch_coverage,
                message=f"Branch coverage {branch_coverage:.2f}% is below threshold {self.thresholds.branch_coverage:.2f}%"
            ))
        
        # Check class coverage
        if class_coverage < self.thresholds.class_coverage:
            violations.append(Violation(
                type='class',
                actual=class_coverage,
                threshold=self.thresholds.class_coverage,
                message=f"Class coverage {class_coverage:.2f}% is below threshold {self.thresholds.class_coverage:.2f}%"
            ))
        
        # Check per-file coverage
        files = coverage_data.get('files', [])
        for file_data in files:
            file_path = file_data.get('path', '')
            file_coverage = file_data.get('line_coverage', 0)
            
            # Skip excluded files
            if any(pattern in file_path for pattern in self.thresholds.exclude_patterns):
                continue
            
            # Check against per-file threshold
            threshold = self.thresholds.per_file_thresholds.get(
                file_path, self.thresholds.file_coverage
            )
            
            if file_coverage < threshold:
                violations.append(Violation(
                    type='file',
                    actual=file_coverage,
                    threshold=threshold,
                    message=f"File {file_path} coverage {file_coverage:.2f}% is below threshold {threshold:.2f}%",
                    file_path=file_path
                ))
        
        # Check fail_under threshold
        if self.thresholds.fail_under:
            overall_coverage = line_coverage  # Or could be a weighted average
            if overall_coverage < self.thresholds.fail_under:
                violations.append(Violation(
                    type='overall',
                    actual=overall_coverage,
                    threshold=self.thresholds.fail_under,
                    message=f"Overall coverage {overall_coverage:.2f}% is below fail_under threshold {self.thresholds.fail_under:.2f}%"
                ))
        
        # Create result
        passed = len(violations) == 0
        summary = "Coverage check passed" if passed else f"Coverage check failed with {len(violations)} violations"
        
        return EnforcementResult(
            passed=passed,
            violations=violations,
            line_coverage=line_coverage,
            branch_coverage=branch_coverage,
            class_coverage=class_coverage,
            summary=summary
        )
    
    def generate_badge(self, coverage: float, output_file: str, 
                      badge_type: str = 'line'):
        """
        Generate coverage badge SVG.
        
        Args:
            coverage: Coverage percentage
            output_file: Output SVG file path
            badge_type: Type of badge (line, branch, class)
        """
        # Determine color based on coverage
        if coverage >= 90:
            color = '#4c1'  # Green
        elif coverage >= 80:
            color = '#97ca00'  # Light green
        elif coverage >= 70:
            color = '#dfb317'  # Yellow
        elif coverage >= 60:
            color = '#fe7d37'  # Orange
        else:
            color = '#e05d44'  # Red
        
        # Badge label
        label = f"{badge_type} coverage"
        
        # Create SVG
        svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="114" height="20">
        <linearGradient id="b" x2="0" y2="100%">
            <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
            <stop offset="1" stop-opacity=".1"/>
        </linearGradient>
        <mask id="a">
            <rect width="114" height="20" rx="3" fill="#fff"/>
        </mask>
        <g mask="url(#a)">
            <path fill="#555" d="M0 0h79v20H0z"/>
            <path fill="{color}" d="M79 0h35v20H79z"/>
            <path fill="url(#b)" d="M0 0h114v20H0z"/>
        </g>
        <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
            <text x="39.5" y="15" fill="#010101" fill-opacity=".3">{label}</text>
            <text x="39.5" y="14">{label}</text>
            <text x="95.5" y="15" fill="#010101" fill-opacity=".3">{coverage:.0f}%</text>
            <text x="95.5" y="14">{coverage:.0f}%</text>
        </g>
        </svg>"""
        
        # Write SVG file
        with open(output_file, 'w') as f:
            f.write(svg)
    
    def enforce_diff_coverage(self, base_coverage: str, head_coverage: str,
                            min_improvement: float = 0.0) -> EnforcementResult:
        """
        Enforce coverage improvement between base and head.
        
        Args:
            base_coverage: Path to base coverage file
            head_coverage: Path to head coverage file
            min_improvement: Minimum coverage improvement required
            
        Returns:
            EnforcementResult
        """
        # Load coverage data
        with open(base_coverage, 'r') as f:
            base_data = json.load(f)
        with open(head_coverage, 'r') as f:
            head_data = json.load(f)
        
        violations = []
        
        # Compare coverage metrics
        base_line = base_data.get('line_coverage', 0)
        head_line = head_data.get('line_coverage', 0)
        line_diff = head_line - base_line
        
        if line_diff < min_improvement:
            violations.append(Violation(
                type='diff',
                actual=line_diff,
                threshold=min_improvement,
                message=f"Line coverage change {line_diff:+.2f}% is below minimum improvement {min_improvement:.2f}%"
            ))
        
        base_branch = base_data.get('branch_coverage', 0)
        head_branch = head_data.get('branch_coverage', 0)
        branch_diff = head_branch - base_branch
        
        if branch_diff < min_improvement:
            violations.append(Violation(
                type='diff',
                actual=branch_diff,
                threshold=min_improvement,
                message=f"Branch coverage change {branch_diff:+.2f}% is below minimum improvement {min_improvement:.2f}%"
            ))
        
        # Check for new uncovered code
        head_files = {f['path']: f for f in head_data.get('files', [])}
        base_files = {f['path']: f for f in base_data.get('files', [])}
        
        for file_path, file_data in head_files.items():
            if file_path in base_files:
                base_file_coverage = base_files[file_path].get('line_coverage', 0)
                head_file_coverage = file_data.get('line_coverage', 0)
                
                if head_file_coverage < base_file_coverage:
                    violations.append(Violation(
                        type='file_regression',
                        actual=head_file_coverage,
                        threshold=base_file_coverage,
                        message=f"File {file_path} coverage decreased from {base_file_coverage:.2f}% to {head_file_coverage:.2f}%",
                        file_path=file_path
                    ))
        
        passed = len(violations) == 0
        summary = f"Coverage improved by {line_diff:+.2f}%" if passed else f"Coverage enforcement failed with {len(violations)} violations"
        
        return EnforcementResult(
            passed=passed,
            violations=violations,
            line_coverage=head_line,
            branch_coverage=head_branch,
            class_coverage=head_data.get('class_coverage', 0),
            summary=summary
        )
    
    def print_report(self, result: EnforcementResult):
        """Print enforcement result to console."""
        # Use colors if available
        try:
            from colorama import init, Fore, Style
            init()
            RED = Fore.RED
            GREEN = Fore.GREEN
            YELLOW = Fore.YELLOW
            RESET = Style.RESET_ALL
        except ImportError:
            RED = GREEN = YELLOW = RESET = ''
        
        print("\n" + "=" * 70)
        print("COVERAGE ENFORCEMENT REPORT")
        print("=" * 70)
        
        # Print summary
        if result.passed:
            print(f"{GREEN}✓ {result.summary}{RESET}")
        else:
            print(f"{RED}✗ {result.summary}{RESET}")
        
        # Print metrics
        print(f"\nCoverage Metrics:")
        print(f"  Line Coverage:   {self._format_coverage(result.line_coverage, self.thresholds.line_coverage)}")
        print(f"  Branch Coverage: {self._format_coverage(result.branch_coverage, self.thresholds.branch_coverage)}")
        print(f"  Class Coverage:  {self._format_coverage(result.class_coverage, self.thresholds.class_coverage)}")
        
        # Print violations
        if result.violations:
            print(f"\n{RED}Violations:{RESET}")
            for violation in result.violations:
                print(f"  - {violation.message}")
                if violation.file_path:
                    print(f"    File: {violation.file_path}")
        
        print("=" * 70)
        
        # Exit with error code if failed
        if not result.passed:
            sys.exit(1)
    
    def _format_coverage(self, actual: float, threshold: float) -> str:
        """Format coverage value with color based on threshold."""
        try:
            from colorama import Fore, Style
            if actual >= threshold:
                return f"{Fore.GREEN}{actual:.2f}%{Style.RESET_ALL} (threshold: {threshold:.2f}%)"
            else:
                return f"{Fore.RED}{actual:.2f}%{Style.RESET_ALL} (threshold: {threshold:.2f}%)"
        except ImportError:
            status = "✓" if actual >= threshold else "✗"
            return f"{actual:.2f}% {status} (threshold: {threshold:.2f}%)"