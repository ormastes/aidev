/**
 * Example usage of MFTOD converter
 */

import { MFTODConverter } from '../src';
import { path } from '../../../../infra_external-log-lib/src';

async function main() {
  const converter = new MFTODConverter();
  
  console.log('Converting sample test file...\n');
  
  // Convert to Markdown
  const markdownResult = await converter.convertFile(
    path.join(__dirname, 'sample-test.ts'),
    {
      format: 'markdown',
      template: 'detailed',
      includeCodeSnippets: false
    }
  );
  
  console.log('=== Markdown Output ===');
  console.log(markdownResult);
  console.log('\n');
  
  // Convert to HTML
  await converter.convertFile(
    path.join(__dirname, 'sample-test.ts'),
    {
      format: 'html',
      template: 'detailed',
      includeCodeSnippets: false,
      outputPath: path.join(__dirname, 'output', 'manual-tests.html')
    }
  );
  
  console.log('HTML file saved to: examples/output/manual-tests.html');
  
  // Convert entire directory
  console.log('\nConverting all test files in current directory...');
  const results = await converter.convertDirectory(__dirname, {
    format: 'markdown',
    outputPath: path.join(__dirname, 'output'),
    recursive: false,
    pattern: /sample.*\.ts$/
  });
  
  console.log(`Converted ${results.size} files`);
}

main().catch(console.error);