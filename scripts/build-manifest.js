#!/usr/bin/env node
/**
 * Generates manifest.json from package.json + manifest.template.json.
 * Always writes to manifest.json (Firefox's about:debugging only loads a file
 * literally named manifest.json). Toggle between prod and dev variants by
 * re-running the script — manifest.json is a build artifact (gitignored).
 *
 * Dev variant gets a distinct gecko id so that temporary loads don't share
 * storage.sync with the installed prod extension.
 *
 *   node scripts/build-manifest.js          # prod
 *   node scripts/build-manifest.js --dev    # dev (id + " (dev)" suffix)
 */
const fs = require('fs');
const path = require('path');

const DEV_GECKO_ID = '{deadbeef-dead-beef-dead-beefdeadbeef}';
const DEV_NAME_SUFFIX = ' (dev)';

const isDev = process.argv.includes('--dev');
const root = path.join(__dirname, '..');

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const templatePath = path.join(root, 'manifest.template.json');
const manifest = JSON.parse(fs.readFileSync(templatePath, 'utf8'));

manifest.version = pkg.version;

if (isDev) {
    manifest.name += DEV_NAME_SUFFIX;
    manifest.browser_specific_settings.gecko.id = DEV_GECKO_ID;
}

fs.writeFileSync(
    path.join(root, 'manifest.json'),
    JSON.stringify(manifest, null, 4) + '\n'
);

console.log(`✓ manifest.json — v${manifest.version} (${isDev ? 'DEV' : 'prod'})`);
