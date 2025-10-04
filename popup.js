// xAI Chrome Extension - Popup Script with Sports Settings
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
        this.settings = { ...this.settings, ...result.xaiSettings };
      }
    } catch (error) {
      console.log("Using default settings");
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.sync.set({ xaiSettings: this.settings });
      return true;
    } catch (error) {
      console.error("Error saving settings:", error);
      return false;
    }
  }

  setupEventListeners() {
    // User name input
    const userNameInput = document.getElementById("userName");
    userNameInput.addEventListener("input", (e) => {
      this.settings.userName = e.target.value;
    });

    // Animations toggle
    const animationsToggle = document.getElementById("animationsEnabled");
    animationsToggle.addEventListener("change", (e) => {
      this.settings.animationsEnabled = e.target.checked;
    });

    // Particle count slider
    const particleSlider = document.getElementById("particleCount");
    const particleValue = document.getElementById("particleValue");

    particleSlider.addEventListener("input", (e) => {
      const value = parseInt(e.target.value);
      this.settings.particleCount = value;
      particleValue.textContent = value;
    });

    // Weather settings
    const weatherEnabled = document.getElementById("weatherEnabled");
    weatherEnabled.addEventListener("change", (e) => {
      if (!this.settings.weather) this.settings.weather = {};
      this.settings.weather.enabled = e.target.checked;
    });

    const weatherLocation = document.getElementById("weatherLocation");
    weatherLocation.addEventListener("input", (e) => {
      if (!this.settings.weather) this.settings.weather = {};
      this.settings.weather.location = e.target.value;
    });

    const weatherUnit = document.getElementById("weatherUnit");
    weatherUnit.addEventListener("change", (e) => {
      if (!this.settings.weather) this.settings.weather = {};
      this.settings.weather.unit = e.target.value;
    });

    const weatherApiKey = document.getElementById("weatherApiKey");
    weatherApiKey.addEventListener("input", (e) => {
      if (!this.settings.weather) this.settings.weather = {};
      this.settings.weather.apiKey = e.target.value || "";
    });

    // Sports settings
    const sportsEnabled = document.getElementById("sportsEnabled");
    sportsEnabled.addEventListener("change", (e) => {
      if (!this.settings.sports) this.settings.sports = {};
      this.settings.sports.enabled = e.target.checked;
    });

    const sportsTeamName = document.getElementById("sportsTeamName");
    sportsTeamName.addEventListener("input", (e) => {
      if (!this.settings.sports) this.settings.sports = {};
      this.settings.sports.teamName = e.target.value;
    });

    const sportsApiKey = document.getElementById("sportsApiKey");
    sportsApiKey.addEventListener("input", (e) => {
      if (!this.settings.sports) this.settings.sports = {};
      this.settings.sports.apiKey = e.target.value || "";
    });

    // Save button
    document.getElementById("saveBtn").addEventListener("click", () => {
      this.handleSave();
    });

    // Reset button
    document.getElementById("resetBtn").addEventListener("click", () => {
      this.handleReset();
    });

    // Quick action buttons
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
    // Update form fields with current settings
    document.getElementById("userName").value = this.settings.userName || "";
    document.getElementById("animationsEnabled").checked =
      this.settings.animationsEnabled;
    document.getElementById("particleCount").value =
      this.settings.particleCount;
    document.getElementById("particleValue").textContent =
      this.settings.particleCount;

    // Update weather settings
    if (this.settings.weather) {
      document.getElementById("weatherEnabled").checked =
        this.settings.weather.enabled !== false;
      document.getElementById("weatherLocation").value =
        this.settings.weather.location || "";
      document.getElementById("weatherUnit").value =
        this.settings.weather.unit || "metric";
      document.getElementById("weatherApiKey").value =
        this.settings.weather.apiKey &&
        this.settings.weather.apiKey !== "YOUR_API_KEY"
          ? this.settings.weather.apiKey
          : "";

      this.originalWeatherSettings = {
        enabled: this.settings.weather.enabled !== false,
        location: this.settings.weather.location || "",
        unit: this.settings.weather.unit || "metric",
        apiKey: this.settings.weather.apiKey || "",
      };
    }

    // Update sports settings
    if (this.settings.sports) {
      document.getElementById("sportsEnabled").checked =
        this.settings.sports.enabled !== false;
      document.getElementById("sportsTeamName").value =
        this.settings.sports.teamName || "";
      document.getElementById("sportsApiKey").value =
        this.settings.sports.apiKey &&
        this.settings.sports.apiKey !== "YOUR_API_KEY"
          ? this.settings.sports.apiKey
          : "";

      this.originalSportsSettings = {
        enabled: this.settings.sports.enabled !== false,
        teamName: this.settings.sports.teamName || "",
        apiKey: this.settings.sports.apiKey || "",
      };
    }
  }

  async handleSave() {
    const saveBtn = document.getElementById("saveBtn");
    const statusMessage = document.getElementById("statusMessage");

    // Check if settings changed
    const weatherChanged = this.hasWeatherSettingsChanged();
    const sportsChanged = this.hasSportsSettingsChanged();

    // Update button state
    saveBtn.textContent = "Saving...";
    saveBtn.disabled = true;

    try {
      const success = await this.saveSettings();

      if (success) {
        this.showStatus("Settings saved successfully!", "success");

        // Notify all new tab pages to reload settings
        this.notifyNewTabPages(weatherChanged, sportsChanged);

        // Auto-close popup after 1.5 seconds
        setTimeout(() => {
          window.close();
        }, 1500);
      } else {
        this.showStatus("Failed to save settings. Please try again.", "error");
      }
    } catch (error) {
      this.showStatus("An error occurred while saving.", "error");
    }

    // Reset button state
    saveBtn.textContent = "Save Settings";
    saveBtn.disabled = false;
  }

  handleReset() {
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
    };

    this.settings = { ...defaultSettings };
    this.updateUI();
    this.showStatus("Settings reset to defaults", "success");
  }

  async openNewTab() {
    try {
      await chrome.tabs.create({
        url: chrome.runtime.getURL("newtab.html"),
      });
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

  hasWeatherSettingsChanged() {
    if (!this.originalWeatherSettings) {
      return false;
    }

    const current = this.settings.weather || {};
    const original = this.originalWeatherSettings;

    return (
      current.enabled !== original.enabled ||
      current.location !== original.location ||
      current.unit !== original.unit ||
      current.apiKey !== original.apiKey
    );
  }

  hasSportsSettingsChanged() {
    if (!this.originalSportsSettings) {
      return false;
    }

    const current = this.settings.sports || {};
    const original = this.originalSportsSettings;

    return (
      current.enabled !== original.enabled ||
      current.teamName !== original.teamName ||
      current.apiKey !== original.apiKey
    );
  }

  async notifyNewTabPages(weatherChanged = false, sportsChanged = false) {
    try {
      const tabs = await chrome.tabs.query({
        url: chrome.runtime.getURL("newtab.html"),
      });

      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(
          tab.id,
          {
            action: "settingsUpdated",
            settings: this.settings,
            weatherChanged: weatherChanged,
            sportsChanged: sportsChanged,
          },
          () => {
            if (chrome.runtime.lastError) {
              console.log("Tab not ready for message");
            }
          }
        );
      });
    } catch (error) {
      console.log("Could not notify new tab pages");
    }
  }

  showStatus(message, type) {
    const statusElement = document.getElementById("statusMessage");
    statusElement.textContent = message;
    statusElement.className = `status-message ${type} show`;

    setTimeout(() => {
      statusElement.classList.remove("show");
    }, 3000);
  }
}

// Initialize popup when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  new PopupController();
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    new PopupController();
  });
} else {
  new PopupController();
}
