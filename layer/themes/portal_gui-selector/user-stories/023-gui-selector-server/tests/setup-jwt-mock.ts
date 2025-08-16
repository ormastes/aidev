// Mock JWTService instance
const mockJWTService = {
  verifyAccessToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
  generateAccessToken: jest.fn(),
  generateRefreshToken: jest.fn(),
  getRefreshTokenExpiry: jest.fn()
};

// Mock the JWTService constructor
jest.mock('../src/services/JWTService', () => ({
  JWTService: jest.fn(() => mockJWTService)
}));

export { mockJWTService };