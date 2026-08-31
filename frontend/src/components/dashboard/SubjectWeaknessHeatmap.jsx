import React, { useState, useEffect } from 'react';

export default function SubjectWeaknessHeatmap({ subjectId }) {
  const [heatmapData, setHeatmapData] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    // Parallel aggregation pipelines
    fetch(`/api/analytics/weakness-heatmap/${subjectId}`)
      .then(res => res.json())
      .then(data => setHeatmapData(data.heatmapTree || []));

    fetch('/api/analytics/daily-recommendations')
      .then(res => res.json())
      .then(data => setRecommendations(data.recommendations || []));
  }, [subjectId]);

  const startDiagnosticQuiz = () => {
    const weakTopicIds = heatmapData.filter(t => t.masteryScore < 60).map(t => t.id);
    alert(`Launching 10-question target diagnostics for isolated elements: ${weakTopicIds.join(', ')}`);
  };

  const getHeatmapColor = (score) => {
    if (score < 40) return 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20';
    if (score <= 75) return 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20';
    return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20';
  };

  return (
    <div className="p-6 bg-zinc-950 text-white min-h-screen space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">AI Subject Weakness Matrix</h2>
          <p className="text-xs text-zinc-400">Real-time mastery index generated across active syllabus sub-modules.</p>
        </div>
        <button
          onClick={startDiagnosticQuiz}
          className="px-4 py-2 bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-500 hover:to-purple-500 text-xs font-semibold rounded-lg shadow-lg transition-all"
        >
          ⚡ Fix My Weaknesses (Quick Quiz)
        </button>
      </div>

      {/* Daily Recommendation Cards Deck */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {recommendations.map((rec, i) => (
          <div key={i} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
            <span className="text-[10px] font-bold text-purple-400 tracking-wider uppercase block mb-1">Target Priority {i+1}</span>
            <h4 className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors">{rec.title}</h4>
            <p className="text-xs text-zinc-400 mt-1">{rec.description}</p>
          </div>
        ))}
      </div>

      {/* Interactive Visual Grid */}
      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Chapter Proficiency Map</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {heatmapData.map((topic) => (
            <div
              key={topic.id}
              className={`p-3 rounded-lg border transition-all cursor-help relative group ${getHeatmapColor(topic.masteryScore)}`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold truncate max-w-[200px]">{topic.name}</span>
                <span className="text-xs font-mono font-black">{topic.masteryScore}%</span>
              </div>
              
              {/* Context Hover Tooltip Container */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-56 bg-zinc-950 text-zinc-300 text-[10px] p-2 rounded-lg shadow-xl border border-zinc-800 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20 space-y-1">
                <div className="flex justify-between"><span>Quiz Accuracy:</span><span className="font-mono text-white">{topic.accuracy}%</span></div>
                <div className="flex justify-between"><span>Memory Retention:</span><span className="font-mono text-white">{topic.retentionRate}%</span></div>
                <div className="flex justify-between"><span>Last Active Review:</span><span className="font-mono text-white">{topic.daysSinceReview}d ago</span></div>
                <div className="flex justify-between"><span>Exam Weightage:</span><span className="font-mono text-purple-400">{topic.pyqWeight}%</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
