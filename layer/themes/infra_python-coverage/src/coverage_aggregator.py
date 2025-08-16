"""
Coverage Aggregator

Combines coverage from multiple test runs and sources.
"""

import json
import os
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple
from pathlib import Path
import coverage
from coverage.data import CoverageData


@dataclass
class CoverageSource:
    """Coverage data from a single source."""
    name: str
    type: str  # unit, integration, system, e2e
    coverage_file: str
    timestamp: str
    data: Optional[CoverageData] = None
    metrics: Dict = field(default_factory=dict)


@dataclass
class CombinedCoverage:
    """Combined coverage from multiple sources."""
    sources: List[CoverageSource]
    total_lines: int
    covered_lines: int
    total_branches: int
    covered_branches: int
    line_coverage: float
    branch_coverage: float
    files: Dict[str, Dict]  # file -> coverage data
    uncovered_lines: Dict[str, Set[int]]  # file -> line numbers
    source_attribution: Dict[str, Dict[int, List[str]]]  # file -> line -> sources


class CoverageAggregator:
    """Aggregates coverage from multiple test runs."""
    
    def __init__(self, base_dir: Optional[str] = None):
        """
        Initialize coverage aggregator.
        
        Args:
            base_dir: Base directory for coverage files
        """
        self.base_dir = base_dir or os.getcwd()
        self.sources: List[CoverageSource] = []
        self.combined_data: Optional[CoverageData] = None
        
    def add_coverage(self, name: str, coverage_file: str, 
                    source_type: str = 'unit', timestamp: Optional[str] = None):
        """
        Add coverage data from a source.
        
        Args:
            name: Name of the coverage source
            coverage_file: Path to coverage file
            source_type: Type of tests (unit, integration, system, e2e)
            timestamp: Optional timestamp for the coverage run
        """
        # Load coverage data
        cov = coverage.Coverage()
        cov_data = CoverageData()
        
        # Handle different file formats
        if coverage_file.endswith('.json'):
            with open(coverage_file, 'r') as f:
                json_data = json.load(f)
                # Convert JSON to CoverageData (simplified)
                for file_path, file_data in json_data.get('files', {}).items():
                    lines = file_data.get('executed_lines', [])
                    cov_data.add_lines({file_path: lines})
        else:
            # Assume it's a .coverage file
            cov_data.read_file(coverage_file)
        
        # Create source
        source = CoverageSource(
            name=name,
            type=source_type,
            coverage_file=coverage_file,
            timestamp=timestamp or "",
            data=cov_data
        )
        
        # Calculate metrics
        self._calculate_source_metrics(source)
        
        self.sources.append(source)
    
    def _calculate_source_metrics(self, source: CoverageSource):
        """Calculate metrics for a coverage source."""
        if not source.data:
            return
        
        total_lines = 0
        covered_lines = 0
        
        for file_path in source.data.measured_files():
            lines = source.data.lines(file_path) or []
            total_lines += len(lines)
            covered_lines += len([l for l in lines if l > 0])
        
        source.metrics = {
            'total_lines': total_lines,
            'covered_lines': covered_lines,
            'line_coverage': (covered_lines / total_lines * 100) if total_lines > 0 else 0,
            'files_count': len(source.data.measured_files())
        }
    
    def combine(self, method: str = 'union') -> CombinedCoverage:
        """
        Combine coverage from all sources.
        
        Args:
            method: Combination method ('union' or 'intersection')
            
        Returns:
            Combined coverage data
        """
        if not self.sources:
            raise ValueError("No coverage sources added")
        
        # Initialize combined data
        self.combined_data = CoverageData()
        files_coverage = {}
        source_attribution = {}
        
        # Process each source
        for source in self.sources:
            if not source.data:
                continue
            
            for file_path in source.data.measured_files():
                if file_path not in files_coverage:
                    files_coverage[file_path] = {
                        'lines': set(),
                        'branches': set(),
                        'sources': []
                    }
                    source_attribution[file_path] = {}
                
                # Get lines from this source
                lines = source.data.lines(file_path) or []
                
                if method == 'union':
                    # Add all covered lines
                    files_coverage[file_path]['lines'].update(lines)
                elif method == 'intersection':
                    # Keep only lines covered by all sources
                    if len(files_coverage[file_path]['sources']) == 0:
                        files_coverage[file_path]['lines'] = set(lines)
                    else:
                        files_coverage[file_path]['lines'] &= set(lines)
                
                # Track source attribution
                for line in lines:
                    if line not in source_attribution[file_path]:
                        source_attribution[file_path][line] = []
                    source_attribution[file_path][line].append(source.name)
                
                files_coverage[file_path]['sources'].append(source.name)
        
        # Calculate combined metrics
        total_lines = 0
        covered_lines = 0
        uncovered_lines = {}
        
        for file_path, data in files_coverage.items():
            # Get all possible lines in file
            all_lines = self._get_all_lines(file_path)
            total_lines += len(all_lines)
            covered_lines += len(data['lines'])
            
            # Find uncovered lines
            uncovered = all_lines - data['lines']
            if uncovered:
                uncovered_lines[file_path] = uncovered
            
            # Update combined coverage data
            if data['lines']:
                self.combined_data.add_lines({file_path: list(data['lines'])})
        
        # Create combined coverage result
        line_coverage = (covered_lines / total_lines * 100) if total_lines > 0 else 0
        
        return CombinedCoverage(
            sources=self.sources,
            total_lines=total_lines,
            covered_lines=covered_lines,
            total_branches=0,  # TODO: Implement branch coverage
            covered_branches=0,
            line_coverage=line_coverage,
            branch_coverage=0.0,
            files=files_coverage,
            uncovered_lines=uncovered_lines,
            source_attribution=source_attribution
        )
    
    def _get_all_lines(self, file_path: str) -> Set[int]:
        """Get all executable lines in a file."""
        try:
            with open(file_path, 'r') as f:
                # Simple approximation: count non-empty, non-comment lines
                lines = set()
                for i, line in enumerate(f, 1):
                    line = line.strip()
                    if line and not line.startswith('#'):
                        lines.add(i)
                return lines
        except Exception:
            return set()
    
    def get_uncovered_lines(self, file_path: Optional[str] = None) -> Dict[str, List[int]]:
        """
        Get uncovered lines for files.
        
        Args:
            file_path: Optional specific file path
            
        Returns:
            Dictionary mapping files to uncovered line numbers
        """
        if not self.combined_data:
            self.combine()
        
        result = {}
        
        if file_path:
            # Get uncovered lines for specific file
            all_lines = self._get_all_lines(file_path)
            covered_lines = set(self.combined_data.lines(file_path) or [])
            uncovered = sorted(all_lines - covered_lines)
            if uncovered:
                result[file_path] = uncovered
        else:
            # Get uncovered lines for all files
            for fp in self.combined_data.measured_files():
                all_lines = self._get_all_lines(fp)
                covered_lines = set(self.combined_data.lines(fp) or [])
                uncovered = sorted(all_lines - covered_lines)
                if uncovered:
                    result[fp] = uncovered
        
        return result
    
    def get_source_contribution(self) -> Dict[str, Dict]:
        """
        Get contribution of each source to overall coverage.
        
        Returns:
            Dictionary with source contributions
        """
        contributions = {}
        
        for source in self.sources:
            contributions[source.name] = {
                'type': source.type,
                'metrics': source.metrics,
                'unique_lines': 0,
                'shared_lines': 0
            }
        
        # Calculate unique and shared lines
        if self.combined_data:
            combined = self.combine()
            
            for file_path, attribution in combined.source_attribution.items():
                for line, sources in attribution.items():
                    if len(sources) == 1:
                        contributions[sources[0]]['unique_lines'] += 1
                    else:
                        for source in sources:
                            contributions[source]['shared_lines'] += 1
        
        return contributions
    
    def generate_report(self, combined: CombinedCoverage, output_file: str, 
                       format: str = 'html'):
        """
        Generate aggregated coverage report.
        
        Args:
            combined: Combined coverage data
            output_file: Output file path
            format: Report format (html, json, markdown)
        """
        if format == 'html':
            self._generate_html_report(combined, output_file)
        elif format == 'json':
            self._generate_json_report(combined, output_file)
        elif format == 'markdown':
            self._generate_markdown_report(combined, output_file)
        else:
            raise ValueError(f"Unsupported format: {format}")
    
    def _generate_html_report(self, combined: CombinedCoverage, output_file: str):
        """Generate HTML aggregated report."""
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Aggregated Coverage Report</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                .summary {{ background: #f0f0f0; padding: 20px; border-radius: 5px; }}
                .source {{ margin: 10px 0; padding: 10px; border: 1px solid #ddd; }}
                .good {{ color: green; }}
                .warning {{ color: orange; }}
                .bad {{ color: red; }}
                table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background: #f0f0f0; }}
                .file-detail {{ margin-left: 20px; font-size: 0.9em; }}
            </style>
        </head>
        <body>
            <h1>Aggregated Coverage Report</h1>
            
            <div class="summary">
                <h2>Overall Coverage</h2>
                <p class="{'good' if combined.line_coverage >= 90 else 'warning' if combined.line_coverage >= 80 else 'bad'}">
                    Line Coverage: {combined.line_coverage:.2f}% ({combined.covered_lines}/{combined.total_lines})
                </p>
                <p>Sources: {len(combined.sources)}</p>
            </div>
            
            <h2>Coverage Sources</h2>
        """
        
        for source in combined.sources:
            metrics = source.metrics
            html += f"""
            <div class="source">
                <h3>{source.name} ({source.type})</h3>
                <p>Coverage: {metrics.get('line_coverage', 0):.2f}%</p>
                <p>Files: {metrics.get('files_count', 0)}</p>
            </div>
            """
        
        html += """
            <h2>File Coverage</h2>
            <table>
                <tr>
                    <th>File</th>
                    <th>Lines Covered</th>
                    <th>Sources</th>
                </tr>
        """
        
        for file_path, data in sorted(combined.files.items()):
            coverage_pct = (len(data['lines']) / len(self._get_all_lines(file_path)) * 100) if data['lines'] else 0
            html += f"""
                <tr>
                    <td>{file_path}</td>
                    <td>{coverage_pct:.1f}%</td>
                    <td>{', '.join(data['sources'])}</td>
                </tr>
            """
        
        html += """
            </table>
        </body>
        </html>
        """
        
        with open(output_file, 'w') as f:
            f.write(html)
    
    def _generate_json_report(self, combined: CombinedCoverage, output_file: str):
        """Generate JSON aggregated report."""
        report = {
            'summary': {
                'line_coverage': combined.line_coverage,
                'covered_lines': combined.covered_lines,
                'total_lines': combined.total_lines,
                'sources_count': len(combined.sources)
            },
            'sources': [
                {
                    'name': s.name,
                    'type': s.type,
                    'metrics': s.metrics
                }
                for s in combined.sources
            ],
            'files': {}
        }
        
        for file_path, data in combined.files.items():
            report['files'][file_path] = {
                'covered_lines': len(data['lines']),
                'sources': data['sources']
            }
        
        with open(output_file, 'w') as f:
            json.dump(report, f, indent=2)
    
    def _generate_markdown_report(self, combined: CombinedCoverage, output_file: str):
        """Generate Markdown aggregated report."""
        lines = []
        lines.append("# Aggregated Coverage Report\n")
        lines.append(f"**Overall Coverage:** {combined.line_coverage:.2f}%")
        lines.append(f"**Lines:** {combined.covered_lines}/{combined.total_lines}")
        lines.append(f"**Sources:** {len(combined.sources)}\n")
        
        lines.append("## Coverage Sources\n")
        for source in combined.sources:
            metrics = source.metrics
            lines.append(f"### {source.name}")
            lines.append(f"- Type: {source.type}")
            lines.append(f"- Coverage: {metrics.get('line_coverage', 0):.2f}%")
            lines.append(f"- Files: {metrics.get('files_count', 0)}\n")
        
        lines.append("## Source Contributions\n")
        contributions = self.get_source_contribution()
        for name, contrib in contributions.items():
            lines.append(f"### {name}")
            lines.append(f"- Unique lines: {contrib['unique_lines']}")
            lines.append(f"- Shared lines: {contrib['shared_lines']}\n")
        
        with open(output_file, 'w') as f:
            f.write('\n'.join(lines))