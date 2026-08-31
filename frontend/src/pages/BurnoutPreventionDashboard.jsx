import React, { useState, useEffect, useCallback } from 'react';
import burnoutApi from '../services/burnoutApi';
import BurnoutRiskGauge from '../components/burnout/BurnoutRiskGauge';
import StressLevelCard from '../components/burnout/StressLevelCard';

/**
 * BurnoutPreventionDashboard — comprehensive burnout monitoring page.
 * Allows users to submit self-reported assessments, view their risk
 * score, track trends, and receive personalised recommendations.
 */
export default function BurnoutPreventionDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [dailyCheckin, setDailyCheckin] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState(null);

  // Assessment form state
  const [form, setForm] = useState({
    stressLevel: 5,
    studyHoursLast24h: 4,
    sleepQuality: 6,
    motivationLevel: 6,
    fatigueLevel: 5,
    socialIsolationDays: 0,
    notes: '',
  });

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [dashRes, recsRes, checkinRes, histRes] = await Promise.all([
        burnoutApi.getDashboard(),
        burnoutApi.getRecommendations(),
        burnoutApi.getDailyCheckin(),
        burnoutApi.getAssessmentHistory({ page: 1, limit: 10 }),
      ]);
      setDashboard(dashRes.data.data);
      setRecommendations(recsRes.data.data);
      setDailyCheckin(checkinRes.data.data);
      setHistory(histRes.data.data);
      setError(null);
    } catch (err) {
      console.error('Failed to load burnout dashboard:', err);
      setError('Unable to load dashboard data. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: Number(value) }));
  };

  const handleTextChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await burnoutApi.submitAssessment(form);
      await loadDashboard();
    } catch (err) {
      console.error('Failed to submit assessment:', err);
      setError('Failed to submit assessment. Please check your inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'assess', label: 'Check-In' },
    { id: 'history', label: 'History' },
  ];

  if (loading && !dashboard) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-400">Loading burnout dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white px-4 py-8 md:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-1">🧠 Burnout Prevention</h1>
          <p className="text-neutral-400 text-sm">
            Monitor your well-being, detect early warning signs, and get personalised recovery guidance.
          </p>
        </header>

        {error && (
          <div className="bg-red-900/30 border border-red-700/50 text-red-300 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Tabs */}
        <nav className="flex gap-1 mb-6 bg-neutral-900 rounded-lg p-1 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-amber-600 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* ═══ OVERVIEW TAB ═══ */}
        {activeTab === 'overview' && dashboard && (
          <div className="space-y-6">
            {/* Risk Gauge + Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col items-center justify-center">
                <BurnoutRiskGauge
                  score={dashboard.currentRisk?.score ?? 0}
                  size={220}
                />
                <p className="text-xs text-neutral-500 mt-3 text-center max-w-xs">
                  {dashboard.riskLevelDescription}
                </p>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
                <h2 className="text-lg font-semibold">At a Glance</h2>
                <div className="grid grid-cols-2 gap-3">
                  <StatBox
                    label="Wellness Score"
                    value={
                      dashboard.wellnessScore !== null
                        ? `${dashboard.wellnessScore}%`
                        : 'N/A'
                    }
                    color={
                      dashboard.wellnessScore >= 70
                        ? '#22c55e'
                        : dashboard.wellnessScore >= 40
                        ? '#eab308'
                        : '#ef4444'
                    }
                  />
                  <StatBox
                    label="30-Day Avg Risk"
                    value={
                      dashboard.trend.averageScore30d > 0
                        ? `${dashboard.trend.averageScore30d}`
                        : 'N/A'
                    }
                    color="#f59e0b"
                  />
                  <StatBox
                    label="Trend"
                    value={
                      dashboard.trend.direction === 'improving'
                        ? '↓ Improving'
                        : dashboard.trend.direction === 'worsening'
                        ? '↑ Worsening'
                        : '→ Stable'
                    }
                    color={
                      dashboard.trend.direction === 'improving'
                        ? '#22c55e'
                        : dashboard.trend.direction === 'worsening'
                        ? '#ef4444'
                        : '#9ca3af'
                    }
                  />
                  <StatBox
                    label="Assessments"
                    value={`${dashboard.totalAssessments}`}
                    color="#9ca3af"
                  />
                </div>
              </div>
            </div>

            {/* Weekly Risk Sparkline */}
            {dashboard.weeklyRiskScores.length > 0 && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-4">7-Day Risk Trend</h2>
                <div className="flex items-end gap-1 h-24">
                  {dashboard.weeklyRiskScores.map((score, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t transition-all duration-300"
                      style={{
                        height: `${Math.max(4, (score / 100) * 100)}%`,
                        backgroundColor:
                          score >= 75
                            ? '#ef4444'
                            : score >= 55
                            ? '#f97316'
                            : score >= 35
                            ? '#eab308'
                            : '#22c55e',
                        opacity: 0.85,
                      }}
                      title={`Day ${i + 1}: ${score}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {recommendations?.hasAssessment && recommendations.recommendations?.length > 0 && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-4">Personalised Recommendations</h2>
                <div className="space-y-3">
                  {recommendations.recommendations.map((rec, i) => (
                    <RecommendationCard key={i} recommendation={rec} />
                  ))}
                </div>
              </div>
            )}

            {/* Daily Check-In Prompt */}
            {dailyCheckin && !dailyCheckin.alreadyAssessedToday && (
              <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-700/40 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">☀️</span>
                  <div>
                    <h3 className="font-semibold text-amber-300">Daily Check-In</h3>
                    <p className="text-sm text-neutral-300 mt-1">{dailyCheckin.prompt}</p>
                    <button
                      onClick={() => setActiveTab('assess')}
                      className="mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Start Check-In
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ ASSESSMENT / CHECK-IN TAB ═══ */}
        {activeTab === 'assess' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
              <h2 className="text-lg font-semibold">How Are You Feeling?</h2>
              <p className="text-sm text-neutral-400">
                Rate each factor honestly — this helps us give you the most accurate guidance.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SliderField
                  label="Stress Level"
                  icon="😰"
                  value={form.stressLevel}
                  onChange={(v) => handleFormChange('stressLevel', v)}
                  inverted={false}
                />
                <SliderField
                  label="Study Hours (last 24h)"
                  icon="📚"
                  value={form.studyHoursLast24h}
                  onChange={(v) => handleFormChange('studyHoursLast24h', v)}
                  max={16}
                  inverted={true}
                />
                <SliderField
                  label="Sleep Quality"
                  icon="😴"
                  value={form.sleepQuality}
                  onChange={(v) => handleFormChange('sleepQuality', v)}
                  inverted={true}
                />
                <SliderField
                  label="Motivation Level"
                  icon="🔥"
                  value={form.motivationLevel}
                  onChange={(v) => handleFormChange('motivationLevel', v)}
                  inverted={true}
                />
                <SliderField
                  label="Fatigue Level"
                  icon="🥱"
                  value={form.fatigueLevel}
                  onChange={(v) => handleFormChange('fatigueLevel', v)}
                  inverted={false}
                />
                <SliderField
                  label="Days Without Social Contact"
                  icon="👤"
                  value={form.socialIsolationDays}
                  onChange={(v) => handleFormChange('socialIsolationDays', v)}
                  max={14}
                  inverted={true}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => handleTextChange('notes', e.target.value)}
                  placeholder="Anything else on your mind? This is just for you."
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 resize-none"
                  rows={3}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full md:w-auto px-8 py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-neutral-700 disabled:text-neutral-500 text-white font-semibold rounded-xl transition-colors"
            >
              {submitting ? 'Submitting…' : 'Submit Assessment'}
            </button>
          </form>
        )}

        {/* ═══ HISTORY TAB ═══ */}
        {activeTab === 'history' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">Assessment History</h2>
            {history.length === 0 ? (
              <p className="text-neutral-400 text-sm">
                No assessments yet. Complete your first check-in to start tracking your burnout risk.
              </p>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <HistoryRow key={item.id} assessment={item} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────── */

function StatBox({ label, value, color = '#9ca3af' }) {
  return (
    <div className="bg-neutral-800/50 rounded-lg p-3 text-center">
      <p className="text-xs text-neutral-400 mb-1">{label}</p>
      <p className="text-lg font-bold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function SliderField({ label, icon, value, onChange, min = 1, max = 10, inverted = false }) {
  let barColor = '#22c55e';
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
    <div className="bg-neutral-800/50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-neutral-300 flex items-center gap-1.5">
          <span>{icon}</span> {label}
        </span>
        <span className="text-sm font-bold" style={{ color: barColor }}>
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${barColor} 0%, ${barColor} ${((value - min) / (max - min)) * 100}%, #374151 ${((value - min) / (max - min)) * 100}%, #374151 100%)`,
        }}
      />
    </div>
  );
}

function RecommendationCard({ recommendation }) {
  const priorityColors = {
    critical: { bg: 'bg-red-900/30', border: 'border-red-700/40', text: 'text-red-300' },
    high: { bg: 'bg-orange-900/30', border: 'border-orange-700/40', text: 'text-orange-300' },
    moderate: { bg: 'bg-yellow-900/30', border: 'border-yellow-700/40', text: 'text-yellow-300' },
    low: { bg: 'bg-neutral-800/50', border: 'border-neutral-700/40', text: 'text-neutral-300' },
  };
  const colors = priorityColors[recommendation.priority] || priorityColors.low;

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-xl p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium uppercase ${colors.text}`}>
              {recommendation.priority}
            </span>
          </div>
          <h3 className="font-semibold text-white text-sm">{recommendation.title}</h3>
          <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
            {recommendation.description}
          </p>
        </div>
        {recommendation.actionLabel && (
          <button className="shrink-0 px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-xs font-medium text-white rounded-lg transition-colors">
            {recommendation.actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function HistoryRow({ assessment }) {
  const date = new Date(assessment.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const categoryColors = {
    low: '#22c55e',
    moderate: '#eab308',
    elevated: '#f97316',
    high: '#ef4444',
    critical: '#dc2626',
  };

  const color = categoryColors[assessment.riskCategory] || '#9ca3af';

  return (
    <div className="flex items-center gap-4 p-3 bg-neutral-800/40 rounded-lg">
      <div className="w-12 text-center">
        <span className="text-lg font-bold" style={{ color }}>
          {Math.round(assessment.riskScore)}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full capitalize"
            style={{ backgroundColor: `${color}22`, color }}
          >
            {assessment.riskCategory}
          </span>
          <span className="text-xs text-neutral-500">{date}</span>
        </div>
        {assessment.notes && (
          <p className="text-xs text-neutral-500 mt-1 truncate">
            📝 {assessment.notes}
          </p>
        )}
      </div>
      <div className="text-right text-xs text-neutral-500 shrink-0">
        <div>Stress: {assessment.stressLevel}/10</div>
        <div>Sleep: {assessment.sleepQuality}/10</div>
      </div>
    </div>
  );
}
