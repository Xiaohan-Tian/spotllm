import { showConfirmDialog, hideConfirmDialog } from './utils/dialog-utils.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize i18next
    await i18next.init({
        lng: 'en_us',
        fallbackLng: 'en_us',
        resources: {
            en_us: {
                translation: await window.electronAPI.loadLocale('en_us')
            }
        }
    });

    // Translate all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        element.innerHTML = i18next.t(key);
    });

    // Translate placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        element.placeholder = i18next.t(key);
    });

    // Sidebar navigation
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    const sections = document.querySelectorAll('.section');

    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all items and sections
            sidebarItems.forEach(i => i.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            // Add active class to clicked item and corresponding section
            item.classList.add('active');
            const sectionId = item.getAttribute('data-section');
            document.getElementById(sectionId).classList.add('active');
        });
    });

    // Model and API Key handling
    const modelSelect = document.querySelector('#general select.setting-input');
    const apiKeyInput = document.querySelector('#general input[type="password"]');
    const togglePassword = document.querySelector('.toggle-password');
    const hostUrlSetting = document.querySelector('.host-url-setting');
    const hostUrlInput = hostUrlSetting.querySelector('.setting-input');

    // Load saved values
    modelSelect.value = await window.electronAPI.getStoreValue('model') || 'gemini-1-5-pro';
    apiKeyInput.value = await window.electronAPI.getStoreValue('apiKey') || '';
    hostUrlInput.value = await window.electronAPI.getStoreValue('hostUrl') || '';

    // Show/hide host URL setting based on model selection
    const updateHostUrlVisibility = () => {
        hostUrlSetting.style.display = modelSelect.value === 'private' ? 'block' : 'none';
    };
    updateHostUrlVisibility();

    // Toggle password visibility
    togglePassword.addEventListener('click', () => {
        const type = apiKeyInput.getAttribute('type') === 'password' ? 'text' : 'password';
        apiKeyInput.setAttribute('type', type);
        togglePassword.classList.toggle('showing', type === 'text');
    });

    // Save on change
    modelSelect.addEventListener('change', async (e) => {
        await window.electronAPI.setStoreValue('model', e.target.value);
        console.log('Model saved:', e.target.value);
        updateHostUrlVisibility();
    });

    apiKeyInput.addEventListener('input', async (e) => {
        await window.electronAPI.setStoreValue('apiKey', e.target.value);
        console.log('API key saved');
    });

    hostUrlInput.addEventListener('input', async (e) => {
        await window.electronAPI.setStoreValue('hostUrl', e.target.value);
        console.log('Host URL saved');
    });

    // Behavior settings
    const hideOnClickOutsideSelect = document.querySelector('.hide-on-click-setting');
    const autoCopySelect = document.querySelector('.auto-copy-setting');
    const hotkeyInput = document.querySelector('.hotkey-setting');
    
    // Load saved values
    hideOnClickOutsideSelect.value = await window.electronAPI.getStoreValue('hideOnClickOutside') || 'yes';
    autoCopySelect.value = await window.electronAPI.getStoreValue('autoCopy') || 'no';
    hotkeyInput.value = await window.electronAPI.getStoreValue('hotkey') || 'Shift+Space';
    
    hideOnClickOutsideSelect.addEventListener('change', async (e) => {
        await window.electronAPI.setStoreValue('hideOnClickOutside', e.target.value);
        console.log('Hide on click outside setting saved:', e.target.value);
    });

    autoCopySelect.addEventListener('change', async (e) => {
        await window.electronAPI.setStoreValue('autoCopy', e.target.value);
        console.log('Auto copy setting saved:', e.target.value);
    });

    // Hotkey input handling
    hotkeyInput.addEventListener('click', async () => {
        let pressedKeys = new Set();
        let keyHandler;

        // Pause the global shortcut while recording
        await window.electronAPI.pauseHotkey();

        showConfirmDialog(  // show the dialog and move on, don't wait for user to confirm
            i18next.t('settings.behavior.hotkey.dialog.title'),
            i18next.t('settings.behavior.hotkey.dialog.message'),
            false,  // show cancel
            false  // hide confirm
        );

        // Start listening for key combinations
        keyHandler = (e) => {
            e.preventDefault();

            if (e.key === 'Escape') {
                document.removeEventListener('keydown', keyHandler);
                hideConfirmDialog();
                // Resume with the previous hotkey
                window.electronAPI.resumeHotkey();
                return;
            }

            // Format special keys
            const formatKey = (key) => {
                switch (key) {
                    case ' ': return 'Space';
                    default: return key;
                }
            };

            // Add the key to pressed keys
            if (e.key !== 'Meta' && e.key !== 'Control' && e.key !== 'Alt' && e.key !== 'Shift') {
                pressedKeys.add(formatKey(e.key));
            }

            // Add modifier keys if pressed
            if (e.metaKey) pressedKeys.add('Command');
            if (e.ctrlKey) pressedKeys.add('Control');
            if (e.altKey) pressedKeys.add('Alt');
            if (e.shiftKey) pressedKeys.add('Shift');

            // If we have 2 or more keys pressed
            if (pressedKeys.size >= 2) {
                const hotkey = Array.from(pressedKeys).join('+');
                hotkeyInput.value = hotkey;
                window.electronAPI.setStoreValue('hotkey', hotkey);
                document.removeEventListener('keydown', keyHandler);
                hideConfirmDialog();
                // Resume with the new hotkey
                window.electronAPI.resumeHotkey(hotkey);
            }
        };

        document.addEventListener('keydown', keyHandler);
    });

    // Make the hotkey input readonly
    hotkeyInput.readOnly = true;
}); 