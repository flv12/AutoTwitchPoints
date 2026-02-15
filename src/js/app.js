/**
 * Browser API compatibility wrapper (Chrome/Firefox)
 */
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

/**
 * Debug mode flag (loaded from storage)
 */
let debugEnabled = false;

// Load debug setting from storage
browserAPI.storage.sync.get(['debugEnabled'], function(data) {
    debugEnabled = data?.debugEnabled || false;
});

// Listen for changes to debug setting
browserAPI.storage.onChanged.addListener(function(changes, areaName) {
    if (areaName === 'sync' && changes.debugEnabled) {
        debugEnabled = changes.debugEnabled.newValue;
        log(`🔧 Debug mode ${debugEnabled ? 'enabled' : 'disabled'}`);
    }
});

/**
 * Resilient selectors for claim button detection
 * Ordered by priority: most reliable first
 */
const CLAIM_BUTTON_SELECTORS = [
    '[class*="claimable-bonus"]'
];

/**
 * Resilient selectors for points display after claim
 * These should match the "+50" animation, NOT the current points counter
 */
const POINTS_DISPLAY_SELECTORS = [
    '[class*="community-points-summary__points"]'
];

/**
 * Log error to console
 * @param {*} error
 */
function logError(error) {
    console.error(`[AutoTwitchPoints] ❌ Error: ${error}`);
}

/**
 * Log info to console
 * @param {string} message
 */
function log(message) {
    console.log(`[AutoTwitchPoints] ${message}`);
}

/**
 * Log debug info to console (only when debug mode is enabled)
 * @param {string} message
 */
function logDebug(message) {
    if (debugEnabled) {
        console.debug(`[AutoTwitchPoints] 🔍 ${message}`);
    }
}

/**
 * Get the current channel name from the URL
 * @returns {string|null}
 */
function getChannelName() {
    const path = window.location.pathname;
    // Match /channelname or /channelname/something
    const match = path.match(/^\/([a-zA-Z0-9_]+)/);
    if (match && match[1]) {
        // Exclude Twitch system pages
        const excludedPaths = ['directory', 'settings', 'subscriptions', 'inventory', 'wallet', 'drops', 'videos', 'following', 'search', 'downloads', 'turbo', 'jobs', 'p', 'user'];
        if (!excludedPaths.includes(match[1].toLowerCase())) {
            return match[1].toLowerCase();
        }
    }
    return null;
}

/**
 * Find element using resilient selectors with fallback
 * @param {string[]} selectors - Array of selectors to try
 * @returns {Element|null}
 */
function findElementWithFallback(selectors) {
    for (let i = 0; i < selectors.length; i++) {
        const element = document.querySelector(selectors[i]);
        if (element) {
            if (i > 0) {
                log(`⚠️ Primary selector failed, using fallback #${i}: ${selectors[i]}`);
            } else {
                logDebug(`Found element with selector: ${selectors[i]}`);
            }
            return element;
        }
    }
    logDebug(`No element found with any of ${selectors.length} selectors`);
    return null;
}

/**
 * Check for points storage existence and if not, initialize storage
 */
function initPoints() {
    log('🚀 Initializing storage...');
    try {
        browserAPI.storage.sync.get(['points', 'claims'], function(data) {
            if (browserAPI.runtime.lastError) {
                logError(browserAPI.runtime.lastError);
                return;
            }
            const updates = {};
            if (!data || data.points === undefined) updates.points = 0;
            if (!data || data.claims === undefined) updates.claims = 0;
            if (Object.keys(updates).length > 0) {
                browserAPI.storage.sync.set(updates);
                log(`📦 Storage initialized: ${JSON.stringify(updates)}`);
            } else {
                log(`📦 Storage loaded: points=${data.points}, claims=${data.claims}`);
            }
        });
    } catch (error) {
        logError(error);
    }
}

/**
 * Get the actual amount of points and adds them to storage
 */
function addPoints() {
    let attempts = 0;
    const maxAttempts = 10;
    logDebug('Starting points detection...');

    const interval = setInterval(function() {
        attempts++;
        logDebug(`Attempt ${attempts}/${maxAttempts} to detect points...`);

        // Try to find the points animation element
        const ptsElement = findElementWithFallback(POINTS_DISPLAY_SELECTORS);
        let ptsWon = ptsElement?.textContent?.trim();

        if (ptsElement) {
            logDebug(`Found points element, textContent: "${ptsWon}"`);
            logDebug(`Raw char codes: ${[...ptsWon].map(c => c.charCodeAt(0)).join(',')}`);
        }

        // Only accept if it contains a "+" sign (indicates points gained, not current balance)
        if (ptsWon && ptsWon.includes('+')) {
            clearInterval(interval);

            // Normalize: replace &nbsp; (\u00A0) and other whitespace, then extract number
            const normalizedText = ptsWon.replace(/[\s\u00A0]+/g, '');
            logDebug(`Normalized text: "${normalizedText}"`);

            // Extract number from text (handles "+50", "+100", etc.)
            const pointsMatch = normalizedText.match(/\+(\d+)/);
            if (!pointsMatch) {
                logDebug(`Could not extract number from: "${ptsWon}" (normalized: "${normalizedText}")`);
                return;
            }

            const pointsToAdd = parseInt(pointsMatch[1], 10);
            log(`🎁 Detected points: ${pointsToAdd}`);

            const channelName = getChannelName();
            browserAPI.storage.sync.get(['points', 'claims', 'channelStats'], function(data) {
                const currentPoints = data?.points || 0;
                const currentClaims = data?.claims || 0;
                const channelStats = data?.channelStats || {};

                // Update channel-specific stats
                if (channelName) {
                    if (!channelStats[channelName]) {
                        channelStats[channelName] = { points: 0, claims: 0 };
                    }
                    channelStats[channelName].points += pointsToAdd;
                    channelStats[channelName].claims += 1;
                    log(`📺 Channel "${channelName}": +${pointsToAdd} (Total: ${channelStats[channelName].points})`);
                }

                browserAPI.storage.sync.set({
                    points: currentPoints + pointsToAdd,
                    claims: currentClaims + 1,
                    channelStats: channelStats
                }, function() {
                    log(`✅ +${pointsToAdd} points! (Total: ${currentPoints + pointsToAdd}, Claims: ${currentClaims + 1})`);
                });
            });
        } else if (attempts >= maxAttempts) {
            clearInterval(interval);
            log('⚠️ Could not detect points amount, using default (50)');
            // Fallback: add 50 points (most common value) even if we can't detect the exact amount
            const channelName = getChannelName();
            browserAPI.storage.sync.get(['points', 'claims', 'channelStats'], function(data) {
                const currentPoints = data?.points || 0;
                const currentClaims = data?.claims || 0;
                const channelStats = data?.channelStats || {};

                // Update channel-specific stats
                if (channelName) {
                    if (!channelStats[channelName]) {
                        channelStats[channelName] = { points: 0, claims: 0 };
                    }
                    channelStats[channelName].points += 50;
                    channelStats[channelName].claims += 1;
                    log(`📺 Channel "${channelName}": +50 fallback (Total: ${channelStats[channelName].points})`);
                }

                browserAPI.storage.sync.set({
                    points: currentPoints + 50,
                    claims: currentClaims + 1,
                    channelStats: channelStats
                }, function() {
                    log(`✅ +50 points (fallback)! (Total: ${currentPoints + 50}, Claims: ${currentClaims + 1})`);
                });
            });
        }
    }, 500);
}

/**
 * Click the claim button if found
 * @returns {boolean} - Whether a button was clicked
 */
function tryClaimPoints() {
    logDebug('Searching for claim button...');
    let claimButton = findElementWithFallback(CLAIM_BUTTON_SELECTORS);

    if (claimButton) {
        // If we found an element that's not a button, find the closest button parent
        if (claimButton.tagName !== 'BUTTON') {
            const parentButton = claimButton.closest('button');
            if (parentButton) {
                logDebug(`Found inner element, using parent button instead`);
                claimButton = parentButton;
            }
        }

        log(`🎯 Found claim button! Clicking...`);
        logDebug(`Button element: ${claimButton.tagName}.${claimButton.className}`);
        claimButton.click();
        log('🖱️ Clicked! Waiting for points animation...');
        addPoints();
        return true;
    }
    return false;
}

/**
 * Selectors for the community points container (to scope the observer)
 */
const POINTS_CONTAINER_SELECTORS = [
    '[class*="community-points-summary"]'
];

/**
 * Initialize MutationObserver to detect claim button appearance
 */
function initObserver() {
    let debounceTimer = null;
    let lastClaimTime = 0;
    let initialCheckDone = false;
    const CLAIM_COOLDOWN = 5000; // 5 seconds minimum between claims

    const checkForClaimButton = function() {
        const now = Date.now();
        if (now - lastClaimTime < CLAIM_COOLDOWN) {
            logDebug(`Cooldown active, skipping (${Math.round((CLAIM_COOLDOWN - (now - lastClaimTime)) / 1000)}s left)`);
            return;
        }

        if (tryClaimPoints()) {
            lastClaimTime = now;
        }
    };

    const observer = new MutationObserver(function(mutations) {
        // Only react to relevant mutations (added nodes)
        const hasRelevantMutation = mutations.some(mutation =>
            mutation.addedNodes.length > 0 ||
            mutation.type === 'attributes'
        );

        if (!hasRelevantMutation) return;

        // Debounce mutations
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(checkForClaimButton, 250);
    });

    // Try to find a more specific container to observe
    const findAndObserve = function() {
        let targetNode = null;

        for (const selector of POINTS_CONTAINER_SELECTORS) {
            targetNode = document.querySelector(selector);
            if (targetNode) {
                log(`🎯 Found specific container to observe: ${selector}`);
                break;
            }
        }

        // Fallback to body if no specific container found
        if (!targetNode) {
            targetNode = document.body;
            log('📍 Observing document.body (no specific container found)');
        }

        observer.observe(targetNode, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'aria-hidden']
        });

        log('👀 MutationObserver started - watching for bonus points...');
    };

    // Initial setup
    findAndObserve();

    // Initial check after 2s (only once)
    setTimeout(function() {
        if (!initialCheckDone) {
            initialCheckDone = true;
            log('🔎 Initial check for existing claim button...');
            checkForClaimButton();
        }
    }, 2000);
}

/**
 * Start point
 */
log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
log('🎮 AutoTwitchPoints v2.1 loaded!');
log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
initPoints();

// Wait for page to be ready before starting observer
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initObserver);
} else {
    initObserver();
}

// Export for testing (Node.js environment only)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        logError,
        log,
        logDebug,
        getChannelName,
        findElementWithFallback,
        initPoints,
        addPoints,
        tryClaimPoints,
        initObserver,
        CLAIM_BUTTON_SELECTORS,
        POINTS_DISPLAY_SELECTORS,
        POINTS_CONTAINER_SELECTORS
    };
}
