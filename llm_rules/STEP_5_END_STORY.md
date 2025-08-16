# End Story Phase Rules

## Purpose
Ensure quality, capture learnings, and prepare for next iteration.

## Prerequisites

- [ ] All tests passing

- [ ] Implementation complete

- [ ] Code reviewed

## Activities

### 5.1 Coverage Verification
**Input**: Test suite and code
**Output**: Coverage reports

**Targets**:

- Class coverage: 100%

- Method coverage: 100%

- Line coverage: 100%

- Branch coverage: 100%

**Rules**:

- Use automated coverage tools

- Investigate any gaps

- Add tests for missed cases

- Document justified exclusions

### 5.2 Role Feedback Collection
**Input**: Completed story
**Output**: Lessons learned from each role

**Required Feedback**:
```yaml
role: [Role Name]
story: [Story ID]
what_worked:
  - [Positive aspect]
what_didnt:
  - [Challenge faced]
suggestions:
  - [Improvement idea]
```text

**Rules**:

- Every role must provide feedback

- Be specific and actionable

- Focus on process improvements

- No blame, only learning

### 5.3 Automated Reporting
**Input**: Test results, metrics, feedback
**Output**: Comprehensive HTML report

**Report Sections**:

1. Executive Summary

2. Test Results (foldable)

3. Coverage Metrics (foldable)

4. Performance Data (foldable)

5. Screenshots/Logs (foldable)

6. Feedback Summary

7. Action Items

**Rules**:

- Generate automatically via scripts

- Include visual representations

- Make sections collapsible for readability

- Version and archive reports

### 5.4 Quality Analysis
**Input**: System behavior
**Output**: Quality assessment

**Analysis Areas**:

- Performance vs. requirements

- Security vulnerability scan

- Code quality metrics

- User experience assessment

- Accessibility compliance

**Rules**:

- Use automated tools where possible

- Document all findings

- Prioritize critical issues

- Create tickets for improvements

### 5.5 Rule Updates
**Input**: Lessons learned
**Output**: Updated process rules

**Rules**:

- Propose rule changes based on experience

- Document in additional_rules/

- Review with team

- Update templates after approval

- Version control all changes

## Quality Gates

- [ ] 100% test coverage achieved

- [ ] All roles provided feedback

- [ ] Report generated and reviewed

- [ ] Improvements identified and documented

## Common Pitfalls

- Skipping feedback collection

- Not acting on lessons learned

- Incomplete documentation

- Missing retrospective actions
