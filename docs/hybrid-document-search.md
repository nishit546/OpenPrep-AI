# Hybrid Document Search (pgvector + full-text)

Search over a user's uploaded study material that matches by meaning (vector) and by exact terms (full-text), fused with Reciprocal Rank Fusion (RRF).

## Requirements

- PostgreSQL with the `pgvector` extension. `docker-compose.yml` uses `pgvector/pgvector:pg16` for local development (the previous `postgres:16-alpine` image does not ship the extension). The new image is Debian-based, so an existing `pg_data` volume created by the Alpine image should be recreated (`docker compose down -v`, which deletes local data) rather than reused.
- `GEMINI_API_KEY` for `text-embedding-004` (768 dimensions).

## Schema

Migration: `backend/migrations/20260903000000-create-document-chunks.js` (run with `npx sequelize-cli db:migrate`). It creates `document_chunks`:

| Column | Notes |
| --- | --- |
| `id`, `userId`, `documentId` | `userId` references `Users` (cascade delete) |
| `chunkIndex`, `chunkText`, `pageNumber`, `metadata` | `pageNumber` is returned as the page reference |
| `tsv` | generated `to_tsvector('english', "chunkText")`, GIN index |
| `embedding` | `vector(768)`, nullable, HNSW index with `vector_cosine_ops` |

The Sequelize model (`models/DocumentChunk.js`) intentionally omits `tsv` and `embedding`: they need pgvector, and the test suite builds its schema with `sequelize.sync()` on plain PostgreSQL. They are read and written with raw SQL in `services/hybridSearchService.js`.

The older `20260901_enable_pgvector.sql` draft (`document_embeddings`) is not used by this feature.

## API

Both routes require authentication and only ever touch the caller's own chunks.

- `POST /api/documents/index` with `{ documentId, text }` or `{ documentId, pages: [{ page, text }] }`. Chunks (about 1000 characters, 150 overlap), embeds with `generateVector`, and stores. Runs through the existing queue (`index_document_chunks`); responds `202`. Re-indexing a document replaces its chunks. If a chunk cannot be embedded it is still stored and stays findable by keyword.
- `POST /api/documents/search` with `{ query, documentId?, limit? }` (limit 1-20, default 5). Returns `{ success, latencyMs, results: [{ id, documentId, chunkIndex, page, content, snippet, metadata, score }] }`. `snippet` is HTML-escaped with matches wrapped in `<mark>`.

If the query cannot be embedded, search falls back to keyword-only results.

## Ranking

```
RRF(d) = sum over {vector, keyword} of 1 / (60 + rank(d))
```

Each list returns its top 50 candidates; a chunk absent from a list gets no contribution from it.

## Benchmark (manual, not run in CI)

The target is under 45 ms for a 50k-chunk corpus. That depends on hardware, `hnsw.ef_search` and data distribution, so it is not asserted in CI (unit tests run with Gemini mocked and no database). To measure on your own database:

1. Load synthetic or real chunks (50k) with embeddings.
2. Run the query below with a representative embedding and check `Execution Time` and that both `idx_document_chunks_embedding_hnsw` and `idx_document_chunks_tsv` appear in the plan.

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id FROM document_chunks
WHERE "userId" = '<user uuid>'
ORDER BY embedding <=> '[...768 floats...]'::vector
LIMIT 50;
```

Note that HNSW applies the `userId` filter after the index scan, so for users with a small share of the table, raise `SET hnsw.ef_search` (pgvector 0.8+ also offers `hnsw.iterative_scan`) or results may be fewer than requested.
