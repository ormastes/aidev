# Development Process

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
```text

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
```text
