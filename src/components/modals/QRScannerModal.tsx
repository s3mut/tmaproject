import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onScanResult: (scannedText: string) => void;
}

type ScannerState = 'idle' | 'starting' | 'scanning' | 'error' | 'no_camera';
type ScanMode = 'qr' | 'barcode';

const QRScannerModal = ({ isOpen, onClose, onScanResult }: Props) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivId = 'qr-scanner-container';
  const [state, setState] = useState<ScannerState>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [torchOn, setTorchOn] = useState(false);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  const [isNativeTg, setIsNativeTg] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>('qr');
  const isRunningRef = useRef(false);

  const stopScanner = async () => {
    if (scannerRef.current && isRunningRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        // ignore stop errors
      }
      isRunningRef.current = false;
    }
    scannerRef.current = null;
  };

  const startScanner = async (cameraId?: string, mode: ScanMode = scanMode) => {
    if (!document.getElementById(scannerDivId)) return;
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

      const qrbox =
        mode === 'barcode'
          ? { width: 300, height: 100 }
          : { width: 220, height: 220 };

      const config = {
        fps: 15,
        qrbox,
        aspectRatio: mode === 'barcode' ? 1.7 : 1.0,
        disableFlip: false,
      };

      const onSuccess = (decodedText: string) => {
        stopScanner().then(() => {
          onScanResult(decodedText);
          onClose();
        });
      };

      const onError = () => { };

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
        setErrorMsg('Akses kamera ditolak. Pastikan izin kamera diberikan di pengaturan perangkat/Telegram.');
      } else if (msg.includes('NotFound') || msg.includes('no camera') || msg.includes('Requested device not found')) {
        setState('no_camera');
        setErrorMsg('Kamera tidak ditemukan di perangkat ini.');
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
      // Silently fail
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
      // Torch tidak didukung
    }
  };

  const handleSwitchCamera = async (camId: string) => {
    setActiveCameraId(camId);
    await startScanner(camId, scanMode);
  };

  const handleSwitchMode = async (newMode: ScanMode) => {
    if (newMode === scanMode) return;
    setScanMode(newMode);
    const tgWebApp = (window as any).Telegram?.WebApp;
    if (isNativeTg && newMode === 'barcode') {
      try { tgWebApp?.closeScanQrPopup?.(); } catch { }
      setIsNativeTg(false);
      await loadCameraList();
      setTimeout(() => startScanner(activeCameraId || undefined, newMode), 300);
      return;
    }
    if (!isNativeTg && isRunningRef.current) {
      await startScanner(activeCameraId || undefined, newMode);
    }
  };

  useEffect(() => {
    let handlePopupClosed: (() => void) | null = null;
    const tgWebApp = (window as any).Telegram?.WebApp;

    if (isOpen) {
      const canUseNativeQr =
        scanMode === 'qr' &&
        tgWebApp?.isVersionAtLeast?.('6.4') &&
        tgWebApp?.showScanQrPopup;

      if (canUseNativeQr) {
        setIsNativeTg(true);
        try {
          handlePopupClosed = () => { onClose(); };
          tgWebApp.onEvent?.('scanQrPopupClosed', handlePopupClosed);
          tgWebApp.showScanQrPopup(
            { text: 'Arahkan kamera ke QR Code Aset' },
            (scannedText: string) => {
              if (scannedText) {
                onScanResult(scannedText.trim());
                try { tgWebApp.closeScanQrPopup?.(); } catch { }
                onClose();
                return true;
              }
              return false;
            }
          );
        } catch {
          setIsNativeTg(false);
          loadCameraList();
          const t = setTimeout(() => startScanner(), 300);
          return () => {
            clearTimeout(t);
            if (handlePopupClosed) tgWebApp?.offEvent?.('scanQrPopupClosed', handlePopupClosed);
          };
        }
      } else {
        setIsNativeTg(false);
        loadCameraList();
        const t = setTimeout(() => startScanner(undefined, scanMode), 300);
        return () => clearTimeout(t);
      }
    } else {
      if (tgWebApp?.isVersionAtLeast?.('6.4') && tgWebApp?.closeScanQrPopup) {
        try { tgWebApp.closeScanQrPopup?.(); } catch { }
      }
      setIsNativeTg(false);
      stopScanner();
      setState('idle');
      setErrorMsg('');
      setTorchOn(false);
    }

    return () => {
      if (handlePopupClosed) tgWebApp?.offEvent?.('scanQrPopupClosed', handlePopupClosed);
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      stopScanner();
      const tgWebApp = (window as any).Telegram?.WebApp;
      try { tgWebApp?.closeScanQrPopup?.(); } catch { }
    };
  }, []);

  if (!isOpen || isNativeTg) return null;

  const ScanFrame = () =>
    scanMode === 'barcode' ? (
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="relative" style={{ width: '88%', height: '90px' }}>
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
      onClick={(e) => { if (e.target === e.currentTarget) { stopScanner(); onClose(); } }}
    >
      <div className="modal-content p-0 overflow-hidden max-w-sm mx-auto rounded-3xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <i className={`fas ${scanMode === 'barcode' ? 'fa-barcode' : 'fa-qrcode'} text-lg`} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-50">Scan QR / Barcode Aset</h2>
              <p className="text-[11px] text-slate-400">Arahkan kamera ke kode pada label aset</p>
            </div>
          </div>
          <button
            onClick={() => { stopScanner(); onClose(); }}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-slate-50 flex items-center justify-center"
          >
            <i className="fas fa-times text-sm" />
          </button>
        </div>

        <div className="flex gap-1.5 mx-4 mb-2 p-1 rounded-xl bg-slate-800">
          <button
            onClick={() => handleSwitchMode('qr')}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all ${
              scanMode === 'qr' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <i className="fas fa-qrcode" /> QR Code
          </button>
          <button
            onClick={() => handleSwitchMode('barcode')}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all ${
              scanMode === 'barcode' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <i className="fas fa-barcode" /> Barcode
          </button>
        </div>

        <div className="relative bg-black mx-3 rounded-2xl overflow-hidden" style={{ minHeight: '280px' }}>
          <div id={scannerDivId} className="w-full" style={{ minHeight: '280px' }} />
          {state === 'starting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
              <i className="fas fa-spinner fa-spin text-3xl text-blue-400 mb-3" />
              <p className="text-xs text-slate-300">Memulai kamera...</p>
            </div>
          )}
          {state === 'scanning' && <ScanFrame />}
          {(state === 'error' || state === 'no_camera') && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 p-5 text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center text-2xl">
                <i className={`fas ${state === 'no_camera' ? 'fa-video-slash' : 'fa-exclamation-triangle'}`} />
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{errorMsg}</p>
              {state === 'error' && (
                <button
                  onClick={() => startScanner(activeCameraId || undefined, scanMode)}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold mt-1"
                >
                  <i className="fas fa-redo mr-1.5" />Coba Lagi
                </button>
              )}
            </div>
          )}
        </div>

        <div className="px-4 py-3 space-y-2">
          {state === 'scanning' && (
            <div className="flex gap-2">
              <button
                onClick={handleToggleTorch}
                className={`flex-1 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  torchOn ? 'bg-yellow-500 text-slate-950' : 'bg-slate-700 text-slate-300'
                }`}
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
            </div>
          )}
          <p className="text-center text-[10px] text-slate-500">
            {scanMode === 'barcode'
              ? 'Mode Barcode: posisikan barcode horizontal & penuh di dalam bingkai'
              : 'Mode QR: pastikan seluruh pola QR masuk ke dalam bingkai'}
          </p>
          <div className={`text-center text-[11px] py-1 rounded-lg ${
            state === 'scanning'
              ? scanMode === 'barcode' ? 'text-amber-400 bg-amber-500/10' : 'text-emerald-400 bg-emerald-500/10'
              : state === 'starting' ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 bg-slate-800/50'
          }`}>
            {state === 'scanning' && <><i className="fas fa-circle text-[6px] mr-1 animate-pulse" />Scanner aktif — tunggu kode terdeteksi otomatis</>}
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
