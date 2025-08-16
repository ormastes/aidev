#!/usr/bin/env python3
"""Fix incorrect 'Working on' replacements that should be 'resolve' in Promise callbacks."""

import os
import re
import sys

def fix_working_on_patterns(content):
    """Fix patterns where 'Working on' was incorrectly used instead of 'resolve'."""
    patterns_fixed = 0
    
    # Pattern 1: Promise with Working on parameter
    pattern1 = r'new Promise(?:<[^>]+>)?\s*\(\s*\(\s*Working on\b'
    if re.search(pattern1, content):
        content = re.sub(pattern1, r'new Promise\1((resolve', content)
        patterns_fixed += 1
    
    # Pattern 2: Working on as function call in Promise context
    pattern2 = r'Working on\s*\('
    lines = content.split('\n')
    new_lines = []
    
    for i, line in enumerate(lines):
        if 'Working on(' in line:
            # Check if this is inside a Promise callback
            # Look back up to 10 lines for Promise context
            is_promise_context = False
            for j in range(max(0, i-10), i):
                if 'new Promise' in lines[j]:
                    is_promise_context = True
                    break
            
            if is_promise_context:
                line = line.replace('Working on(', 'resolve(')
                patterns_fixed += 1
        
        new_lines.append(line)
    
    content = '\n'.join(new_lines)
    
    # Pattern 3: Working on => in arrow functions (likely setTimeout/setInterval)
    pattern3 = r'Working on\s*=>\s*setTimeout\s*\(\s*Working on'
    content = re.sub(pattern3, r'resolve => setTimeout(resolve', content)
    
    pattern4 = r'Working on\s*=>\s*setInterval\s*\(\s*Working on'
    content = re.sub(pattern4, r'resolve => setInterval(resolve', content)
    
    # Pattern 5: More specific Promise patterns
    pattern5 = r'new Promise[^{]*\{[^}]*Working on\s*\([^)]*\)'
    matches = list(re.finditer(pattern5, content, re.MULTILINE | re.DOTALL))
    for match in reversed(matches):  # Process in reverse to maintain positions
        matched_text = match.group(0)
        fixed_text = matched_text.replace('Working on(', 'resolve(')
        content = content[:match.start()] + fixed_text + content[match.end():]
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
                    print(f"Fixed {fixed} patterns in: {filepath}")
                    total_fixed += fixed
                files_processed += 1
    
    print(f"\nProcessed {files_processed} files")
    print(f"Fixed {total_fixed} 'Working on' patterns")

if __name__ == '__main__':
    main()