const { ipcRenderer } = require('electron');

// Elements
const inputContainer = document.getElementById('inputContainer');
const searchInput = document.getElementById('searchInput');
const searchTextarea = document.getElementById('searchTextarea');

// Constants for sizing
const SINGLE_LINE_HEIGHT = 60;  // Window height for single-line input
const MULTI_LINE_HEIGHT = 180;  // Window height for textarea (approximately 5 lines)

// Log hello world when window launches
console.log('Hello World - Spotlight window launched');

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
});

// Handle key events
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
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
      
      // Request window resize
      ipcRenderer.send('resize-spotlight', MULTI_LINE_HEIGHT);
    } else if (event.shiftKey && searchTextarea.style.display !== 'none') {
      // Add new line in textarea mode
      event.preventDefault();  // Prevent default newline behavior
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
      // Send content to main process
      event.preventDefault();  // Prevent default newline behavior
      const content = searchTextarea.style.display === 'none' 
        ? searchInput.value 
        : searchTextarea.value;
      console.log('Sending content to main process:', content);
      ipcRenderer.send('spotlight-content', content);
    }
  }
}); 