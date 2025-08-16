export function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token for English text
  // This is a simplified approximation
  const words = text.split(/\s+/).length;
  const chars = text.length;
  
  // Use a weighted average of word and character count
  // Typically 1 token ≈ 0.75 words or ≈ 4 characters
  const wordBasedEstimate = words * 1.3;
  const charBasedEstimate = chars / 4;
  
  return Math.ceil((wordBasedEstimate + charBasedEstimate) / 2);
}

export function truncateToTokenLimit(
  text: string,
  maxTokens: number,
  addEllipsis: boolean = true
): string {
  const estimatedTokens = estimateTokens(text);
  
  if (estimatedTokens <= maxTokens) {
    return text;
  }
  
  // Calculate approximate character limit
  const charLimit = Math.floor((maxTokens * 4) * 0.9); // 90% to be safe
  let truncated = text.substring(0, charLimit);
  
  // Try to break at a sentence or word boundary
  const lastSentence = truncated.lastIndexOf('. ');
  const lastWord = truncated.lastIndexOf(' ');
  
  if (lastSentence > charLimit * 0.8) {
    truncated = truncated.substring(0, lastSentence + 1);
  } else if (lastWord > charLimit * 0.9) {
    truncated = truncated.substring(0, lastWord);
  }
  
  if (addEllipsis) {
    truncated += '...';
  }
  
  return truncated;
}

export function calculateContextSize(messages: any[]): number {
  return messages.reduce((total, msg) => {
    const contentTokens = estimateTokens(msg.content || '');
    const roleTokens = 5; // Overhead for role and structure
    return total + contentTokens + roleTokens;
  }, 0);
}

export function getModelTokenLimit(model: string): number {
  const limits: Record<string, number> = {
    // OpenAI
    'gpt-4-turbo-preview': 128000,
    'gpt-4-turbo': 128000,
    'gpt-4': 8192,
    'gpt-4-32k': 32768,
    'gpt-3.5-turbo': 16384,
    'gpt-3.5-turbo-16k': 16384,
    
    // Anthropic
    'claude-3-opus': 200000,
    'claude-3-sonnet': 200000,
    'claude-3-haiku': 200000,
    'claude-2.1': 200000,
    'claude-2': 100000,
    'claude-instant': 100000,
    
    // DeepSeek
    'deepseek-chat': 32768,
    'deepseek-coder': 16384,
    
    // Ollama (local models)
    'llama2': 4096,
    'codellama': 4096,
    'mistral': 8192,
    'mixtral': 32768,
    'phi': 2048,
    'neural-chat': 4096,
    'starling-lm': 8192,
    'orca-mini': 2048,
  };
  
  // Check for partial matches
  for (const [key, limit] of Object.entries(limits)) {
    if (model.includes(key)) {
      return limit;
    }
  }
  
  // Default token limit
  return 4096;
}

export function formatTokenCount(tokens: number): string {
  if (tokens < 1000) {
    return `${tokens} tokens`;
  } else if (tokens < 1000000) {
    return `${(tokens / 1000).toFixed(1)}k tokens`;
  } else {
    return `${(tokens / 1000000).toFixed(2)}M tokens`;
  }
}

export function calculateCost(
  tokens: number,
  model: string,
  type: 'input' | 'output' = 'input'
): number {
  // Prices per 1K tokens in USD (approximate)
  const prices: Record<string, { input: number; output: number }> = {
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    'claude-3-opus': { input: 0.015, output: 0.075 },
    'claude-3-sonnet': { input: 0.003, output: 0.015 },
    'claude-3-haiku': { input: 0.00025, output: 0.00125 },
    'deepseek-chat': { input: 0.0001, output: 0.0002 },
  };
  
  // Find matching price
  for (const [key, price] of Object.entries(prices)) {
    if (model.includes(key)) {
      const rate = type === 'input' ? price.input : price.output;
      return (tokens / 1000) * rate;
    }
  }
  
  // Default free for local models or unknown
  return 0;
}

export function formatCost(cost: number): string {
  if (cost === 0) return 'Free';
  if (cost < 0.01) return `<$0.01`;
  return `$${cost.toFixed(2)}`;
}