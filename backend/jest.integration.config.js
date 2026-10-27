// Integration tests: a real, disposable Postgres (see integration/README.md).
export default {
    testEnvironment: 'node',
    transform: {},
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    testMatch: ['<rootDir>/integration/**/*.test.js'],
    setupFiles: ['<rootDir>/integration/setup.js'],
    testTimeout: 60000,
    maxWorkers: 1,
};
