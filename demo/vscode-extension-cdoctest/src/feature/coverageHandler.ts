import * as vscode from 'vscode';
import { fs } from '../../../../layer/themes/infra_external-log-lib/dist';
import { path } from '../../../../layer/themes/infra_external-log-lib/dist';
import glob from 'fast-glob';
import { spawn } from 'child_process';
import { Config } from './config';
import * as xml2js from 'xml2js';

// Global coverage update callback
let globalCoverageUpdateCallback: ((coverage: vscode.FileCoverage[]) => void) | undefined;

export function setGlobalCoverageUpdateCallback(callback: (coverage: vscode.FileCoverage[]) => void): void {
    globalCoverageUpdateCallback = callback;
}

function updateGlobalCoverageStatus(fileCoverages: vscode.FileCoverage[]): void {
    if (globalCoverageUpdateCallback) {
        globalCoverageUpdateCallback(fileCoverages);
    }
}

export interface CoverageData {
    file: string;
    lines: { line: number; hits: number }[];
    functions?: { name: string; line: number; hits: number }[];
    branches?: { line: number; block: number; branch: number; taken: number }[];
}

/**
 * Check if coverage files exist based on the configured pattern
 */
export async function checkCoverageFilesExist(config: Config): Promise<boolean> {
    if (!config.coverageRawFilePattern) {
        return false;
    }
    
    const pattern = config.getCoverageRawFilePattern();
    if (!pattern || pattern.trim() === '') {
        return false;
    }
    
    try {
        const files = await glob(pattern);
        return files.length > 0;
    } catch (error) {
        console.error('Error checking coverage files:', error);
        return false;
    }
}

/**
 * Execute coverage generation task
 */
export async function executeCoverageGenerationTask(config: Config): Promise<void> {
    if (!config.coverageGenerateTask || config.coverageGenerateTask.trim() === '') {
        return;
    }
    
    return new Promise((resolve, reject) => {
        const cwd = config.buildDirectory || config.workspaceFolder.uri.fsPath;
        const proc = spawn(config.coverageGenerateTask, [], {
            cwd: cwd,
            shell: true
        });
        
        let stdout = '';
        let stderr = '';
        
        proc.stdout?.on('data', (data) => {
            stdout += data.toString();
        });
        
        proc.stderr?.on('data', (data) => {
            stderr += data.toString();
        });
        
        proc.on('close', (code) => {
            if (code === 0) {
                console.log('Coverage generation completed successfully');
                console.log('stdout:', stdout);
                resolve();
            } else {
                console.error('Coverage generation failed with code:', code);
                console.error('stderr:', stderr);
                reject(new Error(`Coverage generation failed with code ${code}`));
            }
        });
        
        proc.on('error', (error) => {
            console.error('Failed to start coverage generation:', error);
            reject(error);
        });
    });
}

/**
 * Detect coverage format from file content
 */
export function detectCoverageFormat(content: string, filename: string): 'lcov' | 'cobertura' | 'json' | 'unknown' {
    // Check by file extension first
    const ext = path.extname(filename).toLowerCase();
    if (ext === '.lcov' || ext === '.info') {
        return 'lcov';
    }
    if (ext === '.xml') {
        // Check if it's Cobertura XML
        if (content.includes('<coverage') && content.includes('cobertura')) {
            return 'cobertura';
        }
    }
    if (ext === '.json') {
        return 'json';
    }
    
    // Check by content patterns
    if (content.includes('SF:') && content.includes('DA:')) {
        return 'lcov';
    }
    if (content.includes('<?xml') && content.includes('<coverage')) {
        return 'cobertura';
    }
    if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
        try {
            JSON.parse(content);
            return 'json';
        } catch {
            // Not valid JSON
        }
    }
    
    return 'unknown';
}

/**
 * Parse Cobertura XML format coverage data
 */
export async function parseCoberturaData(xmlContent: string): Promise<CoverageData[]> {
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(xmlContent);
    const coverageData: CoverageData[] = [];
    
    if (!result.coverage || !result.coverage.packages) {
        return coverageData;
    }
    
    const packages = result.coverage.packages[0].package || [];
    
    for (const pkg of packages) {
        const classes = pkg.classes?.[0]?.class || [];
        
        for (const cls of classes) {
            const filename = cls.$.filename;
            const lines = cls.lines?.[0]?.line || [];
            
            const lineData: { line: number; hits: number }[] = [];
            const functionData: { name: string; line: number; hits: number }[] = [];
            const branchData: { line: number; block: number; branch: number; taken: number }[] = [];
            
            // Process line coverage
            for (const line of lines) {
                const lineNum = parseInt(line.$.number, 10);
                const hits = parseInt(line.$.hits, 10);
                if (!isNaN(lineNum) && !isNaN(hits)) {
                    lineData.push({ line: lineNum, hits });
                }
                
                // Process branch coverage if present
                if (line.$.branch === 'true' && line.$['condition-coverage']) {
                    const conditionMatch = line.$['condition-coverage'].match(/(\d+)%\s*\((\d+)\/(\d+)\)/);
                    if (conditionMatch) {
                        const covered = parseInt(conditionMatch[2], 10);
                        const total = parseInt(conditionMatch[3], 10);
                        for (let i = 0; i < total; i++) {
                            branchData.push({
                                line: lineNum,
                                block: 0,
                                branch: i,
                                taken: i < covered ? 1 : 0
                            });
                        }
                    }
                }
            }
            
            // Process method coverage
            const methods = cls.methods?.[0]?.method || [];
            for (const method of methods) {
                const methodName = method.$.name;
                const methodLine = parseInt(method.lines?.[0]?.line?.[0]?.$.number || '0', 10);
                const hits = parseInt(method.lines?.[0]?.line?.[0]?.$.hits || '0', 10);
                if (methodName && methodLine > 0) {
                    functionData.push({ name: methodName, line: methodLine, hits });
                }
            }
            
            if (lineData.length > 0) {
                coverageData.push({
                    file: filename,
                    lines: lineData,
                    functions: functionData.length > 0 ? functionData : undefined,
                    branches: branchData.length > 0 ? branchData : undefined
                });
            }
        }
    }
    
    return coverageData;
}

/**
 * Parse JSON format coverage data (llvm-cov export format)
 */
export function parseJsonCoverageData(jsonContent: string): CoverageData[] {
    const coverageData: CoverageData[] = [];
    
    try {
        const data = JSON.parse(jsonContent);
        
        // Handle llvm-cov export format
        if (data.data && Array.isArray(data.data)) {
            for (const fileData of data.data) {
                const files = fileData.files || [];
                
                for (const file of files) {
                    const lineData: { line: number; hits: number }[] = [];
                    const functionData: { name: string; line: number; hits: number }[] = [];
                    
                    // Process segments for line coverage
                    const segments = file.segments || [];
                    const lineHits = new Map<number, number>();
                    
                    for (let i = 0; i < segments.length; i++) {
                        const segment = segments[i];
                        const line = segment[0];
                        const count = segment[2];
                        const hasCount = segment[3];
                        
                        if (hasCount && line > 0) {
                            lineHits.set(line, Math.max(lineHits.get(line) || 0, count));
                        }
                    }
                    
                    // Convert to array format
                    for (const [line, hits] of lineHits) {
                        lineData.push({ line, hits });
                    }
                    
                    // Process functions
                    const functions = file.functions || [];
                    for (const func of functions) {
                        functionData.push({
                            name: func.name,
                            line: func.regions?.[0]?.[0] || 0,
                            hits: func.count
                        });
                    }
                    
                    if (lineData.length > 0) {
                        coverageData.push({
                            file: file.filename,
                            lines: lineData.sort((a, b) => a.line - b.line),
                            functions: functionData.length > 0 ? functionData : undefined
                        });
                    }
                }
            }
        }
        
        // Handle other JSON formats (e.g., custom formats)
        else if (data.files && typeof data.files === 'object') {
            for (const [filename, fileData] of Object.entries(data.files)) {
                if (typeof fileData === 'object' && fileData !== null) {
                    const lineData: { line: number; hits: number }[] = [];
                    
                    // Try to extract line coverage data
                    const lines = (fileData as any).lines || (fileData as any).coverage || {};
                    for (const [lineStr, hits] of Object.entries(lines)) {
                        const lineNum = parseInt(lineStr, 10);
                        if (!isNaN(lineNum) && typeof hits === 'number') {
                            lineData.push({ line: lineNum, hits: hits as number });
                        }
                    }
                    
                    if (lineData.length > 0) {
                        coverageData.push({
                            file: filename,
                            lines: lineData.sort((a, b) => a.line - b.line)
                        });
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error parsing JSON coverage data:', error);
    }
    
    return coverageData;
}

/**
 * Parse LCOV format coverage data
 */
export function parseLcovData(lcovContent: string): CoverageData[] {
    const coverageMap = new Map<string, CoverageData>();
    const lines = lcovContent.split('\n');
    
    let currentFile: string | null = null;
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine.startsWith('SF:')) {
            // Source file
            currentFile = trimmedLine.substring(3);
            if (!coverageMap.has(currentFile)) {
                coverageMap.set(currentFile, {
                    file: currentFile,
                    lines: [],
                    functions: [],
                    branches: []
                });
            }
        } else if (currentFile && trimmedLine.startsWith('DA:')) {
            // Line data
            const parts = trimmedLine.substring(3).split(',');
            if (parts.length >= 2) {
                const lineNum = parseInt(parts[0], 10);
                const hits = parseInt(parts[1], 10);
                if (!isNaN(lineNum) && !isNaN(hits)) {
                    const coverage = coverageMap.get(currentFile)!;
                    coverage.lines.push({ line: lineNum, hits });
                }
            }
        } else if (currentFile && trimmedLine.startsWith('FN:')) {
            // Function data
            const parts = trimmedLine.substring(3).split(',');
            if (parts.length >= 2) {
                const lineNum = parseInt(parts[0], 10);
                const funcName = parts[1];
                if (!isNaN(lineNum)) {
                    const coverage = coverageMap.get(currentFile)!;
                    coverage.functions?.push({ name: funcName, line: lineNum, hits: 0 });
                }
            }
        } else if (currentFile && trimmedLine.startsWith('FNDA:')) {
            // Function hit data
            const parts = trimmedLine.substring(5).split(',');
            if (parts.length >= 2) {
                const hits = parseInt(parts[0], 10);
                const funcName = parts[1];
                if (!isNaN(hits)) {
                    const coverage = coverageMap.get(currentFile)!;
                    const func = coverage.functions?.find(f => f.name === funcName);
                    if (func) {
                        func.hits = hits;
                    }
                }
            }
        } else if (currentFile && trimmedLine.startsWith('BRDA:')) {
            // Branch data
            const parts = trimmedLine.substring(5).split(',');
            if (parts.length >= 4) {
                const lineNum = parseInt(parts[0], 10);
                const block = parseInt(parts[1], 10);
                const branch = parseInt(parts[2], 10);
                const taken = parts[3] === '-' ? 0 : parseInt(parts[3], 10);
                if (!isNaN(lineNum) && !isNaN(block) && !isNaN(branch)) {
                    const coverage = coverageMap.get(currentFile)!;
                    coverage.branches?.push({ line: lineNum, block, branch, taken });
                }
            }
        } else if (trimmedLine === 'end_of_record') {
            currentFile = null;
        }
    }
    
    return Array.from(coverageMap.values());
}

/**
 * Convert coverage data to VS Code FileCoverage
 */
export function convertToVSCodeCoverage(coverageData: CoverageData[], workspaceFolder: vscode.WorkspaceFolder): vscode.FileCoverage[] {
    const fileCoverages: vscode.FileCoverage[] = [];
    
    for (const data of coverageData) {
        const fileUri = vscode.Uri.file(path.isAbsolute(data.file) 
            ? data.file 
            : path.join(workspaceFolder.uri.fsPath, data.file));
        
        // Calculate statement coverage
        const totalLines = data.lines.length;
        const coveredLines = data.lines.filter(l => l.hits > 0).length;
        const statementCoverage = new vscode.TestCoverageCount(coveredLines, totalLines);
        
        // Calculate declaration coverage if available
        let declarationCoverage: vscode.TestCoverageCount | undefined;
        if (data.functions && data.functions.length > 0) {
            const totalFunctions = data.functions.length;
            const coveredFunctions = data.functions.filter(f => f.hits > 0).length;
            declarationCoverage = new vscode.TestCoverageCount(coveredFunctions, totalFunctions);
        }
        
        // Calculate branch coverage if available
        let branchCoverage: vscode.TestCoverageCount | undefined;
        if (data.branches && data.branches.length > 0) {
            const totalBranches = data.branches.length;
            const coveredBranches = data.branches.filter(b => b.taken > 0).length;
            branchCoverage = new vscode.TestCoverageCount(coveredBranches, totalBranches);
        }
        
        const fileCoverage = new vscode.FileCoverage(
            fileUri,
            statementCoverage,
            branchCoverage,
            declarationCoverage
        );
        
        // Store the raw data for detailed coverage loading later
        (fileCoverage as any)._rawData = data;
        
        fileCoverages.push(fileCoverage);
    }
    
    return fileCoverages;
}

/**
 * Load detailed coverage for a file
 */
export function loadDetailedCoverage(fileCoverage: vscode.FileCoverage): vscode.FileCoverageDetail[] {
    const rawData = (fileCoverage as any)._rawData as CoverageData;
    if (!rawData) {
        return [];
    }
    
    const details: vscode.FileCoverageDetail[] = [];
    
    // Add statement coverage details
    for (const line of rawData.lines) {
        const position = new vscode.Position(line.line - 1, 0);
        const range = new vscode.Range(position, position);
        
        if (line.hits > 0) {
            details.push(new vscode.StatementCoverage(line.hits, range));
        } else {
            details.push(new vscode.StatementCoverage(0, range));
        }
    }
    
    return details;
}

/**
 * Process coverage after test run
 */
export async function processCoverageAfterTestRun(
    config: Config,
    run: vscode.TestRun
): Promise<void> {
    try {
        // Check if coverage files exist
        const coverageExists = await checkCoverageFilesExist(config);
        if (!coverageExists) {
            console.log('No coverage files found, skipping coverage processing');
            return;
        }
        
        // Execute coverage generation task if configured
        if (config.coverageGenerateTask) {
            console.log('Executing coverage generation task...');
            await executeCoverageGenerationTask(config);
        }
        
        // Read coverage data from the configured location
        if (!config.coverageLocation) {
            console.log('No coverage location configured');
            return;
        }
        
        const coverageFile = path.isAbsolute(config.coverageLocation)
            ? config.coverageLocation
            : path.join(config.buildDirectory || config.workspaceFolder.uri.fsPath, config.coverageLocation);
        
        if (!fs.existsSync(coverageFile)) {
            console.log(`Coverage file not found: ${coverageFile}`);
            return;
        }
        
        const coverageContent = fs.readFileSync(coverageFile, 'utf-8');
        const format = detectCoverageFormat(coverageContent, coverageFile);
        
        let coverageData: CoverageData[] = [];
        
        switch (format) {
            case 'lcov':
                coverageData = parseLcovData(coverageContent);
                break;
            case 'cobertura':
                coverageData = await parseCoberturaData(coverageContent);
                break;
            case 'json':
                coverageData = parseJsonCoverageData(coverageContent);
                break;
            default:
                console.log(`Unsupported coverage format for file: ${coverageFile}`);
                return;
        }
        
        const fileCoverages = convertToVSCodeCoverage(coverageData, config.workspaceFolder);
        
        // Add coverage to the test run
        for (const coverage of fileCoverages) {
            run.addCoverage(coverage);
        }
        
        console.log(`Added coverage for ${fileCoverages.length} files`);
        
        // Check coverage thresholds if configured
        if (config.coverageWarnIfBelowThreshold) {
            checkCoverageThresholds(fileCoverages, config);
        }
        
        // Update global coverage status
        updateGlobalCoverageStatus(fileCoverages);
        
    } catch (error) {
        console.error('Error processing coverage:', error);
    }
}

/**
 * Check coverage against configured thresholds and show warnings
 */
export function checkCoverageThresholds(fileCoverages: vscode.FileCoverage[], config: Config): void {
    let totalLines = 0;
    let coveredLines = 0;
    let totalFunctions = 0;
    let coveredFunctions = 0;
    let totalBranches = 0;
    let coveredBranches = 0;
    
    // Aggregate coverage data
    for (const coverage of fileCoverages) {
        if (coverage.statementCoverage) {
            totalLines += coverage.statementCoverage.total;
            coveredLines += coverage.statementCoverage.covered;
        }
        
        if (coverage.declarationCoverage) {
            totalFunctions += coverage.declarationCoverage.total;
            coveredFunctions += coverage.declarationCoverage.covered;
        }
        
        if (coverage.branchCoverage) {
            totalBranches += coverage.branchCoverage.total;
            coveredBranches += coverage.branchCoverage.covered;
        }
    }
    
    // Calculate percentages
    const linePercent = totalLines > 0 ? (coveredLines / totalLines) * 100 : 100;
    const functionPercent = totalFunctions > 0 ? (coveredFunctions / totalFunctions) * 100 : 100;
    const branchPercent = totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 100;
    
    // Check thresholds and show warnings
    const warnings: string[] = [];
    
    if (config.coverageThresholdLine > 0 && linePercent < config.coverageThresholdLine) {
        warnings.push(`Line coverage ${linePercent.toFixed(1)}% is below threshold ${config.coverageThresholdLine}%`);
    }
    
    if (config.coverageThresholdFunction > 0 && functionPercent < config.coverageThresholdFunction) {
        warnings.push(`Function coverage ${functionPercent.toFixed(1)}% is below threshold ${config.coverageThresholdFunction}%`);
    }
    
    if (config.coverageThresholdBranch > 0 && branchPercent < config.coverageThresholdBranch) {
        warnings.push(`Branch coverage ${branchPercent.toFixed(1)}% is below threshold ${config.coverageThresholdBranch}%`);
    }
    
    if (warnings.length > 0) {
        const message = `Coverage Warning:\n${warnings.join('\n')}`;
        vscode.window.showWarningMessage(message, 'View Coverage').then(selection => {
            if (selection === 'View Coverage') {
                vscode.commands.executeCommand('testing.showCoverage');
            }
        });
    }
    
    // Log coverage summary
    console.log(`Coverage Summary: Lines: ${linePercent.toFixed(1)}%, Functions: ${functionPercent.toFixed(1)}%, Branches: ${branchPercent.toFixed(1)}%`);
}

/**
 * Coverage file watcher for real-time updates
 */
export class CoverageWatcher {
    private watchers: Map<string, vscode.FileSystemWatcher> = new Map();
    private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
    private coverageCache: Map<string, vscode.FileCoverage[]> = new Map();
    
    constructor(
        private config: Config,
        private onCoverageUpdate: (coverage: vscode.FileCoverage[]) => void
    ) {}
    
    /**
     * Start watching for coverage file changes
     */
    public async start(): Promise<void> {
        // Watch the coverage report file
        if (this.config.coverageLocation) {
            const coverageFile = path.isAbsolute(this.config.coverageLocation)
                ? this.config.coverageLocation
                : path.join(this.config.buildDirectory || this.config.workspaceFolder.uri.fsPath, this.config.coverageLocation);
            
            this.watchFile(coverageFile);
        }
        
        // Watch raw coverage files
        if (this.config.coverageRawFilePattern) {
            const pattern = this.config.getCoverageRawFilePattern();
            this.watchPattern(pattern);
        }
    }
    
    /**
     * Stop all watchers
     */
    public stop(): void {
        for (const [_, watcher] of this.watchers) {
            watcher.dispose();
        }
        this.watchers.clear();
        
        for (const [_, timer] of this.debounceTimers) {
            clearTimeout(timer);
        }
        this.debounceTimers.clear();
        
        this.coverageCache.clear();
    }
    
    private watchFile(filePath: string): void {
        if (this.watchers.has(filePath)) {
            return;
        }
        
        const watcher = vscode.workspace.createFileSystemWatcher(filePath);
        
        watcher.onDidChange(() => {
            this.handleCoverageFileChange(filePath);
        });
        
        watcher.onDidCreate(() => {
            this.handleCoverageFileChange(filePath);
        });
        
        this.watchers.set(filePath, watcher);
    }
    
    private watchPattern(pattern: string): void {
        if (this.watchers.has(pattern)) {
            return;
        }
        
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);
        
        watcher.onDidChange((uri) => {
            this.handleRawCoverageFileChange();
        });
        
        watcher.onDidCreate((uri) => {
            this.handleRawCoverageFileChange();
        });
        
        watcher.onDidDelete((uri) => {
            this.handleRawCoverageFileChange();
        });
        
        this.watchers.set(pattern, watcher);
    }
    
    private handleCoverageFileChange(filePath: string): void {
        // Debounce file changes to avoid excessive updates
        const existingTimer = this.debounceTimers.get(filePath);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }
        
        const timer = setTimeout(async () => {
            await this.updateCoverage();
            this.debounceTimers.delete(filePath);
        }, 500);
        
        this.debounceTimers.set(filePath, timer);
    }
    
    private handleRawCoverageFileChange(): void {
        // Debounce raw file changes
        const key = 'raw_coverage';
        const existingTimer = this.debounceTimers.get(key);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }
        
        const timer = setTimeout(async () => {
            // Check if coverage generation is needed
            const coverageExists = await checkCoverageFilesExist(this.config);
            if (coverageExists && this.config.coverageGenerateTask) {
                console.log('Raw coverage files changed, regenerating coverage report...');
                try {
                    await executeCoverageGenerationTask(this.config);
                    await this.updateCoverage();
                } catch (error) {
                    console.error('Error regenerating coverage:', error);
                }
            }
            this.debounceTimers.delete(key);
        }, 1000);
        
        this.debounceTimers.set(key, timer);
    }
    
    private async updateCoverage(): Promise<void> {
        try {
            if (!this.config.coverageLocation) {
                return;
            }
            
            const coverageFile = path.isAbsolute(this.config.coverageLocation)
                ? this.config.coverageLocation
                : path.join(this.config.buildDirectory || this.config.workspaceFolder.uri.fsPath, this.config.coverageLocation);
            
            if (!fs.existsSync(coverageFile)) {
                return;
            }
            
            const coverageContent = fs.readFileSync(coverageFile, 'utf-8');
            const format = detectCoverageFormat(coverageContent, coverageFile);
            
            let coverageData: CoverageData[] = [];
            
            switch (format) {
                case 'lcov':
                    coverageData = parseLcovData(coverageContent);
                    break;
                case 'cobertura':
                    coverageData = await parseCoberturaData(coverageContent);
                    break;
                case 'json':
                    coverageData = parseJsonCoverageData(coverageContent);
                    break;
                default:
                    return;
            }
            
            const fileCoverages = convertToVSCodeCoverage(coverageData, this.config.workspaceFolder);
            
            // Check if coverage actually changed
            const cacheKey = coverageFile;
            const cachedCoverage = this.coverageCache.get(cacheKey);
            
            if (!this.coverageChanged(cachedCoverage, fileCoverages)) {
                return;
            }
            
            this.coverageCache.set(cacheKey, fileCoverages);
            this.onCoverageUpdate(fileCoverages);
            
            console.log(`Coverage updated from ${coverageFile}: ${fileCoverages.length} files`);
            
        } catch (error) {
            console.error('Error updating coverage:', error);
        }
    }
    
    private coverageChanged(oldCoverage: vscode.FileCoverage[] | undefined, newCoverage: vscode.FileCoverage[]): boolean {
        if (!oldCoverage || oldCoverage.length !== newCoverage.length) {
            return true;
        }
        
        // Simple comparison - could be improved
        for (let i = 0; i < oldCoverage.length; i++) {
            const oldFile = oldCoverage[i];
            const newFile = newCoverage.find(f => f.uri.toString() === oldFile.uri.toString());
            
            if (!newFile) {
                return true;
            }
            
            if (oldFile.statementCoverage.covered !== newFile.statementCoverage.covered ||
                oldFile.statementCoverage.total !== newFile.statementCoverage.total) {
                return true;
            }
        }
        
        return false;
    }
}