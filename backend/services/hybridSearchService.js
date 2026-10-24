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

const { GoogleGenAI } = require('@google/genai');
const { Question, Flashcard, Note } = require('../models');
const geminiService = require('./geminiService');
const searchIndex = require('./searchIndexService');

// Created on first use: constructing the client at import time throws when no API key is configured.
let aiClient;
const getAiClient = () => (aiClient ||= new GoogleGenAI());

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
    const response = await getAiClient().models.embedContent({
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

// ---------------------------------------------------------------------------
// Document chunk search (PostgreSQL pgvector + full-text, fused with RRF)
// ---------------------------------------------------------------------------

const EMBEDDING_DIMENSIONS = 768;
const CANDIDATES_PER_LIST = 50;
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 150;
const MAX_CHUNKS_PER_DOCUMENT = 2000;

const defaultDb = {
  query: (sql, params) => {
    const { sequelize } = require('../config/db');
    return sequelize.query(sql, { bind: params, type: 'SELECT' });
  },
};

const toVectorLiteral = (vector) => `[${vector.join(',')}]`;

const isValidEmbedding = (vector) =>
  Array.isArray(vector) &&
  vector.length === EMBEDDING_DIMENSIONS &&
  vector.every((value) => Number.isFinite(value));

async function embedChunk(text, deps = {}) {
  const generate = deps.generateVector || require('./embeddingsProcessor').generateVector;
  try {
    const vector = await generate(text);
    return isValidEmbedding(vector) ? vector : null;
  } catch (error) {
    console.warn('[HybridSearch] Document embedding failed:', error.message);
    return null;
  }
}

/**
 * Split text into overlapping chunks, preferring to break on whitespace.
 */
function chunkText(text, { size = CHUNK_SIZE, overlap = CHUNK_OVERLAP } = {}) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  if (clean.length <= size) return [clean];

  const chunks = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + size, clean.length);
    if (end < clean.length) {
      const lastSpace = clean.lastIndexOf(' ', end);
      if (lastSpace > start + size / 2) end = lastSpace;
    }
    chunks.push(clean.slice(start, end).trim());
    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks.filter(Boolean);
}

/**
 * Chunk a document, embed each chunk and store it for the owning user.
 * `pages` is [{ page, text }]; a plain `text` string is treated as one page-less block.
 * A chunk whose embedding fails is still stored (lexical search keeps working)
 * and is counted in `embeddingFailures`. Re-indexing replaces earlier chunks.
 */
async function indexDocumentChunks({ userId, documentId, pages, text }, deps = {}) {
  if (!userId || !documentId) throw new Error('userId and documentId are required');

  const sources = Array.isArray(pages) && pages.length ? pages : [{ page: null, text }];
  const chunks = [];
  for (const source of sources) {
    for (const piece of chunkText(source.text, deps.chunking)) {
      chunks.push({ content: piece, page: Number.isInteger(source.page) ? source.page : null });
    }
  }
  if (chunks.length > MAX_CHUNKS_PER_DOCUMENT) {
    throw new Error(`Document is too large to index (max ${MAX_CHUNKS_PER_DOCUMENT} chunks)`);
  }

  const db = deps.db || defaultDb;
  const concurrency = deps.concurrency || EMBED_CONCURRENCY;
  const embeddings = await mapWithConcurrency(chunks, concurrency, (chunk) =>
    embedChunk(chunk.content, deps)
  );

  await db.query(
    'DELETE FROM document_chunks WHERE "userId" = $1 AND "documentId" = $2 RETURNING id',
    [userId, documentId]
  );

  for (let i = 0; i < chunks.length; i += 1) {
    await db.query(
      `INSERT INTO document_chunks ("userId", "documentId", "chunkIndex", "chunkText", "pageNumber", embedding)
       VALUES ($1, $2, $3, $4, $5, $6::vector) RETURNING id`,
      [
        userId,
        documentId,
        i,
        chunks[i].content,
        chunks[i].page,
        embeddings[i] ? toVectorLiteral(embeddings[i]) : null,
      ]
    );
  }

  return {
    chunks: chunks.length,
    embeddingFailures: embeddings.filter((vector) => !vector).length,
  };
}

/** Job name so indexing runs out of band via services/queueService. */
const INDEX_JOB = 'index_document_chunks';

async function enqueueDocumentIndexing(payload, deps = {}) {
  const queue = deps.queueService || require('./queueService');
  try {
    await queue.enqueue(INDEX_JOB, payload);
    return { queued: true };
  } catch (error) {
    console.warn('[HybridSearch] Queue unavailable, indexing inline:', error.message);
    const result = await indexDocumentChunks(payload, deps);
    return { queued: false, ...result };
  }
}

function registerIndexingHandler(deps = {}) {
  const queue = deps.queueService || require('./queueService');
  queue.registerHandler(INDEX_JOB, (payload) => indexDocumentChunks(payload, deps));
}

/**
 * Hybrid search over one user's document chunks. Vector (cosine, HNSW) and
 * full-text (websearch_to_tsquery, GIN) candidates are fused with Reciprocal
 * Rank Fusion: score(d) = sum over lists of 1 / (60 + rank). A chunk missing
 * from a list contributes nothing for that list. If the query cannot be
 * embedded, the search falls back to full-text only.
 *
 * Every query is scoped by "userId"; optional `documentId` narrows further.
 */
async function hybridDbSearch(queryText, { userId, documentId = null, limit = 5 } = {}, deps = {}) {
  const normalized = String(queryText || '').trim();
  if (!userId || !normalized) return [];

  const db = deps.db || defaultDb;
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 5, 1), 50);

  const queryEmbedding = await embedChunk(normalized, deps);
  const vectorLiteral = queryEmbedding ? toVectorLiteral(queryEmbedding) : null;

  const sql = `
    WITH vector_search AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY embedding <=> $1::vector) AS rank
      FROM document_chunks
      WHERE $1::vector IS NOT NULL
        AND "userId" = $2::uuid
        AND ($4::uuid IS NULL OR "documentId" = $4::uuid)
        AND embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector
      LIMIT ${CANDIDATES_PER_LIST}
    ),
    fts_search AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY ts_rank(tsv, websearch_to_tsquery('english', $3)) DESC) AS rank
      FROM document_chunks
      WHERE "userId" = $2::uuid
        AND ($4::uuid IS NULL OR "documentId" = $4::uuid)
        AND tsv @@ websearch_to_tsquery('english', $3)
      ORDER BY ts_rank(tsv, websearch_to_tsquery('english', $3)) DESC
      LIMIT ${CANDIDATES_PER_LIST}
    ),
    fused AS (
      SELECT COALESCE(v.id, f.id) AS id,
             COALESCE(1.0 / (${RRF_K} + v.rank), 0) + COALESCE(1.0 / (${RRF_K} + f.rank), 0) AS score
      FROM vector_search v
      FULL OUTER JOIN fts_search f ON v.id = f.id
    )
    SELECT c.id, c."documentId", c."chunkIndex", c."chunkText" AS content,
           c."pageNumber", c.metadata, fused.score
    FROM fused
    JOIN document_chunks c ON c.id = fused.id
    ORDER BY fused.score DESC
    LIMIT $5;
  `;

  const rows = await db.query(sql, [vectorLiteral, userId, normalized, documentId, safeLimit]);
  const list = Array.isArray(rows) ? rows : rows?.rows || [];

  return list.map((row) => ({
    id: row.id,
    documentId: row.documentId,
    chunkIndex: row.chunkIndex,
    page: row.pageNumber ?? null,
    content: row.content,
    snippet: makeSnippet(row.content, normalized),
    metadata: row.metadata || {},
    score: Number(Number(row.score).toFixed(5)),
  }));
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
  hybridSearch: hybridDbSearch,
  chunkText,
  indexDocumentChunks,
  enqueueDocumentIndexing,
  registerIndexingHandler,
  EMBEDDING_DIMENSIONS,
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
