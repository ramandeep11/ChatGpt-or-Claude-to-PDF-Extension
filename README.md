# ChatGPT & Claude to PDF Extension

A Chrome extension that allows you to export your ChatGPT and Claude AI conversations to PDF format with a single click.

## Features

- Export conversations from ChatGPT (chatgpt.com)
- Export conversations from Claude (claude.ai)
- Clean, formatted PDF output
- Customizable options:
  - Include/exclude timestamp
  - Include/exclude platform name
- Beautiful gradient UI
- Automatic platform detection
- Preserves conversation structure with user/assistant roles

## Installation

### Install from Source

1. **Clone or download this repository**
   ```bash
   cd ~/Desktop/Chrome-extensions
   ```

2. **Open Chrome and navigate to Extensions**
   - Open Chrome browser
   - Go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right corner)

3. **Load the extension**
   - Click "Load unpacked"
   - Navigate to and select the `ChatGpt or Claude to PDF Extension` folder
   - The extension icon should appear in your Chrome toolbar

## Usage

1. **Navigate to a chat page**
   - Go to [ChatGPT](https://chatgpt.com) or [Claude](https://claude.ai)
   - Open any conversation

2. **Open the extension**
   - Click the extension icon in your Chrome toolbar
   - The extension will automatically detect which platform you're on

3. **Generate PDF**
   - Configure options (timestamp, platform name)
   - Click "Generate PDF"
   - The extension will:
     - Extract all messages from the current conversation
     - Format them into a clean HTML document
     - Open the print dialog for saving as PDF
     - Also download an HTML backup file

4. **Save the PDF**
   - In the print dialog, select "Save as PDF" as the destination
   - Choose your save location and filename
   - Click "Save"

## Options

- **Include timestamp**: Add the generation date/time to the PDF header
- **Include platform name**: Show whether the chat is from ChatGPT or Claude

## File Structure

```
ChatGpt or Claude to PDF Extension/
├── manifest.json          # Extension configuration
├── popup.html             # Extension popup UI
├── popup.css              # Popup styling
├── popup.js               # Popup logic and PDF generation
├── content.js             # Content script for extracting chat data
├── content.css            # Content script styles
├── icons/                 # Extension icons
│   ├── icon16.png         # 16x16 icon
│   ├── icon48.png         # 48x48 icon
│   ├── icon128.png        # 128x128 icon
│   ├── icon16.svg         # Source SVG
│   ├── icon48.svg         # Source SVG
│   └── icon128.svg        # Source SVG
└── README.md              # This file
```

## How It Works

1. **Content Script** (`content.js`): Injected into ChatGPT and Claude pages
   - Detects the platform (ChatGPT or Claude)
   - Extracts conversation messages using DOM selectors
   - Returns structured data to the popup

2. **Popup Interface** (`popup.html/js`): The extension's user interface
   - Displays platform detection status
   - Provides customization options
   - Triggers PDF generation
   - Handles errors and success messages

3. **PDF Generation** (`popup.js`): Creates formatted output
   - Generates clean HTML with embedded CSS
   - Formats messages with role indicators
   - Opens print dialog for PDF export
   - Downloads HTML backup file

## Technical Details

- **Manifest Version**: 3
- **Permissions**: `activeTab`, `scripting`
- **Host Permissions**: `chatgpt.com`, `claude.ai`
- **Content Scripts**: Automatically injected on supported domains
- **PDF Method**: HTML generation + browser print dialog

## Limitations

- Only works on active conversation pages
- Requires the conversation to be fully loaded
- Some complex formatting (code blocks, images) may be simplified
- Platform UI changes may require selector updates

## Troubleshooting

### Extension doesn't detect the platform
- Make sure you're on `chatgpt.com` or `claude.ai`
- Refresh the page and try again
- Check that the conversation is fully loaded

### No messages extracted
- Ensure you have an active conversation open
- Scroll through the conversation to load all messages
- Try refreshing the page

### PDF generation fails
- Check browser console for errors (F12)
- Make sure pop-ups are not blocked
- Try allowing the print dialog

### Icons not displaying
- The PNG files in the `icons/` folder are currently SVG files renamed
- To create proper PNG icons:
  1. Open each SVG file in a browser or image editor
  2. Export/save as PNG at the specified size
  3. Replace the existing PNG files

## Development

### Modifying the Extension

1. **Update content extraction** (if platform UI changes):
   - Edit `content.js`
   - Update DOM selectors for ChatGPT or Claude
   - Test extraction on live pages

2. **Customize PDF styling**:
   - Edit the `createPDFContent()` function in `popup.js`
   - Modify the embedded CSS styles
   - Test with sample conversations

3. **Add new features**:
   - Update `manifest.json` if new permissions needed
   - Add UI elements to `popup.html`
   - Implement logic in `popup.js`

### Testing

1. Make changes to the code
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test on ChatGPT or Claude pages

## Privacy

- This extension runs entirely locally in your browser
- No data is sent to external servers
- No analytics or tracking
- All processing happens on your machine
- Exported PDFs are saved locally

## Contributing

Feel free to submit issues or pull requests for:
- Bug fixes
- New features
- UI improvements
- Better message extraction
- Support for additional AI chat platforms

## License

MIT License - feel free to use and modify as needed.

## Credits

Created for easy export of AI conversations to portable PDF format.

---

**Note**: ChatGPT is a product of OpenAI. Claude is a product of Anthropic. This extension is not officially affiliated with either company.
