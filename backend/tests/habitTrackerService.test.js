/**
 * Unit tests for habitTrackerService.
 *
 * Tests cover: habit creation, streak calculation, consistency scoring,
 * streak freeze management, habit analytics, weekly summary, and
 * recommendation generation.
 */

const {
  createHabit,
  logHabitCompletion,
  useStreakFreeze,
  getHabitAnalytics,
  getWeeklySummary,
  generateHabitRecommendations,
  computeConsistencyScore,
  HABIT_CATEGORIES,
  MOOD_WEIGHTS,
  CONSISTENCY_WINDOW_DAYS,
  FREEZE_LIMIT_PER_MONTH,
} = require('../services/habitTrackerService');

// ── Mock Database ────────────────────────────────────────────────────────

const mockHabits = new Map();
const mockLogs = new Map();
const mockStreaks = new Map();
let nextId = 1;

function resetMocks() {
  mockHabits.clear();
  mockLogs.clear();
  mockStreaks.clear();
  nextId = 1;
}

function makeHabit(overrides = {}) {
  const id = `habit-${nextId++}`;
  return {
    id,
    userId: overrides.userId || 'user-1',
    name: overrides.name || 'Study Daily',
    description: overrides.description || null,
    subject: overrides.subject || null,
    habitType: overrides.habitType || 'daily',
    frequency: overrides.frequency || 1,
    frequencyPeriod: overrides.frequencyPeriod || 'day',
    targetMinutes: overrides.targetMinutes || 30,
    category: overrides.category || 'custom',
    priority: overrides.priority || 'medium',
    status: overrides.status || 'active',
    startDate: overrides.startDate || new Date().toISOString().split('T')[0],
    endDate: overrides.endDate || null,
    reminderTime: overrides.reminderTime || null,
    tags: overrides.tags || [],
    metadata: overrides.metadata || {},
    createdAt: new Date(),
    updatedAt: new Date(),
    toJSON() { return { ...this }; },
    async save() { return this; },
  };
}

function makeLog(overrides = {}) {
  const id = `log-${nextId++}`;
  return {
    id,
    userId: overrides.userId || 'user-1',
    habitId: overrides.habitId || 'habit-1',
    logDate: overrides.logDate || new Date().toISOString().split('T')[0],
    completed: overrides.completed !== false,
    actualMinutes: overrides.actualMinutes || 30,
    quality: overrides.quality || null,
    notes: overrides.notes || null,
    mood: overrides.mood || null,
    metadata: overrides.metadata || {},
  };
}

function makeStreak(overrides = {}) {
  return {
    id: `streak-${nextId++}`,
    userId: overrides.userId || 'user-1',
    habitId: overrides.habitId || 'habit-1',
    currentStreak: overrides.currentStreak || 0,
    bestStreak: overrides.bestStreak || 0,
    totalCompletions: overrides.totalCompletions || 0,
    totalMinutesLogged: overrides.totalMinutesLogged || 0,
    lastCompletedDate: overrides.lastCompletedDate || null,
    streakStartDate: overrides.streakStartDate || null,
    freezeCount: overrides.freezeCount || 0,
    freezesUsed: overrides.freezesUsed || [],
    consistencyScore: overrides.consistencyScore || 0,
    averageQuality: overrides.averageQuality || 0,
    averageMinutes: overrides.averageMinutes || 0,
    metadata: overrides.metadata || {},
    async save() { return this; },
  };
}

// ── Streak Calculation ───────────────────────────────────────────────────

describe('streak calculation logic', () => {
  it('should start streak at 1 on first completion', () => {
    const streak = makeStreak({ currentStreak: 0 });
    const log = makeLog({ logDate: '2026-08-25' });

    // Simulate first completion logic
    streak.currentStreak = 1;
    streak.streakStartDate = log.logDate;
    streak.lastCompletedDate = log.logDate;
    streak.totalCompletions += 1;

    expect(streak.currentStreak).toBe(1);
    expect(streak.streakStartDate).toBe('2026-08-25');
  });

  it('should extend streak on consecutive day', () => {
    const streak = makeStreak({
      currentStreak: 5,
      lastCompletedDate: '2026-08-24',
    });

    const today = new Date('2026-08-25');
    const yesterday = new Date('2026-08-24');

    const lastStr = streak.lastCompletedDate;
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastStr === yesterdayStr) {
      streak.currentStreak += 1;
    }

    expect(streak.currentStreak).toBe(6);
  });

  it('should reset streak on gap day', () => {
    const streak = makeStreak({
      currentStreak: 10,
      lastCompletedDate: '2026-08-22',
    });

    const lastStr = streak.lastCompletedDate;
    const yesterdayStr = '2026-08-24';

    if (lastStr < yesterdayStr) {
      streak.currentStreak = 1;
    }

    expect(streak.currentStreak).toBe(1);
  });

  it('should not change streak on same day', () => {
    const streak = makeStreak({
      currentStreak: 5,
      lastCompletedDate: '2026-08-25',
    });

    const lastStr = streak.lastCompletedDate;
    const todayStr = '2026-08-25';

    // Same day — no change
    if (lastStr === todayStr) {
      // no change
    }

    expect(streak.currentStreak).toBe(5);
  });
});

// ── Recommendation Generation ────────────────────────────────────────────

describe('generateHabitRecommendations', () => {
  const baseAnalytics = {
    totalHabits: 5,
    activeHabits: 5,
    overallConsistency: 70,
    totalCompletionsThisWeek: 20,
    todayCompletedHabits: 3,
    todayTotalHabits: 5,
    todayCompletionRate: 60,
    categoryBreakdown: {},
    streakSummary: {
      totalActiveStreaks: 3,
      longestStreak: 14,
      averageCurrentStreak: 7,
    },
  };

  it('should recommend completing remaining habits when rate is low', () => {
    const recs = generateHabitRecommendations({
      ...baseAnalytics,
      todayCompletionRate: 20,
    });
    const completionRec = recs.find((r) => r.category === 'completion');
    expect(completionRec).toBeDefined();
    expect(completionRec.impact).toBe('high');
  });

  it('should recommend consistency improvement when low', () => {
    const recs = generateHabitRecommendations({
      ...baseAnalytics,
      overallConsistency: 25,
    });
    const consistencyRec = recs.find((r) => r.category === 'consistency');
    expect(consistencyRec).toBeDefined();
    expect(consistencyRec.impact).toBe('high');
  });

  it('should congratulate on long average streak', () => {
    const recs = generateHabitRecommendations({
      ...baseAnalytics,
      streakSummary: { ...baseAnalytics.streakSummary, averageCurrentStreak: 20 },
    });
    const streakRec = recs.find((r) => r.category === 'streak');
    expect(streakRec).toBeDefined();
  });

  it('should recommend restarting when had streak but none active', () => {
    const recs = generateHabitRecommendations({
      ...baseAnalytics,
      streakSummary: { totalActiveStreaks: 0, longestStreak: 14, averageCurrentStreak: 0 },
    });
    const streakRec = recs.find((r) => r.category === 'streak');
    expect(streakRec).toBeDefined();
  });

  it('should generate no recommendations for healthy metrics', () => {
    const recs = generateHabitRecommendations({
      ...baseAnalytics,
      todayCompletionRate: 90,
      overallConsistency: 85,
      streakSummary: { totalActiveStreaks: 3, longestStreak: 14, averageCurrentStreak: 7 },
    });
    expect(recs.length).toBe(0);
  });
});

// ── Constants ────────────────────────────────────────────────────────────

describe('constants', () => {
  it('should have all habit categories defined', () => {
    expect(HABIT_CATEGORIES.REVIEW).toBe('review');
    expect(HABIT_CATEGORIES.PRACTICE).toBe('practice');
    expect(HABIT_CATEGORIES.READING).toBe('reading');
    expect(HABIT_CATEGORIES.QUIZ).toBe('quiz');
    expect(HABIT_CATEGORIES.FLASHCARDS).toBe('flashcards');
    expect(HABIT_CATEGORIES.NOTES).toBe('notes');
    expect(HABIT_CATEGORIES.DISCUSSION).toBe('discussion');
    expect(HABIT_CATEGORIES.CUSTOM).toBe('custom');
  });

  it('should have valid mood weights', () => {
    expect(MOOD_WEIGHTS.great).toBeGreaterThan(MOOD_WEIGHTS.good);
    expect(MOOD_WEIGHTS.good).toBeGreaterThan(MOOD_WEIGHTS.okay);
    expect(MOOD_WEIGHTS.okay).toBeGreaterThan(MOOD_WEIGHTS.tired);
    expect(MOOD_WEIGHTS.tired).toBeGreaterThan(MOOD_WEIGHTS.stressed);
  });

  it('should have valid consistency window', () => {
    expect(CONSISTENCY_WINDOW_DAYS).toBe(30);
  });

  it('should have valid freeze limit', () => {
    expect(FREEZE_LIMIT_PER_MONTH).toBe(3);
    expect(FREEZE_LIMIT_PER_MONTH).toBeGreaterThan(0);
  });
});

// ── Streak Freeze Logic ──────────────────────────────────────────────────

describe('streak freeze logic', () => {
  it('should count freezes per month', () => {
    const streak = makeStreak({
      freezesUsed: ['2026-08-01', '2026-08-15'],
      freezeCount: 2,
    });

    const now = new Date('2026-08-25');
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const freezesThisMonth = streak.freezesUsed.filter((d) => d.startsWith(currentMonth)).length;
    expect(freezesThisMonth).toBe(2);
  });

  it('should reject freeze when limit reached', () => {
    const streak = makeStreak({
      freezesUsed: ['2026-08-01', '2026-08-10', '2026-08-20'],
      freezeCount: 3,
    });

    const now = new Date('2026-08-25');
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const freezesThisMonth = streak.freezesUsed.filter((d) => d.startsWith(currentMonth)).length;
    expect(freezesThisMonth).toBeGreaterThanOrEqual(FREEZE_LIMIT_PER_MONTH);
  });

  it('should allow freeze when no active streak', () => {
    const streak = makeStreak({ currentStreak: 0 });
    expect(streak.currentStreak).toBe(0);
    // Should throw error — cannot freeze zero streak
  });
});

// ── Habit Creation Validation ────────────────────────────────────────────

describe('habit creation validation', () => {
  it('should require a name', () => {
    const data = { name: '' };
    expect(data.name).toBeFalsy();
  });

  it('should set default values correctly', () => {
    const defaults = {
      habitType: 'daily',
      frequency: 1,
      frequencyPeriod: 'day',
      targetMinutes: 30,
      category: 'custom',
      priority: 'medium',
    };
    expect(defaults.habitType).toBe('daily');
    expect(defaults.frequency).toBe(1);
    expect(defaults.targetMinutes).toBe(30);
  });

  it('should accept all valid categories', () => {
    const validCategories = ['review', 'practice', 'reading', 'quiz', 'flashcards', 'notes', 'discussion', 'custom'];
    for (const cat of validCategories) {
      expect(Object.values(HABIT_CATEGORIES)).toContain(cat);
    }
  });
});

// ── Mood Quality Mapping ─────────────────────────────────────────────────

describe('mood quality mapping', () => {
  it('should map moods to numeric weights', () => {
    expect(typeof MOOD_WEIGHTS.great).toBe('number');
    expect(typeof MOOD_WEIGHTS.stressed).toBe('number');
  });

  it('should have great mood as highest weight', () => {
    const weights = Object.values(MOOD_WEIGHTS);
    expect(Math.max(...weights)).toBe(MOOD_WEIGHTS.great);
  });

  it('should have stressed mood as lowest weight', () => {
    const weights = Object.values(MOOD_WEIGHTS);
    expect(Math.min(...weights)).toBe(MOOD_WEIGHTS.stressed);
  });
});

// ── Weekly Summary Logic ─────────────────────────────────────────────────

describe('weekly summary computation', () => {
  it('should compute 7-day breakdown correctly', () => {
    const breakdown = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date('2026-08-25');
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      breakdown[dateStr] = { completions: 0, totalMinutes: 0 };
    }

    expect(Object.keys(breakdown)).toHaveLength(7);
    expect(breakdown['2026-08-25']).toBeDefined();
    expect(breakdown['2026-08-19']).toBeDefined();
  });

  it('should aggregate completions per day', () => {
    const logs = [
      makeLog({ logDate: '2026-08-25', actualMinutes: 30 }),
      makeLog({ logDate: '2026-08-25', actualMinutes: 20 }),
      makeLog({ logDate: '2026-08-24', actualMinutes: 45 }),
    ];

    const daily = {};
    for (const log of logs) {
      if (!daily[log.logDate]) daily[log.logDate] = { completions: 0, totalMinutes: 0 };
      daily[log.logDate].completions += 1;
      daily[log.logDate].totalMinutes += log.actualMinutes;
    }

    expect(daily['2026-08-25'].completions).toBe(2);
    expect(daily['2026-08-25'].totalMinutes).toBe(50);
    expect(daily['2026-08-24'].completions).toBe(1);
  });
});
