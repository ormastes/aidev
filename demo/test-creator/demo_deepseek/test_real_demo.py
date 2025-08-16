#!/usr/bin/env python3
"""Demo of DeepSeek R1 generating real C++ tests"""

import subprocess
import tempfile
import os

# Test the toUpperCase method
prompt = """You are generating a unit test for a C++ method. Generate ONLY the test function body.

Method to test:
std::string toUpperCase(const std::string& str);

This method converts all characters in the string to uppercase.

Generate the test body following this exact format:
    // Verifier: DeepSeek R1
    // Test uppercase conversion
    
    // Arrange
    StringUtils* obj = new StringUtils();
    std::string input = "hello world";
    std::string expected = "HELLO WORLD";
    
    // Act
    std::string result = obj->toUpperCase(input);
    
    // Assert
    EXPECT_EQ(expected, result);
    
    // Cleanup
    delete obj;

Include tests for:
1. Normal string with mixed case
2. Empty string
3. Already uppercase string
4. String with numbers and special characters

Generate ONLY the code that goes inside TEST_F(...) { HERE }"""

# Save prompt
with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
    f.write(prompt)
    prompt_file = f.name

try:
    print("Calling DeepSeek R1 to generate test...")
    print("-" * 60)
    
    # Call Ollama with timeout
    cmd = f'ollama run deepseek-r1:7b < {prompt_file}'
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=120)
    
    if result.returncode == 0:
        output = result.stdout.strip()
        
        # Extract code if wrapped in markdown
        if '```' in output:
            # Find code block
            start = output.find('```')
            if start != -1:
                start = output.find('\n', start) + 1
                end = output.find('```', start)
                if end != -1:
                    output = output[start:end].strip()
        
        print(output)
    else:
        print(f"Error: {result.stderr}")
        
finally:
    os.unlink(prompt_file)

print("\n" + "-" * 60)
print("Demo complete!")