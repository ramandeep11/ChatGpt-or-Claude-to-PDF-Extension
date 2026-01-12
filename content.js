// Content script for extracting chat content from ChatGPT and Claude

function detectPlatform() {
  const hostname = window.location.hostname;
  if (hostname.includes('chatgpt.com')) {
    return 'chatgpt';
  } else if (hostname.includes('claude.ai')) {
    return 'claude';
  }
  return null;
}

function extractChatGPTContent() {
  const messages = [];
  const conversationContainer = document.querySelector('main');

  if (!conversationContainer) {
    return null;
  }

  // Find all message groups
  const messageGroups = conversationContainer.querySelectorAll('[data-testid^="conversation-turn-"]');

  messageGroups.forEach((group) => {
    // Try to find user and assistant messages
    const userMessage = group.querySelector('[data-message-author-role="user"]');
    const assistantMessage = group.querySelector('[data-message-author-role="assistant"]');

    if (userMessage) {
      const content = extractMessageContent(userMessage);
      if (content) {
        messages.push({
          role: 'user',
          content: content
        });
      }
    }

    if (assistantMessage) {
      const content = extractMessageContent(assistantMessage);
      if (content) {
        messages.push({
          role: 'assistant',
          content: content
        });
      }
    }
  });

  return {
    platform: 'ChatGPT',
    title: document.title || 'ChatGPT Conversation',
    messages: messages,
    timestamp: new Date().toISOString()
  };
}

function extractMessageContent(messageElement) {
  let content = '';
  const codeBlocks = [];

  // Find all code blocks within the message
  const preElements = messageElement.querySelectorAll('pre');

  preElements.forEach((pre, index) => {
    // Extract language from the code block header
    const langElement = pre.querySelector('div[class*="rounded-t"]');
    const language = langElement ? langElement.textContent.trim() : 'code';

    // Extract code content
    const codeElement = pre.querySelector('code');
    if (codeElement) {
      const codeText = codeElement.textContent.trim();
      codeBlocks.push({
        index: index,
        language: language,
        code: codeText,
        placeholder: `__CODE_BLOCK_${index}__`
      });
    }
  });

  // Get the full text content
  let tempDiv = messageElement.cloneNode(true);

  // Remove "Copy code" buttons and other UI elements
  tempDiv.querySelectorAll('button').forEach(btn => btn.remove());

  // Replace code blocks with placeholders
  const tempPres = tempDiv.querySelectorAll('pre');
  tempPres.forEach((pre, index) => {
    if (codeBlocks[index]) {
      pre.textContent = codeBlocks[index].placeholder;
    }
  });

  content = tempDiv.textContent.trim();

  // Replace placeholders with properly formatted code blocks
  codeBlocks.forEach((block) => {
    content = content.replace(
      block.placeholder,
      `\n\`\`\`${block.language}\n${block.code}\n\`\`\`\n`
    );
  });

  return content;
}

function extractClaudeMessageContent(messageElement) {
  let content = '';
  const codeBlocks = [];

  // Find all code blocks within the message
  const codeElements = messageElement.querySelectorAll('pre.code-block__code');

  codeElements.forEach((pre, index) => {
    // Extract language from the div with class text-text-500
    let language = 'code';

    // Look for language label in previous sibling or parent's previous sibling
    const parentDiv = pre.closest('div');
    if (parentDiv) {
      const langElement = parentDiv.querySelector('.text-text-500.font-small');
      if (langElement) {
        language = langElement.textContent.trim();
      }
    }

    // Extract code content
    const codeElement = pre.querySelector('code');
    if (codeElement) {
      const codeText = codeElement.textContent.trim();
      codeBlocks.push({
        index: index,
        language: language,
        code: codeText,
        placeholder: `__CODE_BLOCK_${index}__`
      });
    }
  });

  // Get the full text content
  let tempDiv = messageElement.cloneNode(true);

  // Remove buttons and UI elements
  tempDiv.querySelectorAll('button').forEach(btn => btn.remove());

  // Remove "Copy to clipboard" and similar text
  tempDiv.querySelectorAll('.text-text-500').forEach(el => {
    if (el.textContent.toLowerCase().includes('copy')) {
      el.remove();
    }
  });

  // Replace code blocks with placeholders
  const tempCodeBlocks = tempDiv.querySelectorAll('pre.code-block__code');
  tempCodeBlocks.forEach((pre, index) => {
    if (codeBlocks[index]) {
      pre.textContent = codeBlocks[index].placeholder;
    }
  });

  content = tempDiv.textContent.trim();

  // Replace placeholders with properly formatted code blocks
  codeBlocks.forEach((block) => {
    content = content.replace(
      block.placeholder,
      `\n\`\`\`${block.language}\n${block.code}\n\`\`\`\n`
    );
  });

  return content;
}

function extractClaudeContent() {
  const messages = [];

  try {
    // Find the main conversation container
    const main = document.querySelector('main') || document.body;

    // Extract user messages using data-testid attribute
    const userMessages = Array.from(main.querySelectorAll('[data-testid="user-message"]'));

    // Extract assistant messages using the font-claude-response class
    const assistantMessages = Array.from(main.querySelectorAll('.font-claude-response'));

    // Combine all messages with their position and role
    const allMessages = [];

    userMessages.forEach(element => {
      const text = element.textContent?.trim() || '';
      if (text.length > 0) {
        allMessages.push({
          role: 'user',
          content: text,
          y: element.getBoundingClientRect().top
        });
      }
    });

    assistantMessages.forEach(element => {
      // Extract content with code blocks from Claude responses
      const content = extractClaudeMessageContent(element);

      if (content && content.length > 0) {
        allMessages.push({
          role: 'assistant',
          content: content,
          y: element.getBoundingClientRect().top
        });
      }
    });

    // Sort messages by vertical position (top to bottom)
    allMessages.sort((a, b) => a.y - b.y);

    // Add sorted messages to final array
    allMessages.forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    });

    console.log(`Claude: Extracted ${messages.length} messages (${userMessages.length} user, ${assistantMessages.length} assistant)`);

  } catch (error) {
    console.error('Claude extraction error:', error);
  }

  return {
    platform: 'Claude',
    title: document.title || 'Claude Conversation',
    messages: messages,
    timestamp: new Date().toISOString()
  };
}


function extractConversation() {
  const platform = detectPlatform();

  if (platform === 'chatgpt') {
    return extractChatGPTContent();
  } else if (platform === 'claude') {
    return extractClaudeContent();
  }

  return null;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractContent') {
    const content = extractConversation();
    sendResponse({ success: true, data: content });
  }
  return true;
});

// Add visual indicator when extension is active (only if not already present)
if (!document.getElementById('chat-pdf-indicator')) {
  const indicator = document.createElement('div');
  indicator.id = 'chat-pdf-indicator';
  indicator.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: #10a37f;
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-family: system-ui;
    z-index: 10000;
    opacity: 0;
    transition: opacity 0.3s;
    pointer-events: none;
  `;
  indicator.textContent = 'PDF Export Ready';
  document.body.appendChild(indicator);

  // Show indicator briefly on load
  setTimeout(() => {
    indicator.style.opacity = '1';
    setTimeout(() => {
      indicator.style.opacity = '0';
    }, 2000);
  }, 500);
}
