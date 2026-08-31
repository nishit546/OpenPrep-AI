import React from 'react';

/**
 * StressLevelCard — displays a single stress indicator metric with an
 * icon, label, value bar, and optional tooltip message.
 *
 * Props:
 *   icon       – SVG path or emoji to show
 *   label      – metric name (e.g. "Stress Level")
 *   value      – current value (1–10 scale)
 *   maxValue   – maximum for the bar (default 10)
 *   color      – bar colour (default '#f59e0b')
 *   message    – optional descriptive text beneath the bar
 *   inverted   – if true, lower is better (e.g. sleep quality)
 */
export default function StressLevelCard({
  icon = '📊',
  label = 'Metric',
  value = 5,
  maxValue = 10,
  color = '#f59e0b',
  message = '',
  inverted = false,
}) {
  const percentage = Math.min(100, Math.max(0, (value / maxValue) * 100));

  // Determine bar colour dynamically if inverted (low = good, high = bad)
  let barColor = color;
  if (inverted) {
    if (value <= 3) barColor = '#ef4444';
    else if (value <= 5) barColor = '#f97316';
    else if (value <= 7) barColor = '#eab308';
    else barColor = '#22c55e';
  } else {
    if (value >= 8) barColor = '#ef4444';
    else if (value >= 6) barColor = '#f97316';
    else if (value >= 4) barColor = '#eab308';
    else barColor = '#22c55e';
  }

  return (
    <div className="bg-neutral-800/60 border border-neutral-700/50 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-lg" role="img" aria-hidden="true">
          {icon}
        </span>
        <span className="text-sm font-medium text-neutral-300">{label}</span>
        <span className="ml-auto text-sm font-bold" style={{ color: barColor }}>
          {value} / {maxValue}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 rounded-full bg-neutral-700 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%`, backgroundColor: barColor }}
        />
      </div>

      {message && (
        <p className="text-xs text-neutral-400 leading-relaxed mt-1">{message}</p>
      )}
    </div>
  );
}
