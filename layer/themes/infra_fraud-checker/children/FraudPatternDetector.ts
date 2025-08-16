export interface FraudPattern {
  name: string;
  description: string;
  regex?: RegExp;
  detector: (content: string) => boolean;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Detects common fraud patterns in test code
 */
export class FraudPatternDetector {
  private patterns: FraudPattern[] = [
    {
      name: 'coverage-ignore',
      description: 'Coverage ignore comments',
      regex: /\/\*\s*istanbul\s+ignore|\/\/\s*c8\s+ignore|\/\*\s*c8\s+ignore/gi,
      detector: (content) => /\/\*\s*istanbul\s+ignore|\/\/\s*c8\s+ignore/.test(content),
      severity: 'medium'
    },
    {
      name: 'disabled-tests',
      description: 'Commented out tests',
      regex: /\/\/\s*(it|test|describe)\s*\(/gi,
      detector: (content) => /\/\/\s*(it|test|describe)\s*\(/.test(content),
      severity: 'low'
    },
    {
      name: 'todo-tests',
      description: 'TODO tests',
      regex: /\.(todo|skip)\s*\(/gi,
      detector: (content) => /\.(todo|skip)\s*\(/.test(content),
      severity: 'medium'
    },
    {
      name: 'fake-timeout',
      description: 'Zero timeout to skip tests',
      regex: /setTimeout\s*\(\s*[^,]+,\s*0\s*\)/gi,
      detector: (content) => /setTimeout\s*\(\s*[^,]+,\s*0\s*\)/.test(content),
      severity: 'medium'
    },
    {
      name: 'mocked-coverage',
      description: 'Direct coverage manipulation',
      regex: /__coverage__|global\.__coverage__/gi,
      detector: (content) => /__coverage__|global\.__coverage__/.test(content),
      severity: 'critical'
    },
    {
      name: 'no-op-test',
      description: 'Tests that do nothing',
      regex: /it\s*\([^)]+\)\s*{\s*}\s*\)/gi,
      detector: (content) => /it\s*\([^)]+\)\s*{\s*}\s*\)/.test(content),
      severity: 'high'
    },
    {
      name: 'always-passing',
      description: 'Tests that always pass',
      regex: /expect\s*\(\s*true\s*\)\s*\.\s*toBe\s*\(\s*true\s*\)/gi,
      detector: (content) => /expect\s*\(\s*true\s*\)\s*\.\s*toBe\s*\(\s*true\s*\)/.test(content),
      severity: 'critical'
    },
    {
      name: 'console-log-only',
      description: 'Tests with only console.log',
      regex: /it\s*\([^)]+\)\s*{\s*console\.log[^}]+}\s*\)/gi,
      detector: (content) => {
        const testBlocks = content.match(/it\s*\([^)]+\)\s*{[^}]+}/gi) || [];
        return testBlocks.some(block => {
          const hasConsoleLog = /console\.log/.test(block);
          const hasExpect = /expect|assert/.test(block);
          return hasConsoleLog && !hasExpect;
        });
      },
      severity: 'high'
    }
  ];

  detectPatterns(content: string): { pattern: FraudPattern; matches: RegExpMatchArray[] }[] {
    const results: { pattern: FraudPattern; matches: RegExpMatchArray[] }[] = [];

    for (const pattern of this.patterns) {
      if (pattern.detector(content)) {
        const matches = pattern.regex 
          ? Array.from(content.matchAll(pattern.regex))
          : [];
        
        results.push({ pattern, matches });
      }
    }

    return results;
  }

  addPattern(pattern: FraudPattern): void {
    this.patterns.push(pattern);
  }

  removePattern(name: string): void {
    this.patterns = this.patterns.filter(p => p.name !== name);
  }

  getPatterns(): FraudPattern[] {
    return [...this.patterns];
  }

  analyzeTestQuality(content: string): {
    score: number;
    issues: string[];
    recommendations: string[];
  } {
    const detectedPatterns = this.detectPatterns(content);
    let score = 100;
    const issues: string[] = [];
    const recommendations: string[] = [];

    const severityScores = {
      critical: 30,
      high: 20,
      medium: 10,
      low: 5
    };

    for (const { pattern, matches } of detectedPatterns) {
      score -= severityScores[pattern.severity] * Math.min(matches.length, 3);
      issues.push(`${pattern.description} found (${matches.length} occurrences)`);
    }

    // Add recommendations based on issues
    if (detectedPatterns.some(d => d.pattern.name === 'coverage-ignore')) {
      recommendations.push('Remove coverage ignore comments and fix the underlying issues');
    }

    if (detectedPatterns.some(d => d.pattern.name === 'disabled-tests')) {
      recommendations.push('Re-enable commented tests or remove them if obsolete');
    }

    if (detectedPatterns.some(d => d.pattern.name === 'always-passing')) {
      recommendations.push('Replace trivial assertions with meaningful test cases');
    }

    if (detectedPatterns.some(d => d.pattern.name === 'no-op-test')) {
      recommendations.push('Add assertions to empty test bodies');
    }

    return {
      score: Math.max(0, score),
      issues,
      recommendations
    };
  }
}