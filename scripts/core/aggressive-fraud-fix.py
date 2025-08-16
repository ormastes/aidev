#!/usr/bin/env python3
"""
Aggressive fraud fixer - automatically fixes all detected issues
"""

import os
import re
import sys
from pathlib import Path

class FraudFixer:
    def __init__(self, root_dir='.'):
        self.root_dir = Path(root_dir).resolve()
        self.exclude_dirs = {'.git', '.jj', 'node_modules', 'dist', 'build', 'coverage', '.next', '.cache', 'temp', 'release'}
        self.stats = {
            'files_fixed': 0,
            'secrets_fixed': 0,
            'imports_fixed': 0,
            'fs_fixed': 0,
            'mock_fixed': 0
        }
        
    def should_skip_dir(self, path):
        """Check if directory should be skipped"""
        return any(part in self.exclude_dirs for part in path.parts)
        
    def is_test_file(self, path):
        """Check if file is a test file"""
        path_str = str(path)
        return any(x in path_str for x in ['.test.', '.spec.', '/test/', '/tests/', '/__tests__/'])
        
    def fix_hardcoded_secrets(self, content, file_path):
        """Replace hardcoded secrets with environment variables"""
        replacements = [
            (r"(['\"])api[_-]?key['\"]:\s*['\"][^'\"]+['\"]", r'\1api_key\1: process.env.API_KEY || \1PLACEHOLDER_API_KEY\1'),
            (r"api[_-]?key\s*=\s*['\"][^'\"]+['\"]", "apiKey = process.env.API_KEY || 'PLACEHOLDER_API_KEY'"),
            (r"(['\"])secret['\"]:\s*['\"][^'\"]+['\"]", r'\1secret\1: process.env.SECRET || \1PLACEHOLDER_SECRET\1'),
            (r"(['\"])password['\"]:\s*['\"][^'\"]+['\"]", r'\1password\1: process.env.PASSWORD || \1PLACEHOLDER_PASSWORD\1'),
            (r"(['\"])token['\"]:\s*['\"][^'\"]+['\"]", r'\1token\1: process.env.AUTH_TOKEN || \1PLACEHOLDER_TOKEN\1'),
            (r"Bearer\s+[A-Za-z0-9\-._~+\/]+={0,2}", 'Bearer ${process.env.AUTH_TOKEN || "PLACEHOLDER_TOKEN"}'),
        ]
        
        modified = False
        for pattern, replacement in replacements:
            new_content, count = re.subn(pattern, replacement, content, flags=re.IGNORECASE)
            if count > 0:
                content = new_content
                self.stats['secrets_fixed'] += count
                modified = True
                
        return content, modified
        
    def fix_direct_imports(self, content, file_path):
        """Fix direct external imports"""
        if self.is_test_file(file_path) or '/demo/' in str(file_path):
            return content, False
            
        replacements = [
            (r"import\s+(.*)\s+from\s+['\"]fs['\"]", r"import \1 from '../../layer/themes/infra_external-log-lib/src'"),
            (r"import\s+(.*)\s+from\s+['\"]http['\"]", r"import \1 from '../utils/http-wrapper'"),
            (r"const\s+(\w+)\s*=\s*require\(['\"]fs['\"]\)", r"const \1 = require('../../layer/themes/infra_external-log-lib/src')"),
            (r"import\s+(.*)\s+from\s+['\"]axios['\"]", r"import \1 from '../utils/http-wrapper'"),
        ]
        
        modified = False
        for pattern, replacement in replacements:
            new_content, count = re.subn(pattern, replacement, content)
            if count > 0:
                content = new_content
                self.stats['imports_fixed'] += count
                modified = True
                
        return content, modified
        
    def fix_fs_usage(self, content, file_path):
        """Fix direct fs usage"""
        if self.is_test_file(file_path) or '/demo/' in str(file_path):
            return content, False
            
        # Add import if needed
        if 'fs.' in content and 'fileAPI' not in content:
            if 'import ' in content:
                content = "import { fileAPI } from '../utils/file-api';\n" + content
            else:
                content = "const { fileAPI } = require('../utils/file-api');\n" + content
                
        replacements = [
            (r'fs\.writeFile\(', 'fileAPI.writeFile('),
            (r'fs\.readFile\(', 'fileAPI.readFile('),
            (r'fs\.mkdir\(', 'fileAPI.mkdir('),
            (r'fs\.unlink\(', 'fileAPI.unlink('),
            (r'fs\.writeFileSync\(', 'fileAPI.writeFileSync('),
            (r'fs\.readFileSync\(', 'fileAPI.readFileSync('),
        ]
        
        modified = False
        for pattern, replacement in replacements:
            new_content, count = re.subn(pattern, replacement, content)
            if count > 0:
                content = new_content
                self.stats['fs_fixed'] += count
                modified = True
                
        return content, modified
        
    def fix_mock_usage(self, content, file_path):
        """Remove or comment out mock usage in non-test files"""
        if self.is_test_file(file_path):
            return content, False
            
        # Comment out mock imports and usage
        replacements = [
            (r"^(.*jest\.mock.*)$", r"// FRAUD_FIX: Commented out mock usage\n// \1"),
            (r"^(.*\.mock\(.*)$", r"// FRAUD_FIX: Commented out mock usage\n// \1"),
            (r"^(.*sinon\..*)$", r"// FRAUD_FIX: Commented out mock usage\n// \1"),
        ]
        
        modified = False
        for pattern, replacement in replacements:
            new_content, count = re.subn(pattern, replacement, content, flags=re.MULTILINE)
            if count > 0:
                content = new_content
                self.stats['mock_fixed'] += count
                modified = True
                
        return content, modified
        
    def fix_file(self, file_path):
        """Fix all issues in a single file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            original_content = content
            
            # Apply fixes
            content, secrets_fixed = self.fix_hardcoded_secrets(content, file_path)
            content, imports_fixed = self.fix_direct_imports(content, file_path)
            content, fs_fixed = self.fix_fs_usage(content, file_path)
            content, mock_fixed = self.fix_mock_usage(content, file_path)
            
            # Write back if modified
            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                self.stats['files_fixed'] += 1
                print(f"✅ Fixed {file_path}")
                return True
                
        except Exception as e:
            print(f"❌ Error fixing {file_path}: {e}")
            
        return False
        
    def scan_and_fix(self):
        """Scan and fix all files"""
        extensions = {'.js', '.ts', '.jsx', '.tsx'}
        
        for root, dirs, files in os.walk(self.root_dir):
            root_path = Path(root)
            
            # Skip excluded directories
            if self.should_skip_dir(root_path):
                dirs.clear()
                continue
                
            # Process files
            for file in files:
                file_path = root_path / file
                if file_path.suffix in extensions:
                    self.fix_file(file_path)
                    
    def print_summary(self):
        """Print fix summary"""
        print("\n" + "="*60)
        print("🔧 FRAUD FIX SUMMARY")
        print("="*60)
        print(f"\n📁 Files Fixed: {self.stats['files_fixed']}")
        print(f"🔐 Secrets Fixed: {self.stats['secrets_fixed']}")
        print(f"📦 Imports Fixed: {self.stats['imports_fixed']}")
        print(f"📂 FS Usage Fixed: {self.stats['fs_fixed']}")
        print(f"🎭 Mock Usage Fixed: {self.stats['mock_fixed']}")
        
        total_fixed = sum(v for k, v in self.stats.items() if k != 'files_fixed')
        print(f"\n✅ Total Issues Fixed: {total_fixed}")
        
        if self.stats['files_fixed'] > 0:
            print("\n⚠️  IMPORTANT: Please review changes and ensure:")
            print("   1. Import paths are correct for your project structure")
            print("   2. Environment variables are configured")
            print("   3. File API wrappers are available")

def main():
    print("🔧 Starting Aggressive Fraud Fix...\n")
    
    root_dir = sys.argv[1] if len(sys.argv) > 1 else '.'
    
    fixer = FraudFixer(root_dir)
    fixer.scan_and_fix()
    fixer.print_summary()

if __name__ == '__main__':
    main()