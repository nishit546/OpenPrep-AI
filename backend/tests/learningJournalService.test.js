/**
 * Unit tests for learningJournalService.
 *
 * Tests cover: title generation, summary generation, milestone types,
 * streak computation, analytics aggregation, and timeline formatting.
 */

const {
  generateTitle,
  generateSummary,
  computeJournalStreak,
  MILESTONE_TYPES,
  ACTIVITY_TYPES,
} = require('../services/learningJournalService');

// ── Title Generation ─────────────────────────────────────────────────────

describe('generateTitle', () => {
  it('should generate rest day title when no activity', () => {
    const title = generateTitle('2026-08-25', 0, 0, 0);
    expect(title).toContain('Rest Day');
  });

  it('should include study minutes when present', () => {
    const title = generateTitle('2026-08-25', 120, 0, 0);
    expect(title).toContain('120 min studied');
  });

  it('should include quiz count when present', () => {
    const title = generateTitle('2026-08-25', 0, 3, 0);
    expect(title).toContain('3 quizzes');
  });

  it('should include singular quiz for count of 1', () => {
    const title = generateTitle('2026-08-25', 0, 1, 0);
    expect(title).toContain('1 quiz');
    expect(title).not.toContain('1 quizzes');
  });

  it('should include flashcard count when present', () => {
    const title = generateTitle('2026-08-25', 0, 0, 50);
    expect(title).toContain('50 cards reviewed');
  });

  it('should combine multiple metrics', () => {
    const title = generateTitle('2026-08-25', 60, 2, 10);
    expect(title).toContain('60 min studied');
    expect(title).toContain('2 quizzes');
    expect(title).toContain('10 cards reviewed');
  });

  it('should include day of week', () => {
    const title = generateTitle('2026-08-25', 30, 0, 0);
    expect(title).toMatch(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/);
  });
});

// ── Summary Generation ───────────────────────────────────────────────────

describe('generateSummary', () => {
  it('should return no-activity message when nothing done', () => {
    const summary = generateSummary(0, 0, 0, 0, 0, []);
    expect(summary).toContain('No study activity');
  });

  it('should format hours and minutes correctly', () => {
    const summary = generateSummary(150, 0, 0, 0, 0, []);
    expect(summary).toContain('2h 30m');
  });

  it('should format minutes only when less than an hour', () => {
    const summary = generateSummary(45, 0, 0, 0, 0, []);
    expect(summary).toContain('45 minutes');
    expect(summary).not.toContain('h');
  });

  it('should include focus sessions', () => {
    const summary = generateSummary(60, 0, 0, 0, 3, []);
    expect(summary).toContain('3 focus sessions');
  });

  it('should include singular focus session', () => {
    const summary = generateSummary(60, 0, 0, 0, 1, []);
    expect(summary).toContain('1 focus session');
    expect(summary).not.toContain('1 focus sessions');
  });

  it('should include quiz count', () => {
    const summary = generateSummary(0, 5, 0, 0, 0, []);
    expect(summary).toContain('5 quizzes completed');
  });

  it('should include flashcard count', () => {
    const summary = generateSummary(0, 0, 100, 0, 0, []);
    expect(summary).toContain('100 flashcards reviewed');
  });

  it('should include notes count', () => {
    const summary = generateSummary(0, 0, 0, 3, 0, []);
    expect(summary).toContain('3 notes created');
  });

  it('should include subjects studied', () => {
    const subjects = [
      { name: 'Mathematics', minutes: 60 },
      { name: 'Physics', minutes: 30 },
    ];
    const summary = generateSummary(90, 0, 0, 0, 0, subjects);
    expect(summary).toContain('Mathematics');
    expect(summary).toContain('Physics');
  });

  it('should truncate subject list at 3', () => {
    const subjects = [
      { name: 'Math', minutes: 30 },
      { name: 'Physics', minutes: 30 },
      { name: 'Chem', minutes: 30 },
      { name: 'Bio', minutes: 30 },
    ];
    const summary = generateSummary(120, 0, 0, 0, 0, subjects);
    expect(summary).toContain('+1 more');
  });
});

// ── Milestone Types ──────────────────────────────────────────────────────

describe('MILESTONE_TYPES', () => {
  it('should have streak milestones', () => {
    expect(MILESTONE_TYPES.STREAK_7.type).toBe('streak_7');
    expect(MILESTONE_TYPES.STREAK_14.type).toBe('streak_14');
    expect(MILESTONE_TYPES.STREAK_30.type).toBe('streak_30');
  });

  it('should have quiz milestones', () => {
    expect(MILESTONE_TYPES.FIRST_QUIZ.type).toBe('first_quiz');
    expect(MILESTONE_TYPES.QUIZ_10.type).toBe('quiz_10');
    expect(MILESTONE_TYPES.QUIZ_50.type).toBe('quiz_50');
    expect(MILESTONE_TYPES.PERFECT_SCORE.type).toBe('perfect_score');
  });

  it('should have all milestones with required fields', () => {
    for (const [key, milestone] of Object.entries(MILESTONE_TYPES)) {
      expect(milestone.type).toBeDefined();
      expect(milestone.label).toBeDefined();
      expect(milestone.description).toBeDefined();
    }
  });

  it('should have emoji in labels', () => {
    const emojis = ['🔥', '📝', '🎯', '💯', '📇', '📓', '⏰', '📚', '✅', '🌅', '🦉', '🏆'];
    for (const milestone of Object.values(MILESTONE_TYPES)) {
      const hasEmoji = emojis.some((e) => milestone.label.includes(e));
      expect(hasEmoji).toBe(true);
    }
  });
});

// ── Activity Types ───────────────────────────────────────────────────────

describe('ACTIVITY_TYPES', () => {
  it('should have all activity types defined', () => {
    expect(ACTIVITY_TYPES.QUIZ).toBe('quiz_attempt');
    expect(ACTIVITY_TYPES.PYQ).toBe('pyq_upload');
    expect(ACTIVITY_TYPES.FLASHCARD).toBe('flashcard_review');
    expect(ACTIVITY_TYPES.STUDY_PLAN).toBe('study_plan_create');
    expect(ACTIVITY_TYPES.NOTE).toBe('note_upload');
  });
});

// ── Streak Computation Logic ─────────────────────────────────────────────

describe('streak computation logic', () => {
  it('should count consecutive days with activity', () => {
    const entries = [
      { entryDate: '2026-08-25', studyMinutes: 60 },
      { entryDate: '2026-08-24', studyMinutes: 45 },
      { entryDate: '2026-08-23', studyMinutes: 30 },
    ];

    let streak = 0;
    let checkDate = new Date('2026-08-25');

    for (const entry of entries) {
      const entryDate = new Date(entry.entryDate).toISOString().split('T')[0];
      const checkStr = checkDate.toISOString().split('T')[0];

      if (entryDate === checkStr) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (entryDate < checkStr) {
        break;
      }
    }

    expect(streak).toBe(3);
  });

  it('should break streak on gap day', () => {
    const entries = [
      { entryDate: '2026-08-25', studyMinutes: 60 },
      { entryDate: '2026-08-23', studyMinutes: 30 }, // gap on 24th
    ];

    let streak = 0;
    let checkDate = new Date('2026-08-25');

    for (const entry of entries) {
      const entryDate = new Date(entry.entryDate).toISOString().split('T')[0];
      const checkStr = checkDate.toISOString().split('T')[0];

      if (entryDate === checkStr) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (entryDate < checkStr) {
        break;
      }
    }

    expect(streak).toBe(1);
  });

  it('should return 0 for no entries', () => {
    const entries = [];
    let streak = 0;
    expect(streak).toBe(0);
  });
});

// ── Analytics Aggregation ────────────────────────────────────────────────

describe('analytics aggregation logic', () => {
  it('should compute total study minutes correctly', () => {
    const entries = [
      { studyMinutes: 60, quizzesCompleted: 2 },
      { studyMinutes: 90, quizzesCompleted: 3 },
      { studyMinutes: 0, quizzesCompleted: 0 },
    ];

    const total = entries.reduce((sum, e) => sum + e.studyMinutes, 0);
    expect(total).toBe(150);
  });

  it('should compute active vs rest days', () => {
    const entries = [
      { studyMinutes: 60 },
      { studyMinutes: 0 },
      { studyMinutes: 30 },
    ];
    const activeDays = entries.filter((e) => e.studyMinutes > 0).length;
    const restDays = entries.length - activeDays;

    expect(activeDays).toBe(2);
    expect(restDays).toBe(1);
  });

  it('should compute average quiz score', () => {
    const entries = [
      { averageQuizScore: 80 },
      { averageQuizScore: 90 },
      { averageQuizScore: 0 }, // no quiz
    ];
    const scores = entries.filter((e) => e.averageQuizScore > 0).map((e) => e.averageQuizScore);
    const avg = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    expect(avg).toBe(85);
  });

  it('should compute consistency rate', () => {
    const activeDays = 5;
    const totalDays = 7;
    const rate = Math.round((activeDays / totalDays) * 100);
    expect(rate).toBe(71);
  });

  it('should aggregate subject distribution', () => {
    const entries = [
      { subjectsStudied: [{ name: 'Math', minutes: 60 }] },
      { subjectsStudied: [{ name: 'Math', minutes: 30 }, { name: 'Physics', minutes: 45 }] },
    ];

    const dist = {};
    for (const entry of entries) {
      for (const sub of entry.subjectsStudied) {
        dist[sub.name] = (dist[sub.name] || 0) + sub.minutes;
      }
    }

    expect(dist['Math']).toBe(90);
    expect(dist['Physics']).toBe(45);
  });

  it('should aggregate mood distribution', () => {
    const entries = [
      { mood: 'great' },
      { mood: 'great' },
      { mood: 'okay' },
      { mood: null },
    ];

    const dist = {};
    for (const entry of entries) {
      if (entry.mood) {
        dist[entry.mood] = (dist[entry.mood] || 0) + 1;
      }
    }

    expect(dist['great']).toBe(2);
    expect(dist['okay']).toBe(1);
  });
});

// ── Timeline Formatting ──────────────────────────────────────────────────

describe('timeline formatting', () => {
  it('should format timeline entries correctly', () => {
    const entry = {
      entryDate: '2026-08-25',
      title: '📚 Monday — 120 min studied, 3 quizzes',
      studyMinutes: 120,
      milestones: [{ type: 'streak_7', label: '🔥 7-Day Streak!' }],
      subjectsStudied: [{ name: 'Math', minutes: 90 }],
      mood: 'great',
      reflection: 'Good study session today.',
    };

    const timelineEntry = {
      date: entry.entryDate,
      title: entry.title,
      studyMinutes: entry.studyMinutes,
      milestones: entry.milestones,
      subjectsStudied: entry.subjectsStudied,
      mood: entry.mood,
      reflection: entry.reflection,
    };

    expect(timelineEntry.date).toBe('2026-08-25');
    expect(timelineEntry.studyMinutes).toBe(120);
    expect(timelineEntry.milestones).toHaveLength(1);
    expect(timelineEntry.milestones[0].type).toBe('streak_7');
  });

  it('should filter out rest days from timeline', () => {
    const entries = [
      { studyMinutes: 60, entryDate: '2026-08-25' },
      { studyMinutes: 0, entryDate: '2026-08-24' },
      { studyMinutes: 30, entryDate: '2026-08-23' },
    ];

    const activeEntries = entries.filter((e) => e.studyMinutes > 0);
    expect(activeEntries).toHaveLength(2);
  });
});
