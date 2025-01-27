import { showNotification, showConfirmDialog, hideConfirmDialog } from './utils/dialog-utils.js';

// Template management elements
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

let editor; // Declare editor variable to be initialized after i18next is ready

// Hide template form items by default
const hideForm = () => {
    templateSeparator.style.display = 'none';
    templateFormItems.forEach(item => item.style.display = 'none');
    saveTemplateBtn.parentElement.style.display = 'none';
    deleteTemplateBtn.style.display = 'none';
};

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

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for i18next to be initialized
    await i18next.init({
        lng: 'en_us',
        fallbackLng: 'en_us',
        resources: {
            en_us: {
                translation: await window.electronAPI.loadLocale('en_us')
            }
        }
    });

    // Initialize CodeMirror editor after i18next is ready
    editor = CodeMirror(document.getElementById('template-editor'), {
        mode: 'markdown',
        theme: 'default',
        lineNumbers: false,
        lineWrapping: true,
        placeholder: i18next.t('settings.templates.content.placeholder'),
        value: '',
        viewportMargin: Infinity,
        extraKeys: {"Enter": "newlineAndIndentContinueMarkdownList"}
    });

    // Initial setup
    hideForm();
    await loadTemplates();

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

    // Save button click handler
    saveTemplateBtn.addEventListener('click', saveTemplate);

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

        showConfirmDialog(
            i18next.t('settings.behavior.hotkey.dialog.title'),
            i18next.t('settings.behavior.hotkey.dialog.message'),
            true,
            false
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
