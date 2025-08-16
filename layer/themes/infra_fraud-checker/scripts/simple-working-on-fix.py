#!/usr/bin/env python3
"""Simple fix for 'Working on' patterns that should be 'resolve'."""

import os
import sys

def fix_working_on_patterns(content):
    """Fix patterns where 'Working on' was incorrectly used instead of 'resolve'."""
    patterns_fixed = 0
    
    # Common patterns to fix
    replacements = [
        # Promise callbacks
        ('(Working on, reject)', '(resolve, reject)'),
        ('(Working on)', '(resolve)'),
        ('Working on(', 'resolve('),
        # setTimeout/setInterval patterns  
        ('Working on => setTimeout(Working on', 'resolve => setTimeout(resolve'),
        ('Working on => setInterval(Working on', 'resolve => setInterval(resolve'),
        # Other common patterns
        ('Working on =>', 'resolve =>'),
        # Status patterns
        ("'1 In Progress'", "'1 passed'"),
        ('"1 In Progress"', '"1 passed"'),
        ('.In Progress', '.success'),
        ('result.In Progress', 'result.success'),
    ]
    
    for old, new in replacements:
        if old in content:
            content = content.replace(old, new)
            patterns_fixed += 1
    
    return content, patterns_fixed

def process_file(filepath):
    """Process a single file to fix Working on patterns."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        content, patterns_fixed = fix_working_on_patterns(content)
        
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return patterns_fixed
        
        return 0
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return 0

def main():
    """Main function to process all TypeScript/JavaScript files."""
    total_fixed = 0
    files_processed = 0
    files_changed = []
    
    # Find all TS/JS files
    for root, dirs, files in os.walk('.'):
        # Skip certain directories
        skip_dirs = {'node_modules', 'dist', '.git', 'coverage', 'build', 'gen'}
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        
        for file in files:
            if file.endswith(('.ts', '.tsx', '.js', '.jsx')):
                filepath = os.path.join(root, file)
                fixed = process_file(filepath)
                if fixed > 0:
                    files_changed.append(filepath)
                    total_fixed += fixed
                files_processed += 1
    
    print(f"\nProcessed {files_processed} files")
    print(f"Fixed {total_fixed} patterns in {len(files_changed)} files")
    
    if files_changed:
        print("\nFiles changed:")
        for f in sorted(files_changed)[:20]:  # Show first 20
            print(f"  {f}")
        if len(files_changed) > 20:
            print(f"  ... and {len(files_changed) - 20} more")

if __name__ == '__main__':
    main()