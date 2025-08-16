const { Given, When, Then } = require('@cucumber/cucumber');

Given('a performance test scenario', function() {
  // Setup performance test
});

When('I execute a time-consuming operation', function() {
  // Simulate slow operation
  const start = Date.now();
  while (Date.now() - start < 100) {
    // Busy wait for 100ms
  }
});

Then('the operation completes within {int} milliseconds', function(timeout) {
  // Verify timing
});