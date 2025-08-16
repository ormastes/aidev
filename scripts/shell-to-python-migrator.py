#!/usr/bin/env python3
"""
Shell Script to Python Migrator
Converts shell scripts to Python equivalents
"""

import os
import re
import json
import subprocess
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, asdict

@dataclass
class ShellCommand:
    """Represents a shell command and its Python equivalent"""
    original: str
    python_equivalent: str
    requires_import: List[str]
    
class ShellToPythonMigrator:
    """Migrates shell scripts to Python"""
    
    def __init__(self):
        self.imports = set()
        self.command_mappings = {
            'echo': self._convert_echo,
            'cd': self._convert_cd,
            'mkdir': self._convert_mkdir,
            'rm': self._convert_rm,
            'cp': self._convert_cp,
            'mv': self._convert_mv,
            'cat': self._convert_cat,
            'grep': self._convert_grep,
            'find': self._convert_find,
            'curl': self._convert_curl,
            'wget': self._convert_wget,
            'export': self._convert_export,
            'source': self._convert_source,
            'if': self._convert_if,
            'for': self._convert_for,
            'while': self._convert_while,
            'function': self._convert_function,
        }
    
    def migrate_script(self, shell_script_path: str) -> str:
        """Main migration function"""
        with open(shell_script_path, 'r') as f:
            shell_content = f.read()
        
        # Parse shell script
        lines = shell_content.split('\n')
        python_lines = []
        
        # Add shebang and imports
        python_lines.append('#!/usr/bin/env python3')
        python_lines.append('"""')
        python_lines.append(f'Migrated from: {Path(shell_script_path).name}')
        python_lines.append('Auto-generated Python script')
        python_lines.append('"""')
        python_lines.append('')
        
        # Process each line
        in_function = False
        function_indent = 0
        
        for line in lines:
            stripped = line.strip()
            
            # Skip comments and empty lines
            if not stripped or stripped.startswith('#'):
                if stripped.startswith('#'):
                    python_lines.append(line.replace('#', '#', 1))
                else:
                    python_lines.append('')
                continue
            
            # Convert line
            converted = self._convert_line(stripped)
            if converted:
                python_lines.append(converted)
        
        # Add imports at the top
        if self.imports:
            import_section = []
            import_section.append('import os')
            import_section.append('import sys')
            import_section.append('import subprocess')
            import_section.append('import shutil')
            import_section.append('from pathlib import Path')
            import_section.append('import json')
            import_section.append('import re')
            import_section.append('import requests')
            import_section.append('')
            
            # Insert imports after docstring
            for i, line in enumerate(python_lines):
                if '"""' in line and i > 2:
                    python_lines = python_lines[:i+1] + [''] + import_section + python_lines[i+1:]
                    break
        
        return '\n'.join(python_lines)
    
    def _convert_line(self, line: str) -> str:
        """Convert a single line from shell to Python"""
        # Variable assignment
        if '=' in line and not line.startswith('if '):
            return self._convert_variable_assignment(line)
        
        # Command execution
        for cmd, converter in self.command_mappings.items():
            if line.startswith(cmd + ' ') or line.startswith(cmd + '('):
                return converter(line)
        
        # Default: run as subprocess
        return self._convert_subprocess(line)
    
    def _convert_echo(self, line: str) -> str:
        """Convert echo command"""
        match = re.match(r'echo\s+(.*)', line)
        if match:
            text = match.group(1).strip()
            # Remove quotes if present
            if text.startswith('"') and text.endswith('"'):
                text = text[1:-1]
            elif text.startswith("'") and text.endswith("'"):
                text = text[1:-1]
            return f'print({repr(text)})'
        return f'print()'
    
    def _convert_cd(self, line: str) -> str:
        """Convert cd command"""
        match = re.match(r'cd\s+(.*)', line)
        if match:
            path = match.group(1).strip()
            self.imports.add('os')
            return f'os.chdir({repr(path)})'
        return ''
    
    def _convert_mkdir(self, line: str) -> str:
        """Convert mkdir command"""
        match = re.match(r'mkdir\s+(-p\s+)?(.*)', line)
        if match:
            recursive = bool(match.group(1))
            path = match.group(2).strip()
            self.imports.add('Path')
            if recursive:
                return f'Path({repr(path)}).mkdir(parents=True, exist_ok=True)'
            else:
                return f'Path({repr(path)}).mkdir()'
        return ''
    
    def _convert_rm(self, line: str) -> str:
        """Convert rm command"""
        match = re.match(r'rm\s+(-rf?\s+)?(.*)', line)
        if match:
            flags = match.group(1) or ''
            path = match.group(2).strip()
            self.imports.add('shutil')
            self.imports.add('Path')
            
            if '-rf' in flags:
                return f'shutil.rmtree({repr(path)}, ignore_errors=True)'
            elif '-r' in flags:
                return f'shutil.rmtree({repr(path)})'
            else:
                return f'Path({repr(path)}).unlink()'
        return ''
    
    def _convert_cp(self, line: str) -> str:
        """Convert cp command"""
        match = re.match(r'cp\s+(-r\s+)?(.*)\s+(.*)', line)
        if match:
            recursive = bool(match.group(1))
            src = match.group(2).strip()
            dst = match.group(3).strip()
            self.imports.add('shutil')
            
            if recursive:
                return f'shutil.copytree({repr(src)}, {repr(dst)})'
            else:
                return f'shutil.copy2({repr(src)}, {repr(dst)})'
        return ''
    
    def _convert_mv(self, line: str) -> str:
        """Convert mv command"""
        match = re.match(r'mv\s+(.*)\s+(.*)', line)
        if match:
            src = match.group(1).strip()
            dst = match.group(2).strip()
            self.imports.add('shutil')
            return f'shutil.move({repr(src)}, {repr(dst)})'
        return ''
    
    def _convert_cat(self, line: str) -> str:
        """Convert cat command"""
        match = re.match(r'cat\s+(.*)', line)
        if match:
            file = match.group(1).strip()
            self.imports.add('Path')
            return f'print(Path({repr(file)}).read_text())'
        return ''
    
    def _convert_grep(self, line: str) -> str:
        """Convert grep command"""
        match = re.match(r'grep\s+(.*)', line)
        if match:
            args = match.group(1).strip()
            self.imports.add('subprocess')
            return f'subprocess.run(["grep", {repr(args)}], shell=True)'
        return ''
    
    def _convert_find(self, line: str) -> str:
        """Convert find command"""
        match = re.match(r'find\s+(.*)', line)
        if match:
            args = match.group(1).strip()
            self.imports.add('Path')
            # Simple conversion for common patterns
            if '-name' in args:
                pattern_match = re.search(r'-name\s+"([^"]+)"', args)
                if pattern_match:
                    pattern = pattern_match.group(1)
                    return f'list(Path(".").rglob({repr(pattern)}))'
            return f'# TODO: Complex find command: {line}'
        return ''
    
    def _convert_curl(self, line: str) -> str:
        """Convert curl command"""
        match = re.match(r'curl\s+(.*)', line)
        if match:
            args = match.group(1).strip()
            self.imports.add('requests')
            
            # Simple GET request
            if not any(flag in args for flag in ['-X', '-d', '--data']):
                url_match = re.search(r'(https?://[^\s]+)', args)
                if url_match:
                    url = url_match.group(1)
                    return f'response = requests.get({repr(url)})'
            
            return f'# TODO: Complex curl command: {line}'
        return ''
    
    def _convert_wget(self, line: str) -> str:
        """Convert wget command"""
        match = re.match(r'wget\s+(.*)', line)
        if match:
            args = match.group(1).strip()
            self.imports.add('requests')
            url_match = re.search(r'(https?://[^\s]+)', args)
            if url_match:
                url = url_match.group(1)
                return f'response = requests.get({repr(url)})\n# TODO: Save response content'
        return ''
    
    def _convert_export(self, line: str) -> str:
        """Convert export command"""
        match = re.match(r'export\s+([^=]+)=(.*)', line)
        if match:
            var = match.group(1).strip()
            value = match.group(2).strip()
            self.imports.add('os')
            return f'os.environ[{repr(var)}] = {repr(value)}'
        return ''
    
    def _convert_source(self, line: str) -> str:
        """Convert source command"""
        match = re.match(r'source\s+(.*)', line)
        if match:
            file = match.group(1).strip()
            return f'# TODO: Source file: {file}'
        return ''
    
    def _convert_if(self, line: str) -> str:
        """Convert if statement"""
        if line.startswith('if '):
            condition = line[3:].strip()
            if condition.endswith('; then'):
                condition = condition[:-6].strip()
            return f'if {self._convert_condition(condition)}:'
        elif line == 'then':
            return ''
        elif line.startswith('elif '):
            condition = line[5:].strip()
            if condition.endswith('; then'):
                condition = condition[:-6].strip()
            return f'elif {self._convert_condition(condition)}:'
        elif line == 'else':
            return 'else:'
        elif line == 'fi':
            return ''
        return ''
    
    def _convert_for(self, line: str) -> str:
        """Convert for loop"""
        match = re.match(r'for\s+(\w+)\s+in\s+(.*)', line)
        if match:
            var = match.group(1)
            items = match.group(2).strip()
            if items.endswith('; do'):
                items = items[:-4].strip()
            return f'for {var} in {self._convert_items(items)}:'
        elif line == 'do':
            return ''
        elif line == 'done':
            return ''
        return ''
    
    def _convert_while(self, line: str) -> str:
        """Convert while loop"""
        if line.startswith('while '):
            condition = line[6:].strip()
            if condition.endswith('; do'):
                condition = condition[:-4].strip()
            return f'while {self._convert_condition(condition)}:'
        return ''
    
    def _convert_function(self, line: str) -> str:
        """Convert function definition"""
        match = re.match(r'function\s+(\w+)|(\w+)\(\)', line)
        if match:
            func_name = match.group(1) or match.group(2)
            return f'def {func_name}():'
        return ''
    
    def _convert_variable_assignment(self, line: str) -> str:
        """Convert variable assignment"""
        match = re.match(r'([^=]+)=(.*)', line)
        if match:
            var = match.group(1).strip()
            value = match.group(2).strip()
            
            # Handle command substitution
            if value.startswith('$(') and value.endswith(')'):
                cmd = value[2:-1]
                self.imports.add('subprocess')
                return f'{var} = subprocess.check_output({repr(cmd)}, shell=True, text=True).strip()'
            elif value.startswith('`') and value.endswith('`'):
                cmd = value[1:-1]
                self.imports.add('subprocess')
                return f'{var} = subprocess.check_output({repr(cmd)}, shell=True, text=True).strip()'
            
            # Regular assignment
            return f'{var} = {repr(value)}'
        return ''
    
    def _convert_subprocess(self, line: str) -> str:
        """Default conversion using subprocess"""
        self.imports.add('subprocess')
        return f'subprocess.run({repr(line)}, shell=True)'
    
    def _convert_condition(self, condition: str) -> str:
        """Convert shell condition to Python"""
        # Simple conversions
        condition = condition.replace(' -eq ', ' == ')
        condition = condition.replace(' -ne ', ' != ')
        condition = condition.replace(' -lt ', ' < ')
        condition = condition.replace(' -le ', ' <= ')
        condition = condition.replace(' -gt ', ' > ')
        condition = condition.replace(' -ge ', ' >= ')
        
        # File tests
        if '-f ' in condition:
            match = re.search(r'-f\s+(\S+)', condition)
            if match:
                file = match.group(1)
                self.imports.add('Path')
                return f'Path({repr(file)}).is_file()'
        
        if '-d ' in condition:
            match = re.search(r'-d\s+(\S+)', condition)
            if match:
                dir = match.group(1)
                self.imports.add('Path')
                return f'Path({repr(dir)}).is_dir()'
        
        if '-e ' in condition:
            match = re.search(r'-e\s+(\S+)', condition)
            if match:
                path = match.group(1)
                self.imports.add('Path')
                return f'Path({repr(path)}).exists()'
        
        return f'# TODO: Complex condition: {condition}'
    
    def _convert_items(self, items: str) -> str:
        """Convert shell list to Python"""
        # Handle glob patterns
        if '*' in items:
            self.imports.add('glob')
            return f'glob.glob({repr(items)})'
        
        # Handle space-separated items
        if ' ' in items:
            items_list = items.split()
            return repr(items_list)
        
        return repr([items])


def migrate_simple_scripts():
    """Migrate simple shell scripts from the analysis"""
    
    # Read the analysis report
    with open('/home/ormastes/dev/aidev/gen/doc/shell-scripts-analysis.json', 'r') as f:
        report = json.load(f)
    
    migrator = ShellToPythonMigrator()
    
    # Create migration directory
    migration_dir = Path('/home/ormastes/dev/aidev/scripts/migrated/python')
    migration_dir.mkdir(parents=True, exist_ok=True)
    
    # Migrate Phase 1 scripts
    phase1_scripts = report['migrationPlan']['phase1_simple']
    
    print("🐍 Migrating simple shell scripts to Python...")
    print("=" * 50)
    
    for script_info in phase1_scripts:
        script_path = Path('/home/ormastes/dev/aidev') / script_info['path']
        
        if not script_path.exists():
            print(f"⚠️  Skipping {script_path.name} - file not found")
            continue
        
        print(f"\n📝 Migrating: {script_path.name}")
        
        try:
            # Migrate the script
            python_code = migrator.migrate_script(str(script_path))
            
            # Save the migrated script
            output_path = migration_dir / f"{script_path.stem}.py"
            output_path.write_text(python_code)
            
            # Make it executable
            output_path.chmod(0o755)
            
            print(f"   ✅ Saved to: {output_path.relative_to('/home/ormastes/dev/aidev')}")
            
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
    print("\n" + "=" * 50)
    print("✨ Migration complete! Check scripts/migrated/python/")


if __name__ == "__main__":
    migrate_simple_scripts()