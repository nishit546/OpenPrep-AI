'use strict';

/**
 * Chunk table behind hybrid (pgvector + full-text) document search.
 *
 * Requires PostgreSQL with the pgvector extension available (see the
 * pgvector/pgvector image in docker-compose.yml). It supersedes the unused
 * document_embeddings draft in 20260901_enable_pgvector.sql, which had no
 * userId, no tsv column, and referenced a documents table that does not exist.
 */
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS vector;');

    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS document_chunks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
        "documentId" UUID NOT NULL,
        "chunkIndex" INTEGER NOT NULL,
        "chunkText" TEXT NOT NULL,
        "pageNumber" INTEGER,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', "chunkText")) STORED,
        embedding vector(768),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryInterface.sequelize.query(
      'CREATE INDEX IF NOT EXISTS idx_document_chunks_user_document ON document_chunks ("userId", "documentId");'
    );
    await queryInterface.sequelize.query(
      'CREATE INDEX IF NOT EXISTS idx_document_chunks_tsv ON document_chunks USING gin (tsv);'
    );
    await queryInterface.sequelize.query(
      'CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw ON document_chunks USING hnsw (embedding vector_cosine_ops);'
    );
  },

  // The vector extension is left installed: other tables may come to use it.
  down: async (queryInterface) => {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS document_chunks;');
  },
};
