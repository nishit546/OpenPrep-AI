const { Op } = require('sequelize');
const StudyPlan = require('../models/StudyPlan');
const StudyPlanVersion = require('../models/StudyPlanVersion');
const StudyTask = require('../models/StudyTask');

// ── Constants ────────────────────────────────────────────────────────────

const CHANGE_TYPES = {
  CREATED: 'created',
  UPDATED: 'updated',
  TASK_ADDED: 'task_added',
  TASK_REMOVED: 'task_removed',
  TASK_COMPLETED: 'task_completed',
  SCHEDULE_CHANGED: 'schedule_changed',
  RESTORED: 'restored',
};

const MAX_VERSIONS_PER_PLAN = 100;

// ── Version Creation ─────────────────────────────────────────────────────

/**
 * Create a version snapshot for a study plan.
 * Computes diff against the previous version if one exists.
 */
async function createVersion(userId, planId, changeType, changeDescription) {
  const plan = await StudyPlan.findOne({ where: { id: planId, user: userId } });
  if (!plan) throw new Error('Study plan not found');

  // Get next version number
  const lastVersion = await StudyPlanVersion.findOne({
    where: { planId },
    order: [['versionNumber', 'DESC']],
  });
  const versionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;

  // Build snapshot from plan data
  const snapshot = buildPlanSnapshot(plan);

  // Compute diff against previous version
  const diff = lastVersion ? computeDiff(lastVersion.snapshot, snapshot) : null;

  const version = await StudyPlanVersion.create({
    user: userId,
    planId,
    versionNumber,
    changeType: changeType || CHANGE_TYPES.UPDATED,
    changeDescription: changeDescription || `Version ${versionNumber} created`,
    snapshot,
    diff,
  });

  // Cleanup old versions if exceeding limit
  await cleanupOldVersions(planId);

  return version;
}

function buildPlanSnapshot(plan) {
  const json = plan.toJSON ? plan.toJSON() : { ...plan };
  return {
    title: json.title,
    description: json.description,
    startDate: json.startDate,
    endDate: json.endDate,
    status: json.status,
    dailyGoals: json.dailyGoals || [],
    tasks: json.tasks || [],
    subjects: json.subjects || [],
    studyHoursPerDay: json.studyHoursPerDay,
    metadata: json.metadata || {},
  };
}

// ── Diff Computation ─────────────────────────────────────────────────────

function computeDiff(oldSnapshot, newSnapshot) {
  const added = [];
  const removed = [];
  const modified = [];

  // Compare top-level fields
  const fieldsToCompare = ['title', 'description', 'startDate', 'endDate', 'status', 'studyHoursPerDay'];
  for (const field of fieldsToCompare) {
    if (oldSnapshot[field] !== newSnapshot[field]) {
      modified.push({
        field,
        oldValue: oldSnapshot[field],
        newValue: newSnapshot[field],
      });
    }
  }

  // Compare daily goals
  const oldGoals = oldSnapshot.dailyGoals || [];
  const newGoals = newSnapshot.dailyGoals || [];
  const goalDiff = compareArrays(oldGoals, newGoals, 'title');
  added.push(...goalDiff.added.map((g) => ({ type: 'dailyGoal', ...g })));
  removed.push(...goalDiff.removed.map((g) => ({ type: 'dailyGoal', ...g })));
  modified.push(...goalDiff.modified.map((g) => ({ type: 'dailyGoal', ...g })));

  // Compare tasks
  const oldTasks = oldSnapshot.tasks || [];
  const newTasks = newSnapshot.tasks || [];
  const taskDiff = compareArrays(oldTasks, newTasks, 'title');
  added.push(...taskDiff.added.map((t) => ({ type: 'task', ...t })));
  removed.push(...taskDiff.removed.map((t) => ({ type: 'task', ...t })));
  modified.push(...taskDiff.modified.map((t) => ({ type: 'task', ...t })));

  if (added.length === 0 && removed.length === 0 && modified.length === 0) {
    return null;
  }

  return { added, removed, modified };
}

function compareArrays(oldArr, newArr, keyField) {
  const added = [];
  const removed = [];
  const modified = [];

  const oldMap = new Map(oldArr.map((item) => [item[keyField] || item.id || JSON.stringify(item), item]));
  const newMap = new Map(newArr.map((item) => [item[keyField] || item.id || JSON.stringify(item), item]));

  for (const [key, newItem] of newMap) {
    if (!oldMap.has(key)) {
      added.push(newItem);
    } else {
      const oldItem = oldMap.get(key);
      const changes = getObjectChanges(oldItem, newItem);
      if (changes.length > 0) {
        modified.push({ key, changes, oldValue: oldItem, newValue: newItem });
      }
    }
  }

  for (const [key, oldItem] of oldMap) {
    if (!newMap.has(key)) {
      removed.push(oldItem);
    }
  }

  return { added, removed, modified };
}

function getObjectChanges(obj1, obj2) {
  const changes = [];
  const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
  for (const key of allKeys) {
    if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
      changes.push({ field: key, oldValue: obj1[key], newValue: obj2[key] });
    }
  }
  return changes;
}

// ── Version Retrieval ────────────────────────────────────────────────────

async function getVersionHistory(userId, planId, { page = 1, limit = 20 } = {}) {
  const plan = await StudyPlan.findOne({ where: { id: planId, user: userId } });
  if (!plan) return null;

  const offset = (Math.max(1, page) - 1) * limit;

  const { count, rows: versions } = await StudyPlanVersion.findAndCountAll({
    where: { planId, user: userId },
    order: [['versionNumber', 'DESC']],
    offset,
    limit,
  });

  return {
    plan: { id: plan.id, title: plan.title },
    versions,
    pagination: {
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
      limit,
    },
  };
}

async function getVersionById(userId, versionId) {
  return StudyPlanVersion.findOne({ where: { id: versionId, user: userId } });
}

async function getLatestVersion(userId, planId) {
  return StudyPlanVersion.findOne({
    where: { planId, user: userId },
    order: [['versionNumber', 'DESC']],
  });
}

async function getVersionByNumber(userId, planId, versionNumber) {
  return StudyPlanVersion.findOne({
    where: { planId, user: userId, versionNumber },
  });
}

// ── Version Comparison ───────────────────────────────────────────────────

async function compareVersions(userId, planId, versionA, versionB) {
  const [vA, vB] = await Promise.all([
    StudyPlanVersion.findOne({ where: { planId, user: userId, versionNumber: versionA } }),
    StudyPlanVersion.findOne({ where: { planId, user: userId, versionNumber: versionB } }),
  ]);

  if (!vA || !vB) {
    throw new Error('One or both versions not found');
  }

  const diff = computeDiff(vA.snapshot, vB.snapshot);

  return {
    versionA: { number: vA.versionNumber, date: vA.createdAt, changeType: vA.changeType },
    versionB: { number: vB.versionNumber, date: vB.createdAt, changeType: vB.changeType },
    diff: diff || { added: [], removed: [], modified: [], message: 'No differences found' },
    snapshots: {
      versionA: vA.snapshot,
      versionB: vB.snapshot,
    },
  };
}

// ── Rollback ─────────────────────────────────────────────────────────────

async function restoreVersion(userId, planId, versionNumber) {
  const version = await StudyPlanVersion.findOne({
    where: { planId, user: userId, versionNumber },
  });

  if (!version) throw new Error('Version not found');

  const plan = await StudyPlan.findOne({ where: { id: planId, user: userId } });
  if (!plan) throw new Error('Study plan not found');

  // Apply snapshot fields to plan
  const snapshot = version.snapshot;
  plan.title = snapshot.title || plan.title;
  plan.description = snapshot.description || plan.description;
  plan.startDate = snapshot.startDate || plan.startDate;
  plan.endDate = snapshot.endDate || plan.endDate;
  plan.status = snapshot.status || plan.status;
  plan.dailyGoals = snapshot.dailyGoals || plan.dailyGoals;
  plan.tasks = snapshot.tasks || plan.tasks;
  plan.studyHoursPerDay = snapshot.studyHoursPerDay || plan.studyHoursPerDay;
  await plan.save();

  // Create a new version for the restore action
  const restoredVersion = await createVersion(
    userId, planId, CHANGE_TYPES.RESTORED,
    `Restored from version ${versionNumber}`,
  );

  return { plan, restoredVersion };
}

// ── Summary & Analytics ──────────────────────────────────────────────────

async function getPlanVersionSummary(userId, planId) {
  const versions = await StudyPlanVersion.findAll({
    where: { planId, user: userId },
    order: [['versionNumber', 'ASC']],
  });

  if (versions.length === 0) return null;

  const changeTypeCount = {};
  for (const v of versions) {
    changeTypeCount[v.changeType] = (changeTypeCount[v.changeType] || 0) + 1;
  }

  const firstVersion = versions[0];
  const latestVersion = versions[versions.length - 1];

  // Track what changed over time
  const evolution = versions.map((v) => ({
    version: v.versionNumber,
    date: v.createdAt,
    changeType: v.changeType,
    description: v.changeDescription,
    taskCount: (v.snapshot.tasks || []).length,
    goalCount: (v.snapshot.dailyGoals || []).length,
  }));

  return {
    totalVersions: versions.length,
    changeTypeCount,
    firstVersion: {
      number: firstVersion.versionNumber,
      date: firstVersion.createdAt,
    },
    latestVersion: {
      number: latestVersion.versionNumber,
      date: latestVersion.createdAt,
    },
    evolution,
  };
}

// ── Cleanup ──────────────────────────────────────────────────────────────

async function cleanupOldVersions(planId) {
  const count = await StudyPlanVersion.count({ where: { planId } });
  if (count > MAX_VERSIONS_PER_PLAN) {
    const excess = count - MAX_VERSIONS_PER_PLAN;
    const oldest = await StudyPlanVersion.findAll({
      where: { planId },
      order: [['versionNumber', 'ASC']],
      limit: excess,
      attributes: ['id'],
    });
    const ids = oldest.map((v) => v.id);
    await StudyPlanVersion.destroy({ where: { id: { [Op.in]: ids } } });
  }
}

async function deleteVersion(userId, versionId) {
  const version = await StudyPlanVersion.findOne({ where: { id: versionId, user: userId } });
  if (!version) return false;
  await version.destroy();
  return true;
}

// ── Exports ──────────────────────────────────────────────────────────────

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

module.exports = {
  createVersion,
  getVersionHistory,
  getVersionById,
  getLatestVersion,
  getVersionByNumber,
  compareVersions,
  restoreVersion,
  getPlanVersionSummary,
  deleteVersion,
  computeDiff,
  buildPlanSnapshot,
  CHANGE_TYPES,
  MAX_VERSIONS_PER_PLAN,
  NotFoundError,
};
