/**
 * C++ Coverage Report Setup Service
 * Generates and manages coverage reports in multiple formats
 */

import * as fs from 'fs/promises';
import { path } from '../../../infra_external-log-lib/src';
import { exec } from 'child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export interface ReportConfig {
  formats: ReportFormat[];
  outputDirectory: string;
  includeSourceCode: boolean;
  includeBranchDetails: boolean;
  includeFileList: boolean;
  generateBadges: boolean;
  uploadToCodecov: boolean;
  customTemplate?: string;
  mergeReports: boolean;
  historicalTracking: boolean;
}

export type ReportFormat = 'html' | 'json' | 'lcov' | 'xml' | "markdown" | 'badge' | 'console';

export interface ReportMetadata {
  generatedAt: string;
  projectName: string;
  commitHash?: string;
  branch?: string;
  buildNumber?: string;
  testSuite?: string;
}

export interface HistoricalData {
  date: string;
  commit: string;
  coverage: {
    line: number;
    branch: number;
    function: number;
    class: number;
  };
}

export class CppReportSetup {
  private defaultConfig: ReportConfig = {
    formats: ['html', 'json', 'lcov', 'console'],
    outputDirectory: "coverage",
    includeSourceCode: true,
    includeBranchDetails: true,
    includeFileList: true,
    generateBadges: true,
    uploadToCodecov: false,
    mergeReports: false,
    historicalTracking: true
  };

  async setup(projectPath: string, config?: Partial<ReportConfig>): Promise<void> {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    console.log(`📈 Setting up coverage reporting for: ${projectPath}`);
    
    // Create report directories
    await this.createReportDirectories(projectPath, finalConfig);
    
    // Write report configuration
    await this.writeConfig(projectPath, finalConfig);
    
    // Create report generation scripts
    await this.createReportScripts(projectPath, finalConfig);
    
    // Setup historical tracking if enabled
    if (finalConfig.historicalTracking) {
      await this.setupHistoricalTracking(projectPath);
    }
    
    // Setup badge generation if enabled
    if (finalConfig.generateBadges) {
      await this.setupBadgeGeneration(projectPath);
    }
    
    console.log('✅ Report setup complete!');
  }

  private async createReportDirectories(projectPath: string, config: ReportConfig): Promise<void> {
    const dirs = [
      path.join(projectPath, config.outputDirectory),
      path.join(projectPath, config.outputDirectory, 'html'),
      path.join(projectPath, config.outputDirectory, 'json'),
      path.join(projectPath, config.outputDirectory, 'badges'),
      path.join(projectPath, config.outputDirectory, 'history')
    ];
    
    for (const dir of dirs) {
      await fileAPI.createDirectory(dir);
    }
  }

  private async writeConfig(projectPath: string, config: ReportConfig): Promise<void> {
    const configPath = path.join(projectPath, '.coverage', 'report-config.json');
    await fileAPI.createFile(configPath, JSON.stringify(config, { type: FileType.REPORT }));
  }

  private async createReportScripts(projectPath: string, config: ReportConfig): Promise<void> {
    // Main report generation script
    const mainScript = `#!/bin/bash
# Generate coverage reports in multiple formats

set -e

echo "📊 Generating coverage reports..."

# Detect build directory
BUILD_DIR=\${1:-build}
if [ ! -d "$BUILD_DIR" ]; then
    echo "❌ Build directory not found: $BUILD_DIR"
    exit 1
fi

# Create output directory
OUTPUT_DIR="${config.outputDirectory}"
mkdir -p "$OUTPUT_DIR"

# Get git metadata
COMMIT_HASH=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
PROJECT_NAME=$(basename "$PWD")

# Generate reports based on configuration
${this.generateReportCommands(config)}

echo "✅ Reports generated in $OUTPUT_DIR/"
`;
    
    const scriptPath = path.join(projectPath, '.coverage', 'generate-reports.sh');
    await fileAPI.createFile(scriptPath, mainScript, { type: FileType.REPORT });
    await fs.chmod(scriptPath, { type: FileType.TEMPORARY });
    
    // Format-specific scripts
    for (const format of config.formats) {
      await this.createFormatScript(projectPath, format, config);
    }
  }

  private generateReportCommands(config: ReportConfig): string {
    const commands: string[] = [];
    
    // Check for LLVM or GCC tools
    commands.push(`
# Detect coverage tool
if command -v llvm-cov &> /dev/null; then
    COVERAGE_TOOL="llvm"
elif command -v gcov &> /dev/null; then
    COVERAGE_TOOL="gcc"
else
    echo "❌ No coverage tool found (llvm-cov or gcov required)"
    exit 1
fi
`);
    
    // Generate each format
    if (config.formats.includes('html')) {
      commands.push(`
# HTML report
echo "Generating HTML report..."
if [ "$COVERAGE_TOOL" = "llvm" ]; then
    llvm-cov show $BUILD_DIR/test_runner \\
        -instr-profile=$BUILD_DIR/default.profdata \\
        -format=html \\
        -output-dir=$OUTPUT_DIR/html \\
        ${config.includeSourceCode ? '-show-line-counts-or-regions' : ''} \\
        ${config.includeBranchDetails ? '-show-branches=count' : ''}
else
    genhtml coverage.info \\
        --output-directory $OUTPUT_DIR/html \\
        ${config.includeBranchDetails ? '--branch-coverage' : ''} \\
        --title "$PROJECT_NAME Coverage Report"
fi
`);
    }
    
    if (config.formats.includes('json')) {
      commands.push(`
# JSON report
echo "Generating JSON report..."
if [ "$COVERAGE_TOOL" = "llvm" ]; then
    llvm-cov export $BUILD_DIR/test_runner \\
        -instr-profile=$BUILD_DIR/default.profdata \\
        -format=json > $OUTPUT_DIR/json/coverage.json
else
    # Convert lcov to JSON
    node -e "
    const fs = require('../../layer/themes/infra_external-log-lib/src');
    const lcov = fileAPI.readFileSync('coverage.info', 'utf-8');
    // Simple lcov to JSON conversion
    const json = { /* conversion logic */ };
    await fileAPI.createFile('$OUTPUT_DIR/json/coverage.json', JSON.stringify(json, { type: FileType.TEMPORARY }));
    "
fi
`);
    }
    
    if (config.formats.includes('lcov')) {
      commands.push(`
# LCOV report
echo "Generating LCOV report..."
if [ "$COVERAGE_TOOL" = "llvm" ]; then
    llvm-cov export $BUILD_DIR/test_runner \\
        -instr-profile=$BUILD_DIR/default.profdata \\
        -format=lcov > $OUTPUT_DIR/coverage.lcov
else
    cp coverage.info $OUTPUT_DIR/coverage.lcov
fi
`);
    }
    
    if (config.formats.includes("markdown")) {
      commands.push(`
# Markdown report
echo "Generating Markdown report..."
node -e "
const { CppReportGenerator } = require('@aidev/init_setup-folder');
const generator = new CppReportGenerator();
generator.generateMarkdown('$OUTPUT_DIR/json/coverage.json', '$OUTPUT_DIR/coverage.md');
"
`);
    }
    
    if (config.generateBadges) {
      commands.push(`
# Generate badges
echo "Generating coverage badges..."
./.coverage/generate-badges.sh
`);
    }
    
    if (config.historicalTracking) {
      commands.push(`
# Update historical data
echo "Updating historical tracking..."
./.coverage/update-history.sh "$COMMIT_HASH" "$OUTPUT_DIR/json/coverage.json"
`);
    }
    
    return commands.join('\n');
  }

  private async createFormatScript(
    projectPath: string,
    format: ReportFormat,
    config: ReportConfig
  ): Promise<void> {
    let script = '';
    
    switch (format) {
      case 'console':
        script = `#!/bin/bash
# Console coverage report

if command -v llvm-cov &> /dev/null; then
    llvm-cov report $1/test_runner -instr-profile=$1/default.profdata
elif command -v gcov &> /dev/null; then
    lcov --list coverage.info
fi
`;
        break;
        
      case 'badge':
        script = `#!/bin/bash
# Generate coverage badges

OUTPUT_DIR="${config.outputDirectory}/badges"
mkdir -p "$OUTPUT_DIR"

# Parse coverage from JSON
COVERAGE_JSON="${config.outputDirectory}/json/coverage.json"

if [ -f "$COVERAGE_JSON" ]; then
    # Extract percentages
    LINE_COV=$(jq '.data[0].totals.lines.percent' "$COVERAGE_JSON")
    BRANCH_COV=$(jq '.data[0].totals.branches.percent' "$COVERAGE_JSON")
    FUNC_COV=$(jq '.data[0].totals.functions.percent' "$COVERAGE_JSON")
    
    # Generate badges using shields.io style
    for TYPE in line branch function; do
        case $TYPE in
            line) PERCENT=$LINE_COV ;;
            branch) PERCENT=$BRANCH_COV ;;
            function) PERCENT=$FUNC_COV ;;
        esac
        
        # Determine color based on percentage
        if (( $(echo "$PERCENT >= 80" | bc -l) )); then
            COLOR="brightgreen"
        elif (( $(echo "$PERCENT >= 60" | bc -l) )); then
            COLOR="yellow"
        else
            COLOR="red"
        fi
        
        # Create SVG badge
        cat > "$OUTPUT_DIR/$TYPE-coverage.svg" <<EOF
<svg xmlns="http://www.w3.org/2000/svg" width="104" height="20">
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <mask id="a">
    <rect width="104" height="20" rx="3" fill="#fff"/>
  </mask>
  <g mask="url(#a)">
    <path fill="#555" d="M0 0h63v20H0z"/>
    <path fill="$COLOR" d="M63 0h41v20H63z"/>
    <path fill="url(#b)" d="M0 0h104v20H0z"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="31.5" y="15" fill="#010101" fill-opacity=".3">$TYPE</text>
    <text x="31.5" y="14">$TYPE</text>
    <text x="82.5" y="15" fill="#010101" fill-opacity=".3">$PERCENT%</text>
    <text x="82.5" y="14">$PERCENT%</text>
  </g>
</svg>
EOF
    done
fi
`;
        break;
        
      case 'xml':
        script = `#!/bin/bash
# Generate Cobertura XML report

if command -v llvm-cov &> /dev/null; then
    # Convert LLVM JSON to Cobertura XML
    node -e "
    const { CppReportConverter } = require('@aidev/init_setup-folder');
    const converter = new CppReportConverter();
    converter.jsonToCobertura('${config.outputDirectory}/json/coverage.json', '${config.outputDirectory}/coverage.xml');
    "
elif command -v gcovr &> /dev/null; then
    gcovr --xml -o ${config.outputDirectory}/coverage.xml
fi
`;
        break;
    }
    
    if (script) {
      const scriptPath = path.join(projectPath, '.coverage', `generate-${format}.sh`);
      await fileAPI.createFile(scriptPath, script, { type: FileType.REPORT });
      await fs.chmod(scriptPath, { type: FileType.TEMPORARY });
    }
  }

  private async setupHistoricalTracking(projectPath: string): Promise<void> {
    const script = `#!/bin/bash
# Update historical coverage tracking

COMMIT_HASH=\$1
COVERAGE_JSON=\$2
HISTORY_FILE=".coverage/history/history.json"

mkdir -p .coverage/history

# Initialize history file if it doesn't exist
if [ ! -f "$HISTORY_FILE" ]; then
    echo "[]" > "$HISTORY_FILE"
fi

# Add new entry to history
node -e "
const { fs } = require('../../../infra_external-log-lib/src');
const history = JSON.parse(fileAPI.readFileSync('$HISTORY_FILE', 'utf-8'));
const coverage = JSON.parse(fileAPI.readFileSync('$COVERAGE_JSON', 'utf-8'));

const entry = {
  date: new Date().toISOString(),
  commit: '$COMMIT_HASH',
  coverage: {
    line: coverage.data[0].totals.lines.percent,
    branch: coverage.data[0].totals.branches.percent,
    function: coverage.data[0].totals.functions.percent,
    class: coverage.data[0].totals.instantiations?.percent || 0
  }
};

history.push(entry);

// Keep only last 100 entries
if (history.length > 100) {
  history.splice(0, history.length - 100);
}

await fileAPI.createFile('$HISTORY_FILE', JSON.stringify(history, { type: FileType.TEMPORARY }));

// Generate trend chart
const { CppReportGenerator } = require('@aidev/init_setup-folder');
const generator = new CppReportGenerator();
generator.generateTrendChart(history, '.coverage/history/trend.html');
"
`;
    
    const scriptPath = path.join(projectPath, '.coverage', 'update-history.sh');
    await fileAPI.createFile(scriptPath, script, { type: FileType.REPORT });
    await fs.chmod(scriptPath, { type: FileType.TEMPORARY });
  }

  private async setupBadgeGeneration(projectPath: string): Promise<void> {
    const script = `#!/bin/bash
# Generate all coverage badges

./.coverage/generate-badge.sh

# Copy badges to README location if exists
if [ -f README.md ]; then
    mkdir -p gen/doc/badges
    cp coverage/badges/*.svg gen/doc/badges/
    
    # Update README with badge URLs
    echo "📛 Coverage badges updated in gen/doc/badges/"
fi
`;
    
    const scriptPath = path.join(projectPath, '.coverage', 'generate-badges.sh');
    await fileAPI.createFile(scriptPath, script, { type: FileType.REPORT });
    await fs.chmod(scriptPath, { type: FileType.TEMPORARY });
  }

  async generateReport(
    projectPath: string,
    coverageData: any,
    format: ReportFormat
  ): Promise<string> {
    switch (format) {
      case "markdown":
        return this.generateMarkdownReport(coverageData);
      case 'html':
        return this.generateHtmlSummary(coverageData);
      case 'console':
        return this.generateConsoleReport(coverageData);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private generateMarkdownReport(data: any): string {
    const summary = data.data?.[0]?.totals || {};
    const files = data.data?.[0]?.files || [];
    
    let report = `# Coverage Report

## Summary
Generated: ${new Date().toISOString()}

| Metric | Coverage | Details |
|--------|----------|---------|
| Lines | ${summary.lines?.percent?.toFixed(2)}% | ${summary.lines?.covered}/${summary.lines?.count} |
| Branches | ${summary.branches?.percent?.toFixed(2)}% | ${summary.branches?.covered}/${summary.branches?.count} |
| Functions | ${summary.functions?.percent?.toFixed(2)}% | ${summary.functions?.covered}/${summary.functions?.count} |
`;
    
    if (files.length > 0) {
      report += `\n## Files with Lowest Coverage\n\n`;
      report += `| File | Line Coverage | Branch Coverage |\n`;
      report += `|------|---------------|----------------|\n`;
      
      const sorted = files
        .sort((a: any, b: any) => a.summary.lines.percent - b.summary.lines.percent)
        .slice(0, 10);
      
      for (const file of sorted) {
        report += `| ${file.filename} | ${file.summary.lines.percent.toFixed(1)}% | ${file.summary.branches.percent.toFixed(1)}% |\n`;
      }
    }
    
    return report;
  }

  private generateHtmlSummary(data: any): string {
    const summary = data.data?.[0]?.totals || {};
    
    return `<!DOCTYPE html>
<html>
<head>
    <title>Coverage Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f0f0f0; padding: 15px; border-radius: 5px; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: white; border-radius: 3px; }
        .good { color: green; }
        .warning { color: orange; }
        .bad { color: red; }
    </style>
</head>
<body>
    <h1>Coverage Report</h1>
    <div class="summary">
        <div class="metric">
            <h3>Line Coverage</h3>
            <div class="${this.getCoverageClass(summary.lines?.percent)}">
                ${summary.lines?.percent?.toFixed(2)}%
            </div>
        </div>
        <div class="metric">
            <h3>Branch Coverage</h3>
            <div class="${this.getCoverageClass(summary.branches?.percent)}">
                ${summary.branches?.percent?.toFixed(2)}%
            </div>
        </div>
        <div class="metric">
            <h3>Function Coverage</h3>
            <div class="${this.getCoverageClass(summary.functions?.percent)}">
                ${summary.functions?.percent?.toFixed(2)}%
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  private generateConsoleReport(data: any): string {
    const summary = data.data?.[0]?.totals || {};
    
    return `
================================================================================
                              COVERAGE REPORT
================================================================================
Line Coverage:     ${summary.lines?.percent?.toFixed(2)}% (${summary.lines?.covered}/${summary.lines?.count})
Branch Coverage:   ${summary.branches?.percent?.toFixed(2)}% (${summary.branches?.covered}/${summary.branches?.count})
Function Coverage: ${summary.functions?.percent?.toFixed(2)}% (${summary.functions?.covered}/${summary.functions?.count})
================================================================================
`;
  }

  private getCoverageClass(percent: number): string {
    if (percent >= 80) return 'good';
    if (percent >= 60) return 'warning';
    return 'bad';
  }
}

/**
 * Report Generator for external use
 */
export class CppReportGenerator {
  async generateMarkdown(jsonPath: string, outputPath: string): Promise<void> {
    const data = JSON.parse(await fileAPI.readFile(jsonPath, 'utf-8'));
    const generator = new CppReportSetup();
    const report = await generator.generateReport('', data, "markdown");
    await fileAPI.createFile(outputPath, report, { type: FileType.REPORT });
  }

  async generateTrendChart(history: HistoricalData[], { type: FileType.TEMPORARY }): Promise<void> {
    // Generate simple HTML chart
    const html = `<!DOCTYPE html>
<html>
<head>
    <title>Coverage Trend</title>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
</head>
<body>
    <div id="chart"></div>
    <script>
        const data = ${JSON.stringify(history)};
        const trace1 = {
            x: data.map(d => d.date),
            y: data.map(d => d.coverage.line),
            name: 'Line Coverage',
            type: 'scatter'
        };
        const trace2 = {
            x: data.map(d => d.date),
            y: data.map(d => d.coverage.branch),
            name: 'Branch Coverage',
            type: 'scatter'
        };
        const layout = {
            title: 'Coverage Trend',
            xaxis: { title: 'Date' },
            yaxis: { title: 'Coverage %', range: [0, 100] }
        };
        Plotly.newPlot('chart', [trace1, trace2], layout);
    </script>
</body>
</html>`;
    
    await fileAPI.createFile(outputPath, html, { type: FileType.REPORT });
  }
}

/**
 * Report Converter for format conversions
 */
export class CppReportConverter {
  async jsonToCobertura(jsonPath: string, { type: FileType.TEMPORARY }): Promise<void> {
    const data = JSON.parse(await fileAPI.readFile(jsonPath, 'utf-8'));
    
    // Simple Cobertura XML generation
    const xml = `<?xml version="1.0" ?>
<coverage version="1">
    <sources>
        <source>.</source>
    </sources>
    <packages>
        <package name="root" line-rate="${data.data[0].totals.lines.percent / 100}" branch-rate="${data.data[0].totals.branches.percent / 100}">
            <classes>
                ${data.data[0].files.map((f: any) => `
                <class name="${f.filename}" filename="${f.filename}" line-rate="${f.summary.lines.percent / 100}" branch-rate="${f.summary.branches.percent / 100}">
                    <lines>
                        <!-- Line details would go here -->
                    </lines>
                </class>`).join('')}
            </classes>
        </package>
    </packages>
</coverage>`;
    
    await fileAPI.createFile(xmlPath, xml, { type: FileType.REPORT });
  }
}