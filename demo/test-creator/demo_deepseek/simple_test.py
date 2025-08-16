#!/usr/bin/env python3
"""Quick test of DeepSeek R1 for C++ test generation"""

import subprocess
import tempfile
import os

prompt = """Generate a Google Test for this C++ method:

class StringUtils {
public:
    std::string trim(const std::string& str);
};

The trim method removes leading and trailing whitespace.

Generate ONLY the test body (what goes inside TEST_F). Include:
1. Start with: // Verifier: DeepSeek R1
2. Arrange-Act-Assert pattern
3. Test normal cases and edge cases

Test body:"""

# Save prompt to file
with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
    f.write(prompt)
    prompt_file = f.name

try:
    # Call Ollama
    cmd = f'ollama run deepseek-r1:7b < {prompt_file}'
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=60)
    
    if result.returncode == 0:
        print("Generated test:")
        print(result.stdout)
    else:
        print("Error:", result.stderr)
        
finally:
    os.unlink(prompt_file)