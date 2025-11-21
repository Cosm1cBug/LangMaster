i18n (Internationalization) + LibreTranslate Automation

A complete guide for setting up i18n, local JSON translations, and LibreTranslate on Windows, Linux, and Docker. Includes automatic translation scripts, outdated translation detection, and multilingual workflow.

---

# 📌 Table of Contents
1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [Installation](#installation)
   - [Windows](#windows-installation)
   - [Linux](#linux-installation)
   - [Docker Setup](#docker-setup)
4. [LibreTranslate Setup](#libretranslate-setup)
5. [Configuring i18n](#configuring-i18n)
6. [Translation Automation Scripts](#translation-automation-scripts)
   - [Translate Missing Keys](#translate-missing-keys)
   - [Detect Outdated Translations](#detect-outdated-translations)
7. [Usage Workflow](#usage-workflow)
8. [Optional Enhancements](#optional-enhancements)
9. [package.json Example](#packagejson-example)

---

# 📘 Overview
This repository provides:
- A base **en.json** file for English messages
- Auto-generation of other language files using **LibreTranslate**
- Automated detection of missing or outdated keys
- Cross-platform support
- Optional Docker environment for instant LibreTranslate usage

---

---

# 🛠 Installation

# Windows Installation
1. Install Node.js: https://nodejs.org
2. Install Git for Windows (optional): https://git-scm.com/download/win
3. Install dependencies:
   
   ```bash
   npm install
   ```
5. If using LibreTranslate locally, install Docker Desktop: https://www.docker.com/products/docker-desktop/
6. Start LibreTranslate:
   
   ```bash
   docker compose up -d
   ```

# Linux Installation
```bash
sudo apt update
sudo apt install -y nodejs npm git docker docker-compose-plugin
npm install
docker compose up -d
```

# Running Without Docker
You can install LibreTranslate locally:
```bash
pip install libretranslate
libretranslate --host 0.0.0.0 --port 5000
```

---

# 🧩 Docker Setup
`docker-compose.yml` automatically starts LibreTranslate with auto-downloading language models.

Start service:
```bash
docker compose up -d
```

Stop service:
```bash
docker compose down
```

LibreTranslate will run at:
```
http://localhost:5000
```

---

# 🌐 LibreTranslate Setup
If using Docker: Already handled.

Manual installation:
```bash
pip install libretranslate
libretranslate --load-only en,es,fr,de,ar --port 5000
```

Optional env vars:
```
LT_LOAD_ONLY=en,es,fr,de
LT_DEBUG=true
```

---

# ⚙️ Configuring i18n
Install i18n:
```bash
npm install i18n
```

Example **i18n-config.js**:
```js
const i18n = require("i18n");
const path = require("path");

i18n.configure({
  locales: ["en", "es", "fr", "de", "ar"],
  directory: path.join(__dirname, "locale"),
  defaultLocale: "en",
  objectNotation: true,
  updateFiles: false
});

module.exports = i18n;
```

---

# 🤖 Translation Automation Scripts

## 1️⃣ Translate Missing Keys
`scripts/translate.js` reads `en.json`, compares with other languages, and auto-translates missing keys using LibreTranslate.

Run:
```bash
npm run translate
```

## 2️⃣ Detect Missing Keys
Lists untranslated keys:
```bash
npm run detect-missing
```

## 3️⃣ Detect Outdated Translations
When `en.json` changes, this script warns other files.
```bash
npm run detect-outdated
```
---
---

# 🔄 Usage Workflow
1. **Edit your English master file:**
   ```
locale/en.json
```
2. Run auto-translation:
   ```
npm run translate
```
3. Check missing translations:
   ```
npm run detect-missing
```
4. Check outdated translations after modifying English text:
   ```
npm run detect-outdated
```
---
