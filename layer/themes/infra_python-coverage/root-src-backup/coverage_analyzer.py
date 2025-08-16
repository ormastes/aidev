"""
Coverage analyzer for Python with branch and class-level support
"""
import json
import sys
from pathlib import Path
from typing import Dict, List, Any
import coverage
import ast


class ClassCoverageAnalyzer:
    """Analyze class-level coverage for Python code"""
    
    def __init__(self, coverage_file: str = "coverage.json"):
        self.coverage_file = Path(coverage_file)
        self.coverage_data = {}
        self.class_coverage = {}
        
    def load_coverage_data(self) -> Dict[str, Any]:
        """Load coverage data from JSON file"""
        if not self.coverage_file.exists():
            raise FileNotFoundError(f"Coverage file {self.coverage_file} not found")
        
        with open(self.coverage_file, "r") as f:
            self.coverage_data = json.load(f)
        
        return self.coverage_data
    
    def analyze_class_coverage(self, source_file: str) -> Dict[str, Dict[str, float]]:
        """Analyze coverage at class level for a source file"""
        file_path = Path(source_file)
        
        if not file_path.exists():
            return {}
        
        # Parse the Python file to find classes
        with open(file_path, "r") as f:
            tree = ast.parse(f.read(), filename=str(file_path))
        
        classes = {}
        
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                class_name = node.name
                class_lines = set()
                
                # Get all line numbers within the class
                for child in ast.walk(node):
                    if hasattr(child, 'lineno'):
                        class_lines.add(child.lineno)
                
                classes[class_name] = {
                    "lines": sorted(class_lines),
                    "start_line": node.lineno,
                    "end_line": max(class_lines) if class_lines else node.lineno
                }
        
        # Calculate coverage for each class
        if source_file in self.coverage_data.get("files", {}):
            file_coverage = self.coverage_data["files"][source_file]
            executed_lines = set(file_coverage.get("executed_lines", []))
            missing_lines = set(file_coverage.get("missing_lines", []))
            
            for class_name, class_info in classes.items():
                class_lines = set(class_info["lines"])
                covered_lines = class_lines & executed_lines
                uncovered_lines = class_lines & missing_lines
                
                total_lines = len(class_lines)
                covered_count = len(covered_lines)
                
                coverage_percent = (covered_count / total_lines * 100) if total_lines > 0 else 0
                
                class_info["coverage"] = {
                    "percent": round(coverage_percent, 2),
                    "covered_lines": covered_count,
                    "total_lines": total_lines,
                    "missing_lines": sorted(uncovered_lines)
                }
        
        return classes
    
    def generate_branch_coverage_report(self) -> Dict[str, Any]:
        """Generate detailed branch coverage report"""
        report = {
            "summary": {},
            "files": {}
        }
        
        if "totals" in self.coverage_data:
            totals = self.coverage_data["totals"]
            report["summary"] = {
                "line_coverage": totals.get("percent_covered", 0),
                "branch_coverage": totals.get("percent_covered_branches", 0),
                "total_statements": totals.get("num_statements", 0),
                "covered_statements": totals.get("covered_lines", 0),
                "total_branches": totals.get("num_branches", 0),
                "covered_branches": totals.get("covered_branches", 0),
                "partial_branches": totals.get("num_partial_branches", 0)
            }
        
        for file_path, file_data in self.coverage_data.get("files", {}).items():
            report["files"][file_path] = {
                "line_coverage": file_data.get("summary", {}).get("percent_covered", 0),
                "branch_coverage": file_data.get("summary", {}).get("percent_covered_branches", 0),
                "missing_lines": file_data.get("missing_lines", []),
                "excluded_lines": file_data.get("excluded_lines", [])
            }
        
        return report
    
    def generate_system_test_coverage(self, test_dir: str = "tests") -> Dict[str, Any]:
        """Generate system test class coverage report"""
        test_path = Path(test_dir)
        system_coverage = {
            "test_classes": {},
            "coverage_by_test": {}
        }
        
        if not test_path.exists():
            return system_coverage
        
        # Find all test files
        test_files = list(test_path.glob("**/test_*.py")) + list(test_path.glob("**/*_test.py"))
        
        for test_file in test_files:
            # Parse test file to find test classes
            with open(test_file, "r") as f:
                try:
                    tree = ast.parse(f.read(), filename=str(test_file))
                    
                    for node in ast.walk(tree):
                        if isinstance(node, ast.ClassDef):
                            if node.name.startswith("Test") or node.name.endswith("Test"):
                                test_class_name = f"{test_file.stem}.{node.name}"
                                
                                # Count test methods
                                test_methods = []
                                for item in node.body:
                                    if isinstance(item, ast.FunctionDef) and item.name.startswith("test_"):
                                        test_methods.append(item.name)
                                
                                system_coverage["test_classes"][test_class_name] = {
                                    "file": str(test_file),
                                    "methods": test_methods,
                                    "method_count": len(test_methods)
                                }
                except SyntaxError:
                    pass
        
        return system_coverage
    
    def save_report(self, output_file: str = "coverage_report.json"):
        """Save comprehensive coverage report"""
        report = {
            "branch_coverage": self.generate_branch_coverage_report(),
            "class_coverage": self.class_coverage,
            "system_test_coverage": self.generate_system_test_coverage()
        }
        
        with open(output_file, "w") as f:
            json.dump(report, f, indent=2)
        
        return report


def main():
    """Main entry point for coverage analysis"""
    analyzer = ClassCoverageAnalyzer()
    
    try:
        # Load coverage data
        analyzer.load_coverage_data()
        
        # Analyze class coverage for all Python files
        src_path = Path("src")
        if src_path.exists():
            for py_file in src_path.glob("**/*.py"):
                classes = analyzer.analyze_class_coverage(str(py_file))
                if classes:
                    analyzer.class_coverage[str(py_file)] = classes
        
        # Generate and save report
        report = analyzer.save_report()
        
        # Print summary
        print("Coverage Analysis Complete")
        print("-" * 40)
        
        if "branch_coverage" in report and "summary" in report["branch_coverage"]:
            summary = report["branch_coverage"]["summary"]
            print(f"Line Coverage: {summary.get('line_coverage', 0):.2f}%")
            print(f"Branch Coverage: {summary.get('branch_coverage', 0):.2f}%")
            print(f"Total Statements: {summary.get('total_statements', 0)}")
            print(f"Covered Statements: {summary.get('covered_statements', 0)}")
            print(f"Total Branches: {summary.get('total_branches', 0)}")
            print(f"Covered Branches: {summary.get('covered_branches', 0)}")
        
        if "system_test_coverage" in report:
            test_coverage = report["system_test_coverage"]
            print(f"\nTest Classes Found: {len(test_coverage.get('test_classes', {}))}")
            
            for test_class, info in test_coverage.get("test_classes", {}).items():
                print(f"  - {test_class}: {info['method_count']} test methods")
        
        return 0
        
    except FileNotFoundError as e:
        print(f"Error: {e}")
        print("Please run tests with coverage first: pytest --cov=src --cov-report=json")
        return 1
    except Exception as e:
        print(f"Unexpected error: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())