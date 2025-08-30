/**
 * Tests for Shell Script Detector
 */

import { shellScriptDetector } from '../detectors/shell-script-detector';
import { ViolationType, FraudSeverity } from '../types';

describe('ShellScriptDetector', () => {
  describe('detect', () => {
    it('should pass for short shell scripts (10 lines or less)', async () => {
      const shortScript = `#!/bin/bash
echo "Starting process"
cd /app
npm install
npm run build
echo "Process complete"`;
      
      const result = await shellScriptDetector.detect(shortScript, {
        source: 'deploy.sh'
      });
      
      expect(result.passed).toBe(true);
      expect(result.score).toBe(0);
      expect(result.violations).toHaveLength(0);
    });

    it('should fail for shell scripts with more than 10 lines', async () => {
      const longScript = `#!/bin/bash
set -e
echo "Starting deployment"
cd /app
git pull origin main
npm install
npm run test
npm run build
docker build -t myapp .
docker tag myapp:latest registry/myapp:latest
docker push registry/myapp:latest
kubectl apply -f k8s/
kubectl rollout status deployment/myapp
echo "Deployment complete"
send_notification "success"`;
      
      const result = await shellScriptDetector.detect(longScript, {
        source: 'deploy.sh'
      });
      
      expect(result.passed).toBe(false);
      expect(result.score).toBeGreaterThan(0);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].type).toBe(ViolationType.SUSPICIOUS_PATTERN);
      expect(result.violations[0].message).toContain('Do not put logic in shell scripts');
    });

    it('should detect complex patterns in shell scripts', async () => {
      const complexScript = `#!/bin/bash
function deploy() {
  for env in dev staging prod; do
    if [[ $1 == $env ]]; then
      case $env in
        dev)
          echo "Deploying to dev"
          ;;
        staging)
          echo "Deploying to staging"
          ;;
        prod)
          echo "Deploying to prod"
          ;;
      esac
    fi
  done
}
deploy $1`;
      
      const result = await shellScriptDetector.detect(complexScript, {
        source: 'complex-deploy.sh'
      });
      
      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      
      const complexPatternViolation = result.violations.find(v => v.message.includes('complex patterns'));
      expect(complexPatternViolation).toBeDefined();
    });

    it('should detect shell scripts by shebang', async () => {
      const scriptWithoutExtension = `#!/usr/bin/env bash
echo "Line 1"
echo "Line 2"
echo "Line 3"
echo "Line 4"
echo "Line 5"
echo "Line 6"
echo "Line 7"
echo "Line 8"
echo "Line 9"
echo "Line 10"
echo "Line 11"
echo "Line 12"`;
      
      const result = await shellScriptDetector.detect(scriptWithoutExtension);
      
      expect(result.passed).toBe(false);
      expect(result.metadata.shellScriptDetected).toBe(true);
    });

    it('should detect PowerShell scripts', async () => {
      const psScript = `#!/usr/bin/env powershell
Write-Host "Starting"
$var1 = "value1"
$var2 = "value2"
$var3 = "value3"
$var4 = "value4"
$var5 = "value5"
$var6 = "value6"
$var7 = "value7"
$var8 = "value8"
$var9 = "value9"
$var10 = "value10"
Write-Host "Done"`;
      
      const result = await shellScriptDetector.detect(psScript, {
        source: 'script.ps1'
      });
      
      expect(result.passed).toBe(false);
      expect(result.metadata.shellScriptDetected).toBe(true);
    });

    it('should detect batch files', async () => {
      const batScript = `@echo off
echo Line 1
echo Line 2
echo Line 3
echo Line 4
echo Line 5
echo Line 6
echo Line 7
echo Line 8
echo Line 9
echo Line 10
echo Line 11
echo Line 12`;
      
      const result = await shellScriptDetector.detect(batScript, {
        source: 'script.bat'
      });
      
      expect(result.passed).toBe(false);
      expect(result.metadata.shellScriptDetected).toBe(true);
    });

    it('should ignore comments and empty lines in line count', async () => {
      const scriptWithComments = `#!/bin/bash
# This is a comment
echo "Line 1"

# Another comment
echo "Line 2"

echo "Line 3"
# More comments
echo "Line 4"`;
      
      const result = await shellScriptDetector.detect(scriptWithComments, {
        source: 'script.sh'
      });
      
      expect(result.passed).toBe(true);
      expect(result.score).toBe(0);
    });

    it('should calculate severity based on line count', async () => {
      const generateScript = (lines: number): string => {
        let script = '#!/bin/bash\n';
        for (let i = 0; i < lines; i++) {
          script += `echo "Line ${i + 1}"\n`;
        }
        return script;
      };

      // Test LOW severity (11-15 lines)
      const lowResult = await shellScriptDetector.detect(generateScript(13), {
        source: 'script.sh'
      });
      expect(lowResult.violations[0].severity).toBe(FraudSeverity.LOW);

      // Test MEDIUM severity (16-30 lines)
      const mediumResult = await shellScriptDetector.detect(generateScript(25), {
        source: 'script.sh'
      });
      expect(mediumResult.violations[0].severity).toBe(FraudSeverity.MEDIUM);

      // Test HIGH severity (31-50 lines)
      const highResult = await shellScriptDetector.detect(generateScript(40), {
        source: 'script.sh'
      });
      expect(highResult.violations[0].severity).toBe(FraudSeverity.HIGH);

      // Test CRITICAL severity (>50 lines)
      const criticalResult = await shellScriptDetector.detect(generateScript(60), {
        source: 'script.sh'
      });
      expect(criticalResult.violations[0].severity).toBe(FraudSeverity.CRITICAL);
    });

    it('should not detect non-shell scripts', async () => {
      const jsCode = `function deploy() {
  console.log("Deploying");
  for (let i = 0; i < 20; i++) {
    console.log("Line", i);
  }
}`;
      
      const result = await shellScriptDetector.detect(jsCode, {
        source: 'deploy.js'
      });
      
      expect(result.passed).toBe(true);
      expect(result.metadata.shellScriptDetected).toBe(false);
    });
  });
});