/**
 * Micro-Learning Schedule Worker
 * Manages periodic alarms/intervals, quiet hours, and browser notifications for spaced micro-review.
 */

const STORAGE_KEY = 'openprep_micro_learning_settings';

export const DEFAULT_MICRO_SETTINGS = {
  enabled: true,
  frequencyMinutes: 60, // 30, 60, 120, or on-demand
  quietHoursStart: '22:00', // e.g. 10 PM
  quietHoursEnd: '08:00',   // e.g. 8 AM
  soundEnabled: true,
  autoDismissSeconds: 5,
};

export const getMicroSettings = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...DEFAULT_MICRO_SETTINGS, ...JSON.parse(saved) } : DEFAULT_MICRO_SETTINGS;
  } catch {
    return DEFAULT_MICRO_SETTINGS;
  }
};

export const saveMicroSettings = (settings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('Failed to save micro learning settings:', err);
  }
};

export const isQuietHour = (settings = getMicroSettings()) => {
  if (!settings.quietHoursStart || !settings.quietHoursEnd) return false;
  
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = settings.quietHoursStart.split(':').map(Number);
  const [endH, endM] = settings.quietHoursEnd.split(':').map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } else {
    // Over midnight (e.g. 22:00 to 08:00)
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }
};

export const requestNotificationPermission = async () => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }
  return false;
};

export const showMicroNotification = (title, options = {}) => {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;
  if (Notification.permission !== 'granted') return null;
  if (isQuietHour()) return null;

  const defaultOptions = {
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'openprep-micro-learning',
    renotify: true,
    requireInteraction: false,
    ...options,
  };

  try {
    const notification = new Notification(title, defaultOptions);
    notification.onclick = () => {
      window.focus();
      if (typeof window.openMicroReviewModal === 'function') {
        window.openMicroReviewModal();
      }
      notification.close();
    };
    return notification;
  } catch (err) {
    console.warn('Could not display system notification:', err);
    return null;
  }
};

let schedulerInterval = null;

export const startMicroScheduler = (onTrigger) => {
  if (schedulerInterval) clearInterval(schedulerInterval);

  const checkAndTrigger = () => {
    const settings = getMicroSettings();
    if (!settings.enabled) return;
    if (isQuietHour(settings)) return;

    if (typeof onTrigger === 'function') {
      onTrigger();
    }
  };

  const settings = getMicroSettings();
  const intervalMs = Math.max(1, settings.frequencyMinutes) * 60 * 1000;

  // Set periodic scheduler
  schedulerInterval = setInterval(checkAndTrigger, intervalMs);

  return () => {
    if (schedulerInterval) clearInterval(schedulerInterval);
  };
};
