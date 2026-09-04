import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onScanResult: (scannedText: string) => void;
  defaultMode?: 'qr' | 'barcode';
}

type ScannerState = 'idle' | 'starting' | 'scanning' | 'error' | 'no_camera';
type ScanMode = 'qr' | 'barcode';

const QRScannerModal = ({ isOpen, onClose, onScanResult, defaultMode = 'qr' }: Props) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivId = 'qr-scanner-container';
  const [state, setState] = useState<ScannerState>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [torchOn, setTorchOn] = useState(false);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<ScanMode>(defaultMode);
  const isRunningRef = useRef(false);
  const isStoppingRef = useRef(false);

  // Check Telegram WebApp Native QR capability
  const tgWebApp = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : null;
  const hasTgNativeQr = Boolean(
    tgWebApp?.isVersionAtLeast?.('6.4') && tgWebApp?.showScanQrPopup
  );

  // ─── Stop & fully reset scanner instance ──────────────────────────────────
  const stopScanner = async () => {
    if (scannerRef.current && isRunningRef.current && !isStoppingRef.current) {
      isStoppingRef.current = true;
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        // ignore stop errors
      } finally {
        isRunningRef.current = false;
        isStoppingRef.current = false;
      }
    }
    scannerRef.current = null;
  };

  // ─── Start scanner with adaptive configuration per mode ───────────────────
  const startScanner = async (cameraId?: string, mode: ScanMode = scanMode) => {
    let el = document.getElementById(scannerDivId);
    if (!el) {
      await new Promise((r) => setTimeout(r, 200));
      el = document.getElementById(scannerDivId);
      if (!el) return;
    }

    await stopScanner();
    setState('starting');
    setErrorMsg('');

    try {
      const formats =
        mode === 'barcode'
          ? [
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.ITF,
              Html5QrcodeSupportedFormats.CODABAR,
            ]
          : [
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.DATA_MATRIX,
            ];

      scannerRef.current = new Html5Qrcode(scannerDivId, {
        formatsToSupport: formats,
        verbose: false,
      });

      // Adaptive scan box:
      // Barcode 1D butuh area horizontal lebar (280x100)
      // QR Code 2D optimal dengan area kotak (220x220)
      const qrbox =
        mode === 'barcode'
          ? { width: 280, height: 100 }
          : { width: 220, height: 220 };

      const config = {
        fps: 15,
        qrbox,
        aspectRatio: mode === 'barcode' ? 1.5 : 1.0,
        disableFlip: false,
      };

      const onSuccess = (decodedText: string) => {
        stopScanner().then(() => {
          onScanResult(decodedText.trim());
          onClose();
        });
      };

      const onError = () => { /* frame-level decoding errors are normal */ };

      if (cameraId) {
        await scannerRef.current.start({ deviceId: { exact: cameraId } }, config, onSuccess, onError);
      } else {
        await scannerRef.current.start({ facingMode: 'environment' }, config, onSuccess, onError);
      }

      isRunningRef.current = true;
      setState('scanning');
    } catch (err: unknown) {
      console.error('Scanner error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Permission') || msg.includes('permission') || msg.includes('NotAllowed')) {
        setState('error');
        setErrorMsg('Akses kamera belum diizinkan. Pastikan izin kamera aktif pada pengaturan browser/Telegram.');
      } else if (msg.includes('NotFound') || msg.includes('no camera') || msg.includes('Requested device not found')) {
        setState('no_camera');
        setErrorMsg('Perangkat kamera tidak ditemukan di perangkat ini.');
      } else {
        setState('error');
        setErrorMsg(`Gagal membuka kamera: ${msg}`);
      }
    }
  };

  const loadCameraList = async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setCameras(devices);
        setActiveCameraId(devices[devices.length - 1].id);
      }
    } catch {
      // Silently fail if permission not yet granted
    }
  };

  const handleToggleTorch = async () => {
    if (!scannerRef.current || !isRunningRef.current) return;
    try {
      const track = (scannerRef.current as unknown as { mediaStream?: MediaStream })
        ?.mediaStream?.getVideoTracks?.()[0];
      if (track) {
        await track.applyConstraints({ advanced: [{ torch: !torchOn } as MediaTrackConstraintSet] });
        setTorchOn((prev) => !prev);
      }
    } catch {
      // Torch not supported on device
    }
  };

  const handleSwitchCamera = async (camId: string) => {
    setActiveCameraId(camId);
    await startScanner(camId, scanMode);
  };

  const handleSwitchMode = async (newMode: ScanMode) => {
    if (newMode === scanMode) return;
    setScanMode(newMode);
    await startScanner(activeCameraId || undefined, newMode);
  };

  // ─── Optional: Launch Telegram Native QR Scanner popup ────────────────────
  const handleOpenTelegramNative = async () => {
    if (!hasTgNativeQr) return;
    await stopScanner();
    setState('idle');

    const handleClosed = () => {
      tgWebApp?.offEvent?.('scanQrPopupClosed', handleClosed);
      // Restart in-app camera when native popup is closed
      startScanner(activeCameraId || undefined, 'qr');
    };

    tgWebApp?.onEvent?.('scanQrPopupClosed', handleClosed);
    tgWebApp.showScanQrPopup(
      { text: 'Arahkan kamera ke QR Code Aset' },
      (scannedText: string) => {
        if (scannedText) {
          tgWebApp?.offEvent?.('scanQrPopupClosed', handleClosed);
          try { tgWebApp.closeScanQrPopup?.(); } catch {}
          onScanResult(scannedText.trim());
          onClose();
          return true;
        }
        return false;
      }
    );
  };

  // ─── Lifecycle when modal is opened / closed ──────────────────────────────
  useEffect(() => {
    if (isOpen) {
      const mode = defaultMode || 'qr';
      setScanMode(mode);
      loadCameraList();
      const timer = setTimeout(() => {
        startScanner(undefined, mode);
      }, 250);

      return () => {
        clearTimeout(timer);
      };
    } else {
      stopScanner();
      setState('idle');
      setErrorMsg('');
      setTorchOn(false);

      if (tgWebApp?.isVersionAtLeast?.('6.4') && tgWebApp?.closeScanQrPopup) {
        try { tgWebApp.closeScanQrPopup?.(); } catch {}
      }
    }
  }, [isOpen, defaultMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
      if (tgWebApp?.isVersionAtLeast?.('6.4') && tgWebApp?.closeScanQrPopup) {
        try { tgWebApp.closeScanQrPopup?.(); } catch {}
      }
    };
  }, []);

  if (!isOpen) return null;

  const ScanFrame = () =>
    scanMode === 'barcode' ? (
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="relative" style={{ width: '88%', height: '95px' }}>
          <div className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-amber-400 rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-amber-400 rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-amber-400 rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-amber-400 rounded-br-lg" />
          <div
            className="absolute left-2 right-2 h-0.5 bg-amber-400/90"
            style={{ animation: 'scanline-h 1.5s ease-in-out infinite', top: '8px' }}
          />
        </div>
      </div>
    ) : (
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="relative w-52 h-52">
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-400 rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-400 rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-400 rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-400 rounded-br-lg" />
          <div
            className="absolute left-1 right-1 top-2 h-0.5 bg-blue-400/80"
            style={{ animation: 'scanline 2s ease-in-out infinite' }}
          />
        </div>
      </div>
    );

  return (
    <div
      className="modal-overlay active"
      style={{ zIndex: 110 }}
      onClick={(e) => { if (e.target === e.currentTarget) { stopScanner(); onClose(); } }}
    >
      <div className="modal-content p-0 overflow-hidden max-w-sm mx-auto rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
              scanMode === 'barcode' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
            }`}>
              <i className={`fas ${scanMode === 'barcode' ? 'fa-barcode' : 'fa-qrcode'} text-lg`} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-50">Scan QR / Barcode Aset</h2>
              <p className="text-[11px] text-slate-400">
                {scanMode === 'barcode' ? 'Posisikan barcode horizontal di kotak' : 'Arahkan kamera ke kode QR aset'}
              </p>
            </div>
          </div>
          <button
            onClick={() => { stopScanner(); onClose(); }}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-slate-50 flex items-center justify-center transition-colors"
          >
            <i className="fas fa-times text-sm" />
          </button>
        </div>

        {/* Mode Toggle Pills (QR Code & Barcode) */}
        <div className="flex gap-1.5 mx-4 my-2 p-1 rounded-xl bg-slate-800/90 border border-slate-700/50">
          <button
            type="button"
            onClick={() => handleSwitchMode('qr')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              scanMode === 'qr' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <i className="fas fa-qrcode" /> QR Code
          </button>
          <button
            type="button"
            onClick={() => handleSwitchMode('barcode')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              scanMode === 'barcode' ? 'bg-amber-500 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <i className="fas fa-barcode" /> Barcode (1D)
          </button>
        </div>

        {/* Telegram Native QR Option (Only in QR mode when running inside Telegram) */}
        {hasTgNativeQr && scanMode === 'qr' && (
          <div className="mx-4 mb-2">
            <button
              type="button"
              onClick={handleOpenTelegramNative}
              className="w-full py-1.5 px-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-98"
            >
              <i className="fab fa-telegram-plane" />
              <span>Gunakan Scanner Native Telegram</span>
            </button>
          </div>
        )}

        {/* Viewfinder Camera Area */}
        <div className="relative bg-black mx-3 rounded-2xl overflow-hidden" style={{ minHeight: '280px' }}>
          <div id={scannerDivId} className="w-full" style={{ minHeight: '280px' }} />

          {/* Starting State Overlay */}
          {state === 'starting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 z-10">
              <i className="fas fa-spinner fa-spin text-3xl text-blue-400 mb-3" />
              <p className="text-xs text-slate-300">Memulai kamera...</p>
            </div>
          )}

          {/* Active Scanning Frame Overlay */}
          {state === 'scanning' && <ScanFrame />}

          {/* Error / No Camera Overlay */}
          {(state === 'error' || state === 'no_camera') && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 p-5 text-center gap-3 z-10">
              <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center text-2xl">
                <i className={`fas ${state === 'no_camera' ? 'fa-video-slash' : 'fa-exclamation-triangle'}`} />
              </div>
              <p className="text-xs text-slate-300 leading-relaxed max-w-[260px]">{errorMsg}</p>
              <div className="flex flex-col gap-2 w-full max-w-[220px]">
                {state === 'error' && (
                  <button
                    type="button"
                    onClick={() => startScanner(activeCameraId || undefined, scanMode)}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold transition-all hover:bg-blue-500"
                  >
                    <i className="fas fa-redo mr-1.5" /> Coba Lagi
                  </button>
                )}
                {hasTgNativeQr && (
                  <button
                    type="button"
                    onClick={handleOpenTelegramNative}
                    className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-semibold transition-all hover:bg-sky-500"
                  >
                    <i className="fab fa-telegram-plane mr-1.5" /> Buka Scanner Telegram
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Controls & Hints Bar */}
        <div className="px-4 py-3 space-y-2">
          {state === 'scanning' && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleToggleTorch}
                className={`flex-1 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  torchOn ? 'bg-yellow-500 text-slate-950 font-semibold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <i className={`fas ${torchOn ? 'fa-bolt' : 'fa-lightbulb'}`} />
                {torchOn ? 'Flash ON' : 'Flash OFF'}
              </button>
              {cameras.length > 1 && (
                <select
                  value={activeCameraId || ''}
                  onChange={(e) => handleSwitchCamera(e.target.value)}
                  className="flex-1 py-2 px-2 rounded-xl text-xs bg-slate-800 text-slate-300 border border-slate-700/50 outline-none"
                >
                  {cameras.map((cam, i) => (
                    <option key={cam.id} value={cam.id}>
                      {cam.label || `Kamera ${i + 1}`}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <p className="text-center text-[10px] text-slate-400">
            {scanMode === 'barcode'
              ? 'Mendukung Code-128, Code-39, EAN-13, EAN-8, UPC, ITF'
              : 'Mendukung QR Code & Data Matrix standar'}
          </p>

          <div
            className={`text-center text-[11px] py-1.5 px-2 rounded-lg font-medium ${
              state === 'scanning'
                ? scanMode === 'barcode'
                  ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                  : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                : state === 'starting'
                  ? 'text-blue-400 bg-blue-500/10'
                  : 'text-slate-400 bg-slate-800/50'
            }`}
          >
            {state === 'scanning' && (
              <span className="flex items-center justify-center gap-1.5">
                <i className="fas fa-circle text-[6px] animate-pulse" />
                <span>Scanner aktif — arahkan ke kode label aset</span>
              </span>
            )}
            {state === 'starting' && 'Inisialisasi kamera...'}
            {(state === 'error' || state === 'no_camera') && 'Scanner tidak aktif'}
            {state === 'idle' && 'Mempersiapkan scanner...'}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scanline {
          0%   { top: 8px; opacity: 1; }
          50%  { top: calc(100% - 8px); opacity: 0.5; }
          100% { top: 8px; opacity: 1; }
        }
        @keyframes scanline-h {
          0%   { top: 8px; opacity: 1; }
          50%  { top: calc(100% - 8px); opacity: 0.6; }
          100% { top: 8px; opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default QRScannerModal;
