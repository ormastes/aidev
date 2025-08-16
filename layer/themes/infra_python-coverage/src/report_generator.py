"""
Report Generator

Advanced report generation for coverage data.
"""

import json
import os
from dataclasses import dataclass
from typing import Dict, List, Optional, Any
from pathlib import Path
from enum import Enum
import jinja2
from datetime import datetime


class ReportFormat(Enum):
    """Supported report formats."""
    HTML = "html"
    MARKDOWN = "markdown"
    JSON = "json"
    XML = "xml"
    CONSOLE = "console"
    BADGE = "badge"
    LCOV = "lcov"


@dataclass
class ReportConfig:
    """Configuration for report generation."""
    title: str = "Python Coverage Report"
    show_missing: bool = True
    show_branches: bool = True
    show_classes: bool = True
    show_trends: bool = False
    include_source: bool = False
    highlight_uncovered: bool = True
    threshold_colors: Dict[str, str] = None
    custom_css: Optional[str] = None
    custom_template: Optional[str] = None
    
    def __post_init__(self):
        if not self.threshold_colors:
            self.threshold_colors = {
                'high': '#4c1',      # >= 90%
                'medium': '#97ca00',  # >= 80%
                'low': '#dfb317',    # >= 70%
                'poor': '#fe7d37',   # >= 60%
                'critical': '#e05d44' # < 60%
            }


class ReportGenerator:
    """Generates various format coverage reports."""
    
    def __init__(self, config: Optional[ReportConfig] = None):
        """
        Initialize report generator.
        
        Args:
            config: Report configuration
        """
        self.config = config or ReportConfig()
        self.jinja_env = self._setup_jinja()
    
    def _setup_jinja(self) -> jinja2.Environment:
        """Setup Jinja2 environment for templates."""
        template_dir = Path(__file__).parent / 'templates'
        
        if self.config.custom_template:
            loader = jinja2.FileSystemLoader(self.config.custom_template)
        elif template_dir.exists():
            loader = jinja2.FileSystemLoader(str(template_dir))
        else:
            loader = jinja2.DictLoader({
                'html_report.html': self._get_default_html_template(),
                'markdown_report.md': self._get_default_markdown_template()
            })
        
        env = jinja2.Environment(loader=loader, autoescape=True)
        env.filters['coverage_color'] = self._coverage_color
        env.filters['format_percentage'] = lambda x: f"{x:.2f}%"
        
        return env
    
    def generate(self, coverage_data: Dict, output_path: str, 
                format: ReportFormat = ReportFormat.HTML):
        """
        Generate coverage report in specified format.
        
        Args:
            coverage_data: Coverage data dictionary
            output_path: Output file/directory path
            format: Report format
        """
        if format == ReportFormat.HTML:
            self._generate_html(coverage_data, output_path)
        elif format == ReportFormat.MARKDOWN:
            self._generate_markdown(coverage_data, output_path)
        elif format == ReportFormat.JSON:
            self._generate_json(coverage_data, output_path)
        elif format == ReportFormat.XML:
            self._generate_xml(coverage_data, output_path)
        elif format == ReportFormat.CONSOLE:
            self._generate_console(coverage_data)
        elif format == ReportFormat.BADGE:
            self._generate_badge(coverage_data, output_path)
        elif format == ReportFormat.LCOV:
            self._generate_lcov(coverage_data, output_path)
        else:
            raise ValueError(f"Unsupported format: {format}")
    
    def _generate_html(self, coverage_data: Dict, output_path: str):
        """Generate HTML report."""
        # Prepare data
        report_data = self._prepare_report_data(coverage_data)
        
        # Render template
        template = self.jinja_env.get_template('html_report.html')
        html = template.render(
            config=self.config,
            data=report_data,
            timestamp=datetime.now().isoformat()
        )
        
        # Write output
        output_path = Path(output_path)
        if output_path.is_dir():
            output_file = output_path / 'index.html'
        else:
            output_file = output_path
        
        output_file.parent.mkdir(parents=True, exist_ok=True)
        output_file.write_text(html)
        
        # Copy assets if needed
        self._copy_assets(output_file.parent)
    
    def _generate_markdown(self, coverage_data: Dict, output_path: str):
        """Generate Markdown report."""
        report_data = self._prepare_report_data(coverage_data)
        
        template = self.jinja_env.get_template('markdown_report.md')
        markdown = template.render(
            config=self.config,
            data=report_data,
            timestamp=datetime.now().isoformat()
        )
        
        Path(output_path).write_text(markdown)
    
    def _generate_json(self, coverage_data: Dict, output_path: str):
        """Generate JSON report."""
        report_data = self._prepare_report_data(coverage_data)
        report_data['timestamp'] = datetime.now().isoformat()
        report_data['config'] = {
            'title': self.config.title,
            'show_missing': self.config.show_missing,
            'show_branches': self.config.show_branches,
            'show_classes': self.config.show_classes
        }
        
        with open(output_path, 'w') as f:
            json.dump(report_data, f, indent=2, default=str)
    
    def _generate_xml(self, coverage_data: Dict, output_path: str):
        """Generate XML report (Cobertura format)."""
        import xml.etree.ElementTree as ET
        
        # Create root element
        root = ET.Element('coverage', {
            'line-rate': str(coverage_data.get('line_coverage', 0) / 100),
            'branch-rate': str(coverage_data.get('branch_coverage', 0) / 100),
            'version': '1.0',
            'timestamp': str(int(datetime.now().timestamp()))
        })
        
        # Add sources
        sources = ET.SubElement(root, 'sources')
        ET.SubElement(sources, 'source').text = os.getcwd()
        
        # Add packages
        packages = ET.SubElement(root, 'packages')
        
        # Group files by package
        file_packages = {}
        for file_data in coverage_data.get('files', []):
            file_path = file_data.get('path', '')
            package = os.path.dirname(file_path).replace('/', '.')
            
            if package not in file_packages:
                file_packages[package] = []
            file_packages[package].append(file_data)
        
        # Add package data
        for package_name, files in file_packages.items():
            package = ET.SubElement(packages, 'package', {
                'name': package_name,
                'line-rate': str(sum(f.get('line_coverage', 0) for f in files) / len(files) / 100),
                'branch-rate': str(sum(f.get('branch_coverage', 0) for f in files) / len(files) / 100)
            })
            
            classes = ET.SubElement(package, 'classes')
            
            for file_data in files:
                class_elem = ET.SubElement(classes, 'class', {
                    'name': os.path.basename(file_data['path']),
                    'filename': file_data['path'],
                    'line-rate': str(file_data.get('line_coverage', 0) / 100),
                    'branch-rate': str(file_data.get('branch_coverage', 0) / 100)
                })
                
                # Add lines
                lines = ET.SubElement(class_elem, 'lines')
                for line_num in file_data.get('missing_lines', []):
                    ET.SubElement(lines, 'line', {
                        'number': str(line_num),
                        'hits': '0'
                    })
        
        # Write XML
        tree = ET.ElementTree(root)
        tree.write(output_path, encoding='utf-8', xml_declaration=True)
    
    def _generate_console(self, coverage_data: Dict):
        """Generate console report."""
        report_data = self._prepare_report_data(coverage_data)
        
        # Try to use colors
        try:
            from colorama import init, Fore, Style
            init()
            colors = {
                'high': Fore.GREEN,
                'medium': Fore.YELLOW,
                'low': Fore.YELLOW,
                'poor': Fore.RED,
                'critical': Fore.RED,
                'reset': Style.RESET_ALL
            }
        except ImportError:
            colors = {k: '' for k in ['high', 'medium', 'low', 'poor', 'critical', 'reset']}
        
        # Print header
        print("\n" + "=" * 80)
        print(f"  {self.config.title}  ".center(80))
        print("=" * 80)
        
        # Print summary
        line_cov = report_data['summary']['line_coverage']
        branch_cov = report_data['summary']['branch_coverage']
        class_cov = report_data['summary']['class_coverage']
        
        print("\nSummary:")
        print(f"  Line Coverage:   {self._format_console_coverage(line_cov, colors)}")
        print(f"  Branch Coverage: {self._format_console_coverage(branch_cov, colors)}")
        print(f"  Class Coverage:  {self._format_console_coverage(class_cov, colors)}")
        print(f"  Total Files:     {report_data['summary']['total_files']}")
        
        # Print file details
        if self.config.show_missing:
            print("\nFile Coverage:")
            print("-" * 80)
            print(f"{'File':<50} {'Lines':<10} {'Branch':<10} {'Missing'}")
            print("-" * 80)
            
            for file_data in report_data['files'][:20]:  # Limit to 20 files
                file_name = file_data['path']
                if len(file_name) > 48:
                    file_name = "..." + file_name[-45:]
                
                line_cov = file_data['line_coverage']
                branch_cov = file_data.get('branch_coverage', 0)
                missing = len(file_data.get('missing_lines', []))
                
                print(f"{file_name:<50} {line_cov:>8.1f}% {branch_cov:>8.1f}% {missing:>7}")
            
            if len(report_data['files']) > 20:
                print(f"... and {len(report_data['files']) - 20} more files")
        
        # Print uncovered files
        uncovered = [f for f in report_data['files'] if f['line_coverage'] == 0]
        if uncovered:
            print(f"\n{colors.get('critical', '')}Uncovered Files ({len(uncovered)}):{colors.get('reset', '')}")
            for file_data in uncovered[:10]:
                print(f"  - {file_data['path']}")
            if len(uncovered) > 10:
                print(f"  ... and {len(uncovered) - 10} more")
        
        print("=" * 80)
    
    def _generate_badge(self, coverage_data: Dict, output_path: str):
        """Generate coverage badge SVG."""
        coverage = coverage_data.get('line_coverage', 0)
        color = self._get_coverage_color(coverage)
        
        svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="104" height="20">
        <linearGradient id="b" x2="0" y2="100%">
            <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
            <stop offset="1" stop-opacity=".1"/>
        </linearGradient>
        <mask id="a">
            <rect width="104" height="20" rx="3" fill="#fff"/>
        </mask>
        <g mask="url(#a)">
            <path fill="#555" d="M0 0h63v20H0z"/>
            <path fill="{color}" d="M63 0h41v20H63z"/>
            <path fill="url(#b)" d="M0 0h104v20H0z"/>
        </g>
        <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
            <text x="31.5" y="15" fill="#010101" fill-opacity=".3">coverage</text>
            <text x="31.5" y="14">coverage</text>
            <text x="82.5" y="15" fill="#010101" fill-opacity=".3">{coverage:.0f}%</text>
            <text x="82.5" y="14">{coverage:.0f}%</text>
        </g>
        </svg>"""
        
        Path(output_path).write_text(svg)
    
    def _generate_lcov(self, coverage_data: Dict, output_path: str):
        """Generate LCOV format report."""
        lines = []
        
        for file_data in coverage_data.get('files', []):
            file_path = file_data['path']
            lines.append(f"SF:{file_path}")
            
            # Add function data if available
            if 'functions' in file_data:
                for func in file_data['functions']:
                    lines.append(f"FN:{func['start_line']},{func['name']}")
                    lines.append(f"FNDA:{func['hits']},{func['name']}")
            
            # Add line data
            for line_num in range(1, file_data.get('total_lines', 0) + 1):
                if line_num in file_data.get('missing_lines', []):
                    lines.append(f"DA:{line_num},0")
                elif line_num in file_data.get('executed_lines', []):
                    lines.append(f"DA:{line_num},1")
            
            # Add branch data if available
            if 'branches' in file_data:
                for branch in file_data['branches']:
                    lines.append(f"BA:{branch['line']},{branch['hits']}")
            
            lines.append("end_of_record")
        
        Path(output_path).write_text('\n'.join(lines))
    
    def _prepare_report_data(self, coverage_data: Dict) -> Dict:
        """Prepare data for report generation."""
        return {
            'summary': {
                'line_coverage': coverage_data.get('line_coverage', 0),
                'branch_coverage': coverage_data.get('branch_coverage', 0),
                'class_coverage': coverage_data.get('class_coverage', 0),
                'total_lines': coverage_data.get('total_lines', 0),
                'covered_lines': coverage_data.get('covered_lines', 0),
                'total_branches': coverage_data.get('total_branches', 0),
                'covered_branches': coverage_data.get('covered_branches', 0),
                'total_files': len(coverage_data.get('files', []))
            },
            'files': coverage_data.get('files', []),
            'uncovered_files': coverage_data.get('uncovered_files', []),
            'classes': coverage_data.get('classes', {}),
            'trends': coverage_data.get('trends', {})
        }
    
    def _coverage_color(self, coverage: float) -> str:
        """Get color for coverage percentage."""
        if coverage >= 90:
            return self.config.threshold_colors['high']
        elif coverage >= 80:
            return self.config.threshold_colors['medium']
        elif coverage >= 70:
            return self.config.threshold_colors['low']
        elif coverage >= 60:
            return self.config.threshold_colors['poor']
        else:
            return self.config.threshold_colors['critical']
    
    def _get_coverage_color(self, coverage: float) -> str:
        """Get hex color for coverage percentage."""
        return self._coverage_color(coverage)
    
    def _format_console_coverage(self, coverage: float, colors: Dict) -> str:
        """Format coverage for console output."""
        if coverage >= 90:
            color = colors.get('high', '')
        elif coverage >= 80:
            color = colors.get('medium', '')
        elif coverage >= 70:
            color = colors.get('low', '')
        elif coverage >= 60:
            color = colors.get('poor', '')
        else:
            color = colors.get('critical', '')
        
        reset = colors.get('reset', '')
        return f"{color}{coverage:.2f}%{reset}"
    
    def _copy_assets(self, output_dir: Path):
        """Copy CSS and JS assets for HTML report."""
        assets_dir = output_dir / 'assets'
        assets_dir.mkdir(exist_ok=True)
        
        # Write default CSS if no custom CSS provided
        if not self.config.custom_css:
            css_content = self._get_default_css()
            (assets_dir / 'style.css').write_text(css_content)
    
    def _get_default_html_template(self) -> str:
        """Get default HTML template."""
        return """<!DOCTYPE html>
<html>
<head>
    <title>{{ config.title }}</title>
    <meta charset="utf-8">
    <style>{{ css|default(default_css, true) }}</style>
</head>
<body>
    <div class="container">
        <h1>{{ config.title }}</h1>
        <div class="summary">
            <div class="metric">
                <span class="label">Line Coverage:</span>
                <span class="value" style="color: {{ data.summary.line_coverage|coverage_color }}">
                    {{ data.summary.line_coverage|format_percentage }}
                </span>
            </div>
            <div class="metric">
                <span class="label">Branch Coverage:</span>
                <span class="value" style="color: {{ data.summary.branch_coverage|coverage_color }}">
                    {{ data.summary.branch_coverage|format_percentage }}
                </span>
            </div>
            {% if config.show_classes %}
            <div class="metric">
                <span class="label">Class Coverage:</span>
                <span class="value" style="color: {{ data.summary.class_coverage|coverage_color }}">
                    {{ data.summary.class_coverage|format_percentage }}
                </span>
            </div>
            {% endif %}
        </div>
        
        <h2>File Coverage</h2>
        <table class="coverage-table">
            <thead>
                <tr>
                    <th>File</th>
                    <th>Line Coverage</th>
                    {% if config.show_branches %}
                    <th>Branch Coverage</th>
                    {% endif %}
                    {% if config.show_missing %}
                    <th>Missing Lines</th>
                    {% endif %}
                </tr>
            </thead>
            <tbody>
                {% for file in data.files %}
                <tr>
                    <td>{{ file.path }}</td>
                    <td style="color: {{ file.line_coverage|coverage_color }}">
                        {{ file.line_coverage|format_percentage }}
                    </td>
                    {% if config.show_branches %}
                    <td style="color: {{ file.branch_coverage|coverage_color }}">
                        {{ file.branch_coverage|format_percentage }}
                    </td>
                    {% endif %}
                    {% if config.show_missing %}
                    <td>{{ file.missing_lines|length }}</td>
                    {% endif %}
                </tr>
                {% endfor %}
            </tbody>
        </table>
        
        <footer>
            <p>Generated: {{ timestamp }}</p>
        </footer>
    </div>
</body>
</html>"""
    
    def _get_default_markdown_template(self) -> str:
        """Get default Markdown template."""
        return """# {{ config.title }}

Generated: {{ timestamp }}

## Summary

- **Line Coverage:** {{ data.summary.line_coverage|format_percentage }}
- **Branch Coverage:** {{ data.summary.branch_coverage|format_percentage }}
{% if config.show_classes -%}
- **Class Coverage:** {{ data.summary.class_coverage|format_percentage }}
{% endif -%}
- **Total Files:** {{ data.summary.total_files }}

## File Coverage

| File | Line Coverage | Branch Coverage | Missing Lines |
|------|--------------|-----------------|---------------|
{% for file in data.files -%}
| {{ file.path }} | {{ file.line_coverage|format_percentage }} | {{ file.branch_coverage|format_percentage }} | {{ file.missing_lines|length }} |
{% endfor %}

{% if data.uncovered_files -%}
## Uncovered Files

{% for file in data.uncovered_files -%}
- {{ file }}
{% endfor %}
{% endif %}"""
    
    def _get_default_css(self) -> str:
        """Get default CSS styles."""
        return """
body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    line-height: 1.6;
    margin: 0;
    padding: 20px;
    background: #f5f5f5;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    background: white;
    padding: 30px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

h1 {
    color: #333;
    border-bottom: 3px solid #007bff;
    padding-bottom: 10px;
}

.summary {
    display: flex;
    gap: 30px;
    margin: 30px 0;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;
}

.metric {
    flex: 1;
}

.metric .label {
    display: block;
    color: #666;
    font-size: 14px;
    margin-bottom: 5px;
}

.metric .value {
    font-size: 32px;
    font-weight: bold;
}

.coverage-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
}

.coverage-table th {
    background: #007bff;
    color: white;
    padding: 12px;
    text-align: left;
}

.coverage-table td {
    padding: 10px 12px;
    border-bottom: 1px solid #ddd;
}

.coverage-table tr:hover {
    background: #f8f9fa;
}

footer {
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid #ddd;
    color: #666;
    text-align: center;
}
"""