/**
 * @fileoverview Lofi Focus Background Visualizer Engine.
 * Renders animated ambient backgrounds (Midnight Lofi City, Rain Window, Zen Garden, Cyberpunk, Sunset)
 * for the Adaptive Pomodoro Timer viewport.
 */
import React from 'react';
import PropTypes from 'prop-types';

export const LOFI_THEMES = [
  { id: 'midnight', name: 'Midnight Lofi City', icon: '🌃', bgClass: 'from-slate-950 via-indigo-950 to-neutral-950' },
  { id: 'rain-window', name: 'Cozy Rain Window', icon: '🌧️', bgClass: 'from-slate-900 via-sky-950 to-slate-950' },
  { id: 'zen-garden', name: 'Zen Garden', icon: '🎋', bgClass: 'from-emerald-950 via-teal-950 to-neutral-950' },
  { id: 'cyberpunk', name: 'Cyberpunk Study Pod', icon: '🌆', bgClass: 'from-purple-950 via-fuchsia-950 to-neutral-950' },
  { id: 'sunset', name: 'Minimalist Sunset', icon: '🌅', bgClass: 'from-amber-950 via-rose-950 to-neutral-950' },
];

const LofiFocusBackground = ({ themeId = 'midnight', children, className = '' }) => {
  const currentTheme = LOFI_THEMES.find((t) => t.id === themeId) || LOFI_THEMES[0];

  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${currentTheme.bgClass} p-6 border border-neutral-800/80 shadow-2xl transition-all duration-700 ${className}`}>
      {/* Background Animated Layer Effects */}
      {themeId === 'midnight' && (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-10 left-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 right-10 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
          {/* Subtle neon dots */}
          <div className="absolute top-1/4 left-1/3 w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping opacity-60" />
          <div className="absolute bottom-1/3 right-1/4 w-2 h-2 bg-pink-400 rounded-full animate-ping opacity-50" />
        </div>
      )}

      {themeId === 'rain-window' && (
        <div className="pointer-events-none absolute inset-0 bg-slate-950/40 backdrop-blur-sm">
          <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-20" />
          <div className="absolute top-0 right-1/4 w-32 h-64 bg-sky-500/10 blur-2xl animate-pulse" />
        </div>
      )}

      {themeId === 'zen-garden' && (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-5 right-5 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-5 left-5 w-40 h-40 bg-teal-500/10 rounded-full blur-3xl animate-pulse" />
        </div>
      )}

      {themeId === 'cyberpunk' && (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/2 left-10 w-64 h-64 bg-fuchsia-600/15 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 right-10 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl animate-pulse" />
        </div>
      )}

      {themeId === 'sunset' && (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
        </div>
      )}

      {/* Content Container */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

LofiFocusBackground.propTypes = {
  themeId: PropTypes.string,
  children: PropTypes.node,
  className: PropTypes.string,
};

export default LofiFocusBackground;
