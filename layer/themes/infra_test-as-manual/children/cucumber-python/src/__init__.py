"""
Cucumber-Python BDD Framework

Comprehensive BDD testing solution for Python with Behave integration
and test-as-manual documentation generation.
"""

from .behave_wrapper import BehaveWrapper, TestResult, ScenarioInfo
from .manual_generator import ManualTestGenerator
from .step_manager import StepManager, StepDefinition
from .gherkin_parser import GherkinParser, Feature, Scenario, Step

__version__ = '1.0.0'
__all__ = [
    'BehaveWrapper',
    'TestResult', 
    'ScenarioInfo',
    'ManualTestGenerator',
    'StepManager',
    'StepDefinition',
    'GherkinParser',
    'Feature',
    'Scenario',
    'Step'
]