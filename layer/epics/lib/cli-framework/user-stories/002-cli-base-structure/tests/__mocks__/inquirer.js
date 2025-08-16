// Mock inquirer module
const inquirer = {
  prompt: jest.fn().mockResolvedValue({}),
  
  // Question types
  input: jest.fn(),
  confirm: jest.fn(),
  list: jest.fn(),
  checkbox: jest.fn(),
  password: jest.fn(),
  editor: jest.fn(),
  
  // Separators
  Separator: jest.fn(),
  
  // UI components
  ui: {
    BottomBar: jest.fn(),
    Prompt: jest.fn(),
  },
  
  // Default export
  default: {
    prompt: jest.fn().mockResolvedValue({}),
  },
};

module.exports = inquirer;
module.exports.default = inquirer;