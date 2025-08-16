import { auditedFS } from '../../../infra_external-log-lib/pipe';
import { path } from '../../../infra_external-log-lib/src';

interface DependencyFraudResult {
  unusedDependencies: number;
  suspiciousDependencies: number;
  violations: DependencyViolation[];
}

interface DependencyViolation {
  dependency: string;
  type: 'unused' | "suspicious" | 'security-risk';
  reason: string;
}

export class DependencyFraudDetector {
  private suspiciousPatterns = [
    /^test-/,
    /^fake-/,
    /^mock-/,
    /-test$/,
    /-mock$/,
    /crypto-miner/,
    /backdoor/,
    /malware/
  ];

  async analyze(targetPath: string, mode: string): Promise<DependencyFraudResult> {
    const packageJsonPath = await this.findPackageJson(targetPath, mode);
    
    if (!packageJsonPath) {
      return {
        unusedDependencies: 0,
        suspiciousDependencies: 0,
        violations: []
      };
    }

    const packageJson = JSON.parse(await auditedFS.readFile(packageJsonPath, 'utf8'));
    const violations: DependencyViolation[] = [];

    // Check dependencies
    const allDeps = {
      ...packageJson.dependencies || {},
      ...packageJson.devDependencies || {}
    };

    let unusedCount = 0;
    let suspiciousCount = 0;

    for (const [dep, version] of Object.entries(allDeps)) {
      // Check for suspicious dependencies
      if (this.isSuspicious(dep)) {
        suspiciousCount++;
        violations.push({
          dependency: dep,
          type: "suspicious",
          reason: 'Dependency name matches suspicious pattern'
        });
      }

      // Check for unused dependencies (simplified check)
      const isUsed = await this.isDependencyUsed(dep, targetPath);
      if (!isUsed) {
        unusedCount++;
        violations.push({
          dependency: dep,
          type: 'unused',
          reason: 'Dependency appears to be unused in codebase'
        });
      }
    }

    return {
      unusedDependencies: unusedCount,
      suspiciousDependencies: suspiciousCount,
      violations
    };
  }

  private async findPackageJson(targetPath: string, mode: string): Promise<string | null> {
    const possiblePaths = [
      path.join(targetPath, 'package.json'),
      path.join(targetPath, '..', 'package.json'),
      path.join(targetPath, '..', '..', 'package.json')
    ];

    for (const p of possiblePaths) {
      try {
        await auditedFS.access(p);
        return p;
      } catch {
        continue;
      }
    }

    return null;
  }

  private isSuspicious(dep: string): boolean {
    return this.suspiciousPatterns.some(pattern => pattern.test(dep));
  }

  private async isDependencyUsed(dep: string, targetPath: string): Promise<boolean> {
    // Simplified check - in real implementation would scan all source files
    // For now, always return true for common dependencies
    const commonDeps = [
      'react', "typescript", 'jest', '@types/', 'eslint',
      'webpack', 'babel', 'express', 'lodash', 'axios'
    ];

    return commonDeps.some(common => dep.includes(common));
  }
}