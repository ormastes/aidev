/**
 * Shell Script Detector
 *
 * Detects shell scripts with excessive logic and adds warnings.
 * Scripts with more than 10 lines are flagged as potentially problematic.
 *
 * WARNING: Do not put logic in shell scripts - use proper programming languages instead.
 */
import { FraudDetector, FraudCheckResult, FraudContext } from '../types';
export declare class ShellScriptDetector implements FraudDetector {
    name: string;
    private readonly MAX_ALLOWED_LINES;
    private readonly SHELL_EXTENSIONS;
    detect(input: any, context?: FraudContext): Promise<FraudCheckResult>;
    private isShellScript;
    private countNonEmptyLines;
    private calculateSeverity;
    private calculateScoreImpact;
    private detectComplexPatterns;
}
export declare const shellScriptDetector: ShellScriptDetector;
