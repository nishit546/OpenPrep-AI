import React, { useState, useEffect } from 'react';

export default function SubjectMasteryRadar() {
  const [radarData, setRadarData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/subject-radar')
      .then(res => res.json())
      .then(result => setRadarData(result.data))
      .catch(err => console.error('Error hydrating radar configurations:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4 text-xs font-mono text-slate-500 anonymity-pulse">Computing multi-axis strength matrices...</div>;
  if (!radarData) return null;

  return (
    <div className="radar-chart-card p-5 bg-slate-900 border border-slate-800 text-white rounded-xl shadow-xl font-sans mt-6">
      <header className="mb-4">
        <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">🕸️ Multi-Subject Accuracy Radar</h3>
        <p className="text-[11px] text-slate-400 mt-0.5">Direct comparison of your testing accuracy profile against topper benchmarks.</p>
      </header>

      <div className="radar-canvas-container min-h-[260px] bg-slate-950 border border-slate-800/80 rounded-lg p-4 space-y-2">
        {radarData.axes.map((axis, idx) => {
          const studentScore = radarData.studentScores[idx];
          const topperScore = radarData.topperScores[idx];
          const variance = studentScore - topperScore;

          return (
            <div key={axis} className="flex justify-between items-center text-xs font-mono border-b border-slate-900/60 pb-1.5">
              <span className="font-sans font-semibold text-slate-300">{axis}</span>
              <div className="flex items-center gap-4 text-[11px]">
                <span className="text-blue-400">You: {studentScore}%</span>
                <span className="text-slate-500">Topper: {topperScore}%</span>
                {variance < -15 ? (
                  <span className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded text-[10px] font-bold animate-pulse">
                    ⚠️ Gap: {variance.toFixed(0)}%
                  </span>
                ) : (
                  <span className="text-emerald-400 text-[10px]">● Optimal</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
