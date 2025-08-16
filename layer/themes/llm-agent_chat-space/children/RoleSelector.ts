/**
 * Role Selector Interface for Chat Space
 * 
 * Provides interactive role selection and management for LLM agents
 */

import * as readline from 'readline';
import chalk from 'chalk';
import { SubagentManager, SubagentDefinition } from './SubagentManager';

export interface RoleOption {
  name: string;
  description: string;
  available: boolean;
  provider?: 'claude' | 'ollama';
}

export class RoleSelector {
  private subagentManager: SubagentManager;
  private rl?: readline.Interface;
  private currentRole?: string;

  constructor(subagentManager: SubagentManager) {
    this.subagentManager = subagentManager;
  }

  /**
   * Display available roles
   */
  displayRoles(): void {
    const agents = this.subagentManager.getAvailableAgents();
    const providerStatus = this.subagentManager.getProviderStatus();

    console.log(chalk.blue.bold('\n🤖 Available AI Roles\n'));
    console.log(chalk.gray('═'.repeat(50)));

    if (agents.length === 0) {
      console.log(chalk.yellow('No roles available. Run deploy-subagents.sh first.'));
      return;
    }

    agents.forEach((agent, index) => {
      const number = chalk.cyan(`${index + 1}.`);
      const name = chalk.green(agent.name);
      const desc = chalk.gray(agent.description.substring(0, 60) + '...');
      
      // Show provider availability
      let providerInfo = '';
      if (providerStatus.claude) {
        providerInfo += chalk.blue(' [Claude]');
      }
      if (providerStatus.ollama) {
        providerInfo += chalk.yellow(' [Ollama]');
      }

      console.log(`${number} ${name}${providerInfo}`);
      console.log(`   ${desc}`);
      
      // Show tools if specified
      if (agent.tools && agent.tools.length > 0) {
        const tools = agent.tools.slice(0, 3).join(', ');
        const more = agent.tools.length > 3 ? `, +${agent.tools.length - 3} more` : '';
        console.log(chalk.dim(`   Tools: ${tools}${more}`));
      }
      
      console.log();
    });

    // Show provider status
    console.log(chalk.gray('═'.repeat(50)));
    console.log(chalk.blue('Provider Status:'));
    console.log(`  Claude: ${providerStatus.claude ? chalk.green('✓ Available') : chalk.red('✗ Not configured')}`);
    console.log(`  Ollama: ${providerStatus.ollama ? chalk.green('✓ Running') : chalk.red('✗ Not running')}`);
  }

  /**
   * Interactive role selection menu
   */
  async selectRole(): Promise<string | null> {
    return new Promise((resolve) => {
      const agents = this.subagentManager.getAvailableAgents();
      
      if (agents.length === 0) {
        console.log(chalk.red('No roles available.'));
        resolve(null);
        return;
      }

      this.displayRoles();

      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const promptText = chalk.cyan('\nSelect a role (1-' + agents.length + '), or 0 to skip: ');
      
      this.rl.question(promptText, (answer) => {
        const choice = parseInt(answer);
        
        if (choice === 0) {
          console.log(chalk.gray('No role selected.'));
          this.rl?.close();
          resolve(null);
        } else if (choice >= 1 && choice <= agents.length) {
          const selectedAgent = agents[choice - 1];
          this.currentRole = selectedAgent.name;
          console.log(chalk.green(`\n✓ Selected role: ${selectedAgent.name}`));
          this.rl?.close();
          resolve(selectedAgent.name);
        } else {
          console.log(chalk.red('Invalid selection.'));
          this.rl?.close();
          resolve(null);
        }
      });
    });
  }

  /**
   * Quick role selection by name
   */
  selectRoleByName(name: string): boolean {
    const agent = this.subagentManager.getAgent(name);
    
    if (!agent) {
      console.log(chalk.red(`Role not found: ${name}`));
      return false;
    }

    this.currentRole = name;
    console.log(chalk.green(`✓ Activated role: ${name}`));
    return true;
  }

  /**
   * Suggest roles based on task
   */
  suggestRoles(task: string): RoleOption[] {
    const suggestions: RoleOption[] = [];
    const agents = this.subagentManager.getAvailableAgents();
    const providerStatus = this.subagentManager.getProviderStatus();
    const taskLower = task.toLowerCase();

    // Keywords to role mapping
    const roleKeywords: Record<string, string[]> = {
      'requirement-analyst': ['requirement', 'story', 'criteria', 'analysis', 'feature'],
      'auth-manager': ['auth', 'login', 'security', 'password', 'session', 'token'],
      'api-checker': ['api', 'endpoint', 'contract', 'swagger', 'openapi', 'rest'],
      'agent-scheduler': ['schedule', 'coordinate', 'agent', 'task', 'queue'],
      'context-manager': ['context', 'memory', 'state', 'history', 'conversation'],
      'tester': ['test', 'coverage', 'unit', 'integration', 'playwright', 'jest'],
      'gui-coordinator': ['gui', 'ui', 'interface', 'design', 'frontend', 'style'],
      'feature-manager': ['feature', 'plan', 'develop', 'lifecycle', 'deploy']
    };

    for (const agent of agents) {
      const keywords = roleKeywords[agent.name] || [];
      let relevance = 0;

      // Check keyword matches
      for (const keyword of keywords) {
        if (taskLower.includes(keyword)) {
          relevance += 10;
        }
      }

      // Check description matches
      const descWords = agent.description.toLowerCase().split(/\s+/);
      for (const word of descWords) {
        if (taskLower.includes(word) && word.length > 3) {
          relevance += 1;
        }
      }

      if (relevance > 0) {
        suggestions.push({
          name: agent.name,
          description: agent.description,
          available: providerStatus.claude || providerStatus.ollama,
          provider: providerStatus.claude ? 'claude' : 'ollama'
        });
      }
    }

    // Sort by relevance (implicit by order of matching)
    return suggestions.slice(0, 3); // Return top 3 suggestions
  }

  /**
   * Display role suggestions
   */
  displaySuggestions(task: string): void {
    const suggestions = this.suggestRoles(task);

    if (suggestions.length === 0) {
      return; // No suggestions
    }

    console.log(chalk.blue('\n💡 Suggested roles for this task:'));
    
    suggestions.forEach((suggestion, index) => {
      const icon = suggestion.available ? chalk.green('✓') : chalk.red('✗');
      const provider = suggestion.provider ? chalk.gray(`[${suggestion.provider}]`) : '';
      console.log(`  ${icon} ${chalk.cyan(suggestion.name)} ${provider}`);
      console.log(chalk.gray(`     ${suggestion.description.substring(0, 50)}...`));
    });

    console.log(chalk.gray('\nUse /role <name> to activate a suggested role'));
  }

  /**
   * Get current active role
   */
  getCurrentRole(): string | undefined {
    return this.currentRole;
  }

  /**
   * Clear current role
   */
  clearRole(): void {
    if (this.currentRole) {
      console.log(chalk.yellow(`Role cleared: ${this.currentRole}`));
      this.currentRole = undefined;
    }
  }

  /**
   * Show role details
   */
  showRoleDetails(name?: string): void {
    const roleName = name || this.currentRole;
    
    if (!roleName) {
      console.log(chalk.red('No role specified.'));
      return;
    }

    const agent = this.subagentManager.getAgent(roleName);
    
    if (!agent) {
      console.log(chalk.red(`Role not found: ${roleName}`));
      return;
    }

    console.log(chalk.blue.bold(`\n📋 Role Details: ${agent.name}\n`));
    console.log(chalk.gray('═'.repeat(50)));
    
    console.log(chalk.cyan('Description:'));
    console.log(`  ${agent.description}`);
    
    if (agent.tools && agent.tools.length > 0) {
      console.log(chalk.cyan('\nTools:'));
      agent.tools.forEach(tool => {
        console.log(`  • ${tool}`);
      });
    } else {
      console.log(chalk.cyan('\nTools:'));
      console.log('  • All available tools (inherited)');
    }

    if (agent.model) {
      console.log(chalk.cyan('\nPreferred Model:'));
      console.log(`  ${agent.model}`);
    }

    if (agent.temperature !== undefined) {
      console.log(chalk.cyan('\nTemperature:'));
      console.log(`  ${agent.temperature}`);
    }

    // Show first part of system prompt
    console.log(chalk.cyan('\nSystem Prompt Preview:'));
    const preview = agent.systemPrompt.substring(0, 200);
    console.log(chalk.gray(preview + '...'));
    
    console.log(chalk.gray('\n═'.repeat(50)));
  }

  /**
   * Handle role command
   */
  async handleRoleCommand(args: string[]): Promise<void> {
    if (args.length === 0) {
      // Show interactive menu
      await this.selectRole();
    } else if (args[0] === 'list') {
      // List all roles
      this.displayRoles();
    } else if (args[0] === 'clear') {
      // Clear current role
      this.clearRole();
    } else if (args[0] === 'info') {
      // Show role details
      this.showRoleDetails(args[1]);
    } else if (args[0] === 'current') {
      // Show current role
      if (this.currentRole) {
        console.log(chalk.green(`Current role: ${this.currentRole}`));
        this.showRoleDetails();
      } else {
        console.log(chalk.gray('No role currently active.'));
      }
    } else {
      // Select role by name
      this.selectRoleByName(args[0]);
    }
  }

  /**
   * Process task with role context
   */
  async processWithRole(task: string): Promise<string | null> {
    // If no role is set, suggest roles
    if (!this.currentRole) {
      this.displaySuggestions(task);
      
      // Auto-detect role if confidence is high
      const detected = this.subagentManager.detectAgent(task);
      if (detected) {
        console.log(chalk.blue(`\n🎯 Auto-detected role: ${detected}`));
        this.currentRole = detected;
      } else {
        return null;
      }
    }

    // Process with current role
    try {
      console.log(chalk.gray(`\nProcessing with ${this.currentRole}...`));
      
      const response = await this.subagentManager.invoke({
        agent: this.currentRole,
        task,
        provider: this.subagentManager.getProviderStatus().claude ? 'claude' : 'ollama'
      });

      console.log(chalk.green(`\n✓ Completed in ${response.duration}ms`));
      if (response.tokensUsed) {
        console.log(chalk.gray(`  Tokens used: ${response.tokensUsed}`));
      }

      return response.result;
    } catch (error: any) {
      console.log(chalk.red(`\n✗ Error: ${error.message}`));
      return null;
    }
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    if (this.rl) {
      this.rl.close();
    }
    this.currentRole = undefined;
  }
}

/**
 * CLI Commands for role management
 */
export class RoleCommands {
  static getCommands(): Record<string, string> {
    return {
      '/role': 'Select or manage AI roles',
      '/role list': 'List all available roles',
      '/role <name>': 'Activate a specific role',
      '/role clear': 'Clear the current role',
      '/role info <name>': 'Show detailed role information',
      '/role current': 'Show the current active role'
    };
  }

  static getHelp(): string {
    return `
${chalk.blue.bold('Role Management Commands')}
${chalk.gray('═'.repeat(40))}

${chalk.cyan('/role')}           - Open interactive role selector
${chalk.cyan('/role list')}      - List all available roles
${chalk.cyan('/role <name>')}    - Activate a specific role
${chalk.cyan('/role clear')}     - Clear the current role
${chalk.cyan('/role info')}      - Show current role details
${chalk.cyan('/role info <n>')} - Show specific role details
${chalk.cyan('/role current')}   - Show the active role

${chalk.yellow('Examples:')}
  /role tester         - Activate the tester role
  /role info gui-coordinator - Show GUI coordinator details
  /role clear          - Deactivate current role

${chalk.gray('Roles are automatically suggested based on your task.')}
${chalk.gray('Some roles are marked as "proactive" and activate automatically.')}
`;
  }
}