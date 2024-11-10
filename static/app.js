function setLoading(isLoading) {
    const generateBtn = document.getElementById('generate-btn');
    const normalState = generateBtn.querySelector('.normal-state');
    const loadingState = generateBtn.querySelector('.loading-state');
    
    if (!generateBtn || !normalState || !loadingState) return;
    
    generateBtn.disabled = isLoading;
    
    if (isLoading) {
        normalState.classList.add('hidden');
        loadingState.classList.remove('hidden');
    } else {
        normalState.classList.remove('hidden');
        loadingState.classList.add('hidden');
    }
}

function showError(message) {
    const errorMessage = document.getElementById('error-message');
    if (!errorMessage) return;
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

function hideError() {
    const errorMessage = document.getElementById('error-message');
    if (!errorMessage) return;
    errorMessage.classList.add('hidden');
}

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500'
    };

    const icons = {
        success: 'check_circle',
        error: 'error_outline',
        info: 'info'
    };

    toast.className = `toast ${colors[type]} text-white px-6 py-4 rounded-xl shadow-lg flex items-center space-x-3`;
    toast.innerHTML = `
        <span class="material-icons">${icons[type]}</span>
        <span class="flex-1">${message}</span>
    `;

    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Storage management utilities
const STORAGE_KEY_PREFIX = 'tts_audio_';
const MAX_ITEMS = 10; // Maximum number of audio items to keep

function getStorageUsage() {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(STORAGE_KEY_PREFIX)) {
            total += localStorage.getItem(key).length;
        }
    }
    return total;
}

function cleanupOldestAudio() {
    const audioItems = [];
    
    // Collect all audio items
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(STORAGE_KEY_PREFIX)) {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                audioItems.push({
                    key: key,
                    timestamp: data.timestamp
                });
            } catch (e) {
                localStorage.removeItem(key); // Remove invalid items
            }
        }
    }
    
    // Sort by timestamp (oldest first)
    audioItems.sort((a, b) => a.timestamp - b.timestamp);
    
    // Remove oldest items until we're under the limit
    while (audioItems.length > MAX_ITEMS) {
        const oldest = audioItems.shift();
        localStorage.removeItem(oldest.key);
    }
}

function saveToLocalStorage(key, value) {
    try {
        // Try to save directly first
        localStorage.setItem(key, value);
        return true;
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            try {
                // Clean up old items and try again
                cleanupOldestAudio();
                localStorage.setItem(key, value);
                return true;
            } catch (retryError) {
                console.error('Error saving to localStorage after cleanup:', retryError);
                showToast('Storage full. Please clear some items manually.', 'error');
                return false;
            }
        }
        console.error('Error saving to localStorage:', e);
        return false;
    }
}

// Add this function to clear previous audio
function clearPreviousAudio() {
    try {
        const audioPlayer = document.getElementById('audio-player');
        if (!audioPlayer) {
            console.warn('Audio player element not found');
            return false;
        }

        // Get current audio key from player
        const currentKey = audioPlayer.dataset.currentKey;
        
        // Clear from localStorage if key exists
        if (currentKey) {
            localStorage.removeItem(currentKey);
        }
        
        // Clear audio player
        audioPlayer.pause();
        audioPlayer.src = '';
        audioPlayer.load();
        delete audioPlayer.dataset.currentKey;
        
        return true;
    } catch (error) {
        console.error('Error clearing previous audio:', error);
        return false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Theme toggle functionality
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeToggleIcon = themeToggleBtn.querySelector('.material-icons');
    
    // Check initial theme
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        themeToggleIcon.textContent = 'light_mode';
    } else {
        document.documentElement.classList.remove('dark');
        themeToggleIcon.textContent = 'dark_mode';
    }

    // Theme toggle button click handler
    themeToggleBtn.addEventListener('click', () => {
        if (document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.remove('dark');
            localStorage.theme = 'light';
            themeToggleIcon.textContent = 'dark_mode';
        } else {
            document.documentElement.classList.add('dark');
            localStorage.theme = 'dark';
            themeToggleIcon.textContent = 'light_mode';
        }
    });

    // Get DOM elements
    const textInput = document.getElementById('text-input');
    const generateBtn = document.getElementById('generate-btn');
    const charCount = document.getElementById('char-count');
    const resultSection = document.getElementById('result-section');
    const voiceSelector = document.getElementById('voice-selector');
    const clearBtn = document.getElementById('clear-btn');
    const audioPlayer = document.getElementById('audio-player');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const progressContainer = document.querySelector('.progress-container');
    const progress = document.querySelector('.progress');
    const currentTimeEl = document.getElementById('currentTime');
    const durationEl = document.getElementById('duration');
    const volumeBtn = document.querySelector('.volume-btn');
    const volumeSlider = document.getElementById('volume-slider');
    const volumeValue = document.getElementById('volume-value');
    const speedBtn = document.getElementById('speedBtn');
    const loopBtn = document.getElementById('loopBtn');
    const downloadBtn = document.getElementById('download-btn');
    const copyBtn = document.getElementById('copy-btn');

    let currentSpeed = 1;
    let previousVolume = 1;
    let currentAudioUrl = null;

    // Text input character count
    if (textInput && charCount) {
        textInput.addEventListener('input', () => {
            const length = textInput.value.length;
            charCount.textContent = length;
            if (generateBtn) {
                generateBtn.disabled = length === 0;
            }
        });
    }

    // Generate speech
    if (generateBtn) {
        generateBtn.addEventListener('click', async () => {
            if (!textInput || !textInput.value.trim()) {
                showToast('Please enter some text', 'error');
                return;
            }

            setLoading(true);
            hideError();

            try {
                // Clear previous audio before generating new one
                clearPreviousAudio();

                const formData = new FormData();
                formData.append('text', textInput.value);
                formData.append('voice', currentVoice);

                const response = await fetch('/api/tts', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to generate speech');
                }

                // Generate new audio key
                const audioKey = `tts_audio_${Date.now()}`;
                const savedData = {
                    audio: data.audio_data,
                    text: data.text,
                    timestamp: Date.now(),
                    voice: currentVoice
                };

                try {
                    // Save new audio data
                    localStorage.setItem(audioKey, JSON.stringify(savedData));
                    
                    // Create blob URL from base64 data
                    const audioBlob = base64ToBlob(data.audio_data, 'audio/mp3');
                    const audioUrl = URL.createObjectURL(audioBlob);

                    // Update audio player
                    if (audioPlayer) {
                        audioPlayer.pause();
                        audioPlayer.currentTime = 0;
                        audioPlayer.src = audioUrl;
                        audioPlayer.load();
                        audioPlayer.dataset.currentKey = audioKey;

                        if (resultSection) {
                            resultSection.classList.remove('hidden');
                        }

                        // Update play button icon
                        const playPauseIcon = playPauseBtn?.querySelector('.material-icons');
                        if (playPauseIcon) {
                            playPauseIcon.textContent = 'play_arrow';
                        }
                    }

                    showToast('Audio generated successfully!', 'success');
                } catch (storageError) {
                    console.error('Storage error:', storageError);
                    throw new Error('Failed to save audio. Please try again.');
                }

            } catch (error) {
                showError(error.message);
                showToast(error.message, 'error');
            } finally {
                setLoading(false);
            }
        });
    }

    // // Add error handling for audio loading
    // if (audioPlayer) {
    //     audioPlayer.addEventListener('error', (e) => {
    //         console.error('Audio Error:', e);
    //         showToast('Error loading audio file', 'error');
    //     });
    // }

    // Audio player controls
    if (audioPlayer) {
        // Play/Pause
        if (playPauseBtn) {
            const playPauseIcon = playPauseBtn.querySelector('.material-icons');
            
            playPauseBtn.addEventListener('click', () => {
                if (audioPlayer.paused) {
                    audioPlayer.play()
                        .then(() => {
                            playPauseIcon.textContent = 'pause';
                        })
                        .catch(error => {
                            console.error('Error playing audio:', error);
                            showToast('Error playing audio', 'error');
                        });
                } else {
                    audioPlayer.pause();
                    playPauseIcon.textContent = 'play_arrow';
                }
            });

            // Update play/pause button state on audio events
            audioPlayer.addEventListener('play', () => {
                playPauseIcon.textContent = 'pause';
            });

            audioPlayer.addEventListener('pause', () => {
                playPauseIcon.textContent = 'play_arrow';
            });

            audioPlayer.addEventListener('ended', () => {
                playPauseIcon.textContent = 'play_arrow';
            });
        }

        // Progress bar updates
        if (progress && currentTimeEl) {
            audioPlayer.addEventListener('timeupdate', () => {
                const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
                progress.style.width = `${percent}%`;
                currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
            });
        }

        // Click to seek
        if (progressContainer) {
            progressContainer.addEventListener('click', (e) => {
                const rect = progressContainer.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                const time = percent * audioPlayer.duration;
                audioPlayer.currentTime = time;
            });
        }

        // Duration
        audioPlayer.addEventListener('loadedmetadata', () => {
            if (durationEl) {
                durationEl.textContent = formatTime(audioPlayer.duration);
                currentTimeEl.textContent = formatTime(0);
            }
        });

        // Volume control
        if (volumeBtn && volumeSlider && volumeValue) {
            const volumeIcon = volumeBtn.querySelector('.material-icons');
            
            // Initialize volume
            audioPlayer.volume = 1; // Set initial volume to 100%
            volumeValue.textContent = '100';
            volumeSlider.value = 100;
            previousVolume = 1;

            volumeBtn.addEventListener('click', () => {
                if (audioPlayer.muted || audioPlayer.volume === 0) {
                    audioPlayer.muted = false;
                    audioPlayer.volume = previousVolume;
                    volumeSlider.value = previousVolume * 100;
                    volumeValue.textContent = Math.round(previousVolume * 100);
                } else {
                    previousVolume = audioPlayer.volume;
                    audioPlayer.muted = true;
                    audioPlayer.volume = 0;
                    volumeSlider.value = 0;
                    volumeValue.textContent = '0';
                }
                updateVolumeIcon();
            });

            // Update volume on slider change
            volumeSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                const volume = value / 100;
                
                audioPlayer.volume = volume;
                audioPlayer.muted = volume === 0;
                volumeValue.textContent = value;
                previousVolume = volume === 0 ? previousVolume : volume;
                
                updateVolumeIcon();
                updateVolumeSliderBackground(value);
            });

            function updateVolumeIcon() {
                if (audioPlayer.muted || audioPlayer.volume === 0) {
                    volumeIcon.textContent = 'volume_off';
                } else if (audioPlayer.volume < 0.5) {
                    volumeIcon.textContent = 'volume_down';
                } else {
                    volumeIcon.textContent = 'volume_up';
                }
            }

            function updateVolumeSliderBackground(value) {
                volumeSlider.style.background = `linear-gradient(to right, #6366f1 0%, #6366f1 ${value}%, #e0e7ff ${value}%)`;
            }

            // Initialize volume display
            volumeValue.textContent = Math.round(audioPlayer.volume * 100);
            volumeSlider.value = audioPlayer.volume * 100;
            updateVolumeIcon();
            updateVolumeSliderBackground(volumeSlider.value);
        }

        // Speed control
        if (speedBtn) {
            speedBtn.addEventListener('click', () => {
                const speeds = [0.5, 1, 1.5, 2];
                const currentIndex = speeds.indexOf(currentSpeed);
                currentSpeed = speeds[(currentIndex + 1) % speeds.length];
                audioPlayer.playbackRate = currentSpeed;
                speedBtn.textContent = `${currentSpeed}x`;
            });
        }

        // Loop control
        if (loopBtn) {
            // Remove existing event listeners
            loopBtn.replaceWith(loopBtn.cloneNode(true));
            const newLoopBtn = document.getElementById('loopBtn');
            
            newLoopBtn.addEventListener('click', () => {
                audioPlayer.loop = !audioPlayer.loop;
                if (audioPlayer.loop) {
                    newLoopBtn.classList.add('active-control');
                    newLoopBtn.style.backgroundColor = '#6366f1';
                    newLoopBtn.style.color = 'white';
                    // Add a visual indicator for active state
                    const icon = newLoopBtn.querySelector('.material-icons');
                    if (icon) {
                        icon.style.color = 'white';
                        icon.classList.add('text-white');
                    }
                    showToast('Repeat enabled', 'info');
                } else {
                    newLoopBtn.classList.remove('active-control');
                    newLoopBtn.style.backgroundColor = 'transparent';
                    newLoopBtn.style.color = '#9ca3af';
                    // Reset the icon color
                    const icon = newLoopBtn.querySelector('.material-icons');
                    if (icon) {
                        icon.style.color = '#9ca3af';
                        icon.classList.remove('text-white');
                    }
                    showToast('Repeat disabled', 'info');
                }
            });

            // Initialize loop state
            if (audioPlayer.loop) {
                newLoopBtn.classList.add('active-control');
                newLoopBtn.style.backgroundColor = '#6366f1';
                newLoopBtn.style.color = 'white';
                const icon = newLoopBtn.querySelector('.material-icons');
                if (icon) {
                    icon.style.color = 'white';
                    icon.classList.add('text-white');
                }
            }
        }
    }

    // Clear button
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            try {
                console.log('Clear button clicked');
                // Clear all audio files from storage
                if (clearAllAudioFiles()) {
                    // Reset audio player
                    if (audioPlayer) {
                        audioPlayer.pause();
                        audioPlayer.src = '';
                        audioPlayer.load();
                        delete audioPlayer.dataset.currentKey;
                    }

                    // Reset UI elements
                    const progress = document.querySelector('.progress');
                    const currentTimeEl = document.getElementById('currentTime');
                    const durationEl = document.getElementById('duration');
                    
                    if (progress) progress.style.width = '0%';
                    if (currentTimeEl) currentTimeEl.textContent = '0:00';
                    if (durationEl) durationEl.textContent = '0:00';

                    // Hide result section
                    if (resultSection) {
                        resultSection.classList.add('hidden');
                    }

                    // Clear text input
                    if (textInput) {
                        textInput.value = '';
                    }

                    // Reset play button icon
                    if (playPauseBtn) {
                        const playPauseIcon = playPauseBtn.querySelector('.material-icons');
                        if (playPauseIcon) {
                            playPauseIcon.textContent = 'play_arrow';
                        }
                    }

                    showToast('All audio files cleared successfully', 'success');
                } else {
                    showToast('Error clearing audio files', 'error');
                }
            } catch (error) {
                console.error('Error in clear operation:', error);
                showToast('Error clearing audio files', 'error');
            }
        });
    }

    // Copy button
    if (copyBtn && textInput) {
        copyBtn.addEventListener('click', async () => {
            try {
                // Try modern clipboard API first
                if (navigator.clipboard && window.isSecureContext) {
                    await navigator.clipboard.writeText(textInput.value);
                } else {
                    // Fallback for Android/older browsers
                    const textArea = document.createElement('textarea');
                    textArea.value = textInput.value;
                    textArea.style.position = 'fixed';
                    textArea.style.left = '-999999px';
                    textArea.style.top = '-999999px';
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    document.execCommand('copy');
                    textArea.remove();
                }
                showToast('Text copied to clipboard!', 'success');
            } catch (err) {
                showToast('Failed to copy text', 'error');
            }
        });
    }

    // Get DOM elements
    const voiceSelectorBtn = document.getElementById('voice-selector-btn');
    const voiceDropdown = document.getElementById('voice-dropdown');
    const voiceCloseBtn = document.getElementById('voice-close-btn');
    const voiceOptions = document.querySelectorAll('.voice-option');
    const mainContent = document.getElementById('main-content');
    let currentVoice = 'bn-BD-NabanitaNeural';

    // Only proceed if elements exist
    if (!voiceSelectorBtn || !voiceDropdown) return;

    function showVoiceDropdown() {
        const dropdown = document.getElementById('voice-dropdown');
        const mainContent = document.getElementById('main-content');
        const backdrop = document.getElementById('dropdown-backdrop');
        const dialog = dropdown.querySelector('.relative');
        
        // Show dropdown
        dropdown.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        // Add blur to main content
        if (mainContent) {
            mainContent.classList.add('blur-background');
        }
        
        // Force a reflow
        void dropdown.offsetHeight;
        
        // Animate in
        if (backdrop) backdrop.style.opacity = '1';
        if (dialog) {
            dialog.style.opacity = '1';
            dialog.style.transform = 'scale(1)';
        }
    }

    function closeVoiceDropdown() {
        const dropdown = document.getElementById('voice-dropdown');
        const mainContent = document.getElementById('main-content');
        const backdrop = document.getElementById('dropdown-backdrop');
        const dialog = dropdown.querySelector('.relative');
        
        // Remove blur
        if (mainContent) {
            mainContent.classList.remove('blur-background');
        }
        
        // Animate out
        if (backdrop) backdrop.style.opacity = '0';
        if (dialog) {
            dialog.style.opacity = '0';
            dialog.style.transform = 'scale(0.95)';
        }
        
        // Hide after animation
        setTimeout(() => {
            dropdown.classList.add('hidden');
            document.body.style.overflow = '';
        }, 300);
    }

    // Voice selector button click
    voiceSelectorBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showVoiceDropdown();
    });

    // Close button click
    if (voiceCloseBtn) {
        voiceCloseBtn.addEventListener('click', () => {
            closeVoiceDropdown();
        });
    }

    // Handle voice selection
    voiceOptions.forEach(option => {
        option.addEventListener('click', () => {
            const voice = option.getAttribute('data-voice');
            currentVoice = voice;
            
            // Update selection UI
            voiceOptions.forEach(btn => {
                const check = btn.querySelector('.voice-check');
                if (btn === option) {
                    check.classList.remove('hidden');
                    btn.classList.add('bg-indigo-50', 'dark:bg-indigo-900/20');
                } else {
                    check.classList.add('hidden');
                    btn.classList.remove('bg-indigo-50', 'dark:bg-indigo-900/20');
                }
            });
            
            // Show toast and close dropdown
            showToast(`Voice changed to ${option.querySelector('.font-medium').textContent}`, 'success');
            closeVoiceDropdown();
        });
    });

    // Close on backdrop click
    document.getElementById('dropdown-backdrop').addEventListener('click', closeVoiceDropdown);

    // Utility function to convert base64 to Blob
    function base64ToBlob(base64, mimeType) {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    }

    // Clean up old audio data (optional)
    function cleanupOldAudioData() {
        const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
        const now = Date.now();

        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('tts_audio_')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (now - data.timestamp > MAX_AGE) {
                        localStorage.removeItem(key);
                    }
                } catch (e) {
                    console.error('Error cleaning up audio data:', e);
                }
            }
        });
    }

    // Update audio error handling
    if (audioPlayer) {
        let hasShownError = false;  // Flag to prevent duplicate error messages
        
        audioPlayer.addEventListener('error', (e) => {
            console.error('Audio Error:', e);
            
            // Only show error if:
            // 1. We haven't shown an error yet
            // 2. There's actually an audio source
            // 3. The source isn't the default page URL
            if (!hasShownError && 
                audioPlayer.src && 
                audioPlayer.src !== window.location.href) {
                    
                hasShownError = true;
                showToast('Error loading audio file', 'error');
                
                // Reset error flag after a delay
                setTimeout(() => {
                    hasShownError = false;
                }, 3000);
            }
        });

        // Reset error flag when new audio is loaded
        audioPlayer.addEventListener('loadeddata', () => {
            hasShownError = false;
        });
    }

    // Add a function to show storage usage
    function updateStorageInfo() {
        const usedSpace = getStorageUsage();
        const usedMB = (usedSpace / (1024 * 1024)).toFixed(2);
        showToast(`Storage used: ${usedMB}MB`, 'info');
    }

    // Optional: Add a button to show storage usage
    const storageInfoBtn = document.getElementById('storage-info-btn');
    if (storageInfoBtn) {
        storageInfoBtn.addEventListener('click', updateStorageInfo);
    }

    // For the favicon 404 error, add this to your static folder
    const link = document.querySelector("link[rel~='icon']");
    if (!link) {
        const newLink = document.createElement('link');
        newLink.rel = 'icon';
        newLink.href = 'data:,'; // Empty favicon
        document.head.appendChild(newLink);
    }

    // Add this with your other utility functions at the top of the file
    function getFromLocalStorage(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? item : null;
        } catch (e) {
            console.error('Error reading from localStorage:', e);
            return null;
        }
    }

    // Update the audio player initialization
    if (audioPlayer) {
        let hasShownError = false;
        
        audioPlayer.addEventListener('error', (e) => {
            // Only show error if there's actually an audio source
            if (!hasShownError && audioPlayer.src && audioPlayer.src !== window.location.href) {
                console.error('Audio Error:', e);
                hasShownError = true;
                showToast('Error loading audio file', 'error');
                
                // Reset error flag after a delay
                setTimeout(() => {
                    hasShownError = false;
                }, 3000);
            }
        });

        // Reset error flag when new audio is loaded successfully
        audioPlayer.addEventListener('loadeddata', () => {
            hasShownError = false;
        });
    }

    // Update download button handler
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            try {
                const currentKey = audioPlayer?.dataset?.currentKey;
                if (!currentKey) {
                    showToast('No audio available to download', 'error');
                    return;
                }

                const savedDataString = getFromLocalStorage(currentKey);
                if (!savedDataString) {
                    showToast('Audio data not found', 'error');
                    return;
                }

                const savedData = JSON.parse(savedDataString);
                if (!savedData || !savedData.audio) {
                    showToast('Invalid audio data', 'error');
                    return;
                }

                // Create and trigger download
                const blob = base64ToBlob(savedData.audio, 'audio/mp3');
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `tts_audio_${Date.now()}.mp3`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                showToast('Download started!', 'success');
            } catch (error) {
                console.error('Error handling download:', error);
                showToast('Error downloading audio', 'error');
            }
        });
    }

    // Move clearAllAudioFiles outside of any event listener or DOMContentLoaded
    function clearAllAudioFiles() {
        try {
            // Get all keys from localStorage
            const keys = Object.keys(localStorage);
            
            // Filter for audio keys (they should start with STORAGE_KEY_PREFIX)
            const audioKeys = keys.filter(key => key.startsWith(STORAGE_KEY_PREFIX));
            
            if (audioKeys.length === 0) {
                console.log('No audio files found to clear');
                return true;
            }
            
            // Remove all audio entries
            audioKeys.forEach(key => {
                console.log('Removing key:', key);
                localStorage.removeItem(key);
            });
            
            console.log('Cleared', audioKeys.length, 'audio files');
            return true;
        } catch (error) {
            console.error('Error clearing audio files:', error);
            return false;
        }
    }
}); 