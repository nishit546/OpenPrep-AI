---
title: '[FEAT]: Semantic Vector Search & Hybrid RAG Pipeline for Study Notes using pgvector & Cohere Reranker'
labels: 'enhancement, database, backend, ai, high-priority, ECSoC26, ECSoC26-L3'
assignees: ''
---

## Summary & Motivation
As students upload multiple textbooks, lecture slides, research papers, and handwritten notes, traditional keyword search fails to retrieve semantically related concepts (e.g. searching for "energy conservation" misses sections discussing "work-energy theorem" or "Hamiltonian mechanics").

This feature implements a **Hybrid Semantic RAG (Retrieval-Augmented Generation) Pipeline** utilizing PostgreSQL `pgvector` for vector embeddings combined with full-text BM25 keyword search and cross-encoder reranking to provide ultra-accurate contextual search and grounding across all student documents.

---

## Technical Scope & Architecture

### Database & Vector Storage
1. **PostgreSQL pgvector Extension Setup (`backend/migrations/20260901_enable_pgvector.sql`)**:
   - Enable `CREATE EXTENSION IF NOT EXISTS vector;`.
   - Table `document_embeddings`:
     - `id`: UUID primary key.
     - `document_id`: Foreign key to uploaded document.
     - `chunk_index`: Integer sequential index.
     - `content`: Text snippet (500–1000 tokens with 10% overlap).
     - `embedding`: `vector(768)` embedding generated via Gemini `text-embedding-004`.
     - `metadata`: JSONB containing page numbers, chapter headers, and topic tags.
   - HNSW (Hierarchical Navigable Small World) index: `CREATE INDEX ON document_embeddings USING hnsw (embedding vector_cosine_ops);`.

### Backend RAG Engine
1. **Hybrid Retrieval Service (`backend/services/hybridSearchService.js`)**:
   - Executes Reciprocal Rank Fusion (RRF) combining vector cosine distance and PostgreSQL `to_tsvector`/`ts_rank` text search.
   - Applies cross-encoder reranking to select top-5 most relevant chunks.
2. **Context-Aware Study Assistant API (`backend/controllers/ragSearchController.js`)**:
   - `POST /api/documents/search` - Returns ranked citations and highlighted passages across student files.
   - `POST /api/documents/ask` - Answers questions grounded strictly in the user's uploaded materials with direct page and paragraph citations.

---

## Acceptance Criteria
- [ ] pgvector migration creates HNSW vector index with cosine similarity operations.
- [ ] Automatic chunking and embedding generation triggered on PDF/document upload via background worker.
- [ ] Hybrid search achieves sub-80ms retrieval latency across 50,000+ document chunks.
- [ ] Answers strictly cite source document IDs, chapter names, and page numbers.
