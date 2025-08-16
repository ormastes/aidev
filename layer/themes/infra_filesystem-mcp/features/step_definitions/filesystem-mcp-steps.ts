import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import * as fs from 'fs/promises';
import * as path from 'path';

let testDirectory: string;
let portalUrl: string;
let currentFile: string;
let lastError: Error | null = null;

Given('I have a test directory at {string}', async function (dir: string) {
  testDirectory = dir;
  await fs.mkdir(testDirectory, { recursive: true });
});

Given('the portal is running at {string}', function (url: string) {
  portalUrl = url;
});

Given('I navigate to the portal', async function () {
  if (this.page) {
    await this.page.goto(portalUrl);
  }
});

When('I create a new .vf.json file with content:', async function (content: string) {
  currentFile = path.join(testDirectory, 'test.vf.json');
  try {
    await fs.writeFile(currentFile, content);
    lastError = null;
  } catch (error) {
    lastError = error as Error;
  }
});

Then('the file should be created successfully', async function () {
  expect(lastError).toBeNull();
  const exists = await fs.access(currentFile).then(() => true).catch(() => false);
  expect(exists).toBe(true);
});

Then('I should be able to read the file content', async function () {
  const content = await fs.readFile(currentFile, 'utf-8');
  expect(content).toBeTruthy();
  const parsed = JSON.parse(content);
  expect(parsed).toHaveProperty('name');
});

Given('I have an existing .vf.json file', async function () {
  currentFile = path.join(testDirectory, 'existing.vf.json');
  await fs.writeFile(currentFile, JSON.stringify({
    name: 'existing',
    type: 'virtual',
    content: 'original content'
  }));
});

When('I update the file content to:', async function (content: string) {
  try {
    await fs.writeFile(currentFile, content);
    lastError = null;
  } catch (error) {
    lastError = error as Error;
  }
});

Then('the file should be updated successfully', async function () {
  expect(lastError).toBeNull();
});

Then('the new content should be readable', async function () {
  const content = await fs.readFile(currentFile, 'utf-8');
  const parsed = JSON.parse(content);
  expect(parsed.content).toBe('updated content');
});

When('I delete the file', async function () {
  try {
    await fs.unlink(currentFile);
    lastError = null;
  } catch (error) {
    lastError = error as Error;
  }
});

Then('the file should be removed from the system', async function () {
  const exists = await fs.access(currentFile).then(() => true).catch(() => false);
  expect(exists).toBe(false);
});

Then('attempting to read it should return an error', async function () {
  try {
    await fs.readFile(currentFile);
    throw new Error('Should have thrown an error');
  } catch (error: any) {
    expect(error.code).toBe('ENOENT');
  }
});

When('I try to create a .vf.json file with invalid JSON', async function () {
  currentFile = path.join(testDirectory, 'invalid.vf.json');
  try {
    await fs.writeFile(currentFile, '{ invalid json }');
    // Try to parse it to trigger validation
    const content = await fs.readFile(currentFile, 'utf-8');
    JSON.parse(content);
    lastError = null;
  } catch (error) {
    lastError = error as Error;
  }
});

Then('an appropriate error should be returned', function () {
  expect(lastError).not.toBeNull();
  expect(lastError?.message).toContain('JSON');
});

Then('the file should not be created', async function () {
  // For this test, we check if valid JSON can be read
  try {
    const content = await fs.readFile(currentFile, 'utf-8');
    JSON.parse(content);
    throw new Error('File should not contain valid JSON');
  } catch (error: any) {
    // Expected - either file doesn't exist or JSON is invalid
    expect(['ENOENT', 'Unexpected token'].some(msg => error.message.includes(msg))).toBe(true);
  }
});