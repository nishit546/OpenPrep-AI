import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  DEFAULT_MICRO_SETTINGS,
  getMicroSettings,
  saveMicroSettings,
  isQuietHour,
  requestNotificationPermission,
  showMicroNotification,
  startMicroScheduler,
} from '../microScheduleWorker';

describe('microScheduleWorker Service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('getMicroSettings & saveMicroSettings', () => {
    it('returns default settings when none stored', () => {
      const settings = getMicroSettings();
      expect(settings.enabled).toBe(true);
      expect(settings.frequencyMinutes).toBe(60);
    });

    it('saves and retrieves updated settings', () => {
      saveMicroSettings({ enabled: false, frequencyMinutes: 30 });
      const settings = getMicroSettings();
      expect(settings.enabled).toBe(false);
      expect(settings.frequencyMinutes).toBe(30);
    });
  });

  describe('isQuietHour', () => {
    it('correctly detects quiet hours across midnight boundary', () => {
      const settings = {
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
      };

      // Mock date to 23:30 (11:30 PM - should be quiet)
      vi.useFakeTimers();
      const mockDate = new Date(2026, 0, 1, 23, 30);
      vi.setSystemTime(mockDate);

      expect(isQuietHour(settings)).toBe(true);

      // Mock date to 14:00 (2:00 PM - should not be quiet)
      vi.setSystemTime(new Date(2026, 0, 1, 14, 0));
      expect(isQuietHour(settings)).toBe(false);

      vi.useRealTimers();
    });
  });

  describe('startMicroScheduler', () => {
    it('schedules periodic callback and returns cleanup function', () => {
      vi.useFakeTimers();
      const callback = vi.fn();

      saveMicroSettings({
        enabled: true,
        frequencyMinutes: 30,
        quietHoursStart: '01:00',
        quietHoursEnd: '02:00',
      });

      // Set time outside quiet hours
      vi.setSystemTime(new Date(2026, 0, 1, 12, 0));

      const stop = startMicroScheduler(callback);

      vi.advanceTimersByTime(30 * 60 * 1000);
      expect(callback).toHaveBeenCalledTimes(1);

      stop();
      vi.advanceTimersByTime(30 * 60 * 1000);
      expect(callback).toHaveBeenCalledTimes(1); // Not called again after stop

      vi.useRealTimers();
    });
  });
});
