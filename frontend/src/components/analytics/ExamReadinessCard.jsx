import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { FaSync, FaChartLine } from 'react-icons/fa';

const ExamReadinessCard = ({ data, onRecalculate, loading }) => {
  const score = data?.overallReadiness ?? 0;
  const trajectory = data?.trajectory ?? [];
  const forecast = data?.forecast;

  // Determine progress color
  let scoreColor = 'text-rose-500';
  if (score >= 80) {
    scoreColor = 'text-emerald-500';
  } else if (score >= 50) {
    scoreColor = 'text-amber-500';
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-6">
      <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
        <div>
          <h3 className="text-stone-100 font-extrabold font-playfair text-lg">Exam Readiness Index</h3>
          <p className="text-stone-400 text-xs mt-0.5">Composite metric of academic exam preparedness</p>
        </div>
        <button
          onClick={onRecalculate}
          disabled={loading}
          className="p-2.5 bg-neutral-800 hover:bg-neutral-750 disabled:opacity-50 border border-neutral-700 hover:border-neutral-600 rounded-xl text-stone-300 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
          title="Force fresh analytics recalculation"
        >
          <FaSync className={`text-xs ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Recalculating...' : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
        
        {/* Overall score radial gauge indicator representation */}
        <div className="flex flex-col items-center justify-center p-4 bg-stone-950/40 rounded-2xl border border-neutral-850/80 text-center">
          <div className="relative w-24 h-24 flex items-center justify-center rounded-full bg-indigo-500/10 border-4 border-neutral-800 shadow-inner">
            <span className={`text-3xl font-black ${scoreColor}`}>{score}%</span>
          </div>
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-3">Readiness Index</span>
        </div>

        {/* Breakdown details */}
        <div className="sm:col-span-2 space-y-3.5">
          {data?.subjects && data.subjects.length > 0 && (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-semibold text-stone-300 mb-1">
                  <span>Syllabus Coverage</span>
                  <span>{Math.round(data.subjects.reduce((sum, s) => sum + s.breakdown.syllabusCoverage, 0) / data.subjects.length)}%</span>
                </div>
                <div className="w-full bg-stone-950 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${Math.round(data.subjects.reduce((sum, s) => sum + s.breakdown.syllabusCoverage, 0) / data.subjects.length)}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-stone-300 mb-1">
                  <span>Quiz Accuracy</span>
                  <span>{Math.round(data.subjects.reduce((sum, s) => sum + s.breakdown.quizAccuracy, 0) / data.subjects.length)}%</span>
                </div>
                <div className="w-full bg-stone-950 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.round(data.subjects.reduce((sum, s) => sum + s.breakdown.quizAccuracy, 0) / data.subjects.length)}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-stone-300 mb-1">
                  <span>Memory Stability</span>
                  <span>{Math.round(data.subjects.reduce((sum, s) => sum + s.breakdown.memoryRetention, 0) / data.subjects.length)}%</span>
                </div>
                <div className="w-full bg-stone-950 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: `${Math.round(data.subjects.reduce((sum, s) => sum + s.breakdown.memoryRetention, 0) / data.subjects.length)}%` }} />
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Trajectory Forecast Chart */}
      {trajectory.length > 0 && (
        <div className="pt-4 border-t border-neutral-800">
          <h4 className="text-xs font-bold text-stone-300 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <FaChartLine className="text-indigo-400" /> Estimated Readiness Trajectory
          </h4>
          <p className="text-xs text-stone-400 mb-3">
            {forecast?.basis} Confidence: {forecast?.confidence}. This is an estimate, not a guaranteed exam score.
          </p>
          <div className="w-full h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trajectory} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="day" stroke="#737373" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} stroke="#737373" fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const dayData = payload[0].payload;
                      return (
                        <div className="bg-neutral-900 border border-neutral-800 p-2.5 rounded-lg shadow-xl text-[10px] space-y-1">
                          <p className="font-bold text-stone-100">{dayData.date}</p>
                          <p className="text-indigo-400 font-semibold">Estimated readiness: {dayData.score}%</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {forecast?.mode === 'insufficient-data' && (
        <p className="text-xs text-stone-400 border-t border-neutral-800 pt-4" role="status">
          Readiness forecast unavailable: {forecast.reason}
        </p>
      )}
    </div>
  );
};

export default ExamReadinessCard;
