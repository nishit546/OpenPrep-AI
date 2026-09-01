const logger = require('../utils/logger');
const {
  SLOW_QUERY_THRESHOLD_MS,
  recordSlowQuery,
  logSlowQuery,
} = require('../services/queryProfilerService');
const { recommendIndexes } = require('../services/indexAdvisorService');

/**
 * Query Telemetry Interceptor (#2193).
 *
 * Wraps a `pg` Pool's `query` method to time every query and, for anything
 * over SLOW_QUERY_THRESHOLD_MS, asynchronously re-run it as
 * `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` on a separate connection so the
 * caller's response is never delayed by profiling.
 *
 * Only plain SELECT statements are re-run under EXPLAIN ANALYZE: EXPLAIN
 * ANALYZE actually executes the statement, so doing this for INSERT/UPDATE/
 * DELETE would double-apply side effects. Non-SELECT slow queries are still
 * logged and counted, just without a captured plan.
 */

const EXPLAIN_ANALYZE_TIMEOUT_MS = parseInt(process.env.QUERY_PROFILER_EXPLAIN_TIMEOUT_MS, 10) || 5000;

function isPlainSelect(sql) {
  if (typeof sql !== 'string') return false;
  return /^\s*select\b/i.test(sql) && !/\binto\b/i.test(sql.slice(0, 40));
}

// Guards against the profiler's own EXPLAIN query being profiled and
// recursing forever.
let profilingInFlight = false;

async function captureExplainPlan(pool, sql, params) {
  if (profilingInFlight) return null;
  profilingInFlight = true;
  const client = await pool.connect();
  try {
    await client.query(`SET LOCAL statement_timeout = ${EXPLAIN_ANALYZE_TIMEOUT_MS}`);
    const explainSql = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`;
    const result = await client.query(explainSql, params);
    return result.rows?.[0]?.['QUERY PLAN'] || null;
  } catch (error) {
    logger.debug?.('Query profiler: EXPLAIN capture failed', { error: error.message });
    return null;
  } finally {
    profilingInFlight = false;
    client.release();
  }
}

/**
 * Monkey-patches `pool.query` in place. Call once, right after the pool is
 * constructed.
 * @param {import('pg').Pool} pool
 */
function attachQueryProfiler(pool) {
  if (!pool || pool.__queryProfilerAttached) return pool;

  const originalQuery = pool.query.bind(pool);

  pool.query = function profiledQuery(...args) {
    const start = process.hrtime.bigint();
    const sql = typeof args[0] === 'string' ? args[0] : args[0]?.text;
    const params = typeof args[0] === 'string' ? args[1] : args[0]?.values;

    const result = originalQuery(...args);

    // pg's query() returns a Promise when no callback is supplied (the only
    // style used elsewhere in this codebase); fall back to pass-through for
    // the callback style so we never change existing calling behavior.
    if (result && typeof result.then === 'function') {
      return result.then(
        (res) => {
          finishProfiling(pool, sql, params, start);
          return res;
        },
        (err) => {
          finishProfiling(pool, sql, params, start);
          throw err;
        }
      );
    }

    return result;
  };

  pool.__queryProfilerAttached = true;
  return pool;
}

function finishProfiling(pool, sql, params, startHrtime) {
  const durationMs = Number(process.hrtime.bigint() - startHrtime) / 1e6;
  if (durationMs < SLOW_QUERY_THRESHOLD_MS || !sql) return;

  // Record immediately without a plan so the query shows up right away;
  // the EXPLAIN capture below enriches the same entry once it resolves.
  const entry = recordSlowQuery({ sql, durationMs });
  logSlowQuery(entry, durationMs);

  if (!isPlainSelect(sql)) return;

  setImmediate(async () => {
    try {
      const plan = await captureExplainPlan(pool, sql, params);
      if (!plan) return;
      const recommendations = recommendIndexes(plan).map((r) => r.ddl);
      recordSlowQuery({ sql, durationMs, explainPlan: plan, indexRecommendations: recommendations });
    } catch (error) {
      logger.debug?.('Query profiler: post-processing failed', { error: error.message });
    }
  });
}

module.exports = { attachQueryProfiler, isPlainSelect };
