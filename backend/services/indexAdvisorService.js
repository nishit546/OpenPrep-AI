/**
 * Indexing Advisor Service (#2193).
 *
 * Walks an EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) plan tree looking for
 * sequential scans (or bitmap heap scans backed by a large sequential
 * component) on tables above a row-count threshold, pulls the filter
 * predicate columns off the offending node, and proposes a `CREATE INDEX
 * CONCURRENTLY` statement. This never executes DDL itself — it only
 * generates a migration snippet for a human to review, since blindly
 * creating indexes from inferred predicates can as easily hurt write
 * throughput as help read latency.
 */

const LARGE_TABLE_ROW_THRESHOLD = parseInt(process.env.INDEX_ADVISOR_ROW_THRESHOLD, 10) || 10000;

// Matches `column op value`-style clauses in a Postgres `Filter:` string,
// e.g. `(topic_id = 42)`, `((created_at >= '2026-01-01'::timestamp))`.
const FILTER_CLAUSE_RE = /\(?\(?\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(=|>=|<=|>|<|<>|ANY|@>)\s*/gi;

/**
 * Pull candidate column names out of a Postgres `Filter` / `Index Cond` string.
 * @param {string} filterText
 * @returns {string[]} unique column names, in the order they appear
 */
function extractFilterColumns(filterText) {
  if (!filterText || typeof filterText !== 'string') return [];
  const columns = [];
  let match;
  FILTER_CLAUSE_RE.lastIndex = 0;
  while ((match = FILTER_CLAUSE_RE.exec(filterText)) !== null) {
    const col = match[1];
    // Skip obvious non-columns picked up by the regex (function calls, casts).
    if (['and', 'or', 'not', 'null'].includes(col.toLowerCase())) continue;
    if (!columns.includes(col)) columns.push(col);
  }
  return columns;
}

function slugify(parts) {
  return parts.join('_').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
}

/**
 * Recursively find scan nodes worth flagging.
 * @param {object} planNode A single `Plan` node from EXPLAIN JSON output.
 * @param {object[]} out Accumulator.
 */
function collectCandidateScans(planNode, out) {
  if (!planNode || typeof planNode !== 'object') return;

  const nodeType = planNode['Node Type'];
  const relationName = planNode['Relation Name'];
  const planRows = planNode['Plan Rows'] || 0;
  const actualRows = planNode['Actual Rows'] || 0;
  const rowEstimate = Math.max(planRows, actualRows);

  const isSeqScan = nodeType === 'Seq Scan';
  const isBitmapHeapOnLargeTable = nodeType === 'Bitmap Heap Scan';

  if ((isSeqScan || isBitmapHeapOnLargeTable) && relationName && rowEstimate > LARGE_TABLE_ROW_THRESHOLD) {
    const filterText = planNode.Filter || planNode['Index Cond'] || planNode['Recheck Cond'];
    const columns = extractFilterColumns(filterText);
    if (columns.length) {
      out.push({
        nodeType,
        relationName,
        rowEstimate,
        actualRows,
        filterText,
        columns,
      });
    }
  }

  if (Array.isArray(planNode.Plans)) {
    for (const child of planNode.Plans) collectCandidateScans(child, out);
  }
}

/**
 * @param {object} explainOutput Parsed EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) result
 *   — either the raw array Postgres returns, or a single `{ Plan }` object.
 * @returns {{ddl: string, table: string, columns: string[], rowEstimate: number, nodeType: string}[]}
 */
function recommendIndexes(explainOutput) {
  if (!explainOutput) return [];
  const root = Array.isArray(explainOutput) ? explainOutput[0]?.Plan : explainOutput.Plan;
  if (!root) return [];

  const candidates = [];
  collectCandidateScans(root, candidates);
  if (!candidates.length) return [];
  const seen = new Set();
  const recommendations = [];
  for (const candidate of candidates) {
    const indexName = `idx_${slugify([candidate.relationName, ...candidate.columns])}`;
    const ddl = `CREATE INDEX CONCURRENTLY IF NOT EXISTS ${indexName} ON ${candidate.relationName} (${candidate.columns.join(', ')});`;
    if (seen.has(ddl)) continue;
    seen.add(ddl);
    recommendations.push({
      ddl,
      table: candidate.relationName,
      columns: candidate.columns,
      rowEstimate: candidate.rowEstimate,
      nodeType: candidate.nodeType,
      reason: `${candidate.nodeType} on "${candidate.relationName}" touching ~${candidate.rowEstimate} rows, filtered on ${candidate.columns.join(', ')}`,
    });
  }

  return recommendations;
}

module.exports = {
  LARGE_TABLE_ROW_THRESHOLD,
  extractFilterColumns,
  collectCandidateScans,
  recommendIndexes,
};
