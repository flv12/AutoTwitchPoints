/**
 * Browser API compatibility wrapper (Chrome/Firefox)
 */
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

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
 * Reset all statistics
 */
function resetStats() {
    browserAPI.storage.sync.set({ points: 0, claims: 0 }, function() {
        displayStats();
        hideConfirm();
    });
}

// Initialize
applyTranslations();
displayStats();

// Event listeners
document.getElementById('reset-btn').addEventListener('click', showConfirm);
document.getElementById('btn-confirm').addEventListener('click', resetStats);
document.getElementById('btn-cancel').addEventListener('click', hideConfirm);
