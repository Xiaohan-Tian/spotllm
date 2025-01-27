const { ipcRenderer } = require('electron');

// Elements
const inputContainer = document.getElementById('inputContainer');
const searchInput = document.getElementById('searchInput');
const searchTextarea = document.getElementById('searchTextarea');

// Add new elements
const statusContainer = document.getElementById('statusContainer');
const responseContainer = document.getElementById('responseContainer');
const responseContent = document.getElementById('responseContent');
const copyButton = document.getElementById('copyButton');
const plusButton = document.getElementById('plusButton');

// Conversation Management
let conversation = [];

const addMessage = (role, content) => {
  conversation.push({ role, content });
};

const removeLastMessage = () => {
  conversation.pop();
};

const isLastMessagePendingUserMessage = () => {
  return conversation.length > 0 && conversation[conversation.length - 1].role === 'user';
};

const updateLastUserMessage = (content) => {
  if (isLastMessagePendingUserMessage()) {
    conversation[conversation.length - 1].content = content;
  }
};

const clearConversation = () => {
  conversation = [];
};

const newConversation = () => {
  // Clear conversation data
  clearConversation();
  
  // Clear all wrapper DIVs
  responseContent.innerHTML = '';
  
  // Hide containers
  statusContainer.style.display = 'none';
  responseContainer.style.display = 'none';
  
  // Reset any pending response
  markdownText = '';
  currentResponseWrapper = null;
  
  // Update window height
  updateWindowHeight();
};

// Log hello world when window launches
console.log('Spotlight window launched');

// Initialize i18next when window loads
window.addEventListener('load', async () => {
  await i18next.init({
    lng: 'en_us',
    fallbackLng: 'en_us',
    resources: {
      en_us: {
        translation: await ipcRenderer.invoke('load-locale', 'en_us')
      }
    }
  });

  // Set initial placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    const key = element.getAttribute('data-i18n-placeholder');
    element.placeholder = i18next.t(key);
  });

  // Initial focus
  searchInput.focus();
});

// Utility function for window height updates
function updateWindowHeight() {
  // Calculate height based on visible elements
  let totalHeight = inputContainer.offsetHeight; // Input is always visible

  // Add status container height if visible
  if (statusContainer.style.display !== 'none') {
    totalHeight += statusContainer.offsetHeight;
  }

  // Add response container height if visible
  if (responseContainer.style.display !== 'none') {
    totalHeight += responseContainer.offsetHeight;
  }

  // Add padding to account for window chrome
  totalHeight += 2; // Account for potential rounding

  ipcRenderer.send('resize-spotlight', totalHeight);
}

// Status utilities
let currentAnimation = null;

function showStatus(msg) {
  // Clear any existing animation
  if (currentAnimation) {
    currentAnimation();
    currentAnimation = null;
  }

  // Update status text
  document.getElementById('statusText').textContent = msg;

  // Show container and start animation
  statusContainer.style.display = 'block';
  currentAnimation = window.createTextWave(statusText);

  // Update window height
  updateWindowHeight();
}

function hideStatus() {
  if (currentAnimation) {
    currentAnimation();
    currentAnimation = null;
  }
  statusContainer.style.display = 'none';
  updateWindowHeight();
}

// Add response handlers
let markdownText = '';
let currentResponseWrapper = null;

// Function to create a new dialog wrapper
function createDialogWrapper(isUser = false) {
  const wrapper = document.createElement('div');
  wrapper.className = 'dialog-wrapper';

  // Create icon
  const icon = document.createElement('div');
  icon.className = `icon ${isUser ? 'user' : 'assistant'}`;
  wrapper.appendChild(icon);

  // Create content container
  const content = document.createElement('div');
  content.className = 'content';
  wrapper.appendChild(content);

  responseContent.appendChild(wrapper);
  return content;  // Return the content div instead of wrapper
}

// Function to scroll response to bottom
function scrollToBottom() {
  responseContent.scrollTop = responseContent.scrollHeight;
}

// Handle content submission
const handleContentSubmission = () => {
  const isTextarea = searchTextarea.style.display !== 'none' && searchTextarea.style.display;
  const input = isTextarea ? searchTextarea : searchInput;
  const content = input.value || input.placeholder;  // Use placeholder if input is empty
  
  // Don't proceed if both input and placeholder are empty
  if (!content) return;
  
  // Show working status
  showStatus(i18next.t('spotlight.status.working'));
  
  // Create wrapper for user input
  const userContent = createDialogWrapper(true);
  userContent.innerHTML = marked.parse(content);
  scrollToBottom();

  // Create wrapper for upcoming LLM response
  currentResponseWrapper = createDialogWrapper(false);
  
  // Update placeholder and clear input
  if (!isTextarea) {
    searchInput.placeholder = content;
    searchInput.value = '';
  } else {
    searchTextarea.placeholder = content;
    searchTextarea.value = '';
  }

  // Add message to conversation
  if (isLastMessagePendingUserMessage()) {
    removeLastMessage();
  }

  addMessage('user', content);
  
  // Send content to main process
  console.log('Sending content to main process:', content);
  ipcRenderer.send('spotlight-content', {content, conversation});
};

ipcRenderer.on('llm-response-chunk', (_, chunk) => {
  if (responseContainer.style.display === 'none' || !responseContainer.style.display) {
    responseContainer.style.display = 'block';
    updateWindowHeight();
  }
  markdownText += chunk;
  if (currentResponseWrapper) {
    currentResponseWrapper.innerHTML = marked.parse(markdownText);
    scrollToBottom();
  }
});

ipcRenderer.on('llm-response-done', (_, finalResponse) => {
  // Final render of markdown
  if (currentResponseWrapper) {
    if (finalResponse) {
      currentResponseWrapper.innerHTML = marked.parse(finalResponse);
    } else {
      currentResponseWrapper.innerHTML = marked.parse(markdownText);
    }
    currentResponseWrapper = null;  // Clear the reference
  }

  // Add message to conversation
  addMessage('assistant', markdownText);

  // Reset for next response
  markdownText = ''; // Reset for next response
  hideStatus(); // Hide the "Working..." status when done
  scrollToBottom();
});

ipcRenderer.on('llm-response-error', (_, error) => {
  responseContainer.style.display = 'block';
  if (currentResponseWrapper) {
    currentResponseWrapper.innerHTML = `<pre class="error">Error: ${error}</pre>`;
    currentResponseWrapper = null;  // Clear the reference
  }
  hideStatus(); // Hide the "Working..." status on error
  updateWindowHeight();
  scrollToBottom();
});

// Focus input when window loads
window.addEventListener('load', () => {
  searchInput.focus();
});

// Focus input when receiving message from main process
ipcRenderer.on('focus-input', () => {
  if (searchTextarea.style.display === 'none') {
    searchInput.focus();
  } else {
    searchTextarea.focus();
  }

  hideStatus();
  // preserve the previous state
  // responseContainer.style.display = 'none';
  // responseContent.textContent = '';
});

// Update the Enter key handler
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    hideStatus();
    ipcRenderer.send('hide-window');
    return;
  }

  if (event.key === 'Enter') {
    if (event.shiftKey && searchInput.style.display !== 'none') {
      // Switch to textarea mode
      const content = searchInput.value;
      searchInput.style.display = 'none';
      searchTextarea.style.display = 'block';
      searchTextarea.value = content;
      searchTextarea.focus();
      searchTextarea.selectionStart = searchTextarea.value.length;
      
      // Request window resize to actual content height
      updateWindowHeight();
    } else if (event.shiftKey && searchTextarea.style.display !== 'none') {
      // Add new line in textarea mode
      event.preventDefault();
      const selectionStart = searchTextarea.selectionStart;
      searchTextarea.value = 
        searchTextarea.value.slice(0, selectionStart) + 
        '\n' + 
        searchTextarea.value.slice(searchTextarea.selectionEnd);
      searchTextarea.selectionStart = searchTextarea.selectionEnd = selectionStart + 1;
      
      // If cursor is at the last line, scroll to bottom
      const lines = searchTextarea.value.substr(0, selectionStart + 1).split('\n');
      if (lines.length === searchTextarea.value.split('\n').length) {
        searchTextarea.scrollTop = searchTextarea.scrollHeight;
      }
    } else {
      // Handle regular Enter press
      event.preventDefault();
      handleContentSubmission();
    }
  }
});

// Function to copy response content with visual feedback
async function copyResponseContent() {
  try {
    // Get the last dialog wrapper's content
    const wrappers = responseContent.querySelectorAll('.dialog-wrapper');
    if (wrappers.length > 0) {
      const lastWrapper = wrappers[wrappers.length - 1];
      const lastContent = lastWrapper.querySelector('.content');
      await navigator.clipboard.writeText(lastContent.textContent.trim());
      // Visual feedback
      copyButton.style.opacity = '1';
      setTimeout(() => {
        copyButton.style.opacity = '0.6';
      }, 200);
    }
  } catch (err) {
    console.error('Failed to copy text:', err);
  }
}

// Add copy functionality
copyButton.addEventListener('click', copyResponseContent);

// Add keyboard shortcut for copy
document.addEventListener('keydown', async (event) => {
  // Check for Ctrl/Cmd + C
  if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
    // Get the selected text if any
    const selectedText = window.getSelection().toString();
    
    // If there's no selection and response is visible, copy the response
    if (!selectedText && responseContainer.style.display === 'block') {
      event.preventDefault(); // Prevent default copy behavior
      await copyResponseContent();
    }
    // If there is selected text, let the default copy behavior handle it
  }

  // Check for Ctrl/Cmd + N
  if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
    event.preventDefault(); // Prevent default new window behavior
    newConversation();
    // Visual feedback using the plus button
    plusButton.style.opacity = '1';
    setTimeout(() => {
      plusButton.style.opacity = '0.6';
    }, 200);
    // Focus the input
    if (searchTextarea.style.display === 'none' || !searchTextarea.style.display) {
      searchInput.focus();
    } else {
      searchTextarea.focus();
    }
  }
});

// Add new conversation functionality
plusButton.addEventListener('click', () => {
  newConversation();
  // Visual feedback
  plusButton.style.opacity = '1';
  setTimeout(() => {
    plusButton.style.opacity = '0.6';
  }, 200);
  // Focus the input
  if (searchTextarea.style.display === 'none' || !searchTextarea.style.display ) {
    searchInput.focus();
  } else {
    searchTextarea.focus();
  }
});

// Add template content handler
ipcRenderer.on('load-template', (_, { content }) => {
  // clear conversation
  clearConversation();

  // Always use single-line input
  searchInput.style.display = 'block';
  searchTextarea.style.display = 'none';
  searchInput.value = content;
  searchInput.focus();
  // Place cursor at the end
  searchInput.selectionStart = searchInput.selectionEnd = searchInput.value.length;
  
  // Update window height
  updateWindowHeight();
  
  // Clear any previous response
  responseContainer.style.display = 'none';
  responseContent.innerHTML = '';
  hideStatus();

  // Automatically trigger content submission after a small delay
  // to ensure content is properly set
  setTimeout(handleContentSubmission, 100);
}); 

// add conversation handler
ipcRenderer.on(`update-last-user-message`, (_, content) => {
  updateLastUserMessage(content);
});
