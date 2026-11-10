/**
 * ShareLink — Cross-Platform Connect & Transfer Controller
 * Handles Bidirectional QR pairing (Method A, B, C), manual pairing code negotiation,
 * Mixed Content routing, rate limiting, and authenticated Send & Receive dashboard logic.
 */

// Global Connection State Model
const ConnectionState = {
  NOT_CONNECTED: 'not_connected',
  CONNECTING: 'connecting',
  WAITING_APPROVAL: 'waiting_approval',
  CONNECTED: 'connected',
  CONNECTION_LOST: 'connection_lost',
  SESSION_EXPIRED: 'session_expired'
};

const ConnectApp = {
  state: ConnectionState.NOT_CONNECTED,
  activeTarget: {
    ip: '192.168.43.1',
    port: '8080',
    token: '',
    secret: ''
  },
  desktopSession: {
    sessionId: '',
    pairingSecret: '',
    pairingCode: '',
    pairingUrl: ''
  },
  pendingPairingRequest: null,
  deviceInfo: null,
  availableFiles: [],
  selectedUploadFiles: [],
  activeUploadXhr: null,
  qrScanner: null,

  init() {
    this.updateStatusBadge(ConnectionState.NOT_CONNECTED);
    this.initMethodTabs();
    this.initDesktopQr();
    this.initQRScanner();
    this.initManualInputs();
    this.initFilePicker();
    this.checkUrlParameters();
  },

  // 1. Connection State UI Update
  updateStatusBadge(state, details = '') {
    this.state = state;
    const badgeEl = document.getElementById('connectionStatusBadge');
    const statusTextEl = document.getElementById('connectionStatusText');
    const deviceBarEl = document.getElementById('connectedDeviceBar');

    if (!badgeEl || !statusTextEl) return;

    badgeEl.className = 'status-pill status-' + state;

    switch (state) {
      case ConnectionState.NOT_CONNECTED:
        statusTextEl.innerText = 'Not Connected';
        if (deviceBarEl) deviceBarEl.style.display = 'none';
        break;
      case ConnectionState.CONNECTING:
        statusTextEl.innerText = 'Connecting to ' + (this.activeTarget.ip || 'device') + '...';
        break;
      case ConnectionState.WAITING_APPROVAL:
        statusTextEl.innerText = 'Waiting for Host Approval (' + (details || 'Host') + ')...';
        break;
      case ConnectionState.CONNECTED:
        statusTextEl.innerText = 'Connected: ' + (details || 'ShareLink Device');
        if (deviceBarEl) deviceBarEl.style.display = 'flex';
        break;
      case ConnectionState.CONNECTION_LOST:
        statusTextEl.innerText = 'Connection Lost • Host Unreachable';
        break;
      case ConnectionState.SESSION_EXPIRED:
        statusTextEl.innerText = 'Session Expired • Refresh QR Code';
        break;
    }
  },

  // 2. Tab Navigation between Methods
  initMethodTabs() {
    const tabBtns = document.querySelectorAll('.method-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        this.switchToMethod(targetId);
      });
    });

    // Dashboard Internal Tabs (Send vs Receive vs History)
    const dashTabs = document.querySelectorAll('.dash-tab-btn');
    dashTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        dashTabs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        document.querySelectorAll('.dash-pane').forEach(pane => {
          pane.style.display = pane.id === targetId ? 'block' : 'none';
        });
      });
    });
  },

  switchToMethod(targetId) {
    const tabBtns = document.querySelectorAll('.method-tab-btn');
    tabBtns.forEach(btn => {
      const match = btn.getAttribute('data-target') === targetId;
      btn.classList.toggle('active', match);
    });

    document.querySelectorAll('.method-pane').forEach(pane => {
      pane.style.display = pane.id === targetId ? 'block' : 'none';
    });

    if (targetId !== 'paneQr' && this.qrScanner && this.qrScanner.scanning) {
      this.qrScanner.stop();
      this.setScannerBtnState(false);
    }
  },

  // 3. METHOD A: Camera-Free Desktop QR Generation
  initDesktopQr() {
    this.generateDesktopSession();

    const regenBtn = document.getElementById('btnRegenDesktopQr');
    if (regenBtn) {
      regenBtn.addEventListener('click', () => {
        this.generateDesktopSession();
      });
    }

    const copyBtn = document.getElementById('btnCopyDesktopLink');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        if (this.desktopSession.pairingUrl) {
          navigator.clipboard.writeText(this.desktopSession.pairingUrl).then(() => {
            alert('Pairing link copied to clipboard:\n' + this.desktopSession.pairingUrl);
          }).catch(() => {
            prompt('Copy this pairing link:', this.desktopSession.pairingUrl);
          });
        }
      });
    }

    const approveBtn = document.getElementById('btnApproveIncomingPair');
    if (approveBtn) {
      approveBtn.addEventListener('click', () => {
        this.approveIncomingPairing();
      });
    }

    const rejectBtn = document.getElementById('btnRejectIncomingPair');
    if (rejectBtn) {
      rejectBtn.addEventListener('click', () => {
        this.rejectIncomingPairing();
      });
    }

    const simulateBtn = document.getElementById('btnSimulatePhoneScan');
    if (simulateBtn) {
      simulateBtn.addEventListener('click', () => {
        this.triggerIncomingPairingRequest({
          clientName: 'Android 14 (Pixel 8 Pro)',
          ip: '192.168.43.45',
          code: this.desktopSession.pairingCode
        });
      });
    }
  },

  generateRandomHex(length = 32) {
    const arr = new Uint8Array(length);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(arr);
    } else {
      for (let i = 0; i < length; i++) arr[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  },

  generatePairingCode() {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = 'SL-';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  },

  generateDesktopSession() {
    const sessionId = this.generateRandomHex(32);
    const pairingSecret = this.generateRandomHex(32);
    const pairingCode = this.generatePairingCode();

    const host = window.location.hostname || '192.168.43.1';
    const port = window.location.port || '58708';
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';

    const pairingUrl = `${protocol}//${host}${port ? ':' + port : ''}/s/${sessionId}#${pairingSecret}`;

    this.desktopSession = {
      sessionId,
      pairingSecret,
      pairingCode,
      pairingUrl
    };

    const canvas = document.getElementById('desktopQrCanvas');
    if (canvas && window.ShareLinkQR) {
      ShareLinkQR.draw(canvas, pairingUrl, {
        size: 240,
        darkColor: '#000000',
        lightColor: '#FFFFFF'
      });
    }

    const codeValEl = document.getElementById('desktopPairingCodeVal');
    if (codeValEl) {
      codeValEl.innerText = pairingCode;
    }

    const statusText = document.getElementById('desktopSessionStatusText');
    if (statusText) {
      statusText.innerText = 'Waiting for phone to scan or enter code ' + pairingCode + '...';
    }

    const approvalCard = document.getElementById('desktopApprovalCard');
    if (approvalCard) {
      approvalCard.style.display = 'none';
    }
  },

  triggerIncomingPairingRequest(request) {
    this.pendingPairingRequest = request;
    const approvalCard = document.getElementById('desktopApprovalCard');
    const detailsEl = document.getElementById('desktopApprovalDetails');
    const statusText = document.getElementById('desktopSessionStatusText');

    if (detailsEl) {
      detailsEl.innerHTML = `Device <strong>${request.clientName}</strong> (${request.ip}) entered valid code <strong>${request.code}</strong>.`;
    }
    if (approvalCard) {
      approvalCard.style.display = 'block';
    }
    if (statusText) {
      statusText.innerText = `Incoming pairing request from ${request.clientName}!`;
    }
    this.updateStatusBadge(ConnectionState.WAITING_APPROVAL, request.clientName);
  },

  approveIncomingPairing() {
    const req = this.pendingPairingRequest || { clientName: 'Android Device', ip: '192.168.43.1' };
    this.activeTarget = {
      ip: req.ip,
      port: '58708',
      token: this.desktopSession.sessionId,
      secret: this.desktopSession.pairingSecret
    };
    this.deviceInfo = {
      name: req.clientName,
      status: 'online',
      version: '2.0'
    };

    const approvalCard = document.getElementById('desktopApprovalCard');
    if (approvalCard) approvalCard.style.display = 'none';

    this.updateStatusBadge(ConnectionState.CONNECTED, req.clientName);
    this.showTransferDashboard();
  },

  rejectIncomingPairing() {
    this.pendingPairingRequest = null;
    const approvalCard = document.getElementById('desktopApprovalCard');
    if (approvalCard) approvalCard.style.display = 'none';

    const statusText = document.getElementById('desktopSessionStatusText');
    if (statusText) {
      statusText.innerText = 'Pairing rejected. Waiting for next connection...';
    }
    this.updateStatusBadge(ConnectionState.NOT_CONNECTED);
  },

  // 4. METHOD B: Desktop Camera QR Scanner Integration
  initQRScanner() {
    const video = document.getElementById('qrVideo');
    const canvas = document.getElementById('qrCanvas');
    const toggleBtn = document.getElementById('btnStartQrScanner');
    const flipBtn = document.getElementById('btnFlipQrCamera');
    const fileInput = document.getElementById('qrFileInput');

    if (!video || !canvas) return;

    this.qrScanner = new ShareLinkQRScanner(
      video,
      canvas,
      (result) => {
        console.log("[QR Scanner Result]", result);
        this.handleQrPayload(result);
        this.qrScanner.stop();
        this.setScannerBtnState(false);
      },
      (err) => {
        console.warn("Camera scanner notice:", err);
        const fallbackNotice = document.getElementById('cameraFallbackNotice');
        if (fallbackNotice) fallbackNotice.style.display = 'block';

        const scanPrompt = document.getElementById('qrScanPrompt');
        if (scanPrompt) scanPrompt.style.display = 'none';

        this.setScannerBtnState(false);
      }
    );

    if (toggleBtn) {
      toggleBtn.addEventListener('click', async () => {
        if (this.qrScanner.scanning) {
          this.qrScanner.stop();
          this.setScannerBtnState(false);
        } else {
          const ok = await this.qrScanner.start();
          this.setScannerBtnState(ok);
          if (!ok) {
            const fallbackNotice = document.getElementById('cameraFallbackNotice');
            if (fallbackNotice) fallbackNotice.style.display = 'block';
          }
        }
      });
    }

    if (flipBtn) {
      flipBtn.addEventListener('click', () => {
        if (this.qrScanner) this.qrScanner.toggleCamera();
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files[0]) {
          try {
            const result = await this.qrScanner.scanFile(e.target.files[0]);
            this.handleQrPayload(result);
          } catch (err) {
            alert(err.message);
          }
        }
      });
    }

    // Direct QR String Paste input
    const pasteInput = document.getElementById('qrPasteInput');
    const parseBtn = document.getElementById('btnParseQrString');
    if (parseBtn && pasteInput) {
      parseBtn.addEventListener('click', () => {
        const val = pasteInput.value.trim();
        if (val) {
          this.handleQrPayload(val);
        } else {
          alert("Please paste a ShareLink transfer URL or QR code string.");
        }
      });
    }
  },

  setScannerBtnState(isScanning) {
    const toggleBtn = document.getElementById('btnStartQrScanner');
    const scanBox = document.getElementById('qrScannerBox');
    if (toggleBtn) {
      toggleBtn.innerText = isScanning ? "⏹ Stop Camera" : "📷 Start Camera Scanner";
      toggleBtn.className = isScanning ? "btn btn-secondary btn-sm" : "btn btn-primary btn-sm";
    }
    if (scanBox) {
      scanBox.classList.toggle('active-scanning', isScanning);
    }
  },

  // Parse QR Payload
  handleQrPayload(rawUrl) {
    try {
      const url = new URL(rawUrl);
      this.activeTarget.ip = url.hostname;
      this.activeTarget.port = url.port || '8080';

      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length >= 2 && segments[0] === 's') {
        this.activeTarget.token = segments[1];
      }

      if (url.hash && url.hash.length > 1) {
        this.activeTarget.secret = url.hash.substring(1);
      }

      const ipInp = document.getElementById('manualIpInput');
      const portInp = document.getElementById('manualPortInput');
      if (ipInp) ipInp.value = this.activeTarget.ip;
      if (portInp) portInp.value = this.activeTarget.port;

      this.initiateConnection();
    } catch (err) {
      alert("Invalid ShareLink URL format. Please ensure it follows http://<ip>:<port>/s/<token>#<secret>");
    }
  },

  // 5. METHOD C: Manual Pairing Inputs & POST /api/pair Endpoint
  initManualInputs() {
    const btnPairConnect = document.getElementById('btnManualPairConnect');
    if (!btnPairConnect) return;

    btnPairConnect.addEventListener('click', async () => {
      const ip = (document.getElementById('manualIpInput')?.value || '').trim();
      const port = (document.getElementById('manualPortInput')?.value || '8080').trim();
      const codeInput = document.getElementById('manualPairingCodeInput');
      const code = (codeInput?.value || '').trim().toUpperCase();
      const clientName = (document.getElementById('manualClientNameInput')?.value || 'Windows PC Chrome').trim();

      const statusBox = document.getElementById('manualPairStatus');

      if (!ip) {
        alert("Please enter the Android device's IP address (e.g. 192.168.43.1).");
        return;
      }

      if (!code || code.length < 4) {
        alert("Please enter the 6-character pairing code (e.g. SL-4829).");
        return;
      }

      if (statusBox) {
        statusBox.style.display = 'block';
        statusBox.style.background = 'rgba(99, 102, 241, 0.1)';
        statusBox.style.color = '#818CF8';
        statusBox.innerText = `Connecting to http://${ip}:${port}/api/pair with code ${code}...`;
      }

      this.updateStatusBadge(ConnectionState.CONNECTING);

      try {
        const res = await fetch(`http://${ip}:${port}/api/pair`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, clientName })
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok && data.status === 'paired') {
          if (statusBox) {
            statusBox.style.background = 'rgba(16, 185, 129, 0.1)';
            statusBox.style.color = '#10B981';
            statusBox.innerText = `Pairing Approved! Establishing encrypted session...`;
          }

          this.activeTarget = {
            ip,
            port,
            token: data.sessionId,
            secret: data.pairingSecret
          };

          await this.initiateConnection();
        } else if (res.status === 429) {
          if (statusBox) {
            statusBox.style.background = 'rgba(239, 68, 68, 0.15)';
            statusBox.style.color = '#EF4444';
            statusBox.innerText = data.error || 'Too many failed attempts. Locked out for 5 minutes.';
          }
          this.updateStatusBadge(ConnectionState.CONNECTION_LOST);
        } else {
          if (statusBox) {
            statusBox.style.background = 'rgba(239, 68, 68, 0.15)';
            statusBox.style.color = '#EF4444';
            statusBox.innerText = data.error || `Pairing failed (HTTP ${res.status}). Check code or IP.`;
          }
          this.updateStatusBadge(ConnectionState.NOT_CONNECTED);
        }
      } catch (fetchErr) {
        console.warn("Manual pairing fetch failed:", fetchErr);
        if (statusBox) {
          statusBox.style.background = 'rgba(245, 158, 11, 0.15)';
          statusBox.style.color = '#F59E0B';
          statusBox.innerHTML = `Note: HTTPS browser security may prevent direct background requests to local HTTP devices.<br>Open direct pairing dashboard: <a href="http://${ip}:${port}/" target="_blank" style="color: var(--accent-light); font-weight: bold; text-decoration: underline;">http://${ip}:${port}/</a>`;
        }
        this.activeTarget = { ip, port, token: '', secret: '' };
        this.initiateConnection();
      }
    });
  },

  // 6. Check incoming URL query parameters or hash
  checkUrlParameters() {
    if (window.location.hash && window.location.hash.length > 1) {
      const hashContent = window.location.hash.substring(1);
      if (hashContent.startsWith('http://') || hashContent.startsWith('https://')) {
        this.handleQrPayload(hashContent);
      }
    }
  },

  // 7. Core Connection Orchestrator (With Browser Security / Mixed Content Handling)
  async initiateConnection() {
    const { ip, port, token, secret } = this.activeTarget;
    const isHttpsOrigin = window.location.protocol === 'https:';
    const baseUrl = `http://${ip}:${port}`;
    const directSessionUrl = token ? `${baseUrl}/s/${token}${secret ? '#' + secret : ''}` : `${baseUrl}/`;

    this.updateStatusBadge(ConnectionState.CONNECTING);

    const actionContainer = document.getElementById('connectionResultContainer');
    const directLaunchBtn = document.getElementById('btnDirectLaunch');
    const directUrlLink = document.getElementById('directUrlLink');
    const mixedContentNotice = document.getElementById('mixedContentNotice');

    if (actionContainer) actionContainer.style.display = 'block';
    if (directLaunchBtn) directLaunchBtn.href = directSessionUrl;
    if (directUrlLink) {
      directUrlLink.href = directSessionUrl;
      directUrlLink.innerText = directSessionUrl;
    }

    if (isHttpsOrigin) {
      if (mixedContentNotice) mixedContentNotice.style.display = 'block';
      this.updateStatusBadge(ConnectionState.WAITING_APPROVAL, "Ready to Launch");
      return;
    }

    try {
      const statusRes = await fetch(`${baseUrl}/api/status`, { method: 'GET' });
      if (!statusRes.ok) {
        throw new Error("Device returned HTTP " + statusRes.status);
      }
      const deviceData = await statusRes.json();
      console.log("[Connected Device Status]", deviceData);
      this.deviceInfo = deviceData;

      if (token) {
        await this.loadSessionFiles(baseUrl, token, secret);
      }

      this.updateStatusBadge(ConnectionState.CONNECTED, deviceData.name || "Android Host");
      this.showTransferDashboard();
    } catch (err) {
      console.warn("Direct connection probe failed:", err);
      this.updateStatusBadge(ConnectionState.CONNECTION_LOST);
      if (mixedContentNotice) mixedContentNotice.style.display = 'block';
    }
  },

  // 8. Load Active Session Files for Receiver Dashboard
  async loadSessionFiles(baseUrl, token, secret) {
    try {
      const headers = {};
      if (secret) headers['X-ShareLink-Secret'] = secret;

      const res = await fetch(`${baseUrl}/s/${token}/api/files`, { headers });
      if (res.ok) {
        const sessionData = await res.json();
        this.availableFiles = sessionData.files || [];
        this.renderReceiveFilesList();
      } else if (res.status === 410) {
        this.updateStatusBadge(ConnectionState.SESSION_EXPIRED);
      }
    } catch (_) {}
  },

  // 9. Show Transfer Dashboard
  showTransferDashboard() {
    const dash = document.getElementById('transferDashboardSection');
    const connectPanel = document.getElementById('connectPanelSection');
    if (dash) dash.style.display = 'block';
    if (connectPanel) connectPanel.style.display = 'none';

    const devNameEl = document.getElementById('barDeviceName');
    const devIpEl = document.getElementById('barDeviceIp');
    if (devNameEl) devNameEl.innerText = this.deviceInfo?.name || "Android Device";
    if (devIpEl) devIpEl.innerText = `${this.activeTarget.ip}:${this.activeTarget.port}`;
  },

  disconnect() {
    this.updateStatusBadge(ConnectionState.NOT_CONNECTED);
    const dash = document.getElementById('transferDashboardSection');
    const connectPanel = document.getElementById('connectPanelSection');
    if (dash) dash.style.display = 'none';
    if (connectPanel) connectPanel.style.display = 'block';
  },

  // 10. File Selection & Drag & Drop Handling (SEND TAB)
  initFilePicker() {
    const dropzone = document.getElementById('sendDropzone');
    const fileInput = document.getElementById('sendFileInput');
    const folderInput = document.getElementById('sendFolderInput');
    const btnSend = document.getElementById('btnStartSend');

    if (!dropzone) return;

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-active');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-active');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer && e.dataTransfer.files) {
        this.addFilesToUploadQueue(Array.from(e.dataTransfer.files));
      }
    });

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files) {
          this.addFilesToUploadQueue(Array.from(e.target.files));
        }
      });
    }

    if (folderInput) {
      folderInput.addEventListener('change', (e) => {
        if (e.target.files) {
          this.addFilesToUploadQueue(Array.from(e.target.files));
        }
      });
    }

    if (btnSend) {
      btnSend.addEventListener('click', () => this.executeUploadQueue());
    }

    const btnCancel = document.getElementById('btnCancelUpload');
    if (btnCancel) {
      btnCancel.addEventListener('click', () => this.cancelActiveUpload());
    }
  },

  addFilesToUploadQueue(files) {
    files.forEach(f => {
      this.selectedUploadFiles.push({
        id: 'up_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        name: f.name,
        size: f.size,
        mimeType: f.type || 'application/octet-stream',
        file: f
      });
    });
    this.renderUploadQueue();
  },

  removeFileFromQueue(id) {
    this.selectedUploadFiles = this.selectedUploadFiles.filter(f => f.id !== id);
    this.renderUploadQueue();
  },

  clearUploadQueue() {
    this.selectedUploadFiles = [];
    this.renderUploadQueue();
  },

  renderUploadQueue() {
    const listEl = document.getElementById('uploadQueueList');
    const summaryCount = document.getElementById('uploadSummaryCount');
    const summarySize = document.getElementById('uploadSummarySize');
    const btnSend = document.getElementById('btnStartSend');

    if (!listEl) return;

    const totalBytes = this.selectedUploadFiles.reduce((sum, f) => sum + f.size, 0);

    if (summaryCount) summaryCount.innerText = `${this.selectedUploadFiles.length} files`;
    if (summarySize) summarySize.innerText = this.formatBytes(totalBytes);
    if (btnSend) btnSend.disabled = this.selectedUploadFiles.length === 0;

    if (this.selectedUploadFiles.length === 0) {
      listEl.innerHTML = '<div class="empty-state">No files selected. Drag & drop files above or click to browse.</div>';
      return;
    }

    listEl.innerHTML = this.selectedUploadFiles.map(f => `
      <div class="file-item-row">
        <div class="file-item-info">
          <span class="file-item-icon">📄</span>
          <div>
            <div class="file-item-name">${f.name}</div>
            <div class="file-item-meta">${this.formatBytes(f.size)} • ${f.mimeType}</div>
          </div>
        </div>
        <button class="btn-remove-file" onclick="ConnectApp.removeFileFromQueue('${f.id}')" title="Remove">✕</button>
      </div>
    `).join('');
  },

  // 11. Execute Real Streaming Upload to Android Server
  async executeUploadQueue() {
    if (this.selectedUploadFiles.length === 0) return;

    const { ip, port, token, secret } = this.activeTarget;
    const baseUrl = `http://${ip}:${port}`;
    const targetSessionToken = token || 'web_session';

    const progressBox = document.getElementById('uploadProgressBox');
    const progressFill = document.getElementById('uploadProgressFill');
    const progressStatus = document.getElementById('uploadProgressStatus');
    const progressMetrics = document.getElementById('uploadProgressMetrics');
    const btnSend = document.getElementById('btnStartSend');

    if (progressBox) progressBox.style.display = 'block';
    if (btnSend) btnSend.disabled = true;

    try {
      const initUrl = `${baseUrl}/s/${targetSessionToken}/api/upload/init`;
      const initPayload = {
        senderName: localStorage.getItem('sharelink_device_name') || 'Web Browser',
        files: this.selectedUploadFiles.map(f => ({
          id: f.id,
          name: f.name,
          size: f.size,
          mimeType: f.mimeType
        }))
      };

      if (progressStatus) progressStatus.innerText = "Requesting receiver approval on Android...";
      this.updateStatusBadge(ConnectionState.WAITING_APPROVAL);

      const initResp = await fetch(initUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(secret ? { 'X-ShareLink-Secret': secret } : {})
        },
        body: JSON.stringify(initPayload)
      });

      if (!initResp.ok) {
        throw new Error("Receiver declined upload offer (HTTP " + initResp.status + ")");
      }

      this.updateStatusBadge(ConnectionState.CONNECTED);

      for (let i = 0; i < this.selectedUploadFiles.length; i++) {
        const fileItem = this.selectedUploadFiles[i];
        if (progressStatus) {
          progressStatus.innerText = `Uploading [${i + 1}/${this.selectedUploadFiles.length}]: ${fileItem.name}`;
        }
        await this.streamFileUpload(baseUrl, targetSessionToken, secret, fileItem, (percent, speed) => {
          if (progressFill) progressFill.style.width = percent + '%';
          if (progressMetrics) {
            progressMetrics.innerText = `${percent.toFixed(1)}% • ${speed.toFixed(1)} MB/s • ${this.formatBytes(fileItem.size)}`;
          }
        });
      }

      if (progressStatus) progressStatus.innerText = "All files uploaded successfully!";
      if (progressFill) progressFill.style.width = '100%';
      this.clearUploadQueue();
      setTimeout(() => {
        if (progressBox) progressBox.style.display = 'none';
      }, 3000);

    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed: " + err.message);
      if (progressStatus) progressStatus.innerText = "Upload failed: " + err.message;
    } finally {
      if (btnSend) btnSend.disabled = false;
    }
  },

  streamFileUpload(baseUrl, token, secret, fileItem, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      this.activeUploadXhr = xhr;

      const uploadUrl = `${baseUrl}/s/${token}/upload/${encodeURIComponent(fileItem.id)}`;
      xhr.open('POST', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      xhr.setRequestHeader('X-File-Name', encodeURIComponent(fileItem.name));
      xhr.setRequestHeader('X-File-Size', fileItem.size.toString());
      if (secret) xhr.setRequestHeader('X-ShareLink-Secret', secret);

      let lastLoaded = 0;
      let lastTime = Date.now();

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const now = Date.now();
          const elapsedSecs = (now - lastTime) / 1000;
          let speedMBps = 0;
          if (elapsedSecs > 0.5) {
            speedMBps = ((e.loaded - lastLoaded) / (1024 * 1024)) / elapsedSecs;
            lastLoaded = e.loaded;
            lastTime = now;
          }
          const percent = (e.loaded / e.total) * 100;
          onProgress(percent, speedMBps);
        }
      };

      xhr.onload = () => {
        this.activeUploadXhr = null;
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error("Server returned HTTP " + xhr.status + ": " + xhr.responseText));
        }
      };

      xhr.onerror = () => {
        this.activeUploadXhr = null;
        reject(new Error("Network connection lost during file streaming"));
      };

      xhr.send(fileItem.file);
    });
  },

  cancelActiveUpload() {
    if (this.activeUploadXhr) {
      this.activeUploadXhr.abort();
      this.activeUploadXhr = null;
      alert("Active upload was cancelled.");
      const progressBox = document.getElementById('uploadProgressBox');
      if (progressBox) progressBox.style.display = 'none';
      const btnSend = document.getElementById('btnStartSend');
      if (btnSend) btnSend.disabled = false;
    }
  },

  // 12. Receiver Dashboard: Render Available Files to Download
  renderReceiveFilesList() {
    const listEl = document.getElementById('receiveFilesList');
    if (!listEl) return;

    if (this.availableFiles.length === 0) {
      listEl.innerHTML = '<div class="empty-state">No files are currently being shared by the host device.</div>';
      return;
    }

    const { ip, port, token, secret } = this.activeTarget;
    const baseUrl = `http://${ip}:${port}`;

    listEl.innerHTML = this.availableFiles.map(file => {
      const downloadUrl = `${baseUrl}/s/${token}/download/${encodeURIComponent(file.id)}${secret ? '?secret=' + encodeURIComponent(secret) : ''}`;
      return `
        <div class="file-item-row">
          <div class="file-item-info">
            <span class="file-item-icon">📥</span>
            <div>
              <div class="file-item-name">${file.name}</div>
              <div class="file-item-meta">${this.formatBytes(file.size)} • ${file.mimeType || 'binary'}</div>
            </div>
          </div>
          <a href="${downloadUrl}" download="${file.name}" class="btn btn-primary btn-sm">
            ⬇ Download
          </a>
        </div>
      `;
    }).join('');
  },

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
};

document.addEventListener('DOMContentLoaded', () => {
  ConnectApp.init();
});
