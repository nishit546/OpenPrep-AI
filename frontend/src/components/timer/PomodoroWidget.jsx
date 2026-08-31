import React, { useEffect, useRef, useState } from 'react';
import { usePomodoro, MODES } from '../../context/PomodoroContext';
import AmbientAudioPlayer from './AmbientAudioPlayer';
import TimerSettingsModal from './TimerSettingsModal';
import LofiFocusBackground, { LOFI_THEMES } from './LofiFocusBackground';
import { getAdaptiveFocusRecommendation, logFocusSession } from '../../services/api';
import { playTimerCompleteSound } from '../../utils/audio';
import { Sparkles, Play, Pause, RotateCcw, SkipForward, Settings, ChevronDown, ChevronUp, Brain, Palette } from 'lucide-react';

const MODE_LABELS = {
  [MODES.WORK]: 'Focus',
  [MODES.SHORT_BREAK]: 'Short Break',
  [MODES.LONG_BREAK]: 'Long Break',
};

const MODE_COLORS = {
  [MODES.WORK]: { stroke: '#f59e0b', text: 'text-amber-400' },
  [MODES.SHORT_BREAK]: { stroke: '#10b981', text: 'text-emerald-400' },
  [MODES.LONG_BREAK]: { stroke: '#3b82f6', text: 'text-indigo-400' },
};

const PROGRESS_RADIUS = 54;
const PROGRESS_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RADIUS;

const PomodoroWidget = ({ subjectId = null, className = '' }) => {
  const {
    mode, timeLeft, totalTime, isActive, cyclesCompleted,
    totalSessions, formattedTime, settings,
    start, pause, reset, skipBreak, completeSession,
  } = usePomodoro();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [lofiTheme, setLofiTheme] = useState('midnight');
  const [adaptiveRec, setAdaptiveRec] = useState(null);
  const [showThemePicker, setShowThemePicker] = useState(false);

  const hasLoggedRef = useRef(false);

  const progress = totalTime > 0 ? (totalTime - timeLeft) / totalTime : 0;
  const strokeDashoffset = PROGRESS_CIRCUMFERENCE * (1 - progress);

  const modeColor = MODE_COLORS[mode] || MODE_COLORS[MODES.WORK];

  // Fetch Adaptive Recommendation on Mount
  useEffect(() => {
    getAdaptiveFocusRecommendation()
      .then((res) => {
        if (res.data && res.data.success) {
          setAdaptiveRec(res.data.data);
        }
      })
      .catch(() => {});
  }, []);

  // Session completion logging
  useEffect(() => {
    if (timeLeft === 0 && !isActive && !hasLoggedRef.current) {
      hasLoggedRef.current = true;
      setJustCompleted(true);
      setTimeout(() => setJustCompleted(false), 3000);

      playTimerCompleteSound();

      if (mode === MODES.WORK) {
        logFocusSession({
          durationMinutes: Math.round(totalTime / 60) || 25,
          mode: 'work',
          taskType: subjectId ? 'subject_study' : 'general',
          ambientAudio: 'binaural_alpha',
        }).catch(() => {});
      }
    }

    if (timeLeft > 0) {
      hasLoggedRef.current = false;
    }
  }, [timeLeft, isActive, mode, totalTime, subjectId]);

  return (
    <LofiFocusBackground themeId={lofiTheme} className={`w-full max-w-md mx-auto ${className}`}>
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-amber-400" />
          <span className="font-extrabold text-sm text-stone-100 font-playfair tracking-wide">
            Adaptive Focus Timer
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowThemePicker(!showThemePicker)}
            className="p-1.5 rounded-xl bg-neutral-900/80 border border-neutral-800 text-stone-400 hover:text-stone-200 transition"
            title="Switch Lofi Background Theme"
          >
            <Palette className="w-4 h-4 text-indigo-400" />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-1.5 rounded-xl bg-neutral-900/80 border border-neutral-800 text-stone-400 hover:text-stone-200 transition"
            title="Timer Settings"
          >
            <Settings className="w-4 h-4 text-stone-400" />
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-xl bg-neutral-900/80 border border-neutral-800 text-stone-400 hover:text-stone-200 transition"
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Theme Picker Dropdown */}
      {showThemePicker && (
        <div className="mb-4 p-3 bg-neutral-950/90 border border-neutral-800 rounded-2xl space-y-2 animate-fade-in">
          <div className="text-[11px] font-bold text-stone-400 font-mono uppercase tracking-wider">Select Lofi Background</div>
          <div className="grid grid-cols-2 gap-1.5">
            {LOFI_THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => {
                  setLofiTheme(theme.id);
                  setShowThemePicker(false);
                }}
                className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold transition ${
                  lofiTheme === theme.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-neutral-900 text-stone-400 hover:text-stone-200'
                }`}
              >
                <span>{theme.icon}</span>
                <span className="truncate">{theme.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Adaptive AI Recommendation Banner */}
      {adaptiveRec && !isCollapsed && (
        <div className="mb-4 p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-300">Adaptive Rec ({adaptiveRec.focusState}):</span> {adaptiveRec.advice}
          </div>
        </div>
      )}

      {/* Collapsed View */}
      {isCollapsed ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`text-xl font-bold font-mono ${modeColor.text}`}>{formattedTime}</span>
            <span className="text-xs text-stone-400 font-medium">{MODE_LABELS[mode]}</span>
          </div>
          <button
            onClick={isActive ? pause : start}
            className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md"
          >
            {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </div>
      ) : (
        /* Full Timer View */
        <div className="space-y-6 text-center">
          {/* Progress Ring & Countdown */}
          <div className="relative w-44 h-44 mx-auto flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="88"
                cy="88"
                r={PROGRESS_RADIUS}
                className="stroke-neutral-800 fill-none"
                strokeWidth="8"
              />
              <circle
                cx="88"
                cy="88"
                r={PROGRESS_RADIUS}
                className="fill-none transition-all duration-1000 ease-linear"
                stroke={modeColor.stroke}
                strokeWidth="8"
                strokeDasharray={PROGRESS_CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-1">
              <span className={`text-3xl font-black font-mono tracking-tight ${modeColor.text}`}>
                {formattedTime}
              </span>
              <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">
                {MODE_LABELS[mode]}
              </span>
              <span className="text-[10px] text-stone-500 font-mono">
                Cycle #{cyclesCompleted + 1}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={reset}
              className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-stone-400 hover:text-stone-200 transition"
              title="Reset Timer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={isActive ? pause : start}
              className={`px-8 py-3 rounded-2xl font-black text-sm flex items-center gap-2 shadow-xl transition-all ${
                isActive
                  ? 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {isActive ? (
                <>
                  <Pause className="w-4 h-4" /> Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> Start Focus
                </>
              )}
            </button>

            <button
              onClick={skipBreak}
              className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-stone-400 hover:text-stone-200 transition"
              title="Skip Break"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Brain-Wave Ambient Audio Synthesizer */}
          <AmbientAudioPlayer isPlaying={isActive} className="mt-4" />
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && <TimerSettingsModal onClose={() => setShowSettings(false)} />}
    </LofiFocusBackground>
  );
};

export default PomodoroWidget;
