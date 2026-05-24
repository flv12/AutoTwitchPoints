/**
 * Browser API compatibility wrapper (Chrome/Firefox)
 */
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Visual dev-build indicator: scripts/build-manifest.js --dev sets a known
// gecko id; matching it here flips the popup theme.
const DEV_GECKO_ID = '{deadbeef-dead-beef-dead-beefdeadbeef}';
if (browserAPI.runtime.id === DEV_GECKO_ID) {
    document.body.classList.add('dev');
}

/**
 * Apply i18n translations to elements with data-i18n attribute
 */
function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translation = browserAPI.i18n.getMessage(key);
        if (translation) {
            element.textContent = translation;
        }
    });
}

/**
 * Format large numbers with spaces (French style)
 * @param {number} num
 * @returns {string}
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Show a specific view and hide others
 * @param {string} viewName - 'home', 'stats', or 'settings'
 */
function showView(viewName) {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(`view-${viewName}`).classList.add('active');

    // Load channel stats when showing stats view
    if (viewName === 'stats') {
        displayChannelStats();
    }
}

/**
 * Get stats from storage and display them
 */
function displayStats() {
    browserAPI.storage.sync.get(['points', 'claims'], function(data) {
        const points = data?.points || 0;
        const claims = data?.claims || 0;
        const avg = claims > 0 ? Math.round(points / claims) : 0;

        document.getElementById('total-points').textContent = formatNumber(points);
        document.getElementById('claims-count').textContent = formatNumber(claims);
        document.getElementById('avg-points').textContent = formatNumber(avg);
    });
}

/**
 * Display channel statistics sorted by points descending
 */
function displayChannelStats() {
    browserAPI.storage.sync.get(['channelStats'], function(data) {
        const channelStats = data?.channelStats || {};
        const channelList = document.getElementById('channel-list');

        // Convert to array and sort by points descending
        const channels = Object.entries(channelStats)
            .map(([name, stats]) => ({ name, ...stats }))
            .sort((a, b) => b.points - a.points);

        if (channels.length === 0) {
            const noStatsMsg = browserAPI.i18n.getMessage('noChannelStats') || 'Aucune statistique par chaîne';
            channelList.innerHTML = `<div class="no-stats">${noStatsMsg}</div>`;
            return;
        }

        channelList.innerHTML = channels.map(channel => `
            <div class="channel-item" data-channel="${channel.name}">
                <div class="channel-info">
                    <div class="channel-name">${channel.name}</div>
                    <div class="channel-stats">${formatNumber(channel.claims)} claims</div>
                </div>
                <div class="channel-points">${formatNumber(channel.points)}</div>
                <button class="delete-btn" data-channel="${channel.name}" title="Supprimer">🗑️</button>
            </div>
        `).join('');

        // Add delete event listeners
        channelList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                deleteChannelStats(this.dataset.channel);
            });
        });
    });
}

/**
 * Delete stats for a specific channel and update totals
 * @param {string} channelName
 */
function deleteChannelStats(channelName) {
    browserAPI.storage.sync.get(['points', 'claims', 'channelStats'], function(data) {
        const channelStats = data?.channelStats || {};

        if (channelStats[channelName]) {
            // Subtract channel stats from totals
            const newPoints = (data?.points || 0) - channelStats[channelName].points;
            const newClaims = (data?.claims || 0) - channelStats[channelName].claims;

            // Remove channel from stats
            delete channelStats[channelName];

            browserAPI.storage.sync.set({
                points: Math.max(0, newPoints),
                claims: Math.max(0, newClaims),
                channelStats: channelStats
            }, function() {
                displayChannelStats();
                displayStats();
            });
        }
    });
}

/**
 * Show confirmation box
 */
function showConfirm() {
    document.getElementById('confirm-box').classList.add('visible');
    document.getElementById('reset-btn').style.display = 'none';
}

/**
 * Hide confirmation box
 */
function hideConfirm() {
    document.getElementById('confirm-box').classList.remove('visible');
    document.getElementById('reset-btn').style.display = 'block';
}

/**
 * Reset all statistics including channel stats
 */
function resetStats() {
    browserAPI.storage.sync.set({
        points: 0,
        claims: 0,
        channelStats: {}
    }, function() {
        displayStats();
        hideConfirm();
    });
}

/**
 * Export stats as a JSON file download
 */
function exportStats() {
    browserAPI.storage.sync.get(['points', 'claims', 'channelStats'], function(data) {
        const payload = {
            points: data.points || 0,
            claims: data.claims || 0,
            channelStats: data.channelStats || {}
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `autotwitchpoints-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });
}

/**
 * Open the dedicated import page in a small popup window
 */
function openImportWindow() {
    browserAPI.windows.create({
        url: browserAPI.runtime.getURL('src/import/import.html'),
        type: 'popup',
        width: 420,
        height: 340
    });
}

/**
 * Load debug setting and update toggle
 */
function loadDebugSetting() {
    browserAPI.storage.sync.get(['debugEnabled'], function(data) {
        const debugToggle = document.getElementById('debug-toggle');
        debugToggle.checked = data?.debugEnabled || false;
    });
}

/**
 * Save debug setting when toggle changes
 * @param {boolean} enabled
 */
function saveDebugSetting(enabled) {
    browserAPI.storage.sync.set({ debugEnabled: enabled });
}

// Initialize
applyTranslations();
displayStats();
loadDebugSetting();

// Navigation event listeners
document.getElementById('btn-stats').addEventListener('click', () => showView('stats'));
document.getElementById('btn-settings').addEventListener('click', () => showView('settings'));
document.getElementById('btn-back-stats').addEventListener('click', () => showView('home'));
document.getElementById('btn-back-settings').addEventListener('click', () => showView('home'));

// Reset event listeners
document.getElementById('reset-btn').addEventListener('click', showConfirm);
document.getElementById('btn-confirm').addEventListener('click', resetStats);
document.getElementById('btn-cancel').addEventListener('click', hideConfirm);

// Debug toggle event listener
document.getElementById('debug-toggle').addEventListener('change', function() {
    saveDebugSetting(this.checked);
});

// Import / Export event listeners
document.getElementById('export-btn').addEventListener('click', exportStats);
document.getElementById('import-btn').addEventListener('click', openImportWindow);

