// xAI Chrome Extension - Popup Script with Ticker Settings
class PopupController {
  constructor() {
    this.settings = {
      userName: "",
      customBookmarks: [],
      weather: {
        enabled: true,
        unit: "metric",
        location: "",
        apiKey: "",
      },
      sports: {
        enabled: true,
        team1: "",
        team2: "",
      },
      // Finance Settings (2 tickers, keyless APIs)
      finance: {
        enabled: true,
        ticker1From: "BTC",
        ticker1To: "USD",
        ticker2From: "EUR",
        ticker2To: "USD",
        cacheDuration: 900000, // 15 mins
      },
      gold: {
        enabled: true,
        cacheDuration: 900000,
      },
      ai: {
        enabled: false,
        apiKey: "",
      },
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
      const result = await chrome.storage.local.get(["xaiSettings"]);
      if (result.xaiSettings) {
        // Merge saved settings with defaults
        this.settings = {
          ...this.settings,
          ...result.xaiSettings,
          sports: { ...this.settings.sports, ...result.xaiSettings.sports },
          finance: { ...this.settings.finance, ...result.xaiSettings.finance },
          gold: { ...this.settings.gold, ...result.xaiSettings.gold },
          ai: { ...this.settings.ai, ...result.xaiSettings.ai },
        };
      }
    } catch (error) {
      console.log("Using default settings");
    }
  }

  setupEventListeners() {
    // --- Basic Settings ---
    const userNameInput = document.getElementById("userName");
    if (userNameInput) {
      userNameInput.addEventListener("input", (e) => {
        this.settings.userName = e.target.value;
      });
    }

    // --- AI Settings ---
    const geminiApiKey = document.getElementById("geminiApiKey");
    if (geminiApiKey) {
      geminiApiKey.addEventListener("input", (e) => {
        if (!this.settings.ai) this.settings.ai = {};
        this.settings.ai.apiKey = e.target.value;
      });
    }

    // --- Weather Settings ---
    const weatherEnabled = document.getElementById("weatherEnabled");
    if (weatherEnabled) {
      weatherEnabled.addEventListener("change", (e) => {
        if (!this.settings.weather) this.settings.weather = {};
        this.settings.weather.enabled = e.target.checked;
      });
    }

    const weatherLocation = document.getElementById("weatherLocation");
    if (weatherLocation) {
      weatherLocation.addEventListener("input", (e) => {
        if (!this.settings.weather) this.settings.weather = {};
        this.settings.weather.location = e.target.value;
      });
    }

    const weatherUnit = document.getElementById("weatherUnit");
    if (weatherUnit) {
      weatherUnit.addEventListener("change", (e) => {
        if (!this.settings.weather) this.settings.weather = {};
        this.settings.weather.unit = e.target.value;
      });
    }

    const weatherApiKey = document.getElementById("weatherApiKey");
    if (weatherApiKey) {
      weatherApiKey.addEventListener("input", (e) => {
        if (!this.settings.weather) this.settings.weather = {};
        this.settings.weather.apiKey = e.target.value || "";
      });
    }

    // --- Sports Settings ---
    const sportsEnabled = document.getElementById("sportsEnabled");
    if (sportsEnabled) {
      sportsEnabled.addEventListener("change", (e) => {
        if (!this.settings.sports) this.settings.sports = {};
        this.settings.sports.enabled = e.target.checked;
      });
    }

    const sportsTeam1 = document.getElementById("sportsTeam1");
    if (sportsTeam1) {
      sportsTeam1.addEventListener("input", (e) => {
        if (!this.settings.sports) this.settings.sports = {};
        this.settings.sports.team1 = e.target.value;
      });
    }

    const sportsTeam2 = document.getElementById("sportsTeam2");
    if (sportsTeam2) {
      sportsTeam2.addEventListener("input", (e) => {
        if (!this.settings.sports) this.settings.sports = {};
        this.settings.sports.team2 = e.target.value;
      });
    }

    // --- Finance Settings (2 Tickers, Free API) ---
    const financeEnabled = document.getElementById("financeEnabled");
    if (financeEnabled) {
      financeEnabled.addEventListener("change", (e) => {
        if (!this.settings.finance) this.settings.finance = {};
        this.settings.finance.enabled = e.target.checked;
      });
    }

    const financeFrom1 = document.getElementById("financeFrom1");
    if (financeFrom1) {
      financeFrom1.addEventListener("input", (e) => {
        if (!this.settings.finance) this.settings.finance = {};
        this.settings.finance.ticker1From = e.target.value.toUpperCase();
      });
    }

    const financeTo1 = document.getElementById("financeTo1");
    if (financeTo1) {
      financeTo1.addEventListener("input", (e) => {
        if (!this.settings.finance) this.settings.finance = {};
        this.settings.finance.ticker1To = e.target.value.toUpperCase();
      });
    }

    const financeFrom2 = document.getElementById("financeFrom2");
    if (financeFrom2) {
      financeFrom2.addEventListener("input", (e) => {
        if (!this.settings.finance) this.settings.finance = {};
        this.settings.finance.ticker2From = e.target.value.toUpperCase();
      });
    }

    const financeTo2 = document.getElementById("financeTo2");
    if (financeTo2) {
      financeTo2.addEventListener("input", (e) => {
        if (!this.settings.finance) this.settings.finance = {};
        this.settings.finance.ticker2To = e.target.value.toUpperCase();
      });
    }

    // --- Gold Settings ---
    const goldEnabled = document.getElementById("goldEnabled");
    if (goldEnabled) {
      goldEnabled.addEventListener("change", (e) => {
        if (!this.settings.gold) this.settings.gold = {};
        this.settings.gold.enabled = e.target.checked;
      });
    }

    // --- Buttons ---
    document.getElementById("saveBtn").addEventListener("click", () => {
      this.handleSave();
    });

    document.getElementById("resetBtn").addEventListener("click", () => {
      this.handleReset();
    });

    document.getElementById("openNewTabBtn").addEventListener("click", () => {
      this.openNewTab();
    });

    document
      .getElementById("refreshExtensionBtn")
      .addEventListener("click", () => {
        this.refreshExtension();
      });
  }

  updateUI() {
    // Basic
    document.getElementById("userName").value = this.settings.userName || "";

    // AI
    if (this.settings.ai) {
      const keyInput = document.getElementById("geminiApiKey");
      if (keyInput) keyInput.value = this.settings.ai.apiKey || "";
    }

    // Weather
    if (this.settings.weather) {
      document.getElementById("weatherEnabled").checked =
        this.settings.weather.enabled !== false;
      document.getElementById("weatherLocation").value =
        this.settings.weather.location || "";
      document.getElementById("weatherUnit").value =
        this.settings.weather.unit || "metric";
      document.getElementById("weatherApiKey").value =
        this.settings.weather.apiKey || "";
    }

    // Sports
    if (this.settings.sports) {
      document.getElementById("sportsEnabled").checked =
        this.settings.sports.enabled !== false;
      const t1 = document.getElementById("sportsTeam1");
      const t2 = document.getElementById("sportsTeam2");
      if (t1) t1.value = this.settings.sports.team1 || "";
      if (t2) t2.value = this.settings.sports.team2 || "";
    }

    // Finance
    if (this.settings.finance) {
      document.getElementById("financeEnabled").checked =
        this.settings.finance.enabled !== false;
      const f1from = document.getElementById("financeFrom1");
      const f1to = document.getElementById("financeTo1");
      const f2from = document.getElementById("financeFrom2");
      const f2to = document.getElementById("financeTo2");
      if (f1from) f1from.value = this.settings.finance.ticker1From || "";
      if (f1to)   f1to.value   = this.settings.finance.ticker1To   || "";
      if (f2from) f2from.value = this.settings.finance.ticker2From || "";
      if (f2to)   f2to.value   = this.settings.finance.ticker2To   || "";
    }

    // Gold
    if (this.settings.gold) {
      document.getElementById("goldEnabled").checked =
        this.settings.gold.enabled !== false;
    }
  }

  async handleSave() {
    const saveBtn = document.getElementById("saveBtn");
    saveBtn.textContent = "Saving...";
    saveBtn.disabled = true;

    try {
      await chrome.storage.local.set({ xaiSettings: this.settings });
      this.showStatus("Settings saved successfully!", "success");

      // Notify all new tab pages to reload settings
      chrome.tabs.query(
        { url: chrome.runtime.getURL("newtab.html") },
        (tabs) => {
          tabs.forEach((tab) => {
            chrome.tabs.sendMessage(
              tab.id,
              {
                action: "settingsUpdated",
                settings: this.settings,
                weatherChanged: true,
                sportsChanged: true,
                financeChanged: true, // Force refresh finance
                goldChanged: true,
              },
              () => {
                if (chrome.runtime.lastError) {
                  /* Ignore if tab closed */
                }
              }
            );
          });
        }
      );

      // Auto-close popup
      setTimeout(() => {
        window.close();
      }, 1500);
    } catch (error) {
      console.error(error);
      this.showStatus("Error saving settings.", "error");
    }

    saveBtn.textContent = "Save Settings";
    saveBtn.disabled = false;
  }

  handleReset() {
    if (confirm("Reset all settings to default?")) {
      const defaultSettings = {
        userName: "",
        customBookmarks: [],
        weather: {
          enabled: true,
          unit: "metric",
          location: "",
          apiKey: "",
        },
        sports: {
          enabled: true,
          team1: "",
          team2: "",
        },
        finance: {
          enabled: true,
          ticker1From: "BTC",
          ticker1To: "USD",
          ticker2From: "EUR",
          ticker2To: "USD",
          cacheDuration: 900000,
        },
        gold: {
          enabled: true,
          cacheDuration: 900000,
        },
      };

      this.settings = { ...defaultSettings };
      this.updateUI();
      this.showStatus("Settings reset to defaults", "success");
    }
  }

  async openNewTab() {
    try {
      await chrome.tabs.create({ url: chrome.runtime.getURL("newtab.html") });
      window.close();
    } catch (error) {
      window.open("newtab.html", "_blank");
    }
  }

  async refreshExtension() {
    try {
      chrome.runtime.reload();
    } catch (error) {
      this.showStatus("Unable to refresh extension", "error");
    }
  }

  showStatus(message, type) {
    const statusElement = document.getElementById("statusMessage");
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `status-message ${type} show`;
      setTimeout(() => {
        statusElement.classList.remove("show");
      }, 3000);
    }
  }
}

// Initialize popup safely
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    new PopupController();
  });
} else {
  new PopupController();
}
