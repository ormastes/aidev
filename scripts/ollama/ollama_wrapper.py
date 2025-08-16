#!/usr/bin/env python3
"""
Ollama Wrapper - Intercepts and processes Ollama API responses
Automatically removes thinking tags from DeepSeek R1 responses
"""

import json
import re
import sys
import subprocess
from typing import Dict, Any
import requests
from flask import Flask, request, Response, stream_with_context
import threading
import argparse

app = Flask(__name__)

class OllamaWrapper:
    def __init__(self, ollama_port=11434, wrapper_port=11435, hide_thinking=True):
        self.ollama_url = f"http://localhost:{ollama_port}"
        self.wrapper_port = wrapper_port
        self.hide_thinking = hide_thinking
        
    def parse_deepseek_response(self, text: str) -> tuple[str, str]:
        """
        Parse DeepSeek R1 response to separate thinking and response
        
        Returns:
            tuple: (cleaned_response, thinking_content)
        """
        # Extract thinking content
        thinking_pattern = r'<think>(.*?)</think>'
        thinking_matches = re.findall(thinking_pattern, text, re.DOTALL)
        thinking = '\n'.join(thinking_matches) if thinking_matches else ""
        
        # Remove thinking tags from response
        cleaned = re.sub(thinking_pattern, '', text, flags=re.DOTALL)
        cleaned = cleaned.strip()
        
        return cleaned, thinking
    
    def process_response(self, response_data: Dict[str, Any], model: str) -> Dict[str, Any]:
        """Process response based on model type"""
        if 'deepseek-r1' in model.lower() and self.hide_thinking:
            if 'response' in response_data:
                cleaned, thinking = self.parse_deepseek_response(response_data['response'])
                response_data['response'] = cleaned
                if thinking:
                    response_data['thinking'] = thinking
        return response_data

wrapper = OllamaWrapper()

@app.route('/api/generate', methods=['POST'])
def generate():
    """Proxy generate endpoint with response processing"""
    data = request.json
    model = data.get('model', '')
    stream = data.get('stream', True)
    
    # Forward request to actual Ollama
    response = requests.post(
        f"{wrapper.ollama_url}/api/generate",
        json=data,
        stream=stream
    )
    
    if stream:
        def generate_stream():
            buffer = ""
            in_thinking = False
            
            for line in response.iter_lines():
                if line:
                    try:
                        chunk = json.loads(line)
                        
                        if 'deepseek-r1' in model.lower() and wrapper.hide_thinking:
                            # Buffer response to detect thinking tags
                            if 'response' in chunk:
                                text = chunk['response']
                                
                                # Check for thinking tag start
                                if '<think>' in text:
                                    in_thinking = True
                                
                                # If we're in thinking mode, buffer it
                                if in_thinking:
                                    buffer += text
                                    
                                    # Check if thinking section ended
                                    if '</think>' in buffer:
                                        in_thinking = False
                                        # Extract non-thinking part
                                        cleaned, _ = wrapper.parse_deepseek_response(buffer)
                                        if cleaned:
                                            chunk['response'] = cleaned
                                            yield json.dumps(chunk).encode() + b'\n'
                                        buffer = ""
                                    else:
                                        # Don't send thinking content
                                        continue
                                else:
                                    # Normal content, send it
                                    yield json.dumps(chunk).encode() + b'\n'
                        else:
                            yield json.dumps(chunk).encode() + b'\n'
                            
                    except json.JSONDecodeError:
                        yield line + b'\n'
        
        return Response(stream_with_context(generate_stream()), 
                       content_type='application/json')
    else:
        # Non-streaming response
        response_data = response.json()
        processed = wrapper.process_response(response_data, model)
        return json.dumps(processed)

@app.route('/api/chat', methods=['POST'])
def chat():
    """Proxy chat endpoint with response processing"""
    data = request.json
    model = data.get('model', '')
    
    # Forward request to actual Ollama
    response = requests.post(
        f"{wrapper.ollama_url}/api/chat",
        json=data,
        stream=data.get('stream', True)
    )
    
    if data.get('stream', True):
        def generate_stream():
            buffer = ""
            in_thinking = False
            
            for line in response.iter_lines():
                if line:
                    try:
                        chunk = json.loads(line)
                        
                        if 'deepseek-r1' in model.lower() and wrapper.hide_thinking:
                            if 'message' in chunk and 'content' in chunk['message']:
                                text = chunk['message']['content']
                                
                                if '<think>' in text:
                                    in_thinking = True
                                
                                if in_thinking:
                                    buffer += text
                                    
                                    if '</think>' in buffer:
                                        in_thinking = False
                                        cleaned, _ = wrapper.parse_deepseek_response(buffer)
                                        if cleaned:
                                            chunk['message']['content'] = cleaned
                                            yield json.dumps(chunk).encode() + b'\n'
                                        buffer = ""
                                    else:
                                        continue
                                else:
                                    yield json.dumps(chunk).encode() + b'\n'
                        else:
                            yield json.dumps(chunk).encode() + b'\n'
                            
                    except json.JSONDecodeError:
                        yield line + b'\n'
        
        return Response(stream_with_context(generate_stream()), 
                       content_type='application/json')
    else:
        response_data = response.json()
        if 'message' in response_data and 'content' in response_data['message']:
            if 'deepseek-r1' in model.lower() and wrapper.hide_thinking:
                content = response_data['message']['content']
                cleaned, thinking = wrapper.parse_deepseek_response(content)
                response_data['message']['content'] = cleaned
                if thinking:
                    response_data['message']['thinking'] = thinking
        return json.dumps(response_data)

# Pass through all other endpoints
@app.route('/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE'])
def proxy(path):
    """Proxy all other requests to Ollama"""
    url = f"{wrapper.ollama_url}/{path}"
    
    if request.method == 'GET':
        resp = requests.get(url, params=request.args)
    else:
        resp = requests.request(
            method=request.method,
            url=url,
            json=request.json if request.is_json else None,
            data=request.data if not request.is_json else None,
            params=request.args
        )
    
    return Response(resp.content, status=resp.status_code, headers=dict(resp.headers))

def main():
    parser = argparse.ArgumentParser(description='Ollama Wrapper - Hide thinking tags')
    parser.add_argument('--port', type=int, default=11435, help='Wrapper port (default: 11435)')
    parser.add_argument('--ollama-port', type=int, default=11434, help='Ollama port (default: 11434)')
    parser.add_argument('--show-thinking', action='store_true', help='Show thinking tags (default: hide)')
    
    args = parser.parse_args()
    
    global wrapper
    wrapper = OllamaWrapper(
        ollama_port=args.ollama_port,
        wrapper_port=args.port,
        hide_thinking=not args.show_thinking
    )
    
    print(f"🚀 Ollama Wrapper starting on port {args.port}")
    print(f"📡 Proxying to Ollama on port {args.ollama_port}")
    print(f"🧠 Thinking tags: {'SHOWN' if args.show_thinking else 'HIDDEN'}")
    print(f"\nTo use, set OLLAMA_HOST=http://localhost:{args.port}")
    print(f"Or use: ollama run deepseek-r1:32b --host http://localhost:{args.port}")
    
    app.run(host='0.0.0.0', port=args.port, debug=False)

if __name__ == '__main__':
    main()