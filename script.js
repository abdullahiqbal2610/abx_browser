// xAI Chrome Extension - Main Script with Sports Widget
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
        quickAccess: true,
        recent: true,
      },
      weather: {
        enabled: true,
        unit: "metric",
        location: "",
        apiKey: "",
        defaultApiKey: "eddf07fac98cf25cdfcf66cab6b7a4ec",
        lastUpdate: null,
        cacheData: null,
        cacheDuration: 15 * 60 * 1000,
      },
      sports: {
        enabled: true,
        teamName: "",
        apiKey: "",
        defaultApiKey: "123",
        lastUpdate: null,
        cacheData: null,
        cacheDuration: 15 * 60 * 1000,
      },
      finance: {
        enabled: true,
        apiKey: "",
        currencyPair1: {},
        currencyPair2: {},
        cacheDuration: 900000,
      },
    };
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.initSectionToggles();
    this.initWeather();
    this.initSports();
    this.initFinance();
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

    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.performSearch(searchInput.value);
      }
    });

    searchButton.addEventListener("click", () => {
      this.performSearch(searchInput.value);
    });

    // Suggestion Listeners
    searchInput.addEventListener("input", (e) =>
      this.handleSearchInput(e.target.value)
    );

    // Hide suggestions when clicking outside
    document.addEventListener("click", (e) => {
      const wrapper = document.querySelector(".search-input-wrapper");
      if (wrapper && !wrapper.contains(e.target)) {
        this.clearSuggestions();
      }
    });

    settingsButton.addEventListener("click", () => {
      this.openSettings();
    });

    const appsLauncher = document.getElementById("appsLauncher");
    if (appsLauncher) {
      appsLauncher.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.showGoogleApps();
      });
    }

    document.addEventListener("mousemove", (e) => {
      this.handleMouseMove(e);
    });

    this.setupSectionToggleListeners();

    setTimeout(() => {
      searchInput.focus();
    }, 500);

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === "settingsUpdated") {
        console.log("Settings updated from popup");
        this.settings = { ...this.settings, ...message.settings };

        if (message.weatherChanged) {
          console.log("Weather settings changed, refreshing...");
          this.refreshWeatherData();
        }

        if (message.sportsChanged) {
          console.log("Sports settings changed, refreshing...");
          this.refreshSportsData();
        }

        this.updateGreeting();
        sendResponse({ success: true });
      }
    });
  }

  // === SEARCH SUGGESTION LOGIC ===

  async handleSearchInput(query) {
    if (!query || query.length < 1) {
      this.clearSuggestions();
      return;
    }

    try {
      // Fetch suggestions from Google (Client=firefox returns easiest JSON)
      const res = await fetch(
        `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(
          query
        )}`
      );
      const data = await res.json();
      // data[1] contains the array of suggestion strings
      this.showSuggestions(data[1]);
    } catch (error) {
      // Fail silently (internet issue or blocked)
      this.clearSuggestions();
    }
  }

  showSuggestions(suggestions) {
    const container = document.getElementById("searchSuggestions");
    if (!suggestions || suggestions.length === 0) {
      container.classList.remove("active");
      return;
    }

    // Limit to 5 suggestions for clean UI
    const topSuggestions = suggestions.slice(0, 5);

    container.innerHTML = topSuggestions
      .map(
        (s) => `
      <div class="suggestion-item" role="button">
        <svg class="suggestion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        <span>${s}</span>
      </div>
    `
      )
      .join("");

    container.classList.add("active");

    // Add click listeners to new items
    container.querySelectorAll(".suggestion-item").forEach((item) => {
      item.addEventListener("click", () => {
        const text = item.querySelector("span").textContent;
        document.getElementById("searchInput").value = text;
        this.performSearch(text);
        this.clearSuggestions();
      });
    });
  }

  clearSuggestions() {
    const container = document.getElementById("searchSuggestions");
    if (container) {
      container.classList.remove("active");
      container.innerHTML = "";
    }
  }

  performSearch(query) {
    if (!query.trim()) return;

    const urlPattern =
      /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    const isUrl = urlPattern.test(query) || query.includes(".");

    if (isUrl) {
      const url = query.startsWith("http") ? query : `https://${query}`;
      window.location.href = url;
    } else {
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

    // === SETTINGS ===
    // Change this to -1 or +1 if the date is off for Pakistan
    const hijriOffset = 0;

    // 1. Standard Time
    const timeString = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    // 2. Gregorian Date
    const dateString = now.toLocaleDateString([], {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    // 3. Islamic (Hijri) Date (With Offset Correction)
    const islamicDate = new Date(now);
    islamicDate.setDate(islamicDate.getDate() + hijriOffset); // Apply offset

    const islamicString = new Intl.DateTimeFormat(
      "en-US-u-ca-islamic-umalqura",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    ).format(islamicDate);

    // Result: 11:30 AM • Sunday, January 4 • Rajab 14, 1447 AH
    timeElement.textContent = `${timeString} • ${dateString} • ${islamicString}`;
  }

  async loadBookmarks() {
    const bookmarksGrid = document.getElementById("bookmarksGrid");

    try {
      let shortcuts = [];
      try {
        const topSites = await chrome.topSites.get();
        shortcuts = topSites.slice(0, 6);
      } catch (error) {
        console.log("Top sites not available");
      }

      const bookmarkTree = await chrome.bookmarks.getTree();
      const bookmarks = this.extractBookmarks(
        bookmarkTree[0],
        8 - shortcuts.length
      );

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
          <div class="bookmark-title">${this.truncateText(item.title, 30)}</div>
          <div class="bookmark-url">${this.getDomainFromUrl(item.url)}</div>
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
      const historyItems = await chrome.history.search({
        text: "",
        maxResults: 6,
        startTime: Date.now() - 7 * 24 * 60 * 60 * 1000,
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
            <div class="history-url">${this.getDomainFromUrl(item.url)}</div>
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
    const starCount = 40;

    for (let i = 0; i < starCount; i++) {
      const star = document.createElement("div");
      star.className = "star";
      star.style.left = Math.random() * 100 + "%";
      star.style.top = Math.random() * 100 + "%";
      star.style.animationDelay = Math.random() * 4 + "s";

      const size = Math.random() * 2 + 1;
      star.style.width = size + "px";
      star.style.height = size + "px";

      starsContainer.appendChild(star);
    }
  }

  createFloatingElements() {
    const floatingContainer = document.getElementById("floatingElements");
    const elementCount = 5;

    for (let i = 0; i < elementCount; i++) {
      const element = document.createElement("div");
      element.className = "floating-element floating-circle";
      element.style.left = Math.random() * 100 + "%";
      element.style.animationDelay = Math.random() * 20 + "s";
      element.style.animationDuration = Math.random() * 15 + 20 + "s";

      const size = Math.random() * 6 + 3;
      element.style.width = size + "px";
      element.style.height = size + "px";

      floatingContainer.appendChild(element);
    }
  }

  initParticleSystem() {
    for (let i = 0; i < this.settings.particleCount; i++) {
      this.createParticle();
    }
    this.animateParticles();
  }

  createParticle() {
    if (this.activeParticles >= this.settings.particleCount) return;

    const particle = document.createElement("div");
    const particleTypes = ["circle", "glow"];
    const randomType =
      particleTypes[Math.floor(Math.random() * particleTypes.length)];

    particle.className = `particle particle-${randomType}`;
    particle.style.left = Math.random() * window.innerWidth + "px";

    const size = Math.random() * 4 + 1;
    particle.style.width = size + "px";
    particle.style.height = size + "px";

    particle.style.animationDelay = Math.random() * 5 + "s";
    particle.style.animationDuration = Math.random() * 10 + 20 + "s";

    document.getElementById("particleCanvas").appendChild(particle);
    this.activeParticles++;

    setTimeout(() => {
      if (particle.parentNode) {
        particle.parentNode.removeChild(particle);
        this.activeParticles--;
      }
    }, 30000);
  }

  animateParticles() {
    setInterval(() => {
      if (
        this.settings.animationsEnabled &&
        this.activeParticles < this.settings.particleCount
      ) {
        this.createParticle();
      }
    }, 1500);
  }

  handleMouseMove(e) {
    if (!this.settings.animationsEnabled) return;

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
    try {
      chrome.action.openPopup();
    } catch (error) {
      this.showSettingsModal();
    }
  }

  showGoogleApps() {
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

    // Updated with SVG Icons instead of Emojis
    modalContent.innerHTML = `
      <h3 style="margin-bottom: 30px; font-size: 1.8rem; color: #a855f7; text-align: center;">Google Workspace</h3>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px;">
        
        <a href="https://drive.google.com" target="_self" class="app-link">
          <div class="app-icon-dark">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
          </div>
          <span>Drive</span>
        </a>

        <a href="https://docs.google.com" target="_self" class="app-link">
          <div class="app-icon-dark">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          </div>
          <span>Docs</span>
        </a>

        <a href="https://sheets.google.com" target="_self" class="app-link">
          <div class="app-icon-dark">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>
          </div>
          <span>Sheets</span>
        </a>

        <a href="https://slides.google.com" target="_self" class="app-link">
          <div class="app-icon-dark">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
          </div>
          <span>Slides</span>
        </a>

        <a href="https://calendar.google.com" target="_self" class="app-link">
          <div class="app-icon-dark">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          </div>
          <span>Calendar</span>
        </a>

        <a href="https://meet.google.com" target="_self" class="app-link">
          <div class="app-icon-dark">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
          </div>
          <span>Meet</span>
        </a>
      </div>
      <div style="text-align: center;">
        <button id="closeGoogleAppsBtn" class="close-modal-btn">Close</button>
      </div>
    `;

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

    const closeBtn = modal.querySelector("#closeGoogleAppsBtn");
    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        document.body.removeChild(modal);
        document.head.removeChild(modalStyle);
      });
    }

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
        document.head.removeChild(modalStyle);
      }
    });
  }
  showSettingsModal() {
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

  initSectionToggles() {
    this.loadSectionStates();
    setTimeout(() => {
      this.setSectionMaxHeights();
    }, 500);
  }

  setupSectionToggleListeners() {
    const quickAccessHeader = document.getElementById("quickAccessHeader");
    const recentHeader = document.getElementById("recentHeader");

    if (quickAccessHeader) {
      quickAccessHeader.addEventListener("click", () => {
        this.toggleSection("quickAccess");
      });
    }

    if (recentHeader) {
      recentHeader.addEventListener("click", () => {
        this.toggleSection("recent");
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
      quickAccess: {
        header: "quickAccessHeader",
        content: "quickAccessContent",
      },
      recent: { header: "recentHeader", content: "recentContent" },
    };

    const { header: headerId, content: contentId } = sectionIdMap[sectionName];
    const headerElement = document.getElementById(headerId);
    const contentElement = document.getElementById(contentId);

    if (headerElement && contentElement) {
      if (isCollapsed) {
        headerElement.classList.add("collapsed");
        contentElement.classList.add("collapsed");
      } else {
        headerElement.classList.remove("collapsed");
        contentElement.classList.remove("collapsed");
      }
    }
  }

  setSectionMaxHeights() {
    const quickAccessContent = document.getElementById("quickAccessContent");
    const recentContent = document.getElementById("recentContent");

    if (quickAccessContent) {
      const height = quickAccessContent.scrollHeight;
      quickAccessContent.style.maxHeight = height + "px";
    }

    if (recentContent) {
      const height = recentContent.scrollHeight;
      recentContent.style.maxHeight = height + "px";
    }
  }

  loadSectionStates() {
    Object.keys(this.settings.sectionsCollapsed).forEach((sectionName) => {
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
  // Weather Functionality (keeping existing code)
  async initWeather() {
    if (!this.settings.weather.enabled) {
      document.getElementById("weatherWidget").style.display = "none";
      return;
    }

    this.setupWeatherEventListeners();
    await this.loadWeather();

    setInterval(() => {
      this.loadWeather();
    }, this.settings.weather.cacheDuration);
  }

  getActiveApiKey() {
    if (
      this.settings.weather.apiKey &&
      this.settings.weather.apiKey.trim() !== "" &&
      this.settings.weather.apiKey !== "YOUR_API_KEY"
    ) {
      return this.settings.weather.apiKey;
    }

    if (this.settings.weather.defaultApiKey) {
      return this.settings.weather.defaultApiKey;
    }

    return null;
  }

  setupWeatherEventListeners() {
    const retryBtn = document.getElementById("retryWeather");
    if (retryBtn) {
      retryBtn.addEventListener("click", () => {
        this.loadWeather();
      });
    }

    const refreshBtn = document.getElementById("weatherRefresh");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        this.handleWeatherRefresh();
      });
    }
  }

  async loadWeather() {
    const weatherWidget = document.getElementById("weatherWidget");
    const weatherLoading = document.getElementById("weatherLoading");
    const weatherContent = document.getElementById("weatherContent");
    const weatherError = document.getElementById("weatherError");

    if (this.isWeatherCacheValid()) {
      this.displayWeather(this.settings.weather.cacheData);
      return;
    }

    weatherLoading.style.display = "flex";
    weatherContent.style.display = "none";
    weatherError.style.display = "none";

    try {
      let coords;

      if (this.settings.weather.location) {
        try {
          coords = await this.geocodeLocation(this.settings.weather.location);
        } catch (error) {
          coords = await this.getCurrentLocation();
        }
      } else {
        try {
          coords = await this.getCurrentLocation();
        } catch (error) {
          coords = { lat: 51.5074, lon: -0.1278 };
        }
      }

      if (!coords) {
        throw new Error("Unable to get location");
      }

      const weatherData = await this.fetchWeatherData(coords.lat, coords.lon);

      this.settings.weather.cacheData = weatherData;
      this.settings.weather.lastUpdate = Date.now();
      this.saveSettings();

      this.displayWeather(weatherData);
    } catch (error) {
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
        reject(new Error("Geolocation not supported by browser"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (error) => {
          let message = "Location access denied";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = "Location permission denied";
              break;
            case error.POSITION_UNAVAILABLE:
              message = "Location unavailable";
              break;
            case error.TIMEOUT:
              message = "Location request timed out";
              break;
          }
          reject(new Error(message));
        },
        { timeout: 15000, enableHighAccuracy: false, maximumAge: 300000 }
      );
    });
  }

  async geocodeLocation(locationName) {
    const geocodeUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
      locationName
    )}&limit=1&appid=${this.settings.weather.apiKey}`;

    try {
      const response = await fetch(geocodeUrl);
      const data = await response.json();

      if (data.length > 0) {
        return {
          lat: data[0].lat,
          lon: data[0].lon,
        };
      }
      throw new Error("Location not found");
    } catch (error) {
      throw new Error("Failed to find location");
    }
  }

  async fetchWeatherData(lat, lon) {
    const apiKey = this.getActiveApiKey();

    if (!apiKey) {
      return this.getMockWeatherData();
    }

    try {
      const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${this.settings.weather.unit}`;

      const response = await fetch(weatherUrl);

      if (!response.ok) {
        if (response.status === 401) {
          return this.getMockWeatherData();
        }
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error.message.includes("401") || error.message.includes("API")) {
        return this.getMockWeatherData();
      }
      throw new Error("Weather service unavailable");
    }
  }

  getMockWeatherData() {
    const hour = new Date().getHours();
    const isDay = hour >= 6 && hour < 18;

    const weatherConditions = [
      { main: "Clear", description: "clear sky", icon: isDay ? "01d" : "01n" },
      {
        main: "Clouds",
        description: "few clouds",
        icon: isDay ? "02d" : "02n",
      },
      {
        main: "Clouds",
        description: "scattered clouds",
        icon: isDay ? "03d" : "03n",
      },
      { main: "Rain", description: "light rain", icon: "10d" },
    ];

    const randomWeather =
      weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
    const baseTemp = 18 + Math.random() * 12;

    return {
      name: "Demo Location",
      sys: { country: "XX" },
      main: {
        temp: Math.round(baseTemp),
        feels_like: Math.round(baseTemp + (Math.random() * 4 - 2)),
        humidity: Math.round(40 + Math.random() * 40),
      },
      weather: [randomWeather],
      wind: {
        speed: Math.round((Math.random() * 8 + 2) * 100) / 100,
      },
    };
  }

  displayWeather(data) {
    const weatherLoading = document.getElementById("weatherLoading");
    const weatherContent = document.getElementById("weatherContent");
    const weatherError = document.getElementById("weatherError");

    weatherLoading.style.display = "none";
    weatherError.style.display = "none";

    document.getElementById("weatherTemp").textContent = `${Math.round(
      data.main.temp
    )}°`;
    document.getElementById("weatherDesc").textContent =
      data.weather[0].description;
    document.getElementById("weatherLocation").textContent = data.name;
    document.getElementById("feelsLike").textContent = `${Math.round(
      data.main.feels_like
    )}°`;
    document.getElementById("humidity").textContent = `${data.main.humidity}%`;
    const windSpeed =
      this.settings.weather.unit === "imperial"
        ? Math.round(data.wind.speed) + " mph"
        : Math.round(data.wind.speed * 3.6) + " km/h";
    document.getElementById("windSpeed").textContent = windSpeed;

    const iconUrl = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
    const weatherIcon = document.getElementById("weatherIcon");
    weatherIcon.src = iconUrl;
    weatherIcon.alt = data.weather[0].description;

    weatherContent.style.display = "block";
  }

  displayWeatherError(message) {
    const weatherLoading = document.getElementById("weatherLoading");
    const weatherContent = document.getElementById("weatherContent");
    const weatherError = document.getElementById("weatherError");
    const errorMessage = document.getElementById("errorMessage");

    weatherLoading.style.display = "none";
    weatherContent.style.display = "none";

    errorMessage.textContent = message;
    weatherError.style.display = "block";
  }

  async handleWeatherRefresh() {
    const refreshBtn = document.getElementById("weatherRefresh");

    if (refreshBtn) {
      refreshBtn.classList.add("refreshing");
    }

    await this.refreshWeatherData();

    setTimeout(() => {
      if (refreshBtn) {
        refreshBtn.classList.remove("refreshing");
      }
    }, 1000);
  }

  async refreshWeatherData() {
    this.settings.weather.cacheData = null;
    this.settings.weather.lastUpdate = null;
    await this.saveSettings();
    await this.loadWeather();
  }

  // ================= FINANCE TICKER (Single Pair) =================
  async initFinance() {
    const widget = document.getElementById("financeWidget");
    if (!this.settings.finance || !this.settings.finance.enabled) {
      if (widget) widget.style.display = "none";
      return;
    }
    if (widget) widget.style.display = "flex"; // Flex for centering

    const refreshBtn = document.getElementById("financeRefresh");
    if (refreshBtn) refreshBtn.onclick = () => this.loadFinance(true);

    await this.loadFinance();

    // Refresh every 15 mins
    const duration = this.settings.finance.cacheDuration || 900000;
    setInterval(() => this.loadFinance(), duration);
  }

  async loadFinance(force = false) {
    const loading = document.getElementById("financeLoading");
    const content = document.getElementById("financeContent");
    const error = document.getElementById("financeError");
    const empty = document.getElementById("financeEmpty");

    const fromCurr = this.settings.finance.fromCurrency;
    const toCurr = this.settings.finance.toCurrency;

    // Check if empty
    if (!fromCurr || !toCurr) {
      loading.style.display = "none";
      content.style.display = "none";
      error.style.display = "none";
      empty.style.display = "block";
      return;
    }

    // Check Cache
    if (
      !force &&
      this.settings.finance.cacheData &&
      this.settings.finance.lastUpdate
    ) {
      const age = Date.now() - this.settings.finance.lastUpdate;
      if (age < (this.settings.finance.cacheDuration || 900000)) {
        this.displayFinance(this.settings.finance.cacheData);
        return;
      }
    }

    // Load New
    loading.style.display = "block";
    content.style.display = "none";
    error.style.display = "none";
    empty.style.display = "none";

    try {
      const apiKey = this.settings.finance.apiKey || "demo";
      const url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${fromCurr}&to_currency=${toCurr}&apikey=${apiKey}`;

      const res = await fetch(url);
      const json = await res.json();

      if (json["Note"] || !json["Realtime Currency Exchange Rate"])
        throw new Error("API Limit/Error");

      const r = json["Realtime Currency Exchange Rate"];
      const data = {
        from: r["1. From_Currency Code"],
        to: r["3. To_Currency Code"],
        rate: parseFloat(r["5. Exchange Rate"]),
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      this.settings.finance.cacheData = data;
      this.settings.finance.lastUpdate = Date.now();
      this.saveSettings();

      this.displayFinance(data);
    } catch (e) {
      console.error(e);
      loading.style.display = "none";
      error.style.display = "block";
    }
  }

  displayFinance(data) {
    document.getElementById("financeLoading").style.display = "none";
    document.getElementById("financeContent").style.display = "flex"; // Flex for layout

    document.getElementById("tickerFrom").textContent = data.from;
    document.getElementById("tickerTo").textContent = data.to;
    document.getElementById("tickerRate").textContent = data.rate.toFixed(2);
    document.getElementById("tickerTime").textContent = "Updated " + data.time;
  }

  // ==================== SPORTS WIDGET FUNCTIONALITY ====================

  async initSports() {
    if (!this.settings.sports.enabled) {
      document.getElementById("sportsWidget").style.display = "none";
      return;
    }

    this.setupSportsEventListeners();
    await this.loadSports();

    setInterval(() => {
      this.loadSports();
    }, this.settings.sports.cacheDuration);
  }

  getActiveSportsApiKey() {
    if (
      this.settings.sports.apiKey &&
      this.settings.sports.apiKey.trim() !== "" &&
      this.settings.sports.apiKey !== "YOUR_API_KEY"
    ) {
      console.log("Using user-provided sports API key");
      return this.settings.sports.apiKey;
    }

    if (this.settings.sports.defaultApiKey) {
      console.log("Using shared sports API key");
      return this.settings.sports.defaultApiKey;
    }

    return null;
  }

  setupSportsEventListeners() {
    const retryBtn = document.getElementById("retrySports");
    if (retryBtn) {
      retryBtn.addEventListener("click", () => {
        this.loadSports();
      });
    }

    const refreshBtn = document.getElementById("sportsRefresh");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        this.handleSportsRefresh();
      });
    }
  }

  async loadSports() {
    const sportsWidget = document.getElementById("sportsWidget");
    const sportsLoading = document.getElementById("sportsLoading");
    const sportsContent = document.getElementById("sportsContent");
    const sportsError = document.getElementById("sportsError");
    const sportsEmpty = document.getElementById("sportsEmpty");

    // Check if team is set
    if (
      !this.settings.sports.teamName ||
      this.settings.sports.teamName.trim() === ""
    ) {
      sportsLoading.style.display = "none";
      sportsContent.style.display = "none";
      sportsError.style.display = "none";
      sportsEmpty.style.display = "block";
      return;
    }

    // Check cache first
    if (this.isSportsCacheValid()) {
      this.displaySports(this.settings.sports.cacheData);
      return;
    }

    // Show loading state
    sportsLoading.style.display = "flex";
    sportsContent.style.display = "none";
    sportsError.style.display = "none";
    sportsEmpty.style.display = "none";

    try {
      const apiKey = this.getActiveSportsApiKey();

      if (!apiKey) {
        throw new Error("No API key available");
      }

      // Search for team
      const teamData = await this.searchTeam(
        this.settings.sports.teamName,
        apiKey
      );

      if (!teamData) {
        throw new Error("Team not found");
      }

      // Fetch last and next matches
      const lastMatches = await this.fetchLastMatches(teamData.idTeam, apiKey);
      const nextMatches = await this.fetchNextMatches(teamData.idTeam, apiKey);

      const sportsData = {
        team: teamData,
        lastMatch:
          lastMatches && lastMatches.length > 0 ? lastMatches[0] : null,
        nextMatch:
          nextMatches && nextMatches.length > 0 ? nextMatches[0] : null,
      };

      // Cache the data
      this.settings.sports.cacheData = sportsData;
      this.settings.sports.lastUpdate = Date.now();
      this.saveSettings();

      // Display sports data
      this.displaySports(sportsData);
    } catch (error) {
      console.error("Sports error:", error);
      this.displaySportsError(error.message);
    }
  }

  isSportsCacheValid() {
    if (!this.settings.sports.cacheData || !this.settings.sports.lastUpdate) {
      return false;
    }

    const timeSinceUpdate = Date.now() - this.settings.sports.lastUpdate;
    return timeSinceUpdate < this.settings.sports.cacheDuration;
  }

  async searchTeam(teamName, apiKey) {
    try {
      const searchUrl = `https://www.thesportsdb.com/api/v1/json/${apiKey}/searchteams.php?t=${encodeURIComponent(
        teamName
      )}`;

      console.log("Searching for team:", teamName);
      const response = await fetch(searchUrl);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.teams && data.teams.length > 0) {
        console.log("Team found:", data.teams[0].strTeam);
        return data.teams[0];
      }

      return null;
    } catch (error) {
      console.error("Team search error:", error);
      throw new Error("Failed to search team");
    }
  }

  async fetchLastMatches(teamId, apiKey) {
    try {
      const url = `https://www.thesportsdb.com/api/v1/json/${apiKey}/eventslast.php?id=${teamId}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error("Last matches error:", error);
      return [];
    }
  }

  async fetchNextMatches(teamId, apiKey) {
    try {
      const url = `https://www.thesportsdb.com/api/v1/json/${apiKey}/eventsnext.php?id=${teamId}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data.events || [];
    } catch (error) {
      console.error("Next matches error:", error);
      return [];
    }
  }

  displaySports(data) {
    const sportsLoading = document.getElementById("sportsLoading");
    const sportsContent = document.getElementById("sportsContent");
    const sportsError = document.getElementById("sportsError");
    const sportsEmpty = document.getElementById("sportsEmpty");

    // Hide loading, error, and empty states
    sportsLoading.style.display = "none";
    sportsError.style.display = "none";
    sportsEmpty.style.display = "none";

    // Display team info
    const teamBadge = document.getElementById("teamBadge");
    const teamName = document.getElementById("teamName");
    const teamLeague = document.getElementById("teamLeague");

    if (data.team.strTeamBadge) {
      teamBadge.src = data.team.strTeamBadge;
      teamBadge.alt = data.team.strTeam;
      teamBadge.style.display = "block";
    } else {
      teamBadge.style.display = "none";
    }

    teamName.textContent = data.team.strTeam || "--";
    teamLeague.textContent = data.team.strLeague || "--";

    // Display last match
    if (data.lastMatch) {
      this.displayMatch(data.lastMatch, "last", data.team.strTeam);
    } else {
      this.displayNoMatch("last");
    }

    // Display next match
    if (data.nextMatch) {
      this.displayMatch(data.nextMatch, "next", data.team.strTeam);
    } else {
      this.displayNoMatch("next");
    }

    // Show sports content
    sportsContent.style.display = "block";
  }

  displayMatch(match, type, currentTeam) {
    const prefix = type === "last" ? "last" : "next";

    // Team names
    const homeTeam = match.strHomeTeam || "--";
    const awayTeam = match.strAwayTeam || "--";

    document.getElementById(`${prefix}HomeTeam`).textContent = homeTeam;
    document.getElementById(`${prefix}AwayTeam`).textContent = awayTeam;

    // Team badges
    const homeBadge = document.getElementById(`${prefix}HomeBadge`);
    const awayBadge = document.getElementById(`${prefix}AwayBadge`);

    if (match.strHomeTeamBadge) {
      homeBadge.src = match.strHomeTeamBadge;
      homeBadge.alt = homeTeam;
      homeBadge.style.display = "block";
    } else {
      homeBadge.style.display = "none";
    }

    if (match.strAwayTeamBadge) {
      awayBadge.src = match.strAwayTeamBadge;
      awayBadge.alt = awayTeam;
      awayBadge.style.display = "block";
    } else {
      awayBadge.style.display = "none";
    }

    // Score (for last match) or VS (for next match)
    if (type === "last") {
      const homeScore = match.intHomeScore !== null ? match.intHomeScore : "-";
      const awayScore = match.intAwayScore !== null ? match.intAwayScore : "-";
      document.getElementById(
        "lastScore"
      ).textContent = `${homeScore} : ${awayScore}`;
    }

    // Competition/League
    document.getElementById(`${prefix}Competition`).textContent =
      match.strLeague || "--";

    // Date
    const matchDate = this.formatMatchDate(match.dateEvent, match.strTime);
    document.getElementById(`${prefix}Date`).textContent = matchDate;
  }

  displayNoMatch(type) {
    const prefix = type === "last" ? "last" : "next";

    document.getElementById(`${prefix}HomeTeam`).textContent = "--";
    document.getElementById(`${prefix}AwayTeam`).textContent = "--";

    const homeBadge = document.getElementById(`${prefix}HomeBadge`);
    const awayBadge = document.getElementById(`${prefix}AwayBadge`);
    homeBadge.style.display = "none";
    awayBadge.style.display = "none";

    if (type === "last") {
      document.getElementById("lastScore").textContent = "- : -";
    }

    document.getElementById(`${prefix}Competition`).textContent = "No data";
    document.getElementById(`${prefix}Date`).textContent = "--";
  }

  formatMatchDate(dateString, timeString) {
    if (!dateString) return "--";

    try {
      const date = new Date(dateString + (timeString ? " " + timeString : ""));
      const now = new Date();
      const diffDays = Math.floor((date - now) / (1000 * 60 * 60 * 24));

      // Format based on proximity
      if (Math.abs(diffDays) === 0) {
        return "Today" + (timeString ? ` at ${timeString}` : "");
      } else if (diffDays === 1) {
        return "Tomorrow" + (timeString ? ` at ${timeString}` : "");
      } else if (diffDays === -1) {
        return "Yesterday" + (timeString ? ` at ${timeString}` : "");
      } else {
        const options = { month: "short", day: "numeric" };
        const formattedDate = date.toLocaleDateString("en-US", options);
        return formattedDate + (timeString ? ` at ${timeString}` : "");
      }
    } catch (error) {
      return dateString;
    }
  }

  displaySportsError(message) {
    const sportsLoading = document.getElementById("sportsLoading");
    const sportsContent = document.getElementById("sportsContent");
    const sportsError = document.getElementById("sportsError");
    const sportsEmpty = document.getElementById("sportsEmpty");
    const errorMessage = document.getElementById("sportsErrorMessage");

    sportsLoading.style.display = "none";
    sportsContent.style.display = "none";
    sportsEmpty.style.display = "none";

    errorMessage.textContent = message;
    sportsError.style.display = "block";
  }

  async handleSportsRefresh() {
    const refreshBtn = document.getElementById("sportsRefresh");

    if (refreshBtn) {
      refreshBtn.classList.add("refreshing");
    }

    await this.refreshSportsData();

    setTimeout(() => {
      if (refreshBtn) {
        refreshBtn.classList.remove("refreshing");
      }
    }, 1000);
  }

  async refreshSportsData() {
    this.settings.sports.cacheData = null;
    this.settings.sports.lastUpdate = null;
    await this.saveSettings();
    await this.loadSports();
  }
}

// Fade out widgets on scroll
const weatherWidget = document.querySelector(".weather-container");
const financeWidget = document.querySelector(".finance-container");

window.addEventListener("scroll", () => {
  const shouldHide = window.scrollY > 100;

  // Fade Weather
  if (weatherWidget) {
    weatherWidget.style.opacity = shouldHide ? "0" : "1";
    weatherWidget.style.pointerEvents = shouldHide ? "none" : "auto";
  }

  // Fade Finance
  if (financeWidget) {
    financeWidget.style.opacity = shouldHide ? "0" : "1";
    financeWidget.style.pointerEvents = shouldHide ? "none" : "auto";
  }
});

// CSS for fadeOut animation
const style = document.createElement("style");
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 0.5; transform: scale(1); }
        to { opacity: 0; transform: scale(0); }
    }
`;
document.head.appendChild(style);

// Initialize the extension safely (Run only ONCE)
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => new XAIExtension());
} else {
  new XAIExtension();
}
