# ShareLink Public Website Structure

**Brand:** ShareLink  
**Developer:** Gen Soft Tech  
**Technology:** HTML5, CSS3, Vanilla ES6+ JavaScript  
**Zero-Dependency Design:** 0 external CDN assets, 0 web fonts, 0 runtime trackers  

---

## 1. Directory & File Layout

```
sharelink-website/
├── .github/
│   └── workflows/
│       └── pages.yml              # Official GitHub Pages deployment workflow
├── assets/
│   ├── favicon.svg                # Vector SVG icon for browser tab
│   └── logo.svg                   # Official ShareLink vector logo
├── css/
│   └── style.css                  # Premium dark theme stylesheet
├── js/
│   ├── connect.js                 # Cross-platform connection orchestrator & dashboard
│   ├── qr-scanner.js              # Offline camera QR code scanner & decoder
│   └── main.js                    # Mobile menu, FAQ accordion, transfer simulation
├── index.html                     # Primary landing page
├── connect.html                   # Cross-platform Connect & Transfer hub
├── downloads.html                 # Official release specs & sideloading instructions
├── privacy.html                   # Zero-telemetry offline privacy policy
├── docs.html                      # Technical SLTP v2 protocol specification
├── README.md                      # Repository overview & introduction
├── DEPLOYMENT.md                  # Deployment guide & verification steps
└── SITE_STRUCTURE.md              # File map & component breakdown
```

---

## 2. Component & Page Breakdown

### 1. `index.html` (Landing Page)
- **Header:** Sticky blurred navigation with SVG brand mark, navigation anchors, and CTA button.
- **Hero:** Punchy value proposition ("Your Files. Your Devices. Your Network."), badge, CTA buttons.
- **Architecture Banner:** Explains clear distinction between public website and offline Android engine.
- **Interactive Mockup:** Live UI simulation displaying active 512 KB chunk streaming, throughput speed, and SHA-256 verification.
- **How It Works:** 3-step card grid (Select, Scan QR, Transfer).
- **Core Features Grid:** 6 verified features with vector icons.
- **Platforms Grid:** Android, Windows, iOS, and macOS/Linux transfer mode matrix.
- **FAQ:** Interactive accordion with real architectural explanations.
- **CTA Box & Footer:** Comprehensive multi-column footer with developer attribution.

### 2. `connect.html` (Cross-Platform Connect & Transfer Hub)
- **Genuine Status Indicator:** Tracks and displays real states: Not Connected, Connecting, Waiting for Approval, Connected, Connection Lost, Session Expired.
- **Method A (QR Code Scan/Paste):** Live camera QR scanner (`navigator.mediaDevices.getUserMedia`) with laser scan effect, camera switcher, file upload fallback, and URL paste parser.
- **Method B (Manual IP & Port):** Direct subnet entry (`192.168.43.1` hotspot, `192.168.1.x` LAN) with port, session token, and protected pairing secret.
- **Browser Security & Mixed Content Handling:** Detects HTTPS-to-HTTP restrictions on public static hosts, providing seamless 1-click direct local session launch to Android transfer engine.
- **Live Transfer Dashboard:**
  - **Send Tab:** Multi-file and folder selector, drag-and-drop dropzone, file queue with deletion, and hardware-accelerated bounded streaming upload with real-time speed (MB/s) and ETA.
  - **Receive Tab:** File offering list with selective checkboxes, single/batch downloads.
  - **Transfer History:** Session logging table.

### 3. `downloads.html` (Downloads Portal)
- **App Specification Card:** Package ID (`com.gensofttech.sharelink`), version (`v2.0.0-beta.1`), APK size (~34 MB), min Android (API 26), target Android (API 34/36).
- **Download Action Button:** Centralized configurable button linking to official GitHub Releases.
- **Installation Guide:** Sideloading walkthrough for Android users.
- **Web Receiver Guide:** Step-by-step instructions for receiving on Windows, Mac, or iOS without installing apps.
- **Roadmap Table:** Cross-platform availability breakdown.

### 3. `privacy.html` (Privacy Policy)
- **Zero-Cloud Guarantee:** Confirms no files ever leave the local network.
- **Zero-Knowledge Pairing:** Details URL hash fragment privacy.
- **Permission Breakdown:** Camera, Nearby Devices, Storage, Notifications.
- **RAM Key Zeroization:** Defense against memory extraction.
- **Developer Contacts:** Gen Soft Tech official contact channels.

### 4. `docs.html` (Protocol Documentation)
- **System Architecture:** Ephemeral local server lifecycle.
- **SLTP v2 Wire Protocol:** Complete 40-byte binary frame byte-by-byte diagram.
- **Cryptographic Details:** AES-256-GCM, HKDF-SHA256, monotonic nonces.
- **High-Performance Streaming:** Socket backpressure and RFC 7233 range resumption.
- **Network Troubleshooting:** Hotspot mode and firewall instructions.

### 5. `css/style.css` (Design System)
- **Color Palette:**
  - Background: Charcoal / deep dark `#0A0D0E` and `#111618`
  - Cards: `#161D20` with hover state `#1C2529`
  - Accents: Emerald `#10B981`, `#059669`, and light mint `#34D399`
  - Typography: Crisp white `#F9FAFB` and muted gray `#9CA3AF`
- **Responsive Breakpoints:** 992px (tablets), 768px (mobile devices).
- **System Font Stack:** Native OS typography for 0 ms layout shift and 0 network requests.

### 6. `js/main.js` (Client Interactivity)
- `initMobileMenu()`: Hamburger toggle for mobile viewports.
- `initFaqAccordion()`: Animated question/answer disclosure.
- `initDownloadButtons()`: Configurable release handling.
- `initTransferSimulation()`: Realistic byte counter and MB/s throughput animation.
