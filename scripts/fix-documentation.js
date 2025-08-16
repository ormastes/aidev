#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

class DocumentationFixer {
  constructor() {
    this.fixes = [];
    this.created = [];
    this.updated = [];
    this.errors = [];
  }

  async fix() {
    console.log('🔧 Starting documentation fix process...\n');
    
    // Fix broken links and create missing files
    await this.createMissingLLMRules();
    await this.fixRootDocumentation();
    await this.standardizeMarkdownFormat();
    await this.removeObsoleteReferences();
    await this.createDocumentationStyleGuide();
    
    // Generate report
    await this.generateReport();
    
    console.log(`\n✅ Fixed ${this.fixes.length} issues`);
    console.log(`📄 Created ${this.created.length} files`);
    console.log(`📝 Updated ${this.updated.length} files`);
  }

  async createMissingLLMRules() {
    console.log('📚 Creating missing LLM rules documentation...');
    
    const missingRules = [
      {
        file: 'llm_rules/README.md',
        content: `# LLM Rules

## Overview

This directory contains guidelines and role definitions for LLM agents working on the AI Development Platform.

## Core Documents

### Architecture
- [HIERARCHICALLY_ENCAPSULATED_ARCHITECTURE.md](./HIERARCHICALLY_ENCAPSULATED_ARCHITECTURE.md) - Core architecture principles
- [MOCK_FREE_TEST_ORIENTED_DEVELOPMENT.md](./MOCK_FREE_TEST_ORIENTED_DEVELOPMENT.md) - Testing methodology

### Process
- [PROCESS.md](./PROCESS.md) - Development processes and workflows

### Roles
- [ROLE_FEATURE_MANAGER.md](./ROLE_FEATURE_MANAGER.md) - Feature management
- [ROLE_TESTER.md](./ROLE_TESTER.md) - Testing responsibilities
- [ROLE_GUI_COORDINATOR.md](./ROLE_GUI_COORDINATOR.md) - GUI design coordination
- [ROLE_REQUIREMENT_ANALYST.md](./ROLE_REQUIREMENT_ANALYST.md) - Requirements analysis
- [ROLE_AGENT_SCHEDULER.md](./ROLE_AGENT_SCHEDULER.md) - Agent scheduling
- [ROLE_API_CHECKER.md](./ROLE_API_CHECKER.md) - API validation
- [ROLE_AUTH_MANAGER.md](./ROLE_AUTH_MANAGER.md) - Authentication management
- [ROLE_CONTEXT_MANAGER.md](./ROLE_CONTEXT_MANAGER.md) - Context management

### Steps
- [STEP_0_DOMAIN_RESEARCH.md](./STEP_0_DOMAIN_RESEARCH.md) - Domain research phase
- [STEP_1_SETUP.md](./STEP_1_SETUP.md) - Project setup
- [STEP_2_PROTOTYPE.md](./STEP_2_PROTOTYPE.md) - Prototyping
- [STEP_3_IMPL_USER_STORY.md](./STEP_3_IMPL_USER_STORY.md) - User story implementation
- [STEP_4_IMPL_UNIT.md](./STEP_4_IMPL_UNIT.md) - Unit implementation
- [STEP_5_END_STORY.md](./STEP_5_END_STORY.md) - Story completion

## Rule Compliance

All LLM agents must:
1. Read and understand relevant role definitions before starting work
2. Follow established processes and workflows
3. Maintain documentation consistency
4. Report changes as specified in PROCESS.md
`
      },
      {
        file: 'llm_rules/HIERARCHICALLY_ENCAPSULATED_ARCHITECTURE.md',
        content: `# Hierarchically Encapsulated Architecture (HEA)

## Core Principle

The AI Development Platform follows a hierarchical encapsulation pattern where each layer provides services to layers above while hiding implementation details.

## Layer Structure

### 1. Theme Organization
Each theme resides in \`layer/themes/[theme_name]/\` with:
- \`pipe/index.ts\` - Public API gateway (mandatory)
- \`src/\` - Internal implementation
- \`tests/\` - Test suites
- \`children/\` - Sub-themes (optional)

### 2. Pipe-Based Communication
- **Cross-layer access only through pipe/index.ts**
- No direct imports between themes
- Clear dependency management
- Reduced coupling

### 3. Context Reduction
- Each layer encapsulates complexity
- Upper layers see simplified interfaces
- Implementation details hidden

## Benefits

1. **Modularity** - Themes can be developed independently
2. **Testability** - Clear boundaries enable comprehensive testing
3. **Maintainability** - Changes isolated within themes
4. **Scalability** - New themes added without affecting existing ones

## Implementation Rules

1. **Never bypass pipe interfaces**
2. **Keep internal implementation in src/**
3. **Export only necessary interfaces through pipe/**
4. **Document all public APIs**
5. **Maintain backward compatibility**
`
      },
      {
        file: 'llm_rules/MOCK_FREE_TEST_ORIENTED_DEVELOPMENT.md',
        content: `# Mock Free Test Oriented Development (MFTOD)

## Philosophy

Write tests that verify real behavior without mocking dependencies. This ensures tests validate actual system behavior rather than mocked assumptions.

## Process

### Red → Green → Refactor

1. **Red Phase**
   - Write failing test for new functionality
   - Test must fail for the right reason
   - Verify test catches the missing implementation

2. **Green Phase**
   - Write minimal code to pass test
   - Focus on correctness, not optimization
   - All tests must pass

3. **Refactor Phase**
   - Improve code quality
   - Maintain all passing tests
   - Optimize performance if needed

## Test Levels

### 1. Unit Tests
- Test individual functions/methods
- Use real implementations where possible
- Mock only external services (databases, APIs)

### 2. Integration Tests
- Test component interactions
- Use real components
- Verify data flow between modules

### 3. System Tests
- End-to-end testing with Playwright
- Real browser interactions
- Actual user workflows

## Best Practices

1. **Prefer integration over unit tests** when possible
2. **Use real implementations** instead of mocks
3. **Test behavior, not implementation**
4. **Keep tests simple and readable**
5. **Ensure tests are deterministic**

## Coverage Requirements

- Minimum 80% code coverage
- 100% coverage for critical paths
- All user stories must have tests
- System tests for all features
`
      },
      {
        file: 'llm_rules/PROCESS.md',
        content: `# Development Process

## Workflow Overview

### 1. Task Management
- Check TASK_QUEUE.vf.json before starting work
- Update task status as work progresses
- Complete all tests before marking done

### 2. Feature Development

#### Planning
1. Read feature requirements in FEATURE.vf.json
2. Review relevant role definitions
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
- [ ] Coverage requirements met
- [ ] Documentation updated
- [ ] Code reviewed
- [ ] No broken dependencies

## Communication

### Reporting Format
\`\`\`
## Change Report

**Component:** [theme/module name]
**Type:** [feature/bugfix/refactor]
**Status:** [completed/in-progress]

### Changes Made
- [List of specific changes]

### Tests
- [Test coverage percentage]
- [New tests added]

### Documentation
- [Documentation updates]
\`\`\`
`
      },
      {
        file: 'llm_rules/ROLE_TESTER.md',
        content: `# Role: Tester

## Responsibilities

The Tester ensures comprehensive test coverage following Mock Free Test Oriented Development principles.

## Primary Tasks

### 1. Test Strategy
- Design test plans for features
- Identify test scenarios
- Define coverage requirements

### 2. Test Implementation
- Write unit tests
- Create integration tests
- Develop system tests with Playwright

### 3. Test Execution
- Run test suites
- Verify test results
- Monitor coverage metrics

### 4. Quality Assurance
- Validate functionality
- Verify performance
- Ensure reliability

## Testing Approach

### Bottom-Up Testing
1. Start with unit tests
2. Build integration tests
3. Complete with system tests
4. Verify end-to-end flows

### Coverage Requirements
- Minimum 80% overall coverage
- 100% for critical paths
- All edge cases covered
- Error scenarios tested

## Tools and Technologies

- **Jest** - Unit and integration testing
- **Playwright** - E2E browser testing
- **Coverage tools** - nyc, c8
- **Test runners** - npm test scripts

## Best Practices

1. **Write tests first** - TDD approach
2. **Test real implementations** - Avoid excessive mocking
3. **Keep tests maintainable** - Clear, simple tests
4. **Ensure determinism** - No flaky tests
5. **Document test cases** - Clear descriptions

## Deliverables

- Test plans and strategies
- Comprehensive test suites
- Coverage reports
- Test documentation
- Bug reports and fixes
`
      },
      {
        file: 'llm_rules/ROLE_GUI_COORDINATOR.md',
        content: `# Role: GUI Coordinator

## Responsibilities

The GUI Coordinator manages the design and implementation of user interfaces following the established GUI design workflow.

## GUI Development Process

### 1. Requirements Analysis
- Analyze feature UI requirements
- Identify user interaction patterns
- Define accessibility needs

### 2. Design Phase
- Create ASCII sketches for layout concepts
- Generate 4 design candidates:
  - Modern/Minimalist
  - Professional/Corporate
  - Creative/Playful
  - Accessible/High-contrast

### 3. Selection Process
- Present designs via web interface (http://localhost:3457)
- Facilitate design selection
- Document design decisions

### 4. Implementation
- Convert selected design to code
- Ensure responsive behavior
- Implement accessibility features

### 5. Validation
- Test across browsers
- Verify accessibility standards
- Validate user experience

## Design Standards

### Visual Consistency
- Consistent color schemes
- Standardized typography
- Uniform spacing and layout

### Accessibility Requirements
- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatibility
- High contrast options

### Performance
- Optimized asset loading
- Minimal render blocking
- Smooth animations
- Fast interaction response

## Tools and Technologies

- **Design Tools** - ASCII art, HTML/CSS prototypes
- **Frameworks** - React, Vue, or vanilla JS
- **Testing** - Playwright for UI testing
- **Accessibility** - axe-core, WAVE

## Deliverables

- Design mockups and prototypes
- Implementation code
- Style guides
- Accessibility reports
- User documentation
`
      },
      {
        file: 'llm_rules/ROLE_FEATURE_MANAGER.md',
        content: `# Role: Feature Manager

## Responsibilities

The Feature Manager oversees feature development from conception to deployment, ensuring alignment with project goals.

## Core Tasks

### 1. Feature Planning
- Define feature requirements
- Create user stories
- Prioritize implementation

### 2. Resource Coordination
- Assign tasks to appropriate roles
- Coordinate between teams
- Manage dependencies

### 3. Progress Tracking
- Monitor implementation status
- Update FEATURE.vf.json
- Report progress

### 4. Quality Assurance
- Review implementations
- Verify acceptance criteria
- Ensure documentation

## Feature Lifecycle

### Discovery
1. Identify user needs
2. Research solutions
3. Define success criteria

### Design
1. Create technical specifications
2. Design system architecture
3. Plan implementation phases

### Development
1. Coordinate implementation
2. Monitor progress
3. Resolve blockers

### Validation
1. Verify functionality
2. Validate performance
3. Confirm user acceptance

### Deployment
1. Plan rollout strategy
2. Coordinate deployment
3. Monitor post-deployment

## MCP Integration

### MCP Agent Management
- Configure MCP agents
- Define tool permissions
- Monitor agent behavior

### Tool Discovery
- Identify available tools
- Validate tool safety
- Document tool usage

## Deliverables

- Feature specifications
- Implementation plans
- Progress reports
- Release documentation
- Retrospective analyses
`
      }
    ];

    for (const rule of missingRules) {
      await this.createFile(rule.file, rule.content);
    }
  }

  async fixRootDocumentation() {
    console.log('📝 Fixing root documentation files...');
    
    // Update CLAUDE.md to fix broken links
    const claudePath = 'CLAUDE.md';
    try {
      let content = await fs.readFile(claudePath, 'utf8');
      
      // Fix docs/ references to gen/doc/
      content = content.replace(/\[([^\]]+)\]\(docs\//g, '[$1](gen/doc/');
      
      // Fix localhost port inconsistencies
      content = content.replace(/http:\/\/localhost:3457/g, 'http://localhost:3457');
      
      // Standardize bullet points
      content = content.replace(/^\* /gm, '- ');
      
      await await fileAPI.createFile(claudePath, content);
      this.updated.push(claudePath);
      this.fixes.push('Fixed broken links in CLAUDE.md');
    } catch (error) {
      this.errors.push(`Failed to update CLAUDE.md: ${error.message}`);
    }

    // Create missing referenced files
    const missingFiles = [
      {
        file: 'gen/doc/PORT_POLICY.md', { type: FileType.SCRIPT }).toISOString().split('T')[0]}

## Component Status

### Core Platform
- ✅ Hierarchical theme architecture
- ✅ Pipe-based communication
- ✅ VF.json configuration system
- ✅ MCP integration framework

### Features
- ✅ Story reporter theme
- ✅ Filesystem MCP theme
- ✅ Python coverage analysis
- ✅ GUI selector system
- 🚧 Portal security (in progress)
- 🚧 LLM agent coordination (in progress)

### Documentation
- ✅ Architecture documentation
- ✅ API documentation
- 🚧 User guides (in progress)
- 📋 Video tutorials (planned)

## Known Issues
- Some themes have incomplete documentation
- Test coverage varies by theme
- Performance optimization needed for large projects

## Roadmap
1. Complete security implementation
2. Enhance MCP agent capabilities
3. Improve documentation coverage
4. Add more theme templates
`
      }
    ];

    for (const file of missingFiles) {
      await this.createFile(file.file, file.content);
    }
  }

  async standardizeMarkdownFormat() {
    console.log('🎨 Standardizing markdown format...');
    
    // Update TASK_QUEUE.md with more content
    const taskQueueContent = `# Task Queue

## Overview

The AI Development Platform uses a VF.json-based task queue system to track development tasks across all themes.

## Task Structure

Tasks are managed in two ways:
1. **Global Tasks** - Root level TASK_QUEUE.vf.json
2. **Theme Tasks** - Individual theme TASK_QUEUE.vf.json files

## Task States

- **pending** - Not yet started
- **in_progress** - Currently being worked on
- **blocked** - Waiting on dependencies
- **completed** - Finished and tested
- **cancelled** - No longer needed

## Active Tasks

### Global Queue
See: [TASK_QUEUE.vf.json](./TASK_QUEUE.vf.json)

### Theme Queues
Each theme maintains its own task queue:
- \`layer/themes/*/TASK_QUEUE.vf.json\`

## Task Management Process

1. **Adding Tasks**
   - Add to appropriate TASK_QUEUE.vf.json
   - Set initial status as 'pending'
   - Include clear description

2. **Working on Tasks**
   - Update status to 'in_progress'
   - Create tests first (TDD)
   - Implement functionality
   - Update documentation

3. **Completing Tasks**
   - Ensure all tests pass
   - Verify coverage requirements
   - Update status to 'completed'
   - Remove from queue or archive

## Priority Levels

- **🔴 Critical** - Blocking other work
- **🟡 High** - Important features
- **🟢 Normal** - Standard tasks
- **⚪ Low** - Nice to have

## Integration with Features

Tasks often implement features defined in FEATURE.vf.json files.
Ensure task completion aligns with feature requirements.
`;

    await this.updateFile('TASK_QUEUE.md', taskQueueContent);

    // Update FEATURE.md with more content
    const featureContent = `# Feature Backlog

## Overview

Features represent major functionality additions to the AI Development Platform. Each theme maintains its own feature list while contributing to the overall platform capabilities.

## Feature Organization

### Structure
- **Global Features** - Platform-wide capabilities
- **Theme Features** - Theme-specific functionality
- **Cross-Theme Features** - Features requiring multiple themes

### Feature Files
- Root: \`FEATURE.vf.json\`
- Themes: \`layer/themes/*/FEATURE.vf.json\`

## Feature States

- **proposed** - Suggested but not approved
- **approved** - Approved for implementation
- **in_development** - Currently being built
- **testing** - Implementation complete, testing in progress
- **completed** - Fully implemented and tested
- **deprecated** - No longer supported

## Active Features

### Priority Features
1. **MCP Agent Orchestration** - Enhanced agent coordination
2. **Security Framework** - Comprehensive security implementation
3. **GUI Template System** - Reusable UI components
4. **Performance Monitoring** - System metrics and optimization

### Theme-Specific Features
See individual theme FEATURE.vf.json files:
- \`layer/themes/infra_story-reporter/FEATURE.vf.json\`
- \`layer/themes/portal_aidev/FEATURE.vf.json\`
- \`layer/themes/infra_filesystem-mcp/FEATURE.vf.json\`

## Feature Development Process

### 1. Proposal
- Document feature requirements
- Define success criteria
- Estimate effort

### 2. Approval
- Review technical feasibility
- Assess resource requirements
- Approve or defer

### 3. Implementation
- Create tasks in TASK_QUEUE.vf.json
- Follow development process
- Maintain documentation

### 4. Validation
- Test all aspects
- Verify performance
- Confirm user acceptance

### 5. Release
- Update documentation
- Deploy to production
- Monitor adoption

## Feature Dependencies

Features may depend on:
- Other features
- External libraries
- Platform capabilities
- Theme implementations

Always document dependencies in feature definitions.

## Contributing Features

To propose a new feature:
1. Create feature definition in appropriate FEATURE.vf.json
2. Document requirements and benefits
3. Submit for review
4. Implement upon approval
`;

    await this.updateFile('FEATURE.md', featureContent);
  }

  async removeObsoleteReferences() {
    console.log('🗑️  Removing obsolete references...');
    
    // Remove references to deleted files from documentation
    const filesToClean = ['README.md', 'CLAUDE.md'];
    
    for (const file of filesToClean) {
      try {
        let content = await fs.readFile(file, 'utf8');
        
        // Remove references to OLLAMA_TOOLS_README.md
        content = content.replace(/.*OLLAMA_TOOLS_README\.md.*/g, '');
        
        // Remove references to THEME_SEPARATION_SUMMARY.md
        content = content.replace(/.*THEME_SEPARATION_SUMMARY\.md.*/g, '');
        
        // Clean up multiple blank lines
        content = content.replace(/\n{3,}/g, '\n\n');
        
        await await fileAPI.createFile(file, content);
        this.fixes.push(`Cleaned obsolete references from ${file}`);
      } catch (error) {
        this.errors.push(`Failed to clean ${file}: ${error.message}`);
      }
    }
  }

  async createDocumentationStyleGuide() {
    console.log('📖 Creating documentation style guide...');
    
    const styleGuide = `# Documentation Style Guide

## Purpose

This guide ensures consistency across all documentation in the AI Development Platform.

## Markdown Standards

### Headers

- **H1 (#)** - Document title only (one per file)
- **H2 (##)** - Major sections
- **H3 (###)** - Subsections
- **H4 (####)** - Sub-subsections (rarely used)

### Formatting

#### Text Emphasis
- **Bold** - Important terms, { type: FileType.SCRIPT })
- Use \`1.\` for ordered lists
- Indent nested lists with 2 spaces

#### Code Blocks
\`\`\`language
// Always specify language for syntax highlighting
const example = "code";
\`\`\`

### Document Structure

#### Standard Sections
1. **Title** (H1)
2. **Overview/Purpose** - Brief description
3. **Content** - Main documentation
4. **Examples** - Code samples, use cases
5. **References** - Related documents

#### File Naming
- Use lowercase with hyphens: \`feature-name.md\`
- README.md for directory descriptions
- UPPERCASE.md for root-level importance

### Link Standards

#### Internal Links
- Relative paths: \`[Text](../other/file.md)\`
- Anchors: \`[Text](#section-header)\`
- Always verify link targets exist

#### External Links
- Full URLs: \`[Text](https://example.com)\`
- Open in new tab notation: \`[Text](url){:target="_blank"}\` (if supported)

### Code Documentation

#### Inline Comments
\`\`\`javascript
// Good: Explains why
const timeout = 5000; // User research showed 5s optimal

// Bad: Explains what (obvious)
const timeout = 5000; // Set timeout to 5000
\`\`\`

#### Function Documentation
\`\`\`typescript
/**
 * Processes user input and returns formatted result
 * @param input - Raw user input string
 * @param options - Processing options
 * @returns Formatted result object
 */
async function processInput(input: string, options?: Options): Result {
  // Implementation
}
\`\`\`

### Status Indicators

#### Emoji Usage
- ✅ Completed/Success
- ❌ Failed/Error
- 🚧 In Progress
- 📋 Planned
- ⚠️ Warning
- 💡 Tip/Idea
- 🔴 Critical/High Priority
- 🟡 Medium Priority
- 🟢 Low Priority/Normal

#### Status Badges
- Use consistent format: \`![Status](https://img.shields.io/badge/...)\`
- Place at document top
- Keep current

### Best Practices

1. **Be Concise** - Get to the point quickly
2. **Use Examples** - Show, don't just tell
3. **Stay Current** - Update docs with code
4. **Be Consistent** - Follow this guide
5. **Think of Readers** - Write for your audience

### Common Patterns

#### API Documentation
\`\`\`markdown
## API: functionName

**Purpose:** Brief description

**Parameters:**
- \`param1\` (Type): Description
- \`param2\` (Type, optional): Description

**Returns:** Type - Description

**Example:**
\\\`\\\`\\\`javascript
const result = functionName(param1, param2);
\\\`\\\`\\\`
\`\`\`

#### Feature Documentation
\`\`\`markdown
## Feature: Name

**Status:** In Development
**Priority:** High
**Owner:** Theme Name

### Description
What the feature does

### Requirements
- Requirement 1
- Requirement 2

### Implementation
How it works

### Usage
How to use it
\`\`\`

## Maintenance

### Review Schedule
- Weekly: Update task/feature status
- Monthly: Review and update guides
- Quarterly: Comprehensive audit

### Versioning
- Document major changes
- Include update dates
- Maintain changelog for critical docs

## Tools

### Linting
- markdownlint for consistency
- dead link checker for broken links
- spell checker for typos

### Generation
- JSDoc/TSDoc for API docs
- README generators for consistency
- Template systems for repetitive docs

---

*Last Updated: ${new Date().toISOString().split('T')[0]}*
`;

    await this.createFile('gen/doc/DOCUMENTATION_STYLE_GUIDE.md', styleGuide);
  }

  async createFile(filePath, content) {
    try {
      const dir = path.dirname(filePath);
      await await fileAPI.createDirectory(dir);
      await await fileAPI.createFile(filePath, content);
      this.created.push(filePath);
      console.log(`  ✓ Created ${filePath}`);
    } catch (error) {
      this.errors.push(`Failed to create ${filePath}: ${error.message}`);
    }
  }

  async updateFile(filePath, { type: FileType.TEMPORARY }) {
    try {
      await await fileAPI.createFile(filePath, content);
      this.updated.push(filePath);
      console.log(`  ✓ Updated ${filePath}`);
    } catch (error) {
      this.errors.push(`Failed to update ${filePath}: ${error.message}`);
    }
  }

  async generateReport() {
    const report = `# Documentation Refactoring Report

**Date:** ${new Date().toISOString()}

## Summary

- **Issues Fixed:** ${this.fixes.length}
- **Files Created:** ${this.created.length}
- **Files Updated:** ${this.updated.length}
- **Errors:** ${this.errors.length}

## Files Created

${this.created.map(f => `- ${f}`).join('\n') || 'None'}

## Files Updated

${this.updated.map(f => `- ${f}`).join('\n') || 'None'}

## Fixes Applied

${this.fixes.map(f => `- ${f}`).join('\n') || 'None'}

## Errors

${this.errors.map(e => `- ${e}`).join('\n') || 'None'}

## Next Steps

1. Review newly created documentation
2. Update remaining placeholder files
3. Add missing API documentation
4. Create user guides
5. Implement automated documentation testing

## Documentation Health

### ✅ Completed
- Core LLM rules documentation
- Documentation style guide
- Platform status documentation
- Port policy documentation
- Enhanced task and feature documentation

### 🚧 In Progress
- Theme-specific documentation
- API reference documentation
- User guides and tutorials

### 📋 Planned
- Video tutorials
- Interactive examples
- Troubleshooting guides
- Migration guides
`;

    await this.createFile('gen/doc/documentation-refactoring-report.md', { type: FileType.TEMPORARY });
  }
}

async function main() {
  const fixer = new DocumentationFixer();
  
  try {
    await fixer.fix();
    console.log('\n✅ Documentation fix complete!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { DocumentationFixer };