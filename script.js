// xAI Chrome Extension - Main Script
class XAIExtension {
    constructor() {
        this.particles = [];
        this.animationId = null;
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
        this.updateGreeting();
        this.updateTime();
        this.loadBookmarks();
        this.loadHistory();
        this.createStars();
        this.createFloatingElements();
        if (this.settings.animationsEnabled) {
            this.initParticleSystem();
        }
        setInterval(() => this.updateTime(), 1000);
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['xaiSettings']);
            if (result.xaiSettings) {
                this.settings = { ...this.settings, ...result.xaiSettings };
            }
        } catch (error) {
            console.log('Settings loaded from default values');
        }
    }

    async saveSettings() {
        try {
            await chrome.storage.sync.set({ xaiSettings: this.settings });
        } catch (error) {
            console.log('Could not save settings');
        }
    }

    setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        const searchButton = document.getElementById('searchButton');
        const settingsButton = document.getElementById('settingsButton');

        // Search functionality
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch(searchInput.value);
            }
        });

        searchButton.addEventListener('click', () => {
            this.performSearch(searchInput.value);
        });

        // Settings button
        settingsButton.addEventListener('click', () => {
            this.openSettings();
        });
        
        // Google Apps launcher
        const appsLauncher = document.getElementById('appsLauncher');
        if (appsLauncher) {
            appsLauncher.addEventListener('click', () => {
                this.showGoogleApps();
            });
        }

        // Mouse move effect for particles
        document.addEventListener('mousemove', (e) => {
            this.handleMouseMove(e);
        });

        // Focus search input on startup
        setTimeout(() => {
            searchInput.focus();
        }, 500);
    }

    performSearch(query) {
        if (!query.trim()) return;

        // Check if it's a URL
        const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
        const isUrl = urlPattern.test(query) || query.includes('.');

        if (isUrl) {
            const url = query.startsWith('http') ? query : `https://${query}`;
            window.location.href = url;
        } else {
            // Search with Google
            window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        }
    }

    updateGreeting() {
        const greetingElement = document.getElementById('greetingText');
        const hour = new Date().getHours();
        let greeting = 'Welcome back';

        if (this.settings.userName) {
            if (hour < 12) {
                greeting = `Good morning, ${this.settings.userName}`;
            } else if (hour < 18) {
                greeting = `Good afternoon, ${this.settings.userName}`;
            } else {
                greeting = `Good evening, ${this.settings.userName}`;
            }
        } else {
            if (hour < 12) {
                greeting = 'Good morning';
            } else if (hour < 18) {
                greeting = 'Good afternoon';
            } else {
                greeting = 'Good evening';
            }
        }

        greetingElement.textContent = greeting;
    }

    updateTime() {
        const timeElement = document.getElementById('timeDisplay');
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
        const dateString = now.toLocaleDateString([], { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
        });
        
        timeElement.textContent = `${timeString} • ${dateString}`;
    }

    async loadBookmarks() {
        const bookmarksGrid = document.getElementById('bookmarksGrid');
        
        try {
            // Get Chrome bookmarks
            const bookmarkTree = await chrome.bookmarks.getTree();
            const bookmarks = this.extractBookmarks(bookmarkTree[0], 8); // Get top 8 bookmarks
            
            if (bookmarks.length === 0) {
                bookmarksGrid.innerHTML = `
                    <div class="bookmark-item" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                        <div class="bookmark-title">No bookmarks found</div>
                        <div class="bookmark-url">Add some bookmarks to see them here</div>
                    </div>
                `;
                return;
            }

            bookmarksGrid.innerHTML = bookmarks.map(bookmark => `
                <a href="${bookmark.url}" class="bookmark-item" target="_self">
                    <div class="bookmark-title">${this.truncateText(bookmark.title, 30)}</div>
                    <div class="bookmark-url">${this.getDomainFromUrl(bookmark.url)}</div>
                </a>
            `).join('');

        } catch (error) {
            bookmarksGrid.innerHTML = `
                <div class="bookmark-item" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                    <div class="bookmark-title">Bookmarks unavailable</div>
                    <div class="bookmark-url">Permission required to access bookmarks</div>
                </div>
            `;
        }
    }

    async loadHistory() {
        const historyList = document.getElementById('historyList');
        
        try {
            // Get recent history
            const historyItems = await chrome.history.search({
                text: '',
                maxResults: 6,
                startTime: Date.now() - (7 * 24 * 60 * 60 * 1000) // Last 7 days
            });

            if (historyItems.length === 0) {
                historyList.innerHTML = `
                    <div class="history-item" style="justify-content: center; padding: 40px;">
                        <div class="history-content" style="text-align: center;">
                            <div class="history-title">No recent history</div>
                            <div class="history-url">Start browsing to see your history here</div>
                        </div>
                    </div>
                `;
                return;
            }

            historyList.innerHTML = historyItems.map(item => `
                <a href="${item.url}" class="history-item" target="_self">
                    <img class="history-favicon" 
                         src="chrome://favicon/${item.url}" 
                         onerror="this.style.display='none'"
                         alt="">
                    <div class="history-content">
                        <div class="history-title">${this.truncateText(item.title || 'Untitled', 50)}</div>
                        <div class="history-url">${this.getDomainFromUrl(item.url)}</div>
                    </div>
                </a>
            `).join('');

        } catch (error) {
            historyList.innerHTML = `
                <div class="history-item" style="justify-content: center; padding: 40px;">
                    <div class="history-content" style="text-align: center;">
                        <div class="history-title">History unavailable</div>
                        <div class="history-url">Permission required to access history</div>
                    </div>
                </div>
            `;
        }
    }

    extractBookmarks(node, maxCount, current = []) {
        if (current.length >= maxCount) return current;
        
        if (node.url && node.title) {
            current.push({ title: node.title, url: node.url });
        }
        
        if (node.children) {
            for (const child of node.children) {
                this.extractBookmarks(child, maxCount, current);
                if (current.length >= maxCount) break;
            }
        }
        
        return current;
    }

    createStars() {
        const starsContainer = document.getElementById('starsContainer');
        const starCount = 100;

        for (let i = 0; i < starCount; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            star.style.animationDelay = Math.random() * 3 + 's';
            
            // Random size variation
            const size = Math.random() * 3 + 1;
            star.style.width = size + 'px';
            star.style.height = size + 'px';
            
            starsContainer.appendChild(star);
        }
    }

    createFloatingElements() {
        const floatingContainer = document.getElementById('floatingElements');
        const elementCount = 12; // Increased count for more variety
        const shapes = ['circle', 'square', 'diamond', 'star'];

        for (let i = 0; i < elementCount; i++) {
            const element = document.createElement('div');
            const randomShape = shapes[Math.floor(Math.random() * shapes.length)];
            
            element.className = `floating-element floating-${randomShape}`;
            element.style.left = Math.random() * 100 + '%';
            element.style.animationDelay = Math.random() * 15 + 's';
            element.style.animationDuration = (Math.random() * 10 + 15) + 's';
            
            // Random size for floating elements
            const size = Math.random() * 8 + 4; // 4-12px
            element.style.width = size + 'px';
            element.style.height = size + 'px';
            
            floatingContainer.appendChild(element);
        }
    }

    initParticleSystem() {
        const canvas = document.getElementById('particleCanvas');
        
        // Create particles
        for (let i = 0; i < this.settings.particleCount; i++) {
            this.createParticle();
        }

        this.animateParticles();
    }

    createParticle() {
        const particle = document.createElement('div');
        
        // Array of different particle types
        const particleTypes = ['circle', 'square', 'diamond', 'triangle', 'line', 'star', 'glow'];
        const randomType = particleTypes[Math.floor(Math.random() * particleTypes.length)];
        
        // Set base class and specific type class
        particle.className = `particle particle-${randomType}`;
        
        // Random position
        particle.style.left = Math.random() * window.innerWidth + 'px';
        
        // Random size based on type
        let size;
        switch(randomType) {
            case 'line':
                size = Math.random() * 15 + 5; // 5-20px width
                particle.style.width = size + 'px';
                particle.style.height = '1px';
                break;
            case 'triangle':
                size = Math.random() * 4 + 2; // 2-6px
                particle.style.borderLeftWidth = size + 'px';
                particle.style.borderRightWidth = size + 'px';
                particle.style.borderBottomWidth = size * 2 + 'px';
                break;
            case 'star':
                size = Math.random() * 8 + 4; // 4-12px
                particle.style.width = size + 'px';
                particle.style.height = size + 'px';
                break;
            default:
                size = Math.random() * 6 + 1; // 1-7px
                particle.style.width = size + 'px';
                particle.style.height = size + 'px';
        }
        
        // Random animation timing
        particle.style.animationDelay = Math.random() * 20 + 's';
        particle.style.animationDuration = (Math.random() * 15 + 15) + 's';
        
        // Random opacity variation
        const opacity = Math.random() * 0.4 + 0.3; // 0.3-0.7
        particle.style.setProperty('--particle-opacity', opacity);
        
        document.getElementById('particleCanvas').appendChild(particle);
        
        // Remove particle after animation with longer timeout for varied durations
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, 35000);
    }

    animateParticles() {
        // Continuously create new particles
        setInterval(() => {
            if (this.settings.animationsEnabled) {
                this.createParticle();
            }
        }, 400);
    }

    handleMouseMove(e) {
        if (!this.settings.animationsEnabled) return;
        
        // Create mouse trail effect
        const trail = document.createElement('div');
        trail.style.position = 'fixed';
        trail.style.left = e.clientX + 'px';
        trail.style.top = e.clientY + 'px';
        trail.style.width = '4px';
        trail.style.height = '4px';
        trail.style.background = 'rgba(124, 58, 237, 0.5)';
        trail.style.borderRadius = '50%';
        trail.style.pointerEvents = 'none';
        trail.style.zIndex = '1000';
        trail.style.animation = 'fadeOut 1s ease-out forwards';
        
        document.body.appendChild(trail);
        
        setTimeout(() => {
            if (trail.parentNode) {
                trail.parentNode.removeChild(trail);
            }
        }, 1000);
    }

    openSettings() {
        // This will open the popup when the extension is loaded
        try {
            chrome.action.openPopup();
        } catch (error) {
            // Fallback: create a simple modal for settings
            this.showSettingsModal();
        }
    }

    showGoogleApps() {
        // Google Apps quick access modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(15px);
        `;

        modal.innerHTML = `
            <div style="
                background: rgba(0, 0, 0, 0.95);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 20px;
                padding: 40px;
                max-width: 500px;
                width: 90%;
                color: white;
                backdrop-filter: blur(25px);
            ">
                <h3 style="margin-bottom: 30px; font-size: 1.8rem; color: #a855f7; text-align: center;">Google Workspace</h3>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px;">
                    <a href="https://drive.google.com" target="_self" style="display: flex; flex-direction: column; align-items: center; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 12px; text-decoration: none; color: white; transition: all 0.3s ease;" onmouseover="this.style.background='rgba(255,255,255,0.1)'; this.style.transform='translateY(-3px)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.transform='translateY(0)'">
                        <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #1ea362, #34a853); border-radius: 8px; margin-bottom: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">📁</div>
                        <span>Drive</span>
                    </a>
                    <a href="https://docs.google.com" target="_self" style="display: flex; flex-direction: column; align-items: center; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 12px; text-decoration: none; color: white; transition: all 0.3s ease;" onmouseover="this.style.background='rgba(255,255,255,0.1)'; this.style.transform='translateY(-3px)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.transform='translateY(0)'">
                        <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #1a73e8, #4285f4); border-radius: 8px; margin-bottom: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">📝</div>
                        <span>Docs</span>
                    </a>
                    <a href="https://sheets.google.com" target="_self" style="display: flex; flex-direction: column; align-items: center; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 12px; text-decoration: none; color: white; transition: all 0.3s ease;" onmouseover="this.style.background='rgba(255,255,255,0.1)'; this.style.transform='translateY(-3px)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.transform='translateY(0)'">
                        <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #0f9d58, #34a853); border-radius: 8px; margin-bottom: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">📊</div>
                        <span>Sheets</span>
                    </a>
                    <a href="https://slides.google.com" target="_self" style="display: flex; flex-direction: column; align-items: center; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 12px; text-decoration: none; color: white; transition: all 0.3s ease;" onmouseover="this.style.background='rgba(255,255,255,0.1)'; this.style.transform='translateY(-3px)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.transform='translateY(0)'">
                        <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #f9ab00, #fbbc04); border-radius: 8px; margin-bottom: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">🎨</div>
                        <span>Slides</span>
                    </a>
                    <a href="https://calendar.google.com" target="_self" style="display: flex; flex-direction: column; align-items: center; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 12px; text-decoration: none; color: white; transition: all 0.3s ease;" onmouseover="this.style.background='rgba(255,255,255,0.1)'; this.style.transform='translateY(-3px)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.transform='translateY(0)'">
                        <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #1a73e8, #4285f4); border-radius: 8px; margin-bottom: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">📅</div>
                        <span>Calendar</span>
                    </a>
                    <a href="https://meet.google.com" target="_self" style="display: flex; flex-direction: column; align-items: center; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 12px; text-decoration: none; color: white; transition: all 0.3s ease;" onmouseover="this.style.background='rgba(255,255,255,0.1)'; this.style.transform='translateY(-3px)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.transform='translateY(0)'">
                        <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #00ac47, #34a853); border-radius: 8px; margin-bottom: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">📹</div>
                        <span>Meet</span>
                    </a>
                </div>
                <div style="text-align: center;">
                    <button id="closeGoogleApps" style="padding: 12px 24px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 10px; color: white; cursor: pointer; transition: all 0.3s ease;" onmouseover="this.style.background='rgba(255,255,255,0.15)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('closeGoogleApps').onclick = () => modal.remove();
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
    }

    showSettingsModal() {
        // Create a simple settings modal as fallback
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(10px);
        `;

        modal.innerHTML = `
            <div style="
                background: rgba(0, 0, 0, 0.95);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 15px;
                padding: 30px;
                max-width: 400px;
                width: 90%;
                color: white;
                backdrop-filter: blur(20px);
            ">
                <h3 style="margin-bottom: 20px; font-size: 1.5rem; color: #a855f7;">Settings</h3>
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: #e5e7eb;">Your Name:</label>
                    <input type="text" id="modalUserName" value="${this.settings.userName}" 
                           style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: white;">
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="display: flex; align-items: center; gap: 10px; color: #e5e7eb;">
                        <input type="checkbox" id="modalAnimations" ${this.settings.animationsEnabled ? 'checked' : ''}>
                        Enable Animations
                    </label>
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="modalCancel" style="padding: 10px 20px; background: rgba(255,255,255,0.1); border: none; border-radius: 8px; color: white; cursor: pointer;">Cancel</button>
                    <button id="modalSave" style="padding: 10px 20px; background: #7c3aed; border: none; border-radius: 8px; color: white; cursor: pointer;">Save</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('modalCancel').onclick = () => modal.remove();
        document.getElementById('modalSave').onclick = () => {
            this.settings.userName = document.getElementById('modalUserName').value;
            this.settings.animationsEnabled = document.getElementById('modalAnimations').checked;
            this.saveSettings();
            this.updateGreeting();
            modal.remove();
        };

        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
    }

    truncateText(text, maxLength) {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    getDomainFromUrl(url) {
        try {
            const domain = new URL(url).hostname;
            return domain.replace('www.', '');
        } catch {
            return url;
        }
    }
}

// CSS for fadeOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 0.5; transform: scale(1); }
        to { opacity: 0; transform: scale(0); }
    }
`;
document.head.appendChild(style);

// Initialize the extension when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new XAIExtension();
});

// Also initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new XAIExtension();
    });
} else {
    new XAIExtension();
}