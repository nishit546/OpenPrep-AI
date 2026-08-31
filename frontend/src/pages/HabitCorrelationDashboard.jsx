import { useHabitCorrelation } from '../hooks/useHabitCorrelation';

/**
 * HabitCorrelationDashboard — visualizes correlations between study habits
 * and performance outcomes. Shows time-of-day, day-of-week, session length,
 * and other habit dimensions with their impact on quiz scores.
 */
export default function HabitCorrelationDashboard() {
  const { summary, byHour, byDay, schedule, loading, error, refresh } = useHabitCorrelation();

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-400">Analyzing your study habits…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-sm font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white px-4 py-8 md:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-1">📊 Study Habit Insights</h1>
          <p className="text-neutral-400 text-sm">
            Discover which habits correlate with your best performance.
          </p>
        </header>

        {/* Not enough data state */}
        {summary && !summary.hasEnoughData && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center mb-8">
            <p className="text-neutral-300 text-lg mb-2">📈 Not Enough Data Yet</p>
            <p className="text-neutral-500 text-sm">{summary.message}</p>
            <p className="text-neutral-600 text-xs mt-4">
              Habit observations are automatically recorded when you complete quizzes and flashcard sessions.
            </p>
          </div>
        )}

        {/* Overall Insights */}
        {summary?.overallInsights?.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Key Insights</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {summary.overallInsights.map((insight, i) => (
                <div
                  key={i}
                  className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex items-start gap-3"
                >
                  <span className="text-xl shrink-0">{insight.icon}</span>
                  <p className="text-sm text-neutral-300 leading-relaxed">{insight.text}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Correlation Cards */}
        {summary?.correlations?.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Habit Correlations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {summary.correlations.map((corr, i) => (
                <CorrelationCard key={i} correlation={corr} />
              ))}
            </div>
          </section>
        )}

        {/* Performance by Hour Chart */}
        {byHour.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Performance by Hour of Day</h2>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
              <div className="flex items-end gap-1 h-40">
                {byHour.map((h) => {
                  const maxScore = Math.max(...byHour.map((x) => x.avgScore), 1);
                  const heightPct = (h.avgScore / maxScore) * 100;
                  return (
                    <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-neutral-500">{h.avgScore}%</span>
                      <div
                        className="w-full rounded-t transition-all duration-300"
                        style={{
                          height: `${Math.max(4, heightPct)}%`,
                          backgroundColor: h.avgScore >= 70 ? '#22c55e' : h.avgScore >= 50 ? '#eab308' : '#ef4444',
                          opacity: 0.8,
                        }}
                        title={`${h.hour}:00 — Avg: ${h.avgScore}% (${h.sessionCount} sessions)`}
                      />
                      <span className="text-[10px] text-neutral-500">
                        {h.hour % 3 === 0 ? `${h.hour}h` : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-neutral-600 mt-2 px-1">
                <span>12 AM</span>
                <span>6 AM</span>
                <span>12 PM</span>
                <span>6 PM</span>
                <span>11 PM</span>
              </div>
            </div>
          </section>
        )}

        {/* Performance by Day */}
        {byDay.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Performance by Day of Week</h2>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
              <div className="grid grid-cols-7 gap-2">
                {byDay.map((d) => (
                  <div key={d.dayOfWeek} className="text-center">
                    <span className="text-xs text-neutral-500 block mb-2">{d.dayName.slice(0, 3)}</span>
                    <div
                      className="w-full aspect-square rounded-xl flex items-center justify-center text-sm font-bold"
                      style={{
                        backgroundColor:
                          d.avgScore >= 70
                            ? 'rgba(34,197,94,0.2)'
                            : d.avgScore >= 50
                            ? 'rgba(234,179,8,0.2)'
                            : 'rgba(239,68,68,0.2)',
                        color:
                          d.avgScore >= 70 ? '#22c55e' : d.avgScore >= 50 ? '#eab308' : '#ef4444',
                      }}
                    >
                      {d.avgScore > 0 ? `${d.avgScore}%` : '—'}
                    </div>
                    <span className="text-[10px] text-neutral-600 mt-1 block">
                      {d.sessionCount} sessions
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Optimal Schedule */}
        {schedule && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4">🎯 Recommended Schedule</h2>
            <div className="bg-gradient-to-br from-amber-900/30 to-neutral-900 border border-amber-700/30 rounded-2xl p-6">
              {!schedule.hasEnoughData ? (
                <p className="text-neutral-400 text-sm">{schedule.recommendation}</p>
              ) : (
                <>
                  <p className="text-neutral-200 text-sm leading-relaxed mb-4">
                    {schedule.recommendation}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {schedule.bestHours.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">
                          Best Hours
                        </h3>
                        <div className="space-y-2">
                          {schedule.bestHours.map((h, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between bg-neutral-800/50 rounded-lg px-3 py-2"
                            >
                              <span className="text-sm text-neutral-300">{h.label}</span>
                              <span className="text-xs text-amber-400 font-medium">
                                {h.avgScore}% avg
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {schedule.bestDays.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">
                          Best Days
                        </h3>
                        <div className="space-y-2">
                          {schedule.bestDays.map((d, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between bg-neutral-800/50 rounded-lg px-3 py-2"
                            >
                              <span className="text-sm text-neutral-300">{d.dayName}</span>
                              <span className="text-xs text-amber-400 font-medium">
                                {d.avgScore}% avg
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {/* Data Stats */}
        {summary?.hasEnoughData && (
          <section className="mb-8">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-3">Data Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatBox label="Total Sessions" value={summary.totalObservations} />
                <StatBox label="Correlations Found" value={summary.correlations?.length || 0} />
                <StatBox label="Strong Effects" value={summary.correlations?.filter((c) => c.strength === 'strong').length || 0} />
                <StatBox label="Date Range" value={`${summary.dateRange?.from || '—'} → ${summary.dateRange?.to || '—'}`} />
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────

function CorrelationCard({ correlation }) {
  const strengthColors = {
    strong: { bg: 'bg-green-900/30', border: 'border-green-700/40', badge: 'text-green-400' },
    moderate: { bg: 'bg-yellow-900/30', border: 'border-yellow-700/40', badge: 'text-yellow-400' },
    weak: { bg: 'bg-neutral-800/50', border: 'border-neutral-700/40', badge: 'text-neutral-400' },
  };
  const colors = strengthColors[correlation.strength] || strengthColors.weak;
  const isPositive = correlation.scoreDelta > 0;

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-xl p-5`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{correlation.icon}</span>
          <h3 className="text-sm font-semibold text-white">{correlation.title}</h3>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.badge} bg-neutral-900/50`}>
          {correlation.strength}
        </span>
      </div>

      <p className="text-xs text-neutral-400 leading-relaxed mb-3">{correlation.detail}</p>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Best</p>
          <p className="text-sm font-medium text-green-400">
            {correlation.bestPeriod} — {correlation.bestAvgScore}%
          </p>
        </div>
        <div className="text-neutral-600">→</div>
        <div className="flex-1">
          <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Worst</p>
          <p className="text-sm font-medium text-red-400">
            {correlation.worstPeriod} — {correlation.worstAvgScore}%
          </p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-neutral-700/30">
        <p className={`text-xs font-medium ${isPositive ? 'text-green-400' : 'text-neutral-400'}`}>
          {isPositive ? '↑' : '→'} {Math.abs(correlation.scoreDelta)}% score difference
        </p>
      </div>
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="bg-neutral-800/50 rounded-lg p-3 text-center">
      <p className="text-xs text-neutral-500 mb-1">{label}</p>
      <p className="text-lg font-bold text-white">{value}</p>
    </div>
  );
}
