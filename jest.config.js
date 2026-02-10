module.exports = {
    testEnvironment: 'jsdom',
    testMatch: ['**/*.test.js'],
    verbose: true,
    collectCoverageFrom: [
        'js/**/*.js',
        '!js/**/*.test.js'
    ],
    coverageDirectory: 'coverage',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
};

