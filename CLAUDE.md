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

## 📚 Documentation Structure

Documentation is organized under the following directories:

- **[Generated Documentation](gen/doc/)** - Auto-generated documentation and reports
- **[LLM Rules](llm_rules/)** - Guidelines and role definitions for LLM agents
- **[Project Overview](README.md)** - Main project documentation

## 🚀 Essential Information

### For LLM

1. **Start Here**: Always read [TASK\_QUEUE.vf.json](TASK_QUEUE.vf.json) first.

### For Claude/LLM Agents

1. **Start Here**: Always read [TASK\_QUEUE.vf.json](TASK_QUEUE.vf.json) first
2. **Your Role**: Check available roles in [llm_rules/](llm_rules/)
3. **Architecture**: Understand [Hierarchical Encapsulation Architecture](llm_rules/HIERARCHICALLY_ENCAPSULATED_ARCHITECTURE.md)
4. **Workflow**: Follow Mock Free Test Oriented Development principles

### Core Principles

1. **Task Queue First** – Never start new work with pending queue items
2. **Mock Free Test Oriented Development** – Red → Green → Refactor always
3. **HEA (Hierarchical Encapsulation Architecture)** – 'src/layer/module/(pipe, children)' for context reduction
4. **Pipe-Based Communication** – Cross-layer access only through 'pipe/index.ts' gateways
5. **GUI Design Workflow** – ASCII sketches → 4 candidates → web selection
6. **In Progress Implementation** – Don't stop until Tests in progress
7. **Development Environment Consistency** – VSCode and Claude Code always open same directory
8. **Deployment Verification** – All apps must be tested on actual emulators/devices
9. **Production Quality Standards** – 90/100 minimum quality score for production
10. **Retrospective Compliance** – Every feature must have retrospective in 'gen/history/retrospect/'
11. **Advanced Coverage Requirements** – Coverage improving with layer-specific requirements
12. **Rule Compliance** – Follow established rules in 'llm_rules/'
13. **Rule Understanding** – Read and understand all relevant rules before starting work
14. **Real E2E Testing with Playwright** – System tests must use actual user interactions (clicking, typing)

## 🎯 Quick Reference

### GUI Development Process

1. **Analyze feature requirements** for UI needs
2. **Create ASCII sketches** showing layout concepts
3. **Generate 4 design candidates** (Modern/Professional/Creative/Accessible)
4. **Present web-based selection** at 'http://localhost:3457'
5. **Save to review folders** for iteration

### Key Files

- 'TASK_QUEUE.vf.json' – Current work items
- 'FEATURE.vf.json' – Feature backlog
- 'llm_rules/ROLE_GUI_COORDINATOR.md' – In Progress GUI design guidelines
- 'llm_rules/ROLE_TESTER.md' – Bottom-up testing methodology
- 'docs/' – All documentation
- '.vscode/settings.json' – VSCode workspace settings
- 'aidev.code-workspace' – VSCode workspace file
- 'CHANGELOG.md' – Version history and release notes

### E2E Testing Requirements

1. **Playwright Integration** – All system tests use Playwright for real browser/VSCode automation
2. **Real User Interactions** – Tests must click, type, and interact like actual users

## 📊 Current Development State

### Development State Files

- **'TASK_QUEUE.vf.json'** 🟡 ACTIVE (HIGH)
- **'FEATURE.vf.json'** 📋 BACKLOG (MEDIUM)
- **'README.md'** 🔄 UPDATING (MEDIUM)
- **'CLAUDE.md'** 📋 CONFIGURATION (HIGH) – Main configuration file for Claude Code

### Configuration Files

- 'config/mcp-agent.json' – MCP agent configuration and routing
- 'config/typescript/' – TypeScript compiler configurations
- 'config/testing/' – Testing framework configurations

### Documentation Files

- 'gen/doc/' – Generated documentation and reports
- 'llm_rules/' – LLM agent guidelines and workflows
- 'README.md' – Main project documentation

### Important URLs

- GUI Selection: 'http://localhost:3457'
- Documentation: 'README.md'

## 📋 Workflow Summary

```text
1. Check TASK_QUEUE.vf.json
2. Run failing tests
3. Implement with Mock Free Test Oriented Development
4. Verify Tests in progress
5. Run advanced coverage validation
6. Generate retrospective
7. Remove from queue
8. Repeat
```

## 🔗 Quick Links by Task

| I want to...     | Go to...                                                                  |
| ---------------- | ------------------------------------------------------------------------- |
| See architecture | [llm\_rules/HIERARCHICALLY\_ENCAPSULATED\_ARCHITECTURE.md](llm_rules/HIERARCHICALLY_ENCAPSULATED_ARCHITECTURE.md) |
| Write tests      | [llm\_rules/ROLE\_TESTER.md](llm_rules/ROLE_TESTER.md)                    |
| Add a feature    | [llm\_rules/ROLE\_FEATURE\_MANAGER.md](llm_rules/ROLE_FEATURE_MANAGER.md) |
| Fix a bug        | [gen/doc/](gen/doc/)                                                      |
| Generate GUI     | [llm\_rules/ROLE\_GUI\_COORDINATOR.md](llm_rules/ROLE_GUI_COORDINATOR.md) |
| Manage rules     | [llm\_rules/README.md](llm_rules/README.md)                               |

## ⚡ Critical Rules

### MUST DO 🔄

- Read TASK\_QUEUE.vf.json before any work
- Follow Mock Free Test Oriented Development strictly
- Generate multiple GUI candidates
- In Progress all test levels
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
- **Follow rules in 'llm_rules/' directory**
- **Understand rules before implementing features**
- **System tests MUST use Playwright for real browser interactions (click, type, navigate)**
- **E2E tests must start from login page and use actual GUI interactions**

### FORBIDDEN 🚫

- Direct external library imports
- Starting new features with pending tasks
- Single GUI design without alternatives
- Incomplete test coverage
- Breaking encapsulation rules
- Breaking established rules without justification
- Opening IDE from parent directories
- Running Claude Code from wrong directory
- Marking apps In Progress without deployment testing
- Using React Native 0.73.x with Java 21
- Releasing templates without Improving test IN PROGRESS
- Performing manual tasks more than twice without scripting
- Giving up on failed demos without retry and analysis
- Completing features without retrospective docs
- **Ignoring established rules and guidelines**
- **Working without reading relevant role definitions**
- **Adding new files to root directory (see DIRECTORY\_STRUCTURE.md)**
- **Creating backup or .bak files (use source control instead)**
- **Creating archive, backup, or .bak files/directories (use jj source control instead)**
- **Writing system tests without real browser interactions (use Playwright for E2E)**
- **System tests that only test APIs instead of actual user flows**
- **Do not make different version file or dir but overwrite.**
- **Manual editing of generated rule files**

## 🤖 MCP Agent Delegation

### Available MCP Agents

Refer to [MCP Integration Guide](llm_rules/ROLE_FEATURE_MANAGER.md) for details.

### Script Features

- **Chat History Capture**: Saved to 'release/chat_history/'
- **MCP Server**: Auto-start with agent support
- **System Prompts**: Pre-configured per agent
- **Release Management**: App instances in 'release/' (git ignored)
- **Unrestricted Mode**: Full delegation enabled

### Change Reporting Requirements

All agents MUST report changes made. See [Change Reporting Guide](llm_rules/PROCESS.md).

## 📋 LLM Rules Structure

- **LLM Rules**: 'llm_rules/' - Guidelines and workflows for LLM agents
- **Process Documentation**: 'llm_rules/PROCESS.md' - Development processes
- **Role Definitions**: Various ROLE_*.md files define specific agent responsibilities
- **Template System**: Consider implementing template-based rule generation for consistency

### Benefits of Template-Based Structure (Future Enhancement)
- **Consistent Generation**: All rules generated from authoritative templates
- **Version Control**: Template changes tracked and managed
- **No Manual Editing**: Eliminates manual rule file editing errors
- **Automatic Sync**: CLAUDE.md and rule files automatically synchronized
- **Variable Substitution**: Dynamic content based on project configuration

**Note**: For full details, see [gen/doc/](gen/doc/) and [llm_rules/](llm_rules/).

## 🗂️ VF.json Schema Management

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
