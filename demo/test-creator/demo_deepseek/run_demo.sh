#!/bin/bash

echo "=================================================="
echo "DeepSeek R1 Test Generator Demo"
echo "=================================================="

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "❌ Ollama is not installed!"
    echo ""
    echo "To install Ollama:"
    echo "  curl -fsSL https://ollama.ai/install.sh | sh"
    echo ""
    echo "After installing, run:"
    echo "  ollama pull deepseek-r1:7b"
    exit 1
fi

# Check if DeepSeek R1 is available
if ! ollama list | grep -q "deepseek-r1:7b"; then
    echo "❌ DeepSeek R1 model not found!"
    echo ""
    echo "To download the model (4GB):"
    echo "  ollama pull deepseek-r1:7b"
    echo ""
    echo "This will download the DeepSeek R1 7B model."
    exit 1
fi

echo "✅ Ollama and DeepSeek R1 are ready!"
echo ""

# Run the test generator
echo "Generating tests for StringUtils class..."
python3 ../test_generator_simple.py StringUtils.h -c StringUtils.cpp -o tests_generated -v

echo ""
echo "=================================================="
echo "Demo Complete!"
echo "=================================================="
echo ""
echo "Generated test file: tests_generated/StringUtilsTest.cpp"
echo ""
echo "To compile and run the tests:"
echo "  g++ -std=c++14 tests_generated/StringUtilsTest.cpp StringUtils.cpp -lgtest -lgtest_main -pthread -o run_tests"
echo "  ./run_tests"