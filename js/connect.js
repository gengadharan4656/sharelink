/**
 * ShareLink — Cross-Platform Connect & Transfer Controller
 * Handles QR pairing, manual IP/Port connection, Mixed Content routing,
 * and authenticated Send & Receive dashboard logic.
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
  deviceInfo: null,
  availableFiles: [],
  selectedUploadFiles: [],
  activeUploadXhr: null,
  qrScanner: null,

  init() {
    this.updateStatusBadge(ConnectionState.NOT_CONNECTED);
    this.initMethodTabs();
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
        statusTextEl.innerText = 'Waiting for Receiver Approval...';
        break;
      case ConnectionState.CONNECTED:
        statusTextEl.innerText = 'Connected: ' + (details || 'ShareLink Host');
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

  // 2. Tab Navigation between QR Method & Manual Method
  initMethodTabs() {
    const tabBtns = document.querySelectorAll('.method-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        document.querySelectorAll('.method-pane').forEach(pane => {
          pane.style.display = pane.id === targetId ? 'block' : 'none';
        });

        if (targetId !== 'paneQr' && this.qrScanner) {
          this.qrScanner.stop();
          this.setScannerBtnState(false);
        }
      });
    });

    // Dashboard Internal Tabs (Send vs Receive)
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

  // 3. QR Camera Scanner Integration
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
        const errBox = document.getElementById('qrScanError');
        if (errBox) {
          errBox.style.display = 'block';
          errBox.innerText = "Camera notice: " + (err.message || "Could not start camera. Please enter IP or URL manually.");
        }
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

  // 4. Parse QR Payload
  handleQrPayload(rawUrl) {
    try {
      const url = new URL(rawUrl);
      this.activeTarget.ip = url.hostname;
      this.activeTarget.port = url.port || '8080';

      const segments = url.pathname.split('/').filter(Boolean);
      // Expected structure: /s/<sessionToken>
      if (segments.length >= 2 && segments[0] === 's') {
        this.activeTarget.token = segments[1];
      }

      if (url.hash && url.hash.length > 1) {
        this.activeTarget.secret = url.hash.substring(1);
      }

      // Populate manual inputs
      const ipInp = document.getElementById('manualIpInput');
      const portInp = document.getElementById('manualPortInput');
      const tokenInp = document.getElementById('manualTokenInput');
      const secretInp = document.getElementById('manualSecretInput');

      if (ipInp) ipInp.value = this.activeTarget.ip;
      if (portInp) portInp.value = this.activeTarget.port;
      if (tokenInp) tokenInp.value = this.activeTarget.token;
      if (secretInp) secretInp.value = this.activeTarget.secret;

      // Trigger connection workflow
      this.initiateConnection();
    } catch (err) {
      alert("Invalid ShareLink URL format. Please ensure it follows http://<ip>:<port>/s/<token>#<secret>");
    }
  },

  // 5. Manual Inputs Handling
  initManualInputs() {
    const btnConnect = document.getElementById('btnManualConnect');
    if (!btnConnect) return;

    btnConnect.addEventListener('click', () => {
      const ip = (document.getElementById('manualIpInput')?.value || '').trim();
      const port = (document.getElementById('manualPortInput')?.value || '8080').trim();
      const token = (document.getElementById('manualTokenInput')?.value || '').trim();
      const secret = (document.getElementById('manualSecretInput')?.value || '').trim();

      if (!ip) {
        alert("Please enter the Android device's IP address (e.g. 192.168.43.1).");
        return;
      }

      this.activeTarget = { ip, port, token, secret };
      this.initiateConnection();
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

    // Real Browser Restriction Analysis:
    // If running on HTTPS (GitHub Pages), modern browsers block direct fetch() to HTTP LAN IPs.
    if (isHttpsOrigin) {
      if (mixedContentNotice) mixedContentNotice.style.display = 'block';
      this.updateStatusBadge(ConnectionState.WAITING_APPROVAL, "Ready to Launch");
      return;
    }

    // If running on HTTP or Localhost, attempt real background handshake
    try {
      const statusRes = await fetch(`${baseUrl}/api/status`, { method: 'GET' });
      if (!statusRes.ok) {
        throw new Error("Device returned HTTP " + statusRes.status);
      }
      const deviceData = await statusRes.json();
      console.log("[Connected Device Status]", deviceData);
      this.deviceInfo = deviceData;

      // Check active files if session token is present
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

    // Update Device Bar info
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
      // 1. Send Upload Initialization Offer
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initPayload)
      });

      if (!initResp.ok) {
        throw new Error("Upload request declined by receiver or session expired (HTTP " + initResp.status + ")");
      }

      this.updateStatusBadge(ConnectionState.CONNECTED);

      // 2. Stream Files Sequentially using Bounded Streaming XHR
      const totalSessionBytes = this.selectedUploadFiles.reduce((sum, f) => sum + f.size, 0);
      let sessionBytesTransferred = 0;
      const startTime = Date.now();

      for (let i = 0; i < this.selectedUploadFiles.length; i++) {
        const item = this.selectedUploadFiles[i];
        if (progressStatus) {
          progressStatus.innerText = `Uploading ${item.name} (${i + 1}/${this.selectedUploadFiles.length})...`;
        }

        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          this.activeUploadXhr = xhr;
          const uploadUrl = `${baseUrl}/s/${targetSessionToken}/upload/${item.id}`;

          xhr.open('POST', uploadUrl, true);
          xhr.setRequestHeader('Content-Type', item.mimeType || 'application/octet-stream');
          if (secret) xhr.setRequestHeader('X-ShareLink-Secret', secret);

          let lastLoaded = 0;
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const delta = e.loaded - lastLoaded;
              lastLoaded = e.loaded;
              sessionBytesTransferred += delta;

              const elapsedSec = (Date.now() - startTime) / 1000;
              const speedMBps = elapsedSec > 0 ? (sessionBytesTransferred / (1024 * 1024)) / elapsedSec : 0;
              const pct = totalSessionBytes > 0 ? (sessionBytesTransferred / totalSessionBytes) * 100 : 100;
              const remainingSec = speedMBps > 0 ? Math.round((totalSessionBytes - sessionBytesTransferred) / (speedMBps * 1024 * 1024)) : 0;

              if (progressFill) progressFill.style.width = Math.min(100, pct) + '%';
              if (progressMetrics) {
                progressMetrics.innerText = `${Math.round(pct)}% • ${speedMBps.toFixed(1)} MB/s (${ConnectApp.formatBytes(sessionBytesTransferred)} / ${ConnectApp.formatBytes(totalSessionBytes)}) • ${remainingSec > 0 ? remainingSec + 's left' : 'finishing...'}`;
              }
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error("Receiver rejected file stream: HTTP " + xhr.status));
            }
          };

          xhr.onerror = () => reject(new Error("Network connection error during stream"));
          xhr.onabort = () => reject(new Error("Upload cancelled by user"));

          xhr.send(item.file);
        });

        this.addHistoryRecord('Sent', item.name, item.size);
      }

      if (progressStatus) progressStatus.innerText = `✓ All ${this.selectedUploadFiles.length} files transferred successfully!`;
      setTimeout(() => {
        this.clearUploadQueue();
        if (progressBox) progressBox.style.display = 'none';
        if (btnSend) btnSend.disabled = false;
      }, 3000);

    } catch (err) {
      console.error("[Upload Error]", err);
      alert("Transfer Error: " + err.message);
      if (progressStatus) progressStatus.innerText = "⚠️ Upload halted: " + err.message;
      if (btnSend) btnSend.disabled = false;
    } finally {
      this.activeUploadXhr = null;
    }
  },

  cancelActiveUpload() {
    if (this.activeUploadXhr) {
      this.activeUploadXhr.abort();
      this.activeUploadXhr = null;
    }
    const progressBox = document.getElementById('uploadProgressBox');
    const btnSend = document.getElementById('btnStartSend');
    if (progressBox) progressBox.style.display = 'none';
    if (btnSend) btnSend.disabled = false;
  },

  // 12. Render Receive Files List (RECEIVE TAB)
  renderReceiveFilesList() {
    const listEl = document.getElementById('receiveFilesList');
    if (!listEl) return;

    if (this.availableFiles.length === 0) {
      listEl.innerHTML = '<div class="empty-state">No files currently offered by the Android sender.</div>';
      return;
    }

    listEl.innerHTML = this.availableFiles.map(f => `
      <div class="file-item-row">
        <div class="file-item-info">
          <input type="checkbox" class="file-select-chk" value="${f.id}" checked>
          <span class="file-item-icon">📥</span>
          <div>
            <div class="file-item-name">${f.name}</div>
            <div class="file-item-meta">${this.formatBytes(f.size)} • ${f.mimeType || 'file'}</div>
          </div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="ConnectApp.downloadSingleFile('${f.id}')">Download</button>
      </div>
    `).join('');
  },

  downloadSingleFile(fileId) {
    const { ip, port, token } = this.activeTarget;
    const downloadUrl = `http://${ip}:${port}/s/${token}/download/${fileId}`;
    window.open(downloadUrl, '_blank');
  },

  downloadAllSelected() {
    const chks = document.querySelectorAll('.file-select-chk:checked');
    chks.forEach(chk => {
      this.downloadSingleFile(chk.value);
    });
  },

  addHistoryRecord(action, name, size) {
    const listEl = document.getElementById('historyListTableBody');
    if (!listEl) return;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${new Date().toLocaleTimeString()}</td>
      <td><strong>${action}</strong></td>
      <td>${name}</td>
      <td>${this.formatBytes(size)}</td>
      <td><span class="badge" style="background: rgba(16,185,129,0.15); color: #10B981;">Completed</span></td>
    `;
    listEl.prepend(row);
  },

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
};

document.addEventListener('DOMContentLoaded', () => {
  ConnectApp.init();
});
