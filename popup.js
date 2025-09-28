// xAI Chrome Extension - Popup Script
class PopupController {
    constructor() {
        this.settings = {
            animationsEnabled: true,
            particleCount: 50,
            userName: '',
            customBookmarks: []
        };
        this.init();
    }

    async init() {
        await this.loadSettings();
        this.setupEventListeners();
        this.updateUI();
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['xaiSettings']);
            if (result.xaiSettings) {
                this.settings = { ...this.settings, ...result.xaiSettings };
            }
        } catch (error) {
            console.log('Using default settings');
        }
    }

    async saveSettings() {
        try {
            await chrome.storage.sync.set({ xaiSettings: this.settings });
            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            return false;
        }
    }

    setupEventListeners() {
        // User name input
        const userNameInput = document.getElementById('userName');
        userNameInput.addEventListener('input', (e) => {
            this.settings.userName = e.target.value;
        });

        // Animations toggle
        const animationsToggle = document.getElementById('animationsEnabled');
        animationsToggle.addEventListener('change', (e) => {
            this.settings.animationsEnabled = e.target.checked;
        });

        // Particle count slider
        const particleSlider = document.getElementById('particleCount');
        const particleValue = document.getElementById('particleValue');
        
        particleSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.settings.particleCount = value;
            particleValue.textContent = value;
        });

        // Save button
        document.getElementById('saveBtn').addEventListener('click', () => {
            this.handleSave();
        });

        // Reset button
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.handleReset();
        });

        // Quick action buttons
        document.getElementById('openNewTabBtn').addEventListener('click', () => {
            this.openNewTab();
        });

        document.getElementById('refreshExtensionBtn').addEventListener('click', () => {
            this.refreshExtension();
        });
    }

    updateUI() {
        // Update form fields with current settings
        document.getElementById('userName').value = this.settings.userName;
        document.getElementById('animationsEnabled').checked = this.settings.animationsEnabled;
        document.getElementById('particleCount').value = this.settings.particleCount;
        document.getElementById('particleValue').textContent = this.settings.particleCount;
    }

    async handleSave() {
        const saveBtn = document.getElementById('saveBtn');
        const statusMessage = document.getElementById('statusMessage');
        
        // Update button state
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;

        try {
            const success = await this.saveSettings();
            
            if (success) {
                this.showStatus('Settings saved successfully!', 'success');
                
                // Notify all new tab pages to reload settings
                this.notifyNewTabPages();
                
                // Auto-close popup after 1.5 seconds
                setTimeout(() => {
                    window.close();
                }, 1500);
            } else {
                this.showStatus('Failed to save settings. Please try again.', 'error');
            }
        } catch (error) {
            this.showStatus('An error occurred while saving.', 'error');
        }

        // Reset button state
        saveBtn.textContent = 'Save Settings';
        saveBtn.disabled = false;
    }

    handleReset() {
        const defaultSettings = {
            animationsEnabled: true,
            particleCount: 50,
            userName: '',
            customBookmarks: []
        };

        this.settings = { ...defaultSettings };
        this.updateUI();
        this.showStatus('Settings reset to defaults', 'success');
    }

    async openNewTab() {
        try {
            await chrome.tabs.create({ 
                url: chrome.runtime.getURL('newtab.html') 
            });
            window.close();
        } catch (error) {
            // Fallback for environments where chrome.tabs is not available
            window.open('newtab.html', '_blank');
        }
    }

    async refreshExtension() {
        try {
            // Reload the extension
            chrome.runtime.reload();
        } catch (error) {
            this.showStatus('Unable to refresh extension', 'error');
        }
    }

    async notifyNewTabPages() {
        try {
            const tabs = await chrome.tabs.query({ 
                url: chrome.runtime.getURL('newtab.html') 
            });
            
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, { 
                    action: 'settingsUpdated',
                    settings: this.settings 
                }, () => {
                    // Ignore errors if tab is not ready
                    if (chrome.runtime.lastError) {
                        console.log('Tab not ready for message');
                    }
                });
            });
        } catch (error) {
            console.log('Could not notify new tab pages');
        }
    }

    showStatus(message, type) {
        const statusElement = document.getElementById('statusMessage');
        statusElement.textContent = message;
        statusElement.className = `status-message ${type} show`;
        
        // Hide after 3 seconds
        setTimeout(() => {
            statusElement.classList.remove('show');
        }, 3000);
    }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new PopupController();
});

// Also handle immediate initialization if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new PopupController();
    });
} else {
    new PopupController();
}