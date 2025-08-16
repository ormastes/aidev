#!/usr/bin/env bun
/**
 * Migrated from: setup_ollama_manager.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.584Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Setup script for Ollama Manager
  console.log("🚀 Setting up Ollama Manager...");
  // Make the Python script executable
  await $`chmod +x ollama_manager.py`;
  // Test the script
  console.log("📋 Testing basic functionality...");
  await $`python3 ollama_manager.py --list`;
  await $`python3 ollama_manager.py --gpu-status`;
  // Option 1: Run as systemd service (requires sudo)
  console.log("");
  console.log("To install as systemd service (auto-start on boot):");
  console.log("  sudo cp ollama-manager.service /etc/systemd/system/");
  console.log("  sudo systemctl daemon-reload");
  console.log("  sudo systemctl enable ollama-manager@$USER");
  console.log("  sudo systemctl start ollama-manager@$USER");
  console.log("");
  // Option 2: Run in background
  console.log("To run in background now:");
  console.log("  nohup python3 ollama_manager.py --monitor --timeout 60 > ollama_manager.log 2>&1 &");
  console.log("");
  // Option 3: Run in screen/tmux
  console.log("To run in screen session:");
  console.log("  screen -dmS ollama-manager python3 ollama_manager.py --monitor --timeout 60");
  console.log("");
  console.log("✅ Setup complete!");
  console.log("");
  console.log("Available commands:");
  console.log("  ./ollama_manager.py --list                    # List loaded models");
  console.log("  ./ollama_manager.py --gpu-status              # Show GPU memory");
  console.log("  ./ollama_manager.py --unload MODEL_NAME       # Manually unload model");
  console.log("  ./ollama_manager.py --monitor --timeout 60    # Start monitoring");
  console.log("  ./ollama_manager.py --query 'Your prompt'     # Query with parsed response");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}