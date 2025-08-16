#!/usr/bin/env bun
/**
 * Shell Script Analyzer and Migration Tool
 * Finds shell scripts longer than 10 lines and prepares them for migration
 */

import { readdir, readFile, stat } from 'fs/promises';
import { join, relative, extname } from 'path';

interface ScriptInfo {
  path: string;
  lines: number;
  size: number;
  complexity: 'simple' | 'medium' | 'complex';
  hasLoops: boolean;
  hasFunctions: boolean;
  hasConditionals: boolean;
  usesExternalCommands: boolean;
}

async function findShellScripts(dir: string, scripts: ScriptInfo[] = []): Promise<ScriptInfo[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      // Skip node_modules, .git, dist, build, coverage
      if (['node_modules', '.git', 'dist', 'build', 'coverage', '.jj', 'venv'].includes(entry.name)) {
        continue;
      }
      
      if (entry.isDirectory()) {
        await findShellScripts(fullPath, scripts);
      } else if (entry.name.endsWith('.sh')) {
        const scriptInfo = await analyzeScript(fullPath);
        if (scriptInfo && scriptInfo.lines > 10) {
          scripts.push(scriptInfo);
        }
      }
    }
  } catch (error) {
    // Ignore permission errors
  }
  
  return scripts;
}

async function analyzeScript(filePath: string): Promise<ScriptInfo | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const stats = await stat(filePath);
    
    // Count non-empty, non-comment lines
    const significantLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('#');
    }).length;
    
    // Analyze complexity
    const hasLoops = /\b(for|while|until)\b/.test(content);
    const hasFunctions = /\bfunction\s+\w+|^\w+\(\)\s*{/m.test(content);
    const hasConditionals = /\b(if|case|elif|else)\b/.test(content);
    const usesExternalCommands = /\b(curl|wget|git|npm|yarn|bun|python|node|docker|kubectl)\b/.test(content);
    
    const complexity = determineComplexity(
      significantLines,
      hasLoops,
      hasFunctions,
      hasConditionals,
      usesExternalCommands
    );
    
    return {
      path: filePath,
      lines: significantLines,
      size: stats.size,
      complexity,
      hasLoops,
      hasFunctions,
      hasConditionals,
      usesExternalCommands
    };
  } catch (error) {
    return null;
  }
}

function determineComplexity(
  lines: number,
  hasLoops: boolean,
  hasFunctions: boolean,
  hasConditionals: boolean,
  usesExternalCommands: boolean
): 'simple' | 'medium' | 'complex' {
  const features = [hasLoops, hasFunctions, hasConditionals, usesExternalCommands].filter(Boolean).length;
  
  if (lines > 100 || features >= 3) return 'complex';
  if (lines > 50 || features >= 2) return 'medium';
  return 'simple';
}

async function generateReport(scripts: ScriptInfo[]): Promise<void> {
  console.log('\n📊 Shell Script Analysis Report');
  console.log('================================\n');
  
  const total = scripts.length;
  const simple = scripts.filter(s => s.complexity === 'simple').length;
  const medium = scripts.filter(s => s.complexity === 'medium').length;
  const complex = scripts.filter(s => s.complexity === 'complex').length;
  
  console.log(`Total scripts found: ${total}`);
  console.log(`Simple: ${simple}, Medium: ${medium}, Complex: ${complex}\n`);
  
  // Group by directory
  const byDirectory = new Map<string, ScriptInfo[]>();
  scripts.forEach(script => {
    const dir = script.path.split('/').slice(0, -1).join('/');
    if (!byDirectory.has(dir)) {
      byDirectory.set(dir, []);
    }
    byDirectory.get(dir)!.push(script);
  });
  
  // Sort directories by number of scripts
  const sortedDirs = Array.from(byDirectory.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10); // Top 10 directories
  
  console.log('Top directories with shell scripts:');
  sortedDirs.forEach(([dir, scripts]) => {
    const relDir = relative('/home/ormastes/dev/aidev', dir) || '.';
    console.log(`  ${relDir}: ${scripts.length} scripts`);
  });
  
  console.log('\n📝 Scripts requiring migration (>10 lines):');
  console.log('─'.repeat(80));
  
  // Sort by complexity and lines
  const prioritized = scripts.sort((a, b) => {
    if (a.complexity !== b.complexity) {
      const order = { complex: 3, medium: 2, simple: 1 };
      return order[b.complexity] - order[a.complexity];
    }
    return b.lines - a.lines;
  });
  
  prioritized.slice(0, 20).forEach((script, index) => {
    const relPath = relative('/home/ormastes/dev/aidev', script.path);
    console.log(`\n${index + 1}. ${relPath}`);
    console.log(`   Lines: ${script.lines} | Complexity: ${script.complexity}`);
    console.log(`   Features: ${[
      script.hasLoops && 'loops',
      script.hasFunctions && 'functions', 
      script.hasConditionals && 'conditionals',
      script.usesExternalCommands && 'external-commands'
    ].filter(Boolean).join(', ') || 'none'}`);
  });
  
  // Generate migration plan
  console.log('\n\n🔄 Migration Plan:');
  console.log('==================\n');
  
  const migrationPlan = {
    phase1_simple: prioritized.filter(s => s.complexity === 'simple').slice(0, 5),
    phase2_medium: prioritized.filter(s => s.complexity === 'medium').slice(0, 5),
    phase3_complex: prioritized.filter(s => s.complexity === 'complex').slice(0, 5)
  };
  
  console.log('Phase 1 - Simple Scripts (can be automated):');
  migrationPlan.phase1_simple.forEach(s => {
    console.log(`  - ${relative('/home/ormastes/dev/aidev', s.path)}`);
  });
  
  console.log('\nPhase 2 - Medium Complexity (semi-automated):');
  migrationPlan.phase2_medium.forEach(s => {
    console.log(`  - ${relative('/home/ormastes/dev/aidev', s.path)}`);
  });
  
  console.log('\nPhase 3 - Complex Scripts (manual review needed):');
  migrationPlan.phase3_complex.forEach(s => {
    console.log(`  - ${relative('/home/ormastes/dev/aidev', s.path)}`);
  });
  
  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    summary: { total, simple, medium, complex },
    scripts: prioritized.map(s => ({
      ...s,
      path: relative('/home/ormastes/dev/aidev', s.path)
    })),
    migrationPlan
  };
  
  await Bun.write(
    '/home/ormastes/dev/aidev/gen/doc/shell-scripts-analysis.json',
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n✅ Detailed report saved to gen/doc/shell-scripts-analysis.json');
}

// Main execution
async function main() {
  console.log('🔍 Analyzing shell scripts in the project...\n');
  
  const projectRoot = '/home/ormastes/dev/aidev';
  const scripts = await findShellScripts(projectRoot);
  
  if (scripts.length === 0) {
    console.log('No shell scripts longer than 10 lines found.');
    return;
  }
  
  await generateReport(scripts);
}

main().catch(console.error);