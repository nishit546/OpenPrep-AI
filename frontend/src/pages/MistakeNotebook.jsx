import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  AlertTriangle, 
  BrainCircuit, 
  RotateCcw, 
  CheckCircle, 
  Clock, 
  TrendingDown, 
  HelpCircle, 
  Filter, 
  Tag, 
  ChevronRight, 
  Sparkles,
  Award,
  Layers,
  ArrowRight
} from 'lucide-react';
import { mistakeNotebookApi } from '../services/mistakeNotebookApi';

const ROOT_CAUSE_META = {
  conceptual: { label: 'Conceptual Gap', color: 'bg-red-500/10 text-red-500 border-red-500/20', remedy: 'Re-study core topic theory' },
  application: { label: 'Application Failure', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20', remedy: 'Practice varied question formats' },
  careless: { label: 'Careless Slip', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', remedy: 'Implement step verification routine' },
  misread: { label: 'Stem / Qualifier Misread', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20', remedy: 'Active-reading: highlight "NOT/EXCEPT"' },
  time_pressure: { label: 'Time Pressure / Rushed', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', remedy: 'Timed pacing drills' },
  guessed: { label: 'Pure Guess', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20', remedy: 'Foundational review before testing' },
  knowledge_gap: { label: 'Fact / Formula Gap', color: 'bg-teal-500/10 text-teal-500 border-teal-500/20', remedy: 'Targeted flashcard & formula drills' },
  unclassified: { label: 'Needs Triage', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20', remedy: 'Classify root cause to unlock insights' },
};

export default function MistakeNotebook() {
  const [activeTab, setActiveTab] = useState('notebook'); // 'notebook' | 'analytics' | 'drill'
  
  // Data States
  const [mistakes, setMistakes] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('open');
  const [filterCause, setFilterCause] = useState('all');

  // Redo Drill States
  const [drill, setDrill] = useState(null);
  const [drillIndex, setDrillIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [drillFeedback, setDrillFeedback] = useState(null);
  const [drillLoading, setDrillLoading] = useState(false);

  // Triage / Edit State
  const [triageItem, setTriageItem] = useState(null);
  const [triageCause, setTriageCause] = useState('careless');
  const [triageNotes, setTriageNotes] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [entriesRes, analyticsRes] = await Promise.all([
        mistakeNotebookApi.getMistakeEntries({
          status: filterStatus === 'all' ? undefined : filterStatus,
          rootCause: filterCause === 'all' ? undefined : filterCause,
        }),
        mistakeNotebookApi.getMistakeAnalytics(),
      ]);

      setMistakes(entriesRes?.data || []);
      setAnalytics(analyticsRes?.data || null);
    } catch (err) {
      console.error('Failed to load mistake notebook:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterStatus, filterCause]);

  const handleSaveTriage = async () => {
    if (!triageItem) return;
    try {
      await mistakeNotebookApi.classifyMistake(triageItem.id, {
        rootCause: triageCause,
        notes: triageNotes,
      });
      setTriageItem(null);
      loadData();
    } catch (err) {
      console.error('Failed to update classification:', err);
    }
  };

  const handleStartDrill = async () => {
    setDrillLoading(true);
    try {
      const res = await mistakeNotebookApi.generateRedoDrill({ limit: 10, minSpacingHours: 0 });
      setDrill(res?.data || null);
      setDrillIndex(0);
      setSelectedOption(null);
      setDrillFeedback(null);
      setActiveTab('drill');
    } catch (err) {
      console.error('Failed to start redo drill:', err);
    } finally {
      setDrillLoading(false);
    }
  };

  const handleSubmitDrillAnswer = async () => {
    if (!drill || !drill.items || drillIndex >= drill.items.length || selectedOption === null) return;
    const currentMistake = drill.items[drillIndex];

    try {
      const result = await mistakeNotebookApi.submitRedoAttempt(currentMistake.id, {
        selectedAnswer: selectedOption,
      });
      setDrillFeedback(result.data);
    } catch (err) {
      console.error('Failed to submit drill answer:', err);
    }
  };

  const handleNextDrillQuestion = () => {
    setSelectedOption(null);
    setDrillFeedback(null);
    setDrillIndex((prev) => prev + 1);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 text-gray-100 min-h-screen">
      {/* Top Header & Metrics Banner */}
      <div className="bg-gray-900/80 backdrop-blur-md border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-700 flex items-center justify-center text-white shadow-lg shadow-red-500/20">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              Mistake Notebook
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-mono">
                Error Taxonomy & Drills
              </span>
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Root-cause analysis and spaced redo practice for every incorrect quiz response.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('notebook')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'notebook' ? 'bg-primary text-white shadow-md' : 'bg-gray-800/80 text-gray-400 hover:text-white'
            }`}
          >
            Mistakes Queue ({analytics?.openCount ?? 0})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'analytics' ? 'bg-primary text-white shadow-md' : 'bg-gray-800/80 text-gray-400 hover:text-white'
            }`}
          >
            Taxonomy Analytics
          </button>
          <button
            onClick={handleStartDrill}
            disabled={drillLoading || (analytics?.openCount ?? 0) === 0}
            className="px-4 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${drillLoading ? 'animate-spin' : ''}`} />
            <span>Start Redo Drill</span>
          </button>
        </div>
      </div>

      {/* Recurrence Warning Strip */}
      {analytics?.recurrenceWarnings && analytics.recurrenceWarnings.length > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3 text-xs text-amber-300">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold uppercase tracking-wider text-[10px] text-amber-400 block">
              High Recurrence Pattern Detected
            </span>
            <p>{analytics.recurrenceWarnings[0].warningMessage}</p>
          </div>
        </div>
      )}

      {/* TAB 1: MISTAKE QUEUE */}
      {activeTab === 'notebook' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-900/60 p-4 rounded-xl border border-gray-800">
            <div className="flex items-center gap-2 text-xs">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400 font-semibold">Filter:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-2.5 py-1 text-xs outline-none"
              >
                <option value="open">Open Mistakes</option>
                <option value="resolved">Resolved</option>
                <option value="all">All Statuses</option>
              </select>

              <select
                value={filterCause}
                onChange={(e) => setFilterCause(e.target.value)}
                className="bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-2.5 py-1 text-xs outline-none"
              >
                <option value="all">All Root Causes</option>
                {Object.entries(ROOT_CAUSE_META).map(([code, meta]) => (
                  <option key={code} value={code}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs text-gray-400">
              Showing <span className="text-white font-bold">{mistakes.length}</span> recorded items
            </div>
          </div>

          {/* Mistakes Cards Grid */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-500 border-t-transparent"></div>
              <p className="text-xs text-gray-400">Loading mistake notebook records...</p>
            </div>
          ) : mistakes.length === 0 ? (
            <div className="text-center py-20 bg-gray-900/40 rounded-2xl border border-gray-800 p-8 space-y-3">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-white">No mistakes in this filter</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                Great work! When you get answers wrong during practice quizzes, they will be auto-categorized here with tailored remedies.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mistakes.map((item) => {
                const meta = ROOT_CAUSE_META[item.rootCause] || ROOT_CAUSE_META.unclassified;
                return (
                  <div
                    key={item.id}
                    className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5 shadow-sm hover:border-gray-700 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${meta.color}`}>
                          {meta.label}
                        </span>
                        {item.recurrenceCount > 1 && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            Occurred {item.recurrenceCount}x
                          </span>
                        )}
                      </div>

                      <h4 className="font-semibold text-sm text-gray-100 line-clamp-2">
                        {item.questionText}
                      </h4>

                      <div className="text-[11px] text-gray-400 space-y-1">
                        <p>
                          <span className="text-gray-500">Subject:</span> {item.subjectRef?.name || 'General'}{' '}
                          {item.topicRef ? `• ${item.topicRef.name}` : ''}
                        </p>
                        <p className="text-emerald-400/90">
                          <span className="text-gray-500">Remedy:</span> {meta.remedy}
                        </p>
                        {item.notes && (
                          <p className="italic text-gray-300 bg-gray-800/40 p-2 rounded-lg border border-gray-800">
                            "{item.notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-800 flex items-center justify-between text-xs">
                      <span className={`font-semibold text-[11px] ${item.status === 'resolved' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        ● {item.status.toUpperCase()}
                      </span>
                      <button
                        onClick={() => {
                          setTriageItem(item);
                          setTriageCause(item.rootCause || 'careless');
                          setTriageNotes(item.notes || '');
                        }}
                        className="text-primary hover:text-blue-400 font-bold transition-colors cursor-pointer"
                      >
                        Triage / Edit &rarr;
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ROOT CAUSE TAXONOMY ANALYTICS */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-5 space-y-1">
              <span className="text-xs text-gray-400 block font-semibold">Total Logged Mistakes</span>
              <span className="text-2xl font-black text-white">{analytics.totalMistakes}</span>
              <span className="text-[11px] text-gray-500 block">Historical error footprint</span>
            </div>

            <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-5 space-y-1">
              <span className="text-xs text-gray-400 block font-semibold">Open Mistakes</span>
              <span className="text-2xl font-black text-rose-500">{analytics.openCount}</span>
              <span className="text-[11px] text-gray-500 block">Pending mastery drill</span>
            </div>

            <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-5 space-y-1">
              <span className="text-xs text-gray-400 block font-semibold">Resolution Rate</span>
              <span className="text-2xl font-black text-emerald-400">{analytics.resolutionRate}%</span>
              <span className="text-[11px] text-gray-500 block">Correctly redone</span>
            </div>
          </div>

          {/* Root-Cause Breakdown Distribution */}
          <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-primary" />
              Root-Cause Distribution & Cost Analysis
            </h3>
            <p className="text-xs text-gray-400">
              Breakdown of why marks were lost across your quiz attempts.
            </p>

            <div className="space-y-3 pt-2">
              {Object.entries(analytics.rootCauseDistribution || {}).map(([cause, data]) => {
                const meta = ROOT_CAUSE_META[cause] || ROOT_CAUSE_META.unclassified;
                const cost = analytics.costAnalysis?.[cause]?.marksLost || 0;
                return (
                  <div key={cause} className="p-3.5 bg-gray-800/40 rounded-xl border border-gray-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-200">{meta.label}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400">{data.count} items ({data.percentage}%)</span>
                        <span className="font-mono text-rose-400 font-bold">-{cost} marks</span>
                      </div>
                    </div>

                    <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-red-500 to-rose-600 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, data.percentage)}%` }}
                      ></div>
                    </div>

                    <p className="text-[11px] text-gray-400">{meta.remedy}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: REDO DRILL ARENA */}
      {activeTab === 'drill' && drill && (
        <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-6 max-w-3xl mx-auto">
          {drillIndex < (drill.items?.length || 0) ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                <span className="text-xs font-mono text-gray-400">
                  Redo Drill Question {drillIndex + 1} of {drill.items.length}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  Prioritized by Spacing & Recurrence
                </span>
              </div>

              {/* Question Body */}
              <div className="space-y-3">
                <h3 className="text-base md:text-lg font-bold text-white">
                  {drill.items[drillIndex].questionText}
                </h3>
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                {(drill.items[drillIndex].options || []).map((opt, optIdx) => {
                  const isSelected = selectedOption === optIdx;
                  let optStyle = 'bg-gray-800/60 border-gray-700 hover:border-gray-500 text-gray-200';
                  if (isSelected) {
                    optStyle = 'bg-primary/20 border-primary text-white font-semibold';
                  }
                  if (drillFeedback) {
                    if (optIdx === drillFeedback.correctAnswer) {
                      optStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-200 font-semibold';
                    } else if (isSelected && !drillFeedback.isCorrect) {
                      optStyle = 'bg-rose-500/20 border-rose-500 text-rose-200 font-semibold';
                    }
                  }

                  return (
                    <button
                      key={optIdx}
                      disabled={Boolean(drillFeedback)}
                      onClick={() => setSelectedOption(optIdx)}
                      className={`w-full text-left p-3.5 rounded-xl border text-xs md:text-sm transition-all cursor-pointer ${optStyle}`}
                    >
                      <span className="font-mono mr-2 text-gray-400">{String.fromCharCode(65 + optIdx)}.</span>
                      {opt}
                    </button>
                  );
                })}
              </div>

              {/* Feedback Strip */}
              {drillFeedback && (
                <div
                  className={`p-4 rounded-xl border text-xs space-y-1 ${
                    drillFeedback.isCorrect
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                  }`}
                >
                  <p className="font-bold">
                    {drillFeedback.isCorrect ? '✅ Excellent! Mistake Resolved.' : '❌ Incorrect. Recurrence incremented.'}
                  </p>
                  {drillFeedback.explanation && (
                    <p className="text-gray-300 pt-1">{drillFeedback.explanation}</p>
                  )}
                </div>
              )}

              {/* Drill Action Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                {!drillFeedback ? (
                  <button
                    onClick={handleSubmitDrillAnswer}
                    disabled={selectedOption === null}
                    className="px-5 py-2 bg-primary hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    Confirm Answer
                  </button>
                ) : (
                  <button
                    onClick={handleNextDrillQuestion}
                    className="px-5 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Next Question</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 space-y-4">
              <Award className="w-12 h-12 text-emerald-400 mx-auto" />
              <h3 className="text-lg font-bold text-white">Redo Drill Completed!</h3>
              <p className="text-xs text-gray-400">
                You've worked through your high-priority spaced mistakes.
              </p>
              <button
                onClick={() => {
                  setActiveTab('notebook');
                  loadData();
                }}
                className="px-5 py-2 bg-primary text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Return to Notebook
              </button>
            </div>
          )}
        </div>
      )}

      {/* TRIAGE MODAL */}
      {triageItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-white">Classify Root Cause</h3>
            <p className="text-xs text-gray-400 line-clamp-2">{triageItem.questionText}</p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-400 font-semibold mb-1">Select Root Cause:</label>
                <select
                  value={triageCause}
                  onChange={(e) => setTriageCause(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-xl p-2.5 outline-none"
                >
                  {Object.entries(ROOT_CAUSE_META).map(([code, meta]) => (
                    <option key={code} value={code}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Personal Note / Reflection:</label>
                <textarea
                  rows={3}
                  value={triageNotes}
                  onChange={(e) => setTriageNotes(e.target.value)}
                  placeholder="e.g. Mixed up sign in step 3, slow down on algebra..."
                  className="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-xl p-2.5 outline-none"
                ></textarea>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setTriageItem(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTriage}
                className="px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                Save Classification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
