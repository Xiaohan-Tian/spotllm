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
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imagePreview = document.getElementById('imagePreview');

// Create and add delete button
const imageDeleteButton = document.createElement('div');
imageDeleteButton.id = 'imageDeleteButton';
imageDeleteButton.innerHTML = '×';  // Using × symbol for delete
imagePreviewContainer.appendChild(imageDeleteButton);

// Conversation Management
let conversation = [];

const addMessage = (role, content, image = null) => {
  conversation.push({ 
    role,
    content: [{
      type: 'text',
      text: content
    }]
   });

   if (image) {
    conversation[conversation.length - 1].content.push({
      type: 'image_url',
      image_url: {
        url: image
      }
    });
   }
};

const removeLastMessage = () => {
  conversation.pop();
};

const isLastMessagePendingUserMessage = () => {
  return conversation.length > 0 && conversation[conversation.length - 1].role === 'user';
};

const updateLastUserMessage = (content) => {
  if (isLastMessagePendingUserMessage()) {
    conversation[conversation.length - 1].content.find(part => part.type === 'text').text = content;
  }
};

const clearConversation = () => {
  conversation = [];
};

const clearImagePreview = () => {
  imagePreviewContainer.style.display = 'none';
  imagePreview.src = '';
  // Clean up object URL if it exists
  if (imagePreview.dataset.objectUrl) {
    URL.revokeObjectURL(imagePreview.dataset.objectUrl);
    delete imagePreview.dataset.objectUrl;
  }
  updateWindowHeight();
};
imageDeleteButton.addEventListener('click', clearImagePreview);

const newConversation = () => {
  // Clear conversation data
  clearConversation();
  
  // Clear all wrapper DIVs
  responseContent.innerHTML = '';
  
  // Hide containers
  statusContainer.style.display = 'none';
  responseContainer.style.display = 'none';
  
  // Clear image preview
  clearImagePreview();
  
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

  // Add image preview container height if visible
  if (imagePreviewContainer.style.display !== 'none') {
    totalHeight += imagePreviewContainer.offsetHeight;
  }

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
  const contentContainer = document.createElement('div');
  contentContainer.className = 'content-container';
  wrapper.appendChild(contentContainer);

  // Create content div
  const content = document.createElement('div');
  content.className = 'content';
  contentContainer.appendChild(content);

  // Add image preview div for user messages
  if (isUser) {
    const imagePreviewDiv = document.createElement('div');
    imagePreviewDiv.className = 'dialog-image-preview';
    contentContainer.appendChild(imagePreviewDiv);
  }

  responseContent.appendChild(wrapper);
  return content;  // Return the content div instead of wrapper
}

// Function to scroll response to bottom
function scrollToBottom() {
  responseContent.scrollTop = responseContent.scrollHeight;
}

// Handle content submission
const handleContentSubmission = async () => {
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

  // Handle image if present
  let base64Image = null;
  if (imagePreviewContainer.style.display !== 'none' && imagePreview.src) {
    // Create a canvas to convert the image to PNG
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = imagePreview.naturalWidth;
    canvas.height = imagePreview.naturalHeight;
    ctx.drawImage(imagePreview, 0, 0);
    
    // Convert to base64 PNG
    base64Image = canvas.toDataURL('image/png');

    // Add image to dialog preview
    const dialogImagePreview = userContent.parentElement.querySelector('.dialog-image-preview');
    const dialogImage = document.createElement('img');
    dialogImage.src = imagePreview.src;
    dialogImagePreview.appendChild(dialogImage);
    dialogImagePreview.style.display = 'block';
  }

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

  // Clear the input image preview
  clearImagePreview();

  // Add message to conversation
  if (isLastMessagePendingUserMessage()) {
    removeLastMessage();
  }

  addMessage('user', content, base64Image);
  
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

ipcRenderer.on('llm-response-done', (_, {finalResponse, useMarkdown}) => {
  // Final render of markdown
  if (currentResponseWrapper) {
    if (finalResponse) {
      currentResponseWrapper.innerHTML = useMarkdown ? marked.parse(finalResponse) : `<pre><code>${finalResponse}</code></pre>`;
    } else {
      currentResponseWrapper.innerHTML = useMarkdown ? marked.parse(markdownText) : `<pre><code>${markdownText}</code></pre>`;
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
document.addEventListener('keydown', async (event) => {
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
      await handleContentSubmission();
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

  // Check for Ctrl/Cmd + V
  if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
    // Read clipboard content
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        // Check if the clipboard item contains an image
        if (item.types.includes('image/png') || 
            item.types.includes('image/jpeg') || 
            item.types.includes('image/gif') ||
            item.types.includes('image/webp')) {
          console.log('clipboard contains an image');
          event.preventDefault(); // Prevent default paste behavior

          // Get the image blob
          const imageType = item.types.find(type => type.startsWith('image/'));
          const imageBlob = await item.getType(imageType);
          
          // Create object URL and display image
          const imageUrl = URL.createObjectURL(imageBlob);
          imagePreview.src = imageUrl;
          imagePreview.dataset.objectUrl = imageUrl;  // Store URL for cleanup
          imagePreviewContainer.style.display = 'block';
          
          // Update window height
          updateWindowHeight();
          break;
        }
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
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
  setTimeout(async () => {
    await handleContentSubmission();
  }, 100);
}); 

// add conversation handler
ipcRenderer.on(`update-last-user-message`, (_, content) => {
  updateLastUserMessage(content);
});
