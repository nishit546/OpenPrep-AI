import { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { Mic, MicOff, Volume2 } from 'lucide-react';

const STORAGE_ENABLED = 'openprep_voice_coach_enabled';
const STORAGE_VOICE = 'openprep_voice_coach_voice';
const STORAGE_RATE = 'openprep_voice_coach_rate';

const DEFAULT_RATE = 1;
const RATE_OPTIONS = [0.7, 1, 1.25, 1.5];

const supportsSpeech = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window;

const getSavedVoice = () => {
  try {
    return localStorage.getItem(STORAGE_VOICE) || '';
  } catch (_e) {
    return '';
  }
};

const getSavedRate = () => {
  try {
    const v = parseFloat(localStorage.getItem(STORAGE_RATE));
    return Number.isFinite(v) && v >= 0.5 && v <= 2 ? v : DEFAULT_RATE;
  } catch (_e) {
    return DEFAULT_RATE;
  }
};

const getSavedEnabled = () => {
  try {
    return localStorage.getItem(STORAGE_ENABLED) !== 'false';
  } catch (_e) {
    return true;
  }
};

/**
 * PomodoroVoiceCoach — Web Speech API voice coach for Pomodoro intervals.
 * Announces focus/break reminders with selectable voice accent and speed.
 * Persists preferences in localStorage and pauses on tab mute.
 */
const PomodoroVoiceCoach = ({ announcement, className = '' }) => {
  const [isEnabled, setIsEnabled] = useState(() => getSavedEnabled());
  const [voices, setVoices] = useState([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState(() => getSavedVoice());
  const [rate, setRate] = useState(() => getSavedRate());

  const announcementRef = useRef(announcement);

  // Load available voices
  useEffect(() => {
    if (!supportsSpeech()) return;

    const loadVoices = () => {
      const list = window.speechSynthesis.getVoices();
      if (list.length > 0) setVoices(list);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Persist preferences
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ENABLED, String(isEnabled));
    } catch (_e) { /* ignore */ }
  }, [isEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_VOICE, selectedVoiceURI);
    } catch (_e) { /* ignore */ }
  }, [selectedVoiceURI]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_RATE, String(rate));
    } catch (_e) { /* ignore */ }
  }, [rate]);

  // Pause speech when tab hidden/muted
  useEffect(() => {
    if (!supportsSpeech()) return;
    const handleVisibility = () => {
      if (document.hidden) window.speechSynthesis.cancel();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Cancel on unmount
  useEffect(() => {
    return () => {
      if (supportsSpeech()) window.speechSynthesis.cancel();
    };
  }, []);

  const speak = useCallback(
    (text) => {
      if (!supportsSpeech() || !isEnabled || !text) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = voices.find((v) => v.voiceURI === selectedVoiceURI);
      if (voice) utterance.voice = voice;
      utterance.rate = rate;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    },
    [isEnabled, voices, selectedVoiceURI, rate]
  );

  // Auto-announce when prop changes
  useEffect(() => {
    if (announcement && announcement !== announcementRef.current) {
      announcementRef.current = announcement;
      speak(announcement);
    }
  }, [announcement, speak]);

  const toggleEnabled = () => {
    if (isEnabled) window.speechSynthesis.cancel();
    setIsEnabled((v) => !v);
  };

  if (!supportsSpeech()) {
    return (
      <div className={`rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 ${className}`}>
        Voice coach not supported in this browser.
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-neutral-200 bg-white p-4 shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            {isEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-neutral-900">Voice Coach</h4>
            <p className="text-xs text-neutral-500">Gentle interval reminders</p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isEnabled}
          aria-label="Toggle voice coach"
          onClick={toggleEnabled}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isEnabled ? 'bg-amber-500' : 'bg-neutral-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              isEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Voice selector */}
      <div className="mb-3">
        <label htmlFor="voice-select" className="mb-1 block text-xs font-medium text-neutral-700">
          Voice accent
        </label>
        <select
          id="voice-select"
          value={selectedVoiceURI}
          onChange={(e) => setSelectedVoiceURI(e.target.value)}
          disabled={!isEnabled}
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
        >
          <option value="">System default</option>
          {voices.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {v.name} ({v.lang})
            </option>
          ))}
        </select>
      </div>

      {/* Speed control */}
      <div className="mb-3">
        <label className="mb-1 flex items-center gap-1 text-xs font-medium text-neutral-700">
          <Volume2 className="h-3 w-3" /> Speed: {rate.toFixed(2)}x
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.25"
            value={rate}
            onChange={(e) => setRate(parseFloat(e.target.value))}
            disabled={!isEnabled}
            aria-label="Voice speed"
            className="h-2 flex-1 appearance-none rounded-lg bg-neutral-200 accent-amber-500 disabled:opacity-50"
          />
          <div className="flex gap-1">
            {RATE_OPTIONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRate(r)}
                disabled={!isEnabled}
                aria-label={`Set speed ${r}x`}
                className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                  rate === r
                    ? 'bg-amber-500 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                } disabled:opacity-50`}
              >
                {r}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview */}
      <button
        type="button"
        onClick={() => speak('Great focus session! Take a 5-minute stretch.')}
        disabled={!isEnabled}
        className="w-full rounded-lg bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        Preview voice
      </button>

      <p aria-live="polite" className="sr-only">
        {isEnabled ? 'Voice coach enabled' : 'Voice coach disabled'}
      </p>
    </div>
  );
};

PomodoroVoiceCoach.propTypes = {
  announcement: PropTypes.string,
  className: PropTypes.string,
};

export default PomodoroVoiceCoach;
