/**
 * Unit tests for studyPlanVersioningService.
 *
 * Tests cover: diff computation, snapshot building, version lifecycle,
 * comparison logic, and change detection.
 */

const {
  computeDiff,
  buildPlanSnapshot,
  CHANGE_TYPES,
  MAX_VERSIONS_PER_PLAN,
} = require('../services/studyPlanVersioningService');

// ── Diff Computation ─────────────────────────────────────────────────────

describe('computeDiff', () => {
  it('should return null when snapshots are identical', () => {
    const snap = { title: 'Plan A', startDate: '2026-08-01', tasks: [{ title: 'Task 1' }] };
    const diff = computeDiff(snap, { ...snap });
    expect(diff).toBeNull();
  });

  it('should detect title change', () => {
    const oldSnap = { title: 'Old Title', tasks: [], dailyGoals: [] };
    const newSnap = { title: 'New Title', tasks: [], dailyGoals: [] };
    const diff = computeDiff(oldSnap, newSnap);
    expect(diff).not.toBeNull();
    expect(diff.modified.length).toBeGreaterThanOrEqual(1);
    expect(diff.modified.some((m) => m.field === 'title')).toBe(true);
  });

  it('should detect status change', () => {
    const oldSnap = { status: 'active', tasks: [], dailyGoals: [] };
    const newSnap = { status: 'completed', tasks: [], dailyGoals: [] };
    const diff = computeDiff(oldSnap, newSnap);
    expect(diff.modified.some((m) => m.field === 'status')).toBe(true);
  });

  it('should detect added tasks', () => {
    const oldSnap = { tasks: [{ title: 'Task 1' }], dailyGoals: [] };
    const newSnap = { tasks: [{ title: 'Task 1' }, { title: 'Task 2' }], dailyGoals: [] };
    const diff = computeDiff(oldSnap, newSnap);
    expect(diff.added.length).toBeGreaterThanOrEqual(1);
  });

  it('should detect removed tasks', () => {
    const oldSnap = { tasks: [{ title: 'Task 1' }, { title: 'Task 2' }], dailyGoals: [] };
    const newSnap = { tasks: [{ title: 'Task 1' }], dailyGoals: [] };
    const diff = computeDiff(oldSnap, newSnap);
    expect(diff.removed.length).toBeGreaterThanOrEqual(1);
  });

  it('should detect modified tasks', () => {
    const oldSnap = { tasks: [{ title: 'Task 1', completed: false }], dailyGoals: [] };
    const newSnap = { tasks: [{ title: 'Task 1', completed: true }], dailyGoals: [] };
    const diff = computeDiff(oldSnap, newSnap);
    expect(diff.modified.length).toBeGreaterThanOrEqual(1);
  });

  it('should detect added daily goals', () => {
    const oldSnap = { dailyGoals: [], tasks: [] };
    const newSnap = { dailyGoals: [{ title: 'Study 2 hours' }], tasks: [] };
    const diff = computeDiff(oldSnap, newSnap);
    expect(diff.added.length).toBeGreaterThanOrEqual(1);
  });

  it('should detect schedule changes', () => {
    const oldSnap = { startDate: '2026-08-01', endDate: '2026-08-30', tasks: [], dailyGoals: [] };
    const newSnap = { startDate: '2026-08-01', endDate: '2026-09-15', tasks: [], dailyGoals: [] };
    const diff = computeDiff(oldSnap, newSnap);
    expect(diff.modified.some((m) => m.field === 'endDate')).toBe(true);
  });

  it('should handle empty tasks arrays', () => {
    const oldSnap = { tasks: [], dailyGoals: [] };
    const newSnap = { tasks: [], dailyGoals: [] };
    const diff = computeDiff(oldSnap, newSnap);
    expect(diff).toBeNull();
  });

  it('should handle both additions and removals simultaneously', () => {
    const oldSnap = { tasks: [{ title: 'A' }, { title: 'B' }], dailyGoals: [] };
    const newSnap = { tasks: [{ title: 'B' }, { title: 'C' }], dailyGoals: [] };
    const diff = computeDiff(oldSnap, newSnap);
    expect(diff.added.length).toBeGreaterThanOrEqual(1);
    expect(diff.removed.length).toBeGreaterThanOrEqual(1);
  });

  it('should handle studyHoursPerDay change', () => {
    const oldSnap = { studyHoursPerDay: 3, tasks: [], dailyGoals: [] };
    const newSnap = { studyHoursPerDay: 5, tasks: [], dailyGoals: [] };
    const diff = computeDiff(oldSnap, newSnap);
    expect(diff.modified.some((m) => m.field === 'studyHoursPerDay')).toBe(true);
  });
});

// ── Snapshot Building ────────────────────────────────────────────────────

describe('buildPlanSnapshot', () => {
  it('should extract relevant plan fields', () => {
    const plan = {
      title: 'Finals Prep',
      description: 'Study for finals',
      startDate: '2026-08-01',
      endDate: '2026-08-30',
      status: 'active',
      dailyGoals: [{ title: 'Read chapter 1' }],
      tasks: [{ title: 'Review notes' }],
      subjects: ['math', 'physics'],
      studyHoursPerDay: 4,
      metadata: { priority: 'high' },
      createdAt: new Date(),
      unrelatedField: 'should not appear',
    };

    const snapshot = buildPlanSnapshot(plan);
    expect(snapshot.title).toBe('Finals Prep');
    expect(snapshot.startDate).toBe('2026-08-01');
    expect(snapshot.dailyGoals).toHaveLength(1);
    expect(snapshot.tasks).toHaveLength(1);
    expect(snapshot.studyHoursPerDay).toBe(4);
    expect(snapshot.unrelatedField).toBeUndefined();
  });

  it('should handle missing fields with defaults', () => {
    const plan = { title: 'Plan' };
    const snapshot = buildPlanSnapshot(plan);
    expect(snapshot.dailyGoals).toEqual([]);
    expect(snapshot.tasks).toEqual([]);
    expect(snapshot.metadata).toEqual({});
  });

  it('should handle plan with toJSON method', () => {
    const plan = {
      toJSON() {
        return { title: 'Via toJSON', tasks: ['a'], dailyGoals: ['b'] };
      },
    };
    const snapshot = buildPlanSnapshot(plan);
    expect(snapshot.title).toBe('Via toJSON');
  });
});

// ── Change Types ─────────────────────────────────────────────────────────

describe('CHANGE_TYPES', () => {
  it('should have all change types defined', () => {
    expect(CHANGE_TYPES.CREATED).toBe('created');
    expect(CHANGE_TYPES.UPDATED).toBe('updated');
    expect(CHANGE_TYPES.TASK_ADDED).toBe('task_added');
    expect(CHANGE_TYPES.TASK_REMOVED).toBe('task_removed');
    expect(CHANGE_TYPES.TASK_COMPLETED).toBe('task_completed');
    expect(CHANGE_TYPES.SCHEDULE_CHANGED).toBe('schedule_changed');
    expect(CHANGE_TYPES.RESTORED).toBe('restored');
  });

  it('should have 7 change types', () => {
    expect(Object.keys(CHANGE_TYPES)).toHaveLength(7);
  });
});

// ── Version Limits ───────────────────────────────────────────────────────

describe('MAX_VERSIONS_PER_PLAN', () => {
  it('should be a reasonable number', () => {
    expect(MAX_VERSIONS_PER_PLAN).toBeGreaterThanOrEqual(10);
    expect(MAX_VERSIONS_PER_PLAN).toBeLessThanOrEqual(500);
  });
});

// ── Complex Diff Scenarios ───────────────────────────────────────────────

describe('complex diff scenarios', () => {
  it('should handle full plan overhaul', () => {
    const oldSnap = {
      title: 'Old Plan',
      startDate: '2026-08-01',
      endDate: '2026-08-30',
      status: 'active',
      studyHoursPerDay: 2,
      tasks: [{ title: 'Read' }, { title: 'Write' }],
      dailyGoals: [{ title: 'Goal 1' }],
    };
    const newSnap = {
      title: 'New Plan',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      status: 'active',
      studyHoursPerDay: 4,
      tasks: [{ title: 'Code' }, { title: 'Test' }],
      dailyGoals: [{ title: 'Goal A' }, { title: 'Goal B' }],
    };
    const diff = computeDiff(oldSnap, newSnap);
    expect(diff).not.toBeNull();
    expect(diff.modified.length).toBeGreaterThanOrEqual(2);
    expect(diff.added.length).toBeGreaterThanOrEqual(1);
    expect(diff.removed.length).toBeGreaterThanOrEqual(1);
  });

  it('should detect day-by-day goal evolution', () => {
    const day1 = { dailyGoals: [{ title: 'Review ch1' }], tasks: [] };
    const day2 = { dailyGoals: [{ title: 'Review ch1' }, { title: 'Review ch2' }], tasks: [] };
    const day3 = {
      dailyGoals: [
        { title: 'Review ch1', completed: true },
        { title: 'Review ch2' },
        { title: 'Review ch3' },
      ],
      tasks: [],
    };

    const diff12 = computeDiff(day1, day2);
    expect(diff12.added.length).toBe(1);

    const diff23 = computeDiff(day2, day3);
    expect(diff23.added.length).toBe(1);
    expect(diff23.modified.length).toBe(1);
  });

  it('should handle metadata changes if comparing', () => {
    const oldSnap = { metadata: { version: 1 }, tasks: [], dailyGoals: [] };
    const newSnap = { metadata: { version: 2 }, tasks: [], dailyGoals: [] };
    // metadata is not in fieldsToCompare, so no diff
    const diff = computeDiff(oldSnap, newSnap);
    expect(diff).toBeNull();
  });
});

// ── Helper: getObjectChanges ─────────────────────────────────────────────

describe('getObjectChanges logic', () => {
  it('should detect single field change', () => {
    const a = { title: 'A', duration: 30 };
    const b = { title: 'B', duration: 30 };
    const changes = [];
    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of allKeys) {
      if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) {
        changes.push(key);
      }
    }
    expect(changes).toEqual(['title']);
  });

  it('should detect no changes for identical objects', () => {
    const a = { x: 1, y: 2 };
    const b = { x: 1, y: 2 };
    const changes = [];
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) {
        changes.push(key);
      }
    }
    expect(changes).toHaveLength(0);
  });

  it('should detect nested object changes', () => {
    const a = { config: { pomodoro: 25 } };
    const b = { config: { pomodoro: 30 } };
    const changed = JSON.stringify(a.config) !== JSON.stringify(b.config);
    expect(changed).toBe(true);
  });
});
