# ShareLink Website Deployment Guide

**Target Website URL:** `https://gengadharan4656.github.io/sharelink/`  
**GitHub Repository:** `https://github.com/gengadharan4656/sharelink`  
**Publisher:** Gen Soft Tech  

---

## 1. GitHub Pages Configuration

The repository is configured to build and deploy using the official **GitHub Actions Pages workflow**.

### Workflow Trigger
The workflow `.github/workflows/pages.yml` triggers automatically on:
1. Every git push to branch `main`.
2. Manual execution via `workflow_dispatch` from the GitHub Actions console.

### Permissions
```yaml
permissions:
  contents: read
  pages: write
  id-token: write
```

### Steps Executed
1. `actions/checkout@v4`: Checks out the repository files.
2. `actions/configure-pages@v5`: Automatically detects repository base path (`/sharelink/`).
3. `actions/upload-pages-artifact@v3`: Packages the static files (`.` root directory).
4. `actions/deploy-pages@v4`: Deploys to GitHub Pages servers.

---

## 2. Base Path & Relative Asset Link Strategy

Because GitHub Pages serves project websites under a sub-path (`/sharelink/`):
- All links use relative paths:
  - `href="./"` or `href="downloads.html"`
  - `href="css/style.css"`
  - `src="js/main.js"`
  - `src="assets/logo.svg"`
- Absolute root paths (e.g. `/css/style.css`) are strictly avoided so pages resolve without 404 errors regardless of domain or subfolder mounting.

---

## 3. Local Development & Verification

1. Clone or open the repository:
   ```bash
   cd sharelink-website
   ```
2. Start any local static web server:
   ```bash
   python -m http.server 8080
   ```
3. Open `http://localhost:8080` in your browser.
4. Verify responsive design by resizing browser or opening DevTools (F12) device mode (iPhone, Pixel, iPad, Desktop).

---

## 4. Troubleshooting & Verification Checklist

- [x] `index.html` loads with no console errors.
- [x] SVG logo and favicon display correctly.
- [x] Navigation between `index.html`, `downloads.html`, `privacy.html`, and `docs.html` works seamlessly.
- [x] FAQ accordion opens and closes smoothly.
- [x] Hero transfer preview animates with realistic throughput.
- [x] GitHub Actions workflow completes with status green.
- [x] `https://gengadharan4656.github.io/sharelink/` responds with HTTP 200 OK.
