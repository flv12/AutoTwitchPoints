module.exports = {
    testEnvironment: 'jsdom',
    testMatch: ['**/src/**/*.test.js'],
    verbose: true,
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/**/*.test.js'
    ],
    coverageDirectory: 'coverage',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
};

