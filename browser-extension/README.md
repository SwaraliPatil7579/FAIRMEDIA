# FAIRMEDIA Browser Extension

AI-powered bias detection for any webpage. Analyze content in real-time directly from your browser.

## Features

- 🔍 **One-Click Analysis** - Analyze any webpage for bias with a single click
- 🎯 **Context Menu** - Right-click selected text to analyze specific content
- 📊 **Real-time Scores** - See bias scores across multiple categories
- 💡 **Inline Suggestions** - Get alternative phrasing suggestions
- 🚀 **Fast & Lightweight** - Minimal performance impact

## Installation

### Chrome/Edge

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `browser-extension` folder
5. The FAIRMEDIA icon should appear in your toolbar

### Firefox

1. Open Firefox and go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Navigate to the `browser-extension` folder
4. Select the `manifest.json` file
5. The extension is now loaded

## Usage

### Analyze Full Page

1. Navigate to any webpage
2. Click the FAIRMEDIA icon in your toolbar
3. Click "Analyze This Page"
4. View bias scores and detected issues

### Analyze Selected Text

1. Select any text on a webpage
2. Right-click and choose "Analyze for Bias"
3. A notification will show the bias score
4. Click the notification to see full details

### View Full Report

1. After analyzing, click "View Full Report"
2. Opens the full FAIRMEDIA dashboard with detailed analysis

## Configuration

Edit `popup.js` to change the API endpoint:

```javascript
const API_BASE = 'https://fairmedia.onrender.com' // Your backend URL
```

## Privacy

- The extension only sends text content to the FAIRMEDIA API when you explicitly click "Analyze"
- No data is collected or stored without your action
- All analysis is done server-side and results are cached locally

## Development

### Build for Production

1. Update `manifest.json` version number
2. Remove any development URLs
3. Zip the `browser-extension` folder
4. Submit to Chrome Web Store / Firefox Add-ons

### Testing

1. Make changes to the code
2. Go to `chrome://extensions/`
3. Click the refresh icon on the FAIRMEDIA extension
4. Test your changes

## Support

For issues or feature requests, visit: https://github.com/SwaraliPatil7579/FAIRMEDIA

## License

MIT License - See LICENSE file for details
