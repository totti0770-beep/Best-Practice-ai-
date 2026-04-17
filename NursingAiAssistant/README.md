# Ai Nursing Assistance

A React Native CLI application providing an **offline, evidence-based clinical reference** for nursing staff.

## Features

- **Offline RAG engine** — answers come exclusively from uploaded official PDFs
- **Bilingual** — Arabic (RTL) and English (LTR) with automatic font switching
- **Encrypted database** — SQLite + SQLCipher (AES-256)
- **Anti-hallucination** — refuses to answer when no relevant PDF context is found
- **Biometric admin panel** — fingerprint / face authentication required to upload documents
- **Audit log** — every query and upload is recorded for quality review
- **Dark mode** — optimised for night-shift nursing environments

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| React Native CLI | ≥ 0.73 |
| Android Studio + NDK | latest stable |
| JDK | 11 |

---

## Installation

```bash
# 1. Clone and enter the project
cd NursingAiAssistant

# 2. Install JS dependencies
npm install

# 3. (Android) Link native assets (fonts)
npx react-native-asset

# 4. (iOS only) Install CocoaPods
cd ios && pod install && cd ..
```

---

## Font Setup

1. Download **Tajawal** (Arabic) and **Inter** (English) font families in `.ttf` format.
2. Place the files in `src/assets/fonts/`:
   ```
   src/assets/fonts/
     Tajawal-Regular.ttf
     Tajawal-Bold.ttf
     Inter-Regular.ttf
     Inter-Bold.ttf
   ```
3. Run `npx react-native-asset` to link them to the native projects.

---

## AI Model Setup

The offline LLM uses [llama.rn](https://github.com/mybigday/llama.rn) and requires a GGUF model file.

1. Download a lightweight model such as `Phi-3-mini-4k-instruct-q4.gguf` (~2 GB).
2. Place it at:
   ```
   android/app/src/main/assets/models/nursing_model.gguf
   ```
3. For iOS, add the file to the Xcode project under `Copy Bundle Resources`.

> **Note:** The final APK will be ~2–3 GB due to the embedded model.

---

## Running on Android

```bash
# Connect a physical device (recommended — emulators lack biometric support
# and may not have enough RAM for the AI model)
npx react-native run-android
```

For a release build:
```bash
npx react-native run-android --variant=release
```

---

## Running on iOS (macOS only)

```bash
npx react-native run-ios
```

---

## Uploading Reference Documents

1. Open the app and tap **Admin Panel** at the bottom of the home screen.
2. Authenticate with your fingerprint or face ID.
3. Tap the upload button for the relevant category (Pharmacy / Policies / Quality).
4. Select the official PDF from your device storage.
5. Wait for the processing indicator to finish — the document is now indexed.

---

## Project Structure

```
NursingAiAssistant/
├── App.js                        # Root component — DB init, navigation setup
├── react-native.config.js        # Font asset linking
├── src/
│   ├── i18n/index.js             # Arabic/English translations + RTL logic
│   ├── database/db.js            # Encrypted SQLite (SQLCipher)
│   ├── services/
│   │   ├── aiEngine.js           # RAG engine + anti-hallucination guard
│   │   ├── llamaService.js       # llama.rn offline LLM interface
│   │   ├── pdfService.js         # PDF extraction, chunking, SHA-256 checksum
│   │   └── auditService.js       # Audit log read/write
│   ├── screens/
│   │   ├── HomeScreen.js         # 3-tile dashboard
│   │   ├── ChatScreen.js         # Clinical chat with source attribution
│   │   ├── AdminScreen.js        # Biometric-protected document upload
│   │   └── AuditScreen.js        # Audit log viewer
│   ├── components/
│   │   └── LanguageSwitcher.js   # AR ↔ EN toggle button
│   └── styles/
│       ├── colors.js             # Dark-mode colour palette
│       └── typography.js         # Dynamic font family helper
└── android/
    └── app/src/main/
        └── AndroidManifest.xml   # Permissions + largeHeap flag
```

---

## Security Notes

- The SQLCipher database key in `db.js` is a **development placeholder**. Before production, derive the key from the device Keystore / Secure Enclave.
- The app contains **no network calls** — it is intentionally air-gapped.
- All PDF uploads require biometric authentication.
- SHA-256 checksums are stored alongside every document to detect tampering.
