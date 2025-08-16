"""
Manual Test Documentation Generator

Generates manual test documentation from Gherkin feature files.
"""

import os
import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from pathlib import Path
from jinja2 import Template, Environment, FileSystemLoader

from .gherkin_parser import parse_feature_file, Feature, Scenario, Step


class ManualTestGenerator:
    """Generates manual test documentation from Gherkin features."""
    
    def __init__(self, template_dir: Optional[str] = None):
        """
        Initialize generator.
        
        Args:
            template_dir: Directory containing Jinja2 templates
        """
        if template_dir:
            self.template_dir = Path(template_dir)
        else:
            # Use default templates
            self.template_dir = Path(__file__).parent.parent / 'templates'
        
        self.env = Environment(loader=FileSystemLoader(str(self.template_dir)))
        self.test_id_counter = 1
    
    def generate_from_file(self, feature_file: str, output_file: str, 
                          format: str = 'markdown') -> None:
        """
        Generate manual test documentation from a feature file.
        
        Args:
            feature_file: Path to Gherkin feature file
            output_file: Path to output file
            format: Output format (markdown, html, json)
        """
        feature = parse_feature_file(feature_file)
        content = self.generate_from_feature(feature, format)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(content)
    
    def generate_from_directory(self, features_dir: str, output_file: str,
                               format: str = 'markdown') -> None:
        """
        Generate manual test documentation from all features in directory.
        
        Args:
            features_dir: Directory containing feature files
            output_file: Path to output file
            format: Output format (markdown, html, json)
        """
        features = []
        
        for feature_file in Path(features_dir).glob('**/*.feature'):
            feature = parse_feature_file(str(feature_file))
            features.append(feature)
        
        content = self.generate_from_features(features, format)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(content)
    
    def generate_from_feature(self, feature: Feature, format: str = 'markdown') -> str:
        """
        Generate manual test documentation from a Feature object.
        
        Args:
            feature: Feature object
            format: Output format
            
        Returns:
            Generated documentation string
        """
        if format == 'markdown':
            return self._generate_markdown(feature)
        elif format == 'html':
            return self._generate_html(feature)
        elif format == 'json':
            return self._generate_json(feature)
        else:
            raise ValueError(f"Unsupported format: {format}")
    
    def generate_from_features(self, features: List[Feature], format: str = 'markdown') -> str:
        """
        Generate manual test documentation from multiple features.
        
        Args:
            features: List of Feature objects
            format: Output format
            
        Returns:
            Generated documentation string
        """
        if format == 'markdown':
            return self._generate_markdown_suite(features)
        elif format == 'html':
            return self._generate_html_suite(features)
        elif format == 'json':
            return self._generate_json_suite(features)
        else:
            raise ValueError(f"Unsupported format: {format}")
    
    def _generate_test_id(self) -> str:
        """Generate unique test ID."""
        timestamp = datetime.now().strftime('%Y%m%d')
        test_id = f"TC_{timestamp}_{self.test_id_counter:04d}"
        self.test_id_counter += 1
        return test_id
    
    def _generate_markdown(self, feature: Feature) -> str:
        """Generate Markdown documentation."""
        lines = []
        
        # Feature header
        lines.append(f"# Feature: {feature.name}")
        lines.append("")
        
        if feature.description:
            lines.append(feature.description)
            lines.append("")
        
        if feature.tags:
            lines.append(f"**Tags:** {', '.join(feature.tags)}")
            lines.append("")
        
        # Table of contents
        if len(feature.scenarios) > 1:
            lines.append("## Table of Contents")
            lines.append("")
            for i, scenario in enumerate(feature.scenarios, 1):
                lines.append(f"{i}. [{scenario.name}](#{self._slugify(scenario.name)})")
            lines.append("")
        
        # Background
        if feature.background:
            lines.append("## Background")
            lines.append("")
            lines.append("**Preconditions:**")
            lines.append("")
            for step in feature.background.steps:
                lines.append(f"- {step.keyword} {step.text}")
            lines.append("")
        
        # Scenarios
        for scenario in feature.scenarios:
            lines.append(f"## Test Case: {scenario.name}")
            lines.append("")
            lines.append(f"**Test ID:** {self._generate_test_id()}")
            lines.append("")
            
            if scenario.tags:
                lines.append(f"**Tags:** {', '.join(scenario.tags)}")
                lines.append("")
            
            if scenario.description:
                lines.append(f"**Description:** {scenario.description}")
                lines.append("")
            
            # Test steps
            lines.append("### Test Steps")
            lines.append("")
            
            for i, step in enumerate(scenario.steps, 1):
                step_text = f"{i}. **{step.keyword}** {step.text}"
                lines.append(step_text)
                
                if step.data_table:
                    lines.append("")
                    # Format data table
                    headers = step.data_table[0]
                    lines.append("   | " + " | ".join(headers) + " |")
                    lines.append("   |" + "|".join(["---"] * len(headers)) + "|")
                    
                    for row in step.data_table[1:]:
                        lines.append("   | " + " | ".join(row) + " |")
                    lines.append("")
                
                if step.doc_string:
                    lines.append("")
                    lines.append("   ```")
                    for line in step.doc_string.split('\n'):
                        lines.append(f"   {line}")
                    lines.append("   ```")
                    lines.append("")
            
            lines.append("")
            
            # Examples for scenario outlines
            if scenario.is_outline and scenario.examples:
                lines.append("### Test Data")
                lines.append("")
                
                headers = scenario.examples.headers
                lines.append("| " + " | ".join(headers) + " |")
                lines.append("|" + "|".join(["---"] * len(headers)) + "|")
                
                for row in scenario.examples.rows:
                    lines.append("| " + " | ".join(row) + " |")
                
                lines.append("")
            
            # Expected results
            lines.append("### Expected Results")
            lines.append("")
            
            # Extract Then steps as expected results
            then_steps = [s for s in scenario.steps if s.keyword.lower() in ['then', 'and', 'but']]
            if then_steps:
                for step in then_steps:
                    lines.append(f"- {step.text}")
            else:
                lines.append("- Test completes successfully")
            
            lines.append("")
            lines.append("---")
            lines.append("")
        
        return '\n'.join(lines)
    
    def _generate_html(self, feature: Feature) -> str:
        """Generate HTML documentation."""
        template = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>{{ feature.name }} - Manual Test Documentation</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 900px;
                    margin: 0 auto;
                    padding: 20px;
                }
                h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
                h2 { color: #34495e; margin-top: 30px; }
                h3 { color: #7f8c8d; }
                .tags { 
                    display: inline-block;
                    background: #ecf0f1;
                    padding: 2px 8px;
                    border-radius: 3px;
                    margin: 2px;
                    font-size: 0.9em;
                }
                .test-id {
                    background: #3498db;
                    color: white;
                    padding: 4px 10px;
                    border-radius: 4px;
                    display: inline-block;
                }
                table {
                    border-collapse: collapse;
                    width: 100%;
                    margin: 15px 0;
                }
                th, td {
                    border: 1px solid #bdc3c7;
                    padding: 8px 12px;
                    text-align: left;
                }
                th {
                    background: #ecf0f1;
                    font-weight: bold;
                }
                .step {
                    margin: 10px 0;
                    padding: 10px;
                    background: #f8f9fa;
                    border-left: 4px solid #3498db;
                }
                .step-keyword {
                    font-weight: bold;
                    color: #2980b9;
                }
                pre {
                    background: #2c3e50;
                    color: #ecf0f1;
                    padding: 15px;
                    border-radius: 5px;
                    overflow-x: auto;
                }
                .toc {
                    background: #ecf0f1;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 20px 0;
                }
                .toc ul {
                    list-style: none;
                    padding-left: 20px;
                }
                .toc a {
                    color: #3498db;
                    text-decoration: none;
                }
                .toc a:hover {
                    text-decoration: underline;
                }
            </style>
        </head>
        <body>
            <h1>{{ feature.name }}</h1>
            
            {% if feature.description %}
            <p>{{ feature.description }}</p>
            {% endif %}
            
            {% if feature.tags %}
            <div>
                {% for tag in feature.tags %}
                <span class="tags">{{ tag }}</span>
                {% endfor %}
            </div>
            {% endif %}
            
            {% if feature.scenarios|length > 1 %}
            <div class="toc">
                <h3>Table of Contents</h3>
                <ul>
                {% for scenario in feature.scenarios %}
                    <li><a href="#{{ scenario.name|slugify }}">{{ scenario.name }}</a></li>
                {% endfor %}
                </ul>
            </div>
            {% endif %}
            
            {% if feature.background %}
            <h2>Background</h2>
            <div class="background">
                <h3>Preconditions:</h3>
                <ul>
                {% for step in feature.background.steps %}
                    <li>{{ step.keyword }} {{ step.text }}</li>
                {% endfor %}
                </ul>
            </div>
            {% endif %}
            
            {% for scenario in feature.scenarios %}
            <h2 id="{{ scenario.name|slugify }}">{{ scenario.name }}</h2>
            
            <div class="test-id">Test ID: {{ generate_test_id() }}</div>
            
            {% if scenario.tags %}
            <div style="margin: 10px 0;">
                {% for tag in scenario.tags %}
                <span class="tags">{{ tag }}</span>
                {% endfor %}
            </div>
            {% endif %}
            
            <h3>Test Steps</h3>
            {% for step in scenario.steps %}
            <div class="step">
                <span class="step-keyword">{{ step.keyword }}</span> {{ step.text }}
                
                {% if step.data_table %}
                <table>
                    <tr>
                    {% for header in step.data_table[0] %}
                        <th>{{ header }}</th>
                    {% endfor %}
                    </tr>
                    {% for row in step.data_table[1:] %}
                    <tr>
                    {% for cell in row %}
                        <td>{{ cell }}</td>
                    {% endfor %}
                    </tr>
                    {% endfor %}
                </table>
                {% endif %}
                
                {% if step.doc_string %}
                <pre>{{ step.doc_string }}</pre>
                {% endif %}
            </div>
            {% endfor %}
            
            {% if scenario.is_outline and scenario.examples %}
            <h3>Test Data</h3>
            <table>
                <tr>
                {% for header in scenario.examples.headers %}
                    <th>{{ header }}</th>
                {% endfor %}
                </tr>
                {% for row in scenario.examples.rows %}
                <tr>
                {% for cell in row %}
                    <td>{{ cell }}</td>
                {% endfor %}
                </tr>
                {% endfor %}
            </table>
            {% endif %}
            
            <h3>Expected Results</h3>
            <ul>
            {% for step in scenario.steps %}
                {% if step.keyword|lower in ['then', 'and', 'but'] %}
                <li>{{ step.text }}</li>
                {% endif %}
            {% endfor %}
            </ul>
            
            <hr>
            {% endfor %}
            
            <footer style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #ecf0f1; color: #7f8c8d;">
                Generated on {{ datetime.now().strftime('%Y-%m-%d %H:%M:%S') }}
            </footer>
        </body>
        </html>
        """
        
        # Create Jinja2 template
        from jinja2 import Template
        
        def slugify(text):
            return text.lower().replace(' ', '-').replace(':', '')
        
        def generate_test_id():
            return self._generate_test_id()
        
        tmpl = Template(template)
        return tmpl.render(
            feature=feature,
            datetime=datetime,
            slugify=slugify,
            generate_test_id=generate_test_id
        )
    
    def _generate_json(self, feature: Feature) -> str:
        """Generate JSON documentation."""
        data = {
            'feature': feature.name,
            'description': feature.description,
            'tags': feature.tags,
            'test_cases': []
        }
        
        if feature.background:
            data['background'] = {
                'steps': [
                    {
                        'keyword': step.keyword,
                        'text': step.text,
                        'data_table': step.data_table,
                        'doc_string': step.doc_string
                    }
                    for step in feature.background.steps
                ]
            }
        
        for scenario in feature.scenarios:
            test_case = {
                'id': self._generate_test_id(),
                'name': scenario.name,
                'description': scenario.description,
                'tags': scenario.tags,
                'steps': [],
                'expected_results': []
            }
            
            for step in scenario.steps:
                step_data = {
                    'keyword': step.keyword,
                    'text': step.text
                }
                
                if step.data_table:
                    step_data['data_table'] = step.data_table
                
                if step.doc_string:
                    step_data['doc_string'] = step.doc_string
                
                test_case['steps'].append(step_data)
                
                # Add to expected results if it's a Then step
                if step.keyword.lower() in ['then', 'and', 'but']:
                    test_case['expected_results'].append(step.text)
            
            if scenario.is_outline and scenario.examples:
                test_case['test_data'] = {
                    'headers': scenario.examples.headers,
                    'rows': scenario.examples.rows
                }
            
            data['test_cases'].append(test_case)
        
        return json.dumps(data, indent=2, ensure_ascii=False)
    
    def _generate_markdown_suite(self, features: List[Feature]) -> str:
        """Generate Markdown for multiple features."""
        lines = []
        lines.append("# Test Suite Documentation")
        lines.append("")
        lines.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("")
        
        # Table of contents
        lines.append("## Features")
        lines.append("")
        for feature in features:
            lines.append(f"- [{feature.name}](#{self._slugify(feature.name)})")
        lines.append("")
        
        # Individual features
        for feature in features:
            lines.append(f"<a name=\"{self._slugify(feature.name)}\"></a>")
            lines.append("")
            feature_doc = self._generate_markdown(feature)
            lines.append(feature_doc)
            lines.append("")
        
        return '\n'.join(lines)
    
    def _generate_html_suite(self, features: List[Feature]) -> str:
        """Generate HTML for multiple features."""
        # Similar to single feature but with multiple features
        features_html = []
        
        for feature in features:
            features_html.append(self._generate_html(feature))
        
        # Combine into single document
        # (Implementation would combine the HTML properly)
        return '\n'.join(features_html)
    
    def _generate_json_suite(self, features: List[Feature]) -> str:
        """Generate JSON for multiple features."""
        suite_data = {
            'test_suite': {
                'generated': datetime.now().isoformat(),
                'features': []
            }
        }
        
        for feature in features:
            feature_json = json.loads(self._generate_json(feature))
            suite_data['test_suite']['features'].append(feature_json)
        
        return json.dumps(suite_data, indent=2, ensure_ascii=False)
    
    def _slugify(self, text: str) -> str:
        """Convert text to slug format."""
        return text.lower().replace(' ', '-').replace(':', '').replace('/', '-')