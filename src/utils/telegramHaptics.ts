export const triggerHaptic = (type: 'success' | 'error' | 'warning' | 'light') => {
  try {
    const webApp = window.Telegram?.WebApp;
    if (webApp?.HapticFeedback) {
      if (type === 'light') {
        webApp.HapticFeedback.impactOccurred('light');
      } else {
        webApp.HapticFeedback.notificationOccurred(type);
      }
    }
  } catch (err) {
    console.warn('[Haptic] Haptic feedback failed or unsupported:', err);
  }
};
