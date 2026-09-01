/**
 * @fileoverview AI-Powered Adaptive Spaced Repetition Schedule Engine.
 *
 * Responsibilities:
 *  - generateSchedule  — distribute topics across days using SM-2 intervals
 *  - computeCognitiveLoad — score each day 0–1 by topic difficulty + slot volume
 *  - smoothWorkload    — level workload spikes by shifting non-urgent slots
 *  - insertBufferDays  — mark every N-th study day as a rest/consolidation day
 *  - rebalanceSchedule — redistribute pending/skipped slots after missed days
 */

const { Op } = require('sequelize');
const RevisionSchedule = require('../models/RevisionSchedule');
const RevisionSlot = require('../models/RevisionSlot');
const logger = require('../utils/logger');

// Cognitive load thresholds (fraction of daily capacity consumed)
const LOAD_LABELS = [
  { max: 0.3, label: 'light',    color: '#22c55e' }, // Green
  { max: 0.55, label: 'balanced', color: '#3b82f6' }, // Blue
  { max: 0.75, label: 'heavy',   color: '#f59e0b' }, // Amber
  { max: 1.0,  label: 'overload', color: '#ef4444' }, // Red
];

// Default spaced-repetition intervals (days) for revision numbers 1-5+
const SR_INTERVALS = [1, 3, 7, 14, 30];

/**
 * Returns the spaced-repetition interval (days) for a given revision pass.
 * @param {number} revisionNumber - 1-indexed pass count
 * @param {number} difficultyFactor - 1 (easy) … 3 (hard), scales the interval
 */
const srInterval = (revisionNumber, difficultyFactor = 1.5) => {
  const base = SR_INTERVALS[Math.min(revisionNumber - 1, SR_INTERVALS.length - 1)];
  return Math.max(1, Math.round(base / difficultyFactor));
};

/**
 * Adds `days` calendar days to a DATEONLY string (YYYY-MM-DD).
 */
const addDays = (dateStr, days) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

/**
 * Returns the number of calendar days between two DATEONLY strings (inclusive start).
 */
const daysBetween = (startStr, endStr) => {
  const ms = new Date(endStr) - new Date(startStr);
  return Math.max(0, Math.ceil(ms / 86400000));
};

/**
 * Generates an optimised revision schedule and persists RevisionSlot rows.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.examDate       - YYYY-MM-DD
 * @param {number} params.dailyHours     - Available study hours per day
 * @param {Array}  params.topics         - [{ id, subjectId, title, difficultyWeight (1–3), estimatedMinutes }]
 * @param {string} [params.scheduleId]   - Existing RevisionSchedule UUID to attach slots to
 * @param {number} [params.bufferEvery]  - Insert a buffer day every N study days (default 6)
 * @returns {Promise<{ schedule: RevisionSchedule, slots: RevisionSlot[], cognitiveLoad: Array }>}
 */
const generateSchedule = async ({
  userId,
  examDate,
  dailyHours = 4,
  topics = [],
  scheduleId,
  bufferEvery = 6,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const totalDays = daysBetween(today, examDate);

  if (totalDays < 1) throw new Error('Exam date must be in the future.');
  if (!topics.length) throw new Error('At least one topic is required.');

  const dailyCapacityMinutes = dailyHours * 60;

  // Create or fetch the parent RevisionSchedule
  let schedule;
  if (scheduleId) {
    schedule = await RevisionSchedule.findOne({ where: { id: scheduleId, user: userId } });
    if (!schedule) throw new Error('Schedule not found.');
    // Remove old pending slots before regenerating
    await RevisionSlot.destroy({ where: { scheduleId, status: 'pending' } });
  } else {
    schedule = await RevisionSchedule.create({
      user: userId,
      examDate,
      startDate: today,
      dailyStudyHours: dailyHours,
      title: 'Adaptive Revision Plan',
      status: 'active',
    });
  }

  // ── Build raw slot plan ──────────────────────────────────────────────────
  const slots = [];
  let dayOffset = 0;
  let studyDayCount = 0; // used for buffer day cadence

  // Sort topics: hardest first so they get earlier, more-spaced passes
  const sorted = [...topics].sort((a, b) => (b.difficultyWeight || 1.5) - (a.difficultyWeight || 1.5));

  for (const topic of sorted) {
    const difficulty = Math.min(3, Math.max(1, topic.difficultyWeight || 1.5));
    const slotMinutes = topic.estimatedMinutes || Math.round(60 * difficulty);
    let revPass = 1;
    let scheduledDate = addDays(today, dayOffset);

    while (scheduledDate <= examDate && revPass <= 5) {
      // Skip buffer days (inserted every `bufferEvery` study days)
      while (studyDayCount > 0 && studyDayCount % bufferEvery === 0) {
        dayOffset++;
        scheduledDate = addDays(today, dayOffset);
        // Mark as buffer slot placeholder
        slots.push({
          scheduleId: schedule.id,
          user: userId,
          subject: topic.subjectId,
          topic: topic.id,
          title: '🧘 Buffer / Rest Day',
          scheduledDate,
          durationMinutes: 0,
          activityType: 'light_review',
          priority: 'low',
          priorityScore: 0.1,
          status: 'pending',
          revisionNumber: 0,
          spacedRepetitionInterval: 0,
          metadata: { type: 'buffer' },
        });
        dayOffset++;
        scheduledDate = addDays(today, dayOffset);
      }

      slots.push({
        scheduleId: schedule.id,
        user: userId,
        subject: topic.subjectId,
        topic: topic.id,
        title: `${topic.title} — Pass ${revPass}`,
        scheduledDate,
        durationMinutes: revPass === 1 ? slotMinutes : Math.round(slotMinutes * 0.6),
        activityType: revPass === 1 ? 'deep_dive' : revPass <= 3 ? 'practice_quiz' : 'review_flashcards',
        priority: difficulty >= 2.5 ? 'critical' : difficulty >= 2 ? 'high' : 'medium',
        priorityScore: parseFloat((difficulty / 3).toFixed(2)),
        status: 'pending',
        revisionNumber: revPass,
        spacedRepetitionInterval: srInterval(revPass, difficulty),
      });

      studyDayCount++;
      dayOffset += srInterval(revPass, difficulty);
      scheduledDate = addDays(today, dayOffset);
      revPass++;
    }
  }

  // ── Apply workload smoothing ─────────────────────────────────────────────
  const smoothed = smoothWorkload(slots, dailyCapacityMinutes, examDate);

  // ── Persist slots ────────────────────────────────────────────────────────
  const created = await RevisionSlot.bulkCreate(smoothed, { returning: true });
  await schedule.update({ totalSlots: created.length });

  const cognitiveLoad = computeCognitiveLoad(smoothed, dailyCapacityMinutes);

  logger.info(`[AdaptiveSchedule] Generated ${created.length} slots for user ${userId} until ${examDate}.`);
  return { schedule, slots: created, cognitiveLoad };
};

/**
 * Computes per-day cognitive load scores.
 *
 * @param {Array}  slots
 * @param {number} dailyCapacityMinutes
 * @returns {{ date: string, loadScore: number, label: string, color: string, slotCount: number }[]}
 */
const computeCognitiveLoad = (slots, dailyCapacityMinutes = 240) => {
  const dayMap = {};

  for (const slot of slots) {
    const date = slot.scheduledDate;
    if (!dayMap[date]) dayMap[date] = { totalMinutes: 0, totalDifficulty: 0, slotCount: 0 };
    const entry = dayMap[date];
    entry.totalMinutes += slot.durationMinutes || 0;
    entry.totalDifficulty += slot.priorityScore || 0;
    entry.slotCount++;
  }

  return Object.entries(dayMap).map(([date, entry]) => {
    const volumeRatio = Math.min(1, entry.totalMinutes / dailyCapacityMinutes);
    const difficultyRatio = Math.min(1, entry.totalDifficulty / Math.max(1, entry.slotCount));
    const loadScore = parseFloat(((volumeRatio * 0.6) + (difficultyRatio * 0.4)).toFixed(3));

    const band = LOAD_LABELS.find((b) => loadScore <= b.max) || LOAD_LABELS[LOAD_LABELS.length - 1];

    return {
      date,
      loadScore,
      label: band.label,
      color: band.color,
      slotCount: entry.slotCount,
      totalMinutes: entry.totalMinutes,
    };
  }).sort((a, b) => a.date.localeCompare(b.date));
};

/**
 * Smooths workload by shifting non-urgent slots off overloaded days.
 *
 * @param {Array}  slots - unsaved slot objects
 * @param {number} dailyCapacityMinutes
 * @param {string} examDate
 * @returns {Array} smoothed slots (mutated in-place)
 */
const smoothWorkload = (slots, dailyCapacityMinutes = 240, examDate = null) => {
  // Build daily load map
  const loadMap = {};
  for (const slot of slots) {
    if (!loadMap[slot.scheduledDate]) loadMap[slot.scheduledDate] = 0;
    loadMap[slot.scheduledDate] += slot.durationMinutes || 0;
  }

  // Pass through slots and push overloaded ones to the next available day
  for (const slot of slots) {
    if (slot.metadata?.type === 'buffer' || slot.revisionNumber === 1) continue; // Never shift first passes
    if ((loadMap[slot.scheduledDate] || 0) > dailyCapacityMinutes) {
      // Find next day with capacity
      let candidateDate = addDays(slot.scheduledDate, 1);
      let attempts = 0;
      while (attempts < 30) {
        if (!examDate || candidateDate <= examDate) {
          if (!loadMap[candidateDate]) loadMap[candidateDate] = 0;
          if (loadMap[candidateDate] + (slot.durationMinutes || 0) <= dailyCapacityMinutes) {
            // Move the slot
            loadMap[slot.scheduledDate] -= slot.durationMinutes || 0;
            slot.scheduledDate = candidateDate;
            slot.status = slot.status === 'pending' ? 'pending' : 'rescheduled';
            loadMap[candidateDate] += slot.durationMinutes || 0;
            break;
          }
        }
        candidateDate = addDays(candidateDate, 1);
        attempts++;
      }
    }
  }

  return slots;
};

/**
 * Redistributes pending / skipped slots after missed study days.
 *
 * @param {string}   scheduleId
 * @param {string}   userId
 * @param {string[]} missedDates - YYYY-MM-DD dates the student missed
 * @returns {Promise<{ rebalancedSlots: RevisionSlot[], cognitiveLoad: Array, diffPreview: Array }>}
 */
const rebalanceSchedule = async (scheduleId, userId, missedDates = []) => {
  const schedule = await RevisionSchedule.findOne({ where: { id: scheduleId, user: userId } });
  if (!schedule) throw new Error('Schedule not found.');

  const today = new Date().toISOString().split('T')[0];

  // Fetch all pending/skipped slots from today onward
  const pending = await RevisionSlot.findAll({
    where: {
      scheduleId,
      user: userId,
      status: { [Op.in]: ['pending', 'skipped'] },
      scheduledDate: { [Op.gte]: today },
    },
    order: [['scheduledDate', 'ASC'], ['priorityScore', 'DESC']],
  });

  if (!pending.length) return { rebalancedSlots: [], cognitiveLoad: [], diffPreview: [] };

  const dailyCapacityMinutes = schedule.dailyStudyHours * 60;
  const examDate = schedule.examDate;

  // Build set of available dates (skip exam date itself and past missed dates in the future)
  const missedSet = new Set(missedDates);

  // Rebuild load map from already-completed slots after today
  const completed = await RevisionSlot.findAll({
    where: {
      scheduleId,
      status: 'completed',
      scheduledDate: { [Op.gte]: today },
    },
  });

  const loadMap = {};
  for (const s of completed) {
    loadMap[s.scheduledDate] = (loadMap[s.scheduledDate] || 0) + s.durationMinutes;
  }

  // Re-assign dates to pending slots
  const diffPreview = [];
  let cursor = today;

  for (const slot of pending) {
    const originalDate = slot.scheduledDate;

    // Advance cursor past days that are full or missed or buffer days
    let attempts = 0;
    while (attempts < 90) {
      if (cursor > examDate) break;
      if (!missedSet.has(cursor)) {
        const currentLoad = loadMap[cursor] || 0;
        if (currentLoad + slot.durationMinutes <= dailyCapacityMinutes) break;
      }
      cursor = addDays(cursor, 1);
      attempts++;
    }

    if (cursor > examDate) {
      logger.warn(`[Rebalance] Could not fit slot ${slot.id} before exam date.`);
      continue;
    }

    if (cursor !== originalDate) {
      diffPreview.push({ slotId: slot.id, title: slot.title, from: originalDate, to: cursor });
      await slot.update({ scheduledDate: cursor, status: 'pending' });
    }

    loadMap[cursor] = (loadMap[cursor] || 0) + slot.durationMinutes;
  }

  const allSlots = await RevisionSlot.findAll({ where: { scheduleId }, order: [['scheduledDate', 'ASC']] });
  const rawSlots = allSlots.map((s) => s.get({ plain: true }));
  const cognitiveLoad = computeCognitiveLoad(rawSlots, dailyCapacityMinutes);

  logger.info(`[Rebalance] ${diffPreview.length} slots moved for schedule ${scheduleId}.`);
  return { rebalancedSlots: pending, cognitiveLoad, diffPreview };
};

module.exports = {
  generateSchedule,
  rebalanceSchedule,
  computeCognitiveLoad,
  smoothWorkload,
  srInterval,
  addDays,
  daysBetween,
  LOAD_LABELS,
};
