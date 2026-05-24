const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const DEV_GECKO_ID = '{deadbeef-dead-beef-dead-beefdeadbeef}';
if (browserAPI.runtime.id === DEV_GECKO_ID) {
    document.body.classList.add('dev');
}

// i18n helpers — fall back to the English strings baked into the HTML
const t = (key, fallback) => browserAPI.i18n.getMessage(key) || fallback;

function applyTranslations() {
    document.getElementById('subtitle').textContent     = t('importPageSubtitle', 'Import statistics');
    document.getElementById('lbl-click').textContent    = t('importDropClick', 'Click or drag');
    document.getElementById('lbl-json').textContent     = t('importDropHint', 'a .json backup file');
    document.getElementById('lbl-points').textContent   = t('pointsCollected', 'Points');
    document.getElementById('lbl-claims').textContent   = t('claims', 'Claims');
    document.getElementById('lbl-channels').textContent = t('importChannels', 'Channels');
    document.getElementById('btn-cancel').textContent   = t('cancel', 'Cancel');
    document.getElementById('btn-confirm').textContent  = t('importStats', 'Import');
}

let pendingData = null;

function formatNumber(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function showPreview(data) {
    pendingData = data;
    document.getElementById('prev-points').textContent   = formatNumber(data.points);
    document.getElementById('prev-claims').textContent   = formatNumber(data.claims);
    document.getElementById('prev-channels').textContent = Object.keys(data.channelStats).length;
    document.getElementById('preview').classList.add('visible');
    document.getElementById('btn-row').classList.add('visible');
    document.getElementById('drop-zone').style.display = 'none';
    document.getElementById('msg').classList.remove('visible');
}

function reset() {
    pendingData = null;
    document.getElementById('preview').classList.remove('visible');
    document.getElementById('btn-row').classList.remove('visible');
    document.getElementById('drop-zone').style.display = '';
    document.getElementById('import-file').value = '';
}

function showMsg(text, type) {
    const el = document.getElementById('msg');
    el.textContent = text;
    el.className = `msg visible ${type}`;
}

function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (
                typeof data.points !== 'number' ||
                typeof data.claims !== 'number' ||
                typeof data.channelStats !== 'object' ||
                data.channelStats === null
            ) throw new Error();
            showPreview(data);
        } catch {
            reset();
            showMsg(t('importError', 'Invalid backup file'), 'error');
        }
    };
    reader.readAsText(file);
}

function doImport() {
    if (!pendingData) return;
    browserAPI.storage.sync.set(pendingData, function() {
        showMsg(t('importSuccess', 'Statistics imported successfully!'), 'success');
        document.getElementById('preview').classList.remove('visible');
        document.getElementById('btn-row').classList.remove('visible');
        pendingData = null;
        setTimeout(() => window.close(), 1500);
    });
}

// File input
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('import-file');

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => handleFile(fileInput.files[0]));

// Drag & drop
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    handleFile(e.dataTransfer.files[0]);
});

document.getElementById('btn-cancel').addEventListener('click', reset);
document.getElementById('btn-confirm').addEventListener('click', doImport);

applyTranslations();
