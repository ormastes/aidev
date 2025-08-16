#!/usr/bin/env node

/**
 * System Test Verification Script
 * Verifies that our system tests are truly mock-free and use real E2E interactions
 */

import { fs } from '../../layer/themes/infra_external-log-lib/src';
import { path } from '../../layer/themes/infra_external-log-lib/src';

interface TestAnalysis {
  fileName: string;
  isMockFree: boolean;
  usesRealInteractions: boolean;
  usesPlaywright: boolean;
  issues: string[];
  score: number;
}

const TEST_DIR = path.join(__dirname, 'e2e');

function analyzeTestFile(filePath: string): TestAnalysis {
  const fileName = path.basename(filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const issues: string[] = [];
  
  // Check for actual mock implementation usage (not just comments about being mock-free)
  const mockImplementationUsage = [
    /createMock|mockResponse|MockProcess/g,
    /\.mock\(|\.stub\(/g,
    /sinon\.|jest\.mock/g,
    /TestDataGenerator\.generate/g,
    /writeFileSync.*#!/g  // Hardcoded executable scripts
  ];
  
  const isMockFree = !mockImplementationUsage.some(pattern => pattern.test(content));
  if (!isMockFree) {
    issues.push('Contains actual mock implementations');
  }
  
  // Check for real interactions
  const realInteractionPatterns = [
    /\.click\(/g,
    /\.type\(/g,
    /\.keyboard\.press/g,
    /\.dblclick\(/g,
    /\.fill\(/g,
    /spawn\(/g,
    /executeCommand/g
  ];
  
  const usesRealInteractions = realInteractionPatterns.some(pattern => pattern.test(content));
  if (!usesRealInteractions) {
    issues.push('Does not use real UI interactions (click, type, keyboard)');
  }
  
  // Check for Playwright usage
  const usesPlaywright = content.includes('@playwright/test') || content.includes('test(') || content.includes('expect(');
  if (!usesPlaywright) {
    issues.push('Does not use Playwright test framework');
  }
  
  // Check for hardcoded responses
  if (content.includes("writeFileSync") && content.includes('#!/bin/bash')) {
    issues.push('Uses hardcoded script responses instead of real executables');
  }
  
  // Check for VSCode automation
  if (!content.includes('VSCode') && !content.includes('vscode')) {
    issues.push('Does not appear to test VSCode integration');
  }
  
  // Check for actual process execution
  const hasRealProcesses = content.includes('spawn(') && !content.includes("mockProcess");
  if (!hasRealProcesses && fileName.includes('system')) {
    issues.push('System test should use real process execution');
  }
  
  // Calculate score
  let score = 0;
  if (isMockFree) score += 30;
  if (usesRealInteractions) score += 25;
  if (usesPlaywright) score += 20;
  if (hasRealProcesses) score += 15;
  if (issues.length === 0) score += 10;
  
  return {
    fileName,
    isMockFree,
    usesRealInteractions,
    usesPlaywright,
    issues,
    score
  };
}

function main() {
  console.log('🔍 Analyzing System Tests for Mock-Free E2E Quality\n');
  
  const testFiles = fs.readdirSync(TEST_DIR)
    .filter(file => file.endsWith('.test.ts'))
    .map(file => path.join(TEST_DIR, file));
  
  const analyses: TestAnalysis[] = [];
  
  for (const filePath of testFiles) {
    const analysis = analyzeTestFile(filePath);
    analyses.push(analysis);
  }
  
  // Sort by score (highest first)
  analyses.sort((a, b) => b.score - a.score);
  
  console.log('📊 Test Quality Analysis Results:\n');
  console.log('File'.padEnd(30) + 'Mock-Free'.padEnd(12) + 'Real UI'.padEnd(10) + "Playwright".padEnd(12) + 'Score'.padEnd(8) + 'Issues');
  console.log('─'.repeat(100));
  
  for (const analysis of analyses) {
    const mockFree = analysis.isMockFree ? '✅' : '❌';
    const realUI = analysis.usesRealInteractions ? '✅' : '❌';
    const playwright = analysis.usesPlaywright ? '✅' : '❌';
    const issues = analysis.issues.length === 0 ? 'None' : analysis.issues.length.toString();
    
    console.log(
      analysis.fileName.padEnd(30) +
      mockFree.padEnd(12) +
      realUI.padEnd(10) +
      playwright.padEnd(12) +
      `${analysis.score}/100`.padEnd(8) +
      issues
    );
  }
  
  // Detailed issues for problematic tests
  console.log('\n🚨 Detailed Issues:\n');
  
  for (const analysis of analyses) {
    if (analysis.issues.length > 0) {
      console.log(`${analysis.fileName}:`);
      for (const issue of analysis.issues) {
        console.log(`  • ${issue}`);
      }
      console.log();
    }
  }
  
  // Summary
  const highQualityTests = analyses.filter(a => a.score >= 80);
  const mockFreeTests = analyses.filter(a => a.isMockFree);
  const realInteractionTests = analyses.filter(a => a.usesRealInteractions);
  
  console.log('📈 Summary:');
  console.log(`  Total Tests: ${analyses.length}`);
  console.log(`  High Quality (≥80 score): ${highQualityTests.length}`);
  console.log(`  Mock-Free Tests: ${mockFreeTests.length}`);
  console.log(`  Real UI Interaction Tests: ${realInteractionTests.length}`);
  
  if (highQualityTests.length === 0) {
    console.log('\n❌ No high-quality mock-free E2E tests found!');
    console.log('Recommendation: Focus on improving system-test-mockless.test.ts');
    process.exit(1);
  } else {
    console.log(`\n✅ Found ${highQualityTests.length} high-quality mock-free E2E tests`);
    console.log('Top recommendations:');
    for (const test of highQualityTests.slice(0, 3)) {
      console.log(`  • ${test.fileName} (Score: ${test.score}/100)`);
    }
  }
}

if (require.main === module) {
  main();
}