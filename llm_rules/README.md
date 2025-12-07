# LLM Rules

## Overview

This directory contains guidelines, architecture documentation, and process definitions for LLM agents working on the AI Development Platform.

## Claude Code Subagents

Agent definitions are maintained in `llm_rules/agents/` and deployed to `.claude/agents/` for Claude Code integration.

### Source and Deployment

- **Source (edit here)**: `llm_rules/agents/*.md`
- **Deployment target**: `.claude/agents/*.md`
- **Deploy command**: `cp llm_rules/agents/*.md .claude/agents/`

### Available Subagents

| Agent | Auto-Invoke Trigger | Source |
|-------|---------------------|--------|
| `test-runner` | Testing tasks | [agents/test-runner.md](agents/test-runner.md) |
| `code-reviewer` | After code changes | [agents/code-reviewer.md](agents/code-reviewer.md) |
| `feature-manager` | Feature implementation | [agents/feature-manager.md](agents/feature-manager.md) |
| `explorer` | QA exploration | [agents/explorer.md](agents/explorer.md) |
| `gui-coordinator` | UI/UX work | [agents/gui-coordinator.md](agents/gui-coordinator.md) |
| `api-checker` | API validation | [agents/api-checker.md](agents/api-checker.md) |
| `auth-manager` | Security/Auth | [agents/auth-manager.md](agents/auth-manager.md) |
| `agent-scheduler` | Multi-agent coordination | [agents/agent-scheduler.md](agents/agent-scheduler.md) |
| `context-manager` | Context optimization | [agents/context-manager.md](agents/context-manager.md) |
| `requirement-analyst` | Requirements work | [agents/requirement-analyst.md](agents/requirement-analyst.md) |
| `ollama-tester` | Local LLM testing | [agents/ollama-tester.md](agents/ollama-tester.md) |

## Core Documents

### Architecture

- [HIERARCHICALLY_ENCAPSULATED_ARCHITECTURE.md](./HIERARCHICALLY_ENCAPSULATED_ARCHITECTURE.md) - Core architecture principles (HEA)
- [MOCK_FREE_TEST_ORIENTED_DEVELOPMENT.md](./MOCK_FREE_TEST_ORIENTED_DEVELOPMENT.md) - Testing methodology

### Process

- [PROCESS.md](./PROCESS.md) - Development processes and workflows
- [SUBAGENT_FORMAT.md](./SUBAGENT_FORMAT.md) - Subagent definition format

### Development Steps

- [STEP_0_DOMAIN_RESEARCH.md](./STEP_0_DOMAIN_RESEARCH.md) - Domain research phase
- [STEP_1_SETUP.md](./STEP_1_SETUP.md) - Project setup
- [STEP_2_PROTOTYPE.md](./STEP_2_PROTOTYPE.md) - Prototyping
- [STEP_3_IMPL_USER_STORY.md](./STEP_3_IMPL_USER_STORY.md) - User story implementation
- [STEP_4_IMPL_UNIT.md](./STEP_4_IMPL_UNIT.md) - Unit implementation
- [STEP_5_END_STORY.md](./STEP_5_END_STORY.md) - Story completion

## Subagent Invocation

### Automatic Invocation

Claude Code automatically invokes subagents based on description matching:

```
User: "Run the tests and fix any failures"
→ Claude matches "testing" → Invokes test-runner agent

User: "Add user authentication"
→ Claude matches "authentication" → Invokes auth-manager agent
```

### Explicit Invocation

Request specific agents directly:

```
"Use the code-reviewer agent to check my changes"
"Have the api-checker validate the endpoints"
```

### Programmatic Invocation

Via Task tool:

```
Task(subagent_type="test-runner", prompt="Run all unit tests")
```

## Rule Compliance

All LLM agents must:

1. Follow subagent definitions in `.claude/agents/`
2. Respect the Hierarchical Encapsulation Architecture (HEA)
3. Follow Mock Free Test Oriented Development
4. Maintain 90% test coverage minimum
5. Check TASK_QUEUE.vf.json before starting work
