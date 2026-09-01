/**
 * @fileoverview REST handlers for the Adaptive Revision Calendar.
 *
 * POST /api/study-schedule/generate   — create an optimised schedule
 * POST /api/study-schedule/rebalance  — redistribute pending slots after missed days
 * PATCH /api/study-schedule/slots/:id — drag-and-drop slot rescheduling
 */

const adaptiveScheduleService = require('../services/adaptiveScheduleService');
const RevisionSchedule = require('../models/RevisionSchedule');
const RevisionSlot = require('../models/RevisionSlot');
const logger = require('../utils/logger');

/**
 * POST /api/study-schedule/generate
 *
 * Body:
 *   examDate        {string}  YYYY-MM-DD
 *   dailyHours      {number}  hours available per day
 *   topics          {Array}   [{ id, subjectId, title, difficultyWeight, estimatedMinutes }]
 *   bufferEvery     {number?} insert buffer day every N study days (default 6)
 *   scheduleId      {string?} re-use existing RevisionSchedule
 */
const generateSchedule = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { examDate, dailyHours, topics, bufferEvery, scheduleId } = req.body;

    if (!examDate) return res.status(400).json({ success: false, message: 'examDate is required.' });
    if (!topics || !topics.length) return res.status(400).json({ success: false, message: 'At least one topic is required.' });

    const result = await adaptiveScheduleService.generateSchedule({
      userId,
      examDate,
      dailyHours: dailyHours || 4,
      topics,
      bufferEvery: bufferEvery || 6,
      scheduleId,
    });

    res.status(201).json({
      success: true,
      data: {
        schedule: result.schedule,
        slotCount: result.slots.length,
        cognitiveLoad: result.cognitiveLoad,
      },
    });
  } catch (error) {
    logger.error('[AdaptiveScheduleController] generateSchedule error:', error.message);
    next(error);
  }
};

/**
 * POST /api/study-schedule/rebalance
 *
 * Body:
 *   scheduleId  {string}   UUID of existing RevisionSchedule
 *   missedDates {string[]} YYYY-MM-DD dates the student missed
 */
const rebalanceSchedule = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { scheduleId, missedDates = [] } = req.body;

    if (!scheduleId) return res.status(400).json({ success: false, message: 'scheduleId is required.' });

    const result = await adaptiveScheduleService.rebalanceSchedule(scheduleId, userId, missedDates);

    res.status(200).json({
      success: true,
      data: {
        movedCount: result.diffPreview.length,
        diffPreview: result.diffPreview,
        cognitiveLoad: result.cognitiveLoad,
      },
    });
  } catch (error) {
    logger.error('[AdaptiveScheduleController] rebalanceSchedule error:', error.message);
    next(error);
  }
};

/**
 * PATCH /api/study-schedule/slots/:id
 * Used by drag-and-drop to move a single slot to a new date.
 *
 * Body:
 *   newDate {string} YYYY-MM-DD
 */
const updateSlotDate = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { newDate } = req.body;

    if (!newDate) return res.status(400).json({ success: false, message: 'newDate is required.' });

    const slot = await RevisionSlot.findOne({ where: { id, user: userId } });
    if (!slot) return res.status(404).json({ success: false, message: 'Slot not found.' });

    const oldDate = slot.scheduledDate;
    await slot.update({ scheduledDate: newDate, status: 'pending' });

    // Recompute cognitive load for the affected schedule
    const allSlots = await RevisionSlot.findAll({
      where: { scheduleId: slot.scheduleId },
      attributes: ['scheduledDate', 'durationMinutes', 'priorityScore'],
    });

    const schedule = await RevisionSchedule.findByPk(slot.scheduleId);
    const cognitiveLoad = adaptiveScheduleService.computeCognitiveLoad(
      allSlots.map((s) => s.get({ plain: true })),
      (schedule?.dailyStudyHours || 4) * 60
    );

    res.status(200).json({
      success: true,
      data: { slot, movedFrom: oldDate, movedTo: newDate, cognitiveLoad },
    });
  } catch (error) {
    logger.error('[AdaptiveScheduleController] updateSlotDate error:', error.message);
    next(error);
  }
};

/**
 * GET /api/study-schedule/:scheduleId/cognitive-load
 * Returns precomputed cognitive load array for the calendar heatmap.
 */
const getCognitiveLoad = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { scheduleId } = req.params;

    const schedule = await RevisionSchedule.findOne({ where: { id: scheduleId, user: userId } });
    if (!schedule) return res.status(404).json({ success: false, message: 'Schedule not found.' });

    const slots = await RevisionSlot.findAll({
      where: { scheduleId },
      attributes: ['scheduledDate', 'durationMinutes', 'priorityScore', 'metadata'],
    });

    const cognitiveLoad = adaptiveScheduleService.computeCognitiveLoad(
      slots.map((s) => s.get({ plain: true })),
      schedule.dailyStudyHours * 60
    );

    res.status(200).json({ success: true, data: cognitiveLoad });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateSchedule,
  rebalanceSchedule,
  updateSlotDate,
  getCognitiveLoad,
};
