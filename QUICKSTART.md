# Quick Start Guide

## Installation (2 minutes)

1. **Open Chrome Extensions**
   - Type `chrome://extensions/` in your address bar
   - Or: Menu (⋮) → Extensions → Manage Extensions

2. **Enable Developer Mode**
   - Toggle the switch in the top-right corner

3. **Load the Extension**
   - Click "Load unpacked"
   - Select this folder: `ChatGpt or Claude to PDF Extension`
   - Done! The icon appears in your toolbar

## First Use (30 seconds)

1. Go to [chatgpt.com](https://chatgpt.com) or [claude.ai](https://claude.ai)
2. Open any conversation
3. Click the extension icon
4. Click "Generate PDF"
5. Save the PDF when the print dialog opens

## What Gets Exported?

- All messages in the current conversation
- User messages and AI responses
- Formatted with clear role indicators
- Clean, readable layout
- Optional timestamp and platform name

## Tips

- The extension only works on ChatGPT and Claude pages
- Make sure the conversation is fully loaded before exporting
- You'll get both an HTML file (backup) and can save as PDF
- Use the options to customize what's included in the export

## Troubleshooting

**Extension not working?**
- Refresh the chat page
- Make sure you're on chatgpt.com or claude.ai
- Check that the conversation is loaded

**No messages extracted?**
- Scroll through the entire conversation first
- Try clicking "Generate PDF" again
- Check browser console (F12) for errors

**Need better icons?**
- The current icons are SVG files renamed to PNG
- Open `icons/icon*.svg` in a browser
- Right-click → Save image as PNG
- Replace the PNG files

## Next Steps

- Read the full [README.md](README.md) for detailed information
- Customize the PDF styling in `popup.js`
- Modify message extraction in `content.js` if needed

Enjoy exporting your AI conversations!
