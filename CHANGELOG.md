# Changelog

## Version 1.0.0 - Initial Release

### Features
- Export ChatGPT and Claude conversations to PDF
- Automatic platform detection
- Clean, formatted PDF output with role-based styling
- Customizable options (timestamp, platform name)
- HTML backup file generation
- Browser print dialog integration

### Supported Platforms
- ChatGPT (chatgpt.com)
- Claude (claude.ai)

### Files
- manifest.json - Extension configuration
- popup.html/css/js - User interface
- content.js/css - Content extraction script
- icons/ - Extension icons (SVG and PNG)
- README.md - Full documentation
- QUICKSTART.md - Quick start guide

### Technical Details
- Manifest Version 3
- Permissions: activeTab, scripting
- Host permissions: chatgpt.com, claude.ai
- Content scripts automatically injected

### Known Issues
- Icon PNG files are currently SVG files renamed (functional but not ideal)
- Some complex formatting may be simplified in PDF output
- Platform UI changes may require selector updates
