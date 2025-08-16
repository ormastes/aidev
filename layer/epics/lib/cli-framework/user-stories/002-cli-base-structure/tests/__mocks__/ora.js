// Mock ora module
const mockSpinner = {
  start: jest.fn().mockReturnThis(),
  stop: jest.fn().mockReturnThis(),
  succeed: jest.fn().mockReturnThis(),
  fail: jest.fn().mockReturnThis(),
  warn: jest.fn().mockReturnThis(),
  info: jest.fn().mockReturnThis(),
  text: '',
  isSpinning: false,
  
  // Chainable methods
  clear: jest.fn().mockReturnThis(),
  render: jest.fn().mockReturnThis(),
  frame: jest.fn().mockReturnThis(),
};

const ora = jest.fn(() => mockSpinner);

// Add static methods
ora.promise = jest.fn();

module.exports = ora;
module.exports.default = ora;