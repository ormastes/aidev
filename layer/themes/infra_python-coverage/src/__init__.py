"""
Python Branch and Class Coverage

Comprehensive coverage analysis for Python including branch coverage,
class-level metrics, and system test coverage tracking.
"""

from .coverage_analyzer import CoverageAnalyzer, CoverageResult, FileCoverage, DirectoryCoverage
from .class_tracker import ClassCoverageTracker, ClassMetrics, MethodCoverage
from .coverage_aggregator import CoverageAggregator, CombinedCoverage
from .coverage_enforcer import CoverageEnforcer, EnforcementResult, Threshold
from .report_generator import ReportGenerator, ReportFormat
from .coverage_trends import CoverageTrends, TrendReport
from .differential_coverage import DifferentialCoverage, CoverageDiff

__version__ = '1.0.0'
__all__ = [
    'CoverageAnalyzer',
    'CoverageResult',
    'FileCoverage',
    'DirectoryCoverage',
    'ClassCoverageTracker',
    'ClassMetrics',
    'MethodCoverage',
    'CoverageAggregator',
    'CombinedCoverage',
    'CoverageEnforcer',
    'EnforcementResult',
    'Threshold',
    'ReportGenerator',
    'ReportFormat',
    'CoverageTrends',
    'TrendReport',
    'DifferentialCoverage',
    'CoverageDiff'
]