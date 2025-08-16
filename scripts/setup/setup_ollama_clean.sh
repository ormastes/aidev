#!/bin/bash

echo "🔧 Setting up Ollama Clean Response Tool..."

# Create convenient shell function
cat >> ~/.bashrc << 'EOF'

# Ollama Clean - Query without thinking tags
ollama-clean() {
    python3 /home/ormastes/dev/aidev/ollama_clean.py "$@"
}

# Ollama Chat Clean - Interactive chat without thinking
ollama-chat() {
    python3 /home/ormastes/dev/aidev/ollama_clean.py --chat "$@"
}

# Quick DeepSeek query
deepseek() {
    python3 /home/ormastes/dev/aidev/ollama_clean.py "$1" --model deepseek-r1:32b
}

# DeepSeek with thinking shown
deepseek-think() {
    python3 /home/ormastes/dev/aidev/ollama_clean.py "$1" --model deepseek-r1:32b --show-thinking
}

EOF

echo "✅ Setup complete!"
echo ""
echo "Available commands (restart shell or run 'source ~/.bashrc'):"
echo "  ollama-clean 'prompt'           # Query without thinking tags"
echo "  ollama-chat                     # Interactive chat mode"
echo "  deepseek 'prompt'               # Quick DeepSeek query"
echo "  deepseek-think 'prompt'         # DeepSeek with thinking shown"
echo ""
echo "Direct usage:"
echo "  ./ollama_clean.py 'prompt'                    # Basic query"
echo "  ./ollama_clean.py --chat                      # Chat mode"
echo "  ./ollama_clean.py -t 'prompt'                 # Show thinking"
echo "  echo 'prompt' | ./ollama_clean.py             # Pipe input"