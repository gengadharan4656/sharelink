/**
 * ShareLink — Official Website Client Logic (Gen Soft Tech)
 * Lightweight, zero-dependency script for interactive components.
 */

// Global Configuration
const ShareLinkConfig = {
  version: "2.0.0-beta.1",
  appId: "com.gensofttech.sharelink",
  githubRepoUrl: "https://github.com/gengadharan4656/sharelink",
  githubPagesUrl: "https://gengadharan4656.github.io/sharelink/",
  // Configurable single-point download URL:
  apkDownloadUrl: "https://github.com/gengadharan4656/sharelink/releases",
  isReleaseAvailable: false // Release pending state as per prompt requirements
};

document.addEventListener("DOMContentLoaded", () => {
  initMobileMenu();
  initFaqAccordion();
  initDownloadButtons();
  initTransferSimulation();
});

// 1. Mobile Menu Toggle
function initMobileMenu() {
  const toggleBtn = document.getElementById("mobileMenuBtn");
  const navLinks = document.getElementById("navLinks");

  if (!toggleBtn || !navLinks) return;

  toggleBtn.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("mobile-open");
    toggleBtn.setAttribute("aria-expanded", isOpen);
    toggleBtn.innerHTML = isOpen ? "✕" : "☰";
  });

  // Close menu on navigation click
  navLinks.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("mobile-open");
      if (toggleBtn) toggleBtn.innerHTML = "☰";
    });
  });
}

// 2. FAQ Accordion
function initFaqAccordion() {
  const faqItems = document.querySelectorAll(".faq-item");

  faqItems.forEach(item => {
    const questionBtn = item.querySelector(".faq-question");
    if (!questionBtn) return;

    questionBtn.addEventListener("click", () => {
      const isOpen = item.classList.contains("open");

      // Optional: close other accordions
      faqItems.forEach(other => {
        if (other !== item) other.classList.remove("open");
      });

      item.classList.toggle("open", !isOpen);
    });
  });
}

// 3. Download Button Handling
function initDownloadButtons() {
  const downloadBtns = document.querySelectorAll(".btn-download-apk");

  downloadBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      if (!ShareLinkConfig.isReleaseAvailable) {
        // Show friendly modal / toast or navigate to releases page
        const noticeEl = document.getElementById("downloadNotice");
        if (noticeEl) {
          e.preventDefault();
          noticeEl.style.display = "block";
          noticeEl.scrollIntoView({ behavior: "smooth" });
        }
      }
    });
  });
}

// 4. Hero Preview Transfer Simulation
function initTransferSimulation() {
  const progressFill = document.getElementById("simProgressFill");
  const statsSpeed = document.getElementById("simSpeed");
  const statsBytes = document.getElementById("simBytes");
  const statsEta = document.getElementById("simEta");

  if (!progressFill || !statsSpeed || !statsBytes || !statsEta) return;

  const totalSizeMB = 248.5;
  let currentMB = 48.2;
  let speedMBps = 24.6;

  setInterval(() => {
    currentMB += 4.2;
    if (currentMB > totalSizeMB) {
      currentMB = 12.0; // Loop simulation
    }

    const pct = Math.min(100, Math.round((currentMB / totalSizeMB) * 100));
    const remainingMB = Math.max(0, totalSizeMB - currentMB);
    const etaSec = Math.max(1, Math.round(remainingMB / speedMBps));

    // Jitter speed realistically (22 MB/s to 28 MB/s on local 5GHz Wi-Fi)
    speedMBps = (22.0 + Math.random() * 6.5).toFixed(1);

    progressFill.style.width = pct + "%";
    statsSpeed.textContent = speedMBps + " MB/s";
    statsBytes.textContent = currentMB.toFixed(1) + " MB / " + totalSizeMB + " MB (" + pct + "%)";
    statsEta.textContent = etaSec + "s";
  }, 350);
}
