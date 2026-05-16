# 🌌 ABX-One: The Intelligent Command Center

**ABX-One** is not just a Chrome Extension; it is a fully immersive **sci-fi inspired command center** for your browser.

Combining an aggressive, minimalist **x.ai aesthetic** with the power of **Google Gemini**, ABX-One transforms your new tab into a voice-activated, context-aware AI dashboard. It features a dynamic **Nebula Effects Engine**, glassmorphic live widgets, and a fully conversational AI HUD.

---

## ✨ Top Features

### 🤖 **J.A.R.V.I.S. AI Core (Gemini 2.5 Flash)**

- **Powered by Gemini 2.5 Flash:** The latest, fastest AI model with full context awareness.
- **Voice Activation:** Just say **"Hello Jarvis"** to wake the system, or press `Alt + J`.
- **Conversational Memory:** The AI remembers your previous questions in the session (e.g., "Who is Elon Musk?" → "How old is he?").
- **Voice Response (TTS):** The system speaks back using a natural, human-sounding voice (Google US English preferred, with Zira/Samantha fallback).
- **Cinema Mode:** All widgets automatically fade into the background when the AI modal is open, keeping your focus on the data stream.
- **Temporal Awareness:** The AI is told the exact current date and time before every query.
- **Follow-up Chat:** Reply to the AI via text or mic directly inside the modal window.

### 🎨 **Immersive Visuals**

- **x.ai Minimalist Dark Mode:** An aggressive, clean aesthetic featuring solid #0a0a0a surfaces, pill-shaped components, and 1px hairline borders.
- **Nebula Effects Engine:** A high-performance, canvas-based background system rendering a multi-colored animated aurora that subtly tracks your cursor.
- **Procedural Noise Overlay:** A fine-grain texture overlay that adds organic depth and a premium film-grain feel.
- **Floating Dust Particles:** Over 200 color-tinted "dust" particles that drift upward, creating a living, breathing atmosphere.
- **Glassmorphism 2.0:** Deep frosted-glass panels (`backdrop-filter: blur`) for all widgets, allowing the nebula effects to shimmer through.
- **Sci-Fi Accent Glows:** Interactive components feature vibrant color-tinted glows (Purple, Blue, Cyan, Gold) on hover and focus.
- **Dynamic Shimmer Greeting:** Your personalized greeting types out with a shimmering, animated color-gradient on your username.

### 🧩 **Smart Widgets**

- **🌤️ Live Weather:** Auto-detects your location via GPS or uses a custom city name. Shows temperature, "feels like", humidity, and wind speed. Supports Celsius and Fahrenheit.
- **⚽ Sports Tracker:** Tracks your favorite team using ESPN's unofficial API. Shows the last match result (score, competition, date) and the next upcoming fixture.
- **💹 Finance Ticker:** Live currency/crypto exchange rate for any configurable pair (e.g., BTC → USD) powered by the AlphaVantage API.
- **✅ Tasks (To-Do):** A persistent to-do list widget. Add, complete, and delete tasks. Includes a **Clear All** feature with a secure confirmation prompt.
- **⚡ Smart Search:** Intelligent omnibox that differentiates between URLs and search queries. Includes real-time **Google Autocomplete** suggestions as you type.

### 📌 **Quick Access & History**

- **🔖 Quick Access:** Displays your top visited sites (Chrome Top Sites) and bookmarks in a collapsible grid for one-click navigation.
- **🕒 Recent History:** Shows your 6 most recently visited pages with favicons, titles, and domain names.
- Both sections support **collapsible toggle** — click the section header to expand or collapse.

### 🌐 **Google Workspace Launcher**

- Click the **Apps** button on the new tab to open a full **Google Workspace** modal with direct links to:
  - Gmail, Google Drive, Docs, Sheets, Slides, Calendar, and Google Meet.
- A dedicated **Gemini** shortcut button in the right sidebar links directly to [gemini.google.com](https://gemini.google.com).

### 🕌 **Dual Calendar Clock**

- The time display shows: `HH:MM AM/PM • Weekday, Month Day • Islamic (Hijri) Date`
- Includes automatic **Islamic/Hijri calendar** conversion using the `islamic-umalqura` locale standard.

### ⚙️ **Customization (Settings Popup)**

- **Personalization:** Set your name for time-based greetings (Good Morning/Afternoon/Evening, \<name\>).
- **Animations:** Toggle animations on/off, and control the particle density via a slider.
- **API Management:** Bring your own keys for Gemini, OpenWeatherMap, and AlphaVantage.
- **Widget Visibility:** Enable or disable each widget (Weather, Sports, Finance) independently.
- **Finance Pair:** Set any currency or crypto pair (e.g., ETH → USD, EUR → JPY).
- **Data Persistence:** All settings are saved to `chrome.storage.local` and persist across sessions.

---

## 🎮 Controls & Shortcuts

| Action                 | Command / Shortcut            | Description                                              |
| :--------------------- | :---------------------------- | :------------------------------------------------------- |
| **Toggle AI Mode**     | **Arc Reactor Button**        | Activates AI mode — search bar becomes a JARVIS prompt.  |
| **Wake AI (Voice)**    | **`Alt + J`**                 | Instantly activates the microphone.                      |
| **Wake Word**          | Say **"Hello Jarvis"**        | Wakes the system and switches to AI mode.                |
| **Exit Voice Command** | Say **"Jarvis Over and Out"** | Deactivates AI mode and returns to standard search.      |
| **Close AI Modal**     | **`Esc`** or **✕ button**    | Closes the AI window and restores all widgets.           |
| **Stop Speaking**      | **Stop Voice Button**         | Mutes the AI voice output but keeps the text on screen.  |
| **Open Settings**      | **⚙️ Gear Icon**              | Opens the extension settings popup.                      |
| **Collapse Section**   | Click section header          | Toggles Quick Access or Recent History sections.         |

---

## 📥 Installation Guide

### Method 1: Manual Installation (Developer Mode)

1.  **Download the Code**

    - Clone this repository: `git clone https://github.com/abdullahiqbal2610/abx_browser.git`
    - Or download the ZIP and extract it.

2.  **Load into Chrome**

    - Open Chrome and go to `chrome://extensions/`
    - Toggle **Developer mode** (top right corner).
    - Click **Load unpacked**.
    - Select the folder where you saved the files.

3.  **Initialize**
    - Open a new tab — the ABX-One interface will load automatically.
    - Click the **⚙️ Gear Icon** (Settings) in the top-right corner of the new tab.
    - Enter your **Gemini API Key** (Get it free from [Google AI Studio](https://aistudio.google.com/)).
    - _(Optional)_ Enter your **OpenWeatherMap** key for live weather data.
    - _(Optional)_ Enter a team name for sports tracking (e.g., Barcelona, Inter Miami).
    - _(Optional)_ Enter your **AlphaVantage** key and a currency pair for the Finance ticker.
    - Click **Save Settings** and reload the tab.

---

## 🛠️ Technical Stack

| Layer           | Technology                                                  |
| :-------------- | :---------------------------------------------------------- |
| **Core**        | HTML5, CSS3, Vanilla JavaScript (ES6+)                      |
| **AI Engine**   | Google Gemini API (`v1beta` / `gemini-2.5-flash`)           |
| **Voice Input** | Web Speech API (`webkitSpeechRecognition`)                  |
| **Voice Output**| Web Speech API (`SpeechSynthesis`)                          |
| **Weather**     | OpenWeatherMap API (Geocoding + Current Weather)            |
| **Sports**      | ESPN Unofficial API (Team Search, Last/Next Events)             |
| **Finance**     | AlphaVantage API (`CURRENCY_EXCHANGE_RATE`)                 |
| **Search**      | Google Suggest API (Autocomplete)                           |
| **Storage**     | `chrome.storage.local`                                      |
| **Architecture**| Chrome Extension Manifest V3                               |
| **Styling**     | Custom CSS Animations, Flexbox/Grid, Glassmorphism, SVG     |

---

## 📢 Changelog

### Version 3.0.0 (The J.A.R.V.I.S. Update)

- ✨ **NEW:** Complete AI overhaul — powered by Gemini 2.5 Flash.
- ✨ **NEW:** "Void Reactor" animated Arc Reactor toggle button.
- ✨ **NEW:** "Hello Jarvis" wake word and `Alt + J` keyboard shortcut.
- ✨ **NEW:** Conversational Chat History (context-aware follow-up questions).
- ✨ **NEW:** Text-to-Speech (TTS) with prioritized voice selection (Google US English).
- ✨ **NEW:** Cinema Mode — widgets fade during AI interaction.
- ✨ **NEW:** Finance / Currency Exchange Ticker (AlphaVantage).
- ✨ **NEW:** To-Do / Tasks widget with persistent local storage.
- ✨ **NEW:** Google Workspace apps launcher modal (Drive, Docs, Sheets, etc.).
- ✨ **NEW:** Islamic/Hijri calendar date displayed alongside Gregorian date.
- ✨ **NEW:** Typewriter animation for personalized greeting.
- ✨ **NEW:** Google Autocomplete suggestions in the search bar.
- ✨ **NEW:** Mouse cursor trail particle effect.
- 🔄 **UPDATED:** Starfield background expanded to **240 stars** with depth variation.
- 🔄 **UPDATED:** Sports widget shows both last match score and next upcoming fixture.
- 🔄 **FIXED:** 404 Model Not Found errors by migrating to stable Gemini endpoints.

### Version 4.0.0 (The Nebula Update)

- ✨ **NEW:** Comprehensive UI overhaul inspired by the **x.ai** minimalist aesthetic.
- ✨ **NEW:** **Nebula Background Engine** — Animated, color-blended aurora effect using externalized `effects.js` (CSP Compliant).
- ✨ **NEW:** **Atmospheric Dust Field** — 200+ procedural particles with randomized drift and color tints.
- ✨ **NEW:** **Glassmorphism Overhaul** — Frosted glass panels applied to all widgets, including Gmail, Apps, and Settings.
- ✨ **NEW:** **Sci-Fi Color System** — Targeted accent glows for interactive states (Purple/Blue/Cyan/Gold palette).
- ✨ **NEW:** **Shimmer Greeting** — Username now features a shimmering, animated color gradient during the typewriter effect.
- ✨ **NEW:** **Clear All Tasks** — Added a trash icon to the Todo widget for batch-clearing tasks.
- 🔄 **UPDATED:** Settings Popup redesigned with a nebula-inspired background and glassmorphic inputs.
- 🔄 **UPDATED:** Removed legacy particle/starfield logic in favor of the new high-performance Canvas engine.
- 🔄 **TECHNICAL:** Fully CSP-compliant background effects (removed all inline scripts).
- 🔄 **FIXED:** Resolved stray syntax errors in `popup.js` that caused settings to hang.

---

**Built with ❤️ by [Muhammad Abdullah Iqbal](https://github.com/abdullahiqbal2610)**

### 🏷️ Tags

`#AI` `#Jarvis` `#ChromeExtension` `#Gemini` `#Productivity` `#VoiceControl` `#WebDev` `#Todo` `#Weather` `#Sports` `#Finance`
