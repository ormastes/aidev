export const Database = jest.fn().mockImplementation(() => ({
  run: jest.fn(),
  get: jest.fn(),
  all: jest.fn(),
  close: jest.fn()
}));

export default {
  Database,
  verbose: jest.fn(() => ({ Database }))
};