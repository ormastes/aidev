/**
 * Refactor Agent
 * Responsible for improving code quality and architecture
 */

import { Agent, AGENT_ROLES, AgentCapability } from '../../domain/agent';
import { MCPConnection } from '../../server/mcp-connection';
import { MCPMethod, ToolCall, ToolResult } from '../../domain/protocol';

export class RefactorAgent extends Agent {
  private mcpConnection?: MCPConnection;

  constructor(id?: string) {
    const capabilities: AgentCapability[] = [
      {
        name: 'code_quality_analysis',
        description: 'Analyze code quality metrics',
        enabled: true
      },
      {
        name: 'pattern_detection',
        description: 'Detect code patterns and anti-patterns',
        enabled: true
      },
      {
        name: 'refactoring_suggestions',
        description: 'Suggest code improvements',
        enabled: true
      },
      {
        name: 'architecture_improvements',
        description: 'Improve system architecture',
        enabled: true
      }
    ];

    super({
      id: id || `refactor-${Date.now()}`,
      role: {
        ...AGENT_ROLES.DEVELOPER,
        name: 'refactor',
        description: 'Code quality and refactoring specialist',
        systemPrompt: 'You are the Refactor agent responsible for improving code quality, detecting patterns, and suggesting architectural improvements while maintaining functionality.'
      },
      capabilities
    });
  }

  setMCPConnection(connection: MCPConnection): void {
    this.mcpConnection = connection;
  }

  async analyzeAndRefactor(filePath: string): Promise<{
    issues: string[];
    suggestions: string[];
    refactoredCode?: string;
  }> {
    if (!this.mcpConnection) {
      throw new Error('MCP connection not set');
    }

    const code = await this.readFile(filePath);
    const issues = this.detectIssues(code);
    const suggestions = this.generateSuggestions(issues);

    return {
      issues,
      suggestions,
      refactoredCode: issues.length > 0 ? this.applyRefactoring(code, suggestions) : undefined
    };
  }

  private detectIssues(code: string): string[] {
    const issues: string[] = [];
    
    if (code.includes('any')) issues.push('Using any type');
    if (code.match(/function.*{[\s\S]{500,}}/)) issues.push('Function too long');
    if (code.match(/class.*{[\s\S]{1000,}}/)) issues.push('Class too complex');
    if (!code.includes('interface')) issues.push('Missing interfaces');
    
    return issues;
  }

  private generateSuggestions(issues: string[]): string[] {
    return issues.map(issue => {
      switch (issue) {
        case 'Using any type':
          return 'Replace any with specific types';
        case 'Function too long':
          return 'Extract smaller functions';
        case 'Class too complex':
          return 'Apply Single Responsibility Principle';
        case 'Missing interfaces':
          return 'Define interfaces for contracts';
        default:
          return 'Improve code quality';
      }
    });
  }

  private applyRefactoring(code: string, suggestions: string[]): string {
    let refactored = code;
    
    // Simple refactoring examples
    refactored = refactored.replace(/:\s*any/g, ': unknown');
    
    return refactored;
  }

  private async readFile(path: string): Promise<string> {
    if (!this.mcpConnection) return '';

    const toolCall: ToolCall = {
      name: 'read_file',
      arguments: { path }
    };

    const result = await this.mcpConnection.request<ToolResult>(
      MCPMethod.CALL_TOOL,
      toolCall
    );

    return result.content[0].text || '';
  }
}