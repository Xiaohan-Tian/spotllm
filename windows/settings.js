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
    const hideOnClickOutsideSelect = document.querySelector('#behavior select.setting-input');
    hideOnClickOutsideSelect.value = await window.electronAPI.getStoreValue('hideOnClickOutside') || 'yes';
    
    hideOnClickOutsideSelect.addEventListener('change', async (e) => {
        await window.electronAPI.setStoreValue('hideOnClickOutside', e.target.value);
        console.log('Hide on click outside setting saved:', e.target.value);
    });

    // Template management
    const templateSection = document.querySelector('#templates');
    const templateControls = templateSection.querySelector('.template-controls').parentElement;
    const templateFormItems = Array.from(templateSection.querySelectorAll('.setting-item')).slice(1); // All items except the first one
    const templateSelect = templateSection.querySelector('.template-controls select');
    const addTemplateBtn = templateSection.querySelector('.add-template-btn');
    const saveTemplateBtn = templateSection.querySelector('.save-template-btn');
    const deleteTemplateBtn = templateSection.querySelector('.delete-template-btn');
    const shortcutInput = templateSection.querySelector('input[data-i18n-placeholder="settings.templates.shortcut.placeholder"]');
    const nameInput = templateSection.querySelector('input[data-i18n-placeholder="settings.templates.name.placeholder"]');
    const keyInput = templateSection.querySelector('input[data-i18n-placeholder="settings.templates.responseKey.placeholder"]');

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
    const showConfirmDialog = (title, message) => {
        return new Promise((resolve) => {
            const modalOverlay = document.querySelector('.modal-overlay');
            const modalTitle = modalOverlay.querySelector('.modal-title');
            const modalContent = modalOverlay.querySelector('.modal-content');
            const confirmBtn = modalOverlay.querySelector('.modal-btn.confirm');
            const cancelBtn = modalOverlay.querySelector('.modal-btn.cancel');

            // Set content
            modalTitle.textContent = title;
            modalContent.textContent = message;

            // Show modal
            modalOverlay.classList.add('show');

            // Close modal helper
            const closeModal = () => {
                modalOverlay.classList.remove('show');
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
            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);
        });
    };

    // Hide template form items by default
    const hideForm = () => {
        templateSection.querySelector('.separator').style.display = 'none';
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
        editor.setValue('');
    };

    // Show form with optional template data
    const showForm = (template = null) => {
        templateSection.querySelector('.separator').style.display = 'block';
        templateFormItems.forEach(item => item.style.display = 'block');
        saveTemplateBtn.parentElement.style.display = 'flex';
        
        // Show/hide delete button based on whether we're editing an existing template
        deleteTemplateBtn.style.display = template ? 'block' : 'none';
        
        if (template) {
            shortcutInput.value = template.shortcut;
            nameInput.value = template.name;
            keyInput.value = template.key || '';
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
    saveTemplateBtn.addEventListener('click', async () => {
        const shortcut = shortcutInput.value.trim();
        const name = nameInput.value.trim();
        const key = keyInput.value.trim();
        const template = editor.getValue().trim();

        // Validate required fields
        if (!shortcut) {
            showNotification(i18next.t('settings.templates.notifications.emptyShortcut'), 'error');
            return;
        }
        if (!name) {
            showNotification(i18next.t('settings.templates.notifications.emptyName'), 'error');
            return;
        }

        const templates = await window.electronAPI.getStoreValue('templates') || [];
        const existingIndex = templates.findIndex(t => t.shortcut === shortcut);
        const currentTemplateIndex = templateSelect.value ? templates.findIndex(t => t.shortcut === templateSelect.value) : -1;

        // Check for duplicate shortcut only if it's a new template or different from the current one
        if (existingIndex >= 0 && existingIndex !== currentTemplateIndex) {
            showNotification(i18next.t('settings.templates.notifications.duplicateShortcut'), 'error');
            return;
        }

        const newTemplate = { shortcut, name, key, template };

        if (currentTemplateIndex >= 0) {
            // Update existing template
            templates[currentTemplateIndex] = newTemplate;
        } else {
            // Add new template
            templates.push(newTemplate);
        }

        // Hide form and reset dropdown for both new and existing templates
        hideForm();
        
        await window.electronAPI.setStoreValue('templates', templates);
        await loadTemplates();
        
        // Always reset dropdown to placeholder
        templateSelect.value = '';
        
        showNotification(i18next.t('settings.templates.notifications.saved'), 'success');
    });

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
}); 