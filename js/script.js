// xAI Chrome Extension - Main Script with Sports Widget
class XAIExtension {
  constructor() {
    this.chatHistory = [];
    this.settings = {
      animationsEnabled: true,
      particleCount: 15,
      userName: "",
      customBookmarks: [],
      sectionsCollapsed: {
        quickAccess: true,
        recent: true,
      },
      ai: {
        enabled: false,
        apiKey: "", // This loads from your Popup settings
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
        team1: "",
        team2: "",
        lastUpdate1: null,
        lastUpdate2: null,
        cacheData1: null,
        cacheData2: null,
        cacheDuration: 15 * 60 * 1000,
      },
      finance: {
        enabled: true,
        ticker1From: "BTC",
        ticker1To: "USD",
        ticker2From: "EUR",
        ticker2To: "USD",
        cacheData1: null,
        cacheData2: null,
        lastUpdate1: null,
        lastUpdate2: null,
        cacheDuration: 900000,
      },
      gold: {
        enabled: true,
        cacheData: null,
        lastUpdate: null,
        cacheDuration: 900000,
      },
      psx: {
        enabled: true,
      },
      todoList: [],
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
    this.initGold();
    this.initTodo();
    this.initPsx();
    this.updateGreeting();
    this.updateTime();
    this.loadBookmarks();
    this.loadHistory();
    setInterval(() => this.updateTime(), 1000);
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.local.get(["xaiSettings"]);
      if (result.xaiSettings) {
        const saved = result.xaiSettings;
        // Deep merge each sub-object so partial/stale storage can't corrupt defaults
        this.settings = {
          ...this.settings,
          ...saved,
          sports:  { ...this.settings.sports,  ...(saved.sports  || {}) },
          finance: { ...this.settings.finance, ...(saved.finance || {}) },
          gold:    { ...this.settings.gold,    ...(saved.gold    || {}) },
          psx:     { ...this.settings.psx,     ...(saved.psx     || {}) },
          weather: { ...this.settings.weather, ...(saved.weather || {}) },
          ai:      { ...this.settings.ai,      ...(saved.ai      || {}) },
        };
      }
    } catch (error) {
      console.log("Settings loaded from default values");
    }
  }

  async saveSettings() {
    try {
      // Strip runtime cache before saving so stale prices never persist across reloads
      const toSave = {
        ...this.settings,
        finance: this.settings.finance ? {
          ...this.settings.finance,
          cacheData1: undefined,
          cacheData2: undefined,
          lastUpdate1: undefined,
          lastUpdate2: undefined,
        } : this.settings.finance,
        sports: this.settings.sports ? {
          ...this.settings.sports,
          cacheData1: undefined,
          cacheData2: undefined,
          lastUpdate1: undefined,
          lastUpdate2: undefined,
        } : this.settings.sports,
      };
      // Set flag BEFORE writing — onChanged fires async but before this setTimeout clears it
      this._savingFromNewtab = true;
      await chrome.storage.local.set({ xaiSettings: toSave });
      setTimeout(() => { this._savingFromNewtab = false; }, 200);
    } catch (error) {
      this._savingFromNewtab = false;
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
    // Debounce the search input to prevent API flooding
    searchInput.addEventListener(
      "input",
      this.debounce((e) => {
        this.handleSearchInput(e.target.value);
      }, 300),
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

    this.setupSectionToggleListeners();

    setTimeout(() => {
      searchInput.focus();
    }, 500);

    // === PRIMARY settings sync: chrome.storage.onChanged ===
    // Fires directly whenever popup saves — no message passing needed.
    // This is more reliable than chrome.tabs.sendMessage which can be dropped.
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace !== "local" || !changes.xaiSettings) return;
      // Ignore writes that THIS newtab page made (via saveSettings) to avoid infinite loop
      if (this._savingFromNewtab) return;
      const newSettings = changes.xaiSettings.newValue;
      if (!newSettings) return;

      console.log("[storage.onChanged] xaiSettings updated");

      // Deep-merge new settings into memory
      this.settings = {
        ...this.settings,
        ...newSettings,
        sports:  { ...this.settings.sports,  ...(newSettings.sports  || {}) },
        finance: { ...this.settings.finance, ...(newSettings.finance || {}) },
        gold:    { ...this.settings.gold,    ...(newSettings.gold    || {}) },
        psx:     { ...this.settings.psx,     ...(newSettings.psx     || {}) },
        weather: { ...this.settings.weather, ...(newSettings.weather || {}) },
        ai:      { ...this.settings.ai,      ...(newSettings.ai      || {}) },
      };

      // Finance: wipe cache then reinit with new tickers
      if (newSettings.finance) {
        this.settings.finance = {
          ...this.settings.finance,
          ...newSettings.finance,
          cacheData1: null,
          cacheData2: null,
          lastUpdate1: null,
          lastUpdate2: null,
        };
        this.initFinance();
      }

      // Sports: wipe cache then refresh
      if (newSettings.sports) {
        this.settings.sports = {
          ...this.settings.sports,
          ...newSettings.sports,
          cacheData1: null,
          cacheData2: null,
          lastUpdate1: null,
          lastUpdate2: null,
        };
        this.refreshSportsData();
      }

      // Gold: reinit if changed
      if (newSettings.gold) this.initGold();

      // PSX: reinit if changed
      if (newSettings.psx) this.initPsx();

      // Weather: refresh if changed
      if (newSettings.weather) this.refreshWeatherData();

      this.updateGreeting();
    });

    // === FALLBACK: message-based listener (kept for backward compat) ===
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === "settingsUpdated") {
        // The storage.onChanged listener above handles everything.
        // Just acknowledge receipt.
        console.log("[message] settingsUpdated received (handled by storage.onChanged)");
        sendResponse({ success: true });
      }
      return true;
    });

    // === AI BUTTON LISTENERS ===

    // 1. Toggle AI Mode
    const aiToggle = document.getElementById("aiToggle");
    if (aiToggle) {
      aiToggle.addEventListener("click", () => this.toggleAIMode());
    }

    // 2. Microphone Button
    const micBtn = document.getElementById("micButton");
    if (micBtn) {
      micBtn.addEventListener("click", () => this.startVoiceInput());
    }

    // 3. Stop Voice Button (NEW)
    const stopVoiceBtn = document.getElementById("stopVoiceBtn");
    if (stopVoiceBtn) {
      stopVoiceBtn.addEventListener("click", () => {
        window.speechSynthesis.cancel(); // Kill audio
        stopVoiceBtn.style.display = "none"; // Hide button
      });
    }

    // 3. Close AI Result Window
    const closeAiBtn = document.getElementById("closeAiModal");
    if (closeAiBtn) {
      closeAiBtn.addEventListener("click", () => {
        document.getElementById("aiModal").classList.remove("active");
        window.speechSynthesis.cancel();
        // REMOVE THE MASTER CLASS
        document.body.classList.remove("ai-active");
        document.getElementById("searchInput").value = "";

        const widgets = [
          ".weather-container",
          ".sports-container",
          ".finance-container",
          ".gold-container",
        ];
        widgets.forEach((selector) => {
          const el = document.querySelector(selector);
          if (el) {
            el.style.opacity = "1";
            el.style.pointerEvents = "auto";
          }
        });
      });
    }

    // 5. Close on Escape Key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const aiModal = document.getElementById("aiModal");
        if (aiModal && aiModal.classList.contains("active")) {
          // Trigger the close button click to run all cleanup logic
          closeAiBtn.click();
        }
      }
    });

    // ... existing listeners ...

    // 5. AI Reply Input (Enter Key)
    const replyInput = document.getElementById("aiReplyInput");
    const replySend = document.getElementById("aiReplySend");
    const replyMic = document.getElementById("aiReplyMic");

    if (replyInput) {
      replyInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") this.sendReply();
      });
    }

    if (replySend) {
      replySend.addEventListener("click", () => this.sendReply());
    }

    if (replyMic) {
      replyMic.addEventListener("click", () => this.startReplyVoice());
    }

    // 6. Keyboard Shortcut (Alt + J) -> Trigger Voice
    document.addEventListener("keydown", (e) => {
      // Check for Alt + J
      if (e.altKey && (e.key === "j" || e.key === "J")) {
        e.preventDefault();
        this.startVoiceInput();
      }
    });
  }

  // === HELPER METHODS ===
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // === SEARCH SUGGESTION LOGIC ===
  async handleSearchInput(query) {
    // 1. IF AI MODE IS ON -> KILL SUGGESTIONS
    if (this.settings.ai && this.settings.ai.enabled) {
      this.clearSuggestions(); // Clear any existing ones
      return; // Stop here. Do not call Google.
    }

    // 2. STANDARD MODE -> FETCH SUGGESTIONS
    if (!query || query.length < 1) {
      this.clearSuggestions();
      return;
    }

    try {
      const res = await fetch(
        `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(
          query,
        )}`,
      );
      const data = await res.json();
      this.showSuggestions(data[1]);
    } catch (error) {
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
    `,
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

    // 1. CHECK IF AI MODE IS ON
    if (this.settings.ai && this.settings.ai.enabled) {
      this.handleAIQuery(query);
      return; // Stop here, don't open Google
    }

    // 2. STANDARD SEARCH (Google / URL)
    const urlPattern =
      /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    const isUrl = urlPattern.test(query) || query.includes(".");

    if (isUrl) {
      const url = query.startsWith("http") ? query : `https://${query}`;
      window.location.href = url;
    } else {
      window.location.href = `https://www.google.com/search?q=${encodeURIComponent(
        query,
      )}`;
    }
  }

  updateGreeting() {
    const greetingElement = document.getElementById("greetingText");
    const hour = new Date().getHours();
    let timeGreeting = "Good Evening";
    if (hour < 12) timeGreeting = "Good Morning";
    else if (hour < 18) timeGreeting = "Good Afternoon";

    const hasName = this.settings.userName && this.settings.userName.trim() !== "";
    const nameStr = hasName ? `, ${this.settings.userName}` : "";
    const fullText = timeGreeting + nameStr;
    const immediateHTML = timeGreeting + (hasName ? `, <span class="username-glow">${this.settings.userName}</span>` : "");

    // Check if we have already shown the animation in this session
    if (sessionStorage.getItem("greetingShown")) {
      // If yes, just show the HTML immediately (no animation)
      greetingElement.innerHTML = immediateHTML;
    } else {
      // If no, run the typewriter effect
      greetingElement.innerHTML = '<span class="typewriter-cursor"></span>';
      let i = 0;
      let currentContainer = greetingElement;

      const typeWriter = () => {
        if (i < fullText.length) {
          let cursor = greetingElement.querySelector(".typewriter-cursor");
          
          // Switch to writing inside the span when we reach the username
          if (hasName && i === timeGreeting.length + 2) {
            let nameSpan = document.createElement("span");
            nameSpan.className = "username-glow";
            greetingElement.insertBefore(nameSpan, cursor);
            currentContainer = nameSpan;
          }

          let letter = document.createTextNode(fullText.charAt(i));
          
          if (currentContainer === greetingElement) {
             greetingElement.insertBefore(letter, cursor);
          } else {
             currentContainer.appendChild(letter);
          }

          i++;
          let randomSpeed = Math.floor(Math.random() * (150 - 50 + 1) + 50);
          setTimeout(typeWriter, randomSpeed);
        } else {
          sessionStorage.setItem("greetingShown", "true");
        }
      };
      typeWriter();
    }
  }
  updateTime() {
    const timeElement = document.getElementById("timeDisplay");
    const now = new Date();

    // === SETTINGS ===
    // Change this to -1 or +1 if the date is off for Pakistan
    const hijriOffset = -1;

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
      },
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
        8 - shortcuts.length,
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
      `,
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
              50,
            )}</div>
            <div class="history-url">${this.getDomainFromUrl(item.url)}</div>
          </div>
        </a>
      `,
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

  // Mouse tracking is now handled by the Cursor Spotlight engine in newtab.html

  openSettings() {
    try {
      chrome.action.openPopup();
    } catch (error) {
      this.showSettingsModal();
    }
  }

  showGoogleApps() {
    const modal = document.createElement("div");
    modal.id = "googleAppsModal";
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(10, 10, 10, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(12px);
      animation: modalBackdropFade 0.3s ease forwards;
    `;

    const modalContent = document.createElement("div");
    modalContent.style.cssText = `
      background: rgba(15, 15, 25, 0.65);
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 20px;
      padding: 40px;
      max-width: 500px;
      width: 90%;
      color: white;
      backdrop-filter: blur(25px);
      box-shadow: 0 0 40px rgba(139, 92, 246, 0.15), 0 25px 50px rgba(0, 0, 0, 0.5);
      animation: modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    `;

    // Updated with SVG Icons instead of Emojis
    // Updated with SVG Icons instead of Emojis
    modalContent.innerHTML = `
      <h3 style="margin-bottom: 30px; font-size: 1.8rem; color: #c4b5fd; text-shadow: 0 0 15px rgba(139,92,246,0.5); text-align: center; letter-spacing: -0.02em;">Google Workspace</h3>
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
      @keyframes modalBackdropFade {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes modalSlideUp {
        from { opacity: 0; transform: translateY(20px) scale(0.98); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes appLinkFade {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .app-link {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 18px;
        background: rgba(15, 15, 25, 0.4);
        border: 1px solid rgba(255,255,255,0.05);
        border-radius: 12px;
        text-decoration: none;
        color: rgba(255,255,255,0.8);
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        font-size: 0.85rem;
        letter-spacing: 0.02em;
        opacity: 0;
        animation: appLinkFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .app-link:nth-child(1) { animation-delay: 0.05s; }
      .app-link:nth-child(2) { animation-delay: 0.1s; }
      .app-link:nth-child(3) { animation-delay: 0.15s; }
      .app-link:nth-child(4) { animation-delay: 0.2s; }
      .app-link:nth-child(5) { animation-delay: 0.25s; }
      .app-link:nth-child(6) { animation-delay: 0.3s; }
      
      .app-link:hover {
        background: rgba(139, 92, 246, 0.1);
        transform: translateY(-4px);
        border-color: rgba(139, 92, 246, 0.4);
        color: #ffffff;
        box-shadow: 0 8px 20px rgba(139, 92, 246, 0.15);
      }
      .app-icon-dark {
        width: 40px;
        height: 40px;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 10px;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #c4b5fd;
        transition: all 0.3s ease;
      }
      .app-link:hover .app-icon-dark {
        background: rgba(139, 92, 246, 0.2);
        color: #ffffff;
        border-color: rgba(139, 92, 246, 0.5);
        box-shadow: 0 0 15px rgba(139, 92, 246, 0.3) inset;
      }
      .close-modal-btn {
        padding: 10px 28px;
        background: rgba(15, 15, 25, 0.6);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 9999px;
        color: rgba(255,255,255,0.5);
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 0.85rem;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }
      .close-modal-btn:hover {
        background: rgba(255,255,255,0.05);
        border-color: rgba(255,255,255,0.25);
        color: #ffffff;
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
        { timeout: 15000, enableHighAccuracy: false, maximumAge: 300000 },
      );
    });
  }

  async geocodeLocation(locationName) {
    const geocodeUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
      locationName,
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
      data.main.temp,
    )}°`;
    document.getElementById("weatherDesc").textContent =
      data.weather[0].description;
    document.getElementById("weatherLocation").textContent = data.name;
    document.getElementById("feelsLike").textContent = `${Math.round(
      data.main.feels_like,
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

  // ================= FINANCE TICKER (2-in-1, Free API) =================

  // CoinGecko ID map for top crypto symbols
  CRYPTO_IDS = {
    BTC: "bitcoin", ETH: "ethereum", BNB: "binancecoin", SOL: "solana",
    XRP: "ripple", ADA: "cardano", DOGE: "dogecoin", DOT: "polkadot",
    MATIC: "matic-network", LTC: "litecoin", LINK: "chainlink", AVAX: "avalanche-2",
    UNI: "uniswap", ATOM: "cosmos", XLM: "stellar", ALGO: "algorand",
    VET: "vechain", FIL: "filecoin", TRX: "tron", SHIB: "shiba-inu",
    SUI: "sui", TON: "the-open-network", APT: "aptos", NEAR: "near",
    ARB: "arbitrum", OP: "optimism", IMX: "immutable-x",
  };

  // Commodity symbols via gold-api.com — only precious metals are reliably supported
  COMMODITY_IDS = {
    XPT: "XPT",   // Platinum
    XPD: "XPD",   // Palladium
    // Note: XTI (WTI Crude) and XBR (Brent Crude) are NOT supported by gold-api.com
    // Use forex codes or crypto for other assets
  };

  isCrypto(symbol) {
    return !!this.CRYPTO_IDS[symbol.toUpperCase()];
  }

  isCommodity(symbol) {
    return !!this.COMMODITY_IDS[symbol.toUpperCase()];
  }

  async fetchTickerData(fromSymbol, toSymbol) {
    const from = fromSymbol.toUpperCase();
    const to = toSymbol.toUpperCase();

    if (this.isCrypto(from)) {
      // === CoinGecko path (crypto) ===
      const coinId = this.CRYPTO_IDS[from];
      const vsCurrency = to.toLowerCase();
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=${vsCurrency}&include_24hr_change=true`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("CoinGecko error");
      const json = await res.json();
      if (!json[coinId] || json[coinId][vsCurrency] === undefined) throw new Error("No crypto data");
      const price = json[coinId][vsCurrency];
      const changePct = json[coinId][`${vsCurrency}_24h_change`] ?? null;
      return { from, to, rate: price, changePct };

    } else if (this.isCommodity(from)) {
      // === gold-api.com path (crude oil, platinum, etc.) ===
      const url = `https://api.gold-api.com/price/${from}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Commodity API error");
      const json = await res.json();
      if (!json.price) throw new Error("No commodity data");
      const price = parseFloat(json.price);

      // Fetch yesterday for % change using fawazahmed0 as proxy
      let changePct = null;
      try {
        // gold-api returns prev_close_price on some endpoints
        if (json.prev_close_price) {
          const prev = parseFloat(json.prev_close_price);
          changePct = ((price - prev) / prev) * 100;
        }
      } catch (e) {
        console.warn("No prev close for commodity", e);
      }

      const displayTo = to === "USD" ? "USD" : to;
      return { from, to: displayTo, rate: price, changePct };

    } else {
      // === fawazahmed0 path (forex: EUR, GBP, JPY, etc.) ===
      // Uses the same CDN API already proven to work in this extension
      const fromLower = from.toLowerCase();
      const toLower = to.toLowerCase();

      const url = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${fromLower}.json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Forex API error");
      const json = await res.json();
      if (!json[fromLower] || json[fromLower][toLower] === undefined) throw new Error(`No forex rate for ${from}/${to}`);
      const rate = json[fromLower][toLower];

      // Fetch yesterday's rate for % change
      let changePct = null;
      try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yyyy = yesterday.getFullYear();
        const mm = String(yesterday.getMonth() + 1).padStart(2, "0");
        const dd = String(yesterday.getDate()).padStart(2, "0");
        const dateStr = `${yyyy}-${mm}-${dd}`;
        const histUrl = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${dateStr}/v1/currencies/${fromLower}.json`;
        const histRes = await fetch(histUrl);
        if (histRes.ok) {
          const histJson = await histRes.json();
          if (histJson[fromLower] && histJson[fromLower][toLower]) {
            const prevRate = histJson[fromLower][toLower];
            changePct = ((rate - prevRate) / prevRate) * 100;
          }
        }
      } catch (e) {
        console.warn("Failed to fetch yesterday forex rate", e);
      }

      return { from, to, rate, changePct };
    }
  }

  async initFinance() {
    // Clear any existing animation loop
    if (this.financeLoopInterval) {
      clearInterval(this.financeLoopInterval);
      this.financeLoopInterval = null;
    }

    const widget = document.getElementById("financeWidget");
    if (!this.settings.finance || !this.settings.finance.enabled) {
      if (widget) widget.style.display = "none";
      return;
    }
    if (widget) widget.style.display = "flex";

    const refreshBtn = document.getElementById("financeRefresh");
    if (refreshBtn) refreshBtn.onclick = () => this.loadFinance(true);

    const retryBtn = document.getElementById("retryFinance");
    if (retryBtn) retryBtn.addEventListener("click", () => this.loadFinance(true));

    await this.loadFinance();

    const duration = this.settings.finance.cacheDuration || 900000;
    setInterval(() => this.loadFinance(), duration);
  }

  async loadFinance(force = false) {
    const loading = document.getElementById("financeLoading");
    const content = document.getElementById("financeContent");
    const error = document.getElementById("financeError");
    const empty = document.getElementById("financeEmpty");

    const t1From = (this.settings.finance.ticker1From || "").trim();
    const t1To   = (this.settings.finance.ticker1To   || "").trim();
    const t2From = (this.settings.finance.ticker2From || "").trim();
    const t2To   = (this.settings.finance.ticker2To   || "").trim();

    if (!t1From || !t1To) {
      loading.style.display = "none";
      content.style.display = "none";
      error.style.display = "none";
      empty.style.display = "block";
      return;
    }

    const cacheDuration = this.settings.finance.cacheDuration || 900000;

    // Check cache for ticker 1
    let data1 = null;
    if (!force && this.settings.finance.cacheData1 && this.settings.finance.lastUpdate1) {
      if (Date.now() - this.settings.finance.lastUpdate1 < cacheDuration) {
        data1 = this.settings.finance.cacheData1;
      }
    }

    // Check cache for ticker 2 (only if ticker 2 is set)
    let data2 = null;
    const hasTicker2 = t2From && t2To;
    if (hasTicker2 && !force && this.settings.finance.cacheData2 && this.settings.finance.lastUpdate2) {
      if (Date.now() - this.settings.finance.lastUpdate2 < cacheDuration) {
        data2 = this.settings.finance.cacheData2;
      }
    }

    // If both cached, just display
    if (data1 && (!hasTicker2 || data2)) {
      this.displayFinancePair(1, data1);
      if (hasTicker2 && data2) this.displayFinancePair(2, data2);
      this.showFinanceContent();
      // Set label to ticker1 on initial show
      const financeLabel = document.getElementById("financeLabel");
      if (financeLabel) financeLabel.textContent = `${t1From}/${t1To}`;
      if (hasTicker2 && !this.financeLoopInterval) this.startFinanceAnimationLoop(t1From, t1To, t2From, t2To);
      return;
    }

    // Fetch fresh
    loading.style.display = "block";
    content.style.display = "none";
    error.style.display = "none";
    empty.style.display = "none";

    try {
      const promises = [this.fetchTickerData(t1From, t1To)];
      if (hasTicker2) promises.push(this.fetchTickerData(t2From, t2To));

      const results = await Promise.allSettled(promises);
      const result1 = results[0];

      if (result1.status === "rejected") throw result1.reason;

      data1 = result1.value;
      this.settings.finance.cacheData1 = data1;
      this.settings.finance.lastUpdate1 = Date.now();

      if (hasTicker2) {
        const result2 = results[1];
        if (result2.status === "fulfilled") {
          data2 = result2.value;
          this.settings.finance.cacheData2 = data2;
          this.settings.finance.lastUpdate2 = Date.now();
        }
      }

      this.saveSettings();

      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const financeTime = document.getElementById("financeTime");
      if (financeTime) financeTime.textContent = "Updated " + timeStr;

      this.displayFinancePair(1, data1);
      if (hasTicker2 && data2) this.displayFinancePair(2, data2);
      this.showFinanceContent();

      // Set label to ticker1 on initial show
      const financeLabel = document.getElementById("financeLabel");
      if (financeLabel) financeLabel.textContent = `${t1From}/${t1To}`;

      if (hasTicker2 && !this.financeLoopInterval) {
        this.startFinanceAnimationLoop(t1From, t1To, t2From, t2To);
      }
    } catch (e) {
      console.error("Finance error:", e);
      loading.style.display = "none";
      error.style.display = "block";
    }
  }

  displayFinancePair(sectionNum, data) {
    const rateEl = document.getElementById(`tickerRate${sectionNum}`);
    const pairEl = document.getElementById(`tickerPair${sectionNum}`);
    const changeEl = document.getElementById(`tickerChange${sectionNum}`);

    if (!rateEl) return;

    // Format rate: crypto needs more decimals for small values
    const rate = data.rate;
    let rateStr;
    if (rate >= 1000) rateStr = rate.toLocaleString(undefined, { maximumFractionDigits: 2 });
    else if (rate >= 1) rateStr = rate.toFixed(4);
    else rateStr = rate.toFixed(6);
    rateEl.textContent = rateStr;

    if (pairEl) pairEl.textContent = `${data.from} / ${data.to}`;

    if (changeEl) {
      if (data.changePct !== null && data.changePct !== undefined) {
        const pct = data.changePct;
        const isUp = pct >= 0;
        const arrow = isUp ? "▲" : "▼";
        changeEl.textContent = `${arrow} ${Math.abs(pct).toFixed(2)}%`;
        changeEl.className = isUp ? "gold-change-up" : "gold-change-down";
        changeEl.style.display = "inline-flex";
      } else {
        changeEl.style.display = "none";
      }
    }
  }

  showFinanceContent() {
    document.getElementById("financeLoading").style.display = "none";
    document.getElementById("financeContent").style.display = "flex";
  }

  startFinanceAnimationLoop(t1From, t1To, t2From, t2To) {
    if (this.financeLoopInterval) clearInterval(this.financeLoopInterval);

    // Toggle every 4 seconds with directional exit
    this.financeLoopInterval = setInterval(() => {
      const section1 = document.getElementById("financeSection1");
      const section2 = document.getElementById("financeSection2");
      const financeLabel = document.getElementById("financeLabel");

      if (!section1 || !section2) return;

      if (section1.classList.contains("active")) {
        // Section 1 exits left, Section 2 enters from right
        section1.classList.add("exit");
        section1.classList.remove("active");
        setTimeout(() => section1.classList.remove("exit"), 450);
        section2.classList.add("active");
        if (financeLabel) financeLabel.textContent = `${t2From}/${t2To}`;
      } else {
        // Section 2 exits left, Section 1 enters from right
        section2.classList.add("exit");
        section2.classList.remove("active");
        setTimeout(() => section2.classList.remove("exit"), 450);
        section1.classList.add("active");
        if (financeLabel) financeLabel.textContent = `${t1From}/${t1To}`;
      }
    }, 4000);
  }

  // ==================== SPORTS WIDGET FUNCTIONALITY ====================

  async initSports() {
    // Clear any existing animation loop
    if (this.sportsLoopInterval) {
      clearInterval(this.sportsLoopInterval);
      this.sportsLoopInterval = null;
    }

    if (!this.settings.sports.enabled) {
      document.getElementById("sportsWidget").style.display = "none";
      return;
    }

    this.setupSportsEventListeners();
    await this.loadSports();

    setInterval(() => this.loadSports(), this.settings.sports.cacheDuration);
  }

  setupSportsEventListeners() {
    const retryBtn = document.getElementById("retrySports");
    if (retryBtn) {
      retryBtn.addEventListener("click", () => this.loadSports());
    }

    const refreshBtn = document.getElementById("sportsRefresh");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => this.handleSportsRefresh());
    }
  }

  async loadSports() {
    const sportsLoading = document.getElementById("sportsLoading");
    const sportsContent = document.getElementById("sportsContent");
    const sportsError = document.getElementById("sportsError");
    const sportsEmpty = document.getElementById("sportsEmpty");

    const team1 = (this.settings.sports.team1 || "").trim();
    const team2 = (this.settings.sports.team2 || "").trim();

    // Check if at least team1 is set
    if (!team1) {
      sportsLoading.style.display = "none";
      sportsContent.style.display = "none";
      sportsError.style.display = "none";
      sportsEmpty.style.display = "block";
      return;
    }

    const cacheDuration = this.settings.sports.cacheDuration || 900000;
    const hasTeam2 = !!team2;

    // Check caches
    let data1 = null, data2 = null;
    if (this.settings.sports.cacheData1 && this.settings.sports.lastUpdate1) {
      if (Date.now() - this.settings.sports.lastUpdate1 < cacheDuration) {
        data1 = this.settings.sports.cacheData1;
      }
    }
    if (hasTeam2 && this.settings.sports.cacheData2 && this.settings.sports.lastUpdate2) {
      if (Date.now() - this.settings.sports.lastUpdate2 < cacheDuration) {
        data2 = this.settings.sports.cacheData2;
      }
    }

    // If both cached, display directly
    if (data1 && (!hasTeam2 || data2)) {
      this.renderSportsData(data1, data2, hasTeam2);
      return;
    }

    // Show loading state
    sportsLoading.style.display = "flex";
    sportsContent.style.display = "none";
    sportsError.style.display = "none";
    sportsEmpty.style.display = "none";

    try {
      const promises = [this.fetchTeamData(team1)];
      if (hasTeam2) promises.push(this.fetchTeamData(team2));

      const results = await Promise.allSettled(promises);
      const result1 = results[0];

      if (result1.status === "rejected") throw result1.reason;

      data1 = result1.value;
      this.settings.sports.cacheData1 = data1;
      this.settings.sports.lastUpdate1 = Date.now();

      if (hasTeam2 && results[1].status === "fulfilled") {
        data2 = results[1].value;
        this.settings.sports.cacheData2 = data2;
        this.settings.sports.lastUpdate2 = Date.now();
      }

      this.saveSettings();
      this.renderSportsData(data1, data2, hasTeam2);
    } catch (error) {
      console.error("Sports error:", error);
      this.displaySportsError(error.message);
    }
  }

  async fetchTeamData(teamName) {
    const espnTeam = await this.searchESPNTeam(teamName);
    if (!espnTeam) throw new Error(`Team not found: ${teamName}`);
    const { teamData, lastMatch, nextMatch } = await this.fetchESPNFixtures(espnTeam.id, espnTeam.leagueSlug);
    return { team: teamData, lastMatch, nextMatch };
  }

  renderSportsData(data1, data2, hasTeam2) {
    const sportsLoading = document.getElementById("sportsLoading");
    const sportsContent = document.getElementById("sportsContent");
    const sportsError = document.getElementById("sportsError");
    const sportsEmpty = document.getElementById("sportsEmpty");

    sportsLoading.style.display = "none";
    sportsError.style.display = "none";
    sportsEmpty.style.display = "none";

    // Show section 2 only if we have team2 data
    const section2 = document.getElementById("sportsSection2");
    if (section2) section2.style.display = hasTeam2 && data2 ? "" : "none";

    this.displaySportsTeam(1, data1);
    if (hasTeam2 && data2) this.displaySportsTeam(2, data2);

    // Update label with team1 name initially
    const sportsLabel = document.getElementById("sportsLabel");
    if (sportsLabel) sportsLabel.textContent = data1.team.name || "Sports";

    sportsContent.style.display = "block";

    if (hasTeam2 && data2 && !this.sportsLoopInterval) {
      this.startSportsAnimationLoop(data1.team.name, data2.team.name);
    }
  }

  displaySportsTeam(sectionNum, data) {
    const suffix = sectionNum; // 1 or 2

    const badge = document.getElementById(`teamBadge${suffix}`);
    const nameEl = document.getElementById(`teamName${suffix}`);

    if (badge) {
      if (data.team.logo) {
        badge.src = data.team.logo;
        badge.alt = data.team.name;
        badge.style.display = "block";
      } else {
        badge.style.display = "none";
      }
    }
    if (nameEl) nameEl.textContent = data.team.name || "--";

    // Last match
    const lastCard = document.getElementById(`lastMatchCard${suffix}`);
    if (data.lastMatch) {
      if (lastCard) lastCard.style.display = "block";
      this.displayMatchForSection(suffix, data.lastMatch, "last");
    } else {
      if (lastCard) lastCard.style.display = "none";
    }

    // Next match
    const nextCard = document.getElementById(`nextMatchCard${suffix}`);
    if (data.nextMatch) {
      if (nextCard) nextCard.style.display = "block";
      this.displayMatchForSection(suffix, data.nextMatch, "next");
    } else {
      if (nextCard) nextCard.style.display = "none";
    }
  }

  displayMatchForSection(sectionNum, match, type) {
    const prefix = type === "last" ? "last" : "next";
    const suffix = sectionNum;

    const homeTeam = match.teams.home.name || "--";
    const awayTeam = match.teams.away.name || "--";

    const homeEl = document.getElementById(`${prefix}HomeTeam${suffix}`);
    const awayEl = document.getElementById(`${prefix}AwayTeam${suffix}`);
    if (homeEl) homeEl.textContent = homeTeam;
    if (awayEl) awayEl.textContent = awayTeam;

    const homeBadge = document.getElementById(`${prefix}HomeBadge${suffix}`);
    const awayBadge = document.getElementById(`${prefix}AwayBadge${suffix}`);

    if (homeBadge) {
      if (match.teams.home.logo) {
        homeBadge.src = match.teams.home.logo;
        homeBadge.alt = homeTeam;
        homeBadge.style.display = "block";
      } else {
        homeBadge.style.display = "none";
      }
    }

    if (awayBadge) {
      if (match.teams.away.logo) {
        awayBadge.src = match.teams.away.logo;
        awayBadge.alt = awayTeam;
        awayBadge.style.display = "block";
      } else {
        awayBadge.style.display = "none";
      }
    }

    if (type === "last") {
      const scoreEl = document.getElementById(`lastScore${suffix}`);
      if (scoreEl) {
        const homeScore = match.goals.home !== null ? match.goals.home : "-";
        const awayScore = match.goals.away !== null ? match.goals.away : "-";
        scoreEl.textContent = `${homeScore} : ${awayScore}`;
      }
    }

    const compEl = document.getElementById(`${prefix}Competition${suffix}`);
    if (compEl) compEl.textContent = match.league.name || "--";

    const dateEl = document.getElementById(`${prefix}Date${suffix}`);
    if (dateEl) dateEl.textContent = this.formatMatchDate(match.fixture.date, "");
  }

  startSportsAnimationLoop(team1Name, team2Name) {
    if (this.sportsLoopInterval) clearInterval(this.sportsLoopInterval);

    this.sportsLoopInterval = setInterval(() => {
      const section1 = document.getElementById("sportsSection1");
      const section2 = document.getElementById("sportsSection2");
      const sportsLabel = document.getElementById("sportsLabel");

      if (!section1 || !section2) return;

      if (section1.classList.contains("active")) {
        // Section 1 flips up and out, Section 2 flips in from below
        section1.classList.add("exit");
        section1.classList.remove("active");
        setTimeout(() => section1.classList.remove("exit"), 500);
        section2.classList.add("active");
        if (sportsLabel) sportsLabel.textContent = team2Name || "Sports";
      } else {
        // Section 2 flips up and out, Section 1 flips in from below
        section2.classList.add("exit");
        section2.classList.remove("active");
        setTimeout(() => section2.classList.remove("exit"), 500);
        section1.classList.add("active");
        if (sportsLabel) sportsLabel.textContent = team1Name || "Sports";
      }
    }, 4000);
  }

  isSportsCacheValid() {
    // Legacy fallback — used if old cache keys exist
    if (!this.settings.sports.cacheData1 || !this.settings.sports.lastUpdate1) return false;
    const timeSinceUpdate = Date.now() - this.settings.sports.lastUpdate1;
    return timeSinceUpdate < this.settings.sports.cacheDuration;
  }

  async searchESPNTeam(query) {
    try {
      const searchUrl = `https://site.web.api.espn.com/apis/search/v2?query=${encodeURIComponent(query)}`;
      const response = await fetch(searchUrl);
      if (!response.ok) throw new Error("Search API error");
      const data = await response.json();
      
      const teamResultBlock = data.results?.find(r => r.type === "team" || r.type === "teams");
      if (!teamResultBlock || !teamResultBlock.contents || teamResultBlock.contents.length === 0) {
        return null;
      }
      
      const soccerTeam = teamResultBlock.contents.find(t => t.sport === "soccer");
      if (!soccerTeam) return null;
      
      const uidParts = soccerTeam.uid.split("t:");
      if (uidParts.length < 2) return null;
      
      const teamId = uidParts[1];
      const leagueSlug = soccerTeam.defaultLeagueSlug || "esp.1";
      
      return { id: teamId, leagueSlug, name: soccerTeam.displayName };
    } catch (error) {
      console.error("ESPN Search Error:", error);
      return null;
    }
  }

  async fetchESPNFixtures(teamId, leagueSlug) {
    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueSlug}/teams/${teamId}/schedule`;
      const response = await fetch(url);
      
      if (!response.ok) throw new Error(`ESPN API error: ${response.status}`);
      const data = await response.json();

      const teamData = {
        id: data.team.id,
        name: data.team.displayName,
        logo: data.team.logo
      };

      const fixtures = data.events || [];
      const mappedFixtures = fixtures.map(event => {
        const comp = event.competitions[0];
        const homeComp = comp.competitors.find(c => c.homeAway === "home");
        const awayComp = comp.competitors.find(c => c.homeAway === "away");

        return {
          fixture: {
            date: event.date,
            timestamp: new Date(event.date).getTime() / 1000
          },
          league: { name: event.season?.displayName || event.name },
          teams: {
            home: {
              name: homeComp?.team?.displayName || "--",
              logo: homeComp?.team?.logos?.[0]?.href || null
            },
            away: {
              name: awayComp?.team?.displayName || "--",
              logo: awayComp?.team?.logos?.[0]?.href || null
            }
          },
          goals: {
            home: homeComp?.score ? homeComp.score.value : null,
            away: awayComp?.score ? awayComp.score.value : null
          }
        };
      });

      mappedFixtures.sort((a, b) => a.fixture.timestamp - b.fixture.timestamp);
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const pastMatches = mappedFixtures.filter(f => f.fixture.timestamp < currentTimestamp);
      const upcomingMatches = mappedFixtures.filter(f => f.fixture.timestamp >= currentTimestamp);

      const lastMatch = pastMatches.length > 0 ? pastMatches[pastMatches.length - 1] : null;
      const nextMatch = upcomingMatches.length > 0 ? upcomingMatches[0] : null;

      return { teamData, lastMatch, nextMatch };
    } catch (error) {
      console.error("ESPN Fixtures error:", error);
      throw new Error("Failed to load ESPN data");
    }
  }

  formatMatchDate(dateString, timeString) {
    if (!dateString) return "--";
    try {
      const date = new Date(dateString + (timeString ? " " + timeString : ""));
      const now = new Date();
      const diffDays = Math.floor((date - now) / (1000 * 60 * 60 * 24));

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
    document.getElementById("sportsLoading").style.display = "none";
    document.getElementById("sportsContent").style.display = "none";
    document.getElementById("sportsEmpty").style.display = "none";
    const errorMessage = document.getElementById("sportsErrorMessage");
    if (errorMessage) errorMessage.textContent = message;
    document.getElementById("sportsError").style.display = "block";
  }

  async handleSportsRefresh() {
    const refreshBtn = document.getElementById("sportsRefresh");
    if (refreshBtn) refreshBtn.classList.add("refreshing");
    await this.refreshSportsData();
    setTimeout(() => {
      if (refreshBtn) refreshBtn.classList.remove("refreshing");
    }, 1000);
  }

  async refreshSportsData() {
    this.settings.sports.cacheData1 = null;
    this.settings.sports.cacheData2 = null;
    this.settings.sports.lastUpdate1 = null;
    this.settings.sports.lastUpdate2 = null;
    if (this.sportsLoopInterval) {
      clearInterval(this.sportsLoopInterval);
      this.sportsLoopInterval = null;
    }
    await this.saveSettings();
    await this.loadSports();
  }

  // ==================== GOLD WIDGET FUNCTIONALITY ====================

  async initGold() {
    const widget = document.getElementById("goldWidget");
    if (!this.settings.gold || !this.settings.gold.enabled) {
      if (widget) widget.style.display = "none";
      return;
    }
    if (widget) widget.style.display = "flex";

    const refreshBtn = document.getElementById("goldRefresh");
    if (refreshBtn) refreshBtn.onclick = () => this.loadGold(true);

    await this.loadGold();

    const duration = this.settings.gold.cacheDuration || 900000;
    setInterval(() => this.loadGold(), duration);

    const retryBtn = document.getElementById("retryGold");
    if (retryBtn) {
      retryBtn.addEventListener("click", () => {
        this.loadGold(true);
      });
    }

    // Set up the animation loop
    this.startMetalsAnimationLoop();
  }

  startMetalsAnimationLoop() {
    if (this.metalsLoopInterval) clearInterval(this.metalsLoopInterval);

    // Toggle every 4 seconds
    this.metalsLoopInterval = setInterval(() => {
      const goldSection = document.getElementById("goldSection");
      const silverSection = document.getElementById("silverSection");
      const metalsLabel = document.getElementById("metalsLabel");

      if (!goldSection || !silverSection) return;

      if (goldSection.classList.contains("active")) {
        goldSection.classList.remove("active");
        silverSection.classList.add("active");
        if (metalsLabel) metalsLabel.textContent = "Silver (Ounce)";
      } else {
        silverSection.classList.remove("active");
        goldSection.classList.add("active");
        if (metalsLabel) metalsLabel.textContent = "Gold (Ounce)";
      }
    }, 4000);
  }

  async loadGold(force = false) {
    const loading = document.getElementById("goldLoading");
    const content = document.getElementById("goldContent");
    const error = document.getElementById("goldError");

    // Check Cache
    if (
      !force &&
      this.settings.gold.cacheData &&
      this.settings.gold.lastUpdate
    ) {
      const age = Date.now() - this.settings.gold.lastUpdate;
      if (age < (this.settings.gold.cacheDuration || 900000)) {
        this.displayGold(this.settings.gold.cacheData);
        return;
      }
    }

    loading.style.display = "block";
    content.style.display = "none";
    error.style.display = "none";

    try {
      const url = "https://api.gold-api.com/price/XAU";
      const silverUrl = "https://api.gold-api.com/price/XAG";
      const [res, silverRes] = await Promise.all([fetch(url), fetch(silverUrl)]);
      const json = await res.json();
      const silverJson = await silverRes.json();

      if (!json || !json.price || !silverJson || !silverJson.price) {
        throw new Error("Invalid metals data");
      }

      const currentPrice = parseFloat(json.price);
      const silverPrice = parseFloat(silverJson.price);
      let changePct = null;
      let silverChangePct = null;

      try {
        // Fetch yesterday's price to calculate daily change
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yyyy = yesterday.getFullYear();
        const mm = String(yesterday.getMonth() + 1).padStart(2, '0');
        const dd = String(yesterday.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        
        const histUrl = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${dateStr}/v1/currencies/xau.json`;
        const silverHistUrl = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${dateStr}/v1/currencies/xag.json`;
        
        const [histRes, silverHistRes] = await Promise.all([fetch(histUrl), fetch(silverHistUrl)]);
        const histJson = await histRes.json();
        const silverHistJson = await silverHistRes.json();
        
        if (histJson && histJson.xau && histJson.xau.usd) {
          const yesterdayPrice = parseFloat(histJson.xau.usd);
          changePct = ((currentPrice - yesterdayPrice) / yesterdayPrice) * 100;
        }

        if (silverHistJson && silverHistJson.xag && silverHistJson.xag.usd) {
          const yesterdaySilverPrice = parseFloat(silverHistJson.xag.usd);
          silverChangePct = ((silverPrice - yesterdaySilverPrice) / yesterdaySilverPrice) * 100;
        }
      } catch(e) {
        console.warn("Failed to fetch historical metals data for change percentage", e);
      }

      const data = {
        price: currentPrice,
        changePct: changePct,
        silverPrice: silverPrice,
        silverChangePct: silverChangePct,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      this.settings.gold.cacheData = data;
      this.settings.gold.lastUpdate = Date.now();
      this.saveSettings();

      this.displayGold(data);
    } catch (e) {
      console.error(e);
      loading.style.display = "none";
      error.style.display = "block";
    }
  }

  displayGold(data) {
    document.getElementById("goldLoading").style.display = "none";
    document.getElementById("goldContent").style.display = "flex";

    // Gold Update
    document.getElementById("goldRate").textContent = "$" + data.price.toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2});
    const changeEl = document.getElementById("goldChange");
    if (data.changePct !== null && data.changePct !== undefined) {
      let arrow = data.changePct >= 0 ? "▲" : "▼";
      let sign = data.changePct > 0 ? "+" : "";
      changeEl.innerHTML = `<span>${arrow}</span><span>${sign}${data.changePct.toFixed(2)}%</span>`;
      changeEl.className = data.changePct >= 0 ? "gold-change-up" : "gold-change-down";
      changeEl.style.display = "inline-flex";
    } else {
      changeEl.style.display = "none";
    }
    document.getElementById("goldTime").textContent = "Updated " + data.time;

    // Silver Update
    document.getElementById("silverRate").textContent = "$" + data.silverPrice.toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2});
    const silverChangeEl = document.getElementById("silverChange");
    if (data.silverChangePct !== null && data.silverChangePct !== undefined) {
      let arrow = data.silverChangePct >= 0 ? "▲" : "▼";
      let sign = data.silverChangePct > 0 ? "+" : "";
      silverChangeEl.innerHTML = `<span>${arrow}</span><span>${sign}${data.silverChangePct.toFixed(2)}%</span>`;
      silverChangeEl.className = data.silverChangePct >= 0 ? "gold-change-up" : "gold-change-down";
      silverChangeEl.style.display = "inline-flex";
    } else {
      silverChangeEl.style.display = "none";
    }
  }

  // ==========================================
  //           AI & GEMINI LOGIC
  // ==========================================

  toggleAIMode() {
    this.settings.ai.enabled = !this.settings.ai.enabled;

    const searchWrapper = document.querySelector(".search-input-wrapper");
    const aiBtn = document.getElementById("aiToggle");
    const input = document.getElementById("searchInput");

    if (this.settings.ai.enabled) {
      // --- VISUALS ---
      searchWrapper.classList.add("ai-mode-active");
      aiBtn.classList.add("ai-mode-active");
      input.placeholder = "Awaiting command...";
      input.focus();

      // --- AUDIO GREETING ---
      const name = this.settings.userName || "Sir";
      // Randomize greeting for variety
      const greetings = [
        `System initialized. Ready, ${name}.`,
        `AI systems online. Hello, ${name}.`,
        `Welcome back, ${name}. I am listening.`,
      ];
      const randomGreeting =
        greetings[Math.floor(Math.random() * greetings.length)];
      this.speakText(randomGreeting);
    } else {
      // --- OFF STATE ---
      searchWrapper.classList.remove("ai-mode-active");
      aiBtn.classList.remove("ai-mode-active");
      input.placeholder = "Search or enter URL";

      // Stop talking if turned off
      window.speechSynthesis.cancel();
    }
  }

  startVoiceInput() {
    if (!("webkitSpeechRecognition" in window)) {
      alert("Voice input not supported in this browser.");
      return;
    }

    const recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    const micBtn = document.getElementById("micButton");
    // Visual feedback that we are listening
    if (micBtn) micBtn.classList.add("listening-mode");

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const lowerText = transcript.toLowerCase().trim();
      const input = document.getElementById("searchInput");

      // === WAKE WORD PROTOCOL ===
      // Check if user said the magic words
      if (
        lowerText.includes("hello jarvis") ||
        lowerText.includes("hello, jarvis")
      ) {
        // If AI is currently OFF, turn it ON
        if (!this.settings.ai.enabled) {
          this.toggleAIMode();
          // The toggleAIMode function already handles the greeting ("System Online..."),
          // so we don't need to speak here to avoid double-talking.
        } else {
          // If already ON, just acknowledge
          this.speakText("I am already online, sir.");
        }

        // Clear the input so "Hello Jarvis" doesn't sit in the search bar
        input.value = "";
        return;
      }

      // === NEW: EXIT COMMAND ===
      // Only runs if AI is currently ENABLED
      if (
        this.settings.ai.enabled &&
        lowerText.includes("jarvis over and out")
      ) {
        // 1. Audio confirmation
        this.speakText("Over and out, Abdullah.");

        // 2. Turn off AI Mode (This reverts the UI/Search bar)
        this.toggleAIMode();

        // 3. Close the Modal Window if it's open (triggers your cleanup logic)
        const closeAiBtn = document.getElementById("closeAiModal");
        if (closeAiBtn) closeAiBtn.click();

        return; // Stop here so it doesn't search for "over and out"
      }

      // === STANDARD BEHAVIOR ===
      // If no wake word, just fill the text box
      input.value = transcript;

      // If AI is ON, auto-submit the query
      if (this.settings.ai.enabled) {
        this.handleAIQuery(transcript);
      }
    };

    recognition.onerror = (e) => {
      console.error("Voice error", e);
      if (micBtn) micBtn.classList.remove("listening-mode");
    };

    recognition.onend = () => {
      if (micBtn) micBtn.classList.remove("listening-mode");
    };

    recognition.start();
  }

  async handleAIQuery(prompt, isFollowUp = false) {
    const apiKey = this.settings.ai.apiKey || "";
    if (!apiKey) {
      alert("Please enter API Key in Settings.");
      return;
    }

    // 1. UI Setup
    const modal = document.getElementById("aiModal");
    const responseContainer = document.getElementById("aiResponseText");
    const status = document.querySelector(".ai-status");

    if (!isFollowUp) {
      this.hideWidgets();
      modal.classList.add("active");
      responseContainer.innerHTML = "";
      this.chatHistory = [];
    }

    // 2. Add USER Message to UI
    this.appendMessageToUI("User", prompt);
    this.chatHistory.push({ role: "user", parts: [{ text: prompt }] });

    // 3. Scroll & Status
    responseContainer.scrollTop = responseContainer.scrollHeight;
    status.textContent = "CALCULATING TEMPORAL DATA...";

    try {
      // --- THE TIME FIX ---
      // We get the current time from your browser
      const now = new Date();
      const dateString = now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const timeString = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

      // We tell Gemini: "This is the current time. Act accordingly."
      const systemPrompt = `Current Date: ${dateString}\nCurrent Time: ${timeString}\nUser Name: ${
        this.settings.userName || "Commander"
      }\nYou are JARVIS., an advanced AI assistant for ABX-One developed by Muhammad Abdullah Iqbal. Be  very concise, helpful, and  friendly.`;

      // 4. Call API with System Instruction
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // INJECT TIME HERE
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: this.chatHistory,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      const aiText = data.candidates[0].content.parts[0].text;

      // 5. Update History & UI
      this.chatHistory.push({ role: "model", parts: [{ text: aiText }] });

      status.textContent = "TRANSMITTING...";
      this.streamAIResponse("Gemini", aiText, responseContainer);
      this.speakText(aiText);
    } catch (error) {
      const errorMessage =
        "Apologies Commander, I am unable to establish a connection to the neural core. Please check your network configuration.";
      this.appendMessageToUI("System", "CONNECTION ERROR: " + error.message);
      status.textContent = "SIGNAL LOST";
      status.style.color = "#ef4444";
      this.speakText(errorMessage);
    }
  }
  speakText(text) {
    if (!("speechSynthesis" in window)) return;

    // 1. Cancel previous audio
    window.speechSynthesis.cancel();

    // 2. Show Stop Button
    const stopBtn = document.getElementById("stopVoiceBtn");
    if (stopBtn) stopBtn.style.display = "flex";

    const utterance = new SpeechSynthesisUtterance(text);

    // === TUNING THE VOICE ===

    // Speed: 1.2 is snappier (1.0 is too slow, 1.5 is too fast)
    utterance.rate = 1.0;

    // Pitch: 1.0 is standard. Lowering slightly (0.9) sometimes hides the "robot" metallic sound.
    utterance.pitch = 1.0;

    let voices = window.speechSynthesis.getVoices();

    const setVoice = () => {
      // PRIORITY LIST:
      // 1. "Google US English" (Best/Most Human on Chrome)
      // 2. "Microsoft Zira" (Good Windows Female)
      // 3. "Samantha" (Good Mac Voice)
      const preferredVoice =
        voices.find((v) => v.name === "Google US English") ||
        voices.find((v) => v.name.includes("Zira")) ||
        voices.find((v) => v.name.includes("Samantha")) ||
        voices.find((v) => v.name.includes("Google")); // Fallback to any Google voice

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      window.speechSynthesis.speak(utterance);
    };

    if (voices.length > 0) {
      setVoice();
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        voices = window.speechSynthesis.getVoices();
        setVoice();
      };
    }

    utterance.onend = () => {
      if (stopBtn) stopBtn.style.display = "none";
    };
  }
  streamAIResponse(fullText, element) {
    // Clean text (basic markdown removal if you want, or keep it)
    element.textContent = "";
    let i = 0;
    const speed = 15; // Fast typing speed

    const type = () => {
      if (i < fullText.length) {
        element.textContent += fullText.charAt(i);
        i++;
        // Auto scroll to bottom
        element.scrollTop = element.scrollHeight;
        setTimeout(type, speed);
      }
    };
    type();
  }

  // Helper: Visual Chat Bubbles
  appendMessageToUI(role, text) {
    const container = document.getElementById("aiResponseText");
    const msgDiv = document.createElement("div");
    msgDiv.className = "chat-message";

    const label = role === "User" ? "COMMANDER" : "GEMINI";
    const cssClass = role === "User" ? "chat-user" : "chat-ai";

    msgDiv.innerHTML = `
          <div class="${cssClass}">${label}</div>
          <div class="chat-text">${text}</div>
      `;

    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
  }

  // Handle the "Send" button in modal
  sendReply() {
    const input = document.getElementById("aiReplyInput");
    const text = input.value.trim();
    if (!text) return;

    input.value = ""; // Clear input
    this.handleAIQuery(text, true); // true = maintain context
  }

  // Handle the Mic button in modal
  startReplyVoice() {
    if (!("webkitSpeechRecognition" in window)) return;

    const recognition = new webkitSpeechRecognition();
    recognition.lang = "en-US";
    const btn = document.getElementById("aiReplyMic");
    btn.style.color = "#ef4444"; // Red when listening

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      this.handleAIQuery(text, true);
    };

    recognition.onend = () => {
      btn.style.color = ""; // Reset color
    };

    recognition.start();
  }

  // Updated Widget Hider (Moved to own function for clarity)
  hideWidgets() {
    // Add the master class to body
    document.body.classList.add("ai-active");

    // Keep your existing manual hiding logic (optional, but good for backup)
    const widgets = [
      ".weather-container",
      ".sports-container",
      ".finance-container",
      ".gold-container",
    ];
    widgets.forEach((selector) => {
      const el = document.querySelector(selector);
      if (el) {
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
      }
    });
  }

  // Modified Streamer to use the new UI structure
  streamAIResponse(role, fullText, container) {
    // Create the container for this specific message
    const msgDiv = document.createElement("div");
    msgDiv.className = "chat-message";
    msgDiv.innerHTML = `
          <div class="chat-ai">GEMINI</div>
          <div class="chat-text"></div>
      `;
    container.appendChild(msgDiv);

    const textEl = msgDiv.querySelector(".chat-text");

    let i = 0;
    const speed = 15;

    const type = () => {
      if (i < fullText.length) {
        textEl.textContent += fullText.charAt(i);
        i++;
        container.scrollTop = container.scrollHeight;
        setTimeout(type, speed);
      }
    };
    type();
  }
  // ==========================================
  //           TO-DO WIDGET LOGIC
  // ==========================================

  initTodo() {
    // Ensure array exists if loading from old storage
    if (!this.settings.todoList) {
      this.settings.todoList = [];
    }

    const addBtn = document.getElementById("addTodoBtn");
    const input = document.getElementById("todoInput");

    if (addBtn && input) {
      // Add on button click
      addBtn.addEventListener("click", () => {
        this.addTodo(input.value);
        input.value = "";
      });

      // Add on Enter key
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.addTodo(input.value);
          input.value = "";
        }
      });
    }

    const clearBtn = document.getElementById("clearTodoBtn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        if (this.settings.todoList.length > 0 && confirm("Are you sure you want to clear all tasks?")) {
          this.settings.todoList = [];
          this.saveSettings();
          this.renderTodoList();
        }
      });
    }

    this.renderTodoList();
  }

  addTodo(text) {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    const newTask = {
      id: Date.now().toString(),
      text: trimmedText,
      completed: false,
    };

    this.settings.todoList.unshift(newTask); // Add to the top of the list
    this.saveSettings(); // Save to Chrome sync storage
    this.renderTodoList();
  }

  toggleTodo(id) {
    const task = this.settings.todoList.find((t) => t.id === id);
    if (task) {
      task.completed = !task.completed;
      this.saveSettings();
      this.renderTodoList();

      if (task.completed) {
        // Auto-remove after 5 seconds
        setTimeout(() => {
          // Check if it's STILL completed (user didn't uncheck it within 5s)
          const currentTask = this.settings.todoList.find((t) => t.id === id);
          if (currentTask && currentTask.completed) {
            this.deleteTodo(id);
          }
        }, 5000);
      }
    }
  }

  editTodo(id) {
    const task = this.settings.todoList.find((t) => t.id === id);
    if (task) {
      const newText = prompt("Edit task:", task.text);
      if (newText !== null && newText.trim() !== "") {
        task.text = newText.trim();
        this.saveSettings();
        this.renderTodoList();
      }
    }
  }

  deleteTodo(id) {
    this.settings.todoList = this.settings.todoList.filter((t) => t.id !== id);
    this.saveSettings();
    this.renderTodoList();
  }

  renderTodoList() {
    const list = document.getElementById("todoList");
    const countSpan = document.getElementById("todoCount");
    if (!list || !countSpan) return;

    list.innerHTML = "";
    let completedCount = 0;

    this.settings.todoList.forEach((task) => {
      if (task.completed) completedCount++;

      const li = document.createElement("li");
      li.className = `todo-item ${task.completed ? "completed" : ""}`;

      li.innerHTML = `
        <input type="checkbox" class="todo-checkbox" ${task.completed ? "checked" : ""}>
        <span class="todo-text">${this.escapeHTML(task.text)}</span>
        <div style="display:flex; gap: 4px;">
          <button class="todo-action-btn todo-edit-btn" aria-label="Edit task" title="Edit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="todo-action-btn todo-delete-btn" aria-label="Delete task" title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18"></path>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      `;

      // Bind events to the dynamically created elements
      const checkbox = li.querySelector(".todo-checkbox");
      checkbox.addEventListener("change", () => this.toggleTodo(task.id));

      const editBtn = li.querySelector(".todo-edit-btn");
      editBtn.addEventListener("click", () => this.editTodo(task.id));

      const deleteBtn = li.querySelector(".todo-delete-btn");
      deleteBtn.addEventListener("click", () => this.deleteTodo(task.id));

      list.appendChild(li);
    });

    // Update the counter
    const total = this.settings.todoList.length;
    if (total === 0) {
      countSpan.textContent = "0 tasks";
    } else {
      countSpan.textContent = `${completedCount}/${total} done`;
    }
  }

  escapeHTML(str) {
    // Prevents code injection if you type HTML tags into the task input
    return str.replace(
      /[&<>'"]/g,
      (tag) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;",
        })[tag],
    );
  }

  // ═══════════════════════════════════════════
  //  PSX WIDGET
  // ═══════════════════════════════════════════

  /** Returns true if PKT market is currently open (Mon–Fri 09:30–15:30) */
  isPsxOpen() {
    const now = new Date();
    // PKT = UTC+5
    const pkt = new Date(now.getTime() + 5 * 60 * 60 * 1000);
    const day = pkt.getUTCDay(); // 0=Sun, 6=Sat
    const h = pkt.getUTCHours();
    const m = pkt.getUTCMinutes();
    const mins = h * 60 + m;
    const isWeekday = day >= 1 && day <= 5;
    const inHours = mins >= 9 * 60 + 30 && mins <= 15 * 60 + 30;
    return isWeekday && inHours;
  }

  initPsx() {
    if (this.psxLoopInterval) {
      clearInterval(this.psxLoopInterval);
      this.psxLoopInterval = null;
    }

    const refreshBtn = document.getElementById("psxRefresh");
    if (refreshBtn) {
      refreshBtn.onclick = () => this.loadPsx(true);
    }
    const retryBtn = document.getElementById("retryPsx");
    if (retryBtn) {
      retryBtn.onclick = () => this.loadPsx(true);
    }

    this.loadPsx();

    // Refresh every 5 minutes (PSX data doesn't need to be more frequent)
    setInterval(() => this.loadPsx(), 5 * 60 * 1000);
  }

  async loadPsx(force = false) {
    const loading = document.getElementById("psxLoading");
    const content = document.getElementById("psxContent");
    const error   = document.getElementById("psxError");
    const refreshBtn = document.getElementById("psxRefresh");

    if (!loading || !content || !error) return;

    // Show loading
    loading.style.display = "flex";
    content.style.display = "none";
    error.style.display   = "none";
    if (refreshBtn) refreshBtn.classList.add("refreshing");

    const PANELS = [
      { symbol: "KSE100", label: "KSE-100", meta: "Index",            num: 1 },
      { symbol: "FFC",    label: "FFC",     meta: "Fauji Fertilizer", num: 2 },
      { symbol: "MEBL",   label: "MEBL",    meta: "Meezan Bank",       num: 3 },
    ];

    try {
      // Fetch all 3 concurrently
      const results = await Promise.allSettled(
        PANELS.map(p => this.scrapePsxQuote(p.symbol))
      );

      let anySuccess = false;
      results.forEach((res, i) => {
        const panel = PANELS[i];
        if (res.status === "fulfilled" && res.value) {
          this.displayPsxPanel(panel.num, panel.label, panel.meta, res.value);
          anySuccess = true;
        } else {
          // Show dashes for failed panels
          const priceEl = document.getElementById(`psxPrice${panel.num}`);
          const changeEl = document.getElementById(`psxChange${panel.num}`);
          if (priceEl) priceEl.textContent = "--";
          if (changeEl) { changeEl.textContent = ""; changeEl.className = "psx-change-pill"; }
        }
      });

      loading.style.display = "none";

      if (anySuccess) {
        content.style.display = "block";
        // Update header label to first panel
        const psxLabel = document.getElementById("psxLabel");
        if (psxLabel) psxLabel.textContent = PANELS[0].label;
        // Start/restart animation loop
        this.startPsxAnimationLoop(PANELS);
      } else {
        error.style.display = "block";
      }
    } catch (e) {
      console.error("PSX load error:", e);
      loading.style.display = "none";
      error.style.display   = "block";
    } finally {
      if (refreshBtn) refreshBtn.classList.remove("refreshing");
    }
  }

  /**
   * Scrapes PSX quote using psxdata's historical endpoint — works 24/7.
   *
   * POST /historical {symbol} returns descending history.
   * We parse row 0 (today) and row 1 (yesterday) to calculate daily change.
   */
  async scrapePsxQuote(symbol) {
    const sym = symbol.toUpperCase();

    // In Manifest V3, we must fetch from the background service worker to bypass CORS
    // since dps.psx.com.pk doesn't set Access-Control-Allow-Origin headers.
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'fetchPsx', symbol: sym }, (res) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!res.success) {
          reject(new Error(res.error));
        } else {
          resolve(res.html);
        }
      });
    });

    const html = response;
    const doc = new DOMParser().parseFromString(html, "text/html");
    
    const priceDiv = doc.querySelector(".quote__close");
    if (!priceDiv) throw new Error(`${sym}: price not found`);
    const priceText = priceDiv.textContent.replace("Rs.", "").replace(/,/g, "").trim();
    const price = parseFloat(priceText);
    if (isNaN(price)) throw new Error(`${sym}: could not parse current price`);

    let change = null;
    let changePct = null;

    const changeDiv = doc.querySelector(".quote__change");
    if (changeDiv) {
      const changeText = changeDiv.textContent.replace("Rs.", "").replace(/,/g, "").trim();
      const parts = changeText.split("(");
      if (parts.length > 0) {
        change = parseFloat(parts[0].trim());
      }
      if (parts.length > 1) {
        const pctStr = parts[1].replace("%", "").replace(")", "").trim();
        changePct = parseFloat(pctStr);
      }
    }

    return {
      symbol: sym,
      price,
      change,
      changePct,
    };
  }

  /** Renders a single PSX panel with price + change pill */
  displayPsxPanel(num, label, meta, data) {
    const priceEl  = document.getElementById(`psxPrice${num}`);
    const changeEl = document.getElementById(`psxChange${num}`);
    const symbolEl = document.getElementById(`psxSymbol${num}`);
    const metaEl   = document.getElementById(`psxMeta${num}`);

    if (symbolEl) symbolEl.textContent = label;
    if (metaEl)   metaEl.textContent   = meta;

    // Format price: use commas for large numbers (index), Rs. prefix for stocks
    if (priceEl) {
      const isIndex = num === 1; // KSE-100
      if (isIndex) {
        priceEl.textContent = data.price.toLocaleString("en-US", { maximumFractionDigits: 0 });
      } else {
        priceEl.textContent = "Rs. " + data.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
    }

    // Change pill
    if (changeEl) {
      if (data.changePct !== null && data.changePct !== undefined) {
        const up = data.changePct >= 0;
        const arrow = up ? "▲" : "▼";
        const absVal = Math.abs(data.changePct).toFixed(2);
        changeEl.textContent = `${arrow} ${absVal}%`;
        changeEl.className = "psx-change-pill " + (up ? "gold-change-up" : "gold-change-down");
      } else {
        changeEl.textContent = "";
        changeEl.className = "psx-change-pill";
      }
    }
  }

  /** Cycles through the 3 PSX panels every 4 seconds with blur+fade */
  startPsxAnimationLoop(panels) {
    if (this.psxLoopInterval) clearInterval(this.psxLoopInterval);

    let current = 0; // index into panels array

    // Ensure section 1 is active on start
    panels.forEach((p, i) => {
      const sec = document.getElementById(`psxSection${p.num}`);
      if (sec) {
        sec.classList.toggle("active", i === 0);
      }
    });

    this.psxLoopInterval = setInterval(() => {
      const prev = current;
      current = (current + 1) % panels.length;

      const prevSec = document.getElementById(`psxSection${panels[prev].num}`);
      const nextSec = document.getElementById(`psxSection${panels[current].num}`);
      const psxLabel = document.getElementById("psxLabel");

      if (prevSec) prevSec.classList.remove("active");
      if (nextSec) nextSec.classList.add("active");
      if (psxLabel) psxLabel.textContent = panels[current].label;
    }, 4000);
  }

} // end class XAIExtension

// Fade out widgets on scroll
const weatherWidget = document.querySelector(".weather-container");
const financeWidget = document.querySelector(".finance-container");
const goldWidget = document.querySelector(".gold-container");

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

  // Fade Gold
  if (goldWidget) {
    goldWidget.style.opacity = shouldHide ? "0" : "1";
    goldWidget.style.pointerEvents = shouldHide ? "none" : "auto";
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
