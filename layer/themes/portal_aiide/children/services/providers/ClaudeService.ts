/**
 * Claude Service - Anthropic Claude API integration
 */

import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider, ChatMessage, ChatSettings } from '../../types';
import { ChatResponse } from '../ChatService';

export class ClaudeService {
  private client: Anthropic | null = null;

  private getClient(apiKey?: string): Anthropic {
    if (!this.client || apiKey) {
      const key = apiKey || process.env.VITE_CLAUDE_API_KEY;
      if (!key) {
        throw new Error('Claude API key not configured');
      }
      this.client = new Anthropic({ apiKey: key });
    }
    return this.client;
  }

  async sendMessage(
    provider: LLMProvider,
    messages: ChatMessage[],
    settings: ChatSettings
  ): Promise<ChatResponse> {
    const client = this.getClient(provider.apiKey);
    
    // Convert messages to Claude format
    const claudeMessages = this.convertMessages(messages);
    
    try {
      const response = await client.messages.create({
        model: provider.defaultModel || 'claude-3-sonnet-20240229',
        messages: claudeMessages,
        max_tokens: settings.maxTokens || 4096,
        temperature: settings.temperature || 0.7,
        top_p: settings.topP || 1,
        stop_sequences: settings.stopSequences
      });

      return {
        content: response.content[0].type === 'text' 
          ? response.content[0].text 
          : '',
        model: response.model,
        tokens: response.usage?.input_tokens + response.usage?.output_tokens,
        finishReason: response.stop_reason || undefined
      };
    } catch (error) {
      console.error('Claude API error:', error);
      throw new Error(`Claude API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async streamMessage(
    provider: LLMProvider,
    messages: ChatMessage[],
    settings: ChatSettings,
    onChunk: (chunk: string) => void
  ): Promise<ChatResponse> {
    const client = this.getClient(provider.apiKey);
    const claudeMessages = this.convertMessages(messages);
    
    try {
      const stream = await client.messages.create({
        model: provider.defaultModel || 'claude-3-sonnet-20240229',
        messages: claudeMessages,
        max_tokens: settings.maxTokens || 4096,
        temperature: settings.temperature || 0.7,
        top_p: settings.topP || 1,
        stop_sequences: settings.stopSequences,
        stream: true
      });

      let fullContent = '';
      let model = '';
      let tokens = 0;

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          const text = chunk.delta.text;
          fullContent += text;
          onChunk(text);
        } else if (chunk.type === 'message_start') {
          model = chunk.message.model;
          tokens = chunk.message.usage?.input_tokens || 0;
        } else if (chunk.type === 'message_delta') {
          if (chunk.usage?.output_tokens) {
            tokens += chunk.usage.output_tokens;
          }
        }
      }

      return {
        content: fullContent,
        model,
        tokens,
        finishReason: 'stop'
      };
    } catch (error) {
      console.error('Claude streaming error:', error);
      throw new Error(`Claude streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private convertMessages(messages: ChatMessage[]): Anthropic.MessageParam[] {
    // Filter out system messages and combine them into a single system prompt
    const systemMessages = messages.filter(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');
    
    // Claude expects alternating user/assistant messages
    const claudeMessages: Anthropic.MessageParam[] = [];
    
    for (const msg of userMessages) {
      if (msg.role === 'user' || msg.role === "assistant") {
        claudeMessages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }

    // Ensure we start with a user message
    if (claudeMessages.length === 0 || claudeMessages[0].role !== 'user') {
      claudeMessages.unshift({
        role: 'user',
        content: 'Start conversation'
      });
    }

    // Ensure alternating pattern
    const finalMessages: Anthropic.MessageParam[] = [];
    let lastRole = '';
    
    for (const msg of claudeMessages) {
      if (msg.role === lastRole) {
        // Combine consecutive messages from same role
        if (finalMessages.length > 0) {
          finalMessages[finalMessages.length - 1].content += '\n\n' + msg.content;
        } else {
          finalMessages.push(msg);
        }
      } else {
        finalMessages.push(msg);
        lastRole = msg.role;
      }
    }

    return finalMessages;
  }
}