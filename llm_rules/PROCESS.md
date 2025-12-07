# Development Process

## Workflow Overview

### 1. Task Management

- Check TASK_QUEUE.vf.json before starting work
- Update task status as work progresses
- Complete all tests before marking done

### 2. Feature Development

#### Planning

1. Read feature requirements in FEATURE.vf.json
2. Review relevant subagent definitions in `.claude/agents/`
3. Plan implementation approach

#### Implementation

1. Follow Mock Free Test Oriented Development
2. Write tests first (Red phase)
3. Implement functionality (Green phase)
4. Refactor and optimize (Refactor phase)

#### Validation

1. Run all test suites
2. Verify coverage requirements
3. Update documentation

### 3. Change Reporting

All changes must be reported with:

- What was changed
- Why it was changed
- Impact on other components
- Test coverage status

### 4. Documentation

#### Required Documentation

- API documentation for public interfaces
- Test documentation for complex scenarios
- Architecture decisions for significant changes

#### Format Standards

- Use consistent markdown formatting
- Include code examples
- Provide clear explanations

### 5. Quality Gates

Before marking task complete:

- [ ] All tests passing
- [ ] Coverage requirements met (90% minimum)
- [ ] Documentation updated
- [ ] Code reviewed (via code-reviewer agent)
- [ ] No broken dependencies

## Subagent Delegation

### Automatic Invocation

Claude Code automatically delegates to subagents based on task description matching:

| Task Type | Subagent | Trigger Keywords |
|-----------|----------|------------------|
| Testing | `test-runner` | test, coverage, TDD, failing |
| Code Review | `code-reviewer` | review, quality, after changes |
| Features | `feature-manager` | feature, implement, add |
| QA | `explorer` | explore, QA, bug discovery |
| UI/UX | `gui-coordinator` | UI, GUI, design, interface |
| APIs | `api-checker` | API, contract, endpoint |
| Security | `auth-manager` | auth, security, permission |
| Orchestration | `agent-scheduler` | coordinate, parallel, multiple agents |
| Context | `context-manager` | context, memory, state |
| Requirements | `requirement-analyst` | requirement, user story, criteria |

### Invocation Patterns

#### 1. Automatic (Recommended)

Claude Code matches task to subagent description and invokes automatically:

```
User: "Add user authentication with JWT"
→ Claude sees "authentication" in auth-manager description
→ Automatically invokes auth-manager subagent
```

#### 2. Explicit Request

User requests specific subagent:

```
"Use the api-checker to validate the new endpoints"
"Have the code-reviewer check my changes"
```

#### 3. Chained Invocation

Sequential subagent execution:

```
1. requirement-analyst → Define requirements
2. feature-manager → Plan implementation
3. test-runner → Write tests
4. code-reviewer → Review code
```

#### 4. Parallel Invocation

Independent subagents run concurrently:

```
Task(subagent_type="test-runner", prompt="Run unit tests")
Task(subagent_type="api-checker", prompt="Validate API contracts")
```

### Subagent Communication

- Subagents are **stateless** - each invocation is independent
- Subagents return a **single final report** to the main session
- No back-and-forth communication during execution
- Results must be self-contained and actionable

## Communication

### Reporting Format

```
## Change Report

**Component:** [theme/module name]
**Type:** [feature/bugfix/refactor]
**Status:** [completed/in-progress]
**Subagent:** [subagent used, if any]

### Changes Made

- [List of specific changes]

### Tests

- [Test coverage percentage]
- [New tests added]

### Documentation

- [Documentation updates]

### Subagent Results

- [Summary of subagent findings/actions]
```

## Subagent Best Practices

1. **Trust automatic invocation** - Let Claude Code match tasks to agents
2. **Use descriptive prompts** - Include relevant keywords for matching
3. **Review subagent output** - Verify results before proceeding
4. **Chain when needed** - Use multiple subagents for complex tasks
5. **Parallelize independent work** - Run unrelated tasks concurrently

## Subagent Definitions

All subagent definitions are in `.claude/agents/`:

```
.claude/agents/
├── test-runner.md
├── code-reviewer.md
├── feature-manager.md
├── explorer.md
├── gui-coordinator.md
├── api-checker.md
├── auth-manager.md
├── agent-scheduler.md
├── context-manager.md
├── requirement-analyst.md
└── ollama-tester.md
```

See [SUBAGENT_FORMAT.md](./SUBAGENT_FORMAT.md) for format specification.
