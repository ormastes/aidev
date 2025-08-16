"""
Gherkin Parser for Python

Parses Gherkin feature files and creates an AST representation.
"""

import re
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from pathlib import Path


@dataclass
class Step:
    """Represents a Gherkin step."""
    keyword: str  # Given, When, Then, And, But
    text: str
    line_number: int
    data_table: Optional[List[List[str]]] = None
    doc_string: Optional[str] = None
    doc_string_content_type: Optional[str] = None


@dataclass
class Example:
    """Represents examples for a scenario outline."""
    headers: List[str]
    rows: List[List[str]]
    line_number: int


@dataclass
class Scenario:
    """Represents a Gherkin scenario."""
    name: str
    description: str
    steps: List[Step]
    tags: List[str]
    line_number: int
    is_outline: bool = False
    examples: Optional[Example] = None
    

@dataclass
class Background:
    """Represents a Gherkin background."""
    steps: List[Step]
    line_number: int


@dataclass
class Feature:
    """Represents a Gherkin feature."""
    name: str
    description: str
    scenarios: List[Scenario]
    tags: List[str]
    background: Optional[Background] = None
    line_number: int = 1


class GherkinParser:
    """Parser for Gherkin feature files."""
    
    # Gherkin keywords
    FEATURE_KEYWORDS = ['Feature:', 'Ability:', 'Business Need:']
    BACKGROUND_KEYWORD = 'Background:'
    SCENARIO_KEYWORDS = ['Scenario:', 'Example:']
    SCENARIO_OUTLINE_KEYWORDS = ['Scenario Outline:', 'Scenario Template:']
    EXAMPLES_KEYWORDS = ['Examples:', 'Scenarios:']
    STEP_KEYWORDS = ['Given', 'When', 'Then', 'And', 'But', '*']
    
    def __init__(self):
        self.reset()
    
    def reset(self):
        """Reset parser state."""
        self.current_feature = None
        self.current_scenario = None
        self.current_background = None
        self.current_examples = None
        self.current_step = None
        self.current_doc_string = None
        self.current_data_table = None
        self.line_number = 0
    
    def parse_file(self, file_path: str) -> Feature:
        """Parse a Gherkin feature file."""
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return self.parse(content)
    
    def parse(self, content: str) -> Feature:
        """Parse Gherkin content."""
        self.reset()
        lines = content.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            self.line_number = line_num
            self.parse_line(line)
        
        # Finalize any pending elements
        self.finalize_parsing()
        
        if not self.current_feature:
            raise ValueError("No feature found in content")
        
        return self.current_feature
    
    def parse_line(self, line: str):
        """Parse a single line."""
        # Remove comments
        if '#' in line:
            comment_pos = line.index('#')
            line = line[:comment_pos]
        
        # Strip whitespace
        stripped = line.strip()
        
        if not stripped:
            return
        
        # Check for doc string
        if stripped.startswith('"""') or stripped.startswith("'''"):
            self.handle_doc_string(line)
            return
        
        # Check for data table
        if stripped.startswith('|'):
            self.handle_data_table(line)
            return
        
        # Check for tags
        if stripped.startswith('@'):
            self.handle_tags(stripped)
            return
        
        # Check for keywords
        for keyword in self.FEATURE_KEYWORDS:
            if stripped.startswith(keyword):
                self.handle_feature(stripped, keyword)
                return
        
        if stripped.startswith(self.BACKGROUND_KEYWORD):
            self.handle_background()
            return
        
        for keyword in self.SCENARIO_OUTLINE_KEYWORDS:
            if stripped.startswith(keyword):
                self.handle_scenario_outline(stripped, keyword)
                return
        
        for keyword in self.SCENARIO_KEYWORDS:
            if stripped.startswith(keyword):
                self.handle_scenario(stripped, keyword)
                return
        
        for keyword in self.EXAMPLES_KEYWORDS:
            if stripped.startswith(keyword):
                self.handle_examples()
                return
        
        for keyword in self.STEP_KEYWORDS:
            if stripped.startswith(keyword + ' '):
                self.handle_step(stripped, keyword)
                return
        
        # If not a keyword, it might be description text
        self.handle_description(line)
    
    def handle_feature(self, line: str, keyword: str):
        """Handle feature declaration."""
        self.finalize_scenario()
        
        name = line[len(keyword):].strip()
        self.current_feature = Feature(
            name=name,
            description='',
            scenarios=[],
            tags=self.pending_tags if hasattr(self, 'pending_tags') else [],
            line_number=self.line_number
        )
        
        if hasattr(self, 'pending_tags'):
            delattr(self, 'pending_tags')
    
    def handle_background(self):
        """Handle background declaration."""
        self.finalize_scenario()
        
        self.current_background = Background(
            steps=[],
            line_number=self.line_number
        )
    
    def handle_scenario(self, line: str, keyword: str):
        """Handle scenario declaration."""
        self.finalize_scenario()
        
        name = line[len(keyword):].strip()
        self.current_scenario = Scenario(
            name=name,
            description='',
            steps=[],
            tags=self.pending_tags if hasattr(self, 'pending_tags') else [],
            line_number=self.line_number,
            is_outline=False
        )
        
        if hasattr(self, 'pending_tags'):
            delattr(self, 'pending_tags')
    
    def handle_scenario_outline(self, line: str, keyword: str):
        """Handle scenario outline declaration."""
        self.finalize_scenario()
        
        name = line[len(keyword):].strip()
        self.current_scenario = Scenario(
            name=name,
            description='',
            steps=[],
            tags=self.pending_tags if hasattr(self, 'pending_tags') else [],
            line_number=self.line_number,
            is_outline=True
        )
        
        if hasattr(self, 'pending_tags'):
            delattr(self, 'pending_tags')
    
    def handle_examples(self):
        """Handle examples declaration."""
        self.current_examples = Example(
            headers=[],
            rows=[],
            line_number=self.line_number
        )
    
    def handle_step(self, line: str, keyword: str):
        """Handle step definition."""
        self.finalize_step()
        
        text = line[len(keyword):].strip()
        self.current_step = Step(
            keyword=keyword,
            text=text,
            line_number=self.line_number
        )
    
    def handle_tags(self, line: str):
        """Handle tags."""
        tags = [tag.strip() for tag in line.split() if tag.startswith('@')]
        
        if not hasattr(self, 'pending_tags'):
            self.pending_tags = []
        
        self.pending_tags.extend(tags)
    
    def handle_doc_string(self, line: str):
        """Handle doc string."""
        stripped = line.strip()
        
        if self.current_doc_string is None:
            # Starting doc string
            delimiter = '"""' if '"""' in stripped else "'''"
            remaining = stripped[len(delimiter):].strip()
            
            # Check for content type
            content_type = None
            if remaining and not remaining.startswith(delimiter):
                content_type = remaining
            
            self.current_doc_string = {
                'content': [],
                'content_type': content_type,
                'delimiter': delimiter
            }
        else:
            # Check if ending doc string
            if self.current_doc_string['delimiter'] in stripped:
                # End of doc string
                if self.current_step:
                    self.current_step.doc_string = '\n'.join(self.current_doc_string['content'])
                    self.current_step.doc_string_content_type = self.current_doc_string['content_type']
                self.current_doc_string = None
            else:
                # Content line
                self.current_doc_string['content'].append(line.rstrip())
    
    def handle_data_table(self, line: str):
        """Handle data table row."""
        if self.current_data_table is None:
            self.current_data_table = []
        
        # Parse table row
        cells = [cell.strip() for cell in line.split('|')[1:-1]]
        self.current_data_table.append(cells)
    
    def handle_description(self, line: str):
        """Handle description text."""
        if self.current_scenario:
            if self.current_scenario.description:
                self.current_scenario.description += '\n' + line.strip()
            else:
                self.current_scenario.description = line.strip()
        elif self.current_feature:
            if self.current_feature.description:
                self.current_feature.description += '\n' + line.strip()
            else:
                self.current_feature.description = line.strip()
    
    def finalize_step(self):
        """Finalize current step."""
        if self.current_step:
            # Attach data table if present
            if self.current_data_table:
                self.current_step.data_table = self.current_data_table
                self.current_data_table = None
            
            # Add step to appropriate container
            if self.current_scenario:
                self.current_scenario.steps.append(self.current_step)
            elif self.current_background:
                self.current_background.steps.append(self.current_step)
            
            self.current_step = None
    
    def finalize_scenario(self):
        """Finalize current scenario."""
        self.finalize_step()
        
        if self.current_scenario:
            # Attach examples if present
            if self.current_examples:
                self.current_scenario.examples = self.current_examples
                self.current_examples = None
            
            # Add scenario to feature
            if self.current_feature:
                self.current_feature.scenarios.append(self.current_scenario)
            
            self.current_scenario = None
        
        if self.current_background and self.current_feature:
            self.current_feature.background = self.current_background
            self.current_background = None
    
    def finalize_parsing(self):
        """Finalize parsing."""
        self.finalize_scenario()
        
        # Handle examples table if still being processed
        if self.current_examples and self.current_data_table:
            if not self.current_examples.headers:
                self.current_examples.headers = self.current_data_table[0]
                self.current_examples.rows = self.current_data_table[1:]
            self.current_data_table = None


def parse_feature_file(file_path: str) -> Feature:
    """Convenience function to parse a feature file."""
    parser = GherkinParser()
    return parser.parse_file(file_path)


def parse_feature_string(content: str) -> Feature:
    """Convenience function to parse feature content."""
    parser = GherkinParser()
    return parser.parse(content)