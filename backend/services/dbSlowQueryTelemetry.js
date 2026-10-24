const fs = require('fs');
const path = require('path');

/**
 * Sequelize slow-query telemetry (#2363).
 *
 * Every application query goes through Sequelize, so timing is done in the
 * beforeQuery/afterQuery hooks. A query slower than the threshold is appended
 * to logs/slow-queries.log (SQL with literals stripped, duration, short
 * stack) and recorded in the in-memory slow query store. Nothing here may
 * block or throw into the query path: file writes are async and every step
 * is wrapped in try/catch.
 */

const DEFAULT_THRESHOLD_MS = 150;
const DEFAULT_LOG_FILE = path.join(__dirname, '..', 'logs', 'slow-queries.log');
const MAX_SQL_LENGTH = 2000;
const MAX_STACK_FRAMES = 5;

/**
 * Remove literal values so emails, tokens, etc. never reach the log.
 * Bind placeholders ($1, :name, ?) are kept as they are.
 */
function stripSqlValues(sql) {
  if (typeof sql !== 'string') return '';
  const stripped = sql
    .replace(/\s+/g, ' ')
    .replace(/'(?:[^']|'')*'/g, '?')
    .replace(/(?<![\w$:."])-?\d+(?:\.\d+)?(?![\w"])/g, '?')
    .replace(/\(\s*\?(?:\s*,\s*\?)+\s*\)/g, '(?)')
    .trim();
  return stripped.length > MAX_SQL_LENGTH ? `${stripped.slice(0, MAX_SQL_LENGTH)}...` : stripped;
}

function shortStack() {
  const lines = String(new Error().stack || '').split('\n').slice(1);
  return lines
    .map((l) => l.trim())
    .filter((l) => l && !l.includes('node_modules') && !l.includes('dbSlowQueryTelemetry'))
    .slice(0, MAX_STACK_FRAMES);
}

function createFileWriter(file = DEFAULT_LOG_FILE) {
  let dirReady = null;
  return (line) => {
    if (!dirReady) dirReady = fs.promises.mkdir(path.dirname(file), { recursive: true });
    dirReady
      .then(() => fs.promises.appendFile(file, `${line}\n`))
      .catch(() => {
        dirReady = null;
      });
  };
}

/**
 * Build the hook pair. Dependencies are injectable so the behaviour can be
 * tested without a database or the filesystem.
 */
function createSlowQueryHooks({
  thresholdMs = DEFAULT_THRESHOLD_MS,
  write = createFileWriter(),
  record = null,
  now = () => process.hrtime.bigint(),
} = {}) {
  const beforeQuery = (options) => {
    try {
      if (options) options.slowQueryStart = now();
    } catch (e) {
      /* never affect the query */
    }
  };

  const afterQuery = (options, query) => {
    try {
      if (!options || options.slowQueryStart === undefined) return;
      const durationMs = Number(now() - options.slowQueryStart) / 1e6;
      if (durationMs <= thresholdMs) return;

      const sql = stripSqlValues((query && query.sql) || options.sql || '');
      if (!sql) return;

      write(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          durationMs: Math.round(durationMs * 100) / 100,
          sql,
          stack: shortStack(),
        })
      );
      if (record) record({ sql, durationMs });
    } catch (e) {
      /* never affect the query */
    }
  };

  return { beforeQuery, afterQuery };
}

module.exports = {
  DEFAULT_THRESHOLD_MS,
  stripSqlValues,
  createFileWriter,
  createSlowQueryHooks,
};
