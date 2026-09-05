import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import Button from '../ui/Button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onScanResult: (scannedText: string) => void;
}

type ScannerState = 'idle' | 'selection' | 'starting' | 'scanning' | 'error' | 'no_camera';

// Detect apakah berjalan di dalam Telegram WebApp dengan dukungan QR Scanner native
const hasTelegramNativeQr = (): boolean => {
  try {
    const tg = (window as any).Telegram?.WebApp;
    return !!(tg?.isVersionAtLeast?.('6.4') && tg?.showScanQrPopup);
  } catch {
    return false;
  }
};

const SCANNER_DIV_ID = 'qr-scanner-container-main';

const QRScannerModal = ({ isOpen, onClose, onScanResult }: Props) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isRunningRef = useRef(false);
  const pendingModeRef = useRef<'qr' | 'barcode' | null>(null);

  const [state, setState] = useState<ScannerState>('idle');
  const [scanMode, setScanMode] = useState<'qr' | 'barcode'>('qr');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [torchOn, setTorchOn] = useState(false);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  // true jika Telegram native QR popup sedang aktif
  const [nativeTgActive, setNativeTgActive] = useState(false);

  const isOnTelegram = hasTelegramNativeQr();

  // ─────────────────────────────────────────
  // Stop & cleanup html5-qrcode instance
  // ─────────────────────────────────────────
  const stopScanner = useCallback(async () => {
    if (scannerRef.current && isRunningRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // ignore
      }
      try {
        scannerRef.current.clear();
      } catch {
        // ignore
      }
      scannerRef.current = null;
      isRunningRef.current = false;
    }
  }, []);

  // ─────────────────────────────────────────
  // Start html5-qrcode scanner
  // ─────────────────────────────────────────
  const startWebScanner = useCallback(async (mode: 'qr' | 'barcode', cameraId?: string) => {
    const container = document.getElementById(SCANNER_DIV_ID);
    if (!container) {
      console.warn('[Scanner] Container belum ada di DOM, akan coba lagi');
      return false;
    }

    await stopScanner();
    setState('starting');
    setErrorMsg('');

    try {
      scannerRef.current = new Html5Qrcode(SCANNER_DIV_ID, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
        ],
        verbose: false,
      });

      const isBarcode = mode === 'barcode';
      const config = {
        fps: 15,
        qrbox: isBarcode ? { width: 280, height: 120 } : { width: 240, height: 240 },
        aspectRatio: isBarcode ? 2.0 : 1.0,
        disableFlip: false,
      };

      const onSuccess = (decodedText: string) => {
        stopScanner().then(() => {
          onScanResult(decodedText.trim());
          onClose();
        });
      };

      if (cameraId) {
        await scannerRef.current.start({ deviceId: { exact: cameraId } }, config, onSuccess, () => {});
      } else {
        await scannerRef.current.start({ facingMode: 'environment' }, config, onSuccess, () => {});
      }

      isRunningRef.current = true;
      setState('scanning');
      return true;
    } catch (err: any) {
      console.error('[Scanner] Error:', err);
      const msg = err?.message || String(err);

      if (msg.includes('Permission') || msg.includes('permission') || msg.includes('NotAllowed')) {
        setState('error');
        setErrorMsg('Akses kamera ditolak. Pastikan izin kamera diberikan di pengaturan browser/perangkat.');
      } else if (msg.includes('NotFound') || msg.includes('no camera') || msg.includes('Requested device not found')) {
        setState('no_camera');
        setErrorMsg('Kamera tidak ditemukan di perangkat ini.');
      } else if (msg.includes('AbortError') || msg.includes('play()')) {
        // Harmless abort (modal closed before camera started), ignore
        setState('idle');
      } else {
        setState('error');
        setErrorMsg(`Gagal membuka kamera: ${msg}`);
      }
      return false;
    }
  }, [stopScanner, onScanResult, onClose]);

  // ─────────────────────────────────────────
  // Telegram native QR scanner
  // ─────────────────────────────────────────
  const openTelegramNativeQr = useCallback(() => {
    const tgWebApp = (window as any).Telegram?.WebApp;
    if (!tgWebApp) return;

    setNativeTgActive(true);

    try {
      tgWebApp.onEvent?.('scanQrPopupClosed', () => {
        setNativeTgActive(false);
        onClose();
      });

      tgWebApp.showScanQrPopup(
        { text: 'Arahkan kamera ke QR Code Aset' },
        (scannedText: string) => {
          if (scannedText) {
            onScanResult(scannedText.trim());
            try { tgWebApp.closeScanQrPopup(); } catch { /* ignore */ }
            setNativeTgActive(false);
            onClose();
            return true;
          }
          return false;
        }
      );
    } catch (err) {
      console.error('[Scanner] Telegram native QR error:', err);
      // Fallback ke html5-qrcode
      setNativeTgActive(false);
      setScanMode('qr');
      setState('starting');
    }
  }, [onClose, onScanResult]);

  // ─────────────────────────────────────────
  // User picks a scan mode from selection screen
  // ─────────────────────────────────────────
  const handleSelectMode = useCallback((mode: 'qr' | 'barcode') => {
    setScanMode(mode);

    if (mode === 'qr' && isOnTelegram) {
      // Telegram: pakai native QR popup (lebih cepat & tidak butuh WebRTC)
      openTelegramNativeQr();
    } else {
      // Web browser atau Barcode 1D: pakai html5-qrcode
      // Set pendingMode dulu, render scanner container dulu, lalu effect akan start scanner
      pendingModeRef.current = mode;
      setState('starting');
    }
  }, [isOnTelegram, openTelegramNativeQr]);

  // ─────────────────────────────────────────
  // Effect: start scanner setelah container dirender (state = 'starting')
  // ─────────────────────────────────────────
  useEffect(() => {
    if (state !== 'starting' || nativeTgActive) return;

    const mode = pendingModeRef.current ?? scanMode;

    // Beri sedikit delay agar React selesai render container ke DOM
    const timer = setTimeout(() => {
      startWebScanner(mode, activeCameraId ?? undefined);
    }, 80);

    return () => clearTimeout(timer);
  }, [state, nativeTgActive, scanMode, activeCameraId, startWebScanner]);

  // ─────────────────────────────────────────
  // Effect: open/close modal
  // ─────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setState('selection');
      setErrorMsg('');
      setTorchOn(false);
      setNativeTgActive(false);
      // Load camera list untuk dropdown switch kamera
      Html5Qrcode.getCameras()
        .then((devices) => {
          if (devices?.length > 0) {
            setCameras(devices);
            setActiveCameraId(devices[devices.length - 1].id);
          }
        })
        .catch(() => { /* permissions belum diberikan */ });
    } else {
      // Modal ditutup: hentikan semua scanner
      stopScanner();
      setState('idle');
      setErrorMsg('');
      setTorchOn(false);
      setNativeTgActive(false);
      pendingModeRef.current = null;

      const tg = (window as any).Telegram?.WebApp;
      if (tg?.closeScanQrPopup) {
        try { tg.closeScanQrPopup(); } catch { /* ignore */ }
      }
    }
  }, [isOpen, stopScanner]);

  // ─────────────────────────────────────────
  // Cleanup on unmount
  // ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopScanner();
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.closeScanQrPopup) {
        try { tg.closeScanQrPopup(); } catch { /* ignore */ }
      }
    };
  }, [stopScanner]);

  // ─────────────────────────────────────────
  // Torch toggle
  // ─────────────────────────────────────────
  const handleToggleTorch = useCallback(async () => {
    if (!scannerRef.current || !isRunningRef.current) return;
    try {
      const track = (scannerRef.current as any)?.['mediaStream']?.getVideoTracks?.()[0];
      if (track) {
        await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
        setTorchOn((prev) => !prev);
      }
    } catch {
      // Torch tidak didukung
    }
  }, [torchOn]);

  // ─────────────────────────────────────────
  // Switch camera
  // ─────────────────────────────────────────
  const handleSwitchCamera = useCallback(async (camId: string) => {
    setActiveCameraId(camId);
    pendingModeRef.current = scanMode;
    await startWebScanner(scanMode, camId);
  }, [scanMode, startWebScanner]);

  // ─────────────────────────────────────────
  // Render: jika modal tutup atau Telegram native aktif → tidak render apa-apa
  // ─────────────────────────────────────────
  if (!isOpen || nativeTgActive) return null;

  const isWebScannerVisible = state !== 'selection';

  return (
    <div
      className="modal-overlay active"
      onClick={(e) => { if (e.target === e.currentTarget) { stopScanner(); onClose(); } }}
    >
      <div className="modal-content p-0 overflow-hidden max-w-sm mx-auto rounded-3xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <i className="fas fa-qrcode text-lg" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-50">Scan QR / Barcode Aset</h2>
              <p className="text-[11px] text-slate-400">
                {state === 'scanning'
                  ? `Mode: ${scanMode === 'barcode' ? 'Barcode 1D' : 'QR Code'}`
                  : 'Arahkan kamera ke kode pada label aset'}
              </p>
            </div>
          </div>
          <button
            onClick={() => { stopScanner(); onClose(); }}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-slate-50 flex items-center justify-center"
          >
            <i className="fas fa-times text-sm" />
          </button>
        </div>

        {/* ── SELECTION SCREEN ── */}
        {state === 'selection' && (
          <div className="flex flex-col px-6 pb-8 pt-4 gap-4 items-center">
            <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-3xl mb-1">
              <i className="fas fa-qrcode" />
            </div>
            <h3 className="text-sm font-bold text-slate-50 text-center">Pilih Metode Scan</h3>
            <p className="text-xs text-slate-400 text-center mb-2 leading-relaxed">
              {isOnTelegram
                ? 'Gunakan pemindai bawaan Telegram untuk QR Code, atau pemindai web untuk Barcode batang (1D).'
                : 'Pilih jenis kode yang akan dipindai menggunakan kamera perangkat Anda.'}
            </p>

            <div className="w-full flex flex-col gap-3 mt-2">
              <Button
                variant="primary"
                icon="fa-qrcode"
                fullWidth
                onClick={() => handleSelectMode('qr')}
              >
                {isOnTelegram ? 'Scan QR Code (Telegram Native)' : 'Scan QR Code'}
              </Button>

              <Button
                variant="secondary"
                icon="fa-barcode"
                fullWidth
                onClick={() => handleSelectMode('barcode')}
              >
                Scan Barcode Batang (1D)
              </Button>
            </div>
          </div>
        )}

        {/* ── WEB SCANNER AREA ── */}
        {/* Selalu render container agar html5-qrcode bisa mount, tapi sembunyikan saat selection */}
        <div
          className="px-3"
          style={{ display: isWebScannerVisible ? 'block' : 'none' }}
        >
          <div className="relative bg-black rounded-2xl overflow-hidden" style={{ minHeight: '280px' }}>
            {/* html5-qrcode render video ke dalam div ini */}
            <div id={SCANNER_DIV_ID} className="w-full" style={{ minHeight: '280px' }} />

            {/* Starting overlay */}
            {state === 'starting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
                <i className="fas fa-spinner fa-spin text-3xl text-blue-400 mb-3" />
                <p className="text-xs text-slate-300">Memulai kamera...</p>
              </div>
            )}

            {/* Scan frame overlay */}
            {state === 'scanning' && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                <div className={`relative transition-all duration-300 ${scanMode === 'barcode' ? 'w-64 h-32' : 'w-52 h-52'}`}>
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-400 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-400 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-400 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-400 rounded-br-lg" />
                  <div
                    className="absolute left-1 right-1 top-2 h-0.5 bg-blue-400/80"
                    style={{ animation: 'qr-scanline 2s ease-in-out infinite' }}
                  />
                </div>
              </div>
            )}

            {/* Error / No Camera */}
            {(state === 'error' || state === 'no_camera') && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 p-5 text-center gap-3 z-10">
                <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center text-2xl">
                  <i className={`fas ${state === 'no_camera' ? 'fa-video-slash' : 'fa-exclamation-triangle'}`} />
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{errorMsg}</p>
                {state === 'error' && (
                  <button
                    onClick={() => {
                      pendingModeRef.current = scanMode;
                      setState('starting');
                    }}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold mt-1"
                  >
                    <i className="fas fa-redo mr-1.5" />Coba Lagi
                  </button>
                )}
                <button
                  onClick={() => setState('selection')}
                  className="px-4 py-2 rounded-xl bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  ← Kembali
                </button>
              </div>
            )}
          </div>

          {/* Controls bar */}
          <div className="py-3 space-y-2">
            {state === 'scanning' && (
              <div className="flex gap-2">
                <button
                  onClick={handleToggleTorch}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${torchOn ? 'bg-yellow-500 text-slate-950' : 'bg-slate-700 text-slate-300'}`}
                >
                  <i className={`fas ${torchOn ? 'fa-bolt' : 'fa-lightbulb'}`} />
                  {torchOn ? 'Torch ON' : 'Torch OFF'}
                </button>
                {cameras.length > 1 && (
                  <select
                    value={activeCameraId || ''}
                    onChange={(e) => handleSwitchCamera(e.target.value)}
                    className="flex-1 py-2 px-2 rounded-xl text-xs bg-slate-700 text-slate-300 border-none outline-none"
                  >
                    {cameras.map((cam, i) => (
                      <option key={cam.id} value={cam.id}>
                        {cam.label || `Kamera ${i + 1}`}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={() => {
                    stopScanner();
                    setState('selection');
                  }}
                  className="py-2 px-3 rounded-xl text-xs bg-slate-700 text-slate-300 flex items-center gap-1"
                >
                  <i className="fas fa-sync-alt" /> Ganti
                </button>
              </div>
            )}

            <div className={`text-center text-[11px] py-1 rounded-lg ${
              state === 'scanning' ? 'text-emerald-400 bg-emerald-500/10' :
              state === 'starting' ? 'text-blue-400 bg-blue-500/10' :
              'text-slate-400 bg-slate-800/50'
            }`}>
              {state === 'scanning' && <><i className="fas fa-circle text-[6px] mr-1 animate-pulse" />Scanner aktif - tunggu kode terdeteksi otomatis</>}
              {state === 'starting' && 'Inisialisasi kamera...'}
              {(state === 'error' || state === 'no_camera') && 'Scanner tidak aktif'}
            </div>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes qr-scanline {
          0%   { top: 8px; opacity: 1; }
          50%  { top: calc(100% - 8px); opacity: 0.5; }
          100% { top: 8px; opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default QRScannerModal;
