import { useState, useEffect, useCallback } from 'react';

const CAMERA_PERMISSION_KEY = 'e1_tma_camera_permission_granted';

// Global memory cache agar lintas komponen langsung sinkron tanpa latency
let memoryHasPermission = typeof window !== 'undefined' && localStorage.getItem(CAMERA_PERMISSION_KEY) === 'true';

export interface UseCameraPermissionResult {
  hasCameraPermission: boolean;
  isRequesting: boolean;
  permissionError: string | null;
  requestCameraPermission: (force?: boolean) => Promise<boolean>;
}

/**
 * Custom Hook: useCameraPermission
 * Menginisialisasi izin kamera secara global satu kali di background (Camera Stream Caching)
 * guna mencegah pop-up izin berulang pada WebView Telegram saat modal scanner dibuka-tutup.
 */
export function useCameraPermission(): UseCameraPermissionResult {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return memoryHasPermission || localStorage.getItem(CAMERA_PERMISSION_KEY) === 'true';
  });
  const [isRequesting, setIsRequesting] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const requestCameraPermission = useCallback(async (force = false): Promise<boolean> => {
    if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
      console.warn('[useCameraPermission] mediaDevices.getUserMedia tidak didukung di environment ini.');
      return false;
    }

    // Jika sudah memiliki izin dan tidak dipaksa, hindari memicu prompt ulang
    if (!force && memoryHasPermission) {
      setHasCameraPermission(true);
      return true;
    }

    setIsRequesting(true);
    setPermissionError(null);

    try {
      // Pancing pop-up persetujuan kamera SATU KALI di background
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      // Segera hentikan seluruh track video agar kamera/lampu indikator tidak terus menyala
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });

      memoryHasPermission = true;
      localStorage.setItem(CAMERA_PERMISSION_KEY, 'true');
      setHasCameraPermission(true);
      return true;
    } catch (err: any) {
      console.warn('[useCameraPermission] Izin kamera belum diberikan atau gagal:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setPermissionError(msg);
      setHasCameraPermission(false);
      return false;
    } finally {
      setIsRequesting(false);
    }
  }, []);

  // Inisiasi diam-diam saat komponen pertama kali mount
  useEffect(() => {
    // Jalankan satu kali jika belum tercatat di memory
    if (!memoryHasPermission) {
      requestCameraPermission(false);
    }
  }, [requestCameraPermission]);

  return {
    hasCameraPermission,
    isRequesting,
    permissionError,
    requestCameraPermission,
  };
}

export default useCameraPermission;
