/**
 * Specific agent interfaces
 */

import { IAgent, AgentRequest, AgentResponse, Message } from './base.interfaces';

// LLM Agent interfaces
export interface ILLMAgent extends IAgent {
  model: string;
  streamResponse(request: AgentRequest): AsyncIterator<StreamChunk>;
  createSession(options?: SessionOptions): Promise<Session>;
}

export interface StreamChunk {
  type: 'content' | 'tool_call' | "metadata" | 'error' | 'done';
  content?: string;
  toolCall?: ToolCall;
  metadata?: any;
  error?: Error;
}

export interface Session {
  id: string;
  agentId: string;
  created: Date;
  updated: Date;
  messages: Message[];
  context?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface SessionOptions {
  expiresIn?: number;
  persistent?: boolean;
  initialContext?: Record<string, any>;
}

// Claude Agent specific
export interface IClaudeAgent extends ILLMAgent {
  enableDangerousMode(reason: string): Promise<void>;
  disableDangerousMode(): Promise<void>;
  setPermissions(permissions: Permission[]): void;
  interruptSession(sessionId: string): Promise<void>;
  resumeSession(sessionId: string): Promise<void>;
}

export interface Permission {
  tool: string;
  allowed: boolean;
  confirmationRequired?: boolean;
}

// Ollama Agent specific
export interface IOllamaAgent extends ILLMAgent {
  loadModel(modelName: string): Promise<void>;
  unloadModel(): Promise<void>;
  getLoadedModel(): string | null;
  listLocalModels(): Promise<string[]>;
  pullModel(modelName: string): Promise<void>;
}

// vLLM Agent specific
export interface IVLLMAgent extends ILLMAgent {
  getGPUInfo(): Promise<GPUInfo>;
  setGPUAllocation(allocation: GPUAllocation): Promise<void>;
  getBatchConfig(): BatchConfig;
  setBatchConfig(config: BatchConfig): void;
}

export interface GPUInfo {
  available: boolean;
  devices: GPUDevice[];
  totalMemory: number;
  availableMemory: number;
}

export interface GPUDevice {
  id: number;
  name: string;
  memory: number;
  utilization: number;
}

export interface GPUAllocation {
  deviceIds?: number[];
  memoryFraction?: number;
  allowGrowth?: boolean;
}

export interface BatchConfig {
  maxBatchSize: number;
  maxSequenceLength: number;
  timeout: number;
}

// Role-based Agent interfaces
export interface IRoleAgent extends IAgent {
  role: AgentRole;
  executeTask(task: Task): Promise<TaskResult>;
}

export type AgentRole = "developer" | 'tester' | "architect" | "coordinator" | 'general';

export interface Task {
  id: string;
  type: string;
  description: string;
  parameters?: Record<string, any>;
  dependencies?: string[];
}

export interface TaskResult {
  taskId: string;
  status: 'success' | 'failure';
  output?: any;
  error?: string;
  duration: number;
}

// Specific role agents
export interface IDeveloperAgent extends IRoleAgent {
  generateCode(specification: CodeSpecification): Promise<GeneratedCode>;
  reviewCode(code: string, criteria?: ReviewCriteria): Promise<CodeReview>;
  refactorCode(code: string, target: RefactorTarget): Promise<string>;
}

export interface CodeSpecification {
  language: string;
  framework?: string;
  description: string;
  requirements?: string[];
  examples?: string[];
}

export interface GeneratedCode {
  code: string;
  language: string;
  explanation?: string;
  dependencies?: string[];
}

export interface ReviewCriteria {
  checkSecurity?: boolean;
  checkPerformance?: boolean;
  checkStyle?: boolean;
  customRules?: string[];
}

export interface CodeReview {
  issues: CodeIssue[];
  suggestions: string[];
  score?: number;
}

export interface CodeIssue {
  line?: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  rule?: string;
}

export type RefactorTarget = "performance" | "readability" | "modularity" | "testability";

export interface ITesterAgent extends IRoleAgent {
  generateTests(code: string, framework?: string): Promise<GeneratedTests>;
  executeTests(tests: string[], environment?: TestEnvironment): Promise<TestResults>;
  analyzeCoverage(coverageData: any): Promise<CoverageAnalysis>;
}

export interface GeneratedTests {
  tests: TestCase[];
  framework: string;
  setup?: string;
  teardown?: string;
}

export interface TestCase {
  name: string;
  code: string;
  type: 'unit' | "integration" | 'e2e';
  tags?: string[];
}

export interface TestEnvironment {
  variables?: Record<string, string>;
  mocks?: Record<string, any>;
  timeout?: number;
}

export interface TestResults {
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  failures?: TestFailure[];
}

export interface TestFailure {
  test: string;
  error: string;
  stack?: string;
}

export interface CoverageAnalysis {
  lineCoverage: number;
  branchCoverage: number;
  functionCoverage: number;
  uncoveredLines?: number[];
  suggestions?: string[];
}

export interface IArchitectAgent extends IRoleAgent {
  designSystem(requirements: SystemRequirements): Promise<SystemDesign>;
  reviewArchitecture(design: SystemDesign): Promise<ArchitectureReview>;
  suggestPatterns(context: DesignContext): Promise<PatternSuggestion[]>;
}

export interface SystemRequirements {
  functional: string[];
  nonFunctional: string[];
  constraints?: string[];
  scale?: ScaleRequirements;
}

export interface ScaleRequirements {
  users: number;
  requestsPerSecond: number;
  dataVolume: string;
}

export interface SystemDesign {
  components: Component[];
  connections: Connection[];
  patterns: string[];
  technologies: string[];
}

export interface Component {
  id: string;
  name: string;
  type: string;
  responsibilities: string[];
  technologies?: string[];
}

export interface Connection {
  from: string;
  to: string;
  type: 'sync' | 'async' | 'event';
  protocol?: string;
}

export interface ArchitectureReview {
  score: number;
  strengths: string[];
  weaknesses: string[];
  risks: Risk[];
  recommendations: string[];
}

export interface Risk {
  description: string;
  impact: 'low' | 'medium' | 'high';
  probability: 'low' | 'medium' | 'high';
  mitigation?: string;
}

export interface DesignContext {
  domain: string;
  requirements: string[];
  constraints?: string[];
  existingPatterns?: string[];
}

export interface PatternSuggestion {
  pattern: string;
  rationale: string;
  implementation?: string;
  tradeoffs?: string[];
}

// Monitor Agent interfaces
export interface IMonitorAgent extends IAgent {
  startMonitoring(): Promise<void>;
  stopMonitoring(): Promise<void>;
  getMetrics(): Promise<Metrics>;
  setAlertThresholds(thresholds: AlertThresholds): void;
}

export interface Metrics {
  timestamp: Date;
  values: Record<string, number>;
  status: 'normal' | 'warning' | "critical";
}

export interface AlertThresholds {
  metric: string;
  warning: number;
  critical: number;
  comparison: 'gt' | 'lt' | 'eq';
}

// Tool-related interfaces
export interface ToolCall {
  id: string;
  name: string;
  parameters: any;
  result?: any;
  error?: string;
}