#!/usr/bin/env node

import { execSync } from 'child_process';
import { fs } from '../../infra_external-log-lib/src';
import { path } from '../../infra_external-log-lib/src';

interface CoverageReport {
  total: {
    lines: { pct: number; total: number; covered: number };
    statements: { pct: number; total: number; covered: number };
    functions: { pct: number; total: number; covered: number };
    branches: { pct: number; total: number; covered: number };
  };
  files: Record<string, any>;
}

/**
 * Generate and analyze coverage report for LSP-MCP theme
 */
async function generateCoverageReport() {
  console.log('🔍 LSP-MCP Coverage Report Generator\n');
  
  try {
    // Run tests with coverage
    console.log('Running tests with coverage...');
    execSync('npm run test:coverage', { stdio: 'inherit' });
    
    // Read coverage summary
    const coveragePath = path.join(__dirname, '..', 'coverage', 'coverage-summary.json');
    if (!fs.existsSync(coveragePath)) {
      console.error('❌ Coverage summary not found. Run tests first.');
      process.exit(1);
    }
    
    const coverage: CoverageReport = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));
    
    // Analyze coverage
    console.log('\n📊 Coverage Summary:');
    console.log('═══════════════════════════════════════════════════════');
    
    const metrics = ['lines', 'statements', 'functions', 'branches'] as const;
    for (const metric of metrics) {
      const data = coverage.total[metric];
      const emoji = data.pct >= 80 ? '✅' : data.pct >= 60 ? '⚠️' : '❌';
      console.log(`${emoji} ${metric.padEnd(12)}: ${data.pct.toFixed(2)}% (${data.covered}/${data.total})`);
    }
    
    // Find uncovered files
    console.log('\n📁 File Coverage:');
    console.log('═══════════════════════════════════════════════════════');
    
    const files = Object.entries(coverage.files)
      .filter(([path]) => !path.includes('node_modules'))
      .sort(([, a], [, b]) => a.lines.pct - b.lines.pct);
    
    for (const [filePath, fileData] of files) {
      const relativePath = path.relative(process.cwd(), filePath);
      const pct = fileData.lines.pct;
      const emoji = pct >= 80 ? '✅' : pct >= 60 ? '⚠️' : '❌';
      console.log(`${emoji} ${relativePath.padEnd(50)} ${pct.toFixed(2)}%`);
    }
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    console.log('═══════════════════════════════════════════════════════');
    
    if (coverage.total.lines.pct < 80) {
      console.log('⚠️  Overall coverage is below 80%. Focus on:');
      
      const lowCoverageFiles = files.filter(([, data]) => data.lines.pct < 60);
      if (lowCoverageFiles.length > 0) {
        console.log('\n   Files with low coverage:');
        lowCoverageFiles.slice(0, 5).forEach(([filePath]) => {
          console.log(`   - ${path.relative(process.cwd(), filePath)}`);
        });
      }
      
      if (coverage.total.branches.pct < coverage.total.lines.pct - 10) {
        console.log('\n   ⚠️  Branch coverage is significantly lower than line coverage.');
        console.log('   Add tests for conditional logic and edge cases.');
      }
      
      if (coverage.total.functions.pct < 100) {
        const uncoveredFunctions = coverage.total.functions.total - coverage.total.functions.covered;
        console.log(`\n   📝 ${uncoveredFunctions} functions are not tested.`);
      }
    } else {
      console.log('✅ Good coverage! Consider:');
      console.log('   - Adding edge case tests');
      console.log('   - Testing error scenarios');
      console.log('   - Integration tests for complex workflows');
    }
    
    // Check duplication
    console.log('\n🔍 Checking for code duplication...');
    await checkDuplication();
    
    // Summary
    const overallScore = calculateQualityScore(coverage);
    console.log('\n📈 Overall Quality Score: ' + getScoreEmoji(overallScore) + ` ${overallScore}/100`);
    
    if (overallScore < 90) {
      console.log('\n⚡ To reach 90/100 quality score:');
      const needed = 90 - overallScore;
      console.log(`   Need to improve coverage by ~${needed}%`);
    }
    
  } catch (error) {
    console.error('❌ Error generating coverage report:', error);
    process.exit(1);
  }
}

async function checkDuplication() {
  const sourceFiles = [
    'pipe/index.ts',
    'children/LSPClient.ts',
    'children/RequestMapper.ts',
    'children/TypeAnalyzer.ts'
  ];
  
  const patterns = new Map<string, string[]>();
  
  // Simple pattern detection (in real implementation, use AST analysis)
  for (const file of sourceFiles) {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Check for duplicated error handling
      const errorPatterns = content.match(/catch\s*\([^)]+\)\s*{[^}]+}/g) || [];
      errorPatterns.forEach(pattern => {
        const normalized = pattern.replace(/\s+/g, ' ').trim();
        const files = patterns.get(normalized) || [];
        files.push(file);
        patterns.set(normalized, files);
      });
      
      // Check for duplicated type conversions
      const conversionPatterns = content.match(/\w+\s*:\s*\w+\s*=>\s*{[^}]+}/g) || [];
      conversionPatterns.forEach(pattern => {
        if (pattern.length > 50) { // Only consider substantial patterns
          const normalized = pattern.replace(/\s+/g, ' ').trim();
          const files = patterns.get(normalized) || [];
          files.push(file);
          patterns.set(normalized, files);
        }
      });
    }
  }
  
  // Report duplications
  let duplicationsFound = 0;
  for (const [pattern, files] of patterns.entries()) {
    if (files.length > 1) {
      duplicationsFound++;
      console.log(`\n   ⚠️  Duplication found in: ${files.join(', ')}`);
      console.log(`      Pattern: ${pattern.substring(0, 50)}...`);
    }
  }
  
  if (duplicationsFound === 0) {
    console.log('   ✅ No significant code duplication detected');
  } else {
    console.log(`\n   Found ${duplicationsFound} duplication patterns`);
    console.log('   Consider extracting common logic to shared utilities');
  }
}

function calculateQualityScore(coverage: CoverageReport): number {
  const weights = {
    lines: 0.3,
    statements: 0.2,
    functions: 0.3,
    branches: 0.2
  };
  
  let score = 0;
  for (const [metric, weight] of Object.entries(weights) as [keyof typeof weights, number][]) {
    score += coverage.total[metric].pct * weight;
  }
  
  return Math.round(score);
}

function getScoreEmoji(score: number): string {
  if (score >= 90) return '🏆';
  if (score >= 80) return '✅';
  if (score >= 70) return '📊';
  if (score >= 60) return '⚠️';
  return '❌';
}

// Run the report generator
if (require.main === module) {
  generateCoverageReport().catch(console.error);
}

export { generateCoverageReport };