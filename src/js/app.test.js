/**
 * Tests for AutoTwitchPoints extension
 * @jest-environment jsdom
 */

// Prevent auto-execution of app.js initialization code
document.readyState = 'loading';

const {
    logError,
    log,
    logDebug,
    findElementWithFallback,
    initPoints,
    tryClaimPoints,
    verifyAndCreditClaim,
    snapshotPointsDisplay,
    isStuck,
    stuckState,
    CLAIM_BUTTON_SELECTORS,
    POINTS_DISPLAY_SELECTORS
} = require('./app.js');

function addPointsAnimation(text) {
    const el = document.createElement('div');
    el.className = 'community-points-summary__points';
    el.textContent = text;
    document.body.appendChild(el);
    return el;
}

describe('AutoTwitchPoints', () => {

    beforeEach(() => {
        document.body.innerHTML = '';
        global.resetMockStorage();
        jest.clearAllMocks();
        jest.useRealTimers();
        stuckState.until = 0;
    });

    describe('Logging functions', () => {
        test('log() should output message with prefix', () => {
            log('test message');
            expect(console.log).toHaveBeenCalledWith('[AutoTwitchPoints] test message');
        });

        test('logError() should output error with prefix', () => {
            logError('test error');
            expect(console.error).toHaveBeenCalledWith('[AutoTwitchPoints] ❌ Error: test error');
        });

        test('logDebug() should not output when debug disabled', () => {
            logDebug('debug message');
            expect(console.debug).not.toHaveBeenCalled();
        });
    });

    describe('findElementWithFallback()', () => {
        test('should return null when no elements match', () => {
            const result = findElementWithFallback(['.non-existent', '.also-non-existent']);
            expect(result).toBeNull();
        });

        test('should return first matching element', () => {
            document.body.innerHTML = `
                <div class="claimable-bonus-test">Claim</div>
                <div class="other-element">Other</div>
            `;
            const result = findElementWithFallback(['[class*="claimable-bonus"]']);
            expect(result).not.toBeNull();
            expect(result.textContent).toBe('Claim');
        });

        test('should use fallback selector when primary fails', () => {
            document.body.innerHTML = `<div class="fallback-element">Fallback</div>`;
            const result = findElementWithFallback([
                '.non-existent-primary',
                '.fallback-element'
            ]);
            expect(result).not.toBeNull();
            expect(result.textContent).toBe('Fallback');
        });

        test('should return first matching selector in priority order', () => {
            document.body.innerHTML = `
                <div class="primary">Primary</div>
                <div class="secondary">Secondary</div>
            `;
            const result = findElementWithFallback(['.primary', '.secondary']);
            expect(result.textContent).toBe('Primary');
        });
    });

    describe('initPoints()', () => {
        test('should initialize storage with default values when empty', (done) => {
            global.setMockStorageData({});
            initPoints();
            setTimeout(() => {
                expect(global.chrome.storage.sync.get).toHaveBeenCalled();
                expect(global.chrome.storage.sync.set).toHaveBeenCalledWith(
                    expect.objectContaining({ points: 0, claims: 0 })
                );
                done();
            }, 10);
        });

        test('should not overwrite existing storage values', (done) => {
            global.setMockStorageData({ points: 100, claims: 5 });
            initPoints();
            setTimeout(() => {
                expect(global.chrome.storage.sync.get).toHaveBeenCalled();
                expect(global.chrome.storage.sync.set).not.toHaveBeenCalled();
                done();
            }, 10);
        });

        test('should initialize only missing values', (done) => {
            global.setMockStorageData({ points: 100 });
            initPoints();
            setTimeout(() => {
                expect(global.chrome.storage.sync.set).toHaveBeenCalledWith(
                    expect.objectContaining({ claims: 0 })
                );
                done();
            }, 10);
        });
    });

    describe('snapshotPointsDisplay()', () => {
        test('returns empty string when no points element exists', () => {
            expect(snapshotPointsDisplay()).toBe('');
        });

        test('returns trimmed textContent of the points element', () => {
            addPointsAnimation('  +10  ');
            expect(snapshotPointsDisplay()).toBe('+10');
        });
    });

    describe('tryClaimPoints()', () => {
        test('returns false when no claim button exists', () => {
            document.body.innerHTML = '<div>No button here</div>';
            expect(tryClaimPoints()).toBe(false);
        });

        test('clicks claim button and returns true when found', () => {
            const clickMock = jest.fn();
            document.body.innerHTML = `<button class="claimable-bonus-button">Claim</button>`;
            const button = document.querySelector('button');
            button.click = clickMock;

            expect(tryClaimPoints()).toBe(true);
            expect(clickMock).toHaveBeenCalled();
        });

        test('finds parent button when inner element matches', () => {
            const clickMock = jest.fn();
            document.body.innerHTML = `
                <button class="outer-button">
                    <span class="claimable-bonus-icon">Icon</span>
                </button>
            `;
            const button = document.querySelector('button');
            button.click = clickMock;

            expect(tryClaimPoints()).toBe(true);
            expect(clickMock).toHaveBeenCalled();
        });
    });

    describe('verifyAndCreditClaim()', () => {
        beforeEach(() => { jest.useFakeTimers(); });
        afterEach(() => { jest.useRealTimers(); });

        function setupButton() {
            const button = document.createElement('button');
            button.className = 'claimable-bonus-button';
            document.body.appendChild(button);
            return button;
        }

        test('credits points when a new "+50" animation appears', () => {
            global.setMockStorageData({ points: 100, claims: 2 });
            const button = setupButton();

            verifyAndCreditClaim(button, '');
            addPointsAnimation('+50');
            jest.advanceTimersByTime(250);

            expect(global.chrome.storage.sync.set).toHaveBeenCalledWith(
                { points: 150, claims: 3, channelStats: {} },
                expect.any(Function)
            );
        });

        test('credits different amounts (+100)', () => {
            global.setMockStorageData({ points: 200, claims: 5 });
            const button = setupButton();

            verifyAndCreditClaim(button, '');
            addPointsAnimation('+100');
            jest.advanceTimersByTime(250);

            expect(global.chrome.storage.sync.set).toHaveBeenCalledWith(
                { points: 300, claims: 6, channelStats: {} },
                expect.any(Function)
            );
        });

        test('handles non-breaking spaces in animation text', () => {
            global.setMockStorageData({ points: 0, claims: 0 });
            const button = setupButton();

            verifyAndCreditClaim(button, '');
            addPointsAnimation('+ 50');
            jest.advanceTimersByTime(250);

            expect(global.chrome.storage.sync.set).toHaveBeenCalledWith(
                { points: 50, claims: 1, channelStats: {} },
                expect.any(Function)
            );
        });

        test('ignores animation matching snapshot (viewing reward already on screen)', () => {
            global.setMockStorageData({ points: 100, claims: 2 });
            // +10 viewing reward already visible at click time
            addPointsAnimation('+10');
            const button = setupButton();
            button.remove(); // Twitch removes the button on a real claim

            verifyAndCreditClaim(button, '+10');
            jest.advanceTimersByTime(3000);

            expect(global.chrome.storage.sync.set).not.toHaveBeenCalled();
        });

        test('does NOT credit a fallback +50 when no animation appears', () => {
            global.setMockStorageData({ points: 100, claims: 2 });
            const button = setupButton();
            button.remove(); // click registered (button gone) but no animation

            verifyAndCreditClaim(button, '');
            jest.advanceTimersByTime(3000);

            expect(global.chrome.storage.sync.set).not.toHaveBeenCalled();
            expect(isStuck()).toBe(false);
        });

        test('marks stuck when button remains in DOM after timeout', () => {
            const button = setupButton();

            verifyAndCreditClaim(button, '');
            expect(isStuck()).toBe(false);

            jest.advanceTimersByTime(3000);

            expect(isStuck()).toBe(true);
            expect(global.chrome.storage.sync.set).not.toHaveBeenCalled();
        });

        test('does not match an element without "+" sign (current balance)', () => {
            global.setMockStorageData({ points: 100, claims: 2 });
            const button = setupButton();
            button.remove();
            addPointsAnimation('5000');

            verifyAndCreditClaim(button, '');
            jest.advanceTimersByTime(3000);

            expect(global.chrome.storage.sync.set).not.toHaveBeenCalled();
        });
    });

    describe('Selectors', () => {
        test('CLAIM_BUTTON_SELECTORS should contain claimable-bonus selector', () => {
            expect(CLAIM_BUTTON_SELECTORS).toContain('[class*="claimable-bonus"]');
        });

        test('POINTS_DISPLAY_SELECTORS should contain points summary selector', () => {
            expect(POINTS_DISPLAY_SELECTORS).toContain('[class*="community-points-summary__points"]');
        });
    });

    describe('Integration scenarios', () => {
        beforeEach(() => { jest.useFakeTimers(); });
        afterEach(() => { jest.useRealTimers(); });

        test('successful claim: button disappears AND new animation appears', () => {
            global.setMockStorageData({ points: 500, claims: 10 });
            document.body.innerHTML = `<button class="claimable-bonus-button">Claim</button>`;
            const button = document.querySelector('button');
            button.click = jest.fn(() => {
                // Real Twitch: button removed, animation appears
                button.remove();
                addPointsAnimation('+50');
            });

            expect(tryClaimPoints()).toBe(true);
            expect(button.click).toHaveBeenCalled();

            jest.advanceTimersByTime(250);

            expect(global.chrome.storage.sync.set).toHaveBeenCalledWith(
                { points: 550, claims: 11, channelStats: {} },
                expect.any(Function)
            );
            expect(isStuck()).toBe(false);
        });

        test('stuck-button scenario (post PC sleep): no credit, stuck cooldown set', () => {
            global.setMockStorageData({ points: 500, claims: 10 });
            document.body.innerHTML = `<button class="claimable-bonus-button">Claim</button>`;
            const button = document.querySelector('button');
            button.click = jest.fn(); // click no-ops, button stays, no animation

            expect(tryClaimPoints()).toBe(true);
            jest.advanceTimersByTime(3000);

            expect(global.chrome.storage.sync.set).not.toHaveBeenCalled();
            expect(isStuck()).toBe(true);
        });

        test('viewing-reward already on screen at click time is not double-counted', () => {
            global.setMockStorageData({ points: 500, claims: 10 });
            addPointsAnimation('+10'); // viewing reward already visible
            document.body.innerHTML += `<button class="claimable-bonus-button">Claim</button>`;
            const button = document.querySelector('button');
            button.click = jest.fn(() => {
                // Click no-ops on the stuck button; +10 stays as-is
            });

            expect(tryClaimPoints()).toBe(true);
            jest.advanceTimersByTime(3000);

            // +10 was the snapshot, so unchanged text must not credit
            expect(global.chrome.storage.sync.set).not.toHaveBeenCalled();
        });
    });

    describe('i18n API', () => {
        test('returns translation for known key', () => {
            expect(global.browserAPI.i18n.getMessage('pointsCollected')).toBe('Points collected');
        });

        test('returns key for unknown key', () => {
            expect(global.browserAPI.i18n.getMessage('unknownKey')).toBe('unknownKey');
        });
    });
});
