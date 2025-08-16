"""
Differential Coverage

Analyze coverage changes between commits, branches, or versions.
"""

import json
import subprocess
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple
from pathlib import Path
import difflib


@dataclass
class FileDiff:
    """Coverage diff for a single file."""
    file_path: str
    base_coverage: float
    head_coverage: float
    coverage_change: float
    new_lines: Set[int]
    modified_lines: Set[int]
    deleted_lines: Set[int]
    newly_covered: Set[int]
    newly_uncovered: Set[int]
    status: str  # improved, degraded, unchanged, new, deleted


@dataclass
class CoverageDiff:
    """Overall coverage diff between two versions."""
    base_version: str
    head_version: str
    overall_change: float
    line_coverage_change: float
    branch_coverage_change: float
    files_improved: List[FileDiff]
    files_degraded: List[FileDiff]
    new_files: List[FileDiff]
    deleted_files: List[str]
    summary: Dict[str, Any]


class DifferentialCoverage:
    """Analyzes coverage differences between versions."""
    
    def __init__(self, repo_path: Optional[str] = None):
        """
        Initialize differential coverage analyzer.
        
        Args:
            repo_path: Path to git repository
        """
        self.repo_path = Path(repo_path or os.getcwd())
    
    def compare(self, base_coverage: str, head_coverage: str,
               base_version: Optional[str] = None,
               head_version: Optional[str] = None) -> CoverageDiff:
        """
        Compare coverage between two versions.
        
        Args:
            base_coverage: Path to base coverage file
            head_coverage: Path to head coverage file
            base_version: Optional base version identifier
            head_version: Optional head version identifier
            
        Returns:
            CoverageDiff object
        """
        # Load coverage data
        with open(base_coverage, 'r') as f:
            base_data = json.load(f)
        with open(head_coverage, 'r') as f:
            head_data = json.load(f)
        
        # Get file diffs
        file_diffs = self._analyze_file_diffs(base_data, head_data)
        
        # Categorize changes
        files_improved = [d for d in file_diffs if d.status == 'improved']
        files_degraded = [d for d in file_diffs if d.status == 'degraded']
        new_files = [d for d in file_diffs if d.status == 'new']
        
        # Find deleted files
        base_files = {f['path'] for f in base_data.get('files', [])}
        head_files = {f['path'] for f in head_data.get('files', [])}
        deleted_files = list(base_files - head_files)
        
        # Calculate overall changes
        base_line_cov = base_data.get('line_coverage', 0)
        head_line_cov = head_data.get('line_coverage', 0)
        line_change = head_line_cov - base_line_cov
        
        base_branch_cov = base_data.get('branch_coverage', 0)
        head_branch_cov = head_data.get('branch_coverage', 0)
        branch_change = head_branch_cov - base_branch_cov
        
        overall_change = (line_change + branch_change) / 2
        
        # Create summary
        summary = self._create_summary(
            base_data, head_data, files_improved, files_degraded, new_files
        )
        
        return CoverageDiff(
            base_version=base_version or 'base',
            head_version=head_version or 'head',
            overall_change=overall_change,
            line_coverage_change=line_change,
            branch_coverage_change=branch_change,
            files_improved=files_improved,
            files_degraded=files_degraded,
            new_files=new_files,
            deleted_files=deleted_files,
            summary=summary
        )
    
    def _analyze_file_diffs(self, base_data: Dict, head_data: Dict) -> List[FileDiff]:
        """Analyze coverage differences for each file."""
        diffs = []
        
        # Create lookup maps
        base_files = {f['path']: f for f in base_data.get('files', [])}
        head_files = {f['path']: f for f in head_data.get('files', [])}
        
        # Process all files in head
        for file_path, head_file in head_files.items():
            base_file = base_files.get(file_path)
            
            if base_file:
                # File exists in both versions
                diff = self._create_file_diff(file_path, base_file, head_file)
            else:
                # New file
                diff = FileDiff(
                    file_path=file_path,
                    base_coverage=0,
                    head_coverage=head_file.get('line_coverage', 0),
                    coverage_change=head_file.get('line_coverage', 0),
                    new_lines=set(range(1, head_file.get('total_lines', 0) + 1)),
                    modified_lines=set(),
                    deleted_lines=set(),
                    newly_covered=set(head_file.get('executed_lines', [])),
                    newly_uncovered=set(head_file.get('missing_lines', [])),
                    status='new'
                )
            
            diffs.append(diff)
        
        return diffs
    
    def _create_file_diff(self, file_path: str, base_file: Dict, 
                         head_file: Dict) -> FileDiff:
        """Create diff for a single file."""
        base_coverage = base_file.get('line_coverage', 0)
        head_coverage = head_file.get('line_coverage', 0)
        coverage_change = head_coverage - base_coverage
        
        # Get line-level changes
        base_executed = set(base_file.get('executed_lines', []))
        head_executed = set(head_file.get('executed_lines', []))
        
        base_missing = set(base_file.get('missing_lines', []))
        head_missing = set(head_file.get('missing_lines', []))
        
        newly_covered = head_executed - base_executed
        newly_uncovered = head_missing - base_missing
        
        # Determine status
        if coverage_change > 0.1:
            status = 'improved'
        elif coverage_change < -0.1:
            status = 'degraded'
        else:
            status = 'unchanged'
        
        # Get actual code changes if available
        new_lines, modified_lines, deleted_lines = self._get_code_changes(file_path)
        
        return FileDiff(
            file_path=file_path,
            base_coverage=base_coverage,
            head_coverage=head_coverage,
            coverage_change=coverage_change,
            new_lines=new_lines,
            modified_lines=modified_lines,
            deleted_lines=deleted_lines,
            newly_covered=newly_covered,
            newly_uncovered=newly_uncovered,
            status=status
        )
    
    def _get_code_changes(self, file_path: str) -> Tuple[Set[int], Set[int], Set[int]]:
        """Get actual code changes from git diff."""
        try:
            # Get git diff for the file
            result = subprocess.run(
                ['git', 'diff', 'HEAD~1', 'HEAD', '--', file_path],
                cwd=self.repo_path,
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                return set(), set(), set()
            
            # Parse diff to find changed lines
            new_lines = set()
            modified_lines = set()
            deleted_lines = set()
            
            current_line_old = 0
            current_line_new = 0
            
            for line in result.stdout.split('\n'):
                if line.startswith('@@'):
                    # Parse hunk header
                    parts = line.split()
                    if len(parts) >= 3:
                        old_range = parts[1][1:]  # Remove '-'
                        new_range = parts[2][1:]  # Remove '+'
                        
                        old_start = int(old_range.split(',')[0])
                        new_start = int(new_range.split(',')[0])
                        
                        current_line_old = old_start
                        current_line_new = new_start
                
                elif line.startswith('+') and not line.startswith('+++'):
                    new_lines.add(current_line_new)
                    current_line_new += 1
                
                elif line.startswith('-') and not line.startswith('---'):
                    deleted_lines.add(current_line_old)
                    current_line_old += 1
                
                else:
                    current_line_old += 1
                    current_line_new += 1
            
            return new_lines, modified_lines, deleted_lines
            
        except Exception:
            return set(), set(), set()
    
    def _create_summary(self, base_data: Dict, head_data: Dict,
                       files_improved: List[FileDiff],
                       files_degraded: List[FileDiff],
                       new_files: List[FileDiff]) -> Dict:
        """Create summary statistics."""
        return {
            'total_files': len(head_data.get('files', [])),
            'files_improved': len(files_improved),
            'files_degraded': len(files_degraded),
            'new_files': len(new_files),
            'base_metrics': {
                'line_coverage': base_data.get('line_coverage', 0),
                'branch_coverage': base_data.get('branch_coverage', 0),
                'total_lines': base_data.get('total_lines', 0),
                'covered_lines': base_data.get('covered_lines', 0)
            },
            'head_metrics': {
                'line_coverage': head_data.get('line_coverage', 0),
                'branch_coverage': head_data.get('branch_coverage', 0),
                'total_lines': head_data.get('total_lines', 0),
                'covered_lines': head_data.get('covered_lines', 0)
            },
            'lines_added': head_data.get('total_lines', 0) - base_data.get('total_lines', 0),
            'coverage_impact': self._calculate_impact(files_improved, files_degraded)
        }
    
    def _calculate_impact(self, files_improved: List[FileDiff],
                         files_degraded: List[FileDiff]) -> str:
        """Calculate overall coverage impact."""
        if not files_degraded:
            if files_improved:
                return 'positive'
            return 'neutral'
        
        if len(files_improved) > len(files_degraded) * 2:
            return 'positive'
        elif len(files_degraded) > len(files_improved) * 2:
            return 'negative'
        
        # Check magnitude of changes
        improvement = sum(f.coverage_change for f in files_improved)
        degradation = sum(abs(f.coverage_change) for f in files_degraded)
        
        if improvement > degradation:
            return 'positive'
        elif degradation > improvement:
            return 'negative'
        
        return 'neutral'
    
    def generate_pr_comment(self, diff: CoverageDiff) -> str:
        """
        Generate Pull Request comment with coverage diff.
        
        Args:
            diff: CoverageDiff object
            
        Returns:
            Markdown formatted comment
        """
        # Determine emoji based on change
        if diff.overall_change > 0:
            emoji = "✅"
            status = "improved"
        elif diff.overall_change < 0:
            emoji = "⚠️"
            status = "decreased"
        else:
            emoji = "➖"
            status = "unchanged"
        
        comment = f"""## {emoji} Coverage Report

Coverage {status} by **{diff.overall_change:+.2f}%**

### Summary
- Line Coverage: **{diff.summary['head_metrics']['line_coverage']:.2f}%** ({diff.line_coverage_change:+.2f}%)
- Branch Coverage: **{diff.summary['head_metrics']['branch_coverage']:.2f}%** ({diff.branch_coverage_change:+.2f}%)
- Files: {diff.summary['total_files']} total, {diff.summary['new_files']} new

### Changes
"""
        
        # Add improved files
        if diff.files_improved:
            comment += "\n#### 📈 Improved Files\n"
            for file_diff in diff.files_improved[:5]:
                comment += f"- `{file_diff.file_path}`: {file_diff.head_coverage:.1f}% ({file_diff.coverage_change:+.1f}%)\n"
            
            if len(diff.files_improved) > 5:
                comment += f"- *...and {len(diff.files_improved) - 5} more*\n"
        
        # Add degraded files
        if diff.files_degraded:
            comment += "\n#### 📉 Degraded Files\n"
            for file_diff in diff.files_degraded[:5]:
                comment += f"- `{file_diff.file_path}`: {file_diff.head_coverage:.1f}% ({file_diff.coverage_change:+.1f}%)\n"
            
            if len(diff.files_degraded) > 5:
                comment += f"- *...and {len(diff.files_degraded) - 5} more*\n"
        
        # Add new files
        if diff.new_files:
            comment += "\n#### 🆕 New Files\n"
            for file_diff in diff.new_files[:5]:
                comment += f"- `{file_diff.file_path}`: {file_diff.head_coverage:.1f}%\n"
            
            if len(diff.new_files) > 5:
                comment += f"- *...and {len(diff.new_files) - 5} more*\n"
        
        return comment
    
    def analyze_uncovered_changes(self, diff: CoverageDiff) -> List[Dict]:
        """
        Find code changes that are not covered by tests.
        
        Args:
            diff: CoverageDiff object
            
        Returns:
            List of uncovered changes
        """
        uncovered_changes = []
        
        for file_diff in diff.files_improved + diff.files_degraded + diff.new_files:
            # Find new/modified lines that are uncovered
            uncovered_new = file_diff.new_lines & file_diff.newly_uncovered
            uncovered_modified = file_diff.modified_lines & file_diff.newly_uncovered
            
            if uncovered_new or uncovered_modified:
                uncovered_changes.append({
                    'file': file_diff.file_path,
                    'uncovered_new_lines': sorted(uncovered_new),
                    'uncovered_modified_lines': sorted(uncovered_modified),
                    'total_uncovered': len(uncovered_new) + len(uncovered_modified),
                    'risk_level': self._assess_risk_level(file_diff)
                })
        
        # Sort by risk level and total uncovered
        uncovered_changes.sort(
            key=lambda x: (x['risk_level'], -x['total_uncovered'])
        )
        
        return uncovered_changes
    
    def _assess_risk_level(self, file_diff: FileDiff) -> int:
        """
        Assess risk level of uncovered changes.
        
        Returns:
            Risk level (1=low, 2=medium, 3=high)
        """
        # High risk if coverage decreased significantly
        if file_diff.coverage_change < -10:
            return 3
        
        # High risk if many new uncovered lines
        if len(file_diff.newly_uncovered) > 50:
            return 3
        
        # Medium risk for moderate changes
        if file_diff.coverage_change < -5 or len(file_diff.newly_uncovered) > 20:
            return 2
        
        return 1
    
    def generate_focus_areas(self, diff: CoverageDiff) -> List[str]:
        """
        Generate list of areas to focus testing efforts.
        
        Args:
            diff: CoverageDiff object
            
        Returns:
            List of focus area recommendations
        """
        focus_areas = []
        
        # Analyze uncovered changes
        uncovered = self.analyze_uncovered_changes(diff)
        
        if uncovered:
            high_risk = [u for u in uncovered if u['risk_level'] == 3]
            if high_risk:
                focus_areas.append(
                    f"🔴 High Risk: {len(high_risk)} files with significant uncovered changes"
                )
                for item in high_risk[:3]:
                    focus_areas.append(f"  - {item['file']}: {item['total_uncovered']} uncovered lines")
        
        # Check for completely uncovered new files
        uncovered_new = [f for f in diff.new_files if f.head_coverage == 0]
        if uncovered_new:
            focus_areas.append(
                f"⚠️ {len(uncovered_new)} new files with no test coverage"
            )
        
        # Check for files with degraded coverage
        severely_degraded = [f for f in diff.files_degraded if f.coverage_change < -20]
        if severely_degraded:
            focus_areas.append(
                f"📉 {len(severely_degraded)} files with severely reduced coverage (>20% drop)"
            )
        
        # Positive reinforcement
        if not focus_areas:
            focus_areas.append("✅ All changes are well covered by tests!")
        
        return focus_areas