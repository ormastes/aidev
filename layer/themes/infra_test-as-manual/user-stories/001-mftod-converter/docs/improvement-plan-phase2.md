# Test-as-Manual Improvement Plan - Phase 2

## Overview

Based on the comparison with _aidev implementation, this document outlines the next phase of improvements to achieve feature parity and enhance the test-as-manual converter.

## Priority Matrix

| Priority | Impact | Effort | Features |
|----------|--------|--------|----------|
| **P0 - Critical** | High | Low | Real value extraction, Specific action descriptions |
| **P1 - High** | High | Medium | Complete HEA architecture, Real capture implementation |
| **P2 - Medium** | Medium | Medium | Multi-framework parsers, Executive summaries |
| **P3 - Low** | Low | High | Visual diagrams, Advanced templates |

## Implementation Phases

### Phase 2.1: Critical Parser Enhancements (Week 1)

#### 1. Real Value Extraction
```typescript
// Current: generic placeholders
"Enter <username>"
"Verify <result>"

// Target: actual values
"Enter 'john.doe@example.com'"
"Verify total is '$2,048.98'"
```

**Tasks:**
- [ ] Enhance AST visitor to capture literal values
- [ ] Preserve string literals from test code
- [ ] Extract numeric values and formats
- [ ] Maintain variable values through test flow

#### 2. Specific Action Recognition
```typescript
// Current: generic descriptions
"Verify function()"
"Execute action"

// Target: specific actions
"Click the 'Submit Order' button"
"Type 'john@example.com' in email field"
"Select 'Premium' from subscription dropdown"
```

**Tasks:**
- [ ] Build action verb dictionary
- [ ] Map common test methods to user actions
- [ ] Extract element identifiers and humanize them
- [ ] Create context-aware descriptions

### Phase 2.2: Complete HEA Architecture (Week 2)

#### 1. Add Missing Layers
```
51.ui/
├── components/       # UI components for web interface
├── views/           # Page views
└── pipe/            # UI layer exports

52.uilogic/
├── controllers/     # UI business logic
├── validators/      # Input validation
└── pipe/           # UILogic layer exports
```

**Tasks:**
- [ ] Create UI layer structure
- [ ] Implement UILogic layer
- [ ] Define clear interfaces between layers
- [ ] Migrate existing UI code to proper layers

#### 2. Plugin Architecture
```typescript
interface ParserPlugin {
  name: string;
  canParse(file: string): boolean;
  parse(content: string): TestSuite;
}

interface FormatterPlugin {
  name: string;
  format: string;
  generate(suite: ManualTestSuite): string;
}
```

**Tasks:**
- [ ] Define plugin interfaces
- [ ] Create plugin loader
- [ ] Convert existing parsers to plugins
- [ ] Enable custom plugin registration

### Phase 2.3: Real Capture Implementation (Week 3)

#### 1. Web Capture with Playwright
```typescript
class PlaywrightCaptureProvider implements CaptureProvider {
  async capture(options: WebCaptureOptions): Promise<CaptureResult> {
    const browser = await playwright.chromium.launch();
    const page = await browser.newPage();
    await page.goto(options.url);
    const screenshot = await page.screenshot();
    // ...
  }
}
```

**Tasks:**
- [ ] Integrate Playwright for web captures
- [ ] Implement page state management
- [ ] Add element highlighting
- [ ] Synchronize with test execution

#### 2. Mobile Capture Integration
```typescript
class MobileCaptureProvider implements CaptureProvider {
  async captureIOS(deviceId: string): Promise<CaptureResult> {
    // Use xcrun simctl for iOS
    const result = await exec(`xcrun simctl io ${deviceId} screenshot`);
    // ...
  }
  
  async captureAndroid(deviceId: string): Promise<CaptureResult> {
    // Use adb for Android
    const result = await exec(`adb -s ${deviceId} shell screencap`);
    // ...
  }
}
```

**Tasks:**
- [ ] Implement iOS simulator capture
- [ ] Implement Android emulator capture
- [ ] Add device detection
- [ ] Handle capture failures gracefully

### Phase 2.4: Advanced Intelligence (Week 4)

#### 1. Smart Categorization
```typescript
class CategoryInference {
  inferCategory(scenario: TestScenario): Category {
    // Analyze content, tags, and patterns
    if (hasAuthKeywords(scenario)) return 'Authentication';
    if (hasPaymentKeywords(scenario)) return 'Payment';
    if (hasApiPatterns(scenario)) return 'API';
    // ...
  }
}
```

**Tasks:**
- [ ] Build keyword dictionaries
- [ ] Implement pattern matching
- [ ] Add machine learning classification (optional)
- [ ] Support custom category rules

#### 2. Business Context Generation
```typescript
class BusinessContextGenerator {
  generateExecutiveSummary(suite: TestSuite): ExecutiveSummary {
    return {
      businessValue: this.extractBusinessValue(suite),
      risksCovered: this.identifyRisks(suite),
      complianceAspects: this.checkCompliance(suite),
      estimatedEffort: this.calculateEffort(suite)
    };
  }
}
```

**Tasks:**
- [ ] Extract business terminology
- [ ] Identify risk scenarios
- [ ] Map to compliance requirements
- [ ] Calculate time estimates

### Phase 2.5: Professional Templates (Week 5)

#### 1. Enterprise Template Set
- **Compliance Template**: Audit trails, approvals, evidence
- **Training Template**: Step-by-step with screenshots
- **Executive Template**: High-level overview with metrics
- **Developer Template**: Technical details preserved
- **QA Template**: Detailed validation steps

**Tasks:**
- [ ] Design template structures
- [ ] Implement template engine
- [ ] Add customization options
- [ ] Create template gallery

#### 2. Visual Enhancement
```typescript
class VisualDocumentGenerator {
  async generateFlowDiagram(sequence: TestSequence): Promise<Diagram> {
    // Use mermaid.js or similar
    return createFlowChart(sequence.steps);
  }
  
  async annotateScreenshot(capture: Screenshot): Promise<AnnotatedImage> {
    // Add arrows, highlights, callouts
    return addAnnotations(capture, highlights);
  }
}
```

**Tasks:**
- [ ] Integrate diagram library
- [ ] Add screenshot annotation
- [ ] Create visual test flows
- [ ] Generate coverage heatmaps

## Success Metrics

### Immediate Goals (Phase 2.1-2.2)
- **Real Values**: 90% of test data preserved
- **Action Clarity**: 95% of steps have specific actions
- **Architecture**: Full HEA compliance

### Medium-term Goals (Phase 2.3-2.4)
- **Capture Success**: 85% successful captures
- **Categorization**: 80% accuracy
- **Performance**: <5s per test conversion

### Long-term Goals (Phase 2.5)
- **Template Usage**: 5+ professional templates
- **User Satisfaction**: 9/10 rating
- **Enterprise Adoption**: Production-ready

## Resource Requirements

### Technical
- Playwright for web automation
- iOS/Android development tools
- Diagram generation library
- Template engine (Handlebars/similar)

### Team
- 1-2 developers for core features
- 1 QA engineer for testing
- Technical writer for templates

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Platform-specific capture issues | Fallback to simulated capture |
| Performance degradation | Implement caching and lazy loading |
| Breaking changes | Comprehensive test suite |
| Complex setup requirements | Provide Docker containers |

## Next Steps

1. **Week 1**: Start with P0 features (real values, specific actions)
2. **Week 2**: Complete HEA architecture
3. **Week 3**: Implement real capture for web
4. **Week 4**: Add intelligence features
5. **Week 5**: Create professional templates

## Conclusion

This phased approach prioritizes high-impact, low-effort improvements first, gradually building toward full feature parity with the _aidev implementation. The focus on real value extraction and specific actions will immediately improve the usability of generated documentation.