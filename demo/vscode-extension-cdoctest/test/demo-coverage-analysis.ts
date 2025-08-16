#!/usr/bin/env node

/**
 * Demo Script: Class Coverage Analysis for System Tests
 * Demonstrates how to measure class coverage without running actual tests
 */

import { fs } from '../../layer/themes/infra_external-log-lib/src';
import { path } from '../../layer/themes/infra_external-log-lib/src';

interface ClassInfo {
  name: string;
  file: string;
  methods: string[];
  isInterface: boolean;
  isExported: boolean;
}

interface CoverageSimulation {
  totalClasses: number;  
  coveredClasses: number;
  classDetails: ClassInfo[];
  coverageByFile: Map<string, { total: number; covered: number; classes: ClassInfo[] }>;
}

class SystemTestClassAnalyzer {
  private projectRoot: string;
  private srcDir: string;

  constructor() {
    this.projectRoot = process.cwd();
    this.srcDir = path.join(this.projectRoot, 'src');
  }

  async analyzeClassStructure(): Promise<CoverageSimulation> {
    console.log('🔍 Analyzing Class Structure for System Test Coverage...\n');
    
    const allClasses: ClassInfo[] = [];
    const coverageByFile = new Map<string, { total: number; covered: number; classes: ClassInfo[] }>();
    
    // Recursively find all TypeScript files
    const tsFiles = await this.findTSFiles(this.srcDir);
    
    for (const filePath of tsFiles) {
      const classes = await this.extractClassesFromFile(filePath);
      allClasses.push(...classes);
      
      // Simulate coverage based on file type and class characteristics
      const fileCoverage = this.simulateCoverageForFile(filePath, classes);
      coverageByFile.set(filePath, fileCoverage);
    }
    
    const totalClasses = allClasses.length;
    const coveredClasses = Array.from(coverageByFile.values())
      .reduce((sum, fileCov) => sum + fileCov.covered, 0);
    
    return {
      totalClasses,
      coveredClasses,
      classDetails: allClasses,
      coverageByFile
    };
  }

  private async findTSFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          files.push(...await this.findTSFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
    
    return files;
  }

  private async extractClassesFromFile(filePath: string): Promise<ClassInfo[]> {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const classes: ClassInfo[] = [];
      
      // Extract classes (including exported ones)
      const classPattern = /(export\s+)?(abstract\s+)?class\s+(\w+)/g;
      let match;
      
      while ((match = classPattern.exec(content)) !== null) {
        const isExported = !!match[1];
        const className = match[3];
        const methods = this.extractMethodsFromClass(content, className);
        
        classes.push({
          name: className,
          file: path.relative(this.projectRoot, filePath),
          methods,
          isInterface: false,
          isExported
        });
      }
      
      // Extract interfaces as well
      const interfacePattern = /(export\s+)?interface\s+(\w+)/g;
      while ((match = interfacePattern.exec(content)) !== null) {
        const isExported = !!match[1];
        const interfaceName = match[2];
        
        classes.push({
          name: interfaceName,
          file: path.relative(this.projectRoot, filePath),
          methods: [],
          isInterface: true,
          isExported
        });
      }
      
      return classes;
    } catch (error) {
      return [];
    }
  }

  private extractMethodsFromClass(content: string, className: string): string[] {
    try {
      // Find the class definition
      const classRegex = new RegExp(`class\\s+${className}[^{]*{`);
      const classMatch = content.match(classRegex);
      if (!classMatch) return [];

      const classStart = classMatch.index! + classMatch[0].length;
      let braceCount = 1;
      let classEnd = classStart;
      
      // Find the end of the class
      for (let i = classStart; i < content.length && braceCount > 0; i++) {
        if (content[i] === '{') braceCount++;
        else if (content[i] === '}') braceCount--;
        classEnd = i;
      }
      
      const classBody = content.substring(classStart, classEnd);
      
      // Extract method names
      const methodPattern = /(?:public|private|protected|static|async|\s)*\s*(\w+)\s*\([^)]*\)\s*[:{]/g;
      const methods: string[] = [];
      let methodMatch;
      
      while ((methodMatch = methodPattern.exec(classBody)) !== null) {
        const methodName = methodMatch[1];
        if (methodName !== "constructor" && methodName !== className) {
          methods.push(methodName);
        }
      }
      
      return methods;
    } catch (error) {
      return [];
    }
  }

  private simulateCoverageForFile(filePath: string, classes: ClassInfo[]): { total: number; covered: number; classes: ClassInfo[] } {
    // Simulate coverage based on file types and known E2E test patterns
    const fileName = path.basename(filePath);
    const fileDir = path.dirname(filePath);
    
    let coverageRatio = 0;
    
    // High coverage for core files likely tested by E2E
    if (fileName.includes('extension.ts')) coverageRatio = 0.9;
    else if (fileName.includes("controller")) coverageRatio = 0.8;
    else if (fileName.includes('config')) coverageRatio = 0.7;
    else if (fileName.includes('runner')) coverageRatio = 0.8;
    else if (fileDir.includes('ctest')) coverageRatio = 0.6;
    else if (fileName.includes("pyAdapter")) coverageRatio = 0.5;
    else if (fileDir.includes('tclist_parser')) coverageRatio = 0.3; // Less likely to be tested by E2E
    else if (fileName.includes('util')) coverageRatio = 0.4;
    else if (fileName.includes("coverage")) coverageRatio = 0.1; // Coverage features not tested
    else coverageRatio = 0.4; // Default coverage
    
    const covered = Math.round(classes.length * coverageRatio);
    
    return {
      total: classes.length,
      covered,
      classes
    };
  }

  async generateReport(analysis: CoverageSimulation): Promise<void> {
    const reportPath = path.join(this.projectRoot, 'class-coverage-analysis.md');
    
    console.log('📊 Class Coverage Analysis Results:\n');
    console.log(`Total Classes Found: ${analysis.totalClasses}`);
    console.log(`Estimated Covered by E2E: ${analysis.coveredClasses}`);
    console.log(`Estimated Coverage: ${((analysis.coveredClasses / analysis.totalClasses) * 100).toFixed(1)}%\n`);
    
    // Group classes by coverage status
    const coveredClasses: ClassInfo[] = [];
    const uncoveredClasses: ClassInfo[] = [];
    
    for (const [filePath, fileCoverage] of analysis.coverageByFile) {
      const sortedClasses = fileCoverage.classes.sort((a, b) => a.name.localeCompare(b.name));
      const fileCovered = sortedClasses.slice(0, fileCoverage.covered);
      const fileUncovered = sortedClasses.slice(fileCoverage.covered);
      
      coveredClasses.push(...fileCovered);
      uncoveredClasses.push(...fileUncovered);
    }
    
    // Generate detailed report
    const report = `# System Test Class Coverage Analysis

## 📊 Summary

- **Total Classes:** ${analysis.totalClasses}
- **Estimated Covered:** ${analysis.coveredClasses}
- **Estimated Coverage:** ${((analysis.coveredClasses / analysis.totalClasses) * 100).toFixed(1)}%

## ✅ Classes Likely Covered by E2E System Tests

${coveredClasses.map(cls => `- **${cls.name}** (${cls.file}) ${cls.methods.length > 0 ? `- ${cls.methods.length} methods` : '- interface'}`).join('\n')}

## ❌ Classes Likely NOT Covered by E2E System Tests

${uncoveredClasses.map(cls => `- **${cls.name}** (${cls.file}) ${cls.methods.length > 0 ? `- ${cls.methods.length} methods` : '- interface'}`).join('\n')}

## 📂 Coverage by File

${Array.from(analysis.coverageByFile.entries()).map(([filePath, fileCov]) => {
  const relPath = path.relative(this.projectRoot, filePath);
  const coverage = fileCov.total > 0 ? ((fileCov.covered / fileCov.total) * 100).toFixed(0) : '0';
  return `- **${relPath}** - ${fileCov.covered}/${fileCov.total} classes (${coverage}%)`;
}).join('\n')}

## 🎯 High Priority Classes for E2E Testing

Based on the analysis, these classes are critical but may not be fully covered:

${uncoveredClasses
  .filter(cls => cls.file.includes("controller") || cls.file.includes('config') || cls.file.includes('handler') || cls.file.includes("extension"))
  .slice(0, 5)
  .map(cls => `- **${cls.name}** (${cls.file}) - Core functionality`)
  .join('\n')}

## 🛠️ Recommendations

1. **Add E2E tests** for uncovered controller and config classes
2. **Test coverage features** (MarkdownFileCoverage class)
3. **Test parser functionality** through file-based workflows
4. **Add error scenario testing** for better branch coverage

---
*This analysis is based on static code analysis and estimates. Run actual coverage measurement with \`npm run test:system:coverage\` for precise metrics.*
`;

    fs.writeFileSync(reportPath, report);
    console.log(`📄 Report written to: ${reportPath}`);
    
    // Print summary to console
    console.log('\n🎯 High Priority Classes for E2E Testing:');
    uncoveredClasses
      .filter(cls => cls.file.includes("controller") || cls.file.includes('config') || cls.file.includes('handler'))
      .slice(0, 5)
      .forEach(cls => console.log(`   - ${cls.name} (${cls.file})`));
  }
}

// Run the analysis
async function main() {
  try {
    const analyzer = new SystemTestClassAnalyzer();
    const analysis = await analyzer.analyzeClassStructure();
    await analyzer.generateReport(analysis);
    
    console.log('\n✅ Class coverage analysis complete!');
    
    // Exit with appropriate code based on estimated coverage
    const coveragePercentage = (analysis.coveredClasses / analysis.totalClasses) * 100;
    if (coveragePercentage >= 70) {
      console.log('🎉 Good estimated coverage!');
      process.exit(0);
    } else {
      console.log('⚠️ Coverage below target - consider adding more E2E tests');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}