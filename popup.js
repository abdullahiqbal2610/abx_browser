// xAI Chrome Extension - Popup Script with Ticker Settings
class PopupController {
  constructor() {
    this.settings = {
      animationsEnabled: true,
      particleCount: 15,
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
        teamName: "",
        apiKey: "",
      },
      // Simplified Finance Settings (Single Ticker)
      finance: {
        enabled: true,
        fromCurrency: "BTC",
        toCurrency: "USD",
        apiKey: "",
        cacheDuration: 900000, // 15 mins
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
      const result = await chrome.storage.sync.get(["xaiSettings"]);
      if (result.xaiSettings) {
        // Merge saved settings with defaults
        this.settings = {
          ...this.settings,
          ...result.xaiSettings,
          finance: { ...this.settings.finance, ...result.xaiSettings.finance },
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

    const animationsToggle = document.getElementById("animationsEnabled");
    if (animationsToggle) {
      animationsToggle.addEventListener("change", (e) => {
        this.settings.animationsEnabled = e.target.checked;
      });
    }

    const particleSlider = document.getElementById("particleCount");
    const particleValue = document.getElementById("particleValue");
    if (particleSlider) {
      particleSlider.addEventListener("input", (e) => {
        const value = parseInt(e.target.value);
        this.settings.particleCount = value;
        particleValue.textContent = value;
      });
    }

    // ... inside setupEventListeners, after Finance settings ...

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

    const sportsTeamName = document.getElementById("sportsTeamName");
    if (sportsTeamName) {
      sportsTeamName.addEventListener("input", (e) => {
        if (!this.settings.sports) this.settings.sports = {};
        this.settings.sports.teamName = e.target.value;
      });
    }

    const sportsApiKey = document.getElementById("sportsApiKey");
    if (sportsApiKey) {
      sportsApiKey.addEventListener("input", (e) => {
        if (!this.settings.sports) this.settings.sports = {};
        this.settings.sports.apiKey = e.target.value || "";
      });
    }

    // --- Finance Settings (NEW SIMPLIFIED LOGIC) ---
    const financeEnabled = document.getElementById("financeEnabled");
    if (financeEnabled) {
      financeEnabled.addEventListener("change", (e) => {
        if (!this.settings.finance) this.settings.finance = {};
        this.settings.finance.enabled = e.target.checked;
      });
    }

    const financeFrom = document.getElementById("financeFrom");
    if (financeFrom) {
      financeFrom.addEventListener("input", (e) => {
        if (!this.settings.finance) this.settings.finance = {};
        this.settings.finance.fromCurrency = e.target.value.toUpperCase();
      });
    }

    const financeTo = document.getElementById("financeTo");
    if (financeTo) {
      financeTo.addEventListener("input", (e) => {
        if (!this.settings.finance) this.settings.finance = {};
        this.settings.finance.toCurrency = e.target.value.toUpperCase();
      });
    }

    const financeApiKey = document.getElementById("financeApiKey");
    if (financeApiKey) {
      financeApiKey.addEventListener("input", (e) => {
        if (!this.settings.finance) this.settings.finance = {};
        this.settings.finance.apiKey = e.target.value || "";
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
    document.getElementById("animationsEnabled").checked =
      this.settings.animationsEnabled;
    document.getElementById("particleCount").value =
      this.settings.particleCount;
    document.getElementById("particleValue").textContent =
      this.settings.particleCount;

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
      document.getElementById("sportsTeamName").value =
        this.settings.sports.teamName || "";
      document.getElementById("sportsApiKey").value =
        this.settings.sports.apiKey || "";
    }

    // Finance (NEW)
    if (this.settings.finance) {
      document.getElementById("financeEnabled").checked =
        this.settings.finance.enabled !== false;
      document.getElementById("financeFrom").value =
        this.settings.finance.fromCurrency || "";
      document.getElementById("financeTo").value =
        this.settings.finance.toCurrency || "";
      document.getElementById("financeApiKey").value =
        this.settings.finance.apiKey || "";
    }
  }

  async handleSave() {
    const saveBtn = document.getElementById("saveBtn");
    saveBtn.textContent = "Saving...";
    saveBtn.disabled = true;

    try {
      await chrome.storage.sync.set({ xaiSettings: this.settings });
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
        animationsEnabled: true,
        particleCount: 15,
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
          teamName: "",
          apiKey: "",
        },
        finance: {
          enabled: true,
          fromCurrency: "BTC",
          toCurrency: "USD",
          apiKey: "",
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
