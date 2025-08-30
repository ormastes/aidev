import { Given, When, Then } from '@cucumber/cucumber';

Given('I have admin privileges', function(): void {
  // Setup admin user
});

When('I create a new user with username {string}', function(username: string): void {
  // Create user
});

Then('the user {string} should exist in the system', function(username: string): void {
  // Verify user exists
});

When('I update the user {string} email to {string}', function(username: string, email: string): void {
  // Update user email
});

Then('the user {string} should have email {string}', function(username: string, email: string): void {
  // Verify email
});

When('I delete the user {string}', function(username: string): void {
  // Delete user
});

Then('the user {string} should not exist in the system', function(username: string): void {
  // Verify user deleted
});