"""
Behave Integration Wrapper

Provides a Python API wrapper around the Behave BDD framework.
"""

import os
import json
import subprocess
import tempfile
from dataclasses import dataclass
from typing import List, Optional, Dict, Any
from pathlib import Path


@dataclass
class TestResult:
    """Represents test execution results."""
    passed: bool
    total_scenarios: int
    passed_scenarios: int
    failed_scenarios: int
    skipped_scenarios: int
    total_steps: int
    passed_steps: int
    failed_steps: int
    skipped_steps: int
    duration: float
    failures: List[Dict[str, Any]]
    output: str


@dataclass
class ScenarioInfo:
    """Information about a scenario."""
    feature: str
    name: str
    tags: List[str]
    steps: List[str]
    location: str


class BehaveWrapper:
    """Wrapper for Behave BDD framework."""
    
    def __init__(self, features_dir: str = 'features', 
                 work_dir: Optional[str] = None):
        """
        Initialize Behave wrapper.
        
        Args:
            features_dir: Directory containing feature files
            work_dir: Working directory for test execution
        """
        self.features_dir = Path(features_dir)
        self.work_dir = Path(work_dir) if work_dir else Path.cwd()
        self.config = self._load_config()
    
    def _load_config(self) -> Dict[str, Any]:
        """Load Behave configuration."""
        config = {
            'default_tags': '~@skip',
            'show_skipped': False,
            'show_timings': True,
            'stdout_capture': True,
            'stderr_capture': True
        }
        
        # Load from behave.ini if exists
        config_file = self.work_dir / 'behave.ini'
        if config_file.exists():
            import configparser
            parser = configparser.ConfigParser()
            parser.read(config_file)
            
            if 'behave' in parser:
                config.update(dict(parser['behave']))
        
        return config
    
    def run(self, tags: Optional[List[str]] = None, 
            format: str = 'json',
            dry_run: bool = False,
            stop_on_failure: bool = False,
            scenario_name: Optional[str] = None) -> TestResult:
        """
        Run Behave tests.
        
        Args:
            tags: List of tags to filter scenarios
            format: Output format (json, pretty, plain, progress)
            dry_run: If True, don't execute steps
            stop_on_failure: Stop on first failure
            scenario_name: Run specific scenario by name
            
        Returns:
            TestResult object with execution results
        """
        # Build command
        cmd = ['behave']
        
        # Add features directory
        cmd.append(str(self.features_dir))
        
        # Add tags
        if tags:
            for tag in tags:
                cmd.extend(['--tags', tag])
        else:
            cmd.extend(['--tags', self.config['default_tags']])
        
        # Add format and output
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            output_file = f.name
        
        cmd.extend(['-f', 'json', '-o', output_file])
        
        # Also capture pretty output
        cmd.extend(['-f', 'pretty'])
        
        # Add other options
        if dry_run:
            cmd.append('--dry-run')
        
        if stop_on_failure:
            cmd.append('--stop')
        
        if scenario_name:
            cmd.extend(['--name', scenario_name])
        
        if not self.config.get('show_skipped', False):
            cmd.append('--no-skipped')
        
        if self.config.get('show_timings', True):
            cmd.append('--show-timings')
        
        # Run Behave
        try:
            result = subprocess.run(
                cmd,
                cwd=self.work_dir,
                capture_output=True,
                text=True
            )
            
            # Parse results
            return self._parse_results(output_file, result)
            
        finally:
            # Clean up temp file
            if os.path.exists(output_file):
                os.remove(output_file)
    
    def _parse_results(self, json_file: str, process_result) -> TestResult:
        """Parse Behave execution results."""
        # Default result
        test_result = TestResult(
            passed=False,
            total_scenarios=0,
            passed_scenarios=0,
            failed_scenarios=0,
            skipped_scenarios=0,
            total_steps=0,
            passed_steps=0,
            failed_steps=0,
            skipped_steps=0,
            duration=0.0,
            failures=[],
            output=process_result.stdout + process_result.stderr
        )
        
        # Parse JSON output if available
        if os.path.exists(json_file):
            try:
                with open(json_file, 'r') as f:
                    data = json.load(f)
                
                # Process features
                for feature in data:
                    for element in feature.get('elements', []):
                        if element['type'] == 'scenario':
                            test_result.total_scenarios += 1
                            
                            scenario_passed = True
                            scenario_skipped = False
                            
                            for step in element.get('steps', []):
                                test_result.total_steps += 1
                                
                                status = step['result']['status']
                                if status == 'passed':
                                    test_result.passed_steps += 1
                                elif status == 'failed':
                                    test_result.failed_steps += 1
                                    scenario_passed = False
                                    
                                    # Record failure
                                    failure = {
                                        'feature': feature['name'],
                                        'scenario': element['name'],
                                        'step': step['name'],
                                        'error': step['result'].get('error_message', '')
                                    }
                                    test_result.failures.append(failure)
                                    
                                elif status == 'skipped':
                                    test_result.skipped_steps += 1
                                    scenario_skipped = True
                                
                                # Add duration
                                if 'duration' in step['result']:
                                    test_result.duration += step['result']['duration']
                            
                            if scenario_passed and not scenario_skipped:
                                test_result.passed_scenarios += 1
                            elif scenario_skipped:
                                test_result.skipped_scenarios += 1
                            else:
                                test_result.failed_scenarios += 1
                
                # Set overall passed status
                test_result.passed = (test_result.failed_scenarios == 0)
                
            except (json.JSONDecodeError, KeyError) as e:
                # If JSON parsing fails, use process exit code
                test_result.passed = (process_result.returncode == 0)
        else:
            # No JSON output, use process exit code
            test_result.passed = (process_result.returncode == 0)
        
        return test_result
    
    def run_scenario(self, feature: str, scenario: str) -> TestResult:
        """
        Run a specific scenario.
        
        Args:
            feature: Feature file name (without .feature extension)
            scenario: Scenario name
            
        Returns:
            TestResult object
        """
        feature_file = self.features_dir / f"{feature}.feature"
        if not feature_file.exists():
            raise FileNotFoundError(f"Feature file not found: {feature_file}")
        
        return self.run(scenario_name=scenario)
    
    def list_scenarios(self) -> List[ScenarioInfo]:
        """
        List all available scenarios.
        
        Returns:
            List of ScenarioInfo objects
        """
        scenarios = []
        
        # Run behave with --dry-run to list scenarios
        cmd = ['behave', str(self.features_dir), '--dry-run', '-f', 'json']
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            output_file = f.name
        
        cmd.extend(['-o', output_file])
        
        try:
            subprocess.run(cmd, cwd=self.work_dir, capture_output=True)
            
            if os.path.exists(output_file):
                with open(output_file, 'r') as f:
                    data = json.load(f)
                
                for feature in data:
                    feature_name = feature['name']
                    feature_file = feature['location'].split(':')[0]
                    
                    for element in feature.get('elements', []):
                        if element['type'] == 'scenario':
                            scenario_info = ScenarioInfo(
                                feature=feature_name,
                                name=element['name'],
                                tags=[tag['name'] for tag in element.get('tags', [])],
                                steps=[step['name'] for step in element.get('steps', [])],
                                location=f"{feature_file}:{element['line']}"
                            )
                            scenarios.append(scenario_info)
        
        finally:
            if os.path.exists(output_file):
                os.remove(output_file)
        
        return scenarios
    
    def generate_steps_template(self, feature_file: str) -> str:
        """
        Generate step definition template for a feature file.
        
        Args:
            feature_file: Path to feature file
            
        Returns:
            Python code with step definition stubs
        """
        # Parse feature file to get steps
        from .gherkin_parser import parse_feature_file
        
        feature = parse_feature_file(feature_file)
        steps_code = []
        seen_steps = set()
        
        steps_code.append('"""')
        steps_code.append(f'Step definitions for {feature.name}')
        steps_code.append('"""')
        steps_code.append('')
        steps_code.append('from behave import given, when, then, step')
        steps_code.append('')
        
        # Process all scenarios
        for scenario in feature.scenarios:
            for step in scenario.steps:
                step_text = step.text
                
                # Skip if already seen
                if step_text in seen_steps:
                    continue
                
                seen_steps.add(step_text)
                
                # Determine decorator
                decorator = step.keyword.lower()
                if decorator in ['and', 'but']:
                    decorator = 'step'
                
                # Generate function name
                func_name = 'step_' + re.sub(r'[^a-zA-Z0-9]+', '_', step_text.lower()).strip('_')
                
                # Generate step definition
                steps_code.append(f"@{decorator}('{step_text}')")
                steps_code.append(f"def {func_name}(context):")
                
                if step.data_table:
                    steps_code.append("    # Access data table with context.table")
                    steps_code.append("    for row in context.table:")
                    steps_code.append("        print(row)")
                
                if step.doc_string:
                    steps_code.append("    # Access doc string with context.text")
                    steps_code.append("    print(context.text)")
                
                steps_code.append("    # TODO: Implement step")
                steps_code.append("    raise NotImplementedError('Step not implemented')")
                steps_code.append("")
        
        return '\n'.join(steps_code)
    
    def check_undefined_steps(self) -> List[str]:
        """
        Check for undefined steps in feature files.
        
        Returns:
            List of undefined step texts
        """
        # Run behave with --dry-run and capture undefined steps
        cmd = ['behave', str(self.features_dir), '--dry-run', '--no-capture']
        
        result = subprocess.run(
            cmd,
            cwd=self.work_dir,
            capture_output=True,
            text=True
        )
        
        undefined = []
        for line in result.stdout.split('\n'):
            if 'undefined' in line.lower():
                # Extract step text
                match = re.search(r'"([^"]+)"', line)
                if match:
                    undefined.append(match.group(1))
        
        return undefined
    
    def format_report(self, result: TestResult, format: str = 'text') -> str:
        """
        Format test results in various formats.
        
        Args:
            result: TestResult object
            format: Output format (text, html, markdown)
            
        Returns:
            Formatted report string
        """
        if format == 'text':
            return self._format_text_report(result)
        elif format == 'html':
            return self._format_html_report(result)
        elif format == 'markdown':
            return self._format_markdown_report(result)
        else:
            raise ValueError(f"Unsupported format: {format}")
    
    def _format_text_report(self, result: TestResult) -> str:
        """Format results as plain text."""
        lines = []
        lines.append("=" * 70)
        lines.append("BEHAVE TEST RESULTS")
        lines.append("=" * 70)
        lines.append(f"Status: {'PASSED' if result.passed else 'FAILED'}")
        lines.append("")
        lines.append("Scenarios:")
        lines.append(f"  Total:   {result.total_scenarios}")
        lines.append(f"  Passed:  {result.passed_scenarios}")
        lines.append(f"  Failed:  {result.failed_scenarios}")
        lines.append(f"  Skipped: {result.skipped_scenarios}")
        lines.append("")
        lines.append("Steps:")
        lines.append(f"  Total:   {result.total_steps}")
        lines.append(f"  Passed:  {result.passed_steps}")
        lines.append(f"  Failed:  {result.failed_steps}")
        lines.append(f"  Skipped: {result.skipped_steps}")
        lines.append("")
        lines.append(f"Duration: {result.duration:.2f} seconds")
        
        if result.failures:
            lines.append("")
            lines.append("FAILURES:")
            lines.append("-" * 70)
            for failure in result.failures:
                lines.append(f"Feature: {failure['feature']}")
                lines.append(f"Scenario: {failure['scenario']}")
                lines.append(f"Step: {failure['step']}")
                lines.append(f"Error: {failure['error']}")
                lines.append("-" * 70)
        
        lines.append("=" * 70)
        return '\n'.join(lines)
    
    def _format_html_report(self, result: TestResult) -> str:
        """Format results as HTML."""
        status_class = 'success' if result.passed else 'failure'
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Behave Test Results</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                .{status_class} {{ color: {'green' if result.passed else 'red'}; }}
                table {{ border-collapse: collapse; width: 100%; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background-color: #f2f2f2; }}
            </style>
        </head>
        <body>
            <h1>Behave Test Results</h1>
            <h2 class="{status_class}">Status: {'PASSED' if result.passed else 'FAILED'}</h2>
            
            <h3>Summary</h3>
            <table>
                <tr>
                    <th>Metric</th>
                    <th>Total</th>
                    <th>Passed</th>
                    <th>Failed</th>
                    <th>Skipped</th>
                </tr>
                <tr>
                    <td>Scenarios</td>
                    <td>{result.total_scenarios}</td>
                    <td>{result.passed_scenarios}</td>
                    <td>{result.failed_scenarios}</td>
                    <td>{result.skipped_scenarios}</td>
                </tr>
                <tr>
                    <td>Steps</td>
                    <td>{result.total_steps}</td>
                    <td>{result.passed_steps}</td>
                    <td>{result.failed_steps}</td>
                    <td>{result.skipped_steps}</td>
                </tr>
            </table>
            
            <p>Duration: {result.duration:.2f} seconds</p>
        """
        
        if result.failures:
            html += """
            <h3>Failures</h3>
            <table>
                <tr>
                    <th>Feature</th>
                    <th>Scenario</th>
                    <th>Step</th>
                    <th>Error</th>
                </tr>
            """
            for failure in result.failures:
                html += f"""
                <tr>
                    <td>{failure['feature']}</td>
                    <td>{failure['scenario']}</td>
                    <td>{failure['step']}</td>
                    <td>{failure['error']}</td>
                </tr>
                """
            html += "</table>"
        
        html += """
        </body>
        </html>
        """
        
        return html
    
    def _format_markdown_report(self, result: TestResult) -> str:
        """Format results as Markdown."""
        lines = []
        lines.append("# Behave Test Results")
        lines.append("")
        lines.append(f"**Status:** {'✅ PASSED' if result.passed else '❌ FAILED'}")
        lines.append("")
        lines.append("## Summary")
        lines.append("")
        lines.append("| Metric | Total | Passed | Failed | Skipped |")
        lines.append("|--------|-------|--------|--------|---------|")
        lines.append(f"| Scenarios | {result.total_scenarios} | {result.passed_scenarios} | {result.failed_scenarios} | {result.skipped_scenarios} |")
        lines.append(f"| Steps | {result.total_steps} | {result.passed_steps} | {result.failed_steps} | {result.skipped_steps} |")
        lines.append("")
        lines.append(f"**Duration:** {result.duration:.2f} seconds")
        
        if result.failures:
            lines.append("")
            lines.append("## Failures")
            lines.append("")
            for failure in result.failures:
                lines.append(f"### {failure['scenario']}")
                lines.append(f"- **Feature:** {failure['feature']}")
                lines.append(f"- **Step:** {failure['step']}")
                lines.append(f"- **Error:** {failure['error']}")
                lines.append("")
        
        return '\n'.join(lines)


import re