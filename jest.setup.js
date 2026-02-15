/**
 * Jest setup file - Mock browser extension APIs
 */

// Mock browser/chrome API
const mockStorage = {
    data: {},
    get: jest.fn((keys, callback) => {
        const result = {};
        if (Array.isArray(keys)) {
            keys.forEach(key => {
                if (mockStorage.data[key] !== undefined) {
                    result[key] = mockStorage.data[key];
                }
            });
        } else if (typeof keys === 'object') {
            Object.keys(keys).forEach(key => {
                result[key] = mockStorage.data[key] !== undefined ? mockStorage.data[key] : keys[key];
            });
        }
        if (callback) callback(result);
        return Promise.resolve(result);
    }),
    set: jest.fn((items, callback) => {
        Object.assign(mockStorage.data, items);
        if (callback) callback();
        return Promise.resolve();
    }),
    clear: jest.fn(() => {
        mockStorage.data = {};
        return Promise.resolve();
    })
};

const mockBrowserAPI = {
    storage: {
        sync: mockStorage,
        onChanged: {
            addListener: jest.fn()
        }
    },
    runtime: {
        lastError: null
    },
    i18n: {
        getMessage: jest.fn((key, substitutions) => {
            // Simple mock that returns the key or a test translation
            const translations = {
                'pointsCollected': 'Points collected',
                'claims': 'Claims',
                'averagePerClaim': 'Average/claim',
                'extensionActive': 'Extension active',
                'resetStats': 'Reset statistics',
                'confirmReset': 'Reset all statistics?',
                'confirm': 'Confirm',
                'cancel': 'Cancel',
                'logInitializing': 'Initializing storage...',
                'logLoaded': 'AutoTwitchPoints v2.1 loaded!'
            };
            return translations[key] || key;
        })
    }
};

// Expose mock to global scope
global.chrome = mockBrowserAPI;
global.browser = mockBrowserAPI;
global.browserAPI = mockBrowserAPI;

// Helper to reset storage between tests
global.resetMockStorage = () => {
    mockStorage.data = {};
    mockStorage.get.mockClear();
    mockStorage.set.mockClear();
};

// Helper to set initial storage data
global.setMockStorageData = (data) => {
    mockStorage.data = { ...data };
};

// Suppress console output during tests (optional - comment out for debugging)
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
};

