/**
 * Subagent Manager for Role-Based AI Agents
 * 
 * Manages subagent lifecycle for both Claude native and Ollama instantiation
 */

import { EventEmitter } from '../../infra_external-log-lib/src';
import { fs } from '../../infra_external-log-lib/src';
import { path } from '../../infra_external-log-lib/src';
import * as yaml from 'js-yaml';
import { ClaudeConnector } from '../user-stories/007-chat-room-cli/src/external/claude-connector';
import { LocalLLMConnector } from '../user-stories/007-chat-room-cli/src/external/local-llm-connector';

export interface SubagentDefinition {
  name: string;
  description: string;
  tools?: string[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt: string;
}

export interface SubagentInvocation {
  agent: string;
  task: string;
  context?: any;
  provider: 'claude' | 'ollama';
}

export interface SubagentResponse {
  agent: string;
  result: string;
  provider: string;
  duration: number;
  tokensUsed?: number;
}

export class SubagentManager extends EventEmitter {
  private subagents: Map<string, SubagentDefinition> = new Map();
  private activeAgents: Map<string, any> = new Map();
  private projectAgentsPath: string;
  private userAgentsPath: string;
  private claudeConnector?: ClaudeConnector;
  private ollamaConnector?: LocalLLMConnector;

  constructor() {
    super();
    
    // Set up paths
    this.projectAgentsPath = path.join(process.cwd(), '.claude', 'agents');
    this.userAgentsPath = path.join(process.env.HOME || '', '.claude', 'agents');
    
    // Load subagents
    this.loadSubagents();
  }

  /**
   * Load subagent definitions from filesystem
   */
  private loadSubagents(): void {
    // Load user-level subagents first (lower priority)
    this.loadSubagentsFromPath(this.userAgentsPath);
    
    // Load project-level subagents (higher priority, overwrites user-level)
    this.loadSubagentsFromPath(this.projectAgentsPath);
    
    this.emit('agents-loaded', Array.from(this.subagents.keys()));
  }

  /**
   * Load subagents from a specific directory
   */
  private loadSubagentsFromPath(agentsPath: string): void {
    if (!fs.existsSync(agentsPath)) {
      return;
    }

    const files = fs.readdirSync(agentsPath);
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = path.join(agentsPath, file);
        const definition = this.parseSubagentFile(filePath);
        
        if (definition) {
          this.subagents.set(definition.name, definition);
          this.emit('agent-loaded', definition.name);
        }
      }
    }
  }

  /**
   * Parse a subagent definition file
   */
  private parseSubagentFile(filePath: string): SubagentDefinition | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Extract frontmatter and body
      const matches = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      
      if (!matches) {
        console.error(`Invalid subagent format: ${filePath}`);
        return null;
      }

      const frontmatter = yaml.load(matches[1]) as any;
      const systemPrompt = matches[2].trim();

      // Validate required fields
      if (!frontmatter.name || !frontmatter.description) {
        console.error(`Missing required fields in: ${filePath}`);
        return null;
      }

      // Parse tools if provided
      const tools = frontmatter.tools 
        ? frontmatter.tools.split(',').map((t: string) => t.trim())
        : undefined;

      return {
        name: frontmatter.name,
        description: frontmatter.description,
        tools,
        model: frontmatter.model,
        temperature: frontmatter.temperature,
        maxTokens: frontmatter.max_tokens,
        systemPrompt
      };
    } catch (error) {
      console.error(`Error parsing subagent file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Initialize LLM connectors
   */
  async initialize(): Promise<void> {
    // Initialize Claude connector if available
    if (process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY) {
      this.claudeConnector = new ClaudeConnector({
        apiKey: process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY
      });
      await this.claudeConnector.initialize();
      this.emit('provider-initialized', 'claude');
    }

    // Initialize Ollama connector
    this.ollamaConnector = new LocalLLMConnector({
      provider: 'ollama'
    });
    
    try {
      await this.ollamaConnector.initialize();
      this.emit('provider-initialized', 'ollama');
    } catch (error) {
      console.warn('Ollama not available:', error);
    }
  }

  /**
   * Get available subagents
   */
  getAvailableAgents(): SubagentDefinition[] {
    return Array.from(this.subagents.values());
  }

  /**
   * Get a specific subagent
   */
  getAgent(name: string): SubagentDefinition | undefined {
    return this.subagents.get(name);
  }

  /**
   * Detect which agent should handle a task
   */
  detectAgent(task: string): string | null {
    const taskLower = task.toLowerCase();
    
    for (const [name, agent] of this.subagents) {
      const descLower = agent.description.toLowerCase();
      
      // Check for proactive keywords
      if (descLower.includes('proactively') || 
          descLower.includes('must be used')) {
        
        // Check if task matches agent's domain
        const keywords = this.extractKeywords(agent.description);
        for (const keyword of keywords) {
          if (taskLower.includes(keyword.toLowerCase())) {
            return name;
          }
        }
      }
      
      // Check for explicit agent mention
      if (taskLower.includes(name)) {
        return name;
      }
    }
    
    return null;
  }

  /**
   * Extract keywords from description
   */
  private extractKeywords(description: string): string[] {
    const keywords: string[] = [];
    
    // Extract key phrases
    const patterns = [
      /requirements?/gi,
      /auth(?:entication|orization)?/gi,
      /api/gi,
      /test(?:ing)?/gi,
      /gui|ui|interface/gi,
      /feature/gi,
      /context/gi,
      /schedul(?:e|ing)/gi
    ];
    
    for (const pattern of patterns) {
      const matches = description.match(pattern);
      if (matches) {
        keywords.push(...matches);
      }
    }
    
    return keywords;
  }

  /**
   * Invoke a subagent with Claude native support
   */
  private async invokeWithClaude(
    agent: SubagentDefinition,
    task: string
  ): Promise<SubagentResponse> {
    if (!this.claudeConnector) {
      throw new Error('Claude connector not initialized');
    }

    const startTime = Date.now();

    // For Claude native, we would use the Task tool
    // This is a simulation of how it would work
    const prompt = `${agent.systemPrompt}\n\nTask: ${task}`;
    const response = await this.claudeConnector.chat(prompt);

    return {
      agent: agent.name,
      result: response.content,
      provider: 'claude',
      duration: Date.now() - startTime,
      tokensUsed: response.usage?.inputTokens 
        ? response.usage.inputTokens + response.usage.outputTokens 
        : undefined
    };
  }

  /**
   * Invoke a subagent with Ollama role instantiation
   */
  private async invokeWithOllama(
    agent: SubagentDefinition,
    task: string
  ): Promise<SubagentResponse> {
    if (!this.ollamaConnector || !this.ollamaConnector.isReady()) {
      throw new Error('Ollama connector not available');
    }

    const startTime = Date.now();

    // Create a new instance with role-specific configuration
    const roleConnector = new LocalLLMConnector({
      provider: 'ollama',
      model: agent.model || 'deepseek-r1:latest',
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      systemPrompt: agent.systemPrompt
    });

    await roleConnector.initialize();

    // Execute task with role context
    const response = await roleConnector.chat(task);

    // Cleanup
    await roleConnector.shutdown();

    return {
      agent: agent.name,
      result: response.content,
      provider: 'ollama',
      duration: Date.now() - startTime,
      tokensUsed: response.tokens?.total
    };
  }

  /**
   * Invoke a subagent
   */
  async invoke(invocation: SubagentInvocation): Promise<SubagentResponse> {
    const agent = this.subagents.get(invocation.agent);
    
    if (!agent) {
      throw new Error(`Subagent not found: ${invocation.agent}`);
    }

    this.emit('invocation-start', invocation);

    try {
      let response: SubagentResponse;

      // Determine provider
      const provider = invocation.provider || this.selectProvider();

      if (provider === 'claude' && this.claudeConnector) {
        response = await this.invokeWithClaude(agent, invocation.task);
      } else if (this.ollamaConnector?.isReady()) {
        response = await this.invokeWithOllama(agent, invocation.task);
      } else {
        throw new Error('No LLM provider available');
      }

      this.emit('invocation-complete', response);
      return response;
    } catch (error) {
      this.emit('invocation-error', { invocation, error });
      throw error;
    }
  }

  /**
   * Select the best available provider
   */
  private selectProvider(): 'claude' | 'ollama' {
    // Prefer Claude if available
    if (this.claudeConnector) {
      return 'claude';
    }
    
    // Fallback to Ollama
    if (this.ollamaConnector?.isReady()) {
      return 'ollama';
    }
    
    throw new Error('No LLM provider available');
  }

  /**
   * Process a task with automatic agent selection
   */
  async processTask(task: string): Promise<SubagentResponse | null> {
    // Detect which agent should handle this
    const agentName = this.detectAgent(task);
    
    if (!agentName) {
      return null; // No suitable agent found
    }

    // Invoke the detected agent
    return this.invoke({
      agent: agentName,
      task,
      provider: this.selectProvider()
    });
  }

  /**
   * Chain multiple agents
   */
  async chainAgents(
    chain: Array<{ agent: string; task: string }>
  ): Promise<SubagentResponse[]> {
    const results: SubagentResponse[] = [];
    let previousResult: string | null = null;

    for (const step of chain) {
      // Include previous result in task if available
      const taskWithContext = previousResult 
        ? `${step.task}\n\nPrevious result:\n${previousResult}`
        : step.task;

      const response = await this.invoke({
        agent: step.agent,
        task: taskWithContext,
        provider: this.selectProvider()
      });

      results.push(response);
      previousResult = response.result;
    }

    return results;
  }

  /**
   * Reload subagent definitions
   */
  reload(): void {
    this.subagents.clear();
    this.loadSubagents();
    this.emit('agents-reloaded');
  }

  /**
   * Add a custom subagent at runtime
   */
  addCustomAgent(definition: SubagentDefinition): void {
    this.subagents.set(definition.name, definition);
    this.emit('agent-added', definition.name);
  }

  /**
   * Remove a subagent
   */
  removeAgent(name: string): boolean {
    const result = this.subagents.delete(name);
    if (result) {
      this.emit('agent-removed', name);
    }
    return result;
  }

  /**
   * Get provider status
   */
  getProviderStatus(): { claude: boolean; ollama: boolean } {
    return {
      claude: !!this.claudeConnector,
      ollama: !!this.ollamaConnector?.isReady()
    };
  }

  /**
   * Shutdown and cleanup
   */
  async shutdown(): Promise<void> {
    if (this.claudeConnector) {
      await this.claudeConnector.shutdown();
    }
    
    if (this.ollamaConnector) {
      await this.ollamaConnector.shutdown();
    }

    this.removeAllListeners();
    this.subagents.clear();
    this.activeAgents.clear();
  }
}