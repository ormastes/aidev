const { Given, When, Then } = require('@cucumber/cucumber');

Given('I have admin privileges', function() {
  // Setup admin user
});

When('I create a new user with username {string}', function(username) {
  // Create user
});

Then('the user {string} should exist in the system', function(username) {
  // Verify user exists
});

When('I update the user {string} email to {string}', function(username, email) {
  // Update user email
});

Then('the user {string} should have email {string}', function(username, email) {
  // Verify email
});

When('I delete the user {string}', function(username) {
  // Delete user
});

Then('the user {string} should not exist in the system', function(username) {
  // Verify user deleted
});