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
        element.textContent = i18next.t(key);
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

    // Template management
    const templateSection = document.querySelector('#templates');
    const templateSelect = document.querySelector('.template-select');
    const addTemplateBtn = document.querySelector('.add-template-btn');
    const saveTemplateBtn = document.querySelector('.save-template-btn');
    const deleteTemplateBtn = document.querySelector('.delete-template-btn');
    const templateSeparator = document.querySelector('.template-separator');
    const templateFormItems = Array.from(templateSection.querySelectorAll('.setting-item')).slice(1); // All items except the first one
    const shortcutInput = document.querySelector('.template-shortcut-input');
    const nameInput = document.querySelector('.template-name-input');
    const templateHotkeyInput = document.querySelector('.template-hotkey-input');
    const templateHotkeyDelete = document.querySelector('.template-hotkey-delete');
    const keyInput = document.querySelector('.template-key-input');

    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    document.body.appendChild(notification);

    // Show notification
    const showNotification = (message, type) => {
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.add('show');
        
        // Hide after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    };

    // Confirmation dialog utility
    const hideConfirmDialog = () => {
        const modalOverlay = document.querySelector('.modal-overlay');
        modalOverlay.classList.remove('show');
    };

    const showConfirmDialog = (title, message, showCancel = true, showConfirm = true) => {
        return new Promise((resolve) => {
            const modalOverlay = document.querySelector('.modal-overlay');
            const modalTitle = modalOverlay.querySelector('.modal-title');
            const modalContent = modalOverlay.querySelector('.modal-content');
            const confirmBtn = modalOverlay.querySelector('.modal-btn.confirm');
            const cancelBtn = modalOverlay.querySelector('.modal-btn.cancel');

            // Set content
            modalTitle.textContent = title;
            modalContent.textContent = message;

            // Show/hide buttons
            confirmBtn.style.display = showConfirm ? 'block' : 'none';
            cancelBtn.style.display = showCancel ? 'block' : 'none';

            // Show modal
            modalOverlay.classList.add('show');

            // Close modal helper
            const closeModal = () => {
                hideConfirmDialog();
                // Remove event listeners
                modalOverlay.removeEventListener('click', handleOverlayClick);
                confirmBtn.removeEventListener('click', handleConfirm);
                cancelBtn.removeEventListener('click', handleCancel);
            };

            // Event handlers
            const handleOverlayClick = (e) => {
                if (e.target === modalOverlay) {
                    closeModal();
                    resolve(false);
                }
            };

            const handleConfirm = () => {
                closeModal();
                resolve(true);
            };

            const handleCancel = () => {
                closeModal();
                resolve(false);
            };

            // Add event listeners
            modalOverlay.addEventListener('click', handleOverlayClick);
            if (showConfirm) {
                confirmBtn.addEventListener('click', handleConfirm);
            }
            if (showCancel) {
                cancelBtn.addEventListener('click', handleCancel);
            }
        });
    };

    // Hide template form items by default
    const hideForm = () => {
        templateSeparator.style.display = 'none';
        templateFormItems.forEach(item => item.style.display = 'none');
        saveTemplateBtn.parentElement.style.display = 'none';
        deleteTemplateBtn.style.display = 'none';
    };
    hideForm();

    // Initialize CodeMirror editor
    const editor = CodeMirror(document.getElementById('template-editor'), {
        mode: 'markdown',
        theme: 'default',
        lineNumbers: false,
        lineWrapping: true,
        placeholder: i18next.t('settings.templates.content.placeholder'),
        value: '',
        viewportMargin: Infinity,
        extraKeys: {"Enter": "newlineAndIndentContinueMarkdownList"}
    });

    // Load templates into dropdown
    const loadTemplates = async () => {
        const templates = await window.electronAPI.getStoreValue('templates') || [];
        templateSelect.innerHTML = `<option value="" disabled selected>${i18next.t('settings.templates.edit.placeholder')}</option>`;
        templates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.shortcut;
            option.textContent = `${template.shortcut} - ${template.name}`;
            templateSelect.appendChild(option);
        });
    };
    await loadTemplates();

    // Clear form
    const clearForm = () => {
        shortcutInput.value = '';
        nameInput.value = '';
        keyInput.value = '';
        templateHotkeyInput.value = '';
        editor.setValue('');
    };

    // Show form with optional template data
    const showForm = (template = null) => {
        templateSeparator.style.display = 'block';
        templateFormItems.forEach(item => item.style.display = 'block');
        saveTemplateBtn.parentElement.style.display = 'flex';
        
        // Show/hide delete button based on whether we're editing an existing template
        deleteTemplateBtn.style.display = template ? 'block' : 'none';
        
        if (template) {
            shortcutInput.value = template.shortcut;
            nameInput.value = template.name;
            keyInput.value = template.key || '';
            templateHotkeyInput.value = template.hotkey || '';
            editor.setValue(template.template);
        } else {
            clearForm();
        }
    };

    // Add template button click
    addTemplateBtn.addEventListener('click', () => {
        templateSelect.value = '';
        showForm();
    });

    // Template select change
    templateSelect.addEventListener('change', async () => {
        const templates = await window.electronAPI.getStoreValue('templates') || [];
        const template = templates.find(t => t.shortcut === templateSelect.value);
        if (template) {
            showForm(template);
        } else {
            hideForm();
        }
    });

    // Save template
    const saveTemplate = async () => {
        const templates = await window.electronAPI.getStoreValue('templates') || [];
        const currentShortcut = templateSelect.value;
        const newTemplate = {
            shortcut: shortcutInput.value,
            name: nameInput.value,
            key: keyInput.value,
            hotkey: templateHotkeyInput.value,
            template: editor.getValue()
        };
        
        // Validate required fields
        if (!newTemplate.shortcut || !newTemplate.name || !newTemplate.template) {
            showNotification(i18next.t('settings.templates.notifications.missingFields'), 'error');
            return;
        }
        
        // Check for duplicate shortcuts (except when editing existing template)
        if (!currentShortcut && templates.some(t => t.shortcut === newTemplate.shortcut)) {
            showNotification(i18next.t('settings.templates.notifications.duplicateShortcut'), 'error');
            return;
        }
        
        let updatedTemplates;
        if (currentShortcut) {
            // Update existing template
            updatedTemplates = templates.map(t => 
                t.shortcut === currentShortcut ? newTemplate : t
            );
        } else {
            // Add new template
            updatedTemplates = [...templates, newTemplate];
        }
        
        await window.electronAPI.setStoreValue('templates', updatedTemplates);
        await loadTemplates();
        hideForm();
        showNotification(i18next.t('settings.templates.notifications.saved'), 'success');
    };

    // Save button click handler
    saveTemplateBtn.addEventListener('click', saveTemplate);

    // Delete template
    const deleteTemplate = async () => {
        const templates = await window.electronAPI.getStoreValue('templates') || [];
        const currentShortcut = templateSelect.value;
        
        if (currentShortcut) {
            const updatedTemplates = templates.filter(t => t.shortcut !== currentShortcut);
            await window.electronAPI.setStoreValue('templates', updatedTemplates);
            await loadTemplates();
            hideForm();
            showNotification(i18next.t('settings.templates.notifications.deleted'), 'error');
        }
    };

    // Show confirmation dialog when delete button is clicked
    deleteTemplateBtn.addEventListener('click', async () => {
        const confirmed = await showConfirmDialog(
            i18next.t('settings.templates.confirmDelete.title'),
            i18next.t('settings.templates.confirmDelete.message')
        );
        
        if (confirmed) {
            await deleteTemplate();
        }
    });

    // Template hotkey input handling
    templateHotkeyInput.addEventListener('click', async () => {
        let pressedKeys = new Set();
        let keyHandler;

        showConfirmDialog(  // show the dialog and move on, don't wait for user to confirm
            i18next.t('settings.behavior.hotkey.dialog.title'),
            i18next.t('settings.behavior.hotkey.dialog.message'),
            true,  // show cancel
            false  // hide confirm
        );

        // Start listening for key combinations
        keyHandler = (e) => {
            e.preventDefault();

            if (e.key === 'Escape') {
                document.removeEventListener('keydown', keyHandler);
                hideConfirmDialog();
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
                templateHotkeyInput.value = hotkey;
                document.removeEventListener('keydown', keyHandler);
                hideConfirmDialog();
            }
        };

        document.addEventListener('keydown', keyHandler);
    });

    // Make the template hotkey input readonly
    templateHotkeyInput.readOnly = true;

    // Clear template hotkey
    templateHotkeyDelete.addEventListener('click', () => {
        templateHotkeyInput.value = '';
    });
}); 