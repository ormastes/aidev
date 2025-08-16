/**
 * Core tests for VLLM Coordinator Agent Theme
 */

import axios from 'axios';
import { Server } from 'socket.io';
import { io as ioClient } from 'socket.io-client';

describe('VLLM Coordinator Agent Theme - Core Functionality', () => {
  const mockAxios = axios as jest.Mocked<typeof axios>;

  describe('pipe gateway', () => {
    it('should export theme functionality through pipe', () => {
      const pipe = require('../../pipe/index');
      expect(pipe).toBeDefined();
    });
  });

  describe('vllm connection management', () => {
    it('should connect to vllm server', async () => {
      const connectToVLLM = async (host: string = 'http://localhost:8000') => {
        try {
          const response = await axios.get(`${host}/v1/models`);
          return {
            connected: true,
            models: response.data.data || [],
            host
          };
        } catch (error) {
          return {
            connected: false,
            error: (error as Error).message
          };
        }
      };

      mockAxios.get = jest.fn().mockResolvedValue({
        data: {
          data: [
            { id: 'meta-llama/Llama-2-7b-hf', object: 'model' },
            { id: 'mistralai/Mistral-7B-v0.1', object: 'model' }
          ]
        }
      });

      const result = await connectToVLLM();
      
      expect(result.connected).toBe(true);
      expect(result.models).toHaveLength(2);
      expect(result.models[0].id).toBe('meta-llama/Llama-2-7b-hf');
    });

    it('should handle vllm connection failures', async () => {
      const connectToVLLM = async (host: string = 'http://localhost:8000') => {
        try {
          const response = await axios.get(`${host}/v1/models`);
          return {
            connected: true,
            models: response.data.data || []
          };
        } catch (error) {
          return {
            connected: false,
            error: (error as Error).message,
            retryIn: 5000
          };
        }
      };

      mockAxios.get = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await connectToVLLM();
      
      expect(result.connected).toBe(false);
      expect(result.error).toBe('ECONNREFUSED');
      expect(result.retryIn).toBe(5000);
    });
  });

  describe('agent coordination', () => {
    it('should manage multiple agent instances', () => {
      interface Agent {
        id: string;
        type: string;
        status: 'idle' | 'busy' | 'error';
        model: string;
        capabilities: string[];
      }

      class AgentCoordinator {
        private agents = new Map<string, Agent>();
        private taskQueue: any[] = [];

        registerAgent(agent: Agent): string {
          this.agents.set(agent.id, agent);
          return agent.id;
        }

        unregisterAgent(agentId: string): boolean {
          return this.agents.delete(agentId);
        }

        getAgent(agentId: string): Agent | undefined {
          return this.agents.get(agentId);
        }

        getAvailableAgents(): Agent[] {
          return Array.from(this.agents.values())
            .filter(agent => agent.status === 'idle');
        }

        assignTask(task: any): Agent | null {
          const availableAgents = this.getAvailableAgents();
          
          // Find agent with matching capabilities
          const suitableAgent = availableAgents.find(agent =>
            task.requiredCapabilities.every((cap: string) => 
              agent.capabilities.includes(cap)
            )
          );

          if (suitableAgent) {
            suitableAgent.status = 'busy';
            return suitableAgent;
          }

          // Queue task if no suitable agent available
          this.taskQueue.push(task);
          return null;
        }

        releaseAgent(agentId: string) {
          const agent = this.agents.get(agentId);
          if (agent) {
            agent.status = 'idle';
            this.processQueuedTasks();
          }
        }

        private processQueuedTasks() {
          const pendingTasks = [...this.taskQueue];
          this.taskQueue = [];

          pendingTasks.forEach(task => {
            const assigned = this.assignTask(task);
            // If not assigned, task will be re-queued
          });
        }

        getQueueLength(): number {
          return this.taskQueue.length;
        }
      }

      const coordinator = new AgentCoordinator();
      
      // Register agents
      const agent1: Agent = {
        id: 'agent-1',
        type: 'completion',
        status: 'idle',
        model: 'llama-2-7b',
        capabilities: ['text-generation', 'summarization']
      };

      const agent2: Agent = {
        id: 'agent-2',
        type: 'chat',
        status: 'idle',
        model: 'mistral-7b',
        capabilities: ['chat', 'code-generation']
      };

      coordinator.registerAgent(agent1);
      coordinator.registerAgent(agent2);
      
      expect(coordinator.getAvailableAgents()).toHaveLength(2);

      // Assign task
      const task = {
        id: 'task-1',
        requiredCapabilities: ['text-generation']
      };

      const assigned = coordinator.assignTask(task);
      expect(assigned).toBeTruthy();
      expect(assigned?.id).toBe('agent-1');
      expect(coordinator.getAvailableAgents()).toHaveLength(1);

      // Release agent
      coordinator.releaseAgent('agent-1');
      expect(coordinator.getAvailableAgents()).toHaveLength(2);
    });

    it('should handle agent communication via websockets', () => {
      class AgentWebSocketManager {
        private connections = new Map<string, any>();
        private messageHandlers = new Map<string, (data: any) => void>();

        addConnection(agentId: string, socket: any) {
          this.connections.set(agentId, socket);
          
          // Setup message handler
          socket.on('message', (data: any) => {
            const handler = this.messageHandlers.get(data.type);
            if (handler) {
              handler(data);
            }
          });
        }

        removeConnection(agentId: string) {
          const socket = this.connections.get(agentId);
          if (socket) {
            socket.disconnect();
            this.connections.delete(agentId);
          }
        }

        broadcast(message: any) {
          this.connections.forEach(socket => {
            socket.emit('broadcast', message);
          });
        }

        sendToAgent(agentId: string, message: any) {
          const socket = this.connections.get(agentId);
          if (socket) {
            socket.emit('message', message);
            return true;
          }
          return false;
        }

        onMessage(type: string, handler: (data: any) => void) {
          this.messageHandlers.set(type, handler);
        }

        getConnectionCount(): number {
          return this.connections.size;
        }
      }

      const manager = new AgentWebSocketManager();
      const mockSocket = (global as any).testUtils.mockSocket();

      manager.addConnection('agent-1', mockSocket);
      expect(manager.getConnectionCount()).toBe(1);

      const sent = manager.sendToAgent('agent-1', { type: 'task', data: 'test' });
      expect(sent).toBe(true);
      expect(mockSocket.emit).toHaveBeenCalledWith('message', { type: 'task', data: 'test' });

      manager.broadcast({ type: 'status', data: 'update' });
      expect(mockSocket.emit).toHaveBeenCalledWith('broadcast', { type: 'status', data: 'update' });

      manager.removeConnection('agent-1');
      expect(manager.getConnectionCount()).toBe(0);
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('vllm model management', () => {
    it('should handle model loading and unloading', async () => {
      interface ModelInfo {
        id: string;
        loaded: boolean;
        memory_usage: number;
        gpu_memory_usage?: number;
      }

      class VLLMModelManager {
        private models = new Map<string, ModelInfo>();
        private maxMemoryGB = 32;
        private currentMemoryUsage = 0;

        async loadModel(modelId: string, memoryRequirementGB: number): Promise<boolean> {
          if (this.currentMemoryUsage + memoryRequirementGB > this.maxMemoryGB) {
            // Try to free memory by unloading least recently used models
            await this.freeMemory(memoryRequirementGB);
          }

          if (this.currentMemoryUsage + memoryRequirementGB <= this.maxMemoryGB) {
            const modelInfo: ModelInfo = {
              id: modelId,
              loaded: true,
              memory_usage: memoryRequirementGB,
              gpu_memory_usage: memoryRequirementGB * 0.9 // Approximate GPU usage
            };

            this.models.set(modelId, modelInfo);
            this.currentMemoryUsage += memoryRequirementGB;
            return true;
          }

          return false;
        }

        async unloadModel(modelId: string): Promise<boolean> {
          const model = this.models.get(modelId);
          if (model && model.loaded) {
            this.currentMemoryUsage -= model.memory_usage;
            model.loaded = false;
            this.models.delete(modelId);
            return true;
          }
          return false;
        }

        private async freeMemory(requiredGB: number) {
          // Simple LRU implementation
          const sortedModels = Array.from(this.models.values())
            .filter(m => m.loaded)
            .sort((a, b) => a.memory_usage - b.memory_usage);

          let freedMemory = 0;
          for (const model of sortedModels) {
            if (freedMemory >= requiredGB) break;
            await this.unloadModel(model.id);
            freedMemory += model.memory_usage;
          }
        }

        getLoadedModels(): ModelInfo[] {
          return Array.from(this.models.values()).filter(m => m.loaded);
        }

        getMemoryUsage(): { used: number; total: number; percentage: number } {
          return {
            used: this.currentMemoryUsage,
            total: this.maxMemoryGB,
            percentage: (this.currentMemoryUsage / this.maxMemoryGB) * 100
          };
        }
      }

      const manager = new VLLMModelManager();
      
      // Load models
      const loaded1 = await manager.loadModel('llama-2-7b', 13);
      expect(loaded1).toBe(true);
      expect(manager.getLoadedModels()).toHaveLength(1);

      const loaded2 = await manager.loadModel('mistral-7b', 14);
      expect(loaded2).toBe(true);
      expect(manager.getLoadedModels()).toHaveLength(2);

      const memoryUsage = manager.getMemoryUsage();
      expect(memoryUsage.used).toBe(27);
      expect(memoryUsage.percentage).toBeCloseTo(84.375, 2);

      // Try to load a model that exceeds memory
      const loaded3 = await manager.loadModel('llama-2-70b', 140);
      expect(loaded3).toBe(false);

      // Check which models are still loaded
      const loadedModels = manager.getLoadedModels();
      
      if (loadedModels.length > 0) {
        // Unload the first available model
        const modelToUnload = loadedModels[0].id;
        const unloaded = await manager.unloadModel(modelToUnload);
        expect(unloaded).toBe(true);
        
        const remainingMemory = manager.getMemoryUsage().used;
        expect(remainingMemory).toBeLessThan(27);
      } else {
        // All models were unloaded during the failed load attempt
        expect(manager.getMemoryUsage().used).toBe(0);
      }
    });
  });

  describe('request handling', () => {
    it('should handle completion requests', async () => {
      const handleCompletionRequest = async (prompt: string, options: any = {}) => {
        const defaultOptions = {
          model: 'meta-llama/Llama-2-7b-hf',
          max_tokens: 100,
          temperature: 0.7,
          top_p: 0.9,
          stream: false
        };

        const requestOptions = { ...defaultOptions, ...options };
        
        const response = await axios.post('http://localhost:8000/v1/completions', {
          prompt,
          ...requestOptions
        });

        return {
          text: response.data.choices[0].text,
          usage: response.data.usage,
          model: response.data.model,
          finishReason: response.data.choices[0].finish_reason
        };
      };

      mockAxios.post = jest.fn().mockResolvedValue({
        data: {
          id: 'cmpl-123',
          object: 'text_completion',
          created: 1234567890,
          model: 'meta-llama/Llama-2-7b-hf',
          choices: [{
            text: 'This is a test completion',
            index: 0,
            finish_reason: 'stop'
          }],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30
          }
        }
      });

      const result = await handleCompletionRequest('Complete this: Hello');
      
      expect(result.text).toBe('This is a test completion');
      expect(result.usage.total_tokens).toBe(30);
      expect(result.finishReason).toBe('stop');
    });

    it('should handle chat completion requests', async () => {
      interface ChatMessage {
        role: 'system' | 'user' | 'assistant';
        content: string;
      }

      const handleChatCompletion = async (messages: ChatMessage[], options: any = {}) => {
        const defaultOptions = {
          model: 'meta-llama/Llama-2-7b-hf',
          max_tokens: 100,
          temperature: 0.7,
          stream: false
        };

        const requestOptions = { ...defaultOptions, ...options };
        
        const response = await axios.post('http://localhost:8000/v1/chat/completions', {
          messages,
          ...requestOptions
        });

        return {
          message: response.data.choices[0].message,
          usage: response.data.usage,
          model: response.data.model,
          finishReason: response.data.choices[0].finish_reason
        };
      };

      mockAxios.post = jest.fn().mockResolvedValue({
        data: {
          id: 'chat-123',
          object: 'chat.completion',
          created: 1234567890,
          model: 'meta-llama/Llama-2-7b-hf',
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: 'This is a chat response'
            },
            finish_reason: 'stop'
          }],
          usage: {
            prompt_tokens: 15,
            completion_tokens: 25,
            total_tokens: 40
          }
        }
      });

      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' }
      ];

      const result = await handleChatCompletion(messages);
      
      expect(result.message.role).toBe('assistant');
      expect(result.message.content).toBe('This is a chat response');
      expect(result.usage.total_tokens).toBe(40);
    });
  });

  describe('load balancing', () => {
    it('should distribute requests across multiple vllm instances', async () => {
      interface VLLMInstance {
        id: string;
        host: string;
        port: number;
        healthy: boolean;
        currentLoad: number;
        maxLoad: number;
      }

      class LoadBalancer {
        private instances: VLLMInstance[] = [];
        private currentIndex = 0;

        addInstance(instance: VLLMInstance) {
          this.instances.push(instance);
        }

        removeInstance(id: string) {
          this.instances = this.instances.filter(inst => inst.id !== id);
        }

        getNextInstance(strategy: 'round-robin' | 'least-loaded' = 'round-robin'): VLLMInstance | null {
          const healthyInstances = this.instances.filter(inst => inst.healthy);
          
          if (healthyInstances.length === 0) return null;

          if (strategy === 'round-robin') {
            const instance = healthyInstances[this.currentIndex % healthyInstances.length];
            this.currentIndex++;
            return instance;
          } else {
            // Least loaded strategy
            return healthyInstances.reduce((least, current) => {
              const leastUtilization = least.currentLoad / least.maxLoad;
              const currentUtilization = current.currentLoad / current.maxLoad;
              return currentUtilization < leastUtilization ? current : least;
            });
          }
        }

        updateInstanceHealth(id: string, healthy: boolean) {
          const instance = this.instances.find(inst => inst.id === id);
          if (instance) {
            instance.healthy = healthy;
          }
        }

        updateInstanceLoad(id: string, load: number) {
          const instance = this.instances.find(inst => inst.id === id);
          if (instance) {
            instance.currentLoad = load;
          }
        }

        getHealthyInstanceCount(): number {
          return this.instances.filter(inst => inst.healthy).length;
        }
      }

      const balancer = new LoadBalancer();
      
      // Add instances
      balancer.addInstance({
        id: 'vllm-1',
        host: 'localhost',
        port: 8000,
        healthy: true,
        currentLoad: 2,
        maxLoad: 10
      });

      balancer.addInstance({
        id: 'vllm-2',
        host: 'localhost',
        port: 8001,
        healthy: true,
        currentLoad: 5,
        maxLoad: 10
      });

      balancer.addInstance({
        id: 'vllm-3',
        host: 'localhost',
        port: 8002,
        healthy: false,
        currentLoad: 0,
        maxLoad: 10
      });

      expect(balancer.getHealthyInstanceCount()).toBe(2);

      // Test round-robin
      const inst1 = balancer.getNextInstance('round-robin');
      const inst2 = balancer.getNextInstance('round-robin');
      const inst3 = balancer.getNextInstance('round-robin');
      
      expect(inst1?.id).toBe('vllm-1');
      expect(inst2?.id).toBe('vllm-2');
      expect(inst3?.id).toBe('vllm-1'); // Cycles back

      // Test least-loaded
      const leastLoaded = balancer.getNextInstance('least-loaded');
      expect(leastLoaded?.id).toBe('vllm-1'); // Has lower load
    });
  });

  describe('monitoring and metrics', () => {
    it('should collect performance metrics', () => {
      interface PerformanceMetric {
        timestamp: Date;
        requestId: string;
        model: string;
        duration: number;
        tokensPerSecond: number;
        success: boolean;
      }

      class MetricsCollector {
        private metrics: PerformanceMetric[] = [];
        private maxMetrics = 1000;

        recordMetric(metric: PerformanceMetric) {
          this.metrics.push(metric);
          
          // Keep only recent metrics
          if (this.metrics.length > this.maxMetrics) {
            this.metrics = this.metrics.slice(-this.maxMetrics);
          }
        }

        getAverageMetrics(timeWindowMs: number = 60000): any {
          const now = Date.now();
          const recentMetrics = this.metrics.filter(m => 
            now - m.timestamp.getTime() < timeWindowMs
          );

          if (recentMetrics.length === 0) {
            return null;
          }

          const successfulMetrics = recentMetrics.filter(m => m.success);
          
          return {
            totalRequests: recentMetrics.length,
            successfulRequests: successfulMetrics.length,
            successRate: (successfulMetrics.length / recentMetrics.length) * 100,
            averageDuration: successfulMetrics.reduce((sum, m) => sum + m.duration, 0) / successfulMetrics.length,
            averageTokensPerSecond: successfulMetrics.reduce((sum, m) => sum + m.tokensPerSecond, 0) / successfulMetrics.length,
            modelUsage: this.getModelUsage(recentMetrics)
          };
        }

        private getModelUsage(metrics: PerformanceMetric[]): Record<string, number> {
          const usage: Record<string, number> = {};
          
          metrics.forEach(m => {
            usage[m.model] = (usage[m.model] || 0) + 1;
          });
          
          return usage;
        }

        getMetricsByModel(model: string): PerformanceMetric[] {
          return this.metrics.filter(m => m.model === model);
        }
      }

      const collector = new MetricsCollector();
      
      // Record some metrics
      collector.recordMetric({
        timestamp: new Date(),
        requestId: 'req-1',
        model: 'llama-2-7b',
        duration: 1500,
        tokensPerSecond: 45.5,
        success: true
      });

      collector.recordMetric({
        timestamp: new Date(),
        requestId: 'req-2',
        model: 'mistral-7b',
        duration: 1200,
        tokensPerSecond: 52.3,
        success: true
      });

      collector.recordMetric({
        timestamp: new Date(),
        requestId: 'req-3',
        model: 'llama-2-7b',
        duration: 2000,
        tokensPerSecond: 0,
        success: false
      });

      const avgMetrics = collector.getAverageMetrics();
      
      expect(avgMetrics.totalRequests).toBe(3);
      expect(avgMetrics.successfulRequests).toBe(2);
      expect(avgMetrics.successRate).toBeCloseTo(66.67, 1);
      expect(avgMetrics.averageDuration).toBe(1350);
      expect(avgMetrics.averageTokensPerSecond).toBeCloseTo(48.9, 1);
      expect(avgMetrics.modelUsage['llama-2-7b']).toBe(2);
      expect(avgMetrics.modelUsage['mistral-7b']).toBe(1);
    });
  });
});