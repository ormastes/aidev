"""
Class Coverage Tracker

Tracks coverage at the class and method level for Python code.
"""

import ast
import os
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple
from pathlib import Path
import coverage


@dataclass
class MethodCoverage:
    """Coverage data for a single method."""
    name: str
    class_name: str
    start_line: int
    end_line: int
    total_lines: int
    covered_lines: int
    missing_lines: List[int]
    coverage_percentage: float = 0.0
    is_constructor: bool = False
    is_static: bool = False
    is_class_method: bool = False
    is_property: bool = False
    
    def __post_init__(self):
        """Calculate coverage percentage."""
        if self.total_lines > 0:
            self.coverage_percentage = (self.covered_lines / self.total_lines) * 100


@dataclass
class ClassMetrics:
    """Coverage metrics for a single class."""
    name: str
    file_path: str
    start_line: int
    end_line: int
    total_methods: int
    covered_methods: int
    partially_covered_methods: int
    uncovered_methods: int
    total_lines: int
    covered_lines: int
    methods: List[MethodCoverage] = field(default_factory=list)
    inheritance: List[str] = field(default_factory=list)
    decorators: List[str] = field(default_factory=list)
    coverage_percentage: float = 0.0
    method_coverage_percentage: float = 0.0
    
    def __post_init__(self):
        """Calculate coverage percentages."""
        if self.total_lines > 0:
            self.coverage_percentage = (self.covered_lines / self.total_lines) * 100
        if self.total_methods > 0:
            self.method_coverage_percentage = (self.covered_methods / self.total_methods) * 100


class ClassVisitor(ast.NodeVisitor):
    """AST visitor to extract class and method information."""
    
    def __init__(self, file_path: str):
        self.file_path = file_path
        self.classes: Dict[str, ClassMetrics] = {}
        self.current_class: Optional[str] = None
        
    def visit_ClassDef(self, node: ast.ClassDef):
        """Visit class definition."""
        # Extract inheritance
        inheritance = []
        for base in node.bases:
            if isinstance(base, ast.Name):
                inheritance.append(base.id)
            elif isinstance(base, ast.Attribute):
                inheritance.append(f"{base.value.id}.{base.attr}")
        
        # Extract decorators
        decorators = []
        for decorator in node.decorator_list:
            if isinstance(decorator, ast.Name):
                decorators.append(decorator.id)
            elif isinstance(decorator, ast.Attribute):
                decorators.append(decorator.attr)
        
        # Create class metrics
        class_metrics = ClassMetrics(
            name=node.name,
            file_path=self.file_path,
            start_line=node.lineno,
            end_line=node.end_lineno or node.lineno,
            total_methods=0,
            covered_methods=0,
            partially_covered_methods=0,
            uncovered_methods=0,
            total_lines=node.end_lineno - node.lineno + 1 if node.end_lineno else 1,
            covered_lines=0,
            inheritance=inheritance,
            decorators=decorators
        )
        
        self.classes[node.name] = class_metrics
        self.current_class = node.name
        
        # Visit methods
        self.generic_visit(node)
        
        self.current_class = None
    
    def visit_FunctionDef(self, node: ast.FunctionDef):
        """Visit function/method definition."""
        if self.current_class:
            class_metrics = self.classes[self.current_class]
            
            # Determine method type
            is_constructor = node.name == '__init__'
            is_static = any(isinstance(d, ast.Name) and d.id == 'staticmethod' 
                          for d in node.decorator_list)
            is_class_method = any(isinstance(d, ast.Name) and d.id == 'classmethod' 
                                for d in node.decorator_list)
            is_property = any(isinstance(d, ast.Name) and d.id == 'property' 
                            for d in node.decorator_list)
            
            # Create method coverage
            method = MethodCoverage(
                name=node.name,
                class_name=self.current_class,
                start_line=node.lineno,
                end_line=node.end_lineno or node.lineno,
                total_lines=node.end_lineno - node.lineno + 1 if node.end_lineno else 1,
                covered_lines=0,
                missing_lines=[],
                is_constructor=is_constructor,
                is_static=is_static,
                is_class_method=is_class_method,
                is_property=is_property
            )
            
            class_metrics.methods.append(method)
            class_metrics.total_methods += 1
        
        self.generic_visit(node)
    
    visit_AsyncFunctionDef = visit_FunctionDef


class ClassCoverageTracker:
    """Tracks class-level coverage for Python code."""
    
    def __init__(self, coverage_data: Optional[coverage.CoverageData] = None):
        """
        Initialize class coverage tracker.
        
        Args:
            coverage_data: Pre-loaded coverage data
        """
        self.coverage_data = coverage_data
        self.classes: Dict[str, ClassMetrics] = {}
        
    def analyze_classes(self, source_path: str, 
                       coverage_file: Optional[str] = None) -> Dict[str, ClassMetrics]:
        """
        Analyze class coverage for a source directory.
        
        Args:
            source_path: Path to source code directory
            coverage_file: Optional coverage data file
            
        Returns:
            Dictionary mapping class names to metrics
        """
        source_path = Path(source_path)
        
        # Load coverage data if provided
        if coverage_file and not self.coverage_data:
            cov = coverage.Coverage()
            cov.load()
            self.coverage_data = cov.get_data()
        
        # Find all Python files
        for py_file in source_path.rglob('*.py'):
            if '__pycache__' not in str(py_file):
                self._analyze_file(str(py_file))
        
        return self.classes
    
    def _analyze_file(self, file_path: str):
        """Analyze classes in a single file."""
        # Parse AST
        with open(file_path, 'r') as f:
            try:
                tree = ast.parse(f.read(), filename=file_path)
            except SyntaxError:
                return
        
        # Extract class information
        visitor = ClassVisitor(file_path)
        visitor.visit(tree)
        
        # Update with coverage data
        if self.coverage_data:
            self._update_coverage(file_path, visitor.classes)
        
        # Add to tracked classes
        self.classes.update(visitor.classes)
    
    def _update_coverage(self, file_path: str, classes: Dict[str, ClassMetrics]):
        """Update class metrics with coverage data."""
        if file_path not in self.coverage_data.measured_files():
            return
        
        # Get executed lines
        executed_lines = self.coverage_data.lines(file_path) or set()
        
        for class_name, class_metrics in classes.items():
            # Calculate class coverage
            class_lines = set(range(class_metrics.start_line, class_metrics.end_line + 1))
            covered_class_lines = class_lines & executed_lines
            class_metrics.covered_lines = len(covered_class_lines)
            
            # Calculate method coverage
            for method in class_metrics.methods:
                method_lines = set(range(method.start_line, method.end_line + 1))
                covered_method_lines = method_lines & executed_lines
                method.covered_lines = len(covered_method_lines)
                method.missing_lines = sorted(method_lines - covered_method_lines)
                
                # Update method counts
                if len(covered_method_lines) == 0:
                    class_metrics.uncovered_methods += 1
                elif len(covered_method_lines) == len(method_lines):
                    class_metrics.covered_methods += 1
                else:
                    class_metrics.partially_covered_methods += 1
    
    def get_class_coverage(self, class_name: str) -> Optional[ClassMetrics]:
        """
        Get coverage metrics for a specific class.
        
        Args:
            class_name: Name of the class
            
        Returns:
            ClassMetrics or None if not found
        """
        return self.classes.get(class_name)
    
    def find_uncovered_methods(self, threshold: float = 0.0) -> List[MethodCoverage]:
        """
        Find methods with coverage below threshold.
        
        Args:
            threshold: Coverage percentage threshold
            
        Returns:
            List of uncovered or partially covered methods
        """
        uncovered = []
        for class_metrics in self.classes.values():
            for method in class_metrics.methods:
                if method.coverage_percentage <= threshold:
                    uncovered.append(method)
        return uncovered
    
    def get_inheritance_coverage(self) -> Dict[str, List[ClassMetrics]]:
        """
        Group classes by their base classes.
        
        Returns:
            Dictionary mapping base classes to derived classes
        """
        inheritance_map = {}
        for class_metrics in self.classes.values():
            for base_class in class_metrics.inheritance:
                if base_class not in inheritance_map:
                    inheritance_map[base_class] = []
                inheritance_map[base_class].append(class_metrics)
        return inheritance_map
    
    def get_constructor_coverage(self) -> Dict[str, MethodCoverage]:
        """
        Get coverage for all constructors.
        
        Returns:
            Dictionary mapping class names to constructor coverage
        """
        constructors = {}
        for class_metrics in self.classes.values():
            for method in class_metrics.methods:
                if method.is_constructor:
                    constructors[class_metrics.name] = method
                    break
        return constructors
    
    def get_property_coverage(self) -> List[MethodCoverage]:
        """
        Get coverage for all properties.
        
        Returns:
            List of property methods with coverage
        """
        properties = []
        for class_metrics in self.classes.values():
            for method in class_metrics.methods:
                if method.is_property:
                    properties.append(method)
        return properties
    
    def generate_class_report(self, output_file: str, format: str = 'markdown'):
        """
        Generate class coverage report.
        
        Args:
            output_file: Output file path
            format: Report format (markdown, html, json)
        """
        if format == 'markdown':
            self._generate_markdown_report(output_file)
        elif format == 'html':
            self._generate_html_report(output_file)
        elif format == 'json':
            self._generate_json_report(output_file)
        else:
            raise ValueError(f"Unsupported format: {format}")
    
    def _generate_markdown_report(self, output_file: str):
        """Generate Markdown class coverage report."""
        lines = []
        lines.append("# Class Coverage Report\n")
        lines.append(f"Total Classes: {len(self.classes)}\n")
        
        # Summary statistics
        total_methods = sum(c.total_methods for c in self.classes.values())
        covered_methods = sum(c.covered_methods for c in self.classes.values())
        lines.append(f"Total Methods: {total_methods}")
        lines.append(f"Covered Methods: {covered_methods}")
        lines.append(f"Method Coverage: {(covered_methods/total_methods*100):.2f}%\n")
        
        # Class details
        lines.append("## Class Details\n")
        for class_name, metrics in sorted(self.classes.items()):
            lines.append(f"### {class_name}")
            lines.append(f"- File: {metrics.file_path}")
            lines.append(f"- Lines: {metrics.start_line}-{metrics.end_line}")
            lines.append(f"- Coverage: {metrics.coverage_percentage:.2f}%")
            lines.append(f"- Methods: {metrics.covered_methods}/{metrics.total_methods}")
            
            if metrics.inheritance:
                lines.append(f"- Inherits: {', '.join(metrics.inheritance)}")
            
            if metrics.methods:
                lines.append("\n#### Methods:")
                for method in metrics.methods:
                    status = "✓" if method.coverage_percentage == 100 else "○" if method.coverage_percentage > 0 else "✗"
                    lines.append(f"- {status} {method.name}: {method.coverage_percentage:.1f}%")
            
            lines.append("")
        
        # Write report
        with open(output_file, 'w') as f:
            f.write('\n'.join(lines))
    
    def _generate_html_report(self, output_file: str):
        """Generate HTML class coverage report."""
        html = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Class Coverage Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .class { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
                .covered { background: #d4edda; }
                .partial { background: #fff3cd; }
                .uncovered { background: #f8d7da; }
                .method { margin-left: 20px; padding: 5px; }
                .stats { font-weight: bold; }
            </style>
        </head>
        <body>
            <h1>Class Coverage Report</h1>
        """
        
        for class_name, metrics in sorted(self.classes.items()):
            coverage_class = 'covered' if metrics.coverage_percentage >= 90 else 'partial' if metrics.coverage_percentage >= 50 else 'uncovered'
            html += f"""
            <div class="class {coverage_class}">
                <h2>{class_name}</h2>
                <p class="stats">Coverage: {metrics.coverage_percentage:.2f}%</p>
                <p>Methods: {metrics.covered_methods}/{metrics.total_methods}</p>
                <p>File: {metrics.file_path}</p>
            """
            
            if metrics.methods:
                html += "<h3>Methods:</h3>"
                for method in metrics.methods:
                    html += f'<div class="method">• {method.name}: {method.coverage_percentage:.1f}%</div>'
            
            html += "</div>"
        
        html += """
        </body>
        </html>
        """
        
        with open(output_file, 'w') as f:
            f.write(html)
    
    def _generate_json_report(self, output_file: str):
        """Generate JSON class coverage report."""
        import json
        
        report = {
            'total_classes': len(self.classes),
            'classes': {}
        }
        
        for class_name, metrics in self.classes.items():
            report['classes'][class_name] = {
                'file': metrics.file_path,
                'lines': [metrics.start_line, metrics.end_line],
                'coverage': metrics.coverage_percentage,
                'methods': {
                    'total': metrics.total_methods,
                    'covered': metrics.covered_methods,
                    'partial': metrics.partially_covered_methods,
                    'uncovered': metrics.uncovered_methods
                },
                'method_list': [
                    {
                        'name': m.name,
                        'coverage': m.coverage_percentage,
                        'lines': [m.start_line, m.end_line]
                    }
                    for m in metrics.methods
                ]
            }
        
        with open(output_file, 'w') as f:
            json.dump(report, f, indent=2)