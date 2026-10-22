module.exports = {
    preset: 'jest-expo',
    testMatch: ['**/__tests__/**/*.test.ts?(x)'],
    testPathIgnorePatterns: ['/node_modules/', '/android/', '/dist/', 'testServer\\.ts$'],
    setupFiles: ['<rootDir>/jest.setup.js'],
};
