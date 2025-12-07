# Claude Code Configuration

This is the main configuration file for Claude Code working on the AI Development Platform.

## Primary rules

1. **Always use TASK_QUEUE.vf.json over TODO**
2. **Do not create files on root.**

   * Reports go under 'gen/doc/'
   * No permanent files in 'temp/'

## Primary files

- 'CLAUDE.md' (main config)
- 'README.md' (project overview)
- 'FEATURE.vf.json' (feature backlog - filesystem-mcp format)
- 'TASK_QUEUE.vf.json' (current tasks - filesystem-mcp format)
- 'FILE_STRUCTURE.vf.json' (file structure definitions)
- 'NAME_ID.vf.json' (name-based entity storage)
- 'gen/doc/' (generated documentation and reports)
- 'layer/themes/infra_filesystem-mcp/' (filesystem-mcp theme)
- 'layer/themes/infra_filesystem-mcp/schemas/' (vf.json schema templates)
- 'doc/REQUIREMENT.md' (user requirement)
- 'gui/GUI_REQUIREMENT.md' (additional user requirement)

## Documentation Structure

Documentation is organized under the following directories:

- **[Generated Documentation](gen/doc/)** - Auto-generated documentation and reports
- **[LLM Rules](llm_rules/)** - Guidelines and architecture for LLM agents
- **[Subagents](.claude/agents/)** - Claude Code subagent definitions
- **[Project Overview](README.md)** - Main project documentation

## Claude Code Subagents

Subagents are defined in `.claude/agents/` and automatically invoked based on task matching.

### Available Subagents

| Agent | Auto-Invoke Trigger | Tools |
|-------|---------------------|-------|
| `test-runner` | Testing, coverage, TDD | Read, Grep, Glob, Bash, Edit |
| `code-reviewer` | After code changes | Read, Grep, Glob |
| `feature-manager` | Feature implementation | Full toolset |
| `explorer` | QA, bug discovery | Read, Grep, Glob, Bash, WebFetch |
| `gui-coordinator` | UI/UX design | Read, Write, Edit, Grep, Glob, Bash |
| `api-checker` | API validation | Read, Grep, Glob, Bash, WebFetch |
| `auth-manager` | Security, auth | Full toolset |
| `agent-scheduler` | Multi-agent coordination | Full toolset |
| `context-manager` | Context optimization | Read, Write, Edit, Grep, Glob |
| `requirement-analyst` | Requirements, user stories | Read, Write, Edit, Grep, Glob |
| `ollama-tester` | Local LLM testing | Full toolset |

### Automatic Invocation

Subagents are **automatically invoked** based on task description matching:

```
User: "Run the tests and fix failures"
→ Matches test-runner description → Auto-invokes test-runner

User: "Add user authentication with JWT"
→ Matches auth-manager description → Auto-invokes auth-manager

User: "Design a new dashboard UI"
→ Matches gui-coordinator description → Auto-invokes gui-coordinator
```

### Explicit Invocation

Request specific subagents:
```
"Use the code-reviewer agent to check my changes"
"Have the api-checker validate the endpoints"
```

### Subagent Behavior

- **Stateless**: Each invocation is independent
- **Single report**: Returns one final report to main session
- **Tool-restricted**: Each agent has specific tools available
- **Auto-matched**: Claude Code matches tasks to agent descriptions

## Essential Information

### For Claude/LLM Agents

1. **Start Here**: Always read [TASK\_QUEUE.vf.json](TASK_QUEUE.vf.json) first
2. **Subagents**: Check `.claude/agents/` for specialized agents
3. **Architecture**: Understand [Hierarchical Encapsulation Architecture](llm_rules/HIERARCHICALLY_ENCAPSULATED_ARCHITECTURE.md)
4. **Workflow**: Follow Mock Free Test Oriented Development principles

### Core Principles

1. **Task Queue First** – Never start new work with pending queue items
2. **Mock Free Test Oriented Development** – Red → Green → Refactor always
3. **HEA (Hierarchical Encapsulation Architecture)** – 'src/layer/module/(pipe, children)' for context reduction
4. **Pipe-Based Communication** – Cross-layer access only through 'pipe/index.ts' gateways
5. **GUI Design Workflow** – ASCII sketches → 4 candidates → web selection
6. **Automatic Subagent Delegation** – Let Claude Code match tasks to subagents
7. **Development Environment Consistency** – VSCode and Claude Code always open same directory
8. **Deployment Verification** – All apps must be tested on actual emulators/devices
9. **Production Quality Standards** – 90/100 minimum quality score for production
10. **Retrospective Compliance** – Every feature must have retrospective in 'gen/history/retrospect/'
11. **Advanced Coverage Requirements** – Coverage improving with layer-specific requirements
12. **Real E2E Testing with Playwright** – System tests must use actual user interactions (clicking, typing)

## Quick Reference

### GUI Development Process

1. **Analyze feature requirements** for UI needs
2. **Create ASCII sketches** showing layout concepts
3. **Generate 4 design candidates** (Modern/Professional/Creative/Accessible)
4. **Present web-based selection** at 'http://localhost:3457'
5. **Save to review folders** for iteration

### Key Files

- 'TASK_QUEUE.vf.json' – Current work items
- 'FEATURE.vf.json' – Feature backlog
- '.claude/agents/' – Subagent definitions
- 'llm_rules/' – Architecture and process docs
- '.vscode/settings.json' – VSCode workspace settings
- 'aidev.code-workspace' – VSCode workspace file
- 'CHANGELOG.md' – Version history and release notes

### E2E Testing Requirements

1. **Playwright Integration** – All system tests use Playwright for real browser/VSCode automation
2. **Real User Interactions** – Tests must click, type, and interact like actual users

## Current Development State

### Development State Files

- **'TASK_QUEUE.vf.json'** ACTIVE (HIGH)
- **'FEATURE.vf.json'** BACKLOG (MEDIUM)
- **'README.md'** UPDATING (MEDIUM)
- **'CLAUDE.md'** CONFIGURATION (HIGH) – Main configuration file for Claude Code

### Configuration Files

- 'config/mcp-agent.json' – MCP agent configuration and routing
- 'config/typescript/' – TypeScript compiler configurations
- 'config/testing/' – Testing framework configurations

### Documentation Files

- 'gen/doc/' – Generated documentation and reports
- 'llm_rules/' – LLM agent guidelines and workflows
- '.claude/agents/' – Subagent definitions
- 'README.md' – Main project documentation

### Important URLs

- GUI Selection: 'http://localhost:3457'
- Documentation: 'README.md'

## Workflow Summary

```text
1. Check TASK_QUEUE.vf.json
2. Claude auto-invokes appropriate subagent
3. Run failing tests (test-runner)
4. Implement with Mock Free Test Oriented Development
5. Review code (code-reviewer)
6. Run advanced coverage validation
7. Generate retrospective
8. Remove from queue
9. Repeat
```

## Quick Links by Task

| I want to...     | Go to...                                                                  |
| ---------------- | ------------------------------------------------------------------------- |
| See architecture | [llm\_rules/HIERARCHICALLY\_ENCAPSULATED\_ARCHITECTURE.md](llm_rules/HIERARCHICALLY_ENCAPSULATED_ARCHITECTURE.md) |
| Write tests      | [.claude/agents/test-runner.md](.claude/agents/test-runner.md)            |
| Add a feature    | [.claude/agents/feature-manager.md](.claude/agents/feature-manager.md)    |
| Fix a bug        | [gen/doc/](gen/doc/)                                                      |
| Generate GUI     | [.claude/agents/gui-coordinator.md](.claude/agents/gui-coordinator.md)    |
| Manage rules     | [llm\_rules/README.md](llm_rules/README.md)                               |
| Review code      | [.claude/agents/code-reviewer.md](.claude/agents/code-reviewer.md)        |
| Validate APIs    | [.claude/agents/api-checker.md](.claude/agents/api-checker.md)            |

## Critical Rules

### MUST DO

- Read TASK\_QUEUE.vf.json before any work
- Follow Mock Free Test Oriented Development strictly
- Let Claude Code auto-invoke subagents based on task
- Generate multiple GUI candidates
- Complete all test levels
- Generate retrospective document
- Update documentation
- Open IDE from project root
- Verify CLAUDE.md accessible
- Test on actual emulators/devices
- Working on 90/100 quality score
- Meet Coverage improving requirements
- Test templates with ≥5 iterations
- Create scripts for routine tasks
- Retry failed demos with analysis
- **System tests MUST use Playwright for real browser interactions (click, type, navigate)**
- **E2E tests must start from login page and use actual GUI interactions**

### FORBIDDEN

- Direct external library imports
- Starting new features with pending tasks
- Single GUI design without alternatives
- Incomplete test coverage
- Breaking encapsulation rules
- Breaking established rules without justification
- Opening IDE from parent directories
- Running Claude Code from wrong directory
- Marking apps complete without deployment testing
- Using React Native 0.73.x with Java 21
- Releasing templates without testing
- Performing manual tasks more than twice without scripting
- Giving up on failed demos without retry and analysis
- Completing features without retrospective docs
- **Adding new files to root directory (see DIRECTORY\_STRUCTURE.md)**
- **Creating backup or .bak files (use source control instead)**
- **Creating archive, backup, or .bak files/directories (use jj source control instead)**
- **Writing system tests without real browser interactions (use Playwright for E2E)**
- **System tests that only test APIs instead of actual user flows**
- **Do not make different version file or dir but overwrite.**

## Subagent Delegation

### How It Works

1. User requests a task
2. Claude Code matches task to subagent descriptions
3. Matching subagent is automatically invoked
4. Subagent executes with restricted tools
5. Subagent returns single final report
6. Main session continues with results

### Invocation Examples

```
# Automatic (recommended)
User: "Run tests and fix failures"
→ test-runner auto-invoked

# Explicit
User: "Use code-reviewer to check changes"
→ code-reviewer explicitly invoked

# Chained
requirement-analyst → feature-manager → test-runner → code-reviewer
```

### Change Reporting Requirements

All agents MUST report changes made. See [Change Reporting Guide](llm_rules/PROCESS.md).

## LLM Rules Structure

- **LLM Rules**: 'llm_rules/' - Architecture, process, and methodology
- **Subagents**: '.claude/agents/' - Agent definitions with full instructions
- **Process Documentation**: 'llm_rules/PROCESS.md' - Development processes

**Note**: For full details, see [gen/doc/](gen/doc/) and [llm_rules/](llm_rules/).

## VF.json Schema Management

The filesystem-mcp theme manages all vf.json schema files centrally:

- **Schema Templates**: `layer/themes/infra_filesystem-mcp/schemas/`
- **Deployment Script**: `layer/themes/infra_filesystem-mcp/scripts/deploy-vf-schemas.sh`
- **Setup Script**: `layer/themes/infra_filesystem-mcp/setup-filesystem-mcp.sh`

### Schema Deployment Commands

```bash
# Initialize environment with all schema files
./layer/themes/infra_filesystem-mcp/scripts/deploy-vf-schemas.sh init

# Update existing schemas
./layer/themes/infra_filesystem-mcp/scripts/deploy-vf-schemas.sh update

# List available schemas
./layer/themes/infra_filesystem-mcp/scripts/deploy-vf-schemas.sh list

# Validate deployed schemas
./layer/themes/infra_filesystem-mcp/scripts/deploy-vf-schemas.sh validate
```

When setting up a new environment, vf.json files are deployed from the schema folder to ensure consistency across all project instances.
