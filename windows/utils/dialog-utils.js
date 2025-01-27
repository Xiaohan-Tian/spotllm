// Create notification element
const notification = document.createElement('div');
notification.className = 'notification';
document.body.appendChild(notification);

// Show notification
export const showNotification = (message, type) => {
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    // Hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
};

// Hide confirmation dialog
export const hideConfirmDialog = () => {
    const modalOverlay = document.querySelector('.modal-overlay');
    modalOverlay.classList.remove('show');
};

// Show confirmation dialog
export const showConfirmDialog = (title, message, showCancel = true, showConfirm = true) => {
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