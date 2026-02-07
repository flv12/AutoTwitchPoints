# AutoTwitchPoints

Automatically collects Twitch channel points bonus.

![Firefox](https://img.shields.io/badge/Firefox-supported-green) ![Chrome](https://img.shields.io/badge/Chrome-supported-green)

## Features

- 🎯 **Auto-claim** - Automatically clicks the bonus points button
- 📊 **Points counter** - Tracks total points collected
- 🔄 **Resilient detection** - Multiple selector fallbacks if Twitch updates their UI
- ⚡ **Efficient** - Uses MutationObserver instead of polling
- 🌐 **Cross-browser** - Works on Firefox and Chrome

## Installation

### Firefox (Add-ons Store)
👉 https://addons.mozilla.org/fr/firefox/addon/autotwitchpoints/

### Firefox (Manual)
1. Download or clone this repository
2. Open Firefox and go to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file

### Chrome (Manual)
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the extension folder

## Usage

Once installed, just visit any Twitch channel. The extension will automatically:
1. Detect when bonus points are available
2. Click the claim button
3. Track your total points (visible in the popup)

## Changelog

### v2.0
- Migrated to Manifest V3
- Added Chrome compatibility
- Replaced polling with MutationObserver (better performance)
- Added resilient selector fallbacks
- Improved error handling

### v1.2
- Initial public release
