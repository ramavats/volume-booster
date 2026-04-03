document.addEventListener('DOMContentLoaded', async () => {
    const slider = document.getElementById('volumeSlider');
    const valueDisplay = document.getElementById('volumeValue');
    const resetBtn = document.getElementById('resetBtn');

    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Load saved volume level
    chrome.storage.local.get([`tab_${tab.id}`], (result) => {
        const savedVolume = result[`tab_${tab.id}`] || 100;
        slider.value = savedVolume;
        updateDisplay(savedVolume);
    });

    // Handle slider changes
    slider.addEventListener('input', (e) => {
        const val = e.target.value;
        updateDisplay(val);
        setVolume(tab.id, val);
    });

    // Handle reset button
    resetBtn.addEventListener('click', () => {
        slider.value = 100;
        updateDisplay(100);
        setVolume(tab.id, 100);
    });

    function updateDisplay(val) {
        valueDisplay.textContent = val;
        
        // Update styling based on intensity
        if (val > 300) {
            valueDisplay.style.color = '#ef4444'; // Red
            valueDisplay.style.textShadow = '0 0 20px rgba(239, 68, 68, 0.5)';
        } else if (val > 150) {
            valueDisplay.style.color = '#f59e0b'; // Yellow/Orange
            valueDisplay.style.textShadow = '0 0 20px rgba(245, 158, 11, 0.5)';
        } else {
            valueDisplay.style.color = '#3b82f6'; // Blue
            valueDisplay.style.textShadow = '0 0 20px rgba(59, 130, 246, 0.5)';
        }
    }

    async function setVolume(tabId, value) {
        // Save state
        chrome.storage.local.set({ [`tab_${tabId}`]: value });

        // Execute script in the active tab to boost volume
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: applyVolumeBoost,
            args: [value]
        });
    }
});

// This function will be executed in the context of the webpage
function applyVolumeBoost(multiplierPercentage) {
    const multiplier = multiplierPercentage / 100;

    // Attach to all audio and video elements
    const mediaElements = document.querySelectorAll('video, audio');
    
    if (mediaElements.length === 0) {
        console.log('Volume Booster: No audio/video elements found on this page.');
        return;
    }

    if (!window.volumeBoosterContexts) {
        window.volumeBoosterContexts = new WeakMap();
    }

    mediaElements.forEach(media => {
        let setup = window.volumeBoosterContexts.get(media);

        if (!setup) {
            // First time setup for this element
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioCtx.createMediaElementSource(media);
            const gainNode = audioCtx.createGain();
            
            source.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            setup = { audioCtx, gainNode };
            window.volumeBoosterContexts.set(media, setup);
        }

        // Apply the gain
        setup.gainNode.gain.value = multiplier;
    });
}
