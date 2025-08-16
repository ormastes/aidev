# Subagent Format Specification

## Overview

This document defines the standard format for creating AI subagents compatible with both Claude Code native subagents and Ollama role-based instantiation.

## File Format

Each subagent is defined in a Markdown file with YAML frontmatter:

```markdown
---
name: agent-name           # Required: lowercase with hyphens
description: When to use    # Required: trigger description
tools: Tool1, Tool2        # Optional: specific tools (inherits all if omitted)
model: model-name          # Optional: preferred model for Ollama
temperature: 0.7           # Optional: temperature setting
max_tokens: 2048          # Optional: max token limit
---

# System Prompt Content

Define the agent's role, expertise, and behavior here.
Include specific instructions and best practices.
```

## Required Fields

### name
- **Type**: string
- **Format**: lowercase letters and hyphens only
- **Example**: `requirement-analyst`, `code-reviewer`

### description
- **Type**: string
- **Purpose**: Natural language description of when to invoke
- **Keywords**: Include "proactively", "must be used" for automatic invocation

## Optional Fields

### tools
- **Type**: comma-separated string
- **Default**: Inherits all available tools
- **Example**: `Read, Write, Edit, Bash`

### model
- **Type**: string
- **Purpose**: Preferred model for Ollama provider
- **Example**: `deepseek-r1:latest`, `codellama:latest`

### temperature
- **Type**: float (0.0 - 1.0)
- **Default**: 0.7
- **Purpose**: Control response creativity

### max_tokens
- **Type**: integer
- **Default**: 2048
- **Purpose**: Maximum response length

## System Prompt Guidelines

### Structure

1. **Role Statement**: Clear definition of the agent's expertise
2. **Responsibilities**: List of primary duties
3. **Approach**: Step-by-step methodology
4. **Best Practices**: Specific guidelines and constraints
5. **Output Format**: Expected deliverable formats

### Example Template

```markdown
You are a [ROLE] specializing in [DOMAIN].

Your responsibilities:
- [Responsibility 1]
- [Responsibility 2]
- [Responsibility 3]

When invoked:
1. [Step 1]
2. [Step 2]
3. [Step 3]

Best practices:
- [Practice 1]
- [Practice 2]
- [Practice 3]

Always ensure:
- [Constraint 1]
- [Constraint 2]
- [Constraint 3]
```

## Tool Permission Matrix

| Role | Recommended Tools |
|------|------------------|
| requirement-analyst | Read, Write, TodoWrite, WebSearch |
| auth-manager | Read, Edit, Bash, WebSearch, Write |
| api-checker | Read, Grep, WebFetch, Bash |
| agent-scheduler | Task, TodoWrite, Read, Write |
| context-manager | Read, Write, TodoWrite |
| tester | Read, Edit, Bash, Grep, Glob |
| gui-coordinator | Read, Write, Edit, WebSearch |
| feature-manager | Read, Write, TodoWrite, Task |

## Conversion from Role Rules

To convert existing `ROLE_*.md` files to subagent format:

1. Extract role name from filename
2. Create description from responsibilities
3. Map tasks to tool requirements
4. Convert content to system prompt
5. Add configuration metadata

## File Locations

### Project-Level Subagents
```
.claude/agents/[agent-name].md
```
- Highest priority
- Project-specific customizations
- Version controlled

### User-Level Subagents
```
~/.claude/agents/[agent-name].md
```
- Available across projects
- Personal preferences
- Shared configurations

## Invocation Patterns

### Automatic Delegation
Triggered by keywords in description:
- "use proactively"
- "must be used"
- "immediately after"

### Explicit Invocation
User requests specific agent:
```
> Use the tester subagent to verify my changes
> Have the requirement-analyst review this feature
```

### Chained Invocation
Multiple agents in sequence:
```
> First use requirement-analyst to define specs, then feature-manager to plan implementation
```

## Provider-Specific Behavior

### Claude Native
- Uses Task tool for delegation
- Maintains isolated context
- Supports all Claude Code tools
- Automatic tool inheritance

### Ollama Instantiation
- Creates new conversation with role
- Injects system prompt
- Configures model parameters
- Maintains role-specific history

## Validation Rules

1. **Name Validation**: Must match `^[a-z][a-z-]*[a-z]$`
2. **Description Length**: Minimum 20 characters
3. **Tool Validation**: Must be valid tool names
4. **Prompt Length**: Minimum 100 characters
5. **YAML Syntax**: Must be valid YAML frontmatter

## Best Practices

1. **Single Responsibility**: Each agent should have one clear purpose
2. **Clear Triggers**: Description should clearly indicate when to use
3. **Specific Instructions**: System prompt should be detailed and actionable
4. **Tool Minimization**: Only request necessary tools
5. **Version Control**: Check into repository for team sharing

## Migration Guide

### From Role Rules to Subagents

1. **Identify Role Files**
```bash
ls llm_rules/ROLE_*.md
```

2. **Generate Subagent**
```bash
./scripts/convert-role-to-subagent.sh ROLE_NAME
```

3. **Deploy to Project**
```bash
./scripts/deploy-subagents.sh --project
```

4. **Validate Format**
```bash
./scripts/validate-subagent.sh .claude/agents/*.md
```

## Testing Subagents

### Unit Testing
```typescript
describe('Subagent', () => {
  it('should have valid format', () => {
    const agent = loadSubagent('requirement-analyst');
    expect(agent.name).toMatch(/^[a-z-]+$/);
    expect(agent.description).toHaveLength(20);
  });
});
```

### Integration Testing
```typescript
it('should delegate to correct agent', async () => {
  const response = await chat('Analyze requirements for login feature');
  expect(response.agent).toBe('requirement-analyst');
});
```

## Monitoring and Analytics

Track subagent performance:
- Invocation frequency
- Success rate
- Average response time
- User satisfaction
- Error patterns

## Future Extensions

1. **Dynamic Loading**: Hot-reload subagents without restart
2. **Composition**: Combine multiple roles into super-agents
3. **Learning**: Agents improve from feedback
4. **Sharing**: Community subagent marketplace
5. **Metrics**: Performance dashboards