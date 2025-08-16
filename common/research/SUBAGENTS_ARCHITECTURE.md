# Subagents Architecture for AI Development Platform

## Overview

This document outlines the architecture for implementing role-based AI subagents that work with both Claude (native subagent support) and Ollama (role-based instantiation).

## Architecture Components

### 1. Subagent Definition Layer

Each subagent is defined using a standardized format compatible with Claude Code's subagent system:

```yaml
---
name: role-name
description: When this agent should be invoked
tools: Tool1, Tool2, Tool3  # Optional - inherits all if omitted
---

System prompt defining the agent's behavior, expertise, and approach
```

### 2. Provider Abstraction Layer

The system supports two LLM providers with different implementation strategies:

#### Claude Native Subagents
- Uses Claude Code's built-in Task tool for delegation
- Maintains separate context windows per subagent
- Supports tool permission management
- Automatic subagent selection based on task description

#### Ollama Role Instantiation
- Creates new LLM instances with role-specific system prompts
- Configures model parameters based on role requirements
- Maintains conversation history with role context
- Supports model switching based on role needs

### 3. Role Registry

Predefined roles based on `llm_rules/ROLE_*.md`:

1. **requirement-analyst** - Requirements gathering and analysis
2. **auth-manager** - Authentication and security implementation
3. **api-checker** - API validation and compatibility testing
4. **agent-scheduler** - Multi-agent coordination and scheduling
5. **context-manager** - Context optimization for LLM interactions
6. **tester** - Comprehensive testing and quality assurance
7. **gui-coordinator** - UI/UX design and implementation
8. **feature-manager** - Feature lifecycle management

### 4. Deployment System

#### Project Structure
```
project/
├── .claude/
│   └── agents/           # Project-level subagents
│       ├── requirement-analyst.md
│       ├── auth-manager.md
│       └── ...
├── ~/.claude/
│   └── agents/           # User-level subagents
└── layer/
    └── themes/
        └── llm-agent_chat-space/
            ├── subagents/    # Subagent definitions
            └── scripts/      # Deployment scripts
```

#### Deployment Process
1. Generate subagent definitions from role rules
2. Deploy to project or user directory
3. Configure tool permissions
4. Initialize with appropriate LLM provider

### 5. Runtime Selection

The system intelligently selects the appropriate implementation:

```typescript
interface SubagentSelector {
  selectProvider(): 'claude' | 'ollama';
  selectRole(task: string): Role;
  configureAgent(role: Role, provider: Provider): Agent;
}
```

### 6. Context Management

Each subagent maintains its own context:

- **Claude**: Isolated context window per delegation
- **Ollama**: Role-prefixed conversation history

### 7. Tool Permission System

Tools are granted based on role requirements:

```typescript
interface RoleTools {
  'requirement-analyst': ['Read', 'Write', 'TodoWrite'];
  'auth-manager': ['Read', 'Edit', 'Bash', 'WebSearch'];
  'api-checker': ['Read', 'Grep', 'WebFetch', 'Bash'];
  'agent-scheduler': ['Task', 'TodoWrite', 'Read'];
  'context-manager': ['Read', 'Write', 'TodoWrite'];
  'tester': ['Read', 'Edit', 'Bash', 'Grep'];
  'gui-coordinator': ['Read', 'Write', 'WebSearch'];
  'feature-manager': ['Read', 'Write', 'TodoWrite', 'Task'];
}
```

## Implementation Strategy

### Phase 1: Foundation
1. Create subagent definition converter
2. Implement provider abstraction
3. Set up deployment infrastructure

### Phase 2: Claude Integration
1. Generate Claude-compatible subagent files
2. Implement Task tool delegation
3. Configure tool permissions

### Phase 3: Ollama Integration
1. Create role-based prompt templates
2. Implement dynamic instantiation
3. Configure model parameters per role

### Phase 4: Unified Interface
1. Build role selection UI
2. Implement automatic role detection
3. Create hybrid mode operation

## Benefits

1. **Specialized Expertise**: Each role has focused knowledge
2. **Context Preservation**: Isolated contexts prevent pollution
3. **Flexible Deployment**: Works with multiple LLM providers
4. **Tool Safety**: Role-based permission management
5. **Reusability**: Standardized roles across projects

## Configuration Examples

### Requirement Analyst Subagent
```markdown
---
name: requirement-analyst
description: Use proactively for gathering and analyzing requirements, creating user stories, and defining acceptance criteria
tools: Read, Write, TodoWrite, WebSearch
---

You are a Requirement Analyst ensuring clear, complete, and testable requirements.

Your responsibilities:
- Gather requirements through structured analysis
- Create detailed user stories with acceptance criteria
- Identify dependencies and risks
- Validate requirements for completeness and testability

When analyzing requirements:
1. Start by understanding the business context
2. Identify all stakeholders
3. Document functional and non-functional requirements
4. Create measurable acceptance criteria
5. Validate with stakeholder needs

Format user stories as:
As a [user type]
I want to [action]
So that [benefit]

Always ensure requirements are SMART:
- Specific
- Measurable
- Achievable
- Relevant
- Time-bound
```

### Tester Subagent
```markdown
---
name: tester
description: Use proactively to write and run tests, ensure coverage, and fix test failures. Must be used after code changes.
tools: Read, Edit, Bash, Grep, Glob
---

You are a Testing Expert following Mock Free Test Oriented Development principles.

Your approach:
1. Write tests first (TDD)
2. Start with unit tests
3. Build integration tests
4. Complete with system tests using Playwright
5. Ensure minimum 80% coverage

When testing:
- Test real implementations, avoid excessive mocking
- Keep tests simple and maintainable
- Ensure all tests are deterministic
- Document test cases clearly
- Verify edge cases and error scenarios

For each feature:
1. Run existing tests to establish baseline
2. Write new tests for functionality
3. Implement code to pass tests
4. Refactor while keeping tests green
5. Verify coverage meets requirements
```

## Integration Points

### Chat Space Theme
- Location: `layer/themes/llm-agent_chat-space/`
- Integration: Subagent management and runtime selection
- Features: Role-based chat, automatic delegation

### LLM Agent Themes
- Coordinator themes for different providers
- Context transformer for role adaptation
- Flow validator for agent orchestration

## Security Considerations

1. **Tool Restrictions**: Each role has limited tool access
2. **Context Isolation**: Subagents cannot access main context
3. **Audit Logging**: All subagent invocations are logged
4. **Permission Validation**: Tools validated before granting access

## Future Enhancements

1. **Dynamic Role Learning**: Agents learn from successful patterns
2. **Cross-Role Collaboration**: Agents can delegate to each other
3. **Performance Optimization**: Cache common role responses
4. **Custom Role Builder**: UI for creating new roles
5. **Analytics Dashboard**: Track role effectiveness

## References

- Claude Code Subagents Documentation
- LLM Rules: `llm_rules/ROLE_*.md`
- HEA Architecture: `llm_rules/HIERARCHICALLY_ENCAPSULATED_ARCHITECTURE.md`
- Chat Space Theme: `layer/themes/llm-agent_chat-space/`