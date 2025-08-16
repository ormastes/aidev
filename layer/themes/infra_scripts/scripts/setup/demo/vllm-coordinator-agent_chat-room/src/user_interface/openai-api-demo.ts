#!/usr/bin/env node
/**
 * OpenAI API Demo with vLLM
 * Demonstrates using vLLM server with OpenAI client library
 */

import OpenAI from 'openai';
import chalk from 'chalk';
import { VLLMInstaller } from './services/vllm-installer';
import { VLLMClient } from './services/vllm-client';

// Configuration
const VLLM_SERVER_URL = 'http://localhost:8000';
const VLLM_MODEL = 'deepseek-ai/DeepSeek-R1-32B';

async function ensureVLLMServer() {
  console.log(chalk.blue('🔍 Checking vLLM server...'));
  
  const installer = new VLLMInstaller();
  const vllmClient = new VLLMClient({ baseUrl: VLLM_SERVER_URL });
  
  // Check if server is running
  const isRunning = await vllmClient.checkHealth();
  if (!isRunning) {
    console.log(chalk.yellow('⚠️  vLLM server not running. Starting...'));
    
    // Check if vLLM is installed
    const isInstalled = await installer.isInstalled();
    if (!isInstalled) {
      console.log(chalk.yellow('Installing vLLM...'));
      const success = await installer.autoInstall();
      if (!success) {
        throw new Error('Failed to install vLLM');
      }
    }
    
    // Start server
    const started = await installer.startServer(VLLM_MODEL, 8000);
    if (!started) {
      throw new Error('Failed to start vLLM server');
    }
    
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  console.log(chalk.green('✅ vLLM server is ready'));
}

async function runOpenAIDemo() {
  console.log(chalk.blue.bold('\n🚀 OpenAI API Demo with vLLM (DeepSeek R1)'));
  console.log(chalk.gray('=' .repeat(60)));
  
  // Ensure vLLM server is running
  await ensureVLLMServer();
  
  // Create OpenAI client pointing to vLLM
  const openai = new OpenAI({
    baseURL: `${VLLM_SERVER_URL}/v1`,
    apiKey: 'dummy-key', // vLLM doesn't require real API key in local mode
  });
  
  console.log(chalk.blue('\n📝 Running demo scenarios...'));
  
  // Scenario 1: Basic chat completion
  console.log(chalk.yellow('\n1️⃣  Basic Chat Completion'));
  try {
    const completion = await openai.chat.completions.create({
      model: VLLM_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are DeepSeek-R1, a helpful AI assistant with advanced reasoning capabilities.'
        },
        {
          role: 'user',
          content: 'What is the capital of France? Answer in one word.'
        }
      ],
      temperature: 0.7,
      max_tokens: 50,
    });
    
    console.log(chalk.green('Response:'), completion.choices[0].message.content);
    console.log(chalk.gray(`Tokens used: ${completion.usage?.total_tokens || 'N/A'}`));
  } catch (error) {
    console.error(chalk.red('Error:'), error);
  }
  
  // Scenario 2: Code generation
  console.log(chalk.yellow('\n2️⃣  Code Generation'));
  try {
    const completion = await openai.chat.completions.create({
      model: VLLM_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert programmer. Provide clean, commented code.'
        },
        {
          role: 'user',
          content: 'Write a Python function to check if a number is prime.'
        }
      ],
      temperature: 0.3,
      max_tokens: 300,
    });
    
    console.log(chalk.green('Generated Code:'));
    console.log(completion.choices[0].message.content);
  } catch (error) {
    console.error(chalk.red('Error:'), error);
  }
  
  // Scenario 3: Streaming response
  console.log(chalk.yellow('\n3️⃣  Streaming Response'));
  try {
    const stream = await openai.chat.completions.create({
      model: VLLM_MODEL,
      messages: [
        {
          role: 'user',
          content: 'Explain quantum computing in simple terms.'
        }
      ],
      temperature: 0.7,
      max_tokens: 200,
      stream: true,
    });
    
    console.log(chalk.green('Streaming Response:'));
    for await (const chunk of stream) {
      process.stdout.write(chunk.choices[0]?.delta?.content || '');
    }
    console.log('\n');
  } catch (error) {
    console.error(chalk.red('Error:'), error);
  }
  
  // Scenario 4: Multi-turn conversation
  console.log(chalk.yellow('\n4️⃣  Multi-turn Conversation'));
  try {
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful math tutor.'
      },
      {
        role: 'user',
        content: 'What is 15% of 80?'
      }
    ];
    
    // First turn
    let completion = await openai.chat.completions.create({
      model: VLLM_MODEL,
      messages,
      temperature: 0.3,
      max_tokens: 100,
    });
    
    console.log(chalk.cyan('User:'), messages[1].content);
    console.log(chalk.green('Assistant:'), completion.choices[0].message.content);
    
    // Add response to conversation
    messages.push(completion.choices[0].message);
    messages.push({
      role: 'user',
      content: 'Now calculate 20% of that result.'
    });
    
    // Second turn
    completion = await openai.chat.completions.create({
      model: VLLM_MODEL,
      messages,
      temperature: 0.3,
      max_tokens: 100,
    });
    
    console.log(chalk.cyan('\nUser:'), messages[3].content);
    console.log(chalk.green('Assistant:'), completion.choices[0].message.content);
  } catch (error) {
    console.error(chalk.red('Error:'), error);
  }
  
  // Scenario 5: Advanced reasoning
  console.log(chalk.yellow('\n5️⃣  Advanced Reasoning (DeepSeek R1 Specialty)'));
  try {
    const completion = await openai.chat.completions.create({
      model: VLLM_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are DeepSeek-R1. Use your advanced reasoning capabilities to solve problems step by step.'
        },
        {
          role: 'user',
          content: 'A farmer has 17 sheep. All but 9 die. How many sheep are left? Think step by step.'
        }
      ],
      temperature: 0.1,
      max_tokens: 300,
    });
    
    console.log(chalk.green('Reasoning Response:'));
    console.log(completion.choices[0].message.content);
  } catch (error) {
    console.error(chalk.red('Error:'), error);
  }
  
  console.log(chalk.green('\n✨ Demo completed!'));
  console.log(chalk.gray('\nYou can use the OpenAI client library with vLLM by:'));
  console.log(chalk.gray('1. Setting baseURL to your vLLM server URL + /v1'));
  console.log(chalk.gray('2. Using any dummy API key (or real one if configured)'));
  console.log(chalk.gray('3. Using the full model name in requests'));
}

// Run the demo
runOpenAIDemo().catch(error => {
  console.error(chalk.red('Demo failed:'), error);
  process.exit(1);
});