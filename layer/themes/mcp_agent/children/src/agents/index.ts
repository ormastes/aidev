/**
 * MCP Agents
 * All agent implementations for the AI Development Platform
 */

// Core Development Agents
export * from './core';

// Specialized Agents
export * from './specialized';

// Support Agents
export * from './support';

// Agent factory function
import { Agent } from '../domain/agent';
import { 
  TaskManagerAgent,
  CoderAgent,
  TesterAgent,
  RefactorAgent
} from './core';
import {
  GUICoordinatorAgent,
  MobileAutomationAgent,
  APICheckerAgent,
  DevOpsAgent
} from './specialized';
import {
  ContextManagerAgent,
  AuthManagerAgent,
  SetupAgent,
  FeatureManagerAgent
} from './support';

export type AgentType = 
  | 'task-manager'
  | 'coder'
  | 'tester'
  | 'refactor'
  | 'gui-coordinator'
  | 'mobile-automation'
  | 'api-checker'
  | 'devops'
  | 'context-manager'
  | 'auth-manager'
  | 'setup'
  | 'feature-manager';

export function createAgent(type: AgentType, id?: string): Agent {
  switch (type) {
    // Core agents
    case 'task-manager':
      return new TaskManagerAgent(id);
    case 'coder':
      return new CoderAgent(id);
    case 'tester':
      return new TesterAgent(id);
    case 'refactor':
      return new RefactorAgent(id);
    
    // Specialized agents
    case 'gui-coordinator':
      return new GUICoordinatorAgent(id);
    case 'mobile-automation':
      return new MobileAutomationAgent(id);
    case 'api-checker':
      return new APICheckerAgent(id);
    case 'devops':
      return new DevOpsAgent(id);
    
    // Support agents
    case 'context-manager':
      return new ContextManagerAgent(id);
    case 'auth-manager':
      return new AuthManagerAgent(id);
    case 'setup':
      return new SetupAgent(id);
    case 'feature-manager':
      return new FeatureManagerAgent(id);
    
    default:
      throw new Error(`Unknown agent type: ${type}`);
  }
}

export const AGENT_TYPES: Record<string, AgentType[]> = {
  core: ['task-manager', 'coder', 'tester', 'refactor'],
  specialized: ['gui-coordinator', 'mobile-automation', 'api-checker', 'devops'],
  support: ['context-manager', 'auth-manager', 'setup', 'feature-manager']
};