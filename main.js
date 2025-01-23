const { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, nativeImage } = require('electron');
const path = require('path');
const Jimp = require('jimp');
const Store = require('electron-store');  // Use directly
const fs = require('fs').promises;

let tray = null;
let spotlightWindow = null;
let settingsWindow = null;

const store = new Store({
    defaults: {
        model: 'gemini-1-5-pro',
        apiKey: '',
        hostUrl: '',
    }
});

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
        height: 60,
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
            spotlightWindow.on('blur', hideSpotlightWindow);
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

app.whenReady().then(async () => {
    await createTray();

    // Register global shortcut
    globalShortcut.register('Shift+Space', () => {
        if (spotlightWindow && spotlightWindow.isVisible()) {
            spotlightWindow.hide();
        } else {
            createSpotlightWindow();
            spotlightWindow.show();
        }
    });
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

ipcMain.handle('set-store-value', (event, key, value) => {
    if (!store) return false;
    store.set(key, value);
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
