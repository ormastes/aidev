#!/usr/bin/env node
/**
 * BDD Feature Demo - Showcasing BDD/Gherkin support and external log capture
 */

import { MFTODConverter } from '../src/application/converter';
import { ExternalLogService } from '../src/domain/external-log-service';
import { CaptureConfiguration } from '../src/domain/capture-types';
import { path } from '../../../../infra_external-log-lib/src';
import { fsPromises as fs } from '../../../../infra_external-log-lib/src';
import { getFileAPI, FileType } from '../../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


async function runBDDDemo() {
  console.log('🥒 BDD/Gherkin Test-as-Manual Conversion Demo');
  console.log('===========================================\n');

  // Configure capture system with external log support
  const captureConfig: CaptureConfiguration = {
    tempDirectory: path.join(__dirname, 'temp', 'captures'),
    screenshotFormat: 'png',
    enableExternalLogs: true,
    externalLogDirectory: path.join(__dirname, 'temp', 'external-logs')
  };

  // Initialize converter and external log service
  const converter = new MFTODConverter(captureConfig);
  const externalLogService = new ExternalLogService(captureConfig.externalLogDirectory!);

  try {
    // Ensure directories exist
    await fileAPI.createDirectory(captureConfig.tempDirectory);
    await fileAPI.createDirectory(captureConfig.externalLogDirectory!);

    console.log('📝 Converting Gherkin Feature File...');
    
    // Convert BDD feature file
    const featureOutput = await converter.convertFile(
      path.join(__dirname, 'sample.feature'),
      {
        format: 'professional',
        includeCodeSnippets: false,
        includeScreenshots: true,
        outputPath: path.join(__dirname, 'output', 'user-authentication-manual.md')
      }
    );

    console.log('✅ BDD feature file converted!');
    console.log(`📄 Output length: ${featureOutput.length} characters\n`);

    // Demonstrate external log capture
    console.log('🔧 Demonstrating External Log Capture...\n');
    
    // Example 1: PostgreSQL command enhancement
    console.log('1️⃣ PostgreSQL Command Enhancement:');
    const pgCommand = ['psql', '-h', 'localhost', '-d', 'testdb', '-c', 'SELECT * FROM users'];
    const enhancedPg = externalLogService.preparePostgreSQLCommand(pgCommand.slice(1), 'user-auth-test');
    
    console.log(`   Original: ${pgCommand.join(' ')}`);
    console.log(`   Enhanced: psql ${enhancedPg.updatedArgs.join(' ')}`);
    console.log(`   Log Path: ${enhancedPg.logOutputPath}`);
    console.log(`   Changes: ${enhancedPg.changes.length} modifications\n`);

    // Example 2: Node.js command enhancement
    console.log('2️⃣ Node.js Application Enhancement:');
    const nodeCommand = ['node', 'server.js', '--port', '3000'];
    const enhancedNode = externalLogService.prepareNodeCommand(nodeCommand.slice(1), 'user-auth-test');
    
    console.log(`   Original: ${nodeCommand.join(' ')}`);
    console.log(`   Enhanced: node ${enhancedNode.updatedArgs.join(' ')}`);
    console.log(`   Log Path: ${enhancedNode.logOutputPath}\n`);

    // Example 3: Python command enhancement
    console.log('3️⃣ Python Script Enhancement:');
    const pythonCommand = ['python', 'test_auth.py', '--verbose'];
    const enhancedPython = externalLogService.preparePythonCommand(pythonCommand.slice(1), 'user-auth-test');
    
    console.log(`   Original: ${pythonCommand.join(' ')}`);
    console.log(`   Enhanced: python ${enhancedPython.updatedArgs.join(' ')}`);
    console.log(`   Log Path: ${enhancedPython.logOutputPath}\n`);

    // Demonstrate library logging
    console.log('📚 Library Logging Configuration:\n');
    
    // Mock library instances
    const mockPgClient = { 
      on: (event: string, _handler: Function) => {
        console.log(`   - Configured PostgreSQL ${event} event logging`);
      },
      query: () => {}
    };
    
    const mockLogger = {
      log: () => {},
      info: () => {},
      error: () => {},
      warn: () => {},
      debug: () => {}
    };

    console.log('4️⃣ PostgreSQL Client Logging:');
    externalLogService.capturePostgreSQLLogs(mockPgClient, 'user-auth-test');
    console.log('   ✓ Query and error logging configured\n');

    console.log('5️⃣ Generic Library Logging:');
    externalLogService.configureLibraryLogging('custom-logger', mockLogger, 'user-auth-test');
    console.log('   ✓ All log methods wrapped for capture');
    console.log(`   ✓ Methods intercepted: ${Object.keys(mockLogger).join(', ')}\n`);

    // Generate HTML version
    console.log('🎨 Generating Enhanced HTML Version...');
    
    const htmlOutput = await converter.convertFile(
      path.join(__dirname, 'sample.feature'),
      {
        format: 'enhanced-html',
        includeCodeSnippets: false,
        includeScreenshots: true,
        outputPath: path.join(__dirname, 'output', 'user-authentication-manual.html')
      }
    );

    console.log('✅ Enhanced HTML generated!');
    console.log(`📄 Output length: ${htmlOutput.length} characters\n`);

    // Show sample of BDD conversion
    console.log('📋 Sample BDD Conversion Output:');
    console.log('================================');
    const sampleLines = featureOutput.split('\n').slice(0, 30);
    console.log(sampleLines.join('\n') + '\n...\n');

    // List active captures
    const activeCaptures = externalLogService.getActiveCapturesForScenario('user-auth-test');
    console.log('📊 Active External Log Captures:');
    console.log('==============================');
    activeCaptures.forEach((capture, index) => {
      console.log(`${index + 1}. ${capture.name} (${capture.type})`);
      console.log(`   Format: ${capture.format}`);
      console.log(`   Path: ${capture.outputPath}`);
    });

    console.log('\n🎉 BDD Demo Complete!');
    console.log('Check the output directory for generated files.');

    // Feature comparison
    console.log('\n📈 Features Demonstrated:');
    console.log('========================');
    console.log('✅ BDD/Gherkin feature file parsing');
    console.log('✅ Scenario and step extraction');
    console.log('✅ Background step support');
    console.log('✅ Scenario Outline with Examples');
    console.log('✅ Tag preservation (@smoke, @critical, etc.)');
    console.log('✅ External executable log capture');
    console.log('✅ Library logging without code changes');
    console.log('✅ Tool-specific argument patterns');
    console.log('✅ Professional documentation generation');
    console.log('✅ Enhanced HTML output\n');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Additional demo showing BDD code parsing
async function runBDDCodeDemo() {
  console.log('\n🧪 BDD-Style Code Parsing Demo');
  console.log('==============================\n');

  const bddCode = `
describe('User Authentication', () => {
  scenario('User can login with valid credentials', () => {
    given('I am on the login page', () => {
      browser.navigateTo('/login');
    });
    
    when('I enter valid credentials', () => {
      loginPage.enterUsername('test@example.com');
      loginPage.enterPassword('SecurePass123');
      loginPage.clickSubmit();
    });
    
    then('I should be logged in successfully', () => {
      expect(dashboardPage.isDisplayed()).toBe(true);
      expect(dashboardPage.getWelcomeMessage()).toContain('Welcome');
    });
  });
});
  `;

  // Save BDD code to temp file
  const tempFile = path.join(__dirname, 'temp', 'bdd-test.spec.ts');
  await fileAPI.createDirectory(path.dirname(tempFile));
  await fileAPI.createFile(tempFile, bddCode, { type: FileType.TEMPORARY });

    console.log('✅ BDD-style code parsed successfully!');
    console.log('\n📋 Parsed Structure:');
    console.log('==================');
    console.log(output.substring(0, 500) + '...\n');

  } catch (error) {
    console.error('❌ BDD code parsing failed:', error);
  }
}

// Run the demos
async function main() {
  try {
    await runBDDDemo();
    await runBDDCodeDemo();
    
    console.log('🏆 All Demos Completed Successfully!');
  } catch (error) {
    console.error('❌ Demo execution failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

export { runBDDDemo, runBDDCodeDemo };