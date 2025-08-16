import * as vscode from 'vscode';

export class CoverageStatusBarItem {
    private statusBarItem: vscode.StatusBarItem;
    private totalLines = 0;
    private coveredLines = 0;
    private totalFunctions = 0;
    private coveredFunctions = 0;
    private totalBranches = 0;
    private coveredBranches = 0;
    
    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.command = 'testing.showCoverage';
        this.statusBarItem.tooltip = 'Click to show coverage details';
    }
    
    public updateCoverage(fileCoverages: vscode.FileCoverage[]): void {
        // Reset counters
        this.totalLines = 0;
        this.coveredLines = 0;
        this.totalFunctions = 0;
        this.coveredFunctions = 0;
        this.totalBranches = 0;
        this.coveredBranches = 0;
        
        // Aggregate coverage data
        for (const coverage of fileCoverages) {
            if (coverage.statementCoverage) {
                this.totalLines += coverage.statementCoverage.total;
                this.coveredLines += coverage.statementCoverage.covered;
            }
            
            if (coverage.declarationCoverage) {
                this.totalFunctions += coverage.declarationCoverage.total;
                this.coveredFunctions += coverage.declarationCoverage.covered;
            }
            
            if (coverage.branchCoverage) {
                this.totalBranches += coverage.branchCoverage.total;
                this.coveredBranches += coverage.branchCoverage.covered;
            }
        }
        
        this.updateStatusBar();
    }
    
    private updateStatusBar(): void {
        if (this.totalLines === 0) {
            this.statusBarItem.hide();
            return;
        }
        
        const linePercent = (this.coveredLines / this.totalLines) * 100;
        const functionPercent = this.totalFunctions > 0 
            ? (this.coveredFunctions / this.totalFunctions) * 100 
            : null;
        const branchPercent = this.totalBranches > 0 
            ? (this.coveredBranches / this.totalBranches) * 100 
            : null;
        
        // Build status bar text
        let text = `$(testing-coverage) ${linePercent.toFixed(1)}%`;
        
        // Build tooltip with detailed information
        let tooltip = `Code Coverage\n`;
        tooltip += `━━━━━━━━━━━━━━━━\n`;
        tooltip += `Lines: ${this.coveredLines}/${this.totalLines} (${linePercent.toFixed(1)}%)\n`;
        
        if (functionPercent !== null) {
            tooltip += `Functions: ${this.coveredFunctions}/${this.totalFunctions} (${functionPercent.toFixed(1)}%)\n`;
        }
        
        if (branchPercent !== null) {
            tooltip += `Branches: ${this.coveredBranches}/${this.totalBranches} (${branchPercent.toFixed(1)}%)\n`;
        }
        
        tooltip += `\nClick to view coverage details`;
        
        // Set color based on coverage percentage
        if (linePercent >= 80) {
            this.statusBarItem.backgroundColor = undefined;
        } else if (linePercent >= 60) {
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        } else {
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        }
        
        this.statusBarItem.text = text;
        this.statusBarItem.tooltip = tooltip;
        this.statusBarItem.show();
    }
    
    public show(): void {
        if (this.totalLines > 0) {
            this.statusBarItem.show();
        }
    }
    
    public hide(): void {
        this.statusBarItem.hide();
    }
    
    public dispose(): void {
        this.statusBarItem.dispose();
    }
}