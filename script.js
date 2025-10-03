// xAI Chrome Extension - Main Script
class XAIExtension {
  constructor() {
    this.particles = [];
    this.activeParticles = 0;
    this.animationId = null;
    this.settings = {
      animationsEnabled: true,
      particleCount: 15,
      userName: "",
      customBookmarks: [],
      sectionsCollapsed: {
        quickAccess: false,
        recent: false
      },
      weather: {
        enabled: true,
        unit: 'metric', // metric (Celsius) or imperial (Fahrenheit)
        location: '',
        apiKey: 'eddf07fac98cf25cdfcf66cab6b7a4ec', // OpenWeatherMap API key
        lastUpdate: null,
        cacheData: null,
        cacheDuration: 15 * 60 * 1000 // 15 minutes in milliseconds
      }
    };
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.initSectionToggles();
    this.initWeather();
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
      const result = await chrome.storage.sync.get(["xaiSettings"]);
      if (result.xaiSettings) {
        this.settings = { ...this.settings, ...result.xaiSettings };
      }
    } catch (error) {
      console.log("Settings loaded from default values");
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.sync.set({ xaiSettings: this.settings });
    } catch (error) {
      console.log("Could not save settings");
    }
  }

  setupEventListeners() {
    const searchInput = document.getElementById("searchInput");
    const searchButton = document.getElementById("searchButton");
    const settingsButton = document.getElementById("settingsButton");

    // Search functionality
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.performSearch(searchInput.value);
      }
    });

    searchButton.addEventListener("click", () => {
      this.performSearch(searchInput.value);
    });

    // Settings button
    settingsButton.addEventListener("click", () => {
      this.openSettings();
    });

    // Google Apps launcher
    const appsLauncher = document.getElementById("appsLauncher");
    if (appsLauncher) {
      appsLauncher.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.showGoogleApps();
      });
    }

    // Mouse move effect for particles
    document.addEventListener("mousemove", (e) => {
      this.handleMouseMove(e);
    });

    // Section toggle functionality
    this.setupSectionToggleListeners();

    // Focus search input on startup
    setTimeout(() => {
      searchInput.focus();
    }, 500);

    // Listen for settings updates from popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'settingsUpdated') {
        console.log('📨 Settings updated from popup');
        this.settings = { ...this.settings, ...message.settings };
        
        // If weather settings changed, refresh immediately
        if (message.weatherChanged) {
          console.log('🌤️ Weather settings changed, refreshing...');
          this.refreshWeatherData();
        }
        
        // Update other UI elements
        this.updateGreeting();
        sendResponse({ success: true });
      }
    });
  }

  performSearch(query) {
    if (!query.trim()) return;

    // Check if it's a URL
    const urlPattern =
      /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    const isUrl = urlPattern.test(query) || query.includes(".");

    if (isUrl) {
      const url = query.startsWith("http") ? query : `https://${query}`;
      window.location.href = url;
    } else {
      // Search with Google
      window.location.href = `https://www.google.com/search?q=${encodeURIComponent(
        query
      )}`;
    }
  }

  updateGreeting() {
    const greetingElement = document.getElementById("greetingText");
    const hour = new Date().getHours();
    let greeting = "Welcome back";

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
        greeting = "Good morning";
      } else if (hour < 18) {
        greeting = "Good afternoon";
      } else {
        greeting = "Good evening";
      }
    }

    greetingElement.textContent = greeting;
  }

  updateTime() {
    const timeElement = document.getElementById("timeDisplay");
    const now = new Date();
    const timeString = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const dateString = now.toLocaleDateString([], {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    timeElement.textContent = `${timeString} • ${dateString}`;
  }

  async loadBookmarks() {
    const bookmarksGrid = document.getElementById("bookmarksGrid");

    try {
      // First try to get Chrome shortcuts (most visited sites)
      let shortcuts = [];
      try {
        const topSites = await chrome.topSites.get();
        shortcuts = topSites.slice(0, 6); // Get top 6 shortcuts
      } catch (error) {
        console.log("Top sites not available");
      }

      // Get Chrome bookmarks
      const bookmarkTree = await chrome.bookmarks.getTree();
      const bookmarks = this.extractBookmarks(
        bookmarkTree[0],
        8 - shortcuts.length
      ); // Fill remaining slots

      const allItems = [...shortcuts, ...bookmarks];

      if (allItems.length === 0) {
        bookmarksGrid.innerHTML = `
                    <div class="bookmark-item" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                        <div class="bookmark-title">No shortcuts or bookmarks found</div>
                        <div class="bookmark-url">Visit sites or add bookmarks to see them here</div>
                    </div>
                `;
        return;
      }

      bookmarksGrid.innerHTML = allItems
        .map(
          (item) => `
                <a href="${item.url}" class="bookmark-item" target="_self">
                    <div class="bookmark-title">${this.truncateText(
                      item.title,
                      30
                    )}</div>
                    <div class="bookmark-url">${this.getDomainFromUrl(
                      item.url
                    )}</div>
                </a>
            `
        )
        .join("");
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
    const historyList = document.getElementById("historyList");

    try {
      // Get recent history
      const historyItems = await chrome.history.search({
        text: "",
        maxResults: 6,
        startTime: Date.now() - 7 * 24 * 60 * 60 * 1000, // Last 7 days
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

      historyList.innerHTML = historyItems
        .map(
          (item) => `
                <a href="${item.url}" class="history-item" target="_self">
                    <img class="history-favicon" 
                         src="chrome://favicon/${item.url}" 
                         onerror="this.style.display='none'"
                         alt="">
                    <div class="history-content">
                        <div class="history-title">${this.truncateText(
                          item.title || "Untitled",
                          50
                        )}</div>
                        <div class="history-url">${this.getDomainFromUrl(
                          item.url
                        )}</div>
                    </div>
                </a>
            `
        )
        .join("");
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
    const starsContainer = document.getElementById("starsContainer");
    const starCount = 40; // Reduced count for minimal look

    for (let i = 0; i < starCount; i++) {
      const star = document.createElement("div");
      star.className = "star";
      star.style.left = Math.random() * 100 + "%";
      star.style.top = Math.random() * 100 + "%";
      star.style.animationDelay = Math.random() * 4 + "s";

      // Smaller pulsating stars
      const size = Math.random() * 2 + 1;
      star.style.width = size + "px";
      star.style.height = size + "px";

      starsContainer.appendChild(star);
    }
  }

  createFloatingElements() {
    const floatingContainer = document.getElementById("floatingElements");
    const elementCount = 5; // Minimal count as requested

    for (let i = 0; i < elementCount; i++) {
      const element = document.createElement("div");

      element.className = "floating-element floating-circle";
      element.style.left = Math.random() * 100 + "%";
      element.style.animationDelay = Math.random() * 20 + "s";
      element.style.animationDuration = Math.random() * 15 + 20 + "s";

      // Smaller size for minimal look
      const size = Math.random() * 6 + 3; // 3-9px
      element.style.width = size + "px";
      element.style.height = size + "px";

      floatingContainer.appendChild(element);
    }
  }

  initParticleSystem() {
    const canvas = document.getElementById("particleCanvas");

    // Create particles
    for (let i = 0; i < this.settings.particleCount; i++) {
      this.createParticle();
    }

    this.animateParticles();
  }

  createParticle() {
    // Only create if under particle limit
    if (this.activeParticles >= this.settings.particleCount) {
      return;
    }

    const particle = document.createElement("div");

    // Only use circles and glowing particles
    const particleTypes = ["circle", "glow"];
    const randomType =
      particleTypes[Math.floor(Math.random() * particleTypes.length)];

    // Set base class and specific type class
    particle.className = `particle particle-${randomType}`;

    // Random position
    particle.style.left = Math.random() * window.innerWidth + "px";

    // Random size for circular particles
    const size = Math.random() * 4 + 1; // 1-5px (smaller for minimal look)
    particle.style.width = size + "px";
    particle.style.height = size + "px";

    // Random animation timing
    particle.style.animationDelay = Math.random() * 5 + "s";
    particle.style.animationDuration = Math.random() * 10 + 20 + "s";

    document.getElementById("particleCanvas").appendChild(particle);
    this.activeParticles++;

    // Remove particle after animation
    setTimeout(() => {
      if (particle.parentNode) {
        particle.parentNode.removeChild(particle);
        this.activeParticles--;
      }
    }, 30000);
  }

  animateParticles() {
    // Continuously create new particles (respecting max count)
    setInterval(() => {
      if (
        this.settings.animationsEnabled &&
        this.activeParticles < this.settings.particleCount
      ) {
        this.createParticle();
      }
    }, 1500); // Slower spawn rate for truly minimal look
  }

  handleMouseMove(e) {
    if (!this.settings.animationsEnabled) return;

    // Create mouse trail effect
    const trail = document.createElement("div");
    trail.style.position = "fixed";
    trail.style.left = e.clientX + "px";
    trail.style.top = e.clientY + "px";
    trail.style.width = "4px";
    trail.style.height = "4px";
    trail.style.background = "rgba(124, 58, 237, 0.5)";
    trail.style.borderRadius = "50%";
    trail.style.pointerEvents = "none";
    trail.style.zIndex = "1000";
    trail.style.animation = "fadeOut 1s ease-out forwards";

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
    const modal = document.createElement("div");
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

    const modalContent = document.createElement("div");
    modalContent.style.cssText = `
            background: rgba(0, 0, 0, 0.98);
            border: 1px solid rgba(255, 255, 255, 0.03);
            border-radius: 20px;
            padding: 40px;
            max-width: 500px;
            width: 90%;
            color: white;
            backdrop-filter: blur(30px);
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.8);
        `;

    modalContent.innerHTML = `
            <h3 style="margin-bottom: 30px; font-size: 1.8rem; color: #a855f7; text-align: center;">Google Workspace</h3>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px;">
                <a href="https://drive.google.com" target="_self" class="app-link">
                    <div class="app-icon-dark">📁</div>
                    <span>Drive</span>
                </a>
                <a href="https://docs.google.com" target="_self" class="app-link">
                    <div class="app-icon-dark">📄</div>
                    <span>Docs</span>
                </a>
                <a href="https://sheets.google.com" target="_self" class="app-link">
                    <div class="app-icon-dark">📊</div>
                    <span>Sheets</span>
                </a>
                <a href="https://slides.google.com" target="_self" class="app-link">
                    <div class="app-icon-dark">🎨</div>
                    <span>Slides</span>
                </a>
                <a href="https://calendar.google.com" target="_self" class="app-link">
                    <div class="app-icon-dark">📅</div>
                    <span>Calendar</span>
                </a>
                <a href="https://meet.google.com" target="_self" class="app-link">
                    <div class="app-icon-dark">📹</div>
                    <span>Meet</span>
                </a>
            </div>
            <div style="text-align: center;">
                <button id="closeGoogleAppsBtn" class="close-modal-btn">Close</button>
            </div>
        `;

    // Add CSS styles for the modal elements
    const modalStyle = document.createElement("style");
    modalStyle.textContent = `
            .app-link {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 18px;
                background: rgba(255,255,255,0.008);
                border: 1px solid rgba(255,255,255,0.02);
                border-radius: 12px;
                text-decoration: none;
                color: white;
                transition: all 0.3s ease;
                font-size: 0.9rem;
            }
            .app-link:hover {
                background: rgba(255,255,255,0.03);
                transform: translateY(-3px);
                border-color: rgba(124,58,237,0.3);
            }
            .app-icon-dark {
                width: 36px;
                height: 36px;
                background: linear-gradient(135deg, #333333, #555555);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 8px;
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 18px;
            }
            .close-modal-btn {
                padding: 12px 24px;
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 10px;
                color: white;
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 14px;
            }
            .close-modal-btn:hover {
                background: rgba(255,255,255,0.08);
                border-color: rgba(124,58,237,0.3);
            }
        `;
    document.head.appendChild(modalStyle);

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Add event listeners after elements are in DOM
    const closeBtn = modal.querySelector("#closeGoogleAppsBtn");
    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        document.body.removeChild(modal);
        document.head.removeChild(modalStyle);
      });
    }

    // Close when clicking outside the modal content
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
        document.head.removeChild(modalStyle);
      }
    });
  }

  showSettingsModal() {
    // Create a simple settings modal as fallback
    const modal = document.createElement("div");
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
                    <input type="text" id="modalUserName" value="${
                      this.settings.userName
                    }" 
                           style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: white;">
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="display: flex; align-items: center; gap: 10px; color: #e5e7eb;">
                        <input type="checkbox" id="modalAnimations" ${
                          this.settings.animationsEnabled ? "checked" : ""
                        }>
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

    document.getElementById("modalCancel").onclick = () => modal.remove();
    document.getElementById("modalSave").onclick = () => {
      this.settings.userName = document.getElementById("modalUserName").value;
      this.settings.animationsEnabled =
        document.getElementById("modalAnimations").checked;
      this.saveSettings();
      this.updateGreeting();
      modal.remove();
    };

    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };
  }

  // Section Toggle Functionality
  initSectionToggles() {
    // Load saved collapsed states
    this.loadSectionStates();
    
    // Set initial max-height for sections after content loads
    setTimeout(() => {
      this.setSectionMaxHeights();
    }, 500);
  }

  setupSectionToggleListeners() {
    const quickAccessHeader = document.getElementById('quickAccessHeader');
    const recentHeader = document.getElementById('recentHeader');
    
    if (quickAccessHeader) {
      quickAccessHeader.addEventListener('click', () => {
        this.toggleSection('quickAccess');
      });
    }
    
    if (recentHeader) {
      recentHeader.addEventListener('click', () => {
        this.toggleSection('recent');
      });
    }
  }

  toggleSection(sectionName) {
    const isCollapsed = this.settings.sectionsCollapsed[sectionName];
    this.settings.sectionsCollapsed[sectionName] = !isCollapsed;
    
    this.updateSectionUI(sectionName, !isCollapsed);
    this.saveSettings();
  }

  updateSectionUI(sectionName, isCollapsed) {
    const sectionIdMap = {
      quickAccess: { header: 'quickAccessHeader', content: 'quickAccessContent' },
      recent: { header: 'recentHeader', content: 'recentContent' }
    };
    
    const { header: headerId, content: contentId } = sectionIdMap[sectionName];
    const headerElement = document.getElementById(headerId);
    const contentElement = document.getElementById(contentId);
    
    if (headerElement && contentElement) {
      if (isCollapsed) {
        headerElement.classList.add('collapsed');
        contentElement.classList.add('collapsed');
      } else {
        headerElement.classList.remove('collapsed');
        contentElement.classList.remove('collapsed');
      }
    }
  }

  setSectionMaxHeights() {
    const quickAccessContent = document.getElementById('quickAccessContent');
    const recentContent = document.getElementById('recentContent');
    
    if (quickAccessContent) {
      const height = quickAccessContent.scrollHeight;
      quickAccessContent.style.maxHeight = height + 'px';
    }
    
    if (recentContent) {
      const height = recentContent.scrollHeight;
      recentContent.style.maxHeight = height + 'px';
    }
  }

  loadSectionStates() {
    // Apply saved collapsed states to UI
    Object.keys(this.settings.sectionsCollapsed).forEach(sectionName => {
      const isCollapsed = this.settings.sectionsCollapsed[sectionName];
      this.updateSectionUI(sectionName, isCollapsed);
    });
  }

  truncateText(text, maxLength) {
    return text.length > maxLength
      ? text.substring(0, maxLength) + "..."
      : text;
  }

  getDomainFromUrl(url) {
    try {
      const domain = new URL(url).hostname;
      return domain.replace("www.", "");
    } catch {
      return url;
    }
  }

  // Weather Functionality
  async initWeather() {
    if (!this.settings.weather.enabled) {
      document.getElementById('weatherWidget').style.display = 'none';
      return;
    }

    this.setupWeatherEventListeners();
    await this.loadWeather();
    
    // Update weather every 15 minutes
    setInterval(() => {
      this.loadWeather();
    }, this.settings.weather.cacheDuration);
  }

  setupWeatherEventListeners() {
    const retryBtn = document.getElementById('retryWeather');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        this.loadWeather();
      });
    }
    
    const refreshBtn = document.getElementById('weatherRefresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.handleWeatherRefresh();
      });
    }
  }

  async loadWeather() {
    const weatherWidget = document.getElementById('weatherWidget');
    const weatherLoading = document.getElementById('weatherLoading');
    const weatherContent = document.getElementById('weatherContent');
    const weatherError = document.getElementById('weatherError');

    // Check cache first
    if (this.isWeatherCacheValid()) {
      this.displayWeather(this.settings.weather.cacheData);
      return;
    }

    // Show loading state
    weatherLoading.style.display = 'flex';
    weatherContent.style.display = 'none';
    weatherError.style.display = 'none';

    try {
      let coords;
      
      // Try to get coordinates
      if (this.settings.weather.location) {
        try {
          coords = await this.geocodeLocation(this.settings.weather.location);
        } catch (error) {
          console.log('Geocoding failed, trying current location');
          coords = await this.getCurrentLocation();
        }
      } else {
        try {
          coords = await this.getCurrentLocation();
        } catch (error) {
          console.log('Current location failed, using fallback (London)');
          // Use London as fallback for testing
          coords = { lat: 51.5074, lon: -0.1278 };
        }
      }

      if (!coords) {
        throw new Error('Unable to get location');
      }

      // Fetch weather data
      const weatherData = await this.fetchWeatherData(coords.lat, coords.lon);
      
      // Cache the data
      this.settings.weather.cacheData = weatherData;
      this.settings.weather.lastUpdate = Date.now();
      this.saveSettings();

      // Display weather
      this.displayWeather(weatherData);
      
      // Show info if using mock data
      if (weatherData.name === 'Demo Location') {
        console.log('📍 Using demo weather data - Set up your API key for live weather!');
      }

    } catch (error) {
      console.log('Weather error:', error);
      this.displayWeatherError(error.message);
    }
  }

  isWeatherCacheValid() {
    if (!this.settings.weather.cacheData || !this.settings.weather.lastUpdate) {
      return false;
    }

    const timeSinceUpdate = Date.now() - this.settings.weather.lastUpdate;
    return timeSinceUpdate < this.settings.weather.cacheDuration;
  }

  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported by browser'));
        return;
      }

      console.log('Requesting current location...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Location obtained:', position.coords.latitude, position.coords.longitude);
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          let message = 'Location access denied';
          switch(error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location permission denied';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Location unavailable';
              break;
            case error.TIMEOUT:
              message = 'Location request timed out';
              break;
          }
          reject(new Error(message));
        },
        { timeout: 15000, enableHighAccuracy: false, maximumAge: 300000 }
      );
    });
  }

  async geocodeLocation(locationName) {
    // For demo purposes, this is a simple implementation
    // In a real app, you'd use a geocoding API
    const geocodeUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(locationName)}&limit=1&appid=${this.settings.weather.apiKey}`;
    
    try {
      const response = await fetch(geocodeUrl);
      const data = await response.json();
      
      if (data.length > 0) {
        return {
          lat: data[0].lat,
          lon: data[0].lon
        };
      }
      throw new Error('Location not found');
    } catch (error) {
      throw new Error('Failed to find location');
    }
  }

  async fetchWeatherData(lat, lon) {
    // Check if API key is set
    if (!this.settings.weather.apiKey || this.settings.weather.apiKey === 'YOUR_API_KEY') {
      // Use mock data for demo purposes
      return this.getMockWeatherData();
    }

    try {
      const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${this.settings.weather.apiKey}&units=${this.settings.weather.unit}`;
      
      console.log('Fetching weather from:', weatherUrl);
      const response = await fetch(weatherUrl);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Weather API Error Details:');
        console.error('Status:', response.status, response.statusText);
        console.error('Response:', errorText);
        
        if (response.status === 401) {
          console.log('❌ API key issue detected - falling back to mock data');
          console.log('💡 Check: 1) API key activation 2) Email verification 3) Account limits');
          return this.getMockWeatherData();
        }
        throw new Error(`Weather API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Weather data received:', data);
      return data;
    } catch (error) {
      console.error('Weather fetch error:', error);
      // If API fails, fall back to mock data
      if (error.message.includes('401') || error.message.includes('API')) {
        console.log('API failed, using mock data as fallback');
        return this.getMockWeatherData();
      }
      throw new Error('Weather service unavailable');
    }
  }

  getMockWeatherData() {
    // Generate realistic mock weather data
    const hour = new Date().getHours();
    const isDay = hour >= 6 && hour < 18;
    
    const weatherConditions = [
      { main: 'Clear', description: 'clear sky', icon: isDay ? '01d' : '01n' },
      { main: 'Clouds', description: 'few clouds', icon: isDay ? '02d' : '02n' },
      { main: 'Clouds', description: 'scattered clouds', icon: isDay ? '03d' : '03n' },
      { main: 'Rain', description: 'light rain', icon: '10d' },
    ];
    
    const randomWeather = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
    const baseTemp = 18 + Math.random() * 12; // 18-30°C
    
    return {
      name: 'Demo Location',
      sys: { country: 'XX' },
      main: {
        temp: Math.round(baseTemp),
        feels_like: Math.round(baseTemp + (Math.random() * 4 - 2)),
        humidity: Math.round(40 + Math.random() * 40) // 40-80%
      },
      weather: [randomWeather],
      wind: {
        speed: Math.round((Math.random() * 8 + 2) * 100) / 100 // 2-10 m/s
      }
    };
  }

  displayWeather(data) {
    const weatherLoading = document.getElementById('weatherLoading');
    const weatherContent = document.getElementById('weatherContent');
    const weatherError = document.getElementById('weatherError');

    // Hide loading and error
    weatherLoading.style.display = 'none';
    weatherError.style.display = 'none';
    
    // Update weather display
    document.getElementById('weatherTemp').textContent = `${Math.round(data.main.temp)}°`;
    document.getElementById('weatherDesc').textContent = data.weather[0].description;
    document.getElementById('weatherLocation').textContent = data.name;
    document.getElementById('feelsLike').textContent = `${Math.round(data.main.feels_like)}°`;
    document.getElementById('humidity').textContent = `${data.main.humidity}%`;
    // Convert wind speed based on unit system
    const windSpeed = this.settings.weather.unit === 'imperial' 
      ? Math.round(data.wind.speed) + ' mph' 
      : Math.round(data.wind.speed * 3.6) + ' km/h';
    document.getElementById('windSpeed').textContent = windSpeed;
    
    // Set weather icon
    const iconUrl = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
    const weatherIcon = document.getElementById('weatherIcon');
    weatherIcon.src = iconUrl;
    weatherIcon.alt = data.weather[0].description;
    
    // Show weather content
    weatherContent.style.display = 'block';
  }

  displayWeatherError(message) {
    const weatherLoading = document.getElementById('weatherLoading');
    const weatherContent = document.getElementById('weatherContent');
    const weatherError = document.getElementById('weatherError');
    const errorMessage = document.getElementById('errorMessage');

    // Hide loading and content
    weatherLoading.style.display = 'none';
    weatherContent.style.display = 'none';
    
    // Show error
    errorMessage.textContent = message;
    weatherError.style.display = 'block';
  }

  // Handle manual refresh button click
  async handleWeatherRefresh() {
    const refreshBtn = document.getElementById('weatherRefresh');
    
    // Add spinning animation
    if (refreshBtn) {
      refreshBtn.classList.add('refreshing');
    }
    
    console.log('🔄 Manual weather refresh triggered');
    await this.refreshWeatherData();
    
    // Remove spinning animation after a short delay
    setTimeout(() => {
      if (refreshBtn) {
        refreshBtn.classList.remove('refreshing');
      }
    }, 1000);
  }

  // Force refresh weather data (clears cache)
  async refreshWeatherData() {
    console.log('🔄 Forcing weather refresh...');
    // Clear cached data to force fresh API call
    this.settings.weather.cacheData = null;
    this.settings.weather.lastUpdate = null;
    await this.saveSettings();
    
    // Immediately load fresh weather data
    await this.loadWeather();
  }
}

// CSS for fadeOut animation
const style = document.createElement("style");
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 0.5; transform: scale(1); }
        to { opacity: 0; transform: scale(0); }
    }
`;
document.head.appendChild(style);

// Initialize the extension when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new XAIExtension();
});

// Also initialize immediately if DOM is already loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    new XAIExtension();
  });
} else {
  new XAIExtension();
}
