const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getStoreValue: (key) => ipcRenderer.invoke('get-store-value', key),
    setStoreValue: (key, value) => ipcRenderer.invoke('set-store-value', key, value),
    loadLocale: (locale) => ipcRenderer.invoke('load-locale', locale),
    pauseHotkey: () => ipcRenderer.invoke('pause-hotkey'),
    resumeHotkey: (newHotkey) => ipcRenderer.invoke('resume-hotkey', newHotkey)
}); 