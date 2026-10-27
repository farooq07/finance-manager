module.exports = {
    preset: 'jest-expo',
    testMatch: ['**/__tests__/**/*.test.ts?(x)'],
    testPathIgnorePatterns: ['/node_modules/', '/android/', '/dist/', 'testServer\\.ts$'],
    setupFiles: ['<rootDir>/jest.setup.js'],
    // Cold runs load icon fonts and the RN renderer; 5s is too tight on Windows.
    testTimeout: 15000,
};
