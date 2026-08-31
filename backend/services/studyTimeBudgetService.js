const { StudyTimeBudget, ActivityLog } = require('../models');
const { Op } = require('sequelize');

/**
 * StudyTimeBudgetService — manages weekly time budgets per subject,
 * tracks actual time against plans, and computes efficiency analytics.
 */
class StudyTimeBudgetService {
  /**
   * Get the ISO week key for a given date (e.g. "2026-W35").
   */
  getWeekKey(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    const weekNum = 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
    return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
  }

  /**
   * Create or update a budget for a subject in a given week.
   */
  async setBudget(userId, { subject, plannedMinutes, priority, notes, alertThreshold }) {
    if (!subject || plannedMinutes == null) {
      throw new Error('subject and plannedMinutes are required');
    }
    if (plannedMinutes < 0) throw new Error('plannedMinutes must be non-negative');

    const weekKey = this.getWeekKey();

    const [budget, created] = await StudyTimeBudget.findOrCreate({
      where: { user: userId, subject, weekKey },
      defaults: {
        plannedMinutes,
        priority: priority || 3,
        notes: notes || null,
        alertThreshold: alertThreshold || 80,
      },
    });

    if (!created) {
      budget.plannedMinutes = plannedMinutes;
      if (priority != null) budget.priority = priority;
      if (notes != null) budget.notes = notes;
      if (alertThreshold != null) budget.alertThreshold = alertThreshold;
      await budget.save();
    }

    return budget;
  }

  /**
   * Get all budgets for a user in a given week.
   */
  async getWeekBudgets(userId, weekKey) {
    const key = weekKey || this.getWeekKey();
    return StudyTimeBudget.findAll({
      where: { user: userId, weekKey: key },
      order: [['priority', 'DESC'], ['subject', 'ASC']],
    });
  }

  /**
   * Log actual study minutes for a subject in the current week.
   */
  async logStudyTime(userId, { subject, minutes }) {
    if (!subject || minutes == null || minutes <= 0) {
      throw new Error('subject and positive minutes are required');
    }

    const weekKey = this.getWeekKey();

    let budget = await StudyTimeBudget.findOne({
      where: { user: userId, subject, weekKey },
    });

    if (!budget) {
      // Auto-create a budget if one doesn't exist
      budget = await StudyTimeBudget.create({
        user: userId,
        subject,
        plannedMinutes: 0,
        actualMinutes: minutes,
        weekKey,
        priority: 3,
      });
    } else {
      budget.actualMinutes += minutes;
      await budget.save();
    }

    return budget;
  }

  /**
   * Get the weekly dashboard: all budgets with computed metrics.
   */
  async getDashboard(userId, weekKey) {
    const key = weekKey || this.getWeekKey();
    const budgets = await this.getWeekBudgets(userId, key);

    const totalPlanned = budgets.reduce((s, b) => s + b.plannedMinutes, 0);
    const totalActual = budgets.reduce((s, b) => s + b.actualMinutes, 0);
    const overallEfficiency = totalPlanned > 0
      ? Math.round((totalActual / totalPlanned) * 100)
      : 0;

    const subjectStats = budgets.map((b) => {
      const efficiency = b.plannedMinutes > 0
        ? Math.round((b.actualMinutes / b.plannedMinutes) * 100)
        : b.actualMinutes > 0 ? 100 : 0;
      const overBudget = b.actualMinutes > b.plannedMinutes && b.plannedMinutes > 0;
      const nearThreshold = b.plannedMinutes > 0
        && (b.actualMinutes / b.plannedMinutes) * 100 >= b.alertThreshold
        && !overBudget;
      const remaining = Math.max(0, b.plannedMinutes - b.actualMinutes);

      return {
        id: b.id,
        subject: b.subject,
        plannedMinutes: b.plannedMinutes,
        actualMinutes: b.actualMinutes,
        efficiency,
        overBudget,
        nearThreshold,
        remaining,
        priority: b.priority,
        notes: b.notes,
      };
    });

    // Subjects with no budget but activity logs
    const subjectsWithBudget = new Set(budgets.map((b) => b.subject));

    return {
      weekKey: key,
      totalPlanned,
      totalActual,
      overallEfficiency,
      subjectStats,
      budgetCount: budgets.length,
    };
  }

  /**
   * Get historical efficiency data for the past N weeks.
   */
  async getHistoricalEfficiency(userId, weeks = 8) {
    const results = [];
    const now = new Date();

    for (let i = 0; i < weeks; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      const key = this.getWeekKey(d);

      const budgets = await StudyTimeBudget.findAll({
        where: { user: userId, weekKey: key },
      });

      const totalPlanned = budgets.reduce((s, b) => s + b.plannedMinutes, 0);
      const totalActual = budgets.reduce((s, b) => s + b.actualMinutes, 0);

      results.unshift({
        weekKey: key,
        totalPlanned,
        totalActual,
        efficiency: totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0,
        subjectCount: budgets.length,
      });
    }

    return results;
  }

  /**
   * Delete a budget entry.
   */
  async deleteBudget(userId, budgetId) {
    const deleted = await StudyTimeBudget.destroy({
      where: { id: budgetId, user: userId },
    });
    return deleted > 0;
  }

  /**
   * Copy this week's budgets to next week (clone forward).
   */
  async cloneToNextWeek(userId) {
    const currentWeek = this.getWeekKey();
    const nextWeekDate = new Date();
    nextWeekDate.setDate(nextWeekDate.getDate() + 7);
    const nextWeek = this.getWeekKey(nextWeekDate);

    const currentBudgets = await StudyTimeBudget.findAll({
      where: { user: userId, weekKey: currentWeek },
    });

    const cloned = [];
    for (const b of currentBudgets) {
      const [entry] = await StudyTimeBudget.findOrCreate({
        where: { user: userId, subject: b.subject, weekKey: nextWeek },
        defaults: {
          plannedMinutes: b.plannedMinutes,
          actualMinutes: 0,
          priority: b.priority,
          notes: b.notes,
          alertThreshold: b.alertThreshold,
        },
      });
      cloned.push(entry);
    }

    return cloned;
  }
}

module.exports = new StudyTimeBudgetService();
