import { useState } from 'react';
import { useStudyTimeBudget } from '../hooks/useStudyTimeBudget';

/**
 * StudyTimeBudgetDashboard — lets students set weekly time budgets per
 * subject, tracks actual study time, and shows efficiency analytics.
 */
export default function StudyTimeBudgetDashboard() {
  const { dashboard, history, loading, error, setBudget, logStudyTime, deleteBudget, cloneToNextWeek, refresh } = useStudyTimeBudget();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showLogForm, setShowLogForm] = useState(null); // subject name
  const [addForm, setAddForm] = useState({ subject: '', plannedMinutes: 60, priority: 3, notes: '' });
  const [logForm, setLogForm] = useState({ minutes: 30 });
  const [submitting, setSubmitting] = useState(false);

  const handleAddBudget = async (e) => {
    e.preventDefault();
    if (!addForm.subject.trim()) return;
    setSubmitting(true);
    try {
      await setBudget({ ...addForm, subject: addForm.subject.trim() });
      setAddForm({ subject: '', plannedMinutes: 60, priority: 3, notes: '' });
      setShowAddForm(false);
    } catch { /* handled by hook */ }
    setSubmitting(false);
  };

  const handleLogTime = async (e) => {
    e.preventDefault();
    if (!showLogForm || logForm.minutes <= 0) return;
    setSubmitting(true);
    try {
      await logStudyTime({ subject: showLogForm, minutes: logForm.minutes });
      setLogForm({ minutes: 30 });
      setShowLogForm(null);
    } catch { /* handled by hook */ }
    setSubmitting(false);
  };

  const handleClone = async () => {
    setSubmitting(true);
    await cloneToNextWeek();
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading budgets…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-3">{error}</p>
          <button onClick={refresh} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm">Retry</button>
        </div>
      </div>
    );
  }

  const d = dashboard || {};
  const subjects = d.subjectStats || [];
  const totalPlanned = d.totalPlanned || 0;
  const totalActual = d.totalActual || 0;
  const overallEff = d.overallEfficiency || 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">⏱️ Time Budget Manager</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Set weekly study time targets per subject and track your efficiency</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleClone} disabled={submitting} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
              📋 Clone to Next Week
            </button>
            <button onClick={() => setShowAddForm(!showAddForm)} className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl shadow-sm transition-colors text-sm">
              + Add Subject Budget
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <SummaryCard icon="🎯" label="Subjects" value={d.budgetCount || 0} color="blue" />
          <SummaryCard icon="📊" label="Total Planned" value={`${totalPlanned} min`} color="amber" />
          <SummaryCard icon="✅" label="Total Actual" value={`${totalActual} min`} color="emerald" />
          <SummaryCard icon="📈" label="Efficiency" value={`${overallEff}%`} color={overallEff >= 80 ? 'emerald' : overallEff >= 50 ? 'amber' : 'red'} />
        </div>

        {/* Add Budget Form */}
        {showAddForm && (
          <form onSubmit={handleAddBudget} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Add Subject Budget</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input placeholder="Subject name" value={addForm.subject} onChange={(e) => setAddForm({ ...addForm, subject: e.target.value })}
                className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm" required />
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Planned minutes/week</label>
                <input type="number" min="0" value={addForm.plannedMinutes} onChange={(e) => setAddForm({ ...addForm, plannedMinutes: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Priority (1-5)</label>
                <select value={addForm.priority} onChange={(e) => setAddForm({ ...addForm, priority: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm">
                  {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <button type="submit" disabled={submitting} className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors">
                  {submitting ? 'Saving…' : 'Save Budget'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Subject Budget Cards */}
        {subjects.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center mb-8">
            <p className="text-4xl mb-3">⏱️</p>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">No budgets set</h3>
            <p className="text-sm text-gray-500 mb-4">Add your first subject budget to start tracking time allocation</p>
            <button onClick={() => setShowAddForm(true)} className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg text-sm">+ Add Budget</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {subjects.map((s) => (
              <SubjectBudgetCard key={s.id} subject={s} onLog={() => setShowLogForm(s.subject)} onDelete={() => deleteBudget(s.id)} />
            ))}
          </div>
        )}

        {/* Log Time Modal */}
        {showLogForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowLogForm(null)}>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Log Study Time</h3>
              <p className="text-xs text-gray-500 mb-4">Subject: <strong>{showLogForm}</strong></p>
              <form onSubmit={handleLogTime}>
                <input type="number" min="1" value={logForm.minutes} onChange={(e) => setLogForm({ minutes: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm mb-4" placeholder="Minutes studied" required />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowLogForm(null)} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded-lg">Cancel</button>
                  <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg disabled:opacity-50">
                    {submitting ? 'Saving…' : 'Log Time'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Efficiency Trend */}
        {history.length > 0 && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">📈 Efficiency Trend (8 Weeks)</h3>
            <div className="flex items-end gap-1 h-32">
              {history.map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-gray-500">{h.efficiency}%</span>
                  <div className="w-full rounded-t transition-all duration-300" style={{
                    height: `${Math.max(4, h.efficiency)}%`,
                    backgroundColor: h.efficiency >= 80 ? '#22c55e' : h.efficiency >= 50 ? '#eab308' : '#ef4444',
                  }} title={`${h.weekKey}: ${h.efficiency}% (${h.subjectCount} subjects)`} />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-2">
              <span>{history[0]?.weekKey}</span>
              <span>{history[history.length - 1]?.weekKey}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────

function SummaryCard({ icon, label, value, color }) {
  const colors = {
    blue: 'bg-blue-100 dark:bg-blue-900/30',
    amber: 'bg-amber-100 dark:bg-amber-900/30',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30',
    red: 'bg-red-100 dark:bg-red-900/30',
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 ${colors[color]} rounded-lg flex items-center justify-center text-lg`}>{icon}</div>
        <div>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

function SubjectBudgetCard({ subject, onLog, onDelete }) {
  const { subject: name, plannedMinutes, actualMinutes, efficiency, overBudget, nearThreshold, remaining, priority, notes } = subject;
  const progressPct = plannedMinutes > 0 ? Math.min(100, (actualMinutes / plannedMinutes) * 100) : (actualMinutes > 0 ? 100 : 0);

  return (
    <div className={`bg-white dark:bg-gray-800 border rounded-xl p-4 transition-all ${
      overBudget ? 'border-red-300 dark:border-red-700' : nearThreshold ? 'border-amber-300 dark:border-amber-700' : 'border-gray-200 dark:border-gray-700'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{name}</h4>
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} className={`w-1.5 h-1.5 rounded-full ${i < priority ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-600'}`} />
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
        <div className={`h-full rounded-full transition-all duration-500 ${
          overBudget ? 'bg-red-500' : nearThreshold ? 'bg-amber-500' : 'bg-blue-500'
        }`} style={{ width: `${progressPct}%` }} />
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
        <span>{actualMinutes} / {plannedMinutes} min</span>
        <span className={`font-medium ${overBudget ? 'text-red-500' : nearThreshold ? 'text-amber-500' : 'text-emerald-500'}`}>
          {efficiency}%
        </span>
      </div>

      {overBudget && <p className="text-[10px] text-red-500 mb-2">⚠️ Over budget by {actualMinutes - plannedMinutes} min</p>}
      {!overBudget && plannedMinutes > 0 && <p className="text-[10px] text-gray-400 mb-2">{remaining} min remaining</p>}
      {notes && <p className="text-[10px] text-gray-400 italic mb-2">📝 {notes}</p>}

      <div className="flex gap-2">
        <button onClick={onLog} className="flex-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded-lg transition-colors">
          + Log Time
        </button>
        <button onClick={onDelete} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 text-xs rounded-lg transition-colors">
          ✕
        </button>
      </div>
    </div>
  );
}
