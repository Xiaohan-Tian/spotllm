/**
 * Creates a wave animation effect for text elements
 * @param {HTMLElement} element - The element containing the text to animate
 * @param {Object} options - Animation options
 * @param {number} [options.pulseDuration=0.8] - Duration of each pulse in seconds
 * @param {number} [options.charDelay=0.08] - Delay between characters in seconds
 * @returns {Function} - Cleanup function to stop the animation
 */
function createTextWave(element, options = {}) {
    const {
        pulseDuration = 0.8,
        charDelay = 0.08
    } = options;

    // Save original text content
    const text = element.textContent;
    
    // Calculate total duration for one wave
    const totalDuration = pulseDuration + (charDelay * (text.length - 1));
    let waveCount = 0;
    let intervalId = null;
    
    // Clear existing content
    element.innerHTML = '';
    
    // Create span for each character
    text.split('').forEach((char, index) => {
        const span = document.createElement('span');
        span.textContent = char;
        span.className = 'animated-text animating';
        span.style.setProperty('--pulse-duration', `${pulseDuration}s`);
        span.style.setProperty('--char-index', index);
        span.style.setProperty('--total-duration', `${totalDuration}s`);
        span.style.setProperty('--wave-count', waveCount);
        element.appendChild(span);
    });

    // Start wave animation
    intervalId = setInterval(() => {
        waveCount++;
        element.querySelectorAll('.animated-text').forEach(span => {
            span.style.setProperty('--wave-count', waveCount);
        });
    }, totalDuration * 1000);

    // Return cleanup function
    return () => {
        if (intervalId) {
            clearInterval(intervalId);
            element.textContent = text; // Restore original text
        }
    };
}

// Export for use in other files
window.createTextWave = createTextWave; 