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
