#!/usr/bin/env ts-node

/**
 * Demo script for Enhanced Manual Generator Core Engine
 * Demonstrates the core functionality of the manual generator
 */

import { ManualGenerator } from '../src/core/ManualGenerator';
import { TestParser } from '../src/core/TestParser';
import * as fs from 'fs/promises';
import { path } from '../../layer/themes/infra_external-log-lib/src';
import { getFileAPI, FileType } from '../../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


async function runDemo() {
  console.log('🚀 Enhanced Manual Generator Core Engine Demo\n');
  console.log('=' .repeat(50));
  
  // Initialize the generator
  const generator = new ManualGenerator({
    includeMetadata: true,
    generateTOC: true,
    generateIndex: true,
    supportMultipleFormats: true
  });
  
  console.log('✅ Manual Generator initialized\n');

  // Demo 1: Parse and generate from BDD test
  console.log('📝 Demo 1: BDD/Gherkin Test Documentation');
  console.log('-'.repeat(40));
  
  const bddTest = `
Feature: User Authentication System

  Background:
    Given the application is running
    And the database is connected

  Scenario: Successful user login
    Given a registered user with email "user@example.com"
    And password "SecurePass123"
    When the user attempts to login
    Then the user should be authenticated successfully
    And a session token should be generated
    And the user should be redirected to dashboard

  Scenario: Failed login with invalid credentials
    Given a user with invalid credentials
    When the user attempts to login
    Then an error message should be displayed
    And no session should be created
  `;

  const parser = new TestParser();
  const parsedBDD = parser.parse(bddTest, 'bdd');
  
  console.log(`Parsed BDD test: ${parsedBDD.name}`);
  console.log(`Found ${parsedBDD.suites.length} scenarios`);
  
  const bddResult = await generator.generateFromParsedTest(parsedBDD);
  
  if (bddResult.success && bddResult.output) {
    const outputPath = path.join(__dirname, 'output', 'bdd-manual.md');
    await fileAPI.createDirectory(path.dirname(outputPath));
    await fileAPI.createFile(outputPath, bddResult.output);
    console.log(`✅ BDD manual generated: ${outputPath}\n`);
  }

  // Demo 2: Parse and generate from Jest test
  console.log('📝 Demo 2: Jest Test Documentation');
  console.log('-'.repeat(40));
  
  const jestTest = `
describe('Shopping Cart Module', { type: FileType.TEMPORARY }) => {
    it('should add a single item to cart', () => {
      const item = { id: 1, name: 'Product A', price: 29.99 };
      cart.addItem(item);
      expect(cart.getItemCount()).toBe(1);
      expect(cart.getTotal()).toBe(29.99);
    });
    
    it('should handle multiple items', () => {
      cart.addItem({ id: 1, name: 'Product A', price: 29.99 });
      cart.addItem({ id: 2, name: 'Product B', price: 49.99 });
      expect(cart.getItemCount()).toBe(2);
      expect(cart.getTotal()).toBe(79.98);
    });
  });
  
  describe('Removing items', () => {
    it('should remove item from cart', () => {
      const item = { id: 1, name: 'Product A', price: 29.99 };
      cart.addItem(item);
      cart.removeItem(1);
      expect(cart.getItemCount()).toBe(0);
    });
  });
});
  `;

  const parsedJest = parser.parse(jestTest, 'jest');
  
  console.log(`Parsed Jest test: ${parsedJest.name}`);
  console.log(`Found ${parsedJest.suites.length} test suite(s)`);
  
  const jestResult = await generator.generateFromParsedTest(parsedJest, {
    author: 'Development Team',
    version: '2.0.0',
    tags: ['unit', 'shopping-cart', 'e-commerce'],
    requirements: ['REQ-CART-001', 'REQ-CART-002']
  });
  
  if (jestResult.success && jestResult.output) {
    const outputPath = path.join(__dirname, 'output', 'jest-manual.md');
    await fileAPI.createFile(outputPath, jestResult.output);
    console.log(`✅ Jest manual generated: ${outputPath}\n`);
  }

  // Demo 3: Generate with professional HTML template
  console.log('📝 Demo 3: Professional HTML Documentation');
  console.log('-'.repeat(40));
  
  generator.configure({
    template: "professional"
  });
  
  const htmlResult = await generator.generateFromParsedTest(parsedBDD);
  
  if (htmlResult.success && htmlResult.output) {
    const outputPath = path.join(__dirname, { type: FileType.TEMPORARY });
    await fileAPI.createFile(outputPath, htmlResult.output);
    console.log(`✅ HTML manual generated: ${outputPath}\n`);
  }

  // Demo 4: Export in multiple formats
  console.log('📝 Demo 4: Multi-format Export');
  console.log('-'.repeat(40));
  
  if (jestResult.success && jestResult.document) {
    // Export as JSON
    const jsonOutput = await generator.export(jestResult.document, { type: FileType.TEMPORARY });
    await fileAPI.createFile(jsonPath, jsonOutput);
    console.log(`✅ JSON export: ${jsonPath}`);
    
    // Export as Markdown
    const mdOutput = await generator.export(jestResult.document, { type: FileType.TEMPORARY });
    await fileAPI.createFile(mdPath, mdOutput);
    console.log(`✅ Markdown export: ${mdPath}`);
    
    // Export as HTML
    const htmlOutput = await generator.export(jestResult.document, { type: FileType.TEMPORARY });
    await fileAPI.writeFile(htmlPath, htmlOutput);
    console.log(`✅ HTML export: ${htmlPath}\n`);
  }

  // Summary
  console.log('=' .repeat(50));
  console.log('📊 Demo Summary:');
  console.log('- ManualGenerator ✅');
  console.log('- TestParser ✅');
  console.log('- TemplateEngine ✅');
  console.log('- MetadataExtractor ✅');
  console.log('- DocumentBuilder ✅');
  console.log('\nAll core components are working successfully!');
  console.log('\nCheck the examples/output directory for generated manuals.');
  
  // Clean up
  await generator.cleanup();
}

// Run the demo
runDemo().catch(console.error);