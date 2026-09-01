const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Query Telemetry / Slow Query Store (#2193).
 *
 * Keeps a small in-memory, process-local aggregate of queries that exceeded
 * SLOW_QUERY_THRESHOLD_MS, grouped by a normalized signature so that the same
 * query shape run with different parameter values collapses into one entry
 * instead of flooding the list. This intentionally does not persist to the
 * database — profiling itself must never become another source of slow
 * queries or unbounded growth, so storage is capped and reset on restart.
 */

const SLOW_QUERY_THRESHOLD_MS = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS, 10) || 100;

// Hard caps so a pathological workload (thousands of distinct ad-hoc query
// shapes) can't grow this into a memory leak.
const MAX_TRACKED_SIGNATURES = 500;
const MAX_SAMPLE_PLANS_PER_SIGNATURE = 3;

/** @type {Map<string, object>} normalized signature -> aggregate stats */
const slowQueryStore = new Map();

/**
 * Collapse a parameterized SQL string into a stable shape signature by
 * stripping literals, so `WHERE id = 5` and `WHERE id = 812` hash the same.
 * Not a full SQL parser — good enough for grouping/dedup purposes, not for
 * execution.
 * @param {string} sql
 * @returns {string}
 */
function normalizeQuery(sql) {
  if (!sql || typeof sql !== 'string') return '';
  return sql
    .replace(/\s+/g, ' ')
    // Sequelize/pg positional and named bind params: $1, $2, :name
    .replace(/\$\d+/g, '?')
    .replace(/:[a-zA-Z_][a-zA-Z0-9_]*/g, '?')
    // Quoted string literals
    .replace(/'(?:[^'\\]|\\.)*'/g, '?')
    // Numeric literals (avoid touching identifiers like table1)
    .replace(/(?<=[\s(,=<>]|^)-?\d+(\.\d+)?(?=[\s),;]|$)/g, '?')
    // IN (...) lists collapsed after literal substitution
    .replace(/\(\s*(\?\s*,\s*)+\?\s*\)/g, '(?)')
    .trim()
    .toLowerCase();
}

function hashSignature(normalized) {
  return crypto.createHash('sha1').update(normalized).digest('hex').slice(0, 16);
}

function extractScanType(explainPlan) {
  if (!explainPlan) return null;
  const nodeTypes = new Set();
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node['Node Type']) nodeTypes.add(node['Node Type']);
    if (Array.isArray(node.Plans)) node.Plans.forEach(walk);
  };
  const root = Array.isArray(explainPlan) ? explainPlan[0]?.Plan : explainPlan.Plan;
  walk(root);
  if (nodeTypes.has('Seq Scan')) return 'Seq Scan';
  if (nodeTypes.has('Bitmap Heap Scan')) return 'Bitmap Heap Scan';
  if (nodeTypes.has('Index Scan') || nodeTypes.has('Index Only Scan')) return 'Index Scan';
  return [...nodeTypes][0] || null;
}

/**
 * Record a query execution. Cheap on the hot path (a hash + Map lookup);
 * anything expensive (EXPLAIN, index analysis) must be computed by the
 * caller and passed in already-resolved, since this function must not add
 * measurable latency to the request that triggered it.
 *
 * @param {object} params
 * @param {string} params.sql
 * @param {number} params.durationMs
 * @param {object|null} [params.explainPlan] Parsed EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) output
 * @param {string[]} [params.indexRecommendations]
 */
function recordSlowQuery({ sql, durationMs, explainPlan = null, indexRecommendations = [] }) {
  const normalized = normalizeQuery(sql);
  const signature = hashSignature(normalized);

  let entry = slowQueryStore.get(signature);
  if (!entry) {
    if (slowQueryStore.size >= MAX_TRACKED_SIGNATURES) {
      // Evict the least-recently-seen signature to make room.
      let oldestKey = null;
      let oldestSeen = Infinity;
      for (const [key, value] of slowQueryStore.entries()) {
        if (value.lastSeenAt < oldestSeen) {
          oldestSeen = value.lastSeenAt;
          oldestKey = key;
        }
      }
      if (oldestKey) slowQueryStore.delete(oldestKey);
    }

    entry = {
      signature,
      normalizedQuery: normalized,
      sampleQuery: sql,
      count: 0,
      totalDurationMs: 0,
      maxDurationMs: 0,
      minDurationMs: Infinity,
      scanType: null,
      indexRecommendations: [],
      samplePlans: [],
      firstSeenAt: Date.now(),
      lastSeenAt: Date.now(),
    };
    slowQueryStore.set(signature, entry);
  }

  entry.count += 1;
  entry.totalDurationMs += durationMs;
  entry.maxDurationMs = Math.max(entry.maxDurationMs, durationMs);
  entry.minDurationMs = Math.min(entry.minDurationMs, durationMs);
  entry.lastSeenAt = Date.now();

  if (explainPlan) {
    entry.scanType = extractScanType(explainPlan);
    if (entry.samplePlans.length < MAX_SAMPLE_PLANS_PER_SIGNATURE) {
      entry.samplePlans.push({ capturedAt: Date.now(), durationMs, plan: explainPlan });
    }
  }

  if (indexRecommendations.length) {
    for (const rec of indexRecommendations) {
      if (!entry.indexRecommendations.includes(rec)) entry.indexRecommendations.push(rec);
    }
  }

  return entry;
}

/**
 * @param {number} limit
 * @returns {object[]} Slowest signatures by average duration, most expensive first.
 */
function getTopSlowQueries(limit = 10) {
  return [...slowQueryStore.values()]
    .map((entry) => ({
      signature: entry.signature,
      normalizedQuery: entry.normalizedQuery,
      sampleQuery: entry.sampleQuery,
      count: entry.count,
      avgDurationMs: Math.round((entry.totalDurationMs / entry.count) * 100) / 100,
      maxDurationMs: Math.round(entry.maxDurationMs * 100) / 100,
      minDurationMs: entry.minDurationMs === Infinity ? null : Math.round(entry.minDurationMs * 100) / 100,
      scanType: entry.scanType,
      indexRecommendations: entry.indexRecommendations,
      firstSeenAt: new Date(entry.firstSeenAt).toISOString(),
      lastSeenAt: new Date(entry.lastSeenAt).toISOString(),
    }))
    .sort((a, b) => b.avgDurationMs - a.avgDurationMs)
    .slice(0, limit);
}

function getAllIndexRecommendations() {
  const seen = new Set();
  const recommendations = [];
  for (const entry of slowQueryStore.values()) {
    for (const rec of entry.indexRecommendations) {
      if (!seen.has(rec)) {
        seen.add(rec);
        recommendations.push({
          ddl: rec,
          relatedQuerySignature: entry.signature,
          relatedQuerySample: entry.sampleQuery,
          occurrences: entry.count,
          avgDurationMs: Math.round((entry.totalDurationMs / entry.count) * 100) / 100,
        });
      }
    }
  }
  return recommendations.sort((a, b) => b.avgDurationMs - a.avgDurationMs);
}

function clearStore() {
  slowQueryStore.clear();
}

function logSlowQuery(entry, durationMs) {
  logger.warn('Slow query detected', {
    signature: entry.signature,
    durationMs: Math.round(durationMs * 100) / 100,
    thresholdMs: SLOW_QUERY_THRESHOLD_MS,
    scanType: entry.scanType,
  });
}

module.exports = {
  SLOW_QUERY_THRESHOLD_MS,
  normalizeQuery,
  extractFilterColumns,
  collectCandidateScans,
  recommendIndexes,
  recordSlowQuery,
  getTopSlowQueries,
  getAllIndexRecommendations,
  clearStore,
  logSlowQuery,
  extractScanType,
};
