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
 * Selectors for the community points container (to scope the observer)
 */
const POINTS_CONTAINER_SELECTORS = [
    '[class*="community-points-summary"]'
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
    const match = path.match(/^\/([a-zA-Z0-9_]+)/);
    if (match && match[1]) {
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
 * Verification window after a click. Beyond this delay, if the claim button
 * is still in the DOM, we treat the click as failed (Twitch UI stuck after
 * PC sleep) and pause future attempts for STUCK_COOLDOWN_MS to stop the
 * runaway loop that used to fabricate a +50 every 5s.
 */
const VERIFY_TIMEOUT_MS = 3000;
const VERIFY_INTERVAL_MS = 250;
const STUCK_COOLDOWN_MS = 60_000;

const stuckState = { until: 0 };

function isStuck() {
    return Date.now() < stuckState.until;
}

/**
 * Capture the current points display text. Used as a baseline so a periodic
 * viewing-reward (+10) already on screen at click time isn't credited as a
 * claim.
 */
function snapshotPointsDisplay() {
    const el = findElementWithFallback(POINTS_DISPLAY_SELECTORS);
    return el?.textContent?.trim() ?? '';
}

function creditPoints(pointsToAdd) {
    const channelName = getChannelName();
    browserAPI.storage.sync.get(['points', 'claims', 'channelStats'], function(data) {
        const currentPoints = data?.points || 0;
        const currentClaims = data?.claims || 0;
        const channelStats = data?.channelStats || {};

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
}

/**
 * After a click, poll for a fresh "+N" animation (text different from the
 * pre-click snapshot). Only credits on a confirmed new animation — never
 * fabricates a fallback. If the claim button is still present when the
 * verification window elapses, mark the script stuck so the observer pauses.
 */
function verifyAndCreditClaim(claimButton, snapshotText) {
    let elapsed = 0;
    let buttonGone = !document.body.contains(claimButton);
    logDebug(`Verifying claim (snapshot: "${snapshotText}", buttonGone: ${buttonGone})`);

    const interval = setInterval(function() {
        elapsed += VERIFY_INTERVAL_MS;

        if (!buttonGone && !document.body.contains(claimButton)) {
            buttonGone = true;
            logDebug('Claim button removed from DOM');
        }

        const ptsElement = findElementWithFallback(POINTS_DISPLAY_SELECTORS);
        const text = ptsElement?.textContent?.trim() ?? '';

        if (text !== snapshotText && text.includes('+')) {
            const normalized = text.replace(/[\s ]+/g, '');
            const match = normalized.match(/\+(\d+)/);
            if (match) {
                clearInterval(interval);
                const pointsToAdd = parseInt(match[1], 10);
                log(`🎁 Detected points: ${pointsToAdd}`);
                creditPoints(pointsToAdd);
                return;
            }
            logDebug(`Could not extract number from: "${text}"`);
        }

        if (elapsed >= VERIFY_TIMEOUT_MS) {
            clearInterval(interval);
            if (!buttonGone) {
                stuckState.until = Date.now() + STUCK_COOLDOWN_MS;
                log(`⚠️ Claim button still visible after ${VERIFY_TIMEOUT_MS}ms — likely stuck. Pausing ${STUCK_COOLDOWN_MS / 1000}s.`);
            } else {
                log('⚠️ Click registered but no points animation detected — not crediting.');
            }
        }
    }, VERIFY_INTERVAL_MS);
}

/**
 * Click the claim button if found
 * @returns {boolean} - Whether a button was clicked
 */
function tryClaimPoints() {
    logDebug('Searching for claim button...');
    let claimButton = findElementWithFallback(CLAIM_BUTTON_SELECTORS);

    if (!claimButton) return false;

    if (claimButton.tagName !== 'BUTTON') {
        const parentButton = claimButton.closest('button');
        if (parentButton) {
            logDebug('Found inner element, using parent button instead');
            claimButton = parentButton;
        }
    }

    const snapshotText = snapshotPointsDisplay();
    log(`🎯 Found claim button! Clicking...`);
    logDebug(`Button element: ${claimButton.tagName}.${claimButton.className}, snapshot: "${snapshotText}"`);
    claimButton.click();
    log('🖱️ Clicked! Verifying...');
    verifyAndCreditClaim(claimButton, snapshotText);
    return true;
}

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
        if (isStuck()) {
            logDebug(`Stuck cooldown active, skipping (${Math.round((stuckState.until - now) / 1000)}s left)`);
            return;
        }
        if (now - lastClaimTime < CLAIM_COOLDOWN) {
            logDebug(`Cooldown active, skipping (${Math.round((CLAIM_COOLDOWN - (now - lastClaimTime)) / 1000)}s left)`);
            return;
        }

        if (tryClaimPoints()) {
            lastClaimTime = now;
        }
    };

    const observer = new MutationObserver(function(mutations) {
        const hasRelevantMutation = mutations.some(mutation =>
            mutation.addedNodes.length > 0 ||
            mutation.type === 'attributes'
        );

        if (!hasRelevantMutation) return;

        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(checkForClaimButton, 250);
    });

    const findAndObserve = function() {
        let targetNode = null;

        for (const selector of POINTS_CONTAINER_SELECTORS) {
            targetNode = document.querySelector(selector);
            if (targetNode) {
                log(`🎯 Found specific container to observe: ${selector}`);
                break;
            }
        }

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

    findAndObserve();

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
        tryClaimPoints,
        verifyAndCreditClaim,
        snapshotPointsDisplay,
        creditPoints,
        isStuck,
        stuckState,
        initObserver,
        CLAIM_BUTTON_SELECTORS,
        POINTS_DISPLAY_SELECTORS,
        POINTS_CONTAINER_SELECTORS
    };
}
