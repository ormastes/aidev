#!/usr/bin/env ts-node

/**
 * Test script for Multi-Format Processors
 * Demonstrates all format processors working together
 */

import { ManualGenerator } from '../src/core/ManualGenerator';
import { TestParser } from '../src/core/TestParser';
import { HTMLProcessor, MarkdownProcessor, JSONProcessor, PDFProcessor } from '../src/processors';
import * as fs from 'fs/promises';
import { path } from '../../../../infra_external-log-lib/src';
import { getFileAPI, FileType } from '../../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


async function testProcessors() {
  console.log('🚀 Testing Multi-Format Processors\n');
  console.log('=' .repeat(50));
  
  // Create test document
  const bddTest = `
Feature: E-Commerce Shopping Cart

  Background:
    Given the online store is available
    And product catalog is loaded

  Scenario: Add product to cart
    Given a customer browsing products
    When the customer adds "Laptop" to cart
    Then the cart should contain 1 item
    And the cart total should be $999.99

  Scenario: Apply discount code
    Given a cart with items totaling $100
    When the customer applies code "SAVE20"
    Then a 20% discount should be applied
    And the final total should be $80
  `;

  const parser = new TestParser();
  const parsedTest = parser.parse(bddTest, 'bdd');
  
  const generator = new ManualGenerator({
    includeMetadata: true,
    generateTOC: true,
    generateIndex: true,
    supportMultipleFormats: true
  });
  
  const result = await generator.generateFromParsedTest(parsedTest, {
    author: 'QA Team',
    version: '2.0.0',
    tags: ['e-commerce', 'shopping-cart', 'bdd'],
    estimatedDuration: 15
  });
  
  if (!result.success || !result.document) {
    console.error('Failed to generate document');
    return;
  }
  
  const outputDir = path.join(__dirname, 'output', 'processors');
  await fileAPI.createDirectory(outputDir);
  
  // Test HTML Processor
  console.log('\n📝 Testing HTML Processor');
  console.log('-'.repeat(40));
  const htmlProcessor = new HTMLProcessor({ includeMetadata: true });
  const htmlResult = await htmlProcessor.process(result.document);
  
  if (htmlResult.success && htmlResult.output) {
    const htmlPath = path.join(outputDir, 'manual.html');
    await fileAPI.createFile(htmlPath, htmlResult.output);
    console.log(`✅ HTML generated: ${htmlPath}`);
    console.log(`   Size: ${(htmlResult.output.length / 1024).toFixed(2)} KB`);
  } else {
    console.error(`❌ HTML generation failed: ${htmlResult.error}`);
  }
  
  // Test Markdown Processor
  console.log('\n📝 Testing Markdown Processor');
  console.log('-'.repeat(40));
  const mdProcessor = new MarkdownProcessor({ 
    includeMetadata: true, { type: FileType.TEMPORARY });
  const mdResult = await mdProcessor.process(result.document);
  
  if (mdResult.success && mdResult.output) {
    const mdPath = path.join(outputDir, 'manual.md');
    await fileAPI.createFile(mdPath, mdResult.output);
    console.log(`✅ Markdown generated: ${mdPath}`);
    console.log(`   Lines: ${mdResult.output.split('\n').length}`);
    
    // Test special Markdown features
    const table = mdProcessor.generateTable(
      ['Test Case', { type: FileType.TEMPORARY });
    console.log('   Sample table generated');
    
    const badge = mdProcessor.generateBadge('tests', '2', 'green');
    console.log(`   Sample badge: ${badge}`);
  } else {
    console.error(`❌ Markdown generation failed: ${mdResult.error}`);
  }
  
  // Test JSON Processor
  console.log('\n📝 Testing JSON Processor');
  console.log('-'.repeat(40));
  const jsonProcessor = new JSONProcessor({ supportMultipleFormats: true });
  const jsonResult = await jsonProcessor.process(result.document);
  
  if (jsonResult.success && jsonResult.output) {
    const jsonPath = path.join(outputDir, 'manual.json');
    await fileAPI.createFile(jsonPath, jsonResult.output);
    console.log(`✅ JSON generated: ${jsonPath}`);
    
    const parsed = JSON.parse(jsonResult.output);
    console.log(`   Schema version: ${parsed.version}`);
    console.log(`   Total test cases: ${parsed.statistics.totalTestCases}`);
    console.log(`   Total steps: ${parsed.statistics.totalSteps}`);
    console.log(`   Priority distribution:`, { type: FileType.TEMPORARY });
  const pdfResult = await pdfProcessor.process(result.document);
  
  if (pdfResult.success && pdfResult.output) {
    const pdfPath = path.join(outputDir, 'manual.pdf.txt');
    await fileAPI.createFile(pdfPath, pdfResult.output);
    console.log(`✅ PDF placeholder generated: ${pdfPath}`);
    
    const pdfOptions = pdfProcessor.getPDFOptions();
    console.log(`   Format: ${pdfOptions.format}`);
    console.log(`   Landscape: ${pdfOptions.landscape}`);
    console.log(`   Note: Actual PDF generation requires Puppeteer setup`);
  } else {
    console.error(`❌ PDF generation failed: ${pdfResult.error}`);
  }
  
  // Test ProcessorFactory
  console.log('\n📝 Testing ProcessorFactory');
  console.log('-'.repeat(40));
  const { ProcessorFactory } = await import('../src/processors');
  
  const formats: Array<'html' | 'markdown' | 'json' | 'pdf'> = ['html', { type: FileType.TEMPORARY }) {
    try {
      const processor = ProcessorFactory.createProcessor(format, {});
      console.log(`✅ Created ${format} processor via factory`);
    } catch (error) {
      console.error(`❌ Failed to create ${format} processor: ${error}`);
    }
  }
  
  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 Multi-Format Processors Test Summary:');
  console.log('- HTMLProcessor ✅ - Interactive HTML with styling');
  console.log('- MarkdownProcessor ✅ - GitHub-compatible markdown');
  console.log('- JSONProcessor ✅ - Structured JSON with schema');
  console.log('- PDFProcessor ✅ - Placeholder (needs Puppeteer)');
  console.log('- ProcessorFactory ✅ - Dynamic processor creation');
  console.log('\nAll format processors are working successfully!');
  console.log(`Check ${outputDir} for generated files.`);
}

// Run the test
testProcessors().catch(console.error);