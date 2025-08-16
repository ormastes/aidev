"""
Coverage Analyzer

Main coverage analysis functionality with branch coverage support.
"""

import os
import json
import subprocess
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple
from pathlib import Path
import coverage
from coverage.results import CoverageResults


@dataclass
class FileCoverage:
    """Coverage data for a single file."""
    file_path: str
    total_lines: int
    covered_lines: int
    missing_lines: List[int]
    excluded_lines: List[int]
    total_branches: int = 0
    covered_branches: int = 0
    missing_branches: List[Tuple[int, int]] = field(default_factory=list)
    line_coverage: float = 0.0
    branch_coverage: float = 0.0
    
    def __post_init__(self):
        """Calculate coverage percentages."""
        if self.total_lines > 0:
            self.line_coverage = (self.covered_lines / self.total_lines) * 100
        if self.total_branches > 0:
            self.branch_coverage = (self.covered_branches / self.total_branches) * 100


@dataclass
class DirectoryCoverage:
    """Coverage data for a directory."""
    dir_path: str
    files: List[FileCoverage]
    total_lines: int = 0
    covered_lines: int = 0
    total_branches: int = 0
    covered_branches: int = 0
    line_coverage: float = 0.0
    branch_coverage: float = 0.0
    
    def __post_init__(self):
        """Calculate aggregate coverage."""
        self.total_lines = sum(f.total_lines for f in self.files)
        self.covered_lines = sum(f.covered_lines for f in self.files)
        self.total_branches = sum(f.total_branches for f in self.files)
        self.covered_branches = sum(f.covered_branches for f in self.files)
        
        if self.total_lines > 0:
            self.line_coverage = (self.covered_lines / self.total_lines) * 100
        if self.total_branches > 0:
            self.branch_coverage = (self.covered_branches / self.total_branches) * 100


@dataclass
class CoverageResult:
    """Overall coverage result."""
    line_coverage: float
    branch_coverage: float
    class_coverage: float
    total_lines: int
    covered_lines: int
    missing_lines: int
    total_branches: int
    covered_branches: int
    missing_branches: int
    total_classes: int
    covered_classes: int
    files: List[FileCoverage]
    uncovered_files: List[str]
    coverage_data: Dict


class CoverageAnalyzer:
    """Analyzes Python code coverage including branch coverage."""
    
    def __init__(self, config_file: Optional[str] = None):
        """
        Initialize coverage analyzer.
        
        Args:
            config_file: Path to coverage configuration file
        """
        self.config_file = config_file or '.coveragerc'
        self.cov = None
        
    def run_with_coverage(self, test_path: str, source_path: str, 
                         branch: bool = True, parallel: bool = False) -> CoverageResult:
        """
        Run tests with coverage analysis.
        
        Args:
            test_path: Path to test directory or file
            source_path: Path to source code directory
            branch: Enable branch coverage
            parallel: Enable parallel coverage collection
            
        Returns:
            CoverageResult with coverage metrics
        """
        # Initialize coverage
        self.cov = coverage.Coverage(
            branch=branch,
            source=[source_path],
            config_file=self.config_file
        )
        
        if parallel:
            self.cov.config.parallel = True
        
        # Start coverage
        self.cov.start()
        
        try:
            # Run tests using pytest
            result = subprocess.run(
                ['pytest', test_path, '-v'],
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                print(f"Tests failed: {result.stderr}")
            
        finally:
            # Stop coverage
            self.cov.stop()
            self.cov.save()
        
        # Combine parallel coverage if needed
        if parallel:
            self.cov.combine()
        
        # Analyze results
        return self._analyze_coverage(source_path)
    
    def _analyze_coverage(self, source_path: str) -> CoverageResult:
        """Analyze collected coverage data."""
        # Get coverage data
        self.cov.load()
        coverage_data = self.cov.get_data()
        
        # Analyze files
        files = []
        total_lines = 0
        covered_lines = 0
        total_branches = 0
        covered_branches = 0
        uncovered_files = []
        
        source_path = Path(source_path)
        
        # Process each file
        for file_path in coverage_data.measured_files():
            if not file_path.startswith(str(source_path)):
                continue
            
            # Get line coverage
            analysis = self.cov.analysis2(file_path)
            executed = analysis[1]
            missing = analysis[3]
            excluded = analysis[4]
            
            # Calculate totals
            file_lines = len(executed) + len(missing)
            file_covered = len(executed)
            
            # Get branch coverage
            file_branches = 0
            file_covered_branches = 0
            missing_branches = []
            
            if self.cov.get_data().has_arcs():
                branch_stats = coverage_data.branch_stats()
                if file_path in branch_stats:
                    for line_num, branches in branch_stats[file_path].items():
                        for branch in branches:
                            file_branches += 1
                            if branch[2] > 0:  # Executed count
                                file_covered_branches += 1
                            else:
                                missing_branches.append((line_num, branch[1]))
            
            # Create file coverage
            file_cov = FileCoverage(
                file_path=file_path,
                total_lines=file_lines,
                covered_lines=file_covered,
                missing_lines=list(missing),
                excluded_lines=list(excluded) if excluded else [],
                total_branches=file_branches,
                covered_branches=file_covered_branches,
                missing_branches=missing_branches
            )
            
            files.append(file_cov)
            
            # Update totals
            total_lines += file_lines
            covered_lines += file_covered
            total_branches += file_branches
            covered_branches += file_covered_branches
            
            # Track uncovered files
            if file_covered == 0:
                uncovered_files.append(file_path)
        
        # Calculate percentages
        line_coverage = (covered_lines / total_lines * 100) if total_lines > 0 else 0
        branch_coverage = (covered_branches / total_branches * 100) if total_branches > 0 else 0
        
        # Get class coverage (will be calculated by ClassCoverageTracker)
        class_coverage = 0.0
        total_classes = 0
        covered_classes = 0
        
        # Create result
        return CoverageResult(
            line_coverage=line_coverage,
            branch_coverage=branch_coverage,
            class_coverage=class_coverage,
            total_lines=total_lines,
            covered_lines=covered_lines,
            missing_lines=total_lines - covered_lines,
            total_branches=total_branches,
            covered_branches=covered_branches,
            missing_branches=total_branches - covered_branches,
            total_classes=total_classes,
            covered_classes=covered_classes,
            files=files,
            uncovered_files=uncovered_files,
            coverage_data={}
        )
    
    def analyze_file(self, file_path: str, coverage_data: Optional[Dict] = None) -> FileCoverage:
        """
        Analyze coverage for a single file.
        
        Args:
            file_path: Path to Python file
            coverage_data: Optional pre-loaded coverage data
            
        Returns:
            FileCoverage object
        """
        if not coverage_data and self.cov:
            coverage_data = self.cov.get_data()
        
        if not coverage_data:
            raise ValueError("No coverage data available")
        
        # Get file analysis
        if file_path not in coverage_data.measured_files():
            # File not covered
            with open(file_path, 'r') as f:
                total_lines = len(f.readlines())
            
            return FileCoverage(
                file_path=file_path,
                total_lines=total_lines,
                covered_lines=0,
                missing_lines=list(range(1, total_lines + 1)),
                excluded_lines=[]
            )
        
        # Analyze covered file
        analysis = self.cov.analysis2(file_path)
        executed = analysis[1]
        missing = analysis[3]
        excluded = analysis[4] or []
        
        return FileCoverage(
            file_path=file_path,
            total_lines=len(executed) + len(missing),
            covered_lines=len(executed),
            missing_lines=list(missing),
            excluded_lines=list(excluded)
        )
    
    def analyze_directory(self, dir_path: str) -> DirectoryCoverage:
        """
        Analyze coverage for a directory.
        
        Args:
            dir_path: Path to directory
            
        Returns:
            DirectoryCoverage object
        """
        dir_path = Path(dir_path)
        files = []
        
        # Find all Python files
        for py_file in dir_path.rglob('*.py'):
            if '__pycache__' not in str(py_file):
                file_cov = self.analyze_file(str(py_file))
                files.append(file_cov)
        
        return DirectoryCoverage(
            dir_path=str(dir_path),
            files=files
        )
    
    def generate_report(self, result: CoverageResult, format: str, output: str):
        """
        Generate coverage report in specified format.
        
        Args:
            result: Coverage result
            format: Report format (html, json, xml, console)
            output: Output path
        """
        if format == 'html':
            self._generate_html_report(result, output)
        elif format == 'json':
            self._generate_json_report(result, output)
        elif format == 'xml':
            self._generate_xml_report(result, output)
        elif format == 'console':
            self._generate_console_report(result)
        else:
            raise ValueError(f"Unsupported format: {format}")
    
    def _generate_html_report(self, result: CoverageResult, output_dir: str):
        """Generate HTML coverage report."""
        if self.cov:
            self.cov.html_report(directory=output_dir)
        else:
            # Generate custom HTML report
            html = self._create_html_report(result)
            output_path = Path(output_dir) / 'index.html'
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_text(html)
    
    def _generate_json_report(self, result: CoverageResult, output_file: str):
        """Generate JSON coverage report."""
        report_data = {
            'line_coverage': result.line_coverage,
            'branch_coverage': result.branch_coverage,
            'class_coverage': result.class_coverage,
            'total_lines': result.total_lines,
            'covered_lines': result.covered_lines,
            'total_branches': result.total_branches,
            'covered_branches': result.covered_branches,
            'files': [
                {
                    'path': f.file_path,
                    'line_coverage': f.line_coverage,
                    'branch_coverage': f.branch_coverage,
                    'missing_lines': f.missing_lines,
                    'missing_branches': f.missing_branches
                }
                for f in result.files
            ],
            'uncovered_files': result.uncovered_files
        }
        
        with open(output_file, 'w') as f:
            json.dump(report_data, f, indent=2)
    
    def _generate_xml_report(self, result: CoverageResult, output_file: str):
        """Generate XML coverage report (Cobertura format)."""
        if self.cov:
            self.cov.xml_report(outfile=output_file)
    
    def _generate_console_report(self, result: CoverageResult):
        """Generate console coverage report."""
        print("\n" + "=" * 70)
        print("COVERAGE REPORT")
        print("=" * 70)
        print(f"Line Coverage:   {result.line_coverage:.2f}% ({result.covered_lines}/{result.total_lines})")
        print(f"Branch Coverage: {result.branch_coverage:.2f}% ({result.covered_branches}/{result.total_branches})")
        print(f"Class Coverage:  {result.class_coverage:.2f}% ({result.covered_classes}/{result.total_classes})")
        print("\nUncovered Files:")
        for file in result.uncovered_files[:10]:
            print(f"  - {file}")
        if len(result.uncovered_files) > 10:
            print(f"  ... and {len(result.uncovered_files) - 10} more")
        print("=" * 70)
    
    def _create_html_report(self, result: CoverageResult) -> str:
        """Create custom HTML report."""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Python Coverage Report</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                .summary {{ background: #f0f0f0; padding: 20px; border-radius: 5px; }}
                .metric {{ display: inline-block; margin: 10px 20px; }}
                .good {{ color: green; }}
                .warning {{ color: orange; }}
                .bad {{ color: red; }}
                table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background: #f0f0f0; }}
            </style>
        </head>
        <body>
            <h1>Python Coverage Report</h1>
            <div class="summary">
                <div class="metric">
                    <h3>Line Coverage</h3>
                    <p class="{'good' if result.line_coverage >= 90 else 'warning' if result.line_coverage >= 80 else 'bad'}">
                        {result.line_coverage:.2f}%
                    </p>
                </div>
                <div class="metric">
                    <h3>Branch Coverage</h3>
                    <p class="{'good' if result.branch_coverage >= 85 else 'warning' if result.branch_coverage >= 75 else 'bad'}">
                        {result.branch_coverage:.2f}%
                    </p>
                </div>
                <div class="metric">
                    <h3>Class Coverage</h3>
                    <p class="{'good' if result.class_coverage >= 95 else 'warning' if result.class_coverage >= 90 else 'bad'}">
                        {result.class_coverage:.2f}%
                    </p>
                </div>
            </div>
            
            <h2>File Coverage</h2>
            <table>
                <tr>
                    <th>File</th>
                    <th>Line Coverage</th>
                    <th>Branch Coverage</th>
                    <th>Missing Lines</th>
                </tr>
                {''.join(f'''
                <tr>
                    <td>{f.file_path}</td>
                    <td>{f.line_coverage:.2f}%</td>
                    <td>{f.branch_coverage:.2f}%</td>
                    <td>{len(f.missing_lines)}</td>
                </tr>
                ''' for f in result.files)}
            </table>
        </body>
        </html>
        """