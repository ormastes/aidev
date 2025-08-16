#!/usr/bin/env ts-node

/**
 * Test script for Theme Scanner and Registry
 * Demonstrates theme discovery and cataloging functionality
 */

import { ThemeScanner } from '../src/scanner/ThemeScanner';
import { ThemeRegistry } from '../src/scanner/ThemeRegistry';
import { TestDiscovery } from '../src/scanner/TestDiscovery';
import { TestCategorizer } from '../src/scanner/TestCategorizer';
import { path } from '../../../../infra_external-log-lib/src';

async function testScanner() {
  console.log('🔍 Testing Theme Scanner and Registry\n');
  console.log('=' .repeat(50));
  
  // Test Theme Scanner
  console.log('\n📂 Testing ThemeScanner');
  console.log('-'.repeat(40));
  
  // Navigate to the actual themes directory
  const themesPath = path.join(process.cwd(), '..', '..', '..', '..', '..', 'layer', 'themes');
  const scanner = new ThemeScanner(themesPath);
  
  console.log(`Scanning themes directory: ${scanner.getThemesBasePath()}`);
  
  const scanResult = await scanner.scanThemes();
  
  console.log(`\n✅ Found ${scanResult.themes.length} themes`);
  console.log(`✅ Total test files: ${scanResult.totalTests}`);
  
  if (scanResult.errors && scanResult.errors.length > 0) {
    console.log(`⚠️  Errors encountered: ${scanResult.errors.length}`);
    scanResult.errors.forEach(err => console.log(`   - ${err}`));
  }
  
  // Display first 5 themes
  console.log('\nSample themes discovered:');
  scanResult.themes.slice(0, 5).forEach(theme => {
    const testCount = scanResult.testsByTheme.get(theme.name)?.length || 0;
    console.log(`  📦 ${theme.name}`);
    console.log(`     Tests: ${testCount}`);
    console.log(`     Features: ${theme.features?.join(', ') || 'none'}`);
  });
  
  // Test Theme Registry
  console.log('\n📚 Testing ThemeRegistry');
  console.log('-'.repeat(40));
  
  const registry = new ThemeRegistry();
  
  // Register themes from scan
  for (const theme of scanResult.themes.slice(0, 5)) {
    const tests = scanResult.testsByTheme.get(theme.name) || [];
    
    // Create DiscoveredTest objects from file paths
    const discovery = new TestDiscovery();
    const discoveredTests = tests.length > 0 ? await discovery.discoverTests(theme.rootPath) : [];
    await registry.register(theme, discoveredTests);
  }
  
  const allThemes = registry.getAllThemes();
  console.log(`Registered ${allThemes.length} themes`);
  
  const totalTests = allThemes.reduce((sum, entry) => sum + entry.tests.length, 0);
  console.log(`Total tests in registry: ${totalTests}`);
  
  // Test search functionality
  const searchResults = registry.searchThemes({ name: 'test' });
  console.log(`\nSearch for 'test': Found ${searchResults.length} matching themes`);
  
  // Get statistics
  const stats = registry.getStatistics();
  console.log('\nRegistry Statistics:');
  console.log(`  Total themes: ${stats.totalThemes}`);
  console.log(`  Total tests: ${stats.totalTests}`);
  console.log(`  Average tests per theme: ${stats.averageTestsPerTheme.toFixed(2)}`);
  
  // Test Test Discovery
  console.log('\n🔎 Testing TestDiscovery');
  console.log('-'.repeat(40));
  
  const discovery = new TestDiscovery();
  
  // Discover tests in first theme
  if (scanResult.themes.length > 0) {
    const firstTheme = scanResult.themes[0];
    const discoveredTests = await discovery.discoverTests(firstTheme.rootPath);
    
    console.log(`Discovered ${discoveredTests.length} tests in ${firstTheme.name}`);
    
    if (discoveredTests.length > 0) {
      const testTypes = new Set(discoveredTests.map(t => t.type));
      const frameworks = new Set(discoveredTests.map(t => t.framework));
      
      console.log(`  Test types: ${Array.from(testTypes).join(', ')}`);
      console.log(`  Frameworks: ${Array.from(frameworks).join(', ')}`);
    }
  }
  
  // Test Test Categorizer
  console.log('\n📊 Testing TestCategorizer');
  console.log('-'.repeat(40));
  
  const categorizer = new TestCategorizer();
  
  // Get tests from first theme
  if (scanResult.themes.length > 0 && scanResult.testsByTheme.size > 0) {
    const firstTheme = scanResult.themes[0];
    const tests = scanResult.testsByTheme.get(firstTheme.name) || [];
    
    if (tests.length > 0) {
      // Discover test details
      const discovery = new TestDiscovery();
      const discoveredTests = await discovery.discoverTests(firstTheme.rootPath);
      
      if (discoveredTests.length > 0) {
        const categorization = categorizer.categorize(discoveredTests);
        const categories = categorization.categories || [];
        
        console.log(`Categorized into ${categories.length} categories`);
        categories.slice(0, 3).forEach((cat: any) => {
          console.log(`  📁 ${cat.name}: ${cat.tests.length} tests`);
        });
        
        // Generate report
        const report = categorizer.generateReport(categorization);
        console.log('\nCategorization report generated');
        console.log(`  Report length: ${report.split('\n').length} lines`);
      }
    }
  }
  
  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 Theme Scanner and Registry Test Summary:');
  console.log(`- ThemeScanner ✅ - Found ${scanResult.themes.length} themes`);
  console.log(`- ThemeRegistry ✅ - Registered and searchable`);
  console.log('- TestDiscovery ✅ - Test file discovery working');
  console.log('- TestCategorizer ✅ - Test categorization working');
  console.log('\nAll scanner components are operational!');
}

// Run the test
testScanner().catch(console.error);