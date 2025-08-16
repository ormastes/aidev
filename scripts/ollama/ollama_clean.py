#!/usr/bin/env python3
"""
Ollama Clean Response - Query Ollama and automatically hide thinking tags
"""

import json
import re
import subprocess
import requests
import sys
import argparse
from typing import Dict, Any, Optional

class OllamaClean:
    def __init__(self, host="http://localhost:11434"):
        self.host = host
        
    def clean_thinking(self, text: str) -> Dict[str, str]:
        """
        Remove <think>...</think> tags and return both cleaned and thinking content
        """
        # Extract thinking content
        thinking_pattern = r'<think>(.*?)</think>'
        thinking_matches = re.findall(thinking_pattern, text, re.DOTALL)
        thinking = '\n'.join(thinking_matches) if thinking_matches else ""
        
        # Remove thinking tags from response
        cleaned = re.sub(thinking_pattern, '', text, flags=re.DOTALL)
        cleaned = cleaned.strip()
        
        return {"response": cleaned, "thinking": thinking}
    
    def query(self, prompt: str, model: str = "deepseek-r1:32b", 
              stream: bool = False, show_thinking: bool = False) -> None:
        """
        Query Ollama and print cleaned response
        """
        try:
            if stream:
                # Streaming response
                response = requests.post(
                    f"{self.host}/api/generate",
                    json={
                        "model": model,
                        "prompt": prompt,
                        "stream": True
                    },
                    stream=True
                )
                
                buffer = ""
                in_thinking = False
                thinking_content = ""
                
                for line in response.iter_lines():
                    if line:
                        try:
                            chunk = json.loads(line)
                            
                            if 'response' in chunk:
                                text = chunk['response']
                                
                                # Check for thinking tags
                                if '<think>' in text:
                                    in_thinking = True
                                
                                if in_thinking:
                                    buffer += text
                                    
                                    # Check if thinking ended
                                    if '</think>' in buffer:
                                        in_thinking = False
                                        # Extract thinking content
                                        result = self.clean_thinking(buffer)
                                        thinking_content += result['thinking']
                                        
                                        # Print non-thinking part
                                        if result['response']:
                                            print(result['response'], end='', flush=True)
                                        buffer = ""
                                else:
                                    # Regular content
                                    print(text, end='', flush=True)
                                    
                        except json.JSONDecodeError:
                            pass
                
                print()  # New line at end
                
                if show_thinking and thinking_content:
                    print("\n--- Thinking Process ---")
                    print(thinking_content)
                    print("--- End Thinking ---\n")
                    
            else:
                # Non-streaming response
                response = requests.post(
                    f"{self.host}/api/generate",
                    json={
                        "model": model,
                        "prompt": prompt,
                        "stream": False
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    response_text = data.get('response', '')
                    
                    # Clean thinking tags
                    result = self.clean_thinking(response_text)
                    
                    # Print cleaned response
                    print(result['response'])
                    
                    if show_thinking and result['thinking']:
                        print("\n--- Thinking Process ---")
                        print(result['thinking'])
                        print("--- End Thinking ---\n")
                else:
                    print(f"Error: HTTP {response.status_code}")
                    
        except Exception as e:
            print(f"Error: {e}")
    
    def chat(self, model: str = "deepseek-r1:32b", show_thinking: bool = False):
        """
        Interactive chat mode with automatic thinking tag removal
        """
        print(f"🤖 Chat with {model} (thinking: {'shown' if show_thinking else 'hidden'})")
        print("Type 'exit' to quit, 'thinking' to toggle thinking display\n")
        
        messages = []
        
        while True:
            try:
                user_input = input("You: ").strip()
                
                if user_input.lower() == 'exit':
                    break
                elif user_input.lower() == 'thinking':
                    show_thinking = not show_thinking
                    print(f"Thinking is now: {'shown' if show_thinking else 'hidden'}")
                    continue
                elif not user_input:
                    continue
                
                # Add user message
                messages.append({"role": "user", "content": user_input})
                
                # Get response
                response = requests.post(
                    f"{self.host}/api/chat",
                    json={
                        "model": model,
                        "messages": messages,
                        "stream": False
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if 'message' in data:
                        content = data['message'].get('content', '')
                        
                        # Clean thinking tags
                        result = self.clean_thinking(content)
                        
                        # Print response
                        print(f"\n{model}: {result['response']}\n")
                        
                        if show_thinking and result['thinking']:
                            print("💭 Thinking:", result['thinking'][:200] + "..." if len(result['thinking']) > 200 else result['thinking'])
                            print()
                        
                        # Add cleaned response to messages
                        messages.append({"role": "assistant", "content": result['response']})
                else:
                    print(f"Error: HTTP {response.status_code}")
                    
            except KeyboardInterrupt:
                print("\nExiting...")
                break
            except Exception as e:
                print(f"Error: {e}")

def main():
    parser = argparse.ArgumentParser(description='Ollama Clean - Hide thinking tags from responses')
    parser.add_argument('prompt', nargs='?', help='Prompt to send to model')
    parser.add_argument('--model', '-m', default='deepseek-r1:32b', help='Model to use')
    parser.add_argument('--chat', '-c', action='store_true', help='Start interactive chat')
    parser.add_argument('--stream', '-s', action='store_true', help='Stream response')
    parser.add_argument('--show-thinking', '-t', action='store_true', help='Show thinking process')
    parser.add_argument('--host', default='http://localhost:11434', help='Ollama host')
    
    args = parser.parse_args()
    
    client = OllamaClean(host=args.host)
    
    if args.chat:
        client.chat(model=args.model, show_thinking=args.show_thinking)
    elif args.prompt:
        client.query(
            prompt=args.prompt,
            model=args.model,
            stream=args.stream,
            show_thinking=args.show_thinking
        )
    else:
        # Read from stdin if no prompt given
        if not sys.stdin.isatty():
            prompt = sys.stdin.read().strip()
            if prompt:
                client.query(
                    prompt=prompt,
                    model=args.model,
                    stream=args.stream,
                    show_thinking=args.show_thinking
                )
        else:
            parser.print_help()

if __name__ == '__main__':
    main()