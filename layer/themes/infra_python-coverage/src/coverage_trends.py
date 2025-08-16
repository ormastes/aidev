"""
Coverage Trends

Track and analyze coverage trends over time.
"""

import json
import os
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from pathlib import Path
from datetime import datetime, timedelta
import statistics


@dataclass
class CoverageDataPoint:
    """Single coverage measurement point."""
    timestamp: datetime
    line_coverage: float
    branch_coverage: float
    class_coverage: float
    total_lines: int
    covered_lines: int
    commit_hash: Optional[str] = None
    branch_name: Optional[str] = None
    test_suite: Optional[str] = None


@dataclass
class TrendAnalysis:
    """Analysis of coverage trends."""
    trend: str  # improving, declining, stable, volatile
    average_change: float
    volatility: float
    best_coverage: float
    worst_coverage: float
    current_coverage: float
    prediction_next: float
    confidence: float


@dataclass
class TrendReport:
    """Coverage trend report."""
    period_start: datetime
    period_end: datetime
    data_points: int
    trend_analysis: TrendAnalysis
    recommendations: List[str]
    charts: Dict[str, List]


class CoverageTrends:
    """Tracks and analyzes coverage trends over time."""
    
    def __init__(self, storage_path: Optional[str] = None):
        """
        Initialize coverage trends tracker.
        
        Args:
            storage_path: Path to store trend data
        """
        self.storage_path = Path(storage_path or ".coverage_trends")
        self.storage_path.mkdir(exist_ok=True)
        self.data_points: List[CoverageDataPoint] = []
        self._load_history()
    
    def _load_history(self):
        """Load historical coverage data."""
        history_file = self.storage_path / "history.json"
        if history_file.exists():
            with open(history_file, 'r') as f:
                data = json.load(f)
                for point in data.get('data_points', []):
                    self.data_points.append(CoverageDataPoint(
                        timestamp=datetime.fromisoformat(point['timestamp']),
                        line_coverage=point['line_coverage'],
                        branch_coverage=point['branch_coverage'],
                        class_coverage=point.get('class_coverage', 0),
                        total_lines=point['total_lines'],
                        covered_lines=point['covered_lines'],
                        commit_hash=point.get('commit_hash'),
                        branch_name=point.get('branch_name'),
                        test_suite=point.get('test_suite')
                    ))
    
    def _save_history(self):
        """Save coverage history to disk."""
        history_file = self.storage_path / "history.json"
        data = {
            'data_points': [
                {
                    'timestamp': point.timestamp.isoformat(),
                    'line_coverage': point.line_coverage,
                    'branch_coverage': point.branch_coverage,
                    'class_coverage': point.class_coverage,
                    'total_lines': point.total_lines,
                    'covered_lines': point.covered_lines,
                    'commit_hash': point.commit_hash,
                    'branch_name': point.branch_name,
                    'test_suite': point.test_suite
                }
                for point in self.data_points
            ]
        }
        
        with open(history_file, 'w') as f:
            json.dump(data, f, indent=2)
    
    def add_data_point(self, coverage_data: Dict, commit_hash: Optional[str] = None,
                      branch_name: Optional[str] = None, test_suite: Optional[str] = None):
        """
        Add a coverage data point.
        
        Args:
            coverage_data: Coverage metrics dictionary
            commit_hash: Git commit hash
            branch_name: Git branch name
            test_suite: Test suite name
        """
        point = CoverageDataPoint(
            timestamp=datetime.now(),
            line_coverage=coverage_data.get('line_coverage', 0),
            branch_coverage=coverage_data.get('branch_coverage', 0),
            class_coverage=coverage_data.get('class_coverage', 0),
            total_lines=coverage_data.get('total_lines', 0),
            covered_lines=coverage_data.get('covered_lines', 0),
            commit_hash=commit_hash,
            branch_name=branch_name,
            test_suite=test_suite
        )
        
        self.data_points.append(point)
        self._save_history()
    
    def analyze_trend(self, days: int = 30, metric: str = 'line_coverage') -> TrendAnalysis:
        """
        Analyze coverage trend for a period.
        
        Args:
            days: Number of days to analyze
            metric: Metric to analyze (line_coverage, branch_coverage, class_coverage)
            
        Returns:
            TrendAnalysis object
        """
        # Filter data points for period
        cutoff = datetime.now() - timedelta(days=days)
        recent_points = [p for p in self.data_points if p.timestamp >= cutoff]
        
        if len(recent_points) < 2:
            return TrendAnalysis(
                trend='insufficient_data',
                average_change=0,
                volatility=0,
                best_coverage=0,
                worst_coverage=0,
                current_coverage=0,
                prediction_next=0,
                confidence=0
            )
        
        # Extract metric values
        values = [getattr(p, metric) for p in recent_points]
        
        # Calculate statistics
        average_change = self._calculate_average_change(values)
        volatility = statistics.stdev(values) if len(values) > 1 else 0
        best = max(values)
        worst = min(values)
        current = values[-1]
        
        # Determine trend
        trend = self._determine_trend(values, average_change, volatility)
        
        # Predict next value
        prediction, confidence = self._predict_next(values)
        
        return TrendAnalysis(
            trend=trend,
            average_change=average_change,
            volatility=volatility,
            best_coverage=best,
            worst_coverage=worst,
            current_coverage=current,
            prediction_next=prediction,
            confidence=confidence
        )
    
    def _calculate_average_change(self, values: List[float]) -> float:
        """Calculate average change between consecutive values."""
        if len(values) < 2:
            return 0
        
        changes = [values[i+1] - values[i] for i in range(len(values)-1)]
        return sum(changes) / len(changes)
    
    def _determine_trend(self, values: List[float], avg_change: float, 
                        volatility: float) -> str:
        """Determine overall trend."""
        if volatility > 5:
            return 'volatile'
        elif avg_change > 0.5:
            return 'improving'
        elif avg_change < -0.5:
            return 'declining'
        else:
            return 'stable'
    
    def _predict_next(self, values: List[float]) -> Tuple[float, float]:
        """Predict next value using simple linear regression."""
        if len(values) < 3:
            return values[-1] if values else 0, 0
        
        # Simple linear regression
        n = len(values)
        x = list(range(n))
        
        # Calculate slope and intercept
        x_mean = sum(x) / n
        y_mean = sum(values) / n
        
        numerator = sum((x[i] - x_mean) * (values[i] - y_mean) for i in range(n))
        denominator = sum((x[i] - x_mean) ** 2 for i in range(n))
        
        if denominator == 0:
            return values[-1], 0
        
        slope = numerator / denominator
        intercept = y_mean - slope * x_mean
        
        # Predict next value
        prediction = slope * n + intercept
        
        # Calculate confidence based on R-squared
        ss_tot = sum((values[i] - y_mean) ** 2 for i in range(n))
        ss_res = sum((values[i] - (slope * x[i] + intercept)) ** 2 for i in range(n))
        
        r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0
        confidence = max(0, min(100, r_squared * 100))
        
        # Ensure prediction is within valid range
        prediction = max(0, min(100, prediction))
        
        return prediction, confidence
    
    def generate_report(self, days: int = 30) -> TrendReport:
        """
        Generate comprehensive trend report.
        
        Args:
            days: Number of days to analyze
            
        Returns:
            TrendReport object
        """
        cutoff = datetime.now() - timedelta(days=days)
        recent_points = [p for p in self.data_points if p.timestamp >= cutoff]
        
        if not recent_points:
            return TrendReport(
                period_start=cutoff,
                period_end=datetime.now(),
                data_points=0,
                trend_analysis=self.analyze_trend(days),
                recommendations=[],
                charts={}
            )
        
        # Analyze trends for all metrics
        line_trend = self.analyze_trend(days, 'line_coverage')
        branch_trend = self.analyze_trend(days, 'branch_coverage')
        class_trend = self.analyze_trend(days, 'class_coverage')
        
        # Generate recommendations
        recommendations = self._generate_recommendations(
            line_trend, branch_trend, class_trend
        )
        
        # Prepare chart data
        charts = self._prepare_chart_data(recent_points)
        
        return TrendReport(
            period_start=recent_points[0].timestamp,
            period_end=recent_points[-1].timestamp,
            data_points=len(recent_points),
            trend_analysis=line_trend,
            recommendations=recommendations,
            charts=charts
        )
    
    def _generate_recommendations(self, line_trend: TrendAnalysis,
                                 branch_trend: TrendAnalysis,
                                 class_trend: TrendAnalysis) -> List[str]:
        """Generate actionable recommendations based on trends."""
        recommendations = []
        
        # Line coverage recommendations
        if line_trend.trend == 'declining':
            recommendations.append(
                "⚠️ Line coverage is declining. Review recent changes and add tests for new code."
            )
        elif line_trend.current_coverage < 80:
            recommendations.append(
                "📊 Line coverage is below 80%. Focus on testing uncovered code paths."
            )
        
        # Branch coverage recommendations
        if branch_trend.current_coverage < line_trend.current_coverage - 10:
            recommendations.append(
                "🔀 Branch coverage significantly lower than line coverage. Add tests for conditional logic."
            )
        
        # Class coverage recommendations
        if class_trend.trend == 'declining':
            recommendations.append(
                "📦 Class coverage is declining. Ensure new classes have comprehensive tests."
            )
        
        # Volatility recommendations
        if line_trend.volatility > 5:
            recommendations.append(
                "📈 Coverage is volatile. Consider enforcing coverage requirements in CI/CD."
            )
        
        # Positive reinforcement
        if line_trend.trend == 'improving':
            recommendations.append(
                "✅ Coverage is improving! Keep up the good work."
            )
        
        if line_trend.current_coverage >= 90:
            recommendations.append(
                "🏆 Excellent coverage! Consider maintaining this level with strict thresholds."
            )
        
        return recommendations
    
    def _prepare_chart_data(self, points: List[CoverageDataPoint]) -> Dict[str, List]:
        """Prepare data for charting."""
        return {
            'timestamps': [p.timestamp.isoformat() for p in points],
            'line_coverage': [p.line_coverage for p in points],
            'branch_coverage': [p.branch_coverage for p in points],
            'class_coverage': [p.class_coverage for p in points],
            'total_lines': [p.total_lines for p in points],
            'covered_lines': [p.covered_lines for p in points]
        }
    
    def compare_branches(self, base_branch: str = 'main') -> Dict[str, Dict]:
        """
        Compare coverage between branches.
        
        Args:
            base_branch: Base branch to compare against
            
        Returns:
            Dictionary with branch comparisons
        """
        # Group data points by branch
        branch_data = {}
        for point in self.data_points:
            branch = point.branch_name or 'unknown'
            if branch not in branch_data:
                branch_data[branch] = []
            branch_data[branch].append(point)
        
        # Get base branch stats
        base_points = branch_data.get(base_branch, [])
        if not base_points:
            return {}
        
        base_avg = sum(p.line_coverage for p in base_points) / len(base_points)
        
        # Compare other branches
        comparisons = {}
        for branch, points in branch_data.items():
            if branch == base_branch or not points:
                continue
            
            branch_avg = sum(p.line_coverage for p in points) / len(points)
            latest = points[-1].line_coverage if points else 0
            
            comparisons[branch] = {
                'average': branch_avg,
                'latest': latest,
                'diff_from_base': branch_avg - base_avg,
                'trend': 'better' if branch_avg > base_avg else 'worse'
            }
        
        return comparisons
    
    def get_coverage_by_commit(self, commit_hash: str) -> Optional[CoverageDataPoint]:
        """
        Get coverage data for a specific commit.
        
        Args:
            commit_hash: Git commit hash
            
        Returns:
            CoverageDataPoint or None
        """
        for point in self.data_points:
            if point.commit_hash == commit_hash:
                return point
        return None
    
    def export_csv(self, output_file: str, days: Optional[int] = None):
        """
        Export trend data to CSV.
        
        Args:
            output_file: Output CSV file path
            days: Optional number of days to export
        """
        import csv
        
        points = self.data_points
        if days:
            cutoff = datetime.now() - timedelta(days=days)
            points = [p for p in points if p.timestamp >= cutoff]
        
        with open(output_file, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                'Timestamp', 'Line Coverage', 'Branch Coverage', 'Class Coverage',
                'Total Lines', 'Covered Lines', 'Commit', 'Branch', 'Test Suite'
            ])
            
            for point in points:
                writer.writerow([
                    point.timestamp.isoformat(),
                    point.line_coverage,
                    point.branch_coverage,
                    point.class_coverage,
                    point.total_lines,
                    point.covered_lines,
                    point.commit_hash or '',
                    point.branch_name or '',
                    point.test_suite or ''
                ])
    
    def generate_sparkline(self, width: int = 20, metric: str = 'line_coverage') -> str:
        """
        Generate ASCII sparkline chart.
        
        Args:
            width: Width of sparkline
            metric: Metric to display
            
        Returns:
            ASCII sparkline string
        """
        if len(self.data_points) < 2:
            return '—' * width
        
        # Get recent values
        values = [getattr(p, metric) for p in self.data_points[-width:]]
        
        if not values:
            return '—' * width
        
        # Normalize to 0-7 range for Unicode block characters
        min_val = min(values)
        max_val = max(values)
        range_val = max_val - min_val or 1
        
        blocks = ' ▁▂▃▄▅▆▇█'
        sparkline = ''
        
        for val in values:
            normalized = int((val - min_val) / range_val * 8)
            sparkline += blocks[normalized]
        
        return sparkline