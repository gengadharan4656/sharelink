/**
 * ShareLink — Offline Camera QR Code Decoder & Scanner
 * Bundled locally with zero external CDN dependencies.
 */

class ShareLinkQRScanner {
  constructor(videoElement, canvasElement, onResultCallback, onErrorCallback) {
    this.video = videoElement;
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d', { willReadFrequently: true });
    this.onResult = onResultCallback;
    this.onError = onErrorCallback;
    this.stream = null;
    this.animId = null;
    this.facingMode = 'environment'; // Back camera by default
    this.scanning = false;
  }

  async start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (this.onError) this.onError(new Error("Camera access not supported by your browser. Please paste the QR link manually."));
      return false;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: this.facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      this.video.srcObject = this.stream;
      await this.video.play();
      this.scanning = true;
      this._scanLoop();
      return true;
    } catch (err) {
      console.warn("Camera start failed:", err);
      if (this.onError) this.onError(err);
      return false;
    }
  }

  stop() {
    this.scanning = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
  }

  toggleCamera() {
    this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
    this.stop();
    return this.start();
  }

  _scanLoop() {
    if (!this.scanning) return;

    if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
      this.canvas.width = this.video.videoWidth;
      this.canvas.height = this.video.videoHeight;
      this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

      // Check if BarcodeDetector is natively supported in modern Chrome/Edge/Android
      if ('BarcodeDetector' in window) {
        if (!this.barcodeDetector) {
          this.barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
        }
        this.barcodeDetector.detect(this.canvas)
          .then(barcodes => {
            if (barcodes && barcodes.length > 0) {
              const rawVal = barcodes[0].rawValue;
              if (rawVal) {
                this.onResult(rawVal);
                return;
              }
            }
          })
          .catch(() => {});
      }
    }

    this.animId = requestAnimationFrame(() => this._scanLoop());
  }

  // Parse QR code from static image file upload fallback
  async scanFile(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        if ('BarcodeDetector' in window) {
          try {
            const detector = new BarcodeDetector({ formats: ['qr_code'] });
            const barcodes = await detector.detect(tempCanvas);
            if (barcodes.length > 0) {
              resolve(barcodes[0].rawValue);
              return;
            }
          } catch (_) {}
        }
        reject(new Error("No QR code detected or BarcodeDetector unavailable. Please paste the transfer link manually."));
      };
      img.onerror = () => reject(new Error("Failed to load image file."));
      img.src = URL.createObjectURL(file);
    });
  }
}

window.ShareLinkQRScanner = ShareLinkQRScanner;
