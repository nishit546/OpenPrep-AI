import { useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  UserCircle,
  Upload,
  Save,
  Trash,
  AlertCircle,
  CheckCircle,
  Bell,
  Award,
  Users,
  CalendarDays,
  Volume2,
  Palette,
} from 'lucide-react';
import LeatherBoard from '../components/dashboard/LeatherBoard.jsx';
import VintagePaper from '../components/dashboard/VintagePaper';
import ThemeToggle from '../components/ThemeToggle';
import TwoWayCalendarSyncManager from '../components/calendar/TwoWayCalendarSyncManager';
import MicroLearningSettings from '../components/settings/MicroLearningSettings';
import API from '../services/api';

import {
  getVapidPublicKey,
  subscribeToPush,
  unsubscribeFromPush,
  updateNotificationPreferences,
} from '../services/notificationApi';
import { loadUser } from '../store/slices/authSlice';
import { validateAvatarFile } from '../utils/fileValidation';
import { BADGE_LIST, BADGE_ICONS } from '../config/badges.js';
import LazyImage from '../components/common/LazyImage';
import ThemeCustomizerDrawer from '../components/ThemeCustomizerDrawer';
import BadgeCarousel from '../components/badges/BadgeCarousel';
import { useTheme } from '../context/ThemeContext';
import { THEME_PRESETS } from '../themePresets';

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const Settings = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { theme, resolvedTheme, accentColors } = useTheme();
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);

  const [leaderboardVisible, setLeaderboardVisible] = useState(
    typeof user?.leaderboardVisible === 'boolean' ? user.leaderboardVisible : true
  );
  const [hideActivityFromSquad, setHideActivityFromSquad] = useState(
    typeof user?.hideActivityFromSquad === 'boolean' ? user.hideActivityFromSquad : false
  );
  const [syncGoogleCalendar, setSyncGoogleCalendar] = useState(
    typeof user?.syncGoogleCalendar === 'boolean' ? user.syncGoogleCalendar : false
  );
  const [savingActivityPrivacy, setSavingActivityPrivacy] = useState(false);
  const [savingCalendarSync, setSavingCalendarSync] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const [ttsSpeed, setTtsSpeed] = useState(() => {
    const savedSpeed = localStorage.getItem('openprep_tts_speed');
    return savedSpeed ? parseFloat(savedSpeed) : 1;
  });

  const handleTtsSpeedChange = (speed) => {
    setTtsSpeed(speed);
    localStorage.setItem('openprep_tts_speed', String(speed));
  };

  // Avatar Upload States
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const validation = validateAvatarFile(selectedFile);
    if (!validation.isValid) {
      setUploadError(validation.error);
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    setUploadError(null);
    setUploadSuccess(false);
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  const handleSaveAvatar = async () => {
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      await API.put('/users/avatar', formData, {
        headers: {
          'Content-Type': undefined,
        },
      });

      setUploadSuccess(true);
      setFile(null);
      setPreviewUrl(null);
      await dispatch(loadUser());
    } catch (err) {
      setUploadError(
        err.response?.data?.error || err.response?.data?.message || 'Failed to save avatar photo.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!window.confirm('Are you sure you want to remove your profile picture?')) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      await API.delete('/users/avatar');
      setUploadSuccess(true);
      setFile(null);
      setPreviewUrl(null);
      await dispatch(loadUser());
    } catch (err) {
      setUploadError(
        err.response?.data?.error || err.response?.data?.message || 'Failed to remove avatar photo.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleToggle = useCallback(async () => {
    const next = !leaderboardVisible;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await API.patch('/auth/settings', { leaderboardVisible: next });
      setLeaderboardVisible(next);
      setSaved(true);
      // Refresh the Redux user so every surface reflects the new preference
      await dispatch(loadUser());
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update settings. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [leaderboardVisible, dispatch]);

  const handleActivityPrivacyToggle = useCallback(async () => {
    const next = !hideActivityFromSquad;
    setSavingActivityPrivacy(true);
    try {
      await API.patch('/auth/settings', { hideActivityFromSquad: next });
      setHideActivityFromSquad(next);
      await dispatch(loadUser());
    } catch (err) {
      console.error('Failed to update squad activity privacy:', err);
    } finally {
      setSavingActivityPrivacy(false);
    }
  }, [hideActivityFromSquad, dispatch]);

  const handleCalendarSyncToggle = useCallback(async () => {
    const next = !syncGoogleCalendar;
    setSavingCalendarSync(true);
    try {
      await API.patch('/auth/settings', { syncGoogleCalendar: next });
      setSyncGoogleCalendar(next);
      await dispatch(loadUser());
    } catch (err) {
      console.error('Failed to update background calendar sync preference:', err);
    } finally {
      setSavingCalendarSync(false);
    }
  }, [syncGoogleCalendar, dispatch]);

  const [reminderTime, setReminderTime] = useState(user?.dailyReminderTime || '09:00');  const [pushStatus, setPushStatus] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'default');
  const [pushSubscribed, setPushSubscribed] = useState(!!user?.pushSubscription);
  const [pushLoading, setPushLoading] = useState(false);

  const handleEnablePush = async () => {
    try {
      setPushLoading(true);
      const permission = await Notification.requestPermission();
      setPushStatus(permission);

      if (permission === 'granted') {
        // Subscribes against the worker vite-plugin-pwa already registered.
        // This used to register /service-worker.js and subscribe to that — a
        // worker with no push listener, so nothing was ever displayed.
        const vapidPublicKey = await getVapidPublicKey();
        const subscription = await subscribeToPushNotifications(vapidPublicKey);

        await subscribeToPush(subscription);
        setPushSubscribed(true);
        dispatch(loadUser());
      }
    } catch (err) {
      console.error('Failed to subscribe to push notifications', err);
      setError('Failed to enable push notifications.');
    } finally {
      setPushLoading(false);
    }
  };

  const handleDisablePush = async () => {
    try {
      setPushLoading(true);
      await unsubscribeFromPushNotifications();
      await unsubscribeFromPush();
      setPushSubscribed(false);
      dispatch(loadUser());
    } catch (err) {
      console.error('Failed to unsubscribe', err);
      setError('Failed to disable push notifications.');
    } finally {
      setPushLoading(false);
    }
  };

  const handleSaveReminderTime = async () => {
    try {
      setSaving(true);
      setSaved(false);
      await updateNotificationPreferences(reminderTime);
      setSaved(true);
      dispatch(loadUser());
    } catch {
      setError('Failed to update reminder time.');
    } finally {
      setSaving(false);
    }
  };

  const baseURL = API?.defaults?.baseURL || '';
  const cleanBaseURL = baseURL.replace(/\/api\/?$/, '');
  const avatarUrl = user?.avatar
    ? user.avatar.startsWith('http')
      ? user.avatar
      : `${cleanBaseURL}${user.avatar}`
    : null;

  return (
    <LeatherBoard>
      <div className="pl-4 md:pl-16 pr-4 lg:pr-8 pt-16 sm:pt-8 pb-8 space-y-10">
        {/* --- HEADER --- */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-black/20 pb-6 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-gold-foil mb-2 font-playfair tracking-tight">
              Settings
            </h1>
            <p className="text-amber-100/70 text-base italic font-playfair">
              Manage your privacy and study preferences.
            </p>
          </motion.div>

          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-yellow-400 border border-yellow-700/50 rounded-sm text-sm font-semibold shadow transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
        {/* --- USER AVATAR PROFILE --- */}
        <VintagePaper className="border-t-4 border-t-amber-700">
          <div className="flex items-center gap-3 mb-4">
            <UserCircle className="w-7 h-7 text-amber-700" />
            <h2 className="text-2xl font-bold font-playfair text-neutral-800 dark:text-neutral-100">
              Profile Picture
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar Preview */}
            <div className="relative shrink-0">
              {previewUrl || avatarUrl ? (
                <LazyImage
                  src={previewUrl || avatarUrl}
                  alt="Profile Avatar"
                  loading="lazy"
                  className={`w-24 h-24 rounded-full border-2 border-amber-600 shadow-[0_4px_10px_rgba(0,0,0,0.2)] object-cover bg-white ${
                    (previewUrl || avatarUrl).endsWith('.svg') ||
                    (previewUrl || avatarUrl).includes('image/svg+xml')
                      ? 'p-2 object-contain'
                      : ''
                  }`}
                  fallbackSrc="https://www.transparenttextures.com/patterns/cream-paper.png"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 text-white font-playfair font-bold text-4xl flex items-center justify-center border-2 border-amber-500 shadow-md">
                  {user?.name ? user.name[0].toUpperCase() : 'S'}
                </div>
              )}
            </div>

            <div className="flex-1 space-y-3">
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                Upload a JPEG, PNG, WEBP, or SVG image (max 2MB).
              </p>

              <div className="flex flex-wrap gap-2.5">
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                  onChange={handleFileChange}
                  aria-label="Select Image"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('avatar-upload').click()}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-yellow-400 border border-yellow-700/50 rounded-sm text-xs font-semibold shadow transition-all flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" /> Select Image
                </button>

                {file && (
                  <button
                    type="button"
                    onClick={handleSaveAvatar}
                    disabled={uploading}
                    className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-sm text-xs font-semibold shadow transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" /> Save Photo
                      </>
                    )}
                  </button>
                )}

                {user?.avatar && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={uploading}
                    className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 border border-red-200 rounded-sm text-xs font-semibold shadow transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Trash className="w-3.5 h-3.5" /> Remove
                  </button>
                )}
              </div>

              {uploadError && (
                <p className="text-xs text-red-600 dark:text-red-400 font-serif flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> {uploadError}
                </p>
              )}
              {uploadSuccess && (
                <p className="text-xs text-green-600 dark:text-green-400 font-serif flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" /> Avatar updated successfully!
                </p>
              )}
            </div>
          </div>
        </VintagePaper>
        {/* --- APPEARANCE / THEME CUSTOMIZER --- */}
        <VintagePaper className="border-t-4 border-t-amber-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Palette className="w-7 h-7 text-amber-700" />
              <div>
                <h2 className="text-2xl font-bold font-playfair text-neutral-800 dark:text-neutral-100">
                  Appearance & Theme Customizer
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Current Preset: <span className="font-semibold text-amber-800 dark:text-amber-300">{THEME_PRESETS[theme]?.name || THEME_PRESETS[resolvedTheme]?.name}</span>
                </p>
              </div>
            </div>

            <ThemeToggle showPaletteOption />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-neutral-100/60 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-600 rounded-lg">
            <div>
              <p className="text-sm text-neutral-700 dark:text-neutral-200 font-semibold">
                Theme Presets & Custom HSL Accent Colors
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Customize presets (Modern Glassmorphism, Midnight AMOLED Dark, Emerald Study, Sunset Warm, Sepia Reading) or fine-tune CSS accent colors.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Swatch Preview */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                <span
                  className="w-3.5 h-3.5 rounded-full border border-black/20"
                  style={{ backgroundColor: accentColors?.primary?.hex || '#ad8b73' }}
                  title="Primary Accent"
                />
                <span
                  className="w-3.5 h-3.5 rounded-full border border-black/20"
                  style={{ backgroundColor: accentColors?.secondary?.hex || '#e3caa5' }}
                  title="Secondary Accent"
                />
              </div>

              <button
                type="button"
                onClick={() => setIsCustomizerOpen(true)}
                className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold shadow transition-all flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Palette className="w-4 h-4" /> Open Customizer
              </button>
            </div>
          </div>

          <ThemeCustomizerDrawer isOpen={isCustomizerOpen} onClose={() => setIsCustomizerOpen(false)} />
        </VintagePaper>

        {/* --- ACCESSIBILITY & TEXT-TO-SPEECH --- */}
        <VintagePaper className="border-t-4 border-t-amber-700">
          <div className="flex items-center gap-3 mb-4">
            <Volume2 className="w-7 h-7 text-amber-700" />
            <h2 className="text-2xl font-bold font-playfair text-neutral-800 dark:text-neutral-100">
              Accessibility & Text-to-Speech
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-300 font-semibold">
                Default Voice Reading Speed
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Select your preferred playback rate (0.5x, 1x, 1.25x, 1.5x) when listening to study notes and flashcards.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {[0.5, 1, 1.25, 1.5].map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => handleTtsSpeedChange(speed)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    ttsSpeed === speed
                      ? 'bg-amber-700 text-white shadow-md'
                      : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-600'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </VintagePaper>
        {/* --- BADGE GALLERY --- */}
        <VintagePaper className="border-t-4 border-t-amber-700">
          <div className="flex items-center gap-3 mb-3">
            <Award className="w-7 h-7 text-amber-700" />
            <h2 className="text-2xl font-bold font-playfair text-neutral-800 dark:text-neutral-100">
              Badge Gallery
            </h2>
          </div>

          <p className="text-neutral-600 dark:text-neutral-300 mb-6 leading-relaxed">
            Track your milestones and study achievements. Keep up the great work!
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {BADGE_LIST.map((badgeConfig) => {
              const Icon = BADGE_ICONS[badgeConfig.icon] || Award;
              const earnedRecord = user?.achievements?.find((a) => a.badgeId === badgeConfig.id);
              const isEarned = !!earnedRecord;

              return (
                <div
                  key={badgeConfig.id}
                  className={`p-4 border rounded-sm flex flex-col items-center text-center transition-all ${
                    isEarned
                      ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700/50 shadow-sm'
                      : 'bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-700 opacity-60 grayscale'
                  }`}
                >
                  <div
                    className={`p-3 rounded-full mb-3 ${
                      isEarned
                        ? 'bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200'
                        : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'
                    }`}
                  >
                    <Icon className="w-8 h-8" />
                  </div>
                  <h3 className="font-playfair font-bold text-sm text-neutral-800 dark:text-neutral-200 mb-1">
                    {badgeConfig.name}
                  </h3>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2 leading-tight">
                    {badgeConfig.description}
                  </p>
                  {isEarned && (
                    <span className="text-[10px] font-semibold tracking-wider uppercase text-amber-700 dark:text-amber-400">
                      Earned{' '}
                      {new Date(
                        earnedRecord.earnedAt || earnedRecord.createdAt
                      ).toLocaleDateString()}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </VintagePaper>
        {/* --- LEADERBOARD PRIVACY --- */}
        <VintagePaper className="border-t-4 border-t-amber-700">
          <div className="flex items-center gap-3 mb-3">
            <ShieldCheck className="w-7 h-7 text-amber-700" />
            <h2 className="text-2xl font-bold font-playfair text-neutral-800 dark:text-neutral-100">
              Leaderboard Privacy
            </h2>
          </div>

          <p className="text-neutral-600 dark:text-neutral-300 mb-6 leading-relaxed">
            The weekly study leaderboard ranks students by focus hours, quizzes completed and
            flashcards reviewed. You can choose whether your real name is shown to other students or
            replaced with an anonymous handle.
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-neutral-100/60 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-600 rounded-sm">
            <div className="flex items-start gap-3">
              {leaderboardVisible ? (
                <Eye className="w-5 h-5 mt-0.5 text-green-700 dark:text-green-400 shrink-0" />
              ) : (
                <EyeOff className="w-5 h-5 mt-0.5 text-red-700 dark:text-red-400 shrink-0" />
              )}
              <div>
                <p className="font-playfair font-bold text-lg text-neutral-800 dark:text-neutral-100">
                  {leaderboardVisible ? 'Public Leaderboard Name' : 'Anonymous Student'}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5">
                  {leaderboardVisible
                    ? 'Other students will see your real name on the leaderboard.'
                    : 'Other students will see "Anonymous Student" instead of your name.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={leaderboardVisible}
              aria-label="Show my real name on the weekly leaderboard"
              onClick={handleToggle}
              disabled={saving}
              className="relative inline-flex items-center h-8 w-14 rounded-full bg-neutral-300 dark:bg-neutral-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 disabled:opacity-50 shrink-0"
            >
              <span
                className={`inline-block w-6 h-6 rounded-full bg-white shadow transform transition-transform ${
                  leaderboardVisible ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {saving && (
            <p className="mt-4 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
              <Loader2 className="w-4 h-4 animate-spin" /> Saving preference...
            </p>
          )}
          {!saving && saved && (
            <p className="mt-4 text-sm text-green-700 dark:text-green-400" role="status">
              Preferences saved successfully.
            </p>
          )}
          {!saving && error && (
            <p className="mt-4 text-sm text-red-700 dark:text-red-400" role="alert">
              {error}
            </p>
          )}
        </VintagePaper>
        {/* --- STUDY SQUAD ACTIVITY PRIVACY --- */}
        <VintagePaper className="border-t-4 border-t-amber-700">
          <div className="flex items-center gap-3 mb-3">
            <Users className="w-7 h-7 text-amber-700" />
            <h2 className="text-2xl font-bold font-playfair text-neutral-800 dark:text-neutral-100">
              Study Squad Activity Privacy
            </h2>
          </div>

          <p className="text-neutral-600 dark:text-neutral-300 mb-6 leading-relaxed">
            Your study squads see a shared activity feed of quiz completions, streak milestones and
            unlocked badges. You can hide your own activity from every squad feed if you'd rather
            keep your study progress private.
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-neutral-100/60 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-600 rounded-sm">
            <div className="flex items-start gap-3">
              {hideActivityFromSquad ? (
                <EyeOff className="w-5 h-5 mt-0.5 text-red-700 dark:text-red-400 shrink-0" />
              ) : (
                <Eye className="w-5 h-5 mt-0.5 text-green-700 dark:text-green-400 shrink-0" />
              )}
              <div>
                <p className="font-playfair font-bold text-lg text-neutral-800 dark:text-neutral-100">
                  {hideActivityFromSquad ? 'Hidden From Squad Feeds' : 'Visible In Squad Feeds'}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5">
                  {hideActivityFromSquad
                    ? 'Your quiz, streak and badge milestones will not appear in any squad activity feed.'
                    : "Your quiz, streak and badge milestones will appear in your squads' activity feeds."}
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={!hideActivityFromSquad}
              aria-label="Show my study milestones in squad activity feeds"
              onClick={handleActivityPrivacyToggle}
              disabled={savingActivityPrivacy}
              className="relative inline-flex items-center h-8 w-14 rounded-full bg-neutral-300 dark:bg-neutral-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 disabled:opacity-50 shrink-0"
            >
              <span
                className={`inline-block w-6 h-6 rounded-full bg-white shadow transform transition-transform ${
                  !hideActivityFromSquad ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </VintagePaper>
        {/* --- PUSH NOTIFICATIONS --- */}{' '}
        <VintagePaper className="border-t-4 border-t-amber-700">
          <div className="flex items-center gap-3 mb-3">
            <Bell className="w-7 h-7 text-amber-700" />
            <h2 className="text-2xl font-bold font-playfair text-neutral-800 dark:text-neutral-100">
              Daily Study Reminders
            </h2>
          </div>

          <p className="text-neutral-600 dark:text-neutral-300 mb-6 leading-relaxed">
            Enable web push notifications to get daily reminders for your study goals. Set your
            preferred time below.
          </p>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-neutral-100/60 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-600 rounded-sm">
              <div>
                <p className="font-playfair font-bold text-lg text-neutral-800 dark:text-neutral-100">
                  Push Notifications
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5">
                  {pushStatus === 'denied'
                    ? 'Notifications are blocked by your browser.'
                    : pushSubscribed
                      ? 'Notifications are enabled.'
                      : 'You are not subscribed to notifications.'}
                </p>
              </div>

              {pushSubscribed ? (
                <button
                  type="button"
                  onClick={handleDisablePush}
                  disabled={pushLoading}
                  className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 border border-red-200 rounded-sm text-sm font-semibold shadow transition-all disabled:opacity-50"
                >
                  {pushLoading ? 'Disabling...' : 'Disable'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleEnablePush}
                  disabled={pushLoading || pushStatus === 'denied'}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-yellow-400 border border-yellow-700/50 rounded-sm text-sm font-semibold shadow transition-all disabled:opacity-50"
                >
                  {pushLoading ? 'Enabling...' : 'Enable Push Notifications'}
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-neutral-100/60 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-600 rounded-sm">
              <div>
                <p className="font-playfair font-bold text-lg text-neutral-800 dark:text-neutral-100">
                  Reminder Time
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5">
                  When would you like to be reminded to study?
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={handleSaveReminderTime}
                  disabled={saving}
                  className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-sm text-sm font-semibold shadow transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Time'}
                </button>
              </div>
            </div>
          </div>
        </VintagePaper>

        {/* --- TWO-WAY CALENDAR SYNCHRONIZATION HUB --- */}
        <VintagePaper className="border-t-4 border-t-indigo-600">
          <TwoWayCalendarSyncManager />
        </VintagePaper>

        {/* --- DAILY MICRO-LEARNING SETTINGS --- */}
        <MicroLearningSettings />



        {/* --- PROGRESS BADGES & ACHIEVEMENTS --- */}
        <VintagePaper className="border-t-4 border-t-amber-600">
          <div className="flex items-center gap-3 mb-2">
            <Award className="w-7 h-7 text-amber-600" />
            <div>
              <h2 className="text-2xl font-bold font-playfair text-neutral-800 dark:text-neutral-100">
                Progress Badges & Achievements
              </h2>
              <p className="text-xs text-neutral-500 italic">
                Track your study milestones, streaks, and gamified achievements in real time.
              </p>
            </div>
          </div>
          <BadgeCarousel userId={user?.id} />
        </VintagePaper>

        {/* --- GOOGLE CALENDAR SYNC --- */}
        <VintagePaper className="border-t-4 border-t-amber-700">
          <div className="flex items-center gap-3 mb-3">
            <CalendarDays className="w-7 h-7 text-amber-700" />
            <h2 className="text-2xl font-bold font-playfair text-neutral-800 dark:text-neutral-100">
              Google Calendar Sync
            </h2>
          </div>

          <p className="text-neutral-600 dark:text-neutral-300 mb-6 leading-relaxed">
            Automatically synchronize study plans and task updates to your Google Calendar in the background.
          </p>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-neutral-100/60 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-600 rounded-sm">
              <div>
                <p className="font-playfair font-bold text-lg text-neutral-800 dark:text-neutral-100">
                  Background Calendar Sync
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5">
                  {syncGoogleCalendar ? 'Automatic background syncing is enabled.' : 'Background syncing is disabled.'}
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={syncGoogleCalendar}
                aria-label="Toggle background Google Calendar sync"
                onClick={handleCalendarSyncToggle}
                disabled={savingCalendarSync}
                className="relative inline-flex items-center h-8 w-14 rounded-full bg-neutral-300 dark:bg-neutral-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 disabled:opacity-50 shrink-0"
              >
                <span
                  className={`inline-block w-6 h-6 rounded-full bg-white shadow transform transition-transform ${
                    syncGoogleCalendar ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </VintagePaper>
      </div>
    </LeatherBoard>
  );
};

export default Settings;
