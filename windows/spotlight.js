const { ipcRenderer } = require('electron');

// Elements
const inputContainer = document.getElementById('inputContainer');
const searchInput = document.getElementById('searchInput');
const searchTextarea = document.getElementById('searchTextarea');

// Add new elements
const statusContainer = document.getElementById('statusContainer');

// Log hello world when window launches
console.log('Hello World - Spotlight window launched');

// Focus input when window loads
window.addEventListener('load', () => {
  searchInput.focus();
});

// Remove the animation configuration constants and setupAnimatedText function
// Instead, add this variable to store the cleanup function
let currentAnimation = null;

// Focus input when receiving message from main process
ipcRenderer.on('focus-input', () => {
  if (searchTextarea.style.display === 'none') {
    searchInput.focus();
  } else {
    searchTextarea.focus();
  }
  if (currentAnimation) {
    currentAnimation();
    currentAnimation = null;
  }
  statusContainer.style.display = 'none';
});

// Update the Enter key handler
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    if (currentAnimation) {
      currentAnimation();
      currentAnimation = null;
    }
    statusContainer.style.display = 'none';
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
      ipcRenderer.send('resize-spotlight', document.body.scrollHeight);
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
      
      // Update the status animation part:
      if (currentAnimation) {
        currentAnimation();
      }
      statusContainer.style.display = 'block';
      currentAnimation = window.createTextWave(document.getElementById('statusText'));
      
      // Small delay to ensure the status container is rendered
      setTimeout(() => {
        ipcRenderer.send('resize-spotlight', document.body.scrollHeight);
      }, 0);
      
      // Send content to main process
      console.log('Sending content to main process:', content);
      ipcRenderer.send('spotlight-content', content);
    }
  }
}); 