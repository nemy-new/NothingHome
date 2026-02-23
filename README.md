# NothingHome

A sleek, "Nothing"-inspired New Tab Page extension for Google Chrome. It replaces your default new tab page with a minimalist, tech-brutalism aesthetic featuring dynamic widgets and essential tools.

## ✨ Features

- **Geometric Clock & Time/Date Widgets**: Unique Ndot-font inspired typography for timekeeping.
- **System Monitoring**: Real-time CPU and RAM usage tracking.
- **Battery Status**: Visual grid representation of your device's battery life.
- **Weather Integration**: Automatically fetches and displays local weather.
- **Quick AI Shortcuts**: One-click access to Google Gemini, ChatGPT, and Claude.
- **Custom Shortcuts & Top Sites**: Quickly navigate to your favorite websites.
- **Quick Memo**: A built-in scratchpad for quick notes.
- **Highly Customizable**: 
  - Toggle individual widgets on or off.
  - Switch between Dark and Light mode.
  - Upload your own custom wallpaper.

## 🚀 Installation

1. Download or clone this repository.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **"Developer mode"** in the top right corner.
4. Click on **"Load unpacked"** and select the directory containing this project (`NothingHome`).
5. Open a new tab to see NothingHome in action!

## 🛠️ Built With

- HTML, Vanilla CSS, Vanilla JavaScript
- Tech Brutalism / Nothing OS Aesthetic
- APIs utilized: `chrome.system.cpu`, `chrome.system.memory`, `chrome.storage.local`, `chrome.topSites`, Open-Meteo API.

## ⚙️ Permissions Used

- `storage` & `unlimitedStorage`: For saving widget layouts, custom wallpapers, and memos.
- `topSites`: To display your most visited websites.
- `geolocation`: To automatically fetch local weather data.
- `system.cpu` & `system.memory`: To display system resource monitoring.
- `favicon`: To load website icons for shortcuts.

## 📝 License

This project is for personal use and learning purposes. Feel free to fork and customize it!
