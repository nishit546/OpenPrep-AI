import React, { useState, useEffect } from 'react';
import {
  Zap,
  Bell,
  Clock,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle,
  Play,
} from 'lucide-react';
import VintagePaper from '../dashboard/VintagePaper';
import {
  getMicroSettings,
  saveMicroSettings,
  requestNotificationPermission,
  showMicroNotification,
} from '../../services/microScheduleWorker';

export default function MicroLearningSettings() {
  const [settings, setSettings] = useState(getMicroSettings());
  const [hasPermission, setHasPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setSettings(getMicroSettings());
  }, []);

  const handleChange = (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveMicroSettings(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setHasPermission(granted);
    if (granted) {
      showMicroNotification('OpenPrep AI: Micro-Learning Active', {
        body: 'Scheduled micro-doses will be delivered directly to your device toolbar.',
      });
    }
  };

  const handleTestTrigger = () => {
    if (typeof window.openMicroReviewModal === 'function') {
      window.openMicroReviewModal();
    }
  };

  return (
    <VintagePaper className="border-t-4 border-t-amber-500">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold font-playfair text-neutral-800 dark:text-neutral-100">
              Daily Micro-Learning & Desktop Companion
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              1 question / high-yield formula review throughout the day for effortless spaced recall.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleTestTrigger}
          className="px-3.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
        >
          <Play className="w-3.5 h-3.5 fill-current" /> Test Micro Dose
        </button>
      </div>

      <div className="space-y-4">
        {/* Toggle Enabled */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-neutral-100/60 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 rounded-lg">
          <div>
            <p className="font-playfair font-bold text-base text-neutral-800 dark:text-neutral-100">
              Automated Micro-Review Triggers
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Periodically prompts you with single bite-sized questions based on your active revision queue.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={settings.enabled}
            aria-label="Toggle Automated Micro-Review Triggers"
            onClick={() => handleChange('enabled', !settings.enabled)}
            className="relative inline-flex items-center h-7 w-12 rounded-full bg-neutral-300 dark:bg-neutral-700 transition-colors focus:outline-none shrink-0"
          >
            <span
              className={`inline-block w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                settings.enabled ? 'translate-x-6 bg-amber-500' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Frequency & Quiet Hours */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-neutral-100/60 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 rounded-lg space-y-2">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Prompt Frequency
            </label>
            <select
              value={settings.frequencyMinutes}
              onChange={(e) => handleChange('frequencyMinutes', Number(e.target.value))}
              disabled={!settings.enabled}
              className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
            >
              <option value={15}>Every 15 minutes (Intense Sprint)</option>
              <option value={30}>Every 30 minutes (Standard)</option>
              <option value={60}>Every 1 hour (Recommended)</option>
              <option value={120}>Every 2 hours (Casual Recall)</option>
            </select>
          </div>

          <div className="p-4 bg-neutral-100/60 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 rounded-lg space-y-2">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-amber-500" />
              Quiet Hours (No Notifications)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={settings.quietHoursStart}
                onChange={(e) => handleChange('quietHoursStart', e.target.value)}
                disabled={!settings.enabled}
                className="w-1/2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 dark:text-neutral-200 disabled:opacity-50"
              />
              <span className="text-xs text-neutral-400">to</span>
              <input
                type="time"
                value={settings.quietHoursEnd}
                onChange={(e) => handleChange('quietHoursEnd', e.target.value)}
                disabled={!settings.enabled}
                className="w-1/2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 dark:text-neutral-200 disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Browser Permission Prompt if missing */}
        {!hasPermission && (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between text-xs text-amber-700 dark:text-amber-300">
            <span>Enable browser permissions to receive notifications while working on other tasks.</span>
            <button
              type="button"
              onClick={handleEnableNotifications}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow transition"
            >
              Grant Permission
            </button>
          </div>
        )}

        {savedSuccess && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> Micro-learning preferences saved.
          </p>
        )}
      </div>
    </VintagePaper>
  );
}
