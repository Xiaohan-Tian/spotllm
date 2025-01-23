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

    console.log('Hello World from settings page');
    
    const modelSelect = document.querySelector('select.setting-input');
    const apiKeyInput = document.querySelector('input.setting-input');
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
}); 