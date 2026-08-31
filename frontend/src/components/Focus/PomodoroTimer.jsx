/**
 * @fileoverview Adaptive Pomodoro timer with Lofi Focus Backgrounds, Web Audio Binaural Beats, and AI recommendation logic.
 */
import React, { useState, useEffect, useRef } from 'react';
import LofiFocusBackground, { LOFI_THEMES } from '../timer/LofiFocusBackground';
import AmbientAudioPlayer from '../timer/AmbientAudioPlayer';
import { getAdaptiveFocusRecommendation } from '../../services/api';
import { Sparkles, Palette, Play, Pause, RotateCcw } from 'lucide-react';

const PomodoroTimer = ({ onSessionComplete }) => {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState('work'); // 'work' | 'shortBreak' | 'longBreak'
  const [customWorkTime, setCustomWorkTime] = useState(25);
  const [lofiTheme, setLofiTheme] = useState('midnight');
  const [adaptiveRec, setAdaptiveRec] = useState(null);
  const [showThemePicker, setShowThemePicker] = useState(false);

  const timerRef = useRef(null);

  const modes = {
    work: customWorkTime * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60,
  };

  useEffect(() => {
    getAdaptiveFocusRecommendation()
      .then((res) => {
        if (res.data && res.data.success) {
          setAdaptiveRec(res.data.data);
          if (res.data.data.recommendedFocusMinutes) {
            setCustomWorkTime(res.data.data.recommendedFocusMinutes);
            setTimeLeft(res.data.data.recommendedFocusMinutes * 60);
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      clearInterval(timerRef.current);
      setIsActive(false);
      handleTimerComplete();
    }
    return () => clearInterval(timerRef.current);
  }, [isActive, timeLeft]);

  const handleTimerComplete = () => {
    if (Notification.permission === 'granted') {
      new Notification('Focus Session Complete!', {
        body: mode === 'work' ? 'Time for a break!' : 'Time to return to focus!',
      });
    }

    if (mode === 'work' && onSessionComplete) {
      onSessionComplete(customWorkTime);
    }
  };

  const toggleTimer = () => {
    if (!isActive && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(modes[mode]);
  };

  const changeMode = (newMode) => {
    setMode(newMode);
    setIsActive(false);
    setTimeLeft(modes[newMode]);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((modes[mode] - timeLeft) / modes[mode]) * 100;

  return (
    <LofiFocusBackground themeId={lofiTheme} className="max-w-lg mx-auto text-center space-y-6">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-stone-100 font-playfair tracking-wide">
            Adaptive Focus Timer
          </span>
        </div>

        <button
          onClick={() => setShowThemePicker(!showThemePicker)}
          className="p-1.5 rounded-xl bg-neutral-900/80 border border-neutral-800 text-stone-400 hover:text-stone-200 transition flex items-center gap-1.5 text-xs font-semibold"
        >
          <Palette className="w-4 h-4 text-indigo-400" />
          <span>Lofi Themes</span>
        </button>
      </div>

      {/* Theme Picker Dropdown */}
      {showThemePicker && (
        <div className="p-3 bg-neutral-950/90 border border-neutral-800 rounded-2xl space-y-2 text-left animate-fade-in">
          <div className="text-[11px] font-bold text-stone-400 font-mono uppercase tracking-wider">Select Lofi Atmosphere</div>
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

      {/* Adaptive Recommendation Banner */}
      {adaptiveRec && (
        <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs text-left flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-300">Adaptive AI Recommendation ({adaptiveRec.focusState}):</span> {adaptiveRec.advice}
          </div>
        </div>
      )}

      {/* Mode Switcher */}
      <div className="flex justify-center gap-2">
        {Object.keys(modes).map((m) => (
          <button
            key={m}
            onClick={() => changeMode(m)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
              mode === m
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 shadow-md font-bold'
                : 'bg-neutral-900/80 text-stone-400 hover:text-stone-200 border border-neutral-800'
            }`}
          >
            {m.replace(/([A-Z])/g, ' $1').trim()}
          </button>
        ))}
      </div>

      {/* Circular Progress Viewport */}
      <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="128" cy="128" r="110" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-neutral-800" />
          <circle
            cx="128"
            cy="128"
            r="110"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={2 * Math.PI * 110}
            strokeDashoffset={2 * Math.PI * 110 * (1 - progress / 100)}
            strokeLinecap="round"
            className={`transition-all duration-1000 ease-linear ${mode === 'work' ? 'text-amber-400' : 'text-emerald-400'}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-1">
          <span className="text-5xl font-black font-mono text-stone-100 tracking-tight">
            {formatTime(timeLeft)}
          </span>
          <span className="text-xs font-extrabold text-stone-400 uppercase tracking-widest mt-1">
            {isActive ? 'Flow Active' : 'Paused'}
          </span>
        </div>
      </div>

      {/* Timer Controls */}
      <div className="flex justify-center gap-3">
        <button
          onClick={toggleTimer}
          className={`px-8 py-3 rounded-2xl font-black text-sm shadow-xl transition-all flex items-center gap-2 ${
            isActive ? 'bg-amber-500 hover:bg-amber-400 text-stone-950' : 'bg-indigo-600 hover:bg-indigo-500 text-white'
          }`}
        >
          {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          <span>{isActive ? 'Pause' : 'Start Focus'}</span>
        </button>

        <button
          onClick={resetTimer}
          className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-stone-400 hover:text-stone-200 transition"
          title="Reset Timer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Brain-Wave Ambient Audio Synthesizer */}
      <AmbientAudioPlayer isPlaying={isActive} className="mt-4" />
    </LofiFocusBackground>
  );
};

export default PomodoroTimer;
