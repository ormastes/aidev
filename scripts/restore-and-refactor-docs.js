#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

class DocumentationRestorer {
  constructor() {
    this.restored = [];
    this.refactored = [];
    this.errors = [];
  }

  async restore() {
    console.log('🔄 Starting documentation restoration and refactoring...\n');
    
    // Restore missing STEP files
    await this.restoreStepFiles();
    
    // Restore additional LLM rules
    await this.restoreAdditionalRules();
    
    // Refactor existing files for proper styling
    await this.refactorExistingFiles();
    
    // Generate restoration report
    await this.generateReport();
    
    console.log(`\n✅ Restored ${this.restored.length} files`);
    console.log(`📝 Refactored ${this.refactored.length} files`);
    if (this.errors.length > 0) {
      console.log(`⚠️ Errors: ${this.errors.length}`);
    }
  }

  async restoreStepFiles() {
    console.log('📚 Restoring STEP files...');
    
    // Copy STEP_5_END_STORY.md from backup
    const step5Source = '_aidev/00.llm_rules/STEP_5_END_STORY.md';
    const step5Dest = 'llm_rules/STEP_5_END_STORY.md';
    
    try {
      const content = await fs.readFile(step5Source, 'utf8');
      const refactoredContent = this.refactorMarkdown(content, 'STEP_5_END_STORY');
      await await fileAPI.createFile(step5Dest, refactoredContent);
      this.restored.push(step5Dest);
      console.log(`  ✓ Restored ${step5Dest}`);
    } catch (error) {
      this.errors.push(`Failed to restore STEP_5: ${error.message}`);
    }
    
    // Create other STEP files based on references
    const stepFiles = [
      {
        file: 'llm_rules/STEP_0_DOMAIN_RESEARCH.md', { type: FileType.SCRIPT })
   - Unit tests
   - Integration tests
   - System tests

2. **Implement functionality** (Green phase)
   - Minimal code to pass tests
   - Focus on correctness
   - Avoid premature optimization

3. **Refactor code** (Refactor phase)
   - Improve design
   - Enhance readability
   - Optimize performance

## Deliverables
- Implemented features
- Comprehensive test suite
- Updated documentation
- Code review feedback

## Quality Gates
- [ ] All tests passing
- [ ] Code coverage > 80%
- [ ] Code review approved
- [ ] Documentation updated
`
      },
      {
        file: 'llm_rules/STEP_4_IMPL_UNIT.md',
        content: `# Step 4: Unit Implementation

## Purpose

Implement individual units with comprehensive testing and documentation.

## Prerequisites
- [ ] User story design complete
- [ ] Unit specifications defined
- [ ] Test scenarios identified

## Activities

### Unit Development
1. **Write unit tests first**
   - Test all public methods
   - Cover edge cases
   - Verify error handling

2. **Implement unit code**
   - Follow SOLID principles
   - Maintain single responsibility
   - Use dependency injection

3. **Document unit behavior**
   - API documentation
   - Usage examples
   - Performance characteristics

### Integration Points
1. **Define interfaces**
   - Input/output contracts
   - Error conditions
   - Performance expectations

2. **Create integration tests**
   - Test with real dependencies
   - Verify data flow
   - Check error propagation

## Deliverables
- Unit implementation
- Unit test suite
- Integration tests
- API documentation

## Quality Gates
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] 100% unit coverage
- [ ] Documentation complete
`
      }
    ];
    
    for (const step of stepFiles) {
      try {
        const refactoredContent = this.refactorMarkdown(
          step.content, 
          path.basename(step.file, '.md')
        );
        await await fileAPI.createFile(step.file, refactoredContent);
        this.restored.push(step.file);
        console.log(`  ✓ Created ${step.file}`);
      } catch (error) {
        this.errors.push(`Failed to create ${step.file}: ${error.message}`);
      }
    }
  }

  async restoreAdditionalRules() {
    console.log('📋 Restoring additional rules...');
    
    // Copy KNOW_HOW_EXECUTABLE_WRAPPING.md
    const knowHowSource = '_aidev/00.llm_rules/additional/KNOW_HOW_EXECUTABLE_WRAPPING.md';
    const knowHowDest = 'llm_rules/additional/KNOW_HOW_EXECUTABLE_WRAPPING.md';
    
    try {
      await await fileAPI.createDirectory('llm_rules/additional');
      const content = await fs.readFile(knowHowSource, 'utf8');
      const refactoredContent = this.refactorMarkdown(content, 'KNOW_HOW_EXECUTABLE_WRAPPING');
      await await fileAPI.createFile(knowHowDest, refactoredContent);
      this.restored.push(knowHowDest);
      console.log(`  ✓ Restored ${knowHowDest}`);
    } catch (error) {
      this.errors.push(`Failed to restore KNOW_HOW: ${error.message}`);
    }
    
    // Create missing ROLE files with proper content
    const roleFiles = [
      {
        file: 'llm_rules/ROLE_REQUIREMENT_ANALYST.md', { type: FileType.SCRIPT }) {
  const agent = selectBestAgent(task);
  if (agent.isAvailable()) {
    agent.execute(task);
  } else {
    queue.add(task);
  }
}
\`\`\`

## Best Practices

1. **Monitor agent performance**
2. **Handle failures gracefully**
3. **Maintain audit logs**
4. **Optimize for throughput**
5. **Provide visibility into queue status**
`
      },
      {
        file: 'llm_rules/ROLE_API_CHECKER.md',
        content: `# Role: API Checker

## Responsibilities

The API Checker validates API contracts, compatibility, and documentation accuracy.

## Primary Tasks

### 1. Contract Validation
- **Request/response schema verification**
- **Data type checking**
- **Required field validation**
- **Format compliance**

### 2. Compatibility Testing
- **Backward compatibility checks**
- **Version migration validation**
- **Breaking change detection**
- **Deprecation tracking**

### 3. Documentation Verification
- **API documentation accuracy**
- **Example validation**
- **OpenAPI/Swagger compliance**
- **Changelog maintenance**

## Validation Processes

### Schema Validation
\`\`\`typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

async function validateAPI(
  endpoint: APIEndpoint,
  schema: JSONSchema
): ValidationResult {
  // Validate request/response against schema
}
\`\`\`

### Compatibility Checking
- Compare API versions
- Identify breaking changes
- Suggest migration paths
- Generate compatibility reports

### Performance Testing
- Response time validation
- Throughput testing
- Load testing
- Resource usage monitoring

## Tools and Technologies

- **OpenAPI/Swagger** - API documentation
- **JSON Schema** - Contract definition
- **Postman/Newman** - API testing
- **Contract testing frameworks**

## Best Practices

1. **Automate API testing**
2. **Version APIs properly**
3. **Document all changes**
4. **Test edge cases**
5. **Monitor production APIs**

## Deliverables

- API test suites
- Validation reports
- Compatibility matrices
- Performance benchmarks
- Documentation updates
`
      },
      {
        file: 'llm_rules/ROLE_AUTH_MANAGER.md',
        content: `# Role: Authentication Manager

## Responsibilities

The Auth Manager implements and maintains secure authentication and authorization systems.

## Primary Tasks

### 1. Authentication Implementation
- **User authentication flows**
- **Multi-factor authentication**
- **Session management**
- **Token generation and validation**

### 2. Authorization Management
- **Role-based access control (RBAC)**
- **Permission management**
- **Resource access control**
- **API authorization**

### 3. Security Monitoring
- **Login attempt tracking**
- **Suspicious activity detection**
- **Security audit logging**
- **Vulnerability assessment**

## Authentication Flows

### Standard Login
\`\`\`typescript
async function authenticate(
  credentials: Credentials
): Promise<AuthResult> {
  // Validate credentials
  // Generate tokens
  // Create session
  // Return auth result
}
\`\`\`

### Token Management
- **Access token generation**
- **Refresh token rotation**
- **Token expiration handling**
- **Token revocation**

### Session Management
- **Session creation**
- **Session validation**
- **Session timeout**
- **Concurrent session handling**

## Security Best Practices

### Password Security
- Secure hashing (bcrypt/argon2)
- Password complexity requirements
- Password history
- Account lockout policies

### Token Security
- Short-lived access tokens
- Secure token storage
- HTTPS-only transmission
- Token rotation strategies

### Audit and Compliance
- Comprehensive audit logging
- GDPR compliance
- Security headers implementation
- Regular security reviews

## Implementation Standards

1. **Never store plain text passwords**
2. **Use industry-standard libraries**
3. **Implement rate limiting**
4. **Enable security headers**
5. **Regular security updates**

## Deliverables

- Authentication service implementation
- Authorization middleware
- Security documentation
- Audit reports
- Compliance certificates
`
      },
      {
        file: 'llm_rules/ROLE_CONTEXT_MANAGER.md',
        content: `# Role: Context Manager

## Responsibilities

The Context Manager maintains and optimizes context for LLM interactions and system state.

## Primary Tasks

### 1. Context Optimization
- **Context window management**
- **Relevant information selection**
- **Context compression**
- **History management**

### 2. State Management
- **Application state tracking**
- **User session context**
- **Conversation history**
- **System configuration**

### 3. Memory Management
- **Short-term memory**
- **Long-term storage**
- **Context retrieval**
- **Memory optimization**

## Context Strategies

### Sliding Window
\`\`\`typescript
class ContextWindow {
  maxTokens: number;
  content: Message[];
  
  addMessage(message: Message) {
    this.content.push(message);
    this.trimToFit();
  }
  
  trimToFit() {
    while (this.getTokenCount() > this.maxTokens) {
      this.content.shift();
    }
  }
}
\`\`\`

### Semantic Compression
- Identify key information
- Remove redundancy
- Summarize verbose content
- Preserve critical context

### Priority-Based Selection
- Recent information priority
- Relevance scoring
- User preference weighting
- Task-specific filtering

## Implementation Patterns

### Context Store
\`\`\`typescript
interface ContextStore {
  saveContext(key: string, context: Context): void;
  loadContext(key: string): Context;
  searchContext(query: string): Context[];
  pruneOldContext(maxAge: number): void;
}
\`\`\`

### Context Injection
- Automatic context loading
- Dynamic context switching
- Context inheritance
- Scoped context management

## Best Practices

1. **Monitor context size**
2. **Implement context versioning**
3. **Use efficient storage**
4. **Provide context debugging**
5. **Handle context overflow gracefully**

## Deliverables

- Context management system
- Memory optimization strategies
- Context retrieval APIs
- Performance metrics
- Documentation and guides
`
      }
    ];
    
    for (const role of roleFiles) {
      try {
        const refactoredContent = this.refactorMarkdown(
          role.content,
          path.basename(role.file, '.md')
        );
        await await fileAPI.createFile(role.file, refactoredContent);
        this.restored.push(role.file);
        console.log(`  ✓ Created ${role.file}`);
      } catch (error) {
        this.errors.push(`Failed to create ${role.file}: ${error.message}`);
      }
    }
  }

  async refactorExistingFiles() {
    console.log('🎨 Refactoring existing files for consistent styling...');
    
    const filesToRefactor = [
      'llm_rules/README.md', { type: FileType.SCRIPT }) {
      try {
        let content = await fs.readFile(file, 'utf8');
        const originalContent = content;
        
        // Apply refactoring
        content = this.refactorMarkdown(content, path.basename(file, '.md'));
        
        // Only update if changed
        if (content !== originalContent) {
          await await fileAPI.createFile(file, content);
          this.refactored.push(file);
          console.log(`  ✓ Refactored ${file}`);
        }
      } catch (error) {
        this.errors.push(`Failed to refactor ${file}: ${error.message}`);
      }
    }
  }

  refactorMarkdown(content, { type: FileType.TEMPORARY }) {
    // Preserve main content while fixing style
    let refactored = content;
    
    // Fix header spacing (ensure blank line before headers)
    refactored = refactored.replace(/([^\n])\n(#{1,6} )/g, '$1\n\n$2');
    
    // Fix bullet points (use - instead of *)
    refactored = refactored.replace(/^\* /gm, '- ');
    refactored = refactored.replace(/^  \* /gm, '  - ');
    refactored = refactored.replace(/^    \* /gm, '    - ');
    
    // Fix code block formatting
    refactored = refactored.replace(/```([^\n]*)\n/g, (match, lang) => {
      // Ensure language is specified for code blocks
      if (!lang || lang.trim() === '') {
        return '```text\n';
      }
      return match;
    });
    
    // Remove excessive blank lines (more than 2)
    refactored = refactored.replace(/\n{4,}/g, '\n\n\n');
    
    // Ensure file ends with single newline
    refactored = refactored.replace(/\n*$/, '\n');
    
    // Add proper spacing around lists
    refactored = refactored.replace(/([^\n])\n(-|\d+\.) /g, '$1\n\n$2 ');
    
    // Fix inconsistent indentation in lists
    refactored = refactored.replace(/^( {3,})-/gm, (match, spaces) => {
      const level = Math.floor(spaces.length / 2);
      return '  '.repeat(level) + '-';
    });
    
    return refactored;
  }

  async generateReport() {
    const report = `# Documentation Restoration Report

**Date:** ${new Date().toISOString()}

## Summary

- **Files Restored:** ${this.restored.length}
- **Files Refactored:** ${this.refactored.length}
- **Errors:** ${this.errors.length}

## Restored Files

${this.restored.map(f => `- ${f}`).join('\n') || 'None'}

## Refactored Files

${this.refactored.map(f => `- ${f}`).join('\n') || 'None'}

## Errors

${this.errors.map(e => `- ${e}`).join('\n') || 'None'}

## Documentation Structure

### LLM Rules Directory
\`\`\`
llm_rules/
├── README.md                                    # Overview and index
├── HIERARCHICALLY_ENCAPSULATED_ARCHITECTURE.md  # HEA principles
├── MOCK_FREE_TEST_ORIENTED_DEVELOPMENT.md      # MFTOD methodology
├── PROCESS.md                                  # Development workflow
├── STEP_0_DOMAIN_RESEARCH.md                   # Research phase
├── STEP_1_SETUP.md                             # Project setup
├── STEP_2_PROTOTYPE.md                         # Prototyping
├── STEP_3_IMPL_USER_STORY.md                   # Story implementation
├── STEP_4_IMPL_UNIT.md                         # Unit implementation
├── STEP_5_END_STORY.md                         # Story completion
├── ROLE_TESTER.md                              # Tester responsibilities
├── ROLE_GUI_COORDINATOR.md                     # GUI coordination
├── ROLE_FEATURE_MANAGER.md                     # Feature management
├── ROLE_REQUIREMENT_ANALYST.md                 # Requirement analysis
├── ROLE_AGENT_SCHEDULER.md                     # Agent scheduling
├── ROLE_API_CHECKER.md                         # API validation
├── ROLE_AUTH_MANAGER.md                        # Authentication
├── ROLE_CONTEXT_MANAGER.md                     # Context management
└── additional/
    └── KNOW_HOW_EXECUTABLE_WRAPPING.md         # Bash scripting guide
\`\`\`

## Style Improvements Applied

1. **Consistent header formatting** - Proper spacing before/after headers
2. **Standardized bullet points** - Using \`-\` instead of \`*\`
3. **Code block languages** - Specified language for syntax highlighting
4. **List indentation** - Fixed to use 2-space increments
5. **Blank line normalization** - Removed excessive spacing
6. **File endings** - Ensured single newline at EOF

## Next Steps

1. Review restored documentation for accuracy
2. Update cross-references between documents
3. Add any missing domain-specific content
4. Create automated documentation tests
5. Set up documentation linting
`;

    await await fileAPI.createFile('gen/doc/restoration-report.md', report);
    console.log('\n📊 Report generated: gen/doc/restoration-report.md');
  }
}

async function main() {
  const restorer = new DocumentationRestorer();
  
  try {
    await restorer.restore();
    console.log('\n✅ Documentation restoration complete!');
  } catch (error) {
    console.error('❌ Error:', { type: FileType.TEMPORARY });
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { DocumentationRestorer };