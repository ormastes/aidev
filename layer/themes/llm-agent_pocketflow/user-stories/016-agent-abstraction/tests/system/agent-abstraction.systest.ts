import { test, expect } from '@playwright/test';
import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';

interface AgentDefinition {
  id: string;
  name: string;
  type: 'llm' | 'rule-based' | 'hybrid';
  capabilities: string[];
  config: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    tools?: string[];
    rules?: Record<string, any>;
  };
  constraints: {
    rateLimit?: { requests: number; windowMs: number };
    maxConcurrent?: number;
    timeoutMs?: number;
  };
}

interface AgentRequest {
  id: string;
  agentId: string;
  input: string;
  context?: Record<string, any>;
  requester: string;
  timestamp: string;
  priority: 'low' | 'medium' | 'high';
}

interface AgentResponse {
  requestId: string;
  agentId: string;
  output: string;
  confidence: number;
  tokensUsed?: number;
  processingTime: number;
  metadata?: Record<string, any>;
  timestamp: string;
}

interface AgentMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageProcessingTime: number;
  averageConfidence: number;
  totalTokensUsed: number;
  rateLimitHits: number;
  concurrencyLimitHits: number;
}

class AgentAbstractionLayer extends EventEmitter {
  private agents: Map<string, AgentDefinition> = new Map();
  private requestQueue: AgentRequest[] = [];
  private processingRequests: Map<string, AgentRequest> = new Map();
  private responses: Map<string, AgentResponse> = new Map();
  private metrics: Map<string, AgentMetrics> = new Map();
  private rateLimitTracking: Map<string, { requests: number[]; }> = new Map();

  registerAgent(agent: AgentDefinition): void {
    this.agents.set(agent.id, agent);
    
    // Initialize metrics
    this.metrics.set(agent.id, {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageProcessingTime: 0,
      averageConfidence: 0,
      totalTokensUsed: 0,
      rateLimitHits: 0,
      concurrencyLimitHits: 0
    });

    this.emit('agentRegistered', agent);
  }

  unregisterAgent(agentId: string): boolean {
    const removed = this.agents.delete(agentId);
    this.metrics.delete(agentId);
    this.rateLimitTracking.delete(agentId);
    
    if (removed) {
      this.emit('agentUnregistered', { agentId });
    }
    
    return removed;
  }

  async sendRequest(
    agentId: string,
    input: string,
    options: {
      context?: Record<string, any>;
      requester?: string;
      priority?: AgentRequest['priority'];
      waitForResponse?: boolean;
    } = {}
  ): Promise<string> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // Check rate limits
    if (!this.checkRateLimit(agentId)) {
      const metrics = this.metrics.get(agentId)!;
      metrics.rateLimitHits++;
      throw new Error(`Rate limit exceeded for agent ${agentId}`);
    }

    // Check concurrency limits
    const currentConcurrency = Array.from(this.processingRequests.values())
      .filter(req => req.agentId === agentId).length;
    
    if (agent.constraints.maxConcurrent && currentConcurrency >= agent.constraints.maxConcurrent) {
      const metrics = this.metrics.get(agentId)!;
      metrics.concurrencyLimitHits++;
      throw new Error(`Concurrency limit exceeded for agent ${agentId}`);
    }

    const request: AgentRequest = {
      id: this.generateRequestId(),
      agentId,
      input,
      context: options.context,
      requester: options.requester || 'unknown',
      timestamp: new Date().toISOString(),
      priority: options.priority || 'medium'
    };

    // Update metrics
    const metrics = this.metrics.get(agentId)!;
    metrics.totalRequests++;

    this.emit('requestReceived', request);

    if (options.waitForResponse) {
      return await this.processRequestSync(request);
    } else {
      this.queueRequest(request);
      return request.id;
    }
  }

  private async processRequestSync(request: AgentRequest): Promise<string> {
    this.processingRequests.set(request.id, request);

    try {
      const response = await this.executeAgentRequest(request);
      this.responses.set(request.id, response);
      this.updateMetrics(request.agentId, response, true);
      this.emit('requestCompleted', { request, response });
      return response.output;
    } catch (error) {
      this.updateMetrics(request.agentId, null, false);
      this.emit('requestFailed', { request, error });
      throw error;
    } finally {
      this.processingRequests.delete(request.id);
    }
  }

  private queueRequest(request: AgentRequest): void {
    // Insert request based on priority
    const insertIndex = this.requestQueue.findIndex(
      existing => this.getPriorityValue(existing.priority) < this.getPriorityValue(request.priority)
    );

    if (insertIndex === -1) {
      this.requestQueue.push(request);
    } else {
      this.requestQueue.splice(insertIndex, 0, request);
    }

    this.emit('requestQueued', request);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift()!;
      
      // Check if we can process this request now
      const agent = this.agents.get(request.agentId);
      if (!agent) continue;

      const currentConcurrency = Array.from(this.processingRequests.values())
        .filter(req => req.agentId === request.agentId).length;

      if (agent.constraints.maxConcurrent && currentConcurrency >= agent.constraints.maxConcurrent) {
        // Put request back and try later
        this.requestQueue.unshift(request);
        break;
      }

      // Process request asynchronously
      this.processRequestAsync(request);
    }
  }

  private async processRequestAsync(request: AgentRequest): Promise<void> {
    this.processingRequests.set(request.id, request);

    try {
      const response = await this.executeAgentRequest(request);
      this.responses.set(request.id, response);
      this.updateMetrics(request.agentId, response, true);
      this.emit('requestCompleted', { request, response });
    } catch (error) {
      this.updateMetrics(request.agentId, null, false);
      this.emit('requestFailed', { request, error });
    } finally {
      this.processingRequests.delete(request.id);
      // Continue processing queue
      setTimeout(() => this.processQueue(), 10);
    }
  }

  private async executeAgentRequest(request: AgentRequest): Promise<AgentResponse> {
    const agent = this.agents.get(request.agentId)!;
    const startTime = Date.now();

    // Apply timeout
    const timeout = agent.constraints.timeoutMs || 30000;
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), timeout);
    });

    const executionPromise = this.executeByAgentType(agent, request);

    try {
      const result = await Promise.race([executionPromise, timeoutPromise]);
      
      const response: AgentResponse = {
        requestId: request.id,
        agentId: request.agentId,
        output: result.output,
        confidence: result.confidence,
        tokensUsed: result.tokensUsed,
        processingTime: Date.now() - startTime,
        metadata: result.metadata,
        timestamp: new Date().toISOString()
      };

      return response;
    } catch (error) {
      throw new Error(`Agent execution failed: ${error}`);
    }
  }

  private async executeByAgentType(agent: AgentDefinition, request: AgentRequest): Promise<{
    output: string;
    confidence: number;
    tokensUsed?: number;
    metadata?: Record<string, any>;
  }> {
    switch (agent.type) {
      case 'llm':
        return await this.executeLLMAgent(agent, request);
      case 'rule-based':
        return await this.executeRuleBasedAgent(agent, request);
      case 'hybrid':
        return await this.executeHybridAgent(agent, request);
      default:
        throw new Error(`Unknown agent type: ${agent.type}`);
    }
  }

  private async executeLLMAgent(agent: AgentDefinition, request: AgentRequest): Promise<{
    output: string;
    confidence: number;
    tokensUsed: number;
    metadata: Record<string, any>;
  }> {
    // Simulate LLM execution
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));

    const systemPrompt = agent.config.systemPrompt || 'You are a helpful assistant.';
    const temperature = agent.config.temperature || 0.7;
    const maxTokens = agent.config.maxTokens || 1000;

    // Simulate token usage based on input/output length
    const inputTokens = Math.ceil(request.input.length / 4);
    const outputLength = Math.min(maxTokens, 50 + Math.floor(Math.random() * 200));
    const outputTokens = Math.ceil(outputLength / 4);
    const tokensUsed = inputTokens + outputTokens;

    // Simulate response generation
    let output = '';
    if (request.input.toLowerCase().includes('code')) {
      output = `// Generated code based on: ${request.input}\nfunction generatedFunction() {\n  // Implementation here\n  return true;\n}`;
    } else if (request.input.toLowerCase().includes('explain')) {
      output = `Here's an explanation of "${request.input}": This is a comprehensive explanation that covers the key concepts and provides detailed information.`;
    } else if (request.input.toLowerCase().includes('analyze')) {
      output = `Analysis of "${request.input}":\n1. Key findings\n2. Important observations\n3. Recommendations`;
    } else {
      output = `Response to "${request.input}": This is a helpful response generated by the ${agent.name} agent.`;
    }

    const confidence = Math.max(0.6, Math.min(0.95, 0.8 + (Math.random() - 0.5) * 0.3));

    return {
      output,
      confidence,
      tokensUsed,
      metadata: {
        model: agent.config.model || 'default-model',
        temperature,
        maxTokens,
        systemPrompt: systemPrompt.substring(0, 50) + '...'
      }
    };
  }

  private async executeRuleBasedAgent(agent: AgentDefinition, request: AgentRequest): Promise<{
    output: string;
    confidence: number;
    metadata: Record<string, any>;
  }> {
    // Simulate rule-based processing
    await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 80));

    const rules = agent.config.rules || {};
    let output = '';
    let confidence = 0.9; // Rule-based agents typically have high confidence

    // Simple rule matching
    const inputLower = request.input.toLowerCase();
    
    if (rules.keywords && Array.isArray(rules.keywords)) {
      const matchedKeywords = rules.keywords.filter((keyword: string) => 
        inputLower.includes(keyword.toLowerCase())
      );
      
      if (matchedKeywords.length > 0) {
        output = `Matched rules for keywords: ${matchedKeywords.join(', ')}. `;
        confidence = Math.min(0.95, 0.7 + (matchedKeywords.length * 0.1));
      }
    }

    if (inputLower.includes('validate')) {
      output += 'Validation result: PASSED. All rules satisfied.';
    } else if (inputLower.includes('check')) {
      output += 'Check result: All systems operational.';
    } else if (inputLower.includes('process')) {
      output += 'Processing complete. Data validated and stored.';
    } else {
      output += `Rule-based processing of: ${request.input}`;
    }

    return {
      output,
      confidence,
      metadata: {
        rulesApplied: Object.keys(rules).length,
        processingType: 'deterministic'
      }
    };
  }

  private async executeHybridAgent(agent: AgentDefinition, request: AgentRequest): Promise<{
    output: string;
    confidence: number;
    tokensUsed?: number;
    metadata: Record<string, any>;
  }> {
    // Hybrid agent combines rule-based and LLM approaches
    await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 300));

    // First apply rules
    const ruleResult = await this.executeRuleBasedAgent(agent, request);
    
    // Then enhance with LLM if rules don't provide sufficient confidence
    if (ruleResult.confidence < 0.8) {
      const llmResult = await this.executeLLMAgent(agent, request);
      
      return {
        output: `${ruleResult.output}\n\nEnhanced response: ${llmResult.output}`,
        confidence: (ruleResult.confidence + llmResult.confidence) / 2,
        tokensUsed: llmResult.tokensUsed,
        metadata: {
          approach: 'hybrid',
          ruleConfidence: ruleResult.confidence,
          llmConfidence: llmResult.confidence,
          ...llmResult.metadata
        }
      };
    }

    return {
      output: ruleResult.output,
      confidence: ruleResult.confidence,
      metadata: {
        approach: 'rules-only',
        ...ruleResult.metadata
      }
    };
  }

  private checkRateLimit(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent?.constraints.rateLimit) return true;

    const { requests: maxRequests, windowMs } = agent.constraints.rateLimit;
    const now = Date.now();
    
    if (!this.rateLimitTracking.has(agentId)) {
      this.rateLimitTracking.set(agentId, { requests: [] });
    }

    const tracking = this.rateLimitTracking.get(agentId)!;
    
    // Remove old requests outside the window
    tracking.requests = tracking.requests.filter(time => now - time < windowMs);
    
    // Check if we can make another request
    if (tracking.requests.length >= maxRequests) {
      return false;
    }

    // Record this request
    tracking.requests.push(now);
    return true;
  }

  private updateMetrics(agentId: string, response: AgentResponse | null, success: boolean): void {
    const metrics = this.metrics.get(agentId);
    if (!metrics) return;

    if (success && response) {
      metrics.successfulRequests++;
      
      // Update average processing time
      const totalTime = metrics.averageProcessingTime * (metrics.successfulRequests - 1);
      metrics.averageProcessingTime = (totalTime + response.processingTime) / metrics.successfulRequests;
      
      // Update average confidence
      const totalConfidence = metrics.averageConfidence * (metrics.successfulRequests - 1);
      metrics.averageConfidence = (totalConfidence + response.confidence) / metrics.successfulRequests;
      
      // Update total tokens
      if (response.tokensUsed) {
        metrics.totalTokensUsed += response.tokensUsed;
      }
    } else {
      metrics.failedRequests++;
    }
  }

  private getPriorityValue(priority: AgentRequest['priority']): number {
    switch (priority) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 2;
    }
  }

  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getAgent(agentId: string): AgentDefinition | null {
    return this.agents.get(agentId) || null;
  }

  getAllAgents(): AgentDefinition[] {
    return Array.from(this.agents.values());
  }

  getResponse(requestId: string): AgentResponse | null {
    return this.responses.get(requestId) || null;
  }

  getMetrics(agentId: string): AgentMetrics | null {
    return this.metrics.get(agentId) || null;
  }

  getAllMetrics(): Map<string, AgentMetrics> {
    return new Map(this.metrics);
  }

  getQueueStatus(): {
    queueLength: number;
    processingRequests: number;
    queueByPriority: { high: number; medium: number; low: number };
  } {
    const queueByPriority = { high: 0, medium: 0, low: 0 };
    this.requestQueue.forEach(req => queueByPriority[req.priority]++);

    return {
      queueLength: this.requestQueue.length,
      processingRequests: this.processingRequests.size,
      queueByPriority
    };
  }

  async exportMetrics(format: 'json' | 'csv'): Promise<string> {
    const allMetrics = Array.from(this.metrics.entries()).map(([agentId, metrics]) => ({
      agentId,
      agentName: this.agents.get(agentId)?.name || 'Unknown',
      agentType: this.agents.get(agentId)?.type || 'Unknown',
      ...metrics
    }));

    if (format === 'json') {
      return JSON.stringify({
        exportedAt: new Date().toISOString(),
        totalAgents: allMetrics.length,
        metrics: allMetrics
      }, null, 2);
    } else {
      const headers = 'agentId,agentName,agentType,totalRequests,successfulRequests,failedRequests,averageProcessingTime,averageConfidence,totalTokensUsed,rateLimitHits,concurrencyLimitHits\n';
      const rows = allMetrics.map(m => 
        `"${m.agentId}","${m.agentName}","${m.agentType}",${m.totalRequests},${m.successfulRequests},${m.failedRequests},${m.averageProcessingTime.toFixed(2)},${m.averageConfidence.toFixed(3)},${m.totalTokensUsed},${m.rateLimitHits},${m.concurrencyLimitHits}`
      ).join('\n');
      
      return headers + rows;
    }
  }
}

test.describe('Agent Abstraction Layer System Tests', () => {
  let tempDir: string;
  let agentLayer: AgentAbstractionLayer;

  test.beforeEach(async () => {
    tempDir = path.join(__dirname, '..', '..', 'temp', `agent-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    agentLayer = new AgentAbstractionLayer();
  });

  test.afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Cleanup failed: ${error}`);
    }
  });

  test('should register and manage different types of agents', async () => {
    const llmAgent: AgentDefinition = {
      id: 'llm-agent-1',
      name: 'Code Assistant',
      type: 'llm',
      capabilities: ['code-generation', 'code-review', 'documentation'],
      config: {
        model: 'gpt-4',
        temperature: 0.2,
        maxTokens: 2000,
        systemPrompt: 'You are a helpful coding assistant.'
      },
      constraints: {
        rateLimit: { requests: 100, windowMs: 60000 },
        maxConcurrent: 5,
        timeoutMs: 30000
      }
    };

    const ruleAgent: AgentDefinition = {
      id: 'rule-agent-1',
      name: 'Validation Agent',
      type: 'rule-based',
      capabilities: ['validation', 'checking', 'verification'],
      config: {
        rules: {
          keywords: ['validate', 'check', 'verify'],
          patterns: ['email', 'url', 'phone']
        }
      },
      constraints: {
        maxConcurrent: 10,
        timeoutMs: 5000
      }
    };

    // Register agents
    agentLayer.registerAgent(llmAgent);
    agentLayer.registerAgent(ruleAgent);

    // Verify registration
    expect(agentLayer.getAgent(llmAgent.id)).toEqual(llmAgent);
    expect(agentLayer.getAgent(ruleAgent.id)).toEqual(ruleAgent);
    expect(agentLayer.getAllAgents()).toHaveLength(2);

    // Check metrics initialization
    const llmMetrics = agentLayer.getMetrics(llmAgent.id);
    expect(llmMetrics).toBeDefined();
    expect(llmMetrics!.totalRequests).toBe(0);
    expect(llmMetrics!.successfulRequests).toBe(0);
  });

  test('should process LLM agent requests with proper responses', async () => {
    const llmAgent: AgentDefinition = {
      id: 'llm-test',
      name: 'Test LLM Agent',
      type: 'llm',
      capabilities: ['general-assistance'],
      config: {
        model: 'test-model',
        temperature: 0.5,
        maxTokens: 1000,
        systemPrompt: 'You are a test assistant.'
      },
      constraints: {}
    };

    agentLayer.registerAgent(llmAgent);

    // Send request and wait for response
    const response = await agentLayer.sendRequest(
      llmAgent.id,
      'Generate a simple JavaScript function to add two numbers',
      { waitForResponse: true }
    );

    expect(response).toContain('function');
    expect(response).toContain('add');

    // Check metrics were updated
    const metrics = agentLayer.getMetrics(llmAgent.id);
    expect(metrics!.totalRequests).toBe(1);
    expect(metrics!.successfulRequests).toBe(1);
    expect(metrics!.averageProcessingTime).toBeGreaterThan(0);
    expect(metrics!.totalTokensUsed).toBeGreaterThan(0);
  });

  test('should handle rule-based agent execution', async () => {
    const ruleAgent: AgentDefinition = {
      id: 'rule-test',
      name: 'Test Rule Agent',
      type: 'rule-based',
      capabilities: ['validation'],
      config: {
        rules: {
          keywords: ['validate', 'check', 'verify'],
          emailPattern: '^[^@]+@[^@]+\\.[^@]+$'
        }
      },
      constraints: {}
    };

    agentLayer.registerAgent(ruleAgent);

    // Test validation request
    const response = await agentLayer.sendRequest(
      ruleAgent.id,
      'Please validate this email address',
      { waitForResponse: true }
    );

    expect(response).toContain('validate');
    expect(response).toContain('Validation result');

    const metrics = agentLayer.getMetrics(ruleAgent.id);
    expect(metrics!.successfulRequests).toBe(1);
    expect(metrics!.averageConfidence).toBeGreaterThan(0.8); // Rule-based agents have high confidence
  });

  test('should handle hybrid agent execution with fallback logic', async () => {
    const hybridAgent: AgentDefinition = {
      id: 'hybrid-test',
      name: 'Test Hybrid Agent',
      type: 'hybrid',
      capabilities: ['analysis', 'processing'],
      config: {
        model: 'hybrid-model',
        rules: {
          keywords: ['analyze', 'process']
        }
      },
      constraints: {}
    };

    agentLayer.registerAgent(hybridAgent);

    // Test request that should trigger hybrid processing
    const response = await agentLayer.sendRequest(
      hybridAgent.id,
      'Analyze this complex data pattern',
      { waitForResponse: true }
    );

    expect(response).toBeTruthy();
    expect(response.length).toBeGreaterThan(10);

    const metrics = agentLayer.getMetrics(hybridAgent.id);
    expect(metrics!.successfulRequests).toBe(1);
  });

  test('should enforce rate limiting constraints', async () => {
    const rateLimitedAgent: AgentDefinition = {
      id: 'rate-limited-test',
      name: 'Rate Limited Agent',
      type: 'rule-based',
      capabilities: ['testing'],
      config: { rules: {} },
      constraints: {
        rateLimit: { requests: 2, windowMs: 1000 }, // Only 2 requests per second
        timeoutMs: 1000
      }
    };

    agentLayer.registerAgent(rateLimitedAgent);

    // First two requests should succeed
    await agentLayer.sendRequest(rateLimitedAgent.id, 'Request 1', { waitForResponse: true });
    await agentLayer.sendRequest(rateLimitedAgent.id, 'Request 2', { waitForResponse: true });

    // Third request should fail due to rate limit
    await expect(
      agentLayer.sendRequest(rateLimitedAgent.id, 'Request 3', { waitForResponse: true })
    ).rejects.toThrow('Rate limit exceeded');

    const metrics = agentLayer.getMetrics(rateLimitedAgent.id);
    expect(metrics!.rateLimitHits).toBe(1);
    expect(metrics!.successfulRequests).toBe(2);
  });

  test('should enforce concurrency limits', async () => {
    const concurrencyLimitedAgent: AgentDefinition = {
      id: 'concurrency-test',
      name: 'Concurrency Limited Agent',
      type: 'llm', // LLM to introduce processing delay
      capabilities: ['testing'],
      config: {},
      constraints: {
        maxConcurrent: 2, // Max 2 concurrent requests
        timeoutMs: 5000
      }
    };

    agentLayer.registerAgent(concurrencyLimitedAgent);

    // Start 3 concurrent requests
    const requests = [
      agentLayer.sendRequest(concurrencyLimitedAgent.id, 'Concurrent 1', { waitForResponse: true }),
      agentLayer.sendRequest(concurrencyLimitedAgent.id, 'Concurrent 2', { waitForResponse: true }),
      agentLayer.sendRequest(concurrencyLimitedAgent.id, 'Concurrent 3', { waitForResponse: true })
    ];

    // Third request should be rejected or queued
    const results = await Promise.allSettled(requests);
    
    // At least one should fail due to concurrency limits
    const rejectedCount = results.filter(r => r.status === 'rejected').length;
    expect(rejectedCount).toBeGreaterThanOrEqual(1);

    const metrics = agentLayer.getMetrics(concurrencyLimitedAgent.id);
    expect(metrics!.concurrencyLimitHits).toBeGreaterThan(0);
  });

  test('should handle request queuing with priority', async () => {
    const queuedAgent: AgentDefinition = {
      id: 'queue-test',
      name: 'Queue Test Agent',
      type: 'rule-based',
      capabilities: ['testing'],
      config: { rules: {} },
      constraints: {
        maxConcurrent: 1 // Force queuing
      }
    };

    agentLayer.registerAgent(queuedAgent);

    // Send requests with different priorities (don't wait)
    const lowPriorityId = await agentLayer.sendRequest(queuedAgent.id, 'Low priority', { priority: 'low' });
    const highPriorityId = await agentLayer.sendRequest(queuedAgent.id, 'High priority', { priority: 'high' });
    const mediumPriorityId = await agentLayer.sendRequest(queuedAgent.id, 'Medium priority', { priority: 'medium' });

    // Check queue status
    const queueStatus = agentLayer.getQueueStatus();
    expect(queueStatus.queueLength + queueStatus.processingRequests).toBe(3);
    expect(queueStatus.queueByPriority.high).toBe(1);
    expect(queueStatus.queueByPriority.medium).toBe(1);
    expect(queueStatus.queueByPriority.low).toBe(1);

    // Wait for processing to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // All should be processed
    const finalStatus = agentLayer.getQueueStatus();
    expect(finalStatus.queueLength).toBe(0);
    expect(finalStatus.processingRequests).toBe(0);
  });

  test('should handle request timeouts', async () => {
    const timeoutAgent: AgentDefinition = {
      id: 'timeout-test',
      name: 'Timeout Test Agent',
      type: 'llm',
      capabilities: ['testing'],
      config: {
        // Configure to simulate long processing time
      },
      constraints: {
        timeoutMs: 100 // Very short timeout
      }
    };

    agentLayer.registerAgent(timeoutAgent);

    // Request should timeout
    await expect(
      agentLayer.sendRequest(timeoutAgent.id, 'Long processing request', { waitForResponse: true })
    ).rejects.toThrow('timeout');

    const metrics = agentLayer.getMetrics(timeoutAgent.id);
    expect(metrics!.failedRequests).toBe(1);
  });

  test('should track comprehensive metrics across multiple agents', async () => {
    // Register multiple agents
    const agents: AgentDefinition[] = [
      {
        id: 'metrics-llm',
        name: 'Metrics LLM',
        type: 'llm',
        capabilities: ['code'],
        config: {},
        constraints: {}
      },
      {
        id: 'metrics-rule',
        name: 'Metrics Rule',
        type: 'rule-based',
        capabilities: ['validation'],
        config: { rules: { keywords: ['test'] } },
        constraints: {}
      }
    ];

    agents.forEach(agent => agentLayer.registerAgent(agent));

    // Generate various requests
    const requests = [
      { agentId: 'metrics-llm', input: 'Generate code', shouldSucceed: true },
      { agentId: 'metrics-llm', input: 'Another code request', shouldSucceed: true },
      { agentId: 'metrics-rule', input: 'Test validation', shouldSucceed: true },
      { agentId: 'metrics-rule', input: 'Another test', shouldSucceed: true }
    ];

    for (const req of requests) {
      try {
        await agentLayer.sendRequest(req.agentId, req.input, { waitForResponse: true });
      } catch (error) {
        // Expected for some requests
      }
    }

    // Check metrics
    const llmMetrics = agentLayer.getMetrics('metrics-llm');
    const ruleMetrics = agentLayer.getMetrics('metrics-rule');

    expect(llmMetrics!.totalRequests).toBe(2);
    expect(ruleMetrics!.totalRequests).toBe(2);
    expect(llmMetrics!.averageProcessingTime).toBeGreaterThan(0);
    expect(ruleMetrics!.averageProcessingTime).toBeGreaterThan(0);

    // LLM should have token usage
    expect(llmMetrics!.totalTokensUsed).toBeGreaterThan(0);
    
    // Rule-based should have higher confidence on average
    expect(ruleMetrics!.averageConfidence).toBeGreaterThan(llmMetrics!.averageConfidence);
  });

  test('should export metrics in multiple formats', async () => {
    const testAgent: AgentDefinition = {
      id: 'export-test',
      name: 'Export Test Agent',
      type: 'llm',
      capabilities: ['testing'],
      config: {},
      constraints: {}
    };

    agentLayer.registerAgent(testAgent);

    // Generate some activity
    await agentLayer.sendRequest(testAgent.id, 'Test request', { waitForResponse: true });

    // Export as JSON
    const jsonExport = await agentLayer.exportMetrics('json');
    const jsonData = JSON.parse(jsonExport);

    expect(jsonData).toHaveProperty('exportedAt');
    expect(jsonData).toHaveProperty('totalAgents', 1);
    expect(jsonData.metrics).toHaveLength(1);
    expect(jsonData.metrics[0].agentId).toBe('export-test');

    // Export as CSV
    const csvExport = await agentLayer.exportMetrics('csv');
    const csvLines = csvExport.split('\n');

    expect(csvLines[0]).toContain('agentId,agentName,agentType');
    expect(csvLines[1]).toContain('export-test');
    expect(csvLines[1]).toContain('Export Test Agent');
    expect(csvLines[1]).toContain('llm');

    // Save exports to files
    await fs.writeFile(path.join(tempDir, 'metrics.json'), jsonExport);
    await fs.writeFile(path.join(tempDir, 'metrics.csv'), csvExport);

    // Verify files exist
    const jsonExists = await fs.access(path.join(tempDir, 'metrics.json')).then(() => true).catch(() => false);
    const csvExists = await fs.access(path.join(tempDir, 'metrics.csv')).then(() => true).catch(() => false);

    expect(jsonExists).toBe(true);
    expect(csvExists).toBe(true);
  });

  test('should handle agent registration and deregistration events', async () => {
    const events: any[] = [];

    // Listen to events
    agentLayer.on('agentRegistered', (agent) => events.push({ type: 'registered', agent }));
    agentLayer.on('agentUnregistered', (data) => events.push({ type: 'unregistered', data }));
    agentLayer.on('requestReceived', (request) => events.push({ type: 'requestReceived', request }));
    agentLayer.on('requestCompleted', (data) => events.push({ type: 'requestCompleted', data }));

    const testAgent: AgentDefinition = {
      id: 'event-test',
      name: 'Event Test Agent',
      type: 'rule-based',
      capabilities: ['testing'],
      config: { rules: {} },
      constraints: {}
    };

    // Register agent
    agentLayer.registerAgent(testAgent);

    // Send request
    await agentLayer.sendRequest(testAgent.id, 'Test request', { waitForResponse: true });

    // Unregister agent
    agentLayer.unregisterAgent(testAgent.id);

    // Verify events
    const eventTypes = events.map(e => e.type);
    expect(eventTypes).toContain('registered');
    expect(eventTypes).toContain('requestReceived');
    expect(eventTypes).toContain('requestCompleted');
    expect(eventTypes).toContain('unregistered');

    expect(events.find(e => e.type === 'registered').agent.id).toBe('event-test');
    expect(events.find(e => e.type === 'unregistered').data.agentId).toBe('event-test');
  });

  test('should handle high-volume concurrent requests across multiple agents', async () => {
    // Register multiple agents
    const agentCount = 3;
    const requestsPerAgent = 20;

    for (let i = 0; i < agentCount; i++) {
      const agent: AgentDefinition = {
        id: `load-test-${i}`,
        name: `Load Test Agent ${i}`,
        type: i % 2 === 0 ? 'rule-based' : 'llm',
        capabilities: ['load-testing'],
        config: i % 2 === 0 ? { rules: { keywords: ['test'] } } : {},
        constraints: {
          maxConcurrent: 5,
          timeoutMs: 5000
        }
      };
      agentLayer.registerAgent(agent);
    }

    const startTime = Date.now();
    
    // Generate concurrent requests
    const allRequests: Promise<string>[] = [];
    
    for (let agent = 0; agent < agentCount; agent++) {
      for (let req = 0; req < requestsPerAgent; req++) {
        allRequests.push(
          agentLayer.sendRequest(
            `load-test-${agent}`,
            `Load test request ${req} for agent ${agent}`,
            { waitForResponse: true, priority: req % 3 === 0 ? 'high' : 'medium' }
          )
        );
      }
    }

    const results = await Promise.allSettled(allRequests);
    const duration = Date.now() - startTime;

    // Analyze results
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failureCount = results.filter(r => r.status === 'rejected').length;

    expect(successCount).toBeGreaterThan(agentCount * requestsPerAgent * 0.8); // At least 80% success
    expect(duration).toBeLessThan(30000); // Should complete within 30 seconds

    console.log(`Load test: ${successCount}/${allRequests.length} successful in ${duration}ms`);
    console.log(`Throughput: ${(successCount / (duration / 1000)).toFixed(1)} requests/second`);

    // Verify metrics are reasonable
    for (let i = 0; i < agentCount; i++) {
      const metrics = agentLayer.getMetrics(`load-test-${i}`);
      expect(metrics!.totalRequests).toBeGreaterThan(0);
      expect(metrics!.averageProcessingTime).toBeGreaterThan(0);
      expect(metrics!.averageProcessingTime).toBeLessThan(5000);
    }
  });
});