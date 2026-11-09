# ShareLink — Official Website

> **Your Files. Your Devices. Your Network.**  
> High-performance, offline-first cross-platform file transfer platform by **Gen Soft Tech**.

---

## 🌐 Public URLs

- **Official Website:** [https://gengadharan4656.github.io/sharelink/](https://gengadharan4656.github.io/sharelink/)
- **GitHub Repository:** [https://github.com/gengadharan4656/sharelink](https://github.com/gengadharan4656/sharelink)

---

## ⚡ What is ShareLink?

ShareLink is a private, offline-first file-sharing solution engineered by **Gen Soft Tech** (`com.gensofttech.sharelink`). It enables high-speed, direct file transfers between devices over local Wi-Fi or portable mobile hotspots without requiring internet connectivity or cloud storage.

### Supported Platforms & Modes
- **Android:** Native application with QR scanner, nearby peer discovery, and foreground streaming engine.
- **Windows PC:** Zero-install Web Receiver & Sender in Chrome, Edge, and Firefox.
- **iOS (iPhone/iPad):** Web Receiver & Sender in Safari via Web Crypto.
- **macOS / Linux:** Universal browser compatibility.

---

## 🛡️ Critical Architecture Separation

This website repository and the local Android transfer engine are strictly separated:

| Component | Host / Environment | Responsibility |
|:---|:---|:---|
| **Public Website** (This Repo) | GitHub Pages (`gengadharan4656.github.io/sharelink/`) | Product landing page, feature showcase, documentation, privacy policy, and APK distribution. **Never touches or proxies file transfers.** |
| **Local Transfer Engine** | Android Application (`com.gensofttech.sharelink`) | Ephemeral local HTTP server on private subnet (`192.168.x.x`), SLTP v2 40-byte framing, AES-256-GCM authenticated encryption, and P2P streaming. |

---

## 🚀 Website Deployment & Automation

This website is a lightweight, zero-dependency static site built with HTML5, CSS3, and modern vanilla JavaScript.

### Continuous Deployment
Deploys automatically to **GitHub Pages** via GitHub Actions on every push to the `main` branch.
Workflow file: [`.github/workflows/pages.yml`](.github/workflows/pages.yml)

### Local Preview
Because this site uses pure standard web technologies, it can be previewed locally using any lightweight static server:

```bash
# Python 3
python -m http.server 8000

# Node.js npx
npx serve .
```
Navigate to `http://localhost:8000`.

---

## 📄 Site Structure

- `index.html`: Main landing page, interactive UI preview, 3-step workflow, features grid, FAQ.
- `downloads.html`: Official release information, Android APK specifications, installation guide.
- `privacy.html`: Comprehensive privacy policy, permissions disclosure, and zero-telemetry guarantee.
- `docs.html`: Technical specification of the SLTP v2 wire protocol and AES-256-GCM AEAD encryption.
- `css/style.css`: Premium dark design system with emerald accents.
- `js/main.js`: Interactive navigation, FAQ accordion, and transfer preview simulation.
- `assets/`: Vector SVG logos and favicons.

---

## 👨‍💻 Developer & Brand

- **Brand:** ShareLink
- **Developer:** Gen Soft Tech
- **Application ID:** `com.gensofttech.sharelink`
- **License:** Proprietary / All rights reserved © 2026 Gen Soft Tech
