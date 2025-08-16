# Documentation Style Guide

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
- **Bold** - Important terms, warnings
- *Italic* - Emphasis, first use of terms
- `Code` - Inline code, file names, commands

#### Lists
- Use `-` for unordered lists (not `*`)
- Use `1.` for ordered lists
- Indent nested lists with 2 spaces

#### Code Blocks
```language
// Always specify language for syntax highlighting
const example = "code";
```

### Document Structure

#### Standard Sections
1. **Title** (H1)
2. **Overview/Purpose** - Brief description
3. **Content** - Main documentation
4. **Examples** - Code samples, use cases
5. **References** - Related documents

#### File Naming
- Use lowercase with hyphens: `feature-name.md`
- README.md for directory descriptions
- UPPERCASE.md for root-level importance

### Link Standards

#### Internal Links
- Relative paths: `[Text](../other/file.md)`
- Anchors: `[Text](#section-header)`
- Always verify link targets exist

#### External Links
- Full URLs: `[Text](https://example.com)`
- Open in new tab notation: `[Text](url){:target="_blank"}` (if supported)

### Code Documentation

#### Inline Comments
```javascript
// Good: Explains why
const timeout = 5000; // User research showed 5s optimal

// Bad: Explains what (obvious)
const timeout = 5000; // Set timeout to 5000
```

#### Function Documentation
```typescript
/**
 * Processes user input and returns formatted result
 * @param input - Raw user input string
 * @param options - Processing options
 * @returns Formatted result object
 */
function processInput(input: string, options?: Options): Result {
  // Implementation
}
```

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
- Use consistent format: `![Status](https://img.shields.io/badge/...)`
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
```markdown
## API: functionName

**Purpose:** Brief description

**Parameters:**
- `param1` (Type): Description
- `param2` (Type, optional): Description

**Returns:** Type - Description

**Example:**
\`\`\`javascript
const result = functionName(param1, param2);
\`\`\`
```

#### Feature Documentation
```markdown
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
```

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

*Last Updated: 2025-08-14*
