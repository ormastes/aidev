/**
 * MCP Agent Domain Model
 * Represents an AI agent with specific role and capabilities
 */

export interface AgentCapability {
  name: string;
  description: string;
  enabled: boolean;
}

export interface AgentRole {
  name: string;
  description: string;
  defaultCapabilities: readonly string[];
  systemPrompt?: string;
}

export class Agent {
  private readonly id: string;
  private readonly role: AgentRole;
  private readonly capabilities: Map<string, AgentCapability>;
  private readonly createdAt: Date;
  private metadata: Record<string, any>;
  private active: boolean;

  constructor(config: {
    id: string;
    role: AgentRole;
    capabilities?: AgentCapability[];
    metadata?: Record<string, any>;
  }) {
    this.id = config.id;
    this.role = config.role;
    this.capabilities = new Map();
    this.createdAt = new Date();
    this.metadata = config.metadata || {};
    this.active = true;

    // Initialize capabilities
    this.initializeCapabilities(config.capabilities);
  }

  private initializeCapabilities(customCapabilities?: AgentCapability[]): void {
    // Add default capabilities for the role
    this.role.defaultCapabilities.forEach(capName => {
      this.capabilities.set(capName, {
        name: capName,
        description: `Default capability: ${capName}`,
        enabled: true
      });
    });

    // Add/override with custom capabilities
    customCapabilities?.forEach(cap => {
      this.capabilities.set(cap.name, cap);
    });
  }

  // Getters
  getId(): string {
    return this.id;
  }

  getRole(): AgentRole {
    return this.role;
  }

  getRoleName(): string {
    return this.role.name;
  }

  getSystemPrompt(): string | undefined {
    return this.role.systemPrompt;
  }

  getCapabilities(): AgentCapability[] {
    return Array.from(this.capabilities.values());
  }

  getEnabledCapabilities(): string[] {
    return Array.from(this.capabilities.values())
      .filter(cap => cap.enabled)
      .map(cap => cap.name);
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getMetadata(): Record<string, any> {
    return { ...this.metadata };
  }

  isActive(): boolean {
    return this.active;
  }

  // Capability management
  hasCapability(name: string): boolean {
    const capability = this.capabilities.get(name);
    return capability?.enabled || false;
  }

  enableCapability(name: string): void {
    const capability = this.capabilities.get(name);
    if (capability) {
      capability.enabled = true;
    }
  }

  disableCapability(name: string): void {
    const capability = this.capabilities.get(name);
    if (capability) {
      capability.enabled = false;
    }
  }

  addCapability(capability: AgentCapability): void {
    this.capabilities.set(capability.name, capability);
  }

  // Metadata management
  setMetadata(key: string, value: any): void {
    this.metadata[key] = value;
  }

  getMetadataValue(key: string): any {
    return this.metadata[key];
  }

  // Lifecycle
  activate(): void {
    this.active = true;
  }

  deactivate(): void {
    this.active = false;
  }

  // Serialization
  toJSON(): object {
    return {
      id: this.id,
      role: this.role,
      capabilities: Array.from(this.capabilities.values()),
      createdAt: this.createdAt.toISOString(),
      metadata: this.metadata,
      active: this.active
    };
  }

  static fromJSON(data: any): Agent {
    return new Agent({
      id: data.id,
      role: data.role,
      capabilities: data.capabilities,
      metadata: data.metadata
    });
  }
}

// Predefined roles
export const AGENT_ROLES = {
  DEVELOPER: {
    name: "developer",
    description: 'Software development agent',
    defaultCapabilities: ['code_generation', 'code_review', "debugging", 'testing'],
    systemPrompt: 'You are a skilled software developer. Help with coding tasks, debugging, and best practices.'
  },
  TESTER: {
    name: 'tester',
    description: 'Quality assurance and testing agent',
    defaultCapabilities: ['test_generation', 'test_execution', 'bug_reporting', 'coverage_analysis'],
    systemPrompt: 'You are a QA specialist. Focus on testing, quality assurance, and finding potential issues.'
  },
  ARCHITECT: {
    name: "architect",
    description: 'System architecture and design agent',
    defaultCapabilities: ['system_design', 'architecture_review', "documentation", "planning"],
    systemPrompt: 'You are a system architect. Help with design decisions, architecture patterns, and technical planning.'
  },
  COORDINATOR: {
    name: "coordinator",
    description: 'Project coordination and management agent',
    defaultCapabilities: ['task_management', 'workflow_automation', 'team_coordination', "reporting"],
    systemPrompt: 'You are a project coordinator. Help manage tasks, coordinate team efforts, and track progress.'
  },
  GENERAL: {
    name: 'general',
    description: 'General purpose assistant',
    defaultCapabilities: ['general_assistance', "documentation", "communication"],
    systemPrompt: 'You are a helpful AI assistant. Provide assistance with various tasks as requested.'
  }
} as const;

export type AgentRoleName = keyof typeof AGENT_ROLES;