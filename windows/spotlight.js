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

// Log hello world when window launches
console.log('Hello World - Spotlight window launched');

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

ipcRenderer.on('llm-response-chunk', (_, chunk) => {
  if (responseContainer.style.display === 'none' || !responseContainer.style.display) {
    responseContainer.style.display = 'block';
    updateWindowHeight();
  }
  markdownText += chunk;
  responseContent.innerHTML = marked.parse(markdownText);
  // Auto scroll to bottom
  responseContainer.scrollTop = responseContainer.scrollHeight;
});

ipcRenderer.on('llm-response-done', () => {
  // Final render of markdown
  responseContent.innerHTML = marked.parse(markdownText);
  markdownText = ''; // Reset for next response
  hideStatus(); // Hide the "Working..." status when done
});

ipcRenderer.on('llm-response-error', (_, error) => {
  responseContainer.style.display = 'block';
  responseContent.innerHTML = `<pre class="error">Error: ${error}</pre>`;
  hideStatus(); // Hide the "Working..." status on error
  updateWindowHeight();
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
      const content = searchTextarea.style.display === 'none' || !searchTextarea.style.display
        ? searchInput.value 
        : searchTextarea.value;
      
      // Show working status
      showStatus(i18next.t('spotlight.status.working'));
      
      // Update placeholder and clear input
      if (searchTextarea.style.display === 'none' || !searchTextarea.style.display) {
        searchInput.placeholder = content;
        searchInput.value = '';
      } else {
        searchTextarea.placeholder = content;
        searchTextarea.value = '';
      }
      
      // Send content to main process
      console.log('Sending content to main process:', content);
      ipcRenderer.send('spotlight-content', content);
    }
  }
});

// Add copy functionality
copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(responseContent.textContent);
    // Visual feedback
    copyButton.style.opacity = '1';
    setTimeout(() => {
      copyButton.style.opacity = '0.6';
    }, 200);
  } catch (err) {
    console.error('Failed to copy text:', err);
  }
});

// Add keyboard shortcut for copy
document.addEventListener('keydown', async (event) => {
  // Check for Ctrl/Cmd + C
  if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
    // Get the selected text if any
    const selectedText = window.getSelection().toString();
    
    // If there's no selection and response is visible, copy the response
    if (!selectedText && responseContainer.style.display === 'block') {
      event.preventDefault(); // Prevent default copy behavior
      try {
        await navigator.clipboard.writeText(responseContent.textContent);
        // Visual feedback using the copy button
        copyButton.style.opacity = '1';
        setTimeout(() => {
          copyButton.style.opacity = '0.6';
        }, 200);
      } catch (err) {
        console.error('Failed to copy response:', err);
      }
    }
    // If there is selected text, let the default copy behavior handle it
  }
}); 