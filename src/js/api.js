/**
 * AutoTwitchPoints Console API
 * Accessible via window.AutoTwitchPoints in browser console
 */

/**
 * Browser API compatibility wrapper (Chrome/Firefox)
 */
if (typeof window.browserAPI === 'undefined') {
    var browserAPI = typeof browser !== 'undefined' ? browser : chrome;
    window.browserAPI = browserAPI;
} else {
    var browserAPI = window.browserAPI;
}

/**
 * Console API for AutoTwitchPoints extension
 * Provides methods to interact with the extension from browser console
 */
class AutoTwitchPointsAPI {
    constructor() {
        this.version = '2.1.0';
        console.log('%c🎮 AutoTwitchPoints API loaded!', 'color: #9147ff; font-weight: bold;');
        console.log('%cType AutoTwitchPoints.help() for available commands', 'color: #888;');
    }

    /**
     * Display help information about available API methods
     */
    help() {
        console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #9147ff;');
        console.log('%c🎮 AutoTwitchPoints API v' + this.version, 'color: #9147ff; font-weight: bold;');
        console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #9147ff;');
        console.log('');
        console.log('%cAvailable commands:', 'font-weight: bold;');
        console.log('');
        console.log('  %cgetStats()%c           - Get total points and claims', 'color: #00d4aa;', 'color: inherit;');
        console.log('  %cgetChannelStats()%c   - Get stats per channel', 'color: #00d4aa;', 'color: inherit;');
        console.log('  %cresetStats()%c        - Reset all statistics', 'color: #00d4aa;', 'color: inherit;');
        console.log('  %ctoggleDebug()%c       - Toggle debug mode on/off', 'color: #00d4aa;', 'color: inherit;');
        console.log('  %cforceClaimPoints()%c  - Force click claim button', 'color: #00d4aa;', 'color: inherit;');
        console.log('  %cforceChannelPoints(channel, points)%c', 'color: #00d4aa;', 'color: inherit;');
        console.log('                       - Set points for a specific channel');
        console.log('  %cexportStats()%c       - Export stats as JSON', 'color: #00d4aa;', 'color: inherit;');
        console.log('  %cimportStats(json)%c   - Import stats from JSON', 'color: #00d4aa;', 'color: inherit;');
        console.log('  %chelp()%c              - Show this help', 'color: #00d4aa;', 'color: inherit;');
        console.log('');
        console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #9147ff;');
        return 'AutoTwitchPoints API';
    }

    /**
     * Get total points and claims statistics
     * @returns {Promise<{points: number, claims: number}>}
     */
    getStats() {
        return new Promise((resolve) => {
            browserAPI.storage.sync.get(['points', 'claims'], (data) => {
                const stats = {
                    points: data?.points || 0,
                    claims: data?.claims || 0
                };
                console.log('%c📊 Total Statistics', 'color: #9147ff; font-weight: bold;');
                console.log(`   Points: ${stats.points.toLocaleString()}`);
                console.log(`   Claims: ${stats.claims.toLocaleString()}`);
                resolve(stats);
            });
        });
    }

    /**
     * Get statistics per channel
     * @returns {Promise<Object>}
     */
    getChannelStats() {
        return new Promise((resolve) => {
            browserAPI.storage.sync.get(['channelStats'], (data) => {
                const channelStats = data?.channelStats || {};
                console.log('%c📺 Channel Statistics', 'color: #9147ff; font-weight: bold;');

                if (Object.keys(channelStats).length === 0) {
                    console.log('   No channel stats recorded yet.');
                } else {
                    // Sort by points descending
                    const sorted = Object.entries(channelStats)
                        .sort((a, b) => b[1].points - a[1].points);

                    sorted.forEach(([channel, stats]) => {
                        console.log(`   %c${channel}%c: ${stats.points.toLocaleString()} pts (${stats.claims} claims)`,
                            'color: #00d4aa;', 'color: inherit;');
                    });
                }
                resolve(channelStats);
            });
        });
    }

    /**
     * Reset all statistics
     * @returns {Promise<void>}
     */
    resetStats() {
        return new Promise((resolve) => {
            browserAPI.storage.sync.set({
                points: 0,
                claims: 0,
                channelStats: {}
            }, () => {
                console.log('%c🗑️ All statistics have been reset!', 'color: #ff4444; font-weight: bold;');
                resolve();
            });
        });
    }

    /**
     * Toggle debug mode on/off
     * @returns {Promise<boolean>} - New debug state
     */
    toggleDebug() {
        return new Promise((resolve) => {
            browserAPI.storage.sync.get(['debugEnabled'], (data) => {
                const newState = !(data?.debugEnabled || false);
                browserAPI.storage.sync.set({ debugEnabled: newState }, () => {
                    console.log(`%c🔧 Debug mode: ${newState ? 'ENABLED' : 'DISABLED'}`,
                        `color: ${newState ? '#00d4aa' : '#ff4444'}; font-weight: bold;`);
                    resolve(newState);
                });
            });
        });
    }

    /**
     * Force click the claim button if present
     * @returns {boolean} - Whether button was found and clicked
     */
    forceClaimPoints() {
        const CLAIM_BUTTON_SELECTORS = [
            '[class*="claimable-bonus"]'
        ];

        for (const selector of CLAIM_BUTTON_SELECTORS) {
            let element = document.querySelector(selector);
            if (element) {
                // If not a button, find parent button
                if (element.tagName !== 'BUTTON') {
                    const parentButton = element.closest('button');
                    if (parentButton) element = parentButton;
                }

                element.click();
                console.log('%c🖱️ Claim button clicked!', 'color: #00d4aa; font-weight: bold;');
                return true;
            }
        }

        console.log('%c⚠️ No claim button found on page', 'color: #ffaa00;');
        return false;
    }

    /**
     * Force set points for a specific channel and update total
     * @param {string} channel - Channel name
     * @param {number} points - Points to set
     * @returns {Promise<void>}
     */
    forceChannelPoints(channel, points) {
        if (!channel || typeof channel !== 'string') {
            console.log('%c❌ Error: Channel name is required (string)', 'color: #ff4444;');
            return Promise.reject(new Error('Channel name is required'));
        }

        if (typeof points !== 'number' || isNaN(points) || points < 0) {
            console.log('%c❌ Error: Points must be a positive number', 'color: #ff4444;');
            return Promise.reject(new Error('Points must be a positive number'));
        }

        const channelName = channel.toLowerCase();

        return new Promise((resolve) => {
            browserAPI.storage.sync.get(['points', 'channelStats'], (data) => {
                const channelStats = data?.channelStats || {};
                const currentTotal = data?.points || 0;

                // Calculate difference to update total
                const oldChannelPoints = channelStats[channelName]?.points || 0;
                const pointsDiff = points - oldChannelPoints;

                // Update channel stats
                if (!channelStats[channelName]) {
                    channelStats[channelName] = { points: 0, claims: 0 };
                }
                channelStats[channelName].points = points;

                // Update total points
                const newTotal = Math.max(0, currentTotal + pointsDiff);

                browserAPI.storage.sync.set({
                    points: newTotal,
                    channelStats: channelStats
                }, () => {
                    console.log(`%c✅ Channel "${channelName}" points set to ${points.toLocaleString()}`,
                        'color: #00d4aa; font-weight: bold;');
                    console.log(`   Total points: ${newTotal.toLocaleString()} (${pointsDiff >= 0 ? '+' : ''}${pointsDiff})`);
                    resolve();
                });
            });
        });
    }

    /**
     * Export all statistics as JSON
     * @returns {Promise<string>} - JSON string of all stats
     */
    exportStats() {
        return new Promise((resolve) => {
            browserAPI.storage.sync.get(['points', 'claims', 'channelStats'], (data) => {
                const exportData = {
                    exportDate: new Date().toISOString(),
                    version: this.version,
                    totalPoints: data?.points || 0,
                    totalClaims: data?.claims || 0,
                    channelStats: data?.channelStats || {}
                };

                const json = JSON.stringify(exportData, null, 2);
                console.log('%c📤 Exported Statistics:', 'color: #9147ff; font-weight: bold;');
                console.log(json);

                // Also copy to clipboard if available
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(json).then(() => {
                        console.log('%c📋 Copied to clipboard!', 'color: #00d4aa;');
                    }).catch(() => {});
                }

                resolve(json);
            });
        });
    }

    /**
     * Import statistics from JSON
     * @param {string|object} json - JSON string or object to import
     * @returns {Promise<void>}
     */
    importStats(json) {
        return new Promise((resolve, reject) => {
            let data;

            // Parse JSON if string
            if (typeof json === 'string') {
                try {
                    data = JSON.parse(json);
                } catch (e) {
                    console.log('%c❌ Error: Invalid JSON format', 'color: #ff4444;');
                    reject(new Error('Invalid JSON format'));
                    return;
                }
            } else if (typeof json === 'object' && json !== null) {
                data = json;
            } else {
                console.log('%c❌ Error: Input must be a JSON string or object', 'color: #ff4444;');
                reject(new Error('Input must be a JSON string or object'));
                return;
            }

            // Validate data structure
            const totalPoints = typeof data.totalPoints === 'number' ? data.totalPoints : 0;
            const totalClaims = typeof data.totalClaims === 'number' ? data.totalClaims : 0;
            const channelStats = typeof data.channelStats === 'object' && data.channelStats !== null
                ? data.channelStats
                : {};

            // Validate channel stats structure
            const validatedChannelStats = {};
            for (const [channel, stats] of Object.entries(channelStats)) {
                if (typeof stats === 'object' && stats !== null) {
                    validatedChannelStats[channel.toLowerCase()] = {
                        points: typeof stats.points === 'number' ? stats.points : 0,
                        claims: typeof stats.claims === 'number' ? stats.claims : 0
                    };
                }
            }

            browserAPI.storage.sync.set({
                points: totalPoints,
                claims: totalClaims,
                channelStats: validatedChannelStats
            }, () => {
                console.log('%c📥 Statistics imported successfully!', 'color: #00d4aa; font-weight: bold;');
                console.log(`   Total Points: ${totalPoints.toLocaleString()}`);
                console.log(`   Total Claims: ${totalClaims.toLocaleString()}`);
                console.log(`   Channels: ${Object.keys(validatedChannelStats).length}`);

                if (data.exportDate) {
                    console.log(`   Export Date: ${data.exportDate}`);
                }

                resolve();
            });
        });
    }
}

// Expose API globally
window.AutoTwitchPoints = new AutoTwitchPointsAPI();

