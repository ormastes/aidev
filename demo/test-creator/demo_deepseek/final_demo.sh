#!/bin/bash

echo "=================================================="
echo "DeepSeek R1 C++ Test Generator Demo"
echo "=================================================="

# Check if Ollama is running
if ! pgrep -x "ollama" > /dev/null; then
    echo "❌ Ollama service is not running!"
    echo "Starting Ollama..."
    sudo systemctl start ollama
    sleep 2
fi

# Verify DeepSeek R1 is available
if ! ollama list | grep -q "deepseek-r1:7b"; then
    echo "❌ DeepSeek R1 not found!"
    exit 1
fi

echo "✅ Ollama with DeepSeek R1 is ready!"
echo ""

# Run the enhanced test generator
echo "Generating tests for StringUtils class..."
echo "This uses:"
echo "- Deep code analysis"
echo "- New chat session per file"
echo "- DeepSeek R1 for intelligent test generation"
echo ""

cd /home/ormastes/dev/aidev/demo/test-creator

# Run with increased timeout
python3 test_generator_enhanced.py \
    demo_deepseek/StringUtils.h \
    -c demo_deepseek/StringUtils.cpp \
    -o demo_deepseek/tests_final \
    --model deepseek-r1:7b \
    -v

echo ""
echo "=================================================="
echo "Demo Complete!"
echo "=================================================="
echo ""
echo "Generated test file: demo_deepseek/tests_final/StringUtilsTest.cpp"
echo ""
echo "The test file includes:"
echo "- Detailed method analysis comments"
echo "- Verifier: DeepSeek R1 tags"
echo "- Comprehensive test implementations"
echo "- Edge case coverage"
echo ""