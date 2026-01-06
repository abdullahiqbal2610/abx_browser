# 🌌 ABX-One: The Intelligent Command Center

**ABX-One** is not just a Chrome Extension; it is a fully immersive **J.A.R.V.I.S.-inspired interface** for your browser.

Combining a cinematic "Void Energy" aesthetic with the power of **Google Gemini 2.5**, ABX-One transforms your new tab into a voice-activated, context-aware AI dashboard. It features live widgets (Weather, Sports, Crypto), a 3D parallax starfield, and a fully conversational AI HUD.

---

## ✨ Top Features

### 🤖 **J.A.R.V.I.S. AI Core (Gemini 2.5)**
* **Powered by Gemini 2.5 Flash:** The latest, fastest AI model with full context awareness.
* **Voice Activation:** Just say **"Hello Jarvis"** to wake the system, or press `Alt + J`.
* **Conversational Memory:** The AI remembers your previous questions in the session (e.g., "Who is Elon Musk?" -> "How old is he?").
* **Voice Response (TTS):** The system speaks back to you using a natural, human-sounding voice (Google US English).
* **Cinema Mode:** All widgets automatically fade into the background when the AI speaks, keeping your focus on the data stream.
* **Temporal Awareness:** The AI knows the exact current date and time.

### 🎨 **Immersive Visuals**
* **Void Reactor Core:** The AI toggle is a custom-animated "Arc Reactor" that pulses with neon purple energy.
* **3D Parallax Starfield:** A living background with 90+ stars of varying depths and glow intensities.
* **Glassmorphism UI:** Frosted glass panels for widgets and inputs.
* **Dynamic Animations:** Smooth transitions, hover effects, and "breathing" light elements.

### 🧩 **Smart Widgets**
* **🌤️ Live Weather:** Auto-detects location or uses custom cities. Shows humidity, wind, and "feels like" temps.
* **⚽ Sports Tracker:** Tracks your favorite team (e.g., Manchester United) with latest results and upcoming fixtures.
* **📈 Finance & Crypto:** Live ticker for Bitcoin (BTC), Ethereum (ETH), and market trends.
* **⚡ Smart Search:** Intelligent omnibox that differentiates between URLs and search queries.

### ⚙️ **Customization**
* **Personalization:** Set your preferred name (e.g., "Commander", "Abdullah").
* **API Management:** Bring your own keys for Gemini, OpenWeather, and TheSportsDB.
* **Visual Control:** Toggle animations, particle density, and widget visibility.
* **Data Persistence:** All settings are saved locally and persist across sessions.

---

## 🎮 Controls & Shortcuts

| Action | Command / Shortcut | Description |
| :--- | :--- | :--- |
| **Wake AI** | **`Alt + J`** | Instantly activates the microphone. |
| **Voice Command** | Say **"Hello Jarvis"** | Wakes the system and opens the AI HUD. |
| **Close AI** | **`Esc`** | Closes the AI window and restores widgets. |
| **Stop Speaking** | **Stop Button** | Mutes the AI voice but keeps the text. |

---

## 📥 Installation Guide

### Method 1: Manual Installation (Developer Mode)

1.  **Download the Code**
    * Clone this repository: `git clone https://github.com/yourusername/abx-one.git`
    * Or download the ZIP and extract it.

2.  **Load into Chrome**
    * Open Chrome and go to `chrome://extensions/`
    * Toggle **Developer mode** (top right corner).
    * Click **Load unpacked**.
    * Select the folder where you saved the files.

3.  **Initialize**
    * Open a new tab.
    * Click the **Gear Icon (Settings)** in the top right.
    * Enter your **Gemini API Key** (Get it free from [Google AI Studio](https://aistudio.google.com/)).
    * *(Optional)* Enter OpenWeather or SportsDB keys.
    * Reload the page.

---

## 🛠️ Technical Stack

* **Core:** HTML5, CSS3, Vanilla JavaScript (ES6+).
* **AI Engine:** Google Gemini API (v1beta / Gemini 2.5 Flash).
* **Voice:** Web Speech API (SpeechRecognition & SpeechSynthesis).
* **Architecture:** Manifest V3 (Modern Chrome Standard).
* **Styling:** Custom CSS Animations, Flexbox/Grid, SVG Filters.

---

## 📢 Changelog

### Version 3.0.0 (The J.A.R.V.I.S. Update)
* ✨ **NEW:** Complete AI overhaul with Gemini 2.5 Flash.
* ✨ **NEW:** Added "Void Reactor" animated toggle button.
* ✨ **NEW:** Implemented "Hello Jarvis" wake word and `Alt + J` shortcut.
* ✨ **NEW:** Added Conversational History (Chat Mode).
* ✨ **NEW:** Integrated Text-to-Speech (TTS) with voice selection logic.
* ✨ **NEW:** "Cinema Mode" (Widgets fade out during AI interaction).
* ✨ **NEW:** Finance/Crypto widget added.
* 🔄 **UPDATED:** Starfield background increased to 90 stars with depth variation.
* 🔄 **FIXED:** 404 Model Not Found errors by migrating to stable Gemini endpoints.

---

**Built with ❤️ by [Abdullah Iqbal]**

### 🏷️ Tags
`#AI` `#Jarvis` `#ChromeExtension` `#Gemini` `#Productivity` `#VoiceControl` `#WebDev`
