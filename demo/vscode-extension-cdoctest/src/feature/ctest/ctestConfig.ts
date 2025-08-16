import * as vscode from 'vscode';
import { path } from '../../layer/themes/infra_external-log-lib/src';
import { Config, ConfigType } from '../config';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface CTestInfo {
    name: string;           // e.g., "MyTest.BasicTest"
    command: string[];      // Full command to run test
    properties: {
        TIMEOUT?: string;
        LABELS?: string;
        WORKING_DIRECTORY?: string;
        [key: string]: string | undefined;
    };
    suite: string;          // e.g., "MyTest"
    case: string;           // e.g., "BasicTest"
}

export interface CTestResult {
    name: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    message?: string;
    output?: string;
}

export class CTestConfig extends Config {
    public ctestExecutable: string;
    public testFilter: string;
    public parallelJobs: number;
    public buildBeforeTest: boolean;
    public debuggerPath: string;

    constructor(
        context: vscode.ExtensionContext, 
        workspaceFolder: vscode.WorkspaceFolder, 
        activeWorkspace: (config: Config | CTestConfig) => void
    ) {
        super(context, workspaceFolder, activeWorkspace as any, false);
        this.type = ConfigType.CTestConfig;
        this.controllerId = "ctest";

        // Load CTest-specific configuration
        const config = vscode.workspace.getConfiguration('ctest');
        this.ctestExecutable = config.get("ctestExecutable") || 'ctest';
        this.testFilter = config.get("testFilter") || '';
        this.parallelJobs = config.get("parallelJobs") || 1;
        this.buildBeforeTest = config.get("buildBeforeTest") ?? true;
        this.debuggerPath = config.get("debuggerPath") || 'gdb';

        this.activateWorkspaceBaseOnCmakeSetting();
    }

    /**
     * Discover available CTest tests
     */
    public async discoverTests(): Promise<CTestInfo[]> {
        try {
            // Ensure build is up-to-date if requested
            if (this.buildBeforeTest) {
                await this.ensureBuild();
            }

            // Run ctest --show-only=json-v1 to get test information
            const { stdout } = await execAsync(`"${this.ctestExecutable}" --show-only=json-v1`, {
                cwd: this.buildDirectory,
                timeout: 30000 // 30 second timeout for discovery
            });

            const testData = JSON.parse(stdout);
            if (!testData.tests || !Array.isArray(testData.tests)) {
                console.warn('No tests found in CTest output');
                return [];
            }

            return testData.tests.map((test: any) => this.parseTestInfo(test));
        } catch (error) {
            console.error('Error discovering CTest tests:', error);
            throw new Error(`Failed to discover CTest tests: ${error}`);
        }
    }

    /**
     * Run a specific test by name
     */
    public async runTest(testName: string, isDebug: boolean = false): Promise<CTestResult> {
        try {
            if (this.buildBeforeTest) {
                await this.ensureBuild();
            }

            if (isDebug) {
                return this.runTestWithDebugger(testName);
            }

            const args = [
                '-R', `^${this.escapeRegex(testName)}$`,  // Run specific test
                '--output-junit', 'ctest_results.xml',   // Generate JUnit XML
                '--output-on-failure',                   // Show output on failure
                '-V'                                     // Verbose output
            ];

            if (this.parallelJobs > 1) {
                args.push('-j', this.parallelJobs.toString());
            }

            const { stdout, stderr } = await execAsync(`"${this.ctestExecutable}" ${args.join(' ')}`, {
                cwd: this.buildDirectory,
                timeout: 60000 // 60 second timeout for test execution
            });

            return this.parseTestResult(testName, stdout, stderr);
        } catch (error: any) {
            return {
                name: testName,
                status: 'failed',
                duration: 0,
                message: error.message,
                output: error.stdout || error.stderr
            };
        }
    }

    /**
     * Run multiple tests
     */
    public async runTests(testNames: string[]): Promise<CTestResult[]> {
        if (testNames.length === 0) {
            return [];
        }

        try {
            if (this.buildBeforeTest) {
                await this.ensureBuild();
            }

            // Create regex pattern to match all specified tests
            const testPattern = testNames.map(name => `^${this.escapeRegex(name)}$`).join('|');
            
            const args = [
                '-R', testPattern,
                '--output-junit', 'ctest_results.xml',
                '--output-on-failure',
                '-V'
            ];

            if (this.parallelJobs > 1) {
                args.push('-j', this.parallelJobs.toString());
            }

            const { stdout, stderr } = await execAsync(`"${this.ctestExecutable}" ${args.join(' ')}`, {
                cwd: this.buildDirectory,
                timeout: 120000 // 2 minute timeout for multiple tests
            });

            // Parse results from JUnit XML if available
            const resultsPath = path.join(this.buildDirectory, 'ctest_results.xml');
            try {
                return await this.parseJUnitResults(resultsPath);
            } catch {
                // Fallback to parsing stdout/stderr
                return testNames.map(name => this.parseTestResult(name, stdout, stderr));
            }
        } catch (error: any) {
            return testNames.map(name => ({
                name,
                status: 'failed' as const,
                duration: 0,
                message: error.message,
                output: error.stdout || error.stderr
            }));
        }
    }

    /**
     * Get test list arguments for compatibility with existing runner system
     */
    public get testrun_list_args(): string[] {
        return [this.ctestExecutable, '--show-only=json-v1'];
    }

    /**
     * Get test run arguments for compatibility with existing runner system
     */
    public get_ctest_testrun_executable_args(additionalEnv: { [key: string]: string }): string[] {
        const testName = additionalEnv['test_full_name'];
        return [
            this.ctestExecutable,
            '-R', `^${this.escapeRegex(testName)}$`,
            '--output-junit', 'ctest_results.xml',
            '--output-on-failure',
            '-V'
        ];
    }

    /**
     * Override parent class properties for CTest compatibility
     */
    public get testRunUseFile(): boolean {
        return false; // CTest handles its own output
    }

    public get listTestUseFile(): boolean {
        return false; // CTest discovery doesn't use files
    }

    public get resultFile(): string {
        return path.join(this.buildDirectory, 'ctest_results.xml');
    }

    private parseTestInfo(test: any): CTestInfo {
        const testName = test.name || '';
        const parts = testName.split('.');
        const suite = parts.length > 1 ? parts.slice(0, -1).join('.') : testName;
        const testCase = parts.length > 1 ? parts[parts.length - 1] : '';

        return {
            name: testName,
            command: test.command || [],
            properties: test.properties || {},
            suite,
            case: testCase
        };
    }

    private parseTestResult(testName: string, stdout: string, stderr: string): CTestResult {
        // Simple parsing of CTest output - look for test results
        const output = stdout + stderr;
        
        if (output.includes(`Test #`)) {
            if (output.includes('Passed')) {
                return {
                    name: testName,
                    status: 'passed',
                    duration: this.extractDuration(output),
                    output
                };
            } else if (output.includes('Failed')) {
                return {
                    name: testName,
                    status: 'failed',
                    duration: this.extractDuration(output),
                    message: this.extractFailureMessage(output),
                    output
                };
            }
        }

        // Default to failed if we can't parse the result
        return {
            name: testName,
            status: 'failed',
            duration: 0,
            message: 'Could not parse test result',
            output
        };
    }

    private async parseJUnitResults(resultsPath: string): Promise<CTestResult[]> {
        // This would require XML parsing - simplified for now
        // In a full implementation, you'd use an XML parser like 'xml2js'
        console.log('JUnit XML parsing not implemented yet, path:', resultsPath);
        return [];
    }

    private async runTestWithDebugger(testName: string): Promise<CTestResult> {
        // Get the test command to run with debugger
        const tests = await this.discoverTests();
        const test = tests.find(t => t.name === testName);
        
        if (!test) {
            throw new Error(`Test ${testName} not found`);
        }

        // For debugging, we'd typically run the test executable directly with a debugger
        // This is a simplified implementation
        console.log('Debug test execution not fully implemented yet');
        
        return {
            name: testName,
            status: 'failed',
            duration: 0,
            message: 'Debug execution not implemented'
        };
    }

    private async ensureBuild(): Promise<void> {
        try {
            await execAsync('cmake --build .', {
                cwd: this.buildDirectory,
                timeout: 120000 // 2 minute timeout for build
            });
        } catch (error) {
            console.warn('Build failed or no build needed:', error);
            // Don't fail test discovery if build fails - tests might already be built
        }
    }

    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    private extractDuration(output: string): number {
        // Look for timing information in CTest output
        const match = output.match(/(\d+\.\d+)\s*sec/);
        return match ? parseFloat(match[1]) * 1000 : 0; // Convert to milliseconds
    }

    private extractFailureMessage(output: string): string {
        // Extract failure message from CTest output
        const lines = output.split('\n');
        const errorLines = lines.filter(line => 
            line.includes('FAILED') || 
            line.includes('Error') || 
            line.includes("Assertion")
        );
        return errorLines.slice(0, 3).join('\n'); // Take first few error lines
    }
}