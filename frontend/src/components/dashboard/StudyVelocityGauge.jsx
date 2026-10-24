import React, { useEffect, useState } from 'react';
import API from '../../services/api';
import StudyVelocityMeter from './StudyVelocityMeter';

const RISK_STYLES = {
  low: { label: 'Low burnout risk', color: 'text-emerald-400', bar: 'bg-emerald-500', border: 'border-emerald-500/20' },
  moderate: { label: 'Moderate burnout risk', color: 'text-amber-400', bar: 'bg-amber-500', border: 'border-amber-500/20' },
  high: { label: 'High burnout risk', color: 'text-rose-400', bar: 'bg-rose-500', border: 'border-rose-500/20' },
};

export function StudyVelocityGaugeView({ metrics }) {
  const risk = RISK_STYLES[metrics.burnoutLevel] || RISK_STYLES.low;
  const score = Math.min(100, Math.max(0, Math.round(metrics.burnoutRisk || 0)));
  const days = metrics.daysRemaining;

  return (
    <div className="study-velocity-gauge space-y-3 max-w-md">
      <div className="flex items-center justify-between gap-3">
        <span
          data-testid="days-remaining-chip"
          className="text-[11px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
        >
          {days} {days === 1 ? 'day' : 'days'} left
        </span>
        <span data-testid="burnout-label" className={`text-[11px] font-bold ${risk.color}`}>
          {risk.label} ({score}/100)
        </span>
      </div>

      <div
        role="progressbar"
        aria-label="Burnout risk"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        className="h-2 w-full rounded-full bg-slate-800 overflow-hidden"
      >
        <div data-testid="burnout-bar" className={`h-full ${risk.bar}`} style={{ width: `${score}%` }} />
      </div>

      <StudyVelocityMeter
        currentVelocity={metrics.currentVelocity}
        requiredVelocity={metrics.requiredVelocity}
        remainingSyllabusHours={metrics.remainingSyllabusHours}
      />

      {metrics.tips?.length > 0 && (
        <ul className={`text-[11px] text-slate-300 space-y-1 p-3 rounded-lg bg-slate-950 border ${risk.border}`}>
          {metrics.tips.map((tip) => (
            <li key={tip}>• {tip}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function StudyVelocityGauge() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await API.get('/study-plans/velocity-metrics');
        if (!cancelled) setMetrics(res.data?.data || null);
      } catch {
        if (!cancelled) setError('Could not load study velocity');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p className="text-xs text-slate-400">Loading study velocity...</p>;
  if (error) return <p role="alert" className="text-xs text-rose-400">{error}</p>;
  if (!metrics) return <p className="text-xs text-slate-400">Create an active study plan to see your pace.</p>;
  return <StudyVelocityGaugeView metrics={metrics} />;
}
