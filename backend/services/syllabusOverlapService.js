/**
 * @fileoverview Syllabus overlap and shared-topic matrix for multi-exam aspirants.
 *
 * Pure logic, no database or network access. Topics from two or more syllabi are
 * normalised, matched with token Jaccard (title) plus subtopic overlap, and grouped
 * into rows. A row present in 2+ syllabi is a "shared core" topic, a row present in
 * one syllabus is exam-exclusive. An optional `deps.embed(text) => number[]` can be
 * injected to catch paraphrased titles the token match misses.
 */

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'the',
  'of',
  'in',
  'on',
  'for',
  'to',
  'with',
  'by',
  'at',
  'as',
  'from',
  'or',
  'its',
  'is',
  'are',
  'their',
  'basic',
  'basics',
  'introduction',
  'intro',
  'overview',
  'fundamentals',
  'concepts',
  'concept',
  'topics',
  'topic',
  'unit',
  'chapter',
  'part',
]);

const DEFAULTS = {
  matchThreshold: 0.5,
  embedThreshold: 0.85,
  baseHoursPerTopic: 2,
  hoursPerWeightPoint: 0.5,
  titleWeight: 0.6,
};

/** Cheap plural stripping so "equations" and "equation" match. */
const stem = (word) => {
  if (word.length > 4 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us')) {
    return word.slice(0, -1);
  }
  return word;
};

/** Lowercase, drop punctuation and stop words, return a Set of stemmed tokens. */
const tokenize = (value) => {
  const tokens = String(value == null ? '' : value)
    .toLocaleLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 1 || /\d/.test(t))
    .filter((t) => !STOP_WORDS.has(t))
    .map(stem);
  return new Set(tokens);
};

const normalizeText = (value) => [...tokenize(value)].sort().join(' ');

const jaccard = (a, b) => {
  if (!a.size && !b.size) return 0;
  let inter = 0;
  a.forEach((t) => {
    if (b.has(t)) inter += 1;
  });
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
};

const subtopicName = (sub) => {
  if (typeof sub === 'string') return sub;
  if (sub && typeof sub === 'object') return sub.name || sub.title || '';
  return '';
};

const cosine = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || !a.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
};

const toWeight = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * Clean one syllabus: drop blank titles, merge duplicate titles (subtopics unioned,
 * the larger weightage kept).
 */
const prepareTopics = (topics) => {
  const byKey = new Map();
  (Array.isArray(topics) ? topics : []).forEach((raw) => {
    const title = String(raw && raw.title != null ? raw.title : '').trim();
    if (!title) return;
    const key = normalizeText(title) || title.toLocaleLowerCase();
    const subs = (Array.isArray(raw.subtopics) ? raw.subtopics : [])
      .map(subtopicName)
      .map((s) => String(s).trim())
      .filter(Boolean);
    const existing = byKey.get(key);
    if (existing) {
      const seen = new Set(existing.subtopics.map((s) => normalizeText(s)));
      subs.forEach((s) => {
        if (!seen.has(normalizeText(s))) existing.subtopics.push(s);
      });
      existing.weightage = Math.max(existing.weightage, toWeight(raw.weightage));
      return;
    }
    byKey.set(key, {
      title,
      moduleName: raw.moduleName ? String(raw.moduleName) : '',
      subtopics: [...new Set(subs)],
      weightage: toWeight(raw.weightage),
    });
  });
  return [...byKey.values()].map((t) => ({
    ...t,
    titleTokens: tokenize(t.title),
    subTokens: tokenize(t.subtopics.join(' ')),
  }));
};

/**
 * Deterministic similarity of two prepared topics, 0..1. Title tokens count most;
 * subtopic overlap helps when both sides list subtopics.
 */
const topicSimilarity = (a, b, titleWeight = DEFAULTS.titleWeight) => {
  if (a.titleTokens.size && normalizeText(a.title) === normalizeText(b.title)) return 1;
  const titleSim = jaccard(a.titleTokens, b.titleTokens);
  if (a.subTokens.size && b.subTokens.size) {
    const subSim = jaccard(a.subTokens, b.subTokens);
    return titleWeight * titleSim + (1 - titleWeight) * subSim;
  }
  return titleSim;
};

const topicHours = (weightage, opts) =>
  opts.baseHoursPerTopic + opts.hoursPerWeightPoint * toWeight(weightage);

const round = (n, places = 1) => {
  const f = 10 ** places;
  return Math.round(n * f) / f;
};

/**
 * Compare 2+ syllabi.
 *
 * @param {Array<{id: string, name?: string, topics: Array}>} syllabi
 * @param {object} [options]
 * @param {object} [deps] optional `embed(text) => Promise<number[]>`
 * @returns {Promise<object>} summary, topic rows, shared and exclusive lists
 */
async function compareSyllabi(syllabi, options = {}, deps = {}) {
  if (!Array.isArray(syllabi) || syllabi.length < 2) {
    throw new Error('At least two syllabi are required to compare.');
  }
  const opts = { ...DEFAULTS, ...options };
  const embed = typeof deps.embed === 'function' ? deps.embed : null;
  const vectorCache = new Map();
  const vectorFor = async (title) => {
    if (!vectorCache.has(title)) {
      try {
        vectorCache.set(title, await embed(title));
      } catch (_err) {
        vectorCache.set(title, null);
      }
    }
    return vectorCache.get(title);
  };

  const prepared = syllabi.map((s, index) => ({
    id: String(s.id != null ? s.id : `syllabus-${index}`),
    name: s.name || `Syllabus ${index + 1}`,
    topics: prepareTopics(s.topics),
  }));

  const clusters = [];
  for (const syllabus of prepared) {
    for (const topic of syllabus.topics) {
      let best = null;
      let bestScore = 0;
      for (const cluster of clusters) {
        if (cluster.members.some((m) => m.syllabusId === syllabus.id)) continue;
        let score = Math.max(
          ...cluster.members.map((m) => topicSimilarity(m.topic, topic, opts.titleWeight))
        );
        if (score < opts.matchThreshold && embed) {
          const mine = await vectorFor(topic.title);
          for (const m of cluster.members) {
            const sim = cosine(mine, await vectorFor(m.topic.title));
            if (sim >= opts.embedThreshold) score = Math.max(score, sim);
          }
        }
        if (score >= opts.matchThreshold && score > bestScore) {
          best = cluster;
          bestScore = score;
        }
      }
      const member = { syllabusId: syllabus.id, topic };
      if (best) best.members.push(member);
      else clusters.push({ members: [member] });
    }
  }

  const rows = clusters.map((cluster, index) => {
    const first = cluster.members[0].topic;
    const presentIn = cluster.members.map((m) => m.syllabusId);
    const subCounts = new Map();
    cluster.members.forEach((m) =>
      new Set(m.topic.subtopics.map((s) => normalizeText(s))).forEach((k) =>
        subCounts.set(k, (subCounts.get(k) || 0) + 1)
      )
    );
    const sharedSubtopics = first.subtopics.filter((s) => subCounts.get(normalizeText(s)) > 1);
    const weightage = Math.max(...cluster.members.map((m) => m.topic.weightage));
    return {
      key: `topic-${index + 1}`,
      title: first.title,
      moduleName: first.moduleName,
      type: presentIn.length > 1 ? 'shared' : 'exclusive',
      presentIn,
      sharedSubtopics,
      weightage,
      estimatedHours: round(topicHours(weightage, opts)),
      entries: cluster.members.map((m) => ({
        syllabusId: m.syllabusId,
        title: m.topic.title,
        weightage: m.topic.weightage,
        subtopics: m.topic.subtopics,
      })),
    };
  });

  const sharedRows = rows.filter((r) => r.type === 'shared');
  const perSyllabus = prepared.map((syllabus) => {
    const mine = rows.filter((r) => r.presentIn.includes(syllabus.id));
    const total = mine.reduce(
      (s, r) => s + (r.entries.find((e) => e.syllabusId === syllabus.id)?.weightage || 0),
      0
    );
    const sharedWeight = mine
      .filter((r) => r.type === 'shared')
      .reduce(
        (s, r) => s + (r.entries.find((e) => e.syllabusId === syllabus.id)?.weightage || 0),
        0
      );
    // No weightage data at all: fall back to plain topic counts.
    const weightedCoverage = total
      ? (sharedWeight / total) * 100
      : mine.length
        ? (mine.filter((r) => r.type === 'shared').length / mine.length) * 100
        : 0;
    return {
      id: syllabus.id,
      name: syllabus.name,
      topicCount: mine.length,
      sharedCount: mine.filter((r) => r.type === 'shared').length,
      exclusiveCount: mine.filter((r) => r.type === 'exclusive').length,
      totalWeightage: total,
      weightedCoverage: round(weightedCoverage),
    };
  });

  const sumHours = (list) => list.reduce((s, r) => s + r.estimatedHours, 0);
  const separateHours = round(
    prepared.reduce(
      (sum, syllabus) =>
        sum + syllabus.topics.reduce((s, t) => s + topicHours(t.weightage, opts), 0),
      0
    )
  );
  const combinedHours = round(sumHours(rows));

  return {
    syllabi: perSyllabus,
    topics: rows,
    shared: sharedRows,
    exclusive: rows.filter((r) => r.type === 'exclusive'),
    overlapPercentage: rows.length ? round((sharedRows.length / rows.length) * 100) : 0,
    studyHours: {
      combined: combinedHours,
      separate: separateHours,
      saved: round(Math.max(0, separateHours - combinedHours)),
    },
  };
}

module.exports = {
  compareSyllabi,
  topicSimilarity,
  prepareTopics,
  tokenize,
  normalizeText,
  jaccard,
  cosine,
  DEFAULTS,
};
