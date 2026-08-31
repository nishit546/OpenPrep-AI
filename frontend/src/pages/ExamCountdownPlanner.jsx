import { useState, useMemo, useEffect } from 'react';

/* ─────────────────────── MOCK DATA ─────────────────────── */
const EXAMS = [
  { id: 1, name: 'USMLE Step 1', date: '2026-10-15', totalTopics: 42, studiedTopics: 18, studyHours: 120, targetHours: 300, color: '#ef4444', icon: '🩺' },
  { id: 2, name: 'NEET PG', date: '2026-11-20', totalTopics: 38, studiedTopics: 22, studyHours: 160, targetHours: 400, color: '#a855f7', icon: '📋' },
  { id: 3, name: 'AIIMS PG', date: '2026-12-05', totalTopics: 35, studiedTopics: 12, studyHours: 80, targetHours: 250, color: '#3b82f6', icon: '🏥' },
];

const TOPICS = [
  { id: 1, examId: 1, name: 'Cardiovascular System', subject: 'Anatomy', priority: 'high', difficulty: 'hard', totalSubtopics: 12, completedSubtopics: 8, estimatedHours: 18, studiedHours: 14, lastStudied: '2026-08-27', retentionScore: 78 },
  { id: 2, examId: 1, name: 'Respiratory System', subject: 'Physiology', priority: 'high', difficulty: 'medium', totalSubtopics: 8, completedSubtopics: 6, estimatedHours: 12, studiedHours: 10, lastStudied: '2026-08-26', retentionScore: 82 },
  { id: 3, examId: 1, name: 'Pharmacology - CVS', subject: 'Pharmacology', priority: 'critical', difficulty: 'hard', totalSubtopics: 15, completedSubtopics: 5, estimatedHours: 22, studiedHours: 8, lastStudied: '2026-08-20', retentionScore: 55 },
  { id: 4, examId: 1, name: 'Microbiology - Bacteria', subject: 'Microbiology', priority: 'medium', difficulty: 'medium', totalSubtopics: 10, completedSubtopics: 10, estimatedHours: 14, studiedHours: 14, lastStudied: '2026-08-22', retentionScore: 90 },
  { id: 5, examId: 1, name: 'Pathology - Inflammation', subject: 'Pathology', priority: 'high', difficulty: 'hard', totalSubtopics: 11, completedSubtopics: 4, estimatedHours: 16, studiedHours: 6, lastStudied: '2026-08-18', retentionScore: 45 },
  { id: 6, examId: 1, name: 'Biochemistry - Metabolism', subject: 'Biochemistry', priority: 'medium', difficulty: 'medium', totalSubtopics: 9, completedSubtopics: 7, estimatedHours: 10, studiedHours: 8, lastStudied: '2026-08-25', retentionScore: 75 },
  { id: 7, examId: 1, name: 'Neuroanatomy', subject: 'Anatomy', priority: 'low', difficulty: 'hard', totalSubtopics: 14, completedSubtopics: 2, estimatedHours: 20, studiedHours: 4, lastStudied: '2026-08-10', retentionScore: 30 },
  { id: 8, examId: 1, name: 'Immunology', subject: 'Pathology', priority: 'medium', difficulty: 'easy', totalSubtopics: 7, completedSubtopics: 5, estimatedHours: 8, studiedHours: 6, lastStudied: '2026-08-24', retentionScore: 88 },
  { id: 9, examId: 1, name: 'Renal Physiology', subject: 'Physiology', priority: 'high', difficulty: 'medium', totalSubtopics: 9, completedSubtopics: 3, estimatedHours: 12, studiedHours: 4, lastStudied: '2026-08-15', retentionScore: 42 },
  { id: 10, examId: 1, name: 'Gastrointestinal', subject: 'Physiology', priority: 'medium', difficulty: 'medium', totalSubtopics: 8, completedSubtopics: 6, estimatedHours: 10, studiedHours: 8, lastStudied: '2026-08-23', retentionScore: 80 },
  { id: 11, examId: 1, name: 'Pharmacology - CNS', subject: 'Pharmacology', priority: 'critical', difficulty: 'hard', totalSubtopics: 16, completedSubtopics: 3, estimatedHours: 24, studiedHours: 5, lastStudied: '2026-08-12', retentionScore: 35 },
  { id: 12, examId: 1, name: 'Endocrine System', subject: 'Physiology', priority: 'medium', difficulty: 'medium', totalSubtopics: 10, completedSubtopics: 8, estimatedHours: 12, studiedHours: 10, lastStudied: '2026-08-26', retentionScore: 85 },
];

const STUDY_SCHEDULE = [
  { time: '06:00 - 07:30', activity: 'High-yield topic review', topic: 'Pharmacology - CVS', type: 'revision', energy: 'high' },
  { time: '08:00 - 10:00', activity: 'New concept learning', topic: 'Pathology - Inflammation', type: 'learning', energy: 'high' },
  { time: '10:30 - 12:00', activity: 'Practice questions', topic: 'Cardiovascular System', type: 'practice', energy: 'medium' },
  { time: '13:00 - 14:30', activity: 'Flashcard review', topic: 'Microbiology - Bacteria', type: 'revision', energy: 'medium' },
  { time: '15:00 - 16:30', activity: 'Weak area focus', topic: 'Pharmacology - CNS', type: 'learning', energy: 'medium' },
  { time: '17:00 - 18:00', activity: 'Spaced repetition', topic: 'Immunology', type: 'revision', energy: 'low' },
  { time: '19:00 - 20:00', activity: 'Evening review', topic: 'Biochemistry - Metabolism', type: 'revision', energy: 'low' },
  { time: '20:30 - 21:00', activity: 'Daily reflection', topic: 'All topics', type: 'reflection', energy: 'low' },
];

const DAILY_GOALS = [
  { day: 'Mon', target: 8, completed: 7, hours: 7.5 },
  { day: 'Tue', target: 8, completed: 8, hours: 8.2 },
  { day: 'Wed', target: 8, completed: 6, hours: 6.5 },
  { day: 'Thu', target: 8, completed: 8, hours: 8.0 },
  { day: 'Fri', target: 8, completed: 5, hours: 5.5 },
  { day: 'Sat', target: 10, completed: 9, hours: 9.0 },
  { day: 'Sun', target: 6, completed: 6, hours: 6.0 },
];

const STUDY_STREAK = {
  current: 14,
  longest: 28,
  thisMonth: 22,
  totalDays: 156,
  weeklyHours: [7.5, 8.2, 6.5, 8.0, 5.5, 9.0, 6.0],
};

const RECOMMENDATIONS = [
  { priority: 'urgent', title: 'Pharmacology - CNS needs immediate attention', desc: 'Only 35% retention with exam in 48 days. Schedule 2-hour daily blocks.', topic: 'Pharmacology - CNS', icon: '🚨', color: '#ef4444' },
  { priority: 'high', title: 'Pathology - Inflammation is slipping', desc: 'Retention dropped to 45%. Add to tomorrow\'s revision queue.', topic: 'Pathology - Inflammation', icon: '⚠️', color: '#f59e0b' },
  { priority: 'high', title: 'Renal Physiology behind schedule', desc: 'Only 33% complete with estimated 8 more hours needed.', topic: 'Renal Physiology', icon: '📅', color: '#f59e0b' },
  { priority: 'medium', title: 'Maintain Neuroanatomy momentum', desc: 'Lowest completion rate (14%). Add 30 min daily to prevent knowledge gaps.', topic: 'Neuroanatomy', icon: '💡', color: '#3b82f6' },
  { priority: 'info', title: 'Microbiology - Bacteria mastered!', desc: '90% retention achieved. Move to light maintenance mode (15 min/week).', topic: 'Microbiology - Bacteria', icon: '✅', color: '#22c55e' },
];

/* ─────────────────────── SVG COMPONENTS ─────────────────────── */
function CountdownRing({ daysLeft, totalDays, size = 100 }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, (daysLeft / totalDays) * 100);
  const offset = circumference - (pct / 100) * circumference;
  const color = daysLeft > 30 ? '#22c55e' : daysLeft > 14 ? '#f59e0b' : '#ef4444';
  return (
    <div className="text-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#374151" strokeWidth="8" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />
        <text x={size / 2} y={size / 2 - 5} textAnchor="middle" fill={color} fontSize="22" fontWeight="bold" className="transform rotate-90" style={{ transformOrigin: 'center' }}>{daysLeft}</text>
        <text x={size / 2} y={size / 2 + 12} textAnchor="middle" fill="#9ca3af" fontSize="8" className="transform rotate-90" style={{ transformOrigin: 'center' }}>days left</text>
      </svg>
    </div>
  );
}

function ProgressRing({ value, size = 60, color = '#a855f7' }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#374151" strokeWidth="5" />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="5" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
      <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle" fill={color} fontSize="12" fontWeight="bold" className="transform rotate-90" style={{ transformOrigin: 'center' }}>{value}%</text>
    </svg>
  );
}

function WeeklyBarChart({ data, height = 100 }) {
  const max = Math.max(...data.map(d => d.target));
  return (
    <svg viewBox={`0 0 280 ${height}`} className="w-full" style={{ height: `${height}px` }}>
      {data.map((d, i) => {
        const barW = 280 / data.length;
        const hTarget = (d.target / max) * (height - 25);
        const hCompleted = (d.completed / max) * (height - 25);
        return (
          <g key={i}>
            <rect x={i * barW + 10} y={height - 20 - hTarget} width={barW - 20} height={hTarget} rx="4" fill="#374151" opacity="0.3" />
            <rect x={i * barW + 10} y={height - 20 - hCompleted} width={barW - 20} height={hCompleted} rx="4" fill={d.completed >= d.target ? '#22c55e' : '#f59e0b'} opacity="0.8" />
            <text x={i * barW + barW / 2} y={height - 5} textAnchor="middle" fill="#9ca3af" fontSize="9">{d.day}</text>
            <text x={i * barW + barW / 2} y={height - 22 - hCompleted} textAnchor="middle" fill={d.completed >= d.target ? '#22c55e' : '#f59e0b'} fontSize="8" fontWeight="bold">{d.completed}/{d.target}</text>
          </g>
        );
      })}
    </svg>
  );
}

function StreakHeatMap({ hours, height = 50 }) {
  return (
    <div className="flex gap-1 items-end" style={{ height: `${height}px` }}>
      {hours.map((h, i) => {
        const pct = (h / 10) * 100;
        const color = h >= 8 ? '#22c55e' : h >= 6 ? '#3b82f6' : h >= 4 ? '#f59e0b' : '#ef4444';
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full rounded-t" style={{ height: `${pct}%`, backgroundColor: color, opacity: 0.8 }} />
            <span className="text-[8px] text-gray-500">{h}h</span>
          </div>
        );
      })}
    </div>
  );
}

function PriorityBadge({ priority }) {
  const config = {
    critical: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'CRITICAL' },
    high: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'HIGH' },
    medium: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'MEDIUM' },
    low: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'LOW' },
  };
  const c = config[priority] || config.medium;
  return <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.bg} ${c.text}`}>{c.label}</span>;
}

/* ─────────────────────── MAIN COMPONENT ─────────────────────── */
export default function ExamCountdownPlanner() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedExam, setSelectedExam] = useState(EXAMS[0]);
  const [selectedDay, setSelectedDay] = useState('today');

  const daysLeft = useMemo(() => {
    const examDate = new Date(selectedExam.date);
    const today = new Date();
    return Math.max(0, Math.ceil((examDate - today) / (1000 * 60 * 60 * 24)));
  }, [selectedExam]);

  const examTopics = useMemo(() => TOPICS.filter(t => t.examId === selectedExam.id), [selectedExam]);
  const totalStudyHours = examTopics.reduce((s, t) => s + t.studiedHours, 0);
  const totalEstimated = examTopics.reduce((s, t) => s + t.estimatedHours, 0);
  const avgRetention = Math.round(examTopics.reduce((s, t) => s + t.retentionScore, 0) / examTopics.length);
  const topicsComplete = examTopics.filter(t => t.completedSubtopics === t.totalSubtopics).length;

  const prioritizedTopics = useMemo(() => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const retentionOrder = (t) => t.retentionScore < 50 ? 0 : t.retentionScore < 70 ? 1 : 2;
    return [...examTopics].sort((a, b) => {
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (pDiff !== 0) return pDiff;
      return retentionOrder(a) - retentionOrder(b);
    });
  }, [examTopics]);

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'schedule', label: '📅 Study Schedule' },
    { id: 'topics', label: '📚 Topic Priority' },
    { id: 'analytics', label: '📈 Analytics' },
  ];

  return (
    <>
      <title>Exam Countdown Planner — OpenPrep AI</title>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-8 space-y-6 max-w-6xl mx-auto">

        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-mono font-bold uppercase text-purple-400">.exam prep</span>
            <h1 className="text-2xl md:text-3xl font-black mt-1">📅 Exam Countdown Planner</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Adaptive study scheduling with topic prioritization and progress tracking</p>
          </div>
          <select value={selectedExam.id} onChange={e => setSelectedExam(EXAMS.find(ex => ex.id === parseInt(e.target.value)))}
            className="px-3 py-2 bg-gray-100 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl text-sm font-bold">
            {EXAMS.map(ex => <option key={ex.id} value={ex.id}>{ex.icon} {ex.name}</option>)}
          </select>
        </div>

        {/* COUNTDOWN HEADER */}
        <div className="bg-gray-100 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 flex items-center gap-6">
          <CountdownRing daysLeft={daysLeft} totalDays={90} size={120} />
          <div className="flex-1">
            <h2 className="text-xl font-bold">{selectedExam.icon} {selectedExam.name}</h2>
            <div className="text-sm text-gray-500 mt-1">Exam Date: {new Date(selectedExam.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div className="grid grid-cols-4 gap-3 mt-3">
              <div className="text-center p-2 bg-gray-200 dark:bg-gray-800 rounded-lg">
                <div className="text-lg font-bold text-purple-500">{topicsComplete}/{examTopics.length}</div>
                <div className="text-[10px] text-gray-500">Topics Done</div>
              </div>
              <div className="text-center p-2 bg-gray-200 dark:bg-gray-800 rounded-lg">
                <div className="text-lg font-bold text-blue-500">{totalStudyHours}h</div>
                <div className="text-[10px] text-gray-500">Hours Studied</div>
              </div>
              <div className="text-center p-2 bg-gray-200 dark:bg-gray-800 rounded-lg">
                <div className="text-lg font-bold text-emerald-500">{avgRetention}%</div>
                <div className="text-[10px] text-gray-500">Avg Retention</div>
              </div>
              <div className="text-center p-2 bg-gray-200 dark:bg-gray-800 rounded-lg">
                <div className="text-lg font-bold text-amber-500">{STUDY_STREAK.current}d</div>
                <div className="text-[10px] text-gray-500">Current Streak</div>
              </div>
            </div>
          </div>
        </div>

        {/* TAB NAV */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${activeTab === t.id ? 'bg-purple-600 text-white shadow-lg' : 'bg-gray-200 dark:bg-gray-800 text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ═══════════ OVERVIEW TAB ═══════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* AI RECOMMENDATIONS */}
            <div className="bg-gray-100 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-bold mb-3">🤖 AI Study Recommendations</h3>
              <div className="space-y-2">
                {RECOMMENDATIONS.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl border" style={{ borderColor: rec.color + '30', backgroundColor: rec.color + '08' }}>
                    <span className="text-lg">{rec.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold">{rec.title}</span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">{rec.desc}</p>
                    </div>
                    <span className="text-[10px] font-bold" style={{ color: rec.color }}>{rec.topic}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* WEEKLY PROGRESS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-100 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-bold mb-3">📊 Weekly Subtopic Goals</h3>
                <WeeklyBarChart data={DAILY_GOALS} height={110} />
              </div>
              <div className="bg-gray-100 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-bold mb-3">🔥 Study Streak</h3>
                <div className="grid grid-cols-3 gap-3 text-center mb-4">
                  <div className="p-2 bg-gray-200 dark:bg-gray-800 rounded-lg">
                    <div className="text-lg font-bold text-amber-500">{STUDY_STREAK.current}</div>
                    <div className="text-[10px] text-gray-500">Current</div>
                  </div>
                  <div className="p-2 bg-gray-200 dark:bg-gray-800 rounded-lg">
                    <div className="text-lg font-bold text-purple-500">{STUDY_STREAK.longest}</div>
                    <div className="text-[10px] text-gray-500">Best</div>
                  </div>
                  <div className="p-2 bg-gray-200 dark:bg-gray-800 rounded-lg">
                    <div className="text-lg font-bold text-emerald-500">{STUDY_STREAK.thisMonth}</div>
                    <div className="text-[10px] text-gray-500">This Month</div>
                  </div>
                </div>
                <StreakHeatMap hours={STUDY_STREAK.weeklyHours} height={60} />
                <div className="flex justify-between text-[8px] text-gray-500 mt-1 px-1">
                  <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                </div>
              </div>
            </div>

            {/* EXAM SELECTOR */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {EXAMS.map(ex => {
                const exDays = Math.max(0, Math.ceil((new Date(ex.date) - new Date()) / (1000 * 60 * 60 * 24)));
                const pct = Math.round((ex.studiedTopics / ex.totalTopics) * 100);
                return (
                  <button key={ex.id} onClick={() => setSelectedExam(ex)}
                    className={`p-4 rounded-2xl border text-left transition ${selectedExam.id === ex.id ? 'border-purple-500 bg-purple-500/10' : 'border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900/50 hover:border-gray-400'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{ex.icon}</span>
                      <span className="text-xs font-bold">{ex.name}</span>
                    </div>
                    <div className="text-2xl font-black" style={{ color: ex.color }}>{exDays}d</div>
                    <div className="text-[10px] text-gray-500">until exam</div>
                    <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5 mt-2">
                      <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: ex.color }} />
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">{ex.studiedTopics}/{ex.totalTopics} topics · {pct}%</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════ SCHEDULE TAB ═══════════ */}
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            <div className="bg-gray-100 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-bold mb-3">📅 Today's Adaptive Study Schedule</h3>
              <p className="text-xs text-gray-500 mb-4">Optimized based on your retention scores, energy levels, and exam proximity</p>
              <div className="space-y-3">
                {STUDY_SCHEDULE.map((slot, i) => {
                  const energyColors = { high: '#22c55e', medium: '#f59e0b', low: '#ef4444' };
                  const typeIcons = { revision: '🔄', learning: '📖', practice: '✍️', reflection: '💭' };
                  return (
                    <div key={i} className="flex items-center gap-4 p-3 bg-gray-200 dark:bg-gray-800 rounded-xl">
                      <div className="text-xs font-mono font-bold text-gray-400 w-28">{slot.time}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span>{typeIcons[slot.type]}</span>
                          <span className="text-xs font-bold">{slot.activity}</span>
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5">{slot.topic}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400">⚡ {slot.energy}</span>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: energyColors[slot.energy] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-gray-100 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-bold mb-3">💡 Schedule Tips</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                  <span className="font-bold text-emerald-400">🧠 Peak Hours:</span> <span className="text-gray-300">Schedule hardest topics (Pharm, Path) in morning when cognitive energy is highest</span>
                </div>
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  <span className="font-bold text-amber-400">🔄 Spaced Rep:</span> <span className="text-gray-300">Review mastered topics briefly (15 min) to maintain retention without over-studying</span>
                </div>
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                  <span className="font-bold text-blue-400">😴 Rest Blocks:</span> <span className="text-gray-300">Take 10-min breaks every 90 min. Pomodoro (25/5) for lighter revision tasks</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════ TOPICS TAB ═══════════ */}
        {activeTab === 'topics' && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">Topics sorted by priority and retention — critical + low retention first</p>
            {prioritizedTopics.map(topic => {
              const completionPct = Math.round((topic.completedSubtopics / topic.totalSubtopics) * 100);
              const retColor = topic.retentionScore >= 80 ? '#22c55e' : topic.retentionScore >= 60 ? '#f59e0b' : '#ef4444';
              const hoursNeeded = Math.max(0, topic.estimatedHours - topic.studiedHours);
              return (
                <div key={topic.id} className="bg-gray-100 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold">{topic.name}</span>
                        <PriorityBadge priority={topic.priority} />
                        <span className="text-[10px] text-gray-500">{topic.subject}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex-1">
                          <div className="flex justify-between text-[10px] mb-1">
                            <span className="text-gray-500">Completion</span>
                            <span className="font-bold">{topic.completedSubtopics}/{topic.totalSubtopics} ({completionPct}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full bg-purple-500" style={{ width: `${completionPct}%` }} />
                          </div>
                        </div>
                        <div className="text-center">
                          <ProgressRing value={topic.retentionScore} size={45} color={retColor} />
                          <div className="text-[8px] text-gray-500 mt-0.5">Retention</div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-xs text-gray-500">{topic.studiedHours}h / {topic.estimatedHours}h</div>
                      {hoursNeeded > 0 && <div className="text-[10px] font-bold text-amber-400">~{hoursNeeded}h needed</div>}
                      <div className="text-[10px] text-gray-400 mt-1">Last: {topic.lastStudied}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ═══════════ ANALYTICS TAB ═══════════ */}
        {activeTab === 'analytics' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-gray-100 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 text-center">
                <div className="text-2xl font-black text-purple-500">{totalStudyHours}h</div>
                <div className="text-xs text-gray-500">Total Hours</div>
                <div className="text-[10px] text-gray-400">of {totalEstimated}h estimated</div>
              </div>
              <div className="bg-gray-100 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 text-center">
                <div className="text-2xl font-black text-emerald-500">{avgRetention}%</div>
                <div className="text-xs text-gray-500">Avg Retention</div>
              </div>
              <div className="bg-gray-100 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 text-center">
                <div className="text-2xl font-black text-blue-500">{STUDY_STREAK.totalDays}</div>
                <div className="text-xs text-gray-500">Total Study Days</div>
              </div>
              <div className="bg-gray-100 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 text-center">
                <div className="text-2xl font-black text-amber-500">{Math.round(totalStudyHours / 7)}h</div>
                <div className="text-xs text-gray-500">Avg Daily</div>
              </div>
            </div>

            <div className="bg-gray-100 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-bold mb-3">📊 Subject Breakdown</h3>
              <div className="space-y-3">
                {[...new Set(examTopics.map(t => t.subject))].map(subject => {
                  const subTopics = examTopics.filter(t => t.subject === subject);
                  const avgRet = Math.round(subTopics.reduce((s, t) => s + t.retentionScore, 0) / subTopics.length);
                  const totalH = subTopics.reduce((s, t) => s + t.studiedHours, 0);
                  const retColor = avgRet >= 80 ? '#22c55e' : avgRet >= 60 ? '#f59e0b' : '#ef4444';
                  return (
                    <div key={subject} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-28">{subject}</span>
                      <div className="flex-1 bg-gray-200 dark:bg-gray-800 rounded-full h-2">
                        <div className="h-2 rounded-full transition-all" style={{ width: `${avgRet}%`, backgroundColor: retColor }} />
                      </div>
                      <span className="text-xs font-bold" style={{ color: retColor }}>{avgRet}%</span>
                      <span className="text-[10px] text-gray-400 w-12 text-right">{totalH}h</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-gray-100 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-bold mb-3">⏱️ Hours Needed to Complete</h3>
              <div className="space-y-2">
                {examTopics.filter(t => t.completedSubtopics < t.totalSubtopics).sort((a, b) => (b.estimatedHours - b.studiedHours) - (a.estimatedHours - a.studiedHours)).map(t => {
                  const needed = Math.max(0, t.estimatedHours - t.studiedHours);
                  const pct = Math.round((t.studiedHours / t.estimatedHours) * 100);
                  return (
                    <div key={t.id} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-40 truncate">{t.name}</span>
                      <div className="flex-1 bg-gray-200 dark:bg-gray-800 rounded-full h-2">
                        <div className="h-2 rounded-full bg-purple-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-bold text-amber-400 w-16 text-right">{needed}h left</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
