/**
 * @fileoverview Hybrid keyword (BM25 / PostgreSQL full-text) + semantic search (pgvector),
 * fused via Reciprocal Rank Fusion (RRF) for study documents, notes, questions, and flashcards.
 *
 * Key Optimizations:
 * 1. Bounded Worker Pool: Concurrent embedding calls use `mapWithConcurrency` to avoid rate limits.
 * 2. Token Memoization: Pre-computes and caches document tokens using WeakMap.
 * 3. Fallback Resilience: Gracefully falls back to keyword-only search if vector generation fails.
 * 4. DB RAG Hybrid Search: Integrates PostgreSQL `pgvector` cosine similarity with full-text search.
 */

const { Pool } = require('pg');
const { GoogleGenAI } = require('@google/genai');
const { Question, Flashcard, Note } = require('../models');
const geminiService = require('./geminiService');
const searchIndex = require('./searchIndexService');

const pool = new Pool();
const aiClient = new GoogleGenAI();

const INDEX_LIMIT = 250;
const RRF_K = 60;
const CACHE_TTL_MS = 30000;

const EMBED_CONCURRENCY = parseInt(process.env.SEARCH_EMBED_CONCURRENCY, 10) || 5;

const cache = new Map();
const tokenCache = new WeakMap();

// Tokenization and Text Processing Helpers
const stem = (token) => (token.length > 5 ? token.replace(/(ing|ed|es|s)$/u, '') : token);
const tokenize = (value) =>
  String(value || '')
    .toLocaleLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length > 1)
    .map(stem);

const editDistance = (left, right) => {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const previous = row[j];
      row[j] = left[i - 1] === right[j - 1] ? diagonal : 1 + Math.min(diagonal, row[j], row[j - 1]);
      diagonal = previous;
    }
  }
  return row[right.length];
};

const escapeHtml = (value) =>
  String(value || '').replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])
  );

const cosine = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b) || !a.length || a.length !== b.length) return 0;
  let dot = 0;
  let left = 0;
  let right = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    left += a[i] ** 2;
    right += b[i] ** 2;
  }
  return left && right ? dot / (Math.sqrt(left) * Math.sqrt(right)) : 0;
};

const makeSnippet = (text, query) => {
  const safe = escapeHtml(text).slice(0, 320);
  const terms = tokenize(query).map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return terms.length ? safe.replace(new RegExp(`(${terms.join('|')})`, 'gi'), '<mark>$1</mark>') : safe;
};

function analyze(record) {
  const cached = tokenCache.get(record);
  if (cached) return cached;

  const tokens = tokenize(record.text);
  const frequencies = new Map();
  for (const token of tokens) {
    frequencies.set(token, (frequencies.get(token) || 0) + 1);
  }

  const analysis = { tokens, frequencies, unique: new Set(tokens) };
  tokenCache.set(record, analysis);
  return analysis;
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      try {
        results[index] = await worker(items[index], index);
      } catch {
        results[index] = null;
      }
    }
  });

  await Promise.all(runners);
  return results;
}

const textForRecord = (type, record) =>
  type === 'question'
    ? [record.question, record.answer, ...(record.options || [])].filter(Boolean).join(' ')
    : type === 'flashcard'
    ? [record.front, record.back, ...(record.tags || [])].filter(Boolean).join(' ')
    : [record.title, record.content, ...(record.tags || [])].filter(Boolean).join(' ');

async function embedOrNull(text, ai = geminiService) {
  try {
    if (ai.generateEmbedding) {
      return await ai.generateEmbedding(text);
    }
    const response = await aiClient.models.embedContent({
      model: 'text-embedding-004',
      contents: text,
    });
    return response.embedding.values;
  } catch (error) {
    console.warn('[HybridSearch] Embedding failed, indexing text only:', error.message);
    return null;
  }
}

async function loadIndex(userId, deps = {}) {
  const models = deps.models || { Question, Flashcard, Note };
  const ai = deps.ai || geminiService;
  const index = deps.searchIndex || searchIndex;
  const concurrency = deps.concurrency || EMBED_CONCURRENCY;

  if (index.isUserLoaded(userId)) return index.getUserRecords(userId);

  const [questions, flashcards, notes] = await Promise.all([
    models.Question.findAll({ where: { user: userId }, limit: INDEX_LIMIT }),
    models.Flashcard.findAll({ where: { user: userId }, limit: INDEX_LIMIT }),
    models.Note.findAll({ where: { user: userId }, limit: INDEX_LIMIT }),
  ]);

  const records = [
    ...questions.map((record) => ({ type: 'question', record })),
    ...flashcards.map((record) => ({ type: 'flashcard', record })),
    ...notes.map((record) => ({ type: 'note', record })),
  ];

  await mapWithConcurrency(records, concurrency, async ({ type, record }) => {
    const json = record.toJSON?.() || record;
    const embedding = await embedOrNull(textForRecord(type, json), ai);
    index.indexRecord(type, { ...json, embedding });
    return true;
  });

  index.markUserLoaded(userId);
  return index.getUserRecords(userId);
}

function rankByKeyword(records, queryTokens, normalizedQuery) {
  const analyses = records.map(analyze);
  const totalLength = analyses.reduce((sum, analysis) => sum + analysis.tokens.length, 0);
  const averageDocumentLength = totalLength / Math.max(records.length, 1);

  const documentFrequency = new Map(
    queryTokens.map((token) => [
      token,
      analyses.reduce((count, analysis) => count + (analysis.unique.has(token) ? 1 : 0), 0),
    ])
  );

  const lowerQuery = normalizedQuery.toLocaleLowerCase();

  return records
    .map((record, position) => {
      const { tokens, frequencies, unique } = analyses[position];
      const lengthNormalization = 1.2 * (0.25 + 0.75 * (tokens.length / Math.max(averageDocumentLength, 1)));

      const score = queryTokens.reduce((total, token) => {
        let count = frequencies.get(token) || 0;

        if (!unique.has(token) && token.length > 3) {
          for (const [candidate, occurrences] of frequencies) {
            if (candidate.length > 3 && Math.abs(candidate.length - token.length) <= 1) {
              if (editDistance(candidate, token) <= 1) count += occurrences;
            }
          }
        }

        if (!count) return total;

        const frequency = documentFrequency.get(token) || 0;
        const idf = Math.log(1 + (records.length - frequency + 0.5) / (frequency + 0.5));
        return total + ((count * (2.2 + 1)) / (count + lengthNormalization)) * idf;
      }, 0);

      const phraseBonus = record.text.toLocaleLowerCase().includes(lowerQuery) ? 2 : 0;
      return { record, score: score + phraseBonus };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
}

function rankBySemantic(records, queryEmbedding) {
  if (!Array.isArray(queryEmbedding) || !queryEmbedding.length) return [];

  return records
    .map((record) => ({ record, score: cosine(queryEmbedding, record.embedding) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
}

function fuse(rankings) {
  const merged = new Map();

  for (const ranking of rankings) {
    ranking.forEach(({ record }, rank) => {
      const key = `${record.type}:${record.id}`;
      const existing = merged.get(key);
      merged.set(key, {
        record,
        score: (existing?.score || 0) + 1 / (RRF_K + rank + 1),
      });
    });
  }

  return [...merged.values()].sort((a, b) => b.score - a.score);
}

/** PostgreSQL pgvector Hybrid Search (Document Embeddings RAG) */
async function hybridDbSearch(queryText, limit = 5) {
  const queryEmbedding = await embedOrNull(queryText);
  if (!queryEmbedding) return [];

  const vectorStr = `[${queryEmbedding.join(',')}]`;

  const query = `
    WITH vector_search AS (
      SELECT id, document_id, chunk_index, content, metadata,
             1 - (embedding <=> $1::vector) AS vector_score,
             ROW_NUMBER() OVER (ORDER BY embedding <=> $1::vector) AS vector_rank
      FROM document_embeddings
      ORDER BY embedding <=> $1::vector
      LIMIT 50
    ),
    fts_search AS (
      SELECT id, document_id, chunk_index, content, metadata,
             ts_rank(to_tsvector('english', content), plainto_tsquery('english', $2)) AS fts_score,
             ROW_NUMBER() OVER (ORDER BY ts_rank(to_tsvector('english', content), plainto_tsquery('english', $2)) DESC) AS fts_rank
      FROM document_embeddings
      WHERE to_tsvector('english', content) @@ plainto_tsquery('english', $2)
      LIMIT 50
    ),
    rrf AS (
      SELECT COALESCE(v.id, f.id) AS id,
             COALESCE(v.document_id, f.document_id) AS document_id,
             COALESCE(v.chunk_index, f.chunk_index) AS chunk_index,
             COALESCE(v.content, f.content) AS content,
             COALESCE(v.metadata, f.metadata) AS metadata,
             (1.0 / (${RRF_K}.0 + COALESCE(v.vector_rank, 100))) + 
             (1.0 / (${RRF_K}.0 + COALESCE(f.fts_rank, 100))) AS rrf_score
      FROM vector_search v
      FULL OUTER JOIN fts_search f ON v.id = f.id
    )
    SELECT * FROM rrf
    ORDER BY rrf_score DESC
    LIMIT $3;
  `;

  const { rows } = await pool.query(query, [vectorStr, queryText, limit]);
  return rows;
}

async function search({ userId, query, type = 'all', subject }, deps = {}) {
  const ai = deps.ai || geminiService;

  const normalizedQuery = String(query || '').trim();
  if (!normalizedQuery) return [];

  const cacheKey = `${userId}:${type}:${subject || ''}:${normalizedQuery.toLocaleLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.results;

  const records = (await loadIndex(userId, deps)).filter(
    (record) =>
      (type === 'formulas'
        ? record.type === 'question' && /formula|[=∑√^]/i.test(record.text)
        : type === 'all' || record.type === type) &&
      (!subject || String(record.subject) === String(subject))
  );

  if (!records.length) return [];

  const queryTokens = tokenize(normalizedQuery);
  const queryEmbedding = await embedOrNull(normalizedQuery, ai);

  const results = fuse([
    rankByKeyword(records, queryTokens, normalizedQuery),
    rankBySemantic(records, queryEmbedding),
  ])
    .slice(0, 30)
    .map(({ record, score }) => ({
      id: record.id,
      type: record.type,
      subject: record.subject,
      title: record.title,
      snippet: makeSnippet(record.text, normalizedQuery),
      relevance: Number(score.toFixed(5)),
      url:
        record.type === 'note'
          ? `/notes/${record.id}`
          : record.type === 'flashcard'
          ? `/flashcards/${record.id}`
          : `/questions/${record.id}`,
    }));

  cache.set(cacheKey, { results, expiresAt: Date.now() + CACHE_TTL_MS });
  return results;
}

function clearCache() {
  cache.clear();
}

module.exports = {
  search,
  hybridDbSearch,
  cosine,
  makeSnippet,
  clearCache,
  tokenize,
  analyze,
  mapWithConcurrency,
  embedOrNull,
  loadIndex,
  rankByKeyword,
  rankBySemantic,
  fuse,
  EMBED_CONCURRENCY,
};
