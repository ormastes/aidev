#!/usr/bin/env python3
"""
Ollama Model Manager - Auto-unload inactive models and parse DeepSeek R1 responses
"""

import json
import time
import subprocess
import re
from datetime import datetime, timedelta
import requests
import argparse
import threading
from typing import Dict, Optional

class OllamaManager:
    def __init__(self, inactivity_timeout: int = 60):
        """
        Initialize Ollama Manager
        
        Args:
            inactivity_timeout: Seconds before unloading inactive model (default: 60)
        """
        self.inactivity_timeout = inactivity_timeout
        self.model_last_used: Dict[str, datetime] = {}
        self.monitoring = False
        self.ollama_url = "http://localhost:11434"
        
    def get_loaded_models(self) -> list:
        """Get currently loaded models from ollama ps"""
        try:
            result = subprocess.run(['ollama', 'ps'], capture_output=True, text=True)
            lines = result.stdout.strip().split('\n')
            if len(lines) <= 1:
                return []
            
            models = []
            for line in lines[1:]:  # Skip header
                parts = line.split()
                if parts:
                    models.append(parts[0])
            return models
        except Exception as e:
            print(f"Error getting loaded models: {e}")
            return []
    
    def unload_model(self, model_name: str):
        """Unload a specific model from GPU"""
        try:
            # Send empty request to unload
            response = requests.post(
                f"{self.ollama_url}/api/generate",
                json={"model": model_name, "keep_alive": 0}
            )
            if response.status_code == 200:
                print(f"✓ Unloaded model: {model_name}")
                if model_name in self.model_last_used:
                    del self.model_last_used[model_name]
            else:
                print(f"✗ Failed to unload {model_name}: {response.status_code}")
        except Exception as e:
            print(f"✗ Error unloading {model_name}: {e}")
    
    def monitor_models(self):
        """Monitor and auto-unload inactive models"""
        print(f"🔍 Monitoring models (timeout: {self.inactivity_timeout}s)")
        
        while self.monitoring:
            try:
                loaded_models = self.get_loaded_models()
                current_time = datetime.now()
                
                for model in loaded_models:
                    # Track model if not seen before
                    if model not in self.model_last_used:
                        self.model_last_used[model] = current_time
                        print(f"📌 Tracking model: {model}")
                    
                    # Check if model exceeded timeout
                    last_used = self.model_last_used.get(model, current_time)
                    inactive_time = (current_time - last_used).total_seconds()
                    
                    if inactive_time >= self.inactivity_timeout:
                        print(f"⏰ Model {model} inactive for {inactive_time:.0f}s")
                        self.unload_model(model)
                
                # Clean up tracked models that are no longer loaded
                for model in list(self.model_last_used.keys()):
                    if model not in loaded_models:
                        del self.model_last_used[model]
                
                time.sleep(10)  # Check every 10 seconds
                
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"Monitor error: {e}")
                time.sleep(10)
    
    def start_monitoring(self):
        """Start background monitoring thread"""
        if not self.monitoring:
            self.monitoring = True
            monitor_thread = threading.Thread(target=self.monitor_models, daemon=True)
            monitor_thread.start()
            return monitor_thread
    
    def stop_monitoring(self):
        """Stop monitoring"""
        self.monitoring = False
    
    @staticmethod
    def parse_deepseek_response(response_text: str) -> str:
        """
        Parse DeepSeek R1 response to remove <think> tags
        
        Args:
            response_text: Raw response from DeepSeek R1
            
        Returns:
            Cleaned response without thinking process
        """
        # Remove <think>...</think> blocks
        cleaned = re.sub(r'<think>.*?</think>', '', response_text, flags=re.DOTALL)
        return cleaned.strip()
    
    def query_model(self, model: str, prompt: str, parse_thinking: bool = True) -> dict:
        """
        Query a model and optionally parse thinking tags
        
        Args:
            model: Model name
            prompt: User prompt
            parse_thinking: Whether to remove thinking tags (default: True)
            
        Returns:
            Response dictionary with parsed content
        """
        try:
            response = requests.post(
                f"{self.ollama_url}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Update last used time
                self.model_last_used[model] = datetime.now()
                
                # Parse thinking tags if it's DeepSeek R1
                if parse_thinking and 'deepseek-r1' in model.lower():
                    original_response = data.get('response', '')
                    data['response'] = self.parse_deepseek_response(original_response)
                    data['original_response'] = original_response
                
                return data
            else:
                return {"error": f"HTTP {response.status_code}"}
                
        except Exception as e:
            return {"error": str(e)}
    
    def show_gpu_status(self):
        """Show current GPU memory status"""
        try:
            result = subprocess.run(
                ['nvidia-smi', '--query-gpu=name,memory.used,memory.free,utilization.gpu', '--format=csv'],
                capture_output=True,
                text=True
            )
            print("\n📊 GPU Status:")
            print(result.stdout)
        except Exception as e:
            print(f"Could not get GPU status: {e}")

def main():
    parser = argparse.ArgumentParser(description='Ollama Model Manager')
    parser.add_argument('--monitor', action='store_true', help='Start monitoring mode')
    parser.add_argument('--timeout', type=int, default=60, help='Inactivity timeout in seconds')
    parser.add_argument('--unload', type=str, help='Unload specific model')
    parser.add_argument('--query', type=str, help='Query a model')
    parser.add_argument('--model', type=str, default='deepseek-r1:32b', help='Model to query')
    parser.add_argument('--prompt', type=str, help='Prompt for query')
    parser.add_argument('--gpu-status', action='store_true', help='Show GPU status')
    parser.add_argument('--list', action='store_true', help='List loaded models')
    
    args = parser.parse_args()
    
    manager = OllamaManager(inactivity_timeout=args.timeout)
    
    if args.gpu_status:
        manager.show_gpu_status()
    
    if args.list:
        models = manager.get_loaded_models()
        if models:
            print("🤖 Loaded models:")
            for model in models:
                print(f"  • {model}")
        else:
            print("No models currently loaded")
    
    if args.unload:
        manager.unload_model(args.unload)
    
    if args.query or args.prompt:
        prompt = args.prompt or args.query
        print(f"🔮 Querying {args.model}...")
        response = manager.query_model(args.model, prompt)
        
        if 'error' in response:
            print(f"Error: {response['error']}")
        else:
            print("\n📝 Response:")
            print(response.get('response', 'No response'))
            
            if 'original_response' in response:
                print("\n🧠 Original (with thinking):")
                print(response['original_response'][:500] + "..." if len(response['original_response']) > 500 else response['original_response'])
    
    if args.monitor:
        print(f"Starting monitor mode (timeout: {args.timeout}s)")
        print("Press Ctrl+C to stop\n")
        
        try:
            manager.start_monitoring()
            
            # Keep main thread alive
            while True:
                time.sleep(60)
                manager.show_gpu_status()
                
        except KeyboardInterrupt:
            print("\n✋ Stopping monitor...")
            manager.stop_monitoring()

if __name__ == "__main__":
    main()