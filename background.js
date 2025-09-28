// xAI Chrome Extension - Background Service Worker

// Extension installation and startup
chrome.runtime.onInstalled.addListener((details) => {
    console.log('xAI Extension installed/updated');
    
    // Set default settings
    chrome.storage.sync.get(['xaiSettings'], (result) => {
        if (!result.xaiSettings) {
            const defaultSettings = {
                animationsEnabled: true,
                particleCount: 50,
                userName: '',
                customBookmarks: []
            };
            
            chrome.storage.sync.set({ xaiSettings: defaultSettings });
        }
    });
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
    // Open a new tab with our custom new tab page
    chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html') });
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'getSettings':
            chrome.storage.sync.get(['xaiSettings'], (result) => {
                sendResponse(result.xaiSettings || {});
            });
            return true; // Required for async response
            
        case 'saveSettings':
            chrome.storage.sync.set({ xaiSettings: request.settings }, () => {
                sendResponse({ success: true });
            });
            return true;
            
        case 'openNewTab':
            chrome.tabs.create({ url: request.url });
            sendResponse({ success: true });
            break;
            
        case 'searchQuery':
            const searchUrl = request.query.includes('.') || request.query.startsWith('http') 
                ? (request.query.startsWith('http') ? request.query : `https://${request.query}`)
                : `https://www.google.com/search?q=${encodeURIComponent(request.query)}`;
            
            chrome.tabs.update(sender.tab.id, { url: searchUrl });
            sendResponse({ success: true });
            break;
            
        default:
            sendResponse({ error: 'Unknown action' });
    }
});

// Handle bookmarks changes to refresh the new tab page
chrome.bookmarks.onCreated.addListener(() => {
    notifyNewTabPages('bookmarksUpdated');
});

chrome.bookmarks.onRemoved.addListener(() => {
    notifyNewTabPages('bookmarksUpdated');
});

chrome.bookmarks.onChanged.addListener(() => {
    notifyNewTabPages('bookmarksUpdated');
});

// Notify all new tab pages of updates
function notifyNewTabPages(action) {
    chrome.tabs.query({ url: chrome.runtime.getURL('newtab.html') }, (tabs) => {
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { action }, () => {
                // Ignore errors if tab is not ready
                if (chrome.runtime.lastError) {
                    console.log('Tab not ready for message');
                }
            });
        });
    });
}

// Performance optimization: Keep service worker alive
let keepAliveInterval;

function keepAlive() {
    keepAliveInterval = setInterval(() => {
        chrome.runtime.getPlatformInfo(() => {
            // Simple API call to keep service worker active
        });
    }, 20000); // Every 20 seconds
}

function stopKeepAlive() {
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
    }
}

// Start keep alive when extension starts
keepAlive();

// Clean up on suspension
chrome.runtime.onSuspend.addListener(() => {
    stopKeepAlive();
});