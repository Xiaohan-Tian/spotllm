const DEGUG_MODE = false;

const { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, nativeImage } = require('electron');
const path = require('path');
const Jimp = require('jimp');
const Store = require('electron-store');  // Use directly
const fs = require('fs').promises;
const LLM = require('./llms/llm');  // Add this import
const { extractJsonFromMarkdown } = require('./helpers/text-helper');

let tray = null;
let spotlightWindow = null;
let settingsWindow = null;
let currentHotkey = 'Shift+Space';

const store = new Store({
    defaults: {
        model: 'gemini-1-5-pro',
        apiKey: '',
        hostUrl: '',
        hideOnClickOutside: 'yes',
        templates: [],
        autoCopy: 'no',
        hotkey: 'Shift+Space'
    }
});

// Initialize LLM instance
const llm = LLM.create(
    store.get('apiKey'), 
    store.get('model'), 
    store.get('hostUrl')
);

if (process.platform === 'darwin') {
    app.dock.hide();
}

function createSpotlightWindow() {
    if (spotlightWindow) {
        spotlightWindow.show();
        spotlightWindow.focus();
        return;
    }

    spotlightWindow = new BrowserWindow({
        width: 600,
        height: 60,  // Initial height for single-line input
        frame: false,
        center: true,
        show: false,
        alwaysOnTop: true,
        visualEffectState: 'active',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    spotlightWindow.loadFile('windows/spotlight.html');

    const hideSpotlightWindow = () => {
        if (DEGUG_MODE) {
            return;
        }

        if (spotlightWindow && spotlightWindow.isVisible()) {
            spotlightWindow.setVisibleOnAllWorkspaces(false);
            spotlightWindow.hide();
        }
    };

    // Focus input when window is shown
    spotlightWindow.on('show', () => {
        spotlightWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
        spotlightWindow.focus();
        spotlightWindow.webContents.send('focus-input');
        
        // Add a small delay before enabling blur event
        setTimeout(() => {
            // Hide window when clicking outside
            spotlightWindow.on('blur', () => {
                if (store.get('hideOnClickOutside') === 'yes') {
                    hideSpotlightWindow();
                }
            });
        }, 100);
    });

    // Remove blur handler when window is hidden
    spotlightWindow.on('hide', () => {
        spotlightWindow.removeAllListeners('blur');
    });

    // Listen for hide-window event from renderer
    ipcMain.on('hide-window', hideSpotlightWindow);

    // Remove the before-input-event handler since we'll handle ESC in renderer
    spotlightWindow.webContents.removeAllListeners('before-input-event');

    // Add resize handler
    ipcMain.on('resize-spotlight', (_, height) => {
        if (spotlightWindow) {
            const [width] = spotlightWindow.getSize();
            spotlightWindow.setSize(width, height);
            spotlightWindow.center();
        }
    });
}

function createSettingsWindow() {
    if (settingsWindow) {
        settingsWindow.show();
        return;
    }

    settingsWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    settingsWindow.loadFile('windows/settings.html');

    settingsWindow.on('closed', () => {
        settingsWindow = null;
    });
}

async function getResizedIcon() {
    try {
        const image = await Jimp.read(path.join(__dirname, 'icon.png'));
        // Create a 44x44 version for Retina displays
        const retinaImage = await image.clone().resize(44, 44);
        const retinaBuffer = await retinaImage.getBufferAsync(Jimp.MIME_PNG);
        
        // Create a 22x22 version for standard displays
        const standardImage = await image.resize(22, 22);
        const standardBuffer = await standardImage.getBufferAsync(Jimp.MIME_PNG);

        // Create native image and mark it as template for better macOS integration
        const icon = nativeImage.createFromBuffer(standardBuffer);
        
        // Add the retina version
        icon.addRepresentation({
            width: 44,
            height: 44,
            buffer: retinaBuffer,
            scaleFactor: 2.0
        });

        // Mark as template image for better macOS dark mode support
        icon.setTemplateImage(true);
        
        return icon;
    } catch (err) {
        console.error('Error resizing icon:', err);
        // Create native image from original file as fallback
        const fallbackIcon = nativeImage.createFromPath(path.join(__dirname, 'icon.png'));
        fallbackIcon.setTemplateImage(true);
        return fallbackIcon;
    }
}

async function createTray() {
    const iconImage = await getResizedIcon();
    tray = new Tray(iconImage);
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Settings', click: () => createSettingsWindow() },
        { type: 'separator' },
        { label: 'Quit', click: () => app.quit() }
    ]);
    tray.setToolTip('SpotLLM');
    tray.setContextMenu(contextMenu);
}

// Register global hotkey
const registerHotkey = async () => {
    // Unregister any existing hotkeys first
    unregisterHotkey();

    // Register spotlight hotkey
    const hotkey = await store.get('hotkey');
    if (hotkey) {
        try {
            globalShortcut.register(hotkey, () => {
                showSpotlight();
            });
            console.log('Spotlight hotkey registered:', hotkey);
        } catch (error) {
            console.error('Failed to register spotlight hotkey:', error);
        }
    }

    // Register template hotkeys
    const templates = await store.get('templates') || [];
    templates.forEach(template => {
        if (template.hotkey) {
            try {
                globalShortcut.register(template.hotkey, () => {
                    console.log('Template hotkey pressed:', template.name, template.hotkey);
                    // Show spotlight window with template content
                    showSpotlightWithTemplate(template);
                });
                console.log('Template hotkey registered:', template.name, template.hotkey);
            } catch (error) {
                console.error('Failed to register template hotkey:', error);
            }
        }
    });
};

// Unregister global hotkey
const unregisterHotkey = () => {
    globalShortcut.unregisterAll();
    console.log('All hotkeys unregistered');
};

app.whenReady().then(async () => {
    await createTray();

    // Register initial global shortcut
    currentHotkey = store.get('hotkey') || 'Shift+Space';
    registerHotkey();
});

// Remove the global ESC handler since we're now handling it in the window
app.on('browser-window-created', (_, window) => {
    // We can remove this handler or keep it empty if needed for other windows
});

app.on('window-all-closed', (e) => {
    e.preventDefault();
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

// Update IPC handlers to handle potential undefined store
ipcMain.handle('get-store-value', (event, key) => {
    if (!store) return null;
    return store.get(key);
});

ipcMain.handle('set-store-value', async (event, key, value) => {
    if (!store) return false;
    await store.set(key, value);
    // Refresh hotkeys when templates are updated
    if (key === 'templates') {
        await registerHotkey();
    }
    return true;
});

// Add this handler with the other IPC handlers
ipcMain.handle('load-locale', async (event, locale) => {
    try {
        const filePath = path.join(__dirname, 'res', `${locale}.json`);
        const fileContent = await fs.readFile(filePath, 'utf8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error(`Error loading locale ${locale}:`, error);
        return {};
    }
});

ipcMain.on('spotlight-content', async (event, content) => {
    console.log('Received from spotlight:', content);
    
    try {
        const [processedContent, templateKey] = LLM.applyTemplate(content);
        const messages = [{ role: 'user', content: processedContent }];
        const stream = await llm.streamResponse(messages);

        let fullResponse = '';
        
        for await (const chunk of stream) {
            fullResponse += chunk;
            console.log('Streaming chunk:', chunk);
            // Send each chunk to the renderer process
            spotlightWindow.webContents.send('llm-response-chunk', chunk);
        }

        if (templateKey) {
            const json = extractJsonFromMarkdown(fullResponse);
            if (json && json[templateKey]) {
                spotlightWindow.webContents.send('llm-response-done');
                spotlightWindow.webContents.send('llm-response-chunk', json[templateKey]);
            }
            else {
                console.log('No JSON or template key found in response');
            }
        }
        
        // Send completion signal
        spotlightWindow.webContents.send('llm-response-done');
        console.log('Full response:', fullResponse);
    } catch (error) {
        console.error('Error getting LLM streaming response:', error);
        spotlightWindow.webContents.send('llm-response-error', error.message);
    }
});

// Add these IPC handlers near other IPC handlers
ipcMain.handle('pause-hotkey', () => {
    unregisterHotkey();
});

ipcMain.handle('resume-hotkey', (_, newHotkey) => {
    if (newHotkey) {
        currentHotkey = newHotkey;
    }
    registerHotkey();
});

ipcMain.handle('refresh-hotkeys', async () => {
    await registerHotkey();
});

// Function to show spotlight window
const showSpotlight = () => {
    if (!spotlightWindow) {
        createSpotlightWindow();
    }
    
    if (spotlightWindow.isVisible()) {
        spotlightWindow.hide();
    } else {
        spotlightWindow.show();
        spotlightWindow.webContents.send('focus-input');
    }
};

// Function to show spotlight with template content
const showSpotlightWithTemplate = (template) => {
    const isNewWindow = !spotlightWindow;
    
    if (isNewWindow) {
        createSpotlightWindow();
    }
    
    // Show window first so it's ready to receive the content
    spotlightWindow.show();
    
    const sendContent = () => {
        // Send template shortcut with forward slash prefix
        spotlightWindow.webContents.send('load-template', {
            content: `/${template.shortcut}`,
            isSingleLine: true  // Always use single line input
        });
    };

    if (isNewWindow) {
        // Wait for the window to be ready before sending content
        spotlightWindow.once('ready-to-show', () => {
            // Add a small delay to ensure the renderer is fully initialized
            setTimeout(sendContent, 100);
        });
    } else {
        sendContent();
    }
};
