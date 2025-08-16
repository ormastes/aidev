"use strict";
/**
 * Shell Script Detector
 *
 * Detects shell scripts with excessive logic and adds warnings.
 * Scripts with more than 10 lines are flagged as potentially problematic.
 *
 * WARNING: Do not put logic in shell scripts - use proper programming languages instead.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.shellScriptDetector = exports.ShellScriptDetector = void 0;
const types_1 = require("../types");
class ShellScriptDetector {
    constructor() {
        this.name = "ShellScriptDetector";
        this.MAX_ALLOWED_LINES = 10;
        this.SHELL_EXTENSIONS = ['.sh', '.bat', '.ps1', '.bash', '.zsh', '.fish', '.cmd'];
    }
    async detect(input, context) {
        const violations = [];
        let score = 0;
        // Check if input is a file path or content
        const isShellScript = this.isShellScript(input, context);
        if (isShellScript) {
            const content = typeof input === 'string' ? input : input.content || '';
            const lines = this.countNonEmptyLines(content);
            if (lines > this.MAX_ALLOWED_LINES) {
                const severity = this.calculateSeverity(lines);
                const scoreImpact = this.calculateScoreImpact(severity);
                score += scoreImpact;
                violations.push({
                    type: types_1.ViolationType.SUSPICIOUS_PATTERN,
                    severity,
                    message: `Shell script contains ${lines} lines of code (max recommended: ${this.MAX_ALLOWED_LINES}). WARNING: Do not put logic in shell scripts - use proper programming languages for complex logic.`,
                    location: context?.source || 'unknown',
                    evidence: {
                        lineCount: lines,
                        maxAllowed: this.MAX_ALLOWED_LINES,
                        recommendation: 'Refactor complex shell script logic into a proper programming language (Python, Node.js, etc.)'
                    }
                });
            }
            // Check for complex patterns that shouldn't be in shell scripts
            const complexPatterns = this.detectComplexPatterns(content);
            if (complexPatterns.length > 0) {
                score += 15; // Additional penalty for complex patterns
                violations.push({
                    type: types_1.ViolationType.SUSPICIOUS_PATTERN,
                    severity: types_1.FraudSeverity.MEDIUM,
                    message: `Shell script contains complex patterns: ${complexPatterns.join(', ')}. These should be implemented in a proper programming language.`,
                    location: context?.source || 'unknown',
                    evidence: {
                        patterns: complexPatterns
                    }
                });
            }
        }
        return {
            passed: violations.length === 0,
            score: Math.min(score, 100),
            violations,
            timestamp: new Date(),
            checkType: types_1.FraudCheckType.PATTERN_MATCHING,
            metadata: {
                detector: this.name,
                shellScriptDetected: isShellScript
            }
        };
    }
    isShellScript(input, context) {
        // Check by file extension if available
        const source = context?.source || '';
        if (source && this.SHELL_EXTENSIONS.some(ext => source.toLowerCase().endsWith(ext))) {
            return true;
        }
        // Check by content patterns (shebang)
        const content = typeof input === 'string' ? input : input.content || '';
        const shebangPatterns = [
            /^#!\/bin\/bash/,
            /^#!\/bin\/sh/,
            /^#!\/usr\/bin\/env bash/,
            /^#!\/usr\/bin\/env sh/,
            /^#!\/bin\/zsh/,
            /^#!\/usr\/bin\/env zsh/,
            /^#!\/usr\/bin\/env fish/,
            /^#!\/usr\/bin\/env powershell/
        ];
        return shebangPatterns.some(pattern => pattern.test(content.trim()));
    }
    countNonEmptyLines(content) {
        return content
            .split('\n')
            .filter(line => {
            const trimmed = line.trim();
            // Ignore empty lines and pure comment lines
            return trimmed.length > 0 && !trimmed.startsWith('#') && !trimmed.startsWith('::') && !trimmed.startsWith('REM');
        })
            .length;
    }
    calculateSeverity(lines) {
        if (lines <= 15)
            return types_1.FraudSeverity.LOW;
        if (lines <= 30)
            return types_1.FraudSeverity.MEDIUM;
        if (lines <= 50)
            return types_1.FraudSeverity.HIGH;
        return types_1.FraudSeverity.CRITICAL;
    }
    calculateScoreImpact(severity) {
        switch (severity) {
            case types_1.FraudSeverity.LOW: return 15;
            case types_1.FraudSeverity.MEDIUM: return 35;
            case types_1.FraudSeverity.HIGH: return 60;
            case types_1.FraudSeverity.CRITICAL: return 85;
            default: return 0;
        }
    }
    detectComplexPatterns(content) {
        const complexPatterns = [];
        // Patterns that indicate complex logic
        const patterns = {
            'nested loops': /for.*\n.*for|while.*\n.*while/gi,
            "functions": /function\s+\w+\s*\(|^\w+\s*\(\)\s*{/gm,
            'case statements': /case\s+.*\s+in/gi,
            'array operations': /\${.*\[@\]}/g,
            'complex conditionals': /if.*&&.*\|\|.*then/gi,
            'recursive calls': /\$0|\$\{0\}/g,
            'eval usage': /eval\s+/gi,
            'complex regex': /sed\s+.*[{}]|awk\s+.*[{}]/gi
        };
        for (const [name, pattern] of Object.entries(patterns)) {
            if (pattern.test(content)) {
                complexPatterns.push(name);
            }
        }
        return complexPatterns;
    }
}
exports.ShellScriptDetector = ShellScriptDetector;
exports.shellScriptDetector = new ShellScriptDetector();
