import React, { useEffect, useState } from 'react';
import { LineChart as ChartIcon } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { getDeckRetentionCurve } from '../../services/api';

const DANGER_FALLBACK = 70;

/**
 * Forecast / what-if layer on top of the retention decay curves: shows the
 * 30 day retention of one deck, a 70% danger line, a time slider and a
 * review-today vs review-later toggle.
 */
const ForgettingCurveSimulator = ({ deckId, deckName = 'this deck' }) => {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [scenario, setScenario] = useState('today');
  const [day, setDay] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getDeckRetentionCurve(deckId, 3)
      .then((res) => {
        if (cancelled) return;
        setData(res.data.data);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [deckId]);

  if (status === 'loading') {
    return <div className="text-stone-400 text-sm p-6">Loading forecast...</div>;
  }
  if (status === 'error' || !data) {
    return (
      <div className="text-rose-400 text-sm p-6">Could not load the forecast for {deckName}.</div>
    );
  }

  const danger = data.dangerThreshold ?? DANGER_FALLBACK;
  const { whatIf, vulnerability } = data;
  const delayDays = whatIf.daysDelay;
  const chartData = data.forecast.map((point, i) => ({
    day: point.day,
    noReview: point.retentionPercent,
    scenario:
      scenario === 'today'
        ? whatIf.reviewToday[i].retentionPercent
        : whatIf.delayed[i].retentionPercent,
  }));
  const atDay = chartData[day];

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-5">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
        <div>
          <h3 className="text-stone-100 font-extrabold text-base flex items-center gap-2">
            <ChartIcon className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            Forgetting Curve Simulator
          </h3>
          <p className="text-stone-400 text-xs mt-0.5">
            30 day retention forecast for {deckName}, based on each card&apos;s SM-2 stability
          </p>
        </div>
        <div className="bg-neutral-950/80 border border-neutral-800 px-4 py-2 rounded-2xl">
          <div className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
            48h vulnerability
          </div>
          <div
            className="text-lg font-black font-mono text-stone-100"
            data-testid="vulnerability-score"
          >
            {vulnerability.score}%
          </div>
          <div className="text-[10px] text-stone-500">
            {vulnerability.atRiskCount} of {vulnerability.totalCards} cards drop under {danger}%
          </div>
        </div>
      </div>

      <div className="flex gap-2" role="group" aria-label="Review scenario">
        <button
          type="button"
          aria-pressed={scenario === 'today'}
          onClick={() => setScenario('today')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
            scenario === 'today'
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              : 'border-neutral-700 text-stone-400'
          }`}
        >
          Review today
        </button>
        <button
          type="button"
          aria-pressed={scenario === 'delayed'}
          onClick={() => setScenario('delayed')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
            scenario === 'delayed'
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
              : 'border-neutral-700 text-stone-400'
          }`}
        >
          Review in {delayDays} days
        </button>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
            <XAxis dataKey="day" stroke="#737373" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} stroke="#737373" tick={{ fontSize: 11 }} unit="%" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#171717',
                borderColor: '#262626',
                fontSize: '12px',
              }}
              labelFormatter={(d) => `Day ${d}`}
              formatter={(value) => `${value}%`}
            />
            <ReferenceLine
              y={danger}
              stroke="#f43f5e"
              strokeDasharray="5 4"
              label={{
                value: `${danger}% danger`,
                fill: '#f43f5e',
                fontSize: 10,
                position: 'insideBottomRight',
              }}
            />
            <ReferenceLine x={day} stroke="#a3a3a3" strokeDasharray="2 3" />
            <Line
              type="monotone"
              dataKey="noReview"
              name="No review"
              stroke="#737373"
              strokeDasharray="4 3"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="scenario"
              name={scenario === 'today' ? 'Review today' : `Review in ${delayDays} days`}
              stroke={scenario === 'today' ? '#10b981' : '#f59e0b'}
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div>
        <label htmlFor="forecast-day" className="text-xs text-stone-300 font-semibold">
          Day {day}: <span data-testid="slider-readout">{atDay.scenario}%</span> retained
          {atDay.scenario < danger && <span className="text-rose-400"> (below {danger}%)</span>}
        </label>
        <input
          id="forecast-day"
          type="range"
          min={0}
          max={chartData.length - 1}
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
          className="w-full mt-2 accent-emerald-500"
        />
      </div>

      <p className="text-xs text-stone-400" data-testid="whatif-summary">
        Waiting {delayDays} days instead of reviewing today costs about{' '}
        {whatIf.retentionLostByDelaying} points of average retention while you wait, and{' '}
        {whatIf.cardsBelowDangerBeforeReview} of {vulnerability.totalCards} cards would be under{' '}
        {danger}% by then.
      </p>
    </div>
  );
};

export default ForgettingCurveSimulator;
