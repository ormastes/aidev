#!/usr/bin/env node

import { generateAppCoverageReport } from '../src';
import { path } from '../../layer/themes/infra_external-log-lib/src';

async function main() {
  const args = process.argv.slice(2);
  
  const layerPath = args[0] || path.join(process.cwd(), 'layer');
  const outputDir = args[1] || path.join(process.cwd(), 'gen/doc/coverage');

  console.log('=== App Coverage Report Generator ===');
  console.log(`Layer path: ${layerPath}`);
  console.log(`Output directory: ${outputDir}`);
  console.log('');

  try {
    await generateAppCoverageReport(layerPath, outputDir);
    console.log('\n✅ Coverage report generation completed successfully!');
  } catch (error) {
    console.error('\n❌ Error generating coverage report:', error);
    process.exit(1);
  }
}

main();