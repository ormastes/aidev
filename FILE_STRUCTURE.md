# File Structure

This document describes the hierarchical file structure of the AI Development Platform, based on FILE_STRUCTURE.vf.json.

## Root Directory Structure

```
/
├── CLAUDE.md                 # Claude Code configuration and rules
├── README.md                 # Project conventions, CI, import rules
├── FILE_STRUCTURE.vf.json   # Distributed file structure definition
├── FILE_STRUCTURE.md         # This file - project structure documentation
├── FEATURE.vf.json          # Root level features with aggregated view
├── FEATURE.md               # Feature backlog and overview (generated from vf.json)
├── TASK_QUEUE.vf.json       # Virtual filesystem task queue with priority support
├── TASK_QUEUE.md            # Development task queue (copied to story directories)
├── NAME_ID.vf.json          # Name-based entity storage system
│
├── config/                   # Configuration files for the project
│   ├── environments.json     # Environment configurations
│   ├── mcp-agent.json       # MCP agent configuration
│   ├── claude_config.json   # Claude-specific configuration
│   ├── jest/                # Jest test configuration
│   ├── python/              # Python configuration (uv.toml)
│   └── typescript/          # TypeScript configurations
│
├── doc/                     # Documentation root
│   ├── manual/              # User manuals and guides
│   └── research/            # Research documents and explorations
│       ├── domain/          # Domain research and analysis
│       ├── explorer/        # Exploration tools and findings
│       └── *.md            # Research documents
│
├── gen/                     # Code generation outputs
│   ├── doc/                 # Generated documentation
│   │   ├── reports/         # Analysis and compliance reports
│   │   ├── features/        # Feature documentation
│   │   └── *.md            # Generated docs
│   ├── release/             # Release artifacts and deployments
│   ├── logs/                # Generated logs
│   ├── test-output/         # Test execution outputs
│   └── test-results/        # Test result artifacts
│
├── common/                  # Root-level shared utilities, types, UI components
│   ├── xlib/                # External library wrappers (xlib_fs, xlib_http, etc.)
│   ├── utils/               # Shared utility functions
│   ├── templates/           # Template files for code generation
│   │   └── llm_rules/       # LLM rule templates
│   ├── tests/               # Shared test fixtures and helpers
│   │   └── fixtures/        # Test fixtures
│   └── tests-system/        # System-wide test suites
│       └── system/          # System test implementations
│
├── layer/                   # Contains themes and epics for feature organization
│   ├── themes/              # Feature themes
│   │   └── [theme-name]/    # Individual theme (e.g., infra_fraud-checker)
│   │       ├── FEATURE.vf.json
│   │       ├── TASK_QUEUE.vf.json
│   │       ├── NAME_ID.vf.json
│   │       ├── pipe/        # Theme-level cross-layer communication
│   │       │   └── index.ts
│   │       ├── children/    # Theme-level implementation files
│   │       ├── common/      # Theme-wide shared utilities
│   │       ├── research/    # Domain and external library research
│   │       ├── resources/   # Static resources for this theme
│   │       └── user-stories/ # User story implementations
│   │           └── [NNN-story-name]/
│   └── epics/               # Big-theme orchestration
│       └── [epic-name]/     # Individual epic
│           ├── README.md
│           ├── FEATURE.vf.json
│           ├── common/      # Code shared across themes
│           └── orchestrator/ # Stitches theme orchestrators together
│
├── llm_rules/               # Generated LLM rule definitions (frozen - edit templates)
│   ├── HIERARCHICALLY_ENCAPSULATED_ARCHITECTURE.md
│   ├── MOCK_FREE_TEST_ORIENTED_DEVELOPMENT.md
│   ├── PROCESS.md
│   ├── ROLE_*.md           # Role definitions
│   ├── STEP_*.md           # Process step definitions
│   └── additional/         # Additional know-how documents
│
├── scripts/                 # Automation scripts
│   ├── core/               # Core automation scripts
│   ├── setup/              # Setup and initialization scripts
│   └── ollama/             # Ollama management scripts
│
├── temp/                   # Temporary files
├── demo/                   # Demo and example projects
├── coverage/               # Test coverage reports
├── dist/                   # Build output directory
└── node_modules/           # Node.js dependencies (git-ignored)
```

## Theme Structure Template

Each theme under `layer/themes/` follows this structure:

```
[theme-name]/
├── FEATURE.vf.json         # Epic level features with aggregated view
├── FEATURE.md              # Overview of this theme
├── TASK_QUEUE.vf.json      # Virtual filesystem task queue for theme
├── NAME_ID.vf.json         # Name-based entity storage for theme
├── package.json            # Node.js package configuration
├── tsconfig.json           # TypeScript configuration
├── pipe/                   # Theme-level cross-layer communication gateway
│   └── index.ts           # Gateway for cross-layer imports at theme level
├── children/               # Theme-level implementation files
├── common/                 # Theme-wide shared utilities
│   └── README.md
├── research/               # Domain and external library research
│   ├── domain/            # Domain research and analysis
│   └── external/          # External library research
├── resources/              # Static resources for this theme
│   └── README.md
├── templates/              # Folder templates for this theme
├── llm_rules/              # Generated LLM rule definitions for this theme
├── gen/                    # Code generation outputs for this theme
├── demo/                   # Demo artifacts for this theme
├── release/                # Release artifacts for this theme
├── xlib/                   # External library wrappers for this theme
└── user-stories/           # Container for all user stories in this theme
    └── [NNN-story-name]/   # Individual user story (e.g., 001-login)
```

## User Story Structure

Each user story under `user-stories/` follows this structure:

```
[NNN-story-name]/
├── README.md               # Story overview and implementation details
├── FEATURE.vf.json        # User story level features
├── TASK_QUEUE.md          # Development task queue
├── TASK_QUEUE.vf.json     # Virtual filesystem task queue
├── NAME_ID.vf.json        # Name-based entity storage for user story
├── docs/                  # Story documentation
│   ├── story.md          # Story details with Theme, Story ID, and Epic headers
│   └── diagrams/         # Mermaid-based diagrams
│       ├── mermaid_sequence.mmd
│       └── mermaid_system_sequence.mmd
├── src/                   # Source code organized by layers
│   ├── ui/               # User interface layer
│   ├── ui_logic/         # UI logic layer
│   ├── domain/           # Domain/business logic layer
│   ├── application/      # Application services layer
│   ├── external/         # External services integration layer
│   └── pipe/             # M-V-C for cross-layer communication
│       ├── models.ts     # Data models
│       ├── controllers.ts # Controllers
│       ├── views.ts      # View interfaces
│       └── index.ts      # Pipe entrypoint
├── tests/                 # Test folder with different test levels
│   ├── unit/             # Isolated, fast unit tests
│   ├── integration/      # Multi-module integration tests
│   ├── system/           # End-to-end system flows
│   ├── external/         # Tests against real external services
│   ├── env/              # Smoke and environment checks
│   ├── helpers/          # Test helper utilities
│   └── fixtures/         # Test fixtures
├── package.json          # Node.js package configuration
├── tsconfig.json         # TypeScript configuration
├── temp/                 # Temporary files for story
└── scripts/              # Story-specific scripts
```

## Epic Structure

Each epic under `layer/epics/` follows this structure:

```
[epic-name]/
├── README.md              # Epic overview and documentation
├── FEATURE.md            # High-level epic overview
├── FEATURE.vf.json       # Epic feature tracking
├── TASK_QUEUE.md         # Development task queue for epic
├── TASK_QUEUE.vf.json    # Virtual filesystem task queue for epic
├── NAME_ID.vf.json       # Name-based entity storage for epic
├── common/               # Code shared across themes
│   ├── fixtures/         # Test fixtures for epic
│   └── test-helpers/     # Test helper utilities
├── orchestrator/         # Stitches theme orchestrators together
├── research/             # Epic-level research and analysis
│   ├── domain/          # Domain research for epic scope
│   └── integration/     # Cross-theme integration research
├── tests/               # Epic-level integration tests
├── config/              # Epic configuration files
└── package.json         # Node.js package configuration for epic
```

## Platform-Specific Root Files

These files MUST be at root for tooling to work properly:

### Node.js/TypeScript
- `package.json` - Node.js package configuration
- `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `bun.lock` - Lock files
- `tsconfig.json` - TypeScript configuration
- `.eslintrc.json` - ESLint configuration
- `.babelrc` - Babel configuration

### Python
- `pyproject.toml` - Python project configuration
- `.python-version` - Python version specification
- `venv/` - Virtual environment directory

### Version Control
- `.gitignore` - Git ignore patterns
- `.jj/` - Jujutsu version control
- `.github/` - GitHub Actions and configuration

### IDE
- `.vscode/` - VS Code workspace settings
- `.claude/` - Claude configuration

## Important Notes

1. **Freeze Validation**: Directories marked with `freeze=true` prevent file creation to enforce structural discipline
2. **Cross-Layer Imports**: All cross-layer imports must go through `pipe/index.ts`
3. **Test File Patterns**: 
   - Unit tests: `*.test.*` or `*.utest.*`
   - Integration tests: `*.itest.*`
   - System tests: `*.stest.*` or `*.systest.*`
4. **Naming Conventions**:
   - Themes: `^[a-z][a-z0-9-]*$`
   - User stories: `^\\d{3}-[a-z][a-z0-9-]*$`
   - Epics: `^[a-z][a-z0-9-]*$`

## Recent Changes (Updated)

- Added `doc/` directory at root with `manual/` and `research/` subdirectories
- Moved `common/research/` to `doc/research/` for better organization
- Added `gen/release/` for release artifacts
- Updated `common/` structure to include utils, templates, tests, and tests-system
- Clarified the separation between project documentation (`doc/`) and generated documentation (`gen/doc/`)