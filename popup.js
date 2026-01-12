// Popup script for PDF generation

// Import jsPDF library (we'll use it via CDN in the HTML or bundle it)
// For simplicity, we'll use a client-side approach with print to PDF

let currentTab = null;
let conversationData = null;

document.addEventListener('DOMContentLoaded', async () => {
  await initializePopup();
  setupEventListeners();
});

async function initializePopup() {
  try {
    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;

    // Check if we're on a supported platform
    const platform = detectPlatformFromUrl(tab.url);

    if (platform) {
      updatePlatformStatus(platform);
      document.getElementById('generatePdf').disabled = false;
    } else {
      showError('Please navigate to ChatGPT or Claude to use this extension.');
      document.getElementById('generatePdf').disabled = true;
    }
  } catch (error) {
    showError('Failed to initialize: ' + error.message);
  }
}

function detectPlatformFromUrl(url) {
  if (url.includes('chatgpt.com')) {
    return 'ChatGPT';
  } else if (url.includes('claude.ai')) {
    return 'Claude';
  }
  return null;
}

function updatePlatformStatus(platform) {
  const platformElement = document.getElementById('platform-name');
  platformElement.textContent = `${platform} detected`;
  platformElement.style.color = '#10a37f';
}

function setupEventListeners() {
  document.getElementById('generatePdf').addEventListener('click', handleGeneratePdf);
}

async function handleGeneratePdf() {
  const button = document.getElementById('generatePdf');
  const originalText = button.innerHTML;

  try {
    // Disable button and show loading state
    button.disabled = true;
    button.innerHTML = '<span class="spinner"></span> Generating...';

    hideError();
    hideSuccess();

    // Ensure content script is injected
    await ensureContentScriptInjected();

    // Extract conversation from the page
    const response = await chrome.tabs.sendMessage(currentTab.id, {
      action: 'extractContent'
    });

    if (!response || !response.success || !response.data) {
      throw new Error('Failed to extract conversation content');
    }

    conversationData = response.data;

    if (!conversationData.messages || conversationData.messages.length === 0) {
      throw new Error('No messages found. Make sure you have an active conversation.');
    }

    // Generate PDF
    await generatePDF(conversationData);

    showSuccess(`PDF generated successfully! (${conversationData.messages.length} messages)`);

  } catch (error) {
    console.error('PDF generation error:', error);
    showError(error.message || 'Failed to generate PDF');
  } finally {
    // Re-enable button
    button.disabled = false;
    button.innerHTML = originalText;
  }
}

async function ensureContentScriptInjected() {
  try {
    // Try to ping the content script
    await chrome.tabs.sendMessage(currentTab.id, { action: 'ping' });
  } catch (error) {
    // Content script not loaded, inject it manually
    console.log('Content script not found, injecting...');

    try {
      // Inject CSS first
      await chrome.scripting.insertCSS({
        target: { tabId: currentTab.id },
        files: ['content.css']
      });

      // Then inject JS
      await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        files: ['content.js']
      });

      // Wait a bit for the script to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (injectionError) {
      console.error('Failed to inject content script:', injectionError);
      throw new Error('Failed to inject content script. Please refresh the page and try again.');
    }
  }
}

async function generatePDF(data) {
  const includeTimestamp = document.getElementById('includeTimestamp').checked;
  const includePlatform = document.getElementById('includePlatform').checked;

  // Generate actual PDF using jsPDF
  await createAndDownloadPDF(data, includeTimestamp, includePlatform);
}


async function createAndDownloadPDF(data, includeTimestamp, includePlatform) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const maxWidth = pageWidth - (margin * 2);
  let yPosition = margin;

  // Add soft cream background to first page
  doc.setFillColor(250, 249, 245); // Soft cream with warmth
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Helper function to add new page if needed
  function checkAndAddPage(requiredSpace = 10) {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  }

  // Helper function to wrap text
  function addWrappedText(text, fontSize, fontStyle = 'normal', color = [0, 0, 0]) {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontStyle);
    doc.setTextColor(color[0], color[1], color[2]);

    const lines = doc.splitTextToSize(text, maxWidth);

    for (let i = 0; i < lines.length; i++) {
      checkAndAddPage(fontSize * 0.5);
      doc.text(lines[i], margin, yPosition);
      yPosition += fontSize * 0.5;
    }
  }

  // Title - centered with minimal formatting
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40); // Dark gray with presence
  const titleText = handleEmojisInText(data.title);
  const titleWidth = doc.getTextWidth(titleText);
  const titleX = (pageWidth - titleWidth) / 2;
  doc.text(titleText, titleX, yPosition);
  yPosition += 4;

  // Minimal decorative underline for title
  const underlineMargin = 30;
  doc.setDrawColor(180, 180, 180); // Soft gray with presence
  doc.setLineWidth(0.4);
  doc.line(underlineMargin, yPosition, pageWidth - underlineMargin, yPosition);
  yPosition += 2;

  // Metadata
  if (includePlatform || includeTimestamp) {
    yPosition += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 160, 160); // Lighter gray for metadata

    if (includePlatform) {
      const platformText = `Platform: ${data.platform}`;
      const platformWidth = doc.getTextWidth(platformText);
      doc.text(platformText, (pageWidth - platformWidth) / 2, yPosition);
      yPosition += 4;
    }

    if (includeTimestamp) {
      const date = new Date(data.timestamp);
      const timestampText = `Generated: ${date.toLocaleString()}`;
      const timestampWidth = doc.getTextWidth(timestampText);
      doc.text(timestampText, (pageWidth - timestampWidth) / 2, yPosition);
      yPosition += 4;
    }
  }

  yPosition += 8;

  // Messages - with boxes that can span pages
  data.messages.forEach((message, index) => {
    const isUser = message.role === 'user';
    const boxPadding = 4;
    const boxMargin = margin;
    const lineHeight = 5;

    // Refined colors with subtle distinction - premium feel
    const bgColor = isUser ? [240, 245, 252] : [240, 250, 245]; // Soft blue tint for user, soft green tint for assistant
    const borderColor = isUser ? [191, 208, 230] : [191, 220, 210]; // Refined blue border for user, refined green for assistant
    const labelColor = isUser ? [71, 100, 150] : [60, 120, 100]; // Muted blue for user, muted green for assistant
    const label = isUser ? 'You' : data.platform;

    // Prepare the message text and parse into blocks
    const messageText = handleEmojisInText(message.content);
    const contentBlocks = parseContentBlocks(messageText);

    // Calculate box segments and content positions first
    let boxSegments = []; // Track box segments across pages
    let contentItems = []; // Track all content (text and code blocks)
    let currentBoxStart = yPosition;
    let currentPageNum = doc.internal.getCurrentPageInfo().pageNumber;

    // Add space before box
    yPosition += 2;
    currentBoxStart = yPosition;

    // Track label position
    const labelY = yPosition + boxPadding + 3;
    const labelPage = currentPageNum;
    yPosition += boxPadding + 6;

    // Calculate positions for all content blocks
    contentBlocks.forEach((block) => {
      if (block.type === 'text') {
        // Handle regular text
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const textLines = doc.splitTextToSize(block.content, maxWidth - (boxPadding * 2));

        textLines.forEach((line) => {
          // Check if we need a new page
          if (yPosition + lineHeight + boxPadding > pageHeight - margin) {
            // Save current box segment
            boxSegments.push({
              pageNum: currentPageNum,
              startY: currentBoxStart,
              endY: pageHeight - margin,
              isStart: boxSegments.length === 0,
              isEnd: false
            });

            // Add new page
            doc.addPage();

            // Add soft cream background to new page
            doc.setFillColor(250, 249, 245); // Soft cream with warmth
            doc.rect(0, 0, pageWidth, pageHeight, 'F');

            currentPageNum = doc.internal.getCurrentPageInfo().pageNumber;
            yPosition = margin + boxPadding;
            currentBoxStart = margin;
          }

          // Store text position
          contentItems.push({
            type: 'text',
            text: line,
            x: boxMargin + boxPadding,
            y: yPosition,
            pageNum: currentPageNum
          });

          yPosition += lineHeight;
        });

        yPosition += 3; // Space after text block
      } else if (block.type === 'code') {
        // Handle code block
        yPosition += 4; // Space before code block

        doc.setFontSize(9);
        doc.setFont('courier', 'normal');
        const codeLines = doc.splitTextToSize(block.content, maxWidth - (boxPadding * 2) - 4);
        const codeBlockHeight = codeLines.length * 4.5 + 12; // Height for code lines + padding

        // Check if we need a new page for the code block start
        if (yPosition + 15 > pageHeight - margin) {
          // Save current box segment
          boxSegments.push({
            pageNum: currentPageNum,
            startY: currentBoxStart,
            endY: pageHeight - margin,
            isStart: boxSegments.length === 0,
            isEnd: false
          });

          // Add new page
          doc.addPage();
          doc.setFillColor(250, 249, 245);
          doc.rect(0, 0, pageWidth, pageHeight, 'F');

          currentPageNum = doc.internal.getCurrentPageInfo().pageNumber;
          yPosition = margin + boxPadding;
          currentBoxStart = margin;
        }

        const codeBlockStart = yPosition;
        const codeBlockPage = currentPageNum;

        // Store code block info
        contentItems.push({
          type: 'codeBlockStart',
          language: block.language,
          x: boxMargin + boxPadding,
          y: codeBlockStart,
          pageNum: codeBlockPage,
          width: maxWidth - (boxPadding * 2)
        });

        yPosition += 8; // Space for language label

        // Store each code line
        codeLines.forEach((line) => {
          // Check if we need a new page
          if (yPosition + 4.5 + 4 > pageHeight - margin) {
            // Close current code block segment
            contentItems.push({
              type: 'codeBlockEnd',
              y: yPosition,
              pageNum: currentPageNum
            });

            // Save current box segment
            boxSegments.push({
              pageNum: currentPageNum,
              startY: currentBoxStart,
              endY: pageHeight - margin,
              isStart: boxSegments.length === 0,
              isEnd: false
            });

            // Add new page
            doc.addPage();
            doc.setFillColor(250, 249, 245);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');

            currentPageNum = doc.internal.getCurrentPageInfo().pageNumber;
            yPosition = margin + boxPadding;
            currentBoxStart = margin;

            // Continue code block on new page
            contentItems.push({
              type: 'codeBlockContinue',
              x: boxMargin + boxPadding,
              y: yPosition,
              pageNum: currentPageNum,
              width: maxWidth - (boxPadding * 2)
            });

            yPosition += 4; // Add small padding at top of continued code block
          }

          contentItems.push({
            type: 'code',
            text: line,
            x: boxMargin + boxPadding + 2,
            y: yPosition,
            pageNum: currentPageNum
          });

          yPosition += 4.5;
        });

        // Mark end of code block
        contentItems.push({
          type: 'codeBlockEnd',
          y: yPosition + 4,
          pageNum: currentPageNum
        });

        yPosition += 8; // Space after code block
      }
    });

    // Add bottom padding
    yPosition += boxPadding;

    // Save final box segment
    boxSegments.push({
      pageNum: currentPageNum,
      startY: currentBoxStart,
      endY: yPosition,
      isStart: boxSegments.length === 0,
      isEnd: true
    });

    // Now draw everything in the correct order
    const currentPage = doc.internal.getCurrentPageInfo().pageNumber;

    // Step 1: Draw all box backgrounds and borders first
    boxSegments.forEach(segment => {
      doc.setPage(segment.pageNum);

      const boxHeight = segment.endY - segment.startY;
      const cornerRadius = 2; // Smaller, more subtle radius

      // Draw background with rounded corners
      doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);

      if (segment.isStart && segment.isEnd) {
        // Single segment - all corners rounded
        doc.roundedRect(boxMargin, segment.startY, maxWidth, boxHeight, cornerRadius, cornerRadius, 'F');
      } else {
        // Multi-segment box - just draw rectangle (no rounded corners for page-spanning boxes)
        doc.rect(boxMargin, segment.startY, maxWidth, boxHeight, 'F');
      }

      // Draw refined borders
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.4); // Refined border width

      if (segment.isStart && segment.isEnd) {
        // Single segment - full rounded rectangle border
        doc.roundedRect(boxMargin, segment.startY, maxWidth, boxHeight, cornerRadius, cornerRadius, 'S');
      } else {
        // Draw straight borders for multi-segment boxes
        // Left border
        doc.line(boxMargin, segment.startY, boxMargin, segment.endY);
        // Right border
        doc.line(boxMargin + maxWidth, segment.startY, boxMargin + maxWidth, segment.endY);

        // Top border (only on first segment)
        if (segment.isStart) {
          doc.line(boxMargin, segment.startY, boxMargin + maxWidth, segment.startY);
        }

        // Bottom border (only on last segment)
        if (segment.isEnd) {
          doc.line(boxMargin, segment.endY, boxMargin + maxWidth, segment.endY);
        }
      }
    });

    // Step 2: Draw label on top of background
    doc.setPage(labelPage);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
    doc.text(`${label}:`, boxMargin + boxPadding, labelY);

    // Step 3: Draw all content items in two passes
    // First pass: Draw code block backgrounds and track segments
    let codeBlockSegments = [];
    let currentCodeBlock = null;
    let codeBlockStartItem = null;

    contentItems.forEach(item => {
      if (item.type === 'codeBlockStart') {
        currentCodeBlock = item;
        codeBlockStartItem = item;
      } else if (item.type === 'codeBlockContinue') {
        currentCodeBlock = item;
      } else if (item.type === 'codeBlockEnd') {
        if (currentCodeBlock) {
          codeBlockSegments.push({
            startItem: currentCodeBlock,
            endY: item.y,
            pageNum: currentCodeBlock.pageNum,
            isStart: currentCodeBlock === codeBlockStartItem,
            language: codeBlockStartItem ? codeBlockStartItem.language : 'code'
          });
          currentCodeBlock = null;
        }
      }
    });

    // Draw code block backgrounds with continuous borders
    codeBlockSegments.forEach((segment, segIndex) => {
      doc.setPage(segment.pageNum);
      const codeBoxHeight = segment.endY - segment.startItem.y;

      // Light background for code
      doc.setFillColor(248, 248, 248); // Very light gray
      doc.setDrawColor(200, 200, 200); // Gray border
      doc.setLineWidth(0.3);

      // Draw background
      doc.rect(segment.startItem.x, segment.startItem.y, segment.startItem.width, codeBoxHeight, 'F');

      // Draw borders - left and right always, top and bottom conditionally
      const x = segment.startItem.x;
      const y = segment.startItem.y;
      const width = segment.startItem.width;
      const height = codeBoxHeight;

      // Left border (always)
      doc.line(x, y, x, y + height);
      // Right border (always)
      doc.line(x + width, y, x + width, y + height);

      // Check if this is the first segment of this code block
      if (segment.isStart) {
        // Top border (only on first segment)
        doc.line(x, y, x + width, y);
      }

      // Check if this is the last segment by looking ahead
      const nextSegment = codeBlockSegments[segIndex + 1];
      const isLastSegment = !nextSegment || nextSegment.isStart;

      if (isLastSegment) {
        // Bottom border (only on last segment)
        doc.line(x, y + height, x + width, y + height);
      }
    });

    // Second pass: Draw all text on top of backgrounds
    contentItems.forEach(item => {
      doc.setPage(item.pageNum);

      if (item.type === 'codeBlockStart') {
        // Draw language label in top-left corner
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 100, 100);
        const lang = item.language.toUpperCase();
        doc.text(lang, item.x + 2, item.y + 5);
      } else if (item.type === 'code') {
        // Draw code line
        doc.setFontSize(9);
        doc.setFont('courier', 'normal');
        doc.setTextColor(40, 40, 40); // Darker text for better visibility
        doc.text(item.text, item.x, item.y);
      } else if (item.type === 'text') {
        // Draw regular text
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 50, 50);
        doc.text(item.text, item.x, item.y);
      }
    });

    // Return to current page
    doc.setPage(currentPage);

    // Add spacing after the box
    yPosition += 4;
  });

  // Footer on last page
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Exported from ${data.platform} | ${data.messages.length} messages | Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
  const filename = sanitizeFilename(data.title) + '.pdf';
  doc.save(filename);
}

function sanitizeFilename(filename) {
  return filename
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_+/g, '_')
    .substring(0, 100) || 'chat_export';
}

function handleEmojisInText(text) {
  // Replace emojis with [emoji] to avoid rendering issues in PDF
  // This regex matches most emoji characters
  return text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{FE00}-\u{FE0F}]|[\u{1F004}]|[\u{1F0CF}]|[\u{1F170}-\u{1F251}]|[\u{00A9}]|[\u{00AE}]|[\u{203C}]|[\u{2049}]|[\u{2122}]|[\u{2139}]|[\u{2194}-\u{2199}]|[\u{21A9}-\u{21AA}]|[\u{231A}-\u{231B}]|[\u{2328}]|[\u{23CF}]|[\u{23E9}-\u{23F3}]|[\u{23F8}-\u{23FA}]|[\u{24C2}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{2600}-\u{2604}]|[\u{260E}]|[\u{2611}]|[\u{2614}-\u{2615}]|[\u{2618}]|[\u{261D}]|[\u{2620}]|[\u{2622}-\u{2623}]|[\u{2626}]|[\u{262A}]|[\u{262E}-\u{262F}]|[\u{2638}-\u{263A}]|[\u{2640}]|[\u{2642}]|[\u{2648}-\u{2653}]|[\u{265F}-\u{2660}]|[\u{2663}]|[\u{2665}-\u{2666}]|[\u{2668}]|[\u{267B}]|[\u{267E}-\u{267F}]|[\u{2692}-\u{2697}]|[\u{2699}]|[\u{269B}-\u{269C}]|[\u{26A0}-\u{26A1}]|[\u{26A7}]|[\u{26AA}-\u{26AB}]|[\u{26B0}-\u{26B1}]|[\u{26BD}-\u{26BE}]|[\u{26C4}-\u{26C5}]|[\u{26C8}]|[\u{26CE}]|[\u{26CF}]|[\u{26D1}]|[\u{26D3}-\u{26D4}]|[\u{26E9}-\u{26EA}]|[\u{26F0}-\u{26F5}]|[\u{26F7}-\u{26FA}]|[\u{26FD}]/gu, '');
}

function parseContentBlocks(text) {
  // Parse text into regular text and code blocks
  const blocks = [];
  // Match code blocks with optional language: ```language\ncode\n```
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      const textBefore = text.substring(lastIndex, match.index).trim();
      if (textBefore) {
        blocks.push({
          type: 'text',
          content: textBefore
        });
      }
    }

    // Add code block
    blocks.push({
      type: 'code',
      language: match[1] || 'code',
      content: match[2].trim()
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    const textAfter = text.substring(lastIndex).trim();
    if (textAfter) {
      blocks.push({
        type: 'text',
        content: textAfter
      });
    }
  }

  // If no code blocks found, return the whole text as one block
  if (blocks.length === 0) {
    blocks.push({
      type: 'text',
      content: text
    });
  }

  return blocks;
}

function showError(message) {
  const errorEl = document.getElementById('error');
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
}

function hideError() {
  document.getElementById('error').classList.add('hidden');
}

function showSuccess(message) {
  const successEl = document.getElementById('success');
  successEl.textContent = message;
  successEl.classList.remove('hidden');
}

function hideSuccess() {
  document.getElementById('success').classList.add('hidden');
}
