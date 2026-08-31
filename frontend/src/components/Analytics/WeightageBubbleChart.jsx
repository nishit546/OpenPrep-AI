import React, { useState, useEffect } from 'react';

export default function WeightageBubbleChart({ subjectId }) {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics/weightage-matrix?subjectId=${subjectId}`)
      .then(res => res.json())
      .then(result => setChartData(result.data || []))
      .catch(err => console.error('Error hydrating bubble plot coordinates:', err))
      .finally(() => setLoading(false));
  }, [subjectId]);

  if (loading) return <div className="p-4 text-xs font-mono text-slate-500 animate-pulse">Mapping high-yield bubble coordinates...</div>;

  return (
    <div className="bubble-chart-card p-5 bg-slate-900 border border-slate-800 text-white rounded-xl shadow-xl font-sans">
      <header className="mb-4">
        <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">🎯 Chapter High-Yield Bubble Spectrum</h3>
        <p className="text-[11px] text-slate-400 mt-0.5">Identify high-ROI targets. Bubbles scale relative to the total question volume in the database.</p>
      </header>

      {/* Numerical Chart Mounting Area Workspace */}
      <div className="chart-canvas-container min-h-[320px] bg-slate-950 border border-slate-800/80 rounded-lg p-4 flex flex-col justify-between">
        <div className="grid grid-cols-2 gap-2 text-center text-[9px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-900 pb-2">
          <span className="text-rose-400/90">🚨 Critical Danger Zone (Low Mastery)</span>
          <span className="text-emerald-400/90">🏆 Mastered High-Yield (Maintain)</span>
        </div>

        <div className="flex flex-wrap gap-2 justify-center p-3">
          {chartData.map((node) => (
            <div
              key={node.topicId}
              style={{ borderColor: node.color }}
              className="text-[10px] px-2.5 py-1 bg-slate-900 border rounded-md font-mono hover:bg-slate-800/50 cursor-help transition-all"
              title={`Exam Weight: ${node.xAxisWeightage}% | Current Mastery: ${node.yAxisMastery}% | Pool: ${node.bubbleSizeRadius} Questions`}
            >
              <span className="font-sans font-semibold text-slate-200 block">{node.topicName}</span>
              <span className="text-slate-400 text-[9px]">W: {node.xAxisWeightage}% | M: {node.yAxisMastery}%</span>
            </div>
          ))}
        </div>

        <div className="text-[9px] font-mono text-slate-600 text-center pt-2 border-t border-slate-900">
          Axis Vectors: X = Exam Weightage (0-20%) | Y = Student Mastery Ratio (0-100%)
        </div>
      </div>
    </div>
  );
}
